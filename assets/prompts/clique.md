# Clique

- **Asset id:** `clique`
- **Act:** school
- **Role:** swarm
- **Source:** authored SVG, `tools/art/svg/school/clique.svg`
- **SVG sha256:** `aca3d45d7b7eabdb45ff5fd5b3e0e852e6596d8a85ff3f836bbdea2c57e8cfd2`
- **Rasteriser:** sharp 0.34.5 (libvips 8.17.3, librsvg 2.61.2)
- **Render:** 212.753 dpi, 4× supersampled and area-averaged
- **Rendered:** 2026-09-29T02:41:07.712Z
- **Sprite size:** 88px
- **Tests:** the cluster — one enemy that must not read as four, the same cute face four times

**Why this life stage.** School is the first place that has an inside, and the player finds out where they are by walking into the edge of it.

## Description

a single soft round mass with four big round heads on top of it, fused together into one body at the shoulders, drawn in the greeting-card register, one continuous outline around the whole group, no gaps between them and no space to pass through, the heads at slightly different heights, each rimmed in dark where it meets the next, all turned the same way and all looking off to one side, every head has exactly the same face: two big dark eyes with one small tan glint each, a soft pink blush (#EBA39C) under each eye, a small pleased smile, no arms, no hands, no bags, no clothing detail, a row of little dark feet underneath, a pair under each head, flat muted sage green heads and body (#6B7F53), one warm grey-brown tone (#6E6353) across the lower third as the only shadow, one small tan glint on each head and one on the body, upper left, never white, content and unbothered, not looking at the viewer, not reacting to anything, no yellow, no gold, no pale yellow-green anywhere

## Mechanical checks

| Check | Result | Measured | Expected |
|---|---|---|---|
| silhouette-area | pass | 0.5985 | 0.12–0.82 of canvas |
| background-contrast | pass | 0.1535 | >= 0.12 median Oklab L from school-deep |
| background-contrast-coverage | pass | 0.1297 | <= 0.4 of sprite may vanish into school-deep |
| palette-conformance | pass | 0 | <= 0.0353 Oklab from a palette entry |
| palette-variety | pass | 5 | >= 2 distinct palette colours |
| palette-dominance | pass | 0.5791 | no colour above 0.97 of the sprite |
| readable-48px-silhouette | pass | 0.6094 | >= 0.084 coverage at 48px |
| readable-48px-structure | pass | 5 | >= 2 palette colours still visible at 48px |
| enemy-value-ceiling | pass | 0.8295 | <= 0.856 Oklab L (bone); paper belongs to the player |
| readable-48px-detail | pass | 0.3666 | >= 0.06 edge density at 48px |
