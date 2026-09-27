# School — reserved list and enemy roster

> **Status: design, ready to lift.** Written against `ART-DIRECTION.md` (BINDING)
> and the mid-century institutional register. Same shape as
> `CONCEPTION-ROSTER.md` §1–§5; the amendment log there does not apply here.
>
> **§1 is the blocking item.** `tools/art/reservations.ts` has no `school` entry,
> so `assertReserved` refuses every School asset. §1 is written to lift directly
> into that file.
>
> One asset in this act already exists and passed: `substitute-teacher`, seed
> 11923, generated 2026-08-01T09:13Z. The roster is written around it rather than
> over it.

---

## 1 · The reserved list (`G-011`, law 11)

Five shapes. One more than Conception, because School adds a pressure Conception
did not have and the substitute is a fixed point the act has to be built around.

| Reserved | Held by | Consequence |
|---|---|---|
| **Bright hard rectangle** | `substitute-teacher` — in **bone `#D2C6AC`**, never paper (`G-032`, §6.2) | Nothing else in the act is a bright hard-edged rectangle. This is the reservation the act is built around and it is the one most at risk, because School is full of paper. |
| **Circle** | `dodgeball` | The only perfect circle among the act's enemies. Nothing else is radially symmetric. |
| **Wedge** | `homework` | A leaning stack, triangular in profile, dull. Paper that is deliberately not a rectangle. |
| **Sash** | `hall-monitor` | The only hard diagonal in the act. It runs off both edges of the body so it reads as a stripe, never a slab. |
| **Cluster** | `clique` | The only silhouette with more than one head. Nothing else in the act is a fused mass. |

**Threat colour held back:**

| Class | Held by | Why |
|---|---|---|
| **Ranged `#D69A3C`** | `substitute-teacher` — **on its projectile, not its body** (`G-031`, §6.1) | The substitute is the only thing in School that aims. Conception's first aimed thing was the boss; School's is a swarm enemy, and that escalation is the act's whole point (`G-010`). No other School enemy may be gold. |

**Game-wide, not School's to set** (law 10, `G-030`): pickups take
`school-light #9FA86B` and hold their one global shape. No enemy above uses the
act's light tone, so the rule costs this act nothing.

**Not reserved and therefore not generatable:** `boss-gym-teacher` has no entry.
It cannot be generated until it is designed and added, which is `assertReserved`
doing exactly what `G-011` asked of it. Flagged, not worked around.

### Why the vocabulary is what it is

The clipboard reservation is a claim about every other enemy in the act, which is
why the roster and the list had to be written together. The generative pressure
shows up twice:

- **Homework is a wedge because the rectangle is taken.** Homework is a stack of
  paper and the obvious silhouette is a slab. It cannot be one. A leaning
  triangular stack in `shadow` separates from the clipboard on three axes at once
  — shape, edge, and value — and it is a better drawing than the slab was.
- **The sash runs off both edges** for the same reason. A badge or a rectangular
  name tag would have been the natural read for a hall monitor and would have put
  a second bright hard rectangle in the act.

---

## 2 · What the act is

School's costume of the life script: **you are sorted by people who are also
being sorted, judged by adults who have not been told who you are, and the day
has a shape you did not agree to.** Nothing in the act has anything against you.

| | Enemy | Teaches |
|---|---|---|
| Crowd | Clique | That some space belongs to a group and you are not in it |
| Velocity | Dodgeball | That an object crossing the room is a threat even unaimed |
| Accumulation | Homework | That things which do no damage still cost you the run |
| Roadblock | Hall monitor | Target priority, and when a route is closed |
| **Ranged** | Substitute teacher | That something can now reach you from across the room |

Ranged pressure arrives here, as `G-010` said it would. It arrives on one enemy
and gold appears nowhere else in the act.

---

## 3 · The enemies

All five are swarm-tier under the detail budget (D-018): **bold flat shapes,
strong silhouette, large uninterrupted colour. No halftone, no hairlines, no
grain.**

---

### 3.1 · Clique — crowd

**`whyThisStage`** — lift verbatim:

> School is the first place that has an inside, and the player finds out where they are by walking into the edge of it.

**Threat:** contact · **Tint:** `#6B7F53` (school-mid) · **Silhouette:** cluster

**48px** — a single wide lumpy mass with three or four heads on it, fused at the
shoulder. It is one enemy, not a group of enemies, and the silhouette has to say
so instantly or the player will try to walk between the heads.

**Visual** — flat school-mid, one shadow tone. Heads at slightly different
heights, all facing the same way and none of them the player's way. Faces are two
dots and a flat line each, identical across every head — the joke is that they are
the same face repeated, and that is cheaper to author than four faces as well as
funnier.

