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
import { classifyPrompt } from "./classifier/classify-prompt";
import { generateMarkdown } from "./generator/generate-markdown";
import { type ParsedPrompt, parsePrompt } from "./parser/parse-prompt";
import { polishLight } from "./rules/light-polish";
import { selectSections } from "./rules/select-sections";
import { resolveTemplate } from "./templates/resolve-template";
import type { SectionId } from "./templates/template-types";
import type { EnhancementLevel, PromptAnalysis, PromptCategory, PromptTaskType } from "./types";

type SectionContent = string | string[];

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
  resolved: ResolvedEnhancement;
  markdown: string;
};

/**
 * Authored pipeline copy: standard/detailed objectives use the material's
 * concise fix wording; other objectives reuse the existing light polisher.
 */
function buildObjective(parsed: ParsedPrompt, raw: string): string {
  if (parsed.action === "fix" && parsed.subject !== undefined) {
    return `Resolve the ${parsed.subject}.`;
  }
  return polishLight(parsed, raw);
}

/**
 * Authored pipeline copy: narrative sections use short, deterministic bodies
 * from the parsed subject until section-specific rule content exists.
 */
function narrativeContent(section: SectionId, parsed: ParsedPrompt): string {
  const subject = parsed.subject ?? "request";

  switch (section) {
    case "problem":
      return `Address the ${subject}.`;
    case "scope":
      return `Limit the work to the ${subject}.`;
    case "verification":
      if (parsed.subject === undefined) {
        return "Confirm that the requested outcome is complete.";
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
): Partial<Record<SectionId, SectionContent>> {
  const content: Partial<Record<SectionId, SectionContent>> = {};

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
    return { analysis, resolved, markdown: "" };
  }

  if (level === "light") {
    const objective = polishLight(parsed, raw);
    return { analysis, resolved, markdown: generateMarkdown({ objective }, { level }) };
  }

  const content = buildContent(sections, parsed, raw);
  return { analysis, resolved, markdown: generateMarkdown(content, { level }) };
}

export type { ClassificationResult } from "./classifier/classify-prompt";
export type { ConfidenceBand } from "./classifier/to-confidence";
export type { ParsedPrompt } from "./parser/parse-prompt";
export type { PromptTemplate, SectionId } from "./templates/template-types";
export type { EnhancementLevel, PromptAnalysis, PromptCategory, PromptTaskType } from "./types";
export { classifyPrompt, generateMarkdown, parsePrompt, polishLight, resolveTemplate, selectSections };
