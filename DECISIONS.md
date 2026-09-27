# Decision Ledger

Running log of design decisions worth not relitigating. Append as you go.
Format follows `ai-audit-toolkit/DECISIONS.md`.

Content and creative decisions live in `DESIGN-DECISIONS.md`. This file is for
technical and structural choices.

## D-001 · 2026-08-01 · Vampire Survivors–like, progression is a human life
The genre already does the emotional work: a run makes you stronger, fills the
screen with worse things, and ends. That is a life. Pointing it at the obvious
subject costs nothing mechanically and gives every system a reason to exist.
Rejected: a narrative roguelike (writing-heavy, and an unattended agent writes
mediocre prose faster than anyone can review it) and a management sim (no
moment-to-moment feel, which is the thing that has to be fun first).

## D-002 · 2026-08-01 · Phaser 3, not Godot
Godot is the better engine and it is the wrong choice here, because its strength
is its editor and **an agent cannot use an editor**. Phaser is authored entirely
in code, so Claude Code can write every emitter, tween and shader during an
unattended run. Choosing Godot would make Justin the bottleneck on exactly the
work that is supposed to run while he sleeps. Rejected also: raw Canvas (would
mean hand-rolling particles, cameras and tweens, which is the "impressive-looking
for free" layer) and PixiJS alone (a renderer, not an engine — correct if entity
counts become the binding constraint, and the fallback if they do).

## D-003 · 2026-08-01 · Browser target, playable from a link
Zero install between a reader and the game. For a portfolio piece the download
step is where most of the audience is lost. Constrains asset budget and memory,
which is a discipline rather than a cost.

## D-004 · 2026-08-01 · API-accessible image generation beats better image generation
Midjourney has the best style consistency via `--sref` and no API — generation
happens by hand in Discord, which breaks every unattended run. Flux via
Replicate or fal is slightly worse per image and can be driven by code, so asset
work happens overnight instead of in Justin's evenings. Quality per image is the
wrong metric; **assets per unattended hour** is the right one. Local SDXL on the
workstation's GTX 1080 is a fallback: free, 8GB VRAM is tight, viable for
overnight batches and painful for iteration.

## D-005 · 2026-08-01 · Style consistency is enforced downstream, never upstream
Sixty coherent enemies do not come from better prompts. They come from
generating loosely and then quantising to a locked palette, applying a uniform
outline and grain, and **mechanically rejecting** anything that fails a
silhouette, contrast or palette check. Regeneration on failure is automatic, so
no human is in the loop. This converts an art problem into an image-processing
problem, which is the only form in which it can run unattended.

## D-006 · 2026-08-01 · Uneven animation budget, on purpose
Static sprites plus tweens for ordinary enemies; real frames only for the player
and bosses. Multi-frame animation for a swarm enemy is 5–10× the asset work for
something no player looks at directly. The boss telegraph frame is the exception
and is a gameplay requirement rather than a flourish.

## D-007 · 2026-08-01 · Enemies are conditions and institutions, never identity groups
No enemy is defined by religion, ethnicity, nationality or race — in art, name,
description, or generation prompt. The Service act fights the war: paperwork,
heat, drones, the absurdity of being nineteen and there.

The creative reason is the stronger one. The satire is aimed at the American
life script, so an enemy that is *a category of person* aims at the wrong target
and is straightforwardly less funny than the bureaucracy. The practical reason
is that this repository is public and attached to a professional identity.

Recorded as a hard rule because unattended agents drift toward whatever is
generically "military" in training data, and this has to survive a long run with
nobody watching. A generation prompt violating this is a build failure, not a
review comment.

## D-008 · 2026-08-01 · The study is observational, not experimental
Comparing agent topologies properly means building the same feature several ways,
which would produce cleaner causal claims and a worse game. The game is the
point, so the process is instrumented and reported instead: what structure did
what, where it failed, what a human had to intervene on. Published with honest
caveats about n=1. The transcripts are themselves the artifact — corpora of agent
development sessions with outcomes attached barely exist.

## D-009 · 2026-08-01 · Nothing in ART-DIRECTION.md is binding until the test batch
Six assets, three life stages, judged by Justin before the style becomes law.
Two of the six — a substitute teacher and a corporate reorganisation — are the
real test, because anything can draw a sperm cell and the project lives or dies
on whether abstractions render as funny monsters. Committing to a visual
direction from prose is how a project discovers in week three that it hates its
own look.

