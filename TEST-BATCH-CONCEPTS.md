# Test batch — six character concepts

> **Status: design, not approved.** These are the six assets specified at the
> bottom of [`ART-DIRECTION.md`](./ART-DIRECTION.md), written to be generated and
> judged. Nothing here is binding, and neither is the art direction until Justin
> has looked at the output.
>
> Assets **4** and **6** are the batch. The other four are control samples — if
> the sperm cells come out fine and the substitute teacher does not, the batch
> still failed. Effort is allocated accordingly.
>
> The `WHY THIS STAGE` line on each enemy is written to be lifted verbatim into
> the enemy data file. It is the field required by `PLAN.md` §6.2 — an enemy
> without one does not ship.

---

## Reading these

Each concept gives four things:

| | |
|---|---|
| **SILHOUETTE** | What the shape is at 48px, which is the only size that matters |
| **VISUAL** | What to generate |
| **THE JOKE** | What is supposed to be funny. If this line is weak the asset is dead regardless of how it renders |
| **WHY THIS STAGE** | One sentence, for the data file |

---

## 1 · The player — sperm form

**Tests:** can the style do a protagonist at all.

**SILHOUETTE** — a lopsided oval with one tuft on top, trailing a thin whip. The
tuft is the entire read. At 48px in a crowd of near-identical bodies, the player
is *the one with a bump on its head*.

**VISUAL** — Head is roughly 70% of the sprite: a soft asymmetric oval, off-white
against every act palette so it never loses contrast. Two large flat eyes at
different heights, the left slightly bigger. A short flat-line mouth. The
eyebrows carry the performance — furrowed with effort rather than heroism, the
face of something doing its best with no information. Tail is a single thin
tapering stroke at standard outline weight, animated by tween only. No accessory,
no helmet, no gear. It owns nothing. That is accurate.

**One cowlick, and it persists.** A single asymmetric tuft above the left eye
that appears on the player sprite in every act — School, Service, Office, Family,
Decline. It is absurd here because a sperm cell does not have hair, and that is
the point of putting it here first. In the last act it is the only hair left.
This is a planted payoff and belongs in the manifest.

**THE JOKE** — the protagonist of a game about a whole human life is a face with
a cowlick and an expression of unearned confidence, and it never gets a costume
upgrade in seven acts.

---

## 2 · Rival sperm — swarm enemy

**Tests:** does it read at 48px in a crowd.

**SILHOUETTE** — the same body plan as the player with the bump removed. Smooth
domed head, blunter, marginally smaller, tail curl varied across three variants.
The player/enemy distinction is carried entirely by that one protrusion plus
value: rivals are a darker tone of the act palette, the player is the lightest
thing on screen.

**VISUAL** — Three head shapes and two tail curls, palette-locked to two tones
each, generated as a family off one seed. Faces are half-lidded and flat: eyes
mostly closed, mouth a horizontal line, no eyebrows at all. **None of them are
looking at you.** They face the direction of travel. Contact threat colour on the
head rim only, so a dense crowd still reads as a crowd rather than a wall.

**THE JOKE** — they are not attacking. They have no expression, no interest in
the player, and no idea anyone else is present. They hurt you by being in the
way. The first enemy in the game is traffic.

**WHY THIS STAGE** — Conception is the only competition the player has already
won, so the game opens by making it feel like a commute.

---

## 3 · The Egg — boss

**Tests:** does scale hold up; is a boss impressive.

**SILHOUETTE** — an enormous circle wearing a ring of stubby lumpy protrusions.
At any size it reads as a crown, or a bad haircut, depending on how much credit
the player extends. Roughly 8× player height, and it does not move from centre.

**VISUAL** — Smooth flat fill, one shadow tone at the lower third. The corona is
a thick irregular fringe of blunt fingers at standard outline weight, no two the
same length. The face sits **off-centre and too low**, which is the style doing
its job: a tiny calm face on an enormous smooth mass. Half-lidded eyes, a small
closed-mouth smile, faintly amused. It is not angry. It has already decided and
is waiting for the player to catch up.

**FRAMES** — idle (slow rotate, breathing scale), telegraph (**eyes open fully**
— one frame, and it should be legible from across the arena), attack, death.

**DEATH** — it does not die. The eyes close, the corona parts, the screen goes
white. You won by getting absorbed. *(Superseded 2026-09-27: absorption is the
threshold into the next act, not the end — D-024.)* The act's punchline is that the boss let you
in.

**THE JOKE** — the first boss is serene, stationary, roughly the size of a
building, and the victory condition is being permitted to stop existing
separately from it.

