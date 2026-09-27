# Hall monitor

- **Asset id:** `hall-monitor`
- **Act:** school
- **Role:** swarm
- **Source:** authored SVG, `tools/art/svg/school/hall-monitor.svg`
- **SVG sha256:** `33c6027bd3dafc9b8aef6f9b1270810759723c80867c064b55b6c1b3898812a4`
- **Rasteriser:** sharp 0.34.5 (libvips 8.17.3, librsvg 2.61.2)
- **Render:** 51.104 dpi, 4× supersampled and area-averaged
- **Rendered:** 2026-09-27T23:25:20.033Z
- **Sprite size:** 88px
- **Tests:** the sash — one hard diagonal that must not read as a badge

**Why this life stage.** School is where authority is first handed to someone with no more standing than the player, and it works anyway.

## Description

an upright figure standing squarely and facing forward, drawn as a plain mid-century institutional pictogram, one wide hard-edged diagonal band crossing the whole body from shoulder to hip, running all the way off both sides of the body and cut off by them, the band is a flat single tone with straight parallel edges and no writing on it, a simplified geometric body, plain and generic, more diagram than portrait, the face is two small flat dots for eyes and one short straight line for a mouth, no eyebrows, looking along its own route off to one side, not at the viewer, completely indifferent and unbothered, flat muted sage green body (#6B7F53, the act mid tone, never the pale pickup tone) with the band in flat muted tan (#D2C6AC), no badge, no name tag, no lettering, no armband, no rectangle on the chest, no clipboard, no lanyard, no yellow, no gold, no olive green anywhere on the figure

## Mechanical checks

| Check | Result | Measured | Expected |
|---|---|---|---|
| silhouette-area | pass | 0.6068 | 0.12–0.82 of canvas |
| background-contrast | pass | 0.1466 | >= 0.12 median Oklab L from school-deep |
| background-contrast-coverage | pass | 0.3677 | <= 0.4 of sprite may vanish into school-deep |
| palette-conformance | pass | 0 | <= 0.0353 Oklab from a palette entry |
| palette-variety | pass | 4 | >= 2 distinct palette colours |
| palette-dominance | pass | 0.3677 | no colour above 0.97 of the sprite |
| readable-48px-silhouette | pass | 0.615 | >= 0.084 coverage at 48px |
| readable-48px-structure | pass | 6 | >= 2 palette colours still visible at 48px |
| enemy-value-ceiling | pass | 0.8295 | <= 0.856 Oklab L (bone); paper belongs to the player |
| readable-48px-detail | pass | 0.3066 | >= 0.06 edge density at 48px |
