# The Egg

- **Asset id:** `boss-egg`
- **Act:** conception
- **Role:** boss
- **Source:** authored SVG, `tools/art/svg/conception/boss-egg.svg`
- **SVG sha256:** `018035212b045d0cb4b59291321a8e219b882c67934df83ae63d79254ce1f252`
- **Rasteriser:** sharp 0.34.5 (libvips 8.17.3, librsvg 2.61.2)
- **Render:** 1079.851 dpi, 4× supersampled and area-averaged
- **Rendered:** 2026-09-27T23:32:53.716Z
- **Sprite size:** 384px
- **Tests:** does scale hold up; is a boss impressive

**Why this life stage.** It is the only boss in the game that is beaten by being taken in rather than brought down.

## Description

an enormous smooth round egg cell filling the frame, flat muted deep teal, a thick irregular fringe of blunt stubby finger-like protrusions all the way around it like a lumpy crown or a bad haircut, no two protrusions the same length, one small calm face placed off-centre and low on the huge smooth mass, half-lidded eyes and a small closed-mouth knowing smile, serene and faintly amused, not angry, it has already decided, one flat darker tone across the lower third as the only shadow

## Mechanical checks

| Check | Result | Measured | Expected |
|---|---|---|---|
| silhouette-area | pass | 0.7816 | 0.25–0.95 of canvas |
| background-contrast | pass | 0.1901 | >= 0.12 median Oklab L from conception-deep |
| background-contrast-coverage | pass | 0.3041 | <= 0.4 of sprite may vanish into conception-deep |
| palette-conformance | pass | 0.0293 | <= 0.0353 Oklab from a palette entry |
| palette-variety | pass | 4 | >= 3 distinct palette colours |
| palette-dominance | pass | 0.4869 | no colour above 0.9 of the sprite |
| readable-48px-silhouette | pass | 0.7882 | >= 0.175 coverage at 48px |
| readable-48px-structure | pass | 6 | >= 3 palette colours still visible at 48px |
| enemy-value-ceiling | pass | 0.8512 | <= 0.856 Oklab L (bone); paper belongs to the player |
| readable-48px-detail | pass | 0.2083 | >= 0.06 edge density at 48px |
