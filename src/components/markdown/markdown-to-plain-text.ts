/**
 * Converts markdown source to readable plain text: syntax markers (#, *, backticks,
 * links, fences, tables, …) are stripped while the visual layout — line breaks,
 * list indentation and numbering — is preserved. Behavior mirrors the GFM-flavored,
 * raw-HTML-skipping rendering used by `MarkdownPreview`.
 */

type FenceState = {
  char: string;
  minLength: number;
  content: string[];
};

type InlineContext = {
  codeSpans: string[];
  escapes: string[];
};

const FENCE_OPEN = /^ {0,3}(`{3,}|~{3,})/;
const BLOCKQUOTE_MARKER = /^ {0,3}> ?/;
const ATX_ONLY_HASHES = /^ {0,3}#{1,6}\s*$/;
const ATX_HEADING = /^ {0,3}#{1,6}\s+/;
const REFERENCE_DEFINITION = /^ {0,3}\[[^\]]+\]:\s+\S+/;
const BULLET_ITEM = /^(\s*)([-*+])([ \t]+)(.*)$/;
const ORDERED_ITEM = /^(\s*)(\d{1,9}[.)])([ \t]+)(.*)$/;
const TABLE_DIVIDER_CELL = /\|\s*:?-+:?\s*/;
const CODE_SPAN = /(`+)([\s\S]*?)\1/g;
const INLINE_IMAGE_URL = /!\[([^\]]*)\]\([^)\s]*(?:\s+"[^"]*")?\)/g;
const INLINE_IMAGE_REF = /!\[([^\]]*)\]\[[^\]]*\]/g;
const INLINE_LINK_URL = /\[([^\]]+)\]\([^)\s]*(?:\s+"[^"]*")?\)/g;
const INLINE_LINK_REF = /\[([^\]]+)\]\[[^\]]*\]/g;
const AUTOLINK = /<(https?:\/\/[^>\s]+|mailto:[^>\s]+)>/g;
const HTML_COMMENT = /<!--[\s\S]*?-->/g;
const HTML_TAG = /<\/?[a-zA-Z][^>]*>/g;
const STRIKETHROUGH = /~~([^~\n]+)~~/g;
const ESCAPED_CHAR = /\\([\\`*_{}[\]()#+\-.!>|~])/g;
const TRAILING_WHITESPACE = /[ \t]+$/;
const BLANK_RUN = /\n{3,}/g;
const LEADING_BLANKS = /^\n+/;
const TRAILING_BLANKS = /\n+$/;
// Internal sentinels use Private Use Area code points (U+E000-U+E002): they never
// occur in real content, are not control characters, and any stray is swept from
// the final output.
const PLACEHOLDER_FENCE = "\uE000";
const PLACEHOLDER_CODE = "\uE001";
const PLACEHOLDER_ESCAPE = "\uE002";
const STRAY_PLACEHOLDER = new RegExp(`[${PLACEHOLDER_FENCE}${PLACEHOLDER_CODE}${PLACEHOLDER_ESCAPE}]`, "g");

const EMPHASIS_PATTERNS: readonly RegExp[] = [
  /\*\*\*([^*\n]+)\*\*\*/g,
  /(?<![\w\\])___([^_\n]+)___(?![\w])/g,
  /\*\*([^*\n]+)\*\*/g,
  /(?<![\w\\])__([^_\n]+)__(?![\w])/g,
  /\*([^*\n]+)\*/g,
  /(?<![\w\\])_([^_\n]+)_(?![\w])/g,
];

/**
 * Converts markdown to plain text, keeping headings, lists, quotes, tables and code
 * readable without markdown artifacts. Pure and synchronous; linear-time on the
 * input size, safe for very large documents.
 */
export function markdownToPlainText(markdown: string): string {
  const normalized = markdown.replace(/\r\n?/g, "\n");
  if (normalized.trim().length === 0) {
    return "";
  }

  const extracted = extractFencedBlocks(normalized.split("\n"));
  const context: InlineContext = { codeSpans: [], escapes: [] };
  const transformed = transformLines(extracted.lines, context);

  // Put fenced code content back as plain lines (byte-for-byte apart from outer
  // trailing-whitespace cleanup).
  const expanded: string[] = [];
  for (const line of transformed) {
    if (line.length > 2 && line.startsWith(PLACEHOLDER_FENCE) && line.endsWith(PLACEHOLDER_FENCE)) {
      const block = extracted.blocks[Number(line.slice(1, -1))] ?? "";
      if (block.length > 0) {
        expanded.push(...block.split("\n"));
      }
      continue;
    }
    expanded.push(line);
  }

  const cleaned = expanded
    .map((line) => line.replace(TRAILING_WHITESPACE, ""))
    .join("\n")
    .replace(BLANK_RUN, "\n\n")
    .replace(LEADING_BLANKS, "")
    .replace(TRAILING_BLANKS, "");

  const restored = restoreTokens(
    restoreTokens(cleaned, PLACEHOLDER_CODE, context.codeSpans),
    PLACEHOLDER_ESCAPE,
    context.escapes,
  ).replace(STRAY_PLACEHOLDER, "");

  return restored.length > 0 ? `${restored}\n` : "";
}

function extractFencedBlocks(lines: readonly string[]): { lines: string[]; blocks: string[] } {
  const result: string[] = [];
  const blocks: string[] = [];
  let open: FenceState | null = null;
  for (const line of lines) {
    if (open === null) {
      const opening = FENCE_OPEN.exec(line);
      if (opening) {
        const marker = opening[1];
        open = { char: marker.charAt(0), minLength: marker.length, content: [] };
        blocks.push("");
        result.push(`${PLACEHOLDER_FENCE}${blocks.length - 1}${PLACEHOLDER_FENCE}`);
      } else {
        result.push(line);
      }
      continue;
    }
    const closerPattern = `^ {0,3}[${open.char}]{${open.minLength},}\\s*$`;
    if (new RegExp(closerPattern).test(line)) {
      blocks[blocks.length - 1] = open.content.join("\n");
      open = null;
    } else {
      open.content.push(line);
    }
  }
  if (open !== null) {
    blocks[blocks.length - 1] = open.content.join("\n");
  }
  return { lines: result, blocks };
}

function transformLines(lines: readonly string[], context: InlineContext): string[] {
  const out: string[] = [];
  let index = 0;
  while (index < lines.length) {
    const line = lines[index];
    const unquoted = stripBlockquoteMarkers(line);

    if (REFERENCE_DEFINITION.test(unquoted)) {
      index += 1;
      continue;
    }
    if (isTableDivider(unquoted)) {
      index += 1;
      continue;
    }
    if (index + 1 < lines.length && looksLikeTableRow(line) && isTableDivider(lines[index + 1])) {
      const table = renderTable(lines, index, context);
      out.push(...table.rows);
      index = table.next;
      continue;
    }
    if (ATX_ONLY_HASHES.test(unquoted)) {
      index += 1;
      continue;
    }
    const withoutHeading = unquoted.replace(ATX_HEADING, "");
    if (isDecorationLine(withoutHeading)) {
      index += 1;
      continue;
    }

    const bullet = BULLET_ITEM.exec(withoutHeading);
    if (bullet) {
      const task = matchTaskMarker(bullet[4]);
      if (task) {
        out.push(`${bullet[1]}${task.marker}${stripInline(task.rest, context)}`);
      } else {
        out.push(`${bullet[1]}• ${stripInline(bullet[4], context)}`);
      }
      index += 1;
      continue;
    }
    const ordered = ORDERED_ITEM.exec(withoutHeading);
    if (ordered) {
      out.push(`${ordered[1]}${ordered[2]} ${stripInline(ordered[4], context)}`);
      index += 1;
      continue;
    }
    out.push(stripInline(withoutHeading, context));
    index += 1;
  }
  return out;
}

function stripBlockquoteMarkers(line: string): string {
  let current = line;
  let match = BLOCKQUOTE_MARKER.exec(current);
  while (match) {
    current = current.slice(match[0].length);
    match = BLOCKQUOTE_MARKER.exec(current);
  }
  return current;
}

function isDecorationLine(line: string): boolean {
  const trimmed = line.trim();
  if (trimmed.length === 0) {
    return false;
  }
  if (/^=+$/.test(trimmed)) {
    return true;
  }
  if (/^-{2,}$/.test(trimmed)) {
    return true;
  }
  if (/^(\*\s*){3,}$/.test(trimmed)) {
    return true;
  }
  return /^(_\s*){3,}$/.test(trimmed);
}

function looksLikeTableRow(line: string): boolean {
  const trimmed = line.trim();
  return trimmed.length >= 2 && trimmed.includes("|");
}

function isTableDivider(line: string): boolean {
  if (!line.includes("|")) {
    return false;
  }
  const trimmed = line.trim();
  if (!/^\|?/.test(trimmed)) {
    return false;
  }
  const rest = trimmed.replace(/^\|/, "").replace(/\|$/, "");
  if (rest.length === 0) {
    return false;
  }
  const cells = rest.split("|").map((cell) => cell.trim());
  return (
    cells.length > 0 &&
    cells.every((cell) => {
      const body = cell.startsWith(":") ? cell.slice(1) : cell;
      const dashes = body.endsWith(":") ? body.slice(0, -1) : body;
      return dashes.length > 0 && /^-+$/.test(dashes);
    }) &&
    cells.some((cell) => TABLE_DIVIDER_CELL.test(`|${cell}`))
  );
}

function splitCells(row: string): string[] {
  const cells: string[] = [];
  let current = "";
  for (let i = 0; i < row.length; i += 1) {
    const ch = row.charAt(i);
    if (ch === "\\" && i + 1 < row.length) {
      current += ch + row.charAt(i + 1);
      i += 1;
      continue;
    }
    if (ch === "|") {
      cells.push(current);
      current = "";
      continue;
    }
    current += ch;
  }
  cells.push(current);
  if (cells.length > 1 && cells[0].trim().length === 0) {
    cells.shift();
  }
  if (cells.length > 1 && cells[cells.length - 1].trim().length === 0) {
    cells.pop();
  }
  return cells.map((cell) => cell.trim());
}

function renderTable(
  lines: readonly string[],
  startIndex: number,
  context: InlineContext,
): { rows: string[]; next: number } {
  const dividerIndex = startIndex + 1;
  const columnCount = Math.max(1, splitCells(lines[dividerIndex]).length);
  let end = dividerIndex + 1;
  while (end < lines.length && looksLikeTableRow(lines[end]) && !isTableDivider(lines[end])) {
    end += 1;
  }
  const sourceRows = [lines[startIndex], ...lines.slice(dividerIndex + 1, end)];
  const rows = sourceRows.map((row) => {
    const cells = splitCells(row).map((cell) => stripInline(cell, context));
    const normalized = cells.slice(0, columnCount);
    while (normalized.length < columnCount) {
      normalized.push("");
    }
    return normalized;
  });
  const widths: number[] = [];
  for (const cells of rows) {
    cells.forEach((cell, columnIndex) => {
      widths[columnIndex] = Math.max(widths[columnIndex] ?? 0, cell.length);
    });
  }
  const rendered = rows.map((cells) => cells.map((cell, columnIndex) => cell.padEnd(widths[columnIndex])).join("  "));
  return { rows: rendered, next: end };
}

function matchTaskMarker(rest: string): { marker: string; rest: string } | null {
  const unchecked = /^\[ \](?:[ \t]+|$)/.exec(rest);
  if (unchecked) {
    return { marker: "☐ ", rest: rest.slice(unchecked[0].length) };
  }
  const checked = /^\[[xX]\](?:[ \t]+|$)/.exec(rest);
  if (checked) {
    return { marker: "☑ ", rest: rest.slice(checked[0].length) };
  }
  return null;
}

function stripInline(text: string, context: InlineContext): string {
  let out = text.replace(CODE_SPAN, (_match, _ticks, code) => {
    context.codeSpans.push(String(code));
    return `${PLACEHOLDER_CODE}${context.codeSpans.length - 1}${PLACEHOLDER_CODE}`;
  });
  out = out.replace(ESCAPED_CHAR, (_match, ch) => {
    context.escapes.push(String(ch));
    return `${PLACEHOLDER_ESCAPE}${context.escapes.length - 1}${PLACEHOLDER_ESCAPE}`;
  });
  out = out.replace(INLINE_IMAGE_URL, "$1").replace(INLINE_IMAGE_REF, "$1");
  out = out.replace(INLINE_LINK_URL, "$1").replace(INLINE_LINK_REF, "$1");
  out = out.replace(AUTOLINK, "$1");
  out = out.replace(HTML_COMMENT, "").replace(HTML_TAG, "");
  for (const pattern of EMPHASIS_PATTERNS) {
    out = out.replace(pattern, "$1");
  }
  return out.replace(STRIKETHROUGH, "$1");
}

function restoreTokens(text: string, token: string, values: readonly string[]): string {
  return text.replace(
    new RegExp(`${token}(\\d+)${token}`, "g"),
    (_match, index: string) => values[Number(index)] ?? "",
  );
}
