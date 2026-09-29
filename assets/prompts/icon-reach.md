# Reach icon

- **Asset id:** `icon-reach`
- **Act:** conception
- **Role:** icon
- **Source:** authored SVG, `tools/art/svg/conception/icon-reach.svg`
- **SVG sha256:** `f96df8d77488fcfd3d17be23b834432b573a43688523eea77d489a4992b3c9c2`
- **Rasteriser:** sharp 0.34.5 (libvips 8.17.3, librsvg 2.61.2)
- **Render:** 55.104 dpi, 4× supersampled and area-averaged
- **Rendered:** 2026-09-29T02:41:16.326Z
- **Sprite size:** 96px
- **Tests:** a grabber tool — a long rod with a trigger handle and a two-finger claw — read at 52px on a card and 36px at the edge of a sweep

## Description

a long-handled grabber tool seen from the side, a pistol-grip trigger handle at the left, a straight rod, a two-finger open claw at the right, flat muted dusty rose handle and claw, pale warm rod, dark interior lines at the trigger and the claw hinge, no hand holding it, no figure, no text

## Mechanical checks

| Check | Result | Measured | Expected |
|---|---|---|---|
| silhouette-area | pass | 0.2157 | 0.1–0.8 of canvas |
| background-contrast | pass | 0.3208 | >= 0.12 median Oklab L from ink |
| background-contrast-coverage | pass | 0.2052 | <= 0.4 of sprite may vanish into ink |
| palette-conformance | pass | 0 | <= 0.0353 Oklab from a palette entry |
| palette-variety | pass | 3 | >= 2 distinct palette colours |
| palette-dominance | pass | 0.6227 | no colour above 0.97 of the sprite |
| readable-48px-silhouette | pass | 0.2287 | >= 0.070 coverage at 48px |
| readable-48px-structure | pass | 5 | >= 2 palette colours still visible at 48px |
| readable-48px-detail | pass | 0.493 | >= 0.06 edge density at 48px |
| field-colours | pass | 0 | 0 px in a colour it keeps off on the field, as its law 11 line in `pnpm art:batch -- --dry --set=icons` lists them (law 10, G-036) |
