# Clique

- **Asset id:** `clique`
- **Act:** school
- **Role:** swarm
- **Source:** authored SVG, `tools/art/svg/school/clique.svg`
- **SVG sha256:** `b1a6769706e8645754e8db3e7870cd3146cea8d63f659260bfe806ad7ea1b89e`
- **Rasteriser:** sharp 0.34.5 (libvips 8.17.3, librsvg 2.61.2)
- **Render:** 222.158 dpi, 4× supersampled and area-averaged
- **Rendered:** 2026-09-27T23:32:53.949Z
- **Sprite size:** 88px
- **Tests:** the cluster — one enemy that must not read as four

**Why this life stage.** School is the first place that has an inside, and the player finds out where they are by walking into the edge of it.

## Description

a single wide lumpy mass with four heads growing out of the top of it, fused together into one body at the shoulders, one continuous outline around the whole group, no gaps between them and no space to pass through, the heads at slightly different heights, all turned the same way and all looking off to one side, every head has exactly the same face: two small flat dots for eyes and one short straight line for a mouth, no eyebrows, no arms, no legs, no hands, no bags, no clothing detail of any kind, flat muted olive-grey green with one darker tone as the only shadow, completely blank and unbothered, not looking at the viewer, not reacting to anything, no yellow, no gold, no pale yellow-green anywhere

## Mechanical checks

| Check | Result | Measured | Expected |
|---|---|---|---|
| silhouette-area | pass | 0.6529 | 0.12–0.82 of canvas |
| background-contrast | pass | 0.1535 | >= 0.12 median Oklab L from school-deep |
| background-contrast-coverage | pass | 0.2765 | <= 0.4 of sprite may vanish into school-deep |
| palette-conformance | pass | 0 | <= 0.0353 Oklab from a palette entry |
| palette-variety | pass | 4 | >= 2 distinct palette colours |
| palette-dominance | pass | 0.3331 | no colour above 0.97 of the sprite |
| readable-48px-silhouette | pass | 0.6706 | >= 0.084 coverage at 48px |
| readable-48px-structure | pass | 6 | >= 2 palette colours still visible at 48px |
| enemy-value-ceiling | pass | 0.8295 | <= 0.856 Oklab L (bone); paper belongs to the player |
| readable-48px-detail | pass | 0.3063 | >= 0.06 edge density at 48px |
