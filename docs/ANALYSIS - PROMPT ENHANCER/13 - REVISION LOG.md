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
