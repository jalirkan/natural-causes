# Audit — 2026-08-01

*"Run" below means one act. Since D-024 a run is one life of several acts.*

A read of the whole runtime looking for the class of defect that produced the
offer-screen overflow: things that do not throw, do not fail a test, and look
like the game working. Everything below was reproduced before it was written
down; nothing here is a suspicion.

Twelve findings. Nine fixed in this pass, three left open because the fix is a
judgement rather than a correction.

---

## Fixed

### 1. A level-up with nothing to offer froze the game permanently

`rollOffers()` returns `[]` once every item is at max level. `gainXp` assigned
that to `offers`, and **an empty array is truthy** — `step()` opens with
`if (this.offers) return`. The world stopped, the panel rendered a header with
nothing under it, and no key dismissed it. Reproduced: 600 steps advanced the
clock by 0.000s.

Same family as the freeze Justin reported, and worse — that one had a key that
worked once you knew it.

Fixed: `presentOffers()` only sets `offers` to a non-empty roll. A level with
nothing to give is still a level; it is just not a decision.

### 2. Two levels in one frame gave one upgrade

`gainXp` looped, and each iteration overwrote `offers`. White cells drop 12 XP
and the first two levels cost 5 and 14, so two gems collected in the same frame
took the player from level 1 to level 3 and presented **one** choice. The second
was silently discarded.

Fixed: levels queue in `pendingLevels`; `choose()` presents the next one.

### 3. The Egg could spawn outside the arena

`spawnBoss` placed it 420px above the player with no clamp. A player standing in
the top of the field got a boss at negative `y` — the camera is bounded by the
arena and cannot scroll there, and the player cannot walk above `y=0` to bring it
into view. Reproduced: player at `y=60` → boss at `y=-360`, radius 150. The
fight would have been a health bar over an empty screen.

Fixed: the arena bounds moved into the simulation (`ARENA_WIDTH/HEIGHT`, with
`config.ts` re-exporting them) and the boss is held inside them.

### 4. The Egg grew 47% over a fight and its hitbox did not

`setScale(this.bossSprite.scaleX + (telegraph ? 0.0008 : 0))` — added every
telegraph frame, never subtracted. Measured over the 40-second fight the HP was
calibrated to: **459 telegraph frames**, scale 0.781 → 1.148, drawn 300px →
441px. The hitbox stayed at 300. Late in a fight, shots pass through the Egg's
outer third. Frame-rate dependent too: 2.4× the growth on a 144Hz display.

Fixed: a bounded pulse toward `base × 1.06`, returning to base.

### 5. The HUD's slow figure was not the antibodies'

Printed as `${dragStacks} attached (-${slow}%)` where `slow` was the deviation
from base speed — which folds in passive item speed. It lied in both directions:

| build | HUD said | antibodies actually cost |
|---|---|---|
| Membrane lv1, 0 stacks | `0 attached (-8%)` | 0% |
| Membrane lv3, 0 stacks | `0 attached (-22%)` | 0% |
| Midpiece lv3, 20 stacks | `20 attached` (suppressed) | 13% |

The second row is the bad one: Midpiece pushes total speed back above base, the
`slow > 0` guard suppresses the figure, and a real 13% drag becomes invisible.
§3.3 asks whether a player can tell when it went wrong, and this is the only
instrument they get.

Fixed: reports `1 - antibodyDrag`, which is the antibodies' own cost.

### 6. A boss shot was skipped on any frame the player touched an enemy

`resolveContact` did `this.hurt(...); return;`, and the hostile-projectile pass
is below that. Reproduced: overlapping a rival and a boss shot in the same
frame left the shot alive. It should be consumed — the i-frames just set stop it
doing damage, but it has to be spent.

Fixed: `break` rather than `return`.

### 7. `reapDead()` ran once per damage area instead of once per frame

Inside the `updateAreas` loop, so O(areas × enemies) — the exact cost the spatial
grid was added to remove. Wake alone keeps ~13 areas alive against a 1500-enemy
cap. Hoisted; results are unchanged, because `updateAreas` already skips
`hp <= 0`.

### 8. The pause overlay named a key that does nothing

Mine, written earlier today: "R restarts the run". `R` is gated on
`dead || won`, so from a pause it does nothing. Removed.

### 9. The playtest report broke its own column alignment

`seconds` accumulates `dt`, so the median of an even sample printed
`357.79999999999995`. Formatted to one decimal.

---

## Open — these need a decision, not a correction

### 10. ~~Dying during the win animation reports a loss~~ — FIXED as G-033, 2026-08-01

Killing the Egg sets `phase = 'absorbing'` for 1.8 seconds. The world keeps
running: enemies still move and still deal damage. Reproduced — the Egg at 0 HP,
the player killed during the absorb, and the run ends `outcome: "died"`, overlay
`you did not make it`.

Ruled as G-033: the outcome latches the moment the Egg reaches zero — the
absorb is presentation, and presentation cannot change what already happened.
The doorstep-death joke was considered and rejected as act seven's joke spent
early by a scoring quirk. Regression test in `audit.test.ts`.

### 11. ~~The bots play a game with no walls~~ — FIXED 2026-08-01, see part two

`ActScene` clamps the player to the arena **after** `step()`. The simulation
itself has no bounds, so the playtest bots — which call `step()` directly —
simulate a player who can walk out of the field forever. That is precisely the
instrument/game divergence `world.ts` exists to prevent, stated in its own header
comment.

Not fixed, because moving the clamp into `movePlayer` changes every measured
number and the tuning is frozen pending §11.5. It should be fixed *before* the
next baseline is taken, not after.

### 12. The Run 7 shape changes moved win rates substantially and were never run

