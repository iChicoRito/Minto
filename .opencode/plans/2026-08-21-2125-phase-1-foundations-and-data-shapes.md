---
title: "Phase 1 — Foundations and the Shape of the Data"
status: in-progress
created_at: 2026-08-21T21:25:00+02:00
updated_at: 2026-08-21T21:40:00+02:00
---

# Plan: Phase 1 — Foundations and the Shape of the Data

Implements `prompts/00.md` → **Phase 1 (R-01, R-02, R-03)** of the roadmap in
`ANALYSIS - PROMPT ENHANCER/07 - DEVELOPMENT ROADMAP.md`, covering tasks **T-01 … T-07**
from `09 - TASK TRACKER.md`.

## Goal

An app that starts and shows its six empty pages behind a sidebar (Enhance as home, plus
Presets, Library, History, Settings, About), carrying the agreed data shapes every later
phase will write against — while leaving `src/app/(template)` byte-for-byte untouched.

## Success criteria

From the roadmap's own definition-of-done, made verifiable:

1. `npm run dev` serves the app at `/` showing a sidebar with six named destinations;
   each opens an (empty) page: `/` (Enhance), `/presets`, `/library`, `/history`,
   `/settings`, `/about`.
2. `src/prompt-engine/types.ts` defines `PromptAnalysis`, `PromptCategory`,
   `PromptTaskType`, `EnhancementLevel` **exactly** as the source material defines them
   (see vocabulary table below — 11 fields incl. 3 optional, 5 categories,
   13 task types, 3 strengths). No React imports in `src/prompt-engine/`.
3. Helper packages named by T-02 are installed: `dexie`, `dexie-react-hooks`,
   `react-markdown`, `remark-gfm` (`zod` and `lucide-react` already present).
4. `npm run check` (biome) passes; `npm run build` passes.
5. `git status --short "src/app/(template)"` reports **no changes** — template preserved.

## Scope and constraints

### In scope
- Remaining part of R-01: install the four missing helper packages.
- R-02: app shell — sidebar navigation + page frame + six empty pages.
- R-03: data shapes (`src/prompt-engine/types.ts`) per material lines 206–262.
- Small bookkeeping: replace the root placeholder page; optional renames (below);
  tracker updates (Task 7).

### Out of scope (later phases)
- Parser / classifier / word lists (Phase 2, T-08…T-15)
- Rule engine, templates, markdown generator (Phase 3)
- Any real page functionality: Enhance UI, presets data, editor, preview (Phase 4)
- Dexie schema, storage modules, history/library (Phase 5, T-31+)
- Settings tabs, backup door, hard-input handling, privacy wording in
  sidebar/About (R-23 is **Phase 6**, not now), responsive editor panes (Phase 6)
- Test suite, dataset, PWA/offline, static-host deployment (Phase 7)
- No test framework (none configured; CLAUDE.md forbids inventing one unless asked)

### Hard constraints
- **Never alter any file under `src/app/(template)/`.** It is reference-only.
- Derived constraint: do not modify shared files whose modification would change what
  the template displays or how it behaves. Specifically leave alone:
  `src/navigation/sidebar/sidebar-items.ts` (drives the template sidebar),
  `src/config/app-config.ts` (name shown in the template sidebar header + root
  metadata), and the root `src/app/layout.tsx` metadata (the template inherits it).
  The enhancer gets its own equivalents instead.
- Repo conventions (CLAUDE.md/biome): kebab-case filenames, sorted classes, fixed
  import group order, line width 120, double quotes; prefer `npm run check:fix`.
- Engine/UI/storage separation starts here: `src/prompt-engine/**` must never import
  React or Next.js.

## Repository evidence

