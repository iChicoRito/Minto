import {
  DEFAULT_OPENROUTER_APP_TITLE,
  DEFAULT_OPENROUTER_SITE_URL,
  DEFAULT_OPENROUTER_TIMEOUT_MS,
  OPENROUTER_ENDPOINT,
  OPENROUTER_MODEL,
  OPENROUTER_PROVIDER,
} from "./config";
import {
  AiCancellationError,
  AiConfigurationError,
  AiInputError,
  AiProviderError,
  MAX_RETRY_AFTER_SECONDS,
} from "./errors";

export type ModelCompletionInput = {
  systemInstruction: string;
  userContent: string;
  reasoningEffort: "low" | "high" | "max";
  completionBudget: 2048 | 8192 | 32768;
};

export type ModelCompletionMetadata = {
  provider: "openrouter";
  model: typeof OPENROUTER_MODEL;
  generationId?: string;
  inputTokens?: number;
  outputTokens?: number;
  totalTokens?: number;
  cost: 0;
};

export interface ModelAdapter {
  complete(
    input: ModelCompletionInput,
    options: { signal: AbortSignal; onMetadata?: (metadata: ModelCompletionMetadata) => void },
  ): Promise<string>;
}

type AdapterConfig = {
  apiKey: string;
  fetchImpl?: typeof fetch;
  timeoutMs?: number;
  siteUrl?: string;
  appTitle?: string;
};

type NormalizedCompletion = {
  rawContent: string;
  metadata: ModelCompletionMetadata;
};

const MAX_PROVIDER_RESPONSE_BYTES = 64 * 1024;
const EXPECTED_COMPLETION_BUDGETS = { low: 2048, high: 8192, max: 32768 } as const;
const ZERO_PRICE = Object.freeze({ prompt: "0", completion: "0", request: "0", image: "0", audio: "0" });
const PROVIDER_PREFERENCES = Object.freeze({
  only: Object.freeze([OPENROUTER_PROVIDER]),
  allow_fallbacks: false,
  require_parameters: true,
  max_price: ZERO_PRICE,
});

export function createOpenRouterAdapter(config: AdapterConfig): ModelAdapter {
  const apiKey = config.apiKey.trim();
  if (apiKey.length === 0) throw new AiConfigurationError();

  const fetchImpl = config.fetchImpl ?? fetch;
  const timeoutMs = config.timeoutMs ?? DEFAULT_OPENROUTER_TIMEOUT_MS;
  if (!Number.isInteger(timeoutMs) || timeoutMs <= 0) throw new AiConfigurationError();
  const siteUrl = config.siteUrl ?? DEFAULT_OPENROUTER_SITE_URL;
  const appTitle = config.appTitle ?? DEFAULT_OPENROUTER_APP_TITLE;

  return {
    complete: (input, options) => complete(input, options, apiKey, fetchImpl, timeoutMs, siteUrl, appTitle),
  };
}

async function complete(
  input: ModelCompletionInput,
  options: { signal: AbortSignal; onMetadata?: (metadata: ModelCompletionMetadata) => void },
  apiKey: string,
  fetchImpl: typeof fetch,
  timeoutMs: number,
  siteUrl: string,
  appTitle: string,
): Promise<string> {
  validateInput(input, options);
  if (options.signal.aborted) throw new AiCancellationError();

  const requestBody = buildRequestBody(input);
  const request = {
    method: "POST",
    headers: {
      Accept: "application/json",
      Authorization: `Bearer ${apiKey}`,
      "Content-Type": "application/json",
      "HTTP-Referer": siteUrl,
      "X-Title": appTitle,
      "X-OpenRouter-Metadata": "true",
    },
    body: JSON.stringify(requestBody),
    cache: "no-store" as const,
    redirect: "error" as const,
    signal: undefined as AbortSignal | undefined,
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

    const response = await fetchImpl(OPENROUTER_ENDPOINT, request);
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

    const completion = parseCompletion(rawBody);
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
    if (callerAborted || options.signal.aborted) {
      throw new AiCancellationError();
    }
    if (deadlineExpired || isAbortLikeError(error)) {
      throw new AiProviderError("provider_timeout");
    }
    throw new AiProviderError("provider_unavailable");
  } finally {
    if (timer !== undefined) clearTimeout(timer);
    options.signal.removeEventListener("abort", abortFromCaller);
  }
}

