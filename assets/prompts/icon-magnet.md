# Appetite icon

- **Asset id:** `icon-magnet`
- **Act:** conception
- **Role:** icon
- **Source:** authored SVG, `tools/art/svg/conception/icon-magnet.svg`
- **SVG sha256:** `65fff4110a1535158e63a93a6d5a32036a1373bc297b158bac3fd3b06c0313eb`
- **Rasteriser:** sharp 0.34.5 (libvips 8.17.3, librsvg 2.61.2)
- **Render:** 56.065 dpi, 4× supersampled and area-averaged
- **Rendered:** 2026-09-27T23:47:10.679Z
- **Sprite size:** 96px
- **Tests:** a meal at a glance: the dining-car sign, read at 52px on a card

## Description

a round plate seen from directly above between an upright fork on the left and an upright knife on the right, as on a station sign, the plate a pale warm rim around a paler well, one dark line between them, fork and knife in flat muted dusty rose, three tines on the fork, a rounded blade on the knife

## Mechanical checks

| Check | Result | Measured | Expected |
|---|---|---|---|
| silhouette-area | pass | 0.5766 | 0.1–0.8 of canvas |
| background-contrast | pass | 0.3208 | >= 0.12 median Oklab L from ink |
| background-contrast-coverage | pass | 0.3692 | <= 0.4 of sprite may vanish into ink |
| palette-conformance | pass | 0 | <= 0.0353 Oklab from a palette entry |
| palette-variety | pass | 4 | >= 2 distinct palette colours |
| palette-dominance | pass | 0.3692 | no colour above 0.97 of the sprite |
| readable-48px-silhouette | pass | 0.5942 | >= 0.070 coverage at 48px |
| readable-48px-structure | pass | 7 | >= 2 palette colours still visible at 48px |
| readable-48px-detail | pass | 0.5101 | >= 0.06 edge density at 48px |
