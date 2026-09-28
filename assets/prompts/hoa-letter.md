# HOA letter

- **Asset id:** `hoa-letter`
- **Act:** family
- **Role:** swarm
- **Source:** authored SVG, `tools/art/svg/family/hoa-letter.svg`
- **SVG sha256:** `870dde69ea585a2440e8d0ab41e6c3a74f54158882eeda66672297e06e06ac07`
- **Rasteriser:** sharp 0.34.5 (libvips 8.17.3, librsvg 2.61.2)
- **Render:** 22.500 dpi, 4× supersampled and area-averaged
- **Rendered:** 2026-09-28T11:08:02.060Z
- **Sprite size:** 40px
- **Tests:** the sealed letter — the only seal and the only fold in the act, read by the round seal

**Why this life stage.** Family is the first stage where the rules of the place the player lives arrive by post, and every one makes the place smaller.

## Description

a sheet of paper folded in thirds and standing open like a small tent, seen from slightly above, a round seal on its top panel, muted tan (#D2C6AC) paper, the fold lines in warm near-black (#2A2521), the seal an ink ring, the seal is the face: two small dark dots for eyes and one short flat line for a mouth inside the ring, looking straight out, no text, no red, no purple, no gold, no yellow anywhere

## Mechanical checks

| Check | Result | Measured | Expected |
|---|---|---|---|
| silhouette-area | pass | 0.4281 | 0.12–0.82 of canvas |
| background-contrast | pass | 0.4668 | >= 0.12 median Oklab L from family-deep |
| background-contrast-coverage | pass | 0.2657 | <= 0.4 of sprite may vanish into family-deep |
| palette-conformance | pass | 0 | <= 0.0353 Oklab from a palette entry |
| palette-variety | pass | 3 | >= 2 distinct palette colours |
| palette-dominance | pass | 0.6584 | no colour above 0.97 of the sprite |
| readable-48px-silhouette | pass | 0.4414 | >= 0.084 coverage at 48px |
| readable-48px-structure | pass | 5 | >= 2 palette colours still visible at 48px |
| enemy-value-ceiling | pass | 0.8295 | <= 0.856 Oklab L (bone); paper belongs to the player |
| readable-48px-detail | pass | 0.4808 | >= 0.06 edge density at 48px |
