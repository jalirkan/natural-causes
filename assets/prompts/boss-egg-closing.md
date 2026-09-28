# The Egg, eyes closing

- **Asset id:** `boss-egg-closing`
- **Act:** conception
- **Role:** boss
- **Source:** authored SVG, `tools/art/svg/conception/boss-egg-closing.svg`
- **SVG sha256:** `3f3d9d176a00bd313ef1aab68aeab35cba487d7e997ed6f251171eec00988188`
- **Rasteriser:** sharp 0.34.5 (libvips 8.17.3, librsvg 2.61.2)
- **Render:** 1076.278 dpi, 4× supersampled and area-averaged
- **Rendered:** 2026-09-28T23:29:00.019Z
- **Sprite size:** 384px
- **Tests:** the Egg exactly as boss-egg with its eyes closed: two lash lines bowed downward where the half-lidded eyes were, the same smile, the same corona

**Why this life stage.** It is the only boss in the game that is beaten by being taken in rather than brought down.

## Description

an enormous smooth round cream egg filling the frame, in the greeting-card register, a corona of fourteen blunt stubby teal fingers growing out from under its edge like a sun drawn by a child, background showing between them, one small face placed off-centre, low and to the right on the huge smooth mass, the eyes closed: two dark lash lines bowed downward where the half-lidded eyes were, the same pink cheeks, the same small closed-mouth knowing smile, everything else identical to boss-egg: the same mass, the same fingers, the same face position, one flat rose crescent low and to the right as the only shadow

## Mechanical checks

| Check | Result | Measured | Expected |
|---|---|---|---|
| silhouette-area | pass | 0.6167 | 0.25–0.95 of canvas |
| background-contrast | pass | 0.4047 | >= 0.12 median Oklab L from conception-deep |
| background-contrast-coverage | pass | 0.1805 | <= 0.4 of sprite may vanish into conception-deep |
| palette-conformance | pass | 0.0293 | <= 0.0353 Oklab from a palette entry |
| palette-variety | pass | 5 | >= 3 distinct palette colours |
| palette-dominance | pass | 0.5474 | no colour above 0.9 of the sprite |
| readable-48px-silhouette | pass | 0.628 | >= 0.175 coverage at 48px |
| readable-48px-structure | pass | 7 | >= 3 palette colours still visible at 48px |
| enemy-value-ceiling | pass | 0.8512 | <= 0.856 Oklab L (bone); paper belongs to the player |
| readable-48px-detail | pass | 0.3196 | >= 0.06 edge density at 48px |
