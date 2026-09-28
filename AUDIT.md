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

---

# Audit, part three — 2026-09-27

`world.ts`, `bots.ts` and `run.ts` after the day that made a run one life and
added levels, evolutions, orbit, chain, knockback, the Egg race and School's
behaviours. Every finding was reproduced first. Regressions: 18–22 are in
`src/sim/__tests__/audit-three.test.ts`, 16 and 17 are in the instrument code.

| # | Defect | Why it looked right | Fix |
|---|---|---|---|
| 16 | Item uptake read only the items held at the end; Tantrum removes Temper | Temper simply looked less popular | count evolution ingredients |
| 17 | `--act=X --life` gated the antibody sections and the 300s mark on X, while the bots measure the life's first act | the sections appeared or vanished plausibly | use the life's first act |
| 18 | The hall monitor's 0.6s stop equalled the i-frames: both expired on one frame and contact ran before movement, so a crossing monitor stopped the player seven times running (100 → 9 HP, 3px moved) | the monitor is meant to stop you | i-frames run from the end of the stop |
| 19 | Grudge's re-hit interval ignored levels and Restlessness | the orbiters still turned and hit | route it through `activeCooldown` |
| 20 | Knockback clamped enemies still out on the spawn ring into the arena, pulling them toward the player; and it could stack homework piles without merging | the burst played and things moved | clamp only what was inside; do not move merging piles |
| 21 | Holding Grudge allocated every step (orbiter objects, string keys, `levelBonus`) | nothing breaks; GC only | pooled orbiters, numeric keys, cached bonuses |
| 22 | Seeking shots targeted antibodies they cannot damage | the shot fired and flew | skip invulnerable targets, as chaining already did |

Checked and clean: every per-act collection resets at a crossing and every
per-life one carries; act-clock and life-clock readers are each correct for
what they measure; every damage path respects the outcome latch; every kill
goes through `reapDead`; evolution with several pending levels, with all items
maxed, and with an echo owed; chain re-hits; substitute shots and the race; the
homework trail ring. Also checked and not a defect: antibody stacks at 300s
reading in the hundreds is survival (every pre-upgrade run died before 300s).

Left, minor: the grid is a frame stale after a knockback or solid push; a
dodgeball meeting a pile head-on can pin against it; Group Chat's "sends sooner"
level lines name no specific bonus.


---

# Part four — 2026-09-27, the life (the cloud session's pass)

A run is one life now (D-024), so this pass read the threshold, the two
clocks, the certificate, the frame-rate paths and the item text against what
the sim does, then drove each suspicion in a scratchpad script. Part three above is
the local session's pass of the same day over the same file; the two were
written without sight of each other and are numbered on from it here. School's three placeholders landed mid-pass and were
read as well. Same rule as before: everything below was reproduced before it
was written down. Numbers are the shipped placeholders; nothing was tuned.

## Fixed

### 23. Weapon fire rates depended on the display's refresh rate

A cooldown was reset to its full value on the frame it expired, so the
overshoot was thrown away and the rate quantised to the frame. One minute
against a target held in range, at 30/60/144Hz: Lash 106/106/108 shots,
Motility 65/67/67, **Wake 300/328/333**. The bots run at 60 and a browser runs
at whatever the monitor does, so a phone at 30 and a desktop at 144 were
playing an 11% different Wake — the divergence `world.ts` exists to prevent.
Fixed: the overshoot carries (`remaining + cooldown`); now 110/110/110,
67/67/67, 334/334/334. The 60Hz bots gain 1.8% Wake areas from this, which is
the quantisation they had, not a tuning.

### 24. A one-shot burst hit twice when a shot landed on the enemy mid-burst

`hitBySerial` was one field per enemy shared by shots and one-shot areas. A
Lash shot landing during Acrosome's 0.12s burst overwrote the burst's serial,
and the burst — still alive for six more frames — hit that enemy again.
Controlled: burst 5 damage, shot 2, total **12** instead of 7; the piercing
case (Motility parked on an enemy, burst interleaved) 22 instead of 9.
Natural: Lash + Acrosome for a minute against one adjacent enemy applied 43
bursts **52 times**. Fixed: areas mark `hitByAreaSerial`, shots keep
`hitBySerial`; the natural run now lands exactly its arithmetic.

## Open — a judgement, not a correction

### 25. ~~Lash aims at what it cannot hit~~ — FIXED by part three's 22 (main), the same line

`nearestEnemy` picks the nearest enemy and the antibody is an enemy, spawned
320px ahead inside Lash's 420. Over a Conception act with the player kept
alive, **37–49% of all Lash shots were aimed at an antibody** (standing still,
circling, holding one heading), 50–66% in minutes four and five, and in the
boss phase 9–22 shots went to a drifting antibody instead of the Egg. In
School, 40% go to homework and 6% to dodgeballs. G-018 says you cannot shoot a
document; nothing says the starting weapon should keep trying. One line in
`nearestEnemy` — `if (e.def.invulnerable) continue;` — fixes the antibody
half and moves every baseline in the record; whether homework is a target is a
roster question.

### 26. ~~Capacitation restarts below baseline at the crossing~~ — BY DESIGN, 2026-09-28: the ramp is on the act clock (the card says so, "a function of the act clock"), and Late Bloomer's blurb now reads "of every act"

`damageDealt` ramps on `actTime`, so the crossing sets it back to
`damageMultiplier`. Reproduced: level 1 goes ×1.85 → ×0.70 on the first frame
of School, level 3 ×6.33 → ×0.34, **level 5 ×21.7 → ×0.17 (÷129)**, and each
takes 79s of School to reach ×1 — a build that has no Capacitation is ×1
throughout. D-024's commit made the ramp per act by substituting the clock and
said so in one clause; the item text says "act clock" and also "a bet that the
run reaches the point where it pays". Either it is the late bloomer of every
act, or the ramp reads the life. CONCEPTION-ROSTER §4 owns this.

### 27. Wake's text and Wake's field disagree about standing still

`tradesAway`: "a cornered player is holding a weapon that has stopped
existing." The area is placed at the player every 0.18s and lives 2.4s, so a
stationary player stacks twelve of them under their feet. Against a rival in
contact: **142 dps standing still, 14.6 dps moving** (9.8×); a rival dies in
0.02s; the Egg falls in 3.3s to level-1 Wake alone from a standstill at its
edge. A cornered player holds the strongest weapon in the act. Consistent with
part two, where walls raised midpiece+wake 15% → 28%. Options, one each: place
the area behind the player; skip it when input is zero; rewrite the text.

### 28. Chemotaxis drags the arena's furniture

`applyAttractors` pulls whatever the grid finds, including the three enemies
SCHOOL-ROSTER §3 says belong to the arena. Reproduced with one 3.2s pull: a
homework pile 200px away arrives at the player and shoves them 45px; two piles
pulled to the same point end **1px apart, overlapping and unmerged** (merging
is on arrival only); a hall monitor's patrol line moves 26px and stays moved
for the rest of the act; a dodgeball slides 9px/s sideways off its heading.
Whether the room's shape should be the player's to move is a design call. If
not: `if (World.belongsToArena(e.def)) continue;` in the pull loop.

### 29. The ending waits on a level-up