**Behaviour** — moves as one body on a slow drift and never splits. It does not
pursue. It occupies, and it is wide, so it takes lanes away simply by existing
somewhere. Contact damage is low; the cost is that a clique in the wrong place
turns a two-way route into a one-way one.

---

### 3.2 · Dodgeball — velocity

**`whyThisStage`** — lift verbatim:

> School is where the player is first hurt by something that was aimed at the room rather than at them.

**Threat:** contact · **Tint:** `#C4472E` (threat-contact) · **Silhouette:** circle

**48px** — a perfect circle. The only one in the act, and the only radially
symmetric thing in it, which is what lets it read at speed.

**Visual** — flat contact red, no seam, no highlight, no stripe. A face: two dots
and a flat line, dead centre, completely blank. It is not excited. Whoever threw
it is never drawn and never referenced (law 9 — the role is the object).

**Behaviour** — enters fast on a fixed vector and **bounces off the arena edges
indefinitely**. It never steers, never slows, never targets. It is the purest
expression of law 8 in the game: it has no relationship to the player at all and
it will still take a third of their health.

**Why it earns its slot** — it is the only enemy whose threat is a function of the
player's own position rather than of the enemy's behaviour, and it makes the arena
edges matter for the first time.

---

### 3.3 · Homework — accumulation

**`whyThisStage`** — lift verbatim:

> School is the first stage that follows the player home and takes up the part of the day nobody was counting.

**Threat:** none — **zero contact damage** · **Tint:** `#6E6353` (shadow) ·
**Silhouette:** wedge

**48px** — a leaning triangular stack, dull, soft-cornered. Deliberately the least
interesting shape in the act.

**Visual** — flat shadow-brown, one tone. A small face near the top of the stack:
two dots, no mouth. It is not doing anything to anyone.

**Behaviour** — spawns where the player has recently been, does not move, and
**grows**. Each new pile that lands near an existing one merges into it and the
merged shape is larger. It deals no damage and it is solid: the player cannot walk
through it, and neither can anything else.

It is the antibody's cousin one act along (`G-001`) and deliberately not the same
mechanic. The antibody attaches and taxes movement; homework sits in the world and
takes the room. Both cost the player something that is not health, which is the
family resemblance.

**Why it earns its slot** — it is the only enemy that cannot kill the player and
the only one that changes the shape of the arena. By minute four the room the
player started in is a corridor.

**Balance note** — homework must be destructible but expensive, so clearing it is
a real choice against the act clock. If it is free to clear it is scenery; if it
cannot be cleared it is a slow loss. Playtest owns the number, not the shape.

---

### 3.4 · Hall monitor — roadblock

**`whyThisStage`** — lift verbatim:

> School is where authority is first handed to someone with no more standing than the player, and it works anyway.

**Threat:** elite · **Tint:** `#7C5C8A` (threat-elite) · **Silhouette:** sash

**48px** — an upright figure crossed by one hard diagonal band running off both
edges of the body. The diagonal is the whole read; at 48px the body is a lump and
the stripe is the identity.

**Visual** — flat elite purple, the sash a second flat tone. Face is two dots and
a flat line, aimed along its route rather than at the player. It is a role wearing
a person, per law 9: the sash is the character.

**Behaviour** — patrols a fixed line across the arena, end to end, and turns
around at the ends. It never deviates and never reacts. Touching it stops the
player dead for a moment and deals elite-tier damage.

It closes a lane rather than occupying a point, which is what separates it from
Conception's white cell — that was an area you routed around, this is a line you
time.

---

### 3.5 · Substitute teacher — ranged · *asset exists*

**`whyThisStage`** — already committed in `assets/prompts/substitute-teacher.md`,
unchanged:

> School is the first place the player is judged by someone who does not know who they are, and the substitute is that experience with a lanyard on.

**Threat:** ranged · **Tint:** `#D69A3C` (threat-ranged) · **Silhouette:** bright
hard rectangle

**48px** — clipboard and lanyard. The clipboard is the brightest and hardest shape
on the sprite and the brightest hard shape in the act, which is the reservation in
§1 and the reason every other School enemy is shaped the way it is.

**Behaviour** — slow, does not pursue, stops to consult the clipboard and fires.
The consult is the telegraph and it is a body-language telegraph rather than a
colour flash, which is what the register can do that a cartoon one cannot.

**Attack — dependency still open.** The intended projectile is the player's name,
spelled wrong. That needs the run to carry a player name, which the end-of-game
certificate (`G-002`) needs anyway and which is still unbuilt. **Until it exists
the substitute needs a placeholder projectile**, and the placeholder should not be
designed around — it is a stand-in for a joke, not a joke.

