# Pointing icon

- **Asset id:** `icon-strike`
- **Act:** conception
- **Role:** icon
- **Source:** authored SVG, `tools/art/svg/conception/icon-strike.svg`
- **SVG sha256:** `e03422bfd17bf7bcaca2643fdb6f02b9b530f07fc4bebcfb3d81d03eb9048539`
- **Rasteriser:** sharp 0.34.5 (libvips 8.17.3, librsvg 2.61.2)
- **Render:** 57.199 dpi, 4× supersampled and area-averaged
- **Rendered:** 2026-09-28T23:04:34.322Z
- **Sprite size:** 96px
- **Tests:** a kid's hand pointing, read at 52px on a card and 30px flying at the nearest thing, never a printer's manicule

## Description

a chubby child's hand, round as a mitten, pointing to the right, filling most of the frame, one short fat index finger held straight out, the thumb a round nub lying along its top, three curled fingers stacked below, a sweater cuff at the wrist, flat muted dusty rose (#A86A63) hand with one small pale warm (#D2C6AC) glint on its back, pale warm cuff, dark (#2A2521) lines where the fingers and thumb meet the hand, no face, no paper white, no red, no text

## Mechanical checks

| Check | Result | Measured | Expected |
|---|---|---|---|
| silhouette-area | pass | 0.4085 | 0.1–0.8 of canvas |
| background-contrast | pass | 0.3208 | >= 0.12 median Oklab L from ink |
| background-contrast-coverage | pass | 0.2337 | <= 0.4 of sprite may vanish into ink |
| palette-conformance | pass | 0 | <= 0.0353 Oklab from a palette entry |
| palette-variety | pass | 3 | >= 2 distinct palette colours |
| palette-dominance | pass | 0.5745 | no colour above 0.97 of the sprite |
| readable-48px-silhouette | pass | 0.4188 | >= 0.070 coverage at 48px |
| readable-48px-structure | pass | 5 | >= 2 palette colours still visible at 48px |
| readable-48px-detail | pass | 0.4463 | >= 0.06 edge density at 48px |
| field-colours | pass | 0 | 0 px in a colour it keeps off on the field, as its law 11 line in `pnpm art:batch -- --dry --set=icons` lists them (law 10, G-036) |
