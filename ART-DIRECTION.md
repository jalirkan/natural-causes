# Art direction

> **Status: BINDING as of 2026-08-01.** Promoted from draft after the six-asset
> test batch was generated and judged. The laws below are enforced
> mechanically by `tools/art/` — an asset that breaks one is regenerated, not
> argued with.
>
> Rewritten by Claude Code from what the pipeline actually does, after three
> batches. The creative expansion of this document — new acts, new enemy
> families, the reserved-silhouette lists — is still Cowork's to own.

---

## The register

**Mid-century institutional.** The visual language of insurance pamphlets,
safety posters, annual reports and the diagrams that explain your benefits to
you. Muted spot inks on off-white stock, fine even line, strictly flat, visible
halftone. Printed, not rendered.

**Reference points:** mid-century commercial and instructional illustration —
Charley Harper, Jim Flora, corporate annual-report art, safety signage. Chris
Ware is the north star for applying that vocabulary to bleak ordinary American
life, and for rendering a life *as a diagram*.

The joke is that the game is drawn in the register of the institutions it is
about. That is a joke a modern cartoon style cannot make, because it comments
on the thing rather than being it.

**Not:** Adult Swim / modern thick-line cartoon — tried first, judged too toony
(D-017). Not Cuphead, not pixel art, not painterly storybook. Alt-comix
editorial ink and risograph zine were both considered and rejected for the same
reason: they are made of hatching and texture, and neither survives to 48px.

### What the first batch got wrong, recorded so it is not repeated

Two of the three "toony" signals were the *pipeline's*, not the generator's: a
pure-black uniform contour applied in post, and a twenty-colour saturated
palette. When the look is wrong, check `conform.ts` and `palette.ts` before
blaming the model.

## The laws

Enforced in code. The check that enforces each one is named.

1. **One outline weight across the whole game**, scaled proportionally with
   sprite size, never varied for effect. `OUTLINE_RATIO`, 2/96, in a warm
   near-black — never pure black.
2. **Flat fills.** No gradients, no rendered lighting, no ambient occlusion.
   Shadow is a second flat tone at most. Alpha is binarised, so no soft edge
   survives.
3. **Locked palette.** Twenty colours, act tints included. Every asset is
   quantised to it after generation. `palette-conformance`, tolerant of exactly
   the grain amplitude and nothing more.
4. **Hand-cut, never mechanical** — with the deliberate exception of the Office
   act, where ruled geometry *is* the joke. Selected per act by
   `styleSuffix()`, because in prose this exception produced a prompt demanding
   both at once.
5. **Faces on everything that can hold one.** Homework has a face. The mortgage
   has a face. Every box in the org chart has a face.
6. **Silhouette carries identity; colour carries threat.** A fixed threat
   palette — contact, ranged, elite, boss — overlays the act palette.
7. **Readable at 48px.** Authored to be recognisable at gameplay size against
   its act background. `readable-48px-silhouette`, `readable-48px-detail`,
   `readable-48px-structure`.
8. **The comic register is indifference, not anxiety.** Enemies do not react to
   the player. They are bored, already decided, looking somewhere else. This is
   the throughline of everything that worked in the first batch, and the one
   asset that emoted at the player is the one that failed.
9. **Enemies are roles, not people.** A human enemy is rendered as the role it
   performs — the clipboard and the lanyard are the character; the person
   carries them. An enemy the player pities is aimed at the wrong target, and
   is the same failure as D-007 one step over.

## The detail budget (D-018)

Uneven on purpose, like the animation budget. The register is built out of fine
line and halftone, both illegible below roughly 100px.

| | Treatment |
|---|---|
| **Swarm enemies, player** | Bold flat shapes, strong silhouette, large uninterrupted colour. No halftone, no hairlines. No grain. |
| **Bosses, backgrounds, UI, title, certificate** | The full register — halftone, fine line, misregistration, grain |

Spend the register where the camera rests. `readable-48px-structure` fails any
asset that only reads at the resolution it was generated in.

## Animation budget

| | Treatment | Why |
|---|---|---|
| **Enemies** | Single static sprite + tweens | Reads at horde scale; costs nothing |
| **Player** | Real frames — idle, walk, hit, death | Always on screen |
| **Bosses** | Real frames — idle, telegraph, attack, death | The telegraph is a gameplay requirement |
| **Pickups / UI** | Static + tween | — |

## The pipeline

Consistency is a code problem, not a prompting problem (D-005).

```
1. GENERATE   Flux via fal. One entity per image, chroma background,
              style suffix varying only by act and by detail budget.
2. CUT        Background removal, shadow removal, frame handling,
              scenery removal, alpha trim, centre on canvas.
3. CONFORM    Quantise to the locked palette. Outline to standard weight.
              Normalise to the act's scale grid.
4. TEXTURE    Grain — bosses only.
5. CHECK      Mechanical rejection. Regenerate on failure with a mutated seed.
6. PACK       Sprite atlas, per act.
```

Three things the register does that CUT has to survive, all learned the hard
way and all covered by tests:

- **It draws cast shadows** however firmly the prompt forbids them. Keyed by
  hue angle, because Oklab chroma shrinks with lightness.
- **It draws framed posters**, and a frame at the image edge blocks the flood
  fill. CUT retries from deeper insets; the test for "blocked" is whether the
  fill reached the corners, never cleared area.
- **It composes pictures** — cloud banks, distant aircraft, signatures.
  Anything wholly outside the subject's bounding box is not the subject.

**The generator ignores the requested backdrop colour.** It is detected from
the border ring, never assumed.

**Every generation prompt is committed** alongside the asset it produced
(D-010). An asset whose prompt is not in `assets/prompts/` does not ship.

## Still open

Raised by `TEST-BATCH-CONCEPTS.md` and deliberately not settled here:

- A player-reservation rule for the threat palette — the player never wears
  contact/ranged/elite/boss colours, so those always mean "this will hurt you".
- Whether other Office enemies also get ruled geometry, or whether the Reorg is
  the only clean thing in the act and that is why it is frightening. The second
  is better.
- Per-act silhouette reservation lists — no other School enemy may be a bright
  hard rectangle. A pipeline feature that does not exist yet.
