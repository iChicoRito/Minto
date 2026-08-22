# 07 - DEVELOPMENT ROADMAP

[[00 - START HERE|Back to start]] · Previous: [[06 - DIAGRAMS]] · Next: [[08 - ROADMAP TRACKER]]

## What this covers

The building work for the Prompt Enhancer, from an empty folder to a stable public release, in the order it should be built and why in that order. It covers development only — the material raises nothing about budget, hiring, marketing, or launch dates, and this plan invents none. No dates appear anywhere in the material; the order is the only promise.

## Where the plan came from

Everything here is drawn from [[02 - DOCUMENT FINDINGS]] — that is, from the single supplied document. The document carries three orderings of its own: twenty-five build phases (lines 7–1265), a recommended twenty-one-step sequence (lines 1269–1313), and a release table from V0.1 to V2.0 (lines 1317–1334). The seven phases below reconcile the three; where they disagree, the disagreement is recorded rather than smoothed over — see C-03 and C-04 in [[02 - DOCUMENT FINDINGS#Where the documents disagree|Where the documents disagree]] and questions Q-06 in [[00 - START HERE#Open questions|Open questions]].

## The phases at a glance

| Phase | What it delivers | Waits on |
|---|---|---|
| Phase 1 — Foundations and the shape of the data | An empty but running app with its skeleton pages, and the data shapes every later phase leans on | Nothing — this one starts |
| Phase 2 — Understanding what was asked | A parser and classifier that can read a rough instruction and name its type with a confidence level | Phase 1 |
| Phase 3 — Turning understanding into structure | The rule engine, templates, and markdown generator — the pipeline that produces the finished prompt | Phase 2 |
| Phase 4 — The workspace people use | The Enhance page, presets, and the editor with live preview — the first thing a user would recognise as the product | Phase 3 |
| Phase 5 — Giving the app a memory | The two local stores, automatic history, and the library with favourites, folders, and tags | Phase 4 |
| Phase 6 — Control, trust, and every screen size | Settings, the backup door, edge-case handling, the visible privacy promise, and responsive layouts | Phase 5 |
| Phase 7 — Proving it works and shipping it | The engine test suite and dataset, the speed target, offline support, and putting it on a static host | Phase 6 |

The picture of this order lives in [[06 - DIAGRAMS#5. The order of the phases|Diagram 5]].

---

## Phase 1 — Foundations and the shape of the data

**The goal:** An app that starts, shows its six empty pages behind a sidebar, and carries the agreed data shapes every other phase will write against.

**Why it comes first:** The document's own build order puts project setup, the app shell, and the data types at steps 01–03 (lines 1271–1277); the parser in Phase 2 cannot be written without the data shapes, and no page exists to build on until the shell stands.

**What gets built:**

| # | What gets built | Why it is needed | Where the need came from |
|---|---|---|---|
| R-01 | Start the project from the recommended stack — Next.js with TypeScript and Tailwind, the shadcn/ui kit switched on, and the six helper packages installed | Everything else is built inside this frame | `prompt-enhancer-detailed-context.md`, lines 69–111 |
| R-02 | Build the app shell: sidebar navigation and the six pages — Enhance as the home page, plus Presets, Library, History, Settings, and About | Gives every later module a place to live | Same file, lines 119–141 and 1271–1275 |
| R-03 | Define the data shapes: what an analysed prompt holds, the five categories, the thirteen task types, and the three enhancement strengths | The vocabulary the whole engine speaks; wrong shapes here ripple everywhere | Same file, lines 202–262 |

**How you know the phase is finished:**

- The app starts in a browser and shows a sidebar with six named destinations, each opening an empty page.
- The data shapes are written down and agreed, with the three name lists — categories, task types, strengths — exactly as the document defines them.

**What could hold it up:** Nothing the material names. This phase is the document's own recipe, followed as written.

---

## Phase 2 — Understanding what was asked

**The goal:** Given rough wording, the app can name the pieces inside it and say what kind of instruction it is, with an honest level of confidence.

**Why it comes here:** The classifier needs the task types and categories fixed in Phase 1 to score against, and everything in Phase 3 — which sections to use, which shape to fetch — hangs off the classification this phase produces.

**What gets built:**

| # | What gets built | Why it is needed | Where the need came from |
|---|---|---|---|
| R-04 | Build the prompt parser: recognise the action, subject, field, technologies, limits, and requirements in plain wording | The pieces feed both the classifier and the finished prompt | `prompt-enhancer-detailed-context.md`, lines 266–289 |
| R-05 | Maintain the three controlled word lists — action words, limit phrases, technologies — with room to grow | Recognition is only as good as its dictionaries | Same file, lines 293–347 |
| R-06 | Build the classifier on weighted scoring: signal words add up per task type, and the highest score names the type | Single-word checks misfire; weights allow real scoring | Same file, lines 351–398 |
| R-07 | Turn scores into confidence bands, and when confidence is low, fall back to General with a manual picker | The system has no AI to hide behind, so it must admit doubt | Same file, lines 401–419 |

**How you know the phase is finished:**

- Typing the document's own example — "Fix my login because it sometimes fails" — produces a bug-fix verdict.
- A deliberately odd instruction comes back as General with the manual picker offered, not a confident wrong answer.

**What could hold it up:** The scoring example in the material does not add up on its own terms — see C-02 in [[02 - DOCUMENT FINDINGS#Where the documents disagree|Where the documents disagree]] and Q-02 in [[00 - START HERE#Open questions|Open questions]]. The converter from raw scores to percentage bands has to be settled before R-07 can be called done.

---

## Phase 3 — Turning understanding into structure

**The goal:** The pipeline the document calls its most important milestone works end to end: a classified instruction comes out the other side as a structured Markdown document (lines 1389–1405).

**Why it comes here:** Rules need a classification to act on, templates need the rule engine's section choices, and the generator needs filled sections to format. This phase is the reason Phases 1 and 2 exist.

**What gets built:**

| # | What gets built | Why it is needed | Where the need came from |
|---|---|---|---|
| R-08 | Build the rule engine: per task type, the list of headings the result should carry | This is the document's "main intelligence layer" | `prompt-enhancer-detailed-context.md`, lines 423–472 |
| R-09 | Make the rules behave differently per strength — light polishes wording, standard adds the middle structure, detailed lays out the full skeleton | The three strengths are promised to change the output, not just label it | Same file, lines 476–553 |
| R-10 | Build the template library and the resolver that fetches the right task shape for category, type, and strength | Keeps section choices in reusable, reviewable shapes | Same file, lines 557–603 |
| R-11 | Build the markdown generator, with formatting kept entirely apart from the enhancement logic | Predictable output even as the rules evolve | Same file, lines 607–638 |

**How you know the phase is finished:**

- The document's light example — "fix login problem" in, one polished sentence out — reproduces (lines 490–498).
- The standard and detailed examples produce their documented structures (lines 500–551).
- Changing a rule changes the content but never breaks the output's shape.

**What could hold it up:** The material gives section recipes for only four of the thirteen task types — see Q-03 in [[00 - START HERE#Open questions|Open questions]]. The other nine need answers before R-08 is complete.

---

## Phase 4 — The workspace people use

**The goal:** The product becomes visible: a person can type, enhance, preview, edit, and copy, with presets to skip the guesswork.

**Why it comes here:** The workspace has nothing to show until the pipeline exists. This is the first phase a non-technical person would recognise as the app.

**What gets built:**

| # | What gets built | Why it is needed | Where the need came from |
|---|---|---|---|
| R-12 | Build the Enhance page input panel: the text box, the type picker set to auto-detect, the strength picker, the section tick-list, and the Enhance button | The front door of the product | `prompt-enhancer-detailed-context.md`, lines 646–667 |
| R-13 | Build the result side: Result and Preview tabs with Copy, Edit, Save, and Export | Turns the pipeline's output into something usable | Same file, lines 669–686 |
| R-14 | Enter the seventeen named starter presets in four groups, each pre-filling category, type, strength, and sections, then jumping to Enhance | Presets bypass or assist classification — a promised feature | Same file, lines 706–756 |
| R-15 | Build the markdown editor: toolbar helpers, fullscreen, undo and reset, word and character counts, live preview beside the text | After enhancement the person may polish by hand | Same file, lines 760–787 |

**How you know the phase is finished:**

- A prompt goes in, a formatted result comes out, and all four actions on the result work. Phase 4 and Phase 5 are
  released together so Save never reports ephemeral success.
- Clicking the Bug Fix preset lands on Enhance with everything already configured, as the document's walkthrough describes (lines 747–756).

**What could hold it up:** The 17 named presets include labels without exact taxonomy entries. The implementation maps
those labels to the closest existing recipe without expanding the 13-type engine taxonomy.

---

## Phase 5 — Giving the app a memory

**The goal:** Enhancements stop vanishing: history keeps them automatically, and deliberately saved prompts gather in a library with favourites, folders, and tags.

**Why it comes here:** Memory needs something worth remembering — the workspace from Phase 4 produces the results that history records and the library keeps.

**What gets built:**

| # | What gets built | Why it is needed | Where the need came from |
|---|---|---|---|
| R-16 | Stand up the two stores: small preferences in the browser's settings storage under one key, content in the large local store via Dexie with its three tables | Every memory feature rests on this split | `prompt-enhancer-detailed-context.md`, lines 791–833 |
| R-17 | Build the history module: automatic saving when enabled, entries listed under day headings, with open, copy, save-to-library, and delete | The document promises effort-free record-keeping | Same file, lines 838–876 |
| R-18 | Build the library: explicitly saved prompts with rename, duplicate, edit, delete, search, and filter, arranged in standing views | The library is deliberately unlike history and must stay that way | Same file, lines 880–912 |
| R-19 | Add favourites, folders, and tags across saved prompts | Named in the store design and the library's abilities | Same file, lines 815–824, 888–899, and 1298–1300 |

**How you know the phase is finished:**

- An enhancement appears in history by itself, under today's heading, without anyone pressing save.
- A prompt saved to the library can be found by search, renamed, duplicated, starred, filed into a folder, and tagged.
- Normal release also includes a fixed newest-500 history cap, Clear History, local collection JSON export, truthful
  storage-failure states, and a local-only/non-encrypted disclosure; import and configurable data settings remain Phase 6.

**What could hold it up:** Browser-local data is best-effort and origin-bound. Phase 5 therefore ships its minimum
retention, erasure, export, and failure safeguards together with the first Dexie schema; polished import/settings
controls remain Phase 6.

---

## Phase 6 — Control, trust, and every screen size

**The goal:** The app becomes trustworthy at its edges: preferences under the person's control, data that can leave and come back safely, strange inputs handled gracefully, the privacy promise in plain sight, and every screen usable at any size.

**Why it comes here:** Settings control the modules built in Phases 4 and 5; the backup door needs the stores from Phase 5 to have something in them; edge cases only matter once real inputs flow.

**What gets built:**

| # | What gets built | Why it is needed | Where the need came from |
|---|---|---|---|
| R-20 | Build the settings module: General, Sections, Appearance, and Data tabs, including the history cap and the three wipe buttons | Puts the person in charge of defaults and their own data | `prompt-enhancer-detailed-context.md`, lines 950–1001 |
| R-21 | Build the backup door: everything out to one named file, and imports checked for shape and version, previewed, then accepted | With no account, this is the only escape hatch | Same file, lines 916–947 |
| R-22 | Handle the five hard inputs: empty, extremely short, huge, unknown, and conflicting instructions | The document treats graceful failure as a requirement, not a hope | Same file, lines 1031–1085 |
| R-23 | Make the privacy promise visible: the sidebar message and the About page wording | The promise is the product's identity | Same file, lines 1005–1027 |
| R-24 | Make every screen work at desktop, tablet, and phone sizes, with the editor swapping side-by-side panes for tabs on phones | The material specifies all three layouts | Same file, lines 1165–1199 |

**How you know the phase is finished:**

- Every control on the four settings tabs changes real behaviour.
- A backup exported from the app imports cleanly; a deliberately mangled file is refused with a reason and a preview that changes nothing.
- An empty box, the two-word "fix it", an oversized paste, and a nonsense instruction each get the documented treatment.
- The whole app is usable at phone width, editor tabs included.

**What could hold it up:** The tie-breaking rule for conflicting classifications is left as an either/or in the material — see Q-04 in [[00 - START HERE#Open questions|Open questions]]. R-22 cannot be called done until it is settled.

---

## Phase 7 — Proving it works and shipping it

**The goal:** The engine is proven against a real collection of examples, the speed target is met, the app installs and works offline, and it is live on a static host.

**Why it comes here:** Tests are worth most once the engine's full behaviour exists; the speed target needs real usage patterns; offline support and deployment come last so they wrap the finished thing. Note the tension recorded at C-03 in [[02 - DOCUMENT FINDINGS#Where the documents disagree|Where the documents disagree]]: the material wants heavy engine testing yet schedules it late; this plan follows the material's order while flagging the cost.

**What gets built:**

| # | What gets built | Why it is needed | Where the need came from |
|---|---|---|---|
| R-25 | Write the engine test suite across its six areas and assemble the 100–200 example dataset | The rule engine can only improve systematically against examples | `prompt-enhancer-detailed-context.md`, lines 1089–1132 |
| R-26 | Meet the speed target: under a tenth of a second for typical prompts, recalculating only when inputs actually change | Local tools must feel instant | Same file, lines 1136–1161 |
| R-27 | Add offline support — the material calls it PWA support — so the app installs on the main systems and runs with no internet | The natural finish for a local-first tool | Same file, lines 1203–1226 |
| R-28 | Put the finished app on a static host: fixed files only, no servers behind it | The material treats this last step as deliberately simple | Same file, lines 1230–1265 |

**How you know the phase is finished:**

- The dataset runs through the engine and the results are recorded well enough to improve the weights against.
- A typical prompt enhances faster than a tenth of a second on ordinary hardware.
- The app installs and keeps working with the network cable pulled.
- The public address serves the app with nothing but fixed files behind it.

**What could hold it up:** The material places offline support twice on different timetables — step 20 of the build order but version 1.3 of the release table. See C-04 and Q-06 in [[00 - START HERE#Open questions|Open questions]]; this plan follows the build order, but the choice belongs to the plan's owner.

---

## Deliberately left out

| What | Why it is not here |
|---|---|
| Custom templates — promised for version 1.1 | The material names it in the release table only (line 1331) and never describes it; there is not enough to plan. See [[00 - START HERE#Open questions]]. |
| Better classification — promised for version 1.2 | Same: a release-table line with no substance behind it yet (line 1332). |
| Optional AI enhancement — version 2.0 | The material excludes AI from version 1 explicitly (lines 32–41) and defers this to a distant version (line 1334). Planning it now would contradict the material's own boundary. |
| Anything about money, marketing, or hiring | The material raises none of it, and this roadmap covers building work only. |
