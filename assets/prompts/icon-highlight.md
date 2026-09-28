# Highlighter icon

- **Asset id:** `icon-highlight`
- **Act:** conception
- **Role:** icon
- **Source:** authored SVG, `tools/art/svg/conception/icon-highlight.svg`
- **SVG sha256:** `283cb1a2ba6fa62f1663c6e5f9c8cf45bb47b71378edf8db0670f85dae9381ef`
- **Rasteriser:** sharp 0.34.5 (libvips 8.17.3, librsvg 2.61.2)
- **Render:** 66.861 dpi, 4× supersampled and area-averaged
- **Rendered:** 2026-09-28T17:31:10.170Z
- **Sprite size:** 96px
- **Tests:** a chisel-tip marker laying one broad stroke, read at 52px on a card and 30px in flight, never a pencil, a crayon or a syringe

## Description

a fat chisel-tip highlighter marker seen from the side, the cap off, tilted down to the right as if writing, a short clip along the top of the barrel, its slanted chisel tip pressed onto the right-hand end of one broad flat stroke it has just laid, a level band with square ends running back to the left, as if drawn under a line of text, flat muted dusty rose barrel and felt tip, pale warm back plug, clip, collar and stroke, dark interior lines either side of the collar, under the clip and along the chisel face, no yellow, no paper, no text, no hand, no page

## Mechanical checks

| Check | Result | Measured | Expected |
|---|---|---|---|
| silhouette-area | pass | 0.4989 | 0.1–0.8 of canvas |
| background-contrast | pass | 0.3208 | >= 0.12 median Oklab L from ink |
| background-contrast-coverage | pass | 0.2116 | <= 0.4 of sprite may vanish into ink |
| palette-conformance | pass | 0 | <= 0.0353 Oklab from a palette entry |
| palette-variety | pass | 3 | >= 2 distinct palette colours |
| palette-dominance | pass | 0.4826 | no colour above 0.97 of the sprite |
| readable-48px-silhouette | pass | 0.5109 | >= 0.070 coverage at 48px |
| readable-48px-structure | pass | 6 | >= 2 palette colours still visible at 48px |
| readable-48px-detail | pass | 0.3926 | >= 0.06 edge density at 48px |
| field-colours | pass | 0 | 0 px in a colour it keeps off on the field, as its law 11 line in `pnpm art:batch -- --dry --set=icons` lists them (law 10, G-036) |
