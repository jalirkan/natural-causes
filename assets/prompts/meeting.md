# Meeting

- **Asset id:** `meeting`
- **Act:** office
- **Role:** swarm
- **Source:** authored SVG, `tools/art/svg/office/meeting.svg`
- **SVG sha256:** `782bf7a81e6d6cc16d79811b3669d5aeb3930b2091c3fcb0618fe653ee494e5a`
- **Rasteriser:** sharp 0.34.5 (libvips 8.17.3, librsvg 2.61.2)
- **Render:** 52.664 dpi, 4× supersampled and area-averaged
- **Rendered:** 2026-09-29T02:41:10.234Z
- **Sprite size:** 96px
- **Tests:** the ring of chairs — eight chair-backs on a circle around nothing, read as a ring at any size

**Why this life stage.** The Office is the first stage that takes the player’s time without touching them.

## Description

eight small chair-backs seen from above and behind, spaced evenly on one circle, facing the empty middle, flat muted purple (#7C5C8A), the elite threat colour, on every chair-back, one solid tone, the legs in warm near-black (#2A2521), nothing in the middle of the circle and nobody in any chair, no table, no faces, no text, no red, no gold, no yellow, no pale blue-grey anywhere

## Mechanical checks

| Check | Result | Measured | Expected |
|---|---|---|---|
| silhouette-area | pass | 0.3053 | 0.12–0.82 of canvas |
| background-contrast | pass | 0.1223 | >= 0.12 median Oklab L from office-deep |
| background-contrast-coverage | pass | 0 | <= 0.4 of sprite may vanish into office-deep |
| palette-conformance | pass | 0 | <= 0.0353 Oklab from a palette entry |
| palette-variety | pass | 2 | >= 2 distinct palette colours |
| palette-dominance | pass | 0.6517 | no colour above 0.97 of the sprite |
| readable-48px-silhouette | pass | 0.3299 | >= 0.084 coverage at 48px |
| readable-48px-structure | pass | 5 | >= 2 palette colours still visible at 48px |
| enemy-value-ceiling | pass | 0.5252 | <= 0.856 Oklab L (bone); paper belongs to the player |
| readable-48px-detail | pass | 0.5823 | >= 0.06 edge density at 48px |
