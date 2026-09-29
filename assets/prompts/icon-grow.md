# Growth Spurt icon

- **Asset id:** `icon-grow`
- **Act:** conception
- **Role:** icon
- **Source:** authored SVG, `tools/art/svg/conception/icon-grow.svg`
- **SVG sha256:** `6f2719c88a31c0e4a8ed3627c85b429346fe735bf7791f78b92007067b537cb7`
- **Rasteriser:** sharp 0.34.5 (libvips 8.17.3, librsvg 2.61.2)
- **Render:** 59.831 dpi, 4× supersampled and area-averaged
- **Rendered:** 2026-09-29T02:41:15.881Z
- **Sprite size:** 96px
- **Tests:** taller than the thing that measures you, read at 52px on a card

## Description

a measuring rule standing on end with five ticks, long and short, in from the edge facing the arrow, beside it one tall upright arrow standing on the same floor, its point well above the top of the rule, pale warm rule with dusty rose ticks, flat muted dusty rose arrow, no figure, no numbers

## Mechanical checks

| Check | Result | Measured | Expected |
|---|---|---|---|
| silhouette-area | pass | 0.4564 | 0.1–0.8 of canvas |
| background-contrast | pass | 0.3208 | >= 0.12 median Oklab L from ink |
| background-contrast-coverage | pass | 0.0987 | <= 0.4 of sprite may vanish into ink |
| palette-conformance | pass | 0 | <= 0.0353 Oklab from a palette entry |
| palette-variety | pass | 3 | >= 2 distinct palette colours |
| palette-dominance | pass | 0.5183 | no colour above 0.97 of the sprite |
| readable-48px-silhouette | pass | 0.4839 | >= 0.070 coverage at 48px |
| readable-48px-structure | pass | 6 | >= 2 palette colours still visible at 48px |
| readable-48px-detail | pass | 0.3296 | >= 0.06 edge density at 48px |
