/**
 * Confidence conversion for weighted-score classification (roadmap R-06,
 * task T-12; decision D1).
 *
 * Converts a full score table into a 0-100 integer confidence and maps that
 * confidence onto a three-step band:
 *
 *   margin   = 100 * top / (top + second)   — how far the winner is ahead
 *   evidence = 100 * top / EVIDENCE_SATURATION — how much raw signal exists
 *   confidence = round(min(margin, evidence))
 *
 * The floor of the two factors means a big lead on thin evidence (lone weak
 * signal) or a strong signal contested by a close runner-up (near tie) both
 * stay low-confidence.
 *
 * Purity: imports only engine types; never React, Next.js, DOM APIs, or
 * storage. Determinism: fixed iteration order over the declared union order,
 * no locale APIs, no clock or randomness — same input → same output.
 *
 * @source decision D1 (plan) — Q-02 resolution: margin × evidence floor
 */
import type { PromptTaskType } from "../types";

/** Discrete confidence buckets used by downstream gating and display. */
export type ConfidenceBand = "high" | "medium" | "low";

/**
 * Score at which the evidence factor alone reaches 100. Calibrated to 7 so
 * the material's worked example — an honest total of 7 under the printed
 * weights (see C-02 erratum in ./signal-weights.ts) — lands in the High band.
 */
export const EVIDENCE_SATURATION = 7;

/**
 * Declared union order of PromptTaskType (see ../types.ts), mirrored here as
 * the fixed iteration order for scanning score tables. Kept local so this
 * module never depends on runtime values outside its own file.
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

/**
 * Converts a full score table into an integer confidence in [0, 100].
 *
 * `top` is the highest score and `second` the second-highest (0 when no other
 * type scored); duplicates count — an exact tie has second === top, capping
 * margin at 50 → Low band → General fallback (Q-04 engine-side resolution D4).
 * A table whose best score is <= 0 converts to 0.
 */
export function toConfidence(scores: Readonly<Record<PromptTaskType, number>>): number {
  let top = 0;
  let second = 0;
  for (const taskType of TASK_TYPE_ORDER) {
    const value = scores[taskType];
    if (value > top) {
      second = top;
      top = value;
    } else if (value > second) {
      second = value;
    }
  }

  if (top <= 0) return 0;

  const margin = (100 * top) / (top + second);
  const evidence = (100 * top) / EVIDENCE_SATURATION;
  return Math.round(Math.min(margin, evidence));
}

/** Maps a confidence value onto its band: >=80 high, 60-79 medium, <60 low. */
export function bandOf(confidence: number): ConfidenceBand {
  if (confidence >= 80) return "high";
  if (confidence >= 60) return "medium";
  return "low";
}
