# The player — thirteen

- **Asset id:** `player-adolescence`
- **Act:** adolescence
- **Role:** player
- **Source:** authored SVG, `tools/art/svg/adolescence/player-adolescence.svg`
- **SVG sha256:** `ceda6753d6e89efdf0a4abf949774636a71bb5198cdd1fc4a4a043bfc6cab2e2`
- **Rasteriser:** sharp 0.34.5 (libvips 8.17.3, librsvg 2.61.2)
- **Render:** 322.560 dpi, 4× supersampled and area-averaged
- **Rendered:** 2026-09-29T02:41:09.283Z
- **Sprite size:** 112px
- **Tests:** G-003 and G-053 at thirteen: the same head, no taller, in a round hoodie with both hands in its pocket

## Description

the player at thirteen: the same chubby child as at school age, standing, no taller, with the same head, face and cowlick, a big round head three fifths of the height with two big dark eyes, each with one small light glint at its upper left, a rosy oval (#EBA39C) on each cheek and a small content smile, a plain round hoodie with the hood rolled down behind the neck and two short drawstrings, elbows out and both hands stuffed in the front pocket, paper coloured (#EFE7D6) head, legs and drawstrings, the hoodie in warm grey-brown (#6E6353) edged in warm near-black (#2A2521), one small light glint on the hoodie, no threat colour anywhere, no phone, no accessories, no gear

## Mechanical checks

| Check | Result | Measured | Expected |
|---|---|---|---|
| silhouette-area | pass | 0.4173 | 0.12–0.82 of canvas |
| background-contrast | pass | 0.5952 | >= 0.12 median Oklab L from adolescence-deep |
| background-contrast-coverage | pass | 0.1926 | <= 0.4 of sprite may vanish into adolescence-deep |
| palette-conformance | pass | 0 | <= 0.0353 Oklab from a palette entry |
| palette-variety | pass | 4 | >= 2 distinct palette colours |
| palette-dominance | pass | 0.608 | no colour above 0.97 of the sprite |
| readable-48px-silhouette | pass | 0.424 | >= 0.084 coverage at 48px |
| readable-48px-structure | pass | 6 | >= 2 palette colours still visible at 48px |
| readable-48px-detail | pass | 0.3861 | >= 0.06 edge density at 48px |