**WHY THIS STAGE** — it is the only boss in the game that is beaten by being
taken in rather than brought down.

---

## 4 · Substitute teacher — swarm enemy · **REAL TEST**

**Tests:** faces, humour, human characters. If human characters are not funny in
this style, half the game is not funny.

### The premise

A substitute has total authority over you and zero information about you. They
are working from a document someone else wrote. The only thing they know is your
name, and they are about to get it wrong — in front of everyone, with total
confidence, while holding the paper that says otherwise. There is nothing you can
do about it and it will happen again next week with a different one.

That is a horde enemy without modification.

**SILHOUETTE** — a lumpy dark mass with a bright white rectangle held at chest
height, and a crooked loop hanging from the neck. Two shapes: **clipboard and
lanyard.** At 48px the clipboard is the whole identity — a hard white slab is the
brightest thing in the School palette and it will read across a field of forty.
Nothing else in the act is allowed to be that shape or that value.

**VISUAL** — Adult body, no neck: the head sits directly on a soft-rectangle
torso with sloping shoulders. Sweater vest in a colour that was never in fashion
— mustard, heathered plum, a green that has given up. Flat fill, one shadow tone.
The clipboard is oversized, roughly a third of the torso, held two-handed at the
sternum like a shield.

The face is the asset. Two flat dots at visibly different heights. A small
horizontal mouth. Eyebrows raised in **permanent mild apology** — the expression
of someone who arrived twenty minutes ago and has been told none of this. It
never changes. Every attack, every death, same face. The tween does all the work:
a slow bob at rest, a downward tilt to consult the clipboard before firing, a
flat 2-frame squash on death with the expression untouched. The clipboard falls
first.

**The swarm is palette-swaps of one sprite.** One base body, one face, one
clipboard. Vary the vest colour, the hair (comb-over, scrunchie, sensible bob,
nothing at all), and a single accessory. This is a cost saving and it is also the
entire joke — substitutes are interchangeable, and rendering them as literal
variants of one another is the design agreeing with the experience. When the
pipeline constraint and the gag point the same direction, take it.

**ATTACK** — ranged. It tilts to the clipboard, and fires **your name, spelled
wrong**, in a small speech bubble. The projectile is a mangled version of whatever
name the run is carrying. One bubble sprite, text drawn at runtime, and every
player in the world has been hit by it.

> **Dependency:** this requires the run to carry a player name, which the
> end-of-game certificate needs anyway (`G-002`). Flagged to Claude Code as a
> prerequisite, not assumed. If the name lands, the certificate misspelling it
> the same way is a free payoff seven acts later and should go in the manifest.

**THE JOKE** — an adult with complete authority and no information, holding the
only document that matters, getting it wrong out loud, apologising with their
eyebrows, and there are forty of them.

**WHY THIS STAGE** — School is the first place the player is judged by someone
who does not know who they are, and the substitute is that experience with a
lanyard on.

---

## 5 · Predator drone — swarm enemy

**Tests:** a mechanical subject in an organic style. This is the asset where
"lumpy, never geometric" is load-bearing rather than decorative.

**SILHOUETTE** — long thin wings of **unequal length**, bulbous nose, V-tail. It
reads as a drone instantly and nothing on it is straight. The fuselage sags
slightly in the middle, as if drawn from memory by someone who saw one once. If
the generator returns something crisp and technical, that asset is a rejection —
the failure mode this test exists to catch.

**VISUAL** — Bone and sand, near-monochrome; the Service act is the one place the
palette nearly drops out, so threat colours hit hardest. The camera pod under the
nose is the face: **one large half-lidded eye**, bored, aimed slightly off from
wherever the player is. Standard outline weight throughout, including the
antennae, which should be crooked.

**MOVEMENT** — it does not chase. It drifts in wide slow arcs and passes
overhead. Its **shadow is the telegraph** — a flat dark ellipse on the ground,
one shape, no art cost, and perfectly readable at horde scale.

**THE JOKE** — the most powerful thing on the screen is not paying attention. It
is bored, it is somewhere else, and it hits the player because it was not looking.

**WHY THIS STAGE** — Service is the stage where everything that decides the
player's day is far away and looking at something else.

> **D-007 check.** The enemy is equipment, unattributed, and indifferent. There
> is no operator, no flag, no insignia, no nationality, and no person in this
> asset or its prompt. The generation prompt describes an aircraft and a mood.
> A prompt for this asset that names a country, a force, or a people is a build
> failure, not a note.

---

## 6 · The Reorg — boss · **REAL TEST**

