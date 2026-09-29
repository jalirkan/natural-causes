# Jumpiness icon

- **Asset id:** `icon-jump`
- **Act:** conception
- **Role:** icon
- **Source:** authored SVG, `tools/art/svg/conception/icon-jump.svg`
- **SVG sha256:** `8d857f78d9be6ea70bd5393ee0a2a0f8f834bc2cb0431ad0d29481c706ea6a62`
- **Rasteriser:** sharp 0.34.5 (libvips 8.17.3, librsvg 2.61.2)
- **Render:** 68.786 dpi, 4× supersampled and area-averaged
- **Rendered:** 2026-09-29T02:41:16.297Z
- **Sprite size:** 96px
- **Tests:** a small espresso cup with three steam lines, read at 52px on a card and 30px in flight

## Description

a small espresso cup on a saucer seen from the side, one round handle on the right, three short wavy steam lines rising from it, flat muted dusty rose cup, pale warm saucer and steam, a dark interior line at the rim, no spoon, no table, no text, no face

## Mechanical checks

| Check | Result | Measured | Expected |
|---|---|---|---|
| silhouette-area | pass | 0.5043 | 0.1–0.8 of canvas |
| background-contrast | pass | 0.3208 | >= 0.12 median Oklab L from ink |
| background-contrast-coverage | pass | 0.2212 | <= 0.4 of sprite may vanish into ink |
| palette-conformance | pass | 0 | <= 0.0353 Oklab from a palette entry |
| palette-variety | pass | 3 | >= 2 distinct palette colours |
| palette-dominance | pass | 0.469 | no colour above 0.97 of the sprite |
| readable-48px-silhouette | pass | 0.5226 | >= 0.070 coverage at 48px |
| readable-48px-structure | pass | 7 | >= 2 palette colours still visible at 48px |
| readable-48px-detail | pass | 0.463 | >= 0.06 edge density at 48px |
| field-colours | pass | 0 | 0 px in a colour it keeps off on the field, as its law 11 line in `pnpm art:batch -- --dry --set=icons` lists them (law 10, G-036) |
