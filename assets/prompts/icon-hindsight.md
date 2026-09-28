# Hindsight icon

- **Asset id:** `icon-hindsight`
- **Act:** conception
- **Role:** icon
- **Source:** authored SVG, `tools/art/svg/conception/icon-hindsight.svg`
- **SVG sha256:** `fd1212d0f3ae854712e22d715b5bdca8b339ade1a86d1093393daeca346915ba`
- **Rasteriser:** sharp 0.34.5 (libvips 8.17.3, librsvg 2.61.2)
- **Render:** 58.553 dpi, 4× supersampled and area-averaged
- **Rendered:** 2026-09-28T04:19:08.982Z
- **Sprite size:** 96px
- **Tests:** a rear-view mirror on its stalk, read at 52px on a card and 36px dropping onto the field, never a hand mirror

## Description

a wide flat rear-view mirror seen straight on, a rounded landscape rectangle on a short stalk rising from below, flat muted dusty rose frame and stalk, pale warm mirror face with one darker flat band across it as the reflection, no car, no road, no figure, no text

## Mechanical checks

| Check | Result | Measured | Expected |
|---|---|---|---|
| silhouette-area | pass | 0.4417 | 0.1–0.8 of canvas |
| background-contrast | pass | 0.3208 | >= 0.12 median Oklab L from ink |
| background-contrast-coverage | pass | 0.2496 | <= 0.4 of sprite may vanish into ink |
| palette-conformance | pass | 0 | <= 0.0353 Oklab from a palette entry |
| palette-variety | pass | 3 | >= 2 distinct palette colours |
| palette-dominance | pass | 0.4375 | no colour above 0.97 of the sprite |
| readable-48px-silhouette | pass | 0.4488 | >= 0.070 coverage at 48px |
| readable-48px-structure | pass | 5 | >= 2 palette colours still visible at 48px |
| readable-48px-detail | pass | 0.5 | >= 0.06 edge density at 48px |
