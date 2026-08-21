/**
 * Golden-case tables for the engine verification harness (see
 * ./verify-engine.ts and `npm run verify:engine`).
 *
 * Data tables plus the types that shape them; no logic. The runner in
 * ./verify-engine.ts consumes these tables section by section (parser →
 * classifier → rules → generator); later engine tasks append their cases to
 * the reserved tables below, which keeps the runner wired without dead code.
 *
 * Confidence bounds are documented per case against the D1 formula
 * (confidence = round(min(margin, 100·top/EVIDENCE_SATURATION)), see
 * ../prompt-engine/classifier/to-confidence.ts).
 */
import type { ConfidenceBand } from "../prompt-engine/classifier/to-confidence";
import type { PromptCategory, PromptTaskType } from "../prompt-engine/types";

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
