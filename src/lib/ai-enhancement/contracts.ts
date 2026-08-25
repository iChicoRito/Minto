import { z } from "zod";

import type { ClassificationResult } from "../../prompt-engine/classifier/classify-prompt";
import { SECTION_TITLES, type SectionId } from "../../prompt-engine/templates/template-types";
import type { EnhancementLevel, PromptAnalysis, PromptCategory, PromptTaskType } from "../../prompt-engine/types";
import { PROMPT_PRESET_IDS, type PromptPresetId } from "../prompt-presets";

export const ENHANCEMENT_API_VERSION = 1 as const;

/** Canonical AI provenance emitted by the version-1 response contract. */
export const DEEPSEEK_PROVIDER = "deepseek" as const;
export const DEEPSEEK_MODEL = "deepseek-v4-flash" as const;

export const MAX_PROMPT_CHARACTERS = 15_000;
export const MAX_REQUEST_BODY_BYTES = 128 * 1024;
export const MAX_MODEL_OUTPUT_BYTES = 64 * 1024;
export const MAX_NORMALIZED_MARKDOWN_CHARACTERS = 24_000;
export const MAX_ITEMS_PER_SECTION = 20;
export const MAX_CHARS_PER_ITEM = 2_000;

const SECTION_ID_VALUES = Object.keys(SECTION_TITLES) as [SectionId, ...SectionId[]];
export const MAX_SELECTED_SECTIONS = SECTION_ID_VALUES.length;

export const SECTION_LIMITS = {
  maxSelectedSections: MAX_SELECTED_SECTIONS,
  maxItemsPerSection: MAX_ITEMS_PER_SECTION,
  maxCharsPerItem: MAX_CHARS_PER_ITEM,
} as const;

export type ReasoningEffort = "low" | "high" | "max";

export const ENHANCEMENT_LEVEL_CONFIG = {
  light: { reasoningEffort: "low", completionBudget: 2048 },
  standard: { reasoningEffort: "high", completionBudget: 8192 },
  detailed: { reasoningEffort: "max", completionBudget: 32768 },
} as const satisfies Record<EnhancementLevel, { reasoningEffort: ReasoningEffort; completionBudget: number }>;

const TASK_TYPE_VALUES = [
  "bug-fix",
  "feature",
  "code-review",
  "refactor",
  "testing",
  "documentation",
  "rewrite",
  "summarize",
  "research",
  "comparison",
  "ui-review",
  "image-prompt",
  "general",
] as const satisfies readonly PromptTaskType[];

const CATEGORY_VALUES = [
  "development",
  "writing",
  "research",
  "design",
  "general",
] as const satisfies readonly PromptCategory[];
const LEVEL_VALUES = ["light", "standard", "detailed"] as const satisfies readonly EnhancementLevel[];
const REASONING_EFFORT_VALUES = ["low", "high", "max"] as const satisfies readonly ReasoningEffort[];

const taskTypeSchema = z.enum(TASK_TYPE_VALUES);
const categorySchema = z.enum(CATEGORY_VALUES);
const levelSchema = z.enum(LEVEL_VALUES);
const reasoningEffortSchema = z.enum(REASONING_EFFORT_VALUES);
const promptPresetIdSchema = z.enum(PROMPT_PRESET_IDS);
const sectionIdSchema = z.enum(SECTION_ID_VALUES);

const selectedSectionsSchema = z
  .array(sectionIdSchema)
  .min(0)
  .max(MAX_SELECTED_SECTIONS)
  .superRefine((sections, context) => {
    if (new Set(sections).size !== sections.length) {
      context.addIssue({ code: "custom", message: "selected sections must not contain duplicates" });
    }
  })
  .readonly();

export type EnhancementSelectionV1 =
  | { kind: "preset"; presetId: PromptPresetId }
  | { kind: "manual"; taskType: "auto" | PromptTaskType };

const enhancementSelectionV1Schema = z.discriminatedUnion("kind", [
  z.object({ kind: z.literal("preset"), presetId: promptPresetIdSchema }).strict(),
  z.object({ kind: z.literal("manual"), taskType: z.union([z.literal("auto"), taskTypeSchema]) }).strict(),
]);

export type EnhancementRequestV1 = {
  version: 1;
  prompt: string;
  selection: EnhancementSelectionV1;
  level: EnhancementLevel;
  sections: readonly SectionId[];
};

export const EnhancementRequestV1Schema = z
  .object({
    version: z.literal(ENHANCEMENT_API_VERSION),
    prompt: z
      .string()
      .min(1)
      .max(MAX_PROMPT_CHARACTERS)
      .refine((prompt) => prompt.trim().length > 0, "prompt must contain non-whitespace text"),
    selection: enhancementSelectionV1Schema,
    level: levelSchema,
    sections: selectedSectionsSchema,
  })
  .strict();

