# 08 - ROADMAP TRACKER

[[00 - START HERE|Back to start]] · Previous: [[07 - DEVELOPMENT ROADMAP]] · Next: [[09 - TASK TRACKER]]

**Last checked:** 22 August 2026

## Where everything stands

| Status | How many |
|---|---|
| ✅ Finished | 10 |
| 🟨 Being worked on | 0 |
| ⭕ Not started | 17 |
| ❌ Blocked | 0 |
| 🔵 Already there | 1 |
| ⬜ Dropped | 0 |
| ❓ Unclear | 0 |
| **Total** | **28** |

Work began on 21 August 2026 — see [[13 - REVISION LOG]]. One item was found already standing in the working repository files, and nine more roadmap items were built and checked in Phase 2–3. Seventeen still wait their turn; UI, storage, and later phases remain unchanged.

## Phase 1 — Foundations and the shape of the data

| # | What gets built | Status | Notes |
|---|---|---|---|
| R-01 | Start the project from the recommended stack with the helper packages installed | 🔵 Already there | The stack itself pre-existed in the working files — Next.js 16 App Router, TypeScript strict, Tailwind v4, shadcn/ui, zod, lucide-react. Only the four helper packages had to be installed this pass. |
| R-02 | App shell: sidebar navigation and the six pages | ✅ Finished | Sidebar and frame under src/app/(main)/ plus six static placeholder pages; the old root placeholder removed. Production build and a live smoke test both passed. |
| R-03 | The data shapes: analysed prompt, five categories, thirteen task types, three strengths | ✅ Finished | Written to src/prompt-engine/types.ts with zero imports. One correction: the analysed-prompt shape carries eleven fields — eight required, three optional — not the twelve the prose claimed. |

## Phase 2 — Understanding what was asked

| # | What gets built | Status | Notes |
|---|---|---|---|
| R-04 | The prompt parser: actions, subjects, fields, technologies, limits, requirements | ✅ Finished | Parser complete, including authored matching heuristics and domain-keyword rules; provenance is recorded in the engine. |
| R-05 | The three controlled word lists, with room to grow | ✅ Finished | The 11 actions, 8 constraint triggers, and 14 technologies are housed in the engine and checked. |
| R-06 | The classifier on weighted scoring | ✅ Finished | Weighted classifier complete: the bug-fix table follows the material and 12 additional signal tables were authored. **D2/C-02:** C-02 is a printed-weight arithmetic erratum; weights were not retuned to reach 11. |
| R-07 | Confidence bands and the low-confidence fallback to General | ✅ Finished | **D1/Q-02 settled:** `confidence = round(min(margin, evidence))` with `EVIDENCE_SATURATION = 7`; ≥80 is High, 60–79 Medium, and <60 Low. **D4:** ties cap at 50%, yield Low and General fallback; full conflict display remains Phase 6. This is the engine-side result; the manual picker and low-confidence message UI remain later scope. |

## Phase 3 — Turning understanding into structure

| # | What gets built | Status | Notes |
|---|---|---|---|
| R-08 | The rule engine choosing headings per task type | ✅ Finished | **D3/Q-03 settled:** nine missing recipes were authored, provenance-marked, and validated alongside the four material recipes. |
| R-09 | Strength-dependent behaviour: light, standard, detailed | ✅ Finished | **D5:** strength sections are validated and merged without empty headings. **D6:** Light renders the polished sentence bare. **D7:** Light uses authored action/domain polish and the approved preservation clause. |
| R-10 | The template library and its resolver | ✅ Finished | The typed 13-recipe registry and resolver are complete; the nine beyond-material recipes are explicitly authored rather than presented as source material. |
| R-11 | The markdown generator, formatting kept apart from logic | ✅ Finished | Deterministic Markdown generation and the parser-to-generator pipeline are complete, including the approved bare Light output. |

## Phase 4 — The workspace people use

| # | What gets built | Status | Notes |
|---|---|---|---|
| R-12 | The Enhance page input panel | ⭕ Not started | |
| R-13 | The result side: two tabs, four actions | ⭕ Not started | |
| R-14 | Eighteen starter presets that pre-fill and jump to Enhance | ⭕ Not started | Preset-to-type mapping unclear — Q-01. |
| R-15 | The markdown editor with toolbar and live preview | ⭕ Not started | |

## Phase 5 — Giving the app a memory

| # | What gets built | Status | Notes |
|---|---|---|---|
| R-16 | The two stores: preference drawer and content store via Dexie | ⭕ Not started | |
| R-17 | Automatic history under day headings with four actions | ⭕ Not started | |
| R-18 | The library of deliberately saved prompts | ⭕ Not started | |
| R-19 | Favourites, folders, and tags | ⭕ Not started | |

## Phase 6 — Control, trust, and every screen size

| # | What gets built | Status | Notes |
|---|---|---|---|
| R-20 | Settings across four tabs, including data controls | ⭕ Not started | |
| R-21 | The backup door: export everything, checked imports | ⭕ Not started | |
| R-22 | Graceful handling of the five hard inputs | ⭕ Not started | Tie-break rule unsettled — Q-04. |
| R-23 | The visible privacy promise in sidebar and About | ⭕ Not started | |
| R-24 | Desktop, tablet, and phone layouts | ⭕ Not started | |

## Phase 7 — Proving it works and shipping it

| # | What gets built | Status | Notes |
|---|---|---|---|
| R-25 | Engine test suite and the 100–200 example dataset | ⭕ Not started | |
| R-26 | The speed target: under a tenth of a second, on-demand recalculation | ⭕ Not started | |
| R-27 | Offline support and installability | ⭕ Not started | Placement differs between the material's two orderings — Q-06. |
| R-28 | Putting the finished app on a static host | ⭕ Not started | |

## What is blocked

Nothing is blocked. Phase 1 and the Phase 2–3 engine pipeline are accounted for; later UI, storage, and product work waits its planned turn.

## Status legend

| Emoji | Means |
|---|---|
| ✅ | Finished — built, checked, working |
| 🟨 | Being worked on right now |
| ⭕ | Not started — waiting its turn |
| ❌ | Blocked — something is stopping it |
| 🔵 | Already there — found in the supplied material, built before this plan |
| ⬜ | Dropped — decided against, kept for the record |
| ❓ | Unclear — the material does not say |
