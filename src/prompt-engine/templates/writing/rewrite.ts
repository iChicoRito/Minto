/**
 * Rewrite enhancement recipe (task type "rewrite", category "writing").
 *
 * Authored under decision D3 (Q-03): source-content anchors the text being
 * rewritten; style-notes carry voice/tone direction at detailed strength.
 *
 * @source authored-q03 (source-content + style-notes carry the rewrite input)
 */
import type { PromptTemplate } from "../template-types";

export const rewriteTemplate: PromptTemplate = {
  id: "rewrite",
  category: "writing",
  sections: {
    light: ["objective"],

    standard: ["objective", "requirements", "output-format"],

    detailed: ["objective", "source-content", "requirements", "style-notes", "output-format"],
  },
};
