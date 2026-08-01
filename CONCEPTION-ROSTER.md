# Conception — enemy roster and item set

> **Status: design, ready to implement.** Written against `ART-DIRECTION.md`
> (BINDING, 2026-08-01) and the mid-century institutional register. Supersedes
> nothing; `TEST-BATCH-CONCEPTS.md` described the Adult Swim versions of the
> player, the rival and the Egg, and only the *behaviour* in that document
> survives — every visual note in it is dead.
>
> Adds three enemies to the act's existing two entries and defines seven items.
> `rival-sperm` and the Egg are unchanged.
>
> **One blocking issue for Claude Code before any of this can land — see
> §5.1.** The act's wave-escalation test cannot express a roster with more than
> one enemy in it.

---

## 1 · What the act is

Conception's costume of the life script: **you are one of an enormous number, you
did not ask to be here, and nothing that stops you is doing it to you.** The
rivals are traffic. The white cell is a screening process. The antibody is a file
opened before you arrived. The spermicide is a policy.

None of them are named that (`G-009`). None of them react to the player (law 8).
None of them are people (law 9), which in this act is free, because none of them
are even animals.

**Four pressures, no projectiles** (`G-010`):

| | Enemy | Teaches |
|---|---|---|
| Crowd | Rival sperm | Where to stand when the screen fills |
| Zone | Spermicide | That some space stops being space |
| Debuff | Antibody | That sloppy movement compounds |
| Roadblock | White cell | Target priority, and when to just leave |

The first thing in the player's life that aims at them is the Egg.

## 2 · The reserved list (`G-011`)

Binding for the act. Nothing else in Conception may take a reserved shape or
colour.

| Reserved | Held by | Consequence |
|---|---|---|
| **Comet** — smooth dome + trailing tail | Rival sperm | No other enemy has a tail |
| **Blot** — round lobed mass, scalloped edge | White cell | No other enemy is lobed |
| **Ring** — open annulus, even weight | Spermicide | Nothing else in the act is a ring, including VFX |
| **Y** — hard angular fork | Antibody | The only straight lines in the act |
| **Gold `#D69A3C`** (ranged) | The Egg | Does not appear before the boss |
| **Paper `#EFE7D6`** | The player | Law 10 — the lightest thing on screen |

Four shapes is the budget. The constraint is generative, not limiting: *the ring
is taken* is what produced the antibody's Y.

## 3 · The enemies

Detail budget (D-018): all three are swarm-tier. **Bold flat shapes, strong
silhouette, large uninterrupted colour. No halftone, no hairlines, no grain.**
The register lives on the boss and the background; these are the shapes cut out
of it.

---

### 3.1 · White cell — elite

**`whyThisStage`** — lift verbatim:

> Before the player is anyone at all, there is already a process whose only job is to stop things that look like them.

**Threat type:** elite · **Tint:** `#7C5C8A` (threat-elite) · **Silhouette:** blot

**Silhouette at 48px** — a large round mass with a scalloped, lobed edge and no
tail. Against a field of comets it reads as the one thing that is not going
anywhere in particular. Roughly twice the diameter of a rival, which is most of
the read on its own.

**Visual** — flat elite purple, one shadow tone at most, edge lobes irregular in
count and depth so it never resolves into a flower. Its face is a **rubber
stamp**: a flat cream disc set off-centre, carrying two ink dots and one short
horizontal line. Nothing more. The dots are aimed a few degrees off the player's
position and stay there — it is looking at where something like the player would
be, which is not the same as looking at the player.

**Behaviour — the whole design is that it has not noticed.** It enters on a fixed
slow heading and crosses the arena in a straight line. It never steers, never
accelerates, never turns toward the player. It responds only to being touched:
contact triggers an engulf — a short hold that slows the player hard and applies
damage over the duration. It does not pursue afterward. It continues on the same
heading it entered with.

A chaser would be an ordinary elite. A thing this large that is not coming for
you, that you have to route around because it will not route around you, is the
act.

**Why it earns its slot** — it is the only enemy that punishes greed. It is worth
enough XP to be tempting and takes long enough to kill that killing it is a real
commitment of the act clock.

---

### 3.2 · Spermicide — zone hazard

