---
title: Phase 6 Control and Trust and Phase 7 Validation and Shipping
status: blocked
created_at: 2026-08-22T10:54:28+08:00
updated_at: 2026-08-22T12:36:01+08:00
---

# Phase 6 Control and Trust and Phase 7 Validation and Shipping Implementation Plan

> **For Nova:** Execute tasks in order. Phase 7 starts only after the Phase 6 acceptance gate passes. Do not modify or
> import from `src/app/(template)/`, and preserve unrelated working-tree changes.

**Goal:** Finish roadmap Phases 6 and 7: real settings and safe backup restore, truthful edge-case/privacy UX,
responsive screens, broader engine evidence and a sub-100 ms target, installable offline static output, and a GitHub
Pages release path.

**Architecture:** Keep UI, pure prompt engine, and browser storage separate. Settings write through the existing
preference pipeline; backup parsing is pure Zod code, while a client coordinator performs previewed replacement through
transactional repository methods. Release builds create a temporary enhancer-only source tree, statically export it,
then inject a revisioned service-worker precache; the frozen dynamic template remains available to normal development
builds but is absent from the shipping artifact.

**Tech stack:** Next.js 16 App Router, React 19, TypeScript, Zustand, Dexie, Zod, Tailwind/shadcn, existing
`node:assert` verification harnesses, native Node service-worker generation, GitHub Pages Actions.

---

## Goal, constraints, and success criteria

### Constraints

- Phases 1–5 are inputs, not redesign targets. Change their code only where Phase 6 controls or Phase 7 validation must
  connect to it.
- Never edit, format, move, delete, or import from `src/app/(template)/` in the repository.
- Preserve the engine purity rule: `src/prompt-engine/**` has no React, Next.js, DOM, storage, clock, or randomness.
- Keep the six enhancer routes static-friendly; no request cookies, Server Actions, API routes, backend, auth, AI, or
  remote prompt processing.
- Do not add a test framework. Extend the repository's dependency-light `node:assert` harnesses.
- Do not run repo-wide `npm run check:fix`; run Biome only on touched paths.
- GitHub Pages activation and the first push/deploy require repository-owner authorization. Implementation can prepare
  the complete artifact and workflow without silently publishing it.

### Success criteria

1. General, Sections, Appearance, and Data settings all alter the next relevant behavior and survive reload.
2. A full backup round-trips settings, prompts, folders, and history; malformed/unsupported input is rejected before
   mutation, and cancelling a valid preview changes nothing.
3. Empty, short, over-15,000-character, unknown, and conflicting prompts receive the decisions below without invented
   certainty or accidental persistence.
4. All six enhancer routes work without horizontal overflow at phone, tablet, and desktop widths; the mobile Markdown
   editor switches between Edit and Preview instead of showing side-by-side panes.
5. The engine harness covers all six documented areas and a checked-in 120-prompt dataset; its warmed dataset p95 is
   below 100 ms on ordinary development/CI hardware.
6. The release artifact contains only fixed files, is installable, and can hard-reload every enhancer route offline
   after its first online load.
7. The GitHub Pages workflow deploys `out/` at `https://ichicorito.github.io/prompt-enhancer/`, and the live smoke,
   privacy, storage, responsive, accessibility, and offline checks pass before Phase 7 is marked finished.

## Focused repository evidence

- `docs/ANALYSIS - PROMPT ENHANCER/07 - DEVELOPMENT ROADMAP.md:159-208` defines R-20–R-28 and orders Phase 6 before
  Phase 7. The source material at lines 916–1265 specifies the four settings tabs, versioned Zod import preview,
  privacy wording, five hard inputs, six test areas, 100–200 examples, `<100 ms`, mobile editor tabs, PWA, and static
  hosting.
- `src/app/(main)/settings/page.tsx` and `about/page.tsx` are placeholders; `app-sidebar.tsx` has no privacy footer.
- The existing preference stack already carries default level, sections, and history enablement through
  `preferences-config.ts`, `theme-boot.tsx`, the Zustand provider/store, and `preferences-storage.ts`. Phase 6 should
  extend this stack, not create another settings store.
