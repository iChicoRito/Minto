import {
  ENHANCEMENT_API_VERSION,
  type EnhancementErrorCode,
  EnhancementErrorV1Schema,
  EnhancementRequestV1Schema,
  EnhancementSuccessV1Schema,
  MAX_REQUEST_BODY_BYTES,
  OPENROUTER_MODEL,
} from "../../lib/ai-enhancement/contracts";
import { type Admission, AdmissionBusyError, AdmissionUnavailableError, createAdmission } from "./admission";
import { getAiConfig } from "./config";
import {
  AiConfigurationError,
  AiInputError,
  isAiCancellationError,
  isAiConfigurationError,
  isAiProviderError,
  publicAiError,
} from "./errors";
import { createOpenRouterAdapter, type ModelAdapter, type ModelCompletionMetadata } from "./openrouter-adapter";
import { AiOrchestrationError, createOrchestrator, type EnhancementOrchestrator } from "./orchestrator";

export const ALLOWED_ORIGIN = "https://ichicorito.github.io" as const;

export type AiOperationalEvent = Readonly<{
  requestId: string;
  status: number;
  code: EnhancementErrorCode | "success";
  durationMs: number;
  requestBytes: number;
  inputTokens?: number;
  outputTokens?: number;
  totalTokens?: number;
  provider?: "openrouter";
  model?: typeof OPENROUTER_MODEL;
  generationId?: string;
  cost: 0;
  fallback?: false;
  errorClass?: EnhancementErrorCode;
}>;

export type AiHttpHandlerOptions = {
  environment?: Readonly<Record<string, string | undefined>>;
  allowedOrigin?: string;
  orchestrator?: EnhancementOrchestrator;
  model?: ModelAdapter;
  admission?: Admission;
  requestId?: () => string;
  clock?: () => number;
  log?: (event: AiOperationalEvent) => void;
};

type HandlerRuntime = {
  orchestrator: EnhancementOrchestrator;
  configured: boolean;
  allowedOrigin: string | undefined;
  requestId: () => string;
  clock: () => number;
  log?: (event: AiOperationalEvent) => void;
};

type MappedError = {
  code: EnhancementErrorCode;
  message: string;
  retryable: boolean;
  retryAfterSeconds?: number;
  status?: number;
};

export function createAiHttpHandler(options: AiHttpHandlerOptions = {}): (request: Request) => Promise<Response> {
  const runtime = createRuntime(options);
  return (request) => runAiHttpRequest(request, runtime);
}

export async function handleAiHttpRequest(request: Request, options: AiHttpHandlerOptions = {}): Promise<Response> {
  return createAiHttpHandler(options)(request);
}

function createRuntime(options: AiHttpHandlerOptions): HandlerRuntime {
  const environment = options.environment ?? process.env;
  const requestId = options.requestId ?? defaultRequestId;
  const clock = options.clock ?? Date.now;
  const configuredByInjection = options.orchestrator !== undefined || options.model !== undefined;
  const explicitEnvironment = options.environment !== undefined;
  const config = getAiConfig(environment);
  const configured = config !== null || (configuredByInjection && !explicitEnvironment);
  const allowedOrigin = normalizeOrigin(
    options.allowedOrigin ?? environment.ALLOWED_ORIGIN ?? (configuredByInjection ? ALLOWED_ORIGIN : undefined),
  );

  if (options.orchestrator !== undefined) {
    return {
      orchestrator: options.orchestrator,
      configured,
      allowedOrigin,
      requestId,
      clock,
      log: options.log,
    };
  }

  const model =
    options.model ?? (config === null ? disabledModel() : createOpenRouterAdapter({ apiKey: config.apiKey }));
  const admission = options.admission ?? createAdmission({ environment });
  return {
    orchestrator: createOrchestrator({ model, admission, requestId }),
    configured,
    allowedOrigin,
    requestId,
    clock,
    log: options.log,
  };
}

