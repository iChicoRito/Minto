# Revision Templates

Templates and rules for `13 - REVISION LOG`, and for the revision pass that writes it.

A run is written once and then lives for months. Material arrives late, a finding turns out to be wrong, something on the roadmap gets built. A revision is how the notes keep up without being thrown away and rewritten.

---

## What a revision is

A revision changes the parts of an existing run that a change actually touches, and records what it did. It is not a second analysis, and it is not a full rewrite. The notes are left reading as though they had been right all along; the trail of what was believed before lives in `13 - REVISION LOG`.

Two things follow from that, and they are the whole discipline of this file:

- **The notes stay clean.** A corrected claim is replaced, not struck through, not annotated in place, not left standing beside its replacement.
- **The log stays complete.** Nothing is quietly changed. Every correction says what it used to say, what it says now, and what settled it.

---

## The four kinds of change

Every revision starts with one of these. Naming which one it is decides what gets revisited.

| Kind | What it looks like | How it is cited |
|---|---|---|
| **New material** | A document arrives, a spec is updated, code has moved on since it was read | `<file name>`, received <date in full> |
| **Correction** | The user says a finding is wrong, a rule was misread, a decision has since been made | Corrected in conversation, <date in full> |
| **Progress update** | Something on the roadmap is now built, started, or blocked | Reported in conversation, <date in full> |
| **Answered question** | A `Q-` item gets a real answer | Answered by <person or document>, <date in full> |

A single revision pass may carry several kinds at once. It still gets one `V-` entry, with each change named separately inside it.

---

## What each kind touches

Start here, then follow the citations rather than trusting this table. It says where to look first, not where to stop.

| What changed | Revisit, in this order |
|---|---|
| A new or changed document | `02`, then `04`, `05`, `06`, `07`, `08`, `09`, `10` — and `11` and `12` if they exist |
| New or changed source code | `03`, then `04`, `05`, `06`, `07`, `08`, `09`, `10` — and `11` if it exists |
| A correction to something already written | The file the claim lives in, then every file that cites it |
| A progress update | `08`, `09`, and the *What state it is in* section of `01` |
| An answered question | `00`, then whatever the answer unblocks — usually `08`, sometimes a findings file |

**Then follow the trail properly.** Search the whole run folder for the ID of anything you changed — `G-02`, `R-11`, `P-04` — and for the words of the claim itself. A finding usually appears three or four times across the run: where it was found, where it fed the plan, where it became a task, and sometimes on a part page. Revising one of the four and leaving the rest is the most common way a revision goes wrong.

---

## Rules a revision never breaks

1. **Never renumber.** New items get new numbers on the end. `R-25` follows `R-24` even if it belongs, logically, in Phase 1. Renumbering silently breaks every link pointing at the old number.
2. **Never delete a row.** Work that is no longer wanted goes ⬜ Dropped with a reason. A question that is answered stays in the table with its answer beside it. A reference to `R-07` must always find `R-07`.
3. **Never reword a phase heading.** Roadmap items and tasks are linked through the heading they sit under, so a reworded heading breaks every link into that phase. Reword the description instead.
4. **Never rewrite a file whole.** A revision edits the sections a change reaches. A file that comes out entirely different is a sign the change was not understood.
5. **Never leave a corrected claim standing elsewhere.** See the search rule above.
6. **Never revise past the evidence.** A correction given in conversation is cited as a conversation, with its date. It does not become something the documents say.
7. **Never open a second run folder for the same subject.** One subject, one folder, however many revisions.

---

## When the material itself changed underneath

Every citation in the run names a file and a line or page. When the file behind a citation changes, those numbers rot — silently, and everywhere at once.

