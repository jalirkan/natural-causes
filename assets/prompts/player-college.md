# The player — eighteen

- **Asset id:** `player-college`
- **Act:** college
- **Role:** player
- **Source:** authored SVG, `tools/art/svg/college/player-college.svg`
- **SVG sha256:** `db3770f87db3d3f9ed9397dc425fc4543a26708a6b54e390fc2f4d1685400065`
- **Rasteriser:** sharp 0.34.5 (libvips 8.17.3, librsvg 2.61.2)
- **Render:** 317.762 dpi, 4× supersampled and area-averaged
- **Rendered:** 2026-09-28T23:04:32.009Z
- **Sprite size:** 112px
- **Tests:** G-003 and G-053 at eighteen: the same head, no taller, the same hoodie, a lanyard and a takeaway cup

## Description

the player at eighteen: the same chubby child as every act, standing, no taller, with the same head, face and cowlick, a big round head three fifths of the height with two big dark eyes, each with one small light glint at its upper left, a rosy oval (#EBA39C) on each cheek and a small content smile, the same round hoodie, a lanyard around the neck ending in a small blank card, one hand in the pocket and the other holding up a small takeaway cup with a lid and a sleeve, paper coloured (#EFE7D6) head, legs, hand and card, the hoodie in warm grey-brown (#6E6353), the cup in muted tan (#D2C6AC) with a warm grey-brown lid and sleeve, no threat colour anywhere, no phone, no backpack, no lettering on the card

## Mechanical checks

| Check | Result | Measured | Expected |
|---|---|---|---|
| silhouette-area | pass | 0.4556 | 0.12–0.82 of canvas |
| background-contrast | pass | 0.6098 | >= 0.12 median Oklab L from college-deep |
| background-contrast-coverage | pass | 0.2495 | <= 0.4 of sprite may vanish into college-deep |
| palette-conformance | pass | 0 | <= 0.0353 Oklab from a palette entry |
| palette-variety | pass | 5 | >= 2 distinct palette colours |
| palette-dominance | pass | 0.5622 | no colour above 0.97 of the sprite |
| readable-48px-silhouette | pass | 0.4622 | >= 0.084 coverage at 48px |
| readable-48px-structure | pass | 5 | >= 2 palette colours still visible at 48px |
| readable-48px-detail | pass | 0.4467 | >= 0.06 edge density at 48px |
