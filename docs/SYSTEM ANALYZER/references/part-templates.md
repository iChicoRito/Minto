# Part Templates

Templates for `11 - PARTS IN DETAIL` and the pages inside the `PARTS\` folder that sits beside it.

This file covers the *what* of a system. The *when* lives in `references/planning-templates.md` — keep them apart, and the reasons are set out below.

---

## What this file is for

`07 - DEVELOPMENT ROADMAP` makes an argument about order: what gets built, in what order, and why that order and not another. Its worth comes from being readable in one sitting. The moment every item on it carries three pages of rules, checks, and edge cases, nobody can see the order any more — which is the one thing only the roadmap can tell them.

So the detail goes somewhere else. One page per part, holding what that part does and how it behaves.

The line between the two is drawn by a single test:

> **If the answer would change when the build order changes, it belongs in the roadmap. If it stays the same no matter when the part gets built, it belongs on the part's own page.**

That a part waits on two others, and delivers something a third one needs — roadmap. That only a supervisor may approve a refund, and a refund over a certain amount needs two of them — part page. Reordering the build changes the first and leaves the second untouched.

---

## When these get written

**Only when the user asks.** The standard run is eleven files, `00` through `10`. Part pages are a twelfth thing, made when someone says they want them — the same way *just the roadmap* and *just the diagrams* already work.

Asked for after a run already exists, they are added to that run's folder. `00 - START HERE` gains a row for `11` and `10 - WORD LIST` gains a *Next* on its navigation line.

If `12 - SCREENS BY ROLE` was also asked for, `11` takes a *Next* pointing at it. See `references/screen-templates.md`.

---

## Which parts get a page

Not everything. A large system has dozens of pieces, and a page each would mean dozens of thin pages nobody reads.

Work from the parts already named in `05 - SYSTEM ARCHITECTURE`, and propose a shortlist before writing anything:

> "I would write pages for these seven parts. Anything to add or drop?"

A part earns a page when it has behaviour worth writing down — rules it enforces, decisions it makes, states things move through, people it treats differently. A part that only passes work along does not need one, and gets a row in the *Parts without a page* table instead.

Three to twelve pages suits most systems. More than twelve usually means several parts should be one page. Fewer than three usually means the shortlist was drawn too tightly.

---

## The `P-` prefix

Part pages use `P-`, numbered `P-01` upward.

`M-` is **not** available — `04 - COMBINED FINDINGS` already uses it for things that were promised and built. The full set of prefixes in use is `D-`, `C-`, `U-`, `M-`, `G-`, `X-`, `K-`, `Q-`, `R-`, `T-`, `P-`, `S-`, and `V-`.

The same rules apply as everywhere else in this vault:

- Numbers run in order across the whole run and are never restarted.
- A number is never reused, even after a page is dropped.
- Never renumber. Every renumbering silently breaks every link pointing at an old number.
- One part covers one page, and one page covers one part. A part that turns out to be two things gets a second page with a fresh number, not a split of the old one.

A part usually spans several roadmap items — `P-04` might be built by `R-11`, `R-12`, and `R-13`. That is expected, and the page says which ones.

---

## Naming and folders

Inside the run folder:

```
ANALYSIS - <SUBJECT NAME>\
    11 - PARTS IN DETAIL.md
    PARTS\
        P-01 - <PART NAME>.md
        P-02 - <PART NAME>.md
