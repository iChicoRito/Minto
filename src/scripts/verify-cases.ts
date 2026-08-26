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
import type { SectionValue } from "../prompt-engine/generator/generate-markdown";
import type { ContentSignals, FencedCode } from "../prompt-engine/parser/detect-content-signals";
import type { SectionId } from "../prompt-engine/templates/template-types";
import type { EnhancementLevel, PromptAnalysis, PromptCategory, PromptTaskType } from "../prompt-engine/types";

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
 * optional exact score/fallback assertions and confidence bounds (asserted as
 * inclusive ranges when present).
 */
export type ClassifierCase = {
  name: string;
  input: string;
  expectedTaskType: PromptTaskType;
  expectedCategory: PromptCategory;
  expectedBand: ConfidenceBand;
  /** Asserts the score for expectedTaskType when set. */
  expectedScore?: number;
  /** Asserts the classifier's fallback decision when set. */
  expectedFallbackToGeneral?: boolean;
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
    expectedScore: 7,
    expectedFallbackToGeneral: false,
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
    expectedScore: 0,
    expectedFallbackToGeneral: true,
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
  content: Partial<Record<SectionId, SectionValue>>;
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
  {
    name: "numbered blocks render incrementing steps",
    content: {
      objective: "Plan the rollout.",
      outline: [{ kind: "numbered", items: ["Freeze deploys", "Migrate schema", "", "Enable traffic"] }],
    },
    level: "standard",
    expectedMarkdown: [
      "# Objective",
      "",
      "Plan the rollout.",
      "",
      "## Outline",
      "",
      "1. Freeze deploys",
      "2. Migrate schema",
      "3. Enable traffic",
    ].join("\n"),
  },
  {
    name: "task blocks render checkbox markers",
    content: {
      objective: "Verify release readiness.",
      verification: [
        {
          kind: "tasks",
          items: [
            { text: "Run the suite", done: false },
            { text: "Update the changelog", done: true },
          ],
        },
      ],
    },
    level: "standard",
    expectedMarkdown: [
      "# Objective",
      "",
      "Verify release readiness.",
      "",
      "## Verification",
      "",
      "- [ ] Run the suite",
      "- [x] Update the changelog",
    ].join("\n"),
  },
  {
    name: "code blocks render a default three-backtick fence without a language",
    content: {
      objective: "Add retry logic.",
      context: [{ kind: "code", language: null, lines: ["const attempts = 3;"] }],
    },
    level: "detailed",
    expectedMarkdown: [
      "# Objective",
      "",
      "Add retry logic.",
      "",
      "## Context",
      "",
      "```",
      "const attempts = 3;",
      "```",
    ].join("\n"),
  },
  {
    name: "code blocks lengthen the fence past embedded backtick runs",
    content: {
      objective: "Guard the fence.",
      implementation: [{ kind: "code", language: "text", lines: ["```` nested"] }],
    },
    level: "standard",
    expectedMarkdown: [
      "# Objective",
      "",
      "Guard the fence.",
      "",
      "## Implementation",
      "",
      "`````text",
      "```` nested",
      "`````",
    ].join("\n"),
  },
  {
    name: "table blocks render headers, divider, and padded rows",
    content: {
      objective: "Choose a vendor.",
      criteria: [
        {
          kind: "table",
          header: ["Criterion", "Option A"],
          rows: [["Cost", "low"], ["Risk"]],
        },
      ],
    },
    level: "standard",
    expectedMarkdown: [
      "# Objective",
      "",
      "Choose a vendor.",
      "",
      "## Criteria",
      "",
      "| Criterion | Option A |",
      "| --- | --- |",
      "| Cost | low |",
      "| Risk |  |",
    ].join("\n"),
  },
  {
    name: "table cells escape pipes and truncate to the header width",
    content: {
      objective: "Compare shells.",
      "comparison-scope": [
        {
          kind: "table",
          header: ["Name", "Note"],
          rows: [
            ["fish", "friendly | interactive"],
            ["zsh", "scriptable", "extra cell dropped"],
          ],
        },
      ],
    },
    level: "detailed",
    expectedMarkdown: [
      "# Objective",
      "",
      "Compare shells.",
      "",
      "## Comparison Scope",
      "",
      "| Name | Note |",
      "| --- | --- |",
      "| fish | friendly \\| interactive |",
      "| zsh | scriptable |",
    ].join("\n"),
  },
];

