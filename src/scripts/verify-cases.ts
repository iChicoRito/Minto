/**
 * Golden-case tables for the engine verification harness (see
 * ./verify-engine.ts and `npm run verify:engine`).
 *
 * Data tables plus the types that shape them; no logic. The runner in
 * ./verify-engine.ts consumes these tables section by section (parser →
 * classifier → templates → rules → generator); later engine tasks append
 * their cases to
 * the reserved tables below, which keeps the runner wired without dead code.
 *
 * Confidence bounds are documented per case against the D1 formula
 * (confidence = round(min(margin, 100·top/EVIDENCE_SATURATION)), see
 * ../prompt-engine/classifier/to-confidence.ts).
 */
import type { ConfidenceBand } from "../prompt-engine/classifier/to-confidence";
import type { SectionId } from "../prompt-engine/templates/template-types";
import type { EnhancementLevel, PromptCategory, PromptTaskType } from "../prompt-engine/types";

/**
 * Parser cases: raw input → exact expected ParsedPrompt.
 *
 * Optionals the parser returns as explicit undefined MUST be spelled
 * `key: undefined` — the runner asserts with deepStrictEqual, which treats an
 * own undefined-valued key as different from an omitted key.
 */
export type ParserCase = {
  name: string;
  input: string;
  expected: {
    action?: string;
    subject?: string;
    domain?: string;
    technologies: string[];
    constraints: string[];
    requirements: string[];
  };
};

export const PARSER_CASES: ReadonlyArray<ParserCase> = [
  {
    name: "material parser example",
    input: "Add Google login using Next.js but don't change email authentication.",
    expected: {
      action: "add",
      subject: "Google login",
      domain: "authentication",
      technologies: ["Next.js"],
      constraints: ["don't change email authentication"],
      requirements: ["Add Google login"],
    },
  },
  {
    name: "light-strength seed",
    input: "fix login problem",
    expected: {
      action: "fix",
      subject: "login problem",
      domain: "authentication",
      technologies: [],
      constraints: [],
      requirements: ["Fix login problem"],
    },
  },
  {
    name: "empty input negative control",
    input: "",
    expected: {
      action: undefined,
      subject: undefined,
      domain: undefined,
      technologies: [],
      constraints: [],
      requirements: [],
    },
  },
  {
    name: "no leading action verb negative control",
    input: "Please review this PR carefully",
    expected: {
      action: undefined,
      subject: undefined,
      domain: undefined,
      technologies: [],
      constraints: [],
      requirements: [],
    },
  },
];

/**
 * Classifier cases: raw input → expected task type / category / band, plus
 * optional confidence bounds (asserted as inclusive ranges when present).
 */
export type ClassifierCase = {
  name: string;
  input: string;
  expectedTaskType: PromptTaskType;
  expectedCategory: PromptCategory;
  expectedBand: ConfidenceBand;
  /** Asserts confidence >= min when set. */
  minConfidence?: number;
  /** Asserts confidence <= max when set. */
  maxConfidence?: number;
};

export const CLASSIFIER_CASES: ReadonlyArray<ClassifierCase> = [
  {
    // fix(3) + failing→"fail" stem match(4) = 7; margin 100, evidence
    // 100·7/7 = 100 → confidence 100.
    name: "material worked example C-02",
    input: "Fix my login because it sometimes fails",
    expectedTaskType: "bug-fix",
    expectedCategory: "development",
    expectedBand: "high",
    minConfidence: 80,
  },
  {
    // No signal word anywhere → all-zero table → confidence 0 → low →
    // general fallback.
    name: "all-zero negative control",
    input: "Write something about the weather tomorrow",
    expectedTaskType: "general",
    expectedCategory: "general",
    expectedBand: "low",
    maxConfidence: 59,
  },
  {
    // issue(2) wins scoring but the evidence floor caps it:
    // round(min(100, 100·2/7)) = 29 → low → general fallback.
    name: "lone weak signal admits doubt",
    input: "There is an issue with the export flow",
    expectedTaskType: "general",
    expectedCategory: "general",
    expectedBand: "low",
    maxConfidence: 45,
  },
  {
    // simplify(3) vs qa(3): exact tie → earliest declared type (refactor)
    // wins scoring; margin capped at 50, evidence floor gives
    // round(min(50, 300/7)) = 43 → low → general fallback.
    name: "exact tie falls back",
    input: "simplify the qa process",
    expectedTaskType: "general",
    expectedCategory: "general",
    expectedBand: "low",
    maxConfidence: 55,
  },
  {
    // bug(5) vs guide(3): margin 500/8 = 62.5, evidence 500/7 ≈ 71.43;
    // round(min) = 63 → medium keeps the winner (no fallback).
    name: "medium band keeps winner",
    input: "bug in the user guide",
    expectedTaskType: "bug-fix",
    expectedCategory: "development",
    expectedBand: "medium",
    minConfidence: 60,
    maxConfidence: 70,
  },
  {
    // The parser example sentence scores feature add(4) — NOT a bug fix —
    // but evidence floor round(400/7) = 57 → low → general fallback.
    // Bound tightened from the planned 65 to 59 so the window cannot admit
    // medium-band values and stays consistent with expectedBand "low".
    name: "feature wording is NOT bug-fix negative control",
    input: "Add Google login using Next.js but don't change email authentication.",
    expectedTaskType: "general",
    expectedCategory: "general",
    expectedBand: "low",
    maxConfidence: 59,
  },
];

