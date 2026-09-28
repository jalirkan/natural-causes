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
| 52 | **The last act's paper is never seen.** A crossing shows the finished act's paper and the life's last act ends on the death certificate, so The Office's review (OFFICE-ROSTER §6) has nowhere to show until Family exists or the certificate path shows it first | The diploma shows, now an act follows College | Open, unowned (HANDOFF) |
| 53 | **The Reorg can restructure off screen.** It relocates at least 300px from the player and the entrance pan (37) runs at spawn only, so after a restructure the memo column can arrive from nowhere | The sprite follows `boss.x/y`; the squash plays | Open, a judgement: a second pan under fire pulls the view off the player as the memo arrives; the memo from nowhere may be the joke. Re-owe the look on a restructure if a person says they lost it |
| 54 | **The smoke never restructures the Reorg** and never sees a ping worn, MEETS in flight or the commute: the dev kill skips the thresholds. Each was checked once by hand in Chromium | The smoke passes to Age 34 | Open: an `office-play` milestone, as 39's was for College |
| 55 | **The chart's grey rows are a render tint**, the shadow tone at two thirds over a crop of the chart's own frame, which G-032 retired for sprites; the drawer's row cuts (y 132/236/340 of 384) place the crops | It greys the right rows, bottom up; the empty top box never greys | Open, labelled PLACEHOLDER in `ActScene`: the pipeline-clean version is a drawn grey frame the same overlay uses. Canvas ignores the tint; WebGL is what players get |
| 56 | **Sixteen worn sprites at most.** The bots wear 12–20 by The Reorg, so late pings stop appearing while the HUD count stays right; tuition, worn first, always shows | The cap predates the act | Open, cosmetic; the HUD is the truth |
| 57 | **The smoke's budget margin shrinks with every act**: 61s locally against 240s, about 180s at CI's speed | It passes | Open: raise the budget or skip the acts the milestones already cover when the sixth act lands |
