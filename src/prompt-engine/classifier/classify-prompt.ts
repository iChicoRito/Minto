/**
 * Weighted-signal classifier for raw prompts (roadmap R-06, task T-12).
 *
 * Scores the normalized raw text against SIGNAL_WEIGHTS with a small
 * deterministic suffix stemmer, picks a winner in declared union order, and
 * converts the score table into a confidence band (see ./to-confidence.ts,
 * decision D1). Prompts landing in the Low band fall back to "general" so
 * thin evidence never produces a confident wrong specialization (R-07/D1).
 *
 * Matching rule (single deterministic rule, chosen per plan): both the text
 * and every table key are canonicalized into stemmed word sequences — hyphens
 * act as word separators, so key "pros-and-cons" becomes the sequence
 * [pro, and, con]. A key matches iff its full stem sequence appears at
 * consecutive positions in the text's stem sequence; single-word keys are the
 * length-1 case. Each matching key contributes its weight exactly ONCE per
 * type regardless of how often it occurs in the text.
 *
 * Stemmer limitation, accepted by design: only the suffixes "ing", "ed",
 * "es", "s" are stripped (iteratively, first suffix whose removal leaves a
 * stem of >= 3 chars), so e.g. "issues" → "issu" does not match key "issue",
 * while "fails" → "fail" matches key "failing".
 *
 * Purity: imports only engine modules (parser/types/sibling classifier);
 * never React, Next.js, DOM APIs, or storage. Determinism: regex-free
 * character scanning, toLowerCase() only, fixed iteration order, no clock or
 * randomness — same input → same output.
 */
import type { ParsedPrompt } from "../parser/parse-prompt";
import type { PromptCategory, PromptTaskType } from "../types";
import { SIGNAL_WEIGHTS } from "./signal-weights";
import { bandOf, type ConfidenceBand, toConfidence } from "./to-confidence";

/** Classification outcome consumed by the enhancement pipeline. */
export type ClassificationResult = {
  taskType: PromptTaskType;
  category: PromptCategory;
  confidence: number;
  band: ConfidenceBand;
  /** Always the full computed table across all task types. */
  scores: Record<PromptTaskType, number>;
  /** True when the Low-band fallback reported "general" instead of the winner. */
  fallbackToGeneral: boolean;
};

/**
 * Task-type → category mapping (authored data). Implied by the material's
 * templates tree: development templates cover code work, writing covers
 * text transformation, research covers analysis/comparison, design covers
 * UI and image generation.
 */
const TYPE_CATEGORY: Readonly<Record<PromptTaskType, PromptCategory>> = {
  "bug-fix": "development",
  feature: "development",
  "code-review": "development",
  refactor: "development",
  testing: "development",
  documentation: "development",
  rewrite: "writing",
  summarize: "writing",
  research: "research",
  comparison: "research",
  "ui-review": "design",
  "image-prompt": "design",
  general: "general",
};

/**
 * Declared union order of PromptTaskType (../types.ts) = SIGNAL_WEIGHTS
 * record literal order. The winner scan uses this as its fixed iteration
 * order with strictly-greater comparison, so the earliest type wins any
 * exact score tie.
 */
const TASK_TYPE_ORDER: readonly PromptTaskType[] = [
  "bug-fix",
  "feature",
  "code-review",
  "refactor",
  "testing",
  "documentation",
  "rewrite",
  "summarize",
  "research",
  "comparison",
  "ui-review",
  "image-prompt",
  "general",
];

/** Suffixes tried in this exact order on each stemming pass. */
const SUFFIXES: readonly string[] = ["ing", "ed", "es", "s"];

/** A stripped stem must keep at least this many characters ("does"→"doe"). */
const MIN_STEM_LENGTH = 3;

/**
 * Folds U+2019 apostrophes, trims, lowercases, and collapses whitespace runs.
 * Deliberately no locale-dependent APIs.
 */
function normalizeRaw(raw: string): string {
  return raw
    .replace(/\u2019/g, "'")
    .trim()
    .toLowerCase()
    .replace(/\s+/g, " ");
}

/** ASCII letter/digit test; everything else acts as a token separator. */
function isWordChar(char: string): boolean {
  return (char >= "a" && char <= "z") || (char >= "0" && char <= "9");
}

/**
 * Splits normalized text into word tokens by scanning characters: maximal
 * runs of [a-z0-9]. Hyphens, punctuation, and apostrophes separate tokens
 * ("trade-offs" → ["trade", "offs"], "Next.js" → ["next", "js"]).
 */