- `enhancer-workspace.tsx` currently enhances only on explicit actions, rejects empty input, hardcodes history retention
  to 500, and persists level/section changes from the workspace. Settings should become the sole owner of defaults;
  workspace controls remain per-session except the explicit history switch.
- `browser-memory/repository.client.ts` already owns Dexie transactions and consistent snapshots. The current V1 export
  in `export.client.ts` contains only content and has no importer, so V2 must add settings while retaining V1 restore.
- `classify-prompt.ts` already computes the complete score table but `enhancePrompt` discards it. Exposing ranked top
  matches through the engine result is enough for trustworthy ambiguity UI; the UI must not rescore prompts.
- `markdown-editor.tsx` currently uses a desktop grid that stacks on small screens rather than mobile Edit/Preview tabs.
  The shell's shadcn sidebar already becomes a mobile sheet behind the top header trigger, so no second navigation
  system is needed.
- `verify-engine.ts` already covers parser, classifier, templates, rules, generator, and pipeline; `verify-product.ts`
  covers pure product behavior. Extending these is smaller and more consistent than adding Vitest/Jest.
- Next.js 16 static export does not support cookies, redirects, or Server Actions. The frozen template has a cookie-based
  dynamic layout, `next.config.mjs` has a redirect, and `preferences-storage.ts` statically imports a Server Action.
  A normal `output: "export"` build of the whole repository is therefore intentionally impossible.
- The public Git remote is `iChicoRito/prompt-enhancer`, default branch `main`; GitHub Pages is not enabled yet. A project
  Pages deployment therefore needs base path `/prompt-enhancer` and one owner activation step.

## Chosen decisions and boundaries

### Product behavior decisions

- **Prompt limit:** 15,000 JavaScript string characters. Preserve the input, show the current count and limit, do not
  call the engine, and do not write history when exceeded. Empty means `trim().length === 0`. A short prompt such as
  `fix it` proceeds through the General-safe pipeline; pronoun-only subjects (`it`, `this`, `that`) use `Resolve the
  described issue.` and `Confirm that the issue is resolved.` rather than invented specifics or `Resolve the it.`
- **Ambiguity (settles Q-04):** the classifier returns positive top-score matches in stable task-type order. A unique
  winner is used normally. Exact top-score ties retain the existing low-confidence General auto result and show
  `Detected: <first>; Also matches: <others>` plus the existing manual type selector. An all-zero/unknown input shows
  `Low confidence — using General` and never labels a specialty as certain.
- **Defaults:** add `default_prompt_type` (`auto` plus all 13 task types) and `history_max_entries` (100, 250, 500, or
  1000; default 500). Settings alone changes default type/level/sections. The workspace may vary them for the current
  document without rewriting defaults.
- **Appearance:** Phase 6 exposes the documented System/Light/Dark mode only, using existing theme utilities. Theme
  presets, font, content layout, and sidebar controls remain supported infrastructure but are not duplicated here.
- **Backup:** export `prompt-enhancer-backup.json` as strict V2 with `format`, `version`, `exportedAt`, a complete typed
  snapshot of every configured preference, and the three content arrays. Import accepts current content-only V1 and V2;
  any other version is refused. Restore replaces, never merges, all local content after a count/settings preview.
- **Import safety:** reject files over 20 MiB; use strict Zod objects and known enums. Bound IDs to 128 characters,
  titles to 120, folder names to 80, tags to 20 × 40, prompt/Markdown fields to 1,000,000 legacy-safe characters,
  history to 1,000 records, and prompts/folders to 10,000 each; require unique IDs/folder names and valid
  prompt-to-folder references. Parsing and preview are side-effect free. Confirmation snapshots
  current settings/content, replaces all Dexie tables in one transaction, applies settings, prunes to the restored cap,
  and reloads. A settings-write failure triggers compensating restoration of both snapshots and a blocking error.
- **Destructive controls:** Clear History affects history only; Clear Library clears prompts and folders atomically;
  Clear All clears all three tables and every configured preference, then reloads defaults. Each action names retained
  and deleted data in a confirmation dialog.
