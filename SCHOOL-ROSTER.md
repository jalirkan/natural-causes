# School — reserved list and enemy roster

> **Status: design, ready to lift.** Written against `ART-DIRECTION.md` (BINDING)
> and the mid-century institutional register. Same shape as
> `CONCEPTION-ROSTER.md` §1–§5; the amendment log there does not apply here.
>
> **§1 is the blocking item.** `tools/art/reservations.ts` has no `school` entry,
> so `assertReserved` refuses every School asset. §1 is written to lift directly
> into that file.
>
> One asset in this act already exists and passed: `substitute-teacher`, seed
> 11923, generated 2026-08-01T09:13Z. The roster is written around it rather than
> over it.

---

## 1 · The reserved list (`G-011`, law 11)

Five shapes. One more than Conception, because School adds a pressure Conception
did not have and the substitute is a fixed point the act has to be built around.

| Reserved | Held by | Consequence |
|---|---|---|
| **Bright hard rectangle** | `substitute-teacher` | Nothing else in the act is a bright hard-edged rectangle. This is the reservation the act is built around and it is the one most at risk, because School is full of paper. |
| **Circle** | `dodgeball` | The only perfect circle among the act's enemies. Nothing else is radially symmetric. |
| **Wedge** | `homework` | A leaning stack, triangular in profile, dull. Paper that is deliberately not a rectangle. |
| **Sash** | `hall-monitor` | The only hard diagonal in the act. It runs off both edges of the body so it reads as a stripe, never a slab. |
| **Cluster** | `clique` | The only silhouette with more than one head. Nothing else in the act is a fused mass. |

**Threat colour held back:**

| Class | Held by | Why |
|---|---|---|
| **Ranged `#D69A3C`** | `substitute-teacher` | The substitute is the only thing in School that aims. Conception's first aimed thing was the boss; School's is a swarm enemy, and that escalation is the act's whole point (`G-010`). No other School enemy may be gold. |

**Game-wide, not School's to set** (law 10, `G-030`): pickups take
`school-light #9FA86B` and hold their one global shape. No enemy above uses the
act's light tone, so the rule costs this act nothing.

**Not reserved and therefore not generatable:** `boss-gym-teacher` has no entry.
It cannot be generated until it is designed and added, which is `assertReserved`
doing exactly what `G-011` asked of it. Flagged, not worked around.

### Why the vocabulary is what it is

The clipboard reservation is a claim about every other enemy in the act, which is
why the roster and the list had to be written together. The generative pressure
shows up twice:

- **Homework is a wedge because the rectangle is taken.** Homework is a stack of
  paper and the obvious silhouette is a slab. It cannot be one. A leaning
  triangular stack in `shadow` separates from the clipboard on three axes at once
  — shape, edge, and value — and it is a better drawing than the slab was.
- **The sash runs off both edges** for the same reason. A badge or a rectangular
  name tag would have been the natural read for a hall monitor and would have put
  a second bright hard rectangle in the act.

---

## 2 · What the act is

School's costume of the life script: **you are sorted by people who are also
being sorted, judged by adults who have not been told who you are, and the day
has a shape you did not agree to.** Nothing in the act has anything against you.

| | Enemy | Teaches |
|---|---|---|
| Crowd | Clique | That some space belongs to a group and you are not in it |
| Velocity | Dodgeball | That an object crossing the room is a threat even unaimed |
| Accumulation | Homework | That things which do no damage still cost you the run |
| Roadblock | Hall monitor | Target priority, and when a route is closed |
| **Ranged** | Substitute teacher | That something can now reach you from across the room |

Ranged pressure arrives here, as `G-010` said it would. It arrives on one enemy
and gold appears nowhere else in the act.

---

## 3 · The enemies

All five are swarm-tier under the detail budget (D-018): **bold flat shapes,
strong silhouette, large uninterrupted colour. No halftone, no hairlines, no
grain.**

---

### 3.1 · Clique — crowd

**`whyThisStage`** — lift verbatim:

> School is the first place that has an inside, and the player finds out where they are by walking into the edge of it.

