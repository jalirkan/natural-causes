# Playtest findings

Running record of what the automated bots measured and what it means for design.
**Newest first.** Written by Claude Code, for Cowork.

## How to read this file

- **Every rate carries a Wilson 95% interval.** The interval is the result; the
  point estimate is not. A rate from a handful of runs is not a rate.
- **Participation is a different claim from win rate.** "Boss HP remaining at
  death" measures whether a build can interact with the fight at all. That claim
  does not need a large sample and is not weakened by overlapping intervals.
- **A finding is not reported until the instrument has been checked.** The bots
  are code with bugs in it, exactly like the game. Twice now a "design finding"
  turned out to be the measuring apparatus. Anything below marked
  **INSTRUMENT** was a defect in the bots or the sim, not in the design.
- Bots drive `src/sim/world.ts` directly — the same rules the browser runs, not
  a re-implementation. Runs are seeded and deterministic.
- Reproduce with `pnpm playtest -- --runs=16`. Isolate a mechanic with
  `--pull=0`. Raw runs land in `tools/playtest/runs/`.

---

# 2026-08-01 · Run 6 — instrument re-baseline. No design changes.

Four arms: control, inertia only, threat weighting only, both. Two item strings
lifted (§10.2, §10.3) — data, no behaviour.

## The short version

1. **All three §10.7 predictions confirmed in direction**, and §10.1's floor claim
   is confirmed emphatically. Stacks do not fall; they rise by 5–10× under threat
   weighting alone and 10–25× under both.
2. **The two changes have cleanly separable effects.** Threat weighting drives the
   stacks. Heading inertia drives the difficulty. Neither does much of the
   other's job, which is what the two arms were for.
3. **The re-baselined table is not usable as an absolute measure.** The bot now
   dies at 124–232s against 306–346s before, and most policies never reach the
   boss at all. The direction is trustworthy; the levels are not.
4. **§7.5's stack cap now saturates in normal play** rather than acting as a
   safety valve, and everything past roughly 17 stacks is inert.
5. The inertia model is a first-order lag, which is **vehicle turning, not human
   decision-making**, and its time constant has never been validated against a
   person. That is my judgement of my own implementation, not a measurement.

## The four arms

| | A · control | B · inertia | C · threat | D · both |
|---|---|---|---|---|
| midpiece+wake | 100% | 0% | 44% | 0% |
| membrane+acrosome | 38% (22%) | 6% (74%) | 25% (79%) | 19% (31%) |
| motility | 63% | 25% (57%) | 81% | 13% |
| greedy-capacitation | 94% | 56% | 81% | 19% (3%) |
| random | 75% | 19% (75%) | 81% | 31% |
| turn rate, rad/s | 52–74 | 2.3–2.6 | 27–45 | 2.1–2.3 |
| mean stacks at 300s | 2.5–8.4 | 0–12.6 | **24.6–61.8** | **48–76** |
| median survival, s | 306–346 | 166–314 | 305–322 | 125–232 |

Boss HP remaining in brackets where it is not 0%.

**Arm A reproduces Run 5 exactly** — 100 / 38 (22%) / 63 / 94 / 75. That is the
control doing its job, and it took a correction to get: my first attempt changed
the degenerate case, where the repulsion vectors cancel, from "snap to +x" to
"hold the last heading". That is part of the inertia change and it belongs behind
the inertia flag, not in the control. Caught because the arm did not reproduce.

## The decomposition

**Threat weighting is the stack driver.** Arm C raises mean stacks from 2.5–8.4 to
24.6–61.8 — five to ten times — while leaving win rates in the same region as the
control (44–81% against 38–100%). Once the bot stops fleeing a 0-damage enemy as
hard as it flees a 14-damage one, it simply walks through every antibody placed in
front of it. This is the artefact from Run 5 quantified: the defensive screen was
worth most of the mechanic.

