# Group project

- **Asset id:** `group-project`
- **Act:** college
- **Role:** swarm
- **Source:** authored SVG, `tools/art/svg/college/group-project.svg`
- **SVG sha256:** `376ac2b78630ace56e59c1b5c47a3fbabf965f9f0f80287352d2606c09553c09`
- **Rasteriser:** sharp 0.34.5 (libvips 8.17.3, librsvg 2.61.2)
- **Render:** 300.786 dpi, 4× supersampled and area-averaged
- **Rendered:** 2026-09-28T04:14:04.260Z
- **Sprite size:** 100px
- **Tests:** the cluster — four lumps, four faces, one awake, and the drawing does not say which one matters

**Why this life stage.** College is where the player is first graded on something four were assigned and one did, and finding out which one costs more than doing the work.

## Description

four rounded lumps fused into one uneven mass, the only fused mass in the act, flat muted purple (#7C5C8A), the elite threat colour, on all four lumps, one solid tone with one darker flat tone as the only shadow, four faces, one per lump: three with closed eye arcs and flat mouths, one with two open dark dots for eyes and a flat mouth, nothing in the drawing marks any lump as different beyond the one open face, no arms, no legs, no books, no laptops, no text, no red, no gold, no yellow anywhere

## Mechanical checks

| Check | Result | Measured | Expected |
|---|---|---|---|
| silhouette-area | pass | 0.6172 | 0.12–0.82 of canvas |
| background-contrast | pass | 0.2053 | >= 0.12 median Oklab L from college-deep |
| background-contrast-coverage | pass | 0.1612 | <= 0.4 of sprite may vanish into college-deep |
| palette-conformance | pass | 0 | <= 0.0353 Oklab from a palette entry |
| palette-variety | pass | 3 | >= 2 distinct palette colours |
| palette-dominance | pass | 0.7038 | no colour above 0.97 of the sprite |
| readable-48px-silhouette | pass | 0.6207 | >= 0.084 coverage at 48px |
| readable-48px-structure | pass | 4 | >= 2 palette colours still visible at 48px |
| enemy-value-ceiling | pass | 0.5252 | <= 0.856 Oklab L (bone); paper belongs to the player |
| readable-48px-detail | pass | 0.2615 | >= 0.06 edge density at 48px |
