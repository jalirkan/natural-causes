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
