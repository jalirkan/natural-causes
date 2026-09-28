# The Egg, corona parting

- **Asset id:** `boss-egg-parted`
- **Act:** conception
- **Role:** boss
- **Source:** authored SVG, `tools/art/svg/conception/boss-egg-parted.svg`
- **SVG sha256:** `be2d8a4256e0e7fe329cf0a415c4a517686f9603cac8dd6b304c40008e5d5315`
- **Rasteriser:** sharp 0.34.5 (libvips 8.17.3, librsvg 2.61.2)
- **Render:** 1079.851 dpi, 4× supersampled and area-averaged
- **Rendered:** 2026-09-28T18:56:19.513Z
- **Sprite size:** 384px
- **Tests:** the Egg exactly as boss-egg-closing with the corona parted: the fringe opened in one gap on the side the face looks toward, the eyes closed

**Why this life stage.** It is the only boss in the game that is beaten by being taken in rather than brought down.

## Description

an enormous smooth round egg cell filling the frame, flat muted deep teal, a thick irregular fringe of blunt stubby finger-like protrusions all the way around it like a lumpy crown or a bad haircut, no two protrusions the same length, the fringe of protrusions parted in one clear gap on the side the face looks toward, the protrusions either side of the gap leaning away from it, one small calm face placed off-centre and low on the huge smooth mass, the eyes closed as two short flat dark lines, the same knowing smile, everything else identical to boss-egg, one flat darker tone across the lower third as the only shadow

## Mechanical checks

| Check | Result | Measured | Expected |
|---|---|---|---|
| silhouette-area | pass | 0.7486 | 0.25–0.95 of canvas |
| background-contrast | pass | 0.4015 | >= 0.12 median Oklab L from conception-deep |
| background-contrast-coverage | pass | 0.2739 | <= 0.4 of sprite may vanish into conception-deep |
| palette-conformance | pass | 0.0293 | <= 0.0353 Oklab from a palette entry |
| palette-variety | pass | 4 | >= 3 distinct palette colours |
| palette-dominance | pass | 0.5122 | no colour above 0.9 of the sprite |
| readable-48px-silhouette | pass | 0.7552 | >= 0.175 coverage at 48px |
| readable-48px-structure | pass | 6 | >= 3 palette colours still visible at 48px |
| enemy-value-ceiling | pass | 0.8512 | <= 0.856 Oklab L (bone); paper belongs to the player |
| readable-48px-detail | pass | 0.2131 | >= 0.06 edge density at 48px |
