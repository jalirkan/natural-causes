# The player — twenty-two

- **Asset id:** `player-office`
- **Act:** office
- **Role:** player
- **Source:** authored SVG, `tools/art/svg/office/player-office.svg`
- **SVG sha256:** `99b38850c34ce7c34f65929822c48bd57ce927e3f47e2faff95e6de80ada66fb`
- **Rasteriser:** sharp 0.34.5 (libvips 8.17.3, librsvg 2.61.2)
- **Render:** 322.560 dpi, 4× supersampled and area-averaged
- **Rendered:** 2026-09-29T02:41:10.306Z
- **Sprite size:** 112px
- **Tests:** G-003 and G-053 at twenty-two, a kid in a tie: the same head, no taller, a shirt with a round collar, a tie, a belt and a mug

## Description

the player at twenty-two: the same chubby child as every act, standing, no taller, with the same head, face and cowlick, a big round head three fifths of the height with two big dark eyes, each with one small light glint at its upper left, a rosy oval (#EBA39C) on each cheek and a small content smile, a plain shirt with a round collar, a short tie and a belt, one arm down at its side and the other hand holding up a small mug, paper coloured (#EFE7D6) head, shirt, collar, legs and hands, the tie and the mug in warm grey-brown (#6E6353), the belt in warm near-black (#2A2521), no threat colour anywhere, no lanyard, no phone, no lettering

## Mechanical checks

| Check | Result | Measured | Expected |
|---|---|---|---|
| silhouette-area | pass | 0.4503 | 0.12–0.82 of canvas |
| background-contrast | pass | 0.5268 | >= 0.12 median Oklab L from office-deep |
| background-contrast-coverage | pass | 0.0487 | <= 0.4 of sprite may vanish into office-deep |
| palette-conformance | pass | 0 | <= 0.0353 Oklab from a palette entry |
| palette-variety | pass | 4 | >= 2 distinct palette colours |
| palette-dominance | pass | 0.7697 | no colour above 0.97 of the sprite |
| readable-48px-silhouette | pass | 0.4605 | >= 0.084 coverage at 48px |
| readable-48px-structure | pass | 7 | >= 2 palette colours still visible at 48px |
| readable-48px-detail | pass | 0.4104 | >= 0.06 edge density at 48px |
