# Family — reserved list and enemy roster

> **Status: design, ready to lift.** Written against `ART-DIRECTION.md` (laws
> 5, 6, 7, 9, 10, 11) in the flat cartoon the first five acts are drawn in
> (G-038, D-025); only the colours and shapes change. Same shape as
> `OFFICE-ROSTER.md` §1–§7. Ages 34 to 55, on a 150-second clock (the clock
> keeps shrinking: 300, 300, 240, 210, 180, 150 — twenty-one years in two and a
> half minutes, and the game never says so).
>
> The sixth act (PLAN.md: bills, toddlers, HOA letters, flat-pack instructions;
> boss **The Mortgage**). Five new `EnemyDef` fields (§3.1, §3.3, §3.4 ×2,
> §3.5), one new boss kind (§4), and a sixth entry that is the boss's (the
> room, §4). The act's tones are new (§1) and go into `ACT_TONES` as the
> earlier rosters' did.

## 1 · The reserved list (`G-011`, law 11)

Six shapes and the boss's. The consequence strings lift verbatim.

| Reserved | Held by | Consequence |
|---|---|---|
| **Windowed envelope** — a landscape envelope with a clear address window low on its face | `bill` | The only envelope in the act (College's invoices are College's), and the only address window (the house's windows are its eyes). A late fee is the same envelope, never a different shape. |
| **Flat box** — a long flat closed carton side-on, one strip of tape down its middle, at twice the width of anything else | `flat-pack` | The only box, the only tape, and the widest thing. |
| **Sealed letter** — a tri-fold sheet standing open like a tent, a round seal on its top panel | `hoa-letter` | The only seal, and the only thing folded. |
| **Bib with arms** — a round bib, two short sleeves raised beside it, nothing above | `toddler` | The only thing in the act reaching up, and the smallest mover. |
| **Wall phone** — an upright body with a handset laid across its top and a coiled cord looping down one side | `phone-call` | The only cord, and the only coil. |
| **Room** — a square drawn as a floor plan, walls in section, a door gap in one side with the door's swing on the floor | `room` | The only square in the act, and the only outline with a gap. Solid. |
| **House with a face** — a gabled house front, a door and two windows, at boss scale | `boss-mortgage` | The only gable, and the only thing with a roof. |

**Threat colours held back:**

| Class | Held by | Why |
|---|---|---|
| **Contact `#C4472E`** | `flat-pack` | The act's heaviest hit is its only red thing: the tape. |
| **Elite `#7C5C8A`** | `toddler` | The meeting's colour on the bib: the act's elite weighs twelve kilos, which is the joke. |
| **Ranged `#D69A3C`** | `phone-call` — **on the call it fires, never its body** (`G-031`); in data, `PROJECTILE_HOLDER` | The only gold in the act. |
| **Boss `#2F7370`** | `boss-mortgage` | The house's walls and roof. The rooms it adds are not the boss's colour (they do not hurt, law 10): wallpaper, below. |

**The act's tones** — new, into `ACT_TONES` (`family-*`): `family-deep #4D3A1F`
(umber; the carpet, the act background), `family-mid #A3812F` (mustard; the
wallpaper), `family-light #F3E3A6` (butter; the fridge light — pickups only,
law 10, G-030). Measured in Oklab against the catalogue: the nearest existing
colour to each is 0.078, 0.072 and 0.058 away (school-deep, service-mid,
paper), all above the grain tolerance; the light is 0.058 from paper, which
is the player's, so no enemy wears it and pickups are the only butter thing
on the floor. The catalogue goes to 29 of D-028's 32.

### Why the vocabulary is what it is

Everything in the act is post, packaging or plumbing: a family is the first
place in the life where the pressure arrives addressed to you by name and
none of it is a person. The one thing that is a person is drawn as what it is
wearing (law 9): the toddler is a bib and two sleeves, seen from the height of
the leg it is about to hold. Nothing in the act has skin (D-007 on its face).

## 2 · What the act is

Family's costume of the life script: **you are needed.** College billed you,
the Office counted you; nothing here does either — it wants you, now, over
there. The act's new pressure is **reach**: the letters shrink the radius the
life picks things up at, the toddler takes a hand, the phone moves you across
the room, and the bills you leave alone breed.

| | Enemy | Teaches |
|---|---|---|
| Crowd | Bill | That leaving a thing alone is what makes more of it |
| Velocity | Flat-pack | That the heaviest thing in the room is something you carried in |
| Accumulator | HOA letter | That every rule of the place you live makes the place smaller |
| Roadblock | Toddler | That the thing slowing you down can be thrilled to see you |
| **Ranged** | Phone call | That the aimed thing wants nothing but you, somewhere else |

Law 8 (retired as a law, kept as a flavour) bends here on purpose: the
toddler is the one enemy in the life that is paying attention to the player.
Everything else is still not.

## 3 · The enemies

All five are swarm-tier (D-018) except the toddler (elite): bold flat shapes,
one face each — the bill's window is its face; the letter's seal is its face;
the phone's is on the body, looking at the handset.

### 3.1 · Bill — crowd

**`whyThisStage`** — lift verbatim:

> Family is the first stage where leaving a thing alone is precisely what makes more of it.

**Threat:** contact · **Colour:** bone envelope, ink window frame · **Silhouette:** windowed envelope

**48px** — a landscape envelope, a window low on its face, a flap line across
the top. The window is the read.

**Visual** — bone paper, the flap in ink, the window framed in ink with two
dots and a flat mouth inside it where the address would be, looking straight
out. A late fee is the same drawing.

**Behaviour** — `chase`, `contact: 'damage'`, slow. **New field:**
`accrue: { seconds: 8, fees: 2 }` (PLACEHOLDER): a bill alive for `seconds`
issues a late fee — one more bill beside it, the same def with `fee` on the
state — up to `fees` per bill; a fee does not accrue (a fee on a fee is a
different act). Killing bills promptly is the answer, and a build that ignores
the crowd to chase the elite finds the crowd doubled. The reply-all's mirror:
there, dealing with it made more; here, not dealing with it does.

**Why it earns its slot** — the crowd whose density is a function of the
player's neglect, so a build that kills slowest is in the most trouble.

### 3.2 · Flat-pack — velocity

**`whyThisStage`** — lift verbatim:

> Family is the first stage where the heaviest thing in the room is something the player carried in.

**Threat:** contact · **Colour:** bone carton, `#C4472E` (contact) tape, ink edges · **Silhouette:** flat box

**48px** — a long flat box side-on, a red strip of tape down its middle. The
length is the read.

**Visual** — flat bone carton, ink edges, the red tape; a face printed on the
box as the assembly diagram would be, two bolt-head dots and a dashed fold
line for a mouth, looking along the box (at where it is going, not at you).

**Behaviour** — `cross`, `contact: 'damage'`: it enters on a heading and never
steers, because it cannot turn the corner. Not `patrol`: it leaves. The
commute again, without the timetable.

**Why it earns its slot** — the act's heaviest hit, and the only one that
never comes back for you.

### 3.3 · HOA letter — accumulator

**`whyThisStage`** — lift verbatim:

> Family is the first stage where the rules of the place the player lives arrive by post, and every one makes the place smaller.

**Threat:** none on its body · **Colour:** bone letter, ink seal · **Silhouette:** sealed letter

**48px** — a tri-fold sheet standing open, a round seal on the top panel. The
seal is the read.

**Visual** — bone paper, ink fold lines, the seal an ink ring with two dots
and a flat mouth in it: the letter is signed by the committee, and the
committee is the seal (law 9).

**Behaviour** — `static`, `contact: 'attach'`, `invulnerable`, `spawnAt: 'lead'`.
**New field:** `attach.pickup` (PLACEHOLDER 0.93): each worn notice multiplies
the radius the player picks gems up at — the lawn ends closer than it did.
`drag: 0`: it costs reach, never speed. `persists: true`: the notices stay on
through the crossing as tuition's invoices do; a file follows you.

**Why it earns its slot** — the fifth accumulator costs the fifth stat:
speed (Conception), size (Adolescence), XP (College), cadence (The Office),
reach (Family).

### 3.4 · Toddler — roadblock (elite)

**`whyThisStage`** — lift verbatim:

> Family is the first stage where the thing slowing the player down is thrilled to see them.

**Threat:** elite · **Colour:** `#7C5C8A` (elite) bib, bone sleeves, ink face · **Silhouette:** bib with arms

**48px** — a round bib, two short sleeves up beside it. The reach is the read.

**Visual** — a purple bib with a face printed on it (two dots, a wide flat
mouth: the only smile in the life), two bone sleeves raised, nothing above the
bib — it is seen from the height of the leg it is about to hold, and the face
is the bib's (law 9). It is the smallest mover in the act.

**Behaviour** — `chase`, `contact: 'engulf'`, `invulnerable` (the game never
asks anyone to hit it: G-018, and law 9's whole point), `spawnAt: 'trail'`.
**New field:** `coy: { flee: 1.6, approach: 0.5 }` (PLACEHOLDERS): its speed
is multiplied by `flee` while the player is moving away from it and by
`approach` while the player is moving toward it — it wants to be chased, and
the answer is to walk at it and round it. **New field:**
`engulf.cooldownMultiplier` (PLACEHOLDER 1.4) on
`engulf: { seconds: 3, slow: 0.3, damagePerSecond: 0 }`: the hold does no
damage; while it lasts every active item's cooldown is multiplied, because the
player has one hand. When the window ends it lets go and **despawns**,
delighted (`engulf.releases: true`, new: not a kill, no drop); the stream
sends another.

**Why it earns its slot** — the meeting's cousin: the room held still without
touching anyone, except this one is touching you, and pleased about it.

### 3.5 · Phone call — ranged

**`whyThisStage`** — lift verbatim:

> Family is the first stage where the aimed thing wants nothing from the player but the player, somewhere else.

**Threat:** ranged · **Colour:** bone body, ink handset and cord; `#D69A3C` on the call it fires only (`G-031`) · **Silhouette:** wall phone

**48px** — an upright body, a handset across its top, a cord coiling down one
side. The coil is the read.

**Visual** — bone body, ink handset, ink cord in three loops, a face on the
body under the handset looking up at it, not at you (law 9: nobody is calling
anybody; the phone is ringing).

**Behaviour** — `static`, `contact: 'none'`, `ranged` with **new field**
`ranged.pull` (PLACEHOLDER 180): in range and off cooldown it rings (the
consult: the handset lifts and shakes, the renderer's job), fires a gold call
at where the player is; a hit does small damage, stops the player for
`stun` (0.3) and moves them `pull` px toward the phone — you were needed. The
renderer draws the call as the word `HELLO?`, in the ranged gold, as MEETS is.

**Why it earns its slot** — the ranged slot's escalation: the Egg aimed, the
substitute looked you up, the chat followed, the registrar held you, the
review docked you, and this one moves you.

### 3.6 · Introduction order and placeholder schedule

**Every number from here to the end of §4 is a placeholder.** Nobody has played
any of it; `FAMILY.provisional` carries the sentence (D-022).

**The order is the design.** Age runs 34 to 55, a year every seven seconds.
Bills from 0s: the first month. The first flat-pack at 20s (37), then one
every half minute. HOA letters at 30s (38). The first toddler at 45s (40),
then one every 30s. The phone at 70s (44). Rooms at 100s (48): the house
starts growing before the Mortgage arrives. Nothing new after 100s; the last
fifty seconds are escalation, then The Mortgage.

| id | movement | contact | other fields | hp | speed | contactDamage | radius | displaySize | xp |
|---|---|---|---|---|---|---|---|---|---|
| `bill` | chase | damage | `accrue: { seconds: 8, fees: 2 }` | 8 | 52 | 4 | 14 | 48 | 2 |
| `flat-pack` | cross | damage | — | 40 | 260 | 16 | 26 | 104 | 8 |
| `hoa-letter` | static | attach | `spawnAt: 'lead'`, `invulnerable`, `attach: { drag: 0, pickup: 0.93, persists: true }` | 1 | 0 | 0 | 12 | 40 | 0 |
| `toddler` | chase | engulf | `spawnAt: 'trail'`, `invulnerable`, `coy: { flee: 1.6, approach: 0.5 }`, `engulf: { seconds: 3, slow: 0.3, damagePerSecond: 0, cooldownMultiplier: 1.4, releases: true }` | 1 | 70 | 0 | 14 | 44 | 0 |
| `phone-call` | static | none | `ranged: { range: 440, consultSeconds: 1.2, cooldownSeconds: 6, projectileSpeed: 240, damage: 4, stun: 0.3, pull: 180 }` | 16 | 0 | 0 | 24 | 80 | 8 |
| `room` | static | none | `merge: true`, `invulnerable`, `spawnAt: 'lead'` | 1 | 0 | 0 | 40 | 96 | 0 |

Each has `act: 'family'`, `frame: '<id>.png'` and its §3 heading as `name`;
the room's name is "Room" and its `whyThisStage` is §4's.

```ts
export const FAMILY: ActDef = {
  id: 'family', name: 'Family', durationSeconds: 150, bossName: 'The Mortgage',
  boss: { kind: 'mortgage', instalments: 12, instalmentSeconds: 5, roomId: 'room', feeId: 'bill' },
  endWord: 'EQUITY', age: { from: 34, to: 55 },
  provisional: '...',
  waves: [
    { fromSeconds: 0, enemyId: 'bill', rate: 0.8 },
    { fromSeconds: 20, enemyId: 'flat-pack', rate: 0.034 },
    { fromSeconds: 30, enemyId: 'hoa-letter', rate: 0.12 },
    { fromSeconds: 45, enemyId: 'toddler', rate: 0.034 },
    { fromSeconds: 45, enemyId: 'bill', rate: 1.2 },
    { fromSeconds: 70, enemyId: 'phone-call', rate: 0.05 },
    { fromSeconds: 90, enemyId: 'bill', rate: 1.8 },
    { fromSeconds: 90, enemyId: 'hoa-letter', rate: 0.25 },
    { fromSeconds: 100, enemyId: 'room', rate: 0.02 },
    { fromSeconds: 120, enemyId: 'phone-call', rate: 0.1 },
    { fromSeconds: 120, enemyId: 'bill', rate: 2.4 },
  ],
};
```

## 4 · The Mortgage

**What it is.** A house front with a face — two windows for eyes, the door
for a mouth — boss teal, gabled, at boss scale, standing on the floor as the
Loan's machine did. It is the only thing in the act with a roof.

**What it does.** It is paid on a schedule, not in a hurry.

- **Instalments.** Its health is `BOSS_HP`, owed in `instalments` equal
  parts. Time runs in windows of `instalmentSeconds`; damage dealt in a window
  counts toward that window's instalment only, and **caps at one instalment**
  — there is no prepayment, and the overflow is lost. A window in which the
  instalment was met is *paid*; one in which it was not is *missed*, and the
  balance does not move. The fight lasts at least `instalments ×
  instalmentSeconds` whatever the build, which is the joke and the design.
- **The house grows.** At the end of every window, paid or missed, a **room**
  (§3.6's `room`: static, solid, merging, unkillable) lands at `lead`: the
  house builds around where the player is going, and by the last instalment
  the arena is a floor plan. Rooms never land on the player (`lead` is
  farther than a room's radius).
- **The late fee.** A missed window spawns one **bill** (§3.1) at the door: a
  fee that chases and, left alone, accrues.
- **The statement.** Idle → telegraph → attack on the Egg's timings; the
  attack is one aimed shot at where the player is, drawn as the word `DUE`
  in the ranged gold. One shot, not the fan: the Mortgage is not trying to
  hit you, it is reminding you.

It never shields, is never raced for, never moves, and accepts damage from
anything — one instalment's worth at a time.

**The bar.** The renderer shows `instalments` notches filling left to right,
never a smooth bar alone: the health is a schedule. Placeholder: the bar stays
too until a person has read the notches.

**The ending.** On the twelfth payment the door opens (the mouth, the
renderer) and the act ends on one word: **EQUITY.** A death to its statement
prints *Cause of death: The Mortgage. Age 55.* Until Decline exists, beating
it ends the life, and the certificate says natural causes at fifty-five.

**Numbers.** Twelve instalments of five seconds; one room a window; one bill a
missed window; the Egg's telegraph, idle, speed and damage on the statement;
health `BOSS_HP`. All placeholders.

**Sim cost.** A sixth boss kind (`MortgageBoss`), a window clock and an
instalment cap in `updateBoss` (damage to the boss goes through one gate that
knows the window), a room and a fee spawn at each window's end, and the bar's
fraction as paid instalments over `instalments`.

## 5 · Handoff

- **Five new `EnemyDef` fields** (`accrue`, `attach.pickup`, `coy`,
  `engulf.cooldownMultiplier` with `engulf.releases`, `ranged.pull`); tests in
  `family.test.ts`. `attach.pickup` folds into `World.pickupRadius` beside the
  items' `pickupMultiplier`; the HUD names it as it names the tax.
- **The Office's paper** (G-049, `documents.ts`) shows for the first time at
  this act's crossing; Family's own paper (§6) does not exist yet, so the act
  crosses into the certificate as The Office did.
- **One registry.** Six entries in `ENEMIES` under a Family section (five and
  the room), a test pinning the act to exactly these six, a drawing for each
  plus `boss-mortgage` and `player-family` (the same figure, a tote bag over
  one shoulder and keys in hand), `FAMILY` into `ALL_ACTS` after `OFFICE`, and
  into `ACTS` once its atlas and frames exist; the smoke gains `family` and
  `family-boss`, and the certificate reads *Age 55.*
- **The bots** need nothing new to run `--act=family` once the schedule
  exists; a toddler-aware policy (walk at it) is presence, not calibration.

## 6 · Not designed yet

- **The document at the crossing:** the mortgage statement, from the run's
  stats (the review's successor), seen once Decline exists.
- **Family's items.** What enters the pool at 34 (G-039's `from`): the
  panel's Strongly Worded Letter is a strike with a longer delay, so a path
  on Judgement before a new weapon.
- **Decline**, where the life goes at fifty-five; **Service**, the other
  branch at eighteen.
- **Sounds:** the doorbell, the phone, the tape, the toddler's squeak of a toy.

## 7 · Open question

The act's bet is that being needed is a pressure a player can feel: a toddler
that speeds up when you run from it, a phone that pulls you across the room, a
lawn that ends closer with every letter. Play it — did you feel needed, or
just pulled around?
