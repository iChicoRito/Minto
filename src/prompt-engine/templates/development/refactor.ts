/**
 * Refactor enhancement recipe (task type "refactor", category "development").
 *
 * Authored under decision D3 (Q-03): mirrors the bug-fix recipe minus the
 * problem section — a refactor starts from working code, not a defect —
 * with context added at detailed strength.
 *
 * @source authored-q03 (mirrors bug-fix minus problem)
 */
import type { PromptTemplate } from "../template-types";

export const refactorTemplate: PromptTemplate = {
  id: "refactor",
  category: "development",
  sections: {
    light: ["objective"],

    standard: ["objective", "requirements", "verification"],

    detailed: ["objective", "context", "scope", "requirements", "constraints", "verification"],
  },
};