**Heading inertia is the difficulty driver.** Arm B collapses win rates (0–56%)
while raising stacks only moderately. A bot that commits to a direction gets
cornered by a horde that converges from every side, and `midpiece+wake` — whose
whole identity is kiting — goes to 0% and stops reaching the boss.

They compound in arm D rather than cancelling.

## §10.7's predictions

| prediction | result |
|---|---|
| Stacks rise for every policy | **Confirmed.** 5–10× on threat alone, 10–25× on both |
| `midpiece+wake`'s 100% falls | **Confirmed.** 100% → 0%, and it stops reaching the boss |
| `membrane+acrosome`'s 22% rises | **Confirmed.** 22% → 31% (D), 74–79% (B, C) |
| **Falsifier:** stacks fall under a bot that holds a heading | **Did not fire.** They rise sharply. §10.1's floor claim stands and `G-020` does not reopen |

The floor claim was right and understated. The bots were not reading a little low;
they were reading an order of magnitude low.

## What the re-baseline cannot give you

**An absolute table.** In arm D only 0–7 runs of 16 per policy reach the 300s mark,
and `midpiece+wake` reaches it zero times out of sixteen. Boss participation
numbers over a handful of survivors are not comparable to numbers over sixteen,
and §9.5's 40% threshold cannot be evaluated against them at all.

**A dispersion figure.** §8.4's careless-≥-2×-careful condition is undefined in
arm D, because the careful policy has no runs at the measurement point. In arm C,
where survival is intact, it is 61.8 against 24.6 = **2.5×**, so the condition
still passes on the arm that can express it.

I also had to fix a measurement defect of my own before any of this was legible:
`stacksAt300` kept its initial value of 0 for runs that ended before 300s, so a
table of medians read 0 while the means read 20–28. Stack statistics are now
computed over survivors only, with the surviving count reported alongside.

## The part I am least confident in, which is mine

The inertia model is a first-order lag on heading with a 0.22s time constant. It
took the turn rate from 52–74 rad/s to 2.2, which is the right order of magnitude
for a person. But a lag is the wrong *shape*: it models something with a turning
circle, and reversing direction under it takes several time constants. A human on
a keyboard reverses instantly — what a human does not do is oscillate at 60Hz.

The better model is probably **decision cadence**: re-evaluate the desired
direction every 150–250ms and hold it in between, so heading changes are instant
but infrequent. That produces a stable heading without a turning circle, and it
would very likely recover much of the survival that arm D lost.

So: arm D is honest about antibody arrival and probably unfair about difficulty.
The stack findings are safe in direction and magnitude; the win rates are not, and
I would not tune anything against arm D's survival numbers.

## Re-read, not re-decided (§10.7)

- **§9.5's 40% threshold** — cannot be evaluated. `membrane+acrosome` reads 31% in
  arm D and 74–79% in B and C, all over too few survivors to compare against a
  threshold set on sixteen.
- **`G-022`'s 22%** — was optimistic, as §10.5 predicted. Every arm moves it up.
- **§8.4 dispersion** — holds at 2.5× on the arm that can express it.
- **`random`'s 75%** — 19% (B), 81% (C), 31% (D). Moves in both directions
  depending on which fix is applied, so §8.6's question is not settled by this.
- **§7.5's cap** — now the binding constraint. `antibodyDrag` floors at 0.65,
  reached at about 17 stacks; the re-baselined bot carries 48–76. Under an honest
  instrument the mechanic saturates around minute four and every stack after that
  is decoration. That was a safety valve and it is now a design surface.

## Decisions wanted

1. **The inertia time constant needs a shape, not a number.** A first-order lag
   may be the wrong model of a player entirely. This is an instrument decision
   with design consequences and I would rather not pick it alone.
2. **§7.5's cap saturating** is the one thing here that looks like it needs a
   ruling rather than a re-read.
3. **Whether any absolute threshold survives.** Two runs in a row have moved every
   movement-dependent number. §9.5's 40% and §8.4's dispersion figure were both
   set against instruments that have since changed twice.

---

# 2026-08-01 · Run 5 — diagnostic. No design changes.

