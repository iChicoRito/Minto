# 01 - OVERVIEW

[[00 - START HERE|Back to start]] · Next: [[02 - DOCUMENT FINDINGS]]

## What it is

A tool that runs in a web browser and turns rough, one-line instructions — the kind a person types at an AI assistant — into tidy, well-organised documents an AI assistant can follow more reliably. It does this without any artificial intelligence of its own: it recognises patterns in the wording, applies hand-written rules, and fills in a structure. It asks for no account, charges nothing, and keeps everything on the person's own device. The material calls it the Prompt Enhancer — `prompt-enhancer-detailed-context.md`, line 3.

## Who uses it

| Who they are | What they come here to do |
|---|---|
| One person, working at their own computer, who writes instructions for AI assistants and wants those instructions to come out better | Turn a rough sentence into a structured prompt, keep the good ones, and get them back later |

The material names no other kind of user — no teams, no sign-in, no roles. It is a single-person tool by design (`prompt-enhancer-detailed-context.md`, lines 34–41).

## What it does

In the order a user would meet it:

- The person types a rough instruction, such as "Fix my login because it sometimes fails" (`prompt-enhancer-detailed-context.md`, lines 378–380).
- The tool works out what kind of instruction it is — a bug report, a new feature, a piece of research — by scoring signal words, and says how sure it is (`prompt-enhancer-detailed-context.md`, lines 351–419).
- It pulls out the useful pieces: what is being asked for, which technologies are named, and any "don't touch X" limits (`prompt-enhancer-detailed-context.md`, lines 266–347).
- Hand-written rules decide which headings the finished prompt should have, and how much structure the chosen strength level — light, standard, or detailed — should add (`prompt-enhancer-detailed-context.md`, lines 423–553).
- A ready-made shape for that kind of task is chosen, and the final document is written out as Markdown — a plain way of marking up headings and lists (`prompt-enhancer-detailed-context.md`, lines 557–638).
- The person sees the result beside a live preview, can edit it, copy it, save it, or export it (`prompt-enhancer-detailed-context.md`, lines 642–702).
- Ready-made starting points — called presets, such as "Bug Fix" or "Research Topic" — skip the guesswork by setting everything up in advance (`prompt-enhancer-detailed-context.md`, lines 706–756).
- Every enhancement can be kept automatically in a running history; prompts worth keeping go into a personal library with favourites, folders, and tags (`prompt-enhancer-detailed-context.md`, lines 838–912).
- The whole collection can be written out to a single backup file and brought back in again, checked on the way (`prompt-enhancer-detailed-context.md`, lines 916–947).
- Settings cover defaults, which sections appear, the look of the app, and how much history is kept (`prompt-enhancer-detailed-context.md`, lines 950–1001).
- The app says plainly, in its own pages, that nothing is sent anywhere (`prompt-enhancer-detailed-context.md`, lines 1005–1027).
- Later, it should install like a normal app and keep working with no internet (`prompt-enhancer-detailed-context.md`, lines 1203–1226).

## What state it is in

An idea on paper. The material is a build plan — twenty-five numbered phases of instructions for constructing the tool, an ordered build sequence, and a list of future releases (`prompt-enhancer-detailed-context.md`, lines 7–1334). Nothing in it reports that any part has been started, and no working files were supplied with it. Every item on the plan in [[07 - DEVELOPMENT ROADMAP]] therefore starts as not begun — see [[08 - ROADMAP TRACKER]].

## What it does not do

The material draws the boundaries explicitly (`prompt-enhancer-detailed-context.md`, lines 32–41):

- No AI integration in version 1 — the enhancement is rule-following, not thinking. An optional AI assist is deferred to a distant version 2.0 (lines 1321–1334).
- No accounts, sign-in, or user profiles.
- Nothing you make is stored anywhere except your own device — no cloud store, no syncing between devices.
- No payments and no teams.
- No server doing work behind the scenes — the finished app is a set of fixed files handed to the browser, full stop (lines 1230–1265).

## Where the details are

How the pieces fit together is in [[05 - SYSTEM ARCHITECTURE]], the pictures are in [[06 - DIAGRAMS]], and the build order with every item numbered is in [[07 - DEVELOPMENT ROADMAP]].
