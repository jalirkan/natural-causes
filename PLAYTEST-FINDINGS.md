# Playtest findings

Running record of what the automated bots measured and what it means for design.
**Newest first.** Written by the agent that ran the bots, for whoever decides.

## How to read this file

- **"Win" before 2026-09-27 means "killed the Egg in a life of one act".**
  A run is one life now (D-024); a win is outliving the last act.

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

# 2026-09-28 · Under rules — Couch Potato and One Trick. Presence only.

`pnpm playtest -- --runs=4 --rules=couch-potato` and `--rules=one-trick` (Conception, seeds
1000–1003, 48 runs each, twelve policies) at the round's integration branch, the kid's weapons in the
pool (G-054), before any person has played either life.

| rule | ended | reached the Egg | evolutions dealt |
|---|---|---|---|
| Couch Potato | Rival sperm 41, Someone else 6, The Egg 1 | 8 of 48 | — |
| One Trick | natural causes 14, Rival sperm and Someone else the rest | — | Jumpiness 9, Tantrum 1, Hindsight 1 |

Both lives run and end, which is all this asks. A bot that never moves dies to the rival sperm in
Conception almost every time, since the act is a race (G-040) and it cannot run it; whether a person
finds that funny or unplayable is question 24. Under One Trick the bots reach evolutions more often
than in a plain life, because every level goes into the one weapon. Bot policies that differ only in
their weapon priorities play identical lives on one seed under One Trick (AUDIT 159), so the agreement
the report shows is inflated. Nothing here is calibration.

---

# 2026-09-28 · After Decline — the whole life. Presence only.

`pnpm playtest -- --runs=8 --life` (seeds 1000–1007, 96 lives, twelve policies) at the integration
branch before its PR (`e91794d`), Decline in `ALL_ACTS`, Time's hand turning, the four act-born
habits in the pool. Time cannot be hurt, so its column reads seconds left, not health.

| policy | ended in | of |
|---|---|---|
| greedy-capacitation | decline 7, family 1 | natural causes 6, Time 1, The Mortgage 1 |
| personal-space+membrane, judgement+appetite, acrosome+midpiece | decline 6 each | natural causes 6 each; The Mortgage or Someone else for the rest |
| motility | decline 4, family 4 | The Mortgage 4, Time 2, natural causes 2 |
| midpiece+wake | family 4, conception 4 | The Mortgage 4, Someone else 3, Rival sperm 1 |
| the other seven arms | decline 2–5, the rest Family, Conception or Adolescence | natural causes; The Mortgage 1–4 each |
| uptake, habits | Highlighter 10, Calendar Block 1, Strongly Worded Letter 1, Nap 0 of 96 | |

Forty-six of ninety-six lives reached Decline and forty-three of those ended of natural causes at
eighty-four: the life is winnable by the bots, and the certificate the title promised is the common
ending for a build that gets past The Mortgage. Time killed three (the bots orbit inside its disc and
cross the hand, AUDIT nine, 119), and The Mortgage remains the life's wall: twenty-six lives ended
there, the same shape as the six-act run (79). Nothing else in Decline killed a bot, and every arm that
reached Time arrived with the file worn (knees among the stacks), which the bots feel and never read.
The habits are taken as the pool offers them — the Highlighter in one life in ten, the others once or
never, the Nap never — so their presence is established and nothing about them is measured. Nothing
here is calibration; the questions for a person are DECLINE-ROSTER §7's and README's 17 to 20.

*Amended 2026-09-28, later:* Time's three kills were the **INSTRUMENT** (AUDIT 119): the bots stood
off Time at weapon reach, inside its disc. Standing past the hand's reach (H2's `bossStandoff`) reads
Time 0 of 96 on the same seeds, and the phone's call, never credited before (AUDIT 86), now is.

---

# 2026-09-28 · After Family — the six-act life. Presence only.

`pnpm playtest -- --runs=8 --life` (seeds 1000–1007, 96 lives, twelve policies) at the integration
branch before its PR (`b64ca00`), Family in `ACTS`, The Mortgage paid in instalments, the bots walking
at the toddler. The papers are presentation and the bots never see them.

| policy | ended in | of |
|---|---|---|
| motility, greedy-capacitation, judgement+appetite | family 8 | natural causes 5–7, The Mortgage 1–3 |
| random (the blind control) | family 5, conception 3 | The Mortgage 4, Someone else 3, natural causes 1 |
| backhand+midpiece | family 6, conception 1, adolescence 1 | The Mortgage 4, natural causes 2, Someone else 1 |
| the other seven arms | family 4–7, the rest Conception's race or Adolescence | natural causes; The Mortgage 1–3 each; Someone else, Hormones |
| uptake, evolutions | Jumpiness 10, Vendetta 5, Reach 3, Tantrum 3, Hindsight 1, Rut 0 of 96 | |

Every life that reached Family (72 of 96) ended there, and for the first time since the Egg a boss ends
lives in numbers: 22 of the 72 died to The Mortgage's DUE, the blind control worst (4 of 5), which is the
shape AUDIT eight's 79 predicts — a build that cannot meet an instalment is refunded every window and
stands in the statement's fire until it dies. Nothing else in the act killed a bot: no bill, no phone, no
flat-pack, and the toddler held every bot it reached without ending one (AUDIT eight, 85). Worn stacks
at the Mortgage's arrival were 8–19 a life, letters among them, so the reach cost is a pressure the bots
felt and never read, as the tax and the pings were. The phone's hits are unreadable this round: the shot
log never credits a call (AUDIT eight, 86, INSTRUMENT). Nothing here is calibration; the question for a
person is FAMILY-ROSTER §7's, and README's sixteenth.

---

# 2026-09-28 · After The Office — the five-act life. Presence only.

`pnpm playtest -- --runs=8 --life` (seeds 1000–1007, 96 lives, twelve policies) at the integration
branch before its PR (`65b669b`), The Office in `ALL_ACTS`, The Reorg restructuring, the memo column
at 64px. The crossing papers are presentation and the bots never see them.