**`whyThisStage`** — lift verbatim:

> Conception is the first stage where the environment was made lethal in advance by someone who will never be told whether it worked.

**Threat type:** contact (persistent zone) · **Tint:** `#C4472E` (threat-contact) ·
**Silhouette:** droplet, then ring

**Silhouette at 48px** — two states, and the transition between them is the
telegraph. **Droplet:** a rounded teardrop with a flat top, small, drifting.
**Ring:** an open annulus of even weight that expands slowly and then fades. The
ring is unique in the act and is the only shape a player ever needs to leave.

**Visual** — flat contact red, no interior detail whatsoever. The droplet carries
a face: two closed-eye arcs and no mouth. It is asleep. It bursts without waking
up. The ring has no face — it is not a thing, it is a condition, and that is the
one place in the act where law 5 does not apply because a ring cannot hold one.

**Behaviour** — it drifts in on a current with a fixed vector and **never
acknowledges the player's position at any point in its life**. It bursts on a
timer, not on proximity. The ring expands from wherever it happened to be. Being
caught by one is always the player's fault and never the spermicide's intent,
because it does not have one.

**Why it earns its slot** — it is the only enemy that takes space away rather
than adding bodies, which is the pressure the act otherwise lacks entirely. It
also teaches telegraph-reading before the Egg requires it.

---

### 3.3 · Antibody — drag debuff

**`whyThisStage`** — lift verbatim:

> Conception is where the first record about the player is opened, and it describes a category rather than a person.

**Threat type:** contact (negligible damage, stacking drag) · **Tint:** `#6E6353`
(shadow) · **Silhouette:** Y

**Silhouette at 48px** — a hard angular fork, even limb weight, the smallest
authored asset in the act and the only straight lines in it. Angularity in a
field of curves is a stronger read than size, which is what lets it go this
small.

**Visual** — flat shadow-brown, limbs of equal weight, junction squared off. At
the junction a small bone `#D2C6AC` square carrying two ink dots and no mouth — a
filing tag with eyes. That square is the only non-shadow pixel on it and is
deliberately close to paper without reaching it.

**Behaviour** — drifts, does not pursue. On contact it **attaches to the player
sprite and stays there**, dealing almost no damage and applying a small movement
penalty. They stack. They do not expire. They come off only when the act ends.

By minute four the player is moving visibly slower and carrying a dozen small
grey Y-shapes, and nothing in the game has said a word about it. That is the
whole item. It is also `G-001`'s clearest single delivery in the act: the
substitute's clipboard, the in-processing packet and the credit report are all
this shape.

**Balance note** — the drag must be small enough per stack that no single
attachment feels unfair and large enough in aggregate that a careless run ends
because of it. This is a playtest-bot question, not a design one; the shape of
the answer is "the player should not be able to say when it went wrong."

**Why it earns its slot** — it is the only enemy that does not threaten the
player's health bar, and therefore the only one that punishes a player who is
reading the health bar.

---

### 3.4 · Starting numbers

Starting values only. Expect the playtest bots to move all of them; nothing here
is a design commitment except the relationships (the white cell is an order of
magnitude tankier and slower than everything else; the antibody's contact damage
is nearly zero on purpose).

| id | hp | speed | contactDamage | radius | displaySize | xp | tint |
|---|---|---|---|---|---|---|---|
| `rival-sperm` | 3 | 46 | 4 | 15 | 48 | 1 | `0xa86a63` |
| `antibody` | 2 | 34 | 1 | 11 | 44 | 2 | `0x6e6353` |
| `spermicide` | 6 | 20 | 9 | 26 | 72 | 3 | `0xc4472e` |
| `white-cell` | 44 | 16 | 14 | 34 | 96 | 12 | `0x7c5c8a` |

`displaySize: 44` on the antibody is below the 48px benchmark and is the one
place in the act that needs `readable-48px-silhouette` run in anger. If it fails,
raise the size rather than thickening the limbs — the Y survives scaling and does
not survive interior weight.

**Two effects the current `EnemyDef` cannot express:** the white cell's engulf
(hold + slow + damage-over-time on contact) and the antibody's stacking drag.
Both are per-enemy behaviour flags, not new systems. See §5.2.

