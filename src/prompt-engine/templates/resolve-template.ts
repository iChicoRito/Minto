/**
 * Template resolver (roadmap R-10, tracker T-22): single lookup from a
 * classified task type to its enhancement recipe. Total over the union —
 * the registry's Record typing guarantees an entry for every task type, so
 * no fallback path exists.
 *
 * Purity: relative imports into the templates layer only; deterministic.
 */

import type { PromptTaskType } from "../types";
import { TEMPLATE_REGISTRY } from "./registry";
import type { PromptTemplate } from "./template-types";

export function resolveTemplate(taskType: PromptTaskType): PromptTemplate {
  return TEMPLATE_REGISTRY[taskType];
}
