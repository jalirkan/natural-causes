# White cell

- **Asset id:** `white-cell`
- **Act:** conception
- **Role:** swarm
- **Source:** authored SVG, `tools/art/svg/conception/white-cell.svg`
- **SVG sha256:** `f5e0cea86af2a0c8025988edae507163d8e654304bc9b3aad6bd773bba2ad732`
- **Rasteriser:** sharp 0.34.5 (libvips 8.17.3, librsvg 2.61.2)
- **Render:** 287.869 dpi, 4× supersampled and area-averaged
- **Rendered:** 2026-09-27T22:58:55.461Z
- **Sprite size:** 96px
- **Tests:** the blot silhouette, and a stamp face that must survive 48px

**Why this life stage.** Before the player is anyone at all, there is already a process whose only job is to stop things that look like them.

## Description

a single large round leukocyte cell seen from directly above, filling most of the frame, a round lobed mass with a scalloped irregular edge, the lobes uneven in count and depth so it never resolves into a flower, no tail, no limbs, no spikes, no protrusions, flat muted purple, one darker shadow tone at most, no interior texture whatsoever, one small flat muted-tan oval disc set off-centre on the mass, lying flat on its surface, that disc carries two small dark dots for eyes and one short horizontal line for a mouth and nothing else, the eyes aimed a few degrees off to one side, looking past the viewer rather than at them

## Mechanical checks

| Check | Result | Measured | Expected |
|---|---|---|---|
| silhouette-area | pass | 0.7176 | 0.12–0.82 of canvas |
| background-contrast | pass | 0.4171 | >= 0.12 median Oklab L from conception-deep |
| background-contrast-coverage | pass | 0 | <= 0.4 of sprite may vanish into conception-deep |
| palette-conformance | pass | 0 | <= 0.0353 Oklab from a palette entry |
| palette-variety | pass | 3 | >= 2 distinct palette colours |
| palette-dominance | pass | 0.8243 | no colour above 0.97 of the sprite |
| readable-48px-silhouette | pass | 0.7244 | >= 0.084 coverage at 48px |
| readable-48px-structure | pass | 5 | >= 2 palette colours still visible at 48px |
| enemy-value-ceiling | pass | 0.8295 | <= 0.856 Oklab L (bone); paper belongs to the player |
| readable-48px-detail | pass | 0.2218 | >= 0.06 edge density at 48px |
