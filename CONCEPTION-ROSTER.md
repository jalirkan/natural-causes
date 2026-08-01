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
| **Y** — hard angular fork | Antibody | The only straight lines among the act's *enemies* |
| **Gold `#D69A3C`** (ranged) | The Egg | Does not appear before the boss |
| **Paper `#EFE7D6`** | The player | Law 10 — the lightest thing on screen |
| **Conception-light `#C99B8C`** | Pickups | Law 10 (G-030) — no enemy in the act may take it |

*(Last two rows amended 2026-08-01 after the law 10 palette scan — see `G-030`.
The antibody's clause said "in the act" and pickups are hard-edged, so it was
narrowed to enemies; pickups sit outside the act vocabulary and hold one shape
game-wide.)*

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
- **tradesAway** — `Its own damage, which is zero, and its safety margin: pulling a crowd into a tight point is exactly how a run ends for a player who has nothing to clear it with. It does not discriminate either, so it gathers the antibodies too, which are the one thing in the act that cannot be cleared at all.`

*(`tradesAway` extended 2026-08-01 after Run 5 — see §10.2. Chemotaxis is the
largest measured driver of antibody stacks in the act and its text did not
mention them.)*

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

*(Reverted 2026-08-01 after Run 5 to the original text — see §10.3. The antibody
clause added after Run 4 was written against a mechanism that turned out not to
be the driver; at a partial correlation of −0.133 the effect is below anything a
player could perceive, and the clause overstated it. The real driver is
Chemotaxis and the clause now lives there.)*

---

**`capacitation` — Capacitation**

Sperm are not capable of fertilisation when they arrive; the capability develops
over time in transit. Damage ramps over the run, starting below baseline.

- **enables** — `A late-act scaling build that outperforms every other item in the last ninety seconds, and it is the only item in the game whose power is a function of the act clock rather than the player.`
- **tradesAway** — `The opening two minutes, which are strictly worse than doing nothing, on a hard timer. It is a bet that the run reaches the point where it pays, and act one is exactly long enough for that bet to be wrong.`

### 4.4 · The shape of the build space

> **Superseded by §7 (2026-08-01, same day).** The bots measured this map and it
> was wrong in both directions — the two builds it names as the act's spine came
> last, and the item it names as the likely cut came first. Left standing rather
> than corrected in place, because the reasoning below is exactly the reasoning
> that failed and the corrected map in §7 is only legible next to it.

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

- ~~**The Egg's item drop.**~~ **Settled — `G-017`, see §7.4.** An inheritance,
  assigned rather than chosen. Design closed, implementation gated on act 2.
- ~~**Whether Motility survives.**~~ **Settled — `G-016`, see §7.3.** It stays.
  The bots picked it and it won.
- **Act 2 onward.** Not started. The reserved lists (`G-011`) are per act, and
  School's — the bright hard rectangle the substitute's clipboard needs — should
  be written before any School asset is generated, not after.

---

## 7 · Amendment — 2026-08-01, after the first bot runs

Appended rather than edited in. §4.4 stays where it is.

### 7.1 · What the evidence supports, and what it does not

The caveats are right and I am not going to launder them. Three separate claims
here and they are not equally strong:

**Load-bearing, and it does not depend on the sample size.** Membrane+Acrosome
left **97%** of the boss standing; Midpiece+Wake left **86%**. Those are not low
win rates, they are *non-participation* — the builds did not meaningfully damage
the Egg. That is a mechanism observation, not a rate comparison, so overlapping
Wilson intervals do not touch it. Sixteen runs is plenty to establish that a
build does approximately nothing, because the effect size is the whole quantity.

**Not established, and I am not treating it as such.** The ordering among
Motility, greedy-Capacitation and random. Those intervals overlap heavily and
nothing below rests on which is actually best.

**A confound worth naming, which happens to argue the same way.** The bot's
standoff now derives from what the run is holding — so a Wake run stands at
roughly 26px from a boss firing aimed five-shot spreads. For the shortest-range
items, *correct* positioning and *survivable* positioning may be incompatible by
construction. That is not noise in the measurement; it is the shape problem
appearing a second time in a different place.

And the honest asterisk: the bot's movement is mediocre on purpose, so this
measures whether the curve is fair to an average player. A human who kites the
Egg well may find Wake fine. That does not rescue the design — an item that
requires expert play to do anything at all against the act's only boss is not a
build, it is a skill check wearing an item's clothes.

### 7.2 · The call — the Egg pulls (`G-015`)

Option **(b)**, with one correction to how it was framed. Not a *phase* that
closes the distance — a **constant radial attraction**, live from spawn,
unchanged at every health value, never reacting to anything.

A phase would contradict `G-006`, because a phase is the boss responding to the
fight. A constant field does the opposite: it is the boss not responding to
anything, ever, while the space near it stops being neutral. That is the most
indifferent thing the Egg could possibly do, and it makes "it has already decided
and is waiting for you to catch up" mechanical instead of decorative. It also
happens to be what an egg actually does.

The fight becomes an orbit, and every item answers the same question — *how close
do I let it take me* — differently. Full reasoning and the three rejected shapes
are in `G-015`.

Tuning constraint, and it is the one thing here that is not negotiable: **a player
swimming directly outward must make progress.** If the pull cannot be beaten,
Motility has no counterplay and the fix has replaced one dead build with another.
Somewhere around a third of base player speed is my starting guess and it is only
a guess; the bots own the number.

Not changed: the 320 HP. Shape and tuning in the same pass teaches nothing about
either.

### 7.3 · The corrected build map (`G-016`)

Motility stays. The pre-commitment in §4.4 said "cut it if the bots never chose
it"; they chose it and it won, so it resolves the way it was written. Unbuffed,
untouched.

What §4.4 got wrong is more useful than the item. That map was drawn entirely
against the crowd phase — and it is probably still correct about the crowd phase.
It predicted item value over five minutes of horde, and then the run was decided
by a final minute that contains no horde at all. Motility is plausibly the weak
crowd pick §4.4 called it, and it wins regardless because it is the only pick
that can participate in the boss.

