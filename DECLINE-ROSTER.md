# Decline — reserved list and enemy roster

> **Status: design, ready to lift.** Written against `ART-DIRECTION.md` (laws
> 5, 6, 7, 9, 10, 11) in the flat cartoon the first six acts are drawn in
> (G-038, D-025); only the colours and shapes change. Same shape as
> `FAMILY-ROSTER.md` §1–§7. Ages 55 to 84, on a 120-second clock (the clock
> keeps shrinking: 300, 300, 240, 210, 180, 150, 120 — twenty-nine years in two
> minutes, and the game never says so, until here, where the boss is a clock).
>
> The seventh and last act (PLAN.md: stairs, medications, insurance forms,
> your own knees; boss **Time**, which has no health bar, only a clock —
> survive it and you die anyway, and that is the certificate the title
> promised). Two new `EnemyDef` fields (§3.1, §3.5), the meeting's hold reused
> in a form that never ends (§3.4), one new boss kind (§4). The act's tones
> are new (§1) and take the catalogue to D-028's bound exactly.

## 1 · The reserved list (`G-011`, law 11)

Five shapes and the boss's. The consequence strings lift verbatim.

| Reserved | Held by | Consequence |
|---|---|---|
| **Capsule** — a pill in two halves, one darker, seen side-on | `medication` | The only capsule, and the smallest thing in the act. |
| **Front** — a long low bank of cloud side-on with rain lines falling from it, at twice the width of anything else | `weather` | The only cloud, and the widest thing; the only thing with lines falling from it. |
| **Flight of stairs** — six steps rising left to right, seen side-on, one rail above them | `stairs` | The only steps, and the only rail. |
| **Knees** — two rounded kneecaps side by side, one face apart, with one face in the hollow between them | `your-knees` | The only pair in the act: nothing else comes in twos. |
| **Form on a board** — a portrait sheet on a clipboard, three tick boxes down its left side | `insurance-form` | The only board and the only boxes. (The Office's clip is the Office's; the list is per act.) |
| **Clock face** — a round face with two hands and no numbers, at boss scale | `boss-time` | The only circle in the act, and the only hands. |

**Threat colours held back:**

| Class | Held by | Why |
|---|---|---|
| **Contact `#C4472E`** | `weather` | The act's heaviest hit is its only red thing: the rain. |
| **Elite `#7C5C8A`** | `stairs` | The meeting's colour on the steps: the slow heavy thing you climb. |
| **Ranged `#D69A3C`** | `insurance-form` — **on the decision it fires, never its body** (`G-031`); in data, `PROJECTILE_HOLDER` | The only gold in the act. |
| **Boss `#2F7370`** | `boss-time` | The clock's rim and its hands. |

**The act's tones** — new, into `ACT_TONES` (`decline-*`): `decline-deep
#34433C` (the ward's floor; the act background), `decline-mid #7E9B8E` (the
corridor's wall, sage), `decline-light #CDE5D2` (mint; pickups only, law 10,
G-030). The palest, greyest act in the life, on purpose. Measured in Oklab
against the catalogue, each tone's nearest neighbour is 0.048, 0.059 and 0.046
away (school-deep, service-mid, paper), above the grain tolerance. The
catalogue goes to 32 of D-028's 32: the life's last act fills the last three.

### Why the vocabulary is what it is