---

### 3.6 · Starting numbers

Relationships are the design; the values are a starting point and the bots own
them.

| id | hp | speed | contactDamage | radius | displaySize | xp | dominant colour |
|---|---|---|---|---|---|---|---|
| `clique` | 9 | 28 | 5 | 38 | 88 | 3 | `#6B7F53` school-mid |
| `dodgeball` | 4 | 165 | 11 | 14 | 44 | 2 | `#C4472E` contact |
| `homework` | 14 | 0 | 0 | 30 | 72 | 1 | `#6E6353` shadow |
| `hall-monitor` | 40 | 22 | 13 | 26 | 88 | 11 | `#7C5C8A` elite |
| `substitute-teacher` | 12 | 24 | 6 | 20 | 96 | 5 | act tones — gold is on its **projectile** |

**These are prompt targets, not `tint` values** (`G-032`, §6.3). Render tinting is
retired; the colour is authored into the sprite and verified by CONFORM and
CHECK, the way the substitute's nine colours already were. Every entry is a
locked-palette colour and none is lighter than the player's floor.

**Introduction order**, not a wave table — per `CONCEPTION-ROSTER.md` §5.1 the
escalation invariant is per-`enemyId`, so the tracks are independent: clique from
0s, dodgeball early, homework from the first third, hall monitor mid, substitute
last. The act should be pure contact until the substitute arrives, so that gold
appearing means something.

---

## 4 · Handoff

- **Lift §1 into `tools/art/reservations.ts`** as the `school` entry. That
  unblocks all five swarm assets. `boss-gym-teacher` stays absent on purpose.
- **Three behaviours the current `EnemyDef` cannot express**, all per-enemy flags:
  `bounce` (dodgeball, reflect off arena bounds, never despawn), `merge`
  (homework, static, combines with neighbours, solid to all movers), `patrol`
  (hall monitor, fixed line, reverse at ends).
- **A question about tint on an already-passing asset.** `substitute-teacher`
  cleared all nine checks with nine palette colours. Multiplying it by
  `#D69A3C` at draw time is right by law 6 — the act's only ranged thing is the
  act's only gold thing — but I do not know what a heavy multiply does to an
  asset that already conforms. If it breaks `palette-variety` or the clipboard's
  contrast, tell me and the reservation changes rather than the asset.
- **Prompts** are yours (D-010). §3 gives the visual spec each must satisfy. D-007
  is live in this act in a way it was not in Conception: every enemy here is a
  person or a school object, so **no prompt may describe any figure by ethnicity,
  nationality, religion or race**, and the substitute's committed prompt is the
  model — role forward, average build, affectless.

## 5 · Not designed yet

- **The Gym Teacher.** School's boss. Named in `PLAN.md`, no concept, no
  reservation entry, not generatable. Next thing I write for this act.
- **Wave tuning and the act clock.** After the Conception session unblocks, since
  School's pacing should be set against an act whose feel a human has confirmed
  rather than against Conception's current placeholders.

---

## 6 · Amendment — 2026-08-01, after the tint measurement

§1 said the reservation changes rather than the asset if gold broke it. It broke
it, so §1 changes. The general half of the answer is larger than the question and
is in §6.3.

### 6.1 · The substitute is not tinted, and ranged gold moves to projectiles (`G-031`)

L 0.930 → 0.685 on the brightest pixel, background gap 0.515 → 0.270, colours
9 → 6. §1 calls the bright hard rectangle the reservation the act is built around
and the one most at risk; a multiply that halves its contrast is the risk
arriving. The clipboard would still clear the 0.12 check and it would no longer be
the brightest hard shape in the act, which is what the reservation actually says.

**On this asset the two channels of law 6 are in direct conflict** — silhouette
carries identity, colour carries threat, and here the threat colour destroys the
identity. Identity wins, because it is the channel that is exclusive and enforced.

Your observation is the answer and it is better than a workaround. **Ranged gold
moves from the body to the projectile, game-wide.**

Look at what the four threat classes actually are. Contact, elite and boss all
describe *an enemy*. Ranged is the only one that describes a *relationship* — it
says the damage arrives separately from the body that produced it. So gold on a
body was always an indirection: it means "this thing will emit something else that
hurts you", where contact red means "this hurts you". Putting gold on the thing
that separates removes the indirection and makes the colour literal.

