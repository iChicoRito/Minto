/**
 * Feature enhancement recipe (task type "feature", category "development").
 *
 * Verbatim from the material's feature recipe; the heading "Acceptance
 * Criteria" maps to the normalized kebab-case id.
 *
 * @source material L444-L452 (feature recipe verbatim)
 */
import type { PromptTemplate } from "../template-types";

export const featureTemplate: PromptTemplate = {
  id: "feature",
  category: "development",
  sections: {
    light: ["objective"],

    standard: ["objective", "requirements", "verification"],

    detailed: [
      "objective",
      "context",
      "requirements",
      "constraints",
      "implementation",
      "verification",
      "acceptance-criteria",
    ],
  },
};
