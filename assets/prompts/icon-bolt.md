# Judgement icon

- **Asset id:** `icon-bolt`
- **Act:** conception
- **Role:** icon
- **Source:** authored SVG, `tools/art/svg/conception/icon-bolt.svg`
- **SVG sha256:** `034b6b4383caa4b8bc41d299865fb323ca59439eb2d0827a48c256328c12f484`
- **Rasteriser:** sharp 0.34.5 (libvips 8.17.3, librsvg 2.61.2)
- **Render:** 73.300 dpi, 4× supersampled and area-averaged
- **Rendered:** 2026-09-28T03:30:31.417Z
- **Sprite size:** 96px
- **Tests:** a gavel about to land, read at 52px on a card and 36px dropping onto the field, never a hammer

## Description

a gavel seen from the side, its head a thick horizontal cylinder with a flat pale face at each end, no claw, a short handle leaving the middle of the head and running down-left at about forty degrees, a round knob at its end, held just above a small round sound block seen at a slight angle, its near rim one dark line, three tiny flat impact ticks fanned up off the block in the gap under the head, flat muted dusty rose head and handle, pale warm end faces, block and ticks, dark lines where the head meets the handle and the faces meet the head

## Mechanical checks

| Check | Result | Measured | Expected |
|---|---|---|---|
| silhouette-area | pass | 0.6115 | 0.1–0.8 of canvas |
| background-contrast | pass | 0.3208 | >= 0.12 median Oklab L from ink |
| background-contrast-coverage | pass | 0.2553 | <= 0.4 of sprite may vanish into ink |
| palette-conformance | pass | 0 | <= 0.0353 Oklab from a palette entry |
| palette-variety | pass | 3 | >= 2 distinct palette colours |
| palette-dominance | pass | 0.4642 | no colour above 0.97 of the sprite |
| readable-48px-silhouette | pass | 0.6341 | >= 0.070 coverage at 48px |
| readable-48px-structure | pass | 5 | >= 2 palette colours still visible at 48px |
| readable-48px-detail | pass | 0.4476 | >= 0.06 edge density at 48px |
