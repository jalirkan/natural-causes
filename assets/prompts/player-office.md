# The player — twenty-two

- **Asset id:** `player-office`
- **Act:** office
- **Role:** player
- **Source:** authored SVG, `tools/art/svg/office/player-office.svg`
- **SVG sha256:** `26cda40049a2f1e1b818569e5dac2e384bb4ceafecc176710aa28b884ecbcb43`
- **Rasteriser:** sharp 0.34.5 (libvips 8.17.3, librsvg 2.61.2)
- **Render:** 322.560 dpi, 4× supersampled and area-averaged
- **Rendered:** 2026-09-28T09:56:47.376Z
- **Sprite size:** 112px
- **Tests:** G-003 at twenty-two: the same face and cowlick, one frame, a tie and a mug

## Description

the player at twenty-two: the same small round-headed figure as every act, standing, no taller, the same face as every act: two flat eyes and one short flat line for a mouth, the same single asymmetric cowlick sticking up above the left eye, one tuft and no other hair, a short flat tie down the front and a small mug held in one hand, paper coloured (#EFE7D6) head and body, warm grey-brown (#6E6353) as the only second tone, no threat colour anywhere, no lanyard, no phone, no lettering

## Mechanical checks

| Check | Result | Measured | Expected |
|---|---|---|---|
| silhouette-area | pass | 0.4051 | 0.12–0.82 of canvas |
| background-contrast | pass | 0.5268 | >= 0.12 median Oklab L from office-deep |
| background-contrast-coverage | pass | 0.0274 | <= 0.4 of sprite may vanish into office-deep |
| palette-conformance | pass | 0 | <= 0.0353 Oklab from a palette entry |
| palette-variety | pass | 3 | >= 2 distinct palette colours |
| palette-dominance | pass | 0.7504 | no colour above 0.97 of the sprite |
| readable-48px-silhouette | pass | 0.4136 | >= 0.084 coverage at 48px |
| readable-48px-structure | pass | 7 | >= 2 palette colours still visible at 48px |
| readable-48px-detail | pass | 0.4775 | >= 0.06 edge density at 48px |
