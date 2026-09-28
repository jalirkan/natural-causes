# Cry icon

- **Asset id:** `icon-cry`
- **Act:** conception
- **Role:** icon
- **Source:** authored SVG, `tools/art/svg/conception/icon-cry.svg`
- **SVG sha256:** `ca86b9f231d46f55a8d6e1d8e3408f8cc0114ed3c1aff9b96aa93aa79315cdf5`
- **Rasteriser:** sharp 0.34.5 (libvips 8.17.3, librsvg 2.61.2)
- **Render:** 59.973 dpi, 4× supersampled and area-averaged
- **Rendered:** 2026-09-28T23:04:41.789Z
- **Sprite size:** 96px
- **Tests:** one teardrop with a worried little face, read at 52px on a card and about 36px riding the top of the ring, never a flame, an onion or a ghost

## Description

one big teardrop seen straight on, the point up and rounded, the belly round below, filling most of the frame, a faintly worried little face on the belly: two big dark eyes each with one pale glint, brows lifted in the middle, a blush oval under each eye, a small wobbly mouth, flat pale warm tan (#D2C6AC) drop with one warm grey-brown (#6E6353) shadow along its lower right, blush (#EBA39C) cheeks, warm near-black (#2A2521) eyes, brows and mouth, no paper white, no red, no gold, no text

## Mechanical checks

| Check | Result | Measured | Expected |
|---|---|---|---|
| silhouette-area | pass | 0.527 | 0.1–0.8 of canvas |
| background-contrast | pass | 0.5609 | >= 0.12 median Oklab L from ink |
| background-contrast-coverage | pass | 0.1935 | <= 0.4 of sprite may vanish into ink |
| palette-conformance | pass | 0 | <= 0.0353 Oklab from a palette entry |
| palette-variety | pass | 4 | >= 2 distinct palette colours |
| palette-dominance | pass | 0.698 | no colour above 0.97 of the sprite |
| readable-48px-silhouette | pass | 0.5304 | >= 0.070 coverage at 48px |
| readable-48px-structure | pass | 7 | >= 2 palette colours still visible at 48px |
| readable-48px-detail | pass | 0.3493 | >= 0.06 edge density at 48px |
| field-colours | pass | 0 | 0 px in a colour it keeps off on the field, as its law 11 line in `pnpm art:batch -- --dry --set=icons` lists them (law 10, G-036) |
