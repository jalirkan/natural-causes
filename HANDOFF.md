# Handoff — 2026-09-27, later still

A living note for whichever session runs next. Overwrite it; it is not a
record. Read `CLAUDE.md` first, then this. **Two sessions built the same
step tonight (D-026) because this file was not updated on `main`. The
"who holds what" table below exists so that does not happen again: take a
step only if it is yours or unowned, and update this file on `main` when
you take one.**

## Where everything is

| What | Where | State |
|---|---|---|
| The game | <https://jalirkan.github.io/natural-causes/> | `main`. A two-act life, Conception then School, every sprite authored SVG. Deploys on every push to `main`. |
| The sim | `src/sim/world.ts` | One life (D-024); upgrades are gains (G-038, G-039); the Egg is a race (G-040); School's three placeholders built and labelled (D-022); AUDIT part three's two fixes in, five items open with patches. |
| Art | `tools/art/svg/<act>/<id>.svg`, `pnpm art:svg` | Main's stage (D-025). Twelve field sprites plus the Gym Teacher drawn. The review page: `pnpm art:sheet`. |
| The Gym Teacher | `SCHOOL-ROSTER.md` §9 | Designed and drawn; **fights as the Egg** until his behaviour is built. |
| Adolescence | `ADOLESCENCE-ROSTER.md` | Drafted by an agent, under review by the cloud session. Not data yet. |
| Not wired yet | `src/audio/sfx.ts`, `src/meta/input-log.ts` | Four School sounds and the heading-hold log exist and are untested by ear; `ActScene` does not call them. |
| Stale claims | `PLAYTEST-FINDINGS.md`, rosters, `ITEMS-BRIEF.md` | A sweep found G-014 and the 30-item cap still stated as live in several docs; being fixed after this merge. |

## Who holds what

| Step | Holder |
|---|---|
| Gym Teacher behaviour in the sim (§9): whistle relaunches every dodgeball, untouchable while one lives, PARTICIPATION | **cloud session** (in progress) |
| Wire the four sounds and the input log into `ActScene`; a dev-panel readout of the log | **cloud session** |
| Adolescence: roster review → enemies, ActDef, palette, drawings | **cloud session** |
| AUDIT items 18, 20, 21 (Lash aims at the invulnerable; Wake standing still; Chemotaxis moves arena enemies) | **cloud session** |
| Doc sweep for stale G-014 / budget / "not playable" claims | **cloud session** |
| The report-card document at the crossing and the certificate as a document (the mid-century register is kept for documents) | unowned — good for the local session |
| The Egg's G-006 frames (eyes closing, corona parting) | unowned |
| Playing it and answering the six reaction questions in `README.md` | Justin |

## The prompt for the next session

> Read CLAUDE.md, then HANDOFF.md. Take an unowned step, write your name
> against it here on `main` first, and end with something visible at the
> link. Ask Justin only reaction questions.
