/**
 * Slot extractor for raw prompts: pulls action verb, subject, domain,
 * technologies, preservation constraints, and requirements out of free-form
 * text (roadmap R-05 / tracker T-11).
 *
 * Purity: imports only the sibling vocabulary module; never React, Next.js,
 * DOM APIs, or storage. Determinism: fresh non-global regexes (or regex-free
 * indexOf scanning), `toLowerCase()` only, no clock or randomness — the same
 * input always produces the same output.
 */

import { ACTION_VERBS, CONSTRAINT_TRIGGERS, DOMAIN_KEYWORDS, TECHNOLOGIES } from "./vocabularies";

/** Structured slots extracted from a raw prompt string. */
export type ParsedPrompt = {
  action?: string;
  subject?: string;
  domain?: string;
  technologies: string[];
  constraints: string[];
  requirements: string[];
};

/** Half-open character span [start, end) inside a normalized prompt. */
type Span = { start: number; end: number };

/** Filler connectors trimmed from both ends of the subject segment. */
const FILLER_CONNECTORS = new Set(["to", "for", "the", "a", "an", "my", "our"]);

/** Words that terminate a constraint clause when met on a word boundary. */
const CLAUSE_BREAK_WORDS = ["but", "however"];

/** Escapes a dictionary phrase so it can be embedded in a RegExp verbatim. */
function escapeRegExp(value: string): string {
  return value.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
}

/**
 * Matches a technology marker: a connector word immediately followed by a
 * known technology name, e.g. "using Next.js" / "with Tailwind CSS".
 * Built once from TECHNOLOGIES; non-global, so it is stateless.
 */
const TECHNOLOGY_MARKER_PATTERN = new RegExp(
  `\\b(?:using|with|in)\\s+(?:${TECHNOLOGIES.map(escapeRegExp).join("|")})\\b`,
  "i",
);

/** Trim + collapse whitespace runs + fold typographic apostrophes (U+2019). */
function normalize(raw: string): string {
  return raw
    .trim()
    .replace(/\s+/g, " ")
    .replace(/\u2019/g, "'");
}

/**
 * Action: exact word match of the FIRST word against ACTION_VERBS.
 * Returns the lowercase verb, or undefined when the first word is not a verb.
 */
function extractAction(normalized: string): string | undefined {
  const spaceIndex = normalized.indexOf(" ");
  const firstWord = spaceIndex === -1 ? normalized : normalized.slice(0, spaceIndex);
  const firstWordLower = firstWord.toLowerCase();
  const verbs = ACTION_VERBS as readonly string[];
  return verbs.includes(firstWordLower) ? firstWordLower : undefined;
}

/**
 * Technologies: allow-list scan of the whole text; returns canonical names
 * in dictionary order, deduped. Unmatched words are silently ignored.
 */
function extractTechnologies(lowerText: string): string[] {
  const found: string[] = [];
  for (const technology of TECHNOLOGIES) {
    const pattern = new RegExp(`\\b${escapeRegExp(technology)}\\b`, "i");
    if (pattern.test(lowerText)) {
      found.push(technology);
    }
  }
  return found;
}

/** Index of the earliest clause terminator at or after `from`, or text length. */
function findClauseEnd(lowerText: string, from: number): number {
  const candidates: number[] = [];

  const periodIndex = lowerText.indexOf(".", from);
  if (periodIndex !== -1) candidates.push(periodIndex);

  for (const word of CLAUSE_BREAK_WORDS) {
    const wordIndex = lowerText.slice(from).search(new RegExp(`\\b${word}\\b`));
    if (wordIndex !== -1) candidates.push(from + wordIndex);
  }

  for (const trigger of CONSTRAINT_TRIGGERS) {
    const triggerIndex = lowerText.indexOf(trigger, from);
    if (triggerIndex !== -1) candidates.push(triggerIndex);
  }

  return candidates.length === 0 ? lowerText.length : Math.min(...candidates);
}

/** Drops trailing punctuation and whitespace left over from clause capture. */
function trimTrailingPunctuation(value: string): string {
  return value.replace(/[\s.,;:!]+$/, "");
}

/**
 * Constraints: every CONSTRAINT_TRIGGERS occurrence (scanned longest-phrase-
 * first so longer triggers are not shadowed by shorter overlaps) plus its
 * object up to the end of the clause — a period, "but"/"however" on a word
 * boundary, another trigger's start, or end of string. Returned in order of
 * appearance.
 */
function extractConstraints(normalized: string, lowerText: string): string[] {
  const longestFirst = [...CONSTRAINT_TRIGGERS].sort((a, b) => b.length - a.length);
  const spans: Span[] = [];

  for (const trigger of longestFirst) {
    let searchFrom = 0;
    for (;;) {
      const start = lowerText.indexOf(trigger, searchFrom);
      if (start === -1) break;
      searchFrom = start + trigger.length;
      const overlapsAccepted = spans.some((span) => start < span.end && span.start < searchFrom);
      if (overlapsAccepted) continue;
      spans.push({ start, end: findClauseEnd(lowerText, searchFrom) });
    }
  }

  spans.sort((a, b) => a.start - b.start);
  return spans.map((span) => trimTrailingPunctuation(normalized.slice(span.start, span.end)));
}

