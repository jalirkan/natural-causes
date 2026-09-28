# The player — school age

- **Asset id:** `player-school`
- **Act:** school
- **Role:** player
- **Source:** authored SVG, `tools/art/svg/school/player-school.svg`
- **SVG sha256:** `e7868ca796980acad2d09868cd35519c168a21efd68b6bfcde8001a1e215e40d`
- **Rasteriser:** sharp 0.34.5 (libvips 8.17.3, librsvg 2.61.2)
- **Render:** 317.762 dpi, 4× supersampled and area-averaged
- **Rendered:** 2026-09-28T23:04:28.818Z
- **Sprite size:** 112px
- **Tests:** G-003 and G-053 at five: the base drawing, whose head every act copies verbatim, and the figure every act is the same size as

## Description

the player at school age, a greeting-card character: a small chubby child standing with its arms a little out, a big round head three fifths of the height with two big dark eyes, each with one small light glint at its upper left, a rosy oval (#EBA39C) on each cheek and a small content smile, the same single asymmetric cowlick sticking up above the left eye, one tuft and no other hair, a round-bellied body, stubby arms with round mitten hands and short round legs, every mass rounded, paper coloured (#EFE7D6) head, hands and body, warm near-black (#2A2521) eyes, mouth, cowlick and chin line, no threat colour anywhere, no accessories, no gear

## Mechanical checks

| Check | Result | Measured | Expected |
|---|---|---|---|
| silhouette-area | pass | 0.444 | 0.12–0.82 of canvas |
| background-contrast | pass | 0.5145 | >= 0.12 median Oklab L from school-deep |
| background-contrast-coverage | pass | 0 | <= 0.4 of sprite may vanish into school-deep |
| palette-conformance | pass | 0 | <= 0.0353 Oklab from a palette entry |
| palette-variety | pass | 3 | >= 2 distinct palette colours |
| palette-dominance | pass | 0.7957 | no colour above 0.97 of the sprite |
| readable-48px-silhouette | pass | 0.4527 | >= 0.084 coverage at 48px |
| readable-48px-structure | pass | 7 | >= 2 palette colours still visible at 48px |
| readable-48px-detail | pass | 0.3724 | >= 0.06 edge density at 48px |