### 3.5 · Wave schedule

Per-enemy tracks, 300-second act. **This does not fit the existing test — see
§5.1 first.**

| Enemy | Entries |
|---|---|
| `rival-sperm` | 0s @1.5 · 30s @3 · 75s @5.5 · 140s @9 · 210s @14 |
| `antibody` | 45s @0.6 · 120s @1.2 · 200s @2.0 |
| `spermicide` | 90s @0.35 · 165s @0.7 · 240s @1.1 |
| `white-cell` | 130s @0.08 · 195s @0.14 · 255s @0.22 |

The act introduces one new pressure roughly every forty-five seconds for the
first half and then only escalates. Nothing new arrives after 130s, so the last
three minutes are the player's own build against a curve they have already seen —
which is the correct shape for a first act and the reason the boss can afford to
introduce a mechanic.

---

## 4 · The items

Seven, including the `lash` that already exists. Whole-game budget is roughly
thirty (mechanism 5), so this is the act's full allocation and there is no room
for an eighth.

**Every one of them subtracts something (`G-014`).** `enables` and `tradesAway`
below are written to be lifted verbatim into the data file; both are over the
30-character floor the content test enforces.

### 4.1 · Weapons

---

**`lash` — Lash** *(exists, unchanged)*

The tail. The baseline every other weapon is measured against.

---

**`motility` — Motility**

A piercing shot along the player's facing that hits everything in the line.

- **enables** — `A positioning build: line the crowd up along one axis and the whole column dies at once, which turns the act's density from a threat into the reason the weapon works.`
- **tradesAway** — `Any answer at all to being surrounded, since it only ever fires where the player is already pointed and does nothing whatsoever about what is behind them.`

---

**`acrosome` — Acrosome**

The enzymatic cap. A short-range burst that damages everything currently touching
the player.

- **enables** — `A body-check build that wants to be inside the crowd rather than away from it, and the only weapon in the act that scales with how bad the player's position is.`
- **tradesAway** — `Range, entirely. It cannot touch the spermicide ring, it cannot open on a white cell safely, and every use of it is paid for in contact damage first.`

---

**`wake` — Wake**

A damaging trail left behind the player.

- **enables** — `A kiting build where the player never faces the crowd at all and kills by having already been somewhere, which is the only build in the act that rewards retreating.`
- **tradesAway** — `Everything about standing still. It deals no damage in front of the player, it cannot open a path, and a cornered player is holding a weapon that has stopped existing.`

### 4.2 · Control

---

**`chemotaxis` — Chemotaxis**

Sperm navigate by chemical gradient. Drops an attractor that pulls nearby enemies
toward a point. Deals no damage.

- **enables** — `Every area weapon in the act at once, by choosing where the crowd will be instead of reacting to it. It is the item that makes Acrosome and Wake into builds rather than options.`
- **tradesAway** — `Its own damage, which is zero, and its safety margin: pulling a crowd into a tight point is exactly how a run ends for a player who has nothing to clear it with.`

### 4.3 · Passives

---

**`midpiece` — Midpiece**

The mitochondrial spiral. More movement speed, less maximum health.

- **enables** — `Every build that depends on not being touched, and it is the only item that makes the white cell's fixed heading and the spermicide's timer into things a player can simply ignore.`
- **tradesAway** — `The margin for error. The health that absorbed a bad half-second is gone, so the first mistake in a run is now also the last one.`

---

**`membrane` — Membrane**

Reduced contact damage, reduced movement speed.

- **enables** — `Standing inside the crowd on purpose, which is the precondition for the Acrosome build and the only way to farm the rival wave rather than outrun it.`
- **tradesAway** — `The speed that made zones optional. A spermicide ring that used to be a detour is now a commitment, and a white cell crossing the lane has to be fought instead of avoided.`

---

**`capacitation` — Capacitation**

Sperm are not capable of fertilisation when they arrive; the capability develops
over time in transit. Damage ramps over the run, starting below baseline.

- **enables** — `A late-act scaling build that outperforms every other item in the last ninety seconds, and it is the only item in the game whose power is a function of the act clock rather than the player.`
- **tradesAway** — `The opening two minutes, which are strictly worse than doing nothing, on a hard timer. It is a bet that the run reaches the point where it pays, and act one is exactly long enough for that bet to be wrong.`