/** Iteratively strips filler connectors from both ends of the segment. */
function trimFillerConnectors(segment: string): string {
  const words = segment.split(" ").filter((word) => word.length > 0);
  while (words.length > 0 && FILLER_CONNECTORS.has(words[0].toLowerCase())) {
    words.shift();
  }
  while (words.length > 0 && FILLER_CONNECTORS.has(words[words.length - 1].toLowerCase())) {
    words.pop();
  }
  return words.join(" ");
}

/**
 * Subject: only extracted when an action verb leads the prompt. The segment
 * after the verb is cut at the earliest of: a technology marker ("using /
 * with / in <tech>"), a constraint trigger, or the first period; filler
 * connectors are then trimmed from both edges. Empty remainder → undefined.
 */
function extractSubject(normalized: string, action: string | undefined): string | undefined {
  if (action === undefined) return undefined;

  const spaceIndex = normalized.indexOf(" ");
  if (spaceIndex === -1) return undefined;
  const rest = normalized.slice(spaceIndex + 1);
  const restLower = rest.toLowerCase();

  const cuts: number[] = [];

  const markerIndex = rest.search(TECHNOLOGY_MARKER_PATTERN);
  if (markerIndex !== -1) cuts.push(markerIndex);

  for (const trigger of CONSTRAINT_TRIGGERS) {
    const triggerIndex = restLower.indexOf(trigger);
    if (triggerIndex !== -1) cuts.push(triggerIndex);
  }

  const periodIndex = rest.indexOf(".");
  if (periodIndex !== -1) cuts.push(periodIndex);

  const segment = cuts.length === 0 ? rest : rest.slice(0, Math.min(...cuts));
  const subject = trimFillerConnectors(segment);
  return subject.length === 0 ? undefined : subject;
}

/**
 * Domain: first DOMAIN_KEYWORDS key (declaration order) found as a substring
 * of the lowercased subject maps to its domain value; otherwise undefined.
 */
function extractDomain(subject: string | undefined): string | undefined {
  if (subject === undefined) return undefined;
  const lowerSubject = subject.toLowerCase();
  for (const keyword of Object.keys(DOMAIN_KEYWORDS)) {
    if (lowerSubject.includes(keyword)) {
      return DOMAIN_KEYWORDS[keyword];
    }
  }
  return undefined;
}

/** True when a "- ", "* ", or numbered "1. " list marker starts at index. */
function listMarkerEndAt(text: string, index: number): number {
  if (text.startsWith("- ", index) || text.startsWith("* ", index)) {
    return index + 2;
  }
  let cursor = index;
  while (cursor < text.length && text.charAt(cursor) >= "0" && text.charAt(cursor) <= "9") {
    cursor += 1;
  }
  if (cursor > index && text.charAt(cursor) === "." && text.charAt(cursor + 1) === " ") {
    return cursor + 2;
  }
  return -1;
}

/** Spans of every explicit list marker, used to split requirement segments. */
function findListMarkerSpans(text: string): Span[] {
  const spans: Span[] = [];
  let index = 0;
  while (index < text.length) {
    const atBoundary = index === 0 || text.charAt(index - 1) === " ";
    if (atBoundary) {
      const markerEnd = listMarkerEndAt(text, index);
      if (markerEnd !== -1) {
        spans.push({ start: index, end: markerEnd });
        index = markerEnd;
        continue;
      }
    }
    index += 1;
  }
  return spans;
}

/** Uppercases only the first character; input is already lowercase. */
function capitalizeFirst(value: string): string {
  return value.charAt(0).toUpperCase() + value.slice(1);
}

// Authored: requirements heuristic. Explicit list markers ("- ", "* ",
// numbered "1. ") win — each marked segment becomes one requirement (markers
// stripped). Otherwise exactly ONE requirement is derived from action +
// subject as `${capitalized(action)} ${subject}`; without both, requirements
// stays empty rather than guessing.
function extractRequirements(normalized: string, action: string | undefined, subject: string | undefined): string[] {
  const markerSpans = findListMarkerSpans(normalized);

  if (markerSpans.length > 0) {
    const requirements: string[] = [];
    for (let i = 0; i < markerSpans.length; i += 1) {
      const segmentEnd = i + 1 < markerSpans.length ? markerSpans[i + 1].start : normalized.length;
      const segment = normalized.slice(markerSpans[i].end, segmentEnd).trim();
      if (segment.length > 0) requirements.push(segment);
    }
    return requirements;
  }

  if (action === undefined || subject === undefined) return [];
  return [`${capitalizeFirst(action)} ${subject}`];
}

/**
 * Parses a raw prompt into structured slots. Pure and deterministic:
 * same input → same output, no side effects, no shared mutable state.
 */
export function parsePrompt(raw: string): ParsedPrompt {
  const normalized = normalize(raw);
  const lowerText = normalized.toLowerCase();

  const action = extractAction(normalized);
  const technologies = extractTechnologies(lowerText);
  const constraints = extractConstraints(normalized, lowerText);
  const subject = extractSubject(normalized, action);

  return {
    action,
    subject,
    domain: extractDomain(subject),
    technologies,
    constraints,
    requirements: extractRequirements(normalized, action, subject),
  };
}
