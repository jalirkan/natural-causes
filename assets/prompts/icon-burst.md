# Acrosome icon

- **Asset id:** `icon-burst`
- **Act:** conception
- **Role:** icon
- **Source:** authored SVG, `tools/art/svg/conception/icon-burst.svg`
- **SVG sha256:** `5bdb364ad3095582637a90dfcbd00ef02a75526767d660e4d9c77711beeca34a`
- **Rasteriser:** sharp 0.34.5 (libvips 8.17.3, librsvg 2.61.2)
- **Render:** 54.000 dpi, 4× supersampled and area-averaged
- **Rendered:** 2026-09-28T04:39:33.825Z
- **Sprite size:** 96px
- **Tests:** a starburst that stays a badge and never becomes a sun

## Description

a retail price-tag starburst badge with about twelve irregular points, seen perfectly flat, filling most of the frame, flat muted dusty rose outer starburst with a smaller flat pale warm starburst inset inside it, a dark interior edge round the inset, no text, no numbers, no face

## Mechanical checks

| Check | Result | Measured | Expected |
|---|---|---|---|
| silhouette-area | pass | 0.5654 | 0.1–0.8 of canvas |
| background-contrast | pass | 0.3208 | >= 0.12 median Oklab L from ink |
| background-contrast-coverage | pass | 0.2167 | <= 0.4 of sprite may vanish into ink |
| palette-conformance | pass | 0 | <= 0.0353 Oklab from a palette entry |
| palette-variety | pass | 3 | >= 2 distinct palette colours |
| palette-dominance | pass | 0.6126 | no colour above 0.97 of the sprite |
| readable-48px-silhouette | pass | 0.5764 | >= 0.070 coverage at 48px |
| readable-48px-structure | pass | 5 | >= 2 palette colours still visible at 48px |
| readable-48px-detail | pass | 0.3994 | >= 0.06 edge density at 48px |
