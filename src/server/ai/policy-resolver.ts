import {
  ENHANCEMENT_LEVEL_CONFIG,
  type EnhancementRequestV1,
  EnhancementRequestV1Schema,
} from "../../lib/ai-enhancement/contracts";
import { getPromptPreset, type PromptPresetId } from "../../lib/prompt-presets";
import { type EnhancementLevel, enhancePrompt, type PromptCategory, type PromptTaskType } from "../../prompt-engine";
import {
  allowedSectionIds,
  MANUAL_TASK_POLICIES,
  PRESET_AI_POLICIES,
  type ResolvedSectionPolicy,
  sectionPolicyFor,
} from "./preset-policies";

export type CompletionBudget = 2048 | 8192 | 32768;

export type ResolvedEnhancementPolicy = {
  presetId: PromptPresetId | null;
  taskType: PromptTaskType;
  category: PromptCategory;
  level: EnhancementLevel;
  reasoningEffort: "low" | "high" | "max";
  completionBudget: CompletionBudget;
  purpose: string;
  sections: readonly ResolvedSectionPolicy[];
};

export type { ResolvedSectionPolicy } from "./preset-policies";

function trustedRequest(request: EnhancementRequestV1): EnhancementRequestV1 {
  return EnhancementRequestV1Schema.parse(request);
}

function resolveTask(request: EnhancementRequestV1): {
  presetId: PromptPresetId | null;
  taskType: PromptTaskType;
  category: PromptCategory;
  policy: (typeof PRESET_AI_POLICIES)[PromptPresetId] | (typeof MANUAL_TASK_POLICIES)[PromptTaskType];
} {
  if (request.selection.kind === "preset") {
    const preset = getPromptPreset(request.selection.presetId);
    if (preset === undefined) throw new Error(`Unknown trusted preset: ${request.selection.presetId}`);
    return {
      presetId: preset.id,
      taskType: preset.taskType,
      category: preset.category,
      policy: PRESET_AI_POLICIES[preset.id],
    };
  }

  const taskType =
    request.selection.taskType === "auto"
      ? enhancePrompt(request.prompt, { level: request.level }).classification.taskType
      : request.selection.taskType;
  const policy = MANUAL_TASK_POLICIES[taskType];
  if (policy === undefined) throw new Error(`Unknown trusted task type: ${taskType}`);

  return { presetId: null, taskType, category: policy.category, policy };
}

function levelConfig(level: EnhancementLevel): {
  reasoningEffort: "low" | "high" | "max";
  completionBudget: CompletionBudget;
} {
  return ENHANCEMENT_LEVEL_CONFIG[level];
}

export function resolveTrustedPolicy(request: EnhancementRequestV1): ResolvedEnhancementPolicy {
  const trusted = trustedRequest(request);
  const { presetId, taskType, category, policy } = resolveTask(trusted);
  const allowedIds =
    trusted.selection.kind === "preset" ? policy.sections.map((section) => section.id) : allowedSectionIds(taskType);
  const selected = new Set(trusted.sections);

  // Requested sections outside the resolved task policy are dropped, never
  // honored: the browser can suggest only known ids, and the trusted policy
  // decides which of them apply. An explicitly empty request relies on the
  // picked prompt type and enhances with its full canonical section set; a
  // non-empty request that matches nothing falls back to the policy's first
  // canonical section rather than enhancing into an empty document.
  const requestedIds = trusted.sections;
  const resolvedSectionIds = requestedIds.length === 0 ? [] : allowedIds.filter((sectionId) => selected.has(sectionId));
  const effectiveIds =
    requestedIds.length === 0
      ? [...allowedIds]
      : resolvedSectionIds.length > 0
        ? resolvedSectionIds
        : allowedIds.slice(0, 1);
  const config = levelConfig(trusted.level);
  return {
    presetId,
    taskType,
    category,
    level: trusted.level,
    reasoningEffort: config.reasoningEffort,
    completionBudget: config.completionBudget,
    purpose: policy.purpose,
    sections: effectiveIds.map((sectionId) => sectionPolicyFor(policy, sectionId)),
  };
}
