# The player — school age

- **Asset id:** `player-school`
- **Act:** school
- **Role:** player
- **Source:** authored SVG, `tools/art/svg/school/player-school.svg`
- **SVG sha256:** `8db86082be84b87cd3d552680cfd9695d130352c0075a2e9968e07ec1aa8f142`
- **Rasteriser:** sharp 0.34.5 (libvips 8.17.3, librsvg 2.61.2)
- **Render:** 322.560 dpi, 4× supersampled and area-averaged
- **Rendered:** 2026-09-27T22:58:55.676Z
- **Sprite size:** 112px

## Description

the player at school age: a small round-headed child figure, standing, the same face as the sperm form: two flat eyes and one short flat line for a mouth, the same single asymmetric cowlick sticking up above the left eye, one tuft and no other hair, paper coloured (#EFE7D6) head and body, warm grey-brown (#6E6353) as the only second tone, no threat colour anywhere, no accessories, no gear

## Mechanical checks

| Check | Result | Measured | Expected |
|---|---|---|---|
| silhouette-area | pass | 0.3752 | 0.12–0.82 of canvas |
| background-contrast | pass | 0.5145 | >= 0.12 median Oklab L from school-deep |
| background-contrast-coverage | pass | 0 | <= 0.4 of sprite may vanish into school-deep |
| palette-conformance | pass | 0 | <= 0.0353 Oklab from a palette entry |
| palette-variety | pass | 2 | >= 2 distinct palette colours |
| palette-dominance | pass | 0.8154 | no colour above 0.97 of the sprite |
| readable-48px-silhouette | pass | 0.3828 | >= 0.084 coverage at 48px |
| readable-48px-structure | pass | 6 | >= 2 palette colours still visible at 48px |
| readable-48px-detail | pass | 0.3353 | >= 0.06 edge density at 48px |
