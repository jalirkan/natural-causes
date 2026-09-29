# Reply-all

- **Asset id:** `reply-all`
- **Act:** office
- **Role:** swarm
- **Source:** authored SVG, `tools/art/svg/office/reply-all.svg`
- **SVG sha256:** `ff9305c017f687504a18a64a07bf29f98b084cbdfac2c9de274c8e3a410c6ede`
- **Rasteriser:** sharp 0.34.5 (libvips 8.17.3, librsvg 2.61.2)
- **Render:** 27.000 dpi, 4× supersampled and area-averaged
- **Rendered:** 2026-09-29T02:41:10.152Z
- **Sprite size:** 48px
- **Tests:** the clipped sheet — the only sheet and the only clip in the act; its children are the same sheet smaller

**Why this life stage.** The Office is the first stage where dealing with a thing is precisely what makes more of it.

## Description

a portrait sheet of paper seen flat on with a paperclip over its top-left corner, three short ruled lines across it, muted tan (#D2C6AC) paper, the clip and the rules in warm near-black (#2A2521), two small dark dots for eyes low on the sheet looking straight out and one short flat line for a mouth, no text, no letters, no envelope, no red anywhere, no purple, no gold, no yellow, no pale blue-grey anywhere

## Mechanical checks

| Check | Result | Measured | Expected |
|---|---|---|---|
| silhouette-area | pass | 0.5929 | 0.12–0.82 of canvas |
| background-contrast | pass | 0.4266 | >= 0.12 median Oklab L from office-deep |
| background-contrast-coverage | pass | 0 | <= 0.4 of sprite may vanish into office-deep |
| palette-conformance | pass | 0 | <= 0.0353 Oklab from a palette entry |
| palette-variety | pass | 2 | >= 2 distinct palette colours |
| palette-dominance | pass | 0.7218 | no colour above 0.97 of the sprite |
| readable-48px-silhouette | pass | 0.5929 | >= 0.084 coverage at 48px |
| readable-48px-structure | pass | 2 | >= 2 palette colours still visible at 48px |
| enemy-value-ceiling | pass | 0.8295 | <= 0.856 Oklab L (bone); paper belongs to the player |
| readable-48px-detail | pass | 0.2874 | >= 0.06 edge density at 48px |