Gems collected during the Egg's 1.8s absorb still level the player and present
an offer, and `step()` freezes on offers, so the absorb pauses behind three
cards. Reproduced on a one-act life: `boss.timer` held at 1.783 for 300 steps
until a choice was made, then "natural causes". Harmless in a two-act life
(the pick is School's); on the last act it is a decision in a run already
over. Not gated in `presentOffers` because `beginAct` relies on that path.

## Two things that looked like bugs and were not

- **Skip-to-boss moves the act clock backwards in School.** The brief described
  it as `time = durationSeconds`, which in act two would do exactly that. The
  panel already advances by `durationSeconds - actTime` (commit 20726ac):
  School at 40s → `actTime` 300, the Egg spawns, the certificate would name
  the Gym Teacher. The `time` setter's absolute form is reachable only from
  code, and nothing shipped calls it that way.
- **An unarmed, stationary School run ends with one homework pile out of 75.**
  It looked like piles being culled or killed. It is the trail placeholder:
  a player who never moves has their trail under their feet, so 74 piles land
  on the first and merge into one of radius 260 and 1050 hp, shoving the
  player 276px as it grows — which `TRAIL_SECONDS`'s label anticipates ("too
  short and the pile lands on the player"). Circling, 63 of 75 stand. At a
  wall the pile lands inside the player and stays there until one frame of
  input, since the tie-break pushes toward +x.

## Checked and clean

The certificate is written once: a death and the Egg's zero in the same frame
record a death (the Egg had not reached zero when the player did); a white
cell parked on the player through the whole absorb writes nothing (0 writes,
`actIndex` 1); age holds at `to` through the boss phase and the win's
`age.to` equals the getter. The crossing: 60 XP on the ground tips three
levels and presents three choices with the world frozen at `actTime` 0 and no
boss; i-frames, cooldowns, stun, drag and engulf reset; facing, kills, items
and level cross; serials never repeat, so the stale `bossHitSerial` is inert.
Frame rate elsewhere: 14 boss volleys in 40s at every rate, engulf 419.5/419.8/
419.9, School spawns 841/843/843, contact hits 48/50/50 (the i-frame's own
quantisation, 4% at 30Hz, left). The cull exemption against the cap: an
unarmed 420s School peaks at 385 enemies of 1500. `maxEnemyRadius` is rebuilt
every step and the grid's padding covers a 260px pile. The three placeholders
do what their labels say: the substitute fires 0.82s after coming into range
and names itself on the certificate; the monitor's touch is 13 damage, i-frames
and a 0.4s stop, re-landed every 0.6s if you stand in it; the trail lands
484–488px behind at 30/60/144Hz against 475 expected. Read-only note for the
instrument: `decideMove` never reads `w.projectiles`, so the bots dodge rings
and walk through every aimed shot, the Egg's and the substitute's.

## Part four's open items, decided — 2026-09-27

*Numbers here follow origin/main's part four (23–29), where this file's 16–22 are 23–29; 30 is new.* 26 (Capacitation at the crossing) stays open. Regressions: `describe('part four, fixed')` in `src/sim/__tests__/audit.test.ts`; each was run against the unfixed line and failed.

| # | Decision | Fix | Measured |
|---|---|---|---|
| 27 | The card is right; the sim follows it. Nearest of the three options: "skip it when input is zero", keyed on distance moved rather than input, so pressing into a wall counts as still | a trail area does not drop within `WAKE_MIN_SPACING` (PLACEHOLDER, half a player radius) of the last drop; a skip retries in 0.1s | level 1 still 157 → 0.5 dps, circling 15.6 unchanged; areas a minute moving 334 (L1) and 758 (L8) unchanged at 30/60/144Hz. Part three's 16 now circles to count Wake |
| 28 | The pull moves the crowd, not the room | `applyAttractors` skips `merge`, `patrol` and `static` defs. Narrower than `belongsToArena`: the dodgeball still bends, having a heading | pile and patrol line unmoved under a 1s pull; a clique still arrives |
| 29 | No offer while the outcome is latched; the level counts | `presentOffers` returns while `outcomeDecided`; `beginAct` settles XP after the boss is cleared, so an owed level is offered at the crossing; an offer opened earlier in the step the latch lands goes back in the queue | one-act life: won in 1.8s, level +1, no card. The crossing already offered queued levels; only the latch was missing |
| 30 | From PLAYTEST-FINDINGS' newest entry: 12 of 31 "someone else" deaths came 0.02s after the Egg appeared, a crowd of 60+ already inside its corona | `spawnBoss` sets every racer inside the corona outside it on its own bearing (0 on the boss point), 1–2 `RACE_PARTING_SECONDS` (PLACEHOLDER, 1) of its swim out in the same radial order | same 84 lives (`--runs=12 --life`), 30 alone toggled: 9 of 21 at 0.02s before, 0 of 20 after; min 0.40s, median 1.58s |

"Just outside" by a pixel would have moved the death to 0.03s; the band is what makes the Egg visible before the certificate. Both placeholders are labelled in `world.ts` under Conception's `provisional` classes; `acts.ts` was not edited in this pass, so its sentence does not yet name them.


---

# Part five — 2026-09-28, the third act

Adolescence read against ADOLESCENCE-ROSTER §3–§4 at `fe9a1ad` (the Egg's
inheritance, Growth Spurt and Snooze in), every suspicion driven in a
scratchpad script before it was written down. Bot figures are Adolescence
alone, `runOnce` over the seven policies × seeds 1000–1005 (42 runs) unless
said; "death off" means health refilled each step so the bot reaches Prom.
Numbers are the shipped placeholders; nothing was tuned. Regressions:
`src/sim/__tests__/audit-five.test.ts`, all four failing today. The patches
are below, not applied: with all four applied to a copy of the tree, 532
tests pass and `tsc -b` is clean.

## Fixed — patch in the entry

| # | Defect | Why it looked right | Fix |
|---|---|---|---|
| 31 | **Acne lands past the wall the player faces.** `spawnAt: 'lead'` is `ANTIBODY_LEAD` along the facing, unclamped, and acne is static and never culled: 107 of 988 spawns (11%) landed off the arena, 91 out of reach for good | The antibody shares the line and drifts back in; the "culls nothing" test counts an off-field spot as still there at Prom | Clamp a static lead spawn inside the arena. With it: 0 of 1030 off; 16 (1.6%) land on a player pressed into a wall and attach at once — the heading was the wall; median stacks 7 → 8 |
| 32 | **The starting weapon cannot reach Prom past acne.** `nearestEnemies` counts acne, which cannot be hurt and never leaves; the ball is only a target when no enemy is in range. One spot 120px from a player on the floor: 37 Lash shots at it, 0 at the ball, Prom 0 damage in 20s (72 without it). Death off (28 runs; the life, 21), Prom arrives on 31–52 acne; of 945 seeking picks during Prom 816 were acne, in the life 212 of 212, and the ball was eligible in 0 of 554 volleys | Lash fires on cadence and the manicules fly; bots win Prom on other weapons and on shots that happen to cross the ball. §4 says the floor sits in Reflex's reach "so the starting weapon works from its edge" | Skip what is invulnerable and static. Narrow on purpose: 18's own line (`e.def.invulnerable`) also frees the antibody's share and moves Conception — with it, `report.test.ts`'s greedy-capacitation seed 1001 dies in Conception instead of crossing. That half stays with 18 |
| 33 | **A knockback moves the room.** 28 took piles and patrol lines out of Chemotaxis's pull; Tantrum's push is the other door. One burst moved a car's road 61px, a hall monitor's line 69px, a homework pile 70px, each for the rest of the act | The burst scatters the crowd, which is Tantrum's card | `knockBack` returns for `merge` and `patrol`, 28's rule. Not `static`: `upgrades.test`'s Tantrum dummy is a static rival, and the only other static is acne, which is invulnerable and never reaches it |
| 34 | **Prom is drawn off its hitbox.** `boss-prom.svg` hangs the ball on a chain (centre 62.5%, radius 37%); drawn centred at `BOSS_RADIUS * 2`, the packed ball sits 36px below the sim's and 113px across a 150px hitbox. Shots stop about 75px above its drawn top and 35–45px beside it; racers vanish about 50px out. The floor the HUD names ("get on the floor") is not drawn at all | `setDisplaySize(BOSS_RADIUS * 2)` is right for the Egg, which fills its frame (0.997 wide) | Declare the body in `act-visuals.ts` and anchor on it (below). Drawing the floor — a ring at `floorRadius` beside `bossSprite`, destroyed with it — is an art-law call (law 3, law 10) and the session's |

```ts
// 31 — world.ts, spawnEnemy, the 'lead' branch, after the two assignments:
      // What stays where it lands is held inside the arena (AUDIT 31).
      if (def.movement === 'static') {
        x = clamp(x, def.radius, ARENA_WIDTH - def.radius);
        y = clamp(y, def.radius, ARENA_HEIGHT - def.radius);
      }
// 32 — world.ts, nearestEnemies, the first line of the inner loop becomes:
        // Not acne, which cannot be hurt and never leaves (AUDIT 32).
        if (out.includes(e) || (e.def.invulnerable && e.def.movement === 'static')) continue;
// 33 — world.ts, knockBack, first line:
    // The crowd, not the room (AUDIT 33; 28's rule for the pull).
    if (e.def.merge === true || e.def.patrol === true) return;
// 34 — act-visuals.ts, ActVisuals, after bossFrame:
  /** The boss's round body in its frame, as fractions of it (AUDIT 34). Absent: centred, filling it. */
  bossBody?: { cy: number; r: number };
//      and in ACT_VISUALS.adolescence, after bossFrame:
    // boss-prom.svg: the ball hangs on its chain, <circle cy="62.5" r="37">.
    bossBody: { cy: 0.625, r: 0.37 },
//      ActScene.syncBoss, replacing setDisplaySize(BOSS_RADIUS * 2, BOSS_RADIUS * 2):
      const body = this.visuals.bossBody ?? { cy: 0.5, r: 0.5 };
      this.bossSprite.setOrigin(0.5, body.cy).setDisplaySize(BOSS_RADIUS / body.r, BOSS_RADIUS / body.r);
```

## Open — a judgement, not a correction

| # | Finding | Measured | Options |
|---|---|---|---|
| 35 | **A hormone's hit is its arrival.** "Hormones kill 67 of 84" (PLAYTEST-FINDINGS) reads as a crowd. The chase at 58 never catches a mover at 190; what hurts is a hormone landing inside the player's reach on the step it spawns, drawn (48px, depth 5) under the player's sprite (56px, depth 10) on the frame it hits | 1171 hormone hurts: the youngest hormone touching was 0.02s old at the median (its first step), under 0.25s in 95%. At those hurts the bot had walked 474px of path in 2.5s and stood 19px from where it had been: it circles back over its own trail. Probes: standing still, a hit every i-frame (99/min); circling at r=300, none; back and forth every second, 77, one on arrival | (a) an arrival inside reach lands at its edge, seen, then chases; (b) no contact for a telegraph's length after arriving; (c) §3.1's "standing where it arrives" means this, and it stays. Ask: "did a hormone ever hit you that you did not see arrive?" |
| 36 | **Prom's light has 32 fixed lanes, not a sweep.** Each ring is turned half a spacing from the last (§4's number; `prom.test.ts` (d) pins it), so ring n+2 retraces ring n. §4's prose: "so the spots sweep the room" | 21 rings a minute leave on 32 bearings, ever. Standing still on the floor 300–350px out, between lanes: 0 spots in a minute; on a lane, 10–11. At 200–265px the lanes overlap and nothing is safe | (a) turn a third of a spacing: 48 lanes, and the safest still spot on the floor takes 6 spots a minute; (b) an irrational fraction, never repeating; (c) keep half and cut "sweep" |

