# Dodgeball

- **Asset id:** `dodgeball`
- **Act:** school
- **Role:** swarm
- **Source:** authored SVG, `tools/art/svg/school/dodgeball.svg`
- **SVG sha256:** `b4e4c77051611c1d06b5f2a89382d222409ab467732bcbda0bf5863e307c4483`
- **Rasteriser:** sharp 0.34.5 (libvips 8.17.3, librsvg 2.61.2)
- **Render:** 131.623 dpi, 4× supersampled and area-averaged
- **Rendered:** 2026-09-29T02:41:07.736Z
- **Sprite size:** 44px
- **Tests:** the circle — the only perfect circle in the act, cute and still contact red

**Why this life stage.** School is where the player is first hurt by something that was aimed at the room rather than at them.

## Description

a single perfectly round rubber playground ball seen straight on, one flat circle, drawn in the greeting-card register, flat contact red (#C4472E), the threat colour School holds for the dodgeball alone, one solid colour across the whole ball, no seam, no panel lines, no stripe, no texture, nothing on its rim, so the outline stays a perfect circle, one small flat tan glint (#D2C6AC) at the upper left, a tenth of the ball across, never white, a face dead centre: two big dark eyes more than a sixth of the ball across, one small tan glint in each, a soft pink blush (#EBA39C) under each eye, a small pleased smile, pleased about nothing in particular, not angry, not menacing, aimed at the room rather than at the viewer, nothing else in the picture, no hands, no arms, no motion lines, no impact marks, no yellow, no gold, no olive green anywhere

## Mechanical checks

| Check | Result | Measured | Expected |
|---|---|---|---|
| silhouette-area | pass | 0.7836 | 0.12–0.82 of canvas |
| background-contrast | pass | 0.1512 | >= 0.12 median Oklab L from school-deep |
| background-contrast-coverage | pass | 0 | <= 0.4 of sprite may vanish into school-deep |
| palette-conformance | pass | 0 | <= 0.0353 Oklab from a palette entry |
| palette-variety | pass | 4 | >= 2 distinct palette colours |
| palette-dominance | pass | 0.8688 | no colour above 0.97 of the sprite |
| readable-48px-silhouette | pass | 0.7943 | >= 0.084 coverage at 48px |
| readable-48px-structure | pass | 3 | >= 2 palette colours still visible at 48px |
| enemy-value-ceiling | pass | 0.8295 | <= 0.856 Oklab L (bone); paper belongs to the player |
| readable-48px-detail | pass | 0.1395 | >= 0.06 edge density at 48px |
