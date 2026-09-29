# Substitute teacher

- **Asset id:** `substitute-teacher`
- **Act:** school
- **Role:** swarm
- **Source:** authored SVG, `tools/art/svg/school/substitute-teacher.svg`
- **SVG sha256:** `9c263303b98292d20d2ba7f36ac59adbad7eead4131518512f7bfb415a0847b1`
- **Rasteriser:** sharp 0.34.5 (libvips 8.17.3, librsvg 2.61.2)
- **Render:** 55.254 dpi, 4× supersampled and area-averaged
- **Rendered:** 2026-09-29T02:41:04.514Z
- **Sprite size:** 96px
- **Tests:** the bright hard rectangle in the greeting-card register: a clipboard with rounded corners and straight sides, carried by a cute figure that is still the role

**Why this life stage.** School is the first place the player is judged by someone who does not know who they are, and the substitute is that experience with a lanyard on.

## Description

a substitute schoolteacher drawn in the greeting-card register, standing and reading a clipboard, kid proportions, as every sprite in the register has them: a big round head, a small round body, stubby legs, mitten hands, plain and generic, the role and not a portrait, the head a rounded lump in flat muted sage green (#6B7F53, the act mid tone), wider than tall, no hair, the mitten hands in the same green, a warm grey-brown cardigan (#6E6353) and warm near-black stubby legs and shoes (#2A2521), a dark lanyard on a soft curved cord with a small dark round-cornered badge hanging from it, holding a big clipboard out in front and to one side, so its straight right side and straight bottom make that part of the outline, its corners rounded and its sides straight, the clipboard is the brightest shape in the picture, a flat muted tan (#D2C6AC) and never white, with a dark clip on its top edge and three short rounded ruled lines, no text, the other arm hanging at the side, the face set low and to one side and cast down at the clipboard: two big dark eyes with one small tan glint each, a soft pink blush (#EBA39C) under each eye, a small pleased smile, one small tan glint on the head and one on the cardigan, upper left, never white, pleased with the clipboard and unbothered, indifferent to the viewer and not looking at them, institutional and anonymous, not sad, not nervous, not sympathetic, no yellow, no gold, no olive green anywhere on the figure

## Mechanical checks

| Check | Result | Measured | Expected |
|---|---|---|---|
| silhouette-area | pass | 0.5281 | 0.12–0.82 of canvas |
| background-contrast | pass | 0.1535 | >= 0.12 median Oklab L from school-deep |
| background-contrast-coverage | pass | 0.1954 | <= 0.4 of sprite may vanish into school-deep |
| palette-conformance | pass | 0 | <= 0.0353 Oklab from a palette entry |
| palette-variety | pass | 5 | >= 2 distinct palette colours |
| palette-dominance | pass | 0.3493 | no colour above 0.97 of the sprite |
| readable-48px-silhouette | pass | 0.5399 | >= 0.084 coverage at 48px |
| readable-48px-structure | pass | 6 | >= 2 palette colours still visible at 48px |
| enemy-value-ceiling | pass | 0.8295 | <= 0.856 Oklab L (bone); paper belongs to the player |
| readable-48px-detail | pass | 0.4143 | >= 0.06 edge density at 48px |
