# Plan — Natural Causes

Written 2026-08-01, before any code. Amend by appending a dated section rather
than rewriting, so the original reasoning stays legible when it turns out to be
wrong.

*Name is provisional and trivially changed before `git init` — it is the win
condition, which is the joke.*

---

## The game

A Vampire Survivors–like where the progression is a human life. You start as one
sperm cell among millions. If you survive long enough, you die of natural causes.

Horde survival, top-down, auto-attacking, build-defining upgrades, escalating
waves. The genre is doing the emotional work: **a Vampire Survivors run is
already a life — you get stronger, the screen gets worse, and it ends.** Nobody
has pointed that at the obvious subject.

**Tone: bleak in substance, extremely unserious in delivery.** It does not take
itself seriously at any point. The comfort is structural rather than stated —
everyone reading has fought these exact enemies, which is funny before it is
sad, and the game never explains this.

## The spine

**Every act's horde is the same thing wearing a different costume.** Cliques and
homework. Bureaucracy and heat. Meetings and email. Bills and stairs. The enemy
is always the script. This is never said out loud in dialogue; it is delivered
entirely by enemy design across acts, and a player either notices it or just has
a good time.

## Draft act list

Draft. The design agent owns this and must justify changes in
`DESIGN-DECISIONS.md`.

| Act | Horde | Boss |
|---|---|---|
| **Conception** | rival sperm, white blood cells, spermicide | **The Egg** |
| **School** | cliques, dodgeballs, homework, hall monitors, substitutes | **The Gym Teacher** |
| **Adolescence** | acne, group chats, standardised tests, driving instructors | **Prom** |
| **Service *or* College** *(branch — stretch)* | in-processing paperwork, heat, sandstorms, drones, IEDs / tuition invoices, group projects, 8am lectures | **Deployment Orders / The Loan** |
| **The Office** | meetings, email, Slack pings, performance reviews, open floor plans | **The Reorg** |
| **Family** | bills, toddlers, HOA letters, flat-pack instructions | **The Mortgage** |
| **Decline** | stairs, medications, insurance forms, your own knees | **Time** |

Win condition: reach the end of the last act. You die of natural causes. That is
the good ending, and the game says so with a certificate.

## Content rule — binding, not stylistic

**Enemies are conditions, institutions, and abstractions. Never identity
groups.** No enemy is defined by religion, ethnicity, nationality or race, in
art, name, description or generation prompt. The Service act fights the *war* —
paperwork, heat, drones, the absurdity of being nineteen and there — not a
people.

This is a hard rule for two reasons, and the creative one is the stronger: the
satire is aimed at the American life script, so an enemy that is a *person of a
category* is aiming at the wrong target and is less funny than the bureaucracy.
The practical reason is that this repository is public and attached to Justin's
professional identity.

Recorded here because unattended agents drift toward whatever is generically
"military" in training data, and this rule has to survive a long run with nobody
watching.

## Tech

| | |
|---|---|
| **Engine** | Phaser 3 — code-first, so an agent can author every line. Godot is a better engine whose strength is its editor, and an agent cannot use an editor. |
| **Language** | TypeScript |
| **Build** | Vite |
| **Target** | Browser. Playable from a link, zero install. |
| **Art generation** | Flux via API (Replicate or fal) — API access matters more than marginal quality, because it is what lets asset generation run unattended. |
| **Art post-processing** | Node/Python image pipeline in-repo |

## Art

Full spec in [`ART-DIRECTION.md`](./ART-DIRECTION.md). Summary:

- **Adult Swim register.** Thick uniform outlines, flat saturated fills, lumpy
  proportions, deadpan faces on absurd things. Reference points: *Smiling
  Friends*, *Aqua Teen Hunger Force*, *Ugly Americans*, Adult Swim bumpers.
- **Animation:** enemies are static sprites driven by tweens (squash, stretch,
  bob, rotate) — cheap and reads correctly at horde scale. Real multi-frame
  animation only for the player and bosses, where the camera actually rests.
