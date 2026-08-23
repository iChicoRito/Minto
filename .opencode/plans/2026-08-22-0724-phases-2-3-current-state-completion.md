---
title: "Phases 2+3 Current-State Completion — Generator, Pipeline, Verification, and Documentation"
status: draft
created_at: 2026-08-22T07:24:59+08:00
updated_at: 2026-08-22T07:34:20+08:00
---

# Phases 2+3 Current-State Completion Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: use `subagent-driven-development` (recommended) or
> `executing-plans` to implement this plan task by task. Use `using-git-worktrees` before execution so
> the modified historical plan in the original workspace cannot be swept into implementation commits.
> Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Complete the remaining work required by `prompts/01.md`: turn the already implemented Phase 2
analysis and partial Phase 3 structure into deterministic Markdown through a public prompt-engine pipeline,
prove the complete behavior, and reconcile the analysis documentation without reworking Phase 1.

**Architecture:** Preserve the committed parser, classifier, confidence, templates, and rules as the baseline.
Add one internal section-content assembler, one formatting-only Markdown renderer, and a small public barrel that
orchestrates the existing stages. Keep all behavior synchronous, deterministic, side-effect-free, and isolated
inside `src/prompt-engine/`; verification continues through the repository's existing `node:assert/strict` harness.

**Tech stack:** TypeScript 5.9, Node/`ts-node`, existing Next.js 16 build, Biome 2, Git.

---

## Goal and current-state baseline

This is a **completion plan**, not a greenfield restatement. The user selected that baseline after repository
inspection.

- Phase 1 is complete at tag `phase-1` (`c5587a9`) and is out of scope.
- Phase 2 is implemented through commit `7289ee5`: controlled dictionaries, parser, weighted classifier,
  confidence bands, and General fallback.
- Phase 3 is partially implemented through current HEAD `0ae6f9541f4176279dd97bce5241ab0c242860de`:
  all 13 templates, resolver, strength-aware section selection, recipe validation, and light-mode polishing exist.
- The remaining functional gap is section-content assembly, Markdown rendering, and a public end-to-end pipeline.
- The existing harness has 31 passing checks recorded in the historical execution log, but this planning session
  did not execute them. Execution must re-establish that baseline before changing code.
- `.opencode/plans/2026-08-21-2325-phases-2-3-understanding-and-structure.md` contains uncommitted historical
  execution records. It is evidence, not an implementation target, and must remain byte-for-byte untouched.

## Success criteria

1. `enhancePrompt(raw, options?)` synchronously returns the frozen 11-field `PromptAnalysis` plus deterministic
   Markdown; the default enhancement level is `"standard"`.
2. Light mode reproduces the material's sentence byte-for-byte with no heading:
   `Investigate and resolve the login problem while preserving existing authentication behavior.`
3. Standard and detailed output use task-specific recipe order, non-empty section bodies, `# Objective`, `##` for
   subsequent sections, bullet lists for arrays, exactly one blank line between blocks, and no trailing newline.
4. Blank and whitespace-only input returns a complete General/0-confidence analysis and `markdown: ""` without
   throwing. The UI message `Please enter a prompt.` remains Phase 6 UI scope.
5. All 31 existing checks remain green and 14 new checks pass: 3 content-assembly, 5 Markdown-renderer, and 6
   end-to-end pipeline cases, for **45 checks total**. Every case performs two-run determinism comparison.
6. The harness demonstrably exits nonzero when one expected generator or pipeline result is deliberately changed.
7. Both TypeScript projects pass:
   `npx tsc -p tsconfig.engine.json --noEmit` and
   `npx tsc -p tsconfig.scripts.json --noEmit`.
8. Scoped Biome passes on touched TypeScript files; `npm run build` succeeds and the six enhancer routes remain
   static. No repo-wide autofix is run.
9. Relative-only engine imports and the DOM-free TypeScript project preserve engine purity; no React, Next.js,
   browser, storage, clock, random, or locale-dependent APIs enter `src/prompt-engine/**`.
10. Diffing from `0ae6f95` shows no change to `src/prompt-engine/types.ts` or `src/app/(template)/**`.
11. Roadmap items R-04 through R-11 and tasks T-08 through T-23 are marked complete only after all code gates pass;
    tracker counts and direct blocker references are reconciled.
12. The historical plan's original-workspace blob remains
    `339c13e1636dcc70ec226542e061ae9c704339da`; no implementation commit contains either plan file.
13. Local tags identify the verified boundaries: `phase-2` at `7289ee5` and `phase-3` at the final documented
    completion commit. Tags are never moved or pushed without separate authorization.

## Scope and constraints

### In scope

- R-11 Markdown generation and the missing deterministic content-assembly seam implied by R-08/R-09.
- A public `src/prompt-engine/index.ts` that composes the existing Phase 2 and Phase 3 stages.
- Golden verification for content assembly, rendering, and end-to-end behavior.
- Full regression, purity, type, formatting, build, static-route, and frozen-path verification.
- Documentation reconciliation in the authoritative status files and direct stale blocker references.
- Restoring the already approved local phase-boundary tags during an explicit execution session.

### Out of scope

- Changes to the frozen Phase 1 `PromptAnalysis` contract.
- Rewriting the parser, classifier, confidence formula, signal weights, templates, or rules unless baseline
  verification reveals a blocking regression; such a finding stops this plan and requires a revised draft.