**Threat:** contact · **Tint:** `#6B7F53` (school-mid) · **Silhouette:** cluster

**48px** — a single wide lumpy mass with three or four heads on it, fused at the
shoulder. It is one enemy, not a group of enemies, and the silhouette has to say
so instantly or the player will try to walk between the heads.

**Visual** — flat school-mid, one shadow tone. Heads at slightly different
heights, all facing the same way and none of them the player's way. Faces are two
dots and a flat line each, identical across every head — the joke is that they are
the same face repeated, and that is cheaper to author than four faces as well as
funnier.

**Behaviour** — moves as one body on a slow drift and never splits. It does not
pursue. It occupies, and it is wide, so it takes lanes away simply by existing
somewhere. Contact damage is low; the cost is that a clique in the wrong place
turns a two-way route into a one-way one.

---

### 3.2 · Dodgeball — velocity

**`whyThisStage`** — lift verbatim:

> School is where the player is first hurt by something that was aimed at the room rather than at them.

**Threat:** contact · **Tint:** `#C4472E` (threat-contact) · **Silhouette:** circle

**48px** — a perfect circle. The only one in the act, and the only radially
symmetric thing in it, which is what lets it read at speed.

**Visual** — flat contact red, no seam, no highlight, no stripe. A face: two dots
and a flat line, dead centre, completely blank. It is not excited. Whoever threw
it is never drawn and never referenced (law 9 — the role is the object).

**Behaviour** — enters fast on a fixed vector and **bounces off the arena edges
indefinitely**. It never steers, never slows, never targets. It is the purest
expression of law 8 in the game: it has no relationship to the player at all and
it will still take a third of their health.

**Why it earns its slot** — it is the only enemy whose threat is a function of the
player's own position rather than of the enemy's behaviour, and it makes the arena
edges matter for the first time.

---

### 3.3 · Homework — accumulation

**`whyThisStage`** — lift verbatim:

> School is the first stage that follows the player home and takes up the part of the day nobody was counting.

**Threat:** none — **zero contact damage** · **Tint:** `#6E6353` (shadow) ·
**Silhouette:** wedge

**48px** — a leaning triangular stack, dull, soft-cornered. Deliberately the least
interesting shape in the act.

**Visual** — flat shadow-brown, one tone. A small face near the top of the stack:
two dots, no mouth. It is not doing anything to anyone.

**Behaviour** — spawns where the player has recently been, does not move, and
**grows**. Each new pile that lands near an existing one merges into it and the
merged shape is larger. It deals no damage and it is solid: the player cannot walk
through it, and neither can anything else.

It is the antibody's cousin one act along (`G-001`) and deliberately not the same
mechanic. The antibody attaches and taxes movement; homework sits in the world and
takes the room. Both cost the player something that is not health, which is the
family resemblance.

**Why it earns its slot** — it is the only enemy that cannot kill the player and
the only one that changes the shape of the arena. By minute four the room the
player started in is a corridor.

**Balance note** — homework must be destructible but expensive, so clearing it is
a real choice against the act clock. If it is free to clear it is scenery; if it
cannot be cleared it is a slow loss. Playtest owns the number, not the shape.

---

### 3.4 · Hall monitor — roadblock

**`whyThisStage`** — lift verbatim:

> School is where authority is first handed to someone with no more standing than the player, and it works anyway.

**Threat:** elite · **Tint:** `#7C5C8A` (threat-elite) · **Silhouette:** sash

**48px** — an upright figure crossed by one hard diagonal band running off both
edges of the body. The diagonal is the whole read; at 48px the body is a lump and
the stripe is the identity.

**Visual** — flat elite purple, the sash a second flat tone. Face is two dots and
a flat line, aimed along its route rather than at the player. It is a role wearing
a person, per law 9: the sash is the character.

**Behaviour** — patrols a fixed line across the arena, end to end, and turns
around at the ends. It never deviates and never reacts. Touching it stops the
player dead for a moment and deals elite-tier damage.