So the corrected map is not "Motility is good." It is:

> **The act has two skill checks. §4.4 designed items for one of them and then
> scored them on the other.**

| Build | Crowd phase | Boss, before `G-015` | Boss, after `G-015` (predicted) |
|---|---|---|---|
| Motility | Weak — one line, no area | The only real answer | Workable, no longer dominant |
| Midpiece + Wake | Strong — the kiting fantasy | Cannot reach it | Rides the pull into a close orbit |
| Membrane + Acrosome | Strong — farms the crowd | Cannot reach it | Rides it all the way in; Membrane pays for it |
| Chemotaxis | Enables both area builds | Nothing to pull | Competes with the Egg's own pull — untested |
| Capacitation | Weak early, scales | Arrives exactly on time | Unchanged; still the greedy pick |

Chemotaxis is the one I cannot predict. A player-placed attractor inside a field
that already attracts is either a genuinely interesting interaction or an
incoherent one, and I do not know which. Flagging it as the thing to watch rather
than pretending I designed it.

### 7.4 · The Egg's drop — inheritance (`G-017`)

Unblocked and settled. Every other item in the game is a choice of three; this
one is assigned at random at absorption, permanent for the remaining six acts, no
reroll, no announcement. The first thing that defines the player is unchosen and
lasts longest, and the game never says so.

Three rolls — **Constitution** (max HP up, XP per level up), **Precocity** (each
act starts one level ahead, that level assigned at random), **Sensitivity**
(pickup radius up, contact damage taken up). All physiological, none of them a
category of person (`D-007`).

**Do not implement yet.** A permanent cross-act modifier validated against the
only act that exists has been validated against nothing.

### 7.5 · The antibody (`G-018`)

The answer is inevitability, and the fix is not HP.

**The antibody loses its health bar.** Shots pass through it. Contact damage goes
to zero — it costs speed and never health. Stacks cap, with diminishing drag per
stack. The only counterplay is not being where it is going.

Median 0 across 80 runs means what shipped is not the enemy §3.3 describes. But
raising HP to 20 or 30 makes the antibody's presence a function of the player's
damage output — a treadmill that needs re-tuning against every weapon buff for
seven acts, and which makes the mechanic fire hardest for the players already
losing. You cannot shoot a document. It is the one thing in the act that weapons
do not affect, and that carries `whyThisStage` better than any number.

Implementation: an `invulnerable` flag rather than a large `hp`, and drop its XP —
it is not a kill. §3.4's `hp: 2` and `contactDamage: 1` both go.

### 7.6 · Predictions, recorded before the changes land

So that a wrong call gets caught rather than absorbed. If these do not come out,
the diagnosis in `G-015` and `G-018` was wrong and the entries need reopening —
not the numbers quietly adjusted until they agree.

**On the pull:**

- Motility falls out of first place, to roughly the middle of the table.
- Membrane+Acrosome and Midpiece+Wake both clear 20%, from 0% and 6%.
- Boss HP remaining at death for both short builds drops below 50%, from 97% and
  86%. **This is the one that matters** — it is the participation measure, and it
  is the claim that does not need a large sample to test.
- **Falsifier:** if Motility is still near 50% and either short build is still
  under 10% after the pull is in, reach was not the cause and `G-015` is wrong.

**On the antibody:** *(falsifier superseded — see §8.4. It fired on dispersion
alone, and dispersion alone cannot tell "everyone gets the same lot" from
"nobody gets any". Run 3 produced the second and the falsifier read it as the
first.)*

- Median stacks at the 300s mark rises from 0 to somewhere in the range 4–12.
- The spread *between* policies is wide — a careful policy should carry
  meaningfully fewer than a careless one.
- **Falsifier:** if every policy converges on the same stack count, the drag is
  not dodgeable and the antibody is a timer in an enemy costume. That would mean
  `G-018` overcorrected, and the honest response is to cut the enemy rather than
  keep tuning it.

**Standing risk, not a prediction:** the pull makes the Egg fight more forgiving
for four builds at once. If win rates rise across the board and the table flattens
near 50%, the fight has become easy rather than fair, and *that* is when 320 HP
moves — after the shape is settled, not alongside it.

---

## 8 · Amendment — 2026-08-01, after Run 3

Appended. §7 stays where it is; the parts Run 3 reverses are marked in place and
answered here.

### 8.1 · What Run 3 actually established

§7.1 drew a line between a *participation* claim and a *rate* claim, and leaned
the whole of §7 on the participation claim because it does not need a large
sample. That reasoning was sound and it was applied to a corrupt measurement.
97% and 86% boss HP remaining were `nearestEnemy()` never seeing the boss and a
standoff derived from maximum reach instead of minimum. Both in the instrument.

The correct lesson is not "trust participation measures less." It is that a
mechanism observation is only as good as the mechanism being observed, and §7.1
never asked whether the builds were *firing* — only whether the boss took damage.
Those come apart exactly when a weapon has no target. Worth carrying: **before
concluding a build cannot do damage, confirm it is attacking at all.** Run 3's
per-item dps probe is the check §7 should have asked for and did not.

I am not treating the +19pp and +13pp the pull is worth as established. Both sit
inside overlapping intervals at n=16 and the file's own first rule applies.

### 8.2 · The pull is dropped (`G-019`)

**`BOSS_PULL` goes to 0.** Set on purpose, not inherited.

The mechanical case died with the bug fixes — boss HP remaining is 0% and 5% at
pull 0, so the participation problem §7.6 called "the one that matters" is
already solved without it. That leaves characterisation, and I said in `G-015`
that characterisation was the stronger half of the argument. Having now had to
test it alone, it does not hold up, for a reason the A/B shows rather than
anything I reasoned my way to:

> **Motility, greedy-capacitation and random score identically in both arms.**
> 56/56, 100/100, 94/94.

