---
title: "Phases 4+5 — Workspace and Browser-Local Memory"
status: blocked
created_at: 2026-08-22T08:14:49+08:00
updated_at: 2026-08-22T10:24:43+08:00
---

# Phases 4+5 Workspace and Browser-Local Memory Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: use `subagent-driven-development` (recommended) or
> `executing-plans` to implement this plan task by task. Use `using-git-worktrees` before execution, after the
> Phase 3 dependency gate is committed and accepted. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Deliver the complete Enhance workspace and preset flow, then add safe browser-local history and an
explicitly saved library with favourites, folders, tags, search, and filters.

**Architecture:** Keep enhancement intelligence behind one pure prompt-engine facade, keep unsaved workspace state
in a route-local React reducer, and put durable content behind a lazy client-only Dexie repository. Implement Phase 4
before Phase 5, but release them together so the Phase 4 Save action never makes a false persistence promise. Extend
the existing preference system for small defaults; do not create a competing settings store.

**Tech stack:** Next.js 16 App Router, React 19, TypeScript 5.9, shadcn/ui, Tailwind CSS v4, React Markdown 10,
remark-gfm 4, Dexie 4.4, dexie-react-hooks 4.4, Zustand 5, Biome 2, existing `node:assert/strict` harness.

---

## Goal and current-state baseline

This plan implements `prompts/02.md` against the repository state inspected on 2026-08-22.

- Phase 1 types and the enhancer shell exist.
- The committed baseline is now `63686b7` (`feat: add prompt engine pipeline`) on `main`, thirteen commits ahead of
  `origin/main` at final self-review time. It was committed concurrently while this plan was being drafted.
- Phase 2 parser/classifier behavior and the Phase 3 templates, rules, and Markdown generator are committed.
- Phase 3 completion commit `63686b7` adds `src/prompt-engine/index.ts` and pipeline cases to the existing harness.
  Daedalus reran the committed state and recorded `verify-engine: ALL PASS (44 checks)`; the chained
  `npx tsc -p tsconfig.engine.json --noEmit` also exited zero.
- The committed `enhancePrompt(raw, { level? })` facade is not yet sufficient for Phase 4 because it cannot accept a
  manual task-type choice or explicit section choices. The user decided that this remains an **upstream Phase 3
  gate**, not implementation scope for this plan.
- All enhancer pages are placeholders. The root shell, navigation, preference system, shadcn primitives, Toaster,
  React Markdown, remark-gfm, Dexie, and dexie-react-hooks are already present.
- There is no formal test framework. This plan extends the repository's dependency-free assertion-script pattern
  for pure contracts and uses a recorded browser acceptance protocol for IndexedDB and UI behavior.
- The working tree already contains unrelated plan/prompt changes. Execution must start from a clean, accepted
  Phase 3 commit in an isolated worktree; it must not sweep the original workspace's plan files into commits.

## User-approved decisions

1. **Release boundary:** Phase 4 and Phase 5 are ordered implementation milestones but one release. Save is not
   published until durable library storage works.
2. **Preset count:** the 17 explicitly named presets are authoritative; references to 18 are documentation errors.
3. **Preset taxonomy:** presets without exact task types map to the closest existing one; the frozen 13-type engine
   taxonomy is not expanded.
4. **Memory release standard:** Phase 5 targets a normal release. Pull forward a fixed history cap, clear-history,
   and collection JSON export; polished import and the full Data settings UI remain Phase 6.
5. **History default:** automatic history is enabled by default with a visible local-only disclosure and an on/off
   control.
6. **Phase 3 gap:** the override-capable engine contract is an upstream gate. Phase 4 never calls parser,
   classifier, template, rule, or generator internals directly.
7. **Regeneration:** changing task type, level, or sections marks an existing result stale. Only an explicit Enhance
   action replaces it and creates a history entry.

## Success criteria

### Phase 4 — workspace and presets

1. `/` presents a labelled raw-prompt textarea, Auto Detect task type, Standard level, the five documented section
   controls, and an Enhance button.
2. Default selected sections are Objective, Requirements, Constraints, and Verification; Acceptance Criteria is
   initially clear. Objective stays selected.
3. Explicit Enhance calls only the accepted public engine facade. Empty input shows `Please enter a prompt.` without
   replacing the last valid result or writing history.
4. Low-confidence auto classification remains General and the resolved task type can be corrected manually.
5. A changed control marks the current result stale; it does not regenerate, overwrite edits, or create history
   until Enhance is pressed again.
6. Result and Preview tabs render the current Markdown. Edit opens a controlled Markdown editor with live preview,
   heading, bold, italic, bullet, numbered-list, code, link, fullscreen, undo, reset, word-count, and character-count
   controls.
7. Copy copies the current edited Markdown only after Clipboard success. A denial leaves selectable Markdown and a
   useful error. Export requests a UTF-8 `.md` download of the current edited Markdown.
8. Raw HTML is not rendered, unsafe links are neutralized, and Markdown images never initiate remote requests.
9. `/presets` shows exactly 17 presets in the four documented groups. Every preset applies the exact mapping in this
   plan and navigates to Enhance; a later manual control change clears preset provenance.
10. The Bug Fix walkthrough resolves to Development / Bug Fix / Standard with its standard recipe sections.

### Phase 5 — memory

11. Small defaults use the existing preference config, boot script, DOM attributes, Zustand store, and persistence
    dispatcher; no second settings blob or product-record Zustand store is introduced.
12. Dexie opens only after mount, uses database `prompt-enhancer` schema version 1, and owns `history`, `prompts`, and
    `folders` tables. No browser API runs during module evaluation or server/static rendering.
13. With history enabled, one successful explicit Enhance commits exactly one immutable history snapshot. Failed,
    blank, cancelled, copied, exported, opened, or control-only actions commit none.
14. History defaults to enabled, is visibly described as local-only, and can be disabled. A disabled history setting
    does not disable Enhance, Copy, Edit, Export, or deliberate library Save.
15. History groups entries by the browser's local day and supports Open, Copy, Save to Library, Delete, Clear
    History, and local-data JSON export.
16. History retains the newest 500 entries. Inserting entry 501 atomically removes the oldest history entry only;
    it never changes library prompts.
17. First Save creates an independent library snapshot. Repeated Save for the same open workspace document updates
    that prompt rather than duplicating it. Save success is shown only after the IndexedDB transaction commits.
18. Library prompts can be found by search, renamed, duplicated, opened/edited, deleted, favourited, assigned to one
    optional folder, and tagged. All/Favourites/Development/Research/Writing/Design are filters, not folders.
19. Folder deletion atomically moves affected prompts to Unfiled. History deletion/pruning never deletes a library
    prompt, and library deletion never deletes history.
20. Reload preserves history, prompts, folders, tags, and favourites but deliberately does not preserve an unsaved
    workspace draft.
21. IndexedDB unavailable/open/quota/write failures leave the current workspace usable in memory and never report a
    durable action as successful. No error path deletes or recreates the database.
22. Export produces `prompt-enhancer-backup-YYYY-MM-DD.json` with format/version metadata and a transactionally
    consistent snapshot of all three content tables. Import remains Phase 6.
23. `/`, `/presets`, `/history`, and `/library` remain statically renderable. The prompt engine remains free of UI,
    storage, clock, randomness, and browser imports.
24. Pure product-contract checks, engine checks, both relevant TypeScript projects, scoped Biome, production build,
    static-route inspection, frozen-subtree diff, and the manual browser matrix all pass before release.
25. Current stable Chrome, Edge, Firefox, and Safari desktop complete the persistence/security/action matrix; a browser
    that cannot persist enters an explicit unavailable mode rather than silently claiming support.

## Scope and constraints

### In scope

- R-12 through R-19 and T-24 through T-39 from the analysis roadmap and task tracker.
- Enhance input, controls, result/preview actions, editor, and all 17 presets.
- Existing preference-system integration for default level, default sections, and history enabled.
- Versioned Dexie v1 storage, automatic history, explicit library, favourites, one-level folders, normalized tags,
  search, filters, and record-opening flows.
- Minimum normal-release safeguards moved forward from Phase 6: fixed 500-entry history retention, Clear History,
  and collection JSON export only.
- Secure Markdown rendering, truthful storage/Clipboard/download feedback, keyboard/accessibility checks, static
  rendering, local-only disclosure, and non-destructive rollback.
- Status/revision-document reconciliation after functional acceptance.

### Out of scope

