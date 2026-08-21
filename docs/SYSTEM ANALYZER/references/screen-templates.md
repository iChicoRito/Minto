# Screen Templates

Everything for `12 - SCREENS BY ROLE`. Written only when the user asks for it, and only worth writing when the system has more than one level of user.

---

## What this file is for

`11 - PARTS IN DETAIL` describes the parts of a system — what each one does and what it decides. `12 - SCREENS BY ROLE` describes what a person actually looks at, and which of those parts each level of person can reach through it.

These are different questions, and one does not answer the other. A part can be reached from four screens. A screen can touch four parts. Neither maps onto the other, which is why a screen described inside a part page ends up either repeated four times or missing.

Write this note when a system has two or more levels of user with different rights. A single-user system does not need it — say so and skip it.

---

## The honesty problem, and the only correct way round it

Most supplied material describes **needs**, not screens. A specification says a receptionist checks guests in; it does not say what the check-in screen shows or what it leads to. Source code holds the parts underneath and usually no screens at all.

That makes this the easiest file in the whole vault to fill with invention. Everything about it feels natural to make up — a sensible navigation, an obvious dashboard, a settings page every system has.

So `12` obeys three rules that no other note needs:

1. **It says what it is at the top.** The opening section states plainly that the material describes no screens, that every screen below is derived from a stated need, and that the note is a proposal to be argued with rather than a finding.
2. **Every screen names the need it came from,** in its own column, and marks itself *drawn from* when the need is one you inferred rather than one the material states.
3. **Missing screens are recorded, not filled.** A hotel with no walk-in screen, a school with nowhere to record a withdrawal — where a working system would obviously need something the material never mentions, that absence goes in a *What is missing* table. It is more useful than a plausible guess and it is honest.

If a run's material genuinely does describe screens — wireframes, a design document, an existing product — then those screens are findings and cite normally. Say which is which.

---

## The `S-` prefix

Screens use `S-`, numbered `S-01` upward, running in order across the whole note rather than restarting per level.

The full set of prefixes in use is `D-`, `C-`, `U-`, `M-`, `G-`, `X-`, `K-`, `Q-`, `R-`, `T-`, `P-`, `S-`, and `V-`. Same rules as everywhere: never reused, never renumbered.

`S-` numbers are for referring to a screen, not an order to build them in. Say so in the note, because a reader who has just come from `07` will assume otherwise.

---

## 12 - SCREENS BY ROLE.md

````markdown
# 12 - SCREENS BY ROLE

[[00 - START HERE|Back to start]] · Previous: [[11 - PARTS IN DETAIL]]<add `· Next: [[13 - REVISION LOG]]` once the run has been revised>

## Read this first

<The honesty section. States that the material describes no screens, that everything below is derived from a stated need, and that this note is a proposal rather than a finding. If the material does describe screens, say that instead and say which ones.>

## The <n> levels

| Level | What they come here to do | Where it says so |
|---|---|---|
| <plain name> | <what they are trying to get done> | `<file>`, <section> |

<One line saying that a person sees the screens for their level and no others, and whether the material's system does that today.>

## <Level name>

| # | Screen | What is on it | Where it leads | Parts behind it | Where the need came from |
|---|---|---|---|---|---|
| S-01 | <plain name> | <the things a person sees, in plain words> | S-02, or <what happens instead> | [[PARTS/P-01 - <PART NAME>\|P-01]] | `<file>`, <section> |
| S-02 | <plain name> | <what is on it> | <where next> | [[PARTS/P-02 - <PART NAME>\|P-02]] | *Drawn from* `<file>`, <section> |

<After each level's table, a short paragraph on the screens that carry a disputed or unenforced rule — the ones that cannot be finished until an open question is answered, or until a roadmap item is built. This is where the table earns its place.>

## <Next level name>

<Same shape. One section per level, in the order the levels appear in the material.>

## Where the levels overlap

| Screen | <Level 1> | <Level 2> | <Level 3> |
|---|---|---|---|
| S-01 <short name> | Own only | Any | No |

<One table, the screens down the side and the levels across the top. Then a short paragraph naming the cells the material's system currently gets wrong, each cited. This table is what a reader will photograph and take to a meeting.>

## What is missing

Screens a working system would obviously need, that this material gives no basis for. Recorded rather than invented.

| What is missing | Why it is not above |
|---|---|
| <the screen a reader would expect> | <the material never mentions it — cite the open question if there is one> |

<If the material covers everything, one line saying so. It rarely does.>
````

---

## Filling this in

- **Screens are named for what a person is doing,** not for the part behind them. "Today" beats "Arrivals and departures list". "My bookings" beats "Booking index".
- **The *Where it leads* column is the whole reason this is a note and not a list.** A screen with nothing after it is either an ending or a mistake — say which.
- **The *Parts behind it* column is the join to `11`.** Every part named there must have a page or a row in the *Parts without a page* table. A screen reaching a part that appears nowhere in `11` means one of the two files is wrong.
- **The overlap table goes last and is the most useful thing here.** Levels across the top, screens down the side. Fill every cell — an empty cell reads as "not thought about", and "No" is information.
- **Do not invent a level.** If the material names four levels, there are four sections. An owner who is described as a manager is not a fifth level, and saying so is a finding.
- **Do not invent an ordering.** Which screens get built when belongs to `07 - DEVELOPMENT ROADMAP`, and screens usually do not map one-to-one onto roadmap items anyway.
- **Statuses are not used here.** A screen is not built or unbuilt in the way a roadmap item is — what is built is the parts behind it. If a screen cannot be finished, say which roadmap item or open question is holding it, in the paragraph under its table.

## Checking the set

- [ ] Every `S-` number is used once and runs in order across the whole note.
- [ ] Every level named in the material has a section, and no section names a level the material does not.
- [ ] Every part in the *Parts behind it* column appears in `11 - PARTS IN DETAIL`, with a page or a stated reason for not having one.
- [ ] Every screen names where the need came from, and anything inferred says *drawn from*.
- [ ] The overlap table has no empty cells.
- [ ] The *What is missing* table exists, or one line says why it does not.
- [ ] `00 - START HERE` has a row for `12`, and `11 - PARTS IN DETAIL` has a *Next* on its navigation line.