### 4.4 · The shape of the build space

| | Speed | Durability | Range |
|---|---|---|---|
| **Midpiece** | ↑ | ↓ | — |
| **Membrane** | ↓ | ↑ | — |
| **Motility** | — | — | ↑ line only |
| **Acrosome** | — | — | ↓ none |
| **Wake** | — | — | behind only |

Midpiece + Wake and Membrane + Acrosome are the two builds the act is shaped
around, and they play nothing like each other. Chemotaxis serves the second and
is a trap in the first. Capacitation is orthogonal and is the greedy pick in
both. Motility is the honest pick that neither build wants, and if the bots find
it never chosen, it gets cut rather than buffed — the budget is capped and a
sixth item that survives on pity is worse than five that do not.

---

## 5 · Handoff to Claude Code

Design is settled; the following are implementation questions I cannot resolve
and should not guess at.

### 5.1 · Blocking — the wave test cannot express this roster

`src/data/__tests__/content.test.ts`, `waves are ordered and escalate`, asserts
`cur.rate > prev.rate` across the **flat** `act.waves` array. With one enemy that
is a sensible escalation invariant. With four it is unsatisfiable: introducing the
white cell at 0.08/sec after a rival wave at 5.5/sec fails, and there is no
ordering of a mixed roster that passes.

**As written, that test permits acts with exactly one enemy type.** It needs to
become per-`enemyId`: group the waves by enemy, then assert ordering and
escalation within each track, plus a global assertion that total spawn rate is
non-decreasing over time — which is the property the test was actually reaching
for.

Flagged rather than fixed because it is a test change and tests are yours. It
blocks §3.5 entirely.

### 5.2 · Two behaviours `EnemyDef` cannot currently express

Both are per-enemy flags rather than systems, and both are load-bearing for the
design rather than flourishes:

- **`engulf`** (white cell) — on contact, hold the player briefly, apply a heavy
  movement penalty for the duration, and deal damage over that window instead of
  per-hit. Without it the white cell is a large slow rival and the act loses its
  target-priority pressure.
- **`attach`** (antibody) — on contact, despawn the enemy, parent its sprite to
  the player, and apply a small stacking movement penalty that persists until the
  act ends. Without it the antibody is a weak rival and there is no reason for it
  to be in the roster.

### 5.3 · Passives do not fit `WeaponDef`

`midpiece`, `membrane` and `capacitation` have no cooldown, damage, projectile
speed or pierce. They need their own def type and their own file.

**The risk is the test, not the type.** `content.test.ts` iterates `WEAPONS` to
enforce `enables` and `tradesAway`. A new `PASSIVES` record that the test does not
iterate is a content rule that silently stops applying to a third of the act's
items — which is precisely the failure mechanism 5 exists to prevent. Whatever
shape the passive type takes, the test needs to iterate every item collection,
and ideally by construction rather than by a second hand-written loop that the
next collection also gets left out of.

### 5.4 · Art

Three new swarm assets, all at the swarm detail budget: no halftone, no
hairlines, no grain, bold flat shapes. Prompts are yours to write and commit to
`assets/prompts/` (D-010); §3 gives the visual spec each one has to satisfy.

The white cell's stamp-face and the antibody's bone tag are the two places where a
generator will want to add interior detail, and both will fail
`readable-48px-detail` if it does. Consider authoring both as flat overlays
composited after CONFORM rather than asking the generator for them.

**D-007 is not at risk in this act** — every subject is a cell, a chemical or a
protein, and no prompt in this roster has any occasion to name a person, place,
force or people.

---

## 6 · What is still open

- **The Egg's item drop.** The boss should hand the act's last item, and none of
  the seven above is shaped like a reward for beating it. Deferred until the
  Conception loop is playable end to end, because the right answer depends on
  what the build space actually feels like.
- **Whether Motility survives.** Named above as the likely cut. Decided by the
  bots, not by me.
- **Act 2 onward.** Not started. The reserved lists (`G-011`) are per act, and
  School's — the bright hard rectangle the substitute's clipboard needs — should
  be written before any School asset is generated, not after.
