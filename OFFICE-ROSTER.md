# The Office — reserved list and enemy roster

> **Status: design, ready to lift.** Written against `ART-DIRECTION.md` (laws
> 5, 6, 7, 8, 9, 10, 11) in the flat cartoon the first four acts are drawn in
> (G-038, D-025); only the colours and shapes change. Same shape as
> `COLLEGE-ROSTER.md` §1–§7. Ages 22 to 34, on a 180-second clock (the clock
> keeps shrinking: 300, 300, 240, 210, 180 — twelve years in three minutes,
> and the game never says so).
>
> The fifth act (PLAN.md: meetings, email, Slack pings, performance reviews,
> open floor plans; boss **The Reorg**, G-004). Three new `EnemyDef` fields
> (§3.1, §3.3, §3.5), one new field object (§3.4, the hold), one new boss kind
> (§4). The act's tones already exist in `palette.ts` (`office-*`), from the
> first test batch.

## 1 · The reserved list (`G-011`, law 11)

Five shapes and the boss's. The consequence strings lift verbatim.

| Reserved | Held by | Consequence |
|---|---|---|
| **Clipped sheet** — a portrait sheet with a paperclip over its top-left corner | `reply-all` | The only sheet in the act, and the only clip. Its children are the same sheet smaller, never a different shape. |
| **Carriage** — a long low commuter carriage side-on, three windows, two wheel-sets | `commute` | The only thing in the act with wheels, and the widest. |
| **Bell with a dot** — a small hand bell with one round dot floating above its right shoulder | `ping` | The only bell, and the smallest thing in the act. |
| **Ring of chairs** — eight small chair-backs on a circle around nothing | `meeting` | The only ring in the act, and the only thing drawn around an empty middle. |
| **Row of stars** — five flat five-pointed stars in a row, one filled | `performance-review` | The only stars. Nothing else in the act has points. |
| **Tree of boxes** — a flat org chart, four rows of outlined boxes joined by ruled connectors, at boss scale | `boss-reorg` | The only ruled geometry in the act (G-013), and the only thing with an empty top box. |

**Threat colours held back:**

| Class | Held by | Why |
|---|---|---|
| **Contact `#C4472E`** | `commute` | The act's heaviest hit is its only red thing. |
| **Elite `#7C5C8A`** | `meeting` | The test's and the project's colour on the slow heavy thing: the chairs are purple. |
| **Ranged `#D69A3C`** | `performance-review` — **on the rating it fires, never its body** (`G-031`); in data, `PROJECTILE_HOLDER` | The only gold in the act. |
| **Boss `#2F7370`** | `boss-reorg` | The chart's boxes and connectors. |

**The act's tones** are already in `ACT_TONES`: `office-deep #3A4A5C` (the
carpet; the act background), `office-mid #6B8299` (the partitions),
`office-light #A8B7C4` (the strip light; pickups only, law 10, G-030). No
enemy below wears `office-light`.

### Why the vocabulary is what it is

- **Email is a clipped sheet because the envelope is College's.** The list is
  per act, but a life is played in one sitting, and an envelope that meant a
  bill an act ago must not mean a message now. The clip is the read: a sheet
  with a clip is a memo, and a memo answered is a memo with more sheets.
- **The meeting is the chairs because the meeting is not the people (law 9).**
  Eight chair-backs on a circle around an empty middle: nobody in it is
  drawn, and the middle is where the player ends up.
- **The review is the stars because the review is the number.** Five stars,
  one filled. It fires the rating.

## 2 · What the act is

The Office's costume of the life script: **you are being measured.** Nothing
in College looked at you; it billed you. Nothing here looks at you either — it
counts you. The act's new pressure is **attention**: pings cost the one thing
every weapon runs on, the cadence, and the review's rating docks the one thing
the life has been saving, the level.

| | Enemy | Teaches |
|---|---|---|
| Crowd | Reply-all | That doing something about a thing is what makes more of it |
| Velocity | Commute | That twice a day the room is crossed by something that does not care that you are in it |
| Accumulator | Ping | That every notification costs a little of your attention, and they do not stop |
| Roadblock | Meeting | That a slow thing can hold a whole room still without touching anyone |
| **Ranged** | Performance review | That the aimed thing is a number about you, and it takes some back |