**Taken the same day:** 35 as (a) — an arrival inside reach lands at its edge and is seen before it hurts; regression 35 in `audit-five.test.ts`. 36 as (a) — a third of a spacing, 48 lanes; `prom.test.ts` pins it and §4 says so.

## Checked and clean

**The crossing School → Adolescence**, driven through a three-act life with
state planted on both sides: `actTime` 0, age 13 (the card and the HUD both
read `act.age.from`), no enemy, shot, area or ring; stun, engulf, `engulfBy`,
drag, `raceAbsorbed` and `trailDrops` zero or empty; no boss; offers only if
owed. The trail is deliberately not reset: the player's position is
continuous across the threshold, and the first hormone lands 357px behind at
0.83s. The ancestor log is written once (`endedAt` latches). Drag is zeroed at
every crossing (Adolescence is last, so an acne stack has none to come off
at yet), and `crossThreshold` rebuilds the attach pool from `attachFrame`,
so the stack is drawn as acne. **The group chat** moves 3.5s of every 4.3s (consult, then
cooldown, then the walk), fired from under 30px in none of 589 bot shots (5th
percentile 168px); owned shots thin no racer. **The standardised test**
engulfs one at a time (the timer is single, renewed on expiry); at the drag
floor the player walks out at 43.3 against 18 in 2.4s for 24 health, the same
with one, two or three tests; the bots' longest continuous engulf is 1.2s;
`engulfBy` clears. Snooze keeps the order (21.6 against 9 inside, 18 outside).
**Driver's ed** never stops: no path writes its velocity but the patrol
reversal, knockback moves position, Snooze halves the step (2px of 4) and it
still reverses. **The test and the car kill nobody** because of presence,
not a defect: 27 of 28 bots die, at a median 135s, before the first car (144s); with
death off, 71 of 84 cars are shot within a median 3.1s of spawning, closest
approach median 125px, 4 hurts; 80 of 140 tests die, closest approach median
241px. **Prom**: the floor is read off the sim's position, centre to centre
as documented, so Growth Spurt does not widen it; no ring fires in the absorb
(40 absorbs entered at every point of the machine); `rings` and
`raceAbsorbed` start at zero for each boss and each act. **Growth Spurt and
Snooze**: every player-contact path reads `playerRadius` (enemies, hostile
shots, rings, piles, gems); a hostile shot at 32.5px hits a grown 23.5px
player; nothing in either boss's shield reads a radius. A shot through a
field is held, not shortened, and still hits: a player's at 1.30s against
0.65s, a notification at 1.60s against 1.07s. **Frame rate**, 30/60/144Hz:
every Adolescence spawn count identical over 200s; group chat 28 shots in
120s; Prom 21 rings a minute. **The shared id** `group-chat` (enemy and
Gossip): the renderer tests `hostile` before `source` and the tallies key on
`owner`, so neither is drawn or counted as the other.

## Left, minor

- **A car's reversal drops its overshoot**, like the hall monitor's: same
  line and speed at every rate, but after 96s the car is 43px further along
  it at 144Hz than at 30 and 60Hz.
  *Fixed 2026-09-28:* the reversal reflects the overshoot (patrol and bounce); the car ends within 2px at 30, 60 and 144Hz (`audit.test.ts`, part five, minor).
- **The bots' sidestep cancels between two ring spots** (inside ~175px of the
  ball the two neighbours both threaten and their pushes sum to ≤0.39,
  outward along the spots): 133 steps over 42 fights with death off, no hit in
  any of them; 7 spot hits in ~256s of Prom overall.
  *Fixed 2026-09-28:* between two shot paths, inside the nearer one's reach, with a gap that fits a player, the sidestep takes the nearer path's push alone (`intoTheGap` in bots.ts); where no gap fits it is unchanged. It reads paths, not who fired them, so the Egg's fan and the memo column get the same rule (4 of 480 replayed runs change). Hits did not fall: the bot decides every 0.2s at full speed and walks through a gap a few px wide, and a single spot's sidestep still cancels the orbit — the instrument's cadence, not the design (`ring-spots.test.ts`).
- **The trail is off screen going vertically**: 484–488px behind at base
  speed (part three) against a 360px half-height; §3.1 says "on screen".
  `TRAIL_SECONDS`'s label covers it.
- **The car is never flipped or turned**: `setFlipX` is for chasers, so a car
  driving left, up or down is drawn side-on facing right.

# Part six — 2026-09-28, the fourth act and the evolutions, as the builders flagged them

Not a read: the agents that built College (COLLEGE-ROSTER), The Loan, the
evolutions (G-046) and the College wiring each reported what looked like the
game working but might not, and this part collects those before anyone
plays. All at `5552874`. None is fixed here; each says who it waits on.

| # | What | Why it looks right | Status |
|---|---|---|---|
| 37 | **The Loan spawns mostly off screen.** Every boss is placed 420px above the player and the view shows 360; the Loan's anchor is at 0.73 of its frame, so the machine sits behind the HUD band and the tape — its shape, and the part that jerks on the tick — is off the top | The bar fills, the pull works, the bots walk up | **Fixed** (round 14): the camera pans to the boss on its entrance and back (`bossEntrance` in ActScene); the placement stays the sim's |
| 38 | **Persisting stacks draw as the next act's frame.** Tuition stays on through the crossing (§3.3) and the scene rebuilds worn stacks from the new act's `attachFrame`, falling back to the antibody | Nothing after College exists yet | **Fixed** with The Office: a stack draws in the frame of the act that attached it (`wornBy`); tuition's invoices stay envelopes among the pings |
| 39 | **The smoke never sees College's drawings.** It skips to the boss and kills it; tuition, HOLD, the deadline's heading, the group project and the jerk were checked once by hand in Chromium | The smoke passes | **Fixed**: the `college-play` milestone waits for a tuition sprite and a HOLD before the skip to The Loan |
| 40 | **The Loan's placeholders imply a floor of invoices.** A statement every 2.8s drops three static, undamageable envelopes: about 64 on the floor in a 60s fight, and with no damage it forecloses in about 95s | The fight ends either way | A reaction question (11), not a number to move |
| 41 | **`bossHpFraction` reads backwards for The Loan** in the bots' report: its bar opens a third full and fills | Shield section excludes it (`bossHasShield`) | **Fixed**: the report's column reads `balance` for The Loan's runs and footnotes it |
| 42 | **The dev panel's "no drag" zeroes the drag stacks but not the tax,** so the HUD can read `xp −8%` alone; its "level up" gem is sized before tax | Dev only | **Fixed**: "no drag" sheds every worn stack — drag, tax, cadence and the `wornBy` map (`shedWornStacks`) |
| 43 | **Judgement draws the world's dice.** The first weapon to, so holding it moves later spawns and rolls for that seed; Hindsight and the group project's quadrant too | Bots and browser still agree; determinism per seed holds | By design; a per-weapon stream if it ever matters |

# Part seven — 2026-09-28, the fifth act and the papers, as the builders flagged them

Not a read: the agents that built The Office (OFFICE-ROSTER, G-048), The
Reorg, its drawings, the crossing papers (G-049) and the Office wiring each
reported what looked like the game working but might not. Collected before
anyone plays, at the round's integration branch. Each says what was done or
who it waits on.

