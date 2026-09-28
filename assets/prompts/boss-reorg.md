# The Reorg

- **Asset id:** `boss-reorg`
- **Act:** office
- **Role:** boss
- **Source:** authored SVG, `tools/art/svg/office/boss-reorg.svg`
- **SVG sha256:** `98b46ae5b027157f3ce105906023df0eb7508eed9139e5c8f3c7eedc3c163765`
- **Rasteriser:** sharp 0.34.5 (libvips 8.17.3, librsvg 2.61.2)
- **Render:** 288.000 dpi, 4× supersampled and area-averaged
- **Rendered:** 2026-09-28T10:03:54.680Z
- **Sprite size:** 384px
- **Tests:** can the style render an abstraction as a monster — THE REAL TEST

**Why this life stage.** The Office is the first stage where the player's life is decided by a diagram that somebody else is allowed to edit.

## Description

a corporate organisational chart drawn as a flat printed diagram, standing upright as if it were a creature, a branching hierarchy tree of separate plain rectangular outlined boxes, four rows deep, widening toward the bottom, the boxes are clearly separated from one another with empty space between them, never touching and never stacked, thin straight vertical and horizontal connector lines join each box down to the boxes below it, the connector lines clearly visible against the background, each box contains one small flat deadpan face and a short solid blank label bar beneath the face, the faces look at each other or upward, none of them looking at the viewer, one slightly larger box alone at the very top of the tree is completely empty, no face and no label bar, strictly flat and two-dimensional like a printed chart on a page, not a stack of boxes, not a pile of crates, not a chest of drawers, not cubes, not a pyramid, no 3D boxes

## Mechanical checks

| Check | Result | Measured | Expected |
|---|---|---|---|
| silhouette-area | pass | 0.4044 | 0.25–0.95 of canvas |
| background-contrast | pass | 0.1261 | >= 0.12 median Oklab L from office-deep |
| background-contrast-coverage | pass | 0.3872 | <= 0.4 of sprite may vanish into office-deep |
| palette-conformance | pass | 0.0293 | <= 0.0353 Oklab from a palette entry |
| palette-variety | pass | 3 | >= 3 distinct palette colours |
| palette-dominance | pass | 0.5876 | no colour above 0.9 of the sprite |
| readable-48px-silhouette | pass | 0.4384 | >= 0.175 coverage at 48px |
| readable-48px-structure | pass | 5 | >= 3 palette colours still visible at 48px |
| enemy-value-ceiling | pass | 0.8512 | <= 0.856 Oklab L (bone); paper belongs to the player |
| readable-48px-detail | pass | 0.7019 | >= 0.06 edge density at 48px |