Law 8 holds: none of it is paying attention to you. The review is looking at
the file.

## 3 · The enemies

All five are swarm-tier (D-018) except the meeting (elite): bold flat shapes,
one face each — the meeting's chairs have none; its face is the empty middle.
D-007 on its face: nothing in this act is a person, and nothing is drawn with
skin.

### 3.1 · Reply-all — crowd

**`whyThisStage`** — lift verbatim:

> The Office is the first stage where dealing with a thing is precisely what makes more of it.

**Threat:** contact · **Colour:** bone sheet, ink clip and lines · **Silhouette:** clipped sheet

**48px** — a portrait sheet, a paperclip over its top-left corner, three
short ruled lines and a face low on the sheet. The clip is the read.

**Visual** — bone paper, ink clip, ink rules, two dots and a flat mouth,
looking straight out. A child is the same drawing at three quarters, then
half.

**Behaviour** — `chase`, `contact: 'damage'`, slow. **New field:**
`split: { children: 2, generations: 3, scale: 0.75 }` (PLACEHOLDER): when it
dies it spawns two of itself at `scale` of its hp, radius and size, each of
which splits again, three generations deep; the last generation drops the XP
(the parent drops none). A screen-clearing build turns the act into a blizzard
of its own success, which is the joke. Children are the same def with a
`generation` on the state, not a second entry (one registry).

**Why it earns its slot** — the crowd whose density is a function of the
player's damage, so a build that kills fastest is in the most trouble.

### 3.2 · Commute — velocity

**`whyThisStage`** — lift verbatim:

> The Office is the first stage where the same thing crosses the room twice a day at a speed set by nobody in it.

**Threat:** contact · **Colour:** `#C4472E` (contact) carriage, ink wheels, bone windows · **Silhouette:** carriage

**48px** — a long low red carriage side-on, three bone windows, two ink
wheel-sets. The length is the read.

**Visual** — flat red, bone windows with nothing in them, ink wheels, a face
in the front window looking along the track (eyes on the line, not at you).

**Behaviour** — `cross`, `patrol: true`, `contact: 'damage'`: driver's ed and
the deadline again, longer and heavier. The schedule puts it on a cadence of
twice a minute — morning and evening — so the player learns when to stand
clear.

**Why it earns its slot** — the act's heaviest hit, on a timetable.

### 3.3 · Ping — accumulator

**`whyThisStage`** — lift verbatim:

> The Office is the first stage where every small thing that wants a second of the player gets it, and the seconds add up to the day.

**Threat:** none on its body · **Colour:** bone bell, ink dot · **Silhouette:** bell with a dot

**48px** — a small hand bell, one dot above its shoulder. The dot is the read.

**Visual** — bone bell, ink handle and rim, an ink dot for the badge; no
face — a ping has no face, it has a count.

**Behaviour** — `static`, `contact: 'attach'`, `invulnerable`, `spawnAt: 'lead'`.
**New field:** `attach.cooldownMultiplier` (PLACEHOLDER 1.06): each worn ping
multiplies every active item's cooldown — the player fires slower for every
notification they are carrying. `drag: 0`: it costs attention, never speed.
The stacks come off at the crossing like acne's (not `persists`): pings are
not debt, they are the day.

**Why it earns its slot** — the fourth accumulator costs the fourth stat:
speed (Conception), size (Adolescence), XP (College), cadence (The Office).

### 3.4 · Meeting — roadblock (elite)

**`whyThisStage`** — lift verbatim:

> The Office is the first stage that takes the player's time without touching them.

**Threat:** elite · **Colour:** `#7C5C8A` (elite) chairs, ink legs · **Silhouette:** ring of chairs

**48px** — eight small chair-backs on a circle. The empty middle is the read.

**Visual** — the chairs are purple flat backs seen from above-and-behind,
ink legs; nothing in the middle, nobody in the chairs (law 9).

