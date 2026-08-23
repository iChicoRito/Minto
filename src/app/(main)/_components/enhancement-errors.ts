import { AiEnhancementClientError } from "../../../lib/ai-enhancement/client";

/** Availability and contract failures may be answered with the explicit local-rules action. */
export const FALLBACK_ELIGIBLE_CODES = new Set([
  "service_disabled",
  "service_unavailable",
  "service_busy",
  "provider_timeout",
  "provider_rate_limited",
  "provider_unavailable",
  "model_unavailable",
  "priced_route_unavailable",
  "provider_refused",
  "invalid_provider_response",
  "output_too_large",
  "network",
  "timeout",
  "invalid_response",
]);

/**
 * The only usage-limit signal the client receives is the provider's
 * rate-limit rejection, which for the zero-cost route means the hourly
 * allowance is exhausted. Surfaced with plain wording only: never show quota
 * figures, retry timers, status codes, or provider details.
 */
export const HOURLY_LIMIT_MESSAGE = "You've reached your enhancement limit for this hour. Please try again later.";

export function isHourlyLimitReached(code: string | undefined): boolean {
  return code === "provider_rate_limited";
}

export function enhancementErrorCode(error: unknown): string | undefined {
  return error instanceof AiEnhancementClientError ? error.code : undefined;
}

export function describeError(error: unknown): { message: string; retryable: boolean; fallbackEligible: boolean } {
  if (error instanceof AiEnhancementClientError) {
    const message = describeCode(error.code);
    return {
      message,
      retryable: error.retryable || error.code === "timeout" || error.code === "network",
      fallbackEligible: FALLBACK_ELIGIBLE_CODES.has(error.code),
    };
  }
  return { message: describeCode("internal_error"), retryable: true, fallbackEligible: true };
}

export function describeCode(code: string): string {
  switch (code) {
    case "invalid_endpoint":
    case "forbidden_origin":
      return "The enhancement service is not configured for this site.";
    case "service_disabled":
      return "Enhancement is unavailable right now.";
    case "service_unavailable":
      return "Enhancement is temporarily unavailable.";
    case "service_busy":
      return "The enhancement service is busy. Please try again shortly.";
    case "provider_timeout":
    case "timeout":
      return "The enhancement service timed out. Please try again.";
    case "provider_rate_limited":
      return HOURLY_LIMIT_MESSAGE;
    case "provider_unavailable":
    case "network":
      return "The enhancement service could not be reached.";
    case "model_unavailable":
      return "The enhancement service is currently unavailable.";
    case "priced_route_unavailable":
      return "The free enhancement route is currently unavailable.";
    case "provider_refused":
      return "The request was rejected. Please adjust the prompt and try again.";
    case "invalid_provider_response":
    case "invalid_response":
      return "Try again.";
    case "output_too_large":
      return "The response exceeded its size limit. Try a shorter prompt.";
    default:
      return "Enhancement failed. Please try again.";
  }
}