Two questions, per §9.5. Both answered. Both answers are different from the ones
§9.3 expected, and both turn out to rest on the instrument rather than the design.

## The short version

1. **Neither volatility nor speed buys the dodge. Chemotaxis does** — it pulls
   antibodies onto the player. §9.3's mechanism is not supported and §9.3
   reopens, but not in the direction it anticipated.
2. **§9.3's volatility hypothesis cannot be tested with this bot**, and the reason
   matters more than the result: the bot has no stable heading to make stale.
3. **`midpiece+wake`'s stacks tripled rather than halved** — 0.9 → 2.6 — and it
   still went 69% → 100%. The expected explanation is wrong in direction.
4. The real swing is **HP on arrival at the boss: 52% → 66%**, and the cause is
   the bot fleeing a harmless enemy.
5. Membrane's corrected `tradesAway` is lifted. Data only, no behaviour change.

## Q1 — what buys the dodge

### Correlations, lead arm, n=80

| pair | r | 95% CI | partial, holding speed |
|---|---|---|---|
| stacks vs heading-change rate | −0.399 | [−0.568, −0.196] | **−0.182** |
| stacks vs item speed (exogenous) | −0.382 | [−0.555, −0.178] | −0.133 (holding turn) |
| **stacks vs chemotaxis level** | **+0.462** | **[+0.269, +0.619]** | **+0.366** |

Speed is reported as *item* speed — the exogenous half. Correlating stacks
against realised speed is circular, because stacks are one of the things that
lower realised speed. That circular figure is −0.46 and means nothing.

**Group means: 6.7 stacks with Chemotaxis (n=38) against 3.3 without (n=42).**
Double, on one item.

### The intervention

Correlation could not separate volatility from speed, because the policy set is
collinear — the fast builds are also the kiting builds. So the arms were
separated by force: a heading-jitter arm rotates the bot's movement vector by a
normal deviate each step, which changes how much it turns and leaves the
magnitude exactly untouched.

| policy | turn rad/s (base → jitter) | stacks (base → jitter) |
|---|---|---|
| midpiece+wake | 69.1 → 73.8 | 2.6 → 2.6 |
| membrane+acrosome | 51.7 → 56.6 | 7.4 → 7.5 |
| motility | 62.7 → 67.5 | 4.0 → 3.4 |
| greedy-capacitation | 53.6 → 61.3 | 4.4 → 3.4 |
| random | 55.7 → 60.8 | 6.1 → 6.9 |

Turn rate up by 5–8 rad/s across the board, speed identical by construction, and
stacks moved by at most 1 with **no consistent direction** — two down, two up,
one flat. **Null.**

### Why the volatility hypothesis cannot be tested here

The measured turn rates are 52–74 radians per second. That is eight to twelve
full rotations every second. The bot's heading is not volatile, it is *thrashing*
— `decideMove` sums repulsion vectors that flip sign frame to frame, and the
result is nearly uncorrelated with itself between steps.

So for every policy, "spawn on the player's instantaneous heading" is already
"spawn at a random point 320px away". There is no stable heading to make stale,
and there is no headroom for the jitter arm to add. §9.3's mechanism may be
entirely right about a human and is untestable against this bot.

**This is the finding with the longest reach in the file.** A human player holds a
heading for whole seconds at a time. Against a human, G-020 places antibodies
much closer to where the player will actually be, and **every stack count in
Runs 4 and 5 is a floor rather than an estimate.** The band in §8.4 was
calibrated on bot numbers that understate the mechanic.

### What the mechanism actually appears to be

Chemotaxis drops an attractor that pulls nearby enemies toward a point.
`applyAttractors` does not exempt antibodies, so a player using Chemotaxis is
dragging them onto themselves. It survives controlling for speed (+0.366) and it
is the largest effect measured in either direction.

It also explains the pair the other hypotheses could not.
`membrane+acrosome` and `greedy-capacitation` have nearly identical item speed
(162.3 vs 161.8) and nearly identical turn rate (51.7 vs 53.6), and differ by 68%
in stacks — 7.4 against 4.4. The difference between those two policies is that
one takes Chemotaxis and the other does not.

