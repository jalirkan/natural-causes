# Surveillance drone

- **Asset id:** `surveillance-drone`
- **Act:** service
- **Role:** swarm
- **Model:** `fal-ai/flux/dev`
- **Seed:** `5005` (attempt 1)
- **Generated:** 2026-08-01T08:28:16.160Z
- **Sprite size:** 96px
- **Tests:** a mechanical subject in an organic style

**Why this life stage.** Service is the stage where everything that decides the player's day is far away and looking at something else.

## Prompt

```
a lumpy cartoon uncrewed surveillance aircraft seen from above and slightly to the side, long thin wings of visibly unequal length, a bulbous drooping nose and a V-shaped tail, the fuselage sagging slightly in the middle as if drawn from memory by someone who saw one once, crooked bent antennae, a single large half-lidded bored eye set into the camera pod under the nose, aimed slightly off to one side, not looking at the viewer, bone and sand coloured, almost no colour at all, completely blank surfaces, no markings, no insignia, no flags, no emblems, no lettering, flat 2D cartoon illustration, adult animated comedy style, lumpy asymmetric hand-drawn proportions, slightly wrong, never geometric, thick uniform black outline of even weight around every shape, flat saturated fills only, absolutely no gradients, no shading, no ambient occlusion, no rendered lighting, no glow, deadpan expression, played completely straight, single subject, centred, entire subject visible with margin around it, plain solid #FF00FF magenta background, nothing else in frame, floating with no ground and no horizon, no drop shadow, no cast shadow, no contact shadow, no text, no letters, no numbers, no watermark, no signature, no border
```

The subject half is authored per asset; the style half is identical for every
asset in the game and lives in `tools/art/batch.ts`:

```
flat 2D cartoon illustration, adult animated comedy style, lumpy asymmetric hand-drawn proportions, slightly wrong, never geometric, thick uniform black outline of even weight around every shape, flat saturated fills only, absolutely no gradients, no shading, no ambient occlusion, no rendered lighting, no glow, deadpan expression, played completely straight, single subject, centred, entire subject visible with margin around it, plain solid #FF00FF magenta background, nothing else in frame, floating with no ground and no horizon, no drop shadow, no cast shadow, no contact shadow, no text, no letters, no numbers, no watermark, no signature, no border
```

## Mechanical checks

| Check | Result | Measured | Expected |
|---|---|---|---|
| silhouette-area | pass | 0.1814 | 0.12–0.82 of canvas |
| background-contrast | pass | 0.3633 | >= 0.12 median Oklab L from service-deep |
| background-contrast-coverage | pass | 0.0431 | <= 0.4 of sprite may vanish into service-deep |
| palette-conformance | pass | 0.0308 | <= 0.0353 Oklab from a palette entry |
| palette-variety | pass | 9 | >= 3 distinct palette colours |
| palette-dominance | pass | 0.6316 | no colour above 0.9 of the sprite |
| readable-48px-silhouette | pass | 0.1936 | >= 0.084 coverage at 48px |
| readable-48px-detail | pass | 0.8029 | >= 0.06 edge density at 48px |

## Rejected candidates

_None — passed on the first attempt._