`G-015` pitched a universal positional question — *how close do I let it take
me* — answered differently by every build. If that were what shipped, a ranged
build would pay something to hold station. Three of five policies pay nothing
measurable. What is actually in the game is a range-dependent assist to the two
builds that wanted to be close anyway, invisible to everyone else. That is not
the mechanic the entry describes, and it is not worth a mechanic.

The characterisation argument fails a second time on perception. The act is set
in fluid. A gentle inward drift near the Egg does not obviously read as *the Egg
doing something inevitable*; it reads as a current, or as nothing. That claim
needs a human and has never had one — and `PLAN.md` is explicit that a human
decides what lands and no agent can stand in for that. An aesthetic effect no bot
can measure and no player has confirmed is not a reason to keep a mechanic that
does no mechanical work.

Dropping it also lowers mean win rate from 80.2% to 73.8% and widens the spread
from 44pp to 50pp. Small, free, and pointed the right way given that the standing
risk has fired.

**Keep the code and keep the test.** `BOSS_PULL` stays as a constant at zero and
the §7.2 non-negotiable test stays live, because it now guards against anyone
reintroducing an inward force without re-deriving the slowest legal build. That
test is worth more than the feature was.

**With an expiry, because inert features rot.** If Justin plays the Egg fight and
does not ask for something in that space, delete the constant and the pull path at
the next close. The one piece of missing evidence is a human's read of a
shooting-gallery boss; this holds the door open for exactly as long as it takes to
get one, and no longer.

### 8.3 · The antibody's lever is arrival (`G-020`)

Right diagnosis. `G-018` was correct and insufficient — not overcorrected.

**The change: antibodies stop entering at the arena edge and start already being
where the player is going.** Spawn at a fixed lead distance ahead of the player's
current heading, then hold the existing slow drift. Speed stays 34. Nothing about
the enemy changes except where it enters.

This is the most law-8-compliant behaviour available. The antibody does not
pursue, does not steer, does not react — it is simply already there, and the
player's own forward motion does all the closing. It is also `whyThisStage` made
literal: *the first record about the player is opened before they arrived*. You
swim into your own file.

And it hands the tuning a clean dial. **Lead distance is monotonic between the two
failure modes:** long lead gives more time to change heading and fewer stacks;
short lead gives less and more. That is a far better surface than HP ever was,
and it is the dial to move if Run 4 lands outside the band. Spawn rate is the
second knob and should stay fixed until lead distance is settled.

One check that makes `G-018` load-bearing rather than incidental: under
spawn-ahead, a motility build fires a 520px piercing line straight down its own
heading, which is precisely where antibodies now appear. At 2 HP it would delete
every one of them and the mechanic would exist for every build except the one
that shoots forward. Invulnerability is doing necessary work here. It was right
for its own reason and is now also load-bearing for this one.

### 8.4 · §7.6's antibody falsifier, corrected

The original conflated a claim about *level* with a claim about *dispersion* and
tested only the second. Convergence at 12 means undodgeable; convergence at 1
means absent; the falsifier could not tell them apart and read the second as the
first.

Any falsifier over a distribution needs both. Replacing it:

**Working** — median stacks at 300s in the range 4–12, **and** the careless
policy carries at least twice the careful one.

Two distinct failures, which are not the same problem and do not have the same
fix:

| | Signature | Reading | Response |
|---|---|---|---|
| **Absent** | Median below 3, at any dispersion | It does not arrive | Shorten lead distance |
| **Undodgeable** | Median in band or above, careless within noise of careful | Play does not affect it | Lengthen lead distance; if that does not separate the policies, cut the enemy |

**Report the distribution, not the median.** At integer counts near zero the
median saturates and hides the tail — "1, 2, 1, 1, 1" is compatible with a great
many different runs. Median plus 90th percentile plus mean, per policy.

### 8.5 · Predictions for Run 4

> **The independence claim below is wrong and is replaced by the standing rule in
> §9.2.** The two changes do confound each other: antibody stacks tax movement
> speed, every boss outcome depends on movement speed, and stacks do not expire
> before the boss. Read naively, Run 4 fired this section's falsifier; a control
> arm showed the falsification belonged to `G-020`.

Both changes land together; they are independent and do not confound each other.

- **The pull's removal costs nothing that matters.** Boss HP remaining stays at
  0–5% for both short builds. If either climbs above 20% with the pull off and
  the bug fixes in, `G-019` is wrong and the pull was doing work the A/B did not
  capture.
- **Mean win rate falls to roughly 74% and the spread widens to about 50pp**,
  reproducing the pull-0 arm. This is a reproduction check on the A/B rather than
  a new claim; if it does not reproduce, something other than `BOSS_PULL` differs
  between the arms.
- **Antibody median lands in 4–12 with careless ≥ 2× careful.** Falsifiers as
  §8.4.
- **Nothing else moves.** No item, no enemy, no HP value changed in this pass, so
  any other shift in the table is a regression rather than a result.

### 8.6 · One observation, not actioned

Out of scope by your framing and I am not touching it, but it should be on the
record before the next tuning pass: **`random` at 94% [72–99%] is a different
problem from 320 HP.** A policy that picks items at random and wins nineteen
times in twenty means the level-up choice is barely load-bearing, and no boss
health value fixes that — it is a claim about the item set, which is mine. It may
resolve on its own once `lash` working is absorbed into the baseline, since that
bug fix buffed every build simultaneously and its effect is currently
indistinguishable from everything else. Worth re-reading after Run 4 rather than
acting on now.

---

## 9 · Amendment — 2026-08-01, after Run 4

Appended. §8 stays; the one part Run 4 reverses is marked in place.

**No design changes in this pass.** Two questions turn on a mechanism nobody has
measured yet, and the honest response is a diagnostic run rather than a dial.

### 9.1 · What Run 4 established

`G-019` and `G-020` both hold. The control arm reproduces the Run 3 pull-0 numbers
to identity across every policy, every win rate and every boss figure — which is
what a deterministic sim with one changed constant should do, and is the cheapest
evidence available that nothing else drifted.

`G-020` meets §8.4 on both conditions: level for four of five policies, dispersion
2.8× against a required 2.0×. Neither failure signature is present.

