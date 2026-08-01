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