- UI integration, manual type picker rendering, React Markdown rendering, presets, editor/preview, or copy/save.
- Dexie, history, library, storage, settings, input-size limits, performance benchmarking, PWA, or deployment.
- A test-framework dependency or the Phase 7 100–200-prompt dataset.
- Pushes, releases, deployments, or moving an existing Git tag.

### Hard constraints

- Never modify or import from `src/app/(template)/**`.
- Never modify `src/prompt-engine/types.ts`; compare it to base commit rather than trusting working-tree status.
- Never run repo-wide `npm run check:fix`. If formatting changes are needed, run `npx biome check --write` with
  only the exact touched TypeScript paths listed in Tasks 1 and 2.
- Engine imports are relative and point only into the engine. Engine code imports no React, Next.js, UI, storage,
  browser APIs, environment state, clock, randomness, or locale-sensitive casing/collation.
- Output is plain text. The engine does not evaluate Markdown/HTML, access the network/filesystem, or persist data.
- Preserve raw input exactly in `PromptAnalysis.original`; trim only while deriving generated prose.
- Preserve caller arrays and objects; copy arrays before placing them in generated content.
- The same input and options must produce byte-identical analysis and Markdown.
- Do not alter the historical in-progress plan. Execute from an isolated worktree based on `0ae6f95`.

## Repository evidence

| Finding | Evidence | Planning consequence |
|---|---|---|
| Current branch is `main`, ahead of `origin/main` by 10 commits; HEAD is `0ae6f95` | Read-only Git inspection | Anchor all scope checks to the full base SHA; do not push |
| Only pre-plan worktree change was the historical Phase 2/3 plan | `git status`; working blob `339c13e…` | Use an isolated worktree and preserve the blob hash in the original workspace |
| Phase 1 types are frozen and have no runtime constructor | `src/prompt-engine/types.ts` | Assemble `PromptAnalysis` explicitly in the new pipeline; do not edit the type file |
| Parser/classifier are implemented | `parser/parse-prompt.ts`, `classifier/*.ts` | Treat Phase 2 as regression-tested baseline, not work to repeat |
| All 13 recipes, resolver, selector, and light polisher are implemented | `templates/**`, `rules/**` | Phase 3 completion consumes these exact interfaces |
| `selectSections` retains narrative sections because downstream authored content is expected | `rules/select-sections.ts:8-17` | A content assembler is required; a renderer alone cannot finish Phase 3 |
| No generator directory or public barrel exists | `src/prompt-engine/` | Create three focused files only |
| `GENERATOR_CASES` is empty and the runner uses `pendingSection` | `src/scripts/verify-cases.ts:287-292`, `verify-engine.ts:105-112,325-333` | Replace the pending section and add explicit assembly, renderer, and pipeline sections |
| Existing harness covers parser 4, classifier 6, templates 14, rules 7 | `src/scripts/verify-*.ts` | Preserve all 31 checks and add 14 completion checks |
| No test framework is configured | `CLAUDE.md`, `package.json` | Extend the existing harness; add no dependency |
| Engine-only DOM-free TypeScript project already exists | `tsconfig.engine.json` | Use it as the browser-global authority; no config edit required |
| Pre-commit always generates presets and stages `theme.ts` | `.husky/pre-commit` | Require preset generation to be diff-free and inspect every staged/committed file list |
| Trackers still show R-04…R-11 and T-08…T-23 as not started | docs 08 and 09 | Update statuses only after code acceptance |
| Docs 02 and 07 still describe Q-02/Q-03 as blockers | docs 02 and 07 | Annotate the settled engine decisions so completed status is not contradicted |

No external documentation is needed: this completion adds no dependency and is governed by local contracts and the
analysis vault.

## Chosen approach

### Selected: internal content assembler + formatting-only renderer + thin public pipeline

The user approved **centralized minimal builders** for narrative body text. One internal module maps ordered
`SectionId` values to conservative text using `PromptAnalysis`. The renderer accepts already filled content and
only formats it. The barrel owns orchestration and public exports.

This keeps three independently understandable responsibilities:

1. `assemble-section-content.ts`: what deterministic content belongs in each selected section.
2. `generate-markdown.ts`: how filled sections become Markdown.
3. `index.ts`: how parser, classifier, recipe selection, assembly, and rendering compose.

### Rejected alternatives

1. **Private assembly helpers inside `index.ts`:** fewer files, but makes the public barrel own enhancement policy,
   obscures tests, and creates an oversized future UI entry point.
2. **Analysis-aware renderer:** `generateMarkdown(analysis, sections, options)` couples formatting to parser and
   classifier contracts and contradicts the material's filled-content-to-Markdown example.
3. **Omit unsupported narrative sections:** simpler, but breaks the documented standard/detailed heading structures
   and contradicts `selectSections`, which intentionally preserves narrative sections for downstream content.
4. **Per-template prose systems:** potentially richer output, but duplicates behavior across 13 recipes and expands
   Phase 3 beyond the requested minimal deterministic engine.

## Files and responsibilities

### Create

- `src/prompt-engine/generator/assemble-section-content.ts` — internal ordered section-body policy.
- `src/prompt-engine/generator/generate-markdown.ts` — `SectionContent` and pure Markdown rendering.
- `src/prompt-engine/index.ts` — public runtime/type exports and `enhancePrompt` orchestration.

### Modify

