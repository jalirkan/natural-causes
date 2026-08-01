# Antibody

- **Asset id:** `antibody`
- **Act:** conception
- **Role:** swarm
- **Model:** `fal-ai/flux/dev`
- **Seed:** `9009` (attempt 1)
- **Generated:** 2026-08-01T09:56:06.024Z
- **Sprite size:** 44px
- **Tests:** the Y — the only straight lines in the act, at the smallest size in it

**Why this life stage.** Conception is where the first record about the player is opened, and it describes a category rather than a person.

## Prompt

```
a bold capital letter Y as a simple flat geometric symbol, three thick straight bars of exactly equal thickness meeting at one central junction, two bars angling upward and apart in a wide V, one bar pointing straight down, all three limbs roughly the same length as each other, short and heavy, not thin, not tapering, perfectly straight edges and sharp square corners, no curves anywhere on it, flat dark grey-brown, one solid colour and nothing else, one small pale cream square tag centred on the junction where the bars meet, the tag carries two small dark dots for eyes and no mouth and nothing else, no other detail, no texture, no shading, not a fork, not cutlery, not a utensil, not a tree, not a branch, not a slingshot, mid-century modern commercial illustration, 1950s 1960s printed institutional graphic design, limited spot-colour screenprint, two or three flat muted ink colours on off-white paper stock, bold simplified flat shapes with a strong clear silhouette, very few interior details, large uninterrupted areas of flat colour, heavy confident line weight, chunky and readable, high contrast between shapes, designed to be recognised at a glance from a distance, no halftone dots, no fine hairlines, no small detail, no surface texture, no cross-hatching, precise ruled geometry with true right angles and straight edges, drafted rather than drawn, the wrongness coming entirely from the arrangement and never from the shapes, strictly flat two-dimensional, no perspective, no depth, no 3D, no isometric view, absolutely no gradients, no shading, no ambient occlusion, no rendered lighting, no glow, completely affectless, blank deadpan expression, indifferent, unbothered, not reacting, single subject, centred, entire subject visible with margin around it, plain solid #FF00FF magenta background, nothing else in frame, floating with no ground and no horizon, no drop shadow, no cast shadow, no contact shadow, not cute, not childish, not a modern cartoon, not vector clipart, full bleed, no frame, no border, no rule around the image, no poster edge, no panel, no text, no letters, no numbers, no watermark, no signature, no artist signature, no stamp, no seal, no chop mark, no printed margin, no caption
```

The subject half is authored per asset; the style half is identical for every
asset in the game and lives in `tools/art/batch.ts`:

```
mid-century modern commercial illustration, 1950s 1960s printed institutional graphic design, limited spot-colour screenprint, two or three flat muted ink colours on off-white paper stock, bold simplified flat shapes with a strong clear silhouette, very few interior details, large uninterrupted areas of flat colour, heavy confident line weight, chunky and readable, high contrast between shapes, designed to be recognised at a glance from a distance, no halftone dots, no fine hairlines, no small detail, no surface texture, no cross-hatching, precise ruled geometry with true right angles and straight edges, drafted rather than drawn, the wrongness coming entirely from the arrangement and never from the shapes, strictly flat two-dimensional, no perspective, no depth, no 3D, no isometric view, absolutely no gradients, no shading, no ambient occlusion, no rendered lighting, no glow, completely affectless, blank deadpan expression, indifferent, unbothered, not reacting, single subject, centred, entire subject visible with margin around it, plain solid #FF00FF magenta background, nothing else in frame, floating with no ground and no horizon, no drop shadow, no cast shadow, no contact shadow, not cute, not childish, not a modern cartoon, not vector clipart, full bleed, no frame, no border, no rule around the image, no poster edge, no panel, no text, no letters, no numbers, no watermark, no signature, no artist signature, no stamp, no seal, no chop mark, no printed margin, no caption
```

## Mechanical checks

| Check | Result | Measured | Expected |
|---|---|---|---|
| silhouette-area | pass | 0.1901 | 0.12–0.82 of canvas |
| background-contrast | pass | 0.1438 | >= 0.12 median Oklab L from conception-deep |
| background-contrast-coverage | pass | 0.038 | <= 0.4 of sprite may vanish into conception-deep |
| palette-conformance | pass | 0 | <= 0.0353 Oklab from a palette entry |
| palette-variety | pass | 6 | >= 2 distinct palette colours |
| palette-dominance | pass | 0.8397 | no colour above 0.97 of the sprite |
| readable-48px-silhouette | pass | 0.1966 | >= 0.084 coverage at 48px |
| readable-48px-structure | pass | 5 | >= 2 palette colours still visible at 48px |
| readable-48px-detail | pass | 0.3394 | >= 0.06 edge density at 48px |

## Rejected candidates

_None — passed on the first attempt._
