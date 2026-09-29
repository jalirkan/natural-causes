# Rattle icon

- **Asset id:** `icon-sweep`
- **Act:** conception
- **Role:** icon
- **Source:** authored SVG, `tools/art/svg/conception/icon-sweep.svg`
- **SVG sha256:** `6d4e40c405d0efac600a556e5b3e245c5fd13361c0edaa00d5541ae712f0cc10`
- **Rasteriser:** sharp 0.34.5 (libvips 8.17.3, librsvg 2.61.2)
- **Render:** 55.558 dpi, 4× supersampled and area-averaged
- **Rendered:** 2026-09-29T02:41:16.201Z
- **Sprite size:** 96px
- **Tests:** a baby rattle swung at the crowd, read at 52px on a card and 36px turning through the sweep, head out and handle in

## Description

a baby rattle lying on its side: a big round head on the right, a short fat handle running left from a little collar, and a round ring on the end of the handle, a pleased face on the head: two big dark eyes with one small pale glint each, a blush oval under each eye, a small smile, the head in flat muted dusty rose (#A86A63) with one small pale warm (#D2C6AC) glint at its upper left and one deep wine (#6B3A44) shadow along its lower right, the handle and ring flat pale warm (#D2C6AC), the collar soft blush pink (#EBA39C), eyes and smile warm near-black (#2A2521), kid proportions, stubby handle, no hand holding it, no motion lines, no text

## Mechanical checks

| Check | Result | Measured | Expected |
|---|---|---|---|
| silhouette-area | pass | 0.3387 | 0.1–0.8 of canvas |
| background-contrast | pass | 0.3208 | >= 0.12 median Oklab L from ink |
| background-contrast-coverage | pass | 0.141 | <= 0.4 of sprite may vanish into ink |
| palette-conformance | pass | 0 | <= 0.0353 Oklab from a palette entry |
| palette-variety | pass | 5 | >= 2 distinct palette colours |
| palette-dominance | pass | 0.5338 | no colour above 0.97 of the sprite |
| readable-48px-silhouette | pass | 0.3455 | >= 0.070 coverage at 48px |
| readable-48px-structure | pass | 8 | >= 2 palette colours still visible at 48px |
| readable-48px-detail | pass | 0.362 | >= 0.06 edge density at 48px |
| field-colours | pass | 0 | 0 px in a colour it keeps off on the field, as its law 11 line in `pnpm art:batch -- --dry --set=icons` lists them (law 10, G-036) |
