# Hormones

- **Asset id:** `hormones`
- **Act:** adolescence
- **Role:** swarm
- **Source:** authored SVG, `tools/art/svg/adolescence/hormones.svg`
- **SVG sha256:** `44df0a9b6e3acfb26563ebe93643f3df2eedbeb445e0f06772818d834493fb62`
- **Rasteriser:** sharp 0.34.5 (libvips 8.17.3, librsvg 2.61.2)
- **Render:** 140.160 dpi, 4× supersampled and area-averaged
- **Rendered:** 2026-09-27T23:47:54.466Z
- **Sprite size:** 48px
- **Tests:** the bolt — the only jagged outline, a squiggle with a face in a horde

**Why this life stage.** Adolescence is the first stage where the crowd comes from inside the player, so there is no edge of it to walk out of.

## Description

a fat three-stroke zigzag bolt, taller than wide, the only jagged outline in the act, strokes thick enough to carry two small dark dots for eyes on the middle one, flat mid blue (#5E95C3, the act mid tone) with one darker flat tone as the only shadow, eyes looking straight out at the viewer and a wide flat grin, thrilled, and it does not know about what, no arms, no legs, no spark lines, no glow, no yellow, no gold, no pink anywhere

## Mechanical checks

| Check | Result | Measured | Expected |
|---|---|---|---|
| silhouette-area | pass | 0.3945 | 0.12–0.82 of canvas |
| background-contrast | pass | 0.3158 | >= 0.12 median Oklab L from adolescence-deep |
| background-contrast-coverage | pass | 0.1958 | <= 0.4 of sprite may vanish into adolescence-deep |
| palette-conformance | pass | 0 | <= 0.0353 Oklab from a palette entry |
| palette-variety | pass | 3 | >= 2 distinct palette colours |
| palette-dominance | pass | 0.6447 | no colour above 0.97 of the sprite |
| readable-48px-silhouette | pass | 0.3945 | >= 0.084 coverage at 48px |
| readable-48px-structure | pass | 3 | >= 2 palette colours still visible at 48px |
| enemy-value-ceiling | pass | 0.6503 | <= 0.856 Oklab L (bone); paper belongs to the player |
| readable-48px-detail | pass | 0.3489 | >= 0.06 edge density at 48px |
