# Candy icon

- **Asset id:** `icon-pull`
- **Act:** conception
- **Role:** icon
- **Source:** authored SVG, `tools/art/svg/conception/icon-pull.svg`
- **SVG sha256:** `7baba453b04198e541b743991ec77f723ca65633cbdf08336081c1e21cad8647`
- **Rasteriser:** sharp 0.34.5 (libvips 8.17.3, librsvg 2.61.2)
- **Render:** 54.975 dpi, 4× supersampled and area-averaged
- **Rendered:** 2026-09-28T22:54:29.780Z
- **Sprite size:** 96px
- **Tests:** one wrapped sweet everything comes over for, read at 52px on a card and 40px at the centre of the pull

## Description

one wrapped sweet seen flat and straight on, a plump round middle twisted tight at each side into a crimped fan of wrapper, a bow-tie silhouette, a pleased little face on the middle: two big dark eyes with one small pale glint each, a blush oval under each eye, a small smile, the middle in flat muted dusty rose (#A86A63) with one small pale warm (#D2C6AC) glint at its upper left and one deep wine (#6B3A44) shadow along its lower right, the twists deep wine, the fans in flat soft blush pink (#EBA39C) with two dusty rose pleats in each, cheeks blush pink, eyes and smile warm near-black (#2A2521), round masses, kid proportions, flat fills, no stripes, no text, no brand, no stick

## Mechanical checks

| Check | Result | Measured | Expected |
|---|---|---|---|
| silhouette-area | pass | 0.3292 | 0.1–0.8 of canvas |
| background-contrast | pass | 0.3208 | >= 0.12 median Oklab L from ink |
| background-contrast-coverage | pass | 0.2047 | <= 0.4 of sprite may vanish into ink |
| palette-conformance | pass | 0 | <= 0.0353 Oklab from a palette entry |
| palette-variety | pass | 5 | >= 2 distinct palette colours |
| palette-dominance | pass | 0.4163 | no colour above 0.97 of the sprite |
| readable-48px-silhouette | pass | 0.3351 | >= 0.070 coverage at 48px |
| readable-48px-structure | pass | 6 | >= 2 palette colours still visible at 48px |
| readable-48px-detail | pass | 0.4485 | >= 0.06 edge density at 48px |
| field-colours | pass | 0 | 0 px in a colour it keeps off on the field, as its law 11 line in `pnpm art:batch -- --dry --set=icons` lists them (law 10, G-036) |