- **Responsive breakpoints:** phone `<768 px`, tablet `768–1279 px`, desktop `>=1280 px`. Reuse the shell's mobile
  sidebar sheet/top trigger. Render one controlled editor textarea and one preview; phone state hides one behind
  Edit/Preview tabs while `md` and above force both visible in a two-column grid.
- **Performance:** preserve explicit Enhance regeneration and restored-record reconstruction. Never parse on keystrokes
  or write IndexedDB on keystrokes. Benchmark the checked-in dataset after warm-up and gate on p95, not a noisy maximum.

### Shipping decisions

- Keep `npm run build` as the normal two-app build. Add `npm run build:static` for the product artifact.
- `build:static` stages required build inputs under `.static-build/`, copying `src/` except
  `src/app/(template)/`; it never mutates the frozen source. It invokes the repository's installed Next CLI from the
  staged working directory with conditional static export, trailing slashes, PWA registration, and an optional base
  path, then writes `.nojekyll`, injects a revisioned service worker over all exported HTML/JS/CSS/assets, and publishes
  the finished artifact to root `out/`.
- In static mode, `next.config.mjs` returns no redirects and uses `output: "export"`; normal mode preserves the template
  redirect. Remove the unused `server-cookie` persistence branch/static Server Action import because every configured
  preference is already client-cookie or localStorage.
- Use the small native `build-service-worker.mjs` generator rather than adding a build-time PWA dependency. The client
  registrar is disabled in development. The generated worker precaches the complete `out/` artifact, cleans old
  revisions, and serves navigation/assets offline; it does not cache user data, backup files, or cross-origin traffic.
- Deploy the Pages project site from GitHub Actions with `NEXT_PUBLIC_BASE_PATH=/prompt-enhancer`; Next `Link`, router
  replacement, manifest start URL, service-worker URL/scope, and injected precache URLs all use that same value.

## Interfaces and data flow

### Core contracts

- `PromptPreferenceSnapshot`: mapped object containing every `PreferenceKey` with its validated
  `PreferenceValueMap[K]` value.
- `PromptEnhancerBackupV2`: `{ format: "prompt-enhancer-backup"; version: 2; exportedAt: string; settings:
  PromptPreferenceSnapshot; data: MemoryExportData }`.
- `BackupPreview`: source version, export date, history/prompt/folder counts, and preference differences; contains only
  validated normalized data and is safe to display before mutation.
- `memoryRepository.pruneHistory(limit)`, `clearLibrary()`, `clearAll()`, and `replaceSnapshot(data)` are the only new
  content mutation entry points; multi-table operations are Dexie transactions.
- `validatePrompt(raw)` returns `{ ok: true }` or `{ ok: false; reason: "empty" | "too-long"; message }` and exports
  `MAX_PROMPT_CHARACTERS = 15_000`.
- `ClassificationResult.topMatches` is a stable readonly list of positive equal-top-score task types.
  `EnhancePromptResult.classification` exposes that engine-owned result; `WorkspaceDocument` retains it for display only.

### Runtime flow

1. Boot script validates/stamps preference attributes; provider reads them into Zustand.
2. Settings control -> store setter -> DOM apply helper where relevant -> `persistPreference`; data cap changes also call
   `pruneHistory`. A new workspace reads these defaults once.
3. Enhance -> `validatePrompt` -> pure engine -> workspace document/classification notice -> optional history write using
   current `historyMaxEntries`.
4. Backup export -> preference snapshot + repository read transaction -> V2 JSON Blob download. Import -> file-size gate
   -> JSON/Zod/refinement -> immutable preview -> user confirmation -> compensated content/settings replacement -> reload.
5. Static release -> enhancer-only staged Next export -> service-worker manifest injection -> `out/` -> Pages artifact.
   Prompt processing and all persisted content remain in the browser; the host receives only fixed-asset requests.

## Affected areas

- **Preferences:** `src/lib/preferences/{preferences-config,prompt-preferences,preferences-storage}.ts`,
  `src/scripts/theme-boot.tsx`, `src/stores/preferences/{preferences-store,preferences-provider}.tsx`,
  `src/app/layout.tsx`; add `preference-snapshot.ts` and `preference-snapshot.client.ts`.
