import { DEEPSEEK_ENDPOINT, DEEPSEEK_MODEL, DEEPSEEK_PROVIDER, DEFAULT_DEEPSEEK_TIMEOUT_MS } from "./config";
import {
  AiCancellationError,
  AiConfigurationError,
  AiInputError,
  AiProviderError,
  MAX_RETRY_AFTER_SECONDS,
} from "./errors";
import type { ModelAdapter, ModelCompletionInput, ModelCompletionMetadata } from "./model-adapter";

export type { ModelAdapter, ModelCompletionInput, ModelCompletionMetadata } from "./model-adapter";

export type DeepSeekAdapterConfig = {
  apiKey: string;
  endpoint?: string;
  model?: string;
  fetchImpl?: typeof fetch;
  timeoutMs?: number;
};

type NormalizedCompletion = { rawContent: string; metadata: ModelCompletionMetadata };

type RecordValue = Record<string, unknown>;

const MAX_PROVIDER_RESPONSE_BYTES = 64 * 1024;
const EXPECTED_COMPLETION_BUDGETS = { low: 2048, high: 8192, max: 32768 } as const;

export function createDeepSeekAdapter(config: DeepSeekAdapterConfig): ModelAdapter {
  const apiKey = config.apiKey.trim();
  if (apiKey.length === 0) throw new AiConfigurationError();
  const endpoint = config.endpoint ?? DEEPSEEK_ENDPOINT;
  const model = config.model ?? DEEPSEEK_MODEL;
  const fetchImpl = config.fetchImpl ?? fetch;
  const timeoutMs = config.timeoutMs ?? DEFAULT_DEEPSEEK_TIMEOUT_MS;
  if (!isHttpsUrl(endpoint) || model.trim().length === 0 || !Number.isInteger(timeoutMs) || timeoutMs <= 0) {
    throw new AiConfigurationError();
  }
  return { complete: (input, options) => complete(input, options, apiKey, endpoint, model, fetchImpl, timeoutMs) };
}

async function complete(
  input: ModelCompletionInput,
  options: { signal: AbortSignal; onMetadata?: (metadata: ModelCompletionMetadata) => void },
  apiKey: string,
  endpoint: string,
  model: string,
  fetchImpl: typeof fetch,
  timeoutMs: number,
): Promise<string> {
  validateInput(input, options);
  if (options.signal.aborted) throw new AiCancellationError();

  const request: RequestInit & { signal?: AbortSignal } = {
    method: "POST",
    headers: { Accept: "application/json", Authorization: `Bearer ${apiKey}`, "Content-Type": "application/json" },
    body: JSON.stringify(buildRequestBody(input, model)),
    cache: "no-store",
    redirect: "error",
  };
  const controller = new AbortController();
  let callerAborted = false;
  let deadlineExpired = false;
  const abortFromCaller = () => {
    callerAborted = true;
    controller.abort();
  };
  options.signal.addEventListener("abort", abortFromCaller, { once: true });
  let timer: ReturnType<typeof setTimeout> | undefined;

  try {
    if (options.signal.aborted) {
      abortFromCaller();
      throw new AiCancellationError();
    }
    timer = setTimeout(() => {
      deadlineExpired = true;
      controller.abort();
    }, timeoutMs);
    request.signal = controller.signal;
    const response = await fetchImpl(endpoint, request);
    if (callerAborted || options.signal.aborted) throw new AiCancellationError();
    if (deadlineExpired || controller.signal.aborted) throw new AiProviderError("provider_timeout");

    const statusFailure = response.status === 200 ? undefined : mapHttpFailure(response, "");
    let rawBody: string;
    try {
      rawBody = await readResponseBody(response, controller);
    } catch (error) {
      if (statusFailure !== undefined && error instanceof AiProviderError) throw statusFailure;
      throw error;
    }
    if (callerAborted || options.signal.aborted) throw new AiCancellationError();
    if (deadlineExpired || controller.signal.aborted) throw new AiProviderError("provider_timeout");
    if (statusFailure !== undefined) throw mapHttpFailure(response, rawBody);

    const completion = parseCompletion(rawBody, input.responseFormat !== "text", model);
    options.onMetadata?.(completion.metadata);
    return completion.rawContent;
  } catch (error) {
    if (
      error instanceof AiCancellationError ||
      error instanceof AiProviderError ||
      error instanceof AiInputError ||
      error instanceof AiConfigurationError
    ) {
      throw error;
    }
    if (callerAborted || options.signal.aborted) throw new AiCancellationError();
    if (deadlineExpired || isAbortLikeError(error)) throw new AiProviderError("provider_timeout");
    throw new AiProviderError("provider_unavailable");
  } finally {
    if (timer !== undefined) clearTimeout(timer);
    options.signal.removeEventListener("abort", abortFromCaller);
  }
}

