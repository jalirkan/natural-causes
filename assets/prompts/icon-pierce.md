# Motility icon

- **Asset id:** `icon-pierce`
- **Act:** conception
- **Role:** icon
- **Model:** `fal-ai/flux/dev`
- **Seed:** `68921` (attempt 2)
- **Generated:** 2026-08-26T22:57:24.855Z
- **Sprite size:** 96px
- **Tests:** ruled fold lines on a hand-cut card (law 4 per-asset override)

## Prompt

```
a folded paper dart aeroplane seen from directly above, nose pointing to the right, filling most of the frame, crisp straight fold lines, simple triangular geometry, flat pale warm paper colouring with one darker shadow tone along the folds, mid-century modern commercial illustration, 1950s 1960s printed institutional graphic design, limited spot-colour screenprint, two or three flat muted ink colours, bold simplified flat shapes with a strong clear silhouette, very few interior details, large uninterrupted areas of flat colour, heavy confident line weight, chunky and readable, high contrast between shapes, designed to be recognised at a glance from a distance, no halftone dots, no fine hairlines, no small detail, no surface texture, no cross-hatching, precise ruled geometry with true right angles and straight edges, drafted rather than drawn, the wrongness coming entirely from the arrangement and never from the shapes, strictly flat two-dimensional, no perspective, no depth, no 3D, no isometric view, absolutely no gradients, no shading, no ambient occlusion, no rendered lighting, no glow, completely affectless, blank deadpan expression, indifferent, unbothered, not reacting, single subject, centred, entire subject visible with margin around it, plain solid #FF00FF magenta background, nothing else in frame, floating with no ground and no horizon, no drop shadow, no cast shadow, no contact shadow, not cute, not childish, not a modern cartoon, not vector clipart, full bleed, no frame, no border, no rule around the image, no poster edge, no panel, no text, no letters, no numbers, no watermark, no signature, no artist signature, no stamp, no seal, no chop mark, no printed margin, no caption
```

The subject half is authored per asset; the style half is identical for every
asset in the game and lives in `tools/art/batch.ts`:

```
mid-century modern commercial illustration, 1950s 1960s printed institutional graphic design, limited spot-colour screenprint, two or three flat muted ink colours, bold simplified flat shapes with a strong clear silhouette, very few interior details, large uninterrupted areas of flat colour, heavy confident line weight, chunky and readable, high contrast between shapes, designed to be recognised at a glance from a distance, no halftone dots, no fine hairlines, no small detail, no surface texture, no cross-hatching, precise ruled geometry with true right angles and straight edges, drafted rather than drawn, the wrongness coming entirely from the arrangement and never from the shapes, strictly flat two-dimensional, no perspective, no depth, no 3D, no isometric view, absolutely no gradients, no shading, no ambient occlusion, no rendered lighting, no glow, completely affectless, blank deadpan expression, indifferent, unbothered, not reacting, single subject, centred, entire subject visible with margin around it, plain solid #FF00FF magenta background, nothing else in frame, floating with no ground and no horizon, no drop shadow, no cast shadow, no contact shadow, not cute, not childish, not a modern cartoon, not vector clipart, full bleed, no frame, no border, no rule around the image, no poster edge, no panel, no text, no letters, no numbers, no watermark, no signature, no artist signature, no stamp, no seal, no chop mark, no printed margin, no caption
```

## Mechanical checks

| Check | Result | Measured | Expected |
|---|---|---|---|
| silhouette-area | pass | 0.2342 | 0.1–0.8 of canvas |
| background-contrast | pass | 0.4598 | >= 0.12 median Oklab L from ink |
| background-contrast-coverage | pass | 0.1974 | <= 0.4 of sprite may vanish into ink |
| palette-conformance | pass | 0 | <= 0.0353 Oklab from a palette entry |
| palette-variety | pass | 7 | >= 2 distinct palette colours |
| palette-dominance | pass | 0.6872 | no colour above 0.97 of the sprite |
| readable-48px-silhouette | pass | 0.2426 | >= 0.070 coverage at 48px |
| readable-48px-structure | pass | 5 | >= 2 palette colours still visible at 48px |
| readable-48px-detail | pass | 0.4457 | >= 0.06 edge density at 48px |

## Rejected candidates

1. seed `61002` — failed background-contrast (0), background-contrast-coverage (0.702)
