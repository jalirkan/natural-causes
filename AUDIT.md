# Audit — 2026-08-01

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

### 10. Dying during the win animation reports a loss

Killing the Egg sets `phase = 'absorbing'` for 1.8 seconds. The world keeps
running: enemies still move and still deal damage. Reproduced — the Egg at 0 HP,
the player killed during the absorb, and the run ends `outcome: "died"`, overlay
`you did not make it`.

Not fixed because the fix is a design choice and this act's ending is loaded.
Three options: the win latches the moment the Egg reaches 0; the player becomes
invulnerable during the absorb; or it stands, and dying on the doorstep is the
joke. The third is defensible and is the only one nobody has argued for.

### 11. The bots play a game with no walls

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
