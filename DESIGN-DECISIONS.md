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

## G-015 · 2026-08-01 · The Egg pulls the player in, and it still does not move
A constant radial attraction toward the Egg, live from the moment it spawns,
identical at full health and at one HP. It does not ramp, does not phase, does
not react to the player's build or position. Weak enough that swimming directly
outward makes progress; strong enough that tangential movement is the efficient
path, which turns the fight into an orbit.

**This is not a concession to the short-range builds — it is better
characterisation than what is there now.** `G-006` says the Egg has already
decided and is waiting for the player to catch up. A thing that stays put is
*passive*. A thing that stays put and draws you in anyway is **inevitable**, and
inevitable is what that entry was reaching for. It is also what an egg actually
does: chemoattraction is the real mechanism, and it is the least aggressive
possible way for a boss to close a distance, because the boss is not the thing
that moves. The player is.

Mechanically it gives every item the same question — how close do I let it take
me — and a different answer per build. Motility fights the pull from 520px and
pays in constant repositioning against an aimed spread. Wake rides it into a
close orbit, which is the first time in the act that "kills by having already
been somewhere" describes something the player can actually do. Acrosome lets it
take them all the way in. Membrane is what makes that survivable. One field,
five builds, no per-item special cases.

The measured problem was that the act had two skill checks and the items only
addressed one: seven items were designed for crowd combat and the boss is a
single stationary target with no crowd. That is a shape error and it is mine.

Rejected: **(a) leave it a ranged check** — short-range builds are expected to
have picked up reach by 300s. Defensible, and it makes the requirement invisible:
nothing in five minutes of crowd tells the player that range is mandatory, so the
level-up screen becomes a trap that pays out at 300s. It also guts `G-014`.
Acrosome's stated trade is range; if range is compulsory at the act's end, that
is not a trade, it is a delayed loss, and every honest `tradesAway` line in the
file becomes a warning the player cannot act on.

Rejected: **(c) a boss-relevant clause on Acrosome and Wake** — double damage to
bosses, or similar. Cheapest, and it is an admission with a coat of paint. It
leaves the fight a stationary damage check where position does not matter, it
turns seven items into seven items and seven exceptions, and it recurs at every
boss in seven acts. A clause that exists because the design does not work is a
design that does not work.

Rejected: **adds** — the Egg spawns cells that must be fought at contact range.
The genre default, it would work, and it costs the act its best moment. Three
hundred seconds of horde resolving into one enormous still thing on an empty
screen is the strongest tonal beat in the act, and filling that screen back up
with chaff to solve a reach problem is trading the scene for a patch.

Rejected also: **moving the 320 HP number now.** It is a knob and it may well
need to move, but changing the shape and the tuning in the same pass means
learning nothing from either. Shape first, re-measure, then tune.

## G-016 · 2026-08-01 · Motility stays, and the build map in ROSTER §4.4 was wrong
§4.4 pre-committed to cutting Motility if the bots never picked it. They picked
it and it won by a wide margin, so the pre-commitment resolves in the direction
it was written for: it stays, unbuffed and untouched.

The interesting part is not the item, it is that the map was wrong and *why*. The
map was drawn entirely against the crowd phase, where a single piercing line is
genuinely worse than area damage — and it is probably still right about that. It
predicted an item's value over five minutes of horde and then measured a run
whose last minute is a fight with no horde in it. Motility likely is the weak
crowd pick §4.4 called it, and it wins anyway because it is the only pick that
can participate in the boss.

That is a claim rather than a conclusion, and `G-015` is the experiment that
tests it. The corrected map is appended to `CONCEPTION-ROSTER.md` §7 rather than
edited over the original, so the wrong version stays legible.

