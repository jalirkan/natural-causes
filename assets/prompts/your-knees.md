# Your knees

- **Asset id:** `your-knees`
- **Act:** decline
- **Role:** swarm
- **Source:** authored SVG, `tools/art/svg/decline/your-knees.svg`
- **SVG sha256:** `8228828662a0d99e28e9b4ab1026e896a21233950d1fee6262eb614d0edae55c`
- **Rasteriser:** sharp 0.34.5 (libvips 8.17.3, librsvg 2.61.2)
- **Render:** 22.500 dpi, 4× supersampled and area-averaged
- **Rendered:** 2026-09-28T17:34:32.127Z
- **Sprite size:** 40px
- **Tests:** the knees — the only pair in the act, two domes side by side with one face between them

**Why this life stage.** Decline is where the record the player has been accumulating since before they were a person is finally read back to them by their own body.

## Description

two rounded kneecaps side by side seen from the front, two domes of equal size one face apart, a low hollow between them, muted tan (#D2C6AC) domes with warm near-black (#2A2521) outlines, the hollow between the domes in warm grey-brown (#6E6353) carries the face: two small dark dots for eyes and one short line for a mouth turned down one step at each end, worried, no legs, no skin, no text, no red, no purple, no gold, no yellow, no teal anywhere

## Mechanical checks

| Check | Result | Measured | Expected |
|---|---|---|---|
| silhouette-area | pass | 0.3237 | 0.12–0.82 of canvas |
| background-contrast | pass | 0.4622 | >= 0.12 median Oklab L from decline-deep |
| background-contrast-coverage | pass | 0.2201 | <= 0.4 of sprite may vanish into decline-deep |
| palette-conformance | pass | 0 | <= 0.0353 Oklab from a palette entry |
| palette-variety | pass | 3 | >= 2 distinct palette colours |
| palette-dominance | pass | 0.695 | no colour above 0.97 of the sprite |
| readable-48px-silhouette | pass | 0.3247 | >= 0.084 coverage at 48px |
| readable-48px-structure | pass | 5 | >= 2 palette colours still visible at 48px |
| enemy-value-ceiling | pass | 0.8295 | <= 0.856 Oklab L (bone); paper belongs to the player |
| readable-48px-detail | pass | 0.3523 | >= 0.06 edge density at 48px |
