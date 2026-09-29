# Standardised test

- **Asset id:** `standardised-test`
- **Act:** adolescence
- **Role:** swarm
- **Source:** authored SVG, `tools/art/svg/adolescence/standardised-test.svg`
- **SVG sha256:** `4460c618b473b93b502c53355eb87567948da4615db5e860c437be8bc1616caa`
- **Rasteriser:** sharp 0.34.5 (libvips 8.17.3, librsvg 2.61.2)
- **Render:** 54.954 dpi, 4× supersampled and area-averaged
- **Rendered:** 2026-09-29T02:41:08.588Z
- **Sprite size:** 96px
- **Tests:** the tall sheet — the only rectangle in the act, read by its column of dots

**Why this life stage.** Adolescence is the first stage where one morning with a pencil decides where the player goes next, and the morning was booked before anyone asked if they were ready.

## Description

an upright portrait rectangle, taller than wide, the only rectangle in the act, one column of small round warm near-black (#2A2521) dots down its left edge, exactly one of them filled in, flat muted purple (#7C5C8A), the elite threat colour, one solid tone, two small dark dots for eyes looking straight out at the viewer and one short flat line for a mouth, completely calm, it has all morning, no text, no letters, no numbers, no pencil, no desk, no yellow, no gold, no pink anywhere

## Mechanical checks

| Check | Result | Measured | Expected |
|---|---|---|---|
| silhouette-area | pass | 0.6755 | 0.12–0.82 of canvas |
| background-contrast | pass | 0.1907 | >= 0.12 median Oklab L from adolescence-deep |
| background-contrast-coverage | pass | 0.1418 | <= 0.4 of sprite may vanish into adolescence-deep |
| palette-conformance | pass | 0 | <= 0.0353 Oklab from a palette entry |
| palette-variety | pass | 3 | >= 2 distinct palette colours |
| palette-dominance | pass | 0.8273 | no colour above 0.97 of the sprite |
| readable-48px-silhouette | pass | 0.6858 | >= 0.084 coverage at 48px |
| readable-48px-structure | pass | 3 | >= 2 palette colours still visible at 48px |
| enemy-value-ceiling | pass | 0.8295 | <= 0.856 Oklab L (bone); paper belongs to the player |
| readable-48px-detail | pass | 0.278 | >= 0.06 edge density at 48px |