/**
 * Template cases: one per task type, driving structural checks over
 * TEMPLATE_REGISTRY (../prompt-engine/templates/registry.ts). The tables
 * stay pure data — the runner owns the assertions: light pinned to exactly
 * ["objective"], objective opening every strength list, no duplicate ids
 * within a list, standard an order-preserving subset of detailed. Order
 * mirrors the PromptTaskType union for deterministic output; expectedCategory
 * pins each entry's category per its recipe file.
 */
export type TemplateCase = {
  name: string;
  taskType: PromptTaskType;
  expectedCategory: PromptCategory;
};

export const TEMPLATE_CASES: ReadonlyArray<TemplateCase> = [
  { name: "bug-fix template structure", taskType: "bug-fix", expectedCategory: "development" },
  { name: "feature template structure", taskType: "feature", expectedCategory: "development" },
  { name: "code-review template structure", taskType: "code-review", expectedCategory: "development" },
  { name: "refactor template structure", taskType: "refactor", expectedCategory: "development" },
  { name: "testing template structure", taskType: "testing", expectedCategory: "development" },
  { name: "documentation template structure", taskType: "documentation", expectedCategory: "development" },
  { name: "rewrite template structure", taskType: "rewrite", expectedCategory: "writing" },
  { name: "summarize template structure", taskType: "summarize", expectedCategory: "writing" },
  { name: "research template structure", taskType: "research", expectedCategory: "research" },
  { name: "comparison template structure", taskType: "comparison", expectedCategory: "research" },
  { name: "ui-review template structure", taskType: "ui-review", expectedCategory: "design" },
  { name: "image-prompt template structure", taskType: "image-prompt", expectedCategory: "design" },
  { name: "general template structure", taskType: "general", expectedCategory: "general" },
];

/**
 * Rules cases: drive the rule layer (../prompt-engine/rules/*) through two
 * kinds. "light" runs parsePrompt → polishLight and pins the polished
 * sentence byte-exact; "select" resolves the declared task type's template
 * and pins the ordered SectionId list selectSections returns after its
 * drop-empty merge (decision D5). Expected strings/lists below are the
 * pipeline's actual deterministic outputs, computed and pinned from
 * parsePrompt's heuristics — e.g. "add google login" yields subject
 * "google login" (no cut triggers, no filler), so polishLight emits
 * "Add google login.".
 */
export type RulesCase =
  | { kind: "light"; name: string; input: string; expectedSentence: string }
  | {
      kind: "select";
      name: string;
      input: string;
      taskType: PromptTaskType;
      level: EnhancementLevel;
      expectedSections: SectionId[];
    };

export const RULES_CASES: ReadonlyArray<RulesCase> = [
  // Material light example: fix + domain keyword → preservation clause with
  // the enriched domain; golden byte-exact target of the rules task.
  {
    kind: "light",
    name: "material light example reproduces",
    input: "fix login problem",
    expectedSentence: "Investigate and resolve the login problem while preserving existing authentication behavior.",
  },
  {
    kind: "light",
    name: "fix without domain keyword falls back to generic preservation",
    input: "fix navbar overflow",
    expectedSentence: "Investigate and resolve the navbar overflow while preserving existing behavior.",
  },
  {
    kind: "light",
    name: "non-fix action stays plain",
    input: "add google login",
    expectedSentence: "Add google login.",
  },
  {
    kind: "select",
    name: "material standard bug-fix structure",
    input: "fix login problem",
    taskType: "bug-fix",
    level: "standard",
    expectedSections: ["objective", "requirements", "verification"],
  },
  {
    // parsed.constraints is empty for this input, so the detailed list's
    // "constraints" entry is dropped by the merge.
    kind: "select",
    name: "detailed keeps constraints only when present",
    input: "fix login problem",
    taskType: "bug-fix",
    level: "detailed",
    expectedSections: ["objective", "problem", "scope", "requirements", "verification"],
  },
  {
    // The parser-example sentence parses one constraint, so the detailed
    // "constraints" section survives the merge.
    kind: "select",
    name: "detailed keeps parsed constraints",
    input: "Add Google login using Next.js but don't change email authentication.",
    taskType: "bug-fix",
    level: "detailed",
    expectedSections: ["objective", "problem", "scope", "requirements", "constraints", "verification"],
  },
  {
    // Minimal fallback recipe has no droppable list sections, so standard
    // passes through untouched regardless of the parsed slots.
    kind: "select",
    name: "general standard minimal",
    input: "fix login problem",
    taskType: "general",
    level: "standard",
    expectedSections: ["objective", "requirements", "verification"],
  },
];

