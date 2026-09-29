# Handoff — 2026-09-28, late

A living note for whichever session runs next. Overwrite it; it is not a
record. Read `CLAUDE.md` first, then this. **Two sessions built the same
steps three times one night** (the SVG stage, School's placeholders, the
audit — D-026) because this file on `main` never said who was on what. The
holder table below is the fix: take a step only if it is yours or unowned,
and write your name against it here, on `main`, before you start.

## Where everything is

| What | Where | State |
|---|---|---|
| The game | <https://jalirkan.github.io/natural-causes/> | `main`: the whole life, seven acts from Conception to Decline, winnable — outlive Time and the certificate reads natural causes at eighty-four; every sprite authored SVG; CI's fifth check plays it end to end in Chromium (420s budget). Deploys on every push. G-053: the greeting-card register — the kid (all seven frames), the weapons and the first two acts are redrawn in it; the other five acts are still in the pamphlet register and are the next redraws, one act per session. G-055: two other lives at the title, Couch Potato and One Trick, rules in the world, on the certificate. |
| Review mode | <https://jalirkan.github.io/natural-causes/?review> | D-030: the dev panel at the link. Its `review` row starts a life at any act, skips to the next act, previews the act's paper, grants five levels, deals every habit. Every press taints the run (the HUD says so) and a reviewed life is never an ancestor. README's "Reviewing at the link". |
| The sim | `src/sim/world.ts` | One life (D-024); upgrades are gains (G-038, G-039); the Egg is a race (G-040); the inheritance (G-042); worn stacks carry the act that attached them (`wornBy`) and can cost speed, XP or cadence; holds (the meeting); bosses of five kinds. Every enemy is named on arrival; the life ends on a certificate of death with your name on it, legible on a phone either way up. |
| Upgrades | `src/data/items.ts`, `src/data/item-text.ts` | G-054: every weapon is a thing a kid has — Pointing, Spitball, Spilt Milk (with a puddle), Legos, Mobile, Telephone, Candy, Cooties, Rattle, Tattle, Cry — and its evolution is the adult word (Tantrum, Baggage, Grudge, Backhand, Judgement, Jumpiness); ids unchanged. G-043: paths from level 2, every card prints its number. G-046/G-047: six evolutions, paid at the weapon's max level. Every value a placeholder; nobody has played any of it. |
| The papers | `src/data/documents.ts` | G-049: a birth certificate, a report card, a yearbook page, a diploma, a performance review and a mortgage statement at the crossings, each written from the run; Decline's paper is the certificate. |
| Art | `tools/art/svg/<act>/<id>.svg`, `pnpm art:svg` | Main's stage (D-025). ART-DIRECTION §2026-09-28 is the register every drawing follows now (round, blush, one glint, faces on everything, roles not people); the laws that are craft stand. Every field sprite and every boss drawn; the pipeline rejects a field-riding icon in a reserved colour. D-029: a boss's states are variant frames of its holder (the Egg closing and parted, the Reorg's three greyed rows, the Mortgage's open door, Time's face without the long hand), swapped by `ACT_VISUALS.bossFrames`; the render tints and overlays they replace are retired. The review page: `pnpm art:sheet`. |
| School, Adolescence | `SCHOOL-ROSTER.md`, `ADOLESCENCE-ROSTER.md` | Designed, drawn, fighting (the Gym Teacher, Prom), sounded. Every number a placeholder. |
| College | `COLLEGE-ROSTER.md` | G-045: tuition's tax and persistence, the group project's weak point, the registrar's hold, The Loan (interest, the statement, foreclosure), its sounds. AUDIT part six's flags are fixed or judged. |
| The Office | `OFFICE-ROSTER.md` | G-048: the reply-all's split, the commute, the ping's cost to cadence, the meeting's hold, the review's cut of the level bar, The Reorg (restructures at two thirds and one third, the memo column), its sounds. Every number a placeholder; nobody has played it. AUDIT part seven lists what the builders flagged. |
| Family | `FAMILY-ROSTER.md` | G-050: bills that accrue, the flat-pack, the letters' cost to reach (persisting), the toddler's coy chase and no-damage hold, the phone's pull, The Mortgage (twelve capped instalments, a room a window, a fee a missed window), its sounds. Every number a placeholder; nobody has played it. AUDIT part eight lists what the builders flagged, and 79 says a weak build may never pay. |
| Decline | `DECLINE-ROSTER.md` | G-051: the medication's heal on a kill, the weather, the knees (drag, persisting into nothing), the stairs' permanent hold, the form's cut to the maximum (floored), and Time — no health, a clock, a hand that sweeps and a knee a quarter turn; its running out is the win; its sounds (the rattle, the rain, the creak, DENIED's stamp, the tick). Every number a placeholder; nobody has played it. AUDIT parts nine and ten. |
| The habits | `src/data/items.ts` | G-052: four act-born items — Highlighter (College), Calendar Block (The Office), Strongly Worded Letter (Family), Nap (Decline) — each with paths, an icon and a verb; every number a placeholder. |
| The build sheet | `src/data/build-sheet.ts` | Pause shows what the life holds, paths and totals, in the cards' vocabulary. |
| Direction proposals | `DIRECTION-PANEL-2026-09-27.md` | Mined for G-038–G-040. Still usable: arrival toasts, per-act items, Time as Decline's boss. |
| Coherence pass | GitHub issue #5 | Landed: the misspelled name, the Egg's inheritance. Still open: the cowlick, the doorstep death. |

