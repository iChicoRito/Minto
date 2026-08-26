/**
 * Intent-driven section blocks (authored upgrade: decision D8 companion to
 * the generator's rich SectionValue). Converts legacy section values into
 * ordered block lists carrying one intent-matched construct, using only the
 * structural signals from ../parser/detect-content-signals.
 *
 * Content policy mirrors the engine's existing authored-copy stance
 * (narrativeContent in the pipeline): deterministic skeletons and verbatim
 * prompt material only — a table is emitted as an empty criterion/option
 * scaffold and code is reproduced exactly as fenced by the user; nothing is
 * invented to fill either.
 *
 * Purity: relative imports into parser/generator/types layers only; never
 * React, Next.js, DOM APIs, or storage. Determinism: same inputs always
 * produce identical blocks.
 */
import type { SectionBlock, SectionValue } from "../generator/generate-markdown";
import { extractFirstFencedCode } from "../parser/detect-content-signals";
import type { SectionId } from "../templates/template-types";

/**
 * Sections that may carry the prompt's fenced code, highest priority first.
 * The trailing generic slots (requirements/verification) keep prompts that
 * use only the default section selection eligible for code reproduction.
 */
export const CODE_SECTION_PRIORITY: readonly SectionId[] = [
  "implementation",
  "context",
  "technical-requirements",
  "problem",
  "requirements",
  "verification",
];

/** Sections that may carry the comparison-table skeleton, highest priority first. */
export const TABLE_SECTION_PRIORITY: readonly SectionId[] = ["criteria", "comparison-scope"];

/** Any value a pipeline section may hold before intent conversion. */
export type SectionValueLike = SectionValue | undefined;

/**
 * Views a legacy-or-rich section value as an ordered block list. Strings
 * become paragraphs, string arrays become bullet lists, block lists pass
 * through unchanged.
 */
function toBlocks(value: SectionValueLike): SectionBlock[] {
  if (value === undefined) {
    return [];
  }
  if (typeof value === "string") {
    return [{ kind: "paragraph", text: value }];
  }
  if (value.length === 0 || typeof value[0] !== "object") {
    return [{ kind: "bullets", items: value as readonly string[] }];
  }
  return [...(value as readonly SectionBlock[])];
}

/** Appends one block after whatever the section already carries. */
export function appendBlock(value: SectionValueLike, block: SectionBlock): readonly SectionBlock[] {
  return [...toBlocks(value), block];
}

/** Wraps the prompt's first fenced block as a code section block, or null. */
export function codeBlockFrom(raw: string): SectionBlock | null {
  const fenced = extractFirstFencedCode(raw);
  return fenced === null ? null : { kind: "code", language: fenced.language, lines: fenced.lines };
}

/** Structural comparison scaffold; cells stay empty for later completion. */
export function tableSkeleton(): SectionBlock {
  return {
    kind: "table",
    header: ["Criterion", "Option A", "Option B"],
    rows: [
      ["Fit for purpose", "", ""],
      ["Effort", "", ""],
      ["Risk", "", ""],
    ],
  };
}

/** Converts present bullet sections into unchecked task lists. */
export function bulletsToTasks(items: readonly string[]): readonly SectionBlock[] {
  return [{ kind: "tasks", items: items.map((text) => ({ text, done: false })) }];
}

/** Converts present bullet sections into numbered steps. */
export function bulletsToNumbered(items: readonly string[]): readonly SectionBlock[] {
  return [{ kind: "numbered", items }];
}
