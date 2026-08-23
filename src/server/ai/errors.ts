import type { EnhancementErrorCode } from "../../lib/ai-enhancement/contracts";

export const MAX_RETRY_AFTER_SECONDS = 3_600;

export const AI_PROVIDER_ERROR_CODES = [
  "provider_timeout",
  "provider_rate_limited",
  "provider_unavailable",
  "model_unavailable",
  "priced_route_unavailable",
  "provider_refused",
  "invalid_provider_response",
  "output_too_large",
] as const satisfies readonly EnhancementErrorCode[];

export type AiProviderErrorCode = (typeof AI_PROVIDER_ERROR_CODES)[number];

const SAFE_ERROR_MESSAGES: Readonly<Record<AiProviderErrorCode, string>> = {
  provider_timeout: "The AI provider timed out. Please try again.",
  provider_rate_limited: "The AI provider is rate limited. Please try again later.",
  provider_unavailable: "The AI provider is currently unavailable.",
  model_unavailable: "The selected AI model is currently unavailable.",
  priced_route_unavailable: "The zero-cost AI route is currently unavailable.",
  provider_refused: "The AI provider rejected the request.",
  invalid_provider_response: "The AI provider returned an invalid response.",
  output_too_large: "The AI provider returned too much output.",
};

const RETRYABLE_CODES: ReadonlySet<AiProviderErrorCode> = new Set([
  "provider_timeout",
  "provider_rate_limited",
  "provider_unavailable",
]);

export type AiOperationalMetadata = {
  code: AiProviderErrorCode;
  retryable: boolean;
  retryAfterSeconds?: number;
  status?: number;
};

export class AiProviderError extends Error {
  readonly code: AiProviderErrorCode;
  readonly retryable: boolean;
  readonly retryAfterSeconds?: number;
  readonly status?: number;

  constructor(
    code: AiProviderErrorCode,
    options: { retryAfterSeconds?: number; retryable?: boolean; status?: number } = {},
  ) {
    super(SAFE_ERROR_MESSAGES[code]);
    this.name = "AiProviderError";
    this.code = code;
    this.retryable = options.retryable ?? RETRYABLE_CODES.has(code);
    this.status = normalizeStatus(options.status);
    this.retryAfterSeconds = normalizeRetryAfter(options.retryAfterSeconds);
  }
}

export class AiConfigurationError extends Error {
  readonly code: Extract<EnhancementErrorCode, "service_disabled"> = "service_disabled";

  constructor() {
    super("AI enhancement is unavailable.");
    this.name = "AiConfigurationError";
  }
}

export class AiInputError extends Error {
  readonly code: Extract<EnhancementErrorCode, "invalid_request"> = "invalid_request";

  constructor() {
    super("The AI enhancement request is invalid.");
    this.name = "AiInputError";
  }
}

export class AiCancellationError extends Error {
  readonly code: Extract<EnhancementErrorCode, "internal_error"> = "internal_error";
  readonly retryable = false;

  constructor() {
    super("The AI request was cancelled.");
    this.name = "AiCancellationError";
  }
}

export function isAiProviderError(error: unknown): error is AiProviderError {
  return error instanceof AiProviderError;
}

export function isAiConfigurationError(error: unknown): error is AiConfigurationError {
  return error instanceof AiConfigurationError;
}

export function isAiCancellationError(error: unknown): error is AiCancellationError {
  return error instanceof AiCancellationError;
}

export function toAiOperationalMetadata(error: unknown): AiOperationalMetadata | null {
  if (!isAiProviderError(error)) return null;

  return {
    code: error.code,
    retryable: error.retryable,
    ...(error.retryAfterSeconds === undefined ? {} : { retryAfterSeconds: error.retryAfterSeconds }),
    ...(error.status === undefined ? {} : { status: error.status }),
  };
}

export function publicAiError(error: unknown): {
  code: EnhancementErrorCode;
  message: string;
  retryable: boolean;
  retryAfterSeconds?: number;
} {
  if (isAiProviderError(error)) {
    return {
      code: error.code,
      message: error.message,
      retryable: error.retryable,
      ...(error.retryAfterSeconds === undefined ? {} : { retryAfterSeconds: error.retryAfterSeconds }),
    };
  }
  if (isAiConfigurationError(error)) {
    return { code: error.code, message: error.message, retryable: false };
  }
  if (error instanceof AiInputError) {
    return { code: error.code, message: error.message, retryable: false };
  }
  if (isAiCancellationError(error)) {
    return { code: error.code, message: error.message, retryable: false };
  }
  return { code: "internal_error", message: "AI enhancement failed.", retryable: false };
}

function normalizeRetryAfter(value: number | undefined): number | undefined {
  if (value === undefined || !Number.isFinite(value)) return undefined;
  return Math.max(0, Math.min(MAX_RETRY_AFTER_SECONDS, Math.floor(value)));
}

function normalizeStatus(value: number | undefined): number | undefined {
  return value !== undefined && Number.isInteger(value) && value >= 100 && value <= 599 ? value : undefined;
}