- Phase 1 rework or expansion of the 13 `PromptTaskType` values.
- Implementing the missing Phase 3 facade options in this plan; they are a blocking upstream dependency.
- Custom/user-authored presets; the material mentions storage but supplies no model, UX, or Phase 5 roadmap task.
- Workspace draft autosave or reload recovery, cloud sync, accounts, authentication, encryption, backend APIs, or
  cross-device storage.
- Nested/multiple folders, tag records with independent metadata, saved searches, bulk actions, pagination,
  collaborative/conflict-resolution UI, or rich-text/WYSIWYG editing.
- HTML, PDF, plain-text, or generated-versus-edited export choices; the Phase 4 result export is current Markdown.
- Import, backup restore, configurable retention, clear-library/all-data controls, the full Settings Data tab, or
  migration from any pre-v1 content database. Those remain Phase 6.
- Phase 6's final oversized-input policy, full phone-specific editor tabs, privacy copy across every surface, and
  complete settings UI; Phase 4/5 still must reflow safely and avoid obvious failure at 200% zoom.
- A new test framework, fake IndexedDB dependency, PWA/offline packaging, static-host configuration, deployment,
  release, push, or PR.
- Cleanup of inherited Studio Admin README/config metadata or unrelated 404/template links.

### Hard constraints

- Never modify or import from `src/app/(template)/**`.
- Route-owned components stay under the route's `_components`; only the Markdown editor/preview and memory provider
  are shared.
- Do not hand-format `src/components/ui/**`; use existing shadcn primitives and add none unless a required primitive
  is genuinely missing.
- Keep `src/app/(main)/**` free of `cookies()`, server actions, and dynamic request APIs.
- Keep `src/prompt-engine/**` pure. Phase 4 imports only its public barrel.
- Do not put prompts, history, folders, or tags in the preference store. Do not put default preferences in Dexie.
- Do not parse or persist prompt bodies on each keystroke. Editor state remains in React until explicit Save.
- Do not run repository-wide `npm run check:fix`. Run Biome only on touched paths.
- Do not change `next.config.mjs` to `output: "export"`; static-host configuration belongs to Phase 7. Verify that
  the enhancer routes remain static in the existing build output.
- Preserve pre-existing working-tree files and plan records. Execution uses an isolated worktree created after the
  accepted Phase 3 commit.

## Repository evidence

| Finding | Evidence | Planning consequence |
|---|---|---|
| The enhancer shell and six routes exist; four target routes are placeholders | `src/app/(main)/layout.tsx`, `page.tsx`, `presets/page.tsx`, `history/page.tsx`, `library/page.tsx` | Replace placeholders and keep the shell static |
| The enhancer navigation already contains all routes | `src/app/(main)/_components/sidebar/enhancer-nav-items.ts` | No navigation-config edit is required |
| Phase 3 has a committed `enhancePrompt(raw, { level? })` but no manual type/section options | `63686b7`; `src/prompt-engine/index.ts:116-160`; final 44-check pass | Require a follow-up accepted upstream contract before Task 1 |
| Existing engine sections contain 24 task-specific IDs | `src/prompt-engine/templates/template-types.ts:31-83` | UI exposes the five documented controls; presets use exact template-standard IDs |
| Every task type has one complete recipe | `src/prompt-engine/templates/registry.ts:28-42` | Preset mappings reuse recipes instead of inventing section lists |
| The material names 17 presets while roadmap/task tracker say 18 | material `706-745`; roadmap `113`; tracker `52` | Use 17 and correct the derived documents |
| The material specifies exact workspace defaults/actions/editor helpers | material `646-686`, `760-787` | Pin semantics in this plan instead of leaving UI decisions open |
| The material separates preferences from IndexedDB and names three tables | material `791-833` | Extend preferences; create `history`, `prompts`, `folders` in Dexie |
| History and library are intentionally different | material `838-899`; diagrams `151-166` | Immutable history and mutable library use separate records/lifecycles |
| React Markdown, remark-gfm, Dexie, and dexie-react-hooks are installed but unused | `package.json:33-34,46-49`; lockfile versions 4.4.5/4.4.0/10.1.0/4.0.1 | Add no runtime dependency |
| The preference system has config/defaults, boot stamping, Zustand synchronization, and persistence dispatch | `preferences-config.ts`, `theme-boot.tsx`, `preferences-store.ts`, `preferences-provider.tsx`, `preferences-storage.ts` | New small preferences touch every existing layer |
| A Toaster and reusable shadcn primitives already exist | `src/app/layout.tsx:39-50`; `src/components/ui/**` | Reuse them for action feedback, dialogs, tabs, cards, inputs, and lists |
| No formal test framework exists; the engine uses a Node assertion harness | `CLAUDE.md`; `package.json:15`; `src/scripts/verify-engine.ts` | Add a second pure-contract harness and a manual IndexedDB/UI protocol |
| Repo-wide Biome has known unrelated CRLF/frozen-template noise | `CLAUDE.md:15-19` | Scope every Biome command to the task's literal paths |

### Official external contracts used by this plan

- Dexie schema declarations contain only keys/indexes, not every stored property; fresh databases open directly at
  the latest schema; failed upgrades roll back their versionchange transaction:
  <https://dexie.org/docs/Version/Version.stores/> and
  <https://dexie.org/docs/Tutorial/Design#database-versioning>.
- Dexie transactions commit before their promise resolves; unrelated async APIs must stay outside the transaction:
  <https://dexie.org/docs/Dexie/Dexie.transaction()>.
- `useLiveQuery` uses a deterministic default result, observes Dexie writes across same-origin tabs, and throws
  errors to an error boundary: <https://dexie.org/docs/dexie-react-hooks/useLiveQuery()>.
- React Markdown 10 is safe by default when raw HTML is skipped and the default URL transform is preserved:
  <https://github.com/remarkjs/react-markdown/tree/10.1.0#security>.
- Next Client Components are still prerendered, so browser APIs cannot run during render/module initialization:
  <https://nextjs.org/docs/app/guides/static-exports#browser-apis>.
- Clipboard writes are asynchronous, secure-context-only, and may reject:
  <https://developer.mozilla.org/en-US/docs/Web/API/Clipboard/writeText>.
- Browser storage is best-effort and private-mode data is temporary:
  <https://developer.mozilla.org/en-US/docs/Web/API/Storage_API/Storage_quotas_and_eviction_criteria>.

## Chosen approach

### Selected: pure facade + route-local workspace + separate browser-memory repository

1. The engine receives text and explicit controls and returns analysis, resolved controls, and Markdown.
2. A route-local reducer owns the prompt, controls, current generated/edited document, dirty/stale flags, and action
   statuses. No global product-state store is introduced.
3. The editor owns one controlled Markdown value. Preview renders that value safely; Copy/Export/Save consume that
   same value.
4. A client-only memory provider lazily opens one Dexie v1 database and exposes a narrow repository/status contract.
5. Explicit Enhance optionally writes one immutable history record. Explicit Save creates or updates one independent
   library prompt. Metadata actions write only the affected library prompt/folder.
6. `useLiveQuery` powers durable lists; data is not mirrored into Zustand or a second React cache.
7. Phase 4 and Phase 5 are reviewable separately but publish together.

### Rejected alternatives

1. **One shared enhancement table:** fewer tables, but editing/saving/history retention become coupled and a future
   split requires migration. It violates the documented history/library distinction.
2. **Prompt bodies in Zustand/localStorage:** creates two durable sources of truth, synchronous large writes, and a
   migration bridge that Phase 5 immediately has to remove.
3. **UI calls engine internals:** works around the current Phase 3 gap but makes the workspace own enhancement policy
   and breaks the UI/engine boundary.
4. **Ship Phase 4 with disabled or in-memory Save:** violates the roadmap's working-action completion test and risks
   false user confidence. A combined release gives Save its final semantics once.

## Interfaces and data flow

### Phase 3 dependency contract

Task 1 may start only after the upstream Phase 3 owner commits and verifies this exact public contract:

```ts
export type EnhancePromptOptions = {
  level?: EnhancementLevel;
  taskType?: PromptTaskType; // undefined means Auto Detect
  sections?: readonly SectionId[]; // undefined means the selected recipe defaults
};

export type ResolvedEnhancement = {
  taskType: PromptTaskType;
  category: PromptCategory;
  level: EnhancementLevel;
  sections: readonly SectionId[];
};

export type EnhancePromptResult = {
  analysis: PromptAnalysis; // classifier result remains truthful
  resolved: ResolvedEnhancement; // manual override and actual controls used
  markdown: string;
};

export function enhancePrompt(raw: string, options?: EnhancePromptOptions): EnhancePromptResult;
```

