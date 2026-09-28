# College — reserved list and enemy roster

> **Status: design, ready to lift.** Written against `ART-DIRECTION.md` (laws
> 5, 6, 7, 8, 9, 10, 11) in the flat cartoon the first three acts are drawn in
> (G-038, D-025); only the colours and shapes change. Same shape as
> `ADOLESCENCE-ROSTER.md` §1–§7. Ages 18 to 22, on a 210-second clock (the
> clock shrinks as the life goes on: 300, 270, 240, 210).
>
> PLAN.md lists the fourth act as **Service *or* College**. This is College
> (G-045): Service's roster is G-007's and waits; when both exist, the branch
> is a choice at Prom's crossing. Two new `EnemyDef` fields (§3.3, §3.4) and
> one new boss kind (§4); everything else is fields that exist.

## 1 · The reserved list (`G-011`, law 11)

Five shapes and the boss's: the count of every act so far, because this act
adds a pressure (cost) rather than a verb. The consequence strings lift verbatim.

| Reserved | Held by | Consequence |
|---|---|---|
| **Stack** — a short pile of pages, edges fanned, one corner turned up | `reading` | The only pile in the act. Nothing else is paper on paper. |
| **Calendar leaf** — a square sheet with a curled top edge and two ring holes | `deadline` | The only square in the act. A form and a screen would both be square, so neither is drawn. |
| **Windowed envelope** — a landscape rectangle with a clear window low on the left | `tuition` | The only rectangle wider than tall, and the only window. |
| **Cluster** — four lumps fused into one mass, four faces, one awake | `group-project` | The only silhouette with more than one face. Nothing else is a fused mass. (School's clique holds a cluster too; the list is per act.) |
| **Counter** — a low service window with a bell on the ledge and a slot, straight on | `registrar` | The only architecture in the act, and the only bell. |
| **Tape** — a curling paper tape rising from an adding machine, at boss scale | `boss-loan` | The only curl in the act, and the only thing taller than the player by a multiple. |

**Threat colours held back:**

| Class | Held by | Why |
|---|---|---|
| **Contact `#C4472E`** | `deadline` | The act's heaviest hit is its only red thing. The invoice, which anyone would print in red, is bone and ink. |
| **Elite `#7C5C8A`** | `group-project` | The test's colour on the test's successor: the slow, heavy thing that costs the most to get past. On the whole body, never on one head (§3.4). |
| **Ranged `#D69A3C`** | `registrar` — **on the form it fires, never its body** (`G-031`); in data, `PROJECTILE_HOLDER` | The only gold in the act. The Loan's figures were to be gold and are ink: one holder per colour, and the form holds it (as the Gym Teacher's whistle and Prom's glints found). |
| **Boss `#2F7370`** | `boss-loan` | The adding machine's body. |

**The act's tones**, for `ACT_TONES` in `tools/art/palette.ts`:

```ts
  college: [
    c('college-deep', '#4E2233'), // burgundy; the act background
    c('college-mid', '#8E4A5C'), // wine; the lecture-hall seats
    c('college-light', '#E6C98F'), // old gold; pickups only (law 10, G-030)
  ],
```

College colours: burgundy and old gold. By `palette.ts`'s own Oklab every
existing entry is at least 0.044 away (the light tone from service-light),
above the 0.0353 tolerance, so the pickup reservation is enforceable. The
catalogue goes to 26 of D-028's 32. No enemy below wears `college-light`.

### Why the vocabulary is what it is

- **The invoice is an envelope because the square is taken.** A bill is a
  sheet; the deadline is the sheet. So tuition is what a bill arrives in, which
  is the better drawing: the window is the part that has your name in it.
- **The registrar is a counter because a person is not drawn (law 9).** Nobody
  is behind the window. The bell is on your side of it.
- **The Loan is a tape because a number is not a silhouette.** What a loan
  looks like is the statement, and a statement at boss scale is the tape
  coming out of the machine and never stopping.

## 2 · What the act is

College's costume of the life script: **you are paying for this.** Conception
wanted nothing from the player, School had nothing against them, Adolescence
looked at them. This act bills them: everything in it costs, and the only thing
in it that knows the player's name is the file.

| | Enemy | Teaches |
|---|---|---|
| Crowd | Reading | That the assigned thing arrives in stacks and is never finished |
| Velocity | Deadline | That the date crosses the room whether you are ready or not |
| Accumulator | Tuition | That some things take a cut of everything you earn from then on |
| Roadblock | Group project | That only one of them is doing anything, and finding out which costs more than the work |
| **Ranged** | Registrar | That the aimed thing is not a hit but a hold |

**The new pressure is cost.** The antibody took speed, acne took room, and this
act's accumulator takes XP: every gem is worth less for every invoice worn, and
unlike every attach before it, the invoices do not come off at the crossing.
Law 8 holds: none of it is paying attention to you. The registrar is looking at
the file.

## 3 · The enemies

All five are swarm-tier (D-018) except the group project (elite): bold flat
shapes, one face each — four on the project. D-007 on its face: nothing in
this act is a person, and nothing is drawn with skin.

### 3.1 · Reading — crowd

**`whyThisStage`** — lift verbatim:

> College is the first stage where the work arrives faster than it can be done and nobody checks whether it was.

**Threat:** contact · **Colour:** bone body, ink lines · **Silhouette:** stack

**48px** — a short pile, three or four page-edges fanned at one side, the top
corner turned up. The fan is the read.

**Visual** — pale bone pages, ink edge lines, one deadpan face on the top
page, eyes half-shut. It has been on the pile a while.

**Behaviour** — `chase`, `contact: 'damage'`, `spawnAt: 'edge'`, weak, slow,
never in short supply: the rival sperm and the hormones again, from the edge.
It comes in stacks because the schedule says so (§3.6), not because of a verb.

**Why it earns its slot** — the density the act's weapons are measured
against. Cheap, slow, and the only thing here that a build built in
Conception kills without thinking.

### 3.2 · Deadline — velocity

**`whyThisStage`** — lift verbatim:

> College is where the date first crosses the room on its own schedule and does not slow down for anyone standing in it.

**Threat:** contact · **Colour:** `#C4472E` (contact) leaf, bone holes and curl ·
**Silhouette:** calendar leaf

**48px** — a square leaf, curled at the top, two ring holes. The red is the read.

**Visual** — a red square with a bone curl along its top edge, two bone ring
holes, a face low on the sheet with its mouth a straight line. No date
printed: a date is text, and text is not drawn (law 5).

**Behaviour** — `cross`, `patrol: true`, `contact: 'damage'`: driver's ed
without the wheels. Faster than anything before it, heavy, on a fixed cadence
from the schedule — every thirty seconds from its first, so the player learns
when to expect it and still gets caught.

**Why it earns its slot** — the act's heaviest hit, and the one that is a
clock. The bots cross its road; a person sees it coming and dithers.

### 3.3 · Tuition — accumulator

**`whyThisStage`** — lift verbatim:

> College is the first stage that takes a share of everything the player earns from then on, and the share does not come off at the end of the act.

**Threat:** none on its body · **Colour:** bone envelope, ink window and lines ·
**Silhouette:** windowed envelope

**48px** — a landscape envelope with a darker window low on the left. The
window is the read.

**Visual** — bone paper, an ink window with nothing legible in it, a face on
the flap, eyes closed. It does not need to look at you; it has your address.

**Behaviour** — `static`, `contact: 'attach'`, `invulnerable`, `spawnAt: 'lead'`:
acne's arrival — already where you are going. **New field:** `attach.tax`
(PLACEHOLDER 0.08): each worn invoice takes that share of every gem's value,
compounding (two invoices leave 0.92²). It still adds a drag stack like every
attach. **New field:** `attach.persists: true`: the stacks do NOT come off at
the crossing. The Office act will inherit them, and that is the joke.

**Why it earns its slot** — the accumulator whose cost is on the resource the
player has been hoarding since Conception. Every act's attach costs something
new; this one costs the future.

### 3.4 · Group project — roadblock (elite)

**`whyThisStage`** — lift verbatim:

> College is where the player is first graded on something four were assigned and one did, and finding out which one costs more than doing the work.

**Threat:** elite · **Colour:** `#7C5C8A` (elite) on all four lumps · **Silhouette:** cluster

**48px** — four lumps fused, four faces; three asleep, one awake. Nothing in
the drawing says which lump is the one that matters.

**Visual** — the clique's fused mass in purple, one awake face (eyes open,
mouth flat), three with eyes shut. The awake face is a decoy as often as not:
the drawing is one frame, and the sim decides.

