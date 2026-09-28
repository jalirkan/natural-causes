# Mobile icon

- **Asset id:** `icon-orbit`
- **Act:** conception
- **Role:** icon
- **Source:** authored SVG, `tools/art/svg/conception/icon-orbit.svg`
- **SVG sha256:** `ace73897762530869f2c8314f33c36db26e82c80e55847a93199df9ee1e94863`
- **Rasteriser:** sharp 0.34.5 (libvips 8.17.3, librsvg 2.61.2)
- **Render:** 58.038 dpi, 4× supersampled and area-averaged
- **Rendered:** 2026-09-28T23:04:40.360Z
- **Sprite size:** 96px
- **Tests:** one smiling star from a crib mobile, read at 52px on a card and 36px circling the player, never a badge or a medal

## Description

one fat five-pointed star from a crib mobile, every point rounded, hanging point-up on a short ribbon tied off in a loop, filling most of the frame, a small pleased face: two big dark eyes each with one pale glint, a blush oval under each eye, a little smile, flat pale warm tan (#D2C6AC) star with one warm grey-brown (#6E6353) shadow along its lower right edges, dusty rose (#A86A63) ribbon and loop, blush (#EBA39C) cheeks, warm near-black (#2A2521) eyes and smile, no paper white, no gold, no yellow, no red, no text

## Mechanical checks

| Check | Result | Measured | Expected |
|---|---|---|---|
| silhouette-area | pass | 0.3815 | 0.1–0.8 of canvas |
| background-contrast | pass | 0.5609 | >= 0.12 median Oklab L from ink |
| background-contrast-coverage | pass | 0.2244 | <= 0.4 of sprite may vanish into ink |
| palette-conformance | pass | 0 | <= 0.0353 Oklab from a palette entry |
| palette-variety | pass | 5 | >= 2 distinct palette colours |
| palette-dominance | pass | 0.6197 | no colour above 0.97 of the sprite |
| readable-48px-silhouette | pass | 0.3889 | >= 0.070 coverage at 48px |
| readable-48px-structure | pass | 7 | >= 2 palette colours still visible at 48px |
| readable-48px-detail | pass | 0.4529 | >= 0.06 edge density at 48px |
| field-colours | pass | 0 | 0 px in a colour it keeps off on the field, as its law 11 line in `pnpm art:batch -- --dry --set=icons` lists them (law 10, G-036) |