§8.4's instruction to report the distribution rather than the median earned its
keep immediately. Medians read 2 and 8; the p90s read 4 and 15. The severity was
in the tail and the median could not see it.

### 9.2 · The independence assumption, replaced (standing rule)

§8.5 said the two changes could not confound each other. The specific coupling is
mine and I authored it in §3.3: **antibody stacks do not expire before the boss.**
"They come off only when the act ends" — and the Egg fight happens before the act
ends, so every stack collected in five minutes of crowd is still on the player
during the fight. The antibody is not a crowd-phase enemy. It is a crowd-phase
enemy whose output is a boss-phase debuff.

The general form, which is what future passes need:

> **Independence is a claim about state flow, not about subsystems or phases.** A
> change is independent of a measurement only if nothing it writes is read by
> anything the measurement depends on. The antibody writes to player speed; every
> boss outcome reads player speed. Different system, different phase, same state
> — coupled.

And the operational rule, which matters more than the reasoning:

> **Every multi-change pass ships with a control arm per change, or it ships one
> change.** A threshold tells you the outcome moved. It cannot tell you what moved
> it. Twice now a prediction has fired or failed for a reason outside the
> hypothesis it was written for — Run 3 an instrument defect, Run 4 a second
> change — and both times the control arm caught it and the threshold did not.

The sharpest part is that the assumption was not merely wrong, it was
**unnecessary**. In a seeded deterministic sim a control arm costs one extra batch
and reproduces to identity. There is no economy in reasoning about what can simply
be measured, and §8.5 reasoned anyway.

The same error runs through §8.5's other clause — "nothing else changed in this
pass, so any other shift in the table is a regression rather than a result." That
treats *no value changed* as *no effect propagated*. It is the same mistake in the
opposite direction and it would have caused Run 4's `random` movement to be filed
as a regression.

### 9.3 · `midpiece+wake` at median 2 — accepted, and do not touch lead distance

**Accepted in principle.** Dispersion is the mechanic working, and §8.4's
dispersion condition exists precisely to detect play affecting outcome. A build
that spends its entire identity on movement buying partial immunity to a movement
tax is a purchase, not an exploit, and Midpiece charges maximum HP for it.

**Do not shorten lead distance.** Four of five policies are in band. The one
outside it is the *winning* build at 100%, and the global dial would push
`membrane+acrosome` — already median 8, p90 15, and the build at 38% with 22% boss
HP remaining — further up. That is fixing the leader by hurting the laggard, using
the only lever that cannot tell them apart.

**And I do not think speed is the mechanism.** Take the geometry: to avoid an
antibody placed at a fixed pixel lead L, the player needs lateral displacement of
roughly one collision radius before travelling L forward. Lateral escape available
is `v × (L / v)` — **speed cancels.** A fixed pixel lead is close to
speed-neutral, which means Midpiece's 2.6 against Membrane's 7.4 is not being
bought by velocity.

The likelier mechanism is **heading volatility**. Antibodies spawn on the player's
*instantaneous* heading. A kiting build changes heading constantly, so the
placement is stale before the player would ever reach it. `membrane+acrosome`
stands in the crowd and travels in straighter lines, so it walks into them. If
that is right, the mechanic is rewarding direction changes rather than speed —
which is a legitimate and more interesting skill expression than the one it was
designed for, and it is not something a lead-distance dial can address at all.

**Measure before touching anything:** correlate stacks against heading-change rate
per policy. Deterministic, cheap, and it settles it.

If confirmed, the lever is **the averaging window, not the distance** — spawn on
heading averaged over the last one to two seconds instead of the current frame.
That moves exactly the volatile build and leaves the four stable ones where they
are, which is what the global dial cannot do. It also tightens the fiction rather
than bending it: *already where you are going* is more true of a few seconds of
travel than of one frame.

**One thing I want explained before any of this is acted on.** `midpiece+wake`
went 69% → 100% on a change that was supposed to be a tax. The likely explanation
is benign — antibodies moved out of the retreat path a kiting build spends most of
its time in, so the speed build's speed tax roughly halved — and that is coherent
without any defect. But three of the last four runs contained an instrument defect
that first presented as a design finding, and a tax that makes its most exposed
target stronger has earned a check. Confirm it before tuning on it.

### 9.4 · The Membrane compounding stands — the item text was what was wrong

**Stands.** And I want to be calibrated about the 22% rather than alarmed by it:
the non-participation signature that started this whole thread was 86–97%. A build
that removes 78% of the boss and then loses is a build losing, which is what
Membrane is for. 5% → 22% is a real movement on the measure §7.1 called
load-bearing, and it is not that measure's failure mode.

Worth naming explicitly: this is a reinforcing loop — more stacks, slower, dodge
worse, more stacks — and the only reason it is a bounded ceiling instead of a
death spiral is the stack cap from §7.5. The p90 of 15 is the cap doing that work.
If the cap is ever raised, this is the interaction that decides how far.

**What was actually wrong is the item's text.** Membrane's `tradesAway` names the
spermicide ring and the white cell and stops there, because when I wrote it
antibodies arrived at the arena edge and were dodgeable by anyone. It now
understates its own cost by a primary consequence.

`G-014` warns against a `tradesAway` filled with a sentence explaining why a
downside is not really a downside. A field that quietly understates is the same
failure inverted, and it is worse here, because the whole argument for keeping the
compounding is that the trade was stated. Corrected in §4.3 — the antibody clause
is now in the item text, and the item text is data, so it is fixed in place rather
than appended.

### 9.5 · Run 5 — a diagnostic pass, no changes

Nothing in the design moves. Two measurements, both cheap, both settling questions
that a dial would otherwise be guessing at. The §9.2 control-arm rule does not
apply, because there is no change to attribute.

- **Stacks against heading-change rate, per policy.** Confirms or kills the
  volatility hypothesis in §9.3. If the correlation is strong and the correlation
  with mean speed is weak, the averaging window is the lever and lead distance is
  not. If neither correlates, I have the mechanism wrong and §9.3 reopens.