Resolution rules:

1. Parse and classify every non-blank prompt.
2. Use the classifier task when `taskType` is absent; otherwise resolve the manual task's recipe/category.
3. Default level to `standard`.
4. Use recipe/rule sections when `sections` is absent; otherwise de-duplicate the supplied IDs while preserving
   their caller order and assemble those sections.
5. Keep `analysis.taskType/category/confidence` as classifier facts; put the manual choice in `resolved`.
6. Preserve existing blank-input behavior (`markdown: ""`) and deterministic/pure behavior.
7. Export the existing `SectionId`, `SECTION_TITLES`, level/type/category types, and the facade from the barrel so UI
   imports no internal engine path.

The upstream acceptance cases must cover auto defaults, a manual type override, explicit section order, no mutation
of the caller's section array, low-confidence General analysis with a manual resolved type, and blank input.

### Preset catalogue

Each preset has `{ id, label, category, taskType, level: "standard", sections }`. `sections` is the
mapped task type's committed **standard** recipe. Category is derived from that recipe and recorded explicitly only
for display/verification.

```ts
export type PromptPresetId =
  | "bug-fix"
  | "build-feature"
  | "code-review"
  | "refactor"
  | "testing"
  | "documentation"
  | "api-design"
  | "database"
  | "rewrite"
  | "summarize"
  | "improve-writing"
  | "research-topic"
  | "compare-options"
  | "analyze-information"
  | "ui-design"
  | "ux-review"
  | "image-prompt";
```

| Group | ID / label | Mapped type | Standard sections |
|---|---|---|---|
| Development | `bug-fix` / Bug Fix | `bug-fix` | objective, requirements, verification |
| Development | `build-feature` / Build Feature | `feature` | objective, requirements, verification |
| Development | `code-review` / Code Review | `code-review` | objective, review-scope, output-format |
| Development | `refactor` / Refactor | `refactor` | objective, requirements, verification |
| Development | `testing` / Testing | `testing` | objective, requirements, verification |
| Development | `documentation` / Documentation | `documentation` | objective, requirements, output-format |
| Development | `api-design` / API Design | `feature` | objective, requirements, verification |
| Development | `database` / Database | `feature` | objective, requirements, verification |
| Writing | `rewrite` / Rewrite | `rewrite` | objective, requirements, output-format |
| Writing | `summarize` / Summarize | `summarize` | objective, key-points, output-format |
| Writing | `improve-writing` / Improve Writing | `rewrite` | objective, requirements, output-format |
| Research | `research-topic` / Research Topic | `research` | objective, key-questions, output-format |
| Research | `compare-options` / Compare Options | `comparison` | objective, criteria, output-format |
| Research | `analyze-information` / Analyze Information | `research` | objective, key-questions, output-format |
| Design | `ui-design` / UI Design | `ui-review` | objective, review-areas, output-format |
| Design | `ux-review` / UX Review | `ui-review` | objective, review-areas, output-format |
| Design | `image-prompt` / Image Prompt | `image-prompt` | objective, style-direction, output-format |

Preset application navigates to ``/?preset=${presetId}``. The client workspace reads and validates the query after mount,
applies the preset, then calls `window.history.replaceState` to return the address to `/`. Presets do not silently
change saved default preferences. Any subsequent manual type, level, or section change clears `presetId`.

### Workspace controls and state

The ordinary (non-preset) defaults are:

```ts
const DEFAULT_LEVEL: EnhancementLevel = "standard";
const DEFAULT_SECTIONS: readonly SectionId[] = [
  "objective",
  "requirements",
  "constraints",
  "verification",
];
// "acceptance-criteria" is displayed but initially unchecked.
```

Objective is checked and disabled. The other four controls are user-selectable. Task type is
`"auto" | PromptTaskType`; the client converts `"auto"` to an absent engine `taskType` option.

```ts
export type WorkspaceControls = {
  taskType: "auto" | PromptTaskType;
  level: EnhancementLevel;
  sections: readonly SectionId[];
  presetId: PromptPresetId | null;
};

export type WorkspaceDocument = {
  runId: string;
  originalPrompt: string;
  controls: WorkspaceControls;
  analysis: PromptAnalysis;
  resolved: ResolvedEnhancement;
  generatedMarkdown: string;
  markdown: string;
  historyId: string | null;
  libraryPromptId: string | null;
  dirty: boolean;
  stale: boolean;
};
```

State rules:

- Typing changes only the current input. It does not parse, regenerate, or persist.
- Manual level/section changes persist as future defaults through the preference system. Preset-applied values do
  not. Task type always defaults to Auto Detect on a fresh workspace.
- Changing a control while a document exists sets `stale: true`; the old output remains visible.
- Enhance snapshots the current input/controls. If the document is dirty, an AlertDialog must confirm replacement.
- A successful Enhance replaces the document, sets generated/current Markdown equal, clears dirty/stale and any
  prior library association, then attempts history according to the enabled preference.
- An expected validation failure or storage failure never removes the last valid document.
- Editor changes update only `markdown`, push the prior value onto a maximum 100-entry in-memory undo stack, and set
  dirty. Reset requires confirmation and restores `generatedMarkdown`. No draft is persisted.
- Opening a history record restores its original prompt, requested controls, and immutable generated Markdown; it
  does not create history. Opening a library prompt restores its editable Markdown and `libraryPromptId`; Save then
  updates that item.
- Query entry points are ``/?history=${recordId}`` and ``/?library=${promptId}``, validated and consumed after mount
  like presets.

### Result/editor action semantics

| Action | Exact behavior |
|---|---|
| Result | Show selectable raw current Markdown in a read-only textarea |
| Preview | Render current Markdown through the secure shared preview |
| Edit | Enter inline editor mode with editor and live preview side by side; small widths may stack until Phase 6 adds phone tabs |
| Copy | `navigator.clipboard.writeText(document.markdown)` directly from the click; announce success only after resolve |
| Save | Phase 5 create/update of the current independent library snapshot; no in-memory success state masquerades as durable save |
| Export | UTF-8 `text/markdown` Blob of current Markdown; filename from saved title or `enhanced-prompt-YYYY-MM-DD-HHmm.md`; report “Download requested” |
| Undo | Pop one in-memory editor revision; disabled at the beginning of the stack |
| Reset | After confirmation, restore `generatedMarkdown` and clear the editor revision stack |
| Fullscreen | Use the existing Dialog primitive with the same controlled Markdown value, not a second editor state |

Toolbar transforms preserve selection/focus and use these exact forms: `## heading`, `**bold**`, `_italic_`, `- item`,
`1. item`, inline backticks for a single line/fenced code for multiline, and `[label](https://)` for links.

### Small preference contract

Add these non-layout, localStorage-persisted keys to the existing system:

```ts
default_enhancement_level: EnhancementLevel; // "standard"
default_prompt_sections: string; // canonical comma-separated SectionId values
history_enabled: "true" | "false"; // "true"
```

`default_prompt_sections` is a serialized storage/DOM value. A parser filters unknown/duplicate IDs, preserves the
five-control display order, forces Objective on, and falls back to `DEFAULT_SECTIONS` when invalid. The boot script
stamps `data-default-enhancement-level`, `data-default-prompt-sections`, and `data-history-enabled`; the provider
reads/validates them into typed Zustand state. Control code follows the canonical three-step pattern: update the
store, apply the DOM attribute, then call `persistPreference`. Prompt records never enter this store.

### Durable record contract

```ts
export type HistoryRecord = {
  id: string;
  createdAt: number;
  originalPrompt: string;
  enhancedPrompt: string; // generated snapshot, never later edits
  requestedTaskType: "auto" | PromptTaskType;
  taskType: PromptTaskType;
  category: PromptCategory;
  level: EnhancementLevel;
  sectionIds: SectionId[];
  presetId: PromptPresetId | null;
};

export type SavedPrompt = {
  id: string;
  sourceHistoryId: string | null;
  createdAt: number;
  updatedAt: number;
  title: string;
  originalPrompt: string;
  enhancedPrompt: string; // current explicitly saved Markdown
  requestedTaskType: "auto" | PromptTaskType;
  taskType: PromptTaskType;
  category: PromptCategory;
  level: EnhancementLevel;
  sectionIds: SectionId[];
  presetId: PromptPresetId | null;
  favorite: boolean;
  folderId: string | null;
  tags: string[];
};

export type FolderRecord = {
  id: string;
  name: string;
  nameKey: string;
  createdAt: number;
  updatedAt: number;
};

export type SavedPromptChanges = Partial<
  Pick<SavedPrompt, "title" | "enhancedPrompt" | "favorite" | "folderId" | "tags">
> & { updatedAt: number };

export type MemoryExportData = {
  history: HistoryRecord[];
  prompts: SavedPrompt[];
  folders: FolderRecord[];
};
```