| Finding | Where | Consequence |
|---|---|---|
| Stack already matches R-01: Next.js 16 App Router, React 19 + React Compiler, TypeScript strict, Tailwind v4 CSS-first, shadcn/ui initialized | `package.json`, `components.json`, `biome.json` | T-01/T-03 already satisfied; only T-02 package gap remains |
| Missing helper packages: `dexie`, `dexie-react-hooks`, `react-markdown`, `remark-gfm`. Present: `zod@4`, `lucide-react` | `package.json` deps | One `npm install` closes R-01 |
| Template lives at `src/app/(template)/template/(main)/…` (dashboard/chat/mail/auth), served under `/template/**`; root `src/app/page.tsx` is a placeholder that says *"replace with the real app; template lives at /template"* | `src/app/` tree, `next.config.mjs` redirect | Enhancer becomes the root app; template stays at `/template` |
| Design reference for the shell: dashboard `layout.tsx` uses `SidebarProvider` → `AppSidebar` → `SidebarInset` + header with `SidebarTrigger`; `AppSidebar` reads prefs store, renders `NavMain` from `sidebar-items.ts` | `src/app/(template)/template/(main)/dashboard/layout.tsx`, `…/_components/sidebar/app-sidebar.tsx` | Copy the *pattern* into new enhancer-owned files; do not import template internals |
| Shared shadcn primitives (`components/ui/sidebar`, `separator`, …) exist and are excluded from biome | `src/components/ui/` | Reuse directly — read-only, allowed |
| Preferences system (theme/fonts/boot script/provider) lives in the **root** layout, outside `(template)` | `src/app/layout.tsx`, CLAUDE.md | Enhancer pages inherit theming for free; no work needed |
| Root layout metadata comes from `APP_CONFIG` ("Studio Admin") | `src/config/app-config.ts` | Override metadata inside the new route group instead of editing shared config |
| Biome ignores `.opencode` and `src/components/ui`; enforces `useFilenamingConvention`, `noUndeclaredDependencies`, import-cycle ban | `biome.json` | New files must be kebab-case; declared deps only |
| No test runner configured | CLAUDE.md | Verification = biome + `next build` + manual dev walkthrough |
| Git: single initial commit; analysis docs/prompts untracked; working tree otherwise clean | `git status/log` | All Phase-1 changes are additive; easy rollback |

## Chosen approach

Build the enhancer as a **new route group `src/app/(main)/`** that owns its shell and
pages, delete the root placeholder, and put the engine vocabulary in
`src/prompt-engine/types.ts`. Nothing shared with the template is edited; anything the
shell needs that the template also has (nav config, app name) is recreated as
enhancer-owned code rather than imported across the boundary.

Key decisions and why:

1. **Route group `(main)` + delete `src/app/page.tsx`.** Both files would resolve `/`
   and break the build, so removal happens in the same change. Group layout gives the
   six pages one shell without wrapping `/template/**`.