It closes a lane rather than occupying a point, which is what separates it from
Conception's white cell — that was an area you routed around, this is a line you
time.

---

### 3.5 · Substitute teacher — ranged · *asset exists*

**`whyThisStage`** — already committed in `assets/prompts/substitute-teacher.md`,
unchanged:

> School is the first place the player is judged by someone who does not know who they are, and the substitute is that experience with a lanyard on.

**Threat:** ranged · **Tint:** `#D69A3C` (threat-ranged) · **Silhouette:** bright
hard rectangle

**48px** — clipboard and lanyard. The clipboard is the brightest and hardest shape
on the sprite and the brightest hard shape in the act, which is the reservation in
§1 and the reason every other School enemy is shaped the way it is.

**Behaviour** — slow, does not pursue, stops to consult the clipboard and fires.
The consult is the telegraph and it is a body-language telegraph rather than a
colour flash, which is what the register can do that a cartoon one cannot.

**Attack — dependency still open.** The intended projectile is the player's name,
spelled wrong. That needs the run to carry a player name, which the end-of-game
certificate (`G-002`) needs anyway and which is still unbuilt. **Until it exists
the substitute needs a placeholder projectile**, and the placeholder should not be
designed around — it is a stand-in for a joke, not a joke.

---

### 3.6 · Starting numbers

Relationships are the design; the values are a starting point and the bots own
them.

| id | hp | speed | contactDamage | radius | displaySize | xp | tint |
|---|---|---|---|---|---|---|---|
| `clique` | 9 | 28 | 5 | 38 | 88 | 3 | `0x6b7f53` |
| `dodgeball` | 4 | 165 | 11 | 14 | 44 | 2 | `0xc4472e` |
| `homework` | 14 | 0 | 0 | 30 | 72 | 1 | `0x6e6353` |
| `hall-monitor` | 40 | 22 | 13 | 26 | 88 | 11 | `0x7c5c8a` |
| `substitute-teacher` | 12 | 24 | 6 | 20 | 96 | 5 | `0xd69a3c` |

Every tint is in the locked palette and darker than `PAPER − 0.1`; checked by hand
against `content.test.ts`'s two rules before writing them down.

**Introduction order**, not a wave table — per `CONCEPTION-ROSTER.md` §5.1 the
escalation invariant is per-`enemyId`, so the tracks are independent: clique from
0s, dodgeball early, homework from the first third, hall monitor mid, substitute
last. The act should be pure contact until the substitute arrives, so that gold
appearing means something.

---

## 4 · Handoff

- **Lift §1 into `tools/art/reservations.ts`** as the `school` entry. That
  unblocks all five swarm assets. `boss-gym-teacher` stays absent on purpose.
- **Three behaviours the current `EnemyDef` cannot express**, all per-enemy flags:
  `bounce` (dodgeball, reflect off arena bounds, never despawn), `merge`
  (homework, static, combines with neighbours, solid to all movers), `patrol`
  (hall monitor, fixed line, reverse at ends).
- **A question about tint on an already-passing asset.** `substitute-teacher`
  cleared all nine checks with nine palette colours. Multiplying it by
  `#D69A3C` at draw time is right by law 6 — the act's only ranged thing is the
  act's only gold thing — but I do not know what a heavy multiply does to an
  asset that already conforms. If it breaks `palette-variety` or the clipboard's
  contrast, tell me and the reservation changes rather than the asset.
- **Prompts** are yours (D-010). §3 gives the visual spec each must satisfy. D-007
  is live in this act in a way it was not in Conception: every enemy here is a
  person or a school object, so **no prompt may describe any figure by ethnicity,
  nationality, religion or race**, and the substitute's committed prompt is the
  model — role forward, average build, affectless.

## 5 · Not designed yet

- **The Gym Teacher.** School's boss. Named in `PLAN.md`, no concept, no
  reservation entry, not generatable. Next thing I write for this act.
- **Wave tuning and the act clock.** After the Conception session unblocks, since
  School's pacing should be set against an act whose feel a human has confirmed
  rather than against Conception's current placeholders.
