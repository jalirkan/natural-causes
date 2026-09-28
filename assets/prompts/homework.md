# Homework

- **Asset id:** `homework`
- **Act:** school
- **Role:** swarm
- **Source:** authored SVG, `tools/art/svg/school/homework.svg`
- **SVG sha256:** `b35be210626263e8d8349bfe67f14a01629281228094959e1efb39b773e5fb73`
- **Rasteriser:** sharp 0.34.5 (libvips 8.17.3, librsvg 2.61.2)
- **Render:** 242.818 dpi, 4× supersampled and area-averaged
- **Rendered:** 2026-09-28T23:02:30.066Z
- **Sprite size:** 72px
- **Tests:** the wedge — paper that is deliberately not a rectangle, with a face (law 5)

**Why this life stage.** School is the first stage that follows the player home and takes up the part of the day nobody was counting.

## Description

a leaning stack of paper sheets seen from the side, triangular in profile, wide at the bottom and tapering to a soft rounded top that leans to one side, drawn in the greeting-card register, every corner rounded, the sheets in flat muted tan (#D2C6AC) with three warm grey-brown (#6E6353) strata between them, tilting with the lean, one loose sheet poking out of each side so the sheets never line up, no straight rectangle, not a neat block, not a squared-off slab, not a folder, not a book, a content little face on the front of the stack: two big dark eyes with one small tan glint each, a soft pink blush (#EBA39C) under each eye, a small pleased smile, no glint on the stack itself, because a tan glint on tan paper is no glint, doing nothing to anyone, not looking at anything, no text, no handwriting, no ruled lines, no yellow, no gold, no olive green, never white

## Mechanical checks

| Check | Result | Measured | Expected |
|---|---|---|---|
| silhouette-area | pass | 0.6171 | 0.12–0.82 of canvas |
| background-contrast | pass | 0.4144 | >= 0.12 median Oklab L from school-deep |
| background-contrast-coverage | pass | 0.1216 | <= 0.4 of sprite may vanish into school-deep |
| palette-conformance | pass | 0 | <= 0.0353 Oklab from a palette entry |
| palette-variety | pass | 4 | >= 2 distinct palette colours |
| palette-dominance | pass | 0.6883 | no colour above 0.97 of the sprite |
| readable-48px-silhouette | pass | 0.6146 | >= 0.084 coverage at 48px |
| readable-48px-structure | pass | 6 | >= 2 palette colours still visible at 48px |
| enemy-value-ceiling | pass | 0.8295 | <= 0.856 Oklab L (bone); paper belongs to the player |
| readable-48px-detail | pass | 0.4508 | >= 0.06 edge density at 48px |