This is §7.3's flagged unknown arriving: *"a player-placed attractor inside a
field that already attracts is either a genuinely interesting interaction or an
incoherent one, and I do not know which."* The Egg's field is gone, but the
interaction with the antibody is the live version of the same question, and it is
currently invisible to the player — nothing signals that the pull tool collects
the thing that cannot be shot.

## Q2 — why `midpiece+wake` went 69% → 100%

**Not the stacks, and not in the direction §9.3 expected.**

| | edge arm | lead arm |
|---|---|---|
| win rate | 69% | 100% |
| mean stacks at 300s | 0.9 | **2.6** |
| **HP on arrival at boss** | **52%** | **66%** |
| kills at 300s | 440 | 361 |
| enemies alive at 300s | 1498 | 1500 |

Stacks nearly **tripled** rather than halving. The swing is fourteen points of
health on arrival at the boss, and fewer kills getting there.

**The cause is the bot fleeing something harmless.** Antibodies are invulnerable
and deal zero contact damage, but `decideMove` repels from every enemy within
260px with no weighting by how dangerous it is — a 0-damage antibody pushes
exactly as hard as a 14-damage white cell. Under G-020 antibodies appear at 320px
instead of 780px, so there are many more harmless repulsors near the player, and
being pushed around by them incidentally keeps the bot away from the rivals,
spermicide and white cells that actually do damage.

G-020 accidentally handed the bot a defensive screen. A human would learn within
one run that antibodies do not hurt, and would stop avoiding them — or would
avoid them *for the stacks*, which is a different movement pattern entirely.

**INSTRUMENT.** Fourth occurrence in five runs. Not fixed in this pass: correcting
the bot's threat model changes every number in this file and needs its own control
arm, which a diagnostic pass should not spend unilaterally.

## What this does to the existing numbers

Both artefacts point the same way — the bots understate G-020 and flatter the
builds that generate the most antibodies near themselves. That does not overturn
anything already decided:

- `G-019` was scored on a control arm with spawns forced to the edge, where
  antibodies are far away and rare. Unaffected.
- `G-020`'s §8.4 verdict was *working*, and both artefacts suppress the mechanic,
  so the true effect is at least as large as measured. The direction of the
  verdict is safe; the magnitude is not.
- `G-022`'s `membrane+acrosome` at 22% is measured under a bot that gets a free
  defensive screen from the same enemy taxing it. The 22% is more likely
  optimistic than pessimistic, which matters for §9.5's 40% threshold.

## Decisions wanted

1. **Chemotaxis pulling antibodies** — intended, or an exemption? It is the
   largest measured driver of stacks, it is invisible to the player, and it makes
   the act's control item quietly the act's biggest liability. §7.3 flagged this
   interaction as unpredictable and it has now been measured.
2. **§8.4's 4–12 band was calibrated on bot numbers that understate the
   mechanic.** If a human holds a heading for seconds, the same lead distance
   produces materially more stacks. The band may need restating against something
   other than bot medians, or the lead distance re-derived once a human has
   played it.
3. **§9.3's volatility hypothesis is unresolved rather than refuted**, and cannot
   be resolved by this bot. It needs either a bot with heading inertia — which is
   an instrument change with its own control arm — or a human.

---

# 2026-08-01 · Run 4 — after G-019 (pull dropped) and G-020 (antibodies arrive ahead)

## The short version

1. **G-019 holds.** Its falsifier did not fire. Isolated, dropping the pull costs
   nothing: boss HP remaining stays at 0% and 5% for the two short builds, and
   the pull-0 arm reproduces exactly.
2. **G-020 works** by §8.4's corrected criteria — level condition met for four of
   five policies, dispersion 2.8× against a required 2.0×.
3. **§8.5's independence assumption is wrong.** G-020 moves the boss table. Read
   naively, Run 4 fires G-019's falsifier; the falsification belongs to G-020.
