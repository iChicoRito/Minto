/**
 * Code-review enhancement recipe (task type "code-review",
 * category "development").
 *
 * Verbatim from the material's code-review recipe.
 *
 * @source material L456-L462 (code-review recipe verbatim)
 */
import type { PromptTemplate } from "../template-types";

export const codeReviewTemplate: PromptTemplate = {
  id: "code-review",
  category: "development",
  sections: {
    light: ["objective"],

    standard: ["objective", "review-scope", "output-format"],

    detailed: ["objective", "review-scope", "review-areas", "constraints", "output-format"],
  },
};
