# Homework

- **Asset id:** `homework`
- **Act:** school
- **Role:** swarm
- **Source:** authored SVG, `tools/art/svg/school/homework.svg`
- **SVG sha256:** `5df7f3d2759c6ea828838c127e2bd8dd012380a0b0db63b0142d07142e3c0f48`
- **Rasteriser:** sharp 0.34.5 (libvips 8.17.3, librsvg 2.61.2)
- **Render:** 229.881 dpi, 4× supersampled and area-averaged
- **Rendered:** 2026-09-27T23:32:54.007Z
- **Sprite size:** 72px
- **Tests:** the wedge — paper that is deliberately not a rectangle

**Why this life stage.** School is the first stage that follows the player home and takes up the part of the day nobody was counting.

## Description

a leaning stack of paper sheets seen from the side, triangular in profile, wider at the bottom and tapering toward the top, the whole stack tilts to one side, the corners soft and rounded, the edges uneven where the sheets do not line up, flat dull grey-brown, one solid colour, no white paper, no bright paper, no cream, no straight rectangle, not a neat block, not a squared-off slab, not a folder, not a book, one small face near the top of the stack: two small dark dots for eyes and no mouth at all, completely inert and uninteresting, doing nothing, not looking at anything, no text, no handwriting, no ruled lines, no yellow, no gold, no olive green

## Mechanical checks

| Check | Result | Measured | Expected |
|---|---|---|---|
| silhouette-area | pass | 0.5559 | 0.12–0.82 of canvas |
| background-contrast | pass | 0.4144 | >= 0.12 median Oklab L from school-deep |
| background-contrast-coverage | pass | 0.1929 | <= 0.4 of sprite may vanish into school-deep |
| palette-conformance | pass | 0 | <= 0.0353 Oklab from a palette entry |
| palette-variety | pass | 3 | >= 2 distinct palette colours |
| palette-dominance | pass | 0.6478 | no colour above 0.97 of the sprite |
| readable-48px-silhouette | pass | 0.5655 | >= 0.084 coverage at 48px |
| readable-48px-structure | pass | 6 | >= 2 palette colours still visible at 48px |
| enemy-value-ceiling | pass | 0.8295 | <= 0.856 Oklab L (bone); paper belongs to the player |
| readable-48px-detail | pass | 0.5 | >= 0.06 edge density at 48px |
