/**
 * Parser vocabularies: controlled word lists for slot extraction
 * (roadmap R-05 / tracker T-11). Pure data — no logic, no imports;
 * the engine layer never pulls in view, routing, or storage libraries.
 *
 * @source material L295-L344 (actions, constraint triggers, technologies verbatim)
 * @source authored domain-keyword map (starter set, grows over time)
 */

/** Verbs signaling an actionable request; matched case-insensitively downstream (material L295-L307). */
export const ACTION_VERBS = [
  "add",
  "create",
  "build",
  "implement",
  "fix",
  "review",
  "refactor",
  "test",
  "document",
  "research",
  "compare",
] as const;

/** Phrases signaling a preservation constraint; matched case-insensitively downstream (material L313-L322). */
export const CONSTRAINT_TRIGGERS = [
  "don't change",
  "do not modify",
  "without changing",
  "only modify",
  "preserve",
  "keep existing",
  "do not remove",
  "don't touch",
] as const;

/** Canonical technology names, stored in canonical casing; matching is case-insensitive downstream (material L328-L344). */
export const TECHNOLOGIES = [
  "Next.js",
  "React",
  "Vue",
  "Angular",
  "Laravel",
  "PHP",
  "TypeScript",
  "JavaScript",
  "Prisma",
  "MySQL",
  "PostgreSQL",
  "Supabase",
  "Firebase",
  "Tailwind CSS",
] as const;

/**
 * Authored map of subject keywords to domain names, used by the light-strength
 * polisher to enrich preservation clauses. Like the material's technology
 * dictionary, this starter set is meant to grow over time.
 */
export const DOMAIN_KEYWORDS: Readonly<Record<string, string>> = {
  login: "authentication",
  signin: "authentication",
  "sign-in": "authentication",
  auth: "authentication",
  password: "authentication",
  database: "data layer",
  db: "data layer",
  api: "API",
  ui: "interface",
};

export type ActionVerb = (typeof ACTION_VERBS)[number];

export type Technology = (typeof TECHNOLOGIES)[number];
