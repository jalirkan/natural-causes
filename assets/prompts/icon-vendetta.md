# Vendetta icon

- **Asset id:** `icon-vendetta`
- **Act:** conception
- **Role:** icon
- **Source:** authored SVG, `tools/art/svg/conception/icon-vendetta.svg`
- **SVG sha256:** `31c13ba82c1096b50c70bc0733675c7a30ab7948127e52061e540219ae23291e`
- **Rasteriser:** sharp 0.34.5 (libvips 8.17.3, librsvg 2.61.2)
- **Render:** 57.035 dpi, 4× supersampled and area-averaged
- **Rendered:** 2026-09-28T04:20:15.215Z
- **Sprite size:** 96px
- **Tests:** a boxing glove — the grudge with thick skin on — read at 52px on a card and 36px circling the player, never the bare fist

## Description

a boxing glove seen from the side, thumb up, a fat rounded mitt with a short laced cuff, no forearm, flat muted dusty rose glove, pale warm cuff and laces, dark interior line where the thumb meets the mitt, nothing else: no ring, no ropes, no figure, no text

## Mechanical checks

| Check | Result | Measured | Expected |
|---|---|---|---|
| silhouette-area | pass | 0.5076 | 0.1–0.8 of canvas |
| background-contrast | pass | 0.3208 | >= 0.12 median Oklab L from ink |
| background-contrast-coverage | pass | 0.1817 | <= 0.4 of sprite may vanish into ink |
| palette-conformance | pass | 0 | <= 0.0353 Oklab from a palette entry |
| palette-variety | pass | 3 | >= 2 distinct palette colours |
| palette-dominance | pass | 0.6582 | no colour above 0.97 of the sprite |
| readable-48px-silhouette | pass | 0.5152 | >= 0.070 coverage at 48px |
| readable-48px-structure | pass | 5 | >= 2 palette colours still visible at 48px |
| readable-48px-detail | pass | 0.3173 | >= 0.06 edge density at 48px |