- **Why `midpiece+wake` went 69% → 100%.** Expected answer: its mean stack count
  roughly halved relative to the edge-spawn arm, and that is the whole difference.
  If its stack count did not fall enough to explain a 31pp swing, something else
  changed and it needs finding before anything is tuned on top of it.

Not a prediction, a standing note: `membrane+acrosome` at 38% / 22% is the number
to watch next pass. It is acceptable now. If it drifts above roughly 40% boss HP
remaining it stops being a hard build and starts being an excluded one, and that
is the point at which the compounding gets revisited rather than defended.

### 9.6 · Flagged, not actioned

`random` at 94% → 75% with the spread widening 50pp → 62pp is §8.6 moving on its
own, from a change that was not aimed at it. That is the direction §8.6 wanted and
I am not claiming it — the intervals overlap and one run does not settle it. But
the mechanism is at least legible: `G-020` made the *choice* of items matter more,
which is exactly what §8.6 said was missing when a random policy could win
nineteen times in twenty. Re-read after Run 5.

`BOSS_PULL` remains at zero with the §8.2 expiry recorded on the constant. Nothing
in this pass touches it and nothing an agent can do closes it — it needs Justin to
play the fight and say whether a stationary boss at a fixed distance is a
shooting gallery. Until then the expiry is the right state for it to be in.

320 HP still untouched, still flagged, and now waiting behind one more question
than it was.

---

## 10 · Amendment — 2026-08-01, after Run 5

Appended. Run 5 answered both §9.5 questions and neither answer was the one §9.3
expected. The consequence reaches further than the two questions: it takes the
stated reason out from under two decisions I made in the last two passes, without
changing what either decided.

### 10.1 · What Run 5 established, and what it unsettled

**Established.** Chemotaxis is the largest measured driver of antibody stacks —
r = +0.462, +0.366 holding speed, 6.7 stacks with against 3.3 without. The
`membrane+acrosome` / `greedy-capacitation` pair is the clean case: near-identical
item speed (162.3 / 161.8) and turn rate (51.7 / 53.6), 68% apart on stacks, and
the only difference between the policies is Chemotaxis. Neither speed nor
volatility survives the partial correlations.

**Unsettled, and this is the part with reach.** The bot turns 52–74 radians per
second — eight to twelve full rotations. That is not volatile movement, it is
thrashing, and no input device a human holds produces it. So "spawn on the
player's instantaneous heading" is already "spawn at a random point 320px away"
for every policy, the jitter arm had no headroom to add, and §9.3 is untestable
here rather than refuted.

The consequence is that **every stack count in Runs 4 and 5 is a floor.** A human
holds a heading for whole seconds, so `G-020` places antibodies much closer to
where a human will actually be. The bot understates the mechanic by an unknown
factor.

Fourth instrument defect in five runs, and the third to first present as a design
finding. That is not bad luck any more — it is a pattern, and §10.5 is about it.

### 10.2 · Chemotaxis keeps the antibodies (`G-023`)

**Intended. No exemption.**

Chemotaxis's `tradesAway` already says the quiet part: *pulling a crowd into a
tight point is exactly how a run ends for a player who has nothing to clear it
with.* The antibody is that sentence's limit case — the one enemy the pull
gathers that no amount of clearing can pay off. That is the stated cost landing
where it bites hardest, not a bug in it.

It also gives the item a genuine internal tension, which is what `G-014` wants
from every item and what §7.3 flagged as the thing it could not predict: the item
that lets you decide where everything goes is also the item that calls the one
thing you cannot shoot. It gets better and worse in the same pick.

**But the invisibility was a real defect and it is not the same question.** §3.3
made the antibody silent on purpose — "the player should not be able to say when
it went wrong" — and that is defensible for a *background* accumulation nothing
the player does changes much. It is not defensible for an accumulation one
specific item doubles, because that is a decision, and `G-014`'s premise is that
costs are stated. A cost the player cannot perceive is not a trade; it is a tax.

The fix is the text, not the mechanic. Chemotaxis's `tradesAway` now names it
(§4.2). The pull itself is already visible on screen — a player who drops an
attractor and watches grey Y-shapes converge into it has been told, without a word
of narration.

### 10.3 · Two item texts were wrong, and one of them because I fixed it two runs ago

Membrane's `tradesAway` is **reverted** to its original wording.

§9.4 added an antibody clause to it on the strength of a compounding loop —
slower build, more stacks, slower still. Run 5 says that loop is not the driver:
item speed holding turn is −0.133, which is below anything a player perceives, and
the 7.4 stacks on `membrane+acrosome` are Chemotaxis's, not Membrane's. The
clause I added was directionally true and badly overstated, and hedging it would
be worse than removing it. Item text describes an item, not a policy.

The general hazard, which is the useful part and which I have now walked into
twice in two runs:

> **Changing an enemy silently rewrites the stated cost of every item that
> interacts with it, and item text does not update itself.** `G-020` moved where
> antibodies arrive and that edited the real cost of Membrane and Chemotaxis,
> neither of which mentioned antibodies at all. When an enemy's behaviour
> changes, re-read every item's `tradesAway` against it — and attribute the
> effect before writing the clause, because the obvious candidate was wrong here.

### 10.4 · §8.4's band — the level condition comes off the bot

The 4–12 band was never a measurement. It was a guess I wrote in §7.6 about what
"a dozen small grey Y-shapes by minute four" would look like, and §8.4 kept it.
Now the instrument that checks it is known to read low by an unknown factor.
Picking a different number changes nothing — it would be a second guess against
the same broken instrument.

Restating §8.4:

- **The dispersion condition survives unchanged.** Careless ≥ 2× careful is a
  *ratio*, and the bot's thrashing is roughly uniform across policies, so a
  uniform downward bias very largely cancels. It also remains the condition that
  detects the failure modes that matter.
- **The lower bound survives, as a floor.** A median below 3 still means *absent*.
  An instrument that reads low can prove absence — if even the understating
  measurement sees nothing, there is nothing.
