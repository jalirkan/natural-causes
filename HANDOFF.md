# Handoff — 2026-09-27, late

A living note for the next session, whichever machine it runs on. Overwrite
it; it is not a record. Read `CLAUDE.md` first, then this.

## Where everything is

| What | Where | State |
|---|---|---|
| The game | <https://jalirkan.github.io/natural-causes/> | `main` at `0c8926a`: the reorientation (#3) and touch controls (#4). Deploys on every push to `main`. |
| The one-life run (sim only) | branch `c/determined-tesla-satvj6`, commit `044f5c3` | `World` plays a sequence of acts, keeps items and level across the threshold, writes a `certificate` (act, age, cause). 265 tests green. Not drawn yet: the browser still runs a one-act life. |
| Four design proposals | `DIRECTION-PANEL-2026-09-27.md` | Unjudged; the fifth (constraint auditor) never finished. Steal from, do not obey. |
| Coherence pass | GitHub issue #5 | What "one run is one life" invalidates, four setups with no payoff, two tonal breaks. The checklist for G-038. |
| Audit part three | nowhere | The cloud session was stopped before it pushed. Redo it: AUDIT.md-class defects in `world.ts`, `bots.ts`, `run.ts`. |

Every cloud session, trigger and workflow from tonight is stopped or archived.
Nothing is waiting on anyone.

## Decided tonight, not yet written as records

Write these as `D-024` (technical) and `G-038` (the batch retirement, with
mechanism 1's two rejected alternatives) before building on them.

1. **One run is one life.** Continuous, ~20–30 minutes, acts are phases, the
   boss falling is the threshold, items and level persist, dying names the
   age and cause, outliving the last act is natural causes. Built in the sim.
2. **Art is authored, not generated.** Flat cartoon sprites as SVG in the
   repo, rasterised with the `sharp` dependency already installed, run
   through the existing CHECK stage and packed into the atlases. No fal, no
   key, no money, every asset reproducible from source. The generate/cut/
   conform stages retire; conform's palette quantisation and the checks stay.
   The register is decided from a rendered batch judged by Justin at the
   link, as before, but the batch costs nothing to make.
3. **Retire:** G-014 (every item subtracts); the 30-item cap; G-019's "the
   Egg does nothing" (keep G-006's absorption); law 8 as a *law* (keep
   indifference as a flavour some enemies have); one-act-per-run; the
   mid-century register for sprites (keep it for documents: cards,
   certificate, title). All four proposals agree on these independently.
4. **Keep:** D-007, the sim/bots split, the pipeline's checks, CI and the
   deploy, G-003's face and cowlick, laws 1, 2, 5, 6, 7, 9, 10, 11 as
   legibility rules.
5. **No cloud fan-out.** Spawned sessions prompt Justin for every permission.
   Parallelism is in-session workflows only, under the session's own
   permissions; Opus for bounded implementation, Fable for judgement.

## Next, in order — each ends visible at the link

1. **Draw the life.** On the branch: `ActScene` follows `world.actIndex`
   (preload every atlas in `ACTS`, swap visuals at the crossing), the HUD
   shows age instead of minutes, and the end overlay is the certificate:
   "Cause of death: Homework. Age 9." / "Natural causes. Age 12." Then merge
   the branch to `main`.
2. **D-024 and G-038**, using issue #5 as the checklist. Retire the stale
   claims it lists in the same commit.
3. **Upgrades are gains.** Life-vocabulary names for the seven (the panel
   has three naming tables; pick one), a VS-shaped XP curve, weapon levels
   that add things rather than only damage, one evolution end to end, and a
   few new items. Every proposal's item list is usable.
4. **A boss that does something.** The Egg as a race the rivals also run
   (genre-purist proposal) or the Gym Teacher (two versions in the panel).
5. **SVG art.** `tools/art/svg/` with one file per asset, a rasteriser, the
   existing checks; regenerate Conception and draw School's four missing
   sprites, a player frame and a boss for School so `ACTS` grows to two.
6. School's three owed placeholders (substitute's attack, homework's arrival
   point, monitor's stop), then the audit.

## The prompt for the next session

> Read CLAUDE.md, then HANDOFF.md, and do "Next, in order" starting at 1.
> Work on `c/determined-tesla-satvj6` from its current tip. Merge to `main`
> when green. Ask me only reaction questions.
