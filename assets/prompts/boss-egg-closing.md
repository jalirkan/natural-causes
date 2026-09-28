# The Egg, eyes closing

- **Asset id:** `boss-egg-closing`
- **Act:** conception
- **Role:** boss
- **Source:** authored SVG, `tools/art/svg/conception/boss-egg-closing.svg`
- **SVG sha256:** `269bb38524fbf3a9a579cbbdc563a41cb6495bb9fe80b2f5e75e6e06605e6f04`
- **Rasteriser:** sharp 0.34.5 (libvips 8.17.3, librsvg 2.61.2)
- **Render:** 1079.851 dpi, 4× supersampled and area-averaged
- **Rendered:** 2026-09-28T18:52:42.036Z
- **Sprite size:** 384px
- **Tests:** the Egg exactly as boss-egg with its eyes closed: two flat lines where the half-lidded eyes were, the same smile, the same corona

**Why this life stage.** It is the only boss in the game that is beaten by being taken in rather than brought down.

## Description

an enormous smooth round egg cell filling the frame, flat muted deep teal, a thick irregular fringe of blunt stubby finger-like protrusions all the way around it like a lumpy crown or a bad haircut, no two protrusions the same length, one small calm face placed off-centre and low on the huge smooth mass, the eyes closed: two short flat dark lines where the half-lidded eyes were, and the same small closed-mouth knowing smile, everything else identical to boss-egg: the same mass, the same fringe, the same face position, one flat darker tone across the lower third as the only shadow

## Mechanical checks

| Check | Result | Measured | Expected |
|---|---|---|---|
| silhouette-area | pass | 0.7816 | 0.25–0.95 of canvas |
| background-contrast | pass | 0.1901 | >= 0.12 median Oklab L from conception-deep |
| background-contrast-coverage | pass | 0.304 | <= 0.4 of sprite may vanish into conception-deep |
| palette-conformance | pass | 0.0293 | <= 0.0353 Oklab from a palette entry |
| palette-variety | pass | 4 | >= 3 distinct palette colours |
| palette-dominance | pass | 0.4906 | no colour above 0.9 of the sprite |
| readable-48px-silhouette | pass | 0.7882 | >= 0.175 coverage at 48px |
| readable-48px-structure | pass | 6 | >= 3 palette colours still visible at 48px |
| enemy-value-ceiling | pass | 0.8512 | <= 0.856 Oklab L (bone); paper belongs to the player |
| readable-48px-detail | pass | 0.2038 | >= 0.06 edge density at 48px |