/** End-to-end pipeline cases: public entrypoint input → analysis and Markdown. */
export type PipelineCase = {
  name: string;
  input: string;
  level?: EnhancementLevel;
  options?: {
    level?: EnhancementLevel;
    taskType?: PromptTaskType;
    sections?: readonly SectionId[];
  };
  expectedAnalysis: PromptAnalysis;
  expectedResolved?: {
    taskType: PromptTaskType;
    category: PromptCategory;
    level: EnhancementLevel;
    sections: readonly SectionId[];
  };
  expectedMarkdown?: string;
  expectedHeadings?: string[];
};

export const PIPELINE_CASES: ReadonlyArray<PipelineCase> = [
  {
    name: "light enhancement matches material sentence",
    input: "fix login problem",
    level: "light",
    expectedAnalysis: {
      original: "fix login problem",
      category: "general",
      taskType: "general",
      confidence: 43,
      action: "fix",
      subject: "login problem",
      domain: "authentication",
      technologies: [],
      constraints: [],
      requirements: ["Fix login problem"],
      enhancementLevel: "light",
    },
    expectedMarkdown: "Investigate and resolve the login problem while preserving existing authentication behavior.",
  },
  {
    name: "standard enhancement uses the default level",
    input: "fix login problem",
    expectedAnalysis: {
      original: "fix login problem",
      category: "general",
      taskType: "general",
      confidence: 43,
      action: "fix",
      subject: "login problem",
      domain: "authentication",
      technologies: [],
      constraints: [],
      requirements: ["Fix login problem"],
      enhancementLevel: "standard",
    },
    expectedMarkdown: [
      "# Objective",
      "",
      "Resolve the login problem.",
      "",
      "## Requirements",
      "",
      "- Fix login problem",
      "",
      "## Verification",
      "",
      "Confirm that the login problem is resolved.",
    ].join("\n"),
    expectedHeadings: ["# Objective", "## Requirements", "## Verification"],
  },
  {
    name: "detailed enhancement keeps current template order and constraints",
    input: "Fix broken login. Don't change email authentication.",
    level: "detailed",
    expectedAnalysis: {
      original: "Fix broken login. Don't change email authentication.",
      category: "development",
      taskType: "bug-fix",
      confidence: 100,
      action: "fix",
      subject: "broken login",
      domain: "authentication",
      technologies: [],
      constraints: ["Don't change email authentication"],
      requirements: ["Fix broken login"],
      enhancementLevel: "detailed",
    },
    expectedMarkdown: [
      "# Objective",
      "",
      "Resolve the broken login.",
      "",
      "## Problem",
      "",
      "Address the broken login.",
      "",
      "## Scope",
      "",
      "Limit the work to the broken login.",
      "",
      "## Requirements",
      "",
      "- Fix broken login",
      "",
      "## Constraints",
      "",
      "- Don't change email authentication",
      "",
      "## Verification",
      "",
      "Confirm that the broken login is resolved.",
    ].join("\n"),
    expectedHeadings: ["# Objective", "## Problem", "## Scope", "## Requirements", "## Constraints", "## Verification"],
  },
  {
    name: "low-confidence classification falls back to General",
    input: "There is an issue with the export flow",
    expectedAnalysis: {
      original: "There is an issue with the export flow",
      category: "general",
      taskType: "general",
      confidence: 29,
      action: undefined,
      subject: undefined,
      domain: undefined,
      technologies: [],
      constraints: [],
      requirements: [],
      enhancementLevel: "standard",
    },
    expectedMarkdown: [
      "# Objective",
      "",
      "There is an issue with the export flow.",
      "",
      "## Verification",
      "",
      "Confirm that the requested outcome is complete.",
    ].join("\n"),
    expectedHeadings: ["# Objective", "## Verification"],
  },
  {
    name: "empty input is classified and rendered without throwing",
    input: "  \t",
    expectedAnalysis: {
      original: "  \t",
      category: "general",
      taskType: "general",
      confidence: 0,
      action: undefined,
      subject: undefined,
      domain: undefined,
      technologies: [],
      constraints: [],
      requirements: [],
      enhancementLevel: "standard",
    },
    expectedMarkdown: "",
    expectedHeadings: [],
  },
  {
    name: "manual task type override resolves a development recipe",
    input: "fix login problem",
    options: { taskType: "bug-fix", level: "standard" },
    expectedAnalysis: {
      original: "fix login problem",
      category: "general",
      taskType: "general",
      confidence: 43,
      action: "fix",
      subject: "login problem",
      domain: "authentication",
      technologies: [],
      constraints: [],
      requirements: ["Fix login problem"],
      enhancementLevel: "standard",
    },
    expectedResolved: {
      taskType: "bug-fix",
      category: "development",
      level: "standard",
      sections: ["objective", "requirements", "verification"],
    },
    expectedHeadings: ["# Objective", "## Requirements", "## Verification"],
  },
  {
    name: "explicit section selection controls output order",
    input: "fix login problem",
    options: {
      taskType: "bug-fix",
      level: "detailed",
      sections: ["objective", "verification", "objective"],
    },
    expectedAnalysis: {
      original: "fix login problem",
      category: "general",
      taskType: "general",
      confidence: 43,
      action: "fix",
      subject: "login problem",
      domain: "authentication",
      technologies: [],
      constraints: [],
      requirements: ["Fix login problem"],
      enhancementLevel: "detailed",
    },
    expectedResolved: {
      taskType: "bug-fix",
      category: "development",
      level: "detailed",
      sections: ["objective", "verification"],
    },
    expectedMarkdown: [
      "# Objective",
      "",
      "Resolve the login problem.",
      "",
      "## Verification",
      "",
      "Confirm that the login problem is resolved.",
    ].join("\n"),
    expectedHeadings: ["# Objective", "## Verification"],
  },
  {
    name: "prompt with fenced code reproduces it under Problem",
    input: "Fix broken login.\n\n```ts\nconst maxRetries = 3;\n```",
    options: { level: "standard", sections: ["objective", "problem"] },
    expectedAnalysis: {
      original: "Fix broken login.\n\n```ts\nconst maxRetries = 3;\n```",
      category: "development",
      taskType: "bug-fix",
      confidence: 100,
      action: "fix",
      subject: "broken login",
      domain: "authentication",
      technologies: [],
      constraints: [],
      requirements: ["Fix broken login"],
      enhancementLevel: "standard",
    },
    expectedResolved: {
      taskType: "bug-fix",
      category: "development",
      level: "standard",
      sections: ["objective", "problem"],
    },
    expectedMarkdown: [
      "# Objective",
      "",
      "Resolve the broken login.",
      "",
      "## Problem",
      "",
      "Address the broken login.",
      "",
      "```ts",
      "const maxRetries = 3;",
      "```",
    ].join("\n"),
    expectedHeadings: ["# Objective", "## Problem"],
  },
  {
    name: "comparison prompt requesting a table emits the criteria skeleton",
    input: "Compare PostgreSQL vs MySQL in a table",
    expectedAnalysis: {
      original: "Compare PostgreSQL vs MySQL in a table",
      category: "research",
      taskType: "comparison",
      confidence: 71,
      action: "compare",
      subject: "PostgreSQL vs MySQL in a table",
      domain: undefined,
      technologies: ["MySQL", "PostgreSQL"],
      constraints: [],
      requirements: ["Compare PostgreSQL vs MySQL in a table"],
      enhancementLevel: "standard",
    },
    expectedResolved: {
      taskType: "comparison",
      category: "research",
      level: "standard",
      sections: ["objective", "criteria", "output-format"],
    },
    expectedMarkdown: [
      "# Objective",
      "",
      "Compare PostgreSQL vs MySQL in a table.",
      "",
      "## Criteria",
      "",
      "Compare the relevant capabilities and meaningful differences.",
      "",
      "| Criterion | Option A | Option B |",
      "| --- | --- | --- |",
      "| Fit for purpose |  |  |",
      "| Effort |  |  |",
      "| Risk |  |  |",
      "",
      "## Output Format",
      "",
      "Return the result in clear Markdown.",
    ].join("\n"),
    expectedHeadings: ["# Objective", "## Criteria", "## Output Format"],
  },
  {
    name: "checklist wording turns verification into task items",
    input: "Create a deployment checklist for the billing page",
    expectedAnalysis: {
      original: "Create a deployment checklist for the billing page",
      category: "general",
      taskType: "general",
      confidence: 57,
      action: "create",
      subject: "deployment checklist for the billing page",
      domain: undefined,
      technologies: [],
      constraints: [],
      requirements: ["Create deployment checklist for the billing page"],
      enhancementLevel: "standard",
    },
    expectedResolved: {
      taskType: "general",
      category: "general",
      level: "standard",
      sections: ["objective", "requirements", "verification"],
    },
    expectedMarkdown: [
      "# Objective",
      "",
      "Create deployment checklist for the billing page.",
      "",
      "## Requirements",
      "",
      "- Create deployment checklist for the billing page",
      "",
      "## Verification",
      "",
      "- [ ] Confirm that the deployment checklist for the billing page is resolved.",
    ].join("\n"),
    expectedHeadings: ["# Objective", "## Requirements", "## Verification"],
  },
  {
    name: "step-by-step wording numbers the outline section",
    input: "Write a step-by-step migration guide",
    options: { level: "standard", sections: ["objective", "outline"] },
    expectedAnalysis: {
      original: "Write a step-by-step migration guide",
      category: "general",
      taskType: "general",
      confidence: 43,
      action: undefined,
      subject: undefined,
      domain: undefined,
      technologies: [],
      constraints: [],
      requirements: [],
      enhancementLevel: "standard",
    },
    expectedResolved: {
      taskType: "general",
      category: "general",
      level: "standard",
      sections: ["objective", "outline"],
    },
    expectedMarkdown: [
      "# Objective",
      "",
      "Write a step-by-step migration guide.",
      "",
      "## Outline",
      "",
      "1. Present the topic, main points, and conclusion.",
    ].join("\n"),
    expectedHeadings: ["# Objective", "## Outline"],
  },
];

