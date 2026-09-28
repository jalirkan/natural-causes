# Personal Space icon

- **Asset id:** `icon-aura`
- **Act:** conception
- **Role:** icon
- **Source:** authored SVG, `tools/art/svg/conception/icon-aura.svg`
- **SVG sha256:** `9614c214d7062bcb9b41bde9d8d4b44024b114b8296600e78b140073c13714e9`
- **Rasteriser:** sharp 0.34.5 (libvips 8.17.3, librsvg 2.61.2)
- **Render:** 57.199 dpi, 4× supersampled and area-averaged
- **Rendered:** 2026-09-28T03:28:50.662Z
- **Sprite size:** 96px
- **Tests:** a rope barrier that says keep your distance, read at 52px on a card and 32px riding the ring

## Description

a velvet rope barrier seen straight on: two short stanchion posts, each with a round ball finial on a cap and a flat round base, one thick rope hooked to the inner face of each post just under the cap, drooping between them in a single sag, pale warm posts, finials, bases and rope ends, flat muted dusty rose rope, dark interior lines under the finials and caps, at the bases and where the rope meets each post, nothing else: no sign, no carpet, no queue, no figure, no text

## Mechanical checks

| Check | Result | Measured | Expected |
|---|---|---|---|
| silhouette-area | pass | 0.4224 | 0.1–0.8 of canvas |
| background-contrast | pass | 0.3208 | >= 0.12 median Oklab L from ink |
| background-contrast-coverage | pass | 0.2987 | <= 0.4 of sprite may vanish into ink |
| palette-conformance | pass | 0 | <= 0.0353 Oklab from a palette entry |
| palette-variety | pass | 3 | >= 2 distinct palette colours |
| palette-dominance | pass | 0.4732 | no colour above 0.97 of the sprite |
| readable-48px-silhouette | pass | 0.4332 | >= 0.070 coverage at 48px |
| readable-48px-structure | pass | 7 | >= 2 palette colours still visible at 48px |
| readable-48px-detail | pass | 0.557 | >= 0.06 edge density at 48px |