## D-010 · 2026-08-01 · Every generation prompt is committed with its asset
An asset whose prompt is not in the repository does not ship. Same reasoning as
the rest of this portfolio: a result without its provenance is not evidence, and
in this case it is also unreproducible — a style that cannot be regenerated
cannot be extended six months later.

## D-011 · 2026-08-01 · Phase 2 is the risk gate, and it is one act
A Vampire Survivors–like lives or dies on the feel of a single act. If the
Conception act is not fun, seven acts will not fix it. Phase 2 ships one act
tuned by playtest bots and judged by a human before any further act is designed.
Better three excellent acts and a stated roadmap than seven thin ones.

## D-012 · 2026-08-01 · fal, not Replicate — and the reason is not quality
D-004 named "Replicate or fal" and left the pick open. fal, on `fal-ai/flux/dev`:
a synchronous endpoint that returns an image URL in about one second, so the
pipeline needs no polling loop and no job-state machine. Replicate's prediction
API is a create-then-poll cycle, which is more code to write and more code to
get wrong at 4am. Nothing about image quality decided this and nothing should
have — D-004 already settled that the metric is assets per unattended hour.
Switching is a one-function change in `tools/art/generate.ts`; the pipeline
depends on "a function that returns a PNG", not on fal.

## D-013 · 2026-08-01 · Background removal is a flood fill, not a model call
CUT keys the backdrop out with a border-seeded flood fill in Oklab rather than
calling a segmentation model. It costs nothing per asset, adds no second
provider, and is deterministic — rerunning the pipeline on the same raw image
produces the identical cut, which a model call does not guarantee.

The fill is seeded from the image edge and constrained to connected regions, so
a background-coloured area *enclosed by the subject* survives; a global
"delete every pixel near this colour" pass would eat it.

Rejected: `fal-ai/birefnet` and similar. Better on photographs, irrelevant here
— the input is a flat cartoon on a flat backdrop, which is the easy case.

**The generator ignores the requested backdrop colour.** The prompt asks for
`#FF00FF`; Flux returns pink, salmon, whatever it likes. So the background
colour is *detected* from the border ring rather than assumed. Anything that
hard-codes the chroma colour will break.

## D-014 · 2026-08-01 · Contrast against the act background is a median, not a mean
The first test batch rejected the drone four times on `background-contrast`,
measuring 0.0156 for a sprite with obviously strong contrast. The check was
computing `|mean(L) - background.L|`, and a sprite that is half black outline
and half bone averages to mid-grey — which is what a mid-tone act background
also is. The mean cancelled a real contrast to nearly zero.

Now the median per-pixel separation, which has no such failure. Kept alongside
it: the fraction of the sprite sitting within the contrast floor, because a
sprite can pass on aggregate while one whole limb disappears.

Recorded because the check nearly got "fixed" by loosening its threshold, which
would have kept the bug and disabled the test.

## D-015 · 2026-08-01 · Grain runs after quantisation, and the palette check is tolerant of exactly the grain
ART-DIRECTION orders the stages TEXTURE then CHECK, so the grain perturbs
colours before palette conformance is measured. Rather than move the stages or
drop the guarantee, palette conformance asserts every opaque pixel is within
the grain's declared amplitude of a palette entry. A rogue colour still fails by
an order of magnitude; the intended texture passes. The tolerance is derived
from `GRAIN_AMPLITUDE` in code, not typed in as a constant, so the two cannot
drift apart.

## D-016 · 2026-08-01 · The Office act's exception to law 4 lives in the prompt builder
Law 4 is "lumpy, never geometric — except the Office act, where clean is the
joke." Left in prose, that exception produced a prompt ordering the generator to
make the org chart both "lumpy asymmetric, never corporate-clean" and "rigid,
right angles everywhere" in one sentence. The proportion clause is now selected
per act by `styleSuffix()`, and a test asserts only the Office act gets the
clean variant. An exception a document states and a prompt contradicts is not an
exception, it is a bug.

## D-017 · 2026-08-01 · The register is mid-century institutional, not Adult Swim
Replaces the Adult Swim direction after the first test batch was judged. The
verdict was "too toony", and the diagnosis matters more than the verdict: the
original choice had been made as a binary against mid-century instructional,
which was rejected as "too precious". Two options is not a search.

The register is now the visual language of the institutions the game is about —
insurance pamphlets, safety posters, annual-report diagrams. Muted spot inks on
stock, fine even line, strictly flat, halftone. That is a joke the Adult Swim
register cannot make, because it *is* the thing being satirised rather than a
comment on it.

