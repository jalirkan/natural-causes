# Commute

- **Asset id:** `commute`
- **Act:** office
- **Role:** swarm
- **Source:** authored SVG, `tools/art/svg/office/commute.svg`
- **SVG sha256:** `59039c6a7afe95af7209a869b2992d540d980daf22868a84aa7234c0a899bdba`
- **Rasteriser:** sharp 0.34.5 (libvips 8.17.3, librsvg 2.61.2)
- **Render:** 59.451 dpi, 4× supersampled and area-averaged
- **Rendered:** 2026-09-29T02:41:10.187Z
- **Sprite size:** 104px
- **Tests:** the carriage — the only wheels in the act, and the widest thing, read side-on crossing fast

**Why this life stage.** The Office is the first stage where the same thing crosses the room twice a day at a speed set by nobody in it.

## Description

a long low commuter rail carriage seen exactly side-on, a rounded box on two small wheel-sets, three square windows along its side, flat muted red (#C4472E), the contact threat colour, one solid tone, the windows in muted tan (#D2C6AC) with nothing in them, the wheels in warm near-black (#2A2521), the front window is the face: two small dark dots looking forward along the track and one short flat line for a mouth, not at the viewer, nobody inside, no driver, no lettering, no number, no purple, no gold, no yellow, no pale blue-grey anywhere

## Mechanical checks

| Check | Result | Measured | Expected |
|---|---|---|---|
| silhouette-area | pass | 0.352 | 0.12–0.82 of canvas |
| background-contrast | pass | 0.1635 | >= 0.12 median Oklab L from office-deep |
| background-contrast-coverage | pass | 0.0121 | <= 0.4 of sprite may vanish into office-deep |
| palette-conformance | pass | 0 | <= 0.0353 Oklab from a palette entry |
| palette-variety | pass | 4 | >= 2 distinct palette colours |
| palette-dominance | pass | 0.5758 | no colour above 0.97 of the sprite |
| readable-48px-silhouette | pass | 0.3568 | >= 0.084 coverage at 48px |
| readable-48px-structure | pass | 5 | >= 2 palette colours still visible at 48px |
| enemy-value-ceiling | pass | 0.8295 | <= 0.856 Oklab L (bone); paper belongs to the player |
| readable-48px-detail | pass | 0.3495 | >= 0.06 edge density at 48px |