## Waiting on Justin — reactions, not values

Play the link once through (about twenty-six minutes; README's twenty-four
questions, 21–24 are this round's), or jump around it with `?review`, or try
Couch Potato or One Trick from the title. What felt wrong? In particular: does the Egg race feel like a
race; is School anything with a build carried in (no bot dies there any
more); the Gym Teacher, a fight or a chore; did being followed in
Adolescence feel like being looked at; did you notice you were paying in
College; did you feel counted in The Office, or was it just slower; did the
toddler read as a bib, and did being held by something pleased to see you
feel different; was The Mortgage a fight or a wait, and what did you do if
your build could not meet an instalment; did Decline feel like the first
act again, and was that the point; did the end feel like winning; did a
habit arrive and change how you played; did the papers between acts get
read or skipped; did the certificate land.

## The state on 2026-09-29

Read `CLAUDE.md`'s first section. The art is being rebuilt from generated
images: concept boards (`tools/art/boards/`) are generated by a cloud child
session with `huggingface.co` allowed, then a look is chosen with Justin,
then characters are regenerated through the pipeline. In parallel the feel
round (floors, shadows, camera, hit and kill feedback, thinner outline) goes
to the link. No more hand-drawn characters.

## Who holds what

| Step | Holder |
|---|---|
| Whatever Justin's play says — labelled numbers move only on a person's reaction | whoever he tells |
| Adolescence, College, The Office, Family, Decline redrawn in the greeting-card register (G-053), one act per session, the act's sprites together | unowned — next |
| A title-sized frame for the kid (AUDIT 158); the older field effects' paper fills to bone (AUDIT 153) | unowned, cosmetic |
| Service: the other branch at Prom's crossing (G-045), G-007's roster; then the choice itself — the last act PLAN.md names that does not exist | unowned — after a person has played the whole life |
| The Loan's opening balance on `taxStacks` rather than `dragStacks` (AUDIT seven, 50) | unowned, cosmetic |
| The bots' sidestep cancelling between two of Prom's ring spots (AUDIT part five, minor) | unowned |
| A cap on path cards per offer if three directions of one weapon reads as no choice | unowned — after Justin's reaction to question 9 |
| A phone type size for the play view — the offer cards are 4 CSS px upright (AUDIT 135); a narrow offer layout is a design change | unowned — after Justin has played on a phone |
| The bots park at a wall during Time (AUDIT 133): the hand column partly reads wall parking | unowned, instrument |

## The prompt for the next session

> Read CLAUDE.md, then HANDOFF.md. I played it (or jumped through it at
> `?review`): <reactions>. Take an unowned step, write your name against
> it here on `main` first, and end with something visible at the link.
> Ask me only reaction questions.
