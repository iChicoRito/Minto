import { z } from "zod";

import {
  MAX_CHARS_PER_ITEM,
  MAX_CODE_LINES,
  MAX_ITEMS_PER_SECTION,
  MAX_MODEL_OUTPUT_BYTES,
  MAX_NORMALIZED_MARKDOWN_CHARACTERS,
  MAX_TABLE_CELL_CHARS,
  MAX_TABLE_COLUMNS,
} from "../../lib/ai-enhancement/contracts";
import { SECTION_TITLES, type SectionId } from "../../prompt-engine/templates/template-types";
import type { ResolvedEnhancementPolicy } from "./policy-resolver";

export type GeneratedDocumentCodePayload = {
  language: string | null;
  lines: string[];
};

export type GeneratedDocumentTablePayload = {
  header: string[];
  rows: string[][];
};

export type GeneratedDocumentSection = {
  id: SectionId;
  content: string[];
  code?: GeneratedDocumentCodePayload;
  table?: GeneratedDocumentTablePayload;
};

export type GeneratedDocument = {
  sections: GeneratedDocumentSection[];
};

/** Code fence languages are bounded identifiers, never prose or injection vectors. */
const CODE_LANGUAGE_PATTERN = /^[A-Za-z0-9+#._-]*$/;

const modelCodePayloadSchema = z
  .object({
    language: z
      .string()
      .max(32)
      .regex(CODE_LANGUAGE_PATTERN, "code language must match /^[A-Za-z0-9+#._-]*$/")
      .nullable(),
    lines: z.array(z.string()).min(1),
  })
  .strict();

const modelTablePayloadSchema = z
  .object({
    header: z.array(z.string()).min(2).max(MAX_TABLE_COLUMNS),
    rows: z.array(z.array(z.string())).min(1),
  })
  .strict();

const modelSectionSchema = z
  .object({
    id: z.string().min(1),
    content: z.array(z.string()),
    code: modelCodePayloadSchema.optional(),
    table: modelTablePayloadSchema.optional(),
  })
  .strict();

const modelDocumentSchema = z
  .object({
    sections: z.array(modelSectionSchema),
  })
  .strict();

const KNOWN_SECTION_IDS = new Set(Object.keys(SECTION_TITLES) as SectionId[]);

class DuplicateJsonKeyError extends Error {
  constructor(key: string) {
    super(`duplicate JSON object key: ${key}`);
    this.name = "DuplicateJsonKeyError";
  }
}

class JsonScanSyntaxError extends Error {}

function invalidModelOutput(message: string): never {
  throw new Error(`Invalid model output: ${message}`);
}

export class ModelOutputTooLargeError extends Error {
  constructor(message: string) {
    super(`Invalid model output: ${message}`);
    this.name = "ModelOutputTooLargeError";
  }
}

export function isModelOutputTooLargeError(error: unknown): error is ModelOutputTooLargeError {
  return error instanceof ModelOutputTooLargeError;
}

class JsonDuplicateKeyScanner {
  private index = 0;

  constructor(private readonly source: string) {}

  scan(): void {
    this.skipWhitespace();
    this.scanValue();
    this.skipWhitespace();
    if (this.index !== this.source.length) {
      throw new JsonScanSyntaxError("trailing JSON content");
    }
  }

  private scanValue(): void {
    const character = this.source[this.index];

    if (character === '"') {
      this.scanString();
      return;
    }
    if (character === "{") {
      this.scanObject();
      return;
    }
    if (character === "[") {
      this.scanArray();
      return;
    }
    if (character === "t") {
      this.scanLiteral("true");
      return;
    }
    if (character === "f") {
      this.scanLiteral("false");
      return;
    }
    if (character === "n") {
      this.scanLiteral("null");
      return;
    }
    if (character === "-" || (character !== undefined && character >= "0" && character <= "9")) {
      this.scanNumber();
      return;
    }

    throw new JsonScanSyntaxError("invalid JSON value");
  }

  private scanObject(): void {
    this.index += 1;
    this.skipWhitespace();
    const keys = new Set<string>();

    if (this.source[this.index] === "}") {
      this.index += 1;
      return;
    }

    while (this.index < this.source.length) {
      this.skipWhitespace();
      const key = this.scanString();
      if (keys.has(key)) {
        throw new DuplicateJsonKeyError(key);
      }
      keys.add(key);

      this.skipWhitespace();
      this.expect(":");
      this.skipWhitespace();
      this.scanValue();
      this.skipWhitespace();

      const delimiter = this.source[this.index];
      if (delimiter === "}") {
        this.index += 1;
        return;
      }
      if (delimiter !== ",") {
        throw new JsonScanSyntaxError("invalid JSON object delimiter");
      }
      this.index += 1;
    }

    throw new JsonScanSyntaxError("unterminated JSON object");
  }

  private scanArray(): void {
    this.index += 1;
    this.skipWhitespace();

    if (this.source[this.index] === "]") {
      this.index += 1;
      return;
    }

    while (this.index < this.source.length) {
      this.scanValue();
      this.skipWhitespace();

      const delimiter = this.source[this.index];
      if (delimiter === "]") {
        this.index += 1;
        return;
      }
      if (delimiter !== ",") {
        throw new JsonScanSyntaxError("invalid JSON array delimiter");
      }
      this.index += 1;
      this.skipWhitespace();
    }

    throw new JsonScanSyntaxError("unterminated JSON array");
  }

  private scanString(): string {
    if (this.source[this.index] !== '"') {
      throw new JsonScanSyntaxError("JSON object key must be a string");
    }
    this.index += 1;
    let value = "";

    while (this.index < this.source.length) {
      const character = this.source[this.index];
      this.index += 1;

      if (character === '"') {
        return value;
      }
      if (character === "\\") {
        value += this.scanEscape();
        continue;
      }
      if (character === undefined || character.charCodeAt(0) < 0x20) {
        throw new JsonScanSyntaxError("invalid JSON string");
      }
      value += character;
    }

    throw new JsonScanSyntaxError("unterminated JSON string");
  }

  private scanEscape(): string {
    const escapeCharacter = this.source[this.index];
    this.index += 1;

    switch (escapeCharacter) {
      case '"':
      case "\\":
      case "/":
        return escapeCharacter;
      case "b":
        return "\b";
      case "f":
        return "\f";
      case "n":
        return "\n";
      case "r":
        return "\r";
      case "t":
        return "\t";
      case "u": {
        const hex = this.source.slice(this.index, this.index + 4);
        if (!/^[0-9a-f]{4}$/i.test(hex)) {
          throw new JsonScanSyntaxError("invalid JSON unicode escape");
        }
        this.index += 4;
        return String.fromCharCode(Number.parseInt(hex, 16));
      }
      default:
        throw new JsonScanSyntaxError("invalid JSON escape");
    }
  }

  private scanLiteral(literal: string): void {
    if (this.source.slice(this.index, this.index + literal.length) !== literal) {
      throw new JsonScanSyntaxError("invalid JSON literal");
    }
    this.index += literal.length;
  }

  private scanNumber(): void {
    const start = this.index;
    while (this.index < this.source.length && !/[\s,\]}]/.test(this.source[this.index])) {
      this.index += 1;
    }
    if (start === this.index) {
      throw new JsonScanSyntaxError("invalid JSON number");
    }
  }

  private skipWhitespace(): void {
    while (this.index < this.source.length && /\s/.test(this.source[this.index])) {
      this.index += 1;
    }
  }

  private expect(character: string): void {
    if (this.source[this.index] !== character) {
      throw new JsonScanSyntaxError(`expected ${character}`);
    }
    this.index += 1;
  }
}

