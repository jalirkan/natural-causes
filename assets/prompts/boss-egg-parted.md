# The Egg, corona parting

- **Asset id:** `boss-egg-parted`
- **Act:** conception
- **Role:** boss
- **Source:** authored SVG, `tools/art/svg/conception/boss-egg-parted.svg`
- **SVG sha256:** `42c09445c57178cd38ee97e5089d19dbeb80af7dc50fec16ce7735f41556ca40`
- **Rasteriser:** sharp 0.34.5 (libvips 8.17.3, librsvg 2.61.2)
- **Render:** 1099.699 dpi, 4× supersampled and area-averaged
- **Rendered:** 2026-09-29T02:41:07.634Z
- **Sprite size:** 384px
- **Tests:** the Egg exactly as boss-egg-closing with the corona parted: the two fingers low and to the right gone, the egg bare through the gap, the bounds unmoved

**Why this life stage.** It is the only boss in the game that is beaten by being taken in rather than brought down.

## Description

an enormous smooth round cream egg filling the frame, in the greeting-card register, a corona of blunt stubby teal fingers growing out from under its edge like a sun drawn by a child, background showing between them, the corona parted in one clear gap low and to the right, on the side the face sits toward: the two fingers there gone and the egg bare through the gap, one small face placed off-centre, low and to the right on the huge smooth mass, the eyes closed as two dark lash lines bowed downward, the same pink cheeks and knowing smile, everything else identical to boss-egg, one flat rose crescent low and to the right as the only shadow

## Mechanical checks

| Check | Result | Measured | Expected |
|---|---|---|---|
| silhouette-area | pass | 0.5773 | 0.25–0.95 of canvas |
| background-contrast | pass | 0.4078 | >= 0.12 median Oklab L from conception-deep |
| background-contrast-coverage | pass | 0.1724 | <= 0.4 of sprite may vanish into conception-deep |
| palette-conformance | pass | 0.0293 | <= 0.0353 Oklab from a palette entry |
| palette-variety | pass | 5 | >= 3 distinct palette colours |
| palette-dominance | pass | 0.61 | no colour above 0.9 of the sprite |
| readable-48px-silhouette | pass | 0.589 | >= 0.175 coverage at 48px |
| readable-48px-structure | pass | 7 | >= 3 palette colours still visible at 48px |
| enemy-value-ceiling | pass | 0.8512 | <= 0.856 Oklab L (bone); paper belongs to the player |
| readable-48px-detail | pass | 0.2621 | >= 0.06 edge density at 48px |
