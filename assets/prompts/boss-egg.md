# The Egg

- **Asset id:** `boss-egg`
- **Act:** conception
- **Role:** boss
- **Model:** `fal-ai/flux/dev`
- **Seed:** `3003` (attempt 1)
- **Generated:** 2026-08-01T08:28:06.643Z
- **Sprite size:** 384px
- **Tests:** does scale hold up; is a boss impressive

**Why this life stage.** It is the only boss in the game that is beaten by being taken in rather than brought down.

## Prompt

```
an enormous smooth round cartoon egg cell filling the frame, a thick irregular fringe of blunt stubby finger-like protrusions all the way around it like a lumpy crown or a bad haircut, no two protrusions the same length, one small calm face placed off-centre and low on the huge smooth mass, half-lidded eyes and a small closed-mouth knowing smile, serene and faintly amused, not angry, it has already decided, one flat darker tone across the lower third as the only shadow, flat 2D cartoon illustration, adult animated comedy style, lumpy asymmetric hand-drawn proportions, slightly wrong, never geometric, thick uniform black outline of even weight around every shape, flat saturated fills only, absolutely no gradients, no shading, no ambient occlusion, no rendered lighting, no glow, deadpan expression, played completely straight, single subject, centred, entire subject visible with margin around it, plain solid #FF00FF magenta background, nothing else in frame, floating with no ground and no horizon, no drop shadow, no cast shadow, no contact shadow, no text, no letters, no numbers, no watermark, no signature, no border
```

The subject half is authored per asset; the style half is identical for every
asset in the game and lives in `tools/art/batch.ts`:

```
flat 2D cartoon illustration, adult animated comedy style, lumpy asymmetric hand-drawn proportions, slightly wrong, never geometric, thick uniform black outline of even weight around every shape, flat saturated fills only, absolutely no gradients, no shading, no ambient occlusion, no rendered lighting, no glow, deadpan expression, played completely straight, single subject, centred, entire subject visible with margin around it, plain solid #FF00FF magenta background, nothing else in frame, floating with no ground and no horizon, no drop shadow, no cast shadow, no contact shadow, no text, no letters, no numbers, no watermark, no signature, no border
```

## Mechanical checks

| Check | Result | Measured | Expected |
|---|---|---|---|
| silhouette-area | pass | 0.6069 | 0.25–0.95 of canvas |
| background-contrast | pass | 0.6107 | >= 0.12 median Oklab L from conception-deep |
| background-contrast-coverage | pass | 0.001 | <= 0.4 of sprite may vanish into conception-deep |
| palette-conformance | pass | 0.032 | <= 0.0353 Oklab from a palette entry |
| palette-variety | pass | 8 | >= 3 distinct palette colours |
| palette-dominance | pass | 0.81 | no colour above 0.9 of the sprite |
| readable-48px-silhouette | pass | 0.6137 | >= 0.175 coverage at 48px |
| readable-48px-detail | pass | 0.2428 | >= 0.06 edge density at 48px |

## Rejected candidates

_None — passed on the first attempt._
