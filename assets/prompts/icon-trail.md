# Wake icon

- **Asset id:** `icon-trail`
- **Act:** conception
- **Role:** icon
- **Source:** authored SVG, `tools/art/svg/conception/icon-trail.svg`
- **SVG sha256:** `3defc2dd64cd9e7355c108c07e2eb910824749c757763a71a596091d81f0187e`
- **Rasteriser:** sharp 0.34.5 (libvips 8.17.3, librsvg 2.61.2)
- **Render:** 55.437 dpi, 4× supersampled and area-averaged
- **Rendered:** 2026-09-28T04:44:00.561Z
- **Sprite size:** 96px
- **Tests:** one bare footprint, read at 52px on a card and 26px stamped along a trail, never footwear

## Description

a bare footprint pressed in sand, seen from directly above, toes pointing up, as on a beach safety sign, one smooth foot-sole shape narrow at the arch and wide at the ball, with five fat round toe dots arranged in an arc above it, flat muted dusty rose (#A86A63) sole and toes, a muted tan (#D2C6AC) mark in the hollow of the inner arch, a warm near-black (#2A2521) edge where the ball meets the arch, no red, no pale paper tone, no light rose, no shoe, no sandal, no slipper, no text

## Mechanical checks

| Check | Result | Measured | Expected |
|---|---|---|---|
| silhouette-area | pass | 0.3553 | 0.1–0.8 of canvas |
| background-contrast | pass | 0.3208 | >= 0.12 median Oklab L from ink |
| background-contrast-coverage | pass | 0.2181 | <= 0.4 of sprite may vanish into ink |
| palette-conformance | pass | 0 | <= 0.0353 Oklab from a palette entry |
| palette-variety | pass | 3 | >= 2 distinct palette colours |
| palette-dominance | pass | 0.7529 | no colour above 0.97 of the sprite |
| readable-48px-silhouette | pass | 0.365 | >= 0.070 coverage at 48px |
| readable-48px-structure | pass | 4 | >= 2 palette colours still visible at 48px |
| readable-48px-detail | pass | 0.3826 | >= 0.06 edge density at 48px |
