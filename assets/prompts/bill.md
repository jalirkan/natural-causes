# Bill

- **Asset id:** `bill`
- **Act:** family
- **Role:** swarm
- **Source:** authored SVG, `tools/art/svg/family/bill.svg`
- **SVG sha256:** `443842628a2172fdc97097fcd8ac0ad420544d1fcefa541c3ccdd63edc06b24d`
- **Rasteriser:** sharp 0.34.5 (libvips 8.17.3, librsvg 2.61.2)
- **Render:** 27.000 dpi, 4× supersampled and area-averaged
- **Rendered:** 2026-09-28T10:53:39.568Z
- **Sprite size:** 48px
- **Tests:** the windowed envelope — the only envelope and the only window in the act; a late fee is the same drawing

**Why this life stage.** Family is the first stage where leaving a thing alone is precisely what makes more of it.

## Description

a landscape envelope seen flat on, a flap line across its top, a clear address window low on its face, muted tan (#D2C6AC) paper, the flap line and the window frame in warm near-black (#2A2521), two small dark dots for eyes and one short flat line for a mouth inside the window where the address would be, looking straight out, no text, no stamp, no red, no purple, no gold, no yellow anywhere

## Mechanical checks

| Check | Result | Measured | Expected |
|---|---|---|---|
| silhouette-area | pass | 0.6649 | 0.12–0.82 of canvas |
| background-contrast | pass | 0.4668 | >= 0.12 median Oklab L from family-deep |
| background-contrast-coverage | pass | 0.2676 | <= 0.4 of sprite may vanish into family-deep |
| palette-conformance | pass | 0 | <= 0.0353 Oklab from a palette entry |
| palette-variety | pass | 2 | >= 2 distinct palette colours |
| palette-dominance | pass | 0.7324 | no colour above 0.97 of the sprite |
| readable-48px-silhouette | pass | 0.6649 | >= 0.084 coverage at 48px |
| readable-48px-structure | pass | 2 | >= 2 palette colours still visible at 48px |
| enemy-value-ceiling | pass | 0.8295 | <= 0.856 Oklab L (bone); paper belongs to the player |
| readable-48px-detail | pass | 0.3149 | >= 0.06 edge density at 48px |
