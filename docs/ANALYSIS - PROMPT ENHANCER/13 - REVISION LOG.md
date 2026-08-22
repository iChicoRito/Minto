# 13 - REVISION LOG

[[00 - START HERE|Back to start]] · Previous: [[10 - WORD LIST]]

**First entry:** 21 August 2026

## What changed

### 21 August 2026 — Work begins: Phase 1 built

The first revision of this run, and the first time any part of the plan was built rather than described. Phase 1 of the roadmap — foundations and the shape of the data — was implemented in the repository beside these notes, following the instructions in `prompts\00.md` and the approved plan kept at `.opencode\plans\2026-08-21-2125-phase-1-foundations-and-data-shapes.md`.

| What | How it went |
|---|---|
| Stack check — R-01, T-01, T-03 | Found already standing: the working files carry Next.js 16 App Router, TypeScript strict, Tailwind v4, shadcn/ui, zod, and lucide-react. Marked 🔵 rather than finished — the kit was here before the work started. |
| Helper packages — T-02 | Installed: dexie, dexie-react-hooks, react-markdown, remark-gfm. |
| App shell — R-02, T-04, T-05 | Sidebar navigation and page frame under `src/app/(main)/`; six placeholder pages at /, /presets, /library, /history, /settings, /about; the old root placeholder removed. Production build passes — 42 pages, all six routes static — and a live smoke test returned the right heading from every page. |
| Data shapes — R-03, T-06, T-07 | `src/prompt-engine/types.ts` written with zero imports, so the engine keeps apart from the interface as the rules demand. |
| Reference template | Untouched throughout — the diff gate across `src/app/(template)` stayed empty from first commit to last check. |

Checks run: biome clean on every path touched, production build green, smoke test live on a spare port, template gate empty.

**A correction to this vault's own notes.** These pages say an analysed prompt carries twelve fields. Counted properly, the shape written from the source material carries **eleven** — eight required and three optional (`action`, `subject`, `domain`). Twelve was a slip in the prose here, not a difference in the source material; the amended row is T-06 in [[09 - TASK TRACKER]]. The vocabulary counts were checked against the same lines and stand exact: five categories, thirteen task types, three strengths.

Trackers brought level with the code: [[08 - ROADMAP TRACKER]] and [[09 - TASK TRACKER]].

### 22 August 2026 — Phases 2 and 3 engine pipeline complete

The parser-to-Markdown milestone was implemented beside these notes, following the approved Phase 2–3 plan. The repository now contains the material-derived engine behavior plus the following explicitly authored additions: parser matching heuristics and domain-keyword rules; twelve signal-weight tables beyond the material's bug-fix table; nine recipes for the task types whose layouts the material does not list; the category mapping; the Light-strength polish heuristic; authored section content generation; and the Markdown generator and synchronous pipeline behavior. These additions are implementation decisions, not claims that the source material specified them.

The open points were reconciled without changing the later-phase boundary. Q-02 is settled by the margin × evidence-floor formula with `EVIDENCE_SATURATION = 7` and bands of ≥80 High, 60–79 Medium, and <60 Low. C-02 is retained as a printed-weight arithmetic erratum: the printed weights stand, and the implementation does not retune them to produce score 11. Q-03 is settled by the nine authored recipes. D4's engine tie behavior reports the low-confidence General fallback; the full conflict-display UI remains Phase 6 work. R-07 and T-15 therefore record the engine-side result only; the picker and message UI remain later scope.

Evidence from the completion pass: `npm run verify:engine` passed 44/44 twice with byte-identical output, and the required type-check, purity, scoped Biome, build, static-route, frozen-template, and preset-metadata checks passed as recorded in the execution log.

### 22 August 2026 — Phases 4 and 5 implementation pass

The combined workspace and browser-local memory implementation is now present in the isolated execution worktree. The
Phase 3 public facade was extended first with manual task-type/section controls and resolved output, then the workspace,
17-preset gallery, secure Markdown editor/preview, existing-preference prompt defaults, Dexie v1 history/library,
folders/tags, fixed newest-500 retention, Clear History, and collection JSON export were added. Save remains a durable
IndexedDB action rather than an in-memory success signal, and unavailable storage leaves the current workspace usable.

Fresh automated evidence from the acceptance pass:

| Check | Result |
|---|---|
| `npm run verify:engine` | 46/46 passed |
| `npm run verify:product` | 6/6 passed |
| Engine, scripts, and app TypeScript projects | Passed |
| Scoped Biome | 37 files checked, no fixes/errors |
| `npm run build` | Passed; `/`, `/presets`, `/history`, and `/library` static |
| Production HTTP smoke | `/`, `/presets`, `/history`, `/library` returned HTTP 200 |
| Frozen subtree/package-lock/config audit | No changes detected |

The four-browser IndexedDB/UI acceptance matrix was not claimed complete during the implementation pass because this
Windows execution environment exposed no Chrome, Edge, Firefox, Safari, or browser automation runner. User browser
verification was recorded in the follow-up entry below.

### 22 August 2026 — Phases 4 and 5 merged into local main

The implementation commit `1cf1528` (`feat: add workspace and browser memory`) was fast-forwarded into local `main`.
The merge preserved the pre-existing uncommitted plan and prompt files in the main working tree. Local `main` now
contains the Phase 1–5 implementation; the trackers now record Phase 4–5 as ✅ after the user's browser verification.
The broader four-browser matrix is not recorded. Nothing was pushed or deployed.

### 22 August 2026 — User browser verification recorded

The user confirmed that the combined Phase 4–5 flow works in their browser. The roadmap and task trackers therefore
promote R-12 through R-19 and T-24 through T-39 from 🟨 to ✅. This is user-reported browser smoke verification; a
complete Chrome/Edge/Firefox/Safari matrix remains unrecorded.

### 22 August 2026 — Phases 6 and 7 implementation and shipping pass

The control/trust and validation/shipping plan is implemented in local `main`. Settings now own prompt defaults,
sections, appearance, history limits, backup/restore, and destructive data controls. The app validates hard inputs,
reports classifier ambiguity without inventing certainty, exposes the local-only privacy promise, and switches the
Markdown editor to Edit/Preview tabs on phones. The release path stages only enhancer-owned source, exports fixed files,
injects a native revisioned service worker, and supports the `/prompt-enhancer` Pages base path.

| Check | Result |
|---|---|
| `npm run verify:engine` | 166/166 passed, including 120/120 authored dataset cases |
| `npm run verify:product` | 9/9 passed |
| `npm run verify:performance` | Latest p95 was `6.44 ms`; recorded runs stayed below 7 ms against the <100 ms target |
| TypeScript and scoped Biome | Passed |
| `npm run build` | Passed with the frozen template routes present |
| `npm run build:static` | Root and `/prompt-enhancer` artifacts passed route, asset, worker, and no-template checks |
| Static HTTP smoke | Exported routes, manifest, and worker returned HTTP 200 |
| User verification | User confirmed the current application works in a browser |

The Pages workflow is committed on `main`. Workflow run #1 passed engine, product, performance, type, purity, static
build, and artifact checks, then stopped at `Configure Pages` because the repository Pages API is not configured. A
complete cross-browser/offline device matrix and a successful live Pages run are not included in this repository; the
remaining R-28 action is owner-side Pages activation rather than a product-code gap.
