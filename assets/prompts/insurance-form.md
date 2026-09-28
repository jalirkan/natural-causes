# Insurance form

- **Asset id:** `insurance-form`
- **Act:** decline
- **Role:** swarm
- **Source:** authored SVG, `tools/art/svg/decline/insurance-form.svg`
- **SVG sha256:** `b980c28f02cc3d98c0fae9e5eccead6d16e9491e8f55a6ab9d6aecd3a2563613`
- **Rasteriser:** sharp 0.34.5 (libvips 8.17.3, librsvg 2.61.2)
- **Render:** 45.000 dpi, 4× supersampled and area-averaged
- **Rendered:** 2026-09-28T17:22:41.258Z
- **Sprite size:** 80px
- **Tests:** the form on a board — the only board and the only boxes in the act; no gold on it

**Why this life stage.** Decline is the first stage where the aimed thing decides what the player is covered for.

## Description

a portrait clipboard seen from the front, a sheet of paper on a board with a clip at its top and three small square tick boxes down the left side of the sheet, all empty, the board in warm grey-brown (#6E6353), the sheet in muted tan (#D2C6AC), the clip, the boxes and the outline in warm near-black (#2A2521), two small dark dots for eyes and one short flat line for a mouth on the sheet beside the boxes, looking at the boxes, not at the viewer, no text, no ticks, no gold, no yellow, no red, no purple, no teal anywhere

## Mechanical checks

| Check | Result | Measured | Expected |
|---|---|---|---|
| silhouette-area | pass | 0.7053 | 0.12–0.82 of canvas |
| background-contrast | pass | 0.4622 | >= 0.12 median Oklab L from decline-deep |
| background-contrast-coverage | pass | 0.2437 | <= 0.4 of sprite may vanish into decline-deep |
| palette-conformance | pass | 0 | <= 0.0353 Oklab from a palette entry |
| palette-variety | pass | 3 | >= 2 distinct palette colours |
| palette-dominance | pass | 0.5281 | no colour above 0.97 of the sprite |
| readable-48px-silhouette | pass | 0.7105 | >= 0.084 coverage at 48px |
| readable-48px-structure | pass | 5 | >= 2 palette colours still visible at 48px |
| enemy-value-ceiling | pass | 0.8295 | <= 0.856 Oklab L (bone); paper belongs to the player |
| readable-48px-detail | pass | 0.3715 | >= 0.06 edge density at 48px |
