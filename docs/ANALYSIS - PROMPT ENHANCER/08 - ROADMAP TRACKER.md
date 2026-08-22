# 08 - ROADMAP TRACKER

[[00 - START HERE|Back to start]] · Previous: [[07 - DEVELOPMENT ROADMAP]] · Next: [[09 - TASK TRACKER]]

**Last checked:** 22 August 2026

## Where everything stands

| Status | How many |
|---|---|
| ✅ Finished | 27 |
| 🟨 Being worked on | 0 |
| ⭕ Not started | 0 |
| ❌ Blocked | 0 |
| 🔵 Already there | 1 |
| ⬜ Dropped | 0 |
| ❓ Unclear | 0 |
| **Total** | **28** |

Work began on 21 August 2026 — see [[13 - REVISION LOG]]. One item was found already standing in the working repository files, and R-01 through R-28 are now implemented in local `main`. Automated/static evidence is recorded below; the user also confirmed the current application works in a browser.

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
| R-12 | The Enhance page input panel | ✅ Finished | Input, controls, section selection, stale-result handling, and explicit Enhance flow are implemented and user-verified in a browser. |
| R-13 | The result side: two tabs, four actions | ✅ Finished | Result/Preview/Edit, Copy, Save, and Markdown Export are implemented; Save commits to the Phase 5 library; user-verified in a browser. |
| R-14 | Seventeen starter presets that pre-fill and jump to Enhance | ✅ Finished | The 17 named presets are authoritative; unmatched labels map to the closest existing task type; user-verified in a browser. |
| R-15 | The markdown editor with toolbar and live preview | ✅ Finished | Controlled Markdown editing, safe preview, toolbar transforms, fullscreen, undo/reset, and counts are implemented and user-verified in a browser. |

## Phase 5 — Giving the app a memory

| # | What gets built | Status | Notes |
|---|---|---|---|
| R-16 | The two stores: preference drawer and content store via Dexie | ✅ Finished | Existing preference layers now hold prompt defaults/history enabled; Dexie v1 owns history, prompts, and folders; user-verified in a browser. |
| R-17 | Automatic history under day headings with four actions | ✅ Finished | Successful Enhances create immutable history, with actions, Clear History, fixed 500-entry retention, and local export; user-verified in a browser. |
| R-18 | The library of deliberately saved prompts | ✅ Finished | Explicit Save creates/updates independent saved prompts with CRUD, search, filters, and standing views; user-verified in a browser. |
| R-19 | Favourites, folders, and tags | ✅ Finished | Saved prompts support favourites, one-level folders, normalized tags, and AND tag filtering; user-verified in a browser. |

## Phase 6 — Control, trust, and every screen size

| # | What gets built | Status | Notes |
|---|---|---|---|
| R-20 | Settings across four tabs, including data controls | ✅ Finished | Four tabs own prompt defaults, sections, appearance, history limits, backup, and destructive local-data controls. |
| R-21 | The backup door: export everything, checked imports | ✅ Finished | Strict V1/V2 parsing, preview, replacement restore, rollback, and repository transactions are implemented. |
| R-22 | Graceful handling of the five hard inputs | ✅ Finished | Empty, short, oversized, unknown, and conflicting prompts have bounded validation and trust-preserving output. Q-04 is settled by stable top matches plus the General fallback. |
| R-23 | The visible privacy promise in sidebar and About | ✅ Finished | Local-only/no-account/no-AI wording is visible in the sidebar and About page. |
| R-24 | Desktop, tablet, and phone layouts | ✅ Finished | Enhancer screens use responsive layouts; Markdown switches to Edit/Preview tabs on phones. |

## Phase 7 — Proving it works and shipping it

| # | What gets built | Status | Notes |
|---|---|---|---|
| R-25 | Engine test suite and the 100–200 example dataset | ✅ Finished | `verify-engine` passes `166/166`, including `120/120` dataset cases; product verification passes `9/9`. |
| R-26 | The speed target: under a tenth of a second, on-demand recalculation | ✅ Finished | Three benchmark passes reported p95 values under 4 ms; the latest measured p95 was `4.79 ms`. |
| R-27 | Offline support and installability | ✅ Finished | Static manifest, native service worker, revisioned precache, local-only runtime behavior, and `.nojekyll` are shipped. |
| R-28 | Putting the finished app on a static host | ✅ Finished | Root and `/prompt-enhancer` static artifacts pass route/asset/template checks; the Pages workflow is ready for deployment. |

## What is blocked

No product implementation is blocked. R-01 through R-28 are implemented, targeted checks pass, and the user confirmed the
current application works in a browser. A complete four-browser/offline device matrix and a recorded live Pages run are
not included in this repository.

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