**Behaviour** — `chase`, slow, heavy, `contact: 'damage'`. **New field:**
`weakPoint: true`: at spawn the sim rolls which of four quadrants (about the
enemy's centre) holds all the hp. A hit counts only when it lands in that
quadrant — a shot by where it strikes, an orbiter or a sweep by where it is,
an area by covering the centre (a burst, the aura or a bolt find it by
touching all four, which is the area builds' reward). A hit on the other three
does nothing and does not flash: no flash is the tell. The certificate prints
*Group project* if it kills you.

**Why it earns its slot** — the first enemy in the life that aim matters
against. A seeking build has to walk round it; a body-check build touches all
four and never learns which. Both are the joke.

### 3.5 · Registrar — ranged

**`whyThisStage`** — lift verbatim:

> College is the first stage where the aimed thing is not a hit but a hold, placed by a window that has never seen the player and has the file.

**Threat:** ranged · **Colour:** `#6E6353` (shadow) counter, bone ledge and bell;
`#D69A3C` on the form it fires only (`G-031`) · **Silhouette:** counter

**48px** — a low counter with a slot and a bell on the ledge. The bell is the read.

**Visual** — flat shadow grey counter, a bone ledge with a bone bell, an ink
slot, a face on the front panel looking at the slot, not at you. Nobody is
behind it (law 9).

**Behaviour** — `static`, `contact: 'none'`, `ranged` with **new field**
`ranged.stun` (PLACEHOLDER 0.5 s): in range and off cooldown it consults the
file (the telegraph: the bell rings, the slot lights) and fires a gold form
at where the player is; a hit does little damage and stops the player dead,
the hall monitor's stop delivered by post. The i-frames run from the end of
the stop, as they do for the monitor (AUDIT part three, 18). Killing it is
getting to the front of the line.

**Why it earns its slot** — the ranged slot's escalation: the Egg aimed, the
substitute looked you up, the chat followed, and this one does not need to
hit you to cost you the second the deadline needed.

### 3.6 · Introduction order and placeholder schedule

**Every number from here to the end of §4 is a placeholder.** Nobody has played
any of it; `COLLEGE.provisional` carries the sentence (D-022).

**The order is the design.** Age runs 18 to 22, a year every 52.5 seconds.
Reading from 0s (18): the first week. Tuition at 20s: the first bill. The
registrar at 45s: the first hold. The group project at 80s (19). The deadline
at 100s, then every 30s. Nothing new after 130s; the last 80 seconds are
escalation, then The Loan.

| id | movement | contact | other fields | hp | speed | contactDamage | radius | displaySize | xp |
|---|---|---|---|---|---|---|---|---|---|
| `reading` | chase | damage | `spawnAt: 'edge'` | 3 | 52 | 3 | 14 | 48 | 1 |
| `deadline` | cross | damage | `patrol: true` | 30 | 300 | 18 | 24 | 84 | 8 |
| `tuition` | static | attach | `spawnAt: 'lead'`, `invulnerable`, `attach: { drag: 0.03, tax: 0.08, persists: true }` | 1 | 0 | 0 | 12 | 44 | 0 |
| `group-project` | chase | damage | `weakPoint: true` | 60 | 20 | 12 | 34 | 100 | 14 |
| `registrar` | static | none | `ranged: { range: 440, consultSeconds: 0.9, cooldownSeconds: 4, projectileSpeed: 240, damage: 4, stun: 0.5 }` | 14 | 0 | 0 | 26 | 80 | 6 |

Each has `act: 'college'`, `frame: '<id>.png'` and its §3 heading as `name`.

```ts
export const COLLEGE: ActDef = {
  id: 'college', name: 'College', durationSeconds: 210, bossName: 'The Loan',
  boss: { kind: 'loan', enemyId: 'tuition', interestSeconds: 5, interestRate: 0.06, cap: 3, invoices: 3 },
  endWord: 'CONGRATULATIONS', age: { from: 18, to: 22 },
  provisional: '...',
  waves: [
    { fromSeconds: 0, enemyId: 'reading', rate: 1.4 },
    { fromSeconds: 20, enemyId: 'tuition', rate: 0.12 },
    { fromSeconds: 45, enemyId: 'registrar', rate: 0.05 },
    { fromSeconds: 45, enemyId: 'reading', rate: 2.4 },
    { fromSeconds: 80, enemyId: 'group-project', rate: 0.04 },
    { fromSeconds: 100, enemyId: 'deadline', rate: 0.034 },
    { fromSeconds: 100, enemyId: 'tuition', rate: 0.2 },
    { fromSeconds: 130, enemyId: 'reading', rate: 4 },
    { fromSeconds: 130, enemyId: 'registrar', rate: 0.1 },
    { fromSeconds: 160, enemyId: 'group-project', rate: 0.08 },
    { fromSeconds: 160, enemyId: 'reading', rate: 6 },
    { fromSeconds: 160, enemyId: 'tuition', rate: 0.3 },
  ],
};
```

## 4 · The Loan

**What it is.** An adding machine at boss scale, teal, with a paper tape
curling up out of it and off the top of the frame; the figures on the tape are
ink marks, never digits (gold is the form's alone, §1). A face on the
machine's front, eyes open, patient. It is the only boss in the life that
does not want anything from the player. It wants the balance.

**What it does.** It never attacks the player, never moves, never shields.

- **Interest.** Every `interestSeconds` its health grows by `interestRate` of
  what it has, up to `cap` times where it started. The fight is a deadline
  with a number instead of a crowd: the player's damage against compounding.
- **The statement.** Its telegraph is the tape jerking; its attack drops
  `invoices` tuition envelopes at the player's lead (the act's own spawn,
  from the boss), so the fight also taxes what the fight drops.
- **The opening balance.** It starts at `BOSS_HP` plus one tenth of that for
  every invoice the player is wearing when it appears. What you owe is what
  you carried in.
- **Foreclosure.** If its health reaches the cap, the certificate reads
  *Cause of death: The Loan. Age 22.* It is the first death in the life
  that is a number.

**The ending.** At zero it does not fall. The tape stops, and the act ends on
one word: **CONGRATULATIONS.** The certificate at twenty-two still says
natural causes, until The Office exists.

**Numbers.** `interestSeconds` 5, `interestRate` 0.06, `cap` 3, `invoices` 3;
the telegraph and idle are the Egg's; health `BOSS_HP`. All placeholders.

**Sim cost.** A fourth boss kind on the per-act selector (`LoanBoss`), an
interest tick in `updateBoss`, tuition spawned from the boss on attack, and
one new loss path through `die` with the boss as the cause. The invulnerable
race and shield paths are untouched: `race` is inert on a `loan`, and
`shieldUp` is false.

## 5 · Handoff

- **Two new `EnemyDef` fields** (`attach.tax`/`attach.persists`, `weakPoint`)
  and one on `ranged` (`stun`); a test each in `college.test.ts`.
- **The palette bound.** The tones take `FULL_PALETTE` to 26 of D-028's 32.
- **One registry.** Five entries in `ENEMIES` under a College section, a test
  pinning the act to exactly these five, a drawing for each plus `boss-loan`
  and `player-college` (the face at eighteen, a lanyard, a paper cup),
  `COLLEGE` into `ALL_ACTS` after `ADOLESCENCE`, and into `ACTS` once its atlas
  and frames exist; the smoke gains `college` and `college-boss` milestones and
  the certificate reads *Age 22.*
- **The bots.** The `cross` sidestep, the shield hunt and the standoff all
  hold; the weak point needs nothing from them (a seeking bot walks; an area
  bot touches). `--act=college` runs once the schedule exists.

## 6 · Not designed yet

- **The document at the crossing:** a diploma, from the run's stats.
- **The branch.** When Service exists, Prom's crossing offers the choice.
- **College's items.** What enters the pool at eighteen (G-039's `from`).
- **Sounds:** the bell, the tape, the date.

## 7 · Open question

The act's bet is that cost is a pressure a player can feel in a game with no
currency: an invoice worn is gems worth less, and the loan is a number that
grows. Play it — did you notice you were paying, and when?