**Tests:** can the style render an abstraction as a monster. This is the hardest
asset in the batch and the one most likely to come back generic.

### The premise

A reorg is not an event that happens to your work. It is an event that happens to
a *diagram*. The boxes move. Your name is in a different box. Your manager's name
changed. Nothing you actually do is different, nobody can tell you whether it is
good, and it arrives as a slide.

So the boss is not an executive and not a building. **The boss is the org chart,
and it is alive.**

**SILHOUETTE** — a tall lumpy ziggurat of rectangles, wider at the base, swaying.
Boxes at slightly different sizes and rotations, joined by thick right-angled
connector lines. Critically: **the connectors are drawn at standard outline
weight**, so the chart's own visual language and the game's style law are the same
line. The style unifies it for free.

**VISUAL** — Corporate blue-grey and white. This is the one enemy in the game
that is **clean**, which `ART-DIRECTION.md` law 4 already grants the Office act as
an exception, and it should be spent here. Everything else in seven acts is
lumpy and hand-wrong; the Reorg has right angles. Its wrongness comes from the
arrangement, never from the shapes.

**Every box has a face** — small, flat, deadpan, per law 5. They face slightly
different directions and **none of them look at the player.** They look at each
other, or upward.

**Two details that carry the whole fight:**

1. **One box at the bottom has the player's face in it.** Small, near the floor.
2. **One box at the top is empty.** No face, no label, slightly larger than the
   rest, background showing through. Everything reports up to it. It is never
   filled.

**FRAMES** — idle (sway, faces drifting), **telegraph** (it turns toward the
player and a slide appears), attack, death.

**ATTACK** — it presents. The slide comes up and it fires **bullet points**. Small
flat dots, evenly spaced, in disciplined rows. The pun is the projectile and the
projectile is a legitimate horde-game bullet pattern; both of those are true at
once and that is why it works.

**THE PHASE TRANSITION IS THE BOSS.** At each threshold it does not enrage and
does not grow. It **restructures** — the boxes swap places, the connectors
redraw, and the attack pattern changes to match. Same monster. Same health.
Nothing added, nothing removed, everything moved. The player's box moves
sideways, never up.

That is the joke, it is a real mechanic, and no line of dialogue is required to
land it. If a player notices, they notice. That is the spine (`G-001`) delivered
by a boss fight instead of a narrator, which is the only way this game is allowed
to deliver it.

**DAMAGE STATE** — damaged boxes go grey and their faces close their eyes. **They
stay in the chart.** The connectors still run to them. Nothing is removed from the
diagram; the diagram simply contains more grey now. Downsizing rendered as a
health bar, unnarrated.

**DEATH** — no explosion. The connectors go slack, the chart collapses into a
neat flat stack of paper, and the empty box at the top is the last thing to fade.

**THE JOKE** — the final authority in the working-life act is a drawing, the
drawing has opinions about the player, the fight is survived rather than won, and
the position at the top of it was vacant the entire time.

**WHY THIS STAGE** — the Office is the first stage where the player's life is
decided by a diagram that somebody else is allowed to edit.

---

## What this batch is actually asking Justin

Per `ART-DIRECTION.md`: not "is this good art." The question is **"is this funny,
and would I play a game that looked like this for twenty minutes."**

Two sharper questions the batch should also settle:

1. **Asset 4** — is a deadpan human face in this style funny, or is it just a
   drawing of a person? If it is the second one, the School, Family and Decline
   acts all need a different approach to human enemies and it is far cheaper to
   learn that now.
2. **Asset 6** — does an abstraction read as a *monster*, or as an illustration of
   a concept? A boss that reads as a diagram with a face and not as a threat is
   the failure mode, and no amount of good writing above rescues it.

## Open questions held back from `ART-DIRECTION.md`

Not edited into the spec, because designing against an unapproved style beyond
what the test batch requires is out of scope. Raised here, resolved after review:

- **A player-reservation rule for the threat palette.** Asset 1 assumes the player
  never wears contact/ranged/elite/boss colours, so those colours always mean
  "this will hurt you." Currently law 6 does not say so. If the batch supports it,
  it becomes law 8.
- **Law 4's Office exception needs a boundary.** Asset 6 spends it. Whether other
  Office enemies also get clean geometry, or whether the Reorg is the only clean
  thing in the act and that is why it is frightening, is a real decision and the
  second option is better. Not decided here.
- **Silhouette exclusivity.** Asset 4 assumes no other School enemy may be a
  bright hard rectangle. That is a per-act reservation list, which is a pipeline
  feature, and it does not exist yet.
