# Room

- **Asset id:** `room`
- **Act:** family
- **Role:** swarm
- **Source:** authored SVG, `tools/art/svg/family/room.svg`
- **SVG sha256:** `1313228f73069ac24dc9265cedd8a3a481aa70a0f64811da0c71b4f050a3f229`
- **Rasteriser:** sharp 0.34.5 (libvips 8.17.3, librsvg 2.61.2)
- **Render:** 54.000 dpi, 4× supersampled and area-averaged
- **Rendered:** 2026-09-28T11:03:07.047Z
- **Sprite size:** 96px
- **Tests:** the room — the only square in the act and the only outline with a gap; wallpaper, never a threat colour

**Why this life stage.** Family is the first stage where the place the player lives is built around them while they are standing in it.

## Description

a square room seen from above as a floor plan, its walls drawn in section as two ink lines with the floor showing between them, one door gap in the middle of its bottom side with the door leaf and its quarter-circle swing drawn on the floor inside, the floor in flat muted mustard (#A3812F), the walls in warm near-black (#2A2521), two small dark dots for eyes and one short flat line for a mouth on the floor near the far wall, looking at the door gap, no furniture, no text, no red, no purple, no gold, no yellow, no teal anywhere

## Mechanical checks

| Check | Result | Measured | Expected |
|---|---|---|---|
| silhouette-area | pass | 0.7878 | 0.12–0.82 of canvas |
| background-contrast | pass | 0.2577 | >= 0.12 median Oklab L from family-deep |
| background-contrast-coverage | pass | 0.384 | <= 0.4 of sprite may vanish into family-deep |
| palette-conformance | pass | 0 | <= 0.0353 Oklab from a palette entry |
| palette-variety | pass | 2 | >= 2 distinct palette colours |
| palette-dominance | pass | 0.616 | no colour above 0.97 of the sprite |
| readable-48px-silhouette | pass | 0.8108 | >= 0.084 coverage at 48px |
| readable-48px-structure | pass | 3 | >= 2 palette colours still visible at 48px |
| enemy-value-ceiling | pass | 0.6204 | <= 0.856 Oklab L (bone); paper belongs to the player |
| readable-48px-detail | pass | 0.2899 | >= 0.06 edge density at 48px |