- `src/scripts/verify-cases.ts` — add assembly, renderer, and pipeline fixtures.
- `src/scripts/verify-engine.ts` — execute the new fixtures; remove `pendingSection`.
- `docs/ANALYSIS - PROMPT ENHANCER/00 - START HERE.md` — current date/status and answered-question doorway.
- `docs/ANALYSIS - PROMPT ENHANCER/02 - DOCUMENT FINDINGS.md` — annotate C-02/Q-02/Q-03 engine resolutions.
- `docs/ANALYSIS - PROMPT ENHANCER/07 - DEVELOPMENT ROADMAP.md` — remove stale blocker claims for completed work.
- `docs/ANALYSIS - PROMPT ENHANCER/08 - ROADMAP TRACKER.md` — R-04…R-11 statuses and counts.
- `docs/ANALYSIS - PROMPT ENHANCER/09 - TASK TRACKER.md` — T-08…T-23 statuses and counts.
- `docs/ANALYSIS - PROMPT ENHANCER/13 - REVISION LOG.md` — V-02 completion/provenance entry.

### Explicitly unchanged

- `.opencode/plans/2026-08-21-2325-phases-2-3-understanding-and-structure.md`
- `src/prompt-engine/types.ts`
- Existing parser, classifier, rule, and template files
- `src/app/**`, `src/components/**`, storage, preferences, package/lock/config files, and material source files

## Interfaces and data flow

### Content and rendering contracts

```ts
// src/prompt-engine/generator/generate-markdown.ts
export type SectionContent = Partial<Record<SectionId, string | string[]>>;

export function generateMarkdown(
  content: SectionContent,
  options: { level: EnhancementLevel },
): string;

// src/prompt-engine/generator/assemble-section-content.ts
export function assembleSectionContent(
  analysis: PromptAnalysis,
  sectionIds: readonly SectionId[],
): SectionContent;
```

`assembleSectionContent` assigns properties while iterating `sectionIds`; this makes recipe order the insertion
order consumed by `generateMarkdown`. It never mutates the analysis, its arrays, or the section list.

### Exact centralized content policy

Shared normalization:

- `request` = `analysis.original.trim().replace(/[.!?]+$/, "")`.
- `target` = a non-empty trimmed `analysis.subject` when present; otherwise `request`.
- Sentence builders add one terminal period unless the generated string already ends in `.`, `!`, or `?`.
- Blank `request` produces no assembled content; the pipeline returns blank Markdown before invoking assembly.
- Objective verbs are exact: `add→Add`, `create→Create`, `build→Build`, `implement→Implement`, `fix→Resolve`,
  `review→Review`, `refactor→Refactor`, `test→Test`, `document→Document`, `research→Research`, `compare→Compare`.

For each selected `SectionId`, use this exact policy:

| Section | Exact value policy |
|---|---|
| `objective` | With action+subject: `${objectiveVerb} ${subject}.`; otherwise `Fulfill this request: ${request}.` |
| `problem` | `Investigate the issue affecting ${target}.` |
| `scope` | Array starting `Limit the work to ${target}.`; append `Use the relevant parts of ${technologies.join(", ")}.` when technologies exist |
| `requirements` | Trim/filter a copy of `analysis.requirements`; omit when no non-empty item remains |
| `constraints` | Trim/filter a copy of `analysis.constraints`; omit when no non-empty item remains |
| `verification` | Bug fix: `Confirm the reported issue no longer occurs.` + `Confirm existing behavior remains unchanged outside the stated scope.`; testing: `Run the requested checks and record the results.` + `Report failures with enough detail to reproduce them.`; code/UI review: `Confirm every finding is supported by the reviewed material.` + `Confirm recommendations are actionable and prioritized.`; research/comparison: `Confirm conclusions are supported by the gathered evidence.` + `Call out uncertainty or missing evidence.`; all others: `Confirm the result satisfies the stated requirements.` + `Confirm the result respects every stated constraint.` |
| `acceptance-criteria` | `The objective is complete.`; `All stated requirements are satisfied.`; `All stated constraints remain satisfied.` |
| `context` | With domain: `Work within the ${domain} domain described by the request.`; otherwise `Use the original request as the source of context: ${request}.` |
| `implementation` | `Make the smallest change that satisfies the objective.`; `Apply the stated requirements and constraints in order.`; `Verify the completed result before returning it.` |
| `review-scope` | `Review ${target}.` |
| `review-areas` | UI review: `Usability and clarity`; `Visual consistency and hierarchy`; `Accessibility and responsive behavior`; otherwise `Correctness and regressions`; `Maintainability and clarity`; `Security and performance risks` |
| `output-format` | Code/UI review: `Return prioritized findings with locations, impact, and concrete fixes.`; research/comparison: `Return a concise Markdown report with evidence-backed conclusions and explicit uncertainties.`; documentation/rewrite/summarize: `Return the finished text in clear Markdown.`; image prompt: `Return one production-ready image prompt without commentary.`; otherwise `Return the completed result in clear Markdown.` |
| `research-scope` | `Investigate ${target}.` |
| `key-questions` | `What evidence directly addresses ${target}?`; `What trade-offs or limitations affect the answer?`; `What conclusion best fits the stated requirements?` |
| `audience` | `Write for the audience implied by the original request.` |
| `outline` | `Introduce the objective.`; `Present the required information in a logical order.`; `Conclude with the requested outcome or next step.` |
| `source-content` | Trimmed copy of `analysis.original`; do not mutate the source string |
| `style-notes` | `Preserve the original meaning.`; `Improve clarity, grammar, and directness.` |
| `key-points` | `Capture the main point of the source content.`; `Keep only details needed to support that point.` |
| `comparison-scope` | `Compare ${target}.` |
| `criteria` | `Fit for the stated objective`; `Compliance with requirements and constraints`; `Trade-offs and practical impact` |
| `subject` | Trimmed subject when present; otherwise `target` |
| `style-direction` | With domain: `Use a visual direction appropriate to ${domain}.`; otherwise `Use a clear visual direction that supports ${target}.` |
| `technical-requirements` | One `Use ${technology}.` item per detected technology; when none exist, `Specify composition, lighting, perspective, and output quality.` |

