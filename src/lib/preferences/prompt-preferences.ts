import type { SectionId } from "../../prompt-engine/templates/template-types";
import type { EnhancementLevel } from "../../prompt-engine/types";

export const PROMPT_SECTION_IDS = [
  "objective",
  "requirements",
  "constraints",
  "verification",
  "acceptance-criteria",
] as const satisfies readonly SectionId[];

export type PromptPreferenceSectionId = (typeof PROMPT_SECTION_IDS)[number];

export const DEFAULT_PROMPT_SECTIONS: readonly PromptPreferenceSectionId[] = [
  "objective",
  "requirements",
  "constraints",
  "verification",
];

export const DEFAULT_ENHANCEMENT_LEVEL: EnhancementLevel = "standard";
export const DEFAULT_HISTORY_ENABLED = true;

const PROMPT_SECTION_ID_SET = new Set<string>(PROMPT_SECTION_IDS);

export function serializePromptSections(sections: readonly SectionId[]): string {
  const valid = sections.filter((section): section is PromptPreferenceSectionId => PROMPT_SECTION_ID_SET.has(section));
  const unique = [...new Set(valid)];
  if (!unique.includes("objective")) unique.unshift("objective");
  return unique.join(",");
}

export function parsePromptSections(raw: string | null | undefined): readonly PromptPreferenceSectionId[] {
  if (!raw) return DEFAULT_PROMPT_SECTIONS;

  const parsed = raw
    .split(",")
    .filter((section): section is PromptPreferenceSectionId => PROMPT_SECTION_ID_SET.has(section));
  const unique = [...new Set(parsed)];
  if (!unique.includes("objective")) unique.unshift("objective");
  return unique.length > 0 ? unique : DEFAULT_PROMPT_SECTIONS;
}

export function applyPromptPreferenceAttribute(
  key: "default-enhancement-level" | "default-prompt-sections" | "history-enabled",
  value: string,
): void {
  document.documentElement.setAttribute(`data-${key}`, value);
}
