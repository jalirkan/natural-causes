# The player — fifty-five

- **Asset id:** `player-decline`
- **Act:** decline
- **Role:** player
- **Source:** authored SVG, `tools/art/svg/decline/player-decline.svg`
- **SVG sha256:** `c0ff9939cf8252498775bf7dad9cfef3db5901eecb6b87caf9c9c4c6489b6eaf`
- **Rasteriser:** sharp 0.34.5 (libvips 8.17.3, librsvg 2.61.2)
- **Render:** 322.560 dpi, 4× supersampled and area-averaged
- **Rendered:** 2026-09-29T02:41:14.559Z
- **Sprite size:** 112px
- **Tests:** G-003 and G-053 at fifty-five: the same head, no taller, a cardigan and a cane; the kid is the kid at the end too

## Description

the player at fifty-five: the same chubby child as every act, standing, no taller, with the same head, face and cowlick, a big round head three fifths of the height with two big dark eyes, each with one small light glint at its upper left, a rosy oval (#EBA39C) on each cheek and a small content smile, an oatmeal cardigan buttoned down the front with three round buttons over the same round shirt collar, one arm down at its side and the other hand on a plain crook-handled cane, its tip on the floor, paper coloured (#EFE7D6) head, shirt, collar, legs and hands, the cardigan in muted tan (#D2C6AC), its bands, buttons and hem and the cane in warm grey-brown (#6E6353), no threat colour anywhere, no tote bag, no keys, no glasses, no lettering

## Mechanical checks

| Check | Result | Measured | Expected |
|---|---|---|---|
| silhouette-area | pass | 0.4452 | 0.12–0.82 of canvas |
| background-contrast | pass | 0.5624 | >= 0.12 median Oklab L from decline-deep |
| background-contrast-coverage | pass | 0.1529 | <= 0.4 of sprite may vanish into decline-deep |
| palette-conformance | pass | 0 | <= 0.0353 Oklab from a palette entry |
| palette-variety | pass | 5 | >= 2 distinct palette colours |
| palette-dominance | pass | 0.6097 | no colour above 0.97 of the sprite |
| readable-48px-silhouette | pass | 0.454 | >= 0.084 coverage at 48px |
| readable-48px-structure | pass | 6 | >= 2 palette colours still visible at 48px |
| readable-48px-detail | pass | 0.4039 | >= 0.06 edge density at 48px |
