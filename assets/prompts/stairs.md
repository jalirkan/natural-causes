# Stairs

- **Asset id:** `stairs`
- **Act:** decline
- **Role:** swarm
- **Source:** authored SVG, `tools/art/svg/decline/stairs.svg`
- **SVG sha256:** `f74264a306754aee4635dbe42beaffae288314011d0819a8d00658025a1e2d7b`
- **Rasteriser:** sharp 0.34.5 (libvips 8.17.3, librsvg 2.61.2)
- **Render:** 54.000 dpi, 4× supersampled and area-averaged
- **Rendered:** 2026-09-28T17:25:49.249Z
- **Sprite size:** 96px
- **Tests:** the flight of stairs — the only steps and the only rail in the act; the elite purple on the steps

**Why this life stage.** Decline is the first stage where the slow way up is the safe way, and the crowd cannot follow.

## Description

a flight of six steps rising from left to right seen exactly side-on, one straight rail above them on two posts, flat muted purple (#7C5C8A), the elite threat colour, on every step, one solid tone, the rail and posts and the outline in warm near-black (#2A2521), two small dark dots for eyes and one short flat line for a mouth on the riser of the top step, looking down the flight, not at the viewer, no carpet, no banister curl, no text, no red, no gold, no yellow, no teal anywhere

## Mechanical checks

| Check | Result | Measured | Expected |
|---|---|---|---|
| silhouette-area | pass | 0.437 | 0.12–0.82 of canvas |
| background-contrast | pass | 0.1579 | >= 0.12 median Oklab L from decline-deep |
| background-contrast-coverage | pass | 0.3534 | <= 0.4 of sprite may vanish into decline-deep |
| palette-conformance | pass | 0 | <= 0.0353 Oklab from a palette entry |
| palette-variety | pass | 2 | >= 2 distinct palette colours |
| palette-dominance | pass | 0.6466 | no colour above 0.97 of the sprite |
| readable-48px-silhouette | pass | 0.4566 | >= 0.084 coverage at 48px |
| readable-48px-structure | pass | 3 | >= 2 palette colours still visible at 48px |
| enemy-value-ceiling | pass | 0.5252 | <= 0.856 Oklab L (bone); paper belongs to the player |
| readable-48px-detail | pass | 0.2548 | >= 0.06 edge density at 48px |
