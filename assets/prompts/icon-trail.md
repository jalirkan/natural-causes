# Legos icon

- **Asset id:** `icon-trail`
- **Act:** conception
- **Role:** icon
- **Source:** authored SVG, `tools/art/svg/conception/icon-trail.svg`
- **SVG sha256:** `f9dd2d640e5f39193442d537a4a9faa653fb0959b1c5ff4cb48cfc5c45db2966`
- **Rasteriser:** sharp 0.34.5 (libvips 8.17.3, librsvg 2.61.2)
- **Render:** 75.178 dpi, 4× supersampled and area-averaged
- **Rendered:** 2026-09-29T02:41:15.587Z
- **Sprite size:** 96px
- **Tests:** one toy brick, two studs by two, read at 52px on a card and 26px stamped along a trail, never a tile or a box

## Description

one chunky plastic toy building brick, two studs by two, seen from low and a little to one side so all four round studs stand up along its top, filling most of the frame, rounded corners and straight sides, the front face lit, the side face in shadow, one small glint on the front, flat dusty rose (#A86A63) brick and studs, deep wine (#6B3A44) side face, one pale warm (#D2C6AC) glint, warm near-black (#2A2521) lines where the faces meet and round each stud, no face, no red, no paper white, no logo, no text

## Mechanical checks

| Check | Result | Measured | Expected |
|---|---|---|---|
| silhouette-area | pass | 0.6202 | 0.1–0.8 of canvas |
| background-contrast | pass | 0.3208 | >= 0.12 median Oklab L from ink |
| background-contrast-coverage | pass | 0.1629 | <= 0.4 of sprite may vanish into ink |
| palette-conformance | pass | 0 | <= 0.0353 Oklab from a palette entry |
| palette-variety | pass | 5 | >= 2 distinct palette colours |
| palette-dominance | pass | 0.6459 | no colour above 0.97 of the sprite |
| readable-48px-silhouette | pass | 0.6367 | >= 0.070 coverage at 48px |
| readable-48px-structure | pass | 4 | >= 2 palette colours still visible at 48px |
| readable-48px-detail | pass | 0.2782 | >= 0.06 edge density at 48px |
| field-colours | pass | 0 | 0 px in a colour it keeps off on the field, as its law 11 line in `pnpm art:batch -- --dry --set=icons` lists them (law 10, G-036) |