IDs use `crypto.randomUUID()` in client action/repository code; timestamps are epoch milliseconds from `Date.now()`
outside the pure engine. Store no full `PromptAnalysis`: history preserves the generated snapshot and resolved/user
controls without coupling durable data to classifier internals.

Title/folder/tag rules:

- New title: first 80 characters of collapsed `originalPrompt`, with `Untitled Prompt` fallback.
- Titles are trimmed and limited to 120 characters; duplicate titles are allowed.
- One optional non-nested folder per saved prompt. Folder names are trimmed, limited to 80 characters, and unique by
  lowercase `nameKey`.
- Tags are trimmed, lowercase, unique, at most 20 per prompt, and at most 40 characters each.
- Duplicate copies content, controls, folder, tags, and history provenance; receives a new ID/timestamps, title
  ``${originalTitle} Copy`` truncated to the 120-character title limit, and `favorite: false`.
- Folder deletion unassigns prompts in the same transaction; it never cascades content deletion.

### Dexie v1 schema and repository

Database name: `prompt-enhancer`. Version: integer `1`. Table declaration strings:

```ts
history: "&id, createdAt, taskType, category, level"
prompts: "&id, updatedAt, createdAt, folderId, *tags, taskType, category, level, sourceHistoryId"
folders: "&id, &nameKey, updatedAt"
```

Do not index prompt/Markdown bodies, nullable preset IDs, or the boolean favourite flag. Search/favourite filtering is
in memory over the modest local library result after an indexed ordered read. Multi-tag queries normalize input and
use AND semantics; multi-entry results call `distinct()` when applicable.

```ts
export type MemoryRepository = {
  addHistoryAndPrune(record: HistoryRecord, limit: 500): Promise<void>;
  getHistory(id: string): Promise<HistoryRecord | undefined>;
  listHistory(): Promise<readonly HistoryRecord[]>;
  deleteHistory(id: string): Promise<void>;
  clearHistory(): Promise<void>;

  createPrompt(record: SavedPrompt): Promise<void>;
  updatePrompt(id: string, changes: SavedPromptChanges): Promise<SavedPrompt>;
  getPrompt(id: string): Promise<SavedPrompt | undefined>;
  listPrompts(): Promise<readonly SavedPrompt[]>;
  duplicatePrompt(id: string): Promise<SavedPrompt>;
  deletePrompt(id: string): Promise<void>;
  promoteHistory(id: string): Promise<SavedPrompt>;

  createFolder(record: FolderRecord): Promise<void>;
  renameFolder(id: string, name: string): Promise<void>;
  listFolders(): Promise<readonly FolderRecord[]>;
  deleteFolderAndUnassign(id: string): Promise<void>;

  exportSnapshot(): Promise<MemoryExportData>;
};
```

Transaction boundaries:

- `addHistoryAndPrune`: insert and oldest-first excess deletion in one `history` transaction.
- `promoteHistory`: read history and add the independent prompt in one `history + prompts` transaction.
- `updatePrompt`: read/merge/put in one `prompts` transaction.
- `deleteFolderAndUnassign`: delete folder and null matching prompt `folderId` values in one `folders + prompts`
  transaction.
- `exportSnapshot`: read all three tables in one read transaction; Blob/download work happens after commit.
- No Clipboard, download, engine, timer, or unrelated async call occurs inside a Dexie transaction.

Storage state is `loading | ready | unavailable`. Normalize Missing API, blocked/upgrade, quota (direct or nested in
`AbortError`), write, and unknown failures. A blocked/versionchange event closes the old connection, stops writes,
and asks the user to reload. Never delete/recreate the database automatically.

### History and library query semantics

- History sorts newest first and groups timestamps using the browser's current local timezone into Today, Yesterday,
  then localized calendar dates.
- All successful explicit enhancements are retained, including identical prompts. History does not deduplicate.
- Category standing views are filters over `SavedPrompt.category`; they are never inserted as folders.
- Library search is case-insensitive substring matching across title, original prompt, enhanced Markdown, and tags.
- Filters are favourite, category, task type, level, one folder/Unfiled, and selected tags (AND). Default sort is
  `updatedAt` descending; alternatives are created descending and title ascending.
- Open uses the query handoff to the workspace. Library metadata changes persist immediately; Markdown persists only
  on explicit Save.
- Last-write-wins is accepted for same-prompt edits across tabs in v1. Dexie live queries keep lists current; revision
  conflict UX is deferred.

### Export envelope and local-only disclosure

```ts
export type PromptEnhancerBackupV1 = {
  format: "prompt-enhancer-backup";
  version: 1;
  exportedAt: string;
  data: MemoryExportData;
};
```

Export name is `prompt-enhancer-backup-YYYY-MM-DD.json`; MIME is `application/json;charset=utf-8`; output is pretty
printed with two spaces. The UI says that data stays in this browser, is not encrypted/account-backed, can be lost
if site data is cleared, and that the downloaded JSON contains prompt content. Export is user initiated. Import and
validation of incoming files remain Phase 6.

### Markdown and browser-action security

- Render `<Markdown remarkPlugins={[[remarkGfm, { singleTilde: false }]]} skipHtml>` and never add `rehype-raw` or
  `dangerouslySetInnerHTML`.
- Preserve React Markdown's default URL transform. Custom link rendering adds `rel="noopener noreferrer"` to
  external new-tab links. Fragment links remain local.
- Replace image rendering with accessible alt text/link text; never emit an `<img>` request from preview.
- Treat code as text only; no execution or syntax plugin is needed.
- Call Clipboard only in the button handler, feature-detect it, await it, and expose the read-only raw Markdown as
  the manual-copy fallback. Do not use deprecated `execCommand("copy")`.
- Use `Blob`, `URL.createObjectURL`, a temporary download anchor, then `URL.revokeObjectURL`; do not claim the browser
  actually saved the file.
- Never put prompt content in console logs, diagnostics, error toasts, or analytics. No feature sends prompts over
  the network.

## Files and responsibilities

### Create

- `src/lib/preferences/prompt-preferences.ts` — allowed values, defaults, section serialization/validation, and DOM
  apply helpers for the three small prompt preferences.
- `src/lib/prompt-presets.ts` — authoritative typed 17-preset catalogue and lookup.
- `src/lib/browser-actions.client.ts` — Clipboard and Blob download helpers shared by workspace and backup export.
- `src/components/markdown/markdown-preview.tsx` — secure React Markdown rendering policy.
- `src/components/markdown/markdown-editor-utils.ts` — pure selection transforms and counts.
- `src/components/markdown/markdown-editor.tsx` — controlled editor, toolbar, fullscreen, undo/reset, counts, preview.
- `src/app/(main)/_components/workspace-state.ts` — workspace types, reducer, and exact transitions.
- `src/app/(main)/_components/prompt-input-panel.tsx` — prompt/type/level/section controls and validation UI.
- `src/app/(main)/_components/result-panel.tsx` — Result/Preview/Edit modes and Copy/Save/Export status UI.
- `src/app/(main)/_components/enhancer-workspace.tsx` — engine/action orchestration and query handoffs.
- `src/app/(main)/presets/_components/preset-gallery.tsx` — grouped preset cards and navigation.
- `src/lib/browser-memory/types.ts` — durable records, query/change/export types, and normalized error codes.
- `src/lib/browser-memory/database.client.ts` — lazy Dexie class/instance, v1 stores, blocked/versionchange handling.
- `src/lib/browser-memory/record-utils.ts` — pure title/tag/folder normalization and library filtering/sorting.
- `src/lib/browser-memory/repository.client.ts` — transactions and CRUD contract.
- `src/lib/browser-memory/export.client.ts` — V1 envelope serialization and JSON download request.
- `src/app/(main)/_components/memory-provider.tsx` — mounted open/status/repository context.
- `src/app/(main)/_components/memory-error-boundary.tsx` — safe `useLiveQuery` failure UI.
- `src/app/(main)/history/_components/history-screen.tsx` — live grouped history, toggle, actions, retention notice,
  Clear History, and backup export.
