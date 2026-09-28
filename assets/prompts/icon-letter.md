# Strongly Worded Letter icon

- **Asset id:** `icon-letter`
- **Act:** conception
- **Role:** icon
- **Source:** authored SVG, `tools/art/svg/conception/icon-letter.svg`
- **SVG sha256:** `a25ba8a7f29deedd2f4d281abf0b11ed2a5de0e4f8f009ce710c5b8e2073d468`
- **Rasteriser:** sharp 0.34.5 (libvips 8.17.3, librsvg 2.61.2)
- **Render:** 59.254 dpi, 4× supersampled and area-averaged
- **Rendered:** 2026-09-28T17:33:19.298Z
- **Sprite size:** 96px
- **Tests:** a written letter, one flat sheet, read at 52px on a card and 36px coming down on the mark, never an envelope, never folded, never sealed

## Description

one flat sheet of writing paper, taller than wide, tipped a little to the left as if just sent, seen straight on, a letter laid out as a letter: one short line top left for the greeting, a block of four heavy lines of writing, one short line bottom right for the signature, the last line of the block underlined twice, hard, flat muted dusty rose sheet, pale warm lines of writing, the double underline dark, no envelope, no fold, no dog-ear, no seal, no stamp, no window, no hand, no figure, no legible text

## Mechanical checks

| Check | Result | Measured | Expected |
|---|---|---|---|
| silhouette-area | pass | 0.6029 | 0.1–0.8 of canvas |
| background-contrast | pass | 0.3208 | >= 0.12 median Oklab L from ink |
| background-contrast-coverage | pass | 0.1636 | <= 0.4 of sprite may vanish into ink |
| palette-conformance | pass | 0 | <= 0.0353 Oklab from a palette entry |
| palette-variety | pass | 3 | >= 2 distinct palette colours |
| palette-dominance | pass | 0.6219 | no colour above 0.97 of the sprite |
| readable-48px-silhouette | pass | 0.615 | >= 0.070 coverage at 48px |
| readable-48px-structure | pass | 6 | >= 2 palette colours still visible at 48px |
| readable-48px-detail | pass | 0.4665 | >= 0.06 edge density at 48px |
| field-colours | pass | 0 | 0 px in a colour it keeps off on the field, as its law 11 line in `pnpm art:batch -- --dry --set=icons` lists them (law 10, G-036) |
