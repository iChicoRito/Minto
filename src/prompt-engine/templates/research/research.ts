/**
 * Research enhancement recipe (task type "research", category "research").
 *
 * Verbatim from the material's research recipe.
 *
 * @source material L466-L472 (research recipe verbatim)
 */
import type { PromptTemplate } from "../template-types";

export const researchTemplate: PromptTemplate = {
  id: "research",
  category: "research",
  sections: {
    light: ["objective"],

    standard: ["objective", "key-questions", "output-format"],

    detailed: ["objective", "research-scope", "key-questions", "requirements", "output-format"],
  },
};