**Behaviour** — a hold, not a mover. **New field object** on the state, from
the def's `hold: { from: 260, to: 120, seconds: 30, holdSeconds: 12, slow: 0.6 }`
(PLACEHOLDERS): it spawns CENTRED ON THE PLAYER (`spawnAt: 'player'`, new),
contracts from `from` to `to` over `seconds`, holds at `to` for `holdSeconds`,
then ends. Inside it everything — the player, enemies, shots — moves at `slow`
(through `slowAt`, as Snooze's field does, so the sim has one hold). Its edge
is a wall for enemies both ways: those outside cannot come in, those inside
cannot get out. The player can walk through it (leaving the meeting early is
allowed and awkward). It deals no damage and drops nothing when it ends; it
cannot be damaged (`invulnerable`). Its sprite is the ring itself, scaled to
the live radius by the renderer.

**Why it earns its slot** — Conception's zone (the spermicide's ring) back in
a suit: the room held still, and whatever was in it with you kept in it.

### 3.5 · Performance review — ranged

**`whyThisStage`** — lift verbatim:

> The Office is the first stage where the aimed thing is a number about the player, and the number takes something back.

**Threat:** ranged · **Colour:** `#6E6353` (shadow) stars, bone the filled one; `#D69A3C` on the rating it fires only (`G-031`) · **Silhouette:** row of stars

**48px** — five stars in a row, one filled. The row is the read.

**Visual** — five flat shadow-grey star outlines on a bone strip, the second
filled in bone; a face on the strip below them looking at the stars, not at
you. Nobody is reviewing anybody (law 9).

**Behaviour** — `static`, `contact: 'none'`, `ranged` with **new field**
`ranged.xpLoss` (PLACEHOLDER 0.15): in range and off cooldown it consults the
file (the telegraph: the filled star blinks), fires a gold rating at where the
player is; a hit does small damage and takes `xpLoss` of the progress toward
the next level (never a level already reached). The renderer draws the rating
as the word `MEETS`, in the ranged gold, as the registrar's HOLD is drawn.

**Why it earns its slot** — the ranged slot's escalation: the Egg aimed, the
substitute looked you up, the chat followed, the registrar held you, and this
one docks you.

### 3.6 · Introduction order and placeholder schedule

**Every number from here to the end of §4 is a placeholder.** Nobody has played
any of it; `OFFICE.provisional` carries the sentence (D-022).

**The order is the design.** Age runs 22 to 34, a year every 15 seconds.
Reply-all from 0s: the first day. Pings at 15s. The first meeting at 40s, then
every 40s. The review at 60s (26). The commute at 75s (27), then twice a
minute. Nothing new after 90s; the last 90 seconds are escalation, then The
Reorg.

| id | movement | contact | other fields | hp | speed | contactDamage | radius | displaySize | xp |
|---|---|---|---|---|---|---|---|---|---|
| `reply-all` | chase | damage | `split: { children: 2, generations: 3, scale: 0.75 }` | 6 | 48 | 4 | 14 | 48 | 2 |
| `commute` | cross | damage | `patrol: true` | 40 | 320 | 18 | 26 | 104 | 8 |
| `ping` | static | attach | `spawnAt: 'lead'`, `invulnerable`, `attach: { drag: 0, cooldownMultiplier: 1.06 }` | 1 | 0 | 0 | 12 | 40 | 0 |
| `meeting` | static | none | `spawnAt: 'player'`, `invulnerable`, `hold: { from: 260, to: 120, seconds: 30, holdSeconds: 12, slow: 0.6 }` | 1 | 0 | 0 | 0 | 96 | 0 |
| `performance-review` | static | none | `ranged: { range: 460, consultSeconds: 1, cooldownSeconds: 5, projectileSpeed: 220, damage: 5, xpLoss: 0.15 }` | 16 | 0 | 0 | 26 | 88 | 8 |

Each has `act: 'office'`, `frame: '<id>.png'` and its §3 heading as `name`.

