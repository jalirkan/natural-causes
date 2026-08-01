# Substitute teacher

- **Asset id:** `substitute-teacher`
- **Act:** school
- **Role:** swarm
- **Model:** `fal-ai/flux/dev`
- **Seed:** `4004` (attempt 1)
- **Generated:** 2026-08-01T08:28:10.682Z
- **Sprite size:** 96px
- **Tests:** faces, humour, human characters — THE REAL TEST

**Why this life stage.** School is the first place the player is judged by someone who does not know who they are, and the substitute is that experience with a lanyard on.

## Prompt

```
a cartoon adult substitute schoolteacher standing facing forward, no neck, the head sitting directly on a soft rectangle torso with sloping shoulders, wearing a mustard yellow sweater vest in a colour that was never in fashion, holding an oversized bright white clipboard with both hands at chest height like a shield, a crooked lanyard loop hanging from the neck, two flat dot eyes at visibly different heights and a small horizontal mouth, eyebrows raised in permanent mild apology, the expression of someone who arrived twenty minutes ago and has been told none of this, ordinary, tired, out of place, flat 2D cartoon illustration, adult animated comedy style, lumpy asymmetric hand-drawn proportions, slightly wrong, never geometric, thick uniform black outline of even weight around every shape, flat saturated fills only, absolutely no gradients, no shading, no ambient occlusion, no rendered lighting, no glow, deadpan expression, played completely straight, single subject, centred, entire subject visible with margin around it, plain solid #FF00FF magenta background, nothing else in frame, floating with no ground and no horizon, no drop shadow, no cast shadow, no contact shadow, no text, no letters, no numbers, no watermark, no signature, no border
```

The subject half is authored per asset; the style half is identical for every
asset in the game and lives in `tools/art/batch.ts`:

```
flat 2D cartoon illustration, adult animated comedy style, lumpy asymmetric hand-drawn proportions, slightly wrong, never geometric, thick uniform black outline of even weight around every shape, flat saturated fills only, absolutely no gradients, no shading, no ambient occlusion, no rendered lighting, no glow, deadpan expression, played completely straight, single subject, centred, entire subject visible with margin around it, plain solid #FF00FF magenta background, nothing else in frame, floating with no ground and no horizon, no drop shadow, no cast shadow, no contact shadow, no text, no letters, no numbers, no watermark, no signature, no border
```

## Mechanical checks

| Check | Result | Measured | Expected |
|---|---|---|---|
| silhouette-area | pass | 0.3728 | 0.12–0.82 of canvas |
| background-contrast | pass | 0.2553 | >= 0.12 median Oklab L from school-deep |
| background-contrast-coverage | pass | 0.087 | <= 0.4 of sprite may vanish into school-deep |
| palette-conformance | pass | 0.032 | <= 0.0353 Oklab from a palette entry |
| palette-variety | pass | 10 | >= 3 distinct palette colours |
| palette-dominance | pass | 0.4654 | no colour above 0.9 of the sprite |
| readable-48px-silhouette | pass | 0.3806 | >= 0.084 coverage at 48px |
| readable-48px-detail | pass | 0.5159 | >= 0.06 edge density at 48px |

## Rejected candidates

_None — passed on the first attempt._
