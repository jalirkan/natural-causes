# Handoff — 2026-09-28, midday

A living note for whichever session runs next. Overwrite it; it is not a
record. Read `CLAUDE.md` first, then this. **Two sessions built the same
steps three times one night** (the SVG stage, School's placeholders, the
audit — D-026) because this file on `main` never said who was on what. The
holder table below is the fix: take a step only if it is yours or unowned,
and write your name against it here, on `main`, before you start.

## Where everything is

| What | Where | State |
|---|---|---|
| The game | <https://jalirkan.github.io/natural-causes/> | `main`: a five-act life, Conception → School → Adolescence → College → The Office, every sprite authored SVG; CI's fifth check plays it end to end in Chromium. Deploys on every push. |
| The sim | `src/sim/world.ts` | One life (D-024); upgrades are gains (G-038, G-039); the Egg is a race (G-040); the inheritance (G-042); worn stacks carry the act that attached them (`wornBy`) and can cost speed, XP or cadence; holds (the meeting); bosses of five kinds. Every enemy is named on arrival; the life ends on a certificate of death with your name on it, legible on a phone either way up. |
| Upgrades | `src/data/items.ts`, `src/data/item-text.ts` | G-043: every weapon has paths, its own cards from level 2, folded into one bonus (`World.bonusFor`); every card prints its number from the data. G-044: Personal Space, Backhand, Judgement. G-046/G-047: six evolutions, paid at the weapon's max level. Every value a placeholder; nobody has played any of it. |
| The papers | `src/data/documents.ts` | G-049: a birth certificate, a report card, a yearbook page and a diploma at the crossings, each written from the run; The Office's review has nowhere to show yet (AUDIT seven, 52). |
| Art | `tools/art/svg/<act>/<id>.svg`, `pnpm art:svg` | Main's stage (D-025). Every field sprite and every boss drawn; the pipeline rejects a field-riding icon in a reserved colour. The review page: `pnpm art:sheet`. |
| School, Adolescence | `SCHOOL-ROSTER.md`, `ADOLESCENCE-ROSTER.md` | Designed, drawn, fighting (the Gym Teacher, Prom), sounded. Every number a placeholder. |
| College | `COLLEGE-ROSTER.md` | G-045: tuition's tax and persistence, the group project's weak point, the registrar's hold, The Loan (interest, the statement, foreclosure), its sounds. AUDIT part six's flags are fixed or judged. |
| The Office | `OFFICE-ROSTER.md` | G-048: the reply-all's split, the commute, the ping's cost to cadence, the meeting's hold, the review's cut of the level bar, The Reorg (restructures at two thirds and one third, the memo column). Every number a placeholder; nobody has played it. AUDIT part seven lists what the builders flagged. |
| The build sheet | `src/data/build-sheet.ts` | Pause shows what the life holds, paths and totals, in the cards' vocabulary. |
| Direction proposals | `DIRECTION-PANEL-2026-09-27.md` | Mined for G-038–G-040. Still usable: arrival toasts, per-act items, Time as Decline's boss. |
| Coherence pass | GitHub issue #5 | Landed: the misspelled name, the Egg's inheritance. Still open: the cowlick, the doorstep death. |

## Waiting on Justin — reactions, not values

Play the link once through (about twenty-one minutes; README's fourteen
questions). What felt wrong? In particular: does the Egg race feel like a
race; is School anything with a build carried in (no bot dies there any
more); the Gym Teacher, a fight or a chore; did being followed in
Adolescence feel like being looked at; did you notice you were paying in
College; did you feel counted in The Office, or was it just slower; did the
papers between acts get read or skipped; did the certificate land.

## Who holds what

| Step | Holder |
|---|---|
| Whatever Justin's play says — labelled numbers move only on a person's reaction | whoever he tells |
| Family, where the life goes at thirty-four (PLAN.md; G-006's Time as its boss is one proposal) | unowned |
| The Egg's G-006 frames (eyes closing, corona parting): a multi-frame stage | unowned |
| Service: the other branch at Prom's crossing (G-045), G-007's roster; then the choice itself | unowned — after a person has played five |
| The Office's paper (the review) — needs an act after it, or the last act's paper shown before the certificate (AUDIT seven, 52) | unowned |
| The Loan's opening balance on `taxStacks` rather than `dragStacks` (AUDIT seven, 50) | unowned, cosmetic |
| The bots' sidestep cancelling between two of Prom's ring spots (AUDIT part five, minor) | unowned |
| A cap on path cards per offer if three directions of one weapon reads as no choice | unowned — after Justin's reaction to question 9 |
| Sounds for The Office (the ping, the carriage, the chairs, the memo) | unowned |

## The prompt for the next session

> Read CLAUDE.md, then HANDOFF.md. I played it: <reactions>. Take an
> unowned step, write your name against it here on `main` first, and end
> with something visible at the link. Ask me only reaction questions.