```ts
export const OFFICE: ActDef = {
  id: 'office', name: 'The Office', durationSeconds: 180, bossName: 'The Reorg',
  boss: { kind: 'reorg', thresholds: [2 / 3, 1 / 3], lateralMove: 220, memoShots: 5, memoSpacing: 36 },
  endWord: 'SYNERGY', age: { from: 22, to: 34 },
  provisional: '...',
  waves: [
    { fromSeconds: 0, enemyId: 'reply-all', rate: 0.9 },
    { fromSeconds: 15, enemyId: 'ping', rate: 0.15 },
    { fromSeconds: 40, enemyId: 'meeting', rate: 0.025 },
    { fromSeconds: 40, enemyId: 'reply-all', rate: 1.4 },
    { fromSeconds: 60, enemyId: 'performance-review', rate: 0.05 },
    { fromSeconds: 75, enemyId: 'commute', rate: 0.034 },
    { fromSeconds: 90, enemyId: 'reply-all', rate: 2.2 },
    { fromSeconds: 90, enemyId: 'ping', rate: 0.3 },
    { fromSeconds: 120, enemyId: 'performance-review', rate: 0.1 },
    { fromSeconds: 120, enemyId: 'reply-all', rate: 3 },
    { fromSeconds: 150, enemyId: 'ping', rate: 0.45 },
  ],
};
```

## 4 · The Reorg

**What it is.** G-004, built: an org chart that is alive. Four rows of
outlined boxes joined by ruled connectors, boss teal, at boss scale, standing
upright as if it were a creature; the box at the top is empty for the whole
fight; a face in one box of the second row. It is the only thing in the life
drawn with a ruler (G-013).

**What it does.** Same monster, same health, nothing added, everything moved.

- **The memo.** Idle → telegraph → attack on the Egg's timings; the attack is
  `memoShots` shots in a vertical column, `memoSpacing` apart, all moving
  together at where the player is: the memo goes down the chain. Standing
  between two shots is the answer, as it is for the Egg's fan.
- **The restructure.** At each of `thresholds` of its health (two thirds, one
  third) — not on a timer — the chart restructures: the boss moves to a new
  place on the field (rolled from the world's dice, at least 300 px from the
  player, inside the arena), the player's box moves sideways by `lateralMove`
  px perpendicular to the line to the boss (with i-frames, held inside the
  arena) and never up, and a meeting (§3.4) is spawned around the player where
  they land. The pattern changes and nothing gets stronger.
- **The chart stays.** Damaged boxes go grey and stay in the chart: the
  renderer shows the boss's health as boxes greying from the bottom row up,
  never as a shrinking bar alone. Placeholder: the bar stays too until a
  person has read the chart.

It never shields, is never raced for, and takes damage from anything.

**The ending.** At zero the chart does not fall. The connectors go slack, and
the act ends on one word: **SYNERGY.** A death to its memo prints *Cause of
death: The Reorg. Age 34.* Until Family exists, beating it ends the life, and
the certificate says natural causes at thirty-four.

**Numbers.** Two thresholds; `lateralMove` 220; five memo shots 36 px apart on
the Egg's telegraph, idle, speed and damage; health `BOSS_HP`. All placeholders.

**Sim cost.** A fifth boss kind (`ReorgBoss`), a column shot in `updateBoss`,
a threshold watcher that relocates the boss, shoves the player and spawns a
hold, and a hold in the sim (§3.4) that the renderer draws as chairs.

## 5 · Handoff

- **Three new `EnemyDef` fields** (`split`, `attach.cooldownMultiplier`,
  `ranged.xpLoss`), one new def object (`hold`) with its state and one new
  `spawnAt` (`'player'`); tests in `office.test.ts`.
- **The tuition stacks that persist into this act** need drawing here: the
  act's `attachFrame` is the ping, so AUDIT six's 38 lands now — worn stacks
  carry their own frame from the act that attached them (a `frame` on the
  stack, not on the act).
- **One registry.** Five entries in `ENEMIES` under an Office section, a test
  pinning the act to exactly these five, a drawing for each plus `boss-reorg`
  (the test batch's spec, redrawn as SVG under the same id) and
  `player-office` (the same figure, a tie and a mug), `OFFICE` into `ALL_ACTS`
  after `COLLEGE`, and into `ACTS` once its atlas and frames exist; the smoke
  gains `office` and `office-boss`, and the certificate reads *Age 34.*

## 6 · Not designed yet

- **The document at the crossing:** the performance review itself, from the
  run's stats (the diploma's successor).
- **Family**, where the life goes at thirty-four; **Service**, the other
  branch at eighteen.
- **Sounds:** the ping, the carriage, the chairs scraping, the memo.

## 7 · Open question

The act's bet is that measurement is a pressure a player can feel: a cadence
that slows for every ping worn, a level that slips back when a rating lands.
Play it — did you feel counted, or was it just slower?