async function runAiHttpRequest(request: Request, runtime: HandlerRuntime): Promise<Response> {
  const startedAt = runtime.clock();
  const requestId = normalizeRequestId(runtime.requestId());
  let requestBytes = 0;
  let status = 500;
  let code: EnhancementErrorCode | "success" = "internal_error";
  let provider: "openrouter" | undefined;
  let model: typeof OPENROUTER_MODEL | undefined;
  let completionMetadata: ModelCompletionMetadata | undefined;
  let response: Response;

  try {
    const originAllowed =
      runtime.allowedOrigin !== undefined && request.headers.get("origin") === runtime.allowedOrigin;
    if (!originAllowed) {
      response = errorResponse(requestId, "forbidden_origin", 403, false, undefined, undefined);
      status = 403;
      code = "forbidden_origin";
      return response;
    }

    if (request.method === "OPTIONS") {
      status = 204;
      code = "invalid_request";
      return corsResponse(undefined, 204, runtime.allowedOrigin);
    }

    if (request.method !== "POST") {
      response = errorResponse(requestId, "invalid_request", 405, false, undefined, runtime.allowedOrigin);
      status = 405;
      code = "invalid_request";
      return response;
    }

    if (!isJsonContentType(request.headers.get("content-type"))) {
      response = errorResponse(requestId, "invalid_request", 400, false, undefined, runtime.allowedOrigin);
      status = 400;
      code = "invalid_request";
      return response;
    }

    if (!runtime.configured) {
      response = errorResponse(requestId, "service_disabled", 503, false, undefined, runtime.allowedOrigin);
      status = 503;
      code = "service_disabled";
      return response;
    }

    const declaredLength = request.headers.get("content-length");
    if (
      declaredLength !== null &&
      isPositiveInteger(declaredLength) &&
      Number(declaredLength) > MAX_REQUEST_BODY_BYTES
    ) {
      response = errorResponse(requestId, "input_too_large", 413, false, undefined, runtime.allowedOrigin);
      status = 413;
      code = "input_too_large";
      return response;
    }

    const body = await readRequestBody(request);
    requestBytes = body.bytes;
    if (body.tooLarge) {
      response = errorResponse(requestId, "input_too_large", 413, false, undefined, runtime.allowedOrigin);
      status = 413;
      code = "input_too_large";
      return response;
    }

    let parsedJson: unknown;
    try {
      parsedJson = JSON.parse(body.text) as unknown;
    } catch {
      response = errorResponse(requestId, "invalid_request", 400, false, undefined, runtime.allowedOrigin);
      status = 400;
      code = "invalid_request";
      return response;
    }

    const parsedRequest = EnhancementRequestV1Schema.safeParse(parsedJson);
    if (!parsedRequest.success) {
      response = errorResponse(requestId, "invalid_request", 400, false, undefined, runtime.allowedOrigin);
      status = 400;
      code = "invalid_request";
      return response;
    }

    const result = await runtime.orchestrator.enhance(parsedRequest.data, {
      signal: request.signal,
      onCompletionMetadata: (metadata) => {
        completionMetadata = metadata;
        provider = metadata.provider;
        model = metadata.model;
      },
    });
    const success = EnhancementSuccessV1Schema.safeParse({ ...result, requestId });
    if (!success.success) {
      response = errorResponse(requestId, "internal_error", 500, false, undefined, runtime.allowedOrigin);
      status = 500;
      code = "internal_error";
      return response;
    }

    provider ??= "openrouter";
    model ??= OPENROUTER_MODEL;
    status = 200;
    code = "success";
    response = corsResponse(JSON.stringify(success.data), 200, runtime.allowedOrigin);
    return response;
  } catch (error) {
    const mapped = mapError(error);
    status = mapped.status ?? statusForCode(mapped.code);
    code = mapped.code;
    response = errorResponse(
      requestId,
      mapped.code,
      status,
      mapped.retryable,
      mapped.retryAfterSeconds,
      runtime.allowedOrigin,
      mapped.message,
    );
    return response;
  } finally {
    if (runtime.log !== undefined) {
      const elapsed = Math.max(0, runtime.clock() - startedAt);
      const event: AiOperationalEvent = {
        requestId,
        status,
        code,
        durationMs: elapsed,
        requestBytes,
        cost: 0,
        ...(provider === undefined ? {} : { provider }),
        ...(model === undefined ? {} : { model }),
        ...(completionMetadata?.generationId === undefined ? {} : { generationId: completionMetadata.generationId }),
        ...(completionMetadata?.inputTokens === undefined ? {} : { inputTokens: completionMetadata.inputTokens }),
        ...(completionMetadata?.outputTokens === undefined ? {} : { outputTokens: completionMetadata.outputTokens }),
        ...(completionMetadata?.totalTokens === undefined ? {} : { totalTokens: completionMetadata.totalTokens }),
        ...(completionMetadata?.cost === undefined ? {} : { cost: completionMetadata.cost }),
        ...(status >= 400 && code !== "success" ? { errorClass: code } : {}),
      };
      try {
        runtime.log(event);
      } catch {
        // Observability must never change the API response.
      }
    }
  }
}

