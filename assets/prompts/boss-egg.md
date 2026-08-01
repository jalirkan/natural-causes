# The Egg

- **Asset id:** `boss-egg`
- **Act:** conception
- **Role:** boss
- **Model:** `fal-ai/flux/dev`
- **Seed:** `26760` (attempt 4)
- **Generated:** 2026-08-01T23:51:16.666Z
- **Sprite size:** 384px
- **Tests:** does scale hold up; is a boss impressive

**Why this life stage.** It is the only boss in the game that is beaten by being taken in rather than brought down.

## Prompt

```
an enormous smooth round egg cell filling the frame, flat muted deep teal, a thick irregular fringe of blunt stubby finger-like protrusions all the way around it like a lumpy crown or a bad haircut, no two protrusions the same length, one small calm face placed off-centre and low on the huge smooth mass, half-lidded eyes and a small closed-mouth knowing smile, serene and faintly amused, not angry, it has already decided, one flat darker tone across the lower third as the only shadow, mid-century modern commercial illustration, 1950s 1960s printed institutional graphic design, limited spot-colour screenprint, two or three flat muted ink colours, visible halftone dot texture, paper grain, slightly misregistered ink edges, fine even line weight, thin restrained linework, no heavy black outlines, simplified geometric stylised forms, flat graphic shapes, slightly irregular hand-cut paper shapes, organic and asymmetric, never mechanical, muted mid-tone colouring throughout, no white, no off-white, no cream, no ivory, nothing paler than a soft tan, the lightest area is a muted tan and the darkest is a warm near-black, strictly flat two-dimensional, no perspective, no depth, no 3D, no isometric view, absolutely no gradients, no shading, no ambient occlusion, no rendered lighting, no glow, completely affectless, blank deadpan expression, indifferent, unbothered, not reacting, single subject, centred, entire subject visible with margin around it, plain solid #FF00FF magenta background, nothing else in frame, floating with no ground and no horizon, no drop shadow, no cast shadow, no contact shadow, not cute, not childish, not a modern cartoon, not vector clipart, full bleed, no frame, no border, no rule around the image, no poster edge, no panel, no text, no letters, no numbers, no watermark, no signature, no artist signature, no stamp, no seal, no chop mark, no printed margin, no caption
```

The subject half is authored per asset; the style half is identical for every
asset in the game and lives in `tools/art/batch.ts`:

```
mid-century modern commercial illustration, 1950s 1960s printed institutional graphic design, limited spot-colour screenprint, two or three flat muted ink colours, visible halftone dot texture, paper grain, slightly misregistered ink edges, fine even line weight, thin restrained linework, no heavy black outlines, simplified geometric stylised forms, flat graphic shapes, slightly irregular hand-cut paper shapes, organic and asymmetric, never mechanical, muted mid-tone colouring throughout, no white, no off-white, no cream, no ivory, nothing paler than a soft tan, the lightest area is a muted tan and the darkest is a warm near-black, strictly flat two-dimensional, no perspective, no depth, no 3D, no isometric view, absolutely no gradients, no shading, no ambient occlusion, no rendered lighting, no glow, completely affectless, blank deadpan expression, indifferent, unbothered, not reacting, single subject, centred, entire subject visible with margin around it, plain solid #FF00FF magenta background, nothing else in frame, floating with no ground and no horizon, no drop shadow, no cast shadow, no contact shadow, not cute, not childish, not a modern cartoon, not vector clipart, full bleed, no frame, no border, no rule around the image, no poster edge, no panel, no text, no letters, no numbers, no watermark, no signature, no artist signature, no stamp, no seal, no chop mark, no printed margin, no caption
```

## Mechanical checks

| Check | Result | Measured | Expected |
|---|---|---|---|
| silhouette-area | pass | 0.5581 | 0.25–0.95 of canvas |
| background-contrast | pass | 0.414 | >= 0.12 median Oklab L from conception-deep |
| background-contrast-coverage | pass | 0.0102 | <= 0.4 of sprite may vanish into conception-deep |
| palette-conformance | pass | 0.0293 | <= 0.0353 Oklab from a palette entry |
| palette-variety | pass | 5 | >= 3 distinct palette colours |
| palette-dominance | pass | 0.8465 | no colour above 0.9 of the sprite |
| readable-48px-silhouette | pass | 0.5664 | >= 0.175 coverage at 48px |
| readable-48px-structure | pass | 6 | >= 3 palette colours still visible at 48px |
| enemy-value-ceiling | pass | 0.8512 | <= 0.856 Oklab L (bone); paper belongs to the player |
| readable-48px-detail | pass | 0.243 | >= 0.06 edge density at 48px |

## Rejected candidates

1. seed `3003` — failed background-contrast (0.1058), background-contrast-coverage (0.6655)
2. seed `10922` — failed background-contrast (0.1126), background-contrast-coverage (0.5504)
3. seed `18841` — failed background-contrast (0.1058), background-contrast-coverage (0.6108)
