# The player — thirty-four

- **Asset id:** `player-family`
- **Act:** family
- **Role:** player
- **Source:** authored SVG, `tools/art/svg/family/player-family.svg`
- **SVG sha256:** `e5584c580af4e175d22cbaf07678e12a7e705e30265af561c502c3cd479e8fa3`
- **Rasteriser:** sharp 0.34.5 (libvips 8.17.3, librsvg 2.61.2)
- **Render:** 322.560 dpi, 4× supersampled and area-averaged
- **Rendered:** 2026-09-29T02:41:12.894Z
- **Sprite size:** 112px
- **Tests:** G-003 and G-053 at thirty-four: the same head, no taller, the shirt without the tie, a tote bag and a ring of keys

## Description

the player at thirty-four: the same chubby child as every act, standing, no taller, with the same head, face and cowlick, a big round head three fifths of the height with two big dark eyes, each with one small light glint at its upper left, a rosy oval (#EBA39C) on each cheek and a small content smile, the same shirt, round collar and belt with the tie gone, a round-cornered tote bag hanging from one shoulder and a ring of two keys dangling from the other hand, held up, paper coloured (#EFE7D6) head, shirt, collar, legs and hands, the bag in warm grey-brown (#6E6353), the keys in muted tan (#D2C6AC), no threat colour anywhere, no tie, no mug, no lettering

## Mechanical checks

| Check | Result | Measured | Expected |
|---|---|---|---|
| silhouette-area | pass | 0.4587 | 0.12–0.82 of canvas |
| background-contrast | pass | 0.567 | >= 0.12 median Oklab L from family-deep |
| background-contrast-coverage | pass | 0.1639 | <= 0.4 of sprite may vanish into family-deep |
| palette-conformance | pass | 0 | <= 0.0353 Oklab from a palette entry |
| palette-variety | pass | 5 | >= 2 distinct palette colours |
| palette-dominance | pass | 0.7419 | no colour above 0.97 of the sprite |
| readable-48px-silhouette | pass | 0.4679 | >= 0.084 coverage at 48px |
| readable-48px-structure | pass | 7 | >= 2 palette colours still visible at 48px |
| readable-48px-detail | pass | 0.4015 | >= 0.06 edge density at 48px |
