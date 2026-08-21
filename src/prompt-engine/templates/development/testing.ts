/**
 * Testing enhancement recipe (task type "testing", category "development").
 *
 * No testing recipe exists in the material; authored under decision D3
 * (Q-03) as the minimal development recipe with scope added at detailed
 * strength to bound what gets tested.
 *
 * @source authored-q03 (no material recipe; minimal dev recipe + scope)
 */
import type { PromptTemplate } from "../template-types";

export const testingTemplate: PromptTemplate = {
  id: "testing",
  category: "development",
  sections: {
    light: ["objective"],

    standard: ["objective", "requirements", "verification"],

    detailed: ["objective", "scope", "requirements", "verification"],
  },
};
