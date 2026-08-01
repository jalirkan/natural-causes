# Art direction

> **Status: DRAFT — not binding until the test batch is reviewed.**
> Six assets across three life stages get generated and judged by Justin before
> anything here becomes law. Committing to a visual direction from a written
> description is how a project discovers in week three that it hates its own
> look. Everything below is the hypothesis being tested.

---

## The register

**Adult Swim.** Thick uniform outlines, flat saturated fills, lumpy asymmetric
proportions, deadpan expressions on absurd things. The game does not take itself
seriously at any point and the art is the first thing that says so.

**Reference points:** *Smiling Friends* (closest — modern, thick-line, lumpy,
deadpan), *Aqua Teen Hunger Force*, *Ugly Americans*, Adult Swim bumpers,
*King Star King*.

**Not:** Cuphead (rubber-hose is a different and more expensive joke), pixel art,
mid-century instructional (considered and rejected — too precious for a game
this unserious), painterly storybook (prettiest, falls apart across 60 assets).

## The laws

Provisional, but these are the ones the pipeline enforces mechanically, so they
are the ones worth arguing about now.

1. **One outline weight across the whole game.** Scaled proportionally with
   sprite size, never varied for effect. This is the single biggest driver of
   "looks art-directed" versus "looks generated."
2. **Flat fills.** No gradients, no rendered lighting, no ambient occlusion.
   Shadow is a second flat tone at most.
3. **Locked palette.** 16–20 colours total, act tints included. Every asset is
   quantised to it after generation. An asset that quantises badly gets
   regenerated, not hand-corrected.
4. **Lumpy, never geometric.** Asymmetry and wrong proportions are the style.
   Anything that reads as clean or corporate is off-model — with the deliberate
   exception of the Office act, where clean *is* the joke.
5. **Faces on everything that can hold one.** Homework has a face. The mortgage
   has a face. This is where the humour lives, and it is the whole reason the
   earlier faceless-pictogram direction was rejected.
6. **Silhouette carries identity; colour carries threat.** At horde scale a
   player identifies *how a thing hurts* before *what it is*. A small fixed
   threat palette overlays the act palette: contact, ranged, elite, boss.
7. **Readable at 48px.** Every enemy is authored to be recognisable at gameplay
   size against its act background, not at the resolution it was generated in.

## Animation budget

Deliberately uneven. Spend where the camera rests.

| | Treatment | Why |
|---|---|---|
| **Enemies** | Single static sprite + tweens: squash, stretch, bob, rotate, flash | Reads correctly at horde scale; costs roughly nothing; hundreds on screen |
| **Player** | Real frames — idle, walk, hit, death | Always on screen, always being watched |
| **Bosses** | Real frames — idle, telegraph, attack, death | The telegraph frame is a gameplay requirement, not a flourish |
| **Pickups / UI** | Static + tween | — |

Multi-frame animation for ordinary enemies is 5–10× the asset work for something
a player never looks at directly. Refused on purpose.

## The pipeline

**Consistency is a code problem, not a prompting problem.** Sixty coherent
enemies do not come from better prompts. They come from generating loosely and
enforcing conformance downstream — which is ordinary image code, runs
unattended, and is exactly what Claude Code is good at.

```
1. GENERATE      Flux via API. One entity per image, plain background,
                 fixed style suffix, locked seed family per act.
2. CUT           Background removal, alpha trim, centre on canvas.
3. CONFORM       Quantise to locked palette. Outline pass to the standard
                 weight. Normalise to the act's scale grid.
4. TEXTURE       Light grain overlay, uniform across all assets. Hides
                 generation artefacts and unifies inconsistent output.
5. CHECK         Mechanical rejection — silhouette area within band,
                 contrast against act background above threshold, palette
                 conformance, readable bounding box at 48px.
6. PACK          Sprite atlas, per act.
```

Step 5 is what makes the run unattended: a failed asset is regenerated with a
mutated seed, not escalated to a human. Everything that survives is in-style by
construction.

**Every generation prompt is committed** alongside the asset it produced. An
asset whose prompt is not in the repository does not ship — the same reasoning
as the rest of this portfolio, where a claim without its provenance is not
evidence.

## The test batch

Six assets, three life stages, generated before any of the above is binding:

| # | Asset | Stage | Tests |
|---|---|---|---|
| 1 | Player — sperm form | Conception | Can the style do "protagonist" at all |
| 2 | Rival sperm — swarm enemy | Conception | Does it read at 48px in a crowd |
| 3 | The Egg — boss | Conception | Does scale hold up; is a boss impressive |
| 4 | Substitute teacher — swarm enemy | School | Faces, humour, human characters |
| 5 | Predator drone — swarm enemy | Service | Mechanical subject in an organic style |
| 6 | The Reorg — boss | Office | Can it render an abstraction as a monster |

Assets 4 and 6 are the real tests. Anything can draw a sperm cell; the project
lives or dies on whether "a substitute teacher who does not know your name" and
"a corporate reorganisation" are funny as sprites.

**Review question for Justin:** not "is this good art" but **"is this funny, and
would I keep playing a game that looked like this for twenty minutes."**
