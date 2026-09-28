# The player — eighteen

- **Asset id:** `player-college`
- **Act:** college
- **Role:** player
- **Source:** authored SVG, `tools/art/svg/college/player-college.svg`
- **SVG sha256:** `1af11c57af9e9fc068363c35906a6336f5a952b3d141d2e35a0d233da5529f36`
- **Rasteriser:** sharp 0.34.5 (libvips 8.17.3, librsvg 2.61.2)
- **Render:** 322.560 dpi, 4× supersampled and area-averaged
- **Rendered:** 2026-09-28T04:09:53.487Z
- **Sprite size:** 112px
- **Tests:** G-003 at eighteen: the same face and cowlick, one frame, a lanyard and a paper cup

## Description

the player at eighteen: the same small round-headed figure as every act, standing, no taller, the same face as every act: two flat eyes and one short flat line for a mouth, the same single asymmetric cowlick sticking up above the left eye, one tuft and no other hair, a thin lanyard loop around the neck with a small blank card at its end, and a small paper cup held in one hand, paper coloured (#EFE7D6) head and body, warm grey-brown (#6E6353) as the only second tone, no threat colour anywhere, no phone, no backpack, no lettering on the card

## Mechanical checks

| Check | Result | Measured | Expected |
|---|---|---|---|
| silhouette-area | pass | 0.4074 | 0.12–0.82 of canvas |
| background-contrast | pass | 0.6098 | >= 0.12 median Oklab L from college-deep |
| background-contrast-coverage | pass | 0.2522 | <= 0.4 of sprite may vanish into college-deep |
| palette-conformance | pass | 0 | <= 0.0353 Oklab from a palette entry |
| palette-variety | pass | 3 | >= 2 distinct palette colours |
| palette-dominance | pass | 0.5789 | no colour above 0.97 of the sprite |
| readable-48px-silhouette | pass | 0.4136 | >= 0.084 coverage at 48px |
| readable-48px-structure | pass | 6 | >= 2 palette colours still visible at 48px |
| readable-48px-detail | pass | 0.4597 | >= 0.06 edge density at 48px |