function rejectDuplicateJsonKeys(raw: string): void {
  try {
    new JsonDuplicateKeyScanner(raw).scan();
  } catch (error) {
    if (error instanceof DuplicateJsonKeyError) {
      invalidModelOutput(error.message);
    }
  }
}

function normalizeModelText(value: string): string {
  return value
    .replace(/\r\n?/g, "\n")
    .replace(/\p{Cc}/gu, " ")
    .replace(/\s+/g, " ")
    .trim();
}

/**
 * Code lines must survive verbatim: whitespace is never collapsed and
 * indentation is preserved, so only carriage/control characters are stripped
 * (tabs stay intact) and trailing whitespace is trimmed. Code lines must not
 * pass through normalizeModelText, whose whitespace collapse would destroy
 * multi-line structure.
 */
export function normalizeCodeLine(line: string): string {
  return line.replace(/\p{Cc}/gu, (character) => (character === "\t" ? character : "")).replace(/\s+$/u, "");
}

/** Longest backtick run at the start of a whitespace-trimmed code line. */
function longestBacktickRunAtTrimmedLineStart(lines: readonly string[]): number {
  let longest = 0;
  for (const line of lines) {
    const run = /^`+/.exec(line.trimStart());
    if (run !== null) {
      longest = Math.max(longest, run[0].length);
    }
  }
  return longest;
}

function escapeMarkdownText(value: string): string {
  let escaped = "";

  for (const character of value) {
    if (character === "&") {
      escaped += "&amp;";
      continue;
    }
    if (character === "<") {
      escaped += "&lt;";
      continue;
    }
    if (character === ">") {
      escaped += "&gt;";
      continue;
    }

    const isMarkdownPunctuation = "\\`*_[]()!~|{}".includes(character);
    escaped += isMarkdownPunctuation ? `\\${character}` : character;
  }

  return escaped
    .replace(/^(#{1,6}|>|[-+*])(?=\s|$)/, "\\$1")
    .replace(/^(\d+)([.)])(?=\s|$)/, "$1\\$2")
    .replace(/^-{3,}$/, (value) => `\\-${value.slice(1)}`)
    .replace(/\b([a-z][a-z0-9+.-]{1,31}):(?=\/\/|[^\s])/gi, "$1\\:")
    .replace(/\bwww\.(?=\S)/gi, "www\\.")
    .replace(/(?<=\S)@(?=\S+\.)/g, "\\@");
}

function validateModelDocument(value: unknown, policy: ResolvedEnhancementPolicy) {
  const parsed = modelDocumentSchema.safeParse(value);
  if (!parsed.success) {
    invalidModelOutput(parsed.error.issues.map((issue) => issue.message).join("; "));
  }

  const policyIds = policy.sections.map((section) => section.id);
  const policyIdSet = new Set(policyIds);
  if (policyIdSet.size !== policyIds.length) {
    invalidModelOutput("trusted policy contains duplicate sections");
  }

  const formatBySectionId = new Map(policy.sections.map((policySection) => [policySection.id, policySection.format]));

  const seenIds = new Set<SectionId>();
  for (const [index, section] of parsed.data.sections.entries()) {
    if (!KNOWN_SECTION_IDS.has(section.id as SectionId)) {
      invalidModelOutput(`unknown section id at index ${index}`);
    }

    const sectionId = section.id as SectionId;
    if (seenIds.has(sectionId)) {
      invalidModelOutput(`duplicate section id: ${section.id}`);
    }
    seenIds.add(sectionId);

    const sectionFormat = formatBySectionId.get(sectionId);
    if (!policyIdSet.has(sectionId) || sectionFormat === undefined) {
      invalidModelOutput(`section is not allowed by the trusted policy: ${section.id}`);
    }
    if (section.content.length === 0) {
      invalidModelOutput(`section has empty content: ${section.id}`);
    }
    if (section.content.length > MAX_ITEMS_PER_SECTION) {
      invalidModelOutput(`section has too many items: ${section.id}`);
    }

    for (const [itemIndex, item] of section.content.entries()) {
      if (item.length > MAX_CHARS_PER_ITEM) {
        invalidModelOutput(`section item is too long: ${section.id}[${itemIndex}]`);
      }
      if (normalizeModelText(item).length === 0) {
        invalidModelOutput(`section item is empty: ${section.id}[${itemIndex}]`);
      }
    }

    // Rich code/table/task payloads are validated against the trusted
    // policy's per-section format: they are only accepted where the format
    // demands them, and required where it does.
    if (sectionFormat === "code") {
      validateCodePayload(sectionId, section.code, section.table);
    } else if (sectionFormat === "table") {
      validateTablePayload(sectionId, section.table, section.code);
    } else if (sectionFormat === "tasks") {
      validateTasksItems(sectionId, section.content, section.code !== undefined || section.table !== undefined);
    } else if (section.code !== undefined || section.table !== undefined) {
      invalidModelOutput(`section carries a rich payload its format does not allow: ${section.id}`);
    }
  }

  const missingIds = policyIds.filter((sectionId) => !seenIds.has(sectionId));
  if (missingIds.length > 0) {
    invalidModelOutput(`missing section id: ${missingIds.join(", ")}`);
  }

  return parsed.data.sections;
}

function validateCodePayload(
  sectionId: SectionId,
  code: GeneratedDocumentCodePayload | undefined,
  table: GeneratedDocumentTablePayload | undefined,
): void {
  if (code === undefined) {
    invalidModelOutput(`code section is missing its code payload: ${sectionId}`);
  }
  if (table !== undefined) {
    invalidModelOutput(`section carries a disallowed table payload: ${sectionId}`);
  }
  if (code.lines.length > MAX_CODE_LINES) {
    invalidModelOutput(`section has too many code lines: ${sectionId}`);
  }

  let hasVisibleLine = false;
  for (const [lineIndex, line] of code.lines.entries()) {
    const normalizedLine = normalizeCodeLine(line);
    if (normalizedLine.length > MAX_CHARS_PER_ITEM) {
      invalidModelOutput(`code line is too long: ${sectionId}[${lineIndex}]`);
    }
    if (normalizedLine.length > 0) {
      hasVisibleLine = true;
    }
  }
  if (!hasVisibleLine) {
    invalidModelOutput(`section has an empty code payload: ${sectionId}`);
  }
}

function validateTablePayload(
  sectionId: SectionId,
  table: GeneratedDocumentTablePayload | undefined,
  code: GeneratedDocumentCodePayload | undefined,
): void {
  if (table === undefined) {
    invalidModelOutput(`table section is missing its table payload: ${sectionId}`);
  }
  if (code !== undefined) {
    invalidModelOutput(`section carries a disallowed code payload: ${sectionId}`);
  }
  if (table.rows.length > MAX_ITEMS_PER_SECTION) {
    invalidModelOutput(`section has too many table rows: ${sectionId}`);
  }

  for (const [cellIndex, cell] of table.header.entries()) {
    if (normalizeModelText(cell).length > MAX_TABLE_CELL_CHARS) {
      invalidModelOutput(`table header cell is too long: ${sectionId}[${cellIndex}]`);
    }
  }
  for (const [rowIndex, row] of table.rows.entries()) {
    if (row.length !== table.header.length) {
      invalidModelOutput(`table row width does not match the header: ${sectionId}[${rowIndex}]`);
    }
    for (const [cellIndex, cell] of row.entries()) {
      if (normalizeModelText(cell).length > MAX_TABLE_CELL_CHARS) {
        invalidModelOutput(`table cell is too long: ${sectionId}[${rowIndex}][${cellIndex}]`);
      }
    }
  }
}

function validateTasksItems(sectionId: SectionId, content: readonly string[], hasRichPayload: boolean): void {
  if (hasRichPayload) {
    invalidModelOutput(`section carries a rich payload its format does not allow: ${sectionId}`);
  }
  // Task items must carry their checkbox marker at position 0 of the
  // normalized text; normalizeModelText's trim is the only leading tolerance.
  for (const [itemIndex, item] of content.entries()) {
    if (!/^\[[ xX]\] \S/.test(normalizeModelText(item))) {
      invalidModelOutput(`section item is not a task checkbox item: ${sectionId}[${itemIndex}]`);
    }
  }
}

function canonicalizeValidatedModelDocument(
  sections: ReturnType<typeof validateModelDocument>,
  policy: ResolvedEnhancementPolicy,
): GeneratedDocument {
  return {
    sections: policy.sections.map((policySection) => {
      const section = sections.find((candidate) => candidate.id === policySection.id);
      if (section === undefined) {
        invalidModelOutput(`missing section id: ${policySection.id}`);
      }

      return {
        id: policySection.id,
        content: section.content.map(normalizeModelText),
        // Rich payloads are canonicalized with structure-preserving
        // normalizers (never the whitespace-collapsing text normalizer for
        // code lines) and omitted entirely when absent.
        ...(section.code === undefined
          ? {}
          : { code: { language: section.code.language, lines: section.code.lines.map(normalizeCodeLine) } }),
        ...(section.table === undefined
          ? {}
          : {
              table: {
                header: section.table.header.map(normalizeModelText),
                rows: section.table.rows.map((row) => row.map(normalizeModelText)),
              },
            }),
      };
    }),
  };
}

function rawByteLength(value: string): number {
  return new TextEncoder().encode(value).byteLength;
}

export function parseModelDocument(raw: string, policy: ResolvedEnhancementPolicy): GeneratedDocument {
  if (typeof raw !== "string") {
    invalidModelOutput("response must be a JSON string");
  }
  if (rawByteLength(raw) > MAX_MODEL_OUTPUT_BYTES) {
    throw new ModelOutputTooLargeError("raw response exceeds the byte limit");
  }

  rejectDuplicateJsonKeys(raw);

  let value: unknown;
  try {
    value = JSON.parse(raw) as unknown;
  } catch {
    invalidModelOutput("response is not valid JSON");
  }

  const document = canonicalizeValidatedModelDocument(validateModelDocument(value, policy), policy);
  renderGeneratedMarkdown(document, policy);
  return document;
}

export function renderGeneratedMarkdown(document: GeneratedDocument, policy: ResolvedEnhancementPolicy): string {
  const canonicalDocument = canonicalizeValidatedModelDocument(validateModelDocument(document, policy), policy);
  const blocks: string[] = [];

  for (const [index, section] of canonicalDocument.sections.entries()) {
    const policySection = policy.sections[index];
    if (policySection === undefined) {
      invalidModelOutput("trusted policy order does not match the canonical document");
    }

    // Canonical sections are already normalized per format; paragraphs and
    // bullets keep re-applying the text normalizer to preserve their exact
    // legacy rendering behavior.
    let body: string;
    if (policySection.format === "code") {
      body = renderCodeBody(section);
    } else if (policySection.format === "table") {
      body = renderTableBody(section);
    } else if (policySection.format === "tasks") {
      body = section.content
        .map((item) => {
          const match = /^\[([ xX])\] (.*)$/.exec(item);
          if (match === null) {
            invalidModelOutput(`section item is not a task checkbox item: ${policySection.id}`);
          }
          return `- [${match[1].toLowerCase()}] ${escapeMarkdownText(match[2])}`;
        })
        .join("\n");
    } else if (policySection.format === "bullets") {
      body = section.content.map((item) => `- ${escapeMarkdownText(normalizeModelText(item))}`).join("\n");
    } else {
      body = section.content.map((item) => escapeMarkdownText(normalizeModelText(item))).join("\n\n");
    }
    const marker = policySection.id === "objective" ? "#" : "##";
    blocks.push(`${marker} ${SECTION_TITLES[policySection.id]}\n\n${body}`);
  }

  const markdown = blocks.join("\n\n");
  if (markdown.length > MAX_NORMALIZED_MARKDOWN_CHARACTERS) {
    throw new ModelOutputTooLargeError("normalized Markdown exceeds the character limit");
  }
  return markdown;
}

/**
 * Renders a code section as a fenced block whose fence is always longer than
 * any backtick run at a trimmed line start (minimum three backticks), so the
 * payload can never terminate its own fence. Lines are emitted verbatim —
 * no Markdown escaping inside code.
 */
function renderCodeBody(section: GeneratedDocumentSection): string {
  const code = section.code;
  if (code === undefined) {
    invalidModelOutput(`code section is missing its code payload: ${section.id}`);
  }
  const fence = "`".repeat(Math.max(3, longestBacktickRunAtTrimmedLineStart(code.lines) + 1));
  return [`${fence}${code.language ?? ""}`, ...code.lines, fence].join("\n");
}

/**
 * Renders a table section as GitHub-flavored Markdown. Cells are escaped
 * individually BEFORE joining so pipes inside cell content become `\|`
 * while the ` | ` delimiters stay structural.
 */
function renderTableBody(section: GeneratedDocumentSection): string {
  const table = section.table;
  if (table === undefined) {
    invalidModelOutput(`table section is missing its table payload: ${section.id}`);
  }
  const header = table.header.map((cell) => escapeMarkdownText(cell));
  const rowLines = table.rows.map((row) => `| ${row.map((cell) => escapeMarkdownText(cell)).join(" | ")} |`);
  return [`| ${header.join(" | ")} |`, `| ${header.map(() => "---").join(" | ")} |`, ...rowLines].join("\n");
}
