# Nap icon

- **Asset id:** `icon-nap`
- **Act:** conception
- **Role:** icon
- **Source:** authored SVG, `tools/art/svg/conception/icon-nap.svg`
- **SVG sha256:** `7cebdc1514ee70d6a03bbff8604530a68f2980d3c50caefceca3914e354dba6e`
- **Rasteriser:** sharp 0.34.5 (libvips 8.17.3, librsvg 2.61.2)
- **Render:** 56.065 dpi, 4× supersampled and area-averaged
- **Rendered:** 2026-09-28T17:58:51.865Z
- **Sprite size:** 96px
- **Tests:** an empty wingback armchair seen from the front, read at 52px on a card, never an office chair, a throne or a sofa

## Description

one upholstered wingback armchair seen straight from the front, empty, a tall back with a wing standing out at each top corner, two fat rolled arms either side of one deep seat cushion, two short stubby legs under the front, a small cloth laid over the top of the back where a head would rest, and a soft dent in the seat cushion, flat muted dusty rose frame, back, wings and arms, pale warm cushion and head cloth, dark interior lines where the cushion meets the arms and the back, nobody sitting in it, no figure, no clock, no blanket, no text

## Mechanical checks

| Check | Result | Measured | Expected |
|---|---|---|---|
| silhouette-area | pass | 0.6961 | 0.1–0.8 of canvas |
| background-contrast | pass | 0.3208 | >= 0.12 median Oklab L from ink |
| background-contrast-coverage | pass | 0.2513 | <= 0.4 of sprite may vanish into ink |
| palette-conformance | pass | 0 | <= 0.0353 Oklab from a palette entry |
| palette-variety | pass | 3 | >= 2 distinct palette colours |
| palette-dominance | pass | 0.5716 | no colour above 0.97 of the sprite |
| readable-48px-silhouette | pass | 0.7062 | >= 0.070 coverage at 48px |
| readable-48px-structure | pass | 5 | >= 2 palette colours still visible at 48px |
| readable-48px-detail | pass | 0.4333 | >= 0.06 edge density at 48px |