Everything in the act is what the body and the building now do to you:
medicine, weather, steps, joints, paperwork. Nothing is a person, and the one
thing that is part of a person is your own (law 9 has nothing to render: the
knees are drawn in bone with a worried face between them, and they are not
somebody else's). The boss is the only thing in the life that was there the
whole time.

## 2 · What the act is

Decline's costume of the life script: **the record is read back to you.** The
antibody's stacks from Conception, the invoices from College, the notices
from Family — every act's accumulator was a costume of the same file, and
this act's is your own knees. The act's new pressure is **time**: the clock
the HUD has shown as an age since the Egg is the boss, it cannot be hurt, and
the win is that it runs out.

| | Enemy | Teaches |
|---|---|---|
| Crowd | Medication | That taking care of yourself is a chase, and it hurts when it catches you first |
| Velocity | Weather | That the weather is now a thing that happens to you |
| Accumulator | Your knees | That the file has been you all along |
| Roadblock | Stairs | That the slow way up is the safe way, and the crowd cannot follow |
| **Ranged** | Insurance form | That the aimed thing decides what you are covered for |

Law 8 holds all the way to the end: nothing here is paying attention to you.
Time least of all.

## 3 · The enemies

All five are swarm-tier (D-018) except the stairs (elite): bold flat shapes,
one face each. Nothing in this act has skin; the knees are bone.

### 3.1 · Medication — crowd

**`whyThisStage`** — lift verbatim:

> Decline is the first stage where taking care of yourself is a thing you chase, and it hurts when it catches you first.

**Threat:** contact · **Colour:** bone capsule, one half shadow, ink seam · **Silhouette:** capsule

**48px** — a pill side-on, two halves, one dark. The seam is the read.

**Visual** — a rounded capsule, the left half bone, the right half shadow, an
ink seam between; two dots and a flat mouth on the bone half, looking at the
seam. The smallest thing in the act.

**Behaviour** — `chase`, `contact: 'damage'`, slow, small. **New field:**
`killHeal: 2` (PLACEHOLDER): killing it — taking it — heals that much. A dose
that reaches you first hurts (its `contactDamage`). A screen-clearing build
is well; a build that lets the crowd arrive is not.

**Why it earns its slot** — the only crowd in the life that is good for you,
if you get to it first.

### 3.2 · Weather — velocity

**`whyThisStage`** — lift verbatim:

> Decline is the first stage where the weather is something that happens to the player.

**Threat:** contact · **Colour:** bone cloud, `#C4472E` (contact) rain lines, ink edges · **Silhouette:** front

**48px** — a long low cloud with short lines falling from it. The width and
the lines are the read.

**Visual** — a flat bone bank of cloud, ink edges, five short red rain lines
under it; a face in the cloud looking down at its own rain (law 9: it is not
raining on you in particular).

**Behaviour** — `cross`, `contact: 'damage'`: enters on a heading, never
steers, leaves. The commute and the flat-pack again, wider and slower: a
front. Its rate puts one on the floor about every half minute.

**Why it earns its slot** — the act's heaviest hit, and the one nobody can do
anything about.

### 3.3 · Your knees — accumulator

**`whyThisStage`** — lift verbatim (DIRECTION-PANEL-2026-09-27, the line that named the act):

> Decline is where the record the player has been accumulating since before they were a person is finally read back to them by their own body.

**Threat:** none on its body · **Colour:** bone knees, ink face · **Silhouette:** knees

**48px** — two rounded kneecaps side by side, one face apart, a worried face
in the hollow between them. The pair is the read.

**Visual** — two bone domes, ink outlines, and between them two dots and a
short mouth turned down one step at each end — the only frown in the life.

**Behaviour** — `static`, `contact: 'attach'`, `invulnerable`, `spawnAt: 'lead'`,
`attach: { drag: 0.03, persists: true }` (0.03 is the antibody's drag, verbatim).
The antibody's final costume, mechanically identical (the panel's design):
unkillable, costs speed and never health, already where you are going.
`persists` for form: nothing follows, but the file is the file.

**Why it earns its slot** — the seventh accumulator costs the first stat
again: speed. The antibody comes home.

### 3.4 · Stairs — roadblock (elite)

**`whyThisStage`** — lift verbatim:

> Decline is the first stage where the slow way up is the safe way, and the crowd cannot follow.

**Threat:** elite · **Colour:** `#7C5C8A` (elite) steps, ink rail · **Silhouette:** flight of stairs

**48px** — six steps rising to the right, a rail above. The steps are the read.

**Visual** — purple flat steps seen side-on, an ink rail on two posts, a face
on the top step looking down the flight (at where you would come from).

**Behaviour** — a hold that never ends, not a mover: the meeting's verb (§3.4
of OFFICE-ROSTER) with `hold: { from: 130, to: 130, seconds: 0, holdSeconds: 600, slow: 0.45 }`
(PLACEHOLDERS): it lands at `lead` and stays for the act; inside it everything
moves at `slow`, its edge is a wall for enemies both ways, and the player walks
in and out. No damage, no drop, `invulnerable`. A flight of stairs is a
meeting that never adjourns: a refuge the crowd cannot enter, at the cost of
being slow in it, and a wall for the weather to break on — except that the
weather `cross`es, and a crosser is never walled (AUDIT seven, 49): the rain
comes up the stairs.

