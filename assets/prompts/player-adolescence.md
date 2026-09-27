# The player — thirteen

- **Asset id:** `player-adolescence`
- **Act:** adolescence
- **Role:** player
- **Source:** authored SVG, `tools/art/svg/adolescence/player-adolescence.svg`
- **SVG sha256:** `aa75eae17c6fc696ddabdc457386faa79c98204bbb50f244c3fe782d56305892`
- **Rasteriser:** sharp 0.34.5 (libvips 8.17.3, librsvg 2.61.2)
- **Render:** 322.560 dpi, 4× supersampled and area-averaged
- **Rendered:** 2026-09-27T23:46:18.416Z
- **Sprite size:** 112px
- **Tests:** G-003 at thirteen: the same face and cowlick, one frame, no taller

## Description

the player at thirteen: the same small round-headed figure as at school age, standing, no taller, the same face as every act: two flat eyes and one short flat line for a mouth, the same single asymmetric cowlick sticking up above the left eye, one tuft and no other hair, paper coloured (#EFE7D6) head and body, warm grey-brown (#6E6353) as the only second tone, no threat colour anywhere, no phone, no accessories, no gear

## Mechanical checks

| Check | Result | Measured | Expected |
|---|---|---|---|
| silhouette-area | pass | 0.3928 | 0.12–0.82 of canvas |
| background-contrast | pass | 0.5952 | >= 0.12 median Oklab L from adolescence-deep |
| background-contrast-coverage | pass | 0.2458 | <= 0.4 of sprite may vanish into adolescence-deep |
| palette-conformance | pass | 0 | <= 0.0353 Oklab from a palette entry |
| palette-variety | pass | 3 | >= 2 distinct palette colours |
| palette-dominance | pass | 0.548 | no colour above 0.97 of the sprite |
| readable-48px-silhouette | pass | 0.4002 | >= 0.084 coverage at 48px |
| readable-48px-structure | pass | 6 | >= 2 palette colours still visible at 48px |
| readable-48px-detail | pass | 0.438 | >= 0.06 edge density at 48px |
