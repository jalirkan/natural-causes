# Grudge icon

- **Asset id:** `icon-orbit`
- **Act:** conception
- **Role:** icon
- **Source:** authored SVG, `tools/art/svg/conception/icon-orbit.svg`
- **SVG sha256:** `9f8e0ec1f02bd928a5680d47dc6568c0f3a4103da57a15270a62e7822509071b`
- **Rasteriser:** sharp 0.34.5 (libvips 8.17.3, librsvg 2.61.2)
- **Render:** 51.809 dpi, 4× supersampled and area-averaged
- **Rendered:** 2026-09-27T23:47:08.964Z
- **Sprite size:** 96px
- **Tests:** a fist that keeps going round, read at 52px on a card and 36px circling the player

## Description

a clenched fist seen knuckles-on, four finger rolls over a short palm, the thumb folded across the front, no forearm, standing in a tilted orbit ring that passes behind it and across its foot, one bead riding the ring, flat muted dusty rose fist, pale warm ring and bead, dark interior lines between the fingers

## Mechanical checks

| Check | Result | Measured | Expected |
|---|---|---|---|
| silhouette-area | pass | 0.397 | 0.1–0.8 of canvas |
| background-contrast | pass | 0.3208 | >= 0.12 median Oklab L from ink |
| background-contrast-coverage | pass | 0.3772 | <= 0.4 of sprite may vanish into ink |
| palette-conformance | pass | 0 | <= 0.0353 Oklab from a palette entry |
| palette-variety | pass | 3 | >= 2 distinct palette colours |
| palette-dominance | pass | 0.4151 | no colour above 0.97 of the sprite |
| readable-48px-silhouette | pass | 0.4084 | >= 0.070 coverage at 48px |
| readable-48px-structure | pass | 6 | >= 2 palette colours still visible at 48px |
| readable-48px-detail | pass | 0.5552 | >= 0.06 edge density at 48px |