- **The upper bound is deleted.** An instrument that reads low cannot detect
  excess. There is no bot number that can tell us the mechanic is too strong, so
  the file should stop pretending one exists.

The excess question goes to the only instrument that can answer it. §3.3's target
was written as a feel — *moving visibly slower*, *should not be able to say when
it went wrong* — and no bot can assess either. I converted a perceptual claim into
a number so it would be checkable, and the number was a guess wearing a
criterion's clothes. That was the error, not the value of the number.

### 10.5 · The instrument, not the hypothesis

§9.3 is unresolved and cannot be resolved here. But the interesting thing is that
the thrashing and the unweighted threat model are not two defects. They are one
under-specified component — **the bot's movement policy is not a model of a
player** — and it has now produced four INSTRUMENT findings in five runs, three of
which arrived disguised as design findings.

So: **do both fixes as one piece.** Heading inertia and threat weighting land
together, with one control arm and one re-baseline. Done separately they cost two
control arms and two full re-readings of every number in this file, for the same
result. Per §9.2 this is a multi-change pass and it needs a control arm per
change; that is two arms in one run, not two runs.

And it is a **re-baseline, not a change.** Every movement-dependent number in
Runs 3, 4 and 5 is measured against an instrument that is about to move: §9.5's
40% threshold, `G-022`'s 22%, the §8.4 dispersion figure, `random`'s 75%. None of
them are wrong; all of them are provisional. Nothing should be tuned against them
until they are re-read.

Note also that both artefacts flatter the build that generates the most
repulsors near itself, and `membrane+acrosome` is that build. Its 22% is more
likely optimistic than pessimistic. **If any build crosses §9.5's 40% threshold
once the instrument is honest, it will be that one — and Chemotaxis is where to
look first, not Membrane.** That is now the thing §9.5's standing note was
actually watching for.

### 10.6 · What only Justin can close

Three separate threads have now terminated at "needs a human", and nobody has put
them in one place. They do not block the instrument work and the instrument work
does not block them — these are feel questions and no bot number moves them.

| Question | Origin | What to look for |
|---|---|---|
| Is the Egg a shooting gallery? | §8.2 expiry on `BOSS_PULL` | Standing at your weapon's range and dodging a spread every 2.45s — does it hold interest, or does the fight want a reason to move? If it does not want one, delete the pull path. |
| Is the drag the right size? | §10.4, upper bound deleted | By minute four: do you notice you are slower? Can you say when it started? The first should be yes and the second should be no. |
| Does Chemotaxis read? | §10.2 | Drop an attractor with antibodies nearby. Do you see the Y-shapes come to you, and do you connect that to being slower? |
| Is any of it funny? | `PLAN.md` | The only question in the project no agent can attempt. |

### 10.7 · Run 6

**One pass, two changes, two control arms** (§9.2). No design changes from me.

- **Heading inertia and threat weighting**, landed together as the instrument
  re-baseline described in §10.5. A control arm per change, since they will
  interact — a bot that holds a heading *and* correctly ignores harmless enemies
  moves differently from one that does either alone.
- **Re-read, do not re-decide.** The output is the whole table measured again, not
  new rulings. `G-019` through `G-023` all stand until the re-baseline says
  otherwise, and if it does, that is a §11.
- **Expected direction, recorded so it can be wrong:** antibody stacks rise for
  every policy, `midpiece+wake`'s 100% falls as its defensive screen is taken
  away, and `membrane+acrosome`'s 22% rises. If stacks *fall* under a bot that
  holds a heading, §10.1's floor claim is wrong and `G-020` needs re-opening
  rather than re-reading.

320 HP untouched. `BOSS_PULL` at zero with the §8.2 expiry, now listed in §10.6
where it can actually be closed.

---

## 11 · Amendment — 2026-08-01, after Run 6

Appended. The re-baseline confirmed §10.1 and did not overturn a ruling. What it
did do is invalidate the *form* of most of the criteria in this file, and produce
one finding that needs a decision rather than a re-read.

### 11.1 · What Run 6 settled

`G-020` does not reopen — the falsifier did not fire and the floor claim was right
by an order of magnitude rather than a little. The decomposition is clean and it
is what the two control arms were for: **threat weighting drives the stacks
(5–10×), heading inertia drives the difficulty (win rates collapse), and neither
does much of the other's job.** Two arms in one pass paid for themselves exactly
as §9.2 argued they would.

Arm A failing to reproduce is the other thing that paid off. A degenerate-case
change had leaked into the control, and the only reason it was caught is that the
control was expected to reproduce *exactly* and did not. That is the §9.2 rule
working on its author's own code, which is the case it was hardest to write for.

Fifth instrument finding in six runs — but `stacksAt300` was caught before
reporting rather than after, which is the first time. Worth noting that the trend
is the useful one even though the count is not.

### 11.2 · The cap becomes a curve with a floor (`G-025`)

This is the ruling, and the reason it is urgent is not the tail.

> **§8.4's dispersion condition passes at 2.5× — and both of its terms are above
> the cap.** 24.6 stacks and 61.8 stacks both floor at 0.65 drag. The careful
> policy and the careless one arrive at exactly the same movement speed. The ratio
> is arithmetically correct and it measures something the player cannot feel:
> experienced dispersion is **1.0×**.

That is worse than a stale number. It is a criterion that reports *working* while
the property it exists to detect has gone to zero, and it would have kept
reporting working indefinitely.

The tail matters too — stacks 18 through 76 do nothing, so an enemy that spawns
for five minutes stops mattering somewhere in the third — but the dispersion
collapse is the part that had to be caught now.

**The ruling: diminishing returns with a floor on resulting speed, no ceiling on
stack count.** §3.3 asked for three properties — no single stack feels unfair, the
aggregate is decisive, the player cannot say when it went wrong. A hard cap
preserves the first and third and breaks the second the moment it is reached. A
curve with strictly positive marginal drag keeps all three, and a floor on speed
does the bounding job the cap was actually there for.

