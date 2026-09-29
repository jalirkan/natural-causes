# Medication

- **Asset id:** `medication`
- **Act:** decline
- **Role:** swarm
- **Source:** authored SVG, `tools/art/svg/decline/medication.svg`
- **SVG sha256:** `c141a053e7136d015694558f0d63d591342f698b1c5f752aa9ffd62fad3abaaf`
- **Rasteriser:** sharp 0.34.5 (libvips 8.17.3, librsvg 2.61.2)
- **Render:** 23.462 dpi, 4× supersampled and area-averaged
- **Rendered:** 2026-09-29T02:41:13.625Z
- **Sprite size:** 40px
- **Tests:** the capsule — the only capsule and the smallest thing in the act, read by its seam

**Why this life stage.** Decline is the first stage where taking care of yourself is a thing you chase, and it hurts when it catches you first.

## Description

a rounded capsule seen exactly side-on, two halves with a seam between them, the left half in muted tan (#D2C6AC), the right half in warm grey-brown (#6E6353), the seam and the outline in warm near-black (#2A2521), two small dark dots for eyes and one short flat line for a mouth on the tan half, looking at the seam, no text, no red, no purple, no gold, no yellow, no teal anywhere

## Mechanical checks

| Check | Result | Measured | Expected |
|---|---|---|---|
| silhouette-area | pass | 0.3919 | 0.12–0.82 of canvas |
| background-contrast | pass | 0.1381 | >= 0.12 median Oklab L from decline-deep |
| background-contrast-coverage | pass | 0.0877 | <= 0.4 of sprite may vanish into decline-deep |
| palette-conformance | pass | 0 | <= 0.0353 Oklab from a palette entry |
| palette-variety | pass | 3 | >= 2 distinct palette colours |
| palette-dominance | pass | 0.4689 | no colour above 0.97 of the sprite |
| readable-48px-silhouette | pass | 0.3876 | >= 0.084 coverage at 48px |
| readable-48px-structure | pass | 4 | >= 2 palette colours still visible at 48px |
| enemy-value-ceiling | pass | 0.8295 | <= 0.856 Oklab L (bone); paper belongs to the player |
| readable-48px-detail | pass | 0.2086 | >= 0.06 edge density at 48px |