Every authored default receives a source comment identifying it as the approved Phase 3 deterministic fallback,
not material-provided wording.

### Markdown rendering rules

- Light reads `content.objective`; a string is trimmed, an array is filtered and joined with one space, and the
  result is returned as bare prose with no heading.
- Standard/detailed iterate `Object.entries(content)` in insertion order.
- `objective` renders as `# Objective`; every other ID uses `## ${SECTION_TITLES[id]}`.
- Trim string values. Filter blank array items, trim remaining items, and render each as `- item`.
- Omit empty strings, empty arrays, and sections whose filtered content is empty.
- Join heading/content blocks with exactly one blank line (`\n\n`); do not add a trailing newline.
- Preserve Markdown characters in user content as text; sanitization belongs to the later UI renderer.
- Empty content or a blank light objective returns `""`.

### Public pipeline contract

```ts
// src/prompt-engine/index.ts
export type EnhancePromptOptions = {
  level?: EnhancementLevel;
};

export type EnhancePromptResult = {
  analysis: PromptAnalysis;
  markdown: string;
};

export function enhancePrompt(raw: string, options?: EnhancePromptOptions): EnhancePromptResult;
```

The level defaults to `"standard"`. `PromptAnalysis` is assembled explicitly with:

```ts
const analysis: PromptAnalysis = {
  original: raw,
  category: classification.category,
  taskType: classification.taskType,
  confidence: classification.confidence,
  action: parsed.action,
  subject: parsed.subject,
  domain: parsed.domain,
  technologies: [...parsed.technologies],
  constraints: [...parsed.constraints],
  requirements: [...parsed.requirements],
  enhancementLevel: level,
};
```

Do not add `band`, `scores`, or `fallbackToGeneral` to the frozen analysis. Phase 4 can use `confidence < 60` and
`taskType === "general"`, or call the publicly exported classifier when it needs the richer classification result.

Public runtime exports:

- `enhancePrompt`, `parsePrompt`, `classifyPrompt`, `resolveTemplate`, `selectSections`, `polishLight`,
  `generateMarkdown`, `SECTION_TITLES`.

Public type exports:

- `EnhancePromptOptions`, `EnhancePromptResult`, `SectionContent`, `PromptAnalysis`, `PromptCategory`,
  `PromptTaskType`, `EnhancementLevel`, `ParsedPrompt`, `ClassificationResult`, `ConfidenceBand`,
  `PromptTemplate`, `SectionId`.

Keep internal: `assembleSectionContent`, template registry, signal tables, confidence helpers/constants, and recipe
validators.

### Pipeline flow

```text
raw ─► parsePrompt(raw) ─► classifyPrompt(parsed, raw) ─► PromptAnalysis
                                                        │
                blank raw ──────────────────────────────┴─► markdown ""
                                                        │
                light ─► polishLight(parsed, raw)
                      ─► generateMarkdown({ objective }, { level: "light" })
                                                        │
       standard/detailed ─► resolveTemplate(analysis.taskType)
                         ─► selectSections(template, level, parsed)
                         ─► assembleSectionContent(analysis, sectionIds)
                         ─► generateMarkdown(content, { level })
```

Blank input still runs parser/classifier so the returned analysis remains General/0 and structurally complete.
Extremely short and unknown strings are valid. No runtime schema, input ceiling, exception wrapper, async API, or
side effect is introduced.

## Ordered tasks

Dependencies: Task 0 gates all work. Task 1 precedes Task 2. Task 3 verifies Tasks 1–2. Task 4 starts only after
Task 3 passes. Task 5 follows all prior tasks. Each implementation task uses harness-first verification and a small
reversible commit.

### Task 0: Protect user work and establish the executable baseline

**Files:** no product or documentation writes.

- [ ] **Step 0.1: Start execution only after separate explicit authorization**

  Invoke `using-git-worktrees` and create an isolated worktree at base
  `0ae6f9541f4176279dd97bce5241ab0c242860de`. Do not execute this plan in the original dirty workspace.

- [ ] **Step 0.2: Verify original-workspace preservation evidence**

  In `D:\Personal Files\Projects\WebApps\prompt-enhancer`, run:

  ```powershell
  git status --short
  git hash-object -- ".opencode/plans/2026-08-21-2325-phases-2-3-understanding-and-structure.md"
  ```

  Expected: status contains the known historical plan modification and this new plan; historical-plan hash is
  `339c13e1636dcc70ec226542e061ae9c704339da`. Any additional pre-existing dirty path stops execution.

- [ ] **Step 0.3: Confirm the isolated baseline and freeze anchors**

  In the isolated worktree, run:

  ```powershell
  git rev-parse HEAD
  git status --short
  git diff --exit-code 0ae6f95 -- "src/app/(template)"
  git diff --exit-code 0ae6f95 -- "src/prompt-engine/types.ts"
  ```

  Expected: full HEAD SHA equals the base SHA, status is empty, and both diffs exit 0.