/**
 * Content-signal cases (intent-driven formats): raw prompt → exact
 * ContentSignals record. Threshold semantics are documented on
 * detect-content-signals.ts; these goldens pin both the positive and the
 * deliberate negative sides of every rule.
 */
export type SignalsCase = {
  name: string;
  input: string;
  expected: ContentSignals;
  /** When present, extractFirstFencedCode must return exactly this value. */
  expectedFirstFence?: FencedCode | null;
};

function quietSignals(overrides: Partial<ContentSignals>): ContentSignals {
  return {
    containsCode: false,
    hasFencedCode: false,
    fencedCodeCount: 0,
    firstFenceLanguage: null,
    inlineCodeSpanCount: 0,
    wantsTable: false,
    wantsSteps: false,
    checklistIntent: false,
    ...overrides,
  };
}

export const SIGNALS_CASES: ReadonlyArray<SignalsCase> = [
  {
    name: "fenced typescript is detected with its language",
    input: "Fix the login bug:\n\n```ts\nconst retry = 3;\n```",
    expected: quietSignals({ containsCode: true, hasFencedCode: true, fencedCodeCount: 1, firstFenceLanguage: "ts" }),
    expectedFirstFence: { language: "ts", lines: ["const retry = 3;"] },
  },
  {
    name: "unclosed fence still counts with its language",
    input: "Here is my snippet:\n```python\nprint('hi')",
    expected: quietSignals({
      containsCode: true,
      hasFencedCode: true,
      fencedCodeCount: 1,
      firstFenceLanguage: "python",
    }),
    expectedFirstFence: { language: "python", lines: ["print('hi')"] },
  },
  {
    name: "invalid fence language normalizes to null",
    input: "```\nplain\n```",
    expected: quietSignals({ containsCode: true, hasFencedCode: true, fencedCodeCount: 1, firstFenceLanguage: null }),
    expectedFirstFence: { language: null, lines: ["plain"] },
  },
  {
    name: "code-like inline span triggers detection without a fence",
    input: "The `retryCount = 3;` value must persist.",
    expected: quietSignals({ containsCode: true, inlineCodeSpanCount: 1 }),
  },
  {
    name: "prose mentioning code once stays negative",
    input: "Improve the wording of this code documentation.",
    expected: quietSignals({}),
  },
  {
    name: "explicit request phrase triggers detection",
    input: "Rewrite the docs and include the code for setup.",
    expected: quietSignals({ containsCode: true }),
  },
  {
    name: "two vocabulary words plus an inline span trigger detection",
    input: "Run the command in your terminal and paste `npm run build` output.",
    expected: quietSignals({ containsCode: true, inlineCodeSpanCount: 1 }),
  },
  {
    name: "table wording sets wantsTable",
    input: "Compare the two options in a table.",
    expected: quietSignals({ wantsTable: true }),
  },
  {
    name: "side-by-side phrasing sets wantsTable",
    input: "Show pros and cons side-by-side.",
    expected: quietSignals({ wantsTable: true }),
  },
  {
    name: "checklist wording also sees step wording when steps are mentioned",
    input: "Turn these steps into a checklist.",
    expected: quietSignals({ wantsSteps: true, checklistIntent: true }),
  },
  {
    name: "task list phrasing sets checklist intent only",
    input: "Format the plan as a task list.",
    expected: quietSignals({ checklistIntent: true }),
  },
  {
    name: "step-by-step phrasing sets wantsSteps",
    input: "Write a step-by-step migration guide",
    expected: quietSignals({ wantsSteps: true }),
  },
];