| # | What | Why it looks right | Status |
|---|---|---|---|
| 44 | **The Office's first arrivals are review, meeting, commute.** A stream opening at t with rate r first delivers at t + 1/r, so the roster's "first meeting at 40s" is when its stream opens; the builder read the first review at 80.00s, the first meeting one frame later and the first commute near 104s | The order test passes: it checks when streams open | Open, documentation: §3.6 speaks of openings; the act as met is review first. Placeholder schedule either way |
| 45 | **A reply-all's children keep the parent's full XP** (8 XP over 7 kills), and at the 1500-enemy cap a child that does not fit drops no gem, so that XP is lost | Splitting draws no dice; two tests pin it | By design at placeholder values (`split`); noted |
| 46 | **The memo column left no gap.** A shot hits within 26px of its centre, so `memoSpacing` 36 was a wall; the Reorg's builder read it and the value went to 64 before the merge | The column arrives; the bots sidestep it | Fixed at data. A placeholder, labelled in the act's `provisional` |
| 47 | **A restructure against a wall shoves less.** The player's sideways move is `clampPlayer`ed, so at an edge it shortens or vanishes; the meeting still closes and the i-frames still apply | Nothing throws; the chart still moves | Open, a judgement: at a wall the joke is the meeting, not the shove |
| 48 | **One blow crossing two thresholds restructures twice**, on this step and the next, so a very large hit moves everything twice a frame apart | Each threshold restructures exactly once; `restructures` counts it | By design: a threshold is one restructure; two in two frames reads as one |
| 49 | **The meeting walls the crowd but not static, cross, patrol or merge behaviours**, so a commute runs through a ring the reply-alls cannot leave | Nothing else in the act has those behaviours today | By design (a carriage does not attend); noted at `updateHolds` |
| 50 | **The Loan's opening balance counts `dragStacks`, not tuition's `taxStacks`.** College's only attach is tuition, so the two agree; a drag-only stack persisting from an earlier act (none does) would inflate it | `loan.test` sets `dragStacks` directly and passes | Open, cosmetic; move to `taxStacks` if an earlier act ever persists a stack |
| 51 | **The inheritance is named twice at the first crossing**: the birth certificate's INHERITED line, then School's card (G-042) | Both read the same registry | By design: the paper lifts on any key, so the card stays the guaranteed naming; the paper records, the card announces |
| 52 | **The last act's paper is never seen.** A crossing shows the finished act's paper and the life's last act ends on the death certificate, so The Office's review (OFFICE-ROSTER §6) has nowhere to show until Family exists or the certificate path shows it first | The diploma shows, now an act follows College | **Settled by Family**: the review shows at its crossing (the smoke latches PERFORMANCE REVIEW); Family's statement now has nowhere to show until Decline, the same shape |
| 53 | **The Reorg can restructure off screen.** It relocates at least 300px from the player and the entrance pan (37) runs at spawn only, so after a restructure the memo column can arrive from nowhere | The sprite follows `boss.x/y`; the squash plays | Open, a judgement: a second pan under fire pulls the view off the player as the memo arrives; the memo from nowhere may be the joke. The smoke's `office-reorg` prints where the chart landed: off screen in 3 of 4 runs (1054–2117px), in view once. Re-owe the look if a person says they lost it |
| 54 | **The smoke never restructures the Reorg** and never sees a ping worn, MEETS in flight or the commute: the dev kill skips the thresholds. Each was checked once by hand in Chromium | The smoke passes to Age 34 | **Fixed**: `office-play` (a ping worn, MEETS drawn, a commute seen) and `office-reorg` (the panel's −50%, then the restructure drawn: count, grey rows, the chart moved) before the kill |
| 55 | **The chart's grey rows are a render tint**, the shadow tone at two thirds over a crop of the chart's own frame, which G-032 retired for sprites; the drawer's row cuts (y 132/236/340 of 384) place the crops | It greys the right rows, bottom up; the empty top box never greys | **Fixed** 2026-09-28 (D-029, S): three drawn frames, one row greyed per restructure and every row on the absorb (`bossFrameFor`), swapped on the sprite; the tint and its row cuts are deleted. The rows' faces are bone (130) |
| 56 | **Sixteen worn sprites at most.** The bots wear 12–20 by The Reorg, so late pings stop appearing while the HUD count stays right; tuition, worn first, always shows | The cap predates the act | Open, cosmetic; the HUD is the truth |
| 57 | **The smoke's budget margin shrinks with every act**: 61s locally against 240s, about 180s at CI's speed | It passes | **Fixed**: 420s, from GitHub's own timings (153s and 88s for the same milestones on two runners; the Office's milestones add 8–12%; 2.5× the slowest). The 60s per-milestone limit still catches a hang |

# Part eight — 2026-09-28, the sixth act, as the builders flagged it

Not a read: the agents that built Family's data and verbs (FAMILY-ROSTER,
G-050), its eight drawings, the Office's sounds, the smoke's Office
milestones and the Prom sidestep each reported what looked like the game
working but might not. Collected before anyone plays, at the round's
integration branch; the Mortgage's and the wiring's flags follow when they
land. Each says what was done or who it waits on.

