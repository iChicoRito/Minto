/**
 * Summarize enhancement recipe (task type "summarize", category "writing").
 *
 * Authored under decision D3 (Q-03): key-points names the summary
 * deliverable; source-content joins at detailed strength so long inputs
 * are referenced rather than pasted blindly.
 *
 * @source authored-q03 (key-points mirror the summary deliverable)
 */
import type { PromptTemplate } from "../template-types";

export const summarizeTemplate: PromptTemplate = {
  id: "summarize",
  category: "writing",
  sections: {
    light: ["objective"],

    standard: ["objective", "key-points", "output-format"],

    detailed: ["objective", "source-content", "key-points", "output-format"],
  },
};
