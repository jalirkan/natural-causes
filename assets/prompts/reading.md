# Reading

- **Asset id:** `reading`
- **Act:** college
- **Role:** swarm
- **Source:** authored SVG, `tools/art/svg/college/reading.svg`
- **SVG sha256:** `f69ee3a92922465f59e02f2aa5c331449fd8a3d999cdd64e9dd675a30cdf5a07`
- **Rasteriser:** sharp 0.34.5 (libvips 8.17.3, librsvg 2.61.2)
- **Render:** 27.000 dpi, 4× supersampled and area-averaged
- **Rendered:** 2026-09-28T04:16:33.606Z
- **Sprite size:** 48px
- **Tests:** the stack — the only pile in the act, read by its fanned edges

**Why this life stage.** College is the first stage where the work arrives faster than it can be done and nobody checks whether it was.

## Description

a short pile of three or four pages seen from a low angle, their edges fanned out at one side, the top corner turned up, pale muted tan (#D2C6AC) pages with warm near-black (#2A2521) edge lines, the only pile in the act, two small dark dots for eyes on the top page, half-shut, and one short flat line for a mouth, it has been on the pile a while, no text, no letters, no lines of writing, no desk, no red, no purple, no gold, no yellow anywhere

## Mechanical checks

| Check | Result | Measured | Expected |
|---|---|---|---|
| silhouette-area | pass | 0.7027 | 0.12–0.82 of canvas |
| background-contrast | pass | 0.5096 | >= 0.12 median Oklab L from college-deep |
| background-contrast-coverage | pass | 0.2526 | <= 0.4 of sprite may vanish into college-deep |
| palette-conformance | pass | 0 | <= 0.0353 Oklab from a palette entry |
| palette-variety | pass | 3 | >= 2 distinct palette colours |
| palette-dominance | pass | 0.7282 | no colour above 0.97 of the sprite |
| readable-48px-silhouette | pass | 0.7027 | >= 0.084 coverage at 48px |
| readable-48px-structure | pass | 2 | >= 2 palette colours still visible at 48px |
| enemy-value-ceiling | pass | 0.8295 | <= 0.856 Oklab L (bone); paper belongs to the player |
| readable-48px-detail | pass | 0.404 | >= 0.06 edge density at 48px |
