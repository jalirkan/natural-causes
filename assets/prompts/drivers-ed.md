# Driver's ed

- **Asset id:** `drivers-ed`
- **Act:** adolescence
- **Role:** swarm
- **Source:** authored SVG, `tools/art/svg/adolescence/drivers-ed.svg`
- **SVG sha256:** `62c37e4cc0b31f1f1bbda13d88279c6831ab016cb3c26f38a295601c4bc8747b`
- **Rasteriser:** sharp 0.34.5 (libvips 8.17.3, librsvg 2.61.2)
- **Render:** 52.488 dpi, 4× supersampled and area-averaged
- **Rendered:** 2026-09-29T02:41:08.516Z
- **Sprite size:** 88px
- **Tests:** the wheels — side-on, so the car is neither a rectangle nor a dome

**Why this life stage.** Adolescence is the only stage where the most dangerous thing the player will ever do is scheduled as a class.

## Description

a lumpy little hatchback seen exactly side-on, a rounded uneven body on two round wheels, the body flat muted red (#C4472E), the contact threat colour, one solid tone, two wheels in warm near-black (#2A2521), the only wheels in the act, a flat blank muted tan (#D2C6AC) plate standing on the roof, the windscreen is the face: two small dark dots looking forward along the road and one short flat line for a mouth, not looking at the viewer, eyes on the road, nobody inside, no driver, no instructor, no lettering on the plate, no yellow, no gold, no pink, no headlight glow

## Mechanical checks

| Check | Result | Measured | Expected |
|---|---|---|---|
| silhouette-area | pass | 0.5447 | 0.12–0.82 of canvas |
| background-contrast | pass | 0.2319 | >= 0.12 median Oklab L from adolescence-deep |
| background-contrast-coverage | pass | 0.2793 | <= 0.4 of sprite may vanish into adolescence-deep |
| palette-conformance | pass | 0 | <= 0.0353 Oklab from a palette entry |
| palette-variety | pass | 4 | >= 2 distinct palette colours |
| palette-dominance | pass | 0.5076 | no colour above 0.97 of the sprite |
| readable-48px-silhouette | pass | 0.5582 | >= 0.084 coverage at 48px |
| readable-48px-structure | pass | 5 | >= 2 palette colours still visible at 48px |
| enemy-value-ceiling | pass | 0.8295 | <= 0.856 Oklab L (bone); paper belongs to the player |
| readable-48px-detail | pass | 0.3187 | >= 0.06 edge density at 48px |
