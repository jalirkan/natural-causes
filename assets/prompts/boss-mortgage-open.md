# The Mortgage, door open

- **Asset id:** `boss-mortgage-open`
- **Act:** family
- **Role:** boss
- **Source:** authored SVG, `tools/art/svg/family/boss-mortgage-open.svg`
- **SVG sha256:** `14c4bf9bf803a7698a7eb93953431e8ee8b050775248eb72979f824b584c9871`
- **Rasteriser:** sharp 0.34.5 (libvips 8.17.3, librsvg 2.61.2)
- **Render:** 224.949 dpi, 4× supersampled and area-averaged
- **Rendered:** 2026-09-28T18:56:04.172Z
- **Sprite size:** 384px
- **Tests:** the house exactly as boss-mortgage with its door open: the doorway a dark opening in the act deep tone with the door leaf swung inward, the windows and roof identical

**Why this life stage.** Family is the first stage that ends on a thing the player will be paying for after the act is long over.

## Description

a house front seen straight on at boss scale, a wide rectangular wall under a plain gabled roof with a small chimney, two square windows above the door, exactly as boss-mortgage, the door OPEN: the doorway a dark opening in flat umber (#4D3A1F), the act deep tone, with the door leaf swung inward and seen edge-on as a thin warm grey-brown (#6E6353) sliver at one jamb, flat muted deep teal (#2F7370), the boss colour, on the walls and the roof, one solid tone with warm near-black (#2A2521) edges, the window panes in muted tan (#D2C6AC) with the same two open dark dots for eyes, no red, no purple, no gold, no yellow anywhere, no text

## Mechanical checks

| Check | Result | Measured | Expected |
|---|---|---|---|
| silhouette-area | pass | 0.6945 | 0.25–0.95 of canvas |
| background-contrast | pass | 0.1454 | >= 0.12 median Oklab L from family-deep |
| background-contrast-coverage | pass | 0.266 | <= 0.4 of sprite may vanish into family-deep |
| palette-conformance | pass | 0.0293 | <= 0.0353 Oklab from a palette entry |
| palette-variety | pass | 5 | >= 3 distinct palette colours |
| palette-dominance | pass | 0.6492 | no colour above 0.9 of the sprite |
| readable-48px-silhouette | pass | 0.7101 | >= 0.175 coverage at 48px |
| readable-48px-structure | pass | 5 | >= 3 palette colours still visible at 48px |
| enemy-value-ceiling | pass | 0.8512 | <= 0.856 Oklab L (bone); paper belongs to the player |
| readable-48px-detail | pass | 0.3441 | >= 0.06 edge density at 48px |