**If the material was copied into `MATERIAL\`:** replace the copy with the new version, then check every citation pointing at that file name. Lines move. A citation that now lands somewhere else is worse than no citation at all, because a reader will believe it. Record the replacement in the revision entry.

**If the material was left where it lives and its path recorded:** compare the file's date on disk against the *read* date in the *What was handed over* table in `00`. Anything newer gets re-read and its citations re-checked. Update the read date to the date of this revision.

Either way, `00`'s *What was handed over* table gains a row for anything new, and the *Last updated* date changes.

---

## When a revision is really a new analysis

Sometimes the material changes so much that the notes are describing a different system. If more than about half the run needs revising, say so plainly rather than grinding through it. Lay out what changed and let the user decide between carrying on with the revision and starting a fresh run under a different subject name, with the old one kept.

That decision belongs to the user. Making it quietly, either way, is the wrong move.

---

## The `V-` numbering

| Prefix | For | Lives in | Example |
|---|---|---|---|
| `V-` | One revision pass | `13` | `V-02` |

`V-01` is the first revision, not the first writing. A run that has never been revised has no `13 - REVISION LOG` at all — the file appears the first time something changes.

Numbers run in order and are never reused, exactly like every other prefix in this skill. Newest entries sit at the top of the file, so the numbers count down as you read.

---

## 13 - REVISION LOG.md

Written on the first revision, added to on every one after. Newest first.

````markdown
# 13 - REVISION LOG

[[00 - START HERE|Back to start]] · Previous: [[<the last file this run actually made>]]

Every change made to this analysis since it was first written. Newest first.

The notes themselves always read as current — they do not carry crossings-out. If you want to know what this analysis used to say, and why it stopped saying it, this is the file.

## At a glance

| # | Date | What prompted it | What it touched |
|---|---|---|---|
| V-02 | <date in full> | <one line> | `04`, `07`, `08` |
| V-01 | <date in full> | <one line> | `02`, `04` |

---

## V-02 — <date in full>

**What came in:** <What arrived, named exactly — the document, the correction, the progress report, the answer. With where it came from.>

**Kind of change:** New material / Correction / Progress update / Answered question

**In one line:** <What is different about this analysis now.>

### What changed, file by file

| File | What is different there |
|---|---|
| [[04 - COMBINED FINDINGS]] | <plain description of what changed> |

### What it used to say

| Where | It used to say | It says now | What settled it |
|---|---|---|---|
| [[02 - DOCUMENT FINDINGS#What the documents say the system must do\|D-04]] | <the old claim, in full enough words to be recognised> | <the new claim> | <the material or the conversation that changed it> |

<Only claims that turned out to be wrong or out of date belong here. New material that contradicts nothing already written does not.>

### Numbers added

| New | Where it sits | What it is |
|---|---|---|
| R-25 | [[07 - DEVELOPMENT ROADMAP#Phase 4 — <Name>\|Phase 4]] | <plain description> |
| T-31 | [[09 - TASK TRACKER#The tasks\|The tasks]] | <plain description> |

### Numbers retired

| # | Now | Why |
|---|---|---|
| R-11 | ⬜ Dropped | <reason, and who decided> |

<Retired, never removed. The row stays in its tracker.>

### Questions closed

| # | The answer | Who gave it | What it unblocked |
|---|---|---|---|
| Q-03 | <the answer in plain words> | <person, or the document that turned out to say> | [[08 - ROADMAP TRACKER#Phase 2 — <Name>\|R-09]], now ⭕ rather than ❌ |

### Questions raised

| # | Question | Why it matters | Who can answer |
|---|---|---|---|
| Q-11 | <question in plain words> | <what stays uncertain until this is answered> | <person or team> |

<New questions are added to *Open questions* in [[00 - START HERE]] as well. This table is the record of when they appeared.>

### Left alone on purpose

<Anything a reader might reasonably expect this change to have touched, and why it was not touched. One or two lines. This stops the next person redoing the pass to check.>

---

## V-01 — <date in full>

<Same shape.>
````

---

### The navigation line

`13` sits at the end of whatever chain the run turned out to have. On a standard run its *Previous* is `[[10 - WORD LIST]]`; where part pages were asked for, `[[11 - PARTS IN DETAIL]]`; where the screens note was made too, `[[12 - SCREENS BY ROLE]]`. Whichever file that is gains `· Next: [[13 - REVISION LOG]]` on the first revision. `13` itself has no *Next*.

---

## Writing a good revision entry

**Say what it used to say, in real words.** "The permission rule was corrected" tells a reader nothing. "It said any signed-in user could cancel any booking; the new version says only the person who made it, or a manager" tells them exactly what they used to believe.

**Name what settled it.** Every correction has a cause — a page in a new document, a sentence from the user, a line of code that was misread the first time. Without it, the entry is an assertion that the analysis is better now.

**Sections with nothing get one line.** "No numbers were retired." Then move on. An empty section is information — it says this revision added without taking anything away.

**One pass, one entry.** Ten small corrections given in one conversation are one `V-` entry with ten rows, not ten entries.

**Keep the plain-language rule.** `13` is written for the same reader as every other file — someone who has never opened a code editor. Read `references/writing-rules.md` again if a sentence starts drifting technical.
