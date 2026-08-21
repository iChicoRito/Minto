/**
 * Golden-case tables for the engine verification harness (see
 * ./verify-engine.ts and `npm run verify:engine`).
 *
 * Pure data: no imports, no logic, no framework dependencies. The runner in
 * ./verify-engine.ts consumes these tables section by section (parser →
 * classifier → rules → generator); later engine tasks append their cases to
 * the reserved tables below, which keeps the runner wired without dead code.
 */

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
 * Classifier cases: reserved for the signal-weight scoring task (next up).
 * Shape will be input → expected PromptTaskType (scored against
 * SIGNAL_WEIGHTS); left empty until that API exists.
 */
export const CLASSIFIER_CASES: ReadonlyArray<never> = [];

/**
 * Rules cases: reserved for the rules-layer task. Shape will be parsed
 * analysis → expected preserved/polished slots (constraint enforcement,
 * enhancement-level adjustments); left empty until that API exists.
 */
export const RULES_CASES: ReadonlyArray<never> = [];

/**
 * Generator cases: reserved for the template/generator task. Shape will be
 * enhanced analysis → expected final prompt text pinned per enhancement
 * level; left empty until that API exists.
 */
export const GENERATOR_CASES: ReadonlyArray<never> = [];