/** Generator cases: filled section content → exact Markdown per strength. */
export type GeneratorCase = {
  name: string;
  content: Partial<Record<SectionId, string | string[]>>;
  level: EnhancementLevel;
  expectedMarkdown: string;
};

export const GENERATOR_CASES: ReadonlyArray<GeneratorCase> = [
  {
    name: "material input object renders standard Markdown",
    content: {
      objective: "...",
      requirements: ["...", "..."],
      constraints: ["..."],
    },
    level: "standard",
    expectedMarkdown: [
      "# Objective",
      "",
      "...",
      "",
      "## Requirements",
      "",
      "- ...",
      "- ...",
      "",
      "## Constraints",
      "",
      "- ...",
    ].join("\n"),
  },
  {
    name: "light renders the objective as a bare sentence",
    content: {
      objective: "Investigate and resolve the login problem while preserving existing authentication behavior.",
      requirements: ["This section must not render in light mode."],
    },
    level: "light",
    expectedMarkdown: "Investigate and resolve the login problem while preserving existing authentication behavior.",
  },
  {
    name: "standard renders strings and arrays with exact spacing",
    content: {
      objective: "Resolve the login problem.",
      requirements: ["Identify the cause of the issue.", "Apply the necessary correction."],
      verification: "Confirm that login works correctly.",
    },
    level: "standard",
    expectedMarkdown: [
      "# Objective",
      "",
      "Resolve the login problem.",
      "",
      "## Requirements",
      "",
      "- Identify the cause of the issue.",
      "- Apply the necessary correction.",
      "",
      "## Verification",
      "",
      "Confirm that login works correctly.",
    ].join("\n"),
  },
  {
    name: "detailed renders all supplied sections in input order",
    content: {
      objective: "Resolve the login problem.",
      problem: "The login flow sometimes fails.",
      scope: ["Limit the work to the login flow."],
      requirements: ["Identify the cause of the issue."],
      constraints: ["Do not change email authentication."],
      verification: ["Confirm that login works correctly."],
    },
    level: "detailed",
    expectedMarkdown: [
      "# Objective",
      "",
      "Resolve the login problem.",
      "",
      "## Problem",
      "",
      "The login flow sometimes fails.",
      "",
      "## Scope",
      "",
      "- Limit the work to the login flow.",
      "",
      "## Requirements",
      "",
      "- Identify the cause of the issue.",
      "",
      "## Constraints",
      "",
      "- Do not change email authentication.",
      "",
      "## Verification",
      "",
      "- Confirm that login works correctly.",
    ].join("\n"),
  },
  {
    name: "repeated rendering is deterministic",
    content: {
      objective: "Review the authentication flow.",
      "review-scope": "Review the authentication flow.",
      "output-format": ["Return findings in clear Markdown."],
    },
    level: "detailed",
    expectedMarkdown: [
      "# Objective",
      "",
      "Review the authentication flow.",
      "",
      "## Review Scope",
      "",
      "Review the authentication flow.",
      "",
      "## Output Format",
      "",
      "- Return findings in clear Markdown.",
    ].join("\n"),
  },
  {
    name: "standard trims strings and filters blank array items",
    content: {
      objective: "  Resolve the login problem.  ",
      problem: " \t ",
      requirements: ["  Identify the cause.  ", "\n\t", " Apply the correction. "],
    },
    level: "standard",
    expectedMarkdown: [
      "# Objective",
      "",
      "Resolve the login problem.",
      "",
      "## Requirements",
      "",
      "- Identify the cause.",
      "- Apply the correction.",
    ].join("\n"),
  },
  {
    name: "detailed omits blank sections without a trailing newline",
    content: {
      objective: "  Resolve the login problem.  ",
      problem: "\n\t",
      scope: [" ", "\t"],
      requirements: [],
      verification: "  ",
    },
    level: "detailed",
    expectedMarkdown: ["# Objective", "", "Resolve the login problem."].join("\n"),
  },
  {
    name: "light joins normalized objective array items with single spaces",
    content: {
      objective: ["  Investigate", "and resolve  ", "  ", "\t the issue. "],
      requirements: ["This section must not render in light mode."],
    },
    level: "light",
    expectedMarkdown: "Investigate and resolve the issue.",
  },
];