- `src/app/(main)/library/_components/library-screen.tsx` — standing views, search/filter/sort, prompt/folder actions.
- `src/app/(main)/library/_components/library-metadata-dialog.tsx` — rename/folder/tag editing with validation.
- `src/scripts/verify-product-cases.ts` — pure preset/preference/editor/record/export fixtures.
- `src/scripts/verify-product.ts` — dependency-free `node:assert/strict` product-contract runner.

### Modify

- `src/app/(main)/page.tsx` — static Enhance shell and client workspace.
- `src/app/(main)/presets/page.tsx` — preset gallery shell.
- `src/app/(main)/history/page.tsx` — static History shell, memory boundary, and client screen.
- `src/app/(main)/library/page.tsx` — static Library shell, memory boundary, and client screen.
- `src/app/(main)/layout.tsx` — wrap enhancer children in the client memory provider without dynamic APIs.
- `src/lib/preferences/preferences-config.ts` — three typed defaults and localStorage modes.
- `src/scripts/theme-boot.tsx` — read, validate/fallback, and stamp three new data attributes before hydration.
- `src/stores/preferences/preferences-store.ts` — typed prompt-default/history state and setters.
- `src/stores/preferences/preferences-provider.tsx` — read new DOM attributes and synchronize typed values.
- `src/app/layout.tsx` — render static default attributes and pass defaults into the provider.
- `package.json` — add `verify:product`; no dependency changes.
- `docs/ANALYSIS - PROMPT ENHANCER/00 - START HERE.md` — record preset count/mapping and release/safety decisions.
- `docs/ANALYSIS - PROMPT ENHANCER/02 - DOCUMENT FINDINGS.md` — resolve relevant Phase 4/5 questions and conflicts.
- `docs/ANALYSIS - PROMPT ENHANCER/07 - DEVELOPMENT ROADMAP.md` — correct 17, combined release note, safeguards.
- `docs/ANALYSIS - PROMPT ENHANCER/08 - ROADMAP TRACKER.md` — update R-12 through R-19 only after acceptance.
- `docs/ANALYSIS - PROMPT ENHANCER/09 - TASK TRACKER.md` — update T-24 through T-39 and count wording.
- `docs/ANALYSIS - PROMPT ENHANCER/13 - REVISION LOG.md` — append implementation/provenance record.

### Explicitly unchanged

- `src/app/(template)/**`
- `src/navigation/sidebar/sidebar-items.ts`
- `src/components/ui/**`
- `src/prompt-engine/**` during this plan
- `src/app/(main)/settings/page.tsx`
- `next.config.mjs`, package lock, database/server/proxy code, theme preset generated block, and material source files
- Existing plan files under `.opencode/plans/**`

## Ordered implementation tasks

### Task 0: Accept the Phase 3 dependency and isolate execution

**Dependencies:** none. **Blocks:** every implementation task.

- [ ] **Step 0.1: Preserve and report the original working tree**

  Run `git status --short --branch`, `git diff --name-only`, and `git log --oneline -10`. Record all pre-existing
  paths. Do not stage, stash, restore, clean, or commit them as part of this plan.

- [ ] **Step 0.2: Require a clean committed Phase 3 boundary**

  The committed `63686b7` facade must first receive the exact manual-type/section/resolved-result contract through an
  upstream Phase 3 follow-up, with cases committed and accepted. Stop if that follow-up is absent, uncommitted, or
  mixed with this plan.

- [ ] **Step 0.3: Verify the public override contract**

  Inspect only the public barrel and its cases. Confirm all semantics under “Phase 3 dependency contract,” including
  manual type, explicit sections, truthful classifier analysis, resolved controls, no caller mutation, blank input,
  and public exports. Do not work around a missing item in UI code.

- [ ] **Step 0.4: Run the upstream gates**

  ```powershell
  npm run verify:engine
  npx tsc -p tsconfig.engine.json --noEmit
  npx tsc -p tsconfig.scripts.json --noEmit
  rg -n "from ['\"](react|next|@/)" src/prompt-engine
  rg -n "\b(window|document|localStorage|sessionStorage|navigator|indexedDB|Math\.random|Date\.now|toLocaleLowerCase|toLocaleUpperCase)\b" src/prompt-engine
  ```

  Expected: both TypeScript commands exit zero; engine verification reports all checks passing; both ripgrep purity
  commands return no matches. Any failure blocks this plan.

- [ ] **Step 0.5: Create an isolated execution worktree**

  Use `using-git-worktrees` from the accepted Phase 3 commit. Re-run `git status --short --branch` there and require a
  clean task baseline. Set `$env:PHASE45_BASE_SHA = git rev-parse HEAD`, record that full SHA in the execution log,
  and use the same value for every final scope diff.

**Verification:** accepted Phase 3 SHA, clean isolated status, exact engine command outputs, and public contract case
names are recorded.

### Task 1: Add typed prompt preferences, presets, and pure product verification

**Dependencies:** Task 0. **Delivers:** preference defaults, authoritative catalogue, reusable verification seam.

- [ ] **Step 1.1: Write failing pure cases**

  Add `verify-product-cases.ts` fixtures for: three preference defaults; valid/invalid/duplicate section parsing; 17
  unique preset IDs; group counts 8/3/3/3; the exact mapping table above; every preset at Standard; every preset's
  sections equal its mapped recipe's standard list; and Bug Fix's exact configuration.

- [ ] **Step 1.2: Add the assertion runner and script**

  Add `verify-product.ts` with deterministic two-run checks and per-section/all-pass output matching the existing
  engine harness style. Add `"verify:product": "ts-node -P tsconfig.scripts.json src/scripts/verify-product.ts"`.
  Run it and expect failure because the preference/preset modules do not exist.

- [ ] **Step 1.3: Implement prompt preference values and serialization**

  Create `prompt-preferences.ts` with the exact default values, five exposed section IDs/display order, canonical
  serialization, safe parsing/fallback, history boolean conversion, and DOM apply helpers. Objective is always
  restored when malformed storage omits it.

- [ ] **Step 1.4: Extend all preference layers**

  Add the three keys/defaults/localStorage modes to config; static root attributes; boot-script read/fallback/stamp;
  typed store fields/setters; provider props and DOM parsing. Keep the root layout static and keep prompt content out
  of preferences.

- [ ] **Step 1.5: Implement the 17-preset catalogue**

  Create the exact typed catalogue and lookup. Use committed recipe-standard section lists, and use `satisfies` so an
  unknown task/category/section fails TypeScript. React-free modules exercised by the Node harness use relative
  runtime imports because this repository's `ts-node` command does not register the `@/*` path alias.

- [ ] **Step 1.6: Make pure checks pass**

  Run `npm run verify:product`, both script/app TypeScript through `npx tsc -p tsconfig.scripts.json --noEmit` and
  `npm run build`, then scoped Biome on Task 1 paths. Expected: all cases pass, build succeeds, no lockfile diff.

- [ ] **Step 1.7: Commit the foundation**

  Stage only Task 1 paths and commit `feat: add prompt preferences and presets`. Inspect the committed file list and
  ensure the pre-commit theme generator produced no unrelated diff.

### Task 2: Build the secure Markdown preview and editor

**Dependencies:** Task 1. **Delivers:** shared current-Markdown editing surface.

- [ ] **Step 2.1: Add failing editor utility cases**

  Cover exact heading/bold/italic/list/code/link transformations, selection preservation, word/character counts,
  empty selections, multiline fenced code, and Unicode content in the product harness.

- [ ] **Step 2.2: Implement pure editor transforms**

  Create `markdown-editor-utils.ts`; functions accept `{ value, selectionStart, selectionEnd }` and return the next
  value/selection without reading the DOM. Make the new utility cases pass.

- [ ] **Step 2.3: Implement the secure preview**

  Add React Markdown + remark-gfm with `singleTilde: false`, explicit `skipHtml`, default URL transformation, safe
  external-link attributes, and an image component that emits alt text without a request. Add no raw-HTML plugin.

- [ ] **Step 2.4: Implement the controlled editor**

  Use one `value/onChange`; toolbar buttons apply the pure transforms and restore focus/selection. Add a 100-revision
  undo stack, AlertDialog reset, Dialog fullscreen, live preview, and announced counts/status. Native typing and
  toolbar operations update the same revision model.

- [ ] **Step 2.5: Verify security and accessibility manually**

  Render script/event-handler HTML, `javascript:`/`file:` links, an external image, GFM table/task list, Unicode,
  keyboard-only toolbar use, Dialog focus return, and 200% zoom. Expected: no code runs, no image request occurs,
  unsafe links are inert, and controls remain labelled/reachable.

