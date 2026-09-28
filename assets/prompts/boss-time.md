# Time

- **Asset id:** `boss-time`
- **Act:** decline
- **Role:** boss
- **Source:** authored SVG, `tools/art/svg/decline/boss-time.svg`
- **SVG sha256:** `1fa9f6a5941d57cf3ef001628c390e9f74fb3a8d425cfe92c065ee34db7defb3`
- **Rasteriser:** sharp 0.34.5 (libvips 8.17.3, librsvg 2.61.2)
- **Render:** 224.790 dpi, 4× supersampled and area-averaged
- **Rendered:** 2026-09-28T17:30:52.585Z
- **Sprite size:** 384px
- **Tests:** the clock face — boss teal at boss scale, a round dial with two hands and no numbers, the only circle in the act

**Why this life stage.** Decline is the last stage, and the thing that ends it was there the whole time.

## Description

a round clock face seen straight on at boss scale, a wide rim, a plain dial with no numbers and no marks, two hands of different lengths meeting at the centre, flat muted deep teal (#2F7370), the boss colour, on the rim and both hands, one solid tone with warm near-black (#2A2521) edges, the dial in muted tan (#D2C6AC), a small face at the centre where the hands meet: two open dark dots for eyes and one short flat line for a mouth, calm, no numbers, no ticks, no pendulum, no text, no red, no purple, no gold, no yellow anywhere

## Mechanical checks

| Check | Result | Measured | Expected |
|---|---|---|---|
| silhouette-area | pass | 0.727 | 0.25–0.95 of canvas |
| background-contrast | pass | 0.1543 | >= 0.12 median Oklab L from decline-deep |
| background-contrast-coverage | pass | 0.2246 | <= 0.4 of sprite may vanish into decline-deep |
| palette-conformance | pass | 0.0293 | <= 0.0353 Oklab from a palette entry |
| palette-variety | pass | 4 | >= 3 distinct palette colours |
| palette-dominance | pass | 0.4482 | no colour above 0.9 of the sprite |
| readable-48px-silhouette | pass | 0.7357 | >= 0.175 coverage at 48px |
| readable-48px-structure | pass | 6 | >= 3 palette colours still visible at 48px |
| enemy-value-ceiling | pass | 0.8512 | <= 0.856 Oklab L (bone); paper belongs to the player |
| readable-48px-detail | pass | 0.3857 | >= 0.06 edge density at 48px |