- **Storage/backup:** `src/lib/browser-memory/{types,repository.client}.ts`; replace `export.client.ts` with
  `backup-schema.ts` and `backup.client.ts`; update History imports.
- **Settings/trust UI:** `src/app/(main)/settings/page.tsx`; add
  `settings/_components/{settings-screen,data-settings}.tsx`; modify workspace, input/result panels, sidebar, About,
  History, and Library.
- **Engine:** `src/prompt-engine/classifier/classify-prompt.ts` and `src/prompt-engine/index.ts` only; no storage/UI import.
- **Responsive:** `src/components/markdown/markdown-editor.tsx` plus targeted `(main)` layout/screen class changes.
- **Evidence:** `src/scripts/{verify-cases,verify-engine,verify-product-cases,verify-product}.ts`; add
  `engine-dataset.ts` and `verify-performance.ts`.
- **PWA/static/release:** `package.json`, `package-lock.json`, `.gitignore`, `next.config.mjs`, `README.md`; add
   `src/app/manifest.ts`, `src/components/pwa/service-worker-register.tsx`,
   `src/scripts/{build-static,build-service-worker}.mjs`, `public/icons/*`, and `.github/workflows/deploy-pages.yml`.
- **Roadmap record after acceptance:** analysis docs `00`, `07`, `08`, `09`, and `13`. Record evidence; do not rewrite
  completed Phase 4/5 scope.

## Ordered implementation tasks

### Task 1 — Extend preference contracts and default ownership

**Depends on:** none.

1. Centralize task-type, level, section, and history-limit option/parse helpers in `prompt-preferences.ts`; keep Objective
   mandatory and validate all persisted strings to defaults.
2. Add `default_prompt_type` and `history_max_entries` through all four preference layers: config/default/persistence,
   root attributes/provider props, boot-script read/validate/stamp, and Zustand fields/setters/DOM hydration.
3. Add full snapshot read/validate/persist/reset helpers. Client persistence must report failure rather than swallowing it
   for backup restore, and must use only client cookies/localStorage.
4. Stop workspace type/level/section changes from persisting defaults; initialize task type from the synchronized store,
   retain the explicit history quick toggle, and use the store's cap for every history prune.
5. Extend product cases for valid/invalid preference parsing, Objective normalization, snapshot completeness, and reducer
   initialization. Run `npm run verify:product`, app TypeScript, and scoped Biome.

### Task 2 — Build strict, previewed backup restore and repository data controls

**Depends on:** Task 1.

1. Add repository methods for immediate cap pruning, atomic library clearing, atomic all-content clearing, and atomic
   snapshot replacement. Clone arrays on write and preserve existing error wrapping.
2. Define strict V1 and V2 Zod schemas plus cross-record refinements in `backup-schema.ts`. Return normalized V2-shaped
   data and a `BackupPreview`; never access DOM/Dexie in this module.
3. Replace the export-only helper with `backup.client.ts`: exact V2 download, 20 MiB file gate, side-effect-free parse,
   and confirmed compensated restore. V1 import preserves current preferences; V2 restores its snapshot.
4. Add pure product cases for V1 migration, V2 round-trip, malformed JSON, unsupported version, extra keys, duplicate IDs,
   bad folder references, and preview counts. Run product checks before wiring UI.

### Task 3 — Implement the four-tab Settings module

**Depends on:** Tasks 1–2.

1. Keep `settings/page.tsx` a static server shell and render a client `SettingsScreen` with General, Sections,
   Appearance, and Data tabs.
2. Wire General to default type and level; Sections to the five documented sections with Objective locked; Appearance to
   System/Light/Dark using `applyThemeMode`; each control updates store, DOM, and persistence once.
3. Wire Data to history enablement, the four cap choices, Export, file selection/import preview/confirmation, and the
   three destructive actions. Disable memory actions when the provider is unavailable and show actionable status text.
4. On a lower cap, prune immediately and update History's displayed cap. Confirm every destructive operation, preserve
   current data on cancel/error, and focus the dialog/status result for keyboard users.
5. Manually seed all three tables and verify control persistence, V2 round-trip, V1 restore, cancellation, malformed-file
   rejection, and each wipe boundary before proceeding.