- [ ] **Step 0.4: Re-establish the 31-check baseline**

  Run:

  ```powershell
  npm run verify:engine
  npx tsc -p tsconfig.engine.json --noEmit
  npx tsc -p tsconfig.scripts.json --noEmit
  npm run build
  ```

  Expected: `verify-engine: ALL PASS (31 checks)`, both TypeScript commands exit 0, build exits 0, and `/`,
  `/presets`, `/library`, `/history`, `/settings`, and `/about` are listed as static routes. Any failure is a
  baseline problem: record it and stop rather than folding an unrelated repair into this plan.

### Task 1: Add section assembly and Markdown generation

**Files:**

- Create: `src/prompt-engine/generator/assemble-section-content.ts`
- Create: `src/prompt-engine/generator/generate-markdown.ts`
- Modify: `src/scripts/verify-cases.ts`
- Modify: `src/scripts/verify-engine.ts`

- [ ] **Step 1.1: Add eight failing, literal golden cases**

  Add `ASSEMBLY_CASES` (3) and replace the empty `GENERATOR_CASES` with five renderer cases. Add typed
  `verifyAssemblyCase` and `verifyGeneratorCase` runners, remove `pendingSection`, and run the two new sections.

  Pin these assembly cases:

  1. Detailed bug fix: `fix login bug don't change email authentication` with sections objective/problem/scope/
     requirements/constraints/verification produces the exact values in the centralized policy, including
     `Resolve login bug.`, the copied requirement `Fix login bug`, and copied constraint.
  2. `research passkeys using Next.js`: objective/research-scope/key-questions/output-format preserves that order, includes
     `Research passkeys.`, and uses the exact three key questions and research output instruction.
  3. A frozen hand-built analysis for `Create a login illustration using Next.js` with subject
     `login illustration`, domain `authentication`, and technology `Next.js`: source-content/subject/
     style-direction/technical-requirements copy those values, preserve insertion order, and leave the analysis
     unchanged.

  Pin these renderer cases:

  1. Material-shaped object renders byte-exactly:

     ```md
     # Objective

     Resolve the login problem.

     ## Requirements

     - Identify the cause of the issue.
     - Apply the necessary correction.

     ## Constraints

     - Preserve existing email authentication.
     ```

  2. Light renders the required sentence as bare prose.
  3. Research content `{ objective: "Compare passkey options.", research-scope: "Investigate passkey adoption.",
     key-questions: ["Which option best fits the requirements?"], requirements: ["Use current evidence."],
     output-format: "Return a concise report." }` renders in exactly that insertion order.
  4. `{ objective: "Review login.", constraints: [" ", ""], verification: ["", "Confirm behavior."] }`
     renders exactly `# Objective\n\nReview login.\n\n## Verification\n\n- Confirm behavior.`.
  5. Empty content returns `""`.

- [ ] **Step 1.2: Run the cases to prove the feature is absent**

  Run:

  ```powershell
  npx tsc -p tsconfig.scripts.json --noEmit
  ```

  Expected: nonzero with module/export-not-found diagnostics for the not-yet-created generator modules. A failure
  caused by an existing unrelated file stops the task.

- [ ] **Step 1.3: Implement the approved assembler policy**

  Create `assemble-section-content.ts` with the exact signature, normalization, objective map, task-type branches,
  section table, array copying, omission behavior, insertion-order assignment, and provenance comments specified
  above. Use an exhaustive `switch` over `SectionId`; an unhandled section must be a TypeScript error through a
  `never` exhaustiveness helper.

- [ ] **Step 1.4: Implement the formatting-only renderer**

  Create `generate-markdown.ts` with the exact `SectionContent` type and rendering contract above. Do not import
  parser, classifier, analysis, template registry, or rule implementations; only template titles/types and
  `EnhancementLevel` are permitted.

- [ ] **Step 1.5: Run the generator slice gates**

  Run:

  ```powershell
  npm run verify:engine
  npx tsc -p tsconfig.engine.json --noEmit
  npx tsc -p tsconfig.scripts.json --noEmit
  npx biome check "src/prompt-engine/generator/assemble-section-content.ts" "src/prompt-engine/generator/generate-markdown.ts" "src/scripts/verify-cases.ts" "src/scripts/verify-engine.ts"
  ```

  Expected: all 31 existing checks plus 8 new checks pass (**39 total**); both TypeScript projects and scoped Biome
  exit 0.

- [ ] **Step 1.6: Create a reversible generator checkpoint**

  Run preset generation first and require no generated diff:

  ```powershell
  npm run generate:presets
  git diff --exit-code -- "src/lib/preferences/theme.ts"
  git add -- "src/prompt-engine/generator/assemble-section-content.ts" "src/prompt-engine/generator/generate-markdown.ts" "src/scripts/verify-cases.ts" "src/scripts/verify-engine.ts"
  git diff --cached --name-only
  git commit -m "feat: r11 deterministic markdown generator"
  git show --name-only --format="" HEAD
  ```

  Expected: only the four literal task paths are staged and committed; the hook passes and `theme.ts` is absent.

### Task 2: Add the public prompt-engine pipeline

**Files:**

- Create: `src/prompt-engine/index.ts`
- Modify: `src/scripts/verify-cases.ts`
- Modify: `src/scripts/verify-engine.ts`

