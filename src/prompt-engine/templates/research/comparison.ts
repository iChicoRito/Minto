/**
 * Comparison enhancement recipe (task type "comparison",
 * category "research").
 *
 * Authored under decision D3 (Q-03): mirrors the research recipe —
 * research-scope becomes comparison-scope, key-questions become criteria.
 *
 * @source authored-q03 (mirrors research recipe with comparison-scope/criteria)
 */
import type { PromptTemplate } from "../template-types";

export const comparisonTemplate: PromptTemplate = {
  id: "comparison",
  category: "research",
  sections: {
    light: ["objective"],

    standard: ["objective", "criteria", "output-format"],

    detailed: ["objective", "comparison-scope", "criteria", "requirements", "output-format"],
  },
};
