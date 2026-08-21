/**
 * UI-review enhancement recipe (task type "ui-review", category "design").
 *
 * Authored under decision D3 (Q-03): mirrors the code-review recipe — the
 * same scope/areas/format skeleton applied to interfaces instead of code.
 *
 * @source authored-q03 (mirrors code-review recipe)
 */
import type { PromptTemplate } from "../template-types";

export const uiReviewTemplate: PromptTemplate = {
  id: "ui-review",
  category: "design",
  sections: {
    light: ["objective"],

    standard: ["objective", "review-areas", "output-format"],

    detailed: ["objective", "review-scope", "review-areas", "constraints", "output-format"],
  },
};
