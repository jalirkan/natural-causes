# Rut icon

- **Asset id:** `icon-rut`
- **Act:** conception
- **Role:** icon
- **Source:** authored SVG, `tools/art/svg/conception/icon-rut.svg`
- **SVG sha256:** `f6f95b35deff11631b12841c154313a67e0bc6a18994b887472b03c14ac25613`
- **Rasteriser:** sharp 0.34.5 (libvips 8.17.3, librsvg 2.61.2)
- **Render:** 63.197 dpi, 4× supersampled and area-averaged
- **Rendered:** 2026-09-29T02:41:16.472Z
- **Sprite size:** 96px
- **Tests:** a pair of worn slippers seen from above, read at 52px on a card and 26px stamped along a trail, never a pair of shoes

## Description

a pair of soft house slippers seen from directly above, toes up, side by side and slightly splayed, each a rounded sole with a low toe pocket, flat muted dusty rose slippers, pale warm inner soles showing at the heels, a dark interior line along each toe pocket edge, no feet in them, no floor, no laces, no text

## Mechanical checks

| Check | Result | Measured | Expected |
|---|---|---|---|
| silhouette-area | pass | 0.728 | 0.1–0.8 of canvas |
| background-contrast | pass | 0.3208 | >= 0.12 median Oklab L from ink |
| background-contrast-coverage | pass | 0.1155 | <= 0.4 of sprite may vanish into ink |
| palette-conformance | pass | 0 | <= 0.0353 Oklab from a palette entry |
| palette-variety | pass | 3 | >= 2 distinct palette colours |
| palette-dominance | pass | 0.5958 | no colour above 0.97 of the sprite |
| readable-48px-silhouette | pass | 0.74 | >= 0.070 coverage at 48px |
| readable-48px-structure | pass | 6 | >= 2 palette colours still visible at 48px |
| readable-48px-detail | pass | 0.2809 | >= 0.06 edge density at 48px |
| field-colours | pass | 0 | 0 px in a colour it keeps off on the field, as its law 11 line in `pnpm art:batch -- --dry --set=icons` lists them (law 10, G-036) |
