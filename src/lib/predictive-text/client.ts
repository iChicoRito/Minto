import type { EnhancementErrorCode } from "../ai-enhancement/contracts";
import { PredictiveTextRequestV1Schema, PredictiveTextResponseV1Schema, type PredictiveTextService } from "./contracts";

export const DEFAULT_PREDICTIVE_TEXT_TIMEOUT_MS = 8_000;

const LOCAL_HTTP_HOSTNAMES = new Set(["localhost", "127.0.0.1", "[::1]", "[::]"]);

export type PredictiveTextClientErrorCode =
  | "invalid_endpoint"
  | "network"
  | "timeout"
  | "aborted"
  | "invalid_response"
  | EnhancementErrorCode;

export class PredictiveTextClientError extends Error {
  readonly code: PredictiveTextClientErrorCode;
  readonly retryable: boolean;
  readonly retryAfterSeconds?: number;

  constructor(
    code: PredictiveTextClientErrorCode,
    message: string,
    options?: { retryable?: boolean; retryAfterSeconds?: number },
  ) {
    super(message);
    this.name = "PredictiveTextClientError";
    this.code = code;
    this.retryable = options?.retryable ?? false;
    if (options?.retryAfterSeconds !== undefined) this.retryAfterSeconds = options.retryAfterSeconds;
  }
}

export function createPredictiveTextClient(config: {
  endpoint: string;
  fetchImpl?: typeof fetch;
  timeoutMs?: number;
  allowLocalHttpForTests?: boolean;
}): PredictiveTextService {
  const endpoint = validateEndpoint(config.endpoint, config.allowLocalHttpForTests === true);
  const fetchImpl = config.fetchImpl ?? fetch.bind(globalThis);
  const timeoutMs =
    typeof config.timeoutMs === "number" && Number.isFinite(config.timeoutMs) && config.timeoutMs > 0
      ? config.timeoutMs
      : DEFAULT_PREDICTIVE_TEXT_TIMEOUT_MS;

  return {
    async complete(request, options) {
      const parsedRequest = PredictiveTextRequestV1Schema.safeParse(request);
      if (!parsedRequest.success)
        throw new PredictiveTextClientError("invalid_request", "The prediction request is invalid.");

      const callerSignal = options?.signal;
      if (callerSignal?.aborted === true) throw abortedError();

      const controller = new AbortController();
      let timedOut = false;
      let callerAborted = false;
      const timer = setTimeout(() => {
        timedOut = true;
        controller.abort();
      }, timeoutMs);
      const forwardAbort = () => {
        callerAborted = true;
        controller.abort();
      };
      callerSignal?.addEventListener("abort", forwardAbort, { once: true });

      try {
        let response: Response;
        try {
          response = await fetchImpl(endpoint, {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({
              kind: parsedRequest.data.kind,
              version: parsedRequest.data.version,
              input: parsedRequest.data.input,
            }),
            credentials: "omit",
            cache: "no-store",
            signal: controller.signal,
          });
        } catch (error) {
          if (isAbortError(error) || callerAborted || callerSignal?.aborted) {
            throw timedOut ? timeoutError() : abortedError();
          }
          throw new PredictiveTextClientError("network", "The prediction service could not be reached.", {
            retryable: true,
          });
        }

        let payload: unknown;
        try {
          payload = await response.json();
        } catch {
          throw invalidResponseError();
        }
        if (callerAborted || callerSignal?.aborted) throw abortedError();
        if (timedOut) throw timeoutError();
        const parsedResponse = PredictiveTextResponseV1Schema.safeParse(payload);
        if (!parsedResponse.success) throw invalidResponseError();
        if (parsedResponse.data.ok === false) {
          throw new PredictiveTextClientError(parsedResponse.data.error.code, parsedResponse.data.error.message, {
            retryable: parsedResponse.data.error.retryable,
            retryAfterSeconds: parsedResponse.data.error.retryAfterSeconds,
          });
        }
        if (!response.ok) throw invalidResponseError();
        return parsedResponse.data;
      } finally {
        clearTimeout(timer);
        callerSignal?.removeEventListener("abort", forwardAbort);
      }
    },
  };
}

function validateEndpoint(value: string, allowLocalHttpForTests: boolean): string {
  if (value.startsWith("/") && !value.startsWith("//")) return value;
  let url: URL;
  try {
    url = new URL(value);
  } catch {
    throw endpointError();
  }
  if (url.protocol === "https:") return value;
  if (url.protocol === "http:" && allowLocalHttpForTests && LOCAL_HTTP_HOSTNAMES.has(url.hostname)) return value;
  throw endpointError();
}

function endpointError(): PredictiveTextClientError {
  return new PredictiveTextClientError("invalid_endpoint", "The prediction API endpoint must be an HTTPS URL.");
}

function abortedError(): PredictiveTextClientError {
  return new PredictiveTextClientError("aborted", "The prediction request was canceled.");
}

function timeoutError(): PredictiveTextClientError {
  return new PredictiveTextClientError("timeout", "The prediction request timed out.", { retryable: true });
}

function invalidResponseError(): PredictiveTextClientError {
  return new PredictiveTextClientError("invalid_response", "The prediction service returned an invalid response.");
}

function isAbortError(error: unknown): boolean {
  return (
    typeof error === "object" &&
    error !== null &&
    "name" in error &&
    (error as { name?: unknown }).name === "AbortError"
  );
}