- [ ] **Step 2.6: Verify and commit**

  Run product checks, build, and scoped Biome. Commit only Task 2 paths as `feat: add markdown editor and preview`.

### Task 3: Build the Phase 4 Enhance workspace

**Dependencies:** Tasks 1-2. **Delivers:** input, engine flow, result/preview/edit, Copy and Markdown Export.

- [ ] **Step 3.1: Add reducer fixtures before UI orchestration**

  Extend pure cases for: initial defaults; input-only updates; controls mark an existing document stale; preset/manual
  provenance; enhancement success replacement; editor dirty/undo/reset; failed enhancement preserves the previous
  document; open-history/open-library transitions; and Save association reset on a new Enhance.

- [ ] **Step 3.2: Implement the pure workspace reducer**

  Create exact types/transitions from this plan. Reducer actions carry completed engine/storage results; the reducer
  itself calls no engine, storage, Clipboard, clock, random, or browser API.

- [ ] **Step 3.3: Build the input panel**

  Use labelled Textarea/Select/Checkbox/Button controls. Load typed defaults only after preference synchronization,
  persist only manual level/section default changes, keep Objective selected, show stale/validation status, and show
  detected/resolved classification without claiming false confidence.

- [ ] **Step 3.4: Build the result panel**

  Add Result/Preview tabs, inline Edit mode, Copy, Save slot, and Export. Save remains wired to an explicit unavailable
  status inside this internal milestone and cannot show success. Copy uses the direct click path and manual fallback;
  Markdown download revokes its object URL.

- [ ] **Step 3.5: Orchestrate explicit Enhance**

  Validate trimmed non-empty input, confirm replacement of dirty work, snapshot controls, call only `enhancePrompt`,
  create a UUID `runId`, and dispatch success. Control changes never call the engine. Engine exceptions produce a
  generic local error without logging prompt text.

- [ ] **Step 3.6: Replace the home placeholder**

  Keep `page.tsx` a static server shell and render the client workspace below the heading/description. Do not accept
  server `searchParams`; query handoffs are consumed after mount inside the client controller.

- [ ] **Step 3.7: Verify Phase 4 core**

  Exercise empty input, auto/General fallback, manual type override, all levels, all five section controls, stale
  control changes, dirty replacement confirmation, Result/Preview/Edit, all toolbar controls, Copy success/denial,
  and Unicode Markdown export. Run engine/product checks, TypeScript, build, static-route inspection, and scoped
  Biome.

- [ ] **Step 3.8: Commit the workspace**

  Commit only Task 3 paths as `feat: build prompt enhancement workspace`.

### Task 4: Build and integrate the 17-preset gallery

**Dependencies:** Tasks 1 and 3. **Delivers:** R-14/T-27/T-28.

- [ ] **Step 4.1: Build grouped preset cards**

  Render Development, Writing, Research, and Design in source order with the exact 17 labels, mapped type, and
  Standard badge. Use semantic headings and one keyboard-activatable action per card.

- [ ] **Step 4.2: Implement static-safe navigation/handoff**

  Navigate to ``/?preset=${presetId}``. On mounted workspace load, validate the ID, apply all controls without persisting them
  as defaults, clear the consumed query, and focus the prompt textarea. Invalid IDs show a non-destructive message
  and retain normal defaults.

- [ ] **Step 4.3: Verify every mapping**

  Walk all 17 cards. For Bug Fix, record Development / Bug Fix / Standard / objective+requirements+verification and
  successful navigation. Change one control and confirm preset provenance clears and no regeneration occurs.

- [ ] **Step 4.4: Verify and commit**

  Run product checks, build/static-route inspection, and scoped Biome. Commit as `feat: add starter prompt presets`.

### Task 5: Establish Dexie v1, repository transactions, and memory status

**Dependencies:** Task 1; may run in parallel with Tasks 2-4 if file ownership is isolated. **Delivers:**
R-16 storage foundation.

- [ ] **Step 5.1: Add failing pure memory-contract cases**

  Cover title fallback/truncation, folder `nameKey`, tag normalization/limits/deduplication, duplicate semantics,
  case-insensitive library search, AND tags, standing category/favourite/folder filters, three sorts, and exact V1
  export-envelope shape/order-independent validation.

- [ ] **Step 5.2: Define durable types and pure record/query helpers**

  Implement the exact types and rules in this plan. Keep these modules free of Dexie/browser APIs so the product
  harness can import them. Make their cases pass.

- [ ] **Step 5.3: Implement lazy Dexie v1**

  Define the three exact store strings and table types. Construct/open the database only from a post-mount provider
  path. Register blocked/versionchange handling; never open at module evaluation and never delete/recreate on error.

- [ ] **Step 5.4: Implement the repository and error normalization**

  Add every declared method and transaction boundary. Detect direct/nested quota errors, Missing API, blocked/upgrade,
  write, and unknown errors without including prompt content. Commit success resolves only after Dexie commits.

- [ ] **Step 5.5: Implement memory provider and boundary**

  Expose `loading | ready | unavailable`, repository, and safe retry/reload guidance. Wrap `(main)` children without
  adding a dynamic API. Use deterministic loading placeholders so static prerender and first hydration match.

- [ ] **Step 5.6: Verify actual IndexedDB manually**

  In a clean browser profile, confirm v1 table/index creation, CRUD round-trip/reload, same-origin second-tab live
  updates, blocked/versionchange messaging, disabled IndexedDB, private mode, a forced write rejection, and no
  server-render access. Record browser/version and results.

- [ ] **Step 5.7: Verify and commit**

  Run product checks, `npm run build`, inspect static routes, and scoped Biome. Commit only Task 5 paths as
  `feat: add browser memory repository`.

### Task 6: Wire automatic history, deliberate Save, preferences, retention, and backup export

**Dependencies:** Tasks 3 and 5. **Delivers:** workspace-memory lifecycle and pulled-forward safeguards.

- [ ] **Step 6.1: Add action-level fixture coverage**

  Extend pure reducer/record cases for history enabled/disabled, exactly one record per explicit Enhance, generated
  rather than edited history content, first Save create, repeated Save update, new Enhance clears association,
  failed history leaves Save possible, and failed Save never reports saved.

- [ ] **Step 6.2: Add automatic history after successful Enhance**

  Create the record outside the engine with UUID/time, show the result immediately, then call
  `addHistoryAndPrune(record, 500)` when enabled. Attach `historyId` only when the current `runId` still matches. On
  failure, keep all ephemeral actions working and announce `Not added to history`.

- [ ] **Step 6.3: Add deliberate create/update Save**

  Disable Save only while a history write needed for provenance is pending. First Save creates an independent prompt;
  later Save updates the associated prompt's Markdown/metadata and `updatedAt`. If history failed/was disabled, Save
  uses `sourceHistoryId: null`. Dispatch saved state only after commit.

- [ ] **Step 6.4: Add history preference and disclosure**

  Show `History on/off` and concise local-only wording in the workspace. Toggle through store + DOM + persistence.
  Turning history off affects future Enhances only; it never deletes existing records.

- [ ] **Step 6.5: Implement snapshot export**

  Read all tables in one transaction, serialize the exact V1 envelope, and request the exact JSON filename outside
  the transaction. Confirm the export warning states that the file contains prompts and is not encrypted. Add no
  import path.

- [ ] **Step 6.6: Verify lifecycle/failure paths and commit**

  Manually verify enabled/disabled history, rapid repeated Enhance clicks, Save during/after failed history, repeated
  Save, reload, record 501 pruning only history, quota/open/write errors, and JSON contents. Run all automated gates
  and commit as `feat: connect workspace memory`.

### Task 7: Build the History screen and safeguards

**Dependencies:** Tasks 5-6. **Delivers:** R-17/T-33/T-34 plus minimum erase/export controls.

- [ ] **Step 7.1: Render live grouped history**

  Use `useLiveQuery` with a non-empty loading sentinel and error boundary. Sort newest first and group by browser-local
  Today/Yesterday/date headings. Show collapsed prompt summary, resolved type, level, and local time.

- [ ] **Step 7.2: Implement record actions**

  Open navigates through ``/?history=${record.id}``; Copy awaits Clipboard; Save to Library uses `promoteHistory`;
  Delete uses
  AlertDialog and affects history only. Every durable action has pending/confirmed/failed feedback.

- [ ] **Step 7.3: Add history controls**

  Add enabled toggle/disclosure, fixed `Newest 500 entries` retention copy, Clear History confirmation, and Export
  Local Data. Empty/loading/unavailable states remain distinct.

