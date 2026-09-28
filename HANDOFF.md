# Handoff — 2026-09-28, early morning

A living note for whichever session runs next. Overwrite it; it is not a
record. Read `CLAUDE.md` first, then this. **Two sessions built the same
steps three times tonight** (the SVG stage, School's placeholders, the audit
— D-026) because this file on `main` never said who was on what. The
holder table below is the fix: take a step only if it is yours or unowned,
and write your name against it here, on `main`, before you start.

## Where everything is

| What | Where | State |
|---|---|---|
| The game | <https://jalirkan.github.io/natural-causes/> | `main`: a four-act life, Conception → School → Adolescence → College, every sprite authored SVG; CI's fifth check plays it end to end in Chromium. Deploys on every push. |
| The sim | `src/sim/world.ts` | One life (D-024); upgrades are gains (G-038, G-039); the Egg is a race (G-040); the inheritance (G-042); School's placeholders (D-027); AUDIT parts three to five in, and five's patches applied. Every enemy is named on arrival; the substitute's shot is your name spelled wrong; the life ends on a certificate of death with your name on it, legible on a phone either way up. |
| Upgrades | `src/data/items.ts`, `src/data/item-text.ts` | G-043: every weapon has two or three paths, its own cards from level 2, folded into one bonus (`World.bonusFor`); every card prints its number from the data. G-044: Personal Space (aura), Backhand (sweep), Judgement (strike), drawn and in the pool from conception. Every value a placeholder; nobody has played any of it. |
| Art | `tools/art/svg/<act>/<id>.svg`, `pnpm art:svg` | Main's stage (D-025). Every field sprite plus the Gym Teacher drawn. The review page: `pnpm art:sheet`. |
| The Gym Teacher | `SCHOOL-ROSTER.md` §9 | Designed, drawn and fighting: the whistle, the shield, PARTICIPATION. Every number a placeholder; nobody has played him. |
| Adolescence | `ADOLESCENCE-ROSTER.md` | Designed, data, drawn, startable; Prom fights (the race, the floor, the ring); Growth Spurt and Snooze; its sounds. AUDIT part five read it. |
| College | `COLLEGE-ROSTER.md` | G-045: designed, data, drawn, startable; tuition's tax and persistence, the group project's weak point, the registrar's hold, The Loan (interest, the statement, foreclosure). Every number a placeholder; nobody has played it. AUDIT part six lists what the builders flagged. |
| Evolutions | `src/data/items.ts` §4.6 | G-046: five more, dealt as Tantrum is, each drawn; G-047: paid at the weapon's max level. The bots reach them rarely. |
| The build sheet | `src/data/build-sheet.ts` | Pause shows what the life holds, paths and totals, in the cards' vocabulary. |
| Direction proposals | `DIRECTION-PANEL-2026-09-27.md` | Mined for G-038–G-040. Still usable: inheritance, arrival toasts, per-act items, Time as Decline's boss. |
| Coherence pass | GitHub issue #5 | Landed tonight: the misspelled name, the Egg's inheritance. Still open: the cowlick, the doorstep death. |

## Waiting on Justin — reactions, not values

Play the link once through (about eighteen minutes; README's twelve
questions). What felt wrong? In particular: does the art read as a register
worth keeping; does the Egg race feel like a race; is School anything with a
build carried in (no bot dies there any more); the Gym Teacher, a fight or a
chore; did being followed in Adolescence feel like being looked at; did Prom's
light ever reach you (the bots kill it before its first ring); did the
substitute spelling your name wrong land; did the certificate.

## Who holds what

| Step | Holder |
|---|---|
| Whatever Justin's play says — labelled numbers move only on a person's reaction | whoever he tells |
| The Egg's G-006 frames (eyes closing, corona parting): a multi-frame stage | unowned |
| Service: the other branch at Prom's crossing (G-045), G-007's roster; then the choice itself | unowned — after a person has played four |
| The Loan spawns 420px above the player like every boss, so its tape is off the top of the view until the player walks up (AUDIT six, 37) | unowned |
| A fifth act's attach frame for the tuition stacks that persist into it (AUDIT six, 38) | whoever builds The Office |
| AUDIT part five's open 35/36 were taken as (a); its "left, minor" trail-off-screen note is covered by TRAIL_SECONDS's label | nothing owed |
| The bots' sidestep cancelling between two of Prom's ring spots (AUDIT part five, minor) | unowned |
| A cap on path cards per offer if three directions of one weapon reads as no choice | unowned — after Justin's reaction to question 9 |
| Sounds for College (the bell, the tape, the date) | unowned |

## The prompt for the next session

> Read CLAUDE.md, then HANDOFF.md. I played it: <reactions>. Take an
> unowned step, write your name against it here on `main` first, and end
> with something visible at the link. Ask me only reaction questions.
