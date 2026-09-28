# The player — fifty-five

- **Asset id:** `player-decline`
- **Act:** decline
- **Role:** player
- **Source:** authored SVG, `tools/art/svg/decline/player-decline.svg`
- **SVG sha256:** `965cc9b70d87d7c0cd8ee2b790401c25b6cb1040f3563ee8711a23a714ddf42a`
- **Rasteriser:** sharp 0.34.5 (libvips 8.17.3, librsvg 2.61.2)
- **Render:** 63.000 dpi, 4× supersampled and area-averaged
- **Rendered:** 2026-09-28T17:36:36.198Z
- **Sprite size:** 112px
- **Tests:** G-003 at fifty-five: the same face and cowlick, one frame, a cardigan and a cane

## Description

the player at fifty-five: the same small round-headed figure as every act, standing, no taller, the same face as every act: two flat eyes and one short flat line for a mouth, the same single asymmetric cowlick sticking up above the left eye, one tuft and no other hair, a buttoned cardigan down the front and a plain cane held in one hand, its tip on the floor, paper coloured (#EFE7D6) head and body, warm grey-brown (#6E6353) as the only second tone, no threat colour anywhere, no tote bag, no keys, no glasses, no lettering

## Mechanical checks

| Check | Result | Measured | Expected |
|---|---|---|---|
| silhouette-area | pass | 0.4124 | 0.12–0.82 of canvas |
| background-contrast | pass | 0.5624 | >= 0.12 median Oklab L from decline-deep |
| background-contrast-coverage | pass | 0.2179 | <= 0.4 of sprite may vanish into decline-deep |
| palette-conformance | pass | 0 | <= 0.0353 Oklab from a palette entry |
| palette-variety | pass | 3 | >= 2 distinct palette colours |
| palette-dominance | pass | 0.7164 | no colour above 0.97 of the sprite |
| readable-48px-silhouette | pass | 0.4193 | >= 0.084 coverage at 48px |
| readable-48px-structure | pass | 7 | >= 2 palette colours still visible at 48px |
| readable-48px-detail | pass | 0.4674 | >= 0.06 edge density at 48px |