function buildRequestBody(input: ModelCompletionInput, model: string): RecordValue {
  const body: RecordValue = {
    model,
    messages: [
      { role: "system", content: input.systemInstruction },
      { role: "user", content: input.userContent },
    ],
    thinking: { type: "enabled" },
    reasoning_effort: input.reasoningEffort,
    max_tokens: input.completionBudget,
    stream: false,
  };
  if (input.responseFormat !== "text") body.response_format = { type: "json_object" };
  return body;
}

function validateInput(input: ModelCompletionInput, options: { signal: AbortSignal }): void {
  if (
    typeof input.systemInstruction !== "string" ||
    typeof input.userContent !== "string" ||
    EXPECTED_COMPLETION_BUDGETS[input.reasoningEffort] !== input.completionBudget ||
    options.signal === undefined
  )
    throw new AiInputError();
}

async function readResponseBody(response: Response, controller: AbortController): Promise<string> {
  const contentLength = response.headers.get("content-length");
  if (contentLength !== null && Number.parseInt(contentLength, 10) > MAX_PROVIDER_RESPONSE_BYTES) {
    controller.abort();
    throw new AiProviderError("output_too_large");
  }
  if (response.body === null) {
    let body: string;
    try {
      body = await response.text();
    } catch (error) {
      if (isAbortLikeError(error)) throw error;
      throw new AiProviderError(response.ok ? "invalid_provider_response" : "provider_unavailable");
    }
    if (new TextEncoder().encode(body).byteLength > MAX_PROVIDER_RESPONSE_BYTES) {
      controller.abort();
      throw new AiProviderError("output_too_large");
    }
    return body;
  }
  const reader = response.body.getReader();
  const decoder = new TextDecoder();
  let body = "";
  let bytes = 0;
  try {
    let result = await reader.read();
    while (!result.done) {
      bytes += result.value.byteLength;
      if (bytes > MAX_PROVIDER_RESPONSE_BYTES) {
        controller.abort();
        void reader.cancel().catch(() => undefined);
        throw new AiProviderError("output_too_large");
      }
      body += decoder.decode(result.value, { stream: true });
      result = await reader.read();
    }
    return body + decoder.decode();
  } catch (error) {
    if (error instanceof AiProviderError || isAbortLikeError(error)) throw error;
    throw new AiProviderError(response.ok ? "invalid_provider_response" : "provider_unavailable");
  } finally {
    reader.releaseLock();
  }
}

function parseCompletion(rawBody: string, expectJson: boolean, model: string): NormalizedCompletion {
  let value: unknown;
  try {
    value = JSON.parse(rawBody) as unknown;
  } catch {
    throw new AiProviderError("invalid_provider_response");
  }
  if (!isRecord(value) || "error" in value || value.model !== model)
    throw new AiProviderError("invalid_provider_response");
  const choices = value.choices;
  if (!Array.isArray(choices) || choices.length === 0) throw new AiProviderError("invalid_provider_response");
  const choice = choices[0];
  if (!isRecord(choice) || choice.finish_reason !== "stop") {
    if (isRecord(choice) && choice.finish_reason === "length") throw new AiProviderError("output_too_large");
    throw new AiProviderError("invalid_provider_response");
  }
  if (
    !isRecord(choice.message) ||
    typeof choice.message.content !== "string" ||
    choice.message.content.trim() === "" ||
    (expectJson && !isJsonObjectText(choice.message.content))
  ) {
    throw new AiProviderError("invalid_provider_response");
  }
  const usage = isRecord(value.usage) ? value.usage : undefined;
  return {
    rawContent: choice.message.content,
    metadata: {
      provider: DEEPSEEK_PROVIDER,
      model,
      ...(safeString(value.id) === undefined ? {} : { generationId: safeString(value.id) }),
      ...optionalUsage("inputTokens", usage?.prompt_tokens),
      ...optionalUsage("outputTokens", usage?.completion_tokens),
      ...optionalUsage("totalTokens", usage?.total_tokens),
    },
  };
}

