import { Redis } from "@upstash/redis";

export const ACTIVE_LEASE_KEY = "pe:active" as const;
export const DEFAULT_CONCURRENCY_LIMIT = 8 as const;
export const CONCURRENCY_LIMIT = DEFAULT_CONCURRENCY_LIMIT;
export const LEASE_TTL_MS = 90_000 as const;
export const CLEANUP_TTL_SECONDS = 120 as const;
export const BUSY_RETRY_AFTER_SECONDS = 3 as const;
export const REDIS_OPERATION_TIMEOUT_MS = 1_000 as const;

const ENABLED_VALUE = "true" as const;

/**
 * The active lease set is the only Redis key used by admission. Keeping the
 * prune, check, and add in one script makes the limit atomic across workers.
 */
export const ADMISSION_SCRIPT = `#!lua flags=allow-key-locking
local active_key = KEYS[1]
local now = tonumber(ARGV[1])
local redis_time = redis.call("TIME")
if redis_time[1] ~= nil and redis_time[2] ~= nil then
  now = tonumber(redis_time[1]) * 1000 + math.floor(tonumber(redis_time[2]) / 1000)
end
local lease_id = ARGV[2]
local lease_ttl_ms = tonumber(ARGV[3])
local cleanup_ttl_seconds = tonumber(ARGV[4])
local limit = tonumber(ARGV[5])

local pruned = redis.call("ZREMRANGEBYSCORE", active_key, "-inf", now)
local active_count = redis.call("ZCARD", active_key)
redis.call("EXPIRE", active_key, cleanup_ttl_seconds)

if active_count >= limit then
  local earliest = redis.call("ZRANGE", active_key, 0, 0, "WITHSCORES")
  local retry_after_ms = lease_ttl_ms
  if earliest[2] ~= nil then
    retry_after_ms = math.max(1, tonumber(earliest[2]) - now)
  end
  return {"busy", "", retry_after_ms, pruned, active_count, now}
end

redis.call("ZADD", active_key, now + lease_ttl_ms, lease_id)
redis.call("EXPIRE", active_key, cleanup_ttl_seconds)
return {"admitted", lease_id, lease_ttl_ms, pruned, active_count + 1, now}`;

export type AdmissionRedis = {
  eval: (script: string, keys: string[], args: string[]) => Promise<unknown>;
  zrem: (key: string, member: string) => Promise<unknown>;
};

export type AdmissionResult = {
  status: "admitted" | "busy" | "unavailable";
  leaseId?: string;
  expiresAt?: number;
  retryAfterMs: number;
  retryAfterSeconds: number;
  activeCount: number;
  prunedCount: number;
};

export interface Admission {
  acquire(): Promise<AdmissionResult>;
  release(leaseId: string): Promise<void>;
}

export class AdmissionBusyError extends Error {
  readonly code = "service_busy" as const;
  readonly retryable = true as const;
  readonly retryAfterSeconds: number;

  constructor(retryAfterSeconds: number = BUSY_RETRY_AFTER_SECONDS) {
    super("AI enhancement is busy. Please try again shortly.");
    this.name = "AdmissionBusyError";
    this.retryAfterSeconds = Math.max(1, Math.min(BUSY_RETRY_AFTER_SECONDS, Math.floor(retryAfterSeconds)));
  }
}

export class AdmissionUnavailableError extends Error {
  readonly code = "service_unavailable" as const;
  readonly retryable = true as const;

  constructor() {
    super("AI enhancement is temporarily unavailable.");
    this.name = "AdmissionUnavailableError";
  }
}

type AdmissionOptions = {
  redis?: AdmissionRedis;
  clock?: () => number;
  uuid?: () => string;
  environment?: Readonly<Record<string, string | undefined>>;
  operationTimeoutMs?: number;
  concurrencyLimit?: number;
};

/**
 * Local-development escape hatch: with no Redis configured and
 * AI_ADMISSION_OPEN=true, enhancement requests skip the global concurrency
 * lease entirely. Never enable this outside a developer machine; production
 * deployments fail closed instead.
 */
function createOpenAdmission(uuid: () => string): Admission {
  return {
    async acquire(): Promise<AdmissionResult> {
      let leaseId: string;
      try {
        leaseId = uuid();
      } catch {
        leaseId = `local-${Date.now().toString(36)}`;
      }
      return {
        status: "admitted",
        leaseId,
        expiresAt: Date.now() + LEASE_TTL_MS,
        retryAfterMs: 0,
        retryAfterSeconds: 0,
        activeCount: 1,
        prunedCount: 0,
      };
    },
    async release(): Promise<void> {
      // There is no shared lease state to clean up in local development.
    },
  };
}

