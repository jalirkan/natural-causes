# Spermicide

- **Asset id:** `spermicide`
- **Act:** conception
- **Role:** swarm
- **Source:** authored SVG, `tools/art/svg/conception/spermicide.svg`
- **SVG sha256:** `cafd36752cbee6e772e628fc9a0c923094f7ff2b53194e898d57b483f6976f4a`
- **Rasteriser:** sharp 0.34.5 (libvips 8.17.3, librsvg 2.61.2)
- **Render:** 220.830 dpi, 4× supersampled and area-averaged
- **Rendered:** 2026-09-28T23:27:18.422Z
- **Sprite size:** 72px
- **Tests:** a droplet that reads as asleep in the greeting-card register, and as red

**Why this life stage.** Conception is the first stage where the environment was made lethal in advance by someone who will never be told whether it worked.

## Description

a single plump teardrop-shaped droplet of liquid, most of it a round bottom, its point cut to a small flat top with rounded corners, in the greeting-card register, flat muted red, one solid colour, one small light glint at its upper left and no other highlight, no bubbles, a face low on the droplet: two closed sleeping eyes, lash lines bowed downward, pink cheeks, a tiny contented mouth, peacefully asleep, unaware, completely unbothered, no arms, no legs, no tail, no ring, no circle around it

## Mechanical checks

| Check | Result | Measured | Expected |
|---|---|---|---|
| silhouette-area | pass | 0.5442 | 0.12–0.82 of canvas |
| background-contrast | pass | 0.154 | >= 0.12 median Oklab L from conception-deep |
| background-contrast-coverage | pass | 0 | <= 0.4 of sprite may vanish into conception-deep |
| palette-conformance | pass | 0 | <= 0.0353 Oklab from a palette entry |
| palette-variety | pass | 4 | >= 2 distinct palette colours |
| palette-dominance | pass | 0.8401 | no colour above 0.97 of the sprite |
| readable-48px-silhouette | pass | 0.5486 | >= 0.084 coverage at 48px |
| readable-48px-structure | pass | 3 | >= 2 palette colours still visible at 48px |
| enemy-value-ceiling | pass | 0.8295 | <= 0.856 Oklab L (bone); paper belongs to the player |
| readable-48px-detail | pass | 0.2337 | >= 0.06 edge density at 48px |
