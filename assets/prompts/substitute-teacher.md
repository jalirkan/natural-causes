# Substitute teacher

- **Asset id:** `substitute-teacher`
- **Act:** school
- **Role:** swarm
- **Model:** `fal-ai/flux/dev`
- **Seed:** `11923` (attempt 2)
- **Generated:** 2026-08-01T09:13:02.524Z
- **Sprite size:** 96px
- **Tests:** faces, humour, human characters — THE REAL TEST

**Why this life stage.** School is the first place the player is judged by someone who does not know who they are, and the substitute is that experience with a lanyard on.

## Prompt

```
a substitute schoolteacher drawn as a mid-century institutional pictogram, an ordinary adult figure of average unremarkable build, standing squarely and symmetrically facing forward, a simplified geometric body, plain and generic, more diagram than portrait, holding a large plain white clipboard flat against the chest with both hands, the clipboard is the brightest and hardest shape in the picture, a plain lanyard loop around the neck, the face is almost blank, two small flat dots for eyes and one short straight line for a mouth, no eyebrows, no expression whatsoever, completely indifferent, unbothered, not looking at the viewer but slightly past and to one side, institutional and anonymous, not sad, not nervous, not sympathetic, mid-century modern commercial illustration, 1950s 1960s printed institutional graphic design, limited spot-colour screenprint, two or three flat muted ink colours on off-white paper stock, bold simplified flat shapes with a strong clear silhouette, very few interior details, large uninterrupted areas of flat colour, heavy confident line weight, chunky and readable, high contrast between shapes, designed to be recognised at a glance from a distance, no halftone dots, no fine hairlines, no small detail, no surface texture, no cross-hatching, slightly irregular hand-cut paper shapes, organic and asymmetric, never mechanical, strictly flat two-dimensional, no perspective, no depth, no 3D, no isometric view, absolutely no gradients, no shading, no ambient occlusion, no rendered lighting, no glow, completely affectless, blank deadpan expression, indifferent, unbothered, not reacting, single subject, centred, entire subject visible with margin around it, plain solid #FF00FF magenta background, nothing else in frame, floating with no ground and no horizon, no drop shadow, no cast shadow, no contact shadow, not cute, not childish, not a modern cartoon, not vector clipart, full bleed, no frame, no border, no rule around the image, no poster edge, no panel, no text, no letters, no numbers, no watermark, no signature, no artist signature, no stamp, no seal, no chop mark, no printed margin, no caption
```

The subject half is authored per asset; the style half is identical for every
asset in the game and lives in `tools/art/batch.ts`:

```
mid-century modern commercial illustration, 1950s 1960s printed institutional graphic design, limited spot-colour screenprint, two or three flat muted ink colours on off-white paper stock, bold simplified flat shapes with a strong clear silhouette, very few interior details, large uninterrupted areas of flat colour, heavy confident line weight, chunky and readable, high contrast between shapes, designed to be recognised at a glance from a distance, no halftone dots, no fine hairlines, no small detail, no surface texture, no cross-hatching, slightly irregular hand-cut paper shapes, organic and asymmetric, never mechanical, strictly flat two-dimensional, no perspective, no depth, no 3D, no isometric view, absolutely no gradients, no shading, no ambient occlusion, no rendered lighting, no glow, completely affectless, blank deadpan expression, indifferent, unbothered, not reacting, single subject, centred, entire subject visible with margin around it, plain solid #FF00FF magenta background, nothing else in frame, floating with no ground and no horizon, no drop shadow, no cast shadow, no contact shadow, not cute, not childish, not a modern cartoon, not vector clipart, full bleed, no frame, no border, no rule around the image, no poster edge, no panel, no text, no letters, no numbers, no watermark, no signature, no artist signature, no stamp, no seal, no chop mark, no printed margin, no caption
```

## Mechanical checks

| Check | Result | Measured | Expected |
|---|---|---|---|
| silhouette-area | pass | 0.422 | 0.12–0.82 of canvas |
| background-contrast | pass | 0.5145 | >= 0.12 median Oklab L from school-deep |
| background-contrast-coverage | pass | 0.0059 | <= 0.4 of sprite may vanish into school-deep |
| palette-conformance | pass | 0 | <= 0.0353 Oklab from a palette entry |
| palette-variety | pass | 9 | >= 3 distinct palette colours |
| palette-dominance | pass | 0.53 | no colour above 0.9 of the sprite |
| readable-48px-silhouette | pass | 0.4275 | >= 0.084 coverage at 48px |
| readable-48px-structure | pass | 7 | >= 3 palette colours still visible at 48px |
| readable-48px-detail | pass | 0.501 | >= 0.06 edge density at 48px |

## Rejected candidates

1. seed `4004` — failed silhouette-area (0.9411)
