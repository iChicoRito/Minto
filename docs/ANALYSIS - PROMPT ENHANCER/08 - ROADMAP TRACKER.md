# 08 - ROADMAP TRACKER

[[00 - START HERE|Back to start]] · Previous: [[07 - DEVELOPMENT ROADMAP]] · Next: [[09 - TASK TRACKER]]

**Last checked:** 21 August 2026

## Where everything stands

| Status | How many |
|---|---|
| ✅ Finished | 2 |
| 🟨 Being worked on | 0 |
| ⭕ Not started | 25 |
| ❌ Blocked | 0 |
| 🔵 Already there | 1 |
| ⬜ Dropped | 0 |
| ❓ Unclear | 0 |
| **Total** | **28** |

Work began on 21 August 2026 — see [[13 - REVISION LOG]]. One item was found already standing in the working repository files, two were built and checked this pass, and twenty-five still wait their turn. The material itself is still only a plan and reports no work done.

## Phase 1 — Foundations and the shape of the data

| # | What gets built | Status | Notes |
|---|---|---|---|
| R-01 | Start the project from the recommended stack with the helper packages installed | 🔵 Already there | The stack itself pre-existed in the working files — Next.js 16 App Router, TypeScript strict, Tailwind v4, shadcn/ui, zod, lucide-react. Only the four helper packages had to be installed this pass. |
| R-02 | App shell: sidebar navigation and the six pages | ✅ Finished | Sidebar and frame under src/app/(main)/ plus six static placeholder pages; the old root placeholder removed. Production build and a live smoke test both passed. |
| R-03 | The data shapes: analysed prompt, five categories, thirteen task types, three strengths | ✅ Finished | Written to src/prompt-engine/types.ts with zero imports. One correction: the analysed-prompt shape carries eleven fields — eight required, three optional — not the twelve the prose claimed. |

## Phase 2 — Understanding what was asked

| # | What gets built | Status | Notes |
|---|---|---|---|
| R-04 | The prompt parser: actions, subjects, fields, technologies, limits, requirements | ⭕ Not started | |
| R-05 | The three controlled word lists, with room to grow | ⭕ Not started | |
| R-06 | The classifier on weighted scoring | ⭕ Not started | |
| R-07 | Confidence bands and the low-confidence fallback to General | ⭕ Not started | The score-to-percentage step is unsettled — Q-02. |

## Phase 3 — Turning understanding into structure

| # | What gets built | Status | Notes |
|---|---|---|---|
| R-08 | The rule engine choosing headings per task type | ⭕ Not started | Recipes exist for four of thirteen types — Q-03. |
| R-09 | Strength-dependent behaviour: light, standard, detailed | ⭕ Not started | |
| R-10 | The template library and its resolver | ⭕ Not started | |
| R-11 | The markdown generator, formatting kept apart from logic | ⭕ Not started | |

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

Nothing is blocked. The first phase is accounted for, and no obstacle stands in front of Phase 2.

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
