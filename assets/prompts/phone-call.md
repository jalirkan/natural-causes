# Phone call

- **Asset id:** `phone-call`
- **Act:** family
- **Role:** swarm
- **Source:** authored SVG, `tools/art/svg/family/phone-call.svg`
- **SVG sha256:** `ae4f5de02291635b51c69a4937fbba82fc34847e38c69ccb6b46552b419b9e5c`
- **Rasteriser:** sharp 0.34.5 (libvips 8.17.3, librsvg 2.61.2)
- **Render:** 45.962 dpi, 4× supersampled and area-averaged
- **Rendered:** 2026-09-29T02:41:11.908Z
- **Sprite size:** 80px
- **Tests:** the wall phone — the only cord and the only coil in the act; no gold on it

**Why this life stage.** Family is the first stage where the aimed thing wants nothing from the player but the player, somewhere else.

## Description

an upright wall telephone seen from the front, a tall rounded body with a handset laid across its top and a cord in three loose coils hanging down its right side, muted tan (#D2C6AC) body, the handset and the cord in warm near-black (#2A2521), two small dark dots for eyes on the body under the handset looking up at it and one short flat line for a mouth, not at the viewer, no buttons with numbers, no text, no gold, no yellow, no red, no purple anywhere

## Mechanical checks

| Check | Result | Measured | Expected |
|---|---|---|---|
| silhouette-area | pass | 0.6967 | 0.12–0.82 of canvas |
| background-contrast | pass | 0.4668 | >= 0.12 median Oklab L from family-deep |
| background-contrast-coverage | pass | 0.3142 | <= 0.4 of sprite may vanish into family-deep |
| palette-conformance | pass | 0 | <= 0.0353 Oklab from a palette entry |
| palette-variety | pass | 2 | >= 2 distinct palette colours |
| palette-dominance | pass | 0.6858 | no colour above 0.97 of the sprite |
| readable-48px-silhouette | pass | 0.7283 | >= 0.084 coverage at 48px |
| readable-48px-structure | pass | 4 | >= 2 palette colours still visible at 48px |
| enemy-value-ceiling | pass | 0.8295 | <= 0.856 Oklab L (bone); paper belongs to the player |
| readable-48px-detail | pass | 0.2113 | >= 0.06 edge density at 48px |