```

- The index file follows the usual naming rule — two digits, space hyphen space, capitals throughout.
- Page files are `P-`, two digits, space hyphen space, the part's name in capitals.
- The folder is called `PARTS`, in capitals, and sits inside the run folder.

### Linking out of the `PARTS` folder

This matters and is easy to get wrong. A page inside `PARTS\` is one level down, and a plain `[[00 - START HERE]]` from there is ambiguous — there is a file by that name at the top of the vault as well as in the run folder.

From inside `PARTS\`, links pointing out of the folder carry the run folder in front of them:

```
[[ANALYSIS - SAMPLE CHECK/00 - START HERE|Back to start]]
[[ANALYSIS - SAMPLE CHECK/07 - DEVELOPMENT ROADMAP#Phase 2 — The Rules Match What Was Promised|R-04]]
```

Links between two pages in the same folder need no path — `[[P-02 - CANCELLING]]` is enough.

Links *into* the folder, from `11` or anywhere else in the run, carry the folder name:

```
[[PARTS/P-01 - BOOKING|P-01]]
```

---

## 11 - PARTS IN DETAIL.md

The index. Every part page is reachable from here, and here is reachable from `00 - START HERE`. Short — it points, it does not explain.

````markdown
# 11 - PARTS IN DETAIL

[[00 - START HERE|Back to start]] · Previous: [[10 - WORD LIST]]
<Add `· Next: [[12 - SCREENS BY ROLE]]` when that note was asked for too, or `· Next: [[13 - REVISION LOG]]` when it was not and the run has been revised.>

## What this covers

<One paragraph. One page for each part that has behaviour worth writing down — what it does, who may use it, what it checks, and how it behaves when things go wrong. Says plainly that the order to build them in is not here, it is in [[07 - DEVELOPMENT ROADMAP]].>

## The parts with a page

| # | The part | What it is for | Built by | Status | Page |
|---|---|---|---|---|---|
| P-01 | <plain name> | <one sentence> | [[07 - DEVELOPMENT ROADMAP#Phase 1 — <Name>\|R-01]], [[07 - DEVELOPMENT ROADMAP#Phase 1 — <Name>\|R-02]] | 🔵 Already there | [[PARTS/P-01 - <PART NAME>\|P-01]] |
| P-02 | <plain name> | <one sentence> | [[07 - DEVELOPMENT ROADMAP#Phase 2 — <Name>\|R-04]] | ⭕ Not started | [[PARTS/P-02 - <PART NAME>\|P-02]] |

## Parts without a page

Named in [[05 - SYSTEM ARCHITECTURE]], but with nothing behind them worth a page of its own.

| The part | Why not |
|---|---|
| <plain name> | <reason — passes work along without deciding anything, too small to hold rules, or the material says too little to write from> |

<If every part named in the architecture note has a page, one line saying so.>

## How these pages relate to the rest

<Three or four lines. [[05 - SYSTEM ARCHITECTURE]] says where each part sits and what it hands to what. [[07 - DEVELOPMENT ROADMAP]] says when each gets built and why in that order. These pages say what each one actually does. Nothing is repeated across the three — each answers a different question.>

## What writing these turned up

<Gaps that only appeared once each part was written up on its own, and that the earlier files never had cause to notice. Each one is also a new row in [[00 - START HERE#Open questions]] — this section says which, and why writing the pages surfaced it. Drop the section if nothing new came up, which is rare.>
````

Writing part pages almost always turns up gaps the findings files missed, because asking "what information does this one part handle" is a narrower question than any earlier file had to answer. Those gaps become new `Q-` numbers on the end of the list in `00 - START HERE`, never renumberings of the existing ones.

---

## PARTS\P-nn - <PART NAME>.md

One part, in full. The longest files this analyzer produces, and the ones a builder will keep open.

````markdown
# P-01 - <PART NAME>

[[ANALYSIS - <SUBJECT NAME>/00 - START HERE|Back to start]] · [[ANALYSIS - <SUBJECT NAME>/11 - PARTS IN DETAIL|All parts]] · Next: [[P-02 - <PART NAME>]]

**What it is for:** <one sentence, no more>
**Where it sits:** [[ANALYSIS - <SUBJECT NAME>/05 - SYSTEM ARCHITECTURE#The parts]]
**Built by:** [[ANALYSIS - <SUBJECT NAME>/07 - DEVELOPMENT ROADMAP#Phase 1 — <Name>|R-01]], [[ANALYSIS - <SUBJECT NAME>/07 - DEVELOPMENT ROADMAP#Phase 1 — <Name>|R-02]]
**Status:** ⭕ Not started

## Why it exists

<Two or three sentences. What would be missing without this part, and who would feel it. Not what it does — that is the next section. This one is the case for it existing at all, and it comes from the material, cited.>

## What it does

| # | What it does | Who asks for it | Where the need came from |
|---|---|---|---|
| 1 | <one job, in plain words> | <the person or the part that sets it going> | `<file>`, page <n> |
| 2 | <another> | <who> | [[ANALYSIS - <SUBJECT NAME>/04 - COMBINED FINDINGS#Promised but missing\|G-02]] |

## Who may use it

| Who they are | What they may do here | What they may not do | Where the rule came from |
|---|---|---|---|
| <plain description of the person> | <what is open to them> | <what is closed to them, and it matters that this column is filled in> | `<file>`, page <n> |

<If the material sets no rules about who may do what, say so plainly and raise it as a question in [[ANALYSIS - <SUBJECT NAME>/00 - START HERE#Open questions]]. Do not invent a sensible-sounding set of permissions — that is the single easiest place in this whole vault to start making things up.>

## The information it handles

| What it handles | What it is for | Where it is kept | Where this came from |
|---|---|---|---|
| <plain description of one piece of information> | <why the part needs it> | <the store, named plainly, or "passed through and not kept"> | `<file>`, line <n> |

## How it behaves, step by step

<One walk-through for each main journey through this part. Numbered, plain words, one step per line. These are what the flowcharts in [[ANALYSIS - <SUBJECT NAME>/06 - DIAGRAMS]] draw — the words and the picture must agree.>

**<Name of the journey — what the person is trying to do>**

1. <what the person does>
2. <what the part checks or works out>
3. <what the person sees, or where they end up>

**<Name of a second journey>**

1. <step>

## The states things move through

<Fill this in when something this part looks after moves through named states — a request that is waiting, then approved, then finished. Systems go wrong at the joins between states more than anywhere else, so this table earns its place.>

| From | To | What causes the move | Who can cause it | Can it go back? |
|---|---|---|---|---|
| <state> | <state> | <the event or action> | <who> | Yes — <how> / No |

<If nothing here moves through states, one line saying so.>

## What it checks before it agrees

| # | What is checked | What happens when the check fails | Where the rule came from |
|---|---|---|---|
| 1 | <the condition, in plain words> | <what the person sees or what the system does — not just "an error"> | `<file>`, page <n> |

<Every row traces to something the material actually says. A check that seemed sensible to you, rather than one the material asks for, is marked *drawn from* and names what it was drawn from — or it goes to *Open questions* instead.>

## When something goes wrong

<Prose, not a table. What happens when a step this part depends on fails partway — the store is unreachable, the thing it was waiting on never arrives, two people act at the same moment. What the person sees, and whether anything is left half-done. Where the material does not say, say that and raise the question. This section is not the same as the checks above: that one is about refusing bad input, this one is about recovering from a failure.>

## What it leans on, and what leans on it

**It cannot work without:**

| Part | What it needs from it | What happens if that part is not there yet |
|---|---|---|
| [[P-02 - <PART NAME>\|P-02]] | <what it takes from it> | <whether this part can be built early with something temporary, or simply cannot> |

**These need it:**

| Part | What it takes from this one |
|---|---|
| [[P-03 - <PART NAME>\|P-03]] | <what it takes> |

<Both tables are about need, not order. The order these get built in, and the argument for that order, live in [[ANALYSIS - <SUBJECT NAME>/07 - DEVELOPMENT ROADMAP]].>

## How you know it is finished

- <Something a person with no technical background could check for themselves, by using the system.>
- <Another one.>
- <One that checks a rule from the table above is genuinely enforced, not just written down.>

## What the material does not say

| # | What is unclear | Why it matters here |
|---|---|---|
| Q-<n> | <the gap, in plain words> | <what cannot be built, or must be guessed at, until it is answered> |

<Every row also appears in [[ANALYSIS - <SUBJECT NAME>/00 - START HERE#Open questions]] — this table is a pointer, not a second list. If the material settles everything about this part, one line saying so.>
````

---

## Filling these in

- Delete the angle brackets and the guidance text. None of it belongs in the finished page.
- **Say nothing twice.** Where a part sits belongs to `05`. When it gets built, and why then, belongs to `07`. The one line that appears in both `11` and `07` — the part's name and its one-sentence purpose — is a summary and its expansion, which is what a link is for. Everything beyond that line is written once.
- **Headings are frozen.** Rows are linked through the heading above them, exactly as roadmap items are. Reword a heading and every link pointing into that section dies. Reword the prose beneath it instead.
- **Empty sections say so in one line.** A part with no states says "Nothing here moves through named states." and the next section starts. Never pad a section because the template lists it.
- **The permissions table and the edge cases are where invention creeps in.** Both feel natural to fill from experience of how such systems usually work. Neither may be. Cite, mark *drawn from*, or raise a question.
- Statuses come from the legend in `references/planning-templates.md`, and a part's status is the state of the roadmap items that build it — ✅ only when all of them are finished, 🟨 when some are underway, 🔵 when the part was found already built in the supplied material.
- Two status cases are easy to get wrong, so they are settled here. A part found already built, but with roadmap items still outstanding against it, stays 🔵 — and its status line names the items that still change it. A part is never both 🔵 and ⭕. And an empty shell found in the material is not 🔵: it is ⭕, with the shell noted, because “already there” would send a reader away thinking it works.

## Checking the set

Before saying the pages are done:

- [ ] Every part listed in `11` has a page, and every page in `PARTS\` is listed in `11`.
- [ ] Every `P-` number is used once and runs in order.
- [ ] Every page's *Built by* names at least one `R-` item that really exists in `07`.
- [ ] Every link out of `PARTS\` carries the run folder in front of it.
- [ ] `00 - START HERE` has a row for `11`, and `10 - WORD LIST` has a *Next* on its navigation line.
- [ ] Every technical word that survived onto a part page is in `10 - WORD LIST`.
- [ ] Nothing was invented — every rule, permission, and check names its source or sits in *Open questions*.
