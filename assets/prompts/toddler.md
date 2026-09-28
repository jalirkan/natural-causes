# Toddler

- **Asset id:** `toddler`
- **Act:** family
- **Role:** swarm
- **Source:** authored SVG, `tools/art/svg/family/toddler.svg`
- **SVG sha256:** `d527d0477e90d5aac53bbd685f41d0e947bca71076257349b0dc409cb9b27f63`
- **Rasteriser:** sharp 0.34.5 (libvips 8.17.3, librsvg 2.61.2)
- **Render:** 24.750 dpi, 4× supersampled and area-averaged
- **Rendered:** 2026-09-28T11:05:08.627Z
- **Sprite size:** 44px
- **Tests:** the bib with arms — the only thing in the act reaching up, and the smallest mover; the elite purple on the bib

**Why this life stage.** Family is the first stage where the thing slowing the player down is thrilled to see them.

## Description

a round bib seen straight on with two short sleeves raised up and out beside it, nothing above the bib, flat muted purple (#7C5C8A), the elite threat colour, on the whole bib, one solid tone, the sleeves in muted tan (#D2C6AC) with warm near-black (#2A2521) edges, a face printed on the bib: two small dark dots for eyes and one wide flat line for a mouth, the only smile in the game, looking straight out, no head, no hands, no hair, no skin, no text, no red, no gold, no yellow anywhere

## Mechanical checks

| Check | Result | Measured | Expected |
|---|---|---|---|
| silhouette-area | pass | 0.4948 | 0.12–0.82 of canvas |
| background-contrast | pass | 0.1625 | >= 0.12 median Oklab L from family-deep |
| background-contrast-coverage | pass | 0.1921 | <= 0.4 of sprite may vanish into family-deep |
| palette-conformance | pass | 0 | <= 0.0353 Oklab from a palette entry |
| palette-variety | pass | 4 | >= 2 distinct palette colours |
| palette-dominance | pass | 0.5971 | no colour above 0.97 of the sprite |
| readable-48px-silhouette | pass | 0.5013 | >= 0.084 coverage at 48px |
| readable-48px-structure | pass | 5 | >= 2 palette colours still visible at 48px |
| enemy-value-ceiling | pass | 0.8295 | <= 0.856 Oklab L (bone); paper belongs to the player |
| readable-48px-detail | pass | 0.3253 | >= 0.06 edge density at 48px |
