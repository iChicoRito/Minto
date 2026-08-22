import type { SectionId } from "../../prompt-engine/templates/template-types";
import type { EnhancementLevel, PromptTaskType } from "../../prompt-engine/types";

export const PROMPT_SECTION_IDS = [
  "objective",
  "requirements",
  "constraints",
  "verification",
  "acceptance-criteria",
] as const satisfies readonly SectionId[];

export type PromptPreferenceSectionId = (typeof PROMPT_SECTION_IDS)[number];

export const PROMPT_TYPE_OPTIONS = [
  { value: "auto", label: "Auto Detect" },
  { value: "general", label: "General" },
  { value: "bug-fix", label: "Bug Fix" },
  { value: "feature", label: "Build Feature" },
  { value: "code-review", label: "Code Review" },
  { value: "refactor", label: "Refactor" },
  { value: "testing", label: "Testing" },
  { value: "documentation", label: "Documentation" },
  { value: "rewrite", label: "Rewrite" },
  { value: "summarize", label: "Summarize" },
  { value: "research", label: "Research" },
  { value: "comparison", label: "Compare Options" },
  { value: "ui-review", label: "UX Review" },
  { value: "image-prompt", label: "Image Prompt" },
] as const satisfies readonly { value: "auto" | PromptTaskType; label: string }[];

export const PROMPT_TYPE_VALUES = PROMPT_TYPE_OPTIONS.map((option) => option.value);
export type PromptPreferenceType = (typeof PROMPT_TYPE_VALUES)[number];

export const HISTORY_LIMIT_OPTIONS = [100, 250, 500, 1000] as const;
export type HistoryLimit = (typeof HISTORY_LIMIT_OPTIONS)[number];

export const DEFAULT_PROMPT_SECTIONS: readonly PromptPreferenceSectionId[] = [
  "objective",
  "requirements",
  "constraints",
  "verification",
];

export const DEFAULT_ENHANCEMENT_LEVEL: EnhancementLevel = "standard";
export const DEFAULT_HISTORY_ENABLED = true;
export const DEFAULT_PROMPT_TYPE: PromptPreferenceType = "auto";
export const DEFAULT_HISTORY_LIMIT: HistoryLimit = 500;

const PROMPT_SECTION_ID_SET = new Set<string>(PROMPT_SECTION_IDS);
const PROMPT_TYPE_SET = new Set<string>(PROMPT_TYPE_VALUES);

export function parsePromptType(raw: string | null | undefined): PromptPreferenceType {
  return raw && PROMPT_TYPE_SET.has(raw) ? (raw as PromptPreferenceType) : DEFAULT_PROMPT_TYPE;
}

export function parseHistoryLimit(raw: string | null | undefined): HistoryLimit {
  const parsed = Number(raw);
  return HISTORY_LIMIT_OPTIONS.includes(parsed as HistoryLimit) ? (parsed as HistoryLimit) : DEFAULT_HISTORY_LIMIT;
}

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
  key:
    | "default-enhancement-level"
    | "default-prompt-sections"
    | "history-enabled"
    | "default-prompt-type"
    | "history-max-entries",
  value: string,
): void {
  document.documentElement.setAttribute(`data-${key}`, value);
}
