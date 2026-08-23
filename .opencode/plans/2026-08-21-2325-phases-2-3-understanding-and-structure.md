---
title: "Phases 2+3 — Understanding What Was Asked & Turning Understanding into Structure"
status: complete
created_at: 2026-08-21T23:25:00+08:00
updated_at: 2026-08-22T08:34:00+08:00
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
| 2026-08-21 23:47 | Execution started (user request). Status → in-progress. |
| 2026-08-21 23:52 | **Task 0 ✅ (orchestrator-direct, git ops only).** Template porcelain gate empty pre-commit. Split: `21e2c4a` shell (10 files incl. root placeholder deletion) → `5e076c4` types+packages (3 files) → `c5587a9` docs/prompts/plans (18 files; material move detected as 100% rename). Tag `phase-1` = c5587a9. Working tree clean; husky hook green ×3; no swept-in files (commit stats inspected). Root stray `00 - START HERE.md` confirmed as intentional vault front door → committed with docs. |
| 2026-08-21 23:58 | **Task 1 ✅ (builder).** `tsconfig.engine.json` created (extends main, `lib: ["ES2020"]`, `types: []`, includes only `src/prompt-engine/**`, JSONC header documents both purity gates). Verified: tsc exit 0 on types.ts; **negative proof** — temp `window` probe file failed with TS2304 as designed, deleted, re-run green; scoped biome clean. Commit `ea5b7d9`. Launching Tasks 2+5 in parallel (disjoint ownership: parser/vocabularies.ts · classifier/signal-weights.ts). |
| 2026-08-22 00:04 | **Task 2 ✅ (builder).** `parser/vocabularies.ts`: 11 actions / 8 triggers / 14 technologies verbatim (printed lists diffed against material L295–344 by orchestrator) + authored DOMAIN_KEYWORDS starter (9 entries). tsc engine gate exit 0; scoped biome clean; runtime count check via temp ts-node script. Commit `777c5b1` (`feat: r05 controlled word lists`). Task 3 (parser) launched in parallel — disjoint from still-running Task 5. |
| 2026-08-22 00:09 | **Task 5 ✅ (builder).** `classifier/signal-weights.ts`: exhaustive `Readonly<Record<PromptTaskType, …>>` (compile-enforced completeness), bug-fix verbatim {fix:3,bug:5,broken:4,error:4,issue:2,failing:4}, 11 authored tables within calibration (counts 4–7, weights 2–5, no cross-type anchor collisions, bare "vs" excluded, general empty). C-02 erratum note in header. Accepted deviation-note: `feature` has no weight-5 anchor (add/create/implement inherently ambiguous) — consistent with calibration spirit. Commit deliberately deferred: folds into Task 6's `feat: r06-r07 classifier and confidence` per one-commit-per-roadmap-item. |
| 2026-08-22 00:16 | **Task 3 ✅ (builder).** `parser/parse-prompt.ts` (276 lines, single relative import, non-global regexes, toLowerCase only). All 4 golden cases pass via temp ts-node harness + idempotence over 6 samples; tsc engine gate exit 0; scoped biome clean (2 format errors fixed via scoped --write); purity greps zero real hits (2 `document` matches are the English verb in data files). Golden-case shape note for Task 4: keys always present with explicit undefined — harness must use deepStrictEqual with explicit-undefined literals. Commit `f9025dd` (`feat: r04 prompt parser`). Launching Task 4 (harness skeleton). |
| 2026-08-22 00:31 | **Task 4 ✅ (builder, foreground retry).** First background attempt failed: `Rate limit exceeded: free-models-per-day-stealth` — environmental, no partial work left behind (verified: scripts dir + package.json untouched). Foreground retry succeeded. `verify-cases.ts` (4 parser goldens incl. both negative controls; typed empty CLASSIFIER/RULES/GENERATOR slots) + `verify-engine.ts` runner (sections parser→classifier→rules→generator, deepStrictEqual authority, per-case double-run determinism gate, exitCode=1 on failure) + npm script `verify:engine`. Verified: 4/4 pass exit 0; negative proof exit 1 with expected-vs-got printout; double-run identical; tsc engine gate + scripts project green; scoped biome clean. Commit `1eec448`. Launching Task 6 (classifier + confidence — folds uncommitted signal-weights.ts into its commit). |
| 2026-08-22 00:47 | **Task 6 ✅ (builder). Phase 2 engine complete.** `to-confidence.ts` (D1 formula verbatim, EVIDENCE_SATURATION=7, bandOf) + `classify-prompt.ts` (stem-sequence matching, deterministic winner scan in union order, authored TYPE_CATEGORY map, low-band→General fallback). Harness grew to 6 classifier cases — **all pass**: worked example bug-fix=7 → confidence 100 high; all-zero → 0 low → general; lone weak signal → 29 low → general; tie → min(50, 42.86)=43 low → general; medium keeps winner (63); feature wording NOT bug-fix (57 low → general). Builder deviation accepted: case-6 window tightened 65→59 (my spec was internally inconsistent with the low-band expectation). Negative proof exit 1; double-run byte-identical; tsc + biome + purity greps clean. Commit `7289ee5` (`feat: r06-r07 weighted classifier and confidence bands`, folds signal-weights.ts). Accepted residual risks: naive-stemmer recall gaps (documented in-file), dual TASK_TYPE_ORDER mirrors (reviewer watch-item). Launching Task 7 (templates). |
| 2026-08-22 00:55 | **Session restart detected.** Task 7's background builder died silently — templates/ absent on disk, notification never arrived. No partial work. Re-drove Task 7 **foreground** per failure-retry contract. |
| 2026-08-22 01:03 | **Task 7 ✅ (builder, foreground retry).** 16 files under templates/ (template-types with 24-id SectionId union + SECTION_TITLES, registry `Record<PromptTaskType, PromptTemplate>` compile-complete, resolver) + harness "templates" section. verify:engine **24/24 ALL PASS** ×2 byte-identical (parser 4 + classifier 6 + templates 14 incl. registry-completeness gate); tsc exit 0; biome 18 paths clean; four verbatim recipes spot-diffed ✓; purity greps clean. **Material tension preserved (note for reviewer/Task-12):** bug-fix detailed = six sections per rule-engine branch L430–439 + approved plan table; the material's own Phase-9 template object (L592–600) carries a seventh (`acceptanceCriteria`) — choice documented in bug-fix.ts header, one-line change if ever reversed. Commit `1b84451` (`feat: r10 template library and resolver`). Launching Task 8 (rules layer, foreground). |
| 2026-08-22 01:14 | **Task 8 ✅ (builder, foreground).** `rules/validate-recipes.ts` (validateRegistry() → zero violations proven ad hoc), `rules/select-sections.ts` (D5 drop-empty merge; constraints/requirements headings vanish when slots empty), `rules/light-polish.ts` (D7 authored heuristic; **byte-exact golden**: "fix login problem" → "Investigate and resolve the login problem while preserving existing authentication behavior."). Harness +7 rules cases → **31/31 ALL PASS** ×2 SHA256-identical; tsc/biome/purity green. Builder self-corrected my spec's import path (../types not ../../types — TS2307 caught on first verify). Case-(c) pinned to actual pipeline output ("Add google login."). Commit `0ae6f95` (`feat: r08-r09 rules layer with strength behaviors`; commit-message split from plan's combined r08-r11 label since r10 landed early — recorded here). Launching Task 9 (generator, foreground). |
| 2026-08-22 07:39 | **Execution resumed.** Selected as the newest eligible in-progress plan; Tasks 0–8 are preserved from prior evidence. The newer `.opencode/plans/2026-08-22-0724-phases-2-3-current-state-completion.md` remains a draft and is not executed. Launching Task 9 builder in the current workspace; no reset, cleanup, or worktree recreation. |
| 2026-08-22 07:48 | **Task 9 ✅ (builder + reviewer).** `generate-markdown.ts` implemented with deterministic heading/list/blank-line rendering and light bare-prose mode; 5 generator cases added, then 3 whitespace/light-array regressions after review. Initial commit `91e49a1`; reviewer found empty-item and light-array normalization gaps; correction commit `11147ee`. Final harness **39/39 ALL PASS**; engine/scripts tsc, scoped Biome, `git diff --check`, and `npm run generate:presets` (no `theme.ts` diff) passed; reviewer APPROVE. `verify-engine.ts` remained unchanged in the correction; frozen paths and unrelated dirty plan/prompt files untouched. |
| 2026-08-22 07:56 | **Task 10 ✅ (builder + reviewer).** `index.ts` public barrel and synchronous `enhancePrompt` added; pipeline assembles the frozen analysis, defaults to standard, routes light through `polishLight`, and supplies deterministic ordered content to the generator. Harness grew to **44/44 ALL PASS**; engine/scripts tsc, scoped Biome, purity/freeze checks, and preset generation with no theme diff passed; commit `63686b7`; reviewer APPROVE. Residual quality risk: narrative bodies are generic authored copy, accepted as deterministic structured content; full build deferred to Task 11. |
| 2026-08-22 08:04 | **Task 11 ✅ (Kratos/tester).** Full acceptance pass: `npm run verify:engine` twice **44/44**, captured outputs byte-identical (same SHA-256); engine/scripts tsc, purity scans, scoped Biome (4 files), and `npm run build` passed. Six enhancer routes remained static; template routes intact/dynamic as designed. Base diff confirms `(template)` and `types.ts` unchanged; preset generation left `theme.ts` unchanged; commit audit found exactly four approved paths since `0ae6f95`. `rg` was unavailable, so equivalent `git grep` purity scans were used; pre-commit was inspected but not run because it stages generated metadata. Existing plan/draft/prompt dirty files plus an additional untracked Phase 4/5 draft were preserved untouched. |
| 2026-08-22 08:16 | **Full reviewer pass: REQUEST_CHANGES.** Required phase tags `phase-2`/`phase-3` were missing; harness did not assert exact score 7 or `fallbackToGeneral: true`; docs 02/07 historical/stale references were classified as a non-blocking watch item under the approved four-file Task 12 scope. Builder added literal score/fallback assertions in `0a13895f`; reviewer APPROVE. Reopening Task 11 for a complete post-harness-change verification rerun before tags/final acceptance. |
| 2026-08-22 08:24 | **Task 11 ✅ rerun (Kratos/tester).** Post-assertion full gates passed: harness **44/44** twice, parser 4/classifier 6/templates 14/rules 7/generator 8/pipeline 5; exact score assertions 2/2 and fallback assertions 2/2; both tsc projects, purity scans (`git grep` fallback because `rg` unavailable), scoped Biome, build 42/42 with six static enhancer routes, frozen base diffs, preset generation, and 8-path commit audit passed. Captured harness outputs were byte-identical (SHA-256 `ae12623a…`). Four unrelated dirty files were preserved with hashes; no plans/prompts/frozen files were committed. |
| 2026-08-22 08:25 | **Task 12 ✅ (docs builder).** Commit `8827fa9`; only 00/08/09/13 changed. Roadmap counts ✅10/⭕17/🔵1=28; task counts ✅21/⭕34/🔵2=57. Revision entry records authored artifacts and Q-02/Q-03/C-02 decisions; diff-check, blocker search for completed items, preset generation, and staged-file audit passed. Historical source references in docs 02/07 remain intentionally untouched and are a non-blocking watch item under approved scope. |
| 2026-08-22 08:27 | **Reviewer pass ✅.** Final full-diff review APPROVE: exactly 8 approved files since `0ae6f95`; no plans/prompts/frozen paths/types changes; 44/44 twice byte-identical; tsc/Biome/build/static/freeze gates pass; tracker counts reconcile; tags verified (`phase-2` → `7289ee5`, `phase-3` → `0a13895`). Non-blocking residuals: two intentional `document` data literals in broad purity grep, and historical Q-02/Q-03/C-02 wording in docs 02/07 outside approved Task 12 scope. Launching final verifier. |
| 2026-08-22 08:34 | **Final acceptance ✅ (Kratos/verifier).** PASS. Fresh verification confirms 44/44 twice byte-identical (SHA-256 `8cc531ca…f1091`), exact score/fallback assertions, both tsc projects, purity/API scans, scoped Biome, `git diff --check`, 42/42 Next build with six static enhancer routes, preset metadata unchanged, frozen template/types and Phase 1 shell/prompts unchanged, exactly eight approved committed files, correct `phase-1`/`phase-2`/`phase-3` tags, reconciled tracker counts, and preservation of four unrelated dirty files. Only documented non-blockers remain: intentional `document` literals, historical docs 02/07 wording, generic authored pipeline prose, and corrective commits. All Tasks 0–12, reviewer pass, and acceptance criteria pass. Status → complete. |

