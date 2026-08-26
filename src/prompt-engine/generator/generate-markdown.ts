/**
 * Formatting-only Markdown renderer (roadmap R-11, tracker T-23): converts
 * already prepared section content into predictable Markdown. Enhancement
 * rules stay outside this module; object insertion order is preserved so the
 * template-selected section order reaches the output unchanged.
 *
 * Decision D6: light output is the objective prose alone, without a heading.
 * Standard and detailed output use a level-one Objective heading and level-two
 * headings for every subsequent section. Strings become paragraphs and arrays
 * become consecutive Markdown bullet items, with one blank line between
 * blocks and no trailing newline.
 *
 * Authored extension (intent-driven formats, decision D8): section values may
 * additionally be ordered `SectionBlock` lists so intent-matched constructs —
 * numbered steps, task checkboxes, fenced code (fence-lengthened so content
 * can never close its own fence), and GFM pipe tables — render beside the
 * legacy paragraph/bullet shapes. Legacy string/array inputs render
 * byte-identically to the pre-extension behavior.
 *
 * Purity: relative imports into engine types/templates only; no framework,
 * browser, storage, clock, randomness, or locale-dependent APIs.
 */
import type { SectionId } from "../templates/template-types";
import { SECTION_TITLES } from "../templates/template-types";
import type { EnhancementLevel } from "../types";

/** One rich construct inside a section body, rendered in list order. */
export type SectionBlock =
  | { kind: "paragraph"; text: string }
  | { kind: "bullets"; items: readonly string[] }
  | { kind: "numbered"; items: readonly string[] }
  | { kind: "tasks"; items: ReadonlyArray<{ text: string; done: boolean }> }
  | { kind: "code"; language: string | null; lines: readonly string[] }
  | { kind: "table"; header: readonly string[]; rows: ReadonlyArray<readonly string[]> };

/** Everything a section body may carry: the legacy shapes plus block lists. */
export type SectionValue = string | readonly string[] | readonly SectionBlock[];

const VALID_CODE_LANGUAGE_PATTERN = /^[A-Za-z0-9+#._-]{1,31}$/;

/** Trims one list item, dropping it entirely when only whitespace remains. */
function trimmedItems(items: readonly string[]): string[] {
  return items.map((item) => item.trim()).filter((item) => item.length > 0);
}

function longestBacktickRunAtLineStart(lines: readonly string[]): number {
  let longest = 0;
  for (const line of lines) {
    const run = /^`+/.exec(line.trimStart());
    if (run !== null && run[0].length > longest) {
      longest = run[0].length;
    }
  }
  return longest;
}

/** GFM cell text: pipes become `\|` and internal line breaks collapse to spaces. */
function escapeTableCell(cell: string): string {
  return cell.replace(/\r?\n/g, " ").replace(/\|/g, "\\|");
}

function renderCodeBlock(block: Extract<SectionBlock, { kind: "code" }>): string {
  const fenceLength = Math.max(3, longestBacktickRunAtLineStart(block.lines) + 1);
  const fence = "`".repeat(fenceLength);
  const language = block.language !== null && VALID_CODE_LANGUAGE_PATTERN.test(block.language) ? block.language : "";
  return [`${fence}${language}`, ...block.lines, fence].join("\n");
}

function renderTableBlock(block: Extract<SectionBlock, { kind: "table" }>): string {
  const columnCount = Math.max(1, block.header.length);
  const headerCells = block.header.map(escapeTableCell);
  const rowLines = block.rows.map((row) => {
    const cells: string[] = [];
    for (let column = 0; column < columnCount; column += 1) {
      cells.push(escapeTableCell(row[column] ?? ""));
    }
    return `| ${cells.join(" | ")} |`;
  });
  return [`| ${headerCells.join(" | ")} |`, `| ${headerCells.map(() => "---").join(" | ")} |`, ...rowLines].join("\n");
}

/** Renders one rich block to its Markdown form (possibly empty when blank). */
export function renderSectionBlock(block: SectionBlock): string {
  switch (block.kind) {
    case "paragraph":
      return block.text.trim();
    case "bullets":
      return trimmedItems(block.items)
        .map((item) => `- ${item}`)
        .join("\n");
    case "numbered":
      return trimmedItems(block.items)
        .map((item, index) => `${index + 1}. ${item}`)
        .join("\n");
    case "tasks":
      return block.items
        .map((item) => ({ text: item.text.trim(), done: item.done }))
        .filter((item) => item.text.length > 0)
        .map((item) => `- [${item.done ? "x" : " "}] ${item.text}`)
        .join("\n");
    case "code":
      return renderCodeBlock(block);
    case "table":
      return renderTableBlock(block);
  }
}

function isBlockList(value: SectionValue): value is readonly SectionBlock[] {
  if (typeof value === "string" || !Array.isArray(value)) {
    return false;
  }
  return value.length === 0 || typeof value[0] === "object";
}

function renderBody(value: SectionValue): string | undefined {
  if (typeof value === "string") {
    const text = value.trim();
    return text.length === 0 ? undefined : text;
  }

  if (isBlockList(value)) {
    const rendered = value.map(renderSectionBlock).filter((block) => block.length > 0);
    return rendered.length === 0 ? undefined : rendered.join("\n\n");
  }

  const items = trimmedItems(value);
  return items.length === 0 ? undefined : items.map((item) => `- ${item}`).join("\n");
}

/**
 * Renders prepared section content at the requested enhancement level.
 * Repeated calls with the same object and options produce byte-identical text.
 */
export function generateMarkdown(
  content: Partial<Record<SectionId, SectionValue>>,
  opts: { level: EnhancementLevel },
): string {
  if (opts.level === "light") {
    const objective = content.objective;
    if (objective === undefined) {
      return "";
    }

    return typeof objective === "string"
      ? objective.trim()
      : objective
          .map((item) => (typeof item === "string" ? item.trim() : ""))
          .filter((item) => item.length > 0)
          .join(" ");
  }

  const blocks: string[] = [];
  for (const [id, value] of Object.entries(content) as [SectionId, SectionValue | undefined][]) {
    if (value === undefined) {
      continue;
    }

    const body = renderBody(value);
    if (body === undefined) {
      continue;
    }

    const heading = id === "objective" ? "#" : "##";
    blocks.push(`${heading} ${SECTION_TITLES[id]}\n\n${body}`);
  }

  return blocks.join("\n\n");
}
