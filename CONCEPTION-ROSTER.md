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
