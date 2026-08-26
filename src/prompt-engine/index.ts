/**
 * Public prompt-engine barrel and synchronous end-to-end pipeline.
 *
 * The pipeline deliberately keeps analysis assembly and section-content
 * preparation here: parser slots and classifier output stay separate until
 * the public result is formed, while the existing resolver, rules, and
 * generator remain the owners of template selection and Markdown formatting.
 * Purity: relative engine imports only; no framework, storage, browser, time,
 * randomness, or locale-dependent APIs.
 */

import type { ClassificationResult } from "./classifier/classify-prompt";
import { classifyPrompt } from "./classifier/classify-prompt";
import { generateMarkdown, type SectionValue } from "./generator/generate-markdown";
import { detectContentSignals } from "./parser/detect-content-signals";
import { type ParsedPrompt, parsePrompt } from "./parser/parse-prompt";
import {
  appendBlock,
  bulletsToNumbered,
  bulletsToTasks,
  CODE_SECTION_PRIORITY,
  codeBlockFrom,
  TABLE_SECTION_PRIORITY,
  tableSkeleton,
} from "./rules/intent-blocks";
import { correctGrammarOnly, polishLight } from "./rules/light-polish";
import { selectSections } from "./rules/select-sections";
import { resolveTemplate } from "./templates/resolve-template";
import type { SectionId } from "./templates/template-types";
import type { EnhancementLevel, PromptAnalysis, PromptCategory, PromptTaskType } from "./types";

export type EnhancePromptOptions = {
  level?: EnhancementLevel;
  taskType?: PromptTaskType;
  sections?: readonly SectionId[];
};

export type ResolvedEnhancement = {
  taskType: PromptTaskType;
  category: PromptCategory;
  level: EnhancementLevel;
  sections: readonly SectionId[];
};

export type EnhancePromptResult = {
  analysis: PromptAnalysis;
  classification: ClassificationResult;
  resolved: ResolvedEnhancement;
  markdown: string;
};

/**
 * Authored pipeline copy: standard/detailed objectives use the material's
 * concise fix wording; other objectives reuse the existing light polisher.
 */
function buildObjective(parsed: ParsedPrompt, raw: string): string {
  const subject =
    parsed.subject && !["it", "this", "that"].includes(parsed.subject.toLowerCase()) ? parsed.subject : undefined;
  if (parsed.action === "fix") {
    return subject === undefined ? "Resolve the described issue." : `Resolve the ${subject}.`;
  }
  return polishLight(parsed, raw);
}

/**
 * Authored pipeline copy: narrative sections use short, deterministic bodies
 * from the parsed subject until section-specific rule content exists.
 */
function narrativeContent(section: SectionId, parsed: ParsedPrompt): string {
  const subject =
    parsed.subject && !["it", "this", "that"].includes(parsed.subject.toLowerCase()) ? parsed.subject : "request";

  switch (section) {
    case "problem":
      return `Address the ${subject}.`;
    case "scope":
      return `Limit the work to the ${subject}.`;
    case "verification":
      if (parsed.subject === undefined || ["it", "this", "that"].includes(parsed.subject.toLowerCase())) {
        return parsed.action === "fix"
          ? "Confirm that the issue is resolved."
          : "Confirm that the requested outcome is complete.";
      }
      return `Confirm that the ${subject} is resolved.`;
    case "context":
      return "Use the supplied request as implementation context.";
    case "implementation":
      return `Implement the requested change for the ${subject}.`;
    case "acceptance-criteria":
      return "The requested outcome is complete and verified.";
    case "review-scope":
      return `Review the ${subject}.`;
    case "review-areas":
      return "Review correctness, clarity, and maintainability.";
    case "output-format":
      return "Return the result in clear Markdown.";
    case "research-scope":
      return `Focus the research on the ${subject}.`;
    case "key-questions":
      return `Identify the key questions about the ${subject}.`;
    case "audience":
      return "Write for the intended reader.";
    case "outline":
      return "Present the topic, main points, and conclusion.";
    case "source-content":
      return "Use the supplied prompt as the source content.";
    case "style-notes":
      return "Use clear, direct language.";
    case "key-points":
      return `State the key points about the ${subject}.`;
    case "comparison-scope":
      return `Compare the relevant options for the ${subject}.`;
    case "criteria":
      return "Compare the relevant capabilities and meaningful differences.";
    case "subject":
      return `Use the ${subject} as the subject.`;
    case "style-direction":
      return "Keep the style clear and purposeful.";
    case "technical-requirements":
      return "Respect the requested technical constraints.";
    case "objective":
    case "requirements":
    case "constraints":
      return "";
  }
}

/** Builds generator content in the exact order returned by selectSections. */
function buildContent(
  sections: readonly SectionId[],
  parsed: ParsedPrompt,
  raw: string,
): Partial<Record<SectionId, SectionValue>> {
  const content: Partial<Record<SectionId, SectionValue>> = {};

  for (const section of sections) {
    if (section === "objective") {
      content[section] = buildObjective(parsed, raw);
    } else if (section === "requirements") {
      content[section] = parsed.requirements.slice();
    } else if (section === "constraints") {
      content[section] = parsed.constraints.slice();
    } else {
      content[section] = narrativeContent(section, parsed);
    }
  }

  return content;
}

/**
 * Authored intent mapping (decision D8): converts prepared section values
 * into rich blocks when structural signals justify it. Code and table
 * constructs attach to at most one section each (priority order); task and
 * numbered conversions reshape existing narrative/bullet bodies in place.
 * Light and grammar-only paths never reach this function.
 */
