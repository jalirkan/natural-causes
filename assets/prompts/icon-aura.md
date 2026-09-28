# Cooties icon

- **Asset id:** `icon-aura`
- **Act:** conception
- **Role:** icon
- **Source:** authored SVG, `tools/art/svg/conception/icon-aura.svg`
- **SVG sha256:** `536fc48d04d3c28345e20f6c04ebb8e913f47a6305e5121c061828a40e73959c`
- **Rasteriser:** sharp 0.34.5 (libvips 8.17.3, librsvg 2.61.2)
- **Render:** 55.907 dpi, 4× supersampled and area-averaged
- **Rendered:** 2026-09-28T22:54:31.116Z
- **Sprite size:** 96px
- **Tests:** the playground cootie shot, circle, circle, dot, dot, read at 52px on a card and 32px riding the ring

## Description

the playground cootie shot seen flat: one fat round ring with two big round dots inside it, and the two dots are the eyes of a pleased little face, each dot with one small pale glint, a blush oval under each, a small smile under them, the ring in flat muted dusty rose (#A86A63) with one small pale warm (#D2C6AC) glint at its upper left and one deep wine (#6B3A44) shadow along its lower right, inside the ring flat pale warm (#D2C6AC), dots and smile warm near-black (#2A2521), cheeks soft blush pink (#EBA39C), nothing else: no bug, no arm, no pen, no text

## Mechanical checks

| Check | Result | Measured | Expected |
|---|---|---|---|
| silhouette-area | pass | 0.7731 | 0.1–0.8 of canvas |
| background-contrast | pass | 0.3208 | >= 0.12 median Oklab L from ink |
| background-contrast-coverage | pass | 0.114 | <= 0.4 of sprite may vanish into ink |
| palette-conformance | pass | 0 | <= 0.0353 Oklab from a palette entry |
| palette-variety | pass | 5 | >= 2 distinct palette colours |
| palette-dominance | pass | 0.4832 | no colour above 0.97 of the sprite |
| readable-48px-silhouette | pass | 0.783 | >= 0.070 coverage at 48px |
| readable-48px-structure | pass | 6 | >= 2 palette colours still visible at 48px |
| readable-48px-detail | pass | 0.2634 | >= 0.06 edge density at 48px |
| field-colours | pass | 0 | 0 px in a colour it keeps off on the field, as its law 11 line in `pnpm art:batch -- --dry --set=icons` lists them (law 10, G-036) |