| # | What | Why it looks right | Status |
|---|---|---|---|
| 58 | **No room landed in the act.** The room stream was transcribed at 100s and 0.02, which first fills at 150s — the Mortgage's own arrival, when spawning stops — so §3.6's "the house starts growing before the Mortgage arrives" had no mechanism | The order test passed: it checks openings (44's class) | **Fixed** at data: 90s and 0.05, the first room at 110s; `family-act.test.ts` pins that one lands. A still player's second room merges into the first |
| 59 | **A late fee is worth full XP.** A fee is the same def as its bill, so a bill left alone to accrue yields three bills' XP: the neglect §3.1 punishes is rewarded on the way out | Presence only; the same shape as 45 | Open, a judgement: a fee at 0 XP, or at the bill's, once a person says which is funnier |
| 60 | **The HOA letter's cost is looked up by id.** `pickupFactor` reads each id in `wornBy` and takes the registry's `pickup`, so a hand-built def reusing the id gets the registry's value | Only the registry's def exists | Open, cosmetic; the pause sheet's pickup line reads the same factor |
| 61 | **The toddler's multiplier applies when a cooldown is set,** as the ping's does: a shot fired just before the hold keeps its cooldown, one fired late in the hold carries ×1.4 past the release, and a second toddler takes the hand the moment the first lets go | Consistent with the ping | By design; a person will say whether a chained hold reads as one |
| 62 | **The phone's pull is instant and passes through everything** — rooms, piles, a meeting's wall; a room the player lands in pushes them out on the next step, possibly out the far side. Skipped under i-frames and for a call that killed | The sim never leaves the player inside a solid | Open, a judgement: a pull that stops at the first wall if a person says the teleport reads wrong |
| 63 | **The bots ignored toddlers and letters** — the threat weight is damage, and both deal none | The act runs headless | Being fixed this round (a coy weight and steering in bots.ts, presence only) |
| 64 | **Dev god mode ends a toddler's hold**: it zeroes `engulfTimer`, and release fires on that, so the toddler lets go on the next step | Dev only | Noted; dev cheats stay outside `World` |
| 65 | **The toddler may read as ears.** The bib is a purple disc with a smile and two bone sleeves up in a V; at 44px the sleeves can read as a head's ears before they read as a reach. Law 9's line holds (no body, no skin) | Every CHECK row passes; the drawer compared twenty variants | A reaction question (README 15), not a fix |
| 66 | **The room's walls are hollow and it has a door swing** — a solid square fills its bounding box and no solid square passes the swarm ceiling (0.9987 against 0.82); the spec and the roster now say so | CHECK passes; the record was regenerated from the unchanged SVG | By design; the drawing is the record |
| 67 | **The phone's ink is at the coverage ceiling** (0.3958 of 0.40) and the player's Family frame at 0.21 against the Office's 0.03: ink sits near umber. Any later edit that adds ink to either fails CHECK unless bone is added with it | Both pass today | Noted for the next drawer |
| 68 | **A chair scrape can be swallowed** — the sound has a 300ms floor, so a blow crossing both of the Reorg's thresholds (48) gives one scrape, and a scheduled meeting just before a restructure the same | One sound per frame is the rule | By design; the second restructure is a frame later |
| 69 | **A memo can announce a column that never comes**: a restructure during a telegraph drops that memo in the sim, but the flutter has played | The edge is the telegraph | Open, cosmetic; the next telegraph plays it again |
| 70 | **New holds are heard by object identity**: a hold the sim reused within a frame would go silent; the restructure path counts instead | The sim builds a fresh hold each time | Noted at `edges.ts` |
| 71 | **The smoke's restructure is proven drawn, not visible**: the chart lands off screen in 3 of 4 runs (53); the `−50%` button writes hp directly, so a weapon hit crossing a threshold is not exercised; and a sighting latches across polls, so a milestone's screenshot may not show what it saw | Every assertion is on the scene's own state | By design of the instrument; 53 stays a judgement |
| 72 | **The probe reads private scene fields**, and two of them fail silently if renamed (`bossEntranceOwed`, `bossEntrance`: the pan wait passes at once); the rest fail loudly | Named in `tools/smoke/run.ts` | Noted; rename with the smoke open |
| 73 | **`paid` is read off the balance by rounding**, so without the refund any window that took more than half an instalment would count as paid; the refund test now covers 0.1, 0.5, 0.9 and 0.999 of an instalment | The test failed against the unrefunded code once it was written right | By design; anyone editing `closeWindow` reads this first |
| 74 | **The Mortgage's hp can go up.** A missed window's damage is refunded at its end, and in the last window hp sits at 0 for up to 5s before the door opens | The balance moves in whole instalments, as §4 asks | The renderer is told (a hit flash keyed on hp falling misreads a refund; the last window needs a mark) |
| 75 | **The dev panel's writes skip the gate**: `−50%` counts as six instalments at the window's end, a second one as twelve; a write that is not a whole twelfth snaps at the next window's end, so the bar can jump; `kill` sets `paid` to 12 on the way out | Dev only | Noted; dev cheats stay outside `World`. The row offers `miss window` beside it (2026-09-28): the window's accepted damage is refunded and the window closes unpaid through `closeWindow`, so a miss can be forced without the rounding counting it paid (73) |
| 76 | **Rooms can land inside the house** (the lead is 320px ahead, the boss about 420px away, so a room lands about 100px from its centre) and a merged room grows from the older centre and can overlap the player, who is pushed out by the pile rule | Harmless to the fight: shots pass through invulnerable rooms and rooms never shield the boss | Open, cosmetic: rooms draw over the house late in the fight |
| 77 | **The late fee's door is a measured offset** (`MORTGAGE_DOOR_BELOW`, 60px below the centre, for `bossBody { cy: 0.68, r: 0.30 }`); a different body for the act would move the fee off the drawn door | The renderer uses the same body | Noted at the constant |
| 78 | **The bots' `--spawn=edge` override draws a random angle for the room**, as it does for the Loan's invoices and the Reorg's meeting; normal play and every test draw none | The dice test passes under normal spawning | By design of the instrument |
| 79 | **A weak build may never pay The Mortgage.** In the wiring's hand check a level 1–6 build did about 20 of the 26.7 damage a window needs, missed every window, and was refunded each time: the bar drains three quarters of a cell and pops back, forever, until DUE or the dev panel ends it | The placeholder numbers, exactly as specified; every test passes | **The first number a person's play moves** (README 16). Placeholder, labelled in `provisional`; a floor (a window met at half pays half, or the cap scales with the level) is a design call, not a bot's |
| 80 | **The smoke never sees a hold.** God mode zeroes `engulfTimer` every frame, so a toddler lets go the moment it touches; the smoke proves a toddler is drawn, and the hold was checked by hand only | `family-play` passes | Open: a milestone with god off for the hold, as 54's was for the restructure |
| 81 | **The renderer guesses who is holding**: the sim keeps the holder private, so every engulfing enemy touching the player draws in front, not the one holding | One toddler at a time in practice | **Fixed** 2026-09-28 (E2): `World.heldBy` is the body the sim chose at the touch (null once the window ends or god mode zeroes it), and only it draws in front of the player; a second toddler touching waits its turn under them |
| 82 | **The door can stand ajar mid-fight through the dev panel** (`−50%` twice then a hit: hp 0 with windows unpaid) and **open on a death** (the outcome latches at the window's close, so a player killed while ajar leaves the door open on a lost fight) | In real play hp reaches 0 only in the last window | **Closed** 2026-09-28 (S): the door has one open frame, shown on the absorb alone, so neither an ajar door mid-fight nor an open one on a death can happen; the house sits shut, owing nothing, until the last window closes (147) |
| 83 | **The door overlay covers its ink frame** (the drawer's rectangle includes it), so the open door reads as a hole cut in the wall rather than a framed doorway | PLACEHOLDER, labelled, as the Reorg's grey rows | **Fixed** 2026-09-28 (D-029, S): the open door is a drawn frame, a framed doorway with the leaf on the left jamb; the overlay is deleted |
| 84 | **`reach` on the HUD is also an evolution's name** (Reach, Personal Space's), and its arithmetic (1 − factor) differs from `attention`'s (1 − 1/factor) on purpose: a radius against a cadence | Both print the right number | Open, wording; a person will say if the word confuses |
| 85 | **The bots cannot escape a toddler without fleeing.** It never dies and only leaves after a hold, and at placeholder speeds (player 190px/s, toddler 112 ×1.6 fled) the only escape is the flight the roster calls the wrong answer; under the coy steering every toddler holds the bot | Presence, not a finding; walking at it and round it works only if the bot then walks on, which is moving away | A design question for a person (README 15), not a number to tune |
| 86 | **The bots' shot log never credits a phone hit.** `pullToward` moves the player up to 180px inside the hit step, and `ShotLog.settle` looks for the vanished shot near the player's new position, so health falls to calls and no hit is logged: "phone-call 0/N" in the aimed-shots section, blind control included, is the instrument | The section prints | Open, **INSTRUMENT**: remember the player's position before the step in `ShotLog` (HANDOFF). **Fixed** 2026-09-28 (H2): the log reads a vanished shot against the position before the step too, widened by one step's walk, and never credits a shot whose life ran out; Family reads phone-call 3–6 of 4–16 per policy where it read 0 |
| 87 | **The player starts Family under the HUD in the smoke**: the Office's steering leaves them at the arena's top edge, so the `family` screenshot shows them under "age 34"; the same was true at The Office's end | Smoke only | Noted; cosmetic |
| 88 | **The window clock's empty track is nearly invisible on umber**; only its fill reads | The fill is the information | Open, cosmetic |

# Part nine — 2026-09-28, the seventh act and the act-born items, as the builders flagged them

Not a read: the agents that built Decline's data (DECLINE-ROSTER, G-051),
its drawings and the first act-born items each reported what looked like the
game working but might not. Collected at the round's integration branch; the
hand's, the wiring's and the other items' flags follow when they land.

| # | What | Why it looks right | Status |
|---|---|---|---|
| 89 | **Weapons stop aiming at Time.** Seeking weapons and Judgement stop firing once only Time is left (nothing aims at what it cannot hurt, the builder's call); line shots still fire and are spent on the clock. A player watches their weapons go quiet | Time is invulnerable and the clock decides | A reaction question (README): does the quiet read as the end, or as a fault |
| 90 | **The HUD's health bar hides a lowered maximum**: it draws hp as a share of the current maximum, so a decision's cut looks like a full bar; the pause sheet is honest | `openingMaxHp` and `maxHpFloor` are exposed for it | **Fixed** by the wiring: the track is the opening maximum and the lost part an outlined empty tail (see 123 for what it still hides) |
| 91 | **Decline's first arrivals come later than §3.6's prose** (the stairs near 63s, the weather near 74s, the form at 80s; the prose says 30, 45, 60): streams open at t and first deliver at t + 1/r (44's class) | The order test checks openings | Open, documentation; placeholders either way |
| 92 | **Forms rarely fire at a player who stands still**: they land on the edge ring, 780px away, beyond their 440px range, as the phone and the review do | 1–10 shots seen per four runs | Noted; the same shape as the earlier ranged enemies |
| 93 | **Stairs can land on the player at a wall**: they land at the lead with no check, unlike the Mortgage's room, and can wall a crowd in with the player | The room's placement exists | Open → the hand's builder: place the stairs as the room is placed |
| 94 | **Every bot policy won Decline at full health** in the act-only runs: the medication's heal outpaced the crowd at level 1 with the starting weapon | Presence, not calibration | A person's play moves the numbers |
| 95 | **Time's win path**: the countdown sums sixtieths, so the latch lands within a step of 60s; hp written to 0 alone counts as the clock running out (the dev kill's path); the dev panel's −50% leaves hp at 1, meaningless and harmless | Both ends reach `finishAct` won at 84 | By design; noted at `timePhase`. The panel's row reads Time's clock and offers `−30 s` in place of `−50%` (2026-09-28; 127) |
| 96 | **The drawn hand marks a rest pose only.** The sim's hand is 520px long and 40 wide; the drawn one is about 104px at the body's radius, baked into the sprite. The renderer must draw the hazard as its own rotating shape from the pivot (0.499, 0.472 of the frame) | The drawing passes every check | **Fixed** by the wiring: a teal strip from the cap's edge turned by `boss.hand`; the bone strip over the baked hand is gone with the face frame (121, 2026-09-28) |
| 97 | **A Calendar Block walls nothing that is placed inside it**: spawns are placed, not moved, so a toddler from the trail lands inside a block with the player, and at full size (about 326px) lead spawns land inside too | The meeting's hold has the same shape | By design (the meeting's rule); a person will say if it reads wrong |
| 98 | **A room pile can push an enemy across a block's wall** (`resolveSolids` ignores holds), and **the boss is walled by no hold** (it is not in `enemies`) | As the meeting | Noted |
| 99 | **"Nothing gets in or out"**, and the player walks out and a commute passes through (49) | The joke is the copy's | Open, wording; a person will say |
| 100 | **A mark is invisible.** Nothing draws a marked enemy, so on the field the Highlighter looks like faster deaths and nothing else | The stroke draws; the gate pays | **Fixed** by the wiring: a rose band under a marked enemy, fading over the mark's last half second (see 125 for its contrast) |
| 101 | **The mark gate touches every older weapon's damage** (eight places now call `damageEnemy`; `bossTakes` pays the mark first). Unmarked it multiplies by exactly 1, so no seeded result moved | The suite is unchanged; the racer hit pays marks only under dev cheats | By design; any future path that subtracts hp directly skips the mark, and the per-path test lists only the paths it knows |
| 102 | **Seeded offers shift from College on.** Three items join the pool (the Highlighter at eighteen, the Calendar Block at twenty-two, the Letter at thirty-four), so every seeded run's offers in those acts change, and the bots' distributions there with them | The pool is one longer per act | By design; the findings entry says so |
| 103 | **Only seeking shots mark**: `marks` is read in the seeking branch alone; a line weapon or a chain given `marks` would silently not mark | The type doc says so | Noted |
| 104 | **The letter's cards say "bolt"** — the strike vocabulary prints "+1 bolt" and "3 bolts" for letters as it does for Judgement — and its landing plays Judgement's gavel | The wording and the sound are the mode's | **Fixed** 2026-09-28 (E2) for the wording: an active item may carry `noun` ({one, many}), read by the card's strike vocabulary (`strikeNoun`), and the Letter's is letter/letters. The landing sound is C3's |
| 105 | **The letter's icon is a flat sheet, not a letter's shape**: Family reserves the windowed envelope (the bill) and the sealed, folded letter (the HOA letter), and the icon rides that field, so it is neither | Every CHECK row and `field-colours` pass | By design (law 11); a reaction question whether it reads as post at 36px |
| 106 | **`strikeNearest` exists because Judgement rolls its target from the world's dice** (43) and the letter must draw none; the strike telegraph now reads `AreaState.telegraph` instead of the constant, which was a renderer bug for any strike with its own delay | Judgement's cards and rolls are unchanged | Fixed in passing; worth a look at the link |
| 107 | **A nap covers contact only.** Attaches still attach (the knees included), an engulf's tick and a spermicide ring would still hurt a sleeper, and waking gives no i-frames, so a crowd that walked up hurts on the next step; a hostile shot lands, as the card says | The card says "immune to contact, not shots" | By design; Time's hand goes through `hurt`, so it hits a sleeper — the clock keeps running |
| 108 | **Falling asleep reuses the hall monitor's stun cue** (the thud, the flattened still-wiggle), so a nap sounds like a stop | No scene change was needed | Open, cosmetic: a Zzz if a person asks what happened |
| 109 | **At Time the nap costs nothing**: the clock running out is the win, so a nap in the last fight is free | G-038: the time is the joke, not a tax | By design |
| 110 | **The art-law test now excepts mode `nap`** from "every active item's icon rides the field": the armchair is a card icon and the data says so, rather than a `fieldRiding` flag that would claim a drawing the field never shows | Law 10 would pass either way (rose, bone, ink) | By design; the honest data |
| 111 | **The doorbell is near-constant**: a headless run had 671 bill arrivals in about 200s, so at one ring a second it rings every second from about 45s on | Rate-limited and quiet | A reaction question: charming or grating (README) |
| 112 | **The squeak re-derives who is holding** (the sim keeps it private): the last engulfing enemy within touch, else the nearest; on a real schedule each act has one kind of engulfer, so it cannot be wrong there. Dev god mode silences it (it zeroes `engulfTimer` first), so the smoke never hears one | Tested against the white cell and the test | Noted; `World.heldBy` (81, 2026-09-28) settles it once the squeak reads it |
| 113 | **The phone's call is silent now** (it borrowed the substitute's ah-hem); the ring on the consult is its only sound, and a phone starting a consult on the frame another finishes is missed, as typing is | The edge counts consults | Open, cosmetic |
| 114 | **The hand ignores holds.** On the stairs (0.45 speed) a player keeps ahead of it only within about 160px of the pivot; resting on the stairs beyond about 230px is one hit a turn and more nearer; leaving the disc from near the pivot on stairs takes about 6s. A Calendar Block does not shelter from it either | The hand is the fight and the stairs are the act's refuge from the crowd, not from time | By design; a reaction question whether the stairs read as a trap at Time |
| 115 | **Standing on the pivot is a hit every i-frame window** (about 20 damage a second): nothing blocks the player from walking onto the clock, and the hand's base always touches there; the roster's "a hit every `sweepSeconds`" holds only beyond about 230px | Nothing throws | Open, a judgement: a body that pushes the player off the pivot, if a person walks into it |
| 116 | **A still player piles up the file**: knees land at the last-facing lead and never merge, so standing through Time stacks nineteen knees on one point (the twentieth quarter falls on the step the hands stop), read as one, worn all at once on the first step forward; the act's own knee stream did this before Time | The antibody always has | By design; the file is the file |
| 117 | **The act's knee stream still lands unchecked** at the lead: only Time's knees and the stairs turn behind the player at a wall | As every act's accumulator | Noted |
| 118 | **`TIME_FILE_ID` lives in world.ts**, not on `TimeBoss` as the Mortgage's `roomId` does (the builder was kept out of the interface); a test pins the id to a Decline enemy | One registry still names it | Open, cosmetic: a `fileId` on `TimeBoss` when the interface is next touched |
| 119 | **The bots see the hand and die to it anyway**: sighted bots died to Time in 57 of 176 runs, unsighted 54 of 176, the blind control 8 of 16 — the orbit runs against the hand inside the disc, where every meeting is a crossing and a 40px blade cannot be crossed untouched; a bot that lived would stand outside 536px, a steering change not made. Hand hits are not in the aimed-shots table; a hand hit beside a vanishing DENIED could be credited to the shot | Presence; the instrument | Open, INSTRUMENT: a standoff outside the disc, and a hand column, when a reading of Time is wanted. **Fixed** 2026-09-28 (H2): a boss nothing hurts (`bossCannotBeHurt`, Time by kind) gets a standoff past its hazard, 584px (`OUT_OF_REACH_MARGIN_PX` 48, PLACEHOLDER), every other boss the old one, byte-identical reports on six acts; Time's deaths read 14 of 96 → 0 of 96; a `HandLog` counts contacts and deaths per i-frame window, printed in the report's hand section (133) |
| 120 | **Two hand hits kill at the forms' floor**: the hand does the Egg's damage (12) and the floor is a fifth of the opening maximum | Placeholders, both | A person's play moves them |
| 121 | **Time's hand is two render overlays** (PLACEHOLDER, as the Mortgage's door): a teal strip for the hazard and a bone strip over the sprite's baked long hand; during Time's fade-out the layers fade separately and the baked hand ghosts faintly; the strip is a 40px square-tipped rectangle where the drawn blade is about 23px and pointed, and its first ~28px sit under the cap undrawn | It turns with the sim and every check passes | **Fixed** 2026-09-28 (D-029, S) for the ghost: Time is drawn in its face frame, without the long hand, for its whole fight, and the bone strip is deleted; the teal strip stays (148) |
| 122 | **The bar's tail can hide a loss**: the track is the larger of the opening maximum and the current one, so Thick Skin taken after a decision shrinks or erases the tail; the honest track is the items' maximum, private in `World` | A decision before any later gain draws right | **Fixed** 2026-09-28 (E2): `World.itemsMaxHp` (the base times the items, no decision applied) is the track, in a pure `healthBar()` the scene draws and a test reads; a decision then Thick Skin keeps its tail (the old formula gave 0). The fill is now clamped to the rounded live track, which had spilled 0.2px into the tail at full health |
| 123 | **The tail is quiet** — one decision is 11px of 216 with an outline at half alpha, and the floor is not marked; the boss label ("time · N seconds") sits over the bone dial at low contrast, as every boss's label does at the top of the view; the mark band is rose on burgundy, low contrast, and a freshly marked enemy is dimmed by its hit flash; a marked boss is still invisible | Each is drawn where it should be | Partly **fixed** 2026-09-28 (E2): the tail's outline is bone at 0.85; the floor is a 2px ink tick across the bar while a tail shows (138); the mark is a bone band edged in rose on its own layer over the crowd and under the boss, so a hit flash no longer dims it, and a marked boss gets a band tucked under the foot of its frame. The boss label's contrast over Time's dial is untouched (136) |
| 124 | **A knee reads −1% speed, not 3%**: `attach.drag` 0.03 on the antibody's asymptotic curve | The sim's arithmetic | Open, wording |
| 125 | **A ranged enemy asked for near a wall can land outside the arena for good** (forms, phones, reviews spawn 780px out and never move), too far to fire or be reached — the smoke steers only to reachable ones now, and asks for Decline's form from the arena's middle | 92's shape; a still player at a wall never meets one | Open, a judgement: an edge spawn that clamps inside the arena if a person reports empty acts |
| 126 | **The smoke switches god off in Decline** so a decision can land; medication can hurt it meanwhile (no death in five runs); its `decline-boss` screenshot rarely shows the hand (taken as the entrance look begins; the state is asserted, 71's shape); and it reads more private scene fields (`hpTail`, `bossHand`, `holdRings`, `holdChairs`, `hudBossLabel`; 72's shape) | Every assertion is on state | Noted |
| 127 | **The dev panel shows Time as 320/320 hp** and its −50% does nothing meaningful | Dev only | **Fixed** 2026-09-28: the boss row is per kind (`src/dev/boss-cheats.ts`) — Time reads `time · N s`, `−30 s` replaces `−50%`, and `kill` writes the clock to 0 with the exit; the Mortgage reads windows paid and adds `miss window` (75); every other boss adds `hurt boss`, a third of the maximum, one Reorg threshold per press |
| 128 | **The smoke budget is thin**: 420s is about 1.2× the projected slowest CI run for 21 milestones (about 165s here on a quiet box, 170s under load), and past it on the shared four-core box when other work runs | Two clean runs at 165–170s | Open: raise it when CI's own timing says so, with the arithmetic |

