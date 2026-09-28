# Flat-pack

- **Asset id:** `flat-pack`
- **Act:** family
- **Role:** swarm
- **Source:** authored SVG, `tools/art/svg/family/flat-pack.svg`
- **SVG sha256:** `03fecdd741e51b2e3a2255f6ef68737c2e0e7277c372f83efa12fdb6061d3d67`
- **Rasteriser:** sharp 0.34.5 (libvips 8.17.3, librsvg 2.61.2)
- **Render:** 56.039 dpi, 4× supersampled and area-averaged
- **Rendered:** 2026-09-28T10:55:29.432Z
- **Sprite size:** 104px
- **Tests:** the flat box — the only box, the only tape and the widest thing, read side-on crossing fast

**Why this life stage.** Family is the first stage where the heaviest thing in the room is something the player carried in.

## Description

a long flat closed carton seen exactly side-on, twice as wide as it is tall, one strip of tape down its middle, muted tan (#D2C6AC) carton with warm near-black (#2A2521) edges, the tape in flat muted red (#C4472E), the contact threat colour, the only red on it, a face printed on the box as an assembly diagram would be: two small bolt-head dots for eyes looking along the box, not at the viewer, and one short dashed line for a mouth, no lettering, no arrows, no numbers, no purple, no gold, no yellow anywhere

## Mechanical checks

| Check | Result | Measured | Expected |
|---|---|---|---|
| silhouette-area | pass | 0.5121 | 0.12–0.82 of canvas |
| background-contrast | pass | 0.4668 | >= 0.12 median Oklab L from family-deep |
| background-contrast-coverage | pass | 0.1228 | <= 0.4 of sprite may vanish into family-deep |
| palette-conformance | pass | 0 | <= 0.0353 Oklab from a palette entry |
| palette-variety | pass | 3 | >= 2 distinct palette colours |
| palette-dominance | pass | 0.7776 | no colour above 0.97 of the sprite |
| readable-48px-silhouette | pass | 0.5304 | >= 0.084 coverage at 48px |
| readable-48px-structure | pass | 6 | >= 2 palette colours still visible at 48px |
| enemy-value-ceiling | pass | 0.8295 | <= 0.856 Oklab L (bone); paper belongs to the player |
| readable-48px-detail | pass | 0.2476 | >= 0.06 edge density at 48px |