### Task 4 — Finish hard-input and classification-trust behavior

**Depends on:** Task 1; can follow Task 3 independently of Task 2 internals.

1. Add the pure 15,000-character validator and product cases for empty, boundary, oversized, and Unicode inputs.
2. Show a live count near the prompt textarea. Gate Enhance before dirty-edit confirmation/engine/history work; use the
   documented empty copy and a specific oversized message.
3. Extend classifier output with stable equal-top positive matches and expose the original classification through the
   public pipeline/workspace document. Add engine cases for unique, all-zero, and conflicting scores without changing
   the existing General fallback semantics.
4. In the engine facade's objective/verification copy, normalize absent or pronoun-only short subjects to the exact
   generic issue wording above; leave longer parsed subjects unchanged.
5. Add result metadata for resolved type/confidence. Show the exact tie/unknown notices from the decisions above and
   direct users to the existing manual type selector; never display raw score tables.
6. Verify `"fix it"` returns the exact generic issue wording, unknown text reports General/low confidence, the conflict
   fixture shows both labels, and oversized input creates no history record.

### Task 5 — Add privacy surfaces and complete responsive/accessibility behavior

**Depends on:** Tasks 3–4.

1. Add a sidebar footer visible in expanded/mobile navigation: `100% Local`, `No account. No AI. Your prompts stay in
   your browser.` Keep a compact tooltip/accessible label when the sidebar is icon-collapsed.
2. Replace About's placeholder with precise wording: processing occurs locally; prompt content is not sent externally;
   static assets come from the host; browser data is not encrypted, synced, or recoverable without backup.
3. Refactor the Markdown editor to phone Edit/Preview tabs and `md` two-pane mode without duplicate controlled textareas.
   Preserve toolbar, undo/reset, fullscreen, counts, and safe React Markdown rendering.
4. Audit all six enhancer routes at 320×568, 768×1024, and 1440×900. Fix only observed overflow, wrapping, focus-order,
   label, and touch-target issues in enhancer-owned components; use the existing mobile sidebar rather than a new nav.
5. Keyboard-check sidebar, tabs, controls, dialogs, editor toolbar, and destructive confirmations; confirm visible focus,
   meaningful names, live status/error announcements, zoom to 200%, and reduced-motion compatibility.

### Task 6 — Expand engine evidence and enforce performance

**Depends on:** Phase 6 gate (Tasks 1–5 accepted).

1. Add exactly 120 authored prompt fixtures across all 13 task types plus short, unknown, and conflict
   groups. Each case has a stable ID, input, expected type, and only relevant optional assertions for constraints,
   technologies, level/headings, or top matches; do not snapshot entire incidental objects.
2. Extend `verify-engine.ts` to run the dataset after the existing six sections, report per-type and total counts, run each
   case twice for determinism, and fail after listing every mismatch. Make only evidence-driven vocabulary/weight/rule
   corrections uncovered by the dataset.
3. Add `verify-performance.ts`: warm 20 calls, time five passes over the 120 fixtures with `node:perf_hooks`, report
   median/p95/worst, and exit nonzero when p95 is `>=100 ms`. It must not write benchmark artifacts into source.
4. Confirm by code search/React profiling that keystrokes do not call `enhancePrompt` or Dexie; only an explicit Enhance
   (including after control changes) and saved-record restoration may run the engine.
5. Run engine/product harnesses twice, performance three times, engine/app TypeScript, purity greps, scoped Biome, normal
   `npm run build`, and the frozen-subtree diff gate. Investigate variance or failures; do not weaken expectations.

### Task 7 — Produce an installable offline static artifact

**Depends on:** Task 6.

1. Add manifest metadata and committed 192×192/512×512 any+maskable SVG icon entries. Register the worker only in static
   production mode at the configured base path/scope.
2. Add the native worker/build script with same-origin-only precache/runtime rules, navigation fallback to the exported
   root, revision cleanup, and no caching for backup downloads. Do not add a build-time PWA dependency for this fixed
   artifact.