**And 0.65 is too generous, which I can say without a single bot number.** §7.5
set that floor as a safety valve — a value chosen to prevent something bad, not to
express the intended worst case. §3.3's intended worst case is that *a careless
run ends because of it*. A player at 65% speed is inconvenienced. Those are
different jobs and the same number cannot do both.

**The shape is mine; the value is not, and it is not the bot's either.** "Moving
visibly slower" and "a careless run ends" are perceptual claims, the same category
§10.4 already moved off the instrument. My starting guess is a floor somewhere
around 0.35–0.45, offered so Justin has something to react to rather than as a
proposal. It should not be tuned before §11.4 lands, because a bot that holds a
heading deliberately will produce a different stack distribution again.

### 11.3 · Absolute thresholds are retired (`G-026`)

The answer to "are numbers the right form" is mostly no, and §10.4 was the first
instance rather than a special case.

What has survived every instrument change in this file: ordinal claims (careless
carries more than careful), directional claims (stacks rise under threat
weighting), presence claims (median below 3 means absent), reproduction claims
(arm A must match Run 5 exactly), and decomposition claims (this lever moves that
measure). What has not survived: every calibrated level, three sets of them in
three runs.

Two rules, and the second is the one Run 6 taught:

> **Prefer criteria at qualitative boundaries, far from the operating point, over
> thresholds calibrated near it.** §10.4's "median below 3 means absent" survived
> two instrument changes because the instrument would have to be wrong by a great
> deal to flip it. §9.5's 40% sat eighteen points from a measured 22% and was
> invalidated by the first change that touched it.

> **A ratio is only meaningful if both its terms sit in the region where the
> quantity still maps to player experience.** Check the operating region before
> trusting a ratio. §8.4's dispersion is the worked example and it passed while
> measuring nothing.

Concretely:

- **§9.5's 40% threshold is retired**, not restated. Replaced by a qualitative
  participation criterion: *a build is excluded when it cannot remove half the
  boss on runs where it reaches the boss.* Far from any operating point, and it
  restates the original 86–97% crisis as the shape it actually was rather than as
  a calibrated line.
- **§8.4's dispersion condition is retained in form and suspended in fact** until
  §11.2 lands. It cannot be evaluated while both terms saturate. When the drag
  curve has no cliff, it becomes meaningful again and can be read as written.
- **Every criterion from here records the instrument it was set against**, the
  same way every asset records its prompt (`D-010`). A criterion without its
  provenance is not a criterion once the instrument has moved twice.

### 11.4 · The inertia model — cadence, with one interrupt

Your diagnosis is right and the reasoning is worth stating explicitly: a
first-order lag models a slow *actuator*. A human is a fast actuator with a slow
*controller*. Keyboard input is discrete and reversal is instantaneous; what a
person cannot do is decide sixty times a second. So the constraint belongs on the
decision, not on the turn.

**Decision cadence, hold between re-evaluations.** Agreed.

**With one interrupt, and it needs no new tuning parameter: re-evaluate
immediately on taking damage.** A pure zero-order hold has its own artefact — it
commits for the full interval regardless of what happens, so the bot will walk
into things a person would obviously react to, and this would swing the antibody
measurement from understating to overstating. A damage event is discrete, requires
no threshold, and is exactly what a person reacts to. Antibodies deal zero damage
and so do not trigger it, which is correct: a human does not panic-turn for a
harmless drifting shape either.

**Do not pick the cadence value. Measure it.** Justin is already needed at a
keyboard for four questions in §10.6, and the browser build exists. Log his input
during that session and take the heading-hold duration distribution directly. That
converts the last guessed parameter in the instrument into a measured one, at
almost no marginal cost, and it is the only calibration available that is not
another agent's estimate of a person.

Until then 150–250ms is a reasonable placeholder and should be labelled as one.

### 11.5 · What only Justin can close — now five, and it is the critical path

§10.6's table plus one, and the addition changes its status. This is no longer a
list of nice-to-haves running in parallel with the instrument work — the
instrument's last free parameter is now on it, and so is the value in §11.2.

| Question | Origin | What to look for |
|---|---|---|
| Is the Egg a shooting gallery? | §8.2 expiry on `BOSS_PULL` | Does the fight hold interest at a fixed distance, or does it want a reason to move? If not, delete the pull path. |
| Is the drag the right size? | §10.4, §11.2 | By minute four: do you notice you are slower? Can you say when it started? First yes, second no. |
| Does Chemotaxis read? | §10.2 | Drop an attractor near antibodies. Do you see the Y-shapes come to you, and connect that to being slower? |
| **How long do you hold a heading?** | §11.4 | Logged, not asked. Input capture during the same session. |
| Is any of it funny? | `PLAN.md` | The only question no agent can attempt. |

Four of these need one session and the fifth is a log file from the same session.

### 11.6 · Run 7

**Blocked on §11.5**, and that is the finding rather than an inconvenience. Two of
the three things Run 7 would measure — the drag floor and the cadence value — are
now waiting on a person, and running the bots again before that produces another
table nobody can tune against.

What can proceed without Justin:

- **Implement §11.2's curve shape** with the floor left at 0.65 as a placeholder,
  explicitly marked as the old safety-valve value and not a design choice. Shape
  first, value after the session.
- **Implement §11.4's cadence with the damage interrupt**, placeholder 200ms,
  labelled.
- **Re-read §8.4's dispersion once the curve is in.** If both terms fall below
  saturation it becomes evaluable again on arm C, and that is a genuine result
  rather than a placeholder.

Not to be done: any tuning against arm D's win rates. They are honest about
antibody arrival and unfair about difficulty, you said so, and I agree — the
survival numbers are downstream of the model shape that §11.4 is replacing.

320 HP untouched. `BOSS_PULL` at zero, expiry open, now one of five on the
critical path rather than one of four on a side list.

---

## 12 · Amendment — 2026-08-01, after Run 7

Appended. Both shapes landed as specified and the curve did its job: §8.4's
dispersion measures the right quantity again. It also fails, and the reason it
fails turns out to be a conflict with the design rather than a wrong number.

### 12.1 · What Run 7 settled, and one thing it did not corroborate

