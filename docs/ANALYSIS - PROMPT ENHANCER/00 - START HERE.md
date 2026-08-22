# 00 - START HERE

Next: [[01 - OVERVIEW]] · **Current status:** Phase 1 foundations and the Phase 2–3 engine pipeline are complete; UI, storage, and later phases remain ahead.

**What this is about:** Prompt Enhancer
**Written:** 21 August 2026
**Last updated:** 22 August 2026

## What was handed over

| What | Kind | Where it came from | Read? |
|---|---|---|---|
| `prompt-enhancer-detailed-context.md` | Document | `MATERIAL\prompt-enhancer-detailed-context.md` — copied into this run | Yes — in full |

One document: a build plan for a browser-based tool that turns rough instructions into well-structured prompts without using artificial intelligence, accounts, or a server. It runs to 1,405 lines — twenty-five build phases, a recommended twenty-one-step build order, a release table, a drawing of the finished arrangement, and a closing statement of priority. All of it was read.

The material was copied into `MATERIAL\`, so every line number cited in these notes is frozen alongside them and cannot drift.

## The short version

This is a plan, not a product: the material itself reports no implementation, but the repository now has the Phase 1 foundations and the Phase 2–3 parser-to-Markdown engine pipeline. The tool it describes enhances prompts entirely in the browser — a parser recognises the pieces of an instruction, a scorer names its type and admits doubt, hand-written rules and templates shape the result, and a generator writes it out as Markdown. The document itself is clear about what matters most: the pipeline from parser to generator is the milestone; everything else is the product built around it (lines 1389–1405). Four places where the document disagrees with itself, and the questions that remain open, are recorded rather than papered over.

## Everything in this analysis

| File | What it holds |
|---|---|
| [[01 - OVERVIEW]] | What this thing is and what it does |
| [[02 - DOCUMENT FINDINGS]] | What the document says — requirements, rules, decisions, and where it disagrees with itself |
| [[05 - SYSTEM ARCHITECTURE]] | The parts of the proposed arrangement and how they hand work along |
| [[06 - DIAGRAMS]] | The pictures, with a reading under each |
| [[07 - DEVELOPMENT ROADMAP]] | What to build, in what order, as R-01 through R-28 |
| [[08 - ROADMAP TRACKER]] | Where each roadmap item stands |
| [[09 - TASK TRACKER]] | Every task and where it came from, T-01 through T-57 |
| [[10 - WORD LIST]] | Plain meanings for the words that could not be avoided |
| [[13 - REVISION LOG]] | What has changed since these notes were first written |

## Not made this time

| File | Why not |
|---|---|
| `03 - CODE FINDINGS` | No source code was supplied — the material is a document only. |
| `04 - COMBINED FINDINGS` | Needs both documents and code; only a document arrived. |
| `11 - PARTS IN DETAIL` | Written only when asked for. It was not asked for. |
| `12 - SCREENS BY ROLE` | Written only when asked for. It was not asked for — and the system has one level of user, so it would have little to say. |

## How to read this

For what the thing is, start at [[01 - OVERVIEW]]. For what the document actually commits to — including four internal disagreements worth knowing about — go to [[02 - DOCUMENT FINDINGS]]. For how the pieces fit together, read [[05 - SYSTEM ARCHITECTURE]] and then [[06 - DIAGRAMS]]. For the plan, go to [[07 - DEVELOPMENT ROADMAP]]; for where things stand, [[08 - ROADMAP TRACKER]]; for work small enough to pick up, [[09 - TASK TRACKER]]. Any word that survived unexplained is in [[10 - WORD LIST]]. And for what has changed since these notes were written — corrections, work begun — go to [[13 - REVISION LOG]].

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

## Open questions

Things the material does not settle. Each one is a real gap, not a guess dressed up as a question.

| # | Question | Why it matters | Who can answer |
|---|---|---|---|
| Q-01 | How do the seventeen named preset labels map onto the thirteen task types? Presets such as API Design, Database, Improve Writing, and UI Design name no task type of their own | Presets pre-fill the task type and sections; without the mapping they cannot be built as described | Settled in Phase 4 implementation |
| Q-04 | When two classifications tie, does the app pick the higher score or show both? The document offers both and chooses neither | Decides what the person actually sees on ambiguous input | The document's author |
| Q-05 | Is 500 the starting maximum for history, or just an example number? | Sets a default in the settings' data tab | Settled in Phase 5 implementation |
| Q-06 | Which ordering governs the offline work — build-order step 20 or release version 1.3? The two disagree | Decides whether offline support lands before or well after the first stable release — see C-04 in [[02 - DOCUMENT FINDINGS#Where the documents disagree\|Where the documents disagree]] | The document's author |
| Q-07 | The folder of working files these notes sit in holds a working dashboard-style application, while this document plans the prompt enhancer. Should a later pass read that code and compare the two? | Decides whether this becomes a combined analysis with a code half — and whether anything in the plan is already built | The vault's owner |

## Current implementation status

| Phase | Status | Current state |
|---|---|---|
| Phase 1 — Foundations | ✅ Implemented | App shell, routes, shared types, and engine vocabulary exist. |
| Phase 2 — Understanding | ✅ Implemented | Parser, signal extraction, weighted classifier, confidence bands, and General fallback exist. |
| Phase 3 — Structure | ✅ Implemented | Rules, templates, strength behavior, Markdown generation, and the public facade exist. |
| Phase 4 — Workspace | ✅ Implemented | Enhance workspace, 17 presets, result/preview/edit flow, Markdown editor, Copy, and Export are in local `main`; the user verified the flow in a browser. |
| Phase 5 — Browser memory | ✅ Implemented | Dexie history/library, folders, tags, retention, Clear History, and JSON export are in local `main`; the user verified the flow in a browser. |
| Phase 6 — Control and trust | ⭕ Not started | Settings/data controls, edge-case handling, privacy surfaces, and full responsive work remain. |
| Phase 7 — Proving and shipping | ⭕ Not started | Broader test data, performance, offline/installability, and static deployment remain. |

Phase 4–5 automated and static checks pass, and the user has verified the flow in a browser. A complete four-browser
matrix for IndexedDB, security, accessibility, and failure behavior is not recorded yet.

## Questions since answered

Phase 2–3 settled Q-02 and Q-03 while preserving their original wording here for traceability. The Phase 4–5 implementation settled Q-01 by treating the 17 enumerated names as authoritative and mapping unmatched labels to the closest existing recipe without expanding the 13-type taxonomy. It settled Q-05 as a fixed newest-500 history limit and pulled Clear History/export forward for the normal release. The user has since verified the Phase 4–5 flow in a browser; a complete four-browser matrix is not recorded. Q-02 uses the approved margin × evidence-floor formula: `confidence = round(min(margin, evidence))`, with `EVIDENCE_SATURATION = 7` and bands of ≥80 High, 60–79 Medium, and <60 Low. C-02 is a printed-weight arithmetic erratum; the implementation does not retune the weights to reach 11. Q-03 is settled by nine authored recipes for the previously unlisted task types. The engine tie rule is recorded with R-07; full conflict display remains Phase 6 work.

| # | Question | Resolution |
|---|---|---|
| Q-02 | How do raw scores become the percentage confidence bands? The worked example totals 11, but the printed weights give at most 7 for that sentence | **Settled:** margin × evidence floor, with `EVIDENCE_SATURATION = 7`; C-02 is a printed-weight arithmetic erratum, not a reason to retune the score to 11. |
| Q-03 | Which heading layouts apply to the nine task types whose sections are never listed? | **Settled:** nine recipes were authored, provenance-marked, and registered for the missing task types. |
| Q-01 | How do the preset labels map onto task types? | **Settled:** the 17 named presets are authoritative; API Design and Database map to Feature, Improve Writing to Rewrite, Analyze Information to Research, and UI Design/UX Review to UI Review. |
| Q-05 | Is 500 the starting maximum for history? | **Settled:** Phase 5 uses a fixed newest-500 cap; configurable retention remains Phase 6. |

## What changed

Revised five times. On 21 August 2026 work began on the build itself: Phase 1 was implemented, both trackers were brought level with the code, and one piece of this vault's own arithmetic was corrected along the way. On 22 August 2026 the Phase 2–3 engine pipeline was completed and Q-02/Q-03 were settled without changing the material or later-phase scope. The Phase 4–5 implementation is now present in local `main`, its automated/static gates pass, and the user has verified the flow in a browser. The record lives in [[13 - REVISION LOG]].
