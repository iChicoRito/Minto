/**
 * Template layer vocabulary (roadmap R-10, tracker T-20): the SectionId
 * union, its Title Case display map, and the PromptTemplate shape. Pure
 * types plus one constant — no logic; the engine layer never pulls in
 * view, routing, or storage libraries.
 *
 * SectionId provenance (decision D3, question Q-03): the 24 ids split into
 * two groups —
 *
 *   - Documented-derived (14): sections the material itself names —
 *     objective, problem, scope, requirements, constraints, verification,
 *     acceptance-criteria, context, implementation, review-scope,
 *     review-areas, output-format, research-scope, key-questions.
 *   - Authored (10): sections introduced to complete the nine authored
 *     recipes — audience, outline, source-content, style-notes,
 *     key-points, comparison-scope, criteria, subject, style-direction,
 *     technical-requirements.
 *
 * The material spells one id camelCase (`acceptanceCriteria`, L599); it is
 * normalized to kebab-case `acceptance-criteria` here for consistency with
 * the other 23 ids — a documented decision (D3), not a transcription slip.
 *
 * @source material L429-L472 (rule-engine recipes), L557-L601 (template phase)
 */
import type { PromptCategory, PromptTaskType } from "../types";

/**
 * Canonical kebab-case section vocabulary shared by the templates, rule
 * engine, and markdown generator; display names live in SECTION_TITLES.
 */
export type SectionId =
  | "objective"
  | "problem"
  | "scope"
  | "requirements"
  | "constraints"
  | "verification"
  | "acceptance-criteria"
  | "context"
  | "implementation"
  | "review-scope"
  | "review-areas"
  | "output-format"
  | "research-scope"
  | "key-questions"
  | "audience"
  | "outline"
  | "source-content"
  | "style-notes"
  | "key-points"
  | "comparison-scope"
  | "criteria"
  | "subject"
  | "style-direction"
  | "technical-requirements";

/** Title Case display names, rendered verbatim as generated markdown headings. */
export const SECTION_TITLES: Readonly<Record<SectionId, string>> = {
  objective: "Objective",
  problem: "Problem",
  scope: "Scope",
  requirements: "Requirements",
  constraints: "Constraints",
  verification: "Verification",
  "acceptance-criteria": "Acceptance Criteria",
  context: "Context",
  implementation: "Implementation",
  "review-scope": "Review Scope",
  "review-areas": "Review Areas",
  "output-format": "Output Format",
  "research-scope": "Research Scope",
  "key-questions": "Key Questions",
  audience: "Audience",
  outline: "Outline",
  "source-content": "Source Content",
  "style-notes": "Style Notes",
  "key-points": "Key Points",
  "comparison-scope": "Comparison Scope",
  criteria: "Criteria",
  subject: "Subject",
  "style-direction": "Style Direction",
  "technical-requirements": "Technical Requirements",
};

/**
 * One enhancement recipe per task type: which sections appear at each
 * strength. Invariants checked by the engine harness and honored by the
 * rule layer downstream: `objective` opens every list, light ⊆ standard ⊆
 * detailed as order-preserving subsets, no duplicate ids within a list.
 */
export type PromptTemplate = {
  /** Task type served; doubles as the TEMPLATE_REGISTRY key. */
  id: PromptTaskType;
  /** Category grouping; consistent with the classifier's type-category map. */
  category: PromptCategory;
  /** Per-strength section lists, ordered as they should render. */
  sections: {
    light: readonly SectionId[];
    standard: readonly SectionId[];
    detailed: readonly SectionId[];
  };
};
