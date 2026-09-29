# Rival sperm

- **Asset id:** `rival-sperm`
- **Act:** conception
- **Role:** swarm
- **Source:** authored SVG, `tools/art/svg/conception/rival-sperm.svg`
- **SVG sha256:** `50c5aed4f9141386ed3c467f8d03655a95a621194c902b07dea0bb779d6ac9a7`
- **Rasteriser:** sharp 0.34.5 (libvips 8.17.3, librsvg 2.61.2)
- **Render:** 301.871 dpi, 4× supersampled and area-averaged
- **Rendered:** 2026-09-29T02:41:03.019Z
- **Sprite size:** 96px
- **Tests:** the comet in the greeting-card register: does a round face with a tail read at 48px in a crowd

**Why this life stage.** Conception is the only competition the player has already won, so the game opens by making it feel like a commute.

## Description

a single cartoon sperm cell seen from the side, facing right, in the greeting-card register, a big smooth round head, most of the figure, with no hair and no tuft, one wavy tail leaving the back of the head and tapering to a round tip, rounded where it meets the head, two big dark eyes at the front of the head looking ahead along its line, one small light glint in each, pink cheeks under the eyes and a small pleased smile: it is racing you and enjoying it, one small light glint on the head at its upper left, flat muted dusty rose colouring, mid-tone, never pale and never white

## Mechanical checks

| Check | Result | Measured | Expected |
|---|---|---|---|
| silhouette-area | pass | 0.3439 | 0.12–0.82 of canvas |
| background-contrast | pass | 0.177 | >= 0.12 median Oklab L from conception-deep |
| background-contrast-coverage | pass | 0 | <= 0.4 of sprite may vanish into conception-deep |
| palette-conformance | pass | 0 | <= 0.0353 Oklab from a palette entry |
| palette-variety | pass | 4 | >= 2 distinct palette colours |
| palette-dominance | pass | 0.8283 | no colour above 0.97 of the sprite |
| readable-48px-silhouette | pass | 0.3529 | >= 0.084 coverage at 48px |
| readable-48px-structure | pass | 5 | >= 2 palette colours still visible at 48px |
| enemy-value-ceiling | pass | 0.8295 | <= 0.856 Oklab L (bone); paper belongs to the player |
| readable-48px-detail | pass | 0.2961 | >= 0.06 edge density at 48px |
