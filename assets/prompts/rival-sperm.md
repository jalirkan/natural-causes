# Rival sperm

- **Asset id:** `rival-sperm`
- **Act:** conception
- **Role:** swarm
- **Source:** authored SVG, `tools/art/svg/conception/rival-sperm.svg`
- **SVG sha256:** `68d2b223ca5683fa771564f3fa4c0a79004d0df872e419ec1f8d1fb50c62d5b3`
- **Rasteriser:** sharp 0.34.5 (libvips 8.17.3, librsvg 2.61.2)
- **Render:** 321.682 dpi, 4× supersampled and area-averaged
- **Rendered:** 2026-09-27T23:25:18.956Z
- **Sprite size:** 96px
- **Tests:** does it read at 48px in a crowd

**Why this life stage.** Conception is the only competition the player has already won, so the game opens by making it feel like a commute.

## Description

a single cartoon sperm cell seen from the side, a smooth blunt domed head with no hair and no tuft, half-lidded eyes almost closed, a flat horizontal line for a mouth, no eyebrows, a blank disinterested expression, completely uninterested, looking straight ahead in its direction of travel and not at the viewer, a single thin curled tail, flat muted dusty rose colouring, mid-tone, never pale and never white

## Mechanical checks

| Check | Result | Measured | Expected |
|---|---|---|---|
| silhouette-area | pass | 0.327 | 0.12–0.82 of canvas |
| background-contrast | pass | 0.177 | >= 0.12 median Oklab L from conception-deep |
| background-contrast-coverage | pass | 0.145 | <= 0.4 of sprite may vanish into conception-deep |
| palette-conformance | pass | 0 | <= 0.0353 Oklab from a palette entry |
| palette-variety | pass | 3 | >= 2 distinct palette colours |
| palette-dominance | pass | 0.6447 | no colour above 0.97 of the sprite |
| readable-48px-silhouette | pass | 0.3355 | >= 0.084 coverage at 48px |
| readable-48px-structure | pass | 4 | >= 2 palette colours still visible at 48px |
| enemy-value-ceiling | pass | 0.5893 | <= 0.856 Oklab L (bone); paper belongs to the player |
| readable-48px-detail | pass | 0.351 | >= 0.06 edge density at 48px |