| policy | ended in | of |
|---|---|---|
| motility, greedy-capacitation, judgement+appetite | office 8 | natural causes 8 |
| acrosome+midpiece | office 7, conception 1 | natural causes 7, Someone else 1 |
| midpiece+wake | office 4, conception 4 | natural causes 4, Someone else 3, Rival sperm 1 |
| the other eight arms | office 4–6, the rest Conception's race or Adolescence's hormones | natural causes; Someone else, Hormones, one Group chat |
| uptake, evolutions | Jumpiness 10, Vendetta 6, Reach 3, Tantrum 3, Hindsight 1, Rut 0 of 96 | |

Every life that reached The Office (72 of 96) ended there of natural causes at thirty-four: no bot died
to a ping, a meeting, a review or The Reorg, which says the placeholders let a build carried from
Conception through, not that they are right. The review's rating landed on every arm (1–10 hits of
3–28 seen), so the cut to the level bar is a pressure the bots took and never read, as tuition's tax
was. Every death in the life still falls in Conception's race (18 lives never crossed) or Adolescence,
so the last three acts are, to the bots, a corridor with a boss at the end of each. The memo column
went from 36 to 64px before this run because a 36px column left no gap to stand in (AUDIT seven, 46);
that is a builder's reading, not a calibration. The question for a person is OFFICE-ROSTER §7's.

---

# 2026-09-28 · After College and the evolutions — the four-act life. Presence only.

`pnpm playtest -- --runs=8 --life` (seeds 1000–1007, 96 lives, twelve policies) at the integration
branch before its PR (`9b92032`), College in `ALL_ACTS`, The Loan fighting, six evolutions in.

| policy | ended in | of |
|---|---|---|
| motility, greedy-capacitation, judgement+appetite | college 8 | natural causes 8 |
| acrosome+midpiece | college 7, conception 1 | natural causes 7, Someone else 1 |
| the other eight arms | college 4–6, the rest Conception's race or Adolescence's hormones | natural causes; one Group chat, one Group project in College's own runs earlier |
| uptake, evolutions | Jumpiness 10, Vendetta 6, Reach 3, Tantrum 3, Hindsight 1, Rut 0 of 96 | |

