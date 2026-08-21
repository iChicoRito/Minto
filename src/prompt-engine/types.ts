/**
 * Prompt engine data model: types only. No runtime values, no schemas
 * (deliberately deferred to Phase 2), and no framework dependencies of any
 * kind; the engine layer never pulls in view or routing libraries.
 *
 * Data model per prompt-enhancer-detailed-context.md lines 206-262
 * (material Phase 4); vocabulary stays verbatim to that source.
 */

/** Result of classifying a raw prompt. */
export type PromptAnalysis = {
  original: string;
  category: PromptCategory;
  taskType: PromptTaskType;
  confidence: number;

  /** Optional extracted slots. */
  action?: string;
  subject?: string;
  domain?: string;

  /** Extracted list slots. */
  technologies: string[];
  constraints: string[];
  requirements: string[];

  /** Requested enhancement strength. */
  enhancementLevel: EnhancementLevel;
};

export type PromptCategory = "development" | "writing" | "research" | "design" | "general";

export type PromptTaskType =
  | "bug-fix"
  | "feature"
  | "code-review"
  | "refactor"
  | "testing"
  | "documentation"
  | "rewrite"
  | "summarize"
  | "research"
  | "comparison"
  | "ui-review"
  | "image-prompt"
  | "general";

export type EnhancementLevel = "light" | "standard" | "detailed";
