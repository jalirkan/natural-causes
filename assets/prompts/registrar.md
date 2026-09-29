# Registrar

- **Asset id:** `registrar`
- **Act:** college
- **Role:** swarm
- **Source:** authored SVG, `tools/art/svg/college/registrar.svg`
- **SVG sha256:** `244c45f8b032c7fefc7dc4d755fc35b47e4c0254978adab07b1772a0a6724256`
- **Rasteriser:** sharp 0.34.5 (libvips 8.17.3, librsvg 2.61.2)
- **Render:** 46.575 dpi, 4× supersampled and area-averaged
- **Rendered:** 2026-09-29T02:41:09.543Z
- **Sprite size:** 80px
- **Tests:** the counter — the only architecture in the act, read by its bell; nobody behind it

**Why this life stage.** College is the first stage where the aimed thing is not a hit but a hold, placed by a window that has never seen the player and has the file.

## Description

a low service counter seen straight on, a wide front panel under a ledge, a slot cut in the panel, a small round desk bell standing on the ledge, the only bell in the act, flat warm grey-brown (#6E6353) counter, the ledge and the bell in muted tan (#D2C6AC), the slot in warm near-black (#2A2521), two small dark dots for eyes on the front panel looking down at the slot and one short flat line for a mouth, nobody behind the counter, no window glass, no sign, no text, no red, no purple, no gold, no yellow anywhere

## Mechanical checks

| Check | Result | Measured | Expected |
|---|---|---|---|
| silhouette-area | pass | 0.5953 | 0.12–0.82 of canvas |
| background-contrast | pass | 0.1855 | >= 0.12 median Oklab L from college-deep |
| background-contrast-coverage | pass | 0.1488 | <= 0.4 of sprite may vanish into college-deep |
| palette-conformance | pass | 0 | <= 0.0353 Oklab from a palette entry |
| palette-variety | pass | 3 | >= 2 distinct palette colours |
| palette-dominance | pass | 0.6556 | no colour above 0.97 of the sprite |
| readable-48px-silhouette | pass | 0.6102 | >= 0.084 coverage at 48px |
| readable-48px-structure | pass | 5 | >= 2 palette colours still visible at 48px |
| enemy-value-ceiling | pass | 0.8295 | <= 0.856 Oklab L (bone); paper belongs to the player |
| readable-48px-detail | pass | 0.3153 | >= 0.06 edge density at 48px |
