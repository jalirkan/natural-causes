# The Reorg

- **Asset id:** `boss-reorg`
- **Act:** office
- **Role:** boss
- **Model:** `fal-ai/flux/dev`
- **Seed:** `13925` (attempt 2)
- **Generated:** 2026-08-01T09:13:19.816Z
- **Sprite size:** 384px
- **Tests:** can the style render an abstraction as a monster — THE REAL TEST

**Why this life stage.** The Office is the first stage where the player's life is decided by a diagram that somebody else is allowed to edit.

## Prompt

```
a corporate organisational chart drawn as a flat printed diagram, standing upright as if it were a creature, a branching hierarchy tree of separate plain rectangular outlined boxes, four rows deep, widening toward the bottom, the boxes are clearly separated from one another with empty space between them, never touching and never stacked, thin straight vertical and horizontal connector lines join each box down to the boxes below it, the connector lines clearly visible against the background, each box contains one small flat deadpan face and a short solid blank label bar beneath the face, the faces look at each other or upward, none of them looking at the viewer, one slightly larger box alone at the very top of the tree is completely empty, no face and no label bar, strictly flat and two-dimensional like a printed chart on a page, not a stack of boxes, not a pile of crates, not a chest of drawers, not cubes, not a pyramid, no 3D boxes, mid-century modern commercial illustration, 1950s 1960s printed institutional graphic design, limited spot-colour screenprint, two or three flat muted ink colours on off-white paper stock, visible halftone dot texture, paper grain, slightly misregistered ink edges, fine even line weight, thin restrained linework, no heavy black outlines, simplified geometric stylised forms, flat graphic shapes, precise ruled geometry with true right angles and straight edges, drafted rather than drawn, the wrongness coming entirely from the arrangement and never from the shapes, strictly flat two-dimensional, no perspective, no depth, no 3D, no isometric view, absolutely no gradients, no shading, no ambient occlusion, no rendered lighting, no glow, completely affectless, blank deadpan expression, indifferent, unbothered, not reacting, single subject, centred, entire subject visible with margin around it, plain solid #FF00FF magenta background, nothing else in frame, floating with no ground and no horizon, no drop shadow, no cast shadow, no contact shadow, not cute, not childish, not a modern cartoon, not vector clipart, full bleed, no frame, no border, no rule around the image, no poster edge, no panel, no text, no letters, no numbers, no watermark, no signature, no artist signature, no stamp, no seal, no chop mark, no printed margin, no caption
```

The subject half is authored per asset; the style half is identical for every
asset in the game and lives in `tools/art/batch.ts`:

```
mid-century modern commercial illustration, 1950s 1960s printed institutional graphic design, limited spot-colour screenprint, two or three flat muted ink colours on off-white paper stock, visible halftone dot texture, paper grain, slightly misregistered ink edges, fine even line weight, thin restrained linework, no heavy black outlines, simplified geometric stylised forms, flat graphic shapes, precise ruled geometry with true right angles and straight edges, drafted rather than drawn, the wrongness coming entirely from the arrangement and never from the shapes, strictly flat two-dimensional, no perspective, no depth, no 3D, no isometric view, absolutely no gradients, no shading, no ambient occlusion, no rendered lighting, no glow, completely affectless, blank deadpan expression, indifferent, unbothered, not reacting, single subject, centred, entire subject visible with margin around it, plain solid #FF00FF magenta background, nothing else in frame, floating with no ground and no horizon, no drop shadow, no cast shadow, no contact shadow, not cute, not childish, not a modern cartoon, not vector clipart, full bleed, no frame, no border, no rule around the image, no poster edge, no panel, no text, no letters, no numbers, no watermark, no signature, no artist signature, no stamp, no seal, no chop mark, no printed margin, no caption
```

## Mechanical checks

| Check | Result | Measured | Expected |
|---|---|---|---|
| silhouette-area | pass | 0.3723 | 0.25–0.95 of canvas |
| background-contrast | pass | 0.1509 | >= 0.12 median Oklab L from office-deep |
| background-contrast-coverage | pass | 0.1252 | <= 0.4 of sprite may vanish into office-deep |
| palette-conformance | pass | 0.0293 | <= 0.0353 Oklab from a palette entry |
| palette-variety | pass | 9 | >= 3 distinct palette colours |
| palette-dominance | pass | 0.4836 | no colour above 0.9 of the sprite |
| readable-48px-silhouette | pass | 0.3824 | >= 0.175 coverage at 48px |
| readable-48px-structure | pass | 6 | >= 3 palette colours still visible at 48px |
| readable-48px-detail | pass | 0.6499 | >= 0.06 edge density at 48px |

## Rejected candidates

1. seed `6006` — failed error: background removal left nothing — the whole image keyed out
