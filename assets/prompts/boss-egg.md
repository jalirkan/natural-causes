# The Egg

- **Asset id:** `boss-egg`
- **Act:** conception
- **Role:** boss
- **Source:** authored SVG, `tools/art/svg/conception/boss-egg.svg`
- **SVG sha256:** `3c687ada52ef510ce5ccb9b34ccf1188329dbe0c7d1436c2f1aaa1baff8160af`
- **Rasteriser:** sharp 0.34.5 (libvips 8.17.3, librsvg 2.61.2)
- **Render:** 1076.278 dpi, 4× supersampled and area-averaged
- **Rendered:** 2026-09-28T23:28:58.473Z
- **Sprite size:** 384px
- **Tests:** does scale hold up; is a boss impressive; does a cute face still read as already decided

**Why this life stage.** It is the only boss in the game that is beaten by being taken in rather than brought down.

## Description

an enormous smooth round cream egg filling the frame, in the greeting-card register, a corona of fourteen blunt stubby teal fingers growing out from under its edge like a sun drawn by a child or a bad haircut, background showing between them, no two fingers the same length and none quite straight, each rounded where it leaves the egg, one small light glint on the upper-left finger, one small face placed off-centre, low and to the right on the huge smooth mass, big half-lidded dark eyes with one small light glint each, pink cheeks, a small closed-mouth knowing smile, serene and faintly amused, not angry, it has already decided, one flat rose crescent low and to the right as the only shadow

## Mechanical checks

| Check | Result | Measured | Expected |
|---|---|---|---|
| silhouette-area | pass | 0.6167 | 0.25–0.95 of canvas |
| background-contrast | pass | 0.4015 | >= 0.12 median Oklab L from conception-deep |
| background-contrast-coverage | pass | 0.1809 | <= 0.4 of sprite may vanish into conception-deep |
| palette-conformance | pass | 0.0293 | <= 0.0353 Oklab from a palette entry |
| palette-variety | pass | 5 | >= 3 distinct palette colours |
| palette-dominance | pass | 0.532 | no colour above 0.9 of the sprite |
| readable-48px-silhouette | pass | 0.628 | >= 0.175 coverage at 48px |
| readable-48px-structure | pass | 7 | >= 3 palette colours still visible at 48px |
| enemy-value-ceiling | pass | 0.8512 | <= 0.856 Oklab L (bone); paper belongs to the player |
| readable-48px-detail | pass | 0.3373 | >= 0.06 edge density at 48px |
