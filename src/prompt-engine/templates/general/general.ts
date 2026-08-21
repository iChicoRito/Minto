/**
 * General enhancement recipe (task type "general", category "general").
 *
 * Authored under decision D3 (Q-03): minimal fallback for low-confidence
 * classifications — identical across strengths, so raising the strength
 * never invents structure the input did not ask for.
 *
 * @source authored-q03 (minimal fallback identical across strengths)
 */
import type { PromptTemplate } from "../template-types";

export const generalTemplate: PromptTemplate = {
  id: "general",
  category: "general",
  sections: {
    light: ["objective"],

    standard: ["objective", "requirements", "verification"],

    detailed: ["objective", "requirements", "verification"],
  },
};