Rejected: **cutting Motility to protect the map** — honouring §4.4's intent
("neither build wants it") over its stated condition ("if the bots never chose
it"). That is choosing the prediction over the measurement, and it is exactly the
failure the pre-commitment existed to prevent. A pre-commitment that only binds
when it agrees with you is not one.

Rejected: **nerfing Motility to 50% win rate parity** with the rest. Fastest way
to a flat table and it fixes nothing — the short builds are not losing to
Motility, they are losing to a boss they cannot reach. Equalising the outcome
while the cause stands would hide the finding under a number that looks healthy.

## G-017 · 2026-08-01 · The Egg's drop is an inheritance, and the player does not choose it
Every other item in the game arrives as a choice of three. The Egg's does not.
At absorption the run is assigned one **inheritance** at random — permanent for
the remaining six acts, with a real upside and a real downside, and no reroll.
The player is not told it is coming and is not asked.

It is the only unchosen item in the game, it is the first one, and it lasts the
longest. That is the theme delivered by the shape of a UI element and not one
word of it is said out loud, which is the only channel `G-001` permits. It also
satisfies `G-014` harder than anything in §4: the trade is real *and* unconsented.

Three rolls, deliberately about the body and never about a category of person
(`D-007`):

| | Gives | Costs |
|---|---|---|
| **Constitution** | Higher maximum health for the whole run | XP required per level rises; slower to become anything |
| **Precocity** | Every act starts with one level already taken | That level is assigned at random from the act's pool |
| **Sensitivity** | Much larger pickup radius | Contact damage taken is higher |

**Do not build this yet.** It is worth nothing until a second act exists to carry
it into, and a permanent modifier validated against one act is a modifier that
has been validated against nothing. Design is settled; implementation is gated on
act 2.

Rejected: **a conventional strong item as the reward** — an eighth act-1 weapon,
handed over for winning. It is what the drop slot is for and it breaks the
content budget for a payoff the player enjoys for zero seconds, because the act
ends immediately after. A reward granted at the exact moment it stops being
usable is a number, not an item.

Rejected: **no drop at all** — you get absorbed, the reward is that the game
continues. Clean, honest, thematically defensible, and it wastes the single best
placed slot in the game. The one moment the player is guaranteed to be paying
attention is the transition out of the act they just survived.

## G-018 · 2026-08-01 · The antibody cannot be killed
It has no health bar. Shots pass through it. It drifts, it attaches, it stacks,
and the only counterplay is not being where it is going. Contact damage drops to
zero — it never costs health, only speed — and stacks are capped with a
diminishing return per stack, so it degrades a run rather than ending one.

The bots found median **0 stacks across all 80 runs, every policy**: at 2 HP it
dies at range before it ever reaches anyone who is fighting back. §3.3 describes
an enemy that arrives regardless and is not remarked upon; what shipped is an
enemy that any competent build deletes and never sees. Those are different
enemies.

Raising the HP is the wrong axis. It converts "unkillable" into "killed slightly
later", it has to be re-tuned upward against every weapon buff for seven acts,
and a strong build still zeroes it — so the mechanic would work only for players
who are already losing. **The right fix is a different kind of enemy, not a
tougher one.** You cannot shoot a document. It is the one thing in the act that
weapons do not affect, and that is a stronger delivery of `whyThisStage` — a
record opened before you arrived, describing a category rather than a person, and
binding anyway — than any HP value could be.

Rejected: **raising HP to something that survives contact**, 20 or 30. The
obvious fix, it is a one-line change, and it makes the antibody's presence a
function of the player's damage output — which is a treadmill, and which means
the enemy is most present for the players least able to absorb it. Backwards.

Rejected: **accepting zero as correct** — the drag is avoidable by good play, the
bots played well, working as intended. Internally consistent, and it means the
antibody is a 2 HP rival sperm with a debuff nobody experiences. If the mechanic
only fires against players who are already dying, it is not in the game. Cut it
or make it real; there is no third option that keeps §3.3 honest.

## G-019 · 2026-08-01 · The pull is dropped; the Egg holds still and does nothing
`BOSS_PULL` to zero. **Reverses `G-015`**, which was chosen to fix a problem that
did not exist: the 97% and 86% boss-HP-remaining that motivated it were two
defects in the instrument, and with those fixed the short builds participate
fully with the pull switched off.

`G-015` claimed characterisation was the stronger half of the argument, so the
honest test is whether it survives alone. It does not, and the A/B is what shows
it rather than any reasoning of mine. **Motility, greedy-capacitation and random
score identically in both arms — 56/56, 100/100, 94/94.** The entry pitched a
universal positional question that every build answers differently; three of five
policies pay nothing measurable for it. What shipped is a range-dependent assist
to the two builds that already wanted to be close, invisible to everyone else.
That is not the mechanic the entry describes.

It fails on perception too. The act is set in fluid, so a gentle inward drift near
the Egg does not obviously read as *the Egg being inevitable* — it reads as a
current, or as nothing at all. That is a claim about what a person notices, no bot
can settle it, and `PLAN.md` is explicit that a human decides what lands.

Rejected: **keeping it on characterisation alone.** The tempting option, since the
argument in `G-015` reads well and the code is already written and tested. It
loses because I wrote that argument while also believing a mechanical claim that
was false, and I cannot cleanly separate how much of it was reasoning and how much
was justification. A decision that would not be made fresh today should not
survive on the strength of having already been made.

Rejected: **deleting the pull path outright.** Cleanest, and it throws away the
cheapest experiment available if the fight turns out to be a shooting gallery in
front of a human. The constant stays at zero with an expiry — if Justin does not
ask for something in that space, it is deleted at the next close. This portfolio
already has one inert feature reading a setting nothing writes; it does not need a
second, and an expiry is the difference between a knob and a fossil.

Rejected: **keeping it at a lower value** — halve it and call the difference
tuning. Worst of both: it retains the maintenance surface and the mechanic still
does nothing for three of five builds, while making the next A/B harder to read
because the control arm is no longer clean.

## G-020 · 2026-08-01 · Antibodies are already where the player is going
They stop entering at the arena edge. They spawn at a fixed lead distance ahead of
the player's current heading and hold the existing slow drift. Speed unchanged,
invulnerability unchanged, rate unchanged. **Only the entry point moves.**

`G-018` was right and insufficient: survivability was never the binding
constraint, arrival is. A thing drifting at 34 against a player at 190 that the
bot routes around at 260px does not need to be tougher, it needs to not be
approaching from somewhere the player is leaving.

This is the most law-8-compliant answer available — the antibody does not pursue,
steer or react; it is simply already there, and the player's own forward motion
does all the closing. It is `whyThisStage` made literal: the first record about
the player is opened before they arrived, and now they swim into it. It also gives
tuning a monotonic dial where HP gave a treadmill: **lead distance runs cleanly
between "never lands" and "always lands"**, which are the two failure modes §8.4
now separates.

Rejected: **raising antibody speed.** The obvious lever and it is two bad options
wearing one name. Fast plus homing is an enemy that reacts to the player, which
law 8 forbids outright. Fast plus straight-line is a small hard shape crossing the
screen at speed, which is a projectile, and `G-010` reserves the act's first aimed
thing for the Egg.

Rejected: **giving the antibody area denial** — a lingering field it leaves
behind. It would certainly increase contact, and the ring is spermicide's under
`G-011`. It also collapses the act's four-pressure design: the antibody's job is
the debuff and the spermicide's is the zone, and an act with two zone enemies has
three pressures and a duplicate.

Rejected: **a pull-toward on the antibody.** Mechanically the most reliable fix,
and it is the same mechanic being removed from the boss in `G-019` on the same
day, reintroduced smaller and on something that ought to be indifferent. An
antibody that draws the player in is an antibody with an interest in the player.

## G-021 · 2026-08-01 · A build may buy its way out of the act's inevitability
`midpiece+wake` carries a median of 2 antibody stacks against a band of 4–12, and
that stands. The speed build is allowed to nearly opt out of the one thing in the
act that is supposed to happen to everyone.

§3.3 wanted an enemy that arrives regardless and is not remarked upon, and §8.4's
dispersion condition was written specifically to confirm that *play* changes the
outcome. A build that spends its entire identity on movement, and pays maximum HP
for it, getting partial immunity to a movement tax is that condition being
satisfied rather than dodged. An inevitability nothing can reduce is a timer, and
§8.4 already names that as a failure mode.

There is a caveat on the mechanism that does not change the decision. A fixed
pixel lead is close to speed-neutral — lateral escape available is `v × (L / v)`
and the speed cancels — so Midpiece is probably not buying this with velocity at
all. The likelier purchase is heading volatility: a kiting build changes direction
constantly and the spawn placement is stale before it matters. If that is right,
the mechanic rewards direction changes rather than speed, which is a better skill
expression than the one it was designed for. Measured in Run 5 before anything is
tuned on it.

Rejected: **shortening lead distance** to bring the outlier into band. The obvious
dial and the wrong one — four of five policies are already in band, the outlier is
the *winning* build, and the dial is global, so it would push
`membrane+acrosome` (median 8, p90 15, and the build already struggling at 38%)
further up. Fixing the leader by hurting the laggard with the one lever that
cannot distinguish them.

Rejected: **exempting the antibody from Midpiece's speed bonus**, or otherwise
special-casing the interaction so the fast build cannot escape. It would work and
it is a clause of exactly the kind `G-015` was rejected for — a rule that exists
because the design does not produce the result, and one that would need a sibling
at every future item that touches movement.

## G-022 · 2026-08-01 · Membrane's compounding stands; its stated cost did not
`membrane+acrosome` now pays its speed cost twice — once from the item, once from
carrying the most antibody stacks of any policy (mean 7.4, p90 15) because it is
too slow to avoid them. Boss HP remaining moved 5% → 22% and the win rate 50% →
38%. That stands.

22% is not the non-participation signature. That was 86–97%, and a build that
removes 78% of the boss before losing is a build losing — which is what Membrane
is for and what its `tradesAway` promises. It is a reinforcing loop, and the stack
cap from §7.5 is the only reason it is a bounded ceiling rather than a spiral; the
p90 of 15 is that cap working. If the cap is ever raised, this interaction decides
how far.

**What was wrong is the item text, not the interaction.** Membrane's `tradesAway`
names the spermicide ring and the white cell and stops, because antibodies
arrived at the arena edge when it was written and were dodgeable by anyone. It now
understates its own cost by a primary consequence. `G-014` warns against a
`tradesAway` that argues a downside away; a field that quietly understates is that
failure inverted, and it is worse here, because "the trade was stated" is the
entire argument for keeping the compounding. Corrected in `CONCEPTION-ROSTER.md`
§4.3.

Rejected: **capping antibody stacks lower for slow builds**, or scaling drag
inversely with base speed. It protects the build that most needs protecting and it
deletes the only interaction in the act where two of the player's own choices
combine into something neither of them said alone. That emergent combination is
what a seven-item build space is for.

Rejected: **buffing Membrane to compensate** — more damage reduction, or a smaller
speed penalty. Restores the win rate and dissolves the item. Membrane exists to be
the slow durable pick; a Membrane that is no longer meaningfully slow is a strictly
additive item, which `G-014` rules out for the whole act.

## G-023 · 2026-08-01 · Chemotaxis gathers the antibodies, and that is the item working
No exemption. `applyAttractors` pulls antibodies like anything else, and it stays
that way. Measured at r = +0.462, +0.366 holding speed, 6.7 stacks against 3.3 —
the largest single effect in the act and the answer to the unknown §7.3 flagged
but could not predict.

Chemotaxis's `tradesAway` already said it: *pulling a crowd into a tight point is
exactly how a run ends for a player who has nothing to clear it with.* The
antibody is that sentence's limit case — the one thing the pull gathers that no
amount of clearing pays off. The item that lets the player decide where everything
goes is also the item that calls the one thing they cannot shoot, and it gets
better and worse in the same pick. That is what `G-014` asks of an item.

**The invisibility was a real defect and it is a separate question from the
mechanic.** §3.3 made the antibody silent deliberately, and silence is right for a
background accumulation no choice changes much. It is wrong for one a single item
doubles, because that is a decision, and a cost the player cannot perceive is not
a trade. Fixed in the text (`CONCEPTION-ROSTER.md` §4.2), not in the behaviour —
the pull is already visible on screen, and a player who drops an attractor and
watches grey Y-shapes converge has been told without a word of narration.

Rejected: **exempting antibodies from attractors.** The obvious fix, one line, and
it is the third special-case clause this project has been offered and the third it
should refuse — after `G-015`'s per-item boss clauses and `G-021`'s Midpiece
carve-out. "The pull tool pulls everything" is a rule a player can hold in their
head. "The pull tool pulls everything except the enemy you cannot kill" is a
patch note.

Rejected: **weakening the interaction rather than removing it** — a reduced
attraction coefficient for antibodies only. Keeps the flavour, keeps the special
case, and buys a number nobody can perceive at the cost of a rule that was simple.
It is the compromise that loses both arguments.

## G-024 · 2026-08-01 · G-021 and G-022 keep their rulings and lose their reasons
Both were decided on mechanisms Run 5 has now measured and contradicted. Neither
outcome changes; both stated rationales do, and recording that is the same
discipline `G-019` applied to `G-015` — a decision must not survive on reasoning
that has since been falsified, even when the decision itself is still right.

**`G-021`** ruled that `midpiece+wake` at median 2 stacks stands, on the reasoning
that the speed build was buying partial immunity with velocity or with heading
volatility. Neither survives the partial correlations. The gap is Chemotaxis: the
outlier is not a build escaping the tax, it is a build not taking the item that
generates it. The ruling stands and is now easier — there is nothing to opt out
of, so there is nothing to fix, and lead distance remains the wrong lever for an
additional reason.

**`G-022`** ruled that Membrane's compounding stands and corrected its
`tradesAway` to name the antibody. The compounding it described — slower, more
stacks, slower still — is not the loop that is running. Item speed holding turn is
−0.133. The ruling stands, because a build that removes 78% of the boss and loses
is still a build losing; the text correction does not, and is reverted.

Rejected: **reopening both rulings** because their reasons failed. Tempting for
symmetry with `G-019`, and wrong: `G-019` was reversed because the *outcome* it
was chosen to produce turned out not to need it. Here the outcomes are unchanged
and only the explanations moved. Reversing a correct call because the argument for
it was wrong is as undisciplined as keeping an incorrect one because the argument
was good.

Rejected: **quietly leaving the superseded reasoning in place** and letting the
entries stand on rationales that have been measured false. Cheapest, invisible,
and it is precisely how a document becomes something nobody can reason from. The
next agent to read `G-022` would inherit a compounding loop that does not exist
and design against it.

## G-025 · 2026-08-01 · The antibody drag is a curve with a floor, not a cap
Diminishing returns per stack, strictly positive at every count, bounded by a
floor on resulting movement speed rather than by a ceiling on stack count. §7.5's
hard cap at roughly 17 stacks is retired.

The cap was correct as a safety valve when the expected operating range was the
dozen §3.3 describes and the cap sat above it. Under an honest instrument the
range is 48–76 and the cap is the operating point, which breaks the design in a
way that is easy to miss and one way that is not:

**The one that is not.** §8.4's dispersion condition passes at 2.5×, and both of
its terms — 24.6 and 61.8 stacks — are above the cap. The careful policy and the
careless one arrive at the same 0.65 drag, so experienced dispersion is **1.0×**.
The criterion reports *working* while the property it exists to detect has gone to
zero. A stale number is a nuisance; a number that passes while measuring nothing
is worse, because nothing downstream of it will ever ask.

**The easy one.** Stacks 18 through 76 do nothing, so an enemy that spawns for
five minutes stops mattering in the third.

§3.3 asked for three properties: no single stack feels unfair, the aggregate is
decisive, the player cannot say when it went wrong. A hard cap keeps the first and
third and breaks the second the moment it is reached. A curve keeps all three, and
a speed floor does the bounding the cap was actually there for — `G-022` was right
that something must stop the reinforcing loop, and wrong about what.

**The shape is settled here; the value is not, and it is not the bot's.** 0.65 is
too generous on design grounds alone — it was chosen to prevent a spiral, and
§3.3's intended worst case is that a careless run *ends*, which 65% speed does not
do. Those are different jobs. The floor goes to the human pass along with the
other perceptual questions §10.4 moved off the instrument.

Rejected: **letting stacks decay or be shed over time.** The genre-standard fix,
and it bounds the total, preserves dispersion and avoids saturation all at once —
genuinely the most elegant option available. It loses on the design's terms: §3.3
made stacks permanent within the act because a record that expires is not a
record, and a decaying stack count is farmable to zero, which is Run 3's failure
mode returning by a different door.

Rejected: **lowering the antibody spawn rate** until counts land near the cap.
Cheapest, and it treats the symptom rather than the cliff — the effect curve would
still saturate, just later. It is also tuning an absolute level against an
instrument whose absolute levels are explicitly untrustworthy, which is the thing
`G-026` exists to stop.

## G-026 · 2026-08-01 · Criteria are set at qualitative boundaries, never calibrated near the operating point
Three sets of calibrated thresholds have been invalidated in three runs. What has
survived every instrument change: ordinal claims, directional claims, presence
claims, reproduction claims, decomposition claims. What has not survived: every
absolute level anyone has written down.

So the form changes rather than the numbers. §10.4 was the first instance and was
treated as a special case; it was not one.

> **Prefer criteria at qualitative boundaries, far from the operating point.**
> §10.4's "median below 3 means absent" survived two instrument changes because
> the instrument would have to be wrong by a great deal to flip it. §9.5's 40% sat
> eighteen points from a measured 22% and died to the first change that touched
> it.

> **A ratio is only meaningful if both its terms sit where the quantity still maps
> to player experience.** `G-025` is the worked example: a correct ratio measuring
> a difference the player cannot feel.

§9.5's 40% threshold is retired and replaced by *a build is excluded when it
cannot remove half the boss on runs where it reaches the boss* — which restates
the original 86–97% crisis as the shape it actually was. Every criterion from here
records the instrument it was set against, the same way every asset records its
prompt (`D-010`).

Rejected: **re-calibrating the thresholds against the new instrument** and
carrying on. What was implicitly done twice already, and the instrument has now
changed twice in three runs with a third change queued in §11.4. Re-calibration is
a treadmill that produces a fresh set of numbers to invalidate next pass, and it
hides the fact that the form was wrong.

Rejected: **dropping numeric criteria entirely** in favour of narrative judgement
each pass. Immune to instrument drift and it discards the mechanism that makes
this project's findings checkable at all — a prediction with no threshold cannot
fail, and §7.6's thresholds are why three instrument defects were caught rather
than absorbed. The answer is better-placed numbers, not fewer.

## G-027 · 2026-08-01 · §8.4's dispersion condition is retired; the bot keeps the ordering, the human gets the magnitude
Not because 2.0× is a stale level. Because **2.0× and §3.3's severity intent
cannot both be satisfied** under the curve family `G-025` chose.

`drag(n) = (1 − floor) · kn/(1 + kn)`. The floor cancels out of any ratio, so `k`
is the only lever on dispersion — and `k` trades dispersion against achievable
severity, monotonically. At `k` = 0.030 the ratio is 1.53× and the worst drag the
family can produce at the act's current stack counts is 65%. At `k` = 0.007 the
ratio reaches 2.06× and that ceiling falls to **30.2%**, floor set to zero, which
is the most severe curve the family permits. §11.2 already argued that 35% is too
generous to satisfy §3.3's *a careless run ends because of it*.

So the condition is not a criterion. It is a second design constraint competing
with the first, and it wins by construction because it was written down as a test
and the other was written down as intent. `G-026` condemns it independently: the
achievable range is 1.0 to 2.512 and 2.0× sits two-thirds of the way up it, which
is the exact species of near-the-operating-point threshold that entry retires.

**The bot keeps the ordinal claim** — careless experiences strictly more drag than
careful, stable across seeds. That is the real "does play matter" question, it is
instrument-independent, and it currently passes. **The magnitude goes to the
human**, because whether 1.53× separation makes a careless run feel deserved is
not a thing a ratio answers.

This is the third criterion to come off the instrument in three passes (§10.4's
level, §11.3's 40%, this). The reading is that §3.3 specified the antibody
entirely in perceptual terms, and every proxy for those has eventually measured
something else. A bot can establish this mechanic's presence and its ordering. It
cannot establish its calibration.

Rejected: **lowering `k` to 0.007 to make the condition pass.** It is the only
move that satisfies the criterion as written, and it does so by capping the
mechanic's severity below the level the design already rejected. Passing a test by
breaking the thing the test was protecting is the worst available outcome and it
would have looked like progress in the table.

Rejected: **restating the threshold lower** — 1.4×, say, so the current curve
passes. Fastest, and it is re-calibration against an instrument that has changed
three times, which `G-026` retires by name. It also leaves a number in the file
whose only justification is that the current value clears it.

## G-028 · 2026-08-01 · `k` is set by the single-run trajectory, not by the ratio
`k` goes to the human pass with the floor, as a separate question.

The argument for handing it elsewhere was that `k` is not perceptual the way the
floor is, because a person cannot feel a ratio between two runs they did not have.
The premise is right and it is about dispersion, not about `k`. Curvature has a
single-run signature a player feels directly: high `k` reads as *I got slow early
and then it stopped mattering*; low `k` reads as *I kept getting slower all the
way to the boss*.

And §3.3 stated the requirement in exactly that form — *by minute four the player
is moving visibly slower*. That is a claim about a trajectory. The floor cannot
express it and only `k` can, so the parameter and the requirement already match;
nobody had noticed they were the same axis.

The question for the session is trajectory-shaped, not ratio-shaped: **at minute
two, at minute four, and at the boss — is it still getting worse, or did it stop
mattering early?**

Rejected: **fitting `k` to a target dispersion** and treating the trajectory as
whatever falls out. The obvious move once `k` is identified as the only lever on
the ratio, and it inverts the priority — §3.3's trajectory is the design intent
and the dispersion figure is an instrument for checking it. `G-027` retires the
instrument; fitting to it afterwards would be keeping the tail.

Rejected: **splitting curvature into two parameters** so trajectory and dispersion
can be set independently. Technically available, and it buys a second tuning knob
for a mechanic that already has more knobs than measured facts. Two parameters
neither of which anyone can perceive separately is worse than one that a person
can actually answer a question about.

## G-029 · 2026-08-01 · School reserves five shapes, and the clipboard is what forces the other four
`SCHOOL-ROSTER.md` §1. Bright hard rectangle (substitute), circle (dodgeball),
wedge (homework), sash (hall monitor), cluster (clique). Ranged gold held to the
substitute, which is the only thing in School that aims.

Five rather than Conception's four, because School adds a pressure Conception did
not have and because one asset already exists and passed — the reservation list
had to be built around `substitute-teacher` rather than the reverse.

The reservation is generative in the way `G-011` claimed it would be, and twice
in one act. **Homework is a wedge because the rectangle is taken** — it is a stack
of paper and the obvious silhouette is a slab, so it became a leaning triangular
pile in `shadow`, separating from the clipboard on shape, edge and value at once.
**The hall monitor's sash runs off both edges of the body** for the same reason: a
badge or a rectangular name tag was the natural read and would have put a second
bright hard rectangle in the act. Both are better drawings than the obvious ones
were.

Homework also carries **no threat colour at all**, because it does no damage. It
takes the room instead. That keeps the act's threat palette to four meanings and
gives School a pressure Conception did not have — an enemy that changes the shape
of the arena rather than the state of the player.

Rejected: **four shapes, to match Conception's budget.** Symmetry for its own
sake, and it would have meant cutting the clique or the dodgeball — density and
velocity, which are genuinely different pressures and the two most basic things a
School act has. The budget is "small and exclusive", not "four".

Rejected: **letting the substitute hold a softer silhouette** and freeing the
bright rectangle for the act generally. It would relax the constraint on every
other enemy, and it throws away the one asset in the act that has already been
generated and passed all nine checks. The clipboard *is* the character (law 9);
a substitute whose clipboard is not the read is a drawing of a person, which is
what failed the first time.

## G-030 · 2026-08-01 · Every colour has one job, and pickups take the act's light tone
Law 10 enforced and immediately found that it had a **gap rather than a hole** —
threat colours were reserved for threats and paper for the player, and nothing had
ever been assigned to pickups. XP gems were in threat-elite; moving them to bone
was legal and put them in competition with the player for lightest thing on
screen, which is the one read a horde game cannot afford to blur.

So law 10 becomes a complete assignment: threat colours to threats, paper to the
player, **the act's light tone to pickups**, everything else to everything else.
Pickups are then separated from the player by hue and from enemies by an
exclusivity, and the rule **costs nothing today** — no enemy in either designed
act uses its act's light tone.

Pickups also sit outside the act silhouette vocabulary and hold one shape
game-wide. The vocabulary answers *how does this hurt me*; a pickup does not hurt
you, so folding it in is a category error. It did surface one real collision:
Conception's antibody reserved "the only straight lines in the act" and pickups
are hard-edged, so that clause is narrowed to the act's *enemies*.

Rejected: **reserving bone for pickups game-wide.** The obvious fix, no new
colour, and it leaves pickups at luminance 0.779 against the player's 0.908 — a
gap of 0.03 above the threshold the enemy test already enforces. It also collides
with the antibody's bone junction tag, so a small bone square on a grey Y would
read as collectable in an act where touching the wrong thing costs health.

Rejected: **adding a colour to the palette** for pickups. Cleanest semantically
and it opens law 3, which is binding, in order to solve a problem that an existing
unused colour already solves. The act-light tones were sitting there doing nothing
in both designed acts; spending a palette slot before spending an idle colour is
the wrong order.

## G-031 · 2026-08-01 · Ranged gold goes on the projectile, not the body
Forced by measurement and better on the merits. Tinting `substitute-teacher` gold
takes its brightest pixel from L 0.930 to 0.685 and halves its gap to the School
background, 0.515 to 0.270. `SCHOOL-ROSTER.md` §1 calls the bright hard rectangle
the reservation the act is built around; a multiply that turns it into a mid-tone
is that reservation failing.

On that asset the two halves of law 6 point opposite ways — silhouette carries
identity, colour carries threat, and here the threat colour destroys the identity.
**Identity wins**, because it is the channel law 11 makes exclusive and enforces.

The general rule is the interesting part. Contact, elite and boss all describe *an
enemy*. Ranged is the only class that describes a **relationship** — the damage
arrives separately from the body that made it. Gold on a body was therefore always
an indirection: it meant "this will emit something that hurts you" where contact
red means "this hurts you". Putting it on the thing that separates makes the
colour literal.

It sharpens Conception rather than costing it. `G-010` reserved gold to the Egg so
the first aimed thing in the player's life is the thing deciding whether they
exist; under this rule gold first appears **as the Egg's first projectile**, which
is more exactly that moment. The boss reads as a boss and its attack reads as
ranged — two pieces of information where there was one.

Rejected: **masking the clipboard out of the tint** so the body multiplies and the
rectangle does not. Preserves both reservations literally, and it invents a
per-region tint for one asset in seven acts, which is a pipeline feature bought to
protect a rule that turned out to be wrong anyway.

Rejected: **dropping ranged from the threat palette in School** and letting the
substitute wear an act tone with no threat colour anywhere. Simplest, and it means
the act that introduces ranged pressure is the one act with no way to signal it —
`G-010` built the whole escalation on gold arriving here.

## G-032 · 2026-08-01 · The pipeline rejects, it does not correct — render tinting is retired
Not baked, not restricted. Retired, with the requirement it served moving into
CHECK as a rejection criterion: no enemy sprite may contain a pixel lighter than
the player's floor, and failure regenerates with a mutated seed.

Every tinted enemy currently breaks law 3 — 0.0000 off-palette as CHECK sees it,
0.084–0.107 as the GPU draws it, against a 0.0353 tolerance — because the pipeline
checks the sprite and the game multiplies it afterwards.

**This is `D-005` applied where it was missed.** That entry says consistency is
enforced by mechanical rejection rather than by post-processing, and render
tinting is the single place in the pipeline that corrects pixels instead of
rejecting an asset. It is also the single place that broke. The `tint` field was a
corrective for generator non-compliance on value, written before CONFORM and CHECK
existed in their current form, and those now do the job it was invented for.

Rejected: **baking the tint at pack time and re-quantising.** The option that
looks most honest, and the substitute's own numbers kill it: the multiply halves
the clipboard's background contrast and re-quantising snaps the halved values onto
palette entries without restoring anything. Law 3 goes green over a sprite that
got worse. That is the third instance in this project of a check passing over a
real regression — after §11.2's dispersion condition and §12.1's coincidental
corroboration — and it is the most expensive error the project makes, because
nothing downstream ever asks again.

Rejected: **restricting tints to palette-closed multiplies.** Cheapest by far and
it is the same harm in a smaller domain: it still multiplies, it just lands on
palette entries when it does. It would also freeze the legal tint set against a
palette that three unfinished acts still have to extend.

## G-033 · 2026-08-01 · The outcome latches the moment the Egg reaches zero
Once the Egg's health hits zero, nothing can hurt the player. The absorb
animation is presentation, and presentation cannot change what already
happened: a rival wandering through the final 1.8 seconds was turning a win
into "you did not make it" (AUDIT finding 10). The fight the player won stays
won, and the 1.8 seconds belong to the ending, not to the horde.

Rejected: **i-frames during the absorb** — mechanically identical from the
player's side but framed as a buff, which invites later tuning ("should the
absorb grant i-frames?") of something that is not a mechanic at all. Latching
the outcome states the actual rule.

Rejected: **leaving it — dying on the doorstep is the joke.** It is a real
joke, but it is act seven's joke. This game already has a scripted death as
its ending; spending an accidental version of it in act one, delivered by a
scoring quirk rather than by design, wastes it and reads as a bug — which is
exactly how it was found.

## G-034 · 2026-08-01 · The offer is three cards with one line of copy each
The level-up screen is three cards on a dimmed field: a glyph for what kind of
thing the item is (a sight, an arrow, chevrons, a shield, a clock), the name,
level pips, and ONE line that carries the mechanic and the joke together —
"Faster and more fragile. Youth." A card is chosen by key or by click. The
measure a menu in this genre has to pass: the player decides in about two
seconds and is back in the field. Justin's play report was that the old panel
forced more time in the menu than in the game, and he was right — it showed a
gain line and a cost line per item, which is a design document's sentence
structure, not a player's.

The glyph is a semantic tag on the item (`icon: 'speed'`) and the drawing
lives in the renderer, generated in-house from palette-locked line art at
boot — no assets, and `items.ts` stays Node-safe.

Rejected: **the gain/cost pair per card** (the first fix for the overflowing
panel, cut the same day). Balanced and honest, and it reads as homework: two
clauses to weigh per item is six clauses per decision, at 60 rivals per
minute. The full argument already lives in `enables`/`tradesAway`, where it
is a design record and not copy.

Rejected: **stat readouts** (damage numbers, cooldowns, percentages — the
genre-standard detailed card). Numbers invite optimising in the menu, and
this game's stated bet is that the menu is not where the game is. The one-line
blurb keeps the choice a judgement about how you want to play, which is the
only judgement the items are designed to differentiate.

## G-035 · 2026-08-01 · Item icons are objects from the life, made by the pipeline
The offer cards' icons are illustrated objects in the mid-century register,
generated, conformed and mechanically checked by the same pipeline as every
sprite: a printer's manicule for Lash (the reflex), a folded paper dart for
Motility, a retail starburst for Acrosome, a footprint for Wake, the classroom
horseshoe magnet for Chemotaxis, a canvas sneaker for Midpiece (Youth), an
open umbrella for Membrane (Adulthood), a twin-bell alarm clock for
Capacitation (the late bloomer). The items are the life script and the icons
say so — the card art carries theme, not just category.

Pipeline honesty came first: icons got a `card` surface in CHECK, judged for
contrast against the INK they actually sit on rather than the act background,
and exempt from the enemy value ceiling (card art may wear paper; field art
may not). The umbrella failed four straight attempts at contrast ZERO because
"deep plum" quantised to ink — an ink canopy on an ink card — and was
recoloured to a palette colour that exists. The paper dart takes the ruled
geometry override; the antibody's "only straight lines in the act" reservation
is about the field read, and a card on a stopped world cannot be mistaken for
a swarm object — the test now states that boundary.

Rejected: **keeping the drawn geometric glyphs** (a sight, chevrons, rays).
Legible and cheap, and they contribute nothing — every survivors game has an
abstract icon set, and this game's one visual asset is a register that makes
objects deadpan. Programmer art on the most-read panel in the game was the
"cheap" Justin kept naming.

Rejected: **depicting the mechanics literally** (a projectile for Lash, a
damage field for Wake). Accurate and game-y: it spends the card's only image
on information the blurb already carries, and says nothing about a life.

## G-036 · 2026-08-01 · The weapon in the field is the card's own object
Every active item's field effect is now its icon made kinetic: Lash fires the
manicule — a small pointing hand flying at whatever is nearest — Motility
fires the paper dart, Acrosome pops its retail starburst at full burst
radius, Wake stamps footprints behind the player (every second damage area,
alternating feet, rotated along the path), and Chemotaxis plants the
classroom magnet with a ring contracting toward it. Passives get quiet
presence: Membrane is a visible ring around the player, Midpiece is motion
streaks. Capacitation stays invisible on purpose — it is the late bloomer,
and not showing yet is its whole joke.

Justin's report was that the power-ups were invisible, and he was right
twice: you could not see what a weapon did, and you could not see that you
had it. Card icon and field effect being the same drawing fixes both at
once — a weapon chosen on a card is recognised the first time it fires.

The one rules-layer change is honest metadata: `ProjectileState.source`
names the item that fired it, because telling Lash from Motility by radius
and pierce is a heuristic waiting to break. Optional, so hand-built
projectiles in tests carry no obligation.

Rejected: **a second generation batch of bespoke effect art** (muzzle
flashes, beams, impact sprites). Doubles the asset surface for things
glimpsed at 400px/s, and it would give the cards and the field two different
vocabularies for the same weapon — the exact disconnect this fixes.

Rejected: **colour-coding the existing circles per weapon.** Tinting is
retired (G-032) and every colour in this game already has one job (law 10,
G-030). Shape carries identity here; hue is spoken for.

## G-037 · 2026-08-01 · Icons speak the sleek half of the period — a third geometry clause
The style system gains `pictogram` alongside `hand-cut` and `ruled`: 1960s
international-style iconography — airline and Olympic pictograms, Bass and
Rand — clean confident geometry, precisely balanced. It is the icon role's
default. Same period as the field's hand-cut register, other tradition, and
the split is by SURFACE: hand-cut is for creatures in the field, where
irregular reads as alive; on a card at 52px it reads as crude, which is
exactly what Justin reported. All eight icons regenerated under the new
clause; the cards hold them in a drawn medallion with a keycap box, so the
art sits in the card rather than floating on it.

Rejected: **keeping hand-cut for icons and tightening subjects one at a
time.** Tried, in effect, across two passes: the subject prompt fights the
style clause every single time, and per-subject patches against a wrong
register is exactly the failure D-005 exists to prevent — style belongs in
the style system.

Rejected: **a hand-drawn vector icon set outside the pipeline.** Sleekness
by fiat, and it forfeits provenance, the content rule, the palette lock and
the mechanical checks — the icons would be the only unchecked art in the
game, on its most-read panel.
