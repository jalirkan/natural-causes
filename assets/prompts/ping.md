# Ping

- **Asset id:** `ping`
- **Act:** office
- **Role:** swarm
- **Source:** authored SVG, `tools/art/svg/office/ping.svg`
- **SVG sha256:** `b1a9bacefb5313d4413dca1f1c645c6f627018d5d1ea1a25d12ee533483070fc`
- **Rasteriser:** sharp 0.34.5 (libvips 8.17.3, librsvg 2.61.2)
- **Render:** 22.500 dpi, 4× supersampled and area-averaged
- **Rendered:** 2026-09-28T09:58:08.765Z
- **Sprite size:** 40px
- **Tests:** the bell with a dot — the smallest thing in the act, read by its one dot

**Why this life stage.** The Office is the first stage where every small thing that wants a second of the player gets it, and the seconds add up to the day.

## Description

a small hand bell seen from the side, a rounded dome on a short handle, with one round dot floating just above its right shoulder, muted tan (#D2C6AC) bell, the handle, rim and the dot in warm near-black (#2A2521), no face: a ping has no face, it has a count, and the count is the dot, no text, no numbers, no red, no gold, no yellow, no pale blue-grey anywhere

## Mechanical checks

| Check | Result | Measured | Expected |
|---|---|---|---|
| silhouette-area | pass | 0.5381 | 0.12–0.82 of canvas |
| background-contrast | pass | 0.4266 | >= 0.12 median Oklab L from office-deep |
| background-contrast-coverage | pass | 0 | <= 0.4 of sprite may vanish into office-deep |
| palette-conformance | pass | 0 | <= 0.0353 Oklab from a palette entry |
| palette-variety | pass | 2 | >= 2 distinct palette colours |
| palette-dominance | pass | 0.6063 | no colour above 0.97 of the sprite |
| readable-48px-silhouette | pass | 0.5395 | >= 0.084 coverage at 48px |
| readable-48px-structure | pass | 3 | >= 2 palette colours still visible at 48px |
| enemy-value-ceiling | pass | 0.8295 | <= 0.856 Oklab L (bone); paper belongs to the player |
| readable-48px-detail | pass | 0.1894 | >= 0.06 edge density at 48px |
