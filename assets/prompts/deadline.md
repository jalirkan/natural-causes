# Deadline

- **Asset id:** `deadline`
- **Act:** college
- **Role:** swarm
- **Source:** authored SVG, `tools/art/svg/college/deadline.svg`
- **SVG sha256:** `1bcc21dd1f2b11d558bc8915591df4590ef46b582f1d68300fdcee2821920414`
- **Rasteriser:** sharp 0.34.5 (libvips 8.17.3, librsvg 2.61.2)
- **Render:** 50.747 dpi, 4× supersampled and area-averaged
- **Rendered:** 2026-09-29T02:41:09.362Z
- **Sprite size:** 84px
- **Tests:** the calendar leaf — the only square in the act, and its only red thing

**Why this life stage.** College is where the date first crosses the room on its own schedule and does not slow down for anyone standing in it.

## Description

a square calendar leaf seen flat on, its top edge curled over in a short roll, two round ring holes along the top, flat muted red (#C4472E), the contact threat colour, one solid tone, the only square in the act, the curl and the ring holes in muted tan (#D2C6AC), two small dark dots for eyes low on the sheet and one straight flat line for a mouth, no date, no numbers, no letters, no month name, nothing printed, no purple, no gold, no yellow anywhere

## Mechanical checks

| Check | Result | Measured | Expected |
|---|---|---|---|
| silhouette-area | pass | 0.7765 | 0.12–0.82 of canvas |
| background-contrast | pass | 0.2465 | >= 0.12 median Oklab L from college-deep |
| background-contrast-coverage | pass | 0.077 | <= 0.4 of sprite may vanish into college-deep |
| palette-conformance | pass | 0 | <= 0.0353 Oklab from a palette entry |
| palette-variety | pass | 4 | >= 2 distinct palette colours |
| palette-dominance | pass | 0.7169 | no colour above 0.97 of the sprite |
| readable-48px-silhouette | pass | 0.7856 | >= 0.084 coverage at 48px |
| readable-48px-structure | pass | 6 | >= 2 palette colours still visible at 48px |
| enemy-value-ceiling | pass | 0.8295 | <= 0.856 Oklab L (bone); paper belongs to the player |
| readable-48px-detail | pass | 0.1963 | >= 0.06 edge density at 48px |
