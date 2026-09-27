# The player — sperm form

- **Asset id:** `player-sperm`
- **Act:** conception
- **Role:** player
- **Source:** authored SVG, `tools/art/svg/conception/player-sperm.svg`
- **SVG sha256:** `7113718960922d93b2cb1732f2a594186b4b04c5cb8941b3da3047b7850dddab`
- **Rasteriser:** sharp 0.34.5 (libvips 8.17.3, librsvg 2.61.2)
- **Render:** 322.560 dpi, 4× supersampled and area-averaged
- **Rendered:** 2026-09-27T22:58:54.730Z
- **Sprite size:** 112px
- **Tests:** can the style do a protagonist at all

## Description

a single cartoon sperm cell character seen from the side, a large lopsided off-white oval head taking up most of the body, two big flat eyes at visibly different heights, the left eye slightly larger, a short flat line for a mouth, thick eyebrows furrowed with effort, the face of something doing its best with no information, one asymmetric tuft of hair sticking up above the left eye, a single thin tapering tail trailing behind, no clothing, no accessories, no helmet, no gear, it owns nothing

## Mechanical checks

| Check | Result | Measured | Expected |
|---|---|---|---|
| silhouette-area | pass | 0.3477 | 0.12–0.82 of canvas |
| background-contrast | pass | 0.5173 | >= 0.12 median Oklab L from conception-deep |
| background-contrast-coverage | pass | 0 | <= 0.4 of sprite may vanish into conception-deep |
| palette-conformance | pass | 0 | <= 0.0353 Oklab from a palette entry |
| palette-variety | pass | 2 | >= 2 distinct palette colours |
| palette-dominance | pass | 0.8044 | no colour above 0.97 of the sprite |
| readable-48px-silhouette | pass | 0.355 | >= 0.084 coverage at 48px |
| readable-48px-structure | pass | 7 | >= 2 palette colours still visible at 48px |
| readable-48px-detail | pass | 0.346 | >= 0.06 edge density at 48px |
