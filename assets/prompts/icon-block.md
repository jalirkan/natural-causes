# Calendar Block icon

- **Asset id:** `icon-block`
- **Act:** conception
- **Role:** icon
- **Source:** authored SVG, `tools/art/svg/conception/icon-block.svg`
- **SVG sha256:** `fd9363e99c803f2572b3c12a456385189060ba4f332057517032f7071e9d820c`
- **Rasteriser:** sharp 0.34.5 (libvips 8.17.3, librsvg 2.61.2)
- **Render:** 57.199 dpi, 4× supersampled and area-averaged
- **Rendered:** 2026-09-28T17:33:51.199Z
- **Sprite size:** 96px
- **Tests:** a calendar page with one day struck through, read at 52px on a card and 40px on its hold, never a grid of numbers

## Description

one wall-calendar page seen flat and straight on, a sheet a little taller than it is wide, with two binder rings standing up off its top edge and a solid header band under them, below the band a grid of nine plain day cells, three by three, with no numbers, the middle one filled in and struck through with one bold diagonal bar, flat muted dusty rose header band and filled day, pale warm sheet, rings and cells, dark lines between the cells and the one strike, no text, no numbers, no figure, no clock, no purple

## Mechanical checks

| Check | Result | Measured | Expected |
|---|---|---|---|
| silhouette-area | pass | 0.6503 | 0.1–0.8 of canvas |
| background-contrast | pass | 0.5609 | >= 0.12 median Oklab L from ink |
| background-contrast-coverage | pass | 0.2678 | <= 0.4 of sprite may vanish into ink |
| palette-conformance | pass | 0 | <= 0.0353 Oklab from a palette entry |
| palette-variety | pass | 3 | >= 2 distinct palette colours |
| palette-dominance | pass | 0.5211 | no colour above 0.97 of the sprite |
| readable-48px-silhouette | pass | 0.661 | >= 0.070 coverage at 48px |
| readable-48px-structure | pass | 5 | >= 2 palette colours still visible at 48px |
| readable-48px-detail | pass | 0.4642 | >= 0.06 edge density at 48px |
| field-colours | pass | 0 | 0 px in a colour it keeps off on the field, as its law 11 line in `pnpm art:batch -- --dry --set=icons` lists them (law 10, G-036) |