function buildRequestBody(input: ModelCompletionInput): Record<string, unknown> {
  const body: Record<string, unknown> = {
    model: OPENROUTER_MODEL,
    messages: [
      { role: "system", content: input.systemInstruction },
      { role: "user", content: input.userContent },
    ],
    service_tier: "default",
    reasoning: { effort: input.reasoningEffort, exclude: true },
    response_format: { type: "json_object" },
    max_tokens: input.completionBudget,
    stream: false,
    provider: PROVIDER_PREFERENCES,
  };

  return body;
}

function validateInput(input: ModelCompletionInput, options: { signal: AbortSignal }): void {
  if (
    typeof input.systemInstruction !== "string" ||
    typeof input.userContent !== "string" ||
    EXPECTED_COMPLETION_BUDGETS[input.reasoningEffort] !== input.completionBudget ||
    options.signal === undefined
  ) {
    throw new AiInputError();
  }
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
      throw new AiProviderError(
        response.status >= 200 && response.status <= 299 ? "invalid_provider_response" : "provider_unavailable",
      );
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
  let byteLength = 0;
  try {
    let result = await reader.read();
    while (!result.done) {
      const value = result.value;
      byteLength += value.byteLength;
      if (byteLength > MAX_PROVIDER_RESPONSE_BYTES) {
        controller.abort();
        try {
          const cancellation = reader.cancel();
          void cancellation.catch(() => undefined);
        } catch {
          // The request abort still stops providers whose stream cannot be cancelled cleanly.
        }
        throw new AiProviderError("output_too_large");
      }
      body += decoder.decode(value, { stream: true });
      result = await reader.read();
    }
    return body + decoder.decode();
  } catch (error) {
    if (error instanceof AiProviderError || isAbortLikeError(error)) throw error;
    throw new AiProviderError(
      response.status >= 200 && response.status <= 299 ? "invalid_provider_response" : "provider_unavailable",
    );
  } finally {
    reader.releaseLock();
  }
}

function parseCompletion(rawBody: string): NormalizedCompletion {
  let value: unknown;
  try {
    value = JSON.parse(rawBody) as unknown;
  } catch {
    throw new AiProviderError("invalid_provider_response");
  }

  if (!isRecord(value) || "error" in value || value.model !== OPENROUTER_MODEL) {
    throw new AiProviderError("invalid_provider_response");
  }

  const choices = value.choices;
  if (!Array.isArray(choices) || choices.length === 0) throw new AiProviderError("invalid_provider_response");
  const choice = choices[0];
  if (!isRecord(choice) || "error" in choice || choice.finish_reason !== "stop") {
    throw new AiProviderError("invalid_provider_response");
  }
  if (
    !isRecord(choice.message) ||
    typeof choice.message.content !== "string" ||
    choice.message.content.trim() === "" ||
    !isJsonObjectText(choice.message.content)
  ) {
    throw new AiProviderError("invalid_provider_response");
  }

  if (!isRecord(value.usage) || !isZeroCost(value.usage.cost)) {
    throw new AiProviderError("invalid_provider_response");
  }

  return {
    rawContent: choice.message.content,
    metadata: {
      model: OPENROUTER_MODEL,
      provider: "openrouter",
      ...(safeGenerationId(value.id) === undefined ? {} : { generationId: safeGenerationId(value.id) }),
      ...optionalUsage("inputTokens", value.usage.prompt_tokens),
      ...optionalUsage("outputTokens", value.usage.completion_tokens),
      ...optionalUsage("totalTokens", value.usage.total_tokens),
      cost: 0,
    },
  };
}

function mapHttpFailure(response: Response, rawBody: string): AiProviderError {
  const status = response.status;
  const hints = providerErrorHints(rawBody, status);

  if (hints.auth) return new AiProviderError("provider_unavailable", { retryable: false, status });
  if (status >= 100 && status <= 199) return new AiProviderError("provider_unavailable", { status });
  if (status >= 200 && status <= 299) return new AiProviderError("invalid_provider_response", { status });
  if (status >= 300 && status <= 399) return new AiProviderError("provider_unavailable", { status });
  if (status === 408 || status === 504 || status === 524) {
    return new AiProviderError("provider_timeout", {
      status,
      retryAfterSeconds: parseRetryAfter(response.headers.get("retry-after")),
    });
  }
  if (status === 429) {
    return new AiProviderError("provider_rate_limited", {
      status,
      retryAfterSeconds: parseRetryAfter(response.headers.get("retry-after")),
    });
  }
  if (status >= 500 && status <= 599) {
    return new AiProviderError("provider_unavailable", {
      status,
      retryAfterSeconds: parseRetryAfter(response.headers.get("retry-after")),
    });
  }
  if (status === 404 || hints.model) return new AiProviderError("model_unavailable", { status });
  if (hints.payment || status === 402) return new AiProviderError("priced_route_unavailable", { status });
  if (status === 400 || status === 413 || status === 422 || (status >= 400 && status <= 499)) {
    return new AiProviderError("provider_refused", { status });
  }
  return new AiProviderError("provider_unavailable", { status });
}

