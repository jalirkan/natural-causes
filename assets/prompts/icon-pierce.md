# Spitball icon

- **Asset id:** `icon-pierce`
- **Act:** conception
- **Role:** icon
- **Source:** authored SVG, `tools/art/svg/conception/icon-pierce.svg`
- **SVG sha256:** `b8779890239bfcacd5a535d9921749c6e719ad10985a3c56ba4005619fca7073`
- **Rasteriser:** sharp 0.34.5 (libvips 8.17.3, librsvg 2.61.2)
- **Render:** 67.862 dpi, 4× supersampled and area-averaged
- **Rendered:** 2026-09-29T02:41:15.436Z
- **Sprite size:** 96px
- **Tests:** a wet wad of notebook paper, read at 52px on a card and 42px in flight, never a cloud, a walnut or a stone

## Description

a wet wad of chewed notebook paper flying to the right, one slightly squashed ball, filling most of the frame, balled up into three rounded facets, the ruled lines of the page running a different way on each, one long crease corner to corner and one meeting it from the side, three small wet flecks flying off behind it, flat pale warm tan (#D2C6AC) wad and flecks, the ruled lines and the soaked lower right side in warm grey-brown (#6E6353), the creases warm near-black (#2A2521), no face, no paper white, no blue, no red, no text

## Mechanical checks

| Check | Result | Measured | Expected |
|---|---|---|---|
| silhouette-area | pass | 0.2939 | 0.1–0.8 of canvas |
| background-contrast | pass | 0.5609 | >= 0.12 median Oklab L from ink |
| background-contrast-coverage | pass | 0.1624 | <= 0.4 of sprite may vanish into ink |
| palette-conformance | pass | 0 | <= 0.0353 Oklab from a palette entry |
| palette-variety | pass | 3 | >= 2 distinct palette colours |
| palette-dominance | pass | 0.5814 | no colour above 0.97 of the sprite |
| readable-48px-silhouette | pass | 0.3016 | >= 0.070 coverage at 48px |
| readable-48px-structure | pass | 7 | >= 2 palette colours still visible at 48px |
| readable-48px-detail | pass | 0.5636 | >= 0.06 edge density at 48px |
| field-colours | pass | 0 | 0 px in a colour it keeps off on the field, as its law 11 line in `pnpm art:batch -- --dry --set=icons` lists them (law 10, G-036) |
