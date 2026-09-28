# Weather

- **Asset id:** `weather`
- **Act:** decline
- **Role:** swarm
- **Source:** authored SVG, `tools/art/svg/decline/weather.svg`
- **SVG sha256:** `1d7b318d625920ce240cb25d103d276e30a9b1e5281abbb6046860e0769ffdb9`
- **Rasteriser:** sharp 0.34.5 (libvips 8.17.3, librsvg 2.61.2)
- **Render:** 60.539 dpi, 4× supersampled and area-averaged
- **Rendered:** 2026-09-28T17:24:10.195Z
- **Sprite size:** 112px
- **Tests:** the front — the only cloud and the widest thing, read side-on crossing; red on the rain only

**Why this life stage.** Decline is the first stage where the weather is something that happens to the player.

## Description

a long low bank of cloud seen side-on, twice as wide as it is tall, with five short straight rain lines falling from its underside, muted tan (#D2C6AC) cloud with warm near-black (#2A2521) edges, the rain lines in flat muted red (#C4472E), the contact threat colour, the only red on it, two small dark dots for eyes and one short flat line for a mouth in the cloud looking down at its own rain, not at the viewer, no sun, no lightning, no text, no purple, no gold, no yellow, no teal anywhere

## Mechanical checks

| Check | Result | Measured | Expected |
|---|---|---|---|
| silhouette-area | pass | 0.4549 | 0.12–0.82 of canvas |
| background-contrast | pass | 0.4622 | >= 0.12 median Oklab L from decline-deep |
| background-contrast-coverage | pass | 0.1837 | <= 0.4 of sprite may vanish into decline-deep |
| palette-conformance | pass | 0 | <= 0.0353 Oklab from a palette entry |
| palette-variety | pass | 3 | >= 2 distinct palette colours |
| palette-dominance | pass | 0.7497 | no colour above 0.97 of the sprite |
| readable-48px-silhouette | pass | 0.4674 | >= 0.084 coverage at 48px |
| readable-48px-structure | pass | 6 | >= 2 palette colours still visible at 48px |
| enemy-value-ceiling | pass | 0.8295 | <= 0.856 Oklab L (bone); paper belongs to the player |
| readable-48px-detail | pass | 0.3496 | >= 0.06 edge density at 48px |