function applyIntentBlocks(
  content: Partial<Record<SectionId, SectionValue>>,
  sections: readonly SectionId[],
  raw: string,
  taskType: PromptTaskType,
): Partial<Record<SectionId, SectionValue>> {
  const signals = detectContentSignals(raw);
  const result: Partial<Record<SectionId, SectionValue>> = { ...content };

  if (signals.hasFencedCode) {
    const target = CODE_SECTION_PRIORITY.find((id) => sections.includes(id));
    const block = codeBlockFrom(raw);
    if (target !== undefined && block !== null) {
      result[target] = appendBlock(result[target], block);
    }
  }

  if (taskType === "comparison" || signals.wantsTable) {
    const target = TABLE_SECTION_PRIORITY.find((id) => sections.includes(id));
    if (target !== undefined) {
      result[target] = appendBlock(result[target], tableSkeleton());
    }
  }

  if (signals.checklistIntent) {
    for (const id of TASK_SECTION_IDS) {
      result[id] = reshapeAsTasks(result[id]);
    }
  }

  if (signals.wantsSteps) {
    for (const id of NUMBERED_SECTION_IDS) {
      result[id] = reshapeAsNumbered(result[id]);
    }
  }

  return result;
}

/** Sections reshaped as unchecked task lists when checklist wording appears. */
const TASK_SECTION_IDS: readonly SectionId[] = ["acceptance-criteria", "verification"];

/** Sections reshaped as numbered steps when step wording appears. */
const NUMBERED_SECTION_IDS: readonly SectionId[] = ["outline", "key-points"];

/** Views a legacy-or-rich section value's plain items, or undefined when already rich. */
function plainItems(value: SectionValue | undefined): readonly string[] | undefined {
  if (value === undefined) {
    return undefined;
  }
  if (typeof value === "string") {
    return [value];
  }
  if (Array.isArray(value) && (value.length === 0 || typeof value[0] === "string")) {
    return value as readonly string[];
  }
  return undefined;
}

function reshapeAsTasks(value: SectionValue | undefined): SectionValue {
  const items = plainItems(value);
  return items === undefined ? (value ?? []) : bulletsToTasks(items);
}

function reshapeAsNumbered(value: SectionValue | undefined): SectionValue {
  const items = plainItems(value);
  return items === undefined ? (value ?? []) : bulletsToNumbered(items);
}

/**
 * Enhances a raw prompt synchronously through parsing, classification,
 * template selection, section rules, and Markdown generation.
 */
export function enhancePrompt(raw: string, options?: EnhancePromptOptions): EnhancePromptResult {
  const level = options?.level ?? "standard";
  const parsed = parsePrompt(raw);
  const classification = classifyPrompt(parsed, raw);
  const taskType = options?.taskType ?? classification.taskType;
  const template = resolveTemplate(taskType);
  const sections =
    options?.sections === undefined ? selectSections(template, level, parsed) : [...new Set(options.sections)];
  const analysis: PromptAnalysis = {
    original: raw,
    category: classification.category,
    taskType: classification.taskType,
    confidence: classification.confidence,
    action: parsed.action,
    subject: parsed.subject,
    domain: parsed.domain,
    technologies: parsed.technologies.slice(),
    constraints: parsed.constraints.slice(),
    requirements: parsed.requirements.slice(),
    enhancementLevel: level,
  };
  const resolved: ResolvedEnhancement = {
    taskType,
    category: template.category,
    level,
    sections,
  };

  if (raw.trim().length === 0) {
    return { analysis, classification, resolved, markdown: "" };
  }
  const isExplicitSections = options?.sections !== undefined;
  const isGrammarOnly =
    isExplicitSections && (sections.length === 0 || (sections.length === 1 && sections[0] === "objective"));

  if (isGrammarOnly) {
    // User explicitly selected no sections (only objective) — grammar-only mode:
    // correct grammar and enhance structure of the actual input, no preset,
    // no markdown headings/bullets, just plain corrected text.
    const corrected = correctGrammarOnly(raw);
    return {
      analysis,
      classification,
      resolved: { ...resolved, sections: [], presetId: null } as unknown as ResolvedEnhancement,
      markdown: corrected,
    };
  }

  if (level === "light") {
    const objective = polishLight(parsed, raw);
    return { analysis, classification, resolved, markdown: generateMarkdown({ objective }, { level }) };
  }

  const content = applyIntentBlocks(buildContent(sections, parsed, raw), sections, raw, taskType);
  return { analysis, classification, resolved, markdown: generateMarkdown(content, { level }) };
}

export type { ClassificationResult } from "./classifier/classify-prompt";
export type { ConfidenceBand } from "./classifier/to-confidence";
export type { SectionBlock, SectionValue } from "./generator/generate-markdown";
export type { ContentSignals } from "./parser/detect-content-signals";
export type { ParsedPrompt } from "./parser/parse-prompt";
export type { PromptTemplate, SectionId } from "./templates/template-types";
export type { EnhancementLevel, PromptAnalysis, PromptCategory, PromptTaskType } from "./types";
export { MAX_PROMPT_CHARACTERS, validatePrompt } from "./validate-prompt";
export {
  classifyPrompt,
  detectContentSignals,
  generateMarkdown,
  parsePrompt,
  polishLight,
  resolveTemplate,
  selectSections,
};
