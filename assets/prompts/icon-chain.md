# Gossip icon

- **Asset id:** `icon-chain`
- **Act:** conception
- **Role:** icon
- **Source:** authored SVG, `tools/art/svg/conception/icon-chain.svg`
- **SVG sha256:** `60f12523a041e316a0ba84b6578a4abb395af37fda045c00e560d593f286e2f8`
- **Rasteriser:** sharp 0.34.5 (libvips 8.17.3, librsvg 2.61.2)
- **Render:** 57.199 dpi, 4× supersampled and area-averaged
- **Rendered:** 2026-09-27T23:47:09.852Z
- **Sprite size:** 96px
- **Tests:** one hit passed on to two more, read at 52px on a card and 30px in flight

## Description

three plain round dots joined by one bent line, like a diagram of who told whom, the first dot larger with a pale mark at its centre where it landed, the other two equal, flat muted dusty rose dots on a pale warm line, no tails on any dot

## Mechanical checks

| Check | Result | Measured | Expected |
|---|---|---|---|
| silhouette-area | pass | 0.3268 | 0.1–0.8 of canvas |
| background-contrast | pass | 0.3208 | >= 0.12 median Oklab L from ink |
| background-contrast-coverage | pass | 0.1869 | <= 0.4 of sprite may vanish into ink |
| palette-conformance | pass | 0 | <= 0.0353 Oklab from a palette entry |
| palette-variety | pass | 3 | >= 2 distinct palette colours |
| palette-dominance | pass | 0.6331 | no colour above 0.97 of the sprite |
| readable-48px-silhouette | pass | 0.3351 | >= 0.070 coverage at 48px |
| readable-48px-structure | pass | 6 | >= 2 palette colours still visible at 48px |
| readable-48px-detail | pass | 0.3941 | >= 0.06 edge density at 48px |
