# Spilt Milk icon

- **Asset id:** `icon-burst`
- **Act:** conception
- **Role:** icon
- **Source:** authored SVG, `tools/art/svg/conception/icon-burst.svg`
- **SVG sha256:** `a5aaec89c835333987bb943bbc1693274ef9f38535806122a8675edc0105accf`
- **Rasteriser:** sharp 0.34.5 (libvips 8.17.3, librsvg 2.61.2)
- **Render:** 54.000 dpi, 4× supersampled and area-averaged
- **Rendered:** 2026-09-29T02:41:15.502Z
- **Sprite size:** 96px
- **Tests:** a splat of spilt milk with its cup, read at 52px on a card and as the pop round the player, never a cloud, a germ or a sun

## Description

spilt milk seen from above: one big splat thrown out every way at once, filling most of the frame, uneven splashes reaching out from its edge, some long and thin, some short and fat, each ending round, and drops stretched along the way they fly, a child's sippy cup tipped over on its side at the lower left, its spout in the milk, no handles, a small surprised face on the cup with two dark eyes, blush cheeks and a round little mouth, flat pale warm tan (#D2C6AC) milk, dusty rose (#A86A63) cup with one pale warm glint, deep wine (#6B3A44) lid and spout, blush (#EBA39C) cheeks, warm near-black (#2A2521) eyes, mouth and the edge where the cup lies in the milk, no paper white, no red, no gold, no text

## Mechanical checks

| Check | Result | Measured | Expected |
|---|---|---|---|
| silhouette-area | pass | 0.3945 | 0.1–0.8 of canvas |
| background-contrast | pass | 0.5609 | >= 0.12 median Oklab L from ink |
| background-contrast-coverage | pass | 0.1708 | <= 0.4 of sprite may vanish into ink |
| palette-conformance | pass | 0 | <= 0.0353 Oklab from a palette entry |
| palette-variety | pass | 5 | >= 2 distinct palette colours |
| palette-dominance | pass | 0.6524 | no colour above 0.97 of the sprite |
| readable-48px-silhouette | pass | 0.4102 | >= 0.070 coverage at 48px |
| readable-48px-structure | pass | 7 | >= 2 palette colours still visible at 48px |
| readable-48px-detail | pass | 0.4205 | >= 0.06 edge density at 48px |
| field-colours | pass | 0 | 0 px in a colour it keeps off on the field, as its law 11 line in `pnpm art:batch -- --dry --set=icons` lists them (law 10, G-036) |
