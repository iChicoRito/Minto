# 02 - DOCUMENT FINDINGS

[[00 - START HERE|Back to start]] · Previous: [[01 - OVERVIEW]] · Next: [[05 - SYSTEM ARCHITECTURE]]

## What was read

| Document | Kind | How much was read |
|---|---|---|
| `prompt-enhancer-detailed-context.md` | Markdown, 1,405 lines | All of it |

One document, read in full. It is a build plan written in twenty-five numbered phases, followed by a recommended build order in twenty-one steps, a table of future releases, a drawing of the finished arrangement, and a closing statement of priority. Line numbers below refer to the copy sitting in this run's `MATERIAL\` folder, so they cannot drift.

## What the documents say the system must do

| # | What it must do | Where it says so |
|---|---|---|
| D-01 | Take a rough instruction and produce a structured prompt, entirely on the person's own device | `prompt-enhancer-detailed-context.md`, lines 3, 45–63 |
| D-02 | Work out automatically what kind of instruction it was given — bug report, new feature, research, and so on | Same file, lines 15–16, 351–353 |
| D-03 | Offer three strengths of enhancement — light, standard, detailed — that genuinely change the output | Same file, lines 17, 257–262, 476–478 |
| D-04 | Pull out of the wording: the action asked for, the subject, the field of work, named technologies, and any limits ("don't change X") | Same file, lines 268–289 |
| D-05 | Classify by adding up weighted signal words rather than checking for one word | Same file, lines 355–374 |
| D-06 | Show how sure it is, and when unsure fall back to "General" and let the person pick the type themselves | Same file, lines 401–419 |
| D-07 | Decide which headings belong in the result, per type of task | Same file, lines 423–472 |
| D-08 | Choose from reusable task shapes (templates) matching category, type, and strength | Same file, lines 557–603 |
| D-09 | Write the final document as predictable Markdown, with the formatting kept apart from the decision-making | Same file, lines 607–638 |
| D-10 | Provide the main workspace: input panel, result and preview tabs, and copy / edit / save / export actions | Same file, lines 642–702 |
| D-11 | Provide presets that pre-fill every choice and jump straight to the workspace | Same file, lines 706–756 |
| D-12 | Let the person edit the result with a toolbar and see a live preview beside it | Same file, lines 760–787 |
| D-13 | Keep small preferences in the browser's settings storage and all content in the browser's large local store | Same file, lines 791–834 |
| D-14 | Keep an automatic history of enhancements whenever that is switched on | Same file, lines 838–876 |
| D-15 | Keep a separate library of prompts saved deliberately, distinct from history | Same file, lines 880–884 |
| D-16 | Support favourites, folders, and tags across saved prompts | Same file, lines 815–824, 888–899 |
| D-17 | Export everything to one backup file and import it back, checked at the door | Same file, lines 916–947 |
| D-18 | Provide settings in four tabs, including data controls such as a history cap and wipe buttons | Same file, lines 950–1001 |
| D-19 | State the privacy promise visibly in the sidebar and on an About page | Same file, lines 1005–1027 |
| D-20 | Cope gracefully with empty, tiny, huge, unrecognisable, and ambiguous instructions | Same file, lines 1031–1085 |
| D-21 | Work at desktop, tablet, and phone sizes | Same file, lines 1165–1199 |
| D-22 | Install like a normal app and keep working offline | Same file, lines 1203–1226 |
| D-23 | Run entirely from fixed files on a static host, with no servers behind it | Same file, lines 1230–1265 |

## Rules it has to follow

The document imposes these conditions on the build:

- A typical instruction must be processed in under 100 milliseconds — under a tenth of a second (`prompt-enhancer-detailed-context.md`, lines 1140–1146).
- Nothing may be written to the big local store on every keystroke, and the wording may not be re-read on every character typed; work happens only when Enhance is pressed or the type or strength changes (lines 1148–1161).
- An incoming backup file must be checked for shape and version, refused if wrong, previewed, and only then brought in (lines 938–945).
- The tool must never pretend its classification is certain; an unknown instruction falls back to "General" (lines 1055–1063).
- The same structure must not be forced onto every prompt (line 553).
- Very short instructions must still get a reasonable result without inventing too much (lines 1039–1045).
- Version 1 sets a size ceiling of roughly 10,000–20,000 characters per instruction (lines 1047–1053).
- The engine — the part that does the understanding and structuring — must not depend on React, the screen-building toolkit underneath; the three layers of interface, engine, and storage stay separate (lines 188–198).
- Testing effort concentrates on the engine, backed by a collection of 100–200 example instructions covering different wordings (lines 1089–1132).

