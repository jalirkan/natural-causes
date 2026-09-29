# The player — sperm form

- **Asset id:** `player-sperm`
- **Act:** conception
- **Role:** player
- **Source:** authored SVG, `tools/art/svg/conception/player-sperm.svg`
- **SVG sha256:** `9d7511444554ef1100e75df352284511192eb1730fb91b497f9a902ce35975d7`
- **Rasteriser:** sharp 0.34.5 (libvips 8.17.3, librsvg 2.61.2)
- **Render:** 322.560 dpi, 4× supersampled and area-averaged
- **Rendered:** 2026-09-29T02:41:02.898Z
- **Sprite size:** 112px
- **Tests:** G-003 and G-053 before birth: the kid's head, markup for markup, on a comma of a body, at the same size as at fifty-five

## Description

the player before birth, a greeting-card character: the same head as every act on a plump comma of a tail that curls away behind it, tapering to a round tip, a big round head three fifths of the height with two big dark eyes, each with one small light glint at its upper left, a rosy oval (#EBA39C) on each cheek and a small content smile, the same single asymmetric cowlick sticking up above the left eye, one tuft and no other hair, paper coloured (#EFE7D6) head and tail, warm near-black (#2A2521) eyes, mouth, cowlick and chin line, every mass rounded, flat fills, no gradients, no threat colour anywhere, no clothing, no accessories, no helmet, no gear, it owns nothing

## Mechanical checks

| Check | Result | Measured | Expected |
|---|---|---|---|
| silhouette-area | pass | 0.3578 | 0.12–0.82 of canvas |
| background-contrast | pass | 0.5173 | >= 0.12 median Oklab L from conception-deep |
| background-contrast-coverage | pass | 0 | <= 0.4 of sprite may vanish into conception-deep |
| palette-conformance | pass | 0 | <= 0.0353 Oklab from a palette entry |
| palette-variety | pass | 3 | >= 2 distinct palette colours |
| palette-dominance | pass | 0.8302 | no colour above 0.97 of the sprite |
| readable-48px-silhouette | pass | 0.3681 | >= 0.084 coverage at 48px |
| readable-48px-structure | pass | 7 | >= 2 palette colours still visible at 48px |
| readable-48px-detail | pass | 0.3317 | >= 0.06 edge density at 48px |
