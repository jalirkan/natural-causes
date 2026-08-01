# Design decisions

Creative and content decisions. Technical ones live in `DECISIONS.md`.

**Every entry names at least two alternatives that were rejected, and why.**
This is not documentation etiquette — it is the mechanism that makes an
unattended agent deliberate. An agent that must argue a choice against real
alternatives cannot produce filler, and the rejected options are usually more
informative later than the chosen one.

An entry without rejected alternatives is incomplete and gets sent back.

---

## Format

```
## G-00N · YYYY-MM-DD · One-line statement of the decision
What was chosen, and the reason in the game's terms — what it does for the
player, the joke, or the feel.

Rejected: [option A] — why it loses.
Rejected: [option B] — why it loses.
```

---

## G-001 · 2026-08-01 · Every act's horde is the same thing in a different costume
Cliques and homework. Bureaucracy and heat. Meetings and email. Bills and
stairs. The enemy is always the life script. Delivered entirely through enemy
design — never stated in dialogue, never explained on a loading screen. A player
either notices it around act four or just has a good time, and both are correct
outcomes.

Rejected: **narrating the theme** through interstitials or a narrator. It is one
joke and explaining it kills it, and an unattended agent writing interstitial
prose is the fastest route to something unfunny.

Rejected: **unrelated enemy sets per act**, chosen purely for variety. More
immediately colourful, and it throws away the only thing that makes this more
than a reskin.

## G-002 · 2026-08-01 · Dying of natural causes is the win condition
Reaching the end of the final act kills you, and the game issues a certificate.
The joke and the title are the same thing, and it reframes the whole run on the
last screen at no mechanical cost.

Rejected: **a survival/endless mode as the true ending** — undercuts the premise
completely; the whole point is that it ends.

Rejected: **an escape or transcendence ending**, some "beat death" secret. Funny
for a second, and it makes the game about something else, and every roguelike
already has one.

## G-003 · 2026-08-01 · The player is a face and one cowlick, in every act
The protagonist gets no costume, no gear and no visual upgrade across seven life
stages. Identity is carried by an expression and a single asymmetric tuft above
the left eye, which appears on the sperm-form sprite — where it is anatomically
absurd, which is why it goes there first — and on every sprite after it. It also
solves the 48px problem for free: in the opening act the player is the only body
in the swarm with a bump on its head. In the last act it is the only hair left.

Rejected: **visible progression on the player sprite** — armour, tools, clothing
that accumulates with upgrades. This is what the genre does, it reads well, and
it is wrong here: a life does not visibly gear up, and the joke of the run is
that the thing being escalated is the screen rather than the person.

Rejected: **a new protagonist design per act**, redrawn to match each life stage.
Better-looking, seven times the animation budget for the one sprite that is
always on screen, and it destroys the through-line the cowlick exists to carry.

## G-004 · 2026-08-01 · The Reorg restructures instead of enraging
The Office boss is an org chart that is alive. At each phase threshold it does not
grow, add attacks or enter a rage state — the boxes swap places, the connectors
redraw, and the pattern changes to match. Same monster, same health, nothing
added or removed, everything moved. The player's box moves sideways and never up.
Damaged boxes go grey and *stay in the chart*, connectors still attached. The
position at the top of the chart is empty for the entire fight.

This is the spine (`G-001`) delivered by a boss fight, which is the only channel
the theme is permitted to use.

Rejected: **an executive or a manager as the boss.** The obvious read, and it
aims at a person when the funnier and truer target is the structure. It also
drags the act toward a villain, and nothing else in the game has one.

Rejected: **a conventional escalating boss** — phase two adds a laser. Safe,
legible, and it throws away the only mechanic this subject was ever going to
donate. A reorg that gets stronger is just a monster; a reorg that rearranges and
is exactly as dangerous afterwards is the actual experience.

## G-005 · 2026-08-01 · The substitute swarm is palette-swaps of one sprite
One body, one face, one clipboard. Vests, hair and a single accessory vary;
nothing else does. Substitutes are interchangeable, so building them as literal
variants of each other is the design agreeing with the experience rather than
compromising for budget. When the cheap option and the joke point the same way,
take the cheap option and write down that it was also correct.

Rejected: **individually designed substitutes**, six distinct characters. More
visual variety per screenshot, several times the asset cost, and it makes each
one a person — which is precisely the thing a substitute is not.

Rejected: **a faceless or silhouetted sub**, identity withheld for menace.
Cheaper still, and it forfeits asset 4's entire purpose: the test is whether a
deadpan human face is funny in this style. Removing the face removes the test.

## G-006 · 2026-08-01 · The Egg is beaten by absorption, not damage
The first boss is stationary, serene and roughly eight times player height, with
a small calm face placed off-centre and too low. It does not die. Its eyes close,
the corona parts, the screen goes white, and the act ends because the player was
let in.

Rejected: **a conventional damage-race boss** with a health bar that empties and
a death animation. It is what the genre expects and it makes act one's climax
mean the opposite of what conception means. The mechanical fight can still be a
damage race; the *resolution* must not read as a kill.

Rejected: **an aggressive Egg** — chasing, hostile, snarling. Funnier for one
second and worse for the whole act. A boss that has already decided and is
waiting for the player to catch up is more intimidating than one that lunges, and
it costs less animation.

## G-007 · 2026-08-01 · Service-act enemies are indifferent, never hostile
The drone does not hunt the player. It drifts in wide arcs with a bored
half-lidded eye aimed slightly elsewhere, and it does damage because it was not
looking. Every enemy in the act is equipment, weather, paperwork or process —
unattributed, uninterested, and inconvenienced by the player's presence at most.

This is `D-007` restated as a creative rule instead of a prohibition, which is the
form likelier to survive a long unattended run. An agent told "no identity
groups" can still drift toward generic hostiles; an agent told "nothing in this
act is paying attention to you" cannot get there from here. It also rhymes the
drone with the substitute teacher — distant authority, no information about you,
deciding things anyway — which is the spine again.

Rejected: **a hostile drone that hunts and fires.** The default, and it is both
the D-007 drift risk and the less interesting enemy. A thing that is trying to
kill you is ordinary; a thing that outguns you completely and is bored is the
act.

Rejected: **omitting the Service act's mechanical enemies** and fighting only
paperwork and heat. Safest possible reading of D-007, and it concedes that the
rule costs content — it does not. The rule removes one bad option and the good
ones are still there.
