/**
 * Structural content-signal scanner (authored upgrade: intent-driven format
 * selection). Detects, from the raw prompt text, evidence that the requested
 * output should carry rich Markdown constructs: fenced code blocks, tabular
 * data, step sequences, and checklists. This answers "how should content be
 * shaped", deliberately orthogonal to the task-type classifier, whose stem
 * tokenization cannot see punctuation-shaped syntax (fences, pipes, task
 * markers).
 *
 * Detection rules (all deterministic, matched on the newline-normalized,
 * apostrophe-folded, lowercased text):
 *
 *   - Fenced code: lines matching /^ {0,3}(`{3,}|~{3,})/ toggle open/close
 *     per marker character; an unclosed fence still counts its opener. The
 *     first fence's info string becomes firstFenceLanguage when it matches
 *     /^[A-Za-z0-9+#._-]{0,31}$/ and is non-empty.
 *   - Inline code spans: non-overlapping pairs of equal-length backtick runs
 *     outside fence regions.
 *   - containsCode (scored to avoid false positives on prose that merely
 *     mentions "code"): true when a fence exists, OR any inline span's
 *     content looks code-like (brace/paren/semicolon/assignment characters or
 *     a code keyword), OR an explicit request phrase appears ("include the
 *     code", "show the code", "with code example", "code snippet", "code
 *     sample"), OR at least two vocabulary words co-occur with at least one
 *     inline span.
 *   - wantsTable / wantsSteps / checklistIntent: conservative phrase and
 *     whole-word matches ("table"/"tables"/"matrix"/"matrices"/"tabular",
 *     "side-by-side"; "steps"/"step-by-step"; "checklist"/"checklists",
 *     "task list", "to-do list", "todo list").
 *
 * Purity: relative imports only; never React, Next.js, DOM APIs, or storage.
 * Determinism: fresh non-global regexes plus linear char scanning,
 * toLowerCase() only, fixed iteration order — same input, same output.
 */

/** Shape signals consumed by the trusted server policy resolver and the local rules layer. */
export type ContentSignals = {
  containsCode: boolean;
  hasFencedCode: boolean;
  fencedCodeCount: number;
  firstFenceLanguage: string | null;
  inlineCodeSpanCount: number;
  wantsTable: boolean;
  wantsSteps: boolean;
  checklistIntent: boolean;
};

/** Verbatim content of the first fenced block found in a prompt. */
export type FencedCode = { language: string | null; lines: string[] };

type FenceScan = {
  count: number;
  first: FencedCode | null;
  /** Indexes of lines inside fenced regions (openers, content, closers). */
  fencedLineIndexes: Set<number>;
};

