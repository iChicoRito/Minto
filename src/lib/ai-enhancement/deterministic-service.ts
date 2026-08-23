import { enhancePrompt } from "../../prompt-engine";
import { getPromptPreset } from "../prompt-presets";
import type { EnhancementService } from "./client";
import {
  ENHANCEMENT_API_VERSION,
  ENHANCEMENT_LEVEL_CONFIG,
  type EnhancementRequestV1,
  type EnhancementSuccessV1,
} from "./contracts";

export type DeterministicServiceOptions = {
  requestId?: () => string;
};

export function createDeterministicEnhancementService(
  serviceOptions: DeterministicServiceOptions = {},
): EnhancementService {
  return {
    async enhance(request) {
      return enhanceDeterministically(request, serviceOptions);
    },
  };
}

export function enhanceDeterministically(
  request: EnhancementRequestV1,
  options: DeterministicServiceOptions = {},
): EnhancementSuccessV1 {
  const level = request.level;
  const preset = request.selection.kind === "preset" ? getPromptPreset(request.selection.presetId) : undefined;
  const explicitTaskType =
    request.selection.kind === "preset"
      ? preset?.taskType
      : request.selection.taskType === "auto"
        ? undefined
        : request.selection.taskType;

  // An explicitly empty selection relies on the picked prompt type: omitting
  // the section list lets the engine's template-driven rules choose the
  // sections for the level and parsed content.
  const engine = enhancePrompt(request.prompt, {
    level,
    ...(explicitTaskType === undefined ? {} : { taskType: explicitTaskType }),
    sections: request.sections.length > 0 ? [...request.sections] : undefined,
  });

  return {
    version: ENHANCEMENT_API_VERSION,
    ok: true,
    requestId: normalizeRequestId(options.requestId?.()),
    result: {
      analysis: engine.analysis,
      classification: engine.classification,
      resolved: {
        presetId: preset?.id ?? null,
        taskType: engine.resolved.taskType,
        category: engine.resolved.category,
        level,
        sections: engine.resolved.sections,
        reasoningEffort: ENHANCEMENT_LEVEL_CONFIG[level].reasoningEffort,
      },
      markdown: engine.markdown,
      generation: { kind: "deterministic" },
    },
  };
}

function normalizeRequestId(value: unknown): string {
  const safe = String(value ?? "")
    .replace(/[^A-Za-z0-9._:-]+/g, "-")
    .replace(/^-+|-+$/g, "")
    .slice(0, 64);
  return safe.length > 0 ? safe : "req-local";
}
