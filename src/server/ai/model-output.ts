import { z } from "zod";

import {
  MAX_CHARS_PER_ITEM,
  MAX_ITEMS_PER_SECTION,
  MAX_MODEL_OUTPUT_BYTES,
  MAX_NORMALIZED_MARKDOWN_CHARACTERS,
} from "../../lib/ai-enhancement/contracts";
import { SECTION_TITLES, type SectionId } from "../../prompt-engine/templates/template-types";
import type { ResolvedEnhancementPolicy } from "./policy-resolver";

export type GeneratedDocument = {
  sections: Array<{ id: SectionId; content: string[] }>;
};

const modelSectionSchema = z
  .object({
    id: z.string().min(1),
    content: z.array(z.string()),
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

    if (!policyIdSet.has(sectionId)) {
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
  }

  const missingIds = policyIds.filter((sectionId) => !seenIds.has(sectionId));
  if (missingIds.length > 0) {
    invalidModelOutput(`missing section id: ${missingIds.join(", ")}`);
  }

  return parsed.data.sections;
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

    const body =
      policySection.format === "bullets"
        ? section.content.map((item) => `- ${escapeMarkdownText(normalizeModelText(item))}`).join("\n")
        : section.content.map((item) => escapeMarkdownText(normalizeModelText(item))).join("\n\n");
    const marker = policySection.id === "objective" ? "#" : "##";
    blocks.push(`${marker} ${SECTION_TITLES[policySection.id]}\n\n${body}`);
  }

  const markdown = blocks.join("\n\n");
  if (markdown.length > MAX_NORMALIZED_MARKDOWN_CHARACTERS) {
    throw new ModelOutputTooLargeError("normalized Markdown exceeds the character limit");
  }
  return markdown;
}