- **Consistency is enforced in code, not in prompts.** Generate loosely,
  then quantise to a locked palette, outline, normalise scale, and mechanically
  reject anything that fails a silhouette or contrast check.

**Nothing is law until the test batch.** Six assets across three life stages get
generated and reviewed by Justin before `ART-DIRECTION.md` is promoted from
draft to binding. Choosing a visual direction from prose is how you discover in
week three that you hate it.

## Making an unattended agent deliberate

The hard problem: long autonomous runs produce generic content. Six mechanisms,
all of them the portfolio's existing house style pointed at content instead of
code.

1. **Rejected alternatives are mandatory.** Every content decision gets a
   `DESIGN-DECISIONS.md` entry naming two options *not* taken and why. Highest-
   yield forcing function available — an agent that must argue against
   alternatives cannot produce filler.
2. **Every enemy answers "why this life stage."** One sentence, in the data
   file, or it does not ship. A "flying skull" cannot answer it. A "substitute
   teacher who does not know your name" can.
3. **Planted payoffs, checkable.** Each act sets up at least one thing that
   resolves later, recorded in a manifest. A test asserts every planted setup
   has a payoff, so an unattended run cannot quietly drop one. This is the
   portfolio's planted-ground-truth pattern applied to narrative.
4. **A coherence agent that only reads.** Separate pass, no write access. Finds
   tonal breaks, contradictions, and setups that never land. It reports; it does
   not fix.
5. **Content budget with a quality gate.** Cap the item count — roughly 30, not
   200. Scarcity forces deliberation; abundance produces variance on a theme.
   Any item that cannot state what build it enables and what it trades away is
   cut.
6. **Automated playtest bots.** Win rate by build, time-to-death curves,
   never-picked weapons, unwinnable seeds. This is the part that genuinely runs
   for hours unattended and produces real numbers.

## The study

**Observational, not experimental.** The game is the point, so the process is
instrumented and reported rather than manipulated. Building the same feature
five ways would produce cleaner causal claims and a worse game; that trade is
refused deliberately.

What gets logged: which agent structure did what, where it worked, where it
failed, what a human had to intervene on, and what it cost. Published as a
findings document with honest caveats about n=1.

The transcripts are themselves the artifact. Corpora of agent development
sessions with outcomes attached barely exist, and this produces one as a
by-product.

## Phases

| | | Done when |
|---|---|---|
| **0** | Scaffold, Phaser + Vite building, empty scene renders | A blank green field runs in a browser |
| **1** | Art pipeline + test batch | Six assets, three life stages, reviewed by Justin. `ART-DIRECTION.md` promoted to binding |
| **2** | Core loop, one act (Conception) | Sperm act playable start to Egg boss, tuned by playtest bots |
| **3** | Progression systems, remaining acts | The script, act by act |
| **4** | Meta-progression, polish, findings doc | Playable link, findings published |

Phase 2 is the real risk gate. A Vampire Survivors clone lives or dies on the
feel of one act; if the Conception act is not fun, more acts will not fix it.

## Roles

**Cowork** — design lead. Owns act design, enemy concepts, `ART-DIRECTION.md`,
the coherence pass, and the briefs. Cannot run git, delete files, or run test
suites reliably.

**Claude Code** — implementation, art pipeline, tests, git, builds. Runs the
long unattended stretches.

**Justin** — creative director and reviewer. Judges the test batch, the feel of
the Conception act, and whether anything is actually funny. No agent can do
that, and pretending otherwise is how it ends up unfunny.

## What would make this fail

- **The Conception act is not fun.** Then it is an art project with a joke in
  it. Phase 2 exists to find this out early rather than after seven acts.
- **The art looks generated.** Post-processing and mechanical rejection exist
  for this; the test batch is the checkpoint.
- **Tonal drift over a long unattended run.** The coherence agent and the
  content rule above are the guards.
- **Scope.** Seven acts is ambitious. Better: three excellent acts and a stated
  roadmap than seven thin ones.

---

