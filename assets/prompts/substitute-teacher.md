# Substitute teacher

- **Asset id:** `substitute-teacher`
- **Act:** school
- **Role:** swarm
- **Source:** authored SVG, `tools/art/svg/school/substitute-teacher.svg`
- **SVG sha256:** `bbe19c231b7a07948e7ce1375890672eac0bafd85399a2b582ac9e41b5e677f3`
- **Rasteriser:** sharp 0.34.5 (libvips 8.17.3, librsvg 2.61.2)
- **Render:** 53.059 dpi, 4× supersampled and area-averaged
- **Rendered:** 2026-09-27T23:30:15.809Z
- **Sprite size:** 96px
- **Tests:** faces, humour, human characters — THE REAL TEST

**Why this life stage.** School is the first place the player is judged by someone who does not know who they are, and the substitute is that experience with a lanyard on.

## Description

a substitute schoolteacher drawn as a plain mid-century institutional pictogram, standing and facing forward, an ordinary adult figure of average unremarkable build, a simplified geometric body, plain and generic, more diagram than portrait, a flat muted sage green cardigan (#6B7F53, the act mid tone) with two small dark buttons, the head a rounded lump in the same green, no hair, warm grey-brown trousers (#6E6353) and warm near-black shoes (#2A2521), a plain dark lanyard loop around the neck with a small dark round-cornered badge hanging from it, holding a large clipboard up in front of the chest in one hand and off to one side, so its square corners make that edge of the outline, the clipboard is the brightest and hardest-edged shape in the picture, a flat muted tan (#D2C6AC) and never white, a dark clip on its top edge and three short ruled lines on the sheet, no text, the other arm hanging at the side, the head tipped toward the clipboard, reading it: two half-lidded eyes and one short straight line for a mouth, set low and to one side, no eyebrows, no expression whatsoever, completely indifferent, unbothered, looking down at the clipboard and not at the viewer, institutional and anonymous, not sad, not nervous, not sympathetic, no yellow, no gold, no olive green anywhere on the figure

## Mechanical checks

| Check | Result | Measured | Expected |
|---|---|---|---|
| silhouette-area | pass | 0.4531 | 0.12–0.82 of canvas |
| background-contrast | pass | 0.1466 | >= 0.12 median Oklab L from school-deep |
| background-contrast-coverage | pass | 0.2174 | <= 0.4 of sprite may vanish into school-deep |
| palette-conformance | pass | 0 | <= 0.0353 Oklab from a palette entry |
| palette-variety | pass | 4 | >= 2 distinct palette colours |
| palette-dominance | pass | 0.2931 | no colour above 0.97 of the sprite |
| readable-48px-silhouette | pass | 0.4588 | >= 0.084 coverage at 48px |
| readable-48px-structure | pass | 6 | >= 2 palette colours still visible at 48px |
| enemy-value-ceiling | pass | 0.8295 | <= 0.856 Oklab L (bone); paper belongs to the player |
| readable-48px-detail | pass | 0.4628 | >= 0.06 edge density at 48px |
