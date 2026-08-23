import { resolveTemplate } from "../prompt-engine/templates/resolve-template";
import type { SectionId } from "../prompt-engine/templates/template-types";
import type { PromptCategory, PromptTaskType } from "../prompt-engine/types";

type PromptPresetRecord<Id extends string = string> = {
  id: Id;
  label: string;
  category: PromptCategory;
  taskType: PromptTaskType;
  level: "standard";
  sections: readonly SectionId[];
};

function preset<const Id extends string>(id: Id, label: string, taskType: PromptTaskType): PromptPresetRecord<Id> {
  const template = resolveTemplate(taskType);
  return { id, label, category: template.category, taskType, level: "standard", sections: template.sections.standard };
}

export const PROMPT_PRESETS = [
  preset("bug-fix", "Bug Fix", "bug-fix"),
  preset("build-feature", "Build Feature", "feature"),
  preset("code-review", "Code Review", "code-review"),
  preset("refactor", "Refactor", "refactor"),
  preset("testing", "Testing", "testing"),
  preset("documentation", "Documentation", "documentation"),
  preset("api-design", "API Design", "feature"),
  preset("database", "Database", "feature"),
  preset("rewrite", "Rewrite", "rewrite"),
  preset("summarize", "Summarize", "summarize"),
  preset("improve-writing", "Improve Writing", "rewrite"),
  preset("research-topic", "Research Topic", "research"),
  preset("compare-options", "Compare Options", "comparison"),
  preset("analyze-information", "Analyze Information", "research"),
  preset("ui-design", "UI Design", "ui-review"),
  preset("ux-review", "UX Review", "ui-review"),
  preset("image-prompt", "Image Prompt", "image-prompt"),
] as const satisfies readonly PromptPresetRecord[];

function ids<const Presets extends readonly PromptPresetRecord[]>(
  presets: Presets,
): {
  readonly [Key in keyof Presets]: Presets[Key] extends PromptPresetRecord<infer Id> ? Id : never;
} {
  return presets.map((item) => item.id) as {
    readonly [Key in keyof Presets]: Presets[Key] extends PromptPresetRecord<infer Id> ? Id : never;
  };
}

export const PROMPT_PRESET_IDS = ids(PROMPT_PRESETS);
export type PromptPresetId = (typeof PROMPT_PRESET_IDS)[number];
export type PromptPreset = PromptPresetRecord<PromptPresetId>;

export function getPromptPreset(id: string): PromptPreset | undefined {
  return PROMPT_PRESETS.find((item) => item.id === id);
}