function errorResponse(
  requestId: string,
  code: EnhancementErrorCode,
  status: number,
  retryable: boolean,
  retryAfterSeconds: number | undefined,
  allowedOrigin: string | undefined,
  message = safeMessage(code),
): Response {
  const payload = {
    version: ENHANCEMENT_API_VERSION,
    ok: false as const,
    requestId,
    error: {
      code,
      message,
      retryable,
      ...(retryAfterSeconds === undefined ? {} : { retryAfterSeconds }),
    },
  };
  const parsed = EnhancementErrorV1Schema.parse(payload);
  const headers = baseHeaders(allowedOrigin);
  if (retryAfterSeconds !== undefined) headers.set("Retry-After", String(retryAfterSeconds));
  return new Response(JSON.stringify(parsed), { status, headers });
}

function corsResponse(body: string | undefined, status: number, allowedOrigin: string | undefined): Response {
  return new Response(body, { status, headers: baseHeaders(allowedOrigin) });
}

function baseHeaders(allowedOrigin: string | undefined): Headers {
  const headers = new Headers({ "Cache-Control": "no-store", Vary: "Origin" });
  if (allowedOrigin !== undefined) {
    headers.set("Access-Control-Allow-Origin", allowedOrigin);
    headers.set("Access-Control-Allow-Methods", "POST, OPTIONS");
    headers.set("Access-Control-Allow-Headers", "Content-Type");
  }
  headers.set("Content-Type", "application/json; charset=utf-8");
  return headers;
}

function normalizeOrigin(value: string | undefined): string | undefined {
  if (value === undefined) return undefined;
  try {
    const origin = new URL(value).origin;
    return origin === "null" || !/^https?:$/.test(new URL(value).protocol) ? undefined : origin;
  } catch {
    return undefined;
  }
}

function mapError(error: unknown): MappedError {
  if (isAiProviderError(error)) {
    const publicError = publicAiError(error);
    return {
      ...publicError,
      retryAfterSeconds: normalizeRetryAfter(publicError.retryAfterSeconds),
    };
  }
  if (error instanceof AdmissionBusyError) {
    return {
      code: "service_busy",
      message: error.message,
      retryable: true,
      retryAfterSeconds: error.retryAfterSeconds,
    };
  }
  if (error instanceof AdmissionUnavailableError) {
    return { code: "service_unavailable", message: error.message, retryable: true, status: 503 };
  }
  if (error instanceof AiOrchestrationError) {
    if (isPublicErrorCode(error.code)) {
      return {
        code: error.code,
        message: safeMessage(error.code),
        retryable: error.retryable,
        retryAfterSeconds: normalizeRetryAfter(error.retryAfterSeconds),
      };
    }
    return {
      code: "internal_error",
      message: "AI enhancement is temporarily unavailable.",
      retryable: true,
      status: 503,
    };
  }
  if (isAiConfigurationError(error)) return { code: "service_disabled", message: error.message, retryable: false };
  if (error instanceof AiInputError) return { code: "invalid_request", message: error.message, retryable: false };
  if (isAiCancellationError(error)) return { code: "internal_error", message: error.message, retryable: false };
  return { code: "internal_error", message: "AI enhancement failed.", retryable: false };
}

function statusForCode(code: EnhancementErrorCode): number {
  switch (code) {
    case "invalid_request":
      return 400;
    case "input_too_large":
      return 413;
    case "forbidden_origin":
      return 403;
    case "provider_timeout":
      return 504;
    case "provider_rate_limited":
      return 429;
    case "provider_refused":
    case "invalid_provider_response":
    case "output_too_large":
      return 502;
    case "service_disabled":
    case "service_unavailable":
    case "service_busy":
    case "provider_unavailable":
    case "model_unavailable":
    case "priced_route_unavailable":
      return 503;
    case "internal_error":
      return 500;
  }
}

