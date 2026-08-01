# Rival sperm

- **Asset id:** `rival-sperm`
- **Act:** conception
- **Role:** swarm
- **Model:** `fal-ai/flux/dev`
- **Seed:** `2002` (attempt 1)
- **Generated:** 2026-08-01T23:50:13.530Z
- **Sprite size:** 96px
- **Tests:** does it read at 48px in a crowd

**Why this life stage.** Conception is the only competition the player has already won, so the game opens by making it feel like a commute.

## Prompt

```
a single cartoon sperm cell seen from the side, a smooth blunt domed head with no hair and no tuft, half-lidded eyes almost closed, a flat horizontal line for a mouth, no eyebrows, a blank disinterested expression, completely uninterested, looking straight ahead in its direction of travel and not at the viewer, a single thin curled tail, flat muted dusty rose colouring, mid-tone, never pale and never white, mid-century modern commercial illustration, 1950s 1960s printed institutional graphic design, limited spot-colour screenprint, two or three flat muted ink colours, bold simplified flat shapes with a strong clear silhouette, very few interior details, large uninterrupted areas of flat colour, heavy confident line weight, chunky and readable, high contrast between shapes, designed to be recognised at a glance from a distance, no halftone dots, no fine hairlines, no small detail, no surface texture, no cross-hatching, slightly irregular hand-cut paper shapes, organic and asymmetric, never mechanical, muted mid-tone colouring throughout, no white, no off-white, no cream, no ivory, nothing paler than a soft tan, the lightest area is a muted tan and the darkest is a warm near-black, strictly flat two-dimensional, no perspective, no depth, no 3D, no isometric view, absolutely no gradients, no shading, no ambient occlusion, no rendered lighting, no glow, completely affectless, blank deadpan expression, indifferent, unbothered, not reacting, single subject, centred, entire subject visible with margin around it, plain solid #FF00FF magenta background, nothing else in frame, floating with no ground and no horizon, no drop shadow, no cast shadow, no contact shadow, not cute, not childish, not a modern cartoon, not vector clipart, full bleed, no frame, no border, no rule around the image, no poster edge, no panel, no text, no letters, no numbers, no watermark, no signature, no artist signature, no stamp, no seal, no chop mark, no printed margin, no caption
```

The subject half is authored per asset; the style half is identical for every
asset in the game and lives in `tools/art/batch.ts`:

```
mid-century modern commercial illustration, 1950s 1960s printed institutional graphic design, limited spot-colour screenprint, two or three flat muted ink colours, bold simplified flat shapes with a strong clear silhouette, very few interior details, large uninterrupted areas of flat colour, heavy confident line weight, chunky and readable, high contrast between shapes, designed to be recognised at a glance from a distance, no halftone dots, no fine hairlines, no small detail, no surface texture, no cross-hatching, slightly irregular hand-cut paper shapes, organic and asymmetric, never mechanical, muted mid-tone colouring throughout, no white, no off-white, no cream, no ivory, nothing paler than a soft tan, the lightest area is a muted tan and the darkest is a warm near-black, strictly flat two-dimensional, no perspective, no depth, no 3D, no isometric view, absolutely no gradients, no shading, no ambient occlusion, no rendered lighting, no glow, completely affectless, blank deadpan expression, indifferent, unbothered, not reacting, single subject, centred, entire subject visible with margin around it, plain solid #FF00FF magenta background, nothing else in frame, floating with no ground and no horizon, no drop shadow, no cast shadow, no contact shadow, not cute, not childish, not a modern cartoon, not vector clipart, full bleed, no frame, no border, no rule around the image, no poster edge, no panel, no text, no letters, no numbers, no watermark, no signature, no artist signature, no stamp, no seal, no chop mark, no printed margin, no caption
```

## Mechanical checks

| Check | Result | Measured | Expected |
|---|---|---|---|
| silhouette-area | pass | 0.2171 | 0.12–0.82 of canvas |
| background-contrast | pass | 0.4171 | >= 0.12 median Oklab L from conception-deep |
| background-contrast-coverage | pass | 0.006 | <= 0.4 of sprite may vanish into conception-deep |
| palette-conformance | pass | 0 | <= 0.0353 Oklab from a palette entry |
| palette-variety | pass | 5 | >= 2 distinct palette colours |
| palette-dominance | pass | 0.7456 | no colour above 0.97 of the sprite |
| readable-48px-silhouette | pass | 0.2248 | >= 0.084 coverage at 48px |
| readable-48px-structure | pass | 7 | >= 2 palette colours still visible at 48px |
| enemy-value-ceiling | pass | 0.8295 | <= 0.840 Oklab L (bone); paper belongs to the player |
| readable-48px-detail | pass | 0.4731 | >= 0.06 edge density at 48px |

## Rejected candidates

_None — passed on the first attempt._