3. Make `next.config.mjs` conditional for static output/base path/redirect removal while preserving normal behavior.
   Remove the enhancer graph's Server Action persistence import and replace raw root anchors/history replacement with
   Next Link/router APIs so project Pages paths work.
4. Implement the enhancer-only staging build. Fail if the staging source or `out/` contains `/template`, if any of the
   six route HTML files, manifest, worker, or icons is absent, or if the worker lacks an injected precache manifest.
5. Run normal `npm run build` first to protect the reference app, then root-base and `/prompt-enhancer` static builds.
   Serve each artifact over HTTP; verify direct route reloads and asset URLs before offline testing.

### Task 8 — Add Pages delivery, run release acceptance, and close the roadmap

**Depends on:** Task 7.

1. Replace the template README with Prompt Enhancer purpose, local-first/privacy limits, local commands, backup warning,
   static/PWA build instructions, GitHub Pages URL, and offline/update troubleshooting.
2. Add a least-privilege Pages workflow for `main` and manual dispatch: checkout, Node/npm cache, `npm ci`, engine/product/
   performance/type/purity checks, `build:static` with `/prompt-enhancer`, artifact assertions, Pages upload, and deploy.
3. Before first release, the owner enables Settings -> Pages -> GitHub Actions. Push/deploy only with explicit approval;
   capture the Actions run and emitted Pages URL.
4. At the live URL, run the targeted release matrix below. Test install/offline on Chromium desktop plus supported
   Android/macOS home-screen flows; record Firefox/Safari capability differences rather than promising unsupported
   install UI.
5. Update analysis docs 00/07/08/09/13 with actual check counts, benchmark hardware/results, browser/device matrix,
   workflow run/URL, and any residual limitations. Mark R-20–R-28/T-40–T-57 complete only when their checks pass.

## Targeted acceptance checks

### Automated/static gates

- `npm run verify:engine` twice: all existing six sections and dataset `120/120` pass; outputs are deterministic.
- `npm run verify:product`: preference, validator, reducer, editor, backup-schema, and existing Phase 4/5 cases pass.
- `npm run verify:performance` three times: each warmed p95 is `<100 ms`, with hardware/Node version recorded.
- `npx tsc -p tsconfig.engine.json --noEmit` and `npx tsc --noEmit` exit 0.
- Engine purity searches return no React/Next/alias imports or DOM/storage/time/random globals.
- `npx biome check <all touched code/config paths>` exits 0; no repo-wide autofix.
- `npm run build` succeeds with the normal template still present; `git diff --exit-code -- "src/app/(template)"` exits 0.
- `npm run build:static` succeeds at root and Pages base paths; `out/` has the six routes, 404, manifest, icons,
  revisioned `sw.js`, and `.nojekyll`, with no template route or server artifact.

### Browser/release matrix

- **Settings:** change every control, reload, open a fresh workspace, and confirm only defaults affect new work; lower
  history cap and confirm immediate oldest-first pruning.
- **Backup:** create representative history/prompts/folders/settings, export, clear, preview, cancel with no change, then
  confirm and compare exact normalized state. Reject malformed JSON, unsupported version, extra keys, duplicate IDs,
  broken folder references, and a file over 20 MiB with a reason.
- **Hard inputs:** empty, `fix it`, exactly 15,000 characters, 15,001 characters, nonsense, and conflict fixture produce
  the specified UX; rejected input never mutates history.
- **Privacy:** DevTools Network shows no request containing prompt/Markdown content during enhance, edit, save, backup,
  or restore; About/sidebar wording matches actual host/service-worker behavior.
- **Responsive/accessibility:** all routes pass the three viewport sizes, 200% zoom, keyboard-only completion, labels,
  focus visibility/order, status announcements, and no horizontal document scroll.
- **PWA/offline:** install from the Pages URL; after one online load, enable browser Offline and hard-reload each route;
  enhance, save, browse history/library, change settings, export, and restore locally. Reconnect and confirm the next
  revision updates without losing IndexedDB/preferences.
- **Shipping:** a clean Pages workflow deploys only static files; the public URL and all direct route URLs return 200,
  and no template route is published.

## Material risks, recovery, and rollback