- [ ] **Step 7.4: Verify isolation and accessibility**

  Save one history record to Library, then delete/clear history and prove the library item remains byte-identical.
  Verify keyboard menus/dialogs, focus return, announced errors, same-tab/second-tab live updates, reload, and local-day
  grouping around midnight/timezone changes.

- [ ] **Step 7.5: Verify and commit**

  Run product/engine checks, build/static output, scoped Biome, and commit as `feat: add automatic prompt history`.

### Task 8: Build the Library screen, folders, tags, and filters

**Dependencies:** Tasks 5-7. **Delivers:** R-18/R-19 and T-35 through T-39.

- [ ] **Step 8.1: Build live library views**

  Add All Prompts, Favourites, and four category filters; search; task/level/folder/tag filters; three sorts; loading,
  empty, and unavailable states. Use the pure query functions so UI and harness semantics are identical.

- [ ] **Step 8.2: Implement prompt actions**

  Rename validates 1-120 characters; Duplicate applies exact copy semantics; Favourite uses an accessible pressed
  state; Open/Edit uses ``/?library=${prompt.id}``; Delete confirms and affects prompts only. Copy can reuse Clipboard
  feedback.

- [ ] **Step 8.3: Implement one-level folders**

  Create/rename with trimmed case-insensitive uniqueness; assign one folder/Unfiled; delete and atomically unassign.
  Show a conflict message for duplicate `nameKey`; never cascade-delete prompts.

- [ ] **Step 8.4: Implement tags**

  Add/remove normalized tags with 20-per-prompt and 40-character limits. Render removable labelled chips and AND
  filtering. Do not create a tags table.

- [ ] **Step 8.5: Verify the full library contract**

  Save, find by each searchable field, rename, duplicate, favourite, open/edit/save, delete, filter every standing
  view, combine filters, assign/unassign/delete folder, add duplicate/mixed-case tags, reload, and verify history is
  unchanged. Seed 1,000 prompts and require each search/filter update to render within 200 ms in the baseline current
  stable Chrome profile; record the measured result rather than adding speculative indexes.

- [ ] **Step 8.6: Verify and commit**

  Run all gates and commit as `feat: add saved prompt library`.

### Task 9: Reconcile documentation and perform combined release acceptance

**Dependencies:** Tasks 1-8. **Delivers:** evidence-backed completion; does not deploy.

- [ ] **Step 9.1: Run complete automated verification**

  ```powershell
  npm run verify:engine
  npm run verify:product
  npx tsc -p tsconfig.engine.json --noEmit
  npx tsc -p tsconfig.scripts.json --noEmit
  npx biome check "src/app/layout.tsx" "src/app/(main)" "src/components/markdown" "src/lib/browser-actions.client.ts" "src/lib/browser-memory" "src/lib/preferences/preferences-config.ts" "src/lib/preferences/prompt-preferences.ts" "src/lib/prompt-presets.ts" "src/scripts/theme-boot.tsx" "src/scripts/verify-product-cases.ts" "src/scripts/verify-product.ts" "src/stores/preferences" "package.json"
  npm run build
  ```

  Expected: all assertions pass; both TypeScript commands exit zero; scoped Biome reports no errors; build succeeds;
  build output marks `/`, `/presets`, `/history`, and `/library` static.

- [ ] **Step 9.2: Run purity/freeze/diff gates**

  ```powershell
  if (-not $env:PHASE45_BASE_SHA) { throw "Set PHASE45_BASE_SHA to the full SHA recorded in Task 0" }
  git cat-file -e "$env:PHASE45_BASE_SHA^{commit}"
  rg -n "from ['\"](react|next|@/)" src/prompt-engine
  rg -n "\b(window|document|localStorage|sessionStorage|navigator|indexedDB|Math\.random|Date\.now|toLocaleLowerCase|toLocaleUpperCase)\b" src/prompt-engine
  git diff --exit-code $env:PHASE45_BASE_SHA -- "src/app/(template)"
  git diff --name-only $env:PHASE45_BASE_SHA -- "src/components/ui" "next.config.mjs" "package-lock.json"
  ```

  Expected: no engine impurity matches; frozen subtree diff exits zero; the unchanged-path audit prints nothing.

- [ ] **Step 9.3: Execute the combined browser acceptance matrix**

  Use localhost for the full functional matrix, then repeat secure-context Clipboard/download/storage checks on the
  intended HTTPS deployment preview. Record browser/version for current stable Chrome, Edge, Firefox, and Safari
  desktop: all 17 presets; full workspace/editor; malicious Markdown; Clipboard denial; Markdown/JSON
  downloads; enabled/disabled history; 501 retention; all history/library/folder/tag actions; reload; two tabs;
  blocked/unavailable/quota/write failures; keyboard-only flow; screen-reader announcements; 200% zoom; and direct
  route loads. Prompt content must not appear in network requests or diagnostics.

- [ ] **Step 9.4: Confirm release prerequisites outside code**

  Confirm the eventual production origin/protocol is stable and HTTPS before users rely on IndexedDB. Confirm support
  wording explains browser-local, best-effort, non-encrypted storage and the JSON escape hatch. This plan does not
  perform deployment.

- [ ] **Step 9.5: Reconcile authoritative documentation**

  Record the seven approved decisions, correct 18 to 17, explain closest-type mappings, record the combined release
  boundary and pulled-forward safeguards, mark R-12..R-19 and T-24..T-39 complete only after all gates pass, update
  counts, and append revision provenance. Do not edit the material source.

- [ ] **Step 9.6: Verify documentation and commit**

  Search for stale direct claims about 18 presets, unresolved Phase 4 Save, and “nothing could hold Phase 5 up.”
  Confirm tracker counts match rows. Commit only documentation as `docs: record workspace and memory completion`.

- [ ] **Step 9.7: Final audit without release**

  Inspect `git status`, diff, staged/committed file lists, and recent log. Report exact SHAs and verification evidence.
  Do not push, tag, release, deploy, or begin Phase 6 without separate authorization.

## Verification matrix

| Area | Required evidence |
|---|---|
| Engine dependency | Accepted override/sections cases; engine harness; DOM-free TypeScript; zero impurity hits |
| Pure product contracts | Preset, preference, editor transform, reducer, normalization, filtering, export cases in `verify:product` |
| Static rendering | Production build and static markers for four routes; direct route loads; no browser API during prerender |
| Workspace | Empty/auto/manual/levels/sections/stale/dirty flows; result/preview/editor; all actions |
| Markdown security | Raw HTML, handlers, unsafe URLs, remote images, external links, GFM, code text |
| Presets | Exact 17 IDs, 8/3/3/3 groups, exact mappings, Bug Fix walkthrough, invalid query |
| Preferences | Boot fallback, reload defaults, manual persistence, preset non-persistence, history toggle |
| Dexie | Clean v1 creation, CRUD/reload, exact indexes, transaction rollback, two tabs, blocked/versionchange |
| History | Exactly-once explicit Enhance, disabled mode, immutable generated content, day groups, 500 cap, actions |
| Library | Create/update/open/edit/search/filter/sort/duplicate/favourite/folder/tag/delete; history isolation |
| Failure truthfulness | IndexedDB missing/open/quota/write, Clipboard denial, download request, current work retained |
| Safeguards | Clear history leaves library; V1 JSON includes all tables; local-only/no-encryption warning |
| Accessibility | Labels, keyboard completion, focus, `aria-pressed`, live status/errors, screen reader, 200% zoom |
| Boundaries | Frozen template unchanged; shadcn generated files unchanged; no lock/config drift; no prompt network/log data |

## Risks, mitigations, and stop conditions