- [ ] **Step 2.1: Add six failing end-to-end cases**

  Add `PIPELINE_CASES` and `verifyPipelineCase`. The runner must import `enhancePrompt` and `generateMarkdown` from
  `../prompt-engine` so the harness also proves the public barrel.

  Pin these exact behaviors:

  1. `fix login problem`, light: General category/type, confidence 43, parsed slots preserved, level `light`, and
     exact bare material sentence.
  2. `Fix my login because it sometimes fails`, omitted level: Development/Bug Fix/100, level `standard`, and exact
     Objective → Requirements → Verification Markdown. Objective is `Resolve login because it sometimes fails.`;
     the requirement is `Fix login because it sometimes fails`; verification uses the two bug-fix lines.
  3. `fix login bug don't change email authentication`, detailed: Development/Bug Fix/100 and exact ordered
     Objective → Problem → Scope → Requirements → Constraints → Verification Markdown with non-empty bodies.
  4. `Write something about the weather tomorrow`, standard: General/0; requirements is dropped; output contains
     `Fulfill this request: Write something about the weather tomorrow.` followed by the two default verification
     bullets.
  5. Empty input: General/0, all optional slots `undefined`, all arrays empty, original `""`, level `standard`, and
     blank Markdown.
  6. Three spaces: same result as empty except `analysis.original === "   "`; blank Markdown.

- [ ] **Step 2.2: Run the cases to prove the barrel is absent**

  Run:

  ```powershell
  npx tsc -p tsconfig.scripts.json --noEmit
  ```

  Expected: nonzero because `enhancePrompt` is not exported from the absent barrel.

- [ ] **Step 2.3: Implement the thin barrel and pipeline**

  Create `src/prompt-engine/index.ts` with the exact public runtime/type export lists and pipeline contract above.
  The implementation order is parse → classify → explicit analysis assembly → blank guard → light polish or
  template resolve/select/assemble → render. Keep it synchronous and do not expose `assembleSectionContent`.

- [ ] **Step 2.4: Run the pipeline slice gates**

  Run:

  ```powershell
  npm run verify:engine
  npx tsc -p tsconfig.engine.json --noEmit
  npx tsc -p tsconfig.scripts.json --noEmit
  npx biome check "src/prompt-engine/index.ts" "src/scripts/verify-cases.ts" "src/scripts/verify-engine.ts"
  ```

  Expected: `verify-engine: ALL PASS (45 checks)`; both TypeScript projects and scoped Biome exit 0.

- [ ] **Step 2.5: Create a reversible pipeline checkpoint**

  ```powershell
  npm run generate:presets
  git diff --exit-code -- "src/lib/preferences/theme.ts"
  git add -- "src/prompt-engine/index.ts" "src/scripts/verify-cases.ts" "src/scripts/verify-engine.ts"
  git diff --cached --name-only
  git commit -m "feat: add prompt engine pipeline"
  git show --name-only --format="" HEAD
  ```

  Expected: only the three literal task paths are committed.

### Task 3: Prove complete code acceptance and restore the Phase 2 boundary

**Files:** no intended writes; one controlled fixture mutation is restored immediately.

- [ ] **Step 3.1: Run the full harness twice**

  ```powershell
  npm run verify:engine
  npm run verify:engine
  ```

  Expected both times: `verify-engine: ALL PASS (45 checks)` with identical per-section totals.

- [ ] **Step 3.2: Prove failure signaling**

  Change one expected generator string in `src/scripts/verify-cases.ts`, run `npm run verify:engine`, and require a
  nonzero exit with the altered case named in the failure summary. Then restore only that file from HEAD and rerun:

  ```powershell
  git restore --source=HEAD -- "src/scripts/verify-cases.ts"
  npm run verify:engine
  ```

  Expected final result: all 45 checks pass and `git status --short` shows no mutation from this proof.

- [ ] **Step 3.3: Run type, purity, format, build, and scope gates**

  ```powershell
  npx tsc -p tsconfig.engine.json --noEmit
  npx tsc -p tsconfig.scripts.json --noEmit
  rg -n '^\s*import\s+["''][^.]|from\s+["''][^.]|import\(\s*["''][^.]|require\(\s*["''][^.]' "src/prompt-engine"
  rg -n "Math\.random|Date\.now|toLocaleLowerCase|toLocaleUpperCase|localeCompare|window|localStorage|sessionStorage|navigator|indexedDB" "src/prompt-engine"
  npx biome check "src/prompt-engine/generator/assemble-section-content.ts" "src/prompt-engine/generator/generate-markdown.ts" "src/prompt-engine/index.ts" "src/scripts/verify-cases.ts" "src/scripts/verify-engine.ts"
  npm run build
  git diff --exit-code 0ae6f95 -- "src/app/(template)"
  git diff --exit-code 0ae6f95 -- "src/prompt-engine/types.ts"
  git diff --name-only 0ae6f95...HEAD
  ```

  Expected: TypeScript, Biome, build, and frozen-path diffs pass; both `rg` scans have no unexplained hits; build
  lists all six enhancer routes as static; changed paths are limited to the Task 1–2 code/harness allowlist.

- [ ] **Step 3.4: Create the missing local Phase 2 tag safely**

  ```powershell
  git merge-base --is-ancestor 7289ee5 HEAD
  $expectedPhase2 = git rev-parse 7289ee5
  $existingPhase2 = git tag --list "phase-2"
  if ($existingPhase2) {
    if ((git rev-parse phase-2) -ne $expectedPhase2) { throw "phase-2 points at the wrong commit" }
  } else {
    git tag phase-2 7289ee5
  }
  git rev-parse phase-2
  ```

  If `phase-2` already exists, verify it resolves to `7289ee5` and do not recreate or move it. Expected final
  resolution: commit `7289ee5`. Do not push the tag.

