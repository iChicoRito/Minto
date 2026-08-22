export type EditorSelection = {
  value: string;
  selectionStart: number;
  selectionEnd: number;
};

export type MarkdownCounts = {
  words: number;
  characters: number;
};

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

export function insertLink(state: EditorSelection): EditorSelection {
  return wrapSelection(state, "[", "](https://)", "link text");
}

export function getMarkdownCounts(value: string): MarkdownCounts {
  const trimmed = value.trim();
  return {
    words: trimmed ? trimmed.split(/\s+/).length : 0,
    characters: value.length,
  };
}