export type GenerationDescriptor =
  | { kind: "ai"; provider: typeof DEEPSEEK_PROVIDER; model: typeof DEEPSEEK_MODEL }
  | { kind: "deterministic" };

const generationDescriptorSchema = z.discriminatedUnion("kind", [
  z
    .object({
      kind: z.literal("ai"),
      provider: z.literal(DEEPSEEK_PROVIDER),
      model: z.literal(DEEPSEEK_MODEL),
    })
    .strict(),
  z.object({ kind: z.literal("deterministic") }).strict(),
]);

const promptAnalysisSchema = z
  .object({
    original: z.string(),
    category: categorySchema,
    taskType: taskTypeSchema,
    confidence: z.number().finite(),
    action: z.string().optional(),
    subject: z.string().optional(),
    domain: z.string().optional(),
    technologies: z.array(z.string()),
    constraints: z.array(z.string()),
    requirements: z.array(z.string()),
    enhancementLevel: levelSchema,
  })
  .strict();

const classificationResultSchema = z
  .object({
    taskType: taskTypeSchema,
    category: categorySchema,
    confidence: z.number().finite(),
    band: z.enum(["high", "medium", "low"]),
    scores: z.record(taskTypeSchema, z.number().finite()),
    fallbackToGeneral: z.boolean(),
    topMatches: z.array(taskTypeSchema).readonly(),
  })
  .strict();

const resolvedEnhancementSchema = z
  .object({
    presetId: promptPresetIdSchema.nullable(),
    taskType: taskTypeSchema,
    category: categorySchema,
    level: levelSchema,
    sections: selectedSectionsSchema,
    reasoningEffort: reasoningEffortSchema,
  })
  .strict();

export type EnhancementResultV1 = {
  analysis: PromptAnalysis;
  classification: ClassificationResult;
  resolved: {
    presetId: PromptPresetId | null;
    taskType: PromptTaskType;
    category: PromptCategory;
    level: EnhancementLevel;
    sections: readonly SectionId[];
    reasoningEffort: ReasoningEffort;
  };
  markdown: string;
  generation: GenerationDescriptor;
};

const enhancementResultV1Schema = z
  .object({
    analysis: promptAnalysisSchema,
    classification: classificationResultSchema,
    resolved: resolvedEnhancementSchema,
    markdown: z.string().max(MAX_NORMALIZED_MARKDOWN_CHARACTERS),
    generation: generationDescriptorSchema,
  })
  .strict();

export type EnhancementSuccessV1 = {
  version: 1;
  ok: true;
  requestId: string;
  result: EnhancementResultV1;
};

export const ENHANCEMENT_ERROR_CODES = [
  "invalid_request",
  "input_too_large",
  "forbidden_origin",
  "service_disabled",
  "service_unavailable",
  "service_busy",
  "provider_timeout",
  "provider_rate_limited",
  "provider_unavailable",
  "model_unavailable",
  "priced_route_unavailable",
  "provider_refused",
  "invalid_provider_response",
  "output_too_large",
  "internal_error",
] as const;

export type EnhancementErrorCode = (typeof ENHANCEMENT_ERROR_CODES)[number];

const enhancementErrorCodeSchema = z.enum(ENHANCEMENT_ERROR_CODES);

export type EnhancementErrorV1 = {
  version: 1;
  ok: false;
  requestId: string;
  error: {
    code: EnhancementErrorCode;
    message: string;
    retryable: boolean;
    retryAfterSeconds?: number;
  };
};

export const EnhancementSuccessV1Schema = z
  .object({
    version: z.literal(ENHANCEMENT_API_VERSION),
    ok: z.literal(true),
    requestId: z.string().min(1),
    result: enhancementResultV1Schema,
  })
  .strict();

export const EnhancementErrorV1Schema = z
  .object({
    version: z.literal(ENHANCEMENT_API_VERSION),
    ok: z.literal(false),
    requestId: z.string().min(1),
    error: z
      .object({
        code: enhancementErrorCodeSchema,
        message: z.string().min(1),
        retryable: z.boolean(),
        retryAfterSeconds: z.number().int().nonnegative().optional(),
      })
      .strict(),
  })
  .strict();

export type EnhancementResponseV1 = EnhancementSuccessV1 | EnhancementErrorV1;

export const EnhancementResponseV1Schema = z.discriminatedUnion("ok", [
  EnhancementSuccessV1Schema,
  EnhancementErrorV1Schema,
]);

export {
  classificationResultSchema,
  enhancementResultV1Schema,
  enhancementSelectionV1Schema,
  generationDescriptorSchema,
  promptAnalysisSchema,
  resolvedEnhancementSchema,
  selectedSectionsSchema,
};