It also sharpens Conception rather than costing it. `G-010` reserved gold to the
Egg so that the first aimed thing in the player's life is the thing deciding
whether they exist. Under this rule the Egg's body is boss teal and gold first
appears **as the Egg's first projectile**, which is more precisely the moment
`G-010` was marking. The boss reads as a boss and its attack reads as ranged: two
pieces of information where there was one confused one.

§1's reserved-threat row stands unchanged in meaning — the substitute is still the
only source of gold in School — and now describes what it fires rather than what
it is.

### 6.2 · The clipboard is bone, not paper — a conflict I wrote

Checking the measurement turned up something worse than the tint. The
substitute's brightest pixel is L 0.930. **That is paper**, and law 10 says paper
is the player's and nothing else's.

So `SCHOOL-ROSTER.md` §1 and `ART-DIRECTION.md` law 10 contradict each other and I
wrote both, one amendment apart. §1 wants the brightest hard shape in the act;
law 10 forbids the brightest colour to anything but the player.

**Law 10 wins and the clipboard is bone `#D2C6AC`.** Forty substitutes at 48px
each holding a paper-bright slab is precisely the screen on which a player loses
track of themselves, which is the failure law 10 exists to prevent. Bone is the
"everything else" bucket, it is still comfortably the brightest thing in School
after the player, and the reservation is unharmed — *brightest hard rectangle in
the act* is satisfied by bone as easily as by paper.

I am less comfortable with this than the paragraph sounds. I rejected bone for
pickups two days of work ago partly because it competes with the player, and I am
now handing it to a swarm enemy's largest feature. The difference is exposure —
pickups are dozens on screen in every act and had a free alternative in the act
light tone; the clipboard is one shape on one enemy in one act, and its
alternatives are forbidden or taken. It is the remaining slot rather than the
right one, and it belongs in the review sheet as something for Justin to look at
rather than something I have settled.

**Needs checking, not assumed:** whether CONFORM actually chose `paper` or
something near it. If it chose paper this is a regeneration with an amended
prompt; if it chose bone already, it is a documentation fix and nothing moves.

### 6.3 · The pipeline rejects, it does not correct (`G-032`)

Render tinting is **retired**, not baked and not restricted. The requirement it
serves moves into CHECK as a rejection criterion.

All three routes were live and two of them fail on the same evidence. **Baking the
tint at pack time makes law 3 pass and keeps the harm.** The substitute's numbers
are the proof: the multiply halves the clipboard's contrast, and re-quantising
afterwards snaps the halved values onto palette entries without restoring
anything. Law 3 goes green over a sprite that got worse. This project has now
seen that shape three times — §11.2's dispersion criterion, §12.1's coincidental
corroboration, and now this — and it is the most expensive kind of error it makes,
because nothing downstream ever asks again.

Restricting tints to palette-closed multiplies is the same harm with a smaller
domain. It still multiplies; it just lands on palette entries when it does.

So: no tint. **The value requirement becomes a check.** No enemy sprite may
contain a pixel lighter than the player's floor; failure regenerates with a
mutated seed, which is the machinery `D-005` already specifies and the path every
other check already uses.

This is not a new philosophy, it is the existing one applied where it was missed.
`D-005` says consistency is enforced by mechanical rejection rather than by
post-processing, and render tinting is the one place in the pipeline that
*corrects* pixels instead of *rejecting* the asset. It is also the one place that
broke.

Two things it cleans up on the way past:

- **The `tint` field currently does two unrelated jobs** — it carries threat
  colour (spermicide's contact red, the white cell's elite purple) and it acts as
  a value corrective for generator non-compliance. Threat colour belongs in the
  prompt and is verified by CONFORM and CHECK, exactly as the substitute's nine
  colours were. Whether the field survives in some reduced form is yours.
- **`content.test.ts` asserts the tint value is dark.** It should assert the drawn
  sprite is dark, which is what it always meant. A rule about a corrective is not
  a rule about the thing.

**The cost, stated plainly:** every existing enemy sprite gets re-checked and some
regenerate. Four Conception enemies and one School asset. That is the whole
exposure, and this is the cheapest moment it will ever be — the alternative is
carrying a corrective that breaks two laws to enforce a third, into five more
acts.

---

## 7 · Implementation note — 2026-08-28, Claude Code

Appended rather than edited into the sections above, per `PLAN.md`. Nothing in
§1–§6 is changed by this; it records what is in the repository and what is not.

**The header is stale.** §1 says `tools/art/reservations.ts` has no `school`
entry and that this blocks every School asset. It was lifted on 2026-08-01
(commit `0fa4ce1`) and the data has matched §1 since. What was actually missing
was a level down: **nothing in the pipeline ever called the reservation layer.**
`assertReserved` was exercised only by tests. It now runs inside `generate()`,
before the key is read, and `pnpm art:batch -- --dry` prints a law-11 verdict
per asset (`D-020`).