## 2026-09-27 · Reorientation

Appended, per the header. Everything above is left as written so the reasoning
that turned out wrong stays legible. This section says which parts did.

### What the record shows

Twenty commits on 2026-08-01. Thirteen in the eight weeks since — several of
them finishing the Conception act's presentation: walls in the sim, the title,
sound, the ending, the offer cards — and none of which put that act in front
of a person. `CONCEPTION-ROSTER.md` §12.4 diagnosed it
on the first day — the design calibration had been "blocked on a person for
four passes, and the loop kept producing passes because it could" — and §12.5
then said *do not run one*. The project waited two months for a session that
never came. That is the process's failure, not Justin's, and four ideas in the
plan above produced it:

1. **The human was handed the hardest job.** The open questions were "what
   should `k` be" and "is the drag the right shape", to be answered from prose
   and tables. D-002 rejected Godot precisely so Justin would not be the
   bottleneck, and the process made him one by another route. A person reacts
   to a playable thing in five minutes at a link. A person does not sit down
   to choose six numbers from a 1,400-line roster, and this one didn't.
2. **There was no link.** D-003 says "playable from a link". For two months
   the game ran on whichever machine had last run `pnpm dev`. Every human
   judgement therefore needed a scheduled sitting at that machine, which is
   why none happened.
3. **Rigour went where it was cheap, not where the risk was.** Seven bot runs,
   control arms, Wilson intervals and an algebraic proof, all about one
   enemy's drag curve in an act nobody had confirmed was fun. "The Conception
   act is not fun" is the first failure mode listed above, and that question
   was never put to the one person who could answer it while 700 lines were
   written about the antibody.
4. **The documents outgrew the game.** 5,400 lines of Markdown against 8,600
   of non-test TypeScript. Mechanism 1 is right and forty-line entries are not
   what it needs. The study (D-008) made every documented hour feel like
   output. Mechanisms 3 and 4 were never built, and the record did not notice.

What is not wrong, and stays: the rules/presentation split, the bots as an
instrument, the content rule as a build failure, the art laws in code, the
audit habit, CI. They are why the code can be trusted.

### What changes

- **Every session ends with something Justin can play from a link.**
  `deploy.yml` publishes `main` to GitHub Pages (D-023). Work that cannot be
  seen at the link is not finished.
- **Placeholder numbers are built and labelled, never withheld and never
  claimed.** A system with values nobody has played carries a `provisional`
  sentence in its data naming what retires it; a test requires the sentence.
  "Tuning is frozen" becomes "tuning is not claimed" (D-022).
- **Justin is asked for reactions, not values.** "Play this; what felt wrong?"
  — never "what should this be?". The §12.4 questions are re-put in that form
  in the README. A question he cannot answer in five minutes at the link is
  badly posed.
- **A documentation budget.** A decision entry is at most fifteen lines, with
  one-line rejected alternatives. A playtest entry is a table and five
  sentences. Long-form reasoning goes in the commit message, attached to the
  change and not re-read by every future session.
- **One agent session, with routed models.** The Cowork/Claude Code split was
  designed around Cowork's 2026-08 tool limits and produces handoff documents
  and "decisions wanted" lists. Design judgement and implementation now run in
  one Claude Code session that delegates: Fable holds the judgement (what to
  build, decision records, audits, anything touching D-007); Opus takes
  bounded implementation against a spec and tests, in parallel where the
  work allows. Cowork remains available for a design conversation Justin
  wants out loud. It is no longer a required stage.
- **The study is a by-product.** The findings document is written once, from
  the git log, at the end. No session writes for it.
- **Mechanisms 3 and 4** are built or struck from this file and the README by
  the end of October. The one thing the record must not do is claim them.

### 2026-09-27, later · One life

A run is one life (D-024), and G-038 retires a batch of claims above. Read
against those: the phases table's "one act" and "act by act" describe build
order, not what a run is; mechanism 5's ~30-item cap is retired; and the act
list's Boss column names each act's threshold, not the end of the game.
