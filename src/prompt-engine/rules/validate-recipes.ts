/**
 * Rule-engine invariant half (roadmap R-08/R-09, tracker T-17): validates
 * enhancement recipes so downstream section selection can trust their shape.
 * Decision D5 splits the responsibilities — templates own the per-strength
 * lists as data; this module owns validation only and never mutates,
 * reorders, or repairs anything.
 *
 * Invariants checked per template:
 *   (a) "objective" is the first element of every strength list;
 *   (b) no duplicate ids within a single strength list;
 *   (c) standard is an order-preserving subset of detailed (cursor scan);
 *   (d) light is an order-preserving subset of standard;
 *   (e) standard and detailed are non-empty at runtime. SectionId
 *       membership is compile-enforced by the SectionId union, so there is
 *       no per-id runtime vocabulary check here — only emptiness, which the
 *       type system cannot see.
 *
 * Determinism: fixed strength order, registry iteration follows the
 * registry's declared PromptTaskType union order, violations accumulate in
 * fixed check order; no locale APIs, clock, or randomness.
 *
 * Purity: relative imports into the templates layer only; never React,
 * Next.js, DOM APIs, or storage.
 *
 * @source material L423-L425 ("main intelligence layer"), L476-L553 (levels); authored invariants per decision D5
 */
import { TEMPLATE_REGISTRY } from "../templates/registry";
import type { PromptTemplate, SectionId } from "../templates/template-types";

/** Strength lists every template defines, in fixed ascending order. */
const STRENGTH_LEVELS = ["light", "standard", "detailed"] as const;

/** True when `list` repeats any section id. */
function hasDuplicateIds(list: readonly SectionId[]): boolean {
  return new Set(list).size !== list.length;
}

/**
 * True when every id of `sub` reappears in `superList` at a strictly later
 * index than the previous hit — i.e. an order-preserving subset.
 */
function isOrderedSubset(sub: readonly SectionId[], superList: readonly SectionId[]): boolean {
  let cursor = 0;
  for (const id of sub) {
    const found = superList.indexOf(id, cursor);
    if (found === -1) {
      return false;
    }
    cursor = found + 1;
  }
  return true;
}

/**
 * Collects every violated invariant for one template. Violations come back
 * in fixed check order; an empty array means the template is valid.
 */
export function validateTemplate(template: PromptTemplate): readonly string[] {
  const violations: string[] = [];
  const { light, standard, detailed } = template.sections;

  for (const level of STRENGTH_LEVELS) {
    const list: readonly SectionId[] = template.sections[level];
    // (a) objective opens every strength list.
    if (list[0] !== "objective") {
      violations.push(`${template.id}: "${level}" must open with "objective"`);
    }
    // (b) no duplicate section ids within a strength list.
    if (hasDuplicateIds(list)) {
      violations.push(`${template.id}: "${level}" repeats a section id`);
    }
  }

  // (e) runtime non-emptiness for the structural strengths (light's
  // emptiness is already caught by the objective-first check above).
  if (standard.length === 0) {
    violations.push(`${template.id}: "standard" must be non-empty`);
  }
  if (detailed.length === 0) {
    violations.push(`${template.id}: "detailed" must be non-empty`);
  }

  // (c) standard ⊆ detailed as an order-preserving subset.
  if (!isOrderedSubset(standard, detailed)) {
    violations.push(
      `${template.id}: standard ${JSON.stringify(standard)} is not an order-preserving subset of detailed ${JSON.stringify(detailed)}`,
    );
  }
  // (d) light ⊆ standard as an order-preserving subset.
  if (!isOrderedSubset(light, standard)) {
    violations.push(
      `${template.id}: light ${JSON.stringify(light)} is not an order-preserving subset of standard ${JSON.stringify(standard)}`,
    );
  }

  return violations;
}

/**
 * Runs validateTemplate over every entry of the given registry (defaults to
 * TEMPLATE_REGISTRY and its 13 recipes), concatenating violations in
 * registry declaration order. An empty array means the whole registry is
 * invariant-clean.
 */
export function validateRegistry(registry: typeof TEMPLATE_REGISTRY = TEMPLATE_REGISTRY): readonly string[] {
  const violations: string[] = [];
  for (const key of Object.keys(registry)) {
    violations.push(...validateTemplate(registry[key as keyof typeof registry]));
  }
  return violations;
}