4. `random` fell from 94% to 75%, which bears on §8.6 and was not asked for.

## §8.5 said the two changes cannot confound each other. They do.

Run 4 as first measured, both changes live:

| policy | win rate | boss left |
|---|---|---|
| midpiece+wake | 100% [81–100%] | 0% |
| membrane+acrosome | 38% [18–61%] | **22%** |
| motility | 63% [39–82%] | 0% |
| greedy-capacitation | 94% [72–99%] | 0% |
| random | 75% [51–90%] | 0% |

22% is above §8.5's 20% threshold, which as written means "`G-019` is wrong and
the pull was doing work the A/B did not capture."

It is not. A control arm — pull still 0, antibodies forced back to the arena
edge — reproduces the earlier pull-0 numbers **exactly**:

| policy | Run 4 (lead) | control (edge) | pull-0 arm, Run 3 |
|---|---|---|---|
| midpiece+wake | 100% / 0% | 69% / 0% | 69% / 0% |
| membrane+acrosome | 38% / **22%** | 50% / **5%** | 50% / **5%** |
| motility | 63% / 0% | 56% / 0% | 56% / 0% |
| greedy-capacitation | 94% / 0% | 100% / 0% | 100% / 0% |
| random | 75% / 0% | 94% / 0% | 94% / 0% |

**The mechanism.** Antibody stacks are a speed tax. Every build's boss
performance depends on speed — reaching the Egg, holding a working distance,
leaving a ring. Membrane is already a speed cost by design, and membrane+acrosome
now carries the most stacks of any policy (mean 7.4, p90 15). The two compound on
the one build with the least speed to spare, so moving where antibodies arrive
moved the boss table.

Worth carrying: **an enemy that taxes a movement stat is never independent of a
fight decided by movement.** Nothing about the boss changed in this pass and the
boss result still moved.

## `G-019` scored against §8.5

Using the control arm, which is the arm that isolates it.

| prediction | measured | verdict |
|---|---|---|
| Boss HP remaining stays 0–5% for both short builds | 0% and 5% | met |
| **Falsifier:** either short build above 20% | 0% and 5% | did not fire |
| Mean win rate ≈ 74% | 73.8% | met |
| Spread ≈ 50pp | 50pp | met |

The reproduction check passes to the point of identity — the control arm and the
Run 3 pull-0 arm agree on every policy, every boss figure and every win rate.
That is what a deterministic simulation with one changed constant should look
like, and it is the cheapest available evidence that nothing else drifted.

## `G-020` scored against §8.4

Antibody stacks at 300s. The distribution, not the median.

| policy | median | p90 | mean |
|---|---|---|---|
| midpiece+wake | 2 | 4 | 2.6 |
| membrane+acrosome | 8 | 15 | 7.4 |
| motility | 4 | 6 | 4.0 |
| greedy-capacitation | 4 | 7 | 4.4 |
| random | 5 | 11 | 6.1 |

- **Level condition** (median in 4–12): met for four of five. `midpiece+wake` sits
  at 2, below the band.
- **Dispersion condition** (careless ≥ 2× careful): **2.8×**, from 7.4 against
  2.6. Met.

**Verdict: working.** Neither §8.4 failure signature is present — not "absent"
(medians 4–8 across most policies, p90 up to 15) and not "undodgeable" (the
policies separate cleanly).

`midpiece+wake` under the band looks like the mechanic behaving rather than
failing: it is the speed build, it dodges best, and it carries a third of what
the slowest build carries. That is play affecting the outcome, which is the
property §8.4's dispersion condition exists to detect. Whether a build should be
able to opt out this cheaply is a design question, not a measurement one.

§8.4's instruction to report the distribution was load-bearing. On medians alone
`midpiece+wake` reads 2 and `membrane+acrosome` reads 8; the p90s are 4 and 15,
which is where the severity actually lives.

## Not asked for, relevant to §8.6

