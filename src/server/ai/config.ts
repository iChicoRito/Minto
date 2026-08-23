export const OPENROUTER_ENDPOINT = "https://openrouter.ai/api/v1/chat/completions" as const;
export const OPENROUTER_MODEL = "stealth/ox-alpha" as const;
export const OPENROUTER_PROVIDER = "stealth" as const;
export const DEFAULT_OPENROUTER_TIMEOUT_MS = 65_000 as const;
export const DEFAULT_OPENROUTER_SITE_URL = "https://ichicorito.github.io/prompt-enhancer/" as const;
export const DEFAULT_OPENROUTER_APP_TITLE = "Prompt Enhancer" as const;

const ENABLED_VALUE = "true" as const;

export type AiEnvironment = Readonly<Record<string, string | undefined>>;

export type AiConfig = {
  apiKey: string;
  endpoint: typeof OPENROUTER_ENDPOINT;
  model: typeof OPENROUTER_MODEL;
  provider: typeof OPENROUTER_PROVIDER;
  timeoutMs: number;
  siteUrl?: string;
  appTitle?: string;
};

export function getAiConfig(environment: AiEnvironment = process.env): AiConfig | null {
  if (environment.AI_ENHANCEMENT_ENABLED !== ENABLED_VALUE) return null;

  const apiKey = environment.OPENROUTER_API_KEY?.trim();
  if (apiKey === undefined || apiKey.length === 0) return null;

  const siteUrl = httpsUrl(environment.OPENROUTER_SITE_URL);
  const appTitle = nonBlank(environment.OPENROUTER_APP_TITLE);
  return {
    apiKey,
    endpoint: OPENROUTER_ENDPOINT,
    model: OPENROUTER_MODEL,
    provider: OPENROUTER_PROVIDER,
    timeoutMs: positiveInteger(environment.OPENROUTER_TIMEOUT_MS) ?? DEFAULT_OPENROUTER_TIMEOUT_MS,
    ...(siteUrl === undefined ? {} : { siteUrl }),
    ...(appTitle === undefined ? {} : { appTitle }),
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

function httpsUrl(value: string | undefined): string | undefined {
  const normalized = nonBlank(value);
  if (normalized === undefined) return undefined;

  try {
    const parsed = new URL(normalized);
    return parsed.protocol === "https:" && parsed.username.length === 0 && parsed.password.length === 0
      ? normalized
      : undefined;
  } catch {
    return undefined;
  }
}