**Two of the three toon signals were this pipeline's, not the generator's:** a
pure-black uniform contour applied in post, and a twenty-colour saturated
palette. Worth recording because the first instinct was to blame Flux, and the
fix was in `conform.ts` and `palette.ts`.

Rejected: alt-comix / editorial ink — closest to the content, and it dies at
sprite scale even harder than this does, being made entirely of hatching.
Rejected: risograph zine — the texture is the whole idea, and texture is
exactly what does not survive to 48px.

The creative rationale still needs a `DESIGN-DECISIONS.md` entry and a rewrite
of `ART-DIRECTION.md`, both of which are Cowork's to own. This entry records
only what the pipeline now does.

## D-018 · 2026-08-01 · Detail budget by role — the register lives where the camera rests
Mid-century institutional is built out of fine line weight and halftone, and
both are illegible below roughly 100px. The full-size generations are the best
images the project has produced; the 96px sprites made from them are pale
smudges. That is not a tuning problem, it is the register meeting the genre.

So the detail budget is uneven on purpose, the same way the animation budget is
(D-006). Swarm enemies and the player are authored as bold flat shapes with
strong silhouettes and almost no interior detail. Bosses, backgrounds, UI, the
title and the end-of-run certificate carry the full register. The prompt now
varies by role, and grain is applied at boss scale but not at swarm scale,
where it is indistinguishable from noise.

Enforced rather than intended: `check.ts` measures edge density at full size
and again at 48px, and rejects a small sprite whose detail collapses between
the two. An asset that only reads at the resolution it was generated in fails,
which is the failure this decision exists to prevent.

Rejected: bigger, fewer enemies — sprites at 150–200px so the texture survives.
It would work, and horde density is most of what makes the genre feel good;
trading it for surface texture is trading the game for the picture.
Rejected: dropping the register back to something that survives at any size —
that is how the first batch happened.

## D-019 · 2026-08-01 · Drifting enemies cross the arena; they do not walk randomly
CONCEPTION-ROSTER §3.2 says the spermicide "never acknowledges the player's
position at any point in its life", and the first implementation took that
literally: a uniformly random heading, fixed at spawn.

Measured over a full 300-second act, that produced **3 antibody attachments
from 220 spawns**. Enemies spawn on a ring just outside the viewport, so a
uniform heading sends half of them straight back out of it to be culled. The
design expects roughly a dozen stacks by minute four and reads the drag as the
act's quiet failure mode; at three stacks the mechanic does not exist.

Drift headings are now inbound with a 120° spread, so a drifter crosses the
play area. Nothing steers and nothing is corrected after spawn, so "drifts,
does not pursue" holds and the enemy still has no intent — the spread is wide
enough that being caught reads as a current rather than as something coming for
you. Re-measured: 15 stacks by minute four, player speed 190 → 119.

Recorded rather than folded in silently because it is a deviation from the
design's literal wording, decided on a number the design could not have had.
If the wording matters more than the mechanic, this is the line to change.

## D-020 · 2026-08-28 · Law 11 is enforced where the money is, and reported where it is read
`assertReserved` and `RESERVATIONS` existed and nothing called them. Six tests
exercised the reserved list and the pipeline did not, so law 11 constrained a
test file rather than a generation run — while `ART-DIRECTION.md` recorded it
as enforced. The list is now asserted inside `generate()`, next to the D-007
check and before the key is read, so an unreserved asset costs nothing instead
of costing an image, and `pipeline.ts` treats the refusal as non-retryable
alongside a content-rule violation: a mutated seed has never fixed a document.

The refusal comes in two kinds and they are not the same kind. An asset missing
from a list its act *has* is this repository contradicting itself. An act with
no list at all is a document nobody has written yet — Cowork's open item,
already recorded in `ART-DIRECTION.md`. `--dry` fails on the first and names
the second, printing a verdict line per asset and a tally; `generate()` refuses
both. Service and Office currently print as refused, which is the honest state
of the project rather than a regression.

The first run of this refused `player-sperm`. That is the find: the vocabulary
answers *how does this hurt me* — G-030 had already narrowed the antibody's
clause to "among the act's ENEMIES" for the same reason — and the player is a
comet with a tuft in an act where the comet belongs to the rivals. Pickups were
exempt; the player never was, because no test had passed a player id in.
Verdicts are role-aware now.