function tokenize(normalized: string): string[] {
  const tokens: string[] = [];
  let current = "";
  for (let index = 0; index < normalized.length; index += 1) {
    const char = normalized.charAt(index);
    if (isWordChar(char)) {
      current += char;
    } else if (current.length > 0) {
      tokens.push(current);
      current = "";
    }
  }
  if (current.length > 0) {
    tokens.push(current);
  }
  return tokens;
}

/**
 * Strips suffixes iteratively in SUFFIXES order until the word stops
 * changing; each strip must leave a stem of >= MIN_STEM_LENGTH chars, so
 * "adds"→"add", "fails"→"fail", "failing"→"fail", "using"→"using"
 * ("us" is too short), "does"→"doe" via the later "s" pass.
 */
function stemWord(word: string): string {
  let stem = word;
  let changed = true;
  while (changed) {
    changed = false;
    for (const suffix of SUFFIXES) {
      if (!stem.endsWith(suffix)) continue;
      const candidate = stem.slice(0, stem.length - suffix.length);
      if (candidate.length < MIN_STEM_LENGTH) continue;
      stem = candidate;
      changed = true;
      break;
    }
  }
  return stem;
}

/** Stemmed word sequence for a canonicalized phrase ("pros-and-cons" → ["pro","and","con"]). */
function stemSequence(phrase: string): string[] {
  const words = phrase.split("-").filter((word) => word.length > 0);
  return words.map(stemWord);
}

/**
 * True when needle appears at consecutive positions of haystack starting at
 * offset; used for exact sequence containment.
 */
function matchesAt(haystack: readonly string[], needle: readonly string[], offset: number): boolean {
  if (offset + needle.length > haystack.length) return false;
  for (let index = 0; index < needle.length; index += 1) {
    if (haystack[offset + index] !== needle[index]) return false;
  }
  return true;
}

/** True when the key's stem sequence occurs anywhere at consecutive positions. */
function sequenceOccurs(haystack: readonly string[], needle: readonly string[]): boolean {
  if (needle.length === 0) return false;
  for (let offset = 0; offset + needle.length <= haystack.length; offset += 1) {
    if (matchesAt(haystack, needle, offset)) return true;
  }
  return false;
}

/**
 * Scores one task type: sum of weights of its keys whose stem sequence
 * matches the text's stem sequence. Each key counts once even if its word
 * repeats throughout the prompt.
 */
function scoreType(textStems: readonly string[], weights: Readonly<Record<string, number>>): number {
  let score = 0;
  for (const key of Object.keys(weights)) {
    if (sequenceOccurs(textStems, stemSequence(key))) {
      score += weights[key];
    }
  }
  return score;
}

/**
 * Classifies a raw prompt. Pure and deterministic: same input → same output.
 *
 * `_parsed` is accepted for the pipeline contract (future slot-aware boosts)
 * but currently unused by scoring; underscore-prefixed to keep the signature
 * without tripping noUnusedFunctionParameters.
 */
export function classifyPrompt(_parsed: ParsedPrompt, raw: string): ClassificationResult {
  const textStems = tokenize(normalizeRaw(raw)).map(stemWord);

  const scores = {} as Record<PromptTaskType, number>;
  for (const taskType of TASK_TYPE_ORDER) {
    scores[taskType] = scoreType(textStems, SIGNAL_WEIGHTS[taskType]);
  }

  // Winner scan in declared union order; strictly-greater keeps the earliest
  // type on exact ties. Only a positive score is a candidate, so all-zero
  // tables yield winner undefined (reported as general via the fallback).
  let winner: PromptTaskType | undefined;
  for (const taskType of TASK_TYPE_ORDER) {
    if (scores[taskType] > 0 && (winner === undefined || scores[taskType] > scores[winner])) {
      winner = taskType;
    }
  }

  const confidence = toConfidence(scores);
  const band = bandOf(confidence);
  const fallbackToGeneral = band === "low";

  const reportedType: PromptTaskType = fallbackToGeneral || winner === undefined ? "general" : winner;
  const reportedCategory: PromptCategory = fallbackToGeneral ? "general" : TYPE_CATEGORY[reportedType];

  return {
    taskType: reportedType,
    category: reportedCategory,
    confidence,
    band,
    scores,
    fallbackToGeneral,
  };
}