### Task 4: Reconcile Phase 2/3 documentation

**Files:** the six exact analysis-vault files listed under “Modify”; no material source edits.

- [ ] **Step 4.1: Update roadmap and task statuses with reconciled counts**

  In `08 - ROADMAP TRACKER.md`, mark R-04…R-11 complete. Final counts must be:

  - complete: **10**
  - not started: **17**
  - already there: **1**
  - total: **28**

  R-07 must state that engine fallback is complete while picker/message rendering remains Phase 4/6 UI scope.

  In `09 - TASK TRACKER.md`, mark T-08…T-23 complete under the same engine-side interpretation of T-15. Final
  counts must be:

  - complete: **21**
  - not started: **34**
  - already there: **2**
  - total: **57**

- [ ] **Step 4.2: Reconcile decisions and stale blockers**

  Update `00 - START HERE.md`, `02 - DOCUMENT FINDINGS.md`, and `07 - DEVELOPMENT ROADMAP.md` so they record:

  - Q-02 settled by the committed margin/evidence-floor confidence formula; bands are ≥80 High, 60–79 Medium,
    and <60 Low.
  - C-02's printed score 11 is a source arithmetic erratum; the printed bug-fix weights remain authoritative.
  - Q-03 settled by nine provenance-marked authored recipes, completing all 13 task types.
  - Engine ties fall back to General/Low; Q-04 remains open only for later UI presentation of competing matches.
  - Narrative content uses the centralized approved SectionId policy in this plan.
  - Phase 2 and Phase 3 engine work is complete only after the recorded acceptance gates pass.

  Preserve the historical wording as an annotated decision trail rather than deleting it.

- [ ] **Step 4.3: Add revision-log entry V-02**

  Add `V-02 — 22 August 2026` to `13 - REVISION LOG.md`. Record:

  - Phase 2 commits and `phase-2` boundary.
  - Phase 3 template/rules/generator/pipeline commits and authored-vs-material provenance.
  - Q-02, Q-03, C-02, tie, light-prose, and centralized body-policy decisions.
  - Final harness count and exact type/purity/Biome/build/frozen-path results.
  - No UI, storage, dependency, migration, or deployment work occurred.

- [ ] **Step 4.4: Verify and commit documentation only**

  Manually count every status row in 08 and 09, then run targeted searches for stale Q-02/Q-03 blocker wording.
  Review all hits and require each completed-item reference to be historical or resolved, not still blocking.

  ```powershell
  rg -n "Q-02|Q-03|unsettled|block" "docs/ANALYSIS - PROMPT ENHANCER/00 - START HERE.md" "docs/ANALYSIS - PROMPT ENHANCER/02 - DOCUMENT FINDINGS.md" "docs/ANALYSIS - PROMPT ENHANCER/07 - DEVELOPMENT ROADMAP.md" "docs/ANALYSIS - PROMPT ENHANCER/08 - ROADMAP TRACKER.md" "docs/ANALYSIS - PROMPT ENHANCER/09 - TASK TRACKER.md" "docs/ANALYSIS - PROMPT ENHANCER/13 - REVISION LOG.md"
  git diff --check
  git diff -- "docs/ANALYSIS - PROMPT ENHANCER/00 - START HERE.md" "docs/ANALYSIS - PROMPT ENHANCER/02 - DOCUMENT FINDINGS.md" "docs/ANALYSIS - PROMPT ENHANCER/07 - DEVELOPMENT ROADMAP.md" "docs/ANALYSIS - PROMPT ENHANCER/08 - ROADMAP TRACKER.md" "docs/ANALYSIS - PROMPT ENHANCER/09 - TASK TRACKER.md" "docs/ANALYSIS - PROMPT ENHANCER/13 - REVISION LOG.md"
  npm run generate:presets
  git diff --exit-code -- "src/lib/preferences/theme.ts"
  git add -- "docs/ANALYSIS - PROMPT ENHANCER/00 - START HERE.md" "docs/ANALYSIS - PROMPT ENHANCER/02 - DOCUMENT FINDINGS.md" "docs/ANALYSIS - PROMPT ENHANCER/07 - DEVELOPMENT ROADMAP.md" "docs/ANALYSIS - PROMPT ENHANCER/08 - ROADMAP TRACKER.md" "docs/ANALYSIS - PROMPT ENHANCER/09 - TASK TRACKER.md" "docs/ANALYSIS - PROMPT ENHANCER/13 - REVISION LOG.md"
  git diff --cached --name-only
  git commit -m "docs: complete phase 2 and phase 3 records"
  git show --name-only --format="" HEAD
  ```

  Expected: only those six documentation files are committed.

### Task 5: Final acceptance, rollback anchor, and handoff

**Files:** no intended product writes.

- [ ] **Step 5.1: Repeat every final gate after documentation**

  ```powershell
  npm run verify:engine
  npx tsc -p tsconfig.engine.json --noEmit
  npx tsc -p tsconfig.scripts.json --noEmit
  npx biome check "src/prompt-engine/generator/assemble-section-content.ts" "src/prompt-engine/generator/generate-markdown.ts" "src/prompt-engine/index.ts" "src/scripts/verify-cases.ts" "src/scripts/verify-engine.ts"
  npm run build
  git diff --exit-code 0ae6f95 -- "src/app/(template)"
  git diff --exit-code 0ae6f95 -- "src/prompt-engine/types.ts"
  git status --short
  ```

  Expected: 45/45 checks, both TypeScript projects clean, scoped Biome clean, build green with six static enhancer
  routes, frozen diffs empty, and isolated worktree clean.

