# 05 - SYSTEM ARCHITECTURE

[[00 - START HERE|Back to start]] · Previous: [[02 - DOCUMENT FINDINGS]] · Next: [[06 - DIAGRAMS]]

## How to read this note

The material describes a system that has not been built yet, so there is no arrangement today to describe — that section is one line long. Everything else sets out the arrangement the document proposes. Every part below carries the ⭕ Proposed label; nothing here is already standing.

## The arrangement today

The material reports no existing system — it is entirely a plan for one ([[02 - DOCUMENT FINDINGS]], *What was read*). Nothing is already there.

## The arrangement being proposed

### What changes and why

| Part | Status | What it is for | Why it is being added or changed |
|---|---|---|---|
| The pages people see | ⭕ Proposed | Six screens — Enhance (the home page), Presets, Library, History, Settings, About — built with Next.js and the shadcn/ui kit | The material's project layout names each of them, lines 119–141 |
| The prompt parser | ⭕ Proposed | Reads the raw wording and pulls out the action, subject, field, technologies, limits, and requirements | The first engine part, lines 266–289 |
| The classifier | ⭕ Proposed | Decides what kind of instruction it is, by adding up weighted signal words, and says how sure it is | Lines 351–419 |
| The rule engine | ⭕ Proposed | The main intelligence: chooses which headings apply for each task type and strength | Called "the main intelligence layer", lines 423–425 |
| The template resolver | ⭕ Proposed | Fetches the ready-made task shape matching category, type, and strength | Lines 557–603 |
| The markdown generator | ⭕ Proposed | Turns the filled-in structure into the final Markdown text, formatting kept apart from logic | Lines 607–638 |
| The editor with live preview | ⭕ Proposed | Lets the person polish the result, with a toolbar and a rendering beside it | Lines 760–787 |
| The presets module | ⭕ Proposed | Eighteen starting points that pre-fill every choice and jump to the workspace | Lines 706–756 |
| The history module | ⭕ Proposed | Keeps every enhancement automatically when enabled, listed under day headings | Lines 838–876 |
| The library module | ⭕ Proposed | Holds prompts saved deliberately, with rename, duplicate, search, filter, favourites, folders, tags | Lines 880–912 |
| The backup door | ⭕ Proposed | Writes everything to one file and checks files coming back in | Lines 916–947 |
| The settings module | ⭕ Proposed | Four tabs of preferences including data controls | Lines 950–1001 |
| The preference drawer | ⭕ Proposed | The browser's own small settings storage, holding theme, defaults, and switches under one key | Lines 795–811 |
| The content store | ⭕ Proposed | The browser's large local store, reached through Dexie, with tables for prompts, history, and folders | Lines 813–833 |

### How work would pass between them

The person types into the pages and presses Enhance. The pages hand the wording and the chosen settings to the parser, which returns the pieces it recognised. The classifier scores the wording and names a type with a confidence level; if confidence is low it settles on "General" and the person may override it (lines 401–419). The rule engine takes the type and picks the headings that belong in the result; the template resolver fetches the matching task shape for that type at the chosen strength; the generator writes the final Markdown. The result lands back on the pages, shown beside a live preview, where it can be edited, copied, saved to the library, or exported.

Saving reaches the two stores: small preferences go to the preference drawer, content — history entries, saved prompts, folders — goes to the content store. History saving happens automatically when enabled; library saving happens only when the person presses Save. Presets short-circuit the front of this journey: choosing one fills in type, strength, and sections, then jumps straight to the workspace (lines 747–756).

This journey is the words behind the first two diagrams in [[06 - DIAGRAMS]] — if the two ever disagree, these words win and the pictures get fixed.

### Where things are kept

Two stores, deliberately split (lines 791–824):

- **The preference drawer** — the browser's own small settings storage, named localStorage, holding the theme, default strength, default sections, interface choices, and whether history is on, all under one key, `prompt-enhancer:settings` (lines 795–811).
- **The content store** — the browser's large local store, called IndexedDB, reached through Dexie and holding history entries, saved prompts, favourites, folders, tags, and eventually custom presets, in three named tables: prompts, history, folders (lines 826–833).

### Where it touches the outside world

Almost nowhere, on purpose. At run time the only outside contact is the static host that hands over the app's fixed files the first time (lines 1230–1253). The document lists what is *not* required in terms that read like a boundary: no database server, no sign-in server, no AI service, no background worker, no payment service (lines 1255–1265). When the offline support arrives, even the host becomes optional after the first visit (lines 1218–1226).

### What holds the arrangement together

The choices that would be expensive to reverse:

- **Three layers, strictly apart.** Interface, engine, and storage never blur; the engine does not depend on React, the screen-building toolkit underneath (lines 188–198). Every other choice leans on this one.
- **Local-first, no servers.** Everything runs in the browser; the product's identity depends on it (lines 3, 1005–1027).
- **Formatting apart from logic.** The generator owns appearance, so rules can change without disturbing output shape (line 609).
- **Work on demand, not on every keystroke.** Parsing happens only when inputs actually change (lines 1148–1161).
- **Controlled dictionaries.** Actions, limit phrases, and technologies are recognised against maintained lists meant to grow (lines 293–347).

If the material never explains a choice, that is said rather than invented — the reasoning column above stays honest about which decisions carry a stated why.

### What it would take to get there

The move from nothing to the proposed arrangement runs through seven phases set out in [[07 - DEVELOPMENT ROADMAP]]: foundations first, then the understanding layer, then the structuring pipeline, then the workspace, then memory, then control and trust, and finally proving and shipping. Nothing in the order can be swapped freely — the pipeline phases are useless without the data shapes from Phase 1, and the workspace has nothing to show until the pipeline exists. The document itself names the pipeline as the milestone that matters most (lines 1389–1405).

### What is being given up

Every arrangement trades something away. Here, three things:

- No synchronising between devices and no recovery if the browser's local data is wiped — the document acknowledges the risk by making the backup export important precisely because there is no account (lines 917–918).
- No understanding beyond the dictionaries and weights — mislabelled or oddly worded instructions fall back to "General" and rely on the person to correct them (lines 411–419).
- No certainty in classification — the tool is built to admit doubt rather than hide it (lines 1055–1063).
