# Time, without its long hand

- **Asset id:** `boss-time-face`
- **Act:** decline
- **Role:** boss
- **Source:** authored SVG, `tools/art/svg/decline/boss-time-face.svg`
- **SVG sha256:** `27517ba903015ab0e60aab1ede28d97dbd0fed680993f7786fb7a66aa00190fb`
- **Rasteriser:** sharp 0.34.5 (libvips 8.17.3, librsvg 2.61.2)
- **Render:** 229.682 dpi, 4× supersampled and area-averaged
- **Rendered:** 2026-09-29T02:41:15.347Z
- **Sprite size:** 384px
- **Tests:** the clock exactly as boss-time with only the short hand: the same rim, dial, face at the pivot and feet; the long hand absent

**Why this life stage.** Decline is the last stage, and the thing that ends it was there the whole time.

## Description

a round clock face seen straight on at boss scale, a wide rim, a plain dial with no numbers and no marks, exactly as boss-time, only the SHORT hand drawn, pointing at ten as in boss-time; the long hand entirely absent, the dial bare where it was, flat muted deep teal (#2F7370), the boss colour, on the rim, the short hand and the feet, one solid tone with warm near-black (#2A2521) edges, the dial in muted tan (#D2C6AC), the same small calm face at the centre on its bone cap: two open dark dots for eyes and one short flat line for a mouth, no numbers, no ticks, no text, no red, no purple, no gold, no yellow anywhere

## Mechanical checks

| Check | Result | Measured | Expected |
|---|---|---|---|
| silhouette-area | pass | 0.7224 | 0.25–0.95 of canvas |
| background-contrast | pass | 0.161 | >= 0.12 median Oklab L from decline-deep |
| background-contrast-coverage | pass | 0.1723 | <= 0.4 of sprite may vanish into decline-deep |
| palette-conformance | pass | 0.0293 | <= 0.0353 Oklab from a palette entry |
| palette-variety | pass | 4 | >= 3 distinct palette colours |
| palette-dominance | pass | 0.4926 | no colour above 0.9 of the sprite |
| readable-48px-silhouette | pass | 0.7305 | >= 0.175 coverage at 48px |
| readable-48px-structure | pass | 6 | >= 3 palette colours still visible at 48px |
| enemy-value-ceiling | pass | 0.8512 | <= 0.856 Oklab L (bone); paper belongs to the player |
| readable-48px-detail | pass | 0.341 | >= 0.06 edge density at 48px |