- [ ] **Step 5.2: Audit commit scope and original-workspace preservation**

  ```powershell
  git diff --name-only 0ae6f95...HEAD
  git log --oneline --decorate 0ae6f95..HEAD
  git hash-object -- "D:\Personal Files\Projects\WebApps\prompt-enhancer\.opencode\plans\2026-08-21-2325-phases-2-3-understanding-and-structure.md"
  ```

  Expected: only the three new engine files, two harness files, and six documentation files differ; commits are the
  generator, pipeline, and documentation checkpoints; historical-plan hash remains `339c13e…`.

- [ ] **Step 5.3: Create the verified Phase 3 tag**

  ```powershell
  $expectedPhase3 = git rev-parse HEAD
  $existingPhase3 = git tag --list "phase-3"
  if ($existingPhase3) {
    if ((git rev-parse phase-3) -ne $expectedPhase3) { throw "phase-3 points at the wrong commit" }
  } else {
    git tag phase-3 HEAD
  }
  git rev-parse phase-3
  ```

  If `phase-3` already exists, stop unless it already points at this accepted commit. Never force or move it. Do not
  push.

- [ ] **Step 5.4: Record acceptance without starting Phase 4**

  Report exact command results, commit SHAs, tag SHAs, changed-file audit, tracker counts, frozen-path diffs, and the
  unchanged historical-plan hash. Phase 4 requires a separate plan and execution request.

## Risks and mitigations

| Risk | Likelihood | Impact | Mitigation and verification |
|---|---:|---:|---|
| Historical plan is overwritten or swept into a commit | High | Critical | Isolated worktree; original blob hash before/after; literal staging; plans excluded from implementation commits |
| Status-based freeze check misses a committed forbidden edit | Medium | Critical | Diff `types.ts` and `(template)` against full base SHA at preflight and final acceptance |
| Renderer passes while pipeline cannot fill section bodies | High | High | Dedicated centralized assembler; 3 assembly cases + 6 end-to-end cases |
| Existing parser/classifier/template/rule behavior regresses | Medium | High | Preserve all 31 cases; stop on baseline failure; final 45-case harness |
| Authored defaults are mistaken for source requirements | Medium | Medium | Provenance comments in code and V-02; exact approved policy recorded in this plan |
| Empty sections, wrong order, or whitespace drift | Medium | High | Byte-exact renderer cases; insertion-order contract; blank omission; no-trailing-newline assertion |
| Low-confidence fallback is lost in analysis assembly | Medium | High | Light General/43, odd General/0, and blank General/0 pipeline cases |
| Purity scan has false positives or misses browser APIs | Medium | High | DOM-free TypeScript is authoritative; relative-import and exact nondeterminism scans are reviewed, not blindly waived |
| Pre-commit stages generated theme metadata | Medium | High | Run generator before staging; require empty theme diff; inspect cached and committed file lists |
| Docs claim completion while direct blocker text remains stale | High | Medium | Update 00/02/07/08/09/13 together; count rows; review all Q-02/Q-03 hits |
| Local-only commits/tags are mistaken for deployment | High | Medium | No push/release/deploy in scope; report local status explicitly |
| User-controlled Markdown later becomes executable UI content | Low now | Medium later | Engine returns text only; UI rendering/sanitization remains a separate Phase 4 security decision |

### Stop conditions

Stop and revise the plan if:

1. HEAD is not the recorded base when execution begins.
2. Baseline harness, engine/scripts TypeScript, or build fails.
3. The historical-plan hash changes or additional pre-existing dirty files appear.
4. Completion requires a path outside the declared allowlist.
5. `types.ts`, the frozen template subtree, or generated theme metadata changes.
6. Any existing harness case regresses.
7. Documentation evidence materially contradicts the status/count resolutions above.

## Rollback

- Use the three small commits as rollback units: documentation, pipeline, then generator.
- Roll back committed work with `git revert` in reverse order. Never use `reset --hard`, broad `restore`, `clean`,
  or stash operations in the original workspace.
- Before a task commit, remove or restore only that task's literal allowlisted paths relative to `0ae6f95`.
- Do not create `phase-3` until final acceptance. If an unpublished local tag is created prematurely, delete it;
  never move a published tag.
- If the content policy is rejected after implementation, revert generator and pipeline commits; all committed Phase
  2/template/rule work and `phase-1` remain intact.
- There is no database, user data, environment, package migration, external service, or deployment state to reverse.
- The frozen template has no rollback surface because any difference from the base is a stop condition.

## Execution log

| When | Entry |
|---|---|
| 2026-08-22 07:24 +08:00 | Drafted from `prompts/01.md`, the complete analysis vault, current code/Git/tooling state, the historical execution plan, and read-only explorer/architect/risk reviews. User chose a remaining-work baseline and centralized minimal section builders. Status remains draft pending explicit approval. No implementation or verification command was executed by Daedalus. |

## Approval gate

This plan remains **draft**. Explicit approval changes only its frontmatter status to `ready` and appends the
approval to the execution log. A ready plan is not executed automatically; implementation requires a separate
explicit request to Kratos.
