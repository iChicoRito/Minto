export const MAX_PROMPT_CHARACTERS = 15_000;

export type PromptValidation = { ok: true } | { ok: false; reason: "empty" | "too-long"; message: string };

export function validatePrompt(raw: string): PromptValidation {
  if (raw.trim().length === 0) return { ok: false, reason: "empty", message: "Please enter a prompt." };
  if (raw.length > MAX_PROMPT_CHARACTERS) {
    return {
      ok: false,
      reason: "too-long",
      message: `Prompts are limited to ${MAX_PROMPT_CHARACTERS} characters.`,
    };
  }
  return { ok: true };
}
