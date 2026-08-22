import { resolveTemplate } from "../prompt-engine/templates/resolve-template";
import type { SectionId } from "../prompt-engine/templates/template-types";
import type { PromptCategory, PromptTaskType } from "../prompt-engine/types";

export type PromptPresetId =
  | "bug-fix"
  | "build-feature"
  | "code-review"
  | "refactor"
  | "testing"
  | "documentation"
  | "api-design"
  | "database"
  | "rewrite"
  | "summarize"
  | "improve-writing"
  | "research-topic"
  | "compare-options"
  | "analyze-information"
  | "ui-design"
  | "ux-review"
  | "image-prompt";

export type PromptPreset = {
  id: PromptPresetId;
  label: string;
  category: PromptCategory;
  taskType: PromptTaskType;
  level: "standard";
  sections: readonly SectionId[];
};

function preset(id: PromptPresetId, label: string, taskType: PromptTaskType): PromptPreset {
  const template = resolveTemplate(taskType);
  return { id, label, category: template.category, taskType, level: "standard", sections: template.sections.standard };
}

export const PROMPT_PRESETS: readonly PromptPreset[] = [
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
];

export function getPromptPreset(id: string): PromptPreset | undefined {
  return PROMPT_PRESETS.find((item) => item.id === id);
}
