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