function safeMessage(code: EnhancementErrorCode): string {
  switch (code) {
    case "invalid_request":
      return "The AI enhancement request is invalid.";
    case "input_too_large":
      return "The AI enhancement request is too large.";
    case "forbidden_origin":
      return "This origin is not allowed.";
    case "service_disabled":
      return "AI enhancement is unavailable.";
    case "service_unavailable":
      return "AI enhancement is temporarily unavailable.";
    case "service_busy":
      return "AI enhancement is busy. Please try again shortly.";
    case "provider_timeout":
      return "The AI provider timed out. Please try again.";
    case "provider_rate_limited":
      return "The AI provider is rate limited. Please try again later.";
    case "provider_unavailable":
      return "The AI provider is currently unavailable.";
    case "model_unavailable":
      return "The selected AI model is currently unavailable.";
    case "priced_route_unavailable":
      return "The zero-cost AI route is currently unavailable.";
    case "provider_refused":
      return "The AI provider rejected the request.";
    case "invalid_provider_response":
      return "The AI provider returned an invalid response.";
    case "output_too_large":
      return "The AI provider returned too much output.";
    case "internal_error":
      return "AI enhancement failed.";
  }
}

function isPublicErrorCode(code: string): code is EnhancementErrorCode {
  return (
    code === "invalid_request" ||
    code === "input_too_large" ||
    code === "forbidden_origin" ||
    code === "service_disabled" ||
    code === "service_unavailable" ||
    code === "service_busy" ||
    code === "provider_timeout" ||
    code === "provider_rate_limited" ||
    code === "provider_unavailable" ||
    code === "model_unavailable" ||
    code === "priced_route_unavailable" ||
    code === "provider_refused" ||
    code === "invalid_provider_response" ||
    code === "output_too_large" ||
    code === "internal_error"
  );
}

async function readRequestBody(request: Request): Promise<{ text: string; bytes: number; tooLarge: boolean }> {
  if (request.body === null) return { text: "", bytes: 0, tooLarge: false };

  const reader = request.body.getReader();
  const decoder = new TextDecoder("utf-8", { fatal: true });
  const chunks: string[] = [];
  let bytes = 0;
  try {
    for (;;) {
      const result = await reader.read();
      if (result.done) break;
      bytes += result.value.byteLength;
      if (bytes > MAX_REQUEST_BODY_BYTES) {
        try {
          const cancellation = reader.cancel();
          void cancellation.catch(() => undefined);
        } catch {
          // The byte limit is enforced even when a client stream cannot cancel cleanly.
        }
        return { text: "", bytes, tooLarge: true };
      }
      chunks.push(decoder.decode(result.value, { stream: true }));
    }
    chunks.push(decoder.decode());
    return { text: chunks.join(""), bytes, tooLarge: false };
  } catch {
    if (bytes > MAX_REQUEST_BODY_BYTES) return { text: "", bytes, tooLarge: true };
    throw new AiInputError();
  } finally {
    reader.releaseLock();
  }
}

function isJsonContentType(value: string | null): boolean {
  if (value === null) return false;
  return value.split(";", 1)[0]?.trim().toLowerCase() === "application/json";
}

function isPositiveInteger(value: string): boolean {
  return /^\d+$/.test(value.trim()) && Number.isSafeInteger(Number(value));
}

function normalizeRetryAfter(value: number | undefined): number | undefined {
  if (value === undefined || !Number.isFinite(value)) return undefined;
  return Math.max(0, Math.min(3_600, Math.floor(value)));
}

function normalizeRequestId(value: unknown): string {
  const safe = String(value ?? "")
    .replace(/[^A-Za-z0-9._:-]+/g, "-")
    .replace(/^-+|-+$/g, "")
    .slice(0, 64);
  return safe.length > 0 ? safe : "req-unknown";
}

function defaultRequestId(): string {
  if (typeof crypto !== "undefined" && typeof crypto.randomUUID === "function") return crypto.randomUUID();
  return `req-${Date.now().toString(36)}`;
}

function disabledModel(): ModelAdapter {
  return {
    async complete(): Promise<string> {
      throw new AiConfigurationError();
    },
  };
}
