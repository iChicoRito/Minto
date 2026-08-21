/**
 * Strength-driven section selection (roadmap R-08/R-09, tracker T-18):
 * picks which recipe sections survive for one prompt at one enhancement
 * level. Decision D5 keeps the templates owning the per-strength lists as
 * data — this module never reorders, never adds, never authors structure;
 * it only applies the drop-empty merge over the template's list.
 *
 * The merge honors the material's "never force one structure on every
 * prompt" (L553) via its Constraints example: a prompt that states no
 * constraint must not grow an empty Constraints heading. List sections are
 * dropped when their parser slot came back empty ("constraints" ←
 * parsed.constraints, "requirements" ← parsed.requirements); every other
 * section is kept, because narrative sections receive authored default
 * content in the downstream assembly task (generator).
 *
 * Authored: the precise drop-empty merge and its parser-slot mapping extend
 * the material's principle beyond the single Constraints example.
 *
 * Determinism: pure filter over a fixed list — same inputs, same output.
 * Purity: relative imports into the templates/parser/types layers only;
 * never React, Next.js, DOM APIs, or storage.
 */
import type { ParsedPrompt } from "../parser/parse-prompt";
import type { PromptTemplate, SectionId } from "../templates/template-types";
import type { EnhancementLevel } from "../types";

/**
 * Returns the section ids for `template` at strength `level`, in the
 * template's own order. Light returns the template's list unchanged;
 * standard/detailed start from the template's list and drop list sections
 * whose parsed content is empty.
 */
export function selectSections(
  template: PromptTemplate,
  level: EnhancementLevel,
  parsed: ParsedPrompt,
): readonly SectionId[] {
  const base = template.sections[level];

  if (level === "light") {
    return base;
  }

  return base.filter((id) => {
    if (id === "constraints" && parsed.constraints.length === 0) {
      return false;
    }
    if (id === "requirements" && parsed.requirements.length === 0) {
      return false;
    }
    return true;
  });
}