**Why it earns its slot** — the meeting's hold with the joke turned over:
the room held still was a trap in The Office and a refuge here.

### 3.5 · Insurance form — ranged

**`whyThisStage`** — lift verbatim:

> Decline is the first stage where the aimed thing decides what the player is covered for.

**Threat:** ranged · **Colour:** bone board and sheet, ink clip and boxes; `#D69A3C` on the decision it fires only (`G-031`) · **Silhouette:** form on a board

**48px** — a sheet on a board, three boxes down its left. The boxes are the
read.

**Visual** — a bone clipboard, the sheet a shade of bone or shadow on it, an
ink clip, three ink tick boxes with nothing in them; a face on the sheet
looking at the boxes, not at you (law 9: the form is being filled in by
nobody).

**Behaviour** — `static`, `contact: 'none'`, `ranged` with **new field**
`ranged.maxHpLoss` (PLACEHOLDER 0.05): in range and off cooldown it consults
the file (the telegraph: the boxes tick, one by one, the renderer's job),
fires a gold decision at where the player is; a hit does small damage and
lowers the player's maximum health by `maxHpLoss` of its current value for
the rest of the act, never below a labelled floor (PLACEHOLDER: a fifth of the
act's opening maximum). The HUD shows the maximum shrink. The renderer draws
the decision as the word `DENIED`, in the ranged gold, as HELLO? is drawn.

**Why it earns its slot** — the ranged slot's last escalation: the Egg aimed,
the substitute looked you up, the chat followed, the registrar held you, the
review docked you, the phone moved you, and this one decides how much of you
there is.

### 3.6 · Introduction order and placeholder schedule

**Every number from here to the end of §4 is a placeholder.** Nobody has played
any of it; `DECLINE.provisional` carries the sentence (D-022).

**The order is the design.** Age runs 55 to 84, a year every four seconds.
Medications from 0s: the first prescription. Your knees at 15s (59). Stairs at
30s (62). The weather at 45s (66), then about one every half minute. The form
at 60s (70). Nothing new after 60s; the last sixty seconds are escalation,
then Time.

| id | movement | contact | other fields | hp | speed | contactDamage | radius | displaySize | xp |
|---|---|---|---|---|---|---|---|---|---|
| `medication` | chase | damage | `killHeal: 2` | 6 | 56 | 3 | 12 | 40 | 2 |
| `weather` | cross | damage | — | 48 | 240 | 18 | 28 | 112 | 8 |
| `your-knees` | static | attach | `spawnAt: 'lead'`, `invulnerable`, `attach: { drag: 0.03, persists: true }` | 1 | 0 | 0 | 12 | 40 | 0 |
| `stairs` | static | none | `spawnAt: 'lead'`, `invulnerable`, `hold: { from: 130, to: 130, seconds: 0, holdSeconds: 600, slow: 0.45 }` | 1 | 0 | 0 | 0 | 96 | 0 |
| `insurance-form` | static | none | `ranged: { range: 440, consultSeconds: 1.2, cooldownSeconds: 7, projectileSpeed: 220, damage: 4, maxHpLoss: 0.05 }` | 16 | 0 | 0 | 24 | 80 | 8 |

Each has `act: 'decline'`, `frame: '<id>.png'` and its §3 heading as `name`.

```ts
export const DECLINE: ActDef = {
  id: 'decline', name: 'Decline', durationSeconds: 120, bossName: 'Time',
  boss: { kind: 'time', seconds: 60, sweepSeconds: 12, sweepLength: 520, sweepWidth: 40 },
  endWord: 'EVENTUALLY', age: { from: 55, to: 84 },
  provisional: '...',
  waves: [
    { fromSeconds: 0, enemyId: 'medication', rate: 0.7 },
    { fromSeconds: 15, enemyId: 'your-knees', rate: 0.12 },
    { fromSeconds: 30, enemyId: 'stairs', rate: 0.03 },
    { fromSeconds: 45, enemyId: 'weather', rate: 0.034 },
    { fromSeconds: 45, enemyId: 'medication', rate: 1.1 },
    { fromSeconds: 60, enemyId: 'insurance-form', rate: 0.05 },
    { fromSeconds: 80, enemyId: 'medication', rate: 1.6 },
    { fromSeconds: 80, enemyId: 'your-knees', rate: 0.25 },
    { fromSeconds: 100, enemyId: 'insurance-form', rate: 0.1 },
  ],
};
```

## 4 · Time

**What it is.** A clock face at boss scale: a bone dial with no numbers, a
boss-teal rim, two teal hands, and a small face where the hands meet (law 5:
a clock has had a face since the word). It stands on the floor as the Loan and
the Mortgage did. It is the only circle in the act.

**What it does.** Nothing to you, and nothing you do to it.

- **No health.** `invulnerable`: damage does nothing, and no bar moves for it.
  Its bar is its clock: `seconds` (PLACEHOLDER 60) counting down from its
  arrival, emptying left to right. The renderer shows seconds, not health.
- **The hand.** The minute hand is a sweep — `sweepLength` px from its centre,
  `sweepWidth` wide — turning once every `sweepSeconds`, clockwise, from its
  arrival, never faster. Touching it is the Egg's shot damage with the usual
  i-frames. Walking with it is safe; crossing it is timing; standing still is
  a hit every `sweepSeconds`.
- **The file.** At every quarter turn, one of your knees (§3.3) lands at the
  player's lead: the record keeps being read.
- **No shots, no fan, no phases.** It never shields, is never raced for, never
  moves, never restructures.

**The ending.** When `seconds` run out the hands stop, and the act ends on
one word: **EVENTUALLY.** The life is over and it was won: the certificate
reads *Natural causes. Age 84.* — the one the title promised. A death to its
hand or to anything in the act prints *Cause of death: Time. Age 79.* (or
whatever landed the hit). There is no act after Decline, so Family's paper
shows at the crossing into it, and Decline's paper is the certificate itself
(G-002, G-049).

**Numbers.** Sixty seconds; one turn every twelve; a 520px hand, 40 wide; the
Egg's damage on touch; a knee a quarter turn. All placeholders.

**Sim cost.** A seventh boss kind (`TimeBoss`): a timer, a rotating rectangle
hazard in `updateBoss` (the sweep's geometry exists for Backhand; this one is
anchored on the boss and turns on the clock), a knee spawn at each quarter,
the act's end on the timer rather than on `hp`, and the bots reading "seconds
left" where they read "boss left" (they cannot hurt it; their job is to live).

## 5 · Handoff

- **Two new `EnemyDef` fields** (`killHeal`, `ranged.maxHpLoss`), the hold in
  a permanent form (`seconds: 0`, `holdSeconds` long — check the hold's
  contraction divides by `seconds` nowhere), one new boss kind; tests in
  `decline.test.ts`. `maxHpLoss` must be honest in the HUD and the pause
  sheet (the maximum shrinks, visibly), and its floor labelled.
- **The win.** Today the life ends when the last act's boss dies. Time does
  not die: the world ends the life, won, when the timer runs out — `won` and
  the certificate's cause must come from that path, with the act's
  `endWord` first. `certificate.ts` reads *Natural causes* for a won life
  already; the age is the act's `age.to`.
- **One registry.** Five entries in `ENEMIES` under a Decline section, a test
  pinning the act to exactly these five, a drawing for each plus `boss-time`
  and `player-decline` (the same figure, a cardigan and a cane — the cane is
  the only prop that touches the floor), `DECLINE` into `ALL_ACTS` after
  `FAMILY`, and into `ACTS` once its atlas and frames exist; the smoke gains
  `decline`, `decline-play` and `decline-boss`, and the certificate reads
  *Age 84.*
- **The bots** need a hazard reading for a rotating sweep (keep off the line;
  cross behind the hand) and "seconds left" in the boss column; presence, not
  calibration.

## 6 · Not designed yet

- **Decline's item.** The panel's **Nap** (control: when health is low and off
  a long cooldown, the player stops, cannot move, takes no contact damage,
  heals a quarter; the clock keeps running — "you fell asleep in the chair").
- **Service**, the other branch at eighteen; **the choice at Prom's crossing**.
- **Sounds:** the pills rattling, the rain, the stairs' creak, the tick.

## 7 · Open question

The act's bet is that time is a pressure a player can feel: a boss you cannot
hurt, a hand you can only step over, a file that turns out to have been you.
Play it — did the end feel like winning, and did you want it to?