Rejected: `--dry` fails on any refusal. It is the stricter rule and it turns CI
red over two assets that shipped before law 11 existed, in acts whose lists are
somebody else's to write. A check that a person cannot act on gets switched off.
Rejected: enforce in `runBatch` rather than in `generate()`. It reads tidier and
it leaves a hole — anything calling `generate()` directly, which the pipeline
tests do, would skip the law. The check belongs at the last point before the
request, which is exactly where D-007 already sits.

## D-021 · 2026-08-28 · School's three behaviours are flags on `EnemyDef`, and the rest is not built
`SCHOOL-ROSTER.md` §4 hands over `bounce`, `patrol` and `merge` as per-enemy
flags rather than systems, and that is what they are. Bounce reflects the
component that crossed the arena bound; patrol negates both and retraces its
line; merge is static, combines with its own kind on arrival, and is solid to
every mover. The difference between the first two is four lines of arithmetic
and it is the entire difference between "the arena edges matter" (dodgeball)
and "there is a lane you have to time" (hall monitor).

Two consequences worth recording. Enemies that belong to the arena are exempt
from the distance cull, or the room quietly resets itself whenever the player
walks away from it. And `contact: 'none'` is a new mode rather than
`contactDamage: 0`, because zero damage still takes the `hurt` path, which sets
i-frames — harmless homework would have been a free source of invulnerability,
and nothing about that bug looks wrong on screen.

Merging conserves rather than chooses: area-preserving radius, summed HP and
XP. The roster says the merged pile is LARGER and leaves the rest to playtest
("playtest owns the number, not the shape"), and conservation is the only
growth rule available that adds no free parameter for playtest to have to own.

NOT BUILT, each because building it means picking a balance number nobody has
set, while tuning is frozen pending §12.4: the substitute's attack (gated on a
player name that does not exist, and every placeholder number is a number);
homework's arrival point ("where the player has recently been" — *recently* is
the same class of dial as `ANTIBODY_LEAD`); the hall monitor's momentary stop;
and School's wave schedule and act clock, which §5 leaves undesigned. School
therefore has enemies and no `ActDef`: the data and the behaviour exist and
nothing spawns them in a run.

Rejected: implement the wave schedule from the roster's introduction ORDER and
invent the rates. It would make the act playable this afternoon and it would
put five invented numbers into a project whose entire current bottleneck is
that one person has not yet answered six questions about numbers.
Rejected: a `SCHOOL_ENEMIES` registry beside `ENEMIES`. It is the sibling-
collection trap CONCEPTION-ROSTER §5.3 names for items — the content tests
enforce their rules by iterating one collection, so a second one is a rule that
silently stops applying to an act. School is a section inside the registry.

## D-022 · 2026-09-27 · Placeholder numbers are built and labelled, not withheld — School gets its schedule
Supersedes D-021's *reason* for not building, and reverses its schedule item.
D-021 declined School's schedule because every rate was a number nobody had
set; four weeks later nobody had, because there was nothing to play. Its
principle — never *claim* a number is tuned from bot data — was right; its
corollary — do not *build* until a person has tuned — stalled the project
(PLAN.md, 2026-09-27). So: `SCHOOL` exists with placeholder rates escalating
in the shape Conception's did, carries a `provisional` sentence naming what
retires it, and a test requires that sentence of every act not listed as
tuned. The bots run it (`--act=school`); the title starts only `ACTS`, which a
test ties to `ACT_VISUALS`. The boss at 300s is the Egg standing in. D-021's
other three items — the substitute's attack, homework's arrival point, the
monitor's stop — stay unbuilt and are now owed labelled placeholders.
Rejected: a per-act `tuned: boolean` — a flag says nothing about *what*
resolves it, which is the whole content of the label.
Rejected: a `HEADLESS_ACTS` list the content rules skip — the sibling-
collection trap D-021 avoided.

## D-023 · 2026-09-27 · `main` deploys to GitHub Pages, and the deploy is not gated on CI
D-003 said "playable from a link" and for two months there was no link, so
every human judgement needed a machine with `pnpm dev` running and none was
made. `deploy.yml` publishes every push to `main`. It runs the production
build (typecheck included) and nothing else: CI answers "is the code right",
the link answers "can Justin play what is on main", and a red badge next to a
live link is a legible state while a green badge and no link is the one the
project was stuck in. Dev mode does not ship; it is behind `import.meta.env.DEV`.
The repository was private when this was written and was made public the same
day so Pages could serve it; D-007's "the repository is public" holds again.
Rejected: deploy only after CI passes — a flaky or slow check would then hold
the one artefact this project most needs to exist.
Rejected: deploy from the feature branch too — a link that changes under
Justin mid-session is worse than one that changes when work lands.
