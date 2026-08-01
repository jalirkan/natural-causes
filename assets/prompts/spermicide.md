# Spermicide

- **Asset id:** `spermicide`
- **Act:** conception
- **Role:** swarm
- **Model:** `fal-ai/flux/dev`
- **Seed:** `8008` (attempt 1)
- **Generated:** 2026-08-01T09:54:38.048Z
- **Sprite size:** 72px
- **Tests:** a droplet that reads as asleep, with no interior detail at all

**Why this life stage.** Conception is the first stage where the environment was made lethal in advance by someone who will never be told whether it worked.

## Prompt

```
a single rounded teardrop-shaped droplet of liquid with a flat top and a smooth blunt bottom, flat muted red, one solid colour, absolutely no interior detail, no highlight, no shine, no bubbles, a small simple face low on the droplet: two downward-curving closed sleeping eye arcs and no mouth at all, peacefully asleep, unaware, completely unbothered, no arms, no legs, no tail, no ring, no circle around it, mid-century modern commercial illustration, 1950s 1960s printed institutional graphic design, limited spot-colour screenprint, two or three flat muted ink colours on off-white paper stock, bold simplified flat shapes with a strong clear silhouette, very few interior details, large uninterrupted areas of flat colour, heavy confident line weight, chunky and readable, high contrast between shapes, designed to be recognised at a glance from a distance, no halftone dots, no fine hairlines, no small detail, no surface texture, no cross-hatching, slightly irregular hand-cut paper shapes, organic and asymmetric, never mechanical, strictly flat two-dimensional, no perspective, no depth, no 3D, no isometric view, absolutely no gradients, no shading, no ambient occlusion, no rendered lighting, no glow, completely affectless, blank deadpan expression, indifferent, unbothered, not reacting, single subject, centred, entire subject visible with margin around it, plain solid #FF00FF magenta background, nothing else in frame, floating with no ground and no horizon, no drop shadow, no cast shadow, no contact shadow, not cute, not childish, not a modern cartoon, not vector clipart, full bleed, no frame, no border, no rule around the image, no poster edge, no panel, no text, no letters, no numbers, no watermark, no signature, no artist signature, no stamp, no seal, no chop mark, no printed margin, no caption
```

The subject half is authored per asset; the style half is identical for every
asset in the game and lives in `tools/art/batch.ts`:

```
mid-century modern commercial illustration, 1950s 1960s printed institutional graphic design, limited spot-colour screenprint, two or three flat muted ink colours on off-white paper stock, bold simplified flat shapes with a strong clear silhouette, very few interior details, large uninterrupted areas of flat colour, heavy confident line weight, chunky and readable, high contrast between shapes, designed to be recognised at a glance from a distance, no halftone dots, no fine hairlines, no small detail, no surface texture, no cross-hatching, slightly irregular hand-cut paper shapes, organic and asymmetric, never mechanical, strictly flat two-dimensional, no perspective, no depth, no 3D, no isometric view, absolutely no gradients, no shading, no ambient occlusion, no rendered lighting, no glow, completely affectless, blank deadpan expression, indifferent, unbothered, not reacting, single subject, centred, entire subject visible with margin around it, plain solid #FF00FF magenta background, nothing else in frame, floating with no ground and no horizon, no drop shadow, no cast shadow, no contact shadow, not cute, not childish, not a modern cartoon, not vector clipart, full bleed, no frame, no border, no rule around the image, no poster edge, no panel, no text, no letters, no numbers, no watermark, no signature, no artist signature, no stamp, no seal, no chop mark, no printed margin, no caption
```

## Mechanical checks

| Check | Result | Measured | Expected |
|---|---|---|---|
| silhouette-area | pass | 0.2365 | 0.12–0.82 of canvas |
| background-contrast | pass | 0.1438 | >= 0.12 median Oklab L from conception-deep |
| background-contrast-coverage | pass | 0.0049 | <= 0.4 of sprite may vanish into conception-deep |
| palette-conformance | pass | 0 | <= 0.0353 Oklab from a palette entry |
| palette-variety | pass | 8 | >= 2 distinct palette colours |
| palette-dominance | pass | 0.6974 | no colour above 0.97 of the sprite |
| readable-48px-silhouette | pass | 0.2452 | >= 0.084 coverage at 48px |
| readable-48px-structure | pass | 8 | >= 2 palette colours still visible at 48px |
| readable-48px-detail | pass | 0.8296 | >= 0.06 edge density at 48px |

## Rejected candidates

_None — passed on the first attempt._
