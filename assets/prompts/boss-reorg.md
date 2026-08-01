# The Reorg

- **Asset id:** `boss-reorg`
- **Act:** office
- **Role:** boss
- **Model:** `fal-ai/flux/dev`
- **Seed:** `6006` (attempt 1)
- **Generated:** 2026-08-01T08:28:23.008Z
- **Sprite size:** 384px
- **Tests:** can the style render an abstraction as a monster — THE REAL TEST

**Why this life stage.** The Office is the first stage where the player's life is decided by a diagram that somebody else is allowed to edit.

## Prompt

```
a cartoon monster made entirely of a tall swaying organisational chart, a lumpy ziggurat of rectangular boxes, wider at the base, stacked several rows high, the boxes at slightly different sizes and slight rotations, joined by thick straight right-angled connector lines drawn at the same heavy weight as the outlines, corporate blue-grey and white, clean and rigid, right angles everywhere, every box has a small flat deadpan face inside it, the faces look at each other or upward, none of them looking at the viewer, one slightly larger box at the very top is completely empty with no face inside it, flat 2D cartoon illustration, adult animated comedy style, rigid geometric shapes with clean straight edges and true right angles, the wrongness coming entirely from the arrangement and never from the shapes, thick uniform black outline of even weight around every shape, flat saturated fills only, absolutely no gradients, no shading, no ambient occlusion, no rendered lighting, no glow, deadpan expression, played completely straight, single subject, centred, entire subject visible with margin around it, plain solid #FF00FF magenta background, nothing else in frame, floating with no ground and no horizon, no drop shadow, no cast shadow, no contact shadow, no text, no letters, no numbers, no watermark, no signature, no border
```

The subject half is authored per asset; the style half is identical for every
asset in the game and lives in `tools/art/batch.ts`:

```
flat 2D cartoon illustration, adult animated comedy style, rigid geometric shapes with clean straight edges and true right angles, the wrongness coming entirely from the arrangement and never from the shapes, thick uniform black outline of even weight around every shape, flat saturated fills only, absolutely no gradients, no shading, no ambient occlusion, no rendered lighting, no glow, deadpan expression, played completely straight, single subject, centred, entire subject visible with margin around it, plain solid #FF00FF magenta background, nothing else in frame, floating with no ground and no horizon, no drop shadow, no cast shadow, no contact shadow, no text, no letters, no numbers, no watermark, no signature, no border
```

## Mechanical checks

| Check | Result | Measured | Expected |
|---|---|---|---|
| silhouette-area | pass | 0.451 | 0.25–0.95 of canvas |
| background-contrast | pass | 0.1975 | >= 0.12 median Oklab L from office-deep |
| background-contrast-coverage | pass | 0.0572 | <= 0.4 of sprite may vanish into office-deep |
| palette-conformance | pass | 0.032 | <= 0.0353 Oklab from a palette entry |
| palette-variety | pass | 8 | >= 3 distinct palette colours |
| palette-dominance | pass | 0.3174 | no colour above 0.9 of the sprite |
| readable-48px-silhouette | pass | 0.4648 | >= 0.175 coverage at 48px |
| readable-48px-detail | pass | 0.5154 | >= 0.06 edge density at 48px |

## Rejected candidates

_None — passed on the first attempt._