export function createAdmission(options: AdmissionOptions = {}): Admission {
  const environment = options.environment ?? process.env;
  const redis = options.redis ?? createProductionRedis(environment);
  const clock = options.clock ?? Date.now;
  const uuid = options.uuid ?? defaultUuid;
  const operationTimeoutMs = normalizeOperationTimeout(options.operationTimeoutMs);
  const concurrencyLimit = normalizeConcurrencyLimit(
    options.concurrencyLimit ?? parseConcurrencyLimit(environment.AI_CONCURRENCY_LIMIT),
  );

  if (redis === undefined) {
    if (environment.AI_ADMISSION_OPEN === ENABLED_VALUE) return createOpenAdmission(uuid);
    return createUnavailableAdmission();
  }

  return {
    async acquire(): Promise<AdmissionResult> {
      const now = clock();
      const leaseId = uuid();

      try {
        const raw = await withTimeout(
          redis.eval(
            ADMISSION_SCRIPT,
            [ACTIVE_LEASE_KEY],
            [String(now), leaseId, String(LEASE_TTL_MS), String(CLEANUP_TTL_SECONDS), String(concurrencyLimit)],
          ),
          operationTimeoutMs,
        );
        return parseAdmissionResult(raw, now);
      } catch {
        return unavailableResult();
      }
    },
    async release(leaseId: string): Promise<void> {
      if (typeof leaseId !== "string" || leaseId.length === 0) return;
      try {
        await withTimeout(redis.zrem(ACTIVE_LEASE_KEY, leaseId), operationTimeoutMs);
      } catch {
        // The lease's sorted-set expiry is the crash-safe cleanup mechanism.
      }
    },
  };
}

function createUnavailableAdmission(): Admission {
  return {
    async acquire(): Promise<AdmissionResult> {
      return unavailableResult();
    },
    async release(): Promise<void> {
      // There is no lease when Redis is unavailable.
    },
  };
}

function createProductionRedis(environment: Readonly<Record<string, string | undefined>>): AdmissionRedis | undefined {
  const url = environment.UPSTASH_REDIS_REST_URL?.trim();
  const token = environment.UPSTASH_REDIS_REST_TOKEN?.trim();
  if (url === undefined || url.length === 0 || token === undefined || token.length === 0) return undefined;

  try {
    const redis = new Redis({ url, token });
    const script = redis.createScript<unknown>(ADMISSION_SCRIPT);
    return {
      eval: (_source, keys, args) => script.eval([...keys], [...args]),
      zrem: (key, member) => redis.zrem(key, member),
    };
  } catch {
    return undefined;
  }
}

function parseAdmissionResult(raw: unknown, now: number): AdmissionResult {
  if (!Array.isArray(raw) || raw.length < 5) return unavailableResult();

  const status = raw[0];
  const leaseId = raw[1];
  const timing = safeInteger(raw[2]);
  const prunedCount = safeInteger(raw[3]);
  const activeCount = safeInteger(raw[4]);
  const serverNow = safeInteger(raw[5]);
  if (timing === undefined || prunedCount === undefined || activeCount === undefined) return unavailableResult();

  if (status === "admitted" && typeof leaseId === "string" && leaseId.length > 0) {
    return {
      status,
      leaseId,
      expiresAt: (serverNow ?? now) + LEASE_TTL_MS,
      retryAfterMs: 0,
      retryAfterSeconds: 0,
      activeCount,
      prunedCount,
    };
  }

  if (status === "busy") {
    const retryAfterMs = Math.max(1, timing);
    return {
      status,
      retryAfterMs,
      retryAfterSeconds: Math.min(BUSY_RETRY_AFTER_SECONDS, Math.max(1, Math.ceil(retryAfterMs / 1_000))),
      activeCount,
      prunedCount,
    };
  }

  return unavailableResult();
}

function unavailableResult(): AdmissionResult {
  return { status: "unavailable", retryAfterMs: 0, retryAfterSeconds: 0, activeCount: 0, prunedCount: 0 };
}

function safeInteger(value: unknown): number | undefined {
  const number = typeof value === "number" ? value : typeof value === "string" ? Number(value) : Number.NaN;
  return Number.isSafeInteger(number) && number >= 0 ? number : undefined;
}

function defaultUuid(): string {
  if (typeof crypto !== "undefined" && typeof crypto.randomUUID === "function") return crypto.randomUUID();
  throw new Error("secure UUID generation is unavailable");
}

function normalizeOperationTimeout(value: number | undefined): number {
  return typeof value === "number" && Number.isSafeInteger(value) && value > 0 ? value : REDIS_OPERATION_TIMEOUT_MS;
}

function parseConcurrencyLimit(value: string | undefined): number | undefined {
  if (value === undefined || !/^\d+$/.test(value.trim())) return undefined;
  const parsed = Number(value);
  return Number.isSafeInteger(parsed) && parsed > 0 ? parsed : undefined;
}

function normalizeConcurrencyLimit(value: number | undefined): number {
  return typeof value === "number" && Number.isSafeInteger(value) && value > 0 ? value : CONCURRENCY_LIMIT;
}

async function withTimeout<T>(operation: Promise<T>, timeoutMs: number): Promise<T> {
  let timer: ReturnType<typeof setTimeout> | undefined;
  try {
    return await Promise.race([
      operation,
      new Promise<T>((_, reject) => {
        timer = setTimeout(() => reject(new Error("Redis operation timed out")), timeoutMs);
      }),
    ]);
  } finally {
    if (timer !== undefined) clearTimeout(timer);
  }
}
