/**
 * Bug-fix enhancement recipe (task type "bug-fix", category "development").
 *
 * Light/standard lists and the overall id/category/sections shape are
 * verbatim from the material's bugFixTemplate object; the detailed list is
 * verbatim from the rule-engine branch — six sections. The Phase-9 object's
 * extra trailing entry (`acceptanceCriteria`) is intentionally not carried
 * here; it appears verbatim in the feature recipe instead.
 *
 * @source material L429-L439, L583-L601 (bug-fix template shape verbatim incl. per-strength lists)
 */
import type { PromptTemplate } from "../template-types";

export const bugFixTemplate: PromptTemplate = {
  id: "bug-fix",
  category: "development",
  sections: {
    light: ["objective"],

    standard: ["objective", "requirements", "verification"],

    detailed: ["objective", "problem", "scope", "requirements", "constraints", "verification"],
  },
};
