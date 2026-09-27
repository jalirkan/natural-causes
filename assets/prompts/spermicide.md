# Spermicide

- **Asset id:** `spermicide`
- **Act:** conception
- **Role:** swarm
- **Source:** authored SVG, `tools/art/svg/conception/spermicide.svg`
- **SVG sha256:** `7b3dabcfa3b0aebe95e1d4c96e30f0c70c7ea58a706eaf9abb3aa488a5de0074`
- **Rasteriser:** sharp 0.34.5 (libvips 8.17.3, librsvg 2.61.2)
- **Render:** 211.664 dpi, 4× supersampled and area-averaged
- **Rendered:** 2026-09-27T22:58:55.492Z
- **Sprite size:** 72px
- **Tests:** a droplet that reads as asleep, with no interior detail at all

**Why this life stage.** Conception is the first stage where the environment was made lethal in advance by someone who will never be told whether it worked.

## Description

a single rounded teardrop-shaped droplet of liquid with a flat top and a smooth blunt bottom, flat muted red, one solid colour, absolutely no interior detail, no highlight, no shine, no bubbles, a small simple face low on the droplet: two downward-curving closed sleeping eye arcs and no mouth at all, peacefully asleep, unaware, completely unbothered, no arms, no legs, no tail, no ring, no circle around it

## Mechanical checks

| Check | Result | Measured | Expected |
|---|---|---|---|
| silhouette-area | pass | 0.7089 | 0.12–0.82 of canvas |
| background-contrast | pass | 0.177 | >= 0.12 median Oklab L from conception-deep |
| background-contrast-coverage | pass | 0.1472 | <= 0.4 of sprite may vanish into conception-deep |
| palette-conformance | pass | 0 | <= 0.0353 Oklab from a palette entry |
| palette-variety | pass | 3 | >= 2 distinct palette colours |
| palette-dominance | pass | 0.6996 | no colour above 0.97 of the sprite |
| readable-48px-silhouette | pass | 0.7148 | >= 0.084 coverage at 48px |
| readable-48px-structure | pass | 4 | >= 2 palette colours still visible at 48px |
| enemy-value-ceiling | pass | 0.5893 | <= 0.856 Oklab L (bone); paper belongs to the player |
| readable-48px-detail | pass | 0.2184 | >= 0.06 edge density at 48px |