`random` fell from **94% [72–99%] to 75% [51–90%]** and the build spread widened
from 50pp to 62pp. G-020 made choices matter more, which is the direction §8.6
wanted `random` to move. Not actioned and not a claim — the intervals overlap and
one run does not settle it.

## Decisions wanted

1. **§8.5's independence assumption needs replacing**, and the general form is
   more useful than the specific correction: a change to an enemy that taxes
   movement is not separable from a fight decided by movement. Future
   multi-change passes want a control arm rather than an assumption.
2. **Is `midpiece+wake` at median 2 acceptable?** The speed build can nearly opt
   out of the act's one inevitability. Lead distance is the dial, and shortening
   it raises every policy rather than just that one.
3. **Does the compounding stand?** Membrane pays a speed cost by design and now
   pays it twice — once from the item, once from carrying the most stacks. That
   is defensible as the item's stated trade, and it is also why its boss
   participation more than quadrupled. Cowork's call, not a bug.

---

# 2026-08-01 · Run 3 — after the G-015 pull and the G-018 antibody

## The short version

1. **Both G-015 and G-018 are implemented** and the §7.2 non-negotiable is
   enforced by a test that derives the slowest legal build from the item data.
2. **The evidence G-015 was diagnosed from was an instrument defect.** Two bugs,
   both in Claude Code's work, produced the 97% and 86% boss-HP-remaining that
   motivated the whole decision.
3. **With those fixed, the short builds participate fully with the pull turned
   off.** The pull is not required for the thing it was chosen to fix.
4. **Every §7.6 prediction came true — and came true in the control arm too**,
   so none of them is evidence for the pull.
5. **The antibody prediction failed**, and not in the way its falsifier
   anticipated.
6. **The standing risk has fired.** The fight is now easy rather than fair.

## The two instrument defects — **INSTRUMENT**

Found by probing per-item damage against the boss directly, *before* reporting a
falsification. Both were in Claude Code's code.

**1. The boss was never a valid target for seeking weapons.** `nearestEnemy()`
scanned only the enemy array. With normal spawning stopped during the boss,
`lash` — the weapon every run begins with — frequently had no target and simply
never fired. It only ever damaged the Egg by accident, when a shot aimed at a
rival happened to pass through it. Measured: `lash` at level 5 dealt **0.00 dps**
to the boss at every distance tested.

**2. The bot stood too far away, in every run.** Its boss standoff derived from
the **maximum** reach across owned items. Every run starts holding `lash` at
420px, so the maximum was always 420 and the bot parked at ~294px — outside
`acrosome`'s 246px effective reach against the Egg. An earlier "fix" for exactly
this problem used max instead of min and therefore never moved a short build
closer at all.

Direct measurement once both were fixed, holding station and firing for 30s:

| item | lv | at 175px | at 250px |
|---|---|---|---|
| `acrosome` | 5 | 10.7 dps | 10.7 dps |
| `wake` | 5 | 10.7 dps | 0.0 dps |
| `lash` | 5 | 10.7 dps | 10.7 dps |

`acrosome` and `wake` were never weak against the Egg. They were never in range
of it, because the bot would not go there.

## The A/B — the pull isolated

Both arms have the bug fixes. Only `BOSS_PULL` differs. 16 runs per policy,
seeds 1000–1015, Wilson 95%.

| policy | pull **0** | boss left | pull **55** | boss left |
|---|---|---|---|---|
| midpiece+wake | 69% [44–86%] | 0% | 88% [64–97%] | 0% |
| membrane+acrosome | 50% [28–72%] | 5% | 63% [39–82%] | 0% |
| motility | 56% [33–77%] | 0% | 56% [33–77%] | 0% |
| greedy-capacitation | 100% [81–100%] | 0% | 100% [81–100%] | 0% |
| random | 94% [72–99%] | 0% | 94% [72–99%] | 0% |

**Both short builds participate fully without the pull.** Boss-HP-remaining is
0% and 5% at pull 0 — the participation measure §7.6 called "the one that
matters" is already satisfied by the bug fixes alone.

