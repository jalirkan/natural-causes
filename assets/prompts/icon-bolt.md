# Tattle icon

- **Asset id:** `icon-bolt`
- **Act:** conception
- **Role:** icon
- **Source:** authored SVG, `tools/art/svg/conception/icon-bolt.svg`
- **SVG sha256:** `3ae66daa9fa02f40f0880c5309ab0c81b4b75d568292256ebde11aa4b0661919`
- **Rasteriser:** sharp 0.34.5 (libvips 8.17.3, librsvg 2.61.2)
- **Render:** 61.282 dpi, 4× supersampled and area-averaged
- **Rendered:** 2026-09-29T02:41:16.164Z
- **Sprite size:** 96px
- **Tests:** somebody telling on somebody, read upright at 52px on a card and 36px dropping onto the field

## Description

one round speech bubble seen flat and upright, with one small tail at its lower left pointing down at whoever it is about, one fat exclamation mark in the middle of it, a tapering bar and a round dot, and nothing else written, the bubble in flat soft blush pink (#EBA39C) with one small pale warm (#D2C6AC) glint at its upper left and one dusty rose (#A86A63) shadow along its lower right, the exclamation mark warm near-black (#2A2521), no face, no words, no letters, no second bubble, no phone

## Mechanical checks

| Check | Result | Measured | Expected |
|---|---|---|---|
| silhouette-area | pass | 0.7045 | 0.1–0.8 of canvas |
| background-contrast | pass | 0.5146 | >= 0.12 median Oklab L from ink |
| background-contrast-coverage | pass | 0.1391 | <= 0.4 of sprite may vanish into ink |
| palette-conformance | pass | 0 | <= 0.0353 Oklab from a palette entry |
| palette-variety | pass | 4 | >= 2 distinct palette colours |
| palette-dominance | pass | 0.8277 | no colour above 0.97 of the sprite |
| readable-48px-silhouette | pass | 0.7148 | >= 0.070 coverage at 48px |
| readable-48px-structure | pass | 6 | >= 2 palette colours still visible at 48px |
| readable-48px-detail | pass | 0.1986 | >= 0.06 edge density at 48px |
| field-colours | pass | 0 | 0 px in a colour it keeps off on the field, as its law 11 line in `pnpm art:batch -- --dry --set=icons` lists them (law 10, G-036) |
