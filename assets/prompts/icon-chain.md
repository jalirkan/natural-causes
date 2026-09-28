# Telephone icon

- **Asset id:** `icon-chain`
- **Act:** conception
- **Role:** icon
- **Source:** authored SVG, `tools/art/svg/conception/icon-chain.svg`
- **SVG sha256:** `da196c055a1fb4bbdbc47cd7aedb15092616f4b257978effef717ad917a14535`
- **Rasteriser:** sharp 0.34.5 (libvips 8.17.3, librsvg 2.61.2)
- **Render:** 54.975 dpi, 4× supersampled and area-averaged
- **Rendered:** 2026-09-28T22:54:28.432Z
- **Sprite size:** 96px
- **Tests:** a toy telephone passing it on, read at 52px on a card and 30px in flight; the handset says telephone, never a car

## Description

a toy telephone on two little round wheels, seen straight on: a plump dome of a body with a fat curved handset lying across its top, each end of the handset resting on a shoulder of the body, a pleased face on the body: two big dark eyes with one small pale glint each, a blush oval under each eye, a small smile, the body in flat muted dusty rose (#A86A63) with one deep wine (#6B3A44) shadow along its right side and underneath and one small pale warm (#D2C6AC) glint high on its left, the handset in flat soft blush pink (#EBA39C) with one small pale warm glint, the wheels warm grey-brown (#6E6353) with pale warm hubs, eyes and smile warm near-black (#2A2521), no dial on its front, no eyes on stalks, no cord, no text, no brand, no rectangle

## Mechanical checks

| Check | Result | Measured | Expected |
|---|---|---|---|
| silhouette-area | pass | 0.5171 | 0.1–0.8 of canvas |
| background-contrast | pass | 0.3208 | >= 0.12 median Oklab L from ink |
| background-contrast-coverage | pass | 0.2113 | <= 0.4 of sprite may vanish into ink |
| palette-conformance | pass | 0 | <= 0.0353 Oklab from a palette entry |
| palette-variety | pass | 6 | >= 2 distinct palette colours |
| palette-dominance | pass | 0.3504 | no colour above 0.97 of the sprite |
| readable-48px-silhouette | pass | 0.5308 | >= 0.070 coverage at 48px |
| readable-48px-structure | pass | 6 | >= 2 palette colours still visible at 48px |
| readable-48px-detail | pass | 0.3898 | >= 0.06 edge density at 48px |
| field-colours | pass | 0 | 0 px in a colour it keeps off on the field, as its law 11 line in `pnpm art:batch -- --dry --set=icons` lists them (law 10, G-036) |
