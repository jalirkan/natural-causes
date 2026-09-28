# Hall monitor

- **Asset id:** `hall-monitor`
- **Act:** school
- **Role:** swarm
- **Source:** authored SVG, `tools/art/svg/school/hall-monitor.svg`
- **SVG sha256:** `58ca4e789da134253c409d4a62efb209b935a4ce024b4b77c8891dd4adbcec5e`
- **Rasteriser:** sharp 0.34.5 (libvips 8.17.3, librsvg 2.61.2)
- **Render:** 50.175 dpi, 4× supersampled and area-averaged
- **Rendered:** 2026-09-28T23:02:30.131Z
- **Sprite size:** 88px
- **Tests:** the sash — one hard diagonal that must not read as a badge, on a cute round figure

**Why this life stage.** School is where authority is first handed to someone with no more standing than the player, and it works anyway.

## Description

an upright figure standing squarely and facing forward, drawn in the greeting-card register's kid proportions: a big round head, a small round body, stubby arms and legs, mitten hands, one wide hard-edged diagonal band crossing the body from the left shoulder to the right hip, running all the way off both sides of the body and cut off by them, the band is a flat muted tan (#D2C6AC) with straight parallel edges and no writing on it, the sweater and sleeves in flat elite purple (#7C5C8A), the threat colour School holds for the hall monitor alone, the head a rounded lump in flat muted sage green (#6B7F53, the act mid tone, never the pale pickup tone), wider than tall, no hair, the mitten hands in the same green, warm near-black stubby legs (#2A2521), the face turned along its own route off to one side: two big dark eyes with one small tan glint each, a soft pink blush (#EBA39C) under each eye, a small pleased smile, not looking at the viewer, one small tan glint on the head and one on the sweater, upper left, never white, no badge, no name tag, no lettering, no armband, no rectangle on the chest, no clipboard, no lanyard, no yellow, no gold, no olive green anywhere on the figure

## Mechanical checks

| Check | Result | Measured | Expected |
|---|---|---|---|
| silhouette-area | pass | 0.5032 | 0.12–0.82 of canvas |
| background-contrast | pass | 0.1535 | >= 0.12 median Oklab L from school-deep |
| background-contrast-coverage | pass | 0.2335 | <= 0.4 of sprite may vanish into school-deep |
| palette-conformance | pass | 0 | <= 0.0353 Oklab from a palette entry |
| palette-variety | pass | 5 | >= 2 distinct palette colours |
| palette-dominance | pass | 0.3249 | no colour above 0.97 of the sprite |
| readable-48px-silhouette | pass | 0.5113 | >= 0.084 coverage at 48px |
| readable-48px-structure | pass | 6 | >= 2 palette colours still visible at 48px |
| enemy-value-ceiling | pass | 0.8295 | <= 0.856 Oklab L (bone); paper belongs to the player |
| readable-48px-detail | pass | 0.4016 | >= 0.06 edge density at 48px |