2. **Lean sidebar, not a copy of the template machinery.** The template's `NavMain`
   supports sub-items, badges, search dialog, account switcher, support card — none of
   which Phase 1 needs (and accounts contradict the product's identity). Six flat links
   with active-state highlighting (`usePathname`) over shadcn sidebar primitives.
3. **Own nav config file.** A small `enhancer-nav-items.ts` colocated under
   `(main)/_components/sidebar/` (typed like `NavGroup` but standalone). Editing the
   shared `sidebar-items.ts` would visibly change the template — forbidden by spirit of
   the constraint even though the file sits outside `(template)`.
4. **Static-friendly shell.** No `cookies()` / dynamic APIs in the new layout — the
   template reads sidebar cookies server-side, but that forces dynamic rendering and
   would collide with Phase 7's static-host requirement (R-28). Defaults
   (`variant="inset"`, `collapsible="icon"`) client-side only. Theme/font prefs already
   work pre-hydration via the existing boot script, so nothing is lost.
5. **Metadata override in the group layout.** `export const metadata` in
   `(main)/layout.tsx` titles these routes "Prompt Enhancer" without touching
   `APP_CONFIG` or the root layout the template inherits.
6. **Types verbatim from the material.** `PromptAnalysis` etc. copied exactly from
   lines 206–262; runtime arrays/schemas are deliberately deferred (classifier needs
   them in Phase 2 — not gold-plated now).
7. **Install-but-don't-yet-use packages.** Roadmap assigns installation to Phase 1
   (T-02); they stay unused until Phases 3–5. Declared deps satisfy biome's
   `noUndeclaredDependencies`.

## Interfaces and data flow

### URLs

| Route | File | Page |
|---|---|---|
| `/` | `src/app/(main)/page.tsx` | Enhance (home) |
| `/presets` | `src/app/(main)/presets/page.tsx` | Presets |
| `/library` | `src/app/(main)/library/page.tsx` | Library |
| `/history` | `src/app/(main)/history/page.tsx` | History |
| `/settings` | `src/app/(main)/settings/page.tsx` | Settings |
| `/about` | `src/app/(main)/about/page.tsx` | About |
| `/template/**` | unchanged | Reference template |

### New files (all enhancer-owned)

```
src/app/(main)/layout.tsx                      # shell: metadata, SidebarProvider, AppSidebar, frame
src/app/(main)/page.tsx                        # Enhance placeholder
src/app/(main)/{presets,library,history,settings,about}/page.tsx
src/app/(main)/_components/sidebar/enhancer-nav-items.ts
src/app/(main)/_components/sidebar/app-sidebar.tsx
src/prompt-engine/types.ts
```

Modified/deleted: delete `src/app/page.tsx`; `package.json`/lock (new deps, optional
rename); optional `CLAUDE.md` refresh; analysis trackers (Task 7).

### Data shapes (verbatim from material lines 206–262)

```ts
type PromptAnalysis = {
  original: string;
  category: PromptCategory;
  taskType: PromptTaskType;
  confidence: number;

  action?: string;
  subject?: string;
  domain?: string;

  technologies: string[];
  constraints: string[];
  requirements: string[];

  enhancementLevel: EnhancementLevel;
};

type PromptCategory = "development" | "writing" | "research" | "design" | "general";

type PromptTaskType =
  | "bug-fix"
  | "feature"
  | "code-review"
  | "refactor"
  | "testing"
  | "documentation"
  | "rewrite"
  | "summarize"
  | "research"
  | "comparison"
  | "ui-review"
  | "image-prompt"
  | "general";

type EnhancementLevel = "light" | "standard" | "detailed";
```

Checklist against material: **11 fields** (8 required, 3 optional: action, subject,
domain — the "twelve fields" wording in the analysis docs is an arithmetic slip,
corrected in the trackers) · **5 categories** · **13 task types** · **3 strengths**.

### Data flow in this phase

Trivial by design: pages are static server components rendering a titled placeholder;
`AppSidebar` is a client component reading only `usePathname`; theme/font preferences
flow through the existing root-level boot script and zustand provider — reused, not
modified. `prompt-engine/types.ts` has no consumers yet (first consumer: Phase 2
classifier).

## Ordered tasks

Dependencies: Task 1 independent; Tasks 2–4 independent of each other; Task 5 depends
on 2–4; Tasks 6–8 depend on 5.

| # | Task | Serves | Depends on | Verification |
|---|---|---|---|---|
| 1 | Install `dexie`, `dexie-react-hooks`, `react-markdown`, `remark-gfm` (save to deps). Optionally rename `package.json` `name` → `"prompt-enhancer"` and let `npm install` resync the lockfile | T-02, R-01 | — | `npm install` exits clean; `package.json` shows four new deps |
| 2 | Create `src/prompt-engine/types.ts` with the four exports above; confirm no react/next imports anywhere under `src/prompt-engine/` | T-06, T-07, R-03 | — | Diff vs material lines 206–262; field/vocabulary counts match checklist |
| 3 | Create shell: `src/app/(main)/_components/sidebar/enhancer-nav-items.ts` (six items: Enhance/Sparkles, Presets/Shapes, Library/LibraryBig, History/History, Settings/Settings2, About/Info), `app-sidebar.tsx` (header brand "Prompt Enhancer" + flat active-aware menu), `(main)/layout.tsx` (metadata override, `SidebarProvider` w/ static defaults, header with `SidebarTrigger` + `Separator`, content frame) | T-04, R-02 | — | Compiles; no imports from `(template)` or `@/navigation/sidebar` |
| 4 | Create six placeholder pages (consistent skeleton: h1 + one muted line naming the phase that will fill it); delete `src/app/page.tsx` | T-05, R-02 | 3 (routes must sit inside the group) | No duplicate-`/` build error |
| 5 | Full verification pass | R-01..R-03 | 1–4 | • `npm run check` clean (use `check:fix` first) • `npm run build` succeeds listing the six routes • `npm run dev`: sidebar shows six destinations, each opens, `/template/dashboard/default` still works • `git status --short "src/app/(template)"` empty • `grep -r "react\\|next" src/prompt-engine` finds no imports |
| 6 | Refresh `CLAUDE.md` stale sections (it still describes pre-restructure paths `(main)`, `/dashboard` redirect) to document the enhancer-vs-template split and the new engine folder *(recommended, cheap)* | Maintainability | 5 | Docs match reality |
| 7 | Bookkeeping in `ANALYSIS - PROMPT ENHANCER/`: set R-01..R-03 → ✅ in `08`, T-01..T-07 → ✅ in `09` (T-01/T-03 noted as 🔵 already-satisfied by template stack), create `13 - REVISION LOG` with dated entry, add doorway link in `00 - START HERE` (their own rule: work begun must be logged there) *(optional — skip if you prefer the vault frozen)* | Vault hygiene | 5 | Trackers consistent with shipped code |

## Risks

| Risk | Impact | Mitigation |
|---|---|---|
| Duplicate `/` route after adding `(main)/page.tsx` | Build failure | Delete root placeholder in the same change (Task 4) |
| Accidental drift into `(template)` | Violates the prime constraint | Verification gate (Task 5) diffs the folder; plan forbids importing template internals — pattern-copy only |
| Tempting shared-file edits (`APP_CONFIG`, `sidebar-items.ts`) would silently restyle the template | Constraint breach | Enhancer owns duplicates; decision recorded above |
| Server-side cookie reads (template pattern) would make pages dynamic and clash with Phase 7 static hosting (R-28) | Future rework | Shell is client-side/static from day one |
| Four installed packages unused until Phases 3–5 | None functional | Accepted: roadmap places installation here |
| Biome style friction (import order, class sort, kebab-case) | Wasted time | Run `npm run check:fix`, don't hand-fight |
| Open questions Q-01…Q-07 in the analysis | Block **later** phases only (preset mapping Q-01, score bands Q-02, section recipes Q-03, tie-break Q-04…) | Out of scope here; flagged where they'll bite (Phase 2/3/4/6) |

## Rollback

Everything is additive plus one file deletion:

- `git checkout -- .` / revert the single commit restores all new files, the root
  placeholder, `CLAUDE.md`, and trackers.
- `npm uninstall dexie dexie-react-hooks react-markdown remark-gfm` reverses Task 1 if
  ever needed (not required for a git revert beyond lockfile noise).
- `src/app/(template)` has zero rollback surface because it is never touched — verified
  by the Task 5 diff gate.
- No databases, migrations, env vars, or external state exist in this phase.

## Execution log

| When | Entry |
|---|---|
| 2026-08-21 21:25 | Plan drafted from `prompts/00.md`, `ANALYSIS - PROMPT ENHANCER` (00,01,05,07,08,09), material lines 1–280, and repo inspection (app tree, template shell, package.json, biome.json, git state). Status: draft — awaiting user approval. |
| 2026-08-21 21:40 | User approved execution ("Start or resume the approved plan"). Status → in-progress. Execution order: Tasks 1–3 in parallel (disjoint ownership: package.json/lock · prompt-engine/types.ts · (main) shell), then Task 4, then Task 5 via Kratos/tester, then Tasks 6–7 (docs builder), reviewer pass, final acceptance. |
| 2026-08-21 21:52 | Round 1 complete. First Task-3 attempt returned empty with no files written (recorded failure; retried successfully). Task 3 ✅ (WandSparkles brand; ClockFading substitution), Task 4 ✅, Task 2 ✅ (caught "12 fields" prose slip — actual shape is 11 fields; verbatim source honored), Task 1 ✅ (99 packages added, 0 vulnerabilities). All builders ran scoped checks only; template gate empty throughout. Launching Task 5 tester. |

## Progress checklist

- [x] Task 1 — Install helper packages + package rename *(builder)* — dexie@4.4.5, dexie-react-hooks@4.4.0, react-markdown@10.1.0, remark-gfm@4.0.1; name → "prompt-enhancer"; lockfile resynced; only package.json+lock modified
- [x] Task 2 — Engine data shapes `src/prompt-engine/types.ts` *(builder)* — 48 lines, zero imports; 5/13/3 vocab counts exact; **correction: shape has 11 fields (8 required + 3 optional), not 12 — prose slip in analysis docs**
- [x] Task 3 — App shell: nav config, AppSidebar, `(main)/layout.tsx` *(builder)* — 3 files; static inset/icon sidebar; exact-match active state; **icon substitution: History → ClockFading (lucide 1.31 renamed it)**
- [x] Task 4 — Six placeholder pages + delete root placeholder *(builder, after 3)* — 6 pages created, `src/app/page.tsx` deleted; biome scoped-clean; template gate empty
- [x] Task 5 — Full verification pass *(Kratos/tester)* — **PASS, 6/6 gates**: biome clean on all task-touched paths; build ✓ 42/42 pages, six enhancer routes static ○; smoke test on :3001 (port 3000 held by orphan PID 29936 — to be reaped): all six routes 200 + correct h1, brand present, /template/dashboard/default intact; template gate empty; engine zero imports; packages verified. Disclosed write: scoped format fix on package.json. **Finding:** repo-wide `npm run check` fails on PRE-EXISTING files (CRLF format diffs + `(template)` lint warnings) — not task-introduced; do NOT run repo-wide `check:fix` (it would rewrite `(template)` data.json files and breach Gate 4); biome policy decision deferred to Task 6.
- [x] Task 6 — CLAUDE.md refresh *(docs builder, after 5)* — two-app split documented, hard freeze rule, engine purity rule, biome gotcha; stale `/dashboard` claims gone; +17 net lines
- [x] Task 7 — Analysis-tracker bookkeeping + revision log *(docs builder, after 5)* — R-01 🔵 / R-02 ✅ / R-03 ✅ (08 counts 25⭕+2✅+1🔵=28); T-01 🔵 T-02..T-07 ✅ (09 counts 50⭕+5✅+2🔵=57); `13 - REVISION LOG` created; doorways updated in `00 - START HERE`; 11-vs-12 field correction recorded
- [x] Reviewer pass over full diff *(Kratos/reviewer)* — **APPROVE**, zero blockers/majors. Gates 1–3 confirmed by direct inspection (template freeze, plan fidelity incl. verbatim types, no regressions; tracker math verified). Findings: 1 minor = stale "12 fields" prose in this plan file → **fixed** (success criteria + data-shape checklist now say 11/8); notes: lockfile pruning of 8 extraneous transitives (benign), `aria-current="page"` polish idea deferred to Phase 4, sidebar cookie write exists client-side (remember for Phase 7 static-export audit).
- [ ] Final acceptance *(Kratos/verifier)*