# Part ten — 2026-09-28, the placeholders retired, as the builders flagged it

Not a read: the agents that drew the seven variant frames (D-029), the
sounds, the instrument fixes, the HUD's honesty pass, the phone pass and the
review mode (D-030) each reported what looked like the game working but
might not. Collected at the round's integration branch.

| # | What | Why it looks right | Status |
|---|---|---|---|
| 129 | **A variant frame lost its holder's teal in CONFORM and every CHECK row passed.** `heldThreats()` matched the threat table by the spec's own id, so a D-029 variant was quantised without boss teal: the Egg's corona, the whole chart, the house and the clock came out grey-brown, `palette-variety` sat at its floor, and the G-032 law test (an inline copy of the same lookup) passed the wrong sprite and failed the right one | Ten rows of CHECK passed; the drawing was fine | **Fixed** before any frame landed: the pipeline resolves the variant's holder, the law test reads the same list, and a new guard requires a variant to wear every threat colour its holder wears. Found independently by three drawers, who each rendered with the fix and committed the right sprite |
| 130 | **The greyed rows' faces are bone, not grey.** With ink faces the three-row frame failed contrast coverage (0.4022 against 0.4: shadow sits 0.10 in Oklab L from the slate floor and ink 0.13, so the grain pushes ink under the floor); bone faces on grey boxes pass at 0.3976 with nothing weakened | G-004 wants the faces kept; the check is the check | By design: the spec now says bone faces and teal connectors, and the records were regenerated from the unchanged SVGs |
| 131 | **The Egg's gap is down-right** (centred 53° clockwise from +x, a sixth of the circumference), where the face's displacement on the mass and the shadow's axis point, and where none of the rim's four outermost points fall — a gap straight down would have cut one and re-centred the whole egg in CONFORM, so the frames would jump on the swap | The three Egg frames share opaque bounds and density exactly | By design; the swap moves the eyes and the gap only |
| 132 | **Nothing on the field is a threat colour's absence**: a holder may choose not to wear its colour (the dodgeball is grey-brown by its spec), so the general guard "every holder wears its class" was wrong and was narrowed to variants | The dodgeball has always been grey-brown | Noted: law 6's colour is a permission, not an obligation, for a holder. 2026-09-28: the dodgeball wears its contact red in the greeting-card redraw, as its reservation and SCHOOL-ROSTER §3.2 always said; the grey-brown was only the old batch description |
| 133 | **The bots park at a wall during Time.** The 584px standoff circle crosses a wall wherever Time stands within it of one; there the orbit and the standoff cancel along the wall and the bot sits (seed 1003, x 3200 for the whole minute), where a static insurance form in range lands a DENIED every ~8.4s: form hits during Time read 30 → 53 across 96 runs, before the boss unchanged. The same parking happens at any boss whose smaller circle meets a wall | The hand column is read | Open, **INSTRUMENT**: the hand reading is partly a reading of wall parking; a steering change would move every other boss's numbers and was not made |
| 134 | **The shot log's remaining blind spots**: a call landing on the step a pile or room pushed the player further than one step's walk is missed; a medication heal on a shot's step can shrink the fall under the shot's damage and skip it; the hand log relies on nothing moving the player after `turnHand`, true while Time fields no phone | Rare, each | Noted, **INSTRUMENT** |
| 135 | **The play view has no phone type size.** Upright, the HUD and the offer cards are the 1280×720 view shown 390 wide: 4 CSS px; sideways 7. The cards are where it hurts. The papers, the pause sheet and the certificate take a canvas of the screen's shape and meet the 11 CSS px floor; play does not | The 1280 view's every text is identical before and after the phone pass, box by box | Open, a judgement: a narrow offer layout (the world is frozen during an offer, as under the pause sheet) is a design change, not a layout fix; a person on a phone will say whether they can read a card |
| 136 | **Bosses stand under the HUD band**: Time's cream face under "time · N seconds" and "age 84", The Mortgage's roof under the worn line, at every size | Contrast, not position | Open, cosmetic: a plate under the label restyles the bar |
| 137 | **The phone pass's five fixes** (P, 2026-09-28), all layout: a toast that would overlap the pause plate stands above it; the HUD is re-centred for an upright canvas (`anchorHud`) and the worn line breaks between terms there (`wornText`, `NARROW_WORN_CHARS` 34); the pause note starts under the HUD band; sideways the sheet's type is raised to the 11 CSS px floor (`pauseTypeScale`), falling back to 1280's type scaled when too long; with a boss up the note stops under its bar. A whole maxed build still scales to about 5 CSS px sideways | Nine 1280 screens byte-identical | **Fixed** but for the maxed build, which has no room at 390px tall without a canvas change |
| 138 | **The floor tick is ink**, so it vanishes on the dark track once health is under the floor, and at the floor it coincides with the tail's start; it appears only once a decision lands, not from Decline's start | As specified | Open, cosmetic: a bone cap if a person misses it |
| 139 | **The mark band reads as a shelf**: it covers the bottom ~20% of an enemy's sprite rather than a highlighter stroke; a boss's band assumes its drawing reaches the foot of its frame (`bossBody`), so a boss that stops short gets a floating band. The live-but-empty track barely differs from the plate, so the tail reads as a separate box at the bar's end. Every number is PLACEHOLDER (`MARK_BAND`) | Every band is where the code puts it | Open, cosmetic; a person will say whether a marked thing reads as marked |
| 140 | **The rattle is near-constant**: doses spawn at 0.7/s, then 1.1/s from 45s and 1.6/s from 80s, on the off-screen edge ring, so with the sound's 1000ms floor it plays about once a second all act for doses you cannot see (the doorbell's shape). The rain, about 1.5s, is the longest of Decline's own sounds; `bossSpawn` at Time's arrival runs about 2.0s | Every gate is a def id or `kind === 'time'`; the whole-schedule tests play none of Decline's sounds in the other six acts | Open, a reaction: background or nag (DECLINE-ROSTER §6) |
| 141 | **Time's end is not silent**: the tick stops at zero as the roster says, but the shared win triad still sounds when the life ends 1.8s later; DENIED is stamped on the consult's start, so a frame where one form stops and another starts is not heard (the phone's limit); a knee landed at a quarter turn has no sound of its own until it is worn (the attach stamp). Inside the last five seconds only the seconds tick, so the quarter at 57s is heard as the second's, because the two clocks (`handSeconds` up, `secondsLeft` down) can land a step apart | A whole-Time test passed without the rule; the truth table caught it | By design: the triad is the life's, not the clock's; a one-line gate on the kind if a person wants silence there |
| 142 | **The review flag is a presence test**: `?review=0` and `?review=false` turn review mode on (`has('review')`), a `#review` hash does not; anyone can add it to the public URL, and the taint is the only protection; a dev build always shows the title's review line | The flag is read once per page load, so it cannot turn on mid-life | By design (D-030): the mode is a courtesy for a reviewer, not a lock, and every life it touches is tainted and unrecorded |
| 143 | **A life is tainted by its shape**: any life that is not all of `ACTS` in order is tainted in `create` and on every restart, so R or a tap on the certificate cannot launder a life begun at Family. A future feature that starts a life elsewhere on purpose would silently stop recording ancestors and show the badge | Pinned by a test that reads the scene's source (the taint line after `neutralDevState()`, `recordLife` under `if (!this.dev.tainted)`); a reformat trips it | Noted: the rule is `reviewedLife()`, one place to widen |
| 144 | **`start at` is a fresh life**, not the life as played: level 1 with the lash at Family, no inheritance until its first crossing (the world deals one in `beginAct`, so "You inherited" appears at the started life's second act), and a start at Conception is tainted too. `preview paper` at Conception reads "INHERITED: nothing yet" for the same reason; when a preview goes down the act's name is announced again (`hideDocument` always announces); a preview is refused with a note while a paper is up or the life is over. `next act` polls every 50ms, so the drop can land after the entrance has begun, and waits for an open offer's choice. `level +5` repeats the world's private `xpCost` (the Constitution test pins it; the tuition tax path is untested). `every habit` is a named list of four; a fifth would not join | Each is what a reviewer sees, none is the game | Noted, all by design: the row moves a person across seven acts, and nothing it does is a number to read as the game's |
| 145 | **The panel at the link covers the HUD badge at 1280** (true in dev already; `` ` `` hides it) and most of a phone's screen; its head was a red (`#c4472e`) in dev and now ships, so it moved to the panel's bone (`#d2c6ac`): law 10 keeps threat colours off chrome, at the link as in dev | The badge is on the canvas, so a screenshot still has it | **Fixed** for the colour; the coverage is noted |
| 146 | **The parted Egg shows at half opacity**: `parted` arrives at the absorb's halfway, where the fade has the sprite at alpha 0.5, and fades from there over 0.9s at 1×, so the gap may read weakly; the smoke's `conception-boss.png` is now the parted Egg mid-absorb, not the standing one (the wait still asserts the normal frame before the kill). G-006's "the screen goes white" is not in the code: the absorb is an alpha fade, a zoom to 1.1 and the paper | Both frames are seen across polls in every smoke | Open, a reaction: whether the parting is seen at all |
| 147 | **The Mortgage can look stuck, shut**: the twelfth instalment met with a window still to run (5s, placeholder) leaves the house owing nothing with its door shut until the window closes and the absorb begins; the ajar overlay covered that gap and is gone (82) | The door opens on the absorb, as the roster says | Open, a judgement: a person will say whether five seconds shut reads as stuck |
| 148 | **Time's strip is still a square-tipped 40px rectangle** beside the pointed short hand, its first ~28px under the cap; during the fade the strip and the dial fade as two translucent layers, so the rim shows through it. `boss-time.png` is never drawn in play now (it holds the reservation, law 11), and `world.ts`'s `TIME_HAND_REST` comment still says the pose is baked into the sprite the player sees | The hand turns with the sim; the ghost (121) is gone | Open, cosmetic: a drawn hand frame at the sim's length would retire the strip; the comment is one line |
| 149 | **The absorb's 1.8s is written in five places**: three in `world.ts`, the dev panel's kill and `ABSORB_SECONDS` in `boss-frames.ts`; the Egg's halfway depends on them agreeing, and `ActScene`'s alpha line keeps its own literal. Under the panel's kill the Reorg jumps from its normal frame to grey-3, skipping the middle rows; in play each grey swap lands with the relocation (932–2057px, off screen), so a player may never see the chart in a new frame where it changes (53) | Every place says 1.8 | Noted: one export in `world.ts` when the sim is next opened; the panel's jump is the cheat's, not the game's |

# Part eleven — 2026-09-28, the greeting card, as the builders flagged it

Not a read: the agents that redrew the weapons, the player and the first two
acts in the greeting-card register (G-053), renamed the weapons to the kid's
things (G-054), built the two other lives (G-055) and redid the title each
reported what looked like the game working but might not. Collected at the
round's integration branch.

| # | What | Why it looks right | Status |
|---|---|---|---|
| 150 | **An icon's glint is bone, not paper.** §2026-09-28 asks for one paper glint per mass, but a weapon's icon rides the field (G-036) and law 10 gives paper to the player alone; CHECK's `field-colours` rejects a paper pixel on it. So the glint on every field-riding icon is bone, and a part already drawn in bone (the rattle's handle and ring, the cootie shot's middle) has no glint | Every check passes; the card still reads glossy | By design: the law wins over the register on the field; the register's rule now says so (D2) |
| 151 | **Tattle wears Adolescence's speech bubble.** The group chat enemy is a grey-brown bubble with a face and a tail at the lower left; Tattle is a blush bubble with an exclamation mark and the same tail, falling from above. Law 11's reservations exempt icons, so every check passes; in Adolescence a landing Tattle shares an enemy's silhouette and differs in colour and motion. The Telephone has wheels (driver's ed's) and Cooties is a ring (spermicide's), lower | Colour and the fall tell them apart on paper | Open, a judgement: a raised hand for Tattle if a person confuses them |
| 152 | **Cooties reads as a smiley in a ring** more than "circle, circle, dot, dot": the middle had to be filled so the two ink dots would not vanish on the ink card, and once filled it is a face. The card's name carries the joke | It reads at 24px on the act ground | Open, cosmetic; a person will say whether the rhyme comes to mind |
| 153 | **Five older field effects fill with paper at low alpha** — the sweep wedge (0.18), Tattle's flash, the Snooze field, the aura ring and the burst circle — and `iconTexture`'s placeholder glyph is paper too. Law 10 gives paper to the player alone; the new effects (the cry's band, the puddle) are bone | Low alpha over the ground reads as a tint, not as the player | Open, a one-colour change per site when the field is next touched; the checks do not see drawn shapes |
| 154 | **The splat needs the puddle's serial**: it fires on a Spilt Milk area with a fresh `serial` and `source`; a puddle with a zero or reused serial is silent, and the burst area itself carries no source. Two cries on one frame play one waah, as two sweeps play one swish. The swing's rattle floor is 200ms (PLACEHOLDER) against the doses' 1000ms, on one key, so a swing and a dose landing together are one shake | The edge tests pass on hand-built states; the real-World splat test is an `it.todo` until the sim's puddle lands | Open until integration writes that test (this round) |
| 155 | **School's people share one green head** — the substitute, the hall monitor, the clique's four and the Gym Teacher: school-mid, wider than tall, no hair (the cowlick is the player's), mitten hands. Law 9's roles carry the silhouette and the colour (clipboard, sash, whistle), so at a glance they are the same kid in different jobs; the Gym Teacher no longer holds the stopwatch SCHOOL-ROSTER §9 describes, because the reservation names the whistle as the only thing he carries. A bone glint on a bone mass is invisible, so the clipboard, the homework, the whistle and the shorts have none | Every check passes; each role reads by its object | Open, a judgement: whether the family resemblance is the joke (everyone at that school is the same kid) or a blur; the roster's stopwatch line is stale |
| 156 | **The player's props at 56px**: the Office mug is a dark blob with a hole (an earlier draft read as an animal head); the belt and the cardigan's hem sit at the torso's foot and can read as shorts or a nappy line; the hoodie's and cardigan's glints sit at the left shoulder and can read as a spot; the rolled hood reads as a collar; the lanyard's cords vanish on the hoodie. The flipped sprite puts the cowlick over the other eye, as it always has. The seven heads share one markup and one height; a prop that widens a frame shifts the crop's phase by a fraction of a pixel, so 1–4% of the head's edge pixels differ at 112 (invisible at 56) | Every check passes; the kid reads at every size | Open, cosmetic; a person will say which prop they could not name |
| 157 | **Cry echoes the spermicide** — a droplet with a face over an expanding ring, in Conception, where the spermicide is a droplet with a face that becomes an expanding ring; only colour separates them (bone against contact red), so the cry ring's colour is what tells them apart. The Mobile's star orbits the player in the Office, whose reservation gives points to the performance review's row of stars alone (icons are exempt). Rose at 0.6–0.75 alpha (the Legos trail, the milk's cup) sits softly on conception-deep, as the old rose footprint did. Rut, being Legos' evolution (Baggage), now stamps Legos too | Every check passes; the drawings agree with their verbs | Open, a judgement: whether a person ever mistakes a cry for spermicide (question 22) |
| 158 | **The kid on the title is the 112px frame at 3×**, so its edges step and it reads a little like pixel art; a title-sized frame from the pipeline (or the SVG rendered at 336) would fix it. Space is a name character on the title ("Mary Jane"), so only Enter starts a life; an upright phone gets a canvas of the screen's shape (720 wide, the certificate's way) and turning the phone relays the title, checked only with Playwright viewport changes at ~7 fps | Every input path starts the life it names; the smoke's Enter still starts the plain one | Open, cosmetic: a `player-title` frame when the pipeline is next opened |
| 159 | **Couch Potato keeps the aim**: the stick still sets facing under the rule, only the position never moves, because facing is where Pointing's line, the Rattle's arc and the lead land; zeroing the whole vector would have every aimed weapon point right for the whole life. The Restlessness motion streaks still draw behind the facing while the player stands still (`syncPlayer`). Under One Trick weapon priorities go inert after the opening choice, so bot policies that differ only in weapons play identical lives on one seed, which inflates the report's apparent agreement; the controls hint fades under the opening offer's dim, so a slow chooser never sees it; the pause sheet does not show the rules. The certificate's NOTED line falls back under the cause when too long for the label line, at an estimated 0.6em monospace width | 18 rule tests; a plain life is byte-identical with and without the option; both rules ran the bots to presence | Noted; the streaks and the pause sheet when those files are next open |
| 160 | **Conception's redraw, as flagged**: the pipeline still grains the 384px Egg frames (TEXTURE is in the pipeline, which the register retires for sprites and a drawer may not edit); the Egg's body is bone, so its corona carries the one glint; its eyes are at the register's sixth, larger than G-006's "small face"; the spermicide has a mouth and a glint where CONCEPTION-ROSTER §3.2 says none; the white cell's face sits on the purple where the roster had a cream stamp, at the set's tightest contrast (0.1438 against 0.12; 0.3745 of it fades into the ground against 0.4); the antibody's smile is lopsided by a pixel because the rasteriser's fit lands within a pixel, not on one; the rival faces right and the renderer flips chasers toward the player, so in the race it faces you rather than the Egg. The three Egg frames share bounds (2, 0, 381, 383) and density; teal pixels 2166, 2166, 1835 | Every check passes; both D-029 guards pass | Open: retire grain in TEXTURE for authored sprites when the pipeline is next opened; the roster lines are stale, the drawings are the record |