| Risk | Likelihood | Impact | Mitigation / gate |
|---|---:|---:|---|
| Phase 4 starts against an unstable or insufficient Phase 3 facade | High | Critical | Task 0 clean commit + exact public contract + upstream cases; never import internals |
| Save appears successful without durable storage | Medium | Critical | Combined release; success only after Dexie commit; no temporary localStorage/in-memory Save |
| History and library lifecycles become coupled | Medium | Critical | Separate tables/records; independent snapshot; delete/prune isolation acceptance |
| First schema creates future migration/rollback debt | Medium | Critical | Explicit stable DB name/v1/minimal indexes; no speculative versions; additive future migrations |
| Rollback or DB error deletes browser data | Low | Critical | Never delete/recreate/downgrade; old Phase 4 ignores DB; unsupported writes stop |
| No Phase 6 backup leaves unrecoverable data | Medium | Critical | Pull forward V1 whole-collection JSON export and clear history; disclose limitations |
| Automatic history grows without bound | High | High | Atomic fixed newest-500 retention; clear history; library excluded |
| IndexedDB unavailable/quota/private mode causes false confidence | Medium | High | Explicit unavailable state; normalized errors; ephemeral workspace remains usable; browser matrix |
| Markdown executes content or leaks through images | Medium | Critical | `skipHtml`; default URL transform; no raw plugin; image suppression; malicious fixture matrix |
| Browser APIs break static prerender/hydration | Medium | High | Lazy provider after mount; event-handler Clipboard/download; deterministic live-query sentinel |
| Control changes overwrite edits or flood history | High | High | User-approved explicit Enhance only; dirty confirmation; one history record per click |
| Preset mapping expands engine taxonomy or drifts | Medium | Medium | Fixed 17 typed catalogue; closest-type table; recipe-derived sections; harness |
| Preference system is bypassed by a second settings blob | Medium | High | Three keys through all four existing layers; no product records in preferences |
| Folder/tag behavior loses or orphans prompts | Medium | High | One folder, normalized tags, transactional unassign, no cascade delete |
| Same-item edits in multiple tabs overwrite | Medium | Medium | Documented last-write-wins v1; atomic writes/live lists; conflict UI deferred |
| UI/storage regressions lack automated browser tests | High | High | Pure harness plus repeatable recorded multi-browser failure/transaction matrix; no false build-only claim |
| Original workspace changes are swept into commits | High | Critical | Accepted Phase 3 boundary; isolated worktree; literal staging and committed-file audits |

Stop and revise this plan if:

1. The Phase 3 facade cannot supply manual task and explicit section controls without changing frozen Phase 1 types
   in an unapproved way.
2. Execution begins with uncommitted Phase 3 source or without a clean isolated worktree.
3. Any implementation requires importing from or modifying `src/app/(template)/**`.
4. Any browser/static render opens Dexie or touches Clipboard/Blob during module evaluation/render.
5. Save/history reports success before transaction commit, silently falls back, or deletes/recreates on error.
6. History deletion/pruning, folder deletion, or library deletion removes data from another lifecycle.
7. Malicious Markdown executes, unsafe links navigate, or remote images make requests.
8. Normal release lacks the fixed retention, Clear History, JSON export, and local-only disclosure approved here.
9. A supported browser silently cannot persist or a rollback mutates/deletes the v1 database.
10. A required change falls outside the declared file map, adds a dependency/test framework, or expands into Phase 6
    import/settings/PWA/deployment work without a revised approved plan.

## Rollout

1. Treat Tasks 1-4 as the internal Phase 4 milestone and Tasks 5-8 as the internal Phase 5 milestone.
2. Do not publish the Phase 4 milestone alone. Save becomes user-visible and supported only in the combined build.
3. Before release, confirm stable HTTPS origin, complete all automated/manual gates, and export seeded data once.
4. Release code, schema v1, retention, Clear History, JSON export, failure UI, and disclosure together. Do not stage the
   safety slice across separate production releases.
5. Smoke-test clean profile, existing seeded profile, two tabs, reload, and one denied-storage profile after publish.
6. Keep the previous compatible build available, but do not auto-rollback on client storage errors; investigate and
   prefer a forward fix when schema/data compatibility is uncertain.
7. A release/tag/push/deployment requires a separate explicit request and is not performed by this plan.

## Rollback

- Before any production release, code commits are reversible in reverse task order with `git revert`; never use broad
  reset/clean/restore against the original dirty workspace.
- After Dexie v1 has opened for users, rollback means deploying the prior code while **leaving the
  `prompt-enhancer` database untouched**. Phase 4-only/older code must ignore it.
- Never downgrade, clear, delete, rename, or recreate the database as rollback behavior. Never make quota/open errors
  destructive.
- Because this plan creates only schema v1 and has no incoming database, there is no data migration to reverse.
Future versions must use additive expand/contract migrations and test the previous app against the upgraded DB.
- If an older/newer tab encounters an incompatible version, close the connection and require reload/read-only
  handling; do not write through uncertainty.
- After a forward fix or redeploy of the combined build, verify seeded IDs, timestamps, content, tags, favourites,
  and folders are unchanged and reappear.

## Execution status

**Status: blocked pending browser acceptance.** Implementation and automated/static verification were completed in the
isolated worktree `C:\Users\marka\AppData\Local\Temp\opencode\prompt-enhancer-phases-4-5` from base SHA `0a13895`.
The Phase 3 facade prerequisite was implemented and verified, followed by the Phase 4 workspace/presets/editor and
Phase 5 Dexie history/library/folders/tags/export implementation. Documentation was reconciled without changing the
material source.

Fresh evidence:

- `npm run verify:engine` — 46/46 passed.
- `npm run verify:product` — 6/6 passed.
- `npx tsc -p tsconfig.engine.json --noEmit`, `npx tsc -p tsconfig.scripts.json --noEmit`, and
  `npx tsc -p tsconfig.json --noEmit` — passed.
- Scoped Biome — 37 files checked, no fixes/errors.
- `npm run build` — passed; `/`, `/presets`, `/history`, and `/library` are static.
- Production HTTP smoke — all four target routes returned HTTP 200.
- Frozen `src/app/(template)`, `src/components/ui`, `next.config.mjs`, and `package-lock.json` audits — unchanged.

The remaining required gate is Step 9.3 and related manual browser checks: IndexedDB CRUD/reload/two-tab behavior,
failure modes, secure Markdown/Clipboard/download behavior, accessibility, and the full Chrome/Edge/Firefox/Safari
matrix. The current Windows environment exposes none of those browsers or a browser automation runner, so the plan is
not marked complete and R-12..R-19/T-24..T-39 remain in acceptance in the reconciled trackers.
- A destructive future migration without an exported backup has no safe rollback and is a stop condition, not a
  reason to reset the database.

## Execution log

| When | Entry |
|---|---|
| 2026-08-22 08:14 +08:00 | Drafted from `prompts/02.md`, all relevant analysis-vault documents, current source/Git/tooling state, prior plans, and read-only explorer/architect/research/risk reviews. User selected a combined Phase 4+5 release, the 17 named presets, closest-type mappings, normal-release safeguards, enabled-by-default disclosed history, an upstream Phase 3 gate, and explicit-Enhance regeneration. Daedalus ran the current working Phase 3 harness (44/44) and engine TypeScript gate only; no product code/config/test/deployment file was changed. Status remains draft pending explicit approval. |
| 2026-08-22 08:24 +08:00 | Self-review completed: mapped R-12..R-19 and T-24..T-39 to tasks, removed implementation placeholders, defined previously implicit types and dynamic baseline checks, reconciled release/safety decisions, and confirmed `git diff --check` for the plan. Status remains draft. |
| 2026-08-22 08:25 +08:00 | Refreshed after concurrent Phase 3 commit `63686b7`; reran the committed 44-check engine harness and engine TypeScript gate successfully, confirmed the facade still lacks manual type/section options, and changed the dependency baseline from stale working-tree evidence to an explicit follow-up contract SHA. |
| 2026-08-22 09:33 +08:00 | User explicitly approved implementation. Status changed to `ready`; execution begins in an isolated worktree. |
| 2026-08-22 09:37 +08:00 | Execution stopped at Task 0. Baseline `npm run verify:engine` passed all 44 checks; both engine and script TypeScript gates passed; `phase-3` resolves to `0a13895`. The required follow-up public facade contract is not present: `enhancePrompt` still accepts only `{ level? }` and returns only `{ analysis, markdown }`, with no manual task-type or explicit section controls. No product files were changed; npm-install’s worktree-only lockfile change was restored. Status changed to `blocked` pending the upstream Phase 3 contract. |
| 2026-08-22 09:48 +08:00 | User authorized implementing the missing Phase 3 facade contract as a prerequisite. In the isolated worktree, added test-first cases for manual task type, explicit de-duplicated sections, resolved controls, and caller-array immutability; implemented the minimal pure facade extension. Red run failed on the missing `resolved` contract; green run passed `verify-engine` 46/46, engine TypeScript, and script TypeScript. No commit was created. Status changed to `in-progress`; Phase 4 execution resumes. |

## Approval gate

This plan is **in progress**. The missing Phase 3 facade contract was implemented as an approved prerequisite in the
isolated worktree and verified; the remaining Phase 4/5 tasks are executing there.