/** Opening fence marker: up to three leading spaces then 3+ backticks or tildes. */
const FENCE_OPEN_PATTERN = /^ {0,3}(`{3,}|~{3,})/;

/** Valid fence info string: short identifier-style language tag, or empty. */
const FENCE_LANGUAGE_PATTERN = /^[A-Za-z0-9+#._-]{0,31}$/;

/** Explicit user requests that code must appear in the enhanced output. */
const CODE_REQUEST_PHRASES: readonly string[] = [
  "include the code",
  "show the code",
  "with code example",
  "code snippet",
  "code sample",
];

/** Code-domain vocabulary; two or more hits harden a weak inline-span signal. */
const CODE_VOCABULARY: readonly string[] = [
  "snippet",
  "function",
  "script",
  "query",
  "terminal",
  "command",
  "compile",
  "runtime",
];

/** Characters or keywords inside an inline span that mark it as actual code. */
const CODE_SPAN_HINT = /[{};=()]|\b(?:function|def|class|const|let|var|import|return|select)\b/i;

const WHOLE_WORD_TABLE_PATTERN = /\b(?:tables?|matrices|matrix|tabular)\b/;
const WHOLE_WORD_STEPS_PATTERN = /\bsteps\b/;
const WHOLE_WORD_CHECKLIST_PATTERN = /\bchecklists?\b/;

const SIDE_BY_SIDE_PHRASE = "side-by-side";
const STEP_BY_STEP_PHRASE = "step-by-step";
const TASK_LIST_PHRASES: readonly string[] = ["task list", "to-do list", "todo list"];

/** Newline-normalized, apostrophe-folded copy of the raw prompt. */
function normalizeLines(raw: string): string {
  return raw.replace(/\r\n?/g, "\n").replace(/\u2019/g, "'");
}

/**
 * Single left-to-right pass collecting the fence count, the first fence's
 * language and verbatim content lines, and the set of line indexes that live
 * inside fenced regions (openers, content, closers).
 */
function scanFences(lines: readonly string[]): FenceScan {
  let count = 0;
  let first: FencedCode | null = null;
  const fencedLineIndexes = new Set<number>();
  let open: { char: string; minLength: number } | null = null;

  for (const [index, line] of lines.entries()) {
    if (open === null) {
      const opening = FENCE_OPEN_PATTERN.exec(line);
      if (opening === null) {
        continue;
      }
      const marker = opening[1];
      open = { char: marker.charAt(0), minLength: marker.length };
      count += 1;
      fencedLineIndexes.add(index);
      if (first === null) {
        const info = line.slice(opening[0].length).trim();
        first = { language: info.length > 0 && FENCE_LANGUAGE_PATTERN.test(info) ? info : null, lines: [] };
      }
      continue;
    }

    fencedLineIndexes.add(index);
    const closerPattern = new RegExp(`^ {0,3}[${open.char}]{${open.minLength},}\\s*$`);
    if (closerPattern.test(line)) {
      open = null;
      continue;
    }
    first?.lines.push(line.replace(/[ \t]+$/, ""));
  }

  return { count, first, fencedLineIndexes };
}

/**
 * Counts non-overlapping pairs of equal-length backtick runs outside fenced
 * regions and returns their contents in order of appearance.
 */
function scanInlineSpans(
  lines: readonly string[],
  fencedLineIndexes: ReadonlySet<number>,
): { count: number; contents: string[] } {
  const unfenced = lines.filter((_, index) => !fencedLineIndexes.has(index)).join("\n");
  const contents: string[] = [];
  let cursor = 0;

  while (cursor < unfenced.length) {
    if (unfenced.charAt(cursor) !== "`") {
      cursor += 1;
      continue;
    }
    let runLength = 1;
    while (unfenced.charAt(cursor + runLength) === "`") {
      runLength += 1;
    }
    let probe = cursor + runLength;
    let closingIndex = -1;
    while (probe <= unfenced.length - runLength) {
      if (unfenced.charAt(probe) !== "`") {
        probe += 1;
        continue;
      }
      let closeLength = 1;
      while (unfenced.charAt(probe + closeLength) === "`") {
        closeLength += 1;
      }
      if (closeLength === runLength) {
        closingIndex = probe;
        break;
      }
      probe += closeLength;
    }
    if (closingIndex !== -1) {
      contents.push(unfenced.slice(cursor + runLength, closingIndex));
      cursor = closingIndex + runLength;
      continue;
    }
    cursor += runLength;
  }

  return { count: contents.length, contents };
}

function countVocabularyHits(lowerText: string): number {
  let hits = 0;
  for (const word of CODE_VOCABULARY) {
    if (new RegExp(`\\b${word}\\b`).test(lowerText)) {
      hits += 1;
    }
  }
  return hits;
}

function includesAny(lowerText: string, phrases: readonly string[]): boolean {
  return phrases.some((phrase) => lowerText.includes(phrase));
}

/**
 * Scans a raw prompt for structural content-shape signals. Pure and
 * deterministic: same input always produces the identical signal record.
 */
export function detectContentSignals(raw: string): ContentSignals {
  const text = normalizeLines(raw);
  const lines = text.split("\n");
  const lowerText = text.toLowerCase();

  const scanned = scanFences(lines);
  const inline = scanInlineSpans(lines, scanned.fencedLineIndexes);
  const hasRequestPhrase = includesAny(lowerText, CODE_REQUEST_PHRASES);
  const hasCodeLikeSpan = inline.contents.some((content) => CODE_SPAN_HINT.test(content));
  const vocabularyHits = countVocabularyHits(lowerText);

  return {
    containsCode:
      scanned.count > 0 || hasCodeLikeSpan || hasRequestPhrase || (vocabularyHits >= 2 && inline.count >= 1),
    hasFencedCode: scanned.count > 0,
    fencedCodeCount: scanned.count,
    firstFenceLanguage: scanned.first?.language ?? null,
    inlineCodeSpanCount: inline.count,
    wantsTable: WHOLE_WORD_TABLE_PATTERN.test(lowerText) || lowerText.includes(SIDE_BY_SIDE_PHRASE),
    wantsSteps: WHOLE_WORD_STEPS_PATTERN.test(lowerText) || lowerText.includes(STEP_BY_STEP_PHRASE),
    checklistIntent: WHOLE_WORD_CHECKLIST_PATTERN.test(lowerText) || includesAny(lowerText, TASK_LIST_PHRASES),
  };
}

/**
 * Returns the first fenced block's language and verbatim content lines
 * (trailing whitespace trimmed per line), or null when the prompt carries no
 * fence. Pure and deterministic.
 */
export function extractFirstFencedCode(raw: string): FencedCode | null {
  return scanFences(normalizeLines(raw).split("\n")).first;
}