The pull is worth roughly **+19pp** to midpiece+wake and **+13pp** to
membrane+acrosome. Both differences sit well inside overlapping intervals at
n=16 and are not established.

## Scorecard against §7.6

| prediction | pull 55 | verdict |
|---|---|---|
| Motility falls out of first, to mid-table | 56%, now last of five | met, arguably overshot |
| Both short builds clear 20% | 63% and 88% | met |
| Boss HP remaining under 50% for both short builds | 0% and 0% | met |
| **Falsifier:** Motility near 50% **and** a short build under 10% | 56%, none under 10% | did not fire |

**All three predictions came true. None of them is evidence for G-015**, because
the control arm produces the same outcomes without the pull. The predictions were
written to distinguish "reach was the cause" from "reach was not", and they
cannot distinguish either from "the instrument was broken" — which is what
actually happened.

This is not a criticism of §7.6. The predictions were the right ones to write and
they are why this got caught.

## The antibody (G-018)

Implemented as specified: invulnerable flag rather than large `hp`, contact
damage zero, no XP, stacks capped with diminishing drag.

Median stacks at the 300s mark, by policy: **1, 2, 1, 1, 1.**

Predicted 4–12. §7.6's falsifier says convergence across policies means "the drag
is not dodgeable and the antibody is a timer in an enemy costume." Policies did
converge — but at **one**, which is the opposite reading. The antibody is not an
undodgeable timer; it almost never reaches the player at all.

Making it unkillable did not change that, because being unkillable was never the
obstacle. It drifts at speed 34 against a player at ~190 and the bot avoids
anything within 260px as a matter of course. "The only counterplay is not being
where it is going" turns out to be very cheap counterplay.

This looks like a problem G-018 did not address rather than G-018
overcorrecting. Survivability was not the binding constraint; **arrival** is.

## The standing risk has fired

`greedy-capacitation` 100% [81–100%], `random` 94% [72–99%], and every policy
leaves the boss at 0%. Win rates rose across the board and the table has
flattened near the top rather than near 50%.

Per §7.2, 320 HP was **not** touched. Shape before tuning, and whether the pull
survives changes the damage baseline anyway.

Note that `lash` now working against the boss is itself a large buff to every
build simultaneously — the easiness is at least as attributable to that bug fix
as to the pull.

## Decisions wanted

1. **Does the pull stay?** It was chosen to fix a problem that did not exist. It
   remains defensible on characterisation alone — "the most indifferent thing
   the Egg could do", the fight as an orbit — but that is now the entire
   argument rather than a bonus on top of a mechanical fix. It should be kept on
   purpose or dropped, not inherited.
2. **The antibody needs a lever other than survivability.** It survives fine and
   still never lands. Speed, spawn placement, area denial and pull-toward are
   all shapes that would change arrival; none of them is Claude Code's call.
3. **When the shape is settled, 320 HP moves.** Flagged, not actioned.

---

# 2026-08-01 · Runs 1 and 2 — the first measurements

Kept for context. Superseded by Run 3, which showed the headline finding was an
instrument defect.

**Run 1** could not complete. The simulation was O(areas × enemies); `wake` alone
keeps ~13 areas alive against the 1500-enemy cap, making one 420s run roughly
10⁹ operations. A uniform spatial grid took a run from not terminating to 2.2s.
**INSTRUMENT.**

**Run 2** reported that the two builds §4.4 shapes the act around won 0% and 6%
while `motility` — named as the likely cut — won 50%, and that the two short
builds left 97% and 86% of the boss standing. That motivated §7. Run 3 showed the
participation figures were caused by the two defects above.

Also found and fixed in Run 2, genuine and not instrument: area damage used one
formula for two effects, so `acrosome`'s 0.12s burst delivered 0.72× its listed
damage while `wake`'s 2.4s trail delivered 14.4×. Bursts now apply once, fields
tick.

`motility` winning Run 2 is now explained: it is the only weapon that fires
without needing a target, so it was the only one unaffected by defect 1.
