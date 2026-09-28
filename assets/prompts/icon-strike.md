# Lash icon

- **Asset id:** `icon-strike`
- **Act:** conception
- **Role:** icon
- **Source:** authored SVG, `tools/art/svg/conception/icon-strike.svg`
- **SVG sha256:** `fd0ff1eee91c8a1dc4b018bf3e431460c55cabc3f3c86e4ac8718e3a66e0a972`
- **Rasteriser:** sharp 0.34.5 (libvips 8.17.3, librsvg 2.61.2)
- **Render:** 55.907 dpi, 4× supersampled and area-averaged
- **Rendered:** 2026-09-28T04:43:18.624Z
- **Sprite size:** 96px
- **Tests:** a manicule that reads at 40px on an ink card

## Description

a vintage printed pointing-hand ornament, a manicule, one hand with the index finger extended pointing to the right, a simple shirt cuff at the wrist, seen perfectly flat as printed on a page, filling most of the frame, flat muted dusty rose hand, pale warm cuff, dark interior lines between the fingers

## Mechanical checks

| Check | Result | Measured | Expected |
|---|---|---|---|
| silhouette-area | pass | 0.3363 | 0.1–0.8 of canvas |
| background-contrast | pass | 0.3208 | >= 0.12 median Oklab L from ink |
| background-contrast-coverage | pass | 0.2559 | <= 0.4 of sprite may vanish into ink |
| palette-conformance | pass | 0 | <= 0.0353 Oklab from a palette entry |
| palette-variety | pass | 3 | >= 2 distinct palette colours |
| palette-dominance | pass | 0.5799 | no colour above 0.97 of the sprite |
| readable-48px-silhouette | pass | 0.3438 | >= 0.070 coverage at 48px |
| readable-48px-structure | pass | 5 | >= 2 palette colours still visible at 48px |
| readable-48px-detail | pass | 0.4636 | >= 0.06 edge density at 48px |