Found while checking whether this audit's fixes disturbed the baselines. They
mostly did not — same 40 seeds, three of five policies bit-identical, two moved
by less than their own intervals:

| policy | before this audit | after |
|---|---|---|
| midpiece+wake | 23% [12–38] | 15% [7–29] |
| membrane+acrosome | 13% [5–26] | 18% [9–32] |
| motility | 33% [20–48] | 33% [20–48] |
| greedy-capacitation | 70% [55–82] | 70% [55–82] |
| random | 57% [42–71] | 57% [42–71] |

But both of those columns are a long way from the last recorded arm D, which is
Run 6's:

| policy | Run 6 arm D | now |
|---|---|---|
| midpiece+wake | 0% | 15% |
| membrane+acrosome | 19% (31% boss left) | 18% |
| motility | 13% | 33% |
| greedy-capacitation | 19% (3%) | 70% |
| random | 31% | 57% |
| median survival | 125–232s | 236–357s |

That gap is **not** this audit. It is G-025's drag curve and §11.4's cadence,
implemented under "implement shapes, then stop" and never measured. The act is
currently much easier than the last number anyone wrote down, and
`greedy-capacitation` at 70% is a policy that mostly wins.

This is a reading, not a proposal. It belongs with whoever owns the tuning.

---

## Checked and clean

Worth recording so the next pass does not re-derive them: no double scene start
(one scene, one field tile, no boot error); all six atlas frames are square, so
`setDisplaySize(n, n)` distorts nothing; `Grid.key` cannot collide inside any
reachable coordinate range; the XP carry-over arithmetic in `gainXp` uses the
old threshold in the right order; `rateAt`/`spawnStreams` handle concurrent
streams correctly; the offer panel measures 537px inside a 1280px viewport at
its worst case.

One cosmetic thing left alone deliberately: pooled enemy sprites only get
`setFlipX` when the enemy chases, so a drifting antibody can inherit a flip from
whatever used that pool slot last frame. It is symmetrical art and nobody will
see it.


---

# Part two — 2026-08-01, playing it rather than reading it

The first pass was a code read. This one drove the game: 24 full runs in the
simulation with every invariant checked each frame, then long sessions through
the real renderer in a browser, then targeted measurements.

**No invariant broke.** Over 24 complete runs nothing produced a NaN, a negative
HP, an item above its max level, a duplicate in an offer, a backwards clock, a
level that went down, or a sprite pool out of step with the array it mirrors.
Six restarts in a row leaked nothing: display objects returned to 9, textures
held at 12, one dev panel and one stylesheet. Every text surface fits the
viewport at its worst realistic values — HUD at `5:59 lv28 2270 killed 1501 on
screen 76 attached (-24% speed)` is 658px inside 1280.

## Fixed

### 13. The bots played a game with no walls — and it was distorting everything

Finding 11 from part one, now measured and closed. `ActScene` clamped the player
to the arena *after* `step()`, so the simulation had no boundary and the bots
could flee forever. Thirty seeds of identical input, with and without the clamp:

| | no walls (the bots) | walls (a person) |
|---|---|---|
| median survival | 92s | 76s |
| median level | 7 | 5 |
| median kills | 174 | 109 |
| time spent against a wall | — | 7% |

The clamp now lives in `step()`, unconditionally and after every path that can
move the player — hanging it off `movePlayer` meant a frame with no input did
not clamp at all.

Re-baselining afterwards moved the **ranking of builds**, not just the
difficulty. Same 40 seeds:

| policy | before walls | after walls |
|---|---|---|
| midpiece+wake | 15% [7–29] | 28% [16–43] |
| membrane+acrosome | 18% [9–32] | **40% [26–55]** |
| motility | 33% [20–48] | **8% [3–20]** |
| greedy-capacitation | 70% [55–82] | 57% [42–71] |
| random | 57% [42–71] | 50% [35–65] |

Motility's collapse is the one that reads as real rather than noise — its
intervals barely overlap, and the mechanism is obvious once stated: it fires
only along the facing, so a cornered player shoots into the wall. Antibody
stacks roughly doubled across the board (random 64 → 113 mean), because a
cornered player cannot dodge.

**Every playtest number recorded before today was taken on the wrong game.**

### 14. The player started in the corner of the arena

Found by the two tests that broke when walls arrived. `World` defaulted `x` and
`y` to `(0, 0)` and only `ActScene` moved the player to the middle, so every bot
run in the project's history began in the top-left corner of a 3200×2200 field.
Invisible while the simulation had no boundary. The world now places the player
itself.

### 15. Dev mode's "no drag" left the antibodies welded on

Zeroing the stacks left sixteen Y-shapes orbiting the player for the rest of the
run. `syncAttached` grew its pool but never hid the surplus — dead code in normal
play, since stacks only rise, and immediately visible the moment a cheat lowered
them.

## Two things that looked like bugs and were not

Recorded because both cost real time and the next person will suspect them too.

- **The spawner is not dropping enemies.** A first measurement said 97–100% of
  the schedule never spawned. The player in that harness had died at 40.7s and
  `step()` early-returns when dead, so 86% of the frames measured nothing. With
  the player kept alive: 0% dropped, all four enemies arriving on schedule.
- **The 1500-enemy cap is not reached in real play.** Peak across thirty seeds
  is 123 median, 325 maximum. A god-mode session did pile up 1500, but that
  requires surviving four minutes on a level-3 build, which is only possible
  with god mode on.
- **Seeking weapons do target the Egg.** The fallback only fires when no enemy
  is in range, which looked like it would never happen with a crowded field —
  but measured damage standing 200px from the Egg is identical with the crowd
  present and with the field cleared (51.3 either way), because shots pass
  through the boss hitbox on their way to whatever they were aimed at.