**Landed.**

- §1 verified against the data, and now enforced on the generation path rather
  than only asserted in a test.
- §3's five enemies are in `src/data/enemies.ts` with §3.6's starting numbers
  transcribed, each `whyThisStage` lifted verbatim, and each cross-checked
  against §1 by a test — an enemy in this file must hold a reserved silhouette
  in its own act.
- §4's three behaviours are implemented and tested: `bounce`, `patrol`,
  `merge`. Merging conserves — area-preserving radius, summed HP and XP —
  because §3.3 says larger and leaves the number to playtest.
- §3.1's four missing prompts are written to §3's visual specs and are in the
  batch. **Nothing has been generated**; they have never been sent to a model.

**Not built, and why. Every item here needs a number nobody has set.**

- **The substitute's attack.** §3.5's dependency stands: the intended
  projectile needs a player name, which does not exist. The placeholder the
  roster asks for needs a consult time, a cadence, a projectile speed, a damage
  and a range, and all five are tuning. **So School currently has no ranged
  pressure at all**, which is the one thing §2 says the act is for.
- **Homework's arrival point.** §3.3 says it lands where the player has
  recently been. *Recently* is a dial of exactly the kind `G-020` showed
  decides whether an arrival mechanic exists. Left at the default entry point,
  which is a placeholder and not a decision.
- **The hall monitor's momentary stop** (§3.4). A duration, unset.
- **The wave schedule and the act clock** (§3.6, §5). Undesigned by §5's own
  statement, and downstream of the session in `CONCEPTION-ROSTER.md` §12.4.
  School therefore has **no `ActDef`**: the enemies exist, the behaviours work,
  and nothing spawns them in a run. The act is not playable and is not claimed
  to be.
- **`ACT_VISUALS` for School.** Needs a player frame and a boss frame for the
  act; the boss is §5's first open item and the player's School form is not
  designed. The act background and the pickup tone are both already in the
  locked palette and are not the blocker.
- **Items.** This roster defines none, so none were written. `CONCEPTION-ROSTER`
  §4 spends seven of a game-wide budget of roughly thirty on act one; School's
  allocation is unwritten and is a design question, not an implementation one.

**One thing for Cowork.** The `boss-gym-teacher` absence now shows up in the
dry run as a refusal rather than only in a test, which is §1 working. Service
and Office print as refused too — both have shipped assets and no reserved
list, which is `G-011`'s ordering violated by history rather than by anything
here.

## 8 · Implementation note — 2026-09-27, Claude Code

§7's "no `ActDef`" is reversed by D-022. `SCHOOL` in `src/data/acts.ts` has a
schedule following §3.6's introduction order — clique from 0s, dodgeball at
25s, homework at 100s, hall monitor at 150s, substitute at 220s, pure contact
until then — with placeholder rates that escalate in the shape Conception's
did, labelled `provisional` in the data. The bots run it (`--act=school`); the first reading
is at the top of `PLAYTEST-FINDINGS.md`. The title cannot start it: four of
the five sprites have never been generated, there is no boss, and a test keeps
it out of `ACTS` until `ACT_VISUALS` has a `school` entry. Everything else §7
lists as not built is still not built — the substitute's attack, homework's
arrival point, the monitor's stop, the boss, the visuals, the items — and the
act is now something a bot can be run through and a person could be handed the
moment the art exists.

**Amendment 2026-09-27 (D-024).** School is the second phase of one life, not
a separately started act, and it is tuned in that life rather than after
Conception is closed. The Egg still stands in as its boss.

**Amendment 2026-09-27, later (G-038, D-025).** School is drawn and in the
life. Clique, dodgeball, homework and hall monitor are authored SVG under
`tools/art/svg/school/`, with a School player frame (same face and cowlick,
no costume) and `boss-gym-teacher`, whose reservation now exists: tallest
thing in the act, shorts and whistle, holding boss teal. The statements
above that it is absent or ungeneratable are superseded. The Gym Teacher is
still a picture on the Egg's behaviour; its design is the open question.

**Amendment 2026-09-27, later still (D-022).** The substitute's attack,
homework's arrival point and the monitor's stop are built as labelled
placeholders (`shoots`, `spawnAt: 'trail'`, `stopsPlayer` on `EnemyDef`),
named in School's `provisional`. The substitute's shot is a stand-in for the
misspelled name. The monitor's stop is the player's, per §3.4: touching it
stops the player dead for 0.6s (placeholder); the monitor itself never pauses.
