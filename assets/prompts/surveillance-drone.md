# Surveillance drone

- **Asset id:** `surveillance-drone`
- **Act:** service
- **Role:** swarm
- **Model:** `fal-ai/flux/dev`
- **Seed:** `5005` (attempt 1)
- **Generated:** 2026-08-01T09:13:13.388Z
- **Sprite size:** 96px
- **Tests:** a mechanical subject in an organic style

**Why this life stage.** Service is the stage where everything that decides the player's day is far away and looking at something else.

## Prompt

```
a lumpy cartoon uncrewed surveillance aircraft seen from above and slightly to the side, long thin wings of visibly unequal length, a bulbous drooping nose and a V-shaped tail, the fuselage sagging slightly in the middle as if drawn from memory by someone who saw one once, crooked bent antennae, a single large half-lidded bored eye set into the camera pod under the nose, aimed slightly off to one side, not looking at the viewer, bone and sand coloured, almost no colour at all, completely blank surfaces, no markings, no insignia, no flags, no emblems, no lettering, mid-century modern commercial illustration, 1950s 1960s printed institutional graphic design, limited spot-colour screenprint, two or three flat muted ink colours on off-white paper stock, bold simplified flat shapes with a strong clear silhouette, very few interior details, large uninterrupted areas of flat colour, heavy confident line weight, chunky and readable, high contrast between shapes, designed to be recognised at a glance from a distance, no halftone dots, no fine hairlines, no small detail, no surface texture, no cross-hatching, slightly irregular hand-cut paper shapes, organic and asymmetric, never mechanical, strictly flat two-dimensional, no perspective, no depth, no 3D, no isometric view, absolutely no gradients, no shading, no ambient occlusion, no rendered lighting, no glow, completely affectless, blank deadpan expression, indifferent, unbothered, not reacting, single subject, centred, entire subject visible with margin around it, plain solid #FF00FF magenta background, nothing else in frame, floating with no ground and no horizon, no drop shadow, no cast shadow, no contact shadow, not cute, not childish, not a modern cartoon, not vector clipart, full bleed, no frame, no border, no rule around the image, no poster edge, no panel, no text, no letters, no numbers, no watermark, no signature, no artist signature, no stamp, no seal, no chop mark, no printed margin, no caption
```

The subject half is authored per asset; the style half is identical for every
asset in the game and lives in `tools/art/batch.ts`:

```
mid-century modern commercial illustration, 1950s 1960s printed institutional graphic design, limited spot-colour screenprint, two or three flat muted ink colours on off-white paper stock, bold simplified flat shapes with a strong clear silhouette, very few interior details, large uninterrupted areas of flat colour, heavy confident line weight, chunky and readable, high contrast between shapes, designed to be recognised at a glance from a distance, no halftone dots, no fine hairlines, no small detail, no surface texture, no cross-hatching, slightly irregular hand-cut paper shapes, organic and asymmetric, never mechanical, strictly flat two-dimensional, no perspective, no depth, no 3D, no isometric view, absolutely no gradients, no shading, no ambient occlusion, no rendered lighting, no glow, completely affectless, blank deadpan expression, indifferent, unbothered, not reacting, single subject, centred, entire subject visible with margin around it, plain solid #FF00FF magenta background, nothing else in frame, floating with no ground and no horizon, no drop shadow, no cast shadow, no contact shadow, not cute, not childish, not a modern cartoon, not vector clipart, full bleed, no frame, no border, no rule around the image, no poster edge, no panel, no text, no letters, no numbers, no watermark, no signature, no artist signature, no stamp, no seal, no chop mark, no printed margin, no caption
```

## Mechanical checks

| Check | Result | Measured | Expected |
|---|---|---|---|
| silhouette-area | pass | 0.1789 | 0.12–0.82 of canvas |
| background-contrast | pass | 0.2319 | >= 0.12 median Oklab L from service-deep |
| background-contrast-coverage | pass | 0.0303 | <= 0.4 of sprite may vanish into service-deep |
| palette-conformance | pass | 0 | <= 0.0353 Oklab from a palette entry |
| palette-variety | pass | 7 | >= 3 distinct palette colours |
| palette-dominance | pass | 0.5894 | no colour above 0.9 of the sprite |
| readable-48px-silhouette | pass | 0.1875 | >= 0.084 coverage at 48px |
| readable-48px-structure | pass | 7 | >= 3 palette colours still visible at 48px |
| readable-48px-detail | pass | 0.6916 | >= 0.06 edge density at 48px |

## Rejected candidates

_None — passed on the first attempt._
