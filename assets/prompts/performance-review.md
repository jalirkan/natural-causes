# Performance review

- **Asset id:** `performance-review`
- **Act:** office
- **Role:** swarm
- **Source:** authored SVG, `tools/art/svg/office/performance-review.svg`
- **SVG sha256:** `2033215c7ee244d26782527b24f441196eef90c0d456e83bfe9a42ee442aa599`
- **Rasteriser:** sharp 0.34.5 (libvips 8.17.3, librsvg 2.61.2)
- **Render:** 49.500 dpi, 4× supersampled and area-averaged
- **Rendered:** 2026-09-28T10:02:38.473Z
- **Sprite size:** 88px
- **Tests:** the row of stars — five stars, one filled, the only points in the act; no gold on it

**Why this life stage.** The Office is the first stage where the aimed thing is a number about the player, and the number takes something back.

## Description

a short flat strip with five flat five-pointed star outlines in a row across it, the second star filled in, the strip in muted tan (#D2C6AC), the star outlines in warm grey-brown (#6E6353), the filled star solid in warm near-black (#2A2521) so it is the odd one out, two small dark dots for eyes on the strip below the stars looking up at them and one short flat line for a mouth, no text, no numbers, no gold, no yellow, no red, no purple, no pale blue-grey anywhere

## Mechanical checks

| Check | Result | Measured | Expected |
|---|---|---|---|
| silhouette-area | pass | 0.3139 | 0.12–0.82 of canvas |
| background-contrast | pass | 0.4266 | >= 0.12 median Oklab L from office-deep |
| background-contrast-coverage | pass | 0.1489 | <= 0.4 of sprite may vanish into office-deep |
| palette-conformance | pass | 0 | <= 0.0353 Oklab from a palette entry |
| palette-variety | pass | 3 | >= 2 distinct palette colours |
| palette-dominance | pass | 0.6084 | no colour above 0.97 of the sprite |
| readable-48px-silhouette | pass | 0.3142 | >= 0.084 coverage at 48px |
| readable-48px-structure | pass | 6 | >= 2 palette colours still visible at 48px |
| enemy-value-ceiling | pass | 0.8295 | <= 0.856 Oklab L (bone); paper belongs to the player |
| readable-48px-detail | pass | 0.5793 | >= 0.06 edge density at 48px |
