# Rival sperm

- **Asset id:** `rival-sperm`
- **Act:** conception
- **Role:** swarm
- **Model:** `fal-ai/flux/dev`
- **Seed:** `2002` (attempt 1)
- **Generated:** 2026-08-01T08:28:01.465Z
- **Sprite size:** 96px
- **Tests:** does it read at 48px in a crowd

**Why this life stage.** Conception is the only competition the player has already won, so the game opens by making it feel like a commute.

## Prompt

```
a single cartoon sperm cell seen from the side, a smooth blunt domed head with no hair and no tuft, half-lidded eyes almost closed, a flat horizontal line for a mouth, no eyebrows, a blank disinterested expression, completely uninterested, looking straight ahead in its direction of travel and not at the viewer, a single thin curled tail, muted darker colouring, flat 2D cartoon illustration, adult animated comedy style, lumpy asymmetric hand-drawn proportions, slightly wrong, never geometric, thick uniform black outline of even weight around every shape, flat saturated fills only, absolutely no gradients, no shading, no ambient occlusion, no rendered lighting, no glow, deadpan expression, played completely straight, single subject, centred, entire subject visible with margin around it, plain solid #FF00FF magenta background, nothing else in frame, floating with no ground and no horizon, no drop shadow, no cast shadow, no contact shadow, no text, no letters, no numbers, no watermark, no signature, no border
```

The subject half is authored per asset; the style half is identical for every
asset in the game and lives in `tools/art/batch.ts`:

```
flat 2D cartoon illustration, adult animated comedy style, lumpy asymmetric hand-drawn proportions, slightly wrong, never geometric, thick uniform black outline of even weight around every shape, flat saturated fills only, absolutely no gradients, no shading, no ambient occlusion, no rendered lighting, no glow, deadpan expression, played completely straight, single subject, centred, entire subject visible with margin around it, plain solid #FF00FF magenta background, nothing else in frame, floating with no ground and no horizon, no drop shadow, no cast shadow, no contact shadow, no text, no letters, no numbers, no watermark, no signature, no border
```

## Mechanical checks

| Check | Result | Measured | Expected |
|---|---|---|---|
| silhouette-area | pass | 0.2653 | 0.12–0.82 of canvas |
| background-contrast | pass | 0.3493 | >= 0.12 median Oklab L from conception-deep |
| background-contrast-coverage | pass | 0.0074 | <= 0.4 of sprite may vanish into conception-deep |
| palette-conformance | pass | 0.0308 | <= 0.0353 Oklab from a palette entry |
| palette-variety | pass | 7 | >= 3 distinct palette colours |
| palette-dominance | pass | 0.4728 | no colour above 0.9 of the sprite |
| readable-48px-silhouette | pass | 0.2743 | >= 0.084 coverage at 48px |
| readable-48px-detail | pass | 0.5684 | >= 0.06 edge density at 48px |

## Rejected candidates

_None — passed on the first attempt._