function providerErrorHints(
  rawBody: string,
  responseStatus: number,
): { auth: boolean; payment: boolean; model: boolean } {
  try {
    const value = JSON.parse(rawBody) as unknown;
    if (!isRecord(value)) return { auth: false, payment: false, model: false };

    const error = isRecord(value.error) ? value.error : value;
    const text = sanitizeHintContext([
      error.code,
      error.type,
      error.message,
      error.reason,
      error.detail,
      error.metadata,
      value.code,
      value.type,
      value.message,
      value.reason,
      value.detail,
      value.metadata,
    ]);
    const statusContext = [
      responseStatus,
      statusNumber(value.status),
      statusNumber(error.status),
      statusNumber(error.code),
    ];
    return {
      auth: statusContext.some((status) => status === 401 || status === 403) || hasAuthFailureHint(text),
      payment: /payment|billing|credit|quota|price|fund/.test(text),
      model: /model|route/.test(text) && /missing|not.?found|unavailable|unsupported|invalid/.test(text),
    };
  } catch {
    return { auth: false, payment: false, model: false };
  }
}

function sanitizeHintContext(values: readonly unknown[]): string {
  return values
    .map((value) => {
      if (typeof value === "string" || typeof value === "number") return String(value);
      if (value === null || value === undefined) return "";
      try {
        return JSON.stringify(value) ?? "";
      } catch {
        return "";
      }
    })
    .join(" ")
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, " ")
    .slice(0, 4_096);
}

function hasAuthFailureHint(text: string): boolean {
  return (
    /\b(?:unauthorized|unauthenticated|forbidden|not authorized|not authenticated)\b/.test(text) ||
    /\b(?:permission|access)\b.{0,24}\b(?:denied|forbidden|unauthorized|failure|failed|error|required|invalid|expired|revoked|missing)\b/.test(
      text,
    ) ||
    /\b(?:auth|authentication|authorization)\b.{0,24}\b(?:failure|failed|error|denied|forbidden|required|invalid|expired|revoked|missing)\b/.test(
      text,
    ) ||
    /\b(?:invalid|expired|revoked|missing|malformed|incorrect)\b.{0,24}\b(?:api key|key|token|credential)\b/.test(
      text,
    ) ||
    /\b(?:api key|key|token|credential)\b.{0,24}\b(?:invalid|expired|revoked|missing|malformed|incorrect)\b/.test(text)
  );
}

function statusNumber(value: unknown): number | undefined {
  const number = typeof value === "number" ? value : typeof value === "string" ? Number(value) : Number.NaN;
  return Number.isInteger(number) && number >= 100 && number <= 599 ? number : undefined;
}

function parseRetryAfter(value: string | null): number | undefined {
  if (value === null) return undefined;
  const seconds = Number(value.trim());
  if (Number.isInteger(seconds) && seconds >= 0) return Math.min(MAX_RETRY_AFTER_SECONDS, seconds);

  const retryAt = Date.parse(value);
  if (Number.isNaN(retryAt)) return undefined;
  return Math.min(MAX_RETRY_AFTER_SECONDS, Math.max(0, Math.ceil((retryAt - Date.now()) / 1000)));
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

function isZeroCost(value: unknown): value is 0 | "0" {
  return value === 0 || value === "0";
}

function optionalUsage<Key extends "inputTokens" | "outputTokens" | "totalTokens">(
  key: Key,
  value: unknown,
): { [Property in Key]?: number } {
  return isSafeTokenCount(value) ? ({ [key]: value } as { [Property in Key]?: number }) : {};
}

function isSafeTokenCount(value: unknown): value is number {
  return typeof value === "number" && Number.isSafeInteger(value) && value >= 0;
}

function safeGenerationId(value: unknown): string | undefined {
  if (typeof value !== "string" || value.length === 0 || value.length > 128) return undefined;
  return /^[A-Za-z0-9._:-]+$/.test(value) ? value : undefined;
}

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === "object" && value !== null && !Array.isArray(value);
}
