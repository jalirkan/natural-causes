# White cell

- **Asset id:** `white-cell`
- **Act:** conception
- **Role:** swarm
- **Model:** `fal-ai/flux/dev`
- **Seed:** `7007` (attempt 1)
- **Generated:** 2026-08-01T09:52:35.102Z
- **Sprite size:** 96px
- **Tests:** the blot silhouette, and a stamp face that must survive 48px

**Why this life stage.** Before the player is anyone at all, there is already a process whose only job is to stop things that look like them.

## Prompt

```
a single large round white blood cell seen from directly above, filling most of the frame, a round lobed mass with a scalloped irregular edge, the lobes uneven in count and depth so it never resolves into a flower, no tail, no limbs, no spikes, no protrusions, flat muted purple, one darker shadow tone at most, no interior texture whatsoever, one small flat pale cream oval disc set off-centre on the mass, lying flat on its surface, that disc carries two small dark dots for eyes and one short horizontal line for a mouth and nothing else, the eyes aimed a few degrees off to one side, looking past the viewer rather than at them, mid-century modern commercial illustration, 1950s 1960s printed institutional graphic design, limited spot-colour screenprint, two or three flat muted ink colours on off-white paper stock, bold simplified flat shapes with a strong clear silhouette, very few interior details, large uninterrupted areas of flat colour, heavy confident line weight, chunky and readable, high contrast between shapes, designed to be recognised at a glance from a distance, no halftone dots, no fine hairlines, no small detail, no surface texture, no cross-hatching, slightly irregular hand-cut paper shapes, organic and asymmetric, never mechanical, strictly flat two-dimensional, no perspective, no depth, no 3D, no isometric view, absolutely no gradients, no shading, no ambient occlusion, no rendered lighting, no glow, completely affectless, blank deadpan expression, indifferent, unbothered, not reacting, single subject, centred, entire subject visible with margin around it, plain solid #FF00FF magenta background, nothing else in frame, floating with no ground and no horizon, no drop shadow, no cast shadow, no contact shadow, not cute, not childish, not a modern cartoon, not vector clipart, full bleed, no frame, no border, no rule around the image, no poster edge, no panel, no text, no letters, no numbers, no watermark, no signature, no artist signature, no stamp, no seal, no chop mark, no printed margin, no caption
```

The subject half is authored per asset; the style half is identical for every
asset in the game and lives in `tools/art/batch.ts`:

```
mid-century modern commercial illustration, 1950s 1960s printed institutional graphic design, limited spot-colour screenprint, two or three flat muted ink colours on off-white paper stock, bold simplified flat shapes with a strong clear silhouette, very few interior details, large uninterrupted areas of flat colour, heavy confident line weight, chunky and readable, high contrast between shapes, designed to be recognised at a glance from a distance, no halftone dots, no fine hairlines, no small detail, no surface texture, no cross-hatching, slightly irregular hand-cut paper shapes, organic and asymmetric, never mechanical, strictly flat two-dimensional, no perspective, no depth, no 3D, no isometric view, absolutely no gradients, no shading, no ambient occlusion, no rendered lighting, no glow, completely affectless, blank deadpan expression, indifferent, unbothered, not reacting, single subject, centred, entire subject visible with margin around it, plain solid #FF00FF magenta background, nothing else in frame, floating with no ground and no horizon, no drop shadow, no cast shadow, no contact shadow, not cute, not childish, not a modern cartoon, not vector clipart, full bleed, no frame, no border, no rule around the image, no poster edge, no panel, no text, no letters, no numbers, no watermark, no signature, no artist signature, no stamp, no seal, no chop mark, no printed margin, no caption
```

## Mechanical checks

| Check | Result | Measured | Expected |
|---|---|---|---|
| silhouette-area | pass | 0.7018 | 0.12–0.82 of canvas |
| background-contrast | pass | 0.5173 | >= 0.12 median Oklab L from conception-deep |
| background-contrast-coverage | pass | 0.0025 | <= 0.4 of sprite may vanish into conception-deep |
| palette-conformance | pass | 0 | <= 0.0353 Oklab from a palette entry |
| palette-variety | pass | 8 | >= 3 distinct palette colours |
| palette-dominance | pass | 0.6272 | no colour above 0.9 of the sprite |
| readable-48px-silhouette | pass | 0.7092 | >= 0.084 coverage at 48px |
| readable-48px-structure | pass | 5 | >= 3 palette colours still visible at 48px |
| readable-48px-detail | pass | 0.2892 | >= 0.06 edge density at 48px |

## Rejected candidates

_None — passed on the first attempt._