| Risk | Mitigation and recovery |
|---|---|
| Import/wipe destroys local-only data | Preview + explicit replacement copy + pre-operation snapshot + Dexie transaction + compensated settings rollback. Encourage an export first. No IndexedDB schema migration is required. |
| Frozen dynamic template blocks static export | Build from an ephemeral enhancer-only copy; keep normal build as a regression gate and require a zero template diff. Never solve this by editing the template. |
| Pages base path breaks links, manifest, or worker scope | One `NEXT_PUBLIC_BASE_PATH` source feeds Next, router links, manifest, registration, and precache prefix; test both empty and project paths. |
| Stale service worker serves a bad release | Revision every precached file, clean obsolete caches, verify update flow. Roll back by redeploying the previous green commit; if needed, unregister worker/clear Cache Storage, without clearing IndexedDB. |
| Dataset encourages weight overfitting | Balance all types/wordings, pin intent-level expectations, and make only failures justified by multiple fixtures; retain original golden cases. |
| CI timing noise | Warm up, use p95 over 600 calls, record environment, and require three local runs plus CI; optimize demonstrated hot paths rather than relaxing the target. |
| Browser storage/PWA support varies | Record browser/device versions and capability differences; memory-unavailable UI remains functional, and install claims are limited to supported browsers. |
| GitHub Pages is not enabled | Target and base path are decided, so implementation is unblocked. The owner activation/push is an explicit release prerequisite; do not mark Phase 7 complete before the live run succeeds. |
| Production origin changes browser-local data | Browser data is origin-bound. Before any future domain move, export at the old origin and import at the new one; document that Pages/local-development stores do not sync. |

## Execution notes for Nova

- Suggested coherent commits: preferences; backup repository/schema; Settings; hard-input/trust UX; privacy/responsive;
  dataset/performance; PWA/static build; Pages/docs.
- Run focused checks after each task and the full targeted gates only at Phase 6 and release boundaries.
- Existing untracked/modified prompt and plan files are unrelated; do not stage, delete, or rewrite them.
- A failed import compensation, frozen-tree diff, nondeterministic dataset case, repeated p95 failure, missing static asset,
  or live offline failure is a stop condition. Fix and rerun the owning gate before advancing.
- Rollback application code by reverting the owning coherent commit. Do not downgrade/delete IndexedDB: this plan changes
  repository operations and backup format, not database version 1.

## Execution evidence

- Tasks 1–7 implementation work is present; the frozen `src/app/(template)/` subtree remains unchanged.
- `npm run verify:engine`: `166` checks passed, including `120/120` dataset cases.
- `npm run verify:product`: `9/9` passed.
- `npm run verify:performance` ran three times earlier and once again after the final release changes; all p95 values
  were below 100 ms (`3.87 ms`, `3.90 ms`, `2.86 ms`, `4.79 ms`).
- `npx tsc -p tsconfig.engine.json --noEmit`, `npx tsc --noEmit`, scoped Biome, engine purity checks, and
  `git diff --check` passed.
- `npm run build` passed with the normal template routes. `npm run build:static` passed at the
  `/prompt-enhancer` base path; artifact assertions confirmed the six enhancer routes, `404.html`, manifest, worker,
  `.nojekyll`, and icon with no `out/template` directory. Root and Pages-base static builds and an HTTP smoke of all
  exported routes passed.
- The Pages workflow now runs the engine purity gate and checks `404.html` and the icon in addition to the core artifact.
- Pushed commit `fe0a95c` triggered workflow run #1. Engine, product, performance, type, purity, static-build, and
  artifact gates passed; `Configure Pages` failed because the repository Pages API returned 404. No deploy job ran.
- The native generated service worker and SVG icon entries are intentional: they provide the required fixed-asset
  precache/offline behavior without adding a build-time dependency or a second worker abstraction.
- Browser responsive/accessibility/offline checks, roadmap analysis-doc updates, and the live Pages workflow have not run.

## Current status

Blocked only at release acceptance: repository-owner GitHub Pages activation/approval and the browser/live matrix are
required before Phase 7 can be marked complete. The implementation choice above is settled and final implementation
checks are green; only owner-side Pages activation and the live acceptance run remain.
