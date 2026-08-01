# The player — sperm form

- **Asset id:** `player-sperm`
- **Act:** conception
- **Role:** player
- **Model:** `fal-ai/flux/dev`
- **Seed:** `1001` (attempt 1)
- **Generated:** 2026-08-01T08:54:54.876Z
- **Sprite size:** 112px
- **Tests:** can the style do a protagonist at all

## Prompt

```
a single cartoon sperm cell character seen from the side, a large lopsided off-white oval head taking up most of the body, two big flat eyes at visibly different heights, the left eye slightly larger, a short flat line for a mouth, thick eyebrows furrowed with effort, the face of something doing its best with no information, one asymmetric tuft of hair sticking up above the left eye, a single thin tapering tail trailing behind, no clothing, no accessories, no helmet, no gear, it owns nothing, mid-century modern commercial illustration, 1950s 1960s printed institutional graphic design, slightly irregular hand-cut paper shapes, organic and asymmetric, never mechanical, limited spot-colour screenprint, two or three flat muted ink colours on off-white paper stock, visible halftone dot texture, paper grain, slightly misregistered ink edges, fine even line weight, thin restrained linework, no heavy black outlines, simplified geometric stylised forms, flat graphic shapes, strictly flat two-dimensional, no perspective, no depth, no 3D, no isometric view, absolutely no gradients, no shading, no ambient occlusion, no rendered lighting, no glow, completely affectless, blank deadpan expression, indifferent, unbothered, not reacting, single subject, centred, entire subject visible with margin around it, plain solid #FF00FF magenta background, nothing else in frame, floating with no ground and no horizon, no drop shadow, no cast shadow, no contact shadow, not cute, not childish, not a modern cartoon, not vector clipart, full bleed, no frame, no border, no rule around the image, no poster edge, no panel, no text, no letters, no numbers, no watermark, no signature
```

The subject half is authored per asset; the style half is identical for every
asset in the game and lives in `tools/art/batch.ts`:

```
mid-century modern commercial illustration, 1950s 1960s printed institutional graphic design, slightly irregular hand-cut paper shapes, organic and asymmetric, never mechanical, limited spot-colour screenprint, two or three flat muted ink colours on off-white paper stock, visible halftone dot texture, paper grain, slightly misregistered ink edges, fine even line weight, thin restrained linework, no heavy black outlines, simplified geometric stylised forms, flat graphic shapes, strictly flat two-dimensional, no perspective, no depth, no 3D, no isometric view, absolutely no gradients, no shading, no ambient occlusion, no rendered lighting, no glow, completely affectless, blank deadpan expression, indifferent, unbothered, not reacting, single subject, centred, entire subject visible with margin around it, plain solid #FF00FF magenta background, nothing else in frame, floating with no ground and no horizon, no drop shadow, no cast shadow, no contact shadow, not cute, not childish, not a modern cartoon, not vector clipart, full bleed, no frame, no border, no rule around the image, no poster edge, no panel, no text, no letters, no numbers, no watermark, no signature
```

## Mechanical checks

| Check | Result | Measured | Expected |
|---|---|---|---|
| silhouette-area | pass | 0.381 | 0.12–0.82 of canvas |
| background-contrast | pass | 0.5113 | >= 0.12 median Oklab L from conception-deep |
| background-contrast-coverage | pass | 0.0121 | <= 0.4 of sprite may vanish into conception-deep |
| palette-conformance | pass | 0.0293 | <= 0.0353 Oklab from a palette entry |
| palette-variety | pass | 7 | >= 3 distinct palette colours |
| palette-dominance | pass | 0.6401 | no colour above 0.9 of the sprite |
| readable-48px-silhouette | pass | 0.3911 | >= 0.084 coverage at 48px |
| readable-48px-detail | pass | 0.3972 | >= 0.06 edge density at 48px |

## Rejected candidates

_None — passed on the first attempt._
