/**
 * Documentation enhancement recipe (task type "documentation",
 * category "development").
 *
 * Authored under decision D3 (Q-03): verification steps become audience +
 * outline — prose deliverables are planned by reader and structure, not
 * tested; output-format carries the format contract.
 *
 * @source authored-q03 (audience + outline replace verification for prose)
 */
import type { PromptTemplate } from "../template-types";

export const documentationTemplate: PromptTemplate = {
  id: "documentation",
  category: "development",
  sections: {
    light: ["objective"],

    standard: ["objective", "requirements", "output-format"],

    detailed: ["objective", "audience", "requirements", "outline", "output-format"],
  },
};
