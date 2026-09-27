# Dodgeball

- **Asset id:** `dodgeball`
- **Act:** school
- **Role:** swarm
- **Source:** authored SVG, `tools/art/svg/school/dodgeball.svg`
- **SVG sha256:** `62d3353f924faa5309e00a530e27b0652a901bd2615ea3ac07cc7d89e11bfe80`
- **Rasteriser:** sharp 0.34.5 (libvips 8.17.3, librsvg 2.61.2)
- **Render:** 126.720 dpi, 4× supersampled and area-averaged
- **Rendered:** 2026-09-27T23:32:53.978Z
- **Sprite size:** 44px
- **Tests:** the circle — the only radially symmetric thing in the act

**Why this life stage.** School is where the player is first hurt by something that was aimed at the room rather than at them.

## Description

a single perfectly round rubber ball seen straight on, one flat circle, flat warm grey-brown (#6E6353), one solid colour across the whole ball, with a muted tan (#D2C6AC) face disc, absolutely no seam, no panel lines, no stripe, no highlight, no shine, no texture, one small face dead centre: two small dark dots for eyes and one short straight horizontal line for a mouth, completely blank and expressionless, not excited, not angry, not moving its face at all, nothing else in the picture, no hands, no arms, no motion lines, no impact marks, no yellow, no gold, no olive green anywhere

## Mechanical checks

| Check | Result | Measured | Expected |
|---|---|---|---|
| silhouette-area | pass | 0.7831 | 0.12–0.82 of canvas |
| background-contrast | pass | 0.4144 | >= 0.12 median Oklab L from school-deep |
| background-contrast-coverage | pass | 0.3404 | <= 0.4 of sprite may vanish into school-deep |
| palette-conformance | pass | 0 | <= 0.0353 Oklab from a palette entry |
| palette-variety | pass | 3 | >= 2 distinct palette colours |
| palette-dominance | pass | 0.5435 | no colour above 0.97 of the sprite |
| readable-48px-silhouette | pass | 0.793 | >= 0.084 coverage at 48px |
| readable-48px-structure | pass | 4 | >= 2 palette colours still visible at 48px |
| enemy-value-ceiling | pass | 0.8295 | <= 0.856 Oklab L (bone); paper belongs to the player |
| readable-48px-detail | pass | 0.229 | >= 0.06 edge density at 48px |