function mapHttpFailure(response: Response, rawBody: string): AiProviderError {
  const status = response.status;
  const hints = providerErrorHints(rawBody, status);
  if (hints.auth) return new AiProviderError("provider_unavailable", { retryable: false, status });
  if (status === 408 || status === 504 || status === 524)
    return new AiProviderError("provider_timeout", {
      status,
      retryAfterSeconds: parseRetryAfter(response.headers.get("retry-after")),
    });
  if (status === 429)
    return new AiProviderError("provider_rate_limited", {
      status,
      retryAfterSeconds: parseRetryAfter(response.headers.get("retry-after")),
    });
  if (status >= 200 && status <= 299) return new AiProviderError("invalid_provider_response", { status });
  if (status >= 500 && status <= 599)
    return new AiProviderError("provider_unavailable", {
      status,
      retryAfterSeconds: parseRetryAfter(response.headers.get("retry-after")),
    });
  if (status === 404 || hints.model) return new AiProviderError("model_unavailable", { status });
  if (status >= 400 && status <= 499) return new AiProviderError("provider_refused", { status });
  if (status >= 300 && status <= 399) return new AiProviderError("provider_unavailable", { status });
  return new AiProviderError("provider_unavailable", { status });
}

function providerErrorHints(rawBody: string, responseStatus: number): { auth: boolean; model: boolean } {
  try {
    const value = JSON.parse(rawBody) as unknown;
    if (!isRecord(value)) return { auth: false, model: false };
    const error = isRecord(value.error) ? value.error : value;
    const text = [
      error.code,
      error.type,
      error.message,
      error.reason,
      error.detail,
      value.code,
      value.type,
      value.message,
    ]
      .map((item) => (typeof item === "string" || typeof item === "number" ? String(item) : ""))
      .join(" ")
      .toLowerCase()
      .replace(/[^a-z0-9]+/g, " ")
      .slice(0, 4096);
    return {
      auth:
        responseStatus === 401 ||
        responseStatus === 403 ||
        /unauthorized|forbidden|authentication|(?:invalid|expired|revoked|missing|malformed) (?:api )?(?:key|token|credential)/.test(
          text,
        ),
      model: /model|route/.test(text) && /missing|not found|unavailable|unsupported|invalid/.test(text),
    };
  } catch {
    return { auth: false, model: false };
  }
}

function parseRetryAfter(value: string | null): number | undefined {
  if (value === null) return undefined;
  const seconds = Number(value.trim());
  if (Number.isInteger(seconds) && seconds >= 0) return Math.min(MAX_RETRY_AFTER_SECONDS, seconds);
  const retryAt = Date.parse(value);
  return Number.isNaN(retryAt)
    ? undefined
    : Math.min(MAX_RETRY_AFTER_SECONDS, Math.max(0, Math.ceil((retryAt - Date.now()) / 1000)));
}

function isAbortLikeError(error: unknown): boolean {
  return (
    (error instanceof DOMException && (error.name === "AbortError" || error.name === "TimeoutError")) ||
    (error instanceof Error && (error.name === "AbortError" || error.name === "TimeoutError"))
  );
}
function isJsonObjectText(value: string): boolean {
  try {
    return isRecord(JSON.parse(value) as unknown);
  } catch {
    return false;
  }
}
function optionalUsage<Key extends "inputTokens" | "outputTokens" | "totalTokens">(
  key: Key,
  value: unknown,
): { [Property in Key]?: number } {
  return typeof value === "number" && Number.isSafeInteger(value) && value >= 0
    ? ({ [key]: value } as { [Property in Key]?: number })
    : {};
}
function safeString(value: unknown): string | undefined {
  return typeof value === "string" && value.length > 0 && value.length <= 128 && /^[A-Za-z0-9._:-]+$/.test(value)
    ? value
    : undefined;
}
function isRecord(value: unknown): value is RecordValue {
  return typeof value === "object" && value !== null && !Array.isArray(value);
}
function isHttpsUrl(value: string): boolean {
  try {
    return new URL(value).protocol === "https:";
  } catch {
    return false;
  }
}
