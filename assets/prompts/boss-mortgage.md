# The Mortgage

- **Asset id:** `boss-mortgage`
- **Act:** family
- **Role:** boss
- **Source:** authored SVG, `tools/art/svg/family/boss-mortgage.svg`
- **SVG sha256:** `6385a41c6a0dbcf3acdd375c74008716bfb19f6379b42386d315f00e733d4005`
- **Rasteriser:** sharp 0.34.5 (libvips 8.17.3, librsvg 2.61.2)
- **Render:** 229.844 dpi, 4× supersampled and area-averaged
- **Rendered:** 2026-09-29T02:41:12.829Z
- **Sprite size:** 384px
- **Tests:** the house with a face — boss teal at boss scale, a gable, a door and two windows, the only roof in the act

**Why this life stage.** Family is the first stage that ends on a thing the player will be paying for after the act is long over.

## Description

a house front seen straight on at boss scale, a wide rectangular wall under a plain gabled roof, a door in the middle of the ground floor and two square windows above it, flat muted deep teal (#2F7370), the boss colour, on the walls and the roof, one solid tone with warm near-black (#2A2521) edges, the windows are the eyes: two open dark dots on muted tan (#D2C6AC) panes; the door is the mouth: one short flat line, closed, patient, no chimney smoke, no path, no fence, no lettering, no number on the door, no red, no purple, no gold, no yellow anywhere

## Mechanical checks

| Check | Result | Measured | Expected |
|---|---|---|---|
| silhouette-area | pass | 0.683 | 0.25–0.95 of canvas |
| background-contrast | pass | 0.1454 | >= 0.12 median Oklab L from family-deep |
| background-contrast-coverage | pass | 0.1956 | <= 0.4 of sprite may vanish into family-deep |
| palette-conformance | pass | 0.0293 | <= 0.0353 Oklab from a palette entry |
| palette-variety | pass | 4 | >= 3 distinct palette colours |
| palette-dominance | pass | 0.6851 | no colour above 0.9 of the sprite |
| readable-48px-silhouette | pass | 0.7005 | >= 0.175 coverage at 48px |
| readable-48px-structure | pass | 6 | >= 3 palette colours still visible at 48px |
| enemy-value-ceiling | pass | 0.8512 | <= 0.856 Oklab L (bone); paper belongs to the player |
| readable-48px-detail | pass | 0.3532 | >= 0.06 edge density at 48px |
