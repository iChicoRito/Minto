export type EditorSelection = {
  value: string;
  selectionStart: number;
  selectionEnd: number;
};

export type MarkdownCounts = {
  words: number;
  characters: number;
};

/** One selected line's replacement plus its signed length delta, used to remap offsets. */
type LineEdit = { next: string; delta: number };

const INDENT_PATTERN = /^\s*/;
const BULLET_PREFIX_PATTERN = /^(\s*)- /;
const ATX_HEADING_PREFIX = /^( {0,3})(#{1,6})\s+/;
const TASK_MARKER_PREFIX = /^(\s*)- \[( |x|X)\] /;

export function wrapSelection(
  state: EditorSelection,
  before: string,
  after: string,
  placeholder: string,
): EditorSelection {
  const selected = state.value.slice(state.selectionStart, state.selectionEnd);
  const content = selected || placeholder;
  const value = `${state.value.slice(0, state.selectionStart)}${before}${content}${after}${state.value.slice(state.selectionEnd)}`;
  const selectionStart = state.selectionStart + before.length;
  return { value, selectionStart, selectionEnd: selectionStart + content.length };
}

export function prefixSelectedLines(state: EditorSelection, prefix: string): EditorSelection {
  const lineStart = state.value.lastIndexOf("\n", state.selectionStart - 1) + 1;
  const lineEndIndex = state.value.indexOf("\n", state.selectionEnd);
  const lineEnd = lineEndIndex === -1 ? state.value.length : lineEndIndex;
  const selectedLines = state.value.slice(lineStart, lineEnd);
  const value = `${state.value.slice(0, lineStart)}${selectedLines
    .split("\n")
    .map((line) => `${prefix}${line}`)
    .join("\n")}${state.value.slice(lineEnd)}`;
  return {
    value,
    selectionStart: state.selectionStart + prefix.length,
    selectionEnd: state.selectionEnd + prefix.length * selectedLines.split("\n").length,
  };
}

/**
 * Toggle `marker` around the selection: when the text immediately before selectionStart
 * and immediately after selectionEnd equals `marker`, remove both occurrences (selection
 * shrinks by `marker.length` on the left); otherwise wrap like wrapSelection with the
 * same marker on both sides.
 */
export function toggleWrapSelection(state: EditorSelection, marker: string, placeholder: string): EditorSelection {
  const before = state.value.slice(state.selectionStart - marker.length, state.selectionStart);
  const after = state.value.slice(state.selectionEnd, state.selectionEnd + marker.length);
  if (before === marker && after === marker) {
    const value = `${state.value.slice(0, state.selectionStart - marker.length)}${state.value.slice(
      state.selectionStart,
      state.selectionEnd,
    )}${state.value.slice(state.selectionEnd + marker.length)}`;
    return {
      value,
      selectionStart: state.selectionStart - marker.length,
      selectionEnd: state.selectionEnd - marker.length,
    };
  }
  return wrapSelection(state, marker, marker, placeholder);
}

/**
 * Expand the selection to whole lines and toggle `prefix`: when every non-empty selected
 * line already starts with `prefix`, strip one occurrence from each prefixed line
 * (offsets remapped per line, clamped at 0); otherwise prepend `prefix` to every line.
 */
export function togglePrefixSelectedLines(state: EditorSelection, prefix: string): EditorSelection {
  const nonEmptyLines = selectedLineRange(state).lines.filter((line) => line.length > 0);
  if (nonEmptyLines.length > 0 && nonEmptyLines.every((line) => line.startsWith(prefix))) {
    return editSelectedLines(state, (line) =>
      line.startsWith(prefix) ? { next: line.slice(prefix.length), delta: -prefix.length } : { next: line, delta: 0 },
    );
  }
  return prefixSelectedLines(state, prefix);
}

/**
 * Toggle ATX headings over the selected lines. Each line first loses any existing heading
 * marker (`^ {0,3}#{1,6}\s+`; up to three leading spaces are absorbed). When that marker
 * was exactly `level`, the heading is removed entirely (pressing the same level again
 * unsets); otherwise `"#".repeat(level)` + one space is applied to the stripped remainder.
 */
export function setHeadingLevel(state: EditorSelection, level: 1 | 2 | 3): EditorSelection {
  return editSelectedLines(state, (line) => {
    const match = ATX_HEADING_PREFIX.exec(line);
    const prefix = `${"#".repeat(level)} `;
    if (!match) return { next: `${prefix}${line}`, delta: prefix.length };
    if (match[2].length === level) return { next: line.slice(match[0].length), delta: -match[0].length };
    const next = `${prefix}${line.slice(match[0].length)}`;
    return { next, delta: next.length - line.length };
  });
}

/**
 * Insert `block` at the cursor (replacing any selection) so exactly one blank line
 * separates it from surrounding text ("\n\n"; reduced beside existing newlines, nothing
 * extra at document edges). Selection lands at the end of the insertion, or at the
 * `selectInside` offsets relative to the block start when provided.
 */
export function insertLinesBlock(
  state: EditorSelection,
  block: string,
  selectInside?: { start: number; end: number },
): EditorSelection {
  const before = state.value.slice(0, state.selectionStart);
  const after = state.value.slice(state.selectionEnd);
  const lead = !before || before.endsWith("\n\n") ? "" : before.endsWith("\n") ? "\n" : "\n\n";
  const trail = !after || after.startsWith("\n\n") ? "" : after.startsWith("\n") ? "\n" : "\n\n";
  const insertionStart = before.length + lead.length;
  const value = `${before}${lead}${block}${trail}${after}`;
  if (selectInside) {
    const selectionStart = insertionStart + selectInside.start;
    return { value, selectionStart, selectionEnd: insertionStart + selectInside.end };
  }
  const cursor = insertionStart + block.length;
  return { value, selectionStart: cursor, selectionEnd: cursor };
}

/** Insert a two-column GFM table skeleton and select the first header cell label. */
export function insertTableSkeleton(state: EditorSelection): EditorSelection {
  const block = "| Column A | Column B |\n| --- | --- |\n|  |  |\n|  |  |\n|  |  |";
  return insertLinesBlock(state, block, { start: 2, end: 10 });
}

/** Wrap the selection (or a "code" placeholder) in a fenced code block and select the inner content. */
export function insertCodeBlock(state: EditorSelection): EditorSelection {
  const content = state.value.slice(state.selectionStart, state.selectionEnd) || "code";
  return insertLinesBlock(state, `\`\`\`\n${content}\n\`\`\``, { start: 4, end: 4 + content.length });
}

/** Wrap the selection in an image embed using a safe example URL. */
export function insertImage(state: EditorSelection): EditorSelection {
  return wrapSelection(state, "![", "](https://example.com/image.png)", "alt text");
}

/** Insert a thematic break on blank-line-separated lines with the cursor after it. */
export function insertHorizontalRule(state: EditorSelection): EditorSelection {
  return insertLinesBlock(state, "---");
}

/** Toggle "> " blockquote prefixes over the selected lines. */
export function quoteSelectedLines(state: EditorSelection): EditorSelection {
  return togglePrefixSelectedLines(state, "> ");
}

/**
 * Add `- [ ] `/`- [x] ` task markers over the selected lines. An existing bullet or task
 * marker on a line is replaced (leading indentation kept) so markers never nest.
 */
export function taskPrefixSelectedLines(state: EditorSelection, done: boolean): EditorSelection {
  const marker = done ? "- [x] " : "- [ ] ";
  return editSelectedLines(state, (line) => {
    const indent = INDENT_PATTERN.exec(line)?.[0] ?? "";
    let bodyStart = indent.length;
    const taskMatch = TASK_MARKER_PREFIX.exec(line);
    if (taskMatch) bodyStart = taskMatch[0].length;
    else if (BULLET_PREFIX_PATTERN.test(line)) bodyStart += "- ".length;
    const next = `${indent}${marker}${line.slice(bodyStart)}`;
    return { next, delta: next.length - line.length };
  });
}

/**
 * Flip `- [ ] ` to `- [x] ` and back on every selected task line (an uppercase `X`
 * normalizes to lowercase when checking); non-task lines pass through untouched.
 */
export function toggleTaskChecked(state: EditorSelection): EditorSelection {
  return editSelectedLines(state, (line) => {
    const match = TASK_MARKER_PREFIX.exec(line);
    if (!match) return { next: line, delta: 0 };
    const box = match[2] === " " ? "x" : " ";
    const next = `${match[1]}- [${box}] ${line.slice(match[0].length)}`;
    return { next, delta: next.length - line.length };
  });
}

export function insertLink(state: EditorSelection): EditorSelection {
  return wrapSelection(state, "[", "](https://example.com)", "link text");
}

export function getMarkdownCounts(value: string): MarkdownCounts {
  const trimmed = value.trim();
  return {
    words: trimmed ? trimmed.split(/\s+/).length : 0,
    characters: value.length,
  };
}

function selectedLineRange(state: EditorSelection): { start: number; end: number; lines: string[] } {
  const start = state.value.lastIndexOf("\n", state.selectionStart - 1) + 1;
  const endIndex = state.value.indexOf("\n", state.selectionEnd);
  const end = endIndex === -1 ? state.value.length : endIndex;
  return { start, end, lines: state.value.slice(start, end).split("\n") };
}

/** Replace the selected whole lines via `edit`, remapping both offsets by per-line deltas. */
function editSelectedLines(state: EditorSelection, edit: (line: string) => LineEdit): EditorSelection {
  const { start, end, lines } = selectedLineRange(state);
  const edits = lines.map(edit);
  const value = `${state.value.slice(0, start)}${edits.map(({ next }) => next).join("\n")}${state.value.slice(end)}`;
  const mapOffset = (position: number): number => {
    let consumed = start;
    let produced = start;
    for (let index = 0; index < lines.length; index += 1) {
      const lineEnd = consumed + lines[index].length;
      if (position <= lineEnd || index === lines.length - 1) {
        const offset = Math.min(Math.max(position - consumed + edits[index].delta, 0), edits[index].next.length);
        return produced + offset;
      }
      consumed = lineEnd + 1;
      produced += edits[index].next.length + 1;
    }
    return produced;
  };
  return { value, selectionStart: mapOffset(state.selectionStart), selectionEnd: mapOffset(state.selectionEnd) };
}