§11.2's diagnosis reproduces exactly — 1.00× experienced dispersion under the old
clamp while the criterion reported 2.51× and passed. That is the clearest possible
confirmation that a passing number can measure nothing, and it is now in the
record with the arithmetic attached.

The tail is fixed. Marginal cost at n=30 goes from 0.000% to 0.296%, at n=76 from
0.000% to 0.098%. Every stack in the act now does something.

**One correction to how the result is written up.** Run 7 records the failing
dispersion as agreeing with §11.2's argument that 0.65 is too generous, "from an
independent direction". It cannot. The floor cancels out of the ratio — Run 7
proves this algebraically and has a test asserting it — so a dispersion figure
carries no information about the floor whatsoever. Two arguments both concluding
that the current settings are wrong, for causally unrelated reasons, is not
corroboration. It is a coincidence, and filing it as mutual confirmation is how a
project ends up with two beliefs propping each other up and nothing underneath.

### 12.2 · `k` is perceptual, just not as a ratio (`G-028`)

The premise is right and the conclusion does not follow. A person cannot feel a
ratio between two runs they did not have — agreed. But that is a claim about
dispersion, not about `k`.

`k` sets curvature, and curvature has a single-run signature that a player feels
directly: **when the drag becomes noticeable, and when it stops growing.** High
`k` reads as *I got slow early and then it stopped mattering*. Low `k` reads as *I
kept getting slower all the way to the boss*. Both are perceptible in one sitting
by one person.

And §3.3 stated its requirement in exactly that form: *by minute four the player is
moving visibly slower*. That is a claim about a trajectory, not about an endpoint,
and the floor cannot express it. Only `k` can.

So `k` goes to §11.5 with the floor, as a separate question with a
trajectory-shaped prompt: **at minute two, at minute four, and at the boss — is it
still getting worse, or did it stop mattering early?** Answerable in one session.
Not answerable by anyone else.

### 12.3 · §8.4's dispersion condition is retired (`G-027`)

Not because 2.0× is stale. Because **2.0× and §3.3's severity intent cannot both
be satisfied under `G-025`'s curve family.**

`k` trades dispersion against achievable severity, monotonically. Take the ceiling
case — floor at 0, the most severe curve the family permits — at the careless
policy's current mean of 61.8 stacks:

| k | dispersion | max possible drag at n=61.8, floor = 0 |
|---|---|---|
| 0.030 (current) | 1.53× | 65.0% |
| 0.007 | 2.06× | **30.2%** |

Pushing `k` down far enough to reach 2.0× more than halves the worst drag the
mechanic can ever produce at the stack counts this act actually generates. And
30.2% is *below* the 35% I argued in §11.2 was already too generous to satisfy
§3.3's "a careless run ends because of it".

So the condition is not a criterion. It is a second design constraint competing
with the first, and it wins by construction because it was written down as a test.

`G-026` independently condemns it: the achievable range is 1.0 to 2.512, and 2.0×
sits at 66% of the way up it — a threshold calibrated near the operating point, of
exactly the species `G-026` retires. Worse, the range itself is a property of a
curve family chosen two amendments *after* the threshold was set.

**What the bot keeps:** the ordinal claim. *Careless experiences strictly more
drag than careful, and the ordering is stable across seeds.* That is the actual
"does play matter" question, it is instrument-independent, and it is what a bot
can establish. Currently satisfied at 1.53×.

**What goes to the human:** the magnitude. Whether 1.53× is enough separation is a
question about whether a careless run feels like it was the player's fault, and no
ratio answers that.

**Third criterion off the instrument in three passes** — §10.4's level, §11.3's
40%, now this. That is a pattern rather than three coincidences, and the reading
is this: §3.3 specified the antibody entirely in perceptual terms, and every
attempt to proxy those with a bot number has eventually measured something else.
The bot can establish the mechanic's *presence* and its *ordering*. It cannot
establish its *calibration*, and four passes of trying is enough evidence.

### 12.4 · §11.5 is six questions, and it has been the bottleneck since Run 3

| Question | Origin | Owner |
|---|---|---|
| Is the Egg a shooting gallery? | §8.2 | Justin |
| Is the drag the right size? | §10.4, §11.2 — the floor | Justin |
| **Is the drag the right shape?** | §12.2 — `k`, trajectory | Justin |
| Does Chemotaxis read? | §10.2 | Justin |
| How long do you hold a heading? | §11.4 — logged, not asked | Justin |
| Is any of it funny? | `PLAN.md` | Justin |

Five need one session; the sixth is a log file from the same session.

**And this is worth recording as a process finding, because the study is
observational and this is an observation.** The first human-blocking question
opened after Run 3. Runs 4 through 7 each added to that list and none closed one.
The split is honest rather than damning: the instrument work in Runs 5 and 6 was
correctly unblocked and correctly done — the bots *were* broken and four real
defects came out of it. But the **design calibration** has been blocked on a
person for four passes, and the loop kept producing passes because it could, not
because they were the bottleneck.

`PLAN.md` calls Phase 2 the risk gate and says a human judges whether the act is
fun. That gate has been standing open and unattended for four runs while the
agents worked around it.

### 12.5 · Run 8

**Do not run one.** There is no bot number that moves any open question.

- The floor, `k`, and the cadence are all placeholders waiting on one session.
- The dispersion condition that would have justified another pass is retired.
- Arm D's win rates remain unread and untuned against.

What is worth doing with no bots and no session: nothing in this file. The next
useful agent-hours are elsewhere in the project — School's reserved-silhouette
list (§6, blocking any School asset generation) and the human-figure question
still open in `ART-DIRECTION.md`, which is the largest unvalidated assumption in
the art direction and blocks four of seven acts.

**On resumption**, after the session: re-derive the floor and `k` from what Justin
reports, set the cadence from the input log, then re-baseline once with a control
arm per change (§9.2). That is a §13.

320 HP untouched, and it is now the least interesting open item in the file.
`BOSS_PULL` at zero with its expiry, still waiting on the same session as
everything else.
