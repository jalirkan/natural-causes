# The player — sperm form

- **Asset id:** `player-sperm`
- **Act:** conception
- **Role:** player
- **Model:** `fal-ai/flux/dev`
- **Seed:** `1001` (attempt 1)
- **Generated:** 2026-08-01T08:27:54.994Z
- **Sprite size:** 112px
- **Tests:** can the style do a protagonist at all

## Prompt

```
a single cartoon sperm cell character seen from the side, a large lopsided off-white oval head taking up most of the body, two big flat eyes at visibly different heights, the left eye slightly larger, a short flat line for a mouth, thick eyebrows furrowed with effort, the face of something doing its best with no information, one asymmetric tuft of hair sticking up above the left eye, a single thin tapering tail trailing behind, no clothing, no accessories, no helmet, no gear, it owns nothing, flat 2D cartoon illustration, adult animated comedy style, lumpy asymmetric hand-drawn proportions, slightly wrong, never geometric, thick uniform black outline of even weight around every shape, flat saturated fills only, absolutely no gradients, no shading, no ambient occlusion, no rendered lighting, no glow, deadpan expression, played completely straight, single subject, centred, entire subject visible with margin around it, plain solid #FF00FF magenta background, nothing else in frame, floating with no ground and no horizon, no drop shadow, no cast shadow, no contact shadow, no text, no letters, no numbers, no watermark, no signature, no border
```

The subject half is authored per asset; the style half is identical for every
asset in the game and lives in `tools/art/batch.ts`:

```
flat 2D cartoon illustration, adult animated comedy style, lumpy asymmetric hand-drawn proportions, slightly wrong, never geometric, thick uniform black outline of even weight around every shape, flat saturated fills only, absolutely no gradients, no shading, no ambient occlusion, no rendered lighting, no glow, deadpan expression, played completely straight, single subject, centred, entire subject visible with margin around it, plain solid #FF00FF magenta background, nothing else in frame, floating with no ground and no horizon, no drop shadow, no cast shadow, no contact shadow, no text, no letters, no numbers, no watermark, no signature, no border
```

## Mechanical checks

| Check | Result | Measured | Expected |
|---|---|---|---|
| silhouette-area | pass | 0.4706 | 0.12–0.82 of canvas |
| background-contrast | pass | 0.6017 | >= 0.12 median Oklab L from conception-deep |
| background-contrast-coverage | pass | 0.0027 | <= 0.4 of sprite may vanish into conception-deep |
| palette-conformance | pass | 0.032 | <= 0.0353 Oklab from a palette entry |
| palette-variety | pass | 8 | >= 3 distinct palette colours |
| palette-dominance | pass | 0.5445 | no colour above 0.9 of the sprite |
| readable-48px-silhouette | pass | 0.4757 | >= 0.084 coverage at 48px |
| readable-48px-detail | pass | 0.3709 | >= 0.06 edge density at 48px |

## Rejected candidates

_None — passed on the first attempt._
