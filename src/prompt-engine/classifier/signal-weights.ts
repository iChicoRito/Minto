/**
 * Weighted signal tables for the prompt-task-type classifier (roadmap R-06,
 * task T-12). Each table maps lowercase signal words/phrases to integer
 * weights. Data only — matching logic lives elsewhere in the classifier.
 *
 * @source material L366-L374 (bug-fix table verbatim)
 * @source authored signal-tables (11 of 13 types + general rationale)
 *
 * C-02: the material's worked example prints a total of 11 while its printed
 * weights max at 7; these tables implement the printed weights verbatim and
 * treat the printed total as a source arithmetic erratum.
 */
import type { PromptTaskType } from "../types";

/**
 * Calibration rules: 4-7 signals per non-general type, integer weights 2-5,
 * weight 5 reserved for the type's unambiguous anchor word(s). Bare words that
 * strongly belong to another type's anchor are avoided ("review" lives only in
 * code-review, so ui-review uses "design-review"; "test"/"testing" live only
 * in testing). Keys are matched phrase-aware, so multiword entries like
 * "pros-and-cons" and "design-review" are valid; the collision-prone bare
 * "vs" is deliberately excluded.
 */
export const SIGNAL_WEIGHTS: Readonly<Record<PromptTaskType, Readonly<Record<string, number>>>> = {
  /** Verbatim from source material L366-L374 — do not recalibrate. */
  "bug-fix": {
    fix: 3,
    bug: 5,
    broken: 4,
    error: 4,
    issue: 2,
    failing: 4,
  },
  feature: {
    add: 4,
    create: 4,
    implement: 4,
    build: 3,
    support: 2,
  },
  "code-review": {
    review: 5,
    audit: 4,
    feedback: 3,
    quality: 2,
  },
  refactor: {
    refactor: 5,
    restructure: 4,
    reorganize: 3,
    cleanup: 3,
    simplify: 3,
  },
  testing: {
    test: 5,
    coverage: 4,
    regression: 4,
    qa: 3,
    spec: 2,
  },
  documentation: {
    document: 5,
    docs: 4,
    readme: 4,
    guide: 3,
    explain: 2,
  },
  rewrite: {
    rewrite: 5,
    rephrase: 4,
    reword: 4,
    redraft: 3,
    tone: 2,
  },
  summarize: {
    summarize: 5,
    summary: 4,
    tldr: 4,
    condense: 3,
    brief: 2,
  },
  research: {
    research: 5,
    investigate: 4,
    explore: 3,
    analyze: 3,
    findings: 2,
  },
  comparison: {
    compare: 5,
    versus: 4,
    "pros-and-cons": 4,
    difference: 3,
    "trade-off": 3,
  },
  "ui-review": {
    "design-review": 5,
    usability: 4,
    ux: 4,
    interface: 3,
    layout: 2,
  },
  "image-prompt": {
    midjourney: 5,
    dalle: 5,
    illustration: 4,
    image: 3,
    render: 2,
  },
  /**
   * Deliberately empty: any prompt matching no signal above falls through to
   * "general" as the natural default classification.
   */
  general: {},
};

/** Downstream typing convenience: mirrors the table shape exactly. */
export type SignalWeights = typeof SIGNAL_WEIGHTS;
