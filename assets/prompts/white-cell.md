# White cell

- **Asset id:** `white-cell`
- **Act:** conception
- **Role:** swarm
- **Source:** authored SVG, `tools/art/svg/conception/white-cell.svg`
- **SVG sha256:** `7051d0f066c17ad49ce7afe70cf81506f936c3435860a6f8715b9df1cba08ce6`
- **Rasteriser:** sharp 0.34.5 (libvips 8.17.3, librsvg 2.61.2)
- **Render:** 276.480 dpi, 4× supersampled and area-averaged
- **Rendered:** 2026-09-28T23:27:17.441Z
- **Sprite size:** 96px
- **Tests:** the blot in the greeting-card register: a purple puff that stays purple under the contrast floor, with a face that survives 48px

**Why this life stage.** Before the player is anyone at all, there is already a process whose only job is to stop things that look like them.

## Description

a single large round leukocyte cell seen from directly above, filling most of the frame, in the greeting-card register, a soft round mass of eight lobes with a scalloped irregular edge, the lobes uneven in size and spacing so it never resolves into a flower, every notch rounded, no tail, no limbs, no spikes, no protrusions, a flat muted purple body inside an uneven rose skin, thickest at the upper left, where one small light glint sits, a round face on the purple, high and to the right of the middle: two big dark eyes with one small light glint each, pink cheeks, a small contented smile, the eyes gazing past the viewer rather than at them: it is not coming for you, it is going where it was going

## Mechanical checks

| Check | Result | Measured | Expected |
|---|---|---|---|
| silhouette-area | pass | 0.6617 | 0.12–0.82 of canvas |
| background-contrast | pass | 0.1438 | >= 0.12 median Oklab L from conception-deep |
| background-contrast-coverage | pass | 0.3745 | <= 0.4 of sprite may vanish into conception-deep |
| palette-conformance | pass | 0 | <= 0.0353 Oklab from a palette entry |
| palette-variety | pass | 5 | >= 2 distinct palette colours |
| palette-dominance | pass | 0.4508 | no colour above 0.97 of the sprite |
| readable-48px-silhouette | pass | 0.6684 | >= 0.084 coverage at 48px |
| readable-48px-structure | pass | 5 | >= 2 palette colours still visible at 48px |
| enemy-value-ceiling | pass | 0.8295 | <= 0.856 Oklab L (bone); paper belongs to the player |
| readable-48px-detail | pass | 0.2325 | >= 0.06 edge density at 48px |
