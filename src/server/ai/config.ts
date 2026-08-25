export const DEEPSEEK_ENDPOINT = "https://api.deepseek.com/chat/completions" as const;
export const DEEPSEEK_MODEL = "deepseek-v4-flash" as const;
export const DEEPSEEK_PROVIDER = "deepseek" as const;
export const DEFAULT_DEEPSEEK_TIMEOUT_MS = 65_000 as const;

const ENABLED_VALUE = "true" as const;

export type AiEnvironment = Readonly<Record<string, string | undefined>>;

export type AiConfig = {
  apiKey: string;
  endpoint: typeof DEEPSEEK_ENDPOINT;
  model: typeof DEEPSEEK_MODEL;
  provider: typeof DEEPSEEK_PROVIDER;
  timeoutMs: number;
};

export function getAiConfig(environment: AiEnvironment = process.env): AiConfig | null {
  if (environment.AI_ENHANCEMENT_ENABLED !== ENABLED_VALUE) return null;

  const apiKey = environment.DEEPSEEK_API_KEY?.trim();
  if (apiKey === undefined || apiKey.length === 0) return null;

  return {
    apiKey,
    endpoint: DEEPSEEK_ENDPOINT,
    model: DEEPSEEK_MODEL,
    provider: DEEPSEEK_PROVIDER,
    timeoutMs: positiveInteger(environment.DEEPSEEK_TIMEOUT_MS) ?? DEFAULT_DEEPSEEK_TIMEOUT_MS,
  };
}

export const loadAiConfig = getAiConfig;

export function getAllowedOrigin(environment: AiEnvironment = process.env): string | null {
  const value = nonBlank(environment.ALLOWED_ORIGIN);
  if (value === undefined) return null;

  try {
    const parsed = new URL(value);
    if (parsed.protocol !== "http:" && parsed.protocol !== "https:") return null;
    if (
      parsed.username.length > 0 ||
      parsed.password.length > 0 ||
      parsed.pathname !== "/" ||
      parsed.search ||
      parsed.hash
    ) {
      return null;
    }
    return parsed.origin === value ? value : null;
  } catch {
    return null;
  }
}

function nonBlank(value: string | undefined): string | undefined {
  const normalized = value?.trim();
  return normalized === undefined || normalized.length === 0 ? undefined : normalized;
}

function positiveInteger(value: string | undefined): number | undefined {
  if (value === undefined || !/^\d+$/.test(value.trim())) return undefined;
  const parsed = Number(value);
  return Number.isSafeInteger(parsed) && parsed > 0 ? parsed : undefined;
}
