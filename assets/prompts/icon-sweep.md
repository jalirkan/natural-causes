# Backhand icon

- **Asset id:** `icon-sweep`
- **Act:** conception
- **Role:** icon
- **Source:** authored SVG, `tools/art/svg/conception/icon-sweep.svg`
- **SVG sha256:** `225a1ecbe116d6fad8e08555f9a3c73c202cb51b53f28282a423fa7609e3ba2c`
- **Rasteriser:** sharp 0.34.5 (libvips 8.17.3, librsvg 2.61.2)
- **Render:** 58.209 dpi, 4× supersampled and area-averaged
- **Rendered:** 2026-09-28T03:33:24.338Z
- **Sprite size:** 96px
- **Tests:** a backhand mid-swing, unmistakably a slap and never the manicule, read at 52px on a card and 36px on the field

## Description

an open hand seen from the back, four fingers held together and only slightly fanned, the thumb out on the leading side, leaning well over into a swing to the right, as if caught halfway through it, three short flat motion arcs trailing off its heel, pieces of the swing's own curve, none at the fingertips, a simple shirt cuff with one button at the wrist, as on the printed pointing hand, and no forearm past it, no finger pointing, no palm showing, never a wave, flat muted dusty rose hand, pale warm cuff and motion arcs, dark interior lines between the fingers

## Mechanical checks

| Check | Result | Measured | Expected |
|---|---|---|---|
| silhouette-area | pass | 0.4206 | 0.1–0.8 of canvas |
| background-contrast | pass | 0.3208 | >= 0.12 median Oklab L from ink |
| background-contrast-coverage | pass | 0.2588 | <= 0.4 of sprite may vanish into ink |
| palette-conformance | pass | 0 | <= 0.0353 Oklab from a palette entry |
| palette-variety | pass | 3 | >= 2 distinct palette colours |
| palette-dominance | pass | 0.5165 | no colour above 0.97 of the sprite |
| readable-48px-silhouette | pass | 0.4301 | >= 0.070 coverage at 48px |
| readable-48px-structure | pass | 7 | >= 2 palette colours still visible at 48px |
| readable-48px-detail | pass | 0.5062 | >= 0.06 edge density at 48px |