Every arm finished eight four-act lives and every life that reached College ended there of natural
causes at twenty-two: no bot died to The Loan or its act once its behaviour landed, which says the
placeholders let a build carried from Conception through, not that they are right. In the act alone
(the data agent's run, 40 runs), three of ten arms lost one life each to The Loan's fan before its own
behaviour existed, and the registrar's forms landed (13 of 34 seen on one arm). Tuition stacks worn on
arrival at The Loan were 11–20 per life, so the tax is a pressure the bots feel and never read. The
evolutions are reached rarely because a path card competes with the weapon's own card for the same
slot (G-043's placeholder cap); question 12 asks a person, not the bots. Nothing here is calibration.

---

# 2026-09-28 · After G-043 and G-044 — paths, stat lines, three archetypes. Presence only.

`pnpm playtest -- --runs=8 --life` (seeds 1000–1007, 80 lives, ten policies) at `dd522c0`, the merged
branch before its PR. Three new arms take the three new weapons and one path each; every older arm
names one path of its weapon right after it (`bots.ts`).

| policy | ended in | of | took its path |
|---|---|---|---|
| personal-space+membrane | adolescence 6, conception 2 | natural causes 6, Someone else 2 | yes |
| backhand+midpiece | adolescence 7, conception 1 | natural causes 6, Someone else 1, Group chat 1 | yes |
| judgement+appetite | adolescence 8 | natural causes 7, Hormones 1 | yes |
| the seven older arms | as the entry below, within noise | Someone else remains the Conception death | yes, each |

Every one of the ten policies finished eight lives without a crash, and every arm's first-named path
was taken in its lives (a throwaway probe on the same seeds; the report does not yet print paths).
Uptake over the life: Backhand 84%, Personal Space 83%, Judgement 71% of 80 lives, all three above
the older weapons, which says only that they are in the pool from conception and get offered, not
that any of them is good. Tantrum fell to 3 of 80 lives (it was 0 of 28 in the paths agent's own run):
path cards now compete with Temper's level cards for the same offer slots, which is a reaction
question for Justin — does the evolution still arrive when it should? — and not a number to move.
Judgement is the first weapon on the world's shared dice, so a seed's spawn angles and later rolls
differ once it is held; the bots and the browser still agree, since both run `world.ts`. Nothing here
is calibration (G-026, G-027): the arms establish that the paths roll, the cards choose, the three
modes kill, and a life still ends on the certificate.

---

# 2026-09-28 · After the shield-reading bots and AUDIT five — endings, inheritance, two shields. Presence only.

`pnpm playtest -- --runs=16 --life` (seeds 1000–1015, 112 lives), `--runs=12 --act=school` and
`--runs=12 --act=adolescence` (84 runs each), all at `f28f45d`, sim clean (the tree's only edits
are scene files the bots do not import). The life's per-boss splits come from a scratch replay
probe that matched all 112 lives.

| policy | outlived Adolescence (95% CI) | Conception deaths | School · Adolescence deaths | inherited C·P·S | School alone, deaths of 12 | Adolescence alone, deaths of 12 |
|---|---|---|---|---|---|---|
| midpiece+wake | 56% [33–77] | Rival sperm 5, Someone else 2 | none | 3·4·2 | none | Hormones 2, Group chat 1 |
| membrane+acrosome | 63% [39–82] | Someone else 6 | none | 2·2·6 | none | Hormones 10, Prom 1 |
| motility | 100% [81–100] | none | none | 7·5·4 | none | Hormones 11, Group chat 1 |
| greedy-capacitation | 69% [44–86] | Someone else 2, Rival sperm 2 | 0 · Hormones 1 | 4·3·5 | Clique 1 | Hormones 6, Group chat 1 |
| acrosome+midpiece | 69% [44–86] | Someone else 5 | none | 3·4·4 | none | Hormones 7, Group chat 1 |
| grudge+group-chat | 81% [57–93] | Someone else 2 | 0 · Hormones 1 | 4·4·6 | none | Hormones 11, Group chat 1 |
| random | 81% [57–93] | Rival sperm 2, Someone else 1 | none | 6·3·4 | Clique 1 | Hormones 6, Group chat 4 |
| **all** | 74% [65–81] | Someone else 18, Rival sperm 9 | 0 · Hormones 2 | 29·25·31 | Clique 2 (of 84) | Hormones 53, Group chat 9, Prom 1 (of 84) |

Lives end in Conception (27 of 112) or at eighteen: no life with a carried build dies in School
(0 of the 85 that crossed, [0–4%]) and 83 of the 85 outlive Adolescence, the other two dying of
Hormones at 17.0 and 17.2, while alone School kills 2 of 84 and Adolescence 63 of 84. All three
rolls are dealt and no ordering shows: all 29 Constitution lives reach eighteen, but so do 24 of
25 Precocity and 30 of 31 Sensitivity, so with nearly every crossed life at the ceiling its end
cannot tell the rolls apart. Every shielded fight ends and none reaches the 120s cap: alone the
Gym Teacher's shield is up 1421 of 1712 fight-seconds (78–90% for the hunters, 95% for the blind
control; median fights 12.6–29.0s), in the life 423 of 518s (median fight 2.8s), and Prom's is
up 10 of 58s over the 22 fights Adolescence alone reached and 25 of 68s over the life's 83
(median fight 0.7s). Growth Spurt and Snooze are taken by every policy wherever Adolescence is
reached (35 and 36 of 84 alone, 41 and 43 of the 85 crossed lives), rarest after Tantrum by the
priority lists; Prom's light is seen alone, where 'boss' shoots at four policies (4 hits of 20)
and kills one bot, but in the life it fired one ring in 83 fights, the build dropping Prom before
the lights go down. At the link, live to Prom: did it fall before the lights went down, and did
SMILE land as the ending you earned or as a fight you skipped?

**INSTRUMENT.** The life's shield table pools the Gym Teacher with Prom and its aimed-shot 'boss'
pools the Egg's volley with Prom's light; both were split here by the probe, not the report.

---

# 2026-09-28 · The first three-act life — Conception, School, Adolescence. Presence only.

`pnpm playtest -- --runs=16 --life` (seeds 1000–1015, 112 lives) at `9bfabc6`, sim clean;
`--runs=12 --act=adolescence` (84 runs) at `39f1869`, `world.ts` and `acts.ts` **mid-edit**:
Prom's own behaviour was being built, so the life meets the Egg standing in for Prom and the
alone run may predate Prom's finished kind. Timings, spawns, hurts: replay probes, all matched.

| policy | outlived Adolescence (95% CI) | median age | ended in | Conception deaths | Adolescence deaths | Adolescence alone, deaths of 12 |
|---|---|---|---|---|---|---|
| midpiece+wake | 69% [44–86] | 18 | conception 5, adolescence 11 | Rival sperm 4, Someone else 1 | none | Group chat 6, Hormones 4 |
| membrane+acrosome | 56% [33–77] | 18 | conception 7, adolescence 9 | Someone else 6, Rival sperm 1 | none | Hormones 11 |
| motility | 88% [64–97] | 18 | conception 1, adolescence 15 | Rival sperm 1 | Hormones 1 | Hormones 11, Group chat 1 |
| greedy-capacitation | 75% [51–90] | 18 | conception 4, adolescence 12 | Rival sperm 3, Someone else 1 | none | Hormones 7, Group chat 1 |
| acrosome+midpiece | 69% [44–86] | 18 | conception 5, adolescence 11 | Someone else 5 | none | Hormones 11, Someone else 1 |
| grudge+group-chat | 13% [3–36] | 0 | conception 10, adolescence 6 | Someone else 8, Rival sperm 2 | Hormones 4 | Hormones 12 |
| random | 56% [33–77] | 18 | conception 6, adolescence 10 | Rival sperm 3, Someone else 3 | Hormones 1 | Hormones 11, Group chat 1 |
| **all** | 61% [51–69] | 18 | conception 38, adolescence 74 | Someone else 24, Rival sperm 14 | Hormones 6 | Hormones 67, Group chat 9, Someone else 1 (of 84) |

No life ends in School (0 of the 74 that crossed the Egg, [0–5%]); 68 of those 74 outlived
Adolescence, ending on a level 36–48 build against 6–24 for the act played alone from level
1, and the six that did not died of Hormones at 15.5–17.1. "Someone else" is still 24 of
Conception's 38 deaths, but none comes one step after the Egg: replayed at a clean `9bfabc6`
with the spawn probed, the Egg-to-certificate gap is 0.38s at least, 1.61s median and 9.20s
at most, 5 of 24 under a second, where the last entry had 12 of 31 at 0.02s (Adolescence
alone adds one at Prom's race, 1.42s after it arrived). In Adolescence alone Hormones kill
67 of 84 and the group chat 9, and aimed pressure is present and is the group chat's (649
shots came at a bot, 118 hit, the blind control 15 of 32, a larger share than any
sidestepping policy; Prom's mid-edit shot 3 of 6 in the 8 runs that reached 240s), while the
standardised test and driver's ed kill nobody: in the life they spawned in 71 and 69 of 74
Adolescences and never hurt a bot, against 838 hurts from hormones and 289 from the group
chat. All twelve cards are taken over the life, rarest first and shaped by the policies'
priority lists: Tantrum 28%, Temper 58%, Stubbornness 75%, Late Bloomer 79%, Appetite 80%,
Baggage and Thick Skin 81%, Charisma 82%, Grudge 84%, Gossip 86%, Restlessness 90%, Reflex
past level 1 95%. At the link, play Conception to the Egg with the crowd on you: when the
certificate says "Someone else", had you seen the crowd part and the Egg sit there first,
and did losing the race land as the joke?

**INSTRUMENT.** The life's aimed-shot table pools all three acts, so Adolescence's shots are
read from its own run; "how it ended" prints median age unrounded (15.149999999999999).

---

# 2026-09-27 · The life after the merge — the race, the substitute. Presence only.

`pnpm playtest -- --runs=24 --life` (seeds 1000–1023, 168 lives) and
`pnpm playtest -- --runs=16 --act=school` (112 runs, fresh build), both at
`5829a0c`, clean tree. Seven policies now, so rows do not line up with below.

| policy | outlived School (95% CI) | median age | ended in | Conception deaths | School alone, deaths of 16 |
|---|---|---|---|---|---|
| midpiece+wake | 71% [51–85] | 12 | conception 7, school 17 | Someone else 5, Rival sperm 2 | Substitute teacher 1 |
| membrane+acrosome | 58% [39–76] | 12 | conception 10, school 14 | Someone else 8, Rival sperm 2 | none |
| motility | 88% [69–96] | 12 | conception 3, school 21 | Rival sperm 3 | Substitute teacher 1, Clique 1 |
| greedy-capacitation | 67% [47–82] | 12 | conception 8, school 16 | Someone else 4, Rival sperm 4 | Substitute teacher 1 |
| acrosome+midpiece | 79% [60–91] | 12 | conception 5, school 19 | Someone else 5 | Substitute teacher 1 |
| grudge+group-chat | 54% [35–72] | 12 | conception 11, school 13 | Someone else 8, Rival sperm 3 | Substitute teacher 2, The Gym Teacher 1 |
| random | 79% [60–91] | 12 | conception 5, school 19 | Someone else 1, Rival sperm 4 | Clique 2 |
| **all** | 71% [64–77] | 12 | conception 49, school 119 | Someone else 31, Rival sperm 18 | Substitute teacher 6, Clique 3, The Gym Teacher 1 (of 112) |

Every life ends, at a median age of 12 in every policy: all 49 deaths are in
Conception, and every life that cleared the Egg outlived School (119 of 119,
[97–100%]), crossing on a level 23–43 build and a full heal. The substitute
teacher is therefore on no life certificate, but on School alone it is now that
act's commonest killer, 6 of 10 deaths, each after 250s and so behind its 220s
entry; the hall monitor and the dodgeball are on no certificate in either run,
and homework cannot be, since it deals no damage. All twelve cards are taken;
over the life, rarest first (shaped by the policies' priority lists, so presence
and not preference): Tantrum 17%, Temper and Appetite 66%, Stubbornness 70%,
Baggage 73%, Group Chat and Charisma 75%, Grudge 76%, Late Bloomer 82%,
Restlessness 84%, Thick Skin 85%, Reflex past level 1 95%. The race moved
Conception's ending to the Egg: "Someone else" is 31 of its 49 deaths (the 18
Rival sperm deaths are all before 222s), and in 12 of the 31 the Egg appeared on
a crowd already holding 60 or more rivals inside its corona, so the life ended
one step (0.02s) after it spawned, untouched; all 31 replay identically at
`5829a0c` with the race probed, so it is the sim's rule meeting the bot's crowd,
and how dense a person's crowd is at 300s decides whether they ever meet it. At
the link, play Conception to 300s with the crowd on you: did you see the Egg
before the certificate said "Someone else", and did that land as the joke or as
the game breaking?

---

# 2026-09-27 · The first life — Conception into School. Presence only.

`pnpm playtest -- --runs=16 --life` · seeds 1000–1015 · 80 lives, checked
against `pnpm playtest -- --runs=16`. A win is outliving School.

| policy | win rate (95% CI) | median age at end | ended in | top two causes |
|---|---|---|---|---|
| midpiece+wake | 31% [14–56] | 0 | conception 11, school 5 | Rival sperm 9, natural causes 5 |
| membrane+acrosome | 38% [18–61] | 0 | conception 10, school 6 | Rival sperm 6, natural causes 6 |
| motility | 13% [3–36] | 0 | conception 14, school 2 | Rival sperm 13, natural causes 2 |
| greedy-capacitation | 63% [39–82] | 12 | school 10, conception 6 | natural causes 10, Rival sperm 6 |
| random | 38% [18–61] | 0 | conception 10, school 6 | Rival sperm 9, natural causes 6 |

Both acts are provisional (Conception's drag, cadence and boss HP; School's
whole schedule and its stand-in boss), and so is the full heal at the
threshold, so nothing here is a calibration. Every run that cleared the Egg
went on to School and outlived it, 29 of 29 [88–100%], which makes the life's
win rate exactly Conception's win rate alone, seed for seed. Nothing ends a life
in School, 0 of 29 [0–12%]: no School enemy appears on any of the 80
certificates, and neither does its boss (the Egg standing in, certified as The
Gym Teacher), because the Conception build carries over (level 18–38 at the
finish) and the threshold restores full health. Every policy gets through both
acts at least once, with greedy-capacitation ahead of motility on intervals that
do not overlap and the rest overlapping, and all 51 deaths are in Conception,
43 of them to Rival sperm. Before playing the two-act life, expect it to be
decided at the Egg, since no bot died after it; the reaction worth bringing
back from School is whether it asked anything of you at all.

**INSTRUMENT.** Every 300s column matches the Conception-only run on all 80
seeds, and every Conception death has the same act, cause and second. Two
figures printed in the Conception sections do not match. `median@death` reads
stacks at the end of the life, and the threshold clears them, so all 29 School
finishes read 0 (greedy-capacitation drops from 34 to 0). The chemotaxis
correlation compares item levels at the end of the life with stacks at 300s,
so picks made in School leak into it (18 runs changed; r goes from 0.64 to
0.74). In a life, read both from the Conception-only run.

---

# 2026-09-27 · School — first run. Presence and ordering only.

`pnpm playtest -- --runs=16 --act=school`. The schedule is provisional (D-022)
and the boss is the Egg standing in, so the only claims here are that the act
runs, everything in it arrives, and roughly how it lands on a bot — a bot
playing Conception's five item policies, since School defines no items.

| policy | win rate (95% CI) | median s | reached 300s | HP at 300s, survivors | enemies alive at 300s |
|---|---|---|---|---|---|
| midpiece+wake | 88% [64–97] | 305 | 15/16 | 91% | 370 |
| membrane+acrosome | 75% [51–90] | 321 | 12/16 | 74% | 351 |
| motility | 56% [33–77] | 311 | 12/16 | 90% | 290 |
| greedy-capacitation | 94% [72–99] | 309 | 16/16 | 96% | 341 |
| random | 75% [51–90] | 306 | 13/16 | 80% | 286 |

All five School enemies spawn, in §3.6's order, and the run is deterministic
(tests in `school-act.test.ts`). Twelve of eighty runs die in the crowd phase;
the rest reach the boss with most of their health, against an act that has no
ranged pressure because the substitute's attack is not built. That is the
reading a person should have in mind before playing it; it is not a number to
tune against. The report skips the antibody sections for an act without the
stream, and says so.

**INSTRUMENT.** The first draft of this entry read 82–99% HP on arrival and
"barely hurts a bot". `summarise` took the arrival medians over every run, and
a run that died before 300s kept its starting values — HP 1.0, no enemies — so
a death counted as a healthy arrival. It is the defect `reached300` fixed for
the stacks in Run 6, one column over, and it was found by review rather than by
a test. Arrival figures are now over survivors only, with the count alongside;
every earlier "HP on arrival" figure for a policy that lost runs before 300s
was biased toward healthy.

---

# 2026-08-01 · Run 7 — BLOCKED on §11.5. Shapes implemented, no run.

Per §11.6: two shapes in, both values placeholders, no bots run. One genuine
result, and it has a structural consequence §11.5 cannot resolve.

## What was implemented

**G-025 — the drag curve.** `antibodyDragFor(n) = FLOOR + (1 − FLOOR) / (1 + kn)`.
The floor is an asymptote on resulting speed, never a clamp on stack count.
Marginal drag is strictly positive at every count. `ANTIBODY_FLOOR` stays at 0.65
and is labelled in the source as **the retired safety-valve value from §7.5, not
a design choice**.

**§11.4 — decision cadence.** The first-order lag is gone. The bot holds a chosen
direction for a placeholder 200ms, with one interrupt: **re-evaluate immediately
on taking damage.** No threshold, no other interrupt, no new tuning parameter.
Antibodies deal zero damage and never trigger it, which is intended.

One consequence worth knowing rather than a defect: the white cell's engulf deals
damage over its full 0.9s, so it re-decides every frame for that window. Still
"reacts to being damaged", but continuous rather than discrete.

## The result: §8.4's dispersion is evaluable again, and it does not pass

Read on arm C, the Run 6 arm with survival intact — careful 24.6 stacks
(`midpiece+wake`), careless 61.8 (`random`).

| | careful | careless | ratio |
|---|---|---|---|
| raw stack counts | 24.6 | 61.8 | 2.51× |
| **experienced drag, old clamp** | 35.0% | 35.0% | **1.00×** |
| **experienced drag, new curve** | 14.9% | 22.7% | **1.53×** |

The old clamp is confirmed exactly as §11.2 predicted: both terms above it, both
arriving at the same speed, dispersion **1.00×** while the criterion reported
2.51× and passed.

The curve makes it evaluable. **It reads 1.53× against a required 2.0×, so the
condition now fails.** That is a genuine result.

> **Corrected 2026-08-01 (§12.1).** This entry originally said the failing
> dispersion agreed with §11.2's floor argument "from an independent direction".
> It cannot. The floor cancels out of the ratio — proved algebraically below and
> asserted by a test — so a dispersion figure carries no information about the
> floor whatsoever. Two arguments concluding that the current settings are wrong
> for causally unrelated reasons is a coincidence, not corroboration, and filing
> it as mutual confirmation is how a project ends up with two beliefs propping
> each other up and nothing underneath. The error was mine and it was in the
> same entry that proved why it was an error.

The tail is also fixed. Marginal cost of the *n*th stack:

| n | new curve | old clamp |
|---|---|---|
| 5 | 0.815% | 2.329% |
| 17 | 0.470% | 1.342% |
| 30 | 0.296% | **0.000%** |
| 76 | 0.098% | **0.000%** |

## The structural consequence — §11.5 cannot fix the dispersion

**The floor does not move the experienced dispersion ratio at all.**

| floor | careful | careless | ratio |
|---|---|---|---|
| 0.65 | 14.9% | 22.7% | 1.530× |
| 0.50 | 21.2% | 32.5% | 1.530× |
| 0.45 | 23.4% | 35.7% | 1.530× |
| 0.35 | 27.6% | 42.2% | 1.530× |
| 0.20 | 34.0% | 52.0% | 1.530× |

Algebraically: `drag(n) = (1 − floor) · kn/(1 + kn)`, so the floor is a scale
factor that cancels out of any ratio. There is a test asserting this.

`k` is the lever that moves it, in the opposite direction to intuition — *lower*
k means less curvature, so the experienced ratio approaches the raw stack ratio:

| k | dispersion |
|---|---|
| 0.100 | 1.211× |
| 0.030 (current) | 1.530× |
| 0.015 | 1.785× |
| 0.007 | 2.056× |
| 0.003 | 2.276× |
| k → 0 | 2.512× (the raw stack ratio) |

**So floor and k are orthogonal levers with different jobs.** The floor sets how
much the drag hurts. `k` sets how much play matters. §11.5's session is about
severity — "do you notice you are slower", "can you say when it started" — and
will settle the floor. It will not touch dispersion, because a person cannot feel
a ratio between two counterfactual runs.

That is not an argument for picking `k` from a bot number. It is an argument that
§8.4's dispersion condition is waiting on a lever nobody has assigned an owner to,
and that assigning one is a §12 question.

## Not done, deliberately

No Run 7. No tuning. Nothing read against arm D's win rates. Both remaining
values wait on §11.5.

## Decisions wanted — both answered in §12

1. ~~Who owns `k`?~~ **Justin (G-028).** The premise that a person cannot feel a
   ratio was right; the conclusion did not follow. `k` sets curvature, and
   curvature has a single-run signature — *when the drag becomes noticeable and
   when it stops growing* — which one person feels in one sitting. §3.3 stated
   its requirement in exactly that form: "by minute four the player is moving
   visibly slower" is a claim about a trajectory, and the floor cannot express
   it.
2. ~~Does the dispersion condition survive?~~ **Retired (G-027)**, and not for
   being stale. 2.0× and §3.3's severity intent cannot both be satisfied under
   this curve family: the `k` that reaches 2.0× caps the worst achievable drag
   at 30.2%, below the 35% already judged too generous. It was a second design
   constraint competing with the first and winning by construction because it
   was written down as a test. The bot keeps the ordinal claim — careless
   strictly more than careful, stable across seeds — which holds at 1.53×.

---

# 2026-08-01 · Run 6 — instrument re-baseline. No design changes.

Four arms: control, inertia only, threat weighting only, both. Two item strings
lifted (§10.2, §10.3) — data, no behaviour.

## The short version

1. **All three §10.7 predictions confirmed in direction**, and §10.1's floor claim
   is confirmed emphatically. Stacks do not fall; they rise by 5–10× under threat
   weighting alone and 10–25× under both.
2. **The two changes have cleanly separable effects.** Threat weighting drives the
   stacks. Heading inertia drives the difficulty. Neither does much of the
   other's job, which is what the two arms were for.
3. **The re-baselined table is not usable as an absolute measure.** The bot now
   dies at 124–232s against 306–346s before, and most policies never reach the
   boss at all. The direction is trustworthy; the levels are not.
4. **§7.5's stack cap now saturates in normal play** rather than acting as a
   safety valve, and everything past roughly 17 stacks is inert.
5. The inertia model is a first-order lag, which is **vehicle turning, not human
   decision-making**, and its time constant has never been validated against a
   person. That is my judgement of my own implementation, not a measurement.

## The four arms

| | A · control | B · inertia | C · threat | D · both |
|---|---|---|---|---|
| midpiece+wake | 100% | 0% | 44% | 0% |
| membrane+acrosome | 38% (22%) | 6% (74%) | 25% (79%) | 19% (31%) |
| motility | 63% | 25% (57%) | 81% | 13% |
| greedy-capacitation | 94% | 56% | 81% | 19% (3%) |
| random | 75% | 19% (75%) | 81% | 31% |
| turn rate, rad/s | 52–74 | 2.3–2.6 | 27–45 | 2.1–2.3 |
| mean stacks at 300s | 2.5–8.4 | 0–12.6 | **24.6–61.8** | **48–76** |
| median survival, s | 306–346 | 166–314 | 305–322 | 125–232 |

Boss HP remaining in brackets where it is not 0%.

**Arm A reproduces Run 5 exactly** — 100 / 38 (22%) / 63 / 94 / 75. That is the
control doing its job, and it took a correction to get: my first attempt changed
the degenerate case, where the repulsion vectors cancel, from "snap to +x" to
"hold the last heading". That is part of the inertia change and it belongs behind
the inertia flag, not in the control. Caught because the arm did not reproduce.

## The decomposition

**Threat weighting is the stack driver.** Arm C raises mean stacks from 2.5–8.4 to
24.6–61.8 — five to ten times — while leaving win rates in the same region as the
control (44–81% against 38–100%). Once the bot stops fleeing a 0-damage enemy as
hard as it flees a 14-damage one, it simply walks through every antibody placed in
front of it. This is the artefact from Run 5 quantified: the defensive screen was
worth most of the mechanic.

**Heading inertia is the difficulty driver.** Arm B collapses win rates (0–56%)
while raising stacks only moderately. A bot that commits to a direction gets
cornered by a horde that converges from every side, and `midpiece+wake` — whose
whole identity is kiting — goes to 0% and stops reaching the boss.

They compound in arm D rather than cancelling.

## §10.7's predictions

| prediction | result |
|---|---|
| Stacks rise for every policy | **Confirmed.** 5–10× on threat alone, 10–25× on both |
| `midpiece+wake`'s 100% falls | **Confirmed.** 100% → 0%, and it stops reaching the boss |
| `membrane+acrosome`'s 22% rises | **Confirmed.** 22% → 31% (D), 74–79% (B, C) |
| **Falsifier:** stacks fall under a bot that holds a heading | **Did not fire.** They rise sharply. §10.1's floor claim stands and `G-020` does not reopen |

The floor claim was right and understated. The bots were not reading a little low;
they were reading an order of magnitude low.

## What the re-baseline cannot give you

**An absolute table.** In arm D only 0–7 runs of 16 per policy reach the 300s mark,
and `midpiece+wake` reaches it zero times out of sixteen. Boss participation
numbers over a handful of survivors are not comparable to numbers over sixteen,
and §9.5's 40% threshold cannot be evaluated against them at all.

**A dispersion figure.** §8.4's careless-≥-2×-careful condition is undefined in
arm D, because the careful policy has no runs at the measurement point. In arm C,
where survival is intact, it is 61.8 against 24.6 = **2.5×**, so the condition
still passes on the arm that can express it.

I also had to fix a measurement defect of my own before any of this was legible:
`stacksAt300` kept its initial value of 0 for runs that ended before 300s, so a
table of medians read 0 while the means read 20–28. Stack statistics are now
computed over survivors only, with the surviving count reported alongside.

## The part I am least confident in, which is mine

The inertia model is a first-order lag on heading with a 0.22s time constant. It
took the turn rate from 52–74 rad/s to 2.2, which is the right order of magnitude
for a person. But a lag is the wrong *shape*: it models something with a turning
circle, and reversing direction under it takes several time constants. A human on
a keyboard reverses instantly — what a human does not do is oscillate at 60Hz.

The better model is probably **decision cadence**: re-evaluate the desired
direction every 150–250ms and hold it in between, so heading changes are instant
but infrequent. That produces a stable heading without a turning circle, and it
would very likely recover much of the survival that arm D lost.

So: arm D is honest about antibody arrival and probably unfair about difficulty.
The stack findings are safe in direction and magnitude; the win rates are not, and
I would not tune anything against arm D's survival numbers.

## Re-read, not re-decided (§10.7)

- **§9.5's 40% threshold** — cannot be evaluated. `membrane+acrosome` reads 31% in
  arm D and 74–79% in B and C, all over too few survivors to compare against a
  threshold set on sixteen.
- **`G-022`'s 22%** — was optimistic, as §10.5 predicted. Every arm moves it up.
- **§8.4 dispersion** — holds at 2.5× on the arm that can express it.
- **`random`'s 75%** — 19% (B), 81% (C), 31% (D). Moves in both directions
  depending on which fix is applied, so §8.6's question is not settled by this.
- **§7.5's cap** — now the binding constraint. `antibodyDrag` floors at 0.65,
  reached at about 17 stacks; the re-baselined bot carries 48–76. Under an honest
  instrument the mechanic saturates around minute four and every stack after that
  is decoration. That was a safety valve and it is now a design surface.

## Decisions wanted

1. **The inertia time constant needs a shape, not a number.** A first-order lag
   may be the wrong model of a player entirely. This is an instrument decision
   with design consequences and I would rather not pick it alone.
2. **§7.5's cap saturating** is the one thing here that looks like it needs a
   ruling rather than a re-read.
3. **Whether any absolute threshold survives.** Two runs in a row have moved every
   movement-dependent number. §9.5's 40% and §8.4's dispersion figure were both
   set against instruments that have since changed twice.

---

# 2026-08-01 · Run 5 — diagnostic. No design changes.

Two questions, per §9.5. Both answered. Both answers are different from the ones
§9.3 expected, and both turn out to rest on the instrument rather than the design.

## The short version

1. **Neither volatility nor speed buys the dodge. Chemotaxis does** — it pulls
   antibodies onto the player. §9.3's mechanism is not supported and §9.3
   reopens, but not in the direction it anticipated.
2. **§9.3's volatility hypothesis cannot be tested with this bot**, and the reason
   matters more than the result: the bot has no stable heading to make stale.
3. **`midpiece+wake`'s stacks tripled rather than halved** — 0.9 → 2.6 — and it
   still went 69% → 100%. The expected explanation is wrong in direction.
4. The real swing is **HP on arrival at the boss: 52% → 66%**, and the cause is
   the bot fleeing a harmless enemy.
5. Membrane's corrected `tradesAway` is lifted. Data only, no behaviour change.

## Q1 — what buys the dodge

### Correlations, lead arm, n=80

| pair | r | 95% CI | partial, holding speed |
|---|---|---|---|
| stacks vs heading-change rate | −0.399 | [−0.568, −0.196] | **−0.182** |
| stacks vs item speed (exogenous) | −0.382 | [−0.555, −0.178] | −0.133 (holding turn) |
| **stacks vs chemotaxis level** | **+0.462** | **[+0.269, +0.619]** | **+0.366** |

Speed is reported as *item* speed — the exogenous half. Correlating stacks
against realised speed is circular, because stacks are one of the things that
lower realised speed. That circular figure is −0.46 and means nothing.

**Group means: 6.7 stacks with Chemotaxis (n=38) against 3.3 without (n=42).**
Double, on one item.

### The intervention

Correlation could not separate volatility from speed, because the policy set is
collinear — the fast builds are also the kiting builds. So the arms were
separated by force: a heading-jitter arm rotates the bot's movement vector by a
normal deviate each step, which changes how much it turns and leaves the
magnitude exactly untouched.

| policy | turn rad/s (base → jitter) | stacks (base → jitter) |
|---|---|---|
| midpiece+wake | 69.1 → 73.8 | 2.6 → 2.6 |
| membrane+acrosome | 51.7 → 56.6 | 7.4 → 7.5 |
| motility | 62.7 → 67.5 | 4.0 → 3.4 |
| greedy-capacitation | 53.6 → 61.3 | 4.4 → 3.4 |
| random | 55.7 → 60.8 | 6.1 → 6.9 |

Turn rate up by 5–8 rad/s across the board, speed identical by construction, and
stacks moved by at most 1 with **no consistent direction** — two down, two up,
one flat. **Null.**

### Why the volatility hypothesis cannot be tested here

The measured turn rates are 52–74 radians per second. That is eight to twelve
full rotations every second. The bot's heading is not volatile, it is *thrashing*
— `decideMove` sums repulsion vectors that flip sign frame to frame, and the
result is nearly uncorrelated with itself between steps.

So for every policy, "spawn on the player's instantaneous heading" is already
"spawn at a random point 320px away". There is no stable heading to make stale,
and there is no headroom for the jitter arm to add. §9.3's mechanism may be
entirely right about a human and is untestable against this bot.

**This is the finding with the longest reach in the file.** A human player holds a
heading for whole seconds at a time. Against a human, G-020 places antibodies
much closer to where the player will actually be, and **every stack count in
Runs 4 and 5 is a floor rather than an estimate.** The band in §8.4 was
calibrated on bot numbers that understate the mechanic.

### What the mechanism actually appears to be

Chemotaxis drops an attractor that pulls nearby enemies toward a point.
`applyAttractors` does not exempt antibodies, so a player using Chemotaxis is
dragging them onto themselves. It survives controlling for speed (+0.366) and it
is the largest effect measured in either direction.

It also explains the pair the other hypotheses could not.
`membrane+acrosome` and `greedy-capacitation` have nearly identical item speed
(162.3 vs 161.8) and nearly identical turn rate (51.7 vs 53.6), and differ by 68%
in stacks — 7.4 against 4.4. The difference between those two policies is that
one takes Chemotaxis and the other does not.

This is §7.3's flagged unknown arriving: *"a player-placed attractor inside a
field that already attracts is either a genuinely interesting interaction or an
incoherent one, and I do not know which."* The Egg's field is gone, but the
interaction with the antibody is the live version of the same question, and it is
currently invisible to the player — nothing signals that the pull tool collects
the thing that cannot be shot.

## Q2 — why `midpiece+wake` went 69% → 100%

**Not the stacks, and not in the direction §9.3 expected.**

| | edge arm | lead arm |
|---|---|---|
| win rate | 69% | 100% |
| mean stacks at 300s | 0.9 | **2.6** |
| **HP on arrival at boss** | **52%** | **66%** |
| kills at 300s | 440 | 361 |
| enemies alive at 300s | 1498 | 1500 |

Stacks nearly **tripled** rather than halving. The swing is fourteen points of
health on arrival at the boss, and fewer kills getting there.

**The cause is the bot fleeing something harmless.** Antibodies are invulnerable
and deal zero contact damage, but `decideMove` repels from every enemy within
260px with no weighting by how dangerous it is — a 0-damage antibody pushes
exactly as hard as a 14-damage white cell. Under G-020 antibodies appear at 320px
instead of 780px, so there are many more harmless repulsors near the player, and
being pushed around by them incidentally keeps the bot away from the rivals,
spermicide and white cells that actually do damage.

G-020 accidentally handed the bot a defensive screen. A human would learn within
one run that antibodies do not hurt, and would stop avoiding them — or would
avoid them *for the stacks*, which is a different movement pattern entirely.

**INSTRUMENT.** Fourth occurrence in five runs. Not fixed in this pass: correcting
the bot's threat model changes every number in this file and needs its own control
arm, which a diagnostic pass should not spend unilaterally.

## What this does to the existing numbers

Both artefacts point the same way — the bots understate G-020 and flatter the
builds that generate the most antibodies near themselves. That does not overturn
anything already decided:

- `G-019` was scored on a control arm with spawns forced to the edge, where
  antibodies are far away and rare. Unaffected.
- `G-020`'s §8.4 verdict was *working*, and both artefacts suppress the mechanic,
  so the true effect is at least as large as measured. The direction of the
  verdict is safe; the magnitude is not.
- `G-022`'s `membrane+acrosome` at 22% is measured under a bot that gets a free
  defensive screen from the same enemy taxing it. The 22% is more likely
  optimistic than pessimistic, which matters for §9.5's 40% threshold.

## Decisions wanted

1. **Chemotaxis pulling antibodies** — intended, or an exemption? It is the
   largest measured driver of stacks, it is invisible to the player, and it makes
   the act's control item quietly the act's biggest liability. §7.3 flagged this
   interaction as unpredictable and it has now been measured.
2. **§8.4's 4–12 band was calibrated on bot numbers that understate the
   mechanic.** If a human holds a heading for seconds, the same lead distance
   produces materially more stacks. The band may need restating against something
   other than bot medians, or the lead distance re-derived once a human has
   played it.
3. **§9.3's volatility hypothesis is unresolved rather than refuted**, and cannot
   be resolved by this bot. It needs either a bot with heading inertia — which is
   an instrument change with its own control arm — or a human.

---

# 2026-08-01 · Run 4 — after G-019 (pull dropped) and G-020 (antibodies arrive ahead)

## The short version

1. **G-019 holds.** Its falsifier did not fire. Isolated, dropping the pull costs
   nothing: boss HP remaining stays at 0% and 5% for the two short builds, and
   the pull-0 arm reproduces exactly.
2. **G-020 works** by §8.4's corrected criteria — level condition met for four of
   five policies, dispersion 2.8× against a required 2.0×.
3. **§8.5's independence assumption is wrong.** G-020 moves the boss table. Read
   naively, Run 4 fires G-019's falsifier; the falsification belongs to G-020.
4. `random` fell from 94% to 75%, which bears on §8.6 and was not asked for.

## §8.5 said the two changes cannot confound each other. They do.

Run 4 as first measured, both changes live:

| policy | win rate | boss left |
|---|---|---|
| midpiece+wake | 100% [81–100%] | 0% |
| membrane+acrosome | 38% [18–61%] | **22%** |
| motility | 63% [39–82%] | 0% |
| greedy-capacitation | 94% [72–99%] | 0% |
| random | 75% [51–90%] | 0% |

22% is above §8.5's 20% threshold, which as written means "`G-019` is wrong and
the pull was doing work the A/B did not capture."

It is not. A control arm — pull still 0, antibodies forced back to the arena
edge — reproduces the earlier pull-0 numbers **exactly**:

| policy | Run 4 (lead) | control (edge) | pull-0 arm, Run 3 |
|---|---|---|---|
| midpiece+wake | 100% / 0% | 69% / 0% | 69% / 0% |
| membrane+acrosome | 38% / **22%** | 50% / **5%** | 50% / **5%** |
| motility | 63% / 0% | 56% / 0% | 56% / 0% |
| greedy-capacitation | 94% / 0% | 100% / 0% | 100% / 0% |
| random | 75% / 0% | 94% / 0% | 94% / 0% |

**The mechanism.** Antibody stacks are a speed tax. Every build's boss
performance depends on speed — reaching the Egg, holding a working distance,
leaving a ring. Membrane is already a speed cost by design, and membrane+acrosome
now carries the most stacks of any policy (mean 7.4, p90 15). The two compound on
the one build with the least speed to spare, so moving where antibodies arrive
moved the boss table.

Worth carrying: **an enemy that taxes a movement stat is never independent of a
fight decided by movement.** Nothing about the boss changed in this pass and the
boss result still moved.

## `G-019` scored against §8.5

Using the control arm, which is the arm that isolates it.

| prediction | measured | verdict |
|---|---|---|
| Boss HP remaining stays 0–5% for both short builds | 0% and 5% | met |
| **Falsifier:** either short build above 20% | 0% and 5% | did not fire |
| Mean win rate ≈ 74% | 73.8% | met |
| Spread ≈ 50pp | 50pp | met |

The reproduction check passes to the point of identity — the control arm and the
Run 3 pull-0 arm agree on every policy, every boss figure and every win rate.
That is what a deterministic simulation with one changed constant should look
like, and it is the cheapest available evidence that nothing else drifted.

## `G-020` scored against §8.4

Antibody stacks at 300s. The distribution, not the median.

| policy | median | p90 | mean |
|---|---|---|---|
| midpiece+wake | 2 | 4 | 2.6 |
| membrane+acrosome | 8 | 15 | 7.4 |
| motility | 4 | 6 | 4.0 |
| greedy-capacitation | 4 | 7 | 4.4 |
| random | 5 | 11 | 6.1 |

- **Level condition** (median in 4–12): met for four of five. `midpiece+wake` sits
  at 2, below the band.
- **Dispersion condition** (careless ≥ 2× careful): **2.8×**, from 7.4 against
  2.6. Met.

**Verdict: working.** Neither §8.4 failure signature is present — not "absent"
(medians 4–8 across most policies, p90 up to 15) and not "undodgeable" (the
policies separate cleanly).

`midpiece+wake` under the band looks like the mechanic behaving rather than
failing: it is the speed build, it dodges best, and it carries a third of what
the slowest build carries. That is play affecting the outcome, which is the
property §8.4's dispersion condition exists to detect. Whether a build should be
able to opt out this cheaply is a design question, not a measurement one.

§8.4's instruction to report the distribution was load-bearing. On medians alone
`midpiece+wake` reads 2 and `membrane+acrosome` reads 8; the p90s are 4 and 15,
which is where the severity actually lives.

## Not asked for, relevant to §8.6

`random` fell from **94% [72–99%] to 75% [51–90%]** and the build spread widened
from 50pp to 62pp. G-020 made choices matter more, which is the direction §8.6
wanted `random` to move. Not actioned and not a claim — the intervals overlap and
one run does not settle it.

## Decisions wanted

1. **§8.5's independence assumption needs replacing**, and the general form is
   more useful than the specific correction: a change to an enemy that taxes
   movement is not separable from a fight decided by movement. Future
   multi-change passes want a control arm rather than an assumption.
2. **Is `midpiece+wake` at median 2 acceptable?** The speed build can nearly opt
   out of the act's one inevitability. Lead distance is the dial, and shortening
   it raises every policy rather than just that one.
3. **Does the compounding stand?** Membrane pays a speed cost by design and now
   pays it twice — once from the item, once from carrying the most stacks. That
   is defensible as the item's stated trade, and it is also why its boss
   participation more than quadrupled. Cowork's call, not a bug.

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
