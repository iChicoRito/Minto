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
 * Purity: relative imports into engine types/templates only; no framework,
 * browser, storage, clock, randomness, or locale-dependent APIs.
 */
import type { SectionId } from "../templates/template-types";
import { SECTION_TITLES } from "../templates/template-types";
import type { EnhancementLevel } from "../types";

type SectionValue = string | string[];

/** Renders one section body after removing surrounding and blank content. */
function renderBody(value: SectionValue): string | undefined {
  if (Array.isArray(value)) {
    const items = value.map((item) => item.trim()).filter((item) => item.length > 0);
    return items.length === 0 ? undefined : items.map((item) => `- ${item}`).join("\n");
  }

  const text = value.trim();
  return text.length === 0 ? undefined : text;
}

/**
 * Renders prepared section content at the requested enhancement level.
 * Repeated calls with the same object and options produce byte-identical text.
 */
export function generateMarkdown(
  content: Partial<Record<SectionId, string | string[]>>,
  opts: { level: EnhancementLevel },
): string {
  if (opts.level === "light") {
    const objective = content.objective;
    if (objective === undefined) {
      return "";
    }

    return Array.isArray(objective)
      ? objective
          .map((item) => item.trim())
          .filter((item) => item.length > 0)
          .join(" ")
      : objective.trim();
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
