# Prom

- **Asset id:** `boss-prom`
- **Act:** adolescence
- **Role:** boss
- **Source:** authored SVG, `tools/art/svg/adolescence/boss-prom.svg`
- **SVG sha256:** `be3d14a8a745274ac2a95af0628e20ad51047943febe338342d26fecb5269db6`
- **Rasteriser:** sharp 0.34.5 (libvips 8.17.3, librsvg 2.61.2)
- **Render:** 1064.303 dpi, 4× supersampled and area-averaged
- **Rendered:** 2026-09-27T23:48:13.108Z
- **Sprite size:** 384px
- **Tests:** the hanging sphere — boss teal at boss scale, gold only on the light it throws

**Why this life stage.** Adolescence is the first stage that ends on a night everyone agreed in advance would be the best of the player's life.

## Description

a mirror ball hanging on a short chain from the top edge of the frame, at boss scale, the only thing in the act that hangs from above, tiled all over with small square tiles in flat muted deep teal (#2F7370), the boss colour, with warm near-black (#2A2521) grout between them, a few single tiles in muted tan (#D2C6AC) as glints, a face spread across four tiles, low and off-centre: two closed eye arcs and a wide closed smile, having the best night of its life, no dancers, no couples, no crowns, nobody at the dance drawn, no yellow, no gold anywhere on the ball or the chain, no pink

## Mechanical checks

| Check | Result | Measured | Expected |
|---|---|---|---|
| silhouette-area | pass | 0.4678 | 0.25–0.95 of canvas |
| background-contrast | pass | 0.1736 | >= 0.12 median Oklab L from adolescence-deep |
| background-contrast-coverage | pass | 0.2836 | <= 0.4 of sprite may vanish into adolescence-deep |
| palette-conformance | pass | 0.0293 | <= 0.0353 Oklab from a palette entry |
| palette-variety | pass | 4 | >= 3 distinct palette colours |
| palette-dominance | pass | 0.6027 | no colour above 0.9 of the sprite |
| readable-48px-silhouette | pass | 0.4744 | >= 0.175 coverage at 48px |
| readable-48px-structure | pass | 7 | >= 3 palette colours still visible at 48px |
| enemy-value-ceiling | pass | 0.8512 | <= 0.856 Oklab L (bone); paper belongs to the player |
| readable-48px-detail | pass | 0.3138 | >= 0.06 edge density at 48px |
