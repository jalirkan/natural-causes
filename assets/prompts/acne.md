# Acne

- **Asset id:** `acne`
- **Act:** adolescence
- **Role:** swarm
- **Source:** authored SVG, `tools/art/svg/adolescence/acne.svg`
- **SVG sha256:** `4377b5f23960a57dd08c90383efa9bf415950a896f0b10ecdcfa1e722ca70d23`
- **Rasteriser:** sharp 0.34.5 (libvips 8.17.3, librsvg 2.61.2)
- **Render:** 24.750 dpi, 4× supersampled and area-averaged
- **Rendered:** 2026-09-27T23:44:32.835Z
- **Sprite size:** 44px
- **Tests:** the dome — the smallest thing in the act; raise the size, never add detail

**Why this life stage.** Adolescence is the first stage where the player's own body gets to every important moment first, and it cannot be shot because it is theirs.

## Description

a low half-circle dome on a flat base, wider than tall, the smallest thing in the act, flat warm grey-brown (#6E6353), one solid tone, with one round muted tan (#D2C6AC) dot on the very top, two small dark dots for eyes looking straight out at the viewer and a small proud closed smile, it has been waiting for today, the spot alone: no face around it, no cheek, no skin, nothing it sits on, not red, no pink, no yellow, no gold

## Mechanical checks

| Check | Result | Measured | Expected |
|---|---|---|---|
| silhouette-area | pass | 0.4132 | 0.12–0.82 of canvas |
| background-contrast | pass | 0.1709 | >= 0.12 median Oklab L from adolescence-deep |
| background-contrast-coverage | pass | 0.1675 | <= 0.4 of sprite may vanish into adolescence-deep |
| palette-conformance | pass | 0 | <= 0.0353 Oklab from a palette entry |
| palette-variety | pass | 3 | >= 2 distinct palette colours |
| palette-dominance | pass | 0.7875 | no colour above 0.97 of the sprite |
| readable-48px-silhouette | pass | 0.4293 | >= 0.084 coverage at 48px |
| readable-48px-structure | pass | 4 | >= 2 palette colours still visible at 48px |
| enemy-value-ceiling | pass | 0.8295 | <= 0.856 Oklab L (bone); paper belongs to the player |
| readable-48px-detail | pass | 0.3073 | >= 0.06 edge density at 48px |
