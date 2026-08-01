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

## G-008 · 2026-08-01 · The game is drawn in the register of the institutions it is about
Mid-century institutional. Muted spot inks on off-white stock, fine even line,
strictly flat, visible halftone — insurance pamphlets, safety posters,
annual-report diagrams, the illustrated leaflet that explains your benefits to
you. Charley Harper and Jim Flora for the vocabulary; Chris Ware for the proof
that it can carry bleak ordinary American life without a word of commentary.

The creative rationale, which is what `D-017` left open. The Adult Swim register
*commented on* the life script from outside it. This register **is** the life
script — the pamphlet is not a joke about the institution, it is a specimen of
one. That closes the gap the whole project was built around: `G-001` forbids
narrating the theme, and a style that is itself institutional does thematic work
in every frame without saying anything. The player is not being told that their
life is a form. They are looking at one.

It also fixes the failure the test batch actually exposed. The substitute teacher
came back "kind of mean" because a modern cartoon register renders a person as a
grotesque, which puts the joke on their body. Mid-century institutional renders a
person as a **diagram figure** — the safety-poster man, the annual-report worker,
a shape performing a function. Law 9 ("enemies are roles, not people") stops
being a rule the artist has to remember and becomes the default output of the
style. The register does the ethics for free, which is the only form in which an
unattended run will honour it.

Rejected: **alt-comix / editorial ink** — Clowes, Burns, Bagge, the underground
register. Closest to the content of any option considered, and it is built
entirely out of hatching. Hatching is a texture that describes form through line
density, and at 48px line density is one grey. It would die at sprite scale
harder than this register does, and this register already needed `D-018` to
survive.

Rejected: **risograph zine** — misregistration, grain, limited spot inks. Tempting
because the palette constraint was already in place and riso would have justified
it. The texture *is* the idea: strip the grain and misregistration and nothing is
left but flat shapes. `D-018` puts the swarm at bold flat shapes with no grain at
all, which means every swarm enemy in the game would have been drawn in a style
that had been fully subtracted. A register that survives its own detail budget in
name only is not a register.

Rejected also, for the record: **staying with Adult Swim and fixing the pipeline.**
Two of the three toon signals were `conform.ts` and `palette.ts`, so this was a
real option and it was cheaper. It loses because the original choice was made as
a binary against "mid-century instructional, too precious" — and two options is
not a search. Fixing the pipeline would have preserved a direction that had never
actually been chosen against anything.

## G-009 · 2026-08-01 · Conception's enemies keep biological names; the institution is delivered by behaviour
The white cell is a screening process, the antibody is a file opened before the
player arrived, and the spermicide is a policy written by someone who will never
learn the outcome. None of them are **called** that. They are called White cell,
Antibody and Spermicide, and the institution is carried entirely by how they act
and how they are drawn.

This is `G-001`'s delivery rule at the level of a single word. Naming the white
cell "Screening" would be an interstitial with the interstitial removed — the
theme narrated in a data field. The player who notices that the first act's
elite enemy patrols a fixed route, ignores them completely, and engulfs whatever
happens to match, has found the joke themselves. That is the only way it is
allowed to arrive.

Rejected: **institutional names in act one** — Screening, Intake, Clearance. It
lands the joke immediately and spends it in the first thirty seconds, and it
makes every later act a repetition of a gag the player has already been handed
rather than a pattern they are assembling.

Rejected: **biological names with institutional subtitles** in the codex or the
pause menu — "White cell *(screening)*". A compromise that is worse than either
option, because it narrates the theme in the one place a player goes when they
are already confused, and it makes the game's cleverness a UI feature.

## G-010 · 2026-08-01 · Nothing in the Conception act shoots at the player except the Egg
Four enemies, four kinds of pressure, no projectiles: a contact crowd that has to
be dodged, a zone that has to be left, a debuff that punishes sloppy movement,
and a high-HP roadblock that has to be handled or routed around. The ranged
threat colour `#D69A3C` does not appear in the act at all until the boss.

So the first thing in the player's life that aims at them is the thing that
decides whether they get to exist. That is free — it costs one reserved colour
and no code — and it makes the Egg's telegraph frame land as an event rather than
as another attack.

Rejected: **a ranged swarm enemy in act one.** The genre default, and act one does
not need it: the four pressures above already cover positioning, spacing, greed
and target priority. Adding projectiles teaches the player to watch the screen
instead of the crowd, which is the wrong lesson for the act whose subject is
being in traffic. Ranged pressure arrives in School, where a dodgeball is
literally the thing.

Rejected: **giving the white cell an emitted attack** to cover the gap. It would
work mechanically and it breaks law 8 — an elite that fires is an elite that is
aiming, and the entire design of that enemy is that it has not noticed the player
and is not going to.

## G-011 · 2026-08-01 · Each act reserves its silhouettes and its threat colours, and Conception is the worked example
Comet, blot, ring, Y. Four enemies, four shapes that cannot be confused at 48px,
and no two sharing a threat colour. Nothing else in the act may be a ring;
nothing else may be angular; gold is the boss's and appears nowhere before it.
Each act declares this list, and the list is as binding as the palette.

