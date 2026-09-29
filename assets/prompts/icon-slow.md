# Snooze icon

- **Asset id:** `icon-slow`
- **Act:** conception
- **Role:** icon
- **Source:** authored SVG, `tools/art/svg/conception/icon-slow.svg`
- **SVG sha256:** `015d18d9766321de3bf110b877b5831786cbf8a0b223d4816a56601caa098c89`
- **Rasteriser:** sharp 0.34.5 (libvips 8.17.3, librsvg 2.61.2)
- **Render:** 57.452 dpi, 4× supersampled and area-averaged
- **Rendered:** 2026-09-29T02:41:15.942Z
- **Sprite size:** 96px
- **Tests:** nine more minutes, read at 52px on a card and 40px on its field; never the twin-bell clock

## Description

a round bedside clock seen straight on on two short feet, one wide flat bar across its top where bells would be, no bells, a pale face with two dark hands at nine minutes to the hour, no numerals, one bold z drawn as a shape rising off the top right, flat muted dusty rose case, pale warm face, bar and z

## Mechanical checks

| Check | Result | Measured | Expected |
|---|---|---|---|
| silhouette-area | pass | 0.5461 | 0.1–0.8 of canvas |
| background-contrast | pass | 0.5609 | >= 0.12 median Oklab L from ink |
| background-contrast-coverage | pass | 0.1152 | <= 0.4 of sprite may vanish into ink |
| palette-conformance | pass | 0 | <= 0.0353 Oklab from a palette entry |
| palette-variety | pass | 3 | >= 2 distinct palette colours |
| palette-dominance | pass | 0.5102 | no colour above 0.97 of the sprite |
| readable-48px-silhouette | pass | 0.559 | >= 0.070 coverage at 48px |
| readable-48px-structure | pass | 6 | >= 2 palette colours still visible at 48px |
| readable-48px-detail | pass | 0.3545 | >= 0.06 edge density at 48px |
| field-colours | pass | 0 | 0 px in a colour it keeps off on the field, as its law 11 line in `pnpm art:batch -- --dry --set=icons` lists them (law 10, G-036) |