## Decisions already made

| Decision | Reasoning given | Where it says so |
|---|---|---|
| No AI in version 1; the enhancement is rule-following | None stated beyond the product concept itself | Lines 32–41 |
| No accounts, no cloud, no payments, no teams | The product is local-first by identity | Lines 34–41 |
| Interface, engine, and storage are three separate layers; the engine never touches the interface toolkit | Keeps the engine testable and portable | Lines 188–198 |
| Classification adds up weighted signal words instead of checking single words | Simple checks misfire; weights allow real scoring | Lines 355–360 |
| Formatting is kept separate from the enhancement logic | Gives predictable output even as the rules evolve | Line 609 |
| Two stores: small preferences in the browser's settings storage, content in the large local store | Right-sized homes for each kind of information | Lines 791–824 |
| Library and history are different things and must not be treated alike | History is automatic; the library is deliberate | Lines 880–884 |
| Backup files are checked with Zod, a ready-made checking library | Named without a reason | Line 947 |
| Word lists for actions, limits, and technologies are controlled dictionaries, expanded over time | Keeps recognition reliable | Lines 293–347 |
| Low confidence falls back to "General" plus a manual picker | The system has no AI to hide behind | Lines 411–419 |
| The privacy promise is treated as part of the product's identity | "This can become an important product identity" | Lines 1005–1027 |

## Where the documents disagree

Contradictions found inside the single document. Recorded, not resolved.

| # | One says | The other says | Where |
|---|---|---|---|
| C-01 | The product flow names a distinct stage called "Prompt Enhancer" sitting between template resolution and markdown generation | The final architecture drawing and the priority pipeline both go straight from Template Resolver to Markdown Generator, with no such stage | Lines 45–63 against lines 1352–1378 and 1393–1403 |
| C-02 | The worked scoring example reaches a total of 11 for "Fix my login because it sometimes fails" | Adding up the printed weights for that sentence gives 7 at most — "fix" scores 3 and "fails" can only match "failing", worth 4 | Lines 365–374 against lines 378–389 |
| C-03 | The testing phase insists the engine needs more testing than anything else | The recommended build order places unit testing nineteenth of twenty-one steps, near the end | Lines 1089–1092 against lines 1306–1308 |
| C-04 | The build order puts PWA/offline work at step 20, immediately before deployment | The release table places PWA/offline at version 1.3, three releases after the 1.0 stable release | Lines 1310–1312 against line 1333 |

## What the documents leave unsaid

Each unresolved gap below is carried into *Open questions* in [[00 - START HERE]] rather than filled with a guess.

- How the seventeen named preset labels map onto the thirteen defined task types — **settled in Phase 4**: API Design and Database use Feature, Improve Writing uses Rewrite, Analyze Information uses Research, and UI Design/UX Review use UI Review. No new task types were added.
- How raw scores become the percentage confidence bands — the thresholds speak in percentages, the example in a bare total, and the two are never connected (lines 401–409). Raised as Q-02.
- Which heading layouts apply to the nine task types whose sections are never listed — recipes exist for only four of the thirteen types (lines 427–472). Raised as Q-03.
- What to do when two classifications tie — the document offers "choose the higher score or show both" and picks neither (lines 1075–1085). Raised as Q-04.
- Whether 500 is the actual starting cap on history or merely an example number (lines 989–995) — **settled in Phase 5** as a fixed newest-500 cap; configurable retention remains Phase 6.
- Which ordering governs the PWA work — raised as Q-06 from C-04 above.
- Custom presets appear once, in the storage list (line 824), and nowhere else; custom templates are promised for version 1.1 (line 1331) and likewise never described. Neither has a home in the plan yet.
- No drawings of screens beyond rough panel sketches, no dates anywhere, and no names of the people who would build any of it. The plan promises an order, not a calendar.