## Progress checklist

- [x] Task 0 — Git baseline: split Phase 1 into logical commits, tag `phase-1` *(orchestrator)* — 3 commits + tag, tree clean, gates green
- [x] Task 1 — Purity gates: `tsconfig.engine.json` + grep-gate documentation *(builder)* — tsc green; negative probe proof TS2304; commit ea5b7d9
- [x] Task 2 — Word lists `parser/vocabularies.ts` *(builder)* — verbatim 11/8/14 + authored domains; commit 777c5b1
- [x] Task 5 — Signal weights `classifier/signal-weights.ts` *(builder, ∥ with 2)* — exhaustive 13-key record; bug-fix verbatim; commit folds into r06-r07
- [x] Task 3 — Parser `parser/parse-prompt.ts` *(builder, after 2)* — 4 goldens + idempotence green; commit f9025dd
- [x] Task 4 — Harness skeleton `src/scripts/verify-engine.ts` + npm script *(builder, after 3)* — 4/4 + negative proof exit 1 + determinism; commit 1eec448 (first attempt rate-limited, retried foreground)
- [x] Task 6 — Classifier + confidence *(builder, after 4+5)* — 6/6 cases incl. C-02 worked example @100 high; commit 7289ee5; **Phase 2 engine code complete**
- [x] Task 7 — Templates: 13 files + registry + resolver *(builder, after 6)* — 24/24 harness; verbatim spot-diffs ✓; commit 1b84451 (bg attempt died silently, foreground retry)
- [x] Task 8 — Rules: validate/select/light-polish *(builder, after 7)* — 31/31 harness; byte-exact light golden; commit 0ae6f95
- [x] Task 9 — Generator *(builder + reviewer, after 8)* — commits `91e49a1`, `11147ee`; 39/39 harness; reviewer approved
- [x] Task 10 — Pipeline barrel + `enhancePrompt` *(builder + reviewer, after 7–9)* — commit `63686b7`; 44/44 harness; reviewer approved
- [x] Task 11 — Full verification pass *(Kratos/tester, after 10; post-harness assertion rerun)* — 44/44 twice; exact score/fallback; tsc/Biome/purity/build/freeze/static-route gates passed
- [x] Task 12 — Vault bookkeeping 08/09/13/00 *(docs builder, after 11)* — commit `8827fa9`; counts reconciled; revision log and doorway updated
- [x] Reviewer pass over full diff *(Kratos/reviewer)* — final APPROVE; 8-path scope, tags, gates, counts, frozen paths verified
- [x] Final acceptance *(Kratos/verifier)* — PASS; all Tasks 0–12 and acceptance gates complete; status `complete`
