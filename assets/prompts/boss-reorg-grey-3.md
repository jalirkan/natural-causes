# The Reorg, three rows greyed

- **Asset id:** `boss-reorg-grey-3`
- **Act:** office
- **Role:** boss
- **Source:** authored SVG, `tools/art/svg/office/boss-reorg-grey-3.svg`
- **SVG sha256:** `b6f6009d9c0679704b985640a3ec9d3be3b31840aa3f56bcf2219ab26c0f495f`
- **Rasteriser:** sharp 0.34.5 (libvips 8.17.3, librsvg 2.61.2)
- **Render:** 288.000 dpi, 4× supersampled and area-averaged
- **Rendered:** 2026-09-28T19:11:09.281Z
- **Sprite size:** 384px
- **Tests:** the org chart exactly as boss-reorg with the bottom three rows of boxes greyed: those boxes and their faces in warm grey-brown, their connectors still attached, the empty top box never greyed

**Why this life stage.** The Office is the first stage where the structure outranks everyone in it, and damage to it goes grey and stays in the chart.

## Description

a corporate organisational chart drawn as a flat printed diagram, standing upright as if it were a creature, a branching hierarchy tree of separate plain rectangular outlined boxes, four rows deep, widening toward the bottom, exactly as boss-reorg, the bottom three rows of boxes filled in flat warm grey-brown (#6E6353) instead of teal, their small faces in muted tan (#D2C6AC) and their label bars kept in muted tan, the connectors to them still drawn in teal and still attached, every other box in flat muted deep teal (#2F7370), the boss colour, as in boss-reorg, and the empty top box exactly as it is there, never greyed, the connector lines ruled straight, thin, in flat muted deep teal (#2F7370) as in boss-reorg, the only ruled geometry in the act, strictly flat and two-dimensional like a printed chart on a page, no 3D boxes, no text

## Mechanical checks

| Check | Result | Measured | Expected |
|---|---|---|---|
| silhouette-area | pass | 0.4044 | 0.25–0.95 of canvas |
| background-contrast | pass | 0.1261 | >= 0.12 median Oklab L from office-deep |
| background-contrast-coverage | pass | 0.3976 | <= 0.4 of sprite may vanish into office-deep |
| palette-conformance | pass | 0.0293 | <= 0.0353 Oklab from a palette entry |
| palette-variety | pass | 4 | >= 3 distinct palette colours |
| palette-dominance | pass | 0.5526 | no colour above 0.9 of the sprite |
| readable-48px-silhouette | pass | 0.4384 | >= 0.175 coverage at 48px |
| readable-48px-structure | pass | 6 | >= 3 palette colours still visible at 48px |
| enemy-value-ceiling | pass | 0.8512 | <= 0.856 Oklab L (bone); paper belongs to the player |
| readable-48px-detail | pass | 0.7364 | >= 0.06 edge density at 48px |
