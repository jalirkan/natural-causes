# The player — thirty-four

- **Asset id:** `player-family`
- **Act:** family
- **Role:** player
- **Source:** authored SVG, `tools/art/svg/family/player-family.svg`
- **SVG sha256:** `8cdfd69eb83fcd4a07cb38c56468e88c05927c4d4ec5847cb8b5da34f0daca84`
- **Rasteriser:** sharp 0.34.5 (libvips 8.17.3, librsvg 2.61.2)
- **Render:** 63.000 dpi, 4× supersampled and area-averaged
- **Rendered:** 2026-09-28T11:07:41.692Z
- **Sprite size:** 112px
- **Tests:** G-003 at thirty-four: the same face and cowlick, one frame, a tote bag and a set of keys

## Description

the player at thirty-four: the same small round-headed figure as every act, standing, no taller, the same face as every act: two flat eyes and one short flat line for a mouth, the same single asymmetric cowlick sticking up above the left eye, one tuft and no other hair, a flat tote bag hanging from one shoulder and a small ring of keys held in the other hand, paper coloured (#EFE7D6) head and body, warm grey-brown (#6E6353) as the only second tone, no threat colour anywhere, no tie, no mug, no lettering

## Mechanical checks

| Check | Result | Measured | Expected |
|---|---|---|---|
| silhouette-area | pass | 0.4045 | 0.12–0.82 of canvas |
| background-contrast | pass | 0.567 | >= 0.12 median Oklab L from family-deep |
| background-contrast-coverage | pass | 0.2085 | <= 0.4 of sprite may vanish into family-deep |
| palette-conformance | pass | 0 | <= 0.0353 Oklab from a palette entry |
| palette-variety | pass | 3 | >= 2 distinct palette colours |
| palette-dominance | pass | 0.6981 | no colour above 0.97 of the sprite |
| readable-48px-silhouette | pass | 0.411 | >= 0.084 coverage at 48px |
| readable-48px-structure | pass | 6 | >= 2 palette colours still visible at 48px |
| readable-48px-detail | pass | 0.4426 | >= 0.06 edge density at 48px |