This settles the open reservation question from `TEST-BATCH-CONCEPTS.md`. It is a
readability rule before it is a style rule: at horde density a player identifies
*how a thing hurts* before *what it is*, and law 6 only delivers that if the
vocabulary is small and exclusive. Four shapes is the budget, and the constraint
is generative rather than limiting — "the ring is taken" is what produced the
antibody's Y.

Rejected: **generating freely and checking pairwise silhouette distance in the
pipeline.** More rigorous, genuinely automatable, and it optimises the wrong
thing: it would happily accept four shapes that are mathematically distinct and
all read as "blob" to a player at speed. Silhouette legibility is a perceptual
claim and the check would launder it into a numeric one.

Rejected: **one shape language per act with variation inside it** — everything in
Conception is a rounded organic mass, distinguished by colour alone. Prettier and
much more coherent as a page of concept art, and it puts the entire identification
load on the threat palette, which then has to encode both what a thing is and how
it hurts. Colour cannot carry two jobs at horde scale.

## G-012 · 2026-08-01 · The player never wears a threat colour
Contact, ranged, elite and boss are reserved. They appear on things that will
hurt the player and on nothing else — not on the player sprite, not on pickups,
not on UI chrome, not on the cowlick. Promoted to law 10 in `ART-DIRECTION.md`.

A threat palette is worth having only if it is unambiguous. The moment the player
is allowed to wear contact red, the colour means "damage, or possibly you" and
the player is reading shapes again, which is what law 6 exists to avoid. This is
close to already true — the player is paper `#EFE7D6` — so the rule costs nothing
now and prevents the one cheap future decision that would break it: tinting the
player red when hurt.

Rejected: **flashing the player a threat colour on damage.** Universal in the
genre, instantly legible, and it is precisely the exception that dissolves the
rule — after it, contact red means "someone is being hurt" rather than "this
hurts". Damage feedback goes to value and silhouette instead: the player blanches
toward paper-white and the outline thickens for two frames.

Rejected: **reserving only contact and boss**, leaving ranged and elite free for
UI and pickups. Half a rule. It preserves the two colours a player learns first
and corrupts the two they learn late, which is backwards — by the time elite
purple matters, the act is dense and the player has the least attention to spare.

## G-013 · 2026-08-01 · The Reorg is the only thing in the Office act drawn with a ruler
Law 4's Office exception is spent entirely on the boss. Every other Office enemy —
the meetings, the email, the performance review, the open floor plan — is hand-cut
like the rest of the game. The org chart is the single object in the building with
right angles.

This settles the second open question from `TEST-BATCH-CONCEPTS.md`, and it is the
answer that makes the boss work. An exception that applies to a whole act is not
an exception, it is a second art style with a thin justification. Confined to one
object, ruled geometry becomes the boss's characterisation: everything else in the
act was made by people and looks it, and the diagram that outranks all of it was
drawn by nobody. The Reorg is frightening because it is the only clean thing in
the room.

Rejected: **the whole Office act in ruled geometry.** The literal reading of law 4
and the one the prose implies. It is more coherent as an act and it costs the boss
everything — a clean monster in a clean act is just the act, and the contrast that
was doing the work is gone. It also doubles the style surface the pipeline has to
support for one act's worth of content.

Rejected: **a gradient — enemies get progressively more ruled as the act
escalates.** The clever option, and it is unshippable: `styleSuffix()` selects the
proportion clause per act because prose asking for both at once produced a prompt
that contradicted itself (`D-016`). A per-enemy sliding scale reintroduces exactly
that failure with more places to get it wrong, in service of an effect no player
would consciously register.

## G-014 · 2026-08-01 · Every Conception item subtracts something the player already has
Seven items, and not one of them is a pure gain. Speed costs health. Durability
costs speed. Scaling costs the opening two minutes. The control tool does no
damage whatsoever. `tradesAway` is a required field on every item (mechanism 5),
and the surest way for that field to become decorative is to fill it with a
sentence explaining why an upgrade is not really a downside.

The genre reason is stronger than the thematic one: a build is a shape, and a
shape needs an inside and an outside. Items that only add produce runs that differ
in magnitude rather than in kind, which is the "variance on a theme" failure
`PLAN.md` capped the content budget to avoid. Seven items that each close a door
generate more distinct runs than thirty that each open one.

The thematic reason is there and stays unspoken, which is where it belongs.

Rejected: **conventional additive upgrades** — +15% damage, +1 projectile, larger
pickup radius. What the genre does, what players expect, and what makes the
mandatory `tradesAway` field a formality that a long unattended run will learn to
write around. The field survives only if the design actually generates costs.

Rejected: **trades priced to be net-neutral**, tuned so no item is ever wrong.
Fairer and duller. An item that is correct in every build is not a decision, and
the point of a seven-item act is that picking one should mean losing a run you
could otherwise have had.
