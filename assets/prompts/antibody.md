# Antibody

- **Asset id:** `antibody`
- **Act:** conception
- **Role:** swarm
- **Source:** authored SVG, `tools/art/svg/conception/antibody.svg`
- **SVG sha256:** `38ebb1166f7fc9f7bbc762b337ce89f1caaec396454b30886e24e91c2dafb69a`
- **Rasteriser:** sharp 0.34.5 (libvips 8.17.3, librsvg 2.61.2)
- **Render:** 121.258 dpi, 4× supersampled and area-averaged
- **Rendered:** 2026-09-28T23:27:19.401Z
- **Sprite size:** 44px
- **Tests:** the Y — the only straight lines in the act, corners rounded, with a face that survives the smallest size in it

**Why this life stage.** Conception is where the first record about the player is opened, and it describes a category rather than a person.

## Description

a bold capital letter Y as a simple flat geometric symbol, three thick straight bars of exactly equal thickness meeting at one central junction, two bars angling upward and apart in a wide V, one bar pointing straight down, all three limbs roughly the same length as each other, short and heavy, not thin, not tapering, perfectly straight edges with every corner slightly rounded, the only curves on the bars, flat glossy near-black, one small light glint on the upper-left bar, one small round muted-tan face centred on the junction where the bars meet, in the greeting-card register, the face carries two small dark eyes with a light glint each, pink cheeks and a small smile, and nothing else, no other detail, no texture, no shading, not a fork, not cutlery, not a utensil, not a tree, not a branch, not a slingshot

## Mechanical checks

| Check | Result | Measured | Expected |
|---|---|---|---|
| silhouette-area | pass | 0.4757 | 0.12–0.82 of canvas |
| background-contrast | pass | 0.1438 | >= 0.12 median Oklab L from conception-deep |
| background-contrast-coverage | pass | 0 | <= 0.4 of sprite may vanish into conception-deep |
| palette-conformance | pass | 0 | <= 0.0353 Oklab from a palette entry |
| palette-variety | pass | 3 | >= 2 distinct palette colours |
| palette-dominance | pass | 0.8947 | no colour above 0.97 of the sprite |
| readable-48px-silhouette | pass | 0.4861 | >= 0.084 coverage at 48px |
| readable-48px-structure | pass | 2 | >= 2 palette colours still visible at 48px |
| enemy-value-ceiling | pass | 0.8295 | <= 0.856 Oklab L (bone); paper belongs to the player |
| readable-48px-detail | pass | 0.1907 | >= 0.06 edge density at 48px |
