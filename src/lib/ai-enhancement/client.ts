import {
  ENHANCEMENT_API_VERSION,
  type EnhancementErrorCode,
  type EnhancementRequestV1,
  EnhancementResponseV1Schema,
  type EnhancementSuccessV1,
} from "./contracts";

export const DEFAULT_ENHANCEMENT_TIMEOUT_MS = 70_000;

const LOCAL_HTTP_HOSTNAMES = new Set(["localhost", "127.0.0.1", "[::1]", "[::]"]);

export type AiEnhancementClientErrorCode =
  | "invalid_endpoint"
  | "network"
  | "timeout"
  | "aborted"
  | "invalid_response"
  | EnhancementErrorCode;

export class AiEnhancementClientError extends Error {
  readonly code: AiEnhancementClientErrorCode;
  readonly retryable: boolean;
  readonly retryAfterSeconds?: number;

  constructor(
    code: AiEnhancementClientErrorCode,
    message: string,
    options?: { retryable?: boolean; retryAfterSeconds?: number },
  ) {
    super(message);
    this.name = "AiEnhancementClientError";
    this.code = code;
    this.retryable = options?.retryable ?? false;
    if (options?.retryAfterSeconds !== undefined) this.retryAfterSeconds = options.retryAfterSeconds;
  }
}

export type EnhancementService = {
  enhance(request: EnhancementRequestV1, options?: { signal?: AbortSignal }): Promise<EnhancementSuccessV1>;
};

export type AiEnhancementClientConfig = {
  endpoint: string;
  fetchImpl?: typeof fetch;
  timeoutMs?: number;
  allowLocalHttpForTests?: boolean;
};

export function createAiEnhancementClient(config: AiEnhancementClientConfig): EnhancementService {
  const endpoint = validateEndpoint(config.endpoint, config.allowLocalHttpForTests === true);
  const fetchImpl = config.fetchImpl ?? fetch.bind(globalThis);
  const timeoutMs =
    typeof config.timeoutMs === "number" && Number.isFinite(config.timeoutMs) && config.timeoutMs > 0
      ? config.timeoutMs
      : DEFAULT_ENHANCEMENT_TIMEOUT_MS;

  return {
    async enhance(request, options) {
      const callerSignal = options?.signal;
      if (callerSignal?.aborted === true) throw abortedError();

      const controller = new AbortController();
      let timedOut = false;
      const timer = setTimeout(() => {
        timedOut = true;
        controller.abort();
      }, timeoutMs);
      const forwardAbort = () => controller.abort();
      callerSignal?.addEventListener("abort", forwardAbort);

      try {
        let response: Response;
        try {
          response = await fetchImpl(endpoint, {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({
              version: ENHANCEMENT_API_VERSION,
              prompt: request.prompt,
              selection:
                request.selection.kind === "preset"
                  ? { kind: "preset", presetId: request.selection.presetId }
                  : { kind: "manual", taskType: request.selection.taskType },
              level: request.level,
              sections: [...request.sections],
            }),
            credentials: "omit",
            cache: "no-store",
            signal: controller.signal,
          });
        } catch (error) {
          if (isAbortError(error)) {
            throw timedOut
              ? new AiEnhancementClientError("timeout", "The enhancement request timed out.", { retryable: true })
              : abortedError();
          }
          throw new AiEnhancementClientError("network", "The enhancement service could not be reached.", {
            retryable: true,
          });
        }

        let payload: unknown;
        try {
          payload = await response.json();
        } catch {
          throw invalidResponseError();
        }

        const parsed = EnhancementResponseV1Schema.safeParse(payload);
        if (!parsed.success) throw invalidResponseError();

        if (parsed.data.ok === false) {
          throw new AiEnhancementClientError(parsed.data.error.code, parsed.data.error.message, {
            retryable: parsed.data.error.retryable,
            retryAfterSeconds: parsed.data.error.retryAfterSeconds,
          });
        }

        if (!response.ok) throw invalidResponseError();
        return parsed.data;
      } finally {
        clearTimeout(timer);
        callerSignal?.removeEventListener("abort", forwardAbort);
      }
    },
  };
}

function validateEndpoint(value: string, allowLocalHttpForTests: boolean): string {
  // Same-origin relative endpoints (e.g. "/api/enhance") are always allowed;
  // the browser resolves them against the current origin.
  if (value.startsWith("/")) return value;

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

function endpointError(): AiEnhancementClientError {
  return new AiEnhancementClientError("invalid_endpoint", "The enhancement API endpoint must be an HTTPS URL.");
}

function abortedError(): AiEnhancementClientError {
  return new AiEnhancementClientError("aborted", "The enhancement request was canceled.");
}

function invalidResponseError(): AiEnhancementClientError {
  return new AiEnhancementClientError("invalid_response", "The enhancement service returned an invalid response.");
}

function isAbortError(error: unknown): boolean {
  return (
    typeof error === "object" &&
    error !== null &&
    "name" in error &&
    (error as { name?: unknown }).name === "AbortError"
  );
}
