# Tuition

- **Asset id:** `tuition`
- **Act:** college
- **Role:** swarm
- **Source:** authored SVG, `tools/art/svg/college/tuition.svg`
- **SVG sha256:** `3748019584cbfbb3488621445aa5a5b7542fc1ddb3b4280c75b7b6bba533fe0a`
- **Rasteriser:** sharp 0.34.5 (libvips 8.17.3, librsvg 2.61.2)
- **Render:** 24.750 dpi, 4× supersampled and area-averaged
- **Rendered:** 2026-09-28T04:07:07.672Z
- **Sprite size:** 44px
- **Tests:** the windowed envelope — the only rectangle wider than tall, read by its window

**Why this life stage.** College is the first stage that takes a share of everything the player earns from then on, and the share does not come off at the end of the act.

## Description

a landscape envelope seen flat on, wider than tall, with a darker address window low on its left side, muted tan (#D2C6AC) paper, the window and the flap lines in warm near-black (#2A2521), nothing legible in the window, the flap folded down across the top with a face on it: two closed eye arcs and one short flat line for a mouth, it does not need to look at you, it has your address, no stamp, no text, no numbers, no red anywhere, no purple, no gold, no yellow anywhere

## Mechanical checks

| Check | Result | Measured | Expected |
|---|---|---|---|
| silhouette-area | pass | 0.6343 | 0.12–0.82 of canvas |
| background-contrast | pass | 0.5096 | >= 0.12 median Oklab L from college-deep |
| background-contrast-coverage | pass | 0.2248 | <= 0.4 of sprite may vanish into college-deep |
| palette-conformance | pass | 0 | <= 0.0353 Oklab from a palette entry |
| palette-variety | pass | 2 | >= 2 distinct palette colours |
| palette-dominance | pass | 0.7752 | no colour above 0.97 of the sprite |
| readable-48px-silhouette | pass | 0.6432 | >= 0.084 coverage at 48px |
| readable-48px-structure | pass | 4 | >= 2 palette colours still visible at 48px |
| enemy-value-ceiling | pass | 0.8295 | <= 0.856 Oklab L (bone); paper belongs to the player |
| readable-48px-detail | pass | 0.3758 | >= 0.06 edge density at 48px |
