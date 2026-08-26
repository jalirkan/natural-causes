# Motility icon

- **Asset id:** `icon-pierce`
- **Act:** conception
- **Role:** icon
- **Model:** `fal-ai/flux/dev`
- **Seed:** `68941` (attempt 2)
- **Generated:** 2026-08-26T23:30:42.098Z
- **Sprite size:** 96px
- **Tests:** a sleek dart, long and slender, unmistakably a paper aeroplane

## Prompt

```
a folded paper dart made from a single sheet of folded paper, seen from directly above, a slim elegant triangle with the point to the right, filling most of the frame, two flat wing panels meeting at a centre crease, nothing but folded paper, not an aircraft, no fuselage, no tail, no engines, flat pale warm paper colouring with one darker shadow tone along the centre crease, mid-century modern commercial illustration, 1950s 1960s printed institutional graphic design, limited spot-colour screenprint, two or three flat muted ink colours, bold simplified flat shapes with a strong clear silhouette, very few interior details, large uninterrupted areas of flat colour, heavy confident line weight, chunky and readable, high contrast between shapes, designed to be recognised at a glance from a distance, no halftone dots, no fine hairlines, no small detail, no surface texture, no cross-hatching, an elegant precisely designed pictogram in the manner of 1960s international graphic design, clean confident geometry, smooth crisp edges, perfectly balanced simplified form, the refined clarity of classic airline and olympic iconography, strictly flat two-dimensional, no perspective, no depth, no 3D, no isometric view, absolutely no gradients, no shading, no ambient occlusion, no rendered lighting, no glow, completely affectless, blank deadpan expression, indifferent, unbothered, not reacting, single subject, centred, entire subject visible with margin around it, plain solid #FF00FF magenta background, nothing else in frame, floating with no ground and no horizon, no drop shadow, no cast shadow, no contact shadow, not cute, not childish, not a modern cartoon, not vector clipart, full bleed, no frame, no border, no rule around the image, no poster edge, no panel, no text, no letters, no numbers, no watermark, no signature, no artist signature, no stamp, no seal, no chop mark, no printed margin, no caption
```

The subject half is authored per asset; the style half is identical for every
asset in the game and lives in `tools/art/batch.ts`:

```
mid-century modern commercial illustration, 1950s 1960s printed institutional graphic design, limited spot-colour screenprint, two or three flat muted ink colours, bold simplified flat shapes with a strong clear silhouette, very few interior details, large uninterrupted areas of flat colour, heavy confident line weight, chunky and readable, high contrast between shapes, designed to be recognised at a glance from a distance, no halftone dots, no fine hairlines, no small detail, no surface texture, no cross-hatching, an elegant precisely designed pictogram in the manner of 1960s international graphic design, clean confident geometry, smooth crisp edges, perfectly balanced simplified form, the refined clarity of classic airline and olympic iconography, strictly flat two-dimensional, no perspective, no depth, no 3D, no isometric view, absolutely no gradients, no shading, no ambient occlusion, no rendered lighting, no glow, completely affectless, blank deadpan expression, indifferent, unbothered, not reacting, single subject, centred, entire subject visible with margin around it, plain solid #FF00FF magenta background, nothing else in frame, floating with no ground and no horizon, no drop shadow, no cast shadow, no contact shadow, not cute, not childish, not a modern cartoon, not vector clipart, full bleed, no frame, no border, no rule around the image, no poster edge, no panel, no text, no letters, no numbers, no watermark, no signature, no artist signature, no stamp, no seal, no chop mark, no printed margin, no caption
```

## Mechanical checks

| Check | Result | Measured | Expected |
|---|---|---|---|
| silhouette-area | pass | 0.287 | 0.1–0.8 of canvas |
| background-contrast | pass | 0.4591 | >= 0.12 median Oklab L from ink |
| background-contrast-coverage | pass | 0.1819 | <= 0.4 of sprite may vanish into ink |
| palette-conformance | pass | 0 | <= 0.0353 Oklab from a palette entry |
| palette-variety | pass | 8 | >= 2 distinct palette colours |
| palette-dominance | pass | 0.6507 | no colour above 0.97 of the sprite |
| readable-48px-silhouette | pass | 0.2956 | >= 0.070 coverage at 48px |
| readable-48px-structure | pass | 5 | >= 2 palette colours still visible at 48px |
| readable-48px-detail | pass | 0.4174 | >= 0.06 edge density at 48px |

## Rejected candidates

1. seed `61022` — failed background-contrast-coverage (0.4894)
