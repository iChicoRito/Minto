---
title: "Phases 2+3 — Understanding What Was Asked & Turning Understanding into Structure"
status: in-progress
created_at: 2026-08-21T23:25:00+08:00
updated_at: 2026-08-21T23:47:00+08:00
---

# Plan: Phases 2+3 — Understanding & Structure

Implements `prompts/01.md` → **Phase 2 (R-04…R-07)** and **Phase 3 (R-08…R-11)** of the roadmap in
`docs/ANALYSIS - PROMPT ENHANCER/07 - DEVELOPMENT ROADMAP.md`, covering tasks **T-08 … T-23**
from `09 - TASK TRACKER.md`. Phase 1 (R-01…R-03) is complete and out of scope.

## Goal

The engine pipeline the material calls its most important milestone works end to end, entirely
inside `src/prompt-engine/`: a rough instruction goes in, a classified analysis comes back with an
honest confidence level (falling back to General when unsure), and a structured Markdown document
comes out — with no UI, no storage, and zero changes outside the engine, its verification harness,
and the analysis vault's trackers.

## Success criteria

From the roadmap's own definitions-of-done, made verifiable:

1. `npm run verify:engine` (new script, ts-node pattern) exits 0 with all golden cases passing:
   - Parser reproduces the material's example: `"Add Google login using Next.js but don't change email authentication."` → action `add`, subject `Google login`, technologies `["Next.js"]`, constraints `["don't change email authentication"]`.
   - Classifier on `"Fix my login because it sometimes fails"` → **Bug Fix, High confidence** (score 7 under printed weights; C-02's printed 11 treated as source erratum).
   - A deliberately odd instruction → **General, Low band, `fallbackToGeneral: true`**.
   - Light strength on `"fix login problem"` → exactly `"Investigate and resolve the login problem while preserving existing authentication behavior."` (material L497).
   - Standard and Detailed strengths produce their documented heading structures (L504–551).
   - Negative controls pass (feature wording must NOT classify bug-fix; ≥3 odd inputs → General/Low; empty input → defined result, no crash).
   - Two consecutive runs produce byte-identical output (determinism gate).
2. Engine purity holds: no `react`/`next`/`@/`-alias imports anywhere in `src/prompt-engine/`
   (grep gate empty); `tsc -p tsconfig.engine.json --noEmit` compiles clean with DOM lib removed;
   no `window`/`document`/`localStorage`/`Math.random`/`Date.now`/locale-dependent APIs.
3. `src/prompt-engine/types.ts` is byte-for-byte unchanged (`PromptAnalysis` stays the shared contract).
4. Scoped `npx biome check` clean on every touched path; `npm run build` green with all six enhancer
   routes still static; `git status --porcelain "src/app/(template)"` empty at every commit.
5. Git hygiene: Phase 1 work committed and tagged `phase-1` **before** any engine code lands;
   one commit per roadmap item; tags `phase-2` and `phase-3` at phase boundaries.
6. Vault consistency: R-04…R-11 → ✅ in tracker 08, T-08…T-23 → ✅ in tracker 09 (summary count rows
   reconciled), one dated entry in 13 - REVISION LOG enumerating every authored-beyond-material
   artifact, Q-02/Q-03/C-02 resolutions recorded where the old "unsettled" notes live.

## Scope and constraints

### In scope
- R-04 parser · R-05 controlled word lists · R-06 weighted classifier · R-07 confidence bands +
  General fallback (engine side only) — Phase 2.
- R-08 rule engine · R-09 strength behaviors (light/standard/detailed) · R-10 template library +
  resolver · R-11 markdown generator · small pipeline entry `enhancePrompt()` — Phase 3.
- Verification harness `src/scripts/verify-engine.ts` + fixtures + npm script alias.
- Purity gates: `tsconfig.engine.json` (DOM-free compile of the engine folder).
- Tracker/bookkeeping updates in `docs/ANALYSIS - PROMPT ENHANCER/` (08, 09, 13, doorway touch in 00).

### Out of scope (later phases)
- Any UI: the manual type picker, low-confidence message rendering, Enhance page wiring (Phase 4,
  T-24+). R-07's deliverable is a machine-readable result (`fallbackToGeneral`, band), not a component.
- Any storage: Dexie schema, stores, history (Phase 5). `dexie` stays installed-but-unused.
- Settings, backup, hard-input UI treatment, responsive layouts (Phase 6). Note: full Q-04
  conflict-display resolution lives there; this plan settles only the engine-side tie rule.
- Test framework (vitest etc.), 100–200 dataset, perf tuning, PWA, deployment (Phase 7).
  The <100 ms target is noted, not optimized for.

### Hard constraints
- **Never alter anything under `src/app/(template)/`; never import from it.** Porcelain gate per commit.
- No repo-wide `npm run check:fix` (would rewrite frozen template files) — scoped biome only.
- `src/prompt-engine/**` never imports React, Next.js, UI, stores, or storage; internal imports are
  relative-only and strictly downward (layering below); external consumers may import only `@/prompt-engine`.
- Repo conventions: kebab-case filenames, sorted classes, fixed import group order, width 120,
  double quotes, semicolons; conventional commits.
- Determinism: same input → same output. Fresh non-global regexes, `toLowerCase()` only (no
  locale-aware casing/collation), explicit-comparator sorts over copies, fixed iteration order.

## Repository evidence

| Finding | Where | Consequence |
|---|---|---|
| Phase 1 done but **entirely uncommitted** — single commit `7241ee0`; shell, types, docs, prompts all in working tree | `git status/log` | Task 0 must commit + tag `phase-1` first or there is no rollback baseline |
| Engine = one file, `types.ts`, zero imports; vocabulary verbatim (5 categories, 13 types, 3 strengths) | `src/prompt-engine/types.ts` | Contract frozen; stage-owned richer types live beside their modules |
| Material spec for these phases: parser L266–347, classifier L351–419, rules L423–472, strengths L476–553, templates L557–603, generator L607–638 | `docs/ANALYSIS - PROMPT ENHANCER/MATERIAL/prompt-enhancer-detailed-context.md` | All golden cases and data tables come from these ranges |
| C-02: worked example claims score 11; printed weights max at 7 ("fix"=3 + "fails"≈"failing"=4) | findings doc, C-02 | Treat as source erratum; do NOT retune weights to hit 11 |
| Q-02 unresolved (raw→percentage); Q-03: recipes for only 4 of 13 types; Q-04 tie-break unspecified but zero-score ties occur in Phase 2 already | findings doc / START HERE | Resolved by user decision this session (below); recorded in vault before ✅ flips |
| Only bug-fix has a signal-weight table; 12 tables must be authored | material L366–374 | Authored under calibration rules, provenance-marked |
| Harness precedent: `generate:presets` runs `ts-node -P tsconfig.scripts.json` over `src/scripts/**` | `package.json`, `tsconfig.scripts.json` | `verify-engine.ts` slots into the existing pattern; no new deps |
| No purity tooling today: DOM lib global in `tsconfig.json`; `react` is a legal dep so biome won't flag it | `biome.json`, `tsconfig.json` | Grep gate + dedicated `tsconfig.engine.json` needed |
| Pre-commit hook runs `generate:presets` (idempotent — `theme.ts` currently unmodified) then lint-staged biome on staged files; biome error blocks commit | `.husky/pre-commit`, git status | Run scoped biome before committing; inspect `git show --stat` for swept-in files |
| Trackers are hand-edited with summary count rows that can drift | docs 08/09 | Reconcile counts as part of each flip; reviewer checks at phase boundary |

## Decisions (this plan is decision-complete)

Recorded here and to be copied into the vault by Task 10:

| # | Decision | Resolution | Origin |
|---|---|---|---|
| D1 | Q-02 raw→percentage | **Margin × evidence floor**: `confidence = round(min(margin, evidence))` where `margin = 100·top/(top+second)` (0 if top=0) and `evidence = 100·top/EVIDENCE_SATURATION`, `EVIDENCE_SATURATION = 7`. Bands: ≥80 High, 60–79 Medium, <60 Low. Reproduces Bug Fix/High at honest score 7; lone weak signal ("issue"=2) → 29% Low; exact tie → 50% Low; all-zero → 0%. | User pick + architect formula |
| D2 | C-02 discrepancy | Printed weights implemented **verbatim**; the claimed total 11 is a source arithmetic erratum (realistic best = 7 via stem match fails→failing). Never distort weights to reproduce it. | Architect recommendation, implied by D1 choice |
| D3 | Q-03 nine missing recipes | **Author all nine**, following documented style (objective-first, verification/output-format-last), provenance-marked `@source authored-q03` vs `@source material`; registry typed `Record<PromptTaskType, PromptTemplate>` makes a missing recipe a compile error. | User pick |
| D4 | Q-04 ties (engine side) | Ties — including the 13-way zero-score tie — are **not broken silently**: margin caps at 50% → Low → `fallbackToGeneral: true`, reported type `general`. Non-tie argmax uses fixed declared type order as final deterministic tiebreak. Full "show both" UI deferred to Phase 6/R-22 unchanged. | Risk-analyzer finding + D1 math |
| D5 | Strength flow / C-01 | Templates own per-strength section lists **as data** (verbatim bug-fix template shape); the rule engine owns validation (`light ⊆ standard ⊆ detailed`, `objective` always present) and merging (drop sections whose content is empty — honors "never force one structure on every prompt"). No "Prompt Enhancer" stage between resolver and generator (C-01 follows the final architecture). | Architect |
| D6 | Light rendering | Light emits the polished sentence **bare** (no headings) — resolves tension between L497 (bare sentence DoD) and L584 (`light: ["objective"]`). Generator takes `level` and renders single-section light output as prose. | Architect/risk-analyzer flag, decided here |
| D7 | Light polish heuristic | Per-action phrase table (authored, all 11 verbs) + domain enrichment from an authored subject-keyword map (`login/signin/auth/password → authentication`) + preservation clause for fix-class actions. Golden case asserted byte-exact in the harness; tables are data, tunable without logic changes. | Decided here (material gives no algorithm) |
| D8 | Pipeline entry now | Include `enhancePrompt(raw, { level? })` (~15 lines) in Phase 3 — proves the resolver→generator seam end-to-end (the phase's own DoD) and leaves Phase 4 UI wiring touching zero engine code. | Architect recommendation |
| D9 | Verification | Committed `verify-engine.ts` golden-case harness via existing ts-node pattern; no test framework (CLAUDE.md honored); migrates into R-25's real suite later. | User pick |
| D10 | Purity enforcement | Grep gate (imports + browser globals/random/time/locale) **and** `tsconfig.engine.json` (`lib: ["ES2020"]`, strict, includes only `src/prompt-engine/**`) checked with `tsc -p tsconfig.engine.json --noEmit`. | Risk-analyzer recommendation |
| D11 | Git strategy | Commit Phase 1 (split: shell / types / docs+prompts+meta), tag `phase-1`; one commit per roadmap item (`feat: r04 parser` style); tag `phase-2`, `phase-3`. Commits are explicitly part of this plan's approved scope. | Risk-analyzer top blocker |

## Interfaces and data flow

### File tree after Phases 2+3 (all new except types.ts)

```
src/prompt-engine/
  types.ts                          # UNCHANGED (frozen contract)
  index.ts                          # sole barrel; exports enhancePrompt + stage functions/types
  parser/
    vocabularies.ts                 # R-05: ACTION_VERBS(11), CONSTRAINT_TRIGGERS(8), TECHNOLOGIES(14),
                                    #   DOMAIN_KEYWORDS (authored), all `as const` data-only
    parse-prompt.ts                 # R-04: parsePrompt(raw): ParsedPrompt (+ type ParsedPrompt)
  classifier/
    signal-weights.ts               # R-06 data: bug-fix verbatim + 12 authored tables (@source headers)
    to-confidence.ts                # R-07: toConfidence(scores), bandOf(confidence), EVIDENCE_SATURATION
    classify-prompt.ts              # R-06/07: classifyPrompt(parsed, raw): ClassificationResult
  templates/
    resolve-template.ts             # R-10: resolveTemplate(taskType): PromptTemplate
    registry.ts                     # Record<PromptTaskType, PromptTemplate> (compile-time completeness)
    template-types.ts               # PromptTemplate, SectionId union, SECTION_TITLES display map
    development/{bug-fix,feature,code-review,testing,refactor,documentation}.ts
    writing/{rewrite,summarize}.ts
    research/{research,comparison}.ts
    design/{ui-review,image-prompt}.ts
    general/general.ts
  rules/
    validate-recipes.ts             # invariants: light ⊆ standard ⊆ detailed; objective present; ids known
    select-sections.ts              # R-08/09: selectSections(template, level, parsed): SectionId[]
    light-polish.ts                 # R-09: polishLight(parsed, raw): string (phrase tables + clauses)
  generator/
    generate-markdown.ts            # R-11: generateMarkdown(content, { level }): string
src/scripts/verify-engine.ts        # golden-case harness (D9)
tsconfig.engine.json                # DOM-free compile gate (D10)
```

Layering (enforces biome `noImportCycles` for free):
`generator → rules → templates → classifier → parser → types`. Nothing imports upward or sideways;
engine-internal imports are relative; data files export `as const` values with zero logic.

### Stage signatures

```ts
// parser
type ParsedPrompt = {
  action?: string; subject?: string; domain?: string;
  technologies: string[]; constraints: string[]; requirements: string[];
};
function parsePrompt(raw: string): ParsedPrompt;

// classifier
type ConfidenceBand = "high" | "medium" | "low";
type ClassificationResult = {
  taskType: PromptTaskType; category: PromptCategory;
  confidence: number; band: ConfidenceBand;
  scores: Record<PromptTaskType, number>;
  fallbackToGeneral: boolean;
};
function classifyPrompt(parsed: ParsedPrompt, raw: string): ClassificationResult;

// templates / rules / generator
function resolveTemplate(taskType: PromptTaskType): PromptTemplate;
function selectSections(template: PromptTemplate, level: EnhancementLevel, parsed: ParsedPrompt): SectionId[];
function polishLight(parsed: ParsedPrompt, raw: string): string;
function generateMarkdown(content: Partial<Record<SectionId, string | string[]>>, opts: { level: EnhancementLevel }): string;

// pipeline (index.ts) — fully synchronous; Phase 5 storage wraps it, never the reverse
function enhancePrompt(raw: string, options?: { level?: EnhancementLevel }): {
  analysis: PromptAnalysis; markdown: string;
};
```

`PromptAnalysis` (types.ts) is assembled inside `enhancePrompt`: parsed slots + classification +
echoed `enhancementLevel`. Band label is derived via `bandOf(confidence)` — no new fields, types.ts
stays frozen. `fallbackToGeneral` travels on `ClassificationResult` for Phase 4's picker.

### Pipeline flow (C-01 resolved: resolver feeds generator directly)

```
raw ─► parsePrompt ─► classifyPrompt ─► resolveTemplate(taskType)
                                            │ template.sections[level]
                                            ▼
                              level === "light" ──► polishLight ─► bare sentence (D6)
                                            │ else
                              selectSections (validate + drop empty content)
                                            │ ordered SectionId[]
                                            ▼
                                     generateMarkdown ─► markdown
```

### Data decisions baked into the plan

- **SectionId union** (kebab-case; display titles mapped in `SECTION_TITLES`, e.g.
  `acceptance-criteria → "Acceptance Criteria"`; material's camelCase `acceptanceCriteria` normalized):
  `objective, problem, scope, requirements, constraints, verification, acceptance-criteria, context,
  implementation, review-scope, review-areas, output-format, research-scope, key-questions` (documented)
  `+ audience, outline, source-content, style-notes, key-points, comparison-scope, criteria,
  subject, style-direction, technical-requirements` (authored).
- **Detailed recipes** (provenance per file header):

  | Type | Detailed sections | Source |
  |---|---|---|
  | bug-fix | objective, problem, scope, requirements, constraints, verification | material L430–439 |
  | feature | objective, context, requirements, constraints, implementation, verification, acceptance-criteria | material L444–452 |
  | code-review | objective, review-scope, review-areas, constraints, output-format | material L456–462 |
  | research | objective, research-scope, key-questions, requirements, output-format | material L466–472 |
  | refactor | objective, context, scope, requirements, constraints, verification | authored-q03 (bug-fix minus problem) |
  | testing | objective, scope, requirements, verification | authored-q03 |
  | documentation | objective, audience, requirements, outline, output-format | authored-q03 |
  | rewrite | objective, source-content, requirements, style-notes, output-format | authored-q03 |
  | summarize | objective, source-content, key-points, output-format | authored-q03 |
  | comparison | objective, comparison-scope, criteria, requirements, output-format | authored-q03 (mirrors research) |
  | ui-review | objective, review-scope, review-areas, constraints, output-format | authored-q03 (mirrors code-review) |
  | image-prompt | objective, subject, style-direction, technical-requirements, output-format | authored-q03 |
  | general | objective, requirements, verification | authored-q03 (minimal) |

- **Standard slices**: coherent subsets honoring the subset invariant — bug-fix `[objective, requirements,
  verification]` (verbatim L586–590); feature `[objective, requirements, verification]`;
  code-review/research/comparison/ui-review/image-prompt/rewrite/summarize/documentation
  `[objective, <type's middle section(s)>, output-format]`; refactor/testing/general
  `[objective, requirements, verification]`. **Light = `[objective]` for every type** (bug-fix precedent L584).
- **Signal weights**: bug-fix table verbatim `{fix:3, bug:5, broken:4, error:4, issue:2, failing:4}`.
  Authored tables for the other 12 under calibration rules: 4–7 signals per type, weights 2–5, weight 5
  reserved for the type's unambiguous anchor word (refactor→refactor, summarize→summarize/summary/tldr,
  compare→compare/versus, document→document/docs/readme, test→test/coverage/regression, rewrite→rewrite/
  rephrase/reword, research→research/investigate, ui-review→ux/usability/design-review,
  image-prompt→midjourney/dalle/image/illustration, feature→add/create/implement/build, code-review→review/
  audit, general→empty table — unmatched input lands there naturally). Multiword keys allowed; matcher is
  phrase-aware. Negative controls in the harness guard cross-talk (e.g., "test" leaking into bug-fix).
- **Matching rules**: tokenizer normalizes typographic apostrophes (`’`→`'`) and lowercases with
  `toLowerCase()`; tiny deterministic stemmer strips `-s/-es/-ed/-ing` so "fails" matches "failing"
  (the C-02 hinge); technologies matched case-insensitively against canonical dictionary names;
  constraint capture takes trigger phrase + object up to clause end (period / "but" / conjunction);
  subject = text between action verb and first technology marker ("using/with/in") or constraint trigger.
  All heuristics beyond the material carry `Authored:` comments.
- **Category mapping** (implied by material's template tree): development={bug-fix, feature, code-review,
  refactor, testing, documentation}, writing={rewrite, summarize}, research={research, comparison},
  design={ui-review, image-prompt}, general={general}.

## Ordered tasks

Dependencies: Task 0 gates everything. Within Phase 2: 1→2→3→(4∥5)→6. Phase 3: 7∥8 after 6;
9 after 8; 10 after 7–9; 11 after all; 12 last. Each build task ends with its own scoped biome check
and item commit (D11).

| # | Task | Serves | Depends on | Verification |
|---|---|---|---|---|
| 0 | Git baseline: split working tree into logical commits (app shell `(main)/` + deleted root placeholder / `types.ts` + package files / CLAUDE.md + docs + prompts), tag `phase-1`. Confirm porcelain gate empty for `(template)` before committing | D11, risk #1 | — | `git log` shows split commits + tag; `git show --stat` clean of surprises; hook ran green |
| 1 | Purity gates: create `tsconfig.engine.json` (ES2020 lib, strict, `src/prompt-engine/**` only); document grep-gate commands in harness header comment | D10 | 0 | `tsc -p tsconfig.engine.json --noEmit` passes on current types.ts; greps return zero hits |
| 2 | Word lists: `parser/vocabularies.ts` — 11 action verbs, 8 constraint triggers, 14 technologies (all verbatim), plus authored `DOMAIN_KEYWORDS` starter map; `as const`, zero logic | R-05, T-11 | 1 | Diff vs material L295–344; biome scoped clean |
| 3 | Parser: `parser/parse-prompt.ts` + `ParsedPrompt`; tokenizer (apostrophe normalize, lowercase), action/subject/technologies/constraints/requirements extraction per matching rules above | R-04, T-08–T-10 | 2 | Material example reproduces exactly; commit `feat: r04 prompt parser` |
| 4 | Harness skeleton: `src/scripts/verify-engine.ts` + fixtures module; npm script `"verify:engine"`; parser golden cases + negative controls (empty input, nonsense) wired; exit non-zero on mismatch with expected-vs-got printout | D9, risk #2 | 3 | `npm run verify:engine` passes parser cases; double-run identical |
| 5 | Signal weights: `classifier/signal-weights.ts` — bug-fix verbatim + 12 authored tables under calibration rules, `@source` headers | R-06, T-12 | 1 | Table audit vs calibration rules; biome clean |
| 6 | Classifier + confidence: `classify-prompt.ts` (weighted scoring, phrase-aware + stem matching, deterministic argmax with fixed order), `to-confidence.ts` (D1 formula, exported saturation constant), `bandOf`; wire classifier cases into harness incl. Bug Fix/High golden case, odd-input General/Low, tie behavior, negative controls | R-06, R-07, T-13–T-15 | 4, 5 | Harness Phase-2 suite green; commit `feat: r06-r07 classifier and confidence` |
| 7 | Templates: `template-types.ts` (SectionId union, titles map, `PromptTemplate`), 13 template files (4 verbatim + 9 authored per tables above, per-strength lists included), `registry.ts` (`Record<PromptTaskType, PromptTemplate>`), `resolve-template.ts` | R-10, T-20–T-22 | 6 | Registry compiles = completeness proof; diff 4 verbatim files vs material; `@source` headers present |
| 8 | Rules: `validate-recipes.ts` (subset/objective/id invariants over registry), `select-sections.ts` (strength selection + drop-empty merge), `light-polish.ts` (D7 phrase tables + domain enrichment + clause rules) | R-08, R-09, T-16–T-19 | 7 | Validator reports zero violations across 13×3 lists; unit-style harness cases for merge behavior |
| 9 | Generator: `generate-markdown.ts` — headings from `SECTION_TITLES`, list rendering, blank-line discipline, light=bare-sentence rule (D6) | R-11, T-23 | 8 | Input-object→output-text example (L613–636) reproduces; commit `feat: r08-r11 rules templates generator` |
| 10 | Pipeline: `index.ts` barrel + `enhancePrompt` assembling `PromptAnalysis` + markdown; re-export public types | D8 | 7, 8, 9 | End-to-end harness cases: enhance("fix login problem", light) === exact sentence; standard/detailed heading sequences match L504–551 |
| 11 | Full verification pass: entire harness suite + determinism double-run; purity greps + `tsc -p tsconfig.engine.json`; scoped biome on all touched paths; `npm run build` (six routes static); porcelain gate; pre-commit stat inspection | All | 0–10 | Every gate green; record results in execution log |
| 12 | Vault bookkeeping: 08 — R-04…R-11 → ✅ with notes recording D1–D7 resolutions and the authored-content inventory (12 weight tables, 9 recipes, light heuristic); 09 — T-08…T-23 → ✅; reconcile summary count rows; 13 — dated entry enumerating invented artifacts + C-02 erratum stance; 00 — doorway line; grep confirms Q-02/Q-03 no longer cited as blockers in done items | Success crit. 6 | 11 | Emoji counts reconcile with row math; cross-refs consistent |

## Risks

| Risk | Likelihood | Impact | Mitigation | Verified by |
|---|---|---|---|---|
| No rollback baseline (Phase 1 uncommitted) | High | High | Task 0 commits + tags before any engine work; per-item commits; phase tags | Reviewer at Task 0 |
| DoD unfalsifiable without harness | High | High | Task 4 harness precedes classifier/generator; negative controls prevent single-example overfitting | Harness run per item |
| Silent invention presented as spec (weights, recipes, light heuristic) | High | Med | Provenance headers, authored-content inventory in tracker 13, conservative defaults mirroring documented siblings | Owner sign-off at Task 12 |
| Purity breach ships unnoticed (DOM lib global, react legal dep) | Med | Med-High | Dual gates: grep + DOM-free tsc project (D10) | Task 11 + per-item |
| Scope creep into UI/storage/shared files (picker temptation, dexie idle) | Med | Med | Explicit path allowlist: `src/prompt-engine/`, `src/scripts/verify-engine.ts`, `tsconfig.engine.json`, `package.json` (script only), trackers; nothing else | Diff review per commit |
| Nondeterminism (global regex state, locale APIs, iteration-order reliance) | Med | Med | Determinism rules in Hard constraints; double-run gate | Task 11 |
| Pre-commit hook sweeps `theme.ts` or blocks on biome | Med | Low-Med | Scoped biome before committing; `git show --stat` inspection; hook never bypassed | Executor habit |
| Tracker drift (count rows, stale Q-references) | High | Low-Med | Flip statuses inside item commits; reconciliation math at Task 12 | Reviewer at boundary |
| Frozen-template violation via broad commands | Low | High | Scoped commands only; porcelain gate per commit; instant path revert if ever breached | Every commit |
| Harness breaks `next build` (shared tsconfig includes scripts) | Low | Low-Med | Harness dependency-free, no top-level side effects; build green required at Task 11 | Task 11 |
| Premature perf work on <100 ms target | Low | Low | Deferred to R-26 by roadmap; keep pure linear-over-input code | Nobody — consciously deferred |

## Rollback

- Phase granularity: `git reset --hard phase-1` (or `phase-2`) restores the exact pre-phase tree;
  tags make the boundaries unambiguous.
- Item granularity: each roadmap item is one commit — `git revert` / `restore --source <tag> -- src/prompt-engine`
  removes a single item without disturbing siblings.
- Surface is purely additive: new files under `src/prompt-engine/` (minus untouched `types.ts`),
  one script, one tsconfig, one package.json line, tracker edits. No database, migration, env var,
  or external state exists in these phases.
- `src/app/(template)` has zero rollback surface — never touched, proven by the per-commit porcelain gate.
- Worst case (engine design rejected wholesale): delete `src/prompt-engine/*` additions + harness +
  gates; `types.ts` and the tagged Phase 1 baseline remain intact.

## Execution log

| When | Entry |
|---|---|
| 2026-08-21 23:25 | Plan drafted from `prompts/01.md`, full `ANALYSIS - PROMPT ENHANCER` vault (00/02/05/06/07/08/09/10/13), material lines 196–640, repo inspection (git state, package.json, biome.json, tsconfig.scripts.json, current engine/page state), architect consultation (module layout, confidence formula, interfaces, strength flow, Q-03 mechanics), risk-analyzer consultation (12 ranked risks, 3 blockers), and three user decisions: D1 margin+floor confidence (Q-02), D3 author-all-nine recipes (Q-03), D9 committed verify script. Status: draft — awaiting user approval. |
| 2026-08-21 23:40 | User approved the plan ("Approve — mark ready"), including the explicit git-commit strategy (Task 0 baseline + per-item commits + phase tags). Self-review fix applied before approval: `enhancePrompt` signature made synchronous (engine stays promise-free; Phase 5 storage wraps it). Status → ready. Execution awaits a separate explicit request. |
