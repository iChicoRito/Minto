/**
 * Image-prompt enhancement recipe (task type "image-prompt",
 * category "design").
 *
 * Authored under decision D3 (Q-03): subject anchors what is depicted,
 * style-direction carries the aesthetic, technical-requirements the
 * medium/resolution/aspect constraints.
 *
 * @source authored-q03 (subject/style-direction/technical-requirements for image generation)
 */
import type { PromptTemplate } from "../template-types";

export const imagePromptTemplate: PromptTemplate = {
  id: "image-prompt",
  category: "design",
  sections: {
    light: ["objective"],

    standard: ["objective", "style-direction", "output-format"],

    detailed: ["objective", "subject", "style-direction", "technical-requirements", "output-format"],
  },
};
