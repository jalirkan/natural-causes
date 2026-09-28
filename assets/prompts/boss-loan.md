# The Loan

- **Asset id:** `boss-loan`
- **Act:** college
- **Role:** boss
- **Source:** authored SVG, `tools/art/svg/college/boss-loan.svg`
- **SVG sha256:** `47fac872b1212785d0f532367c784e582e669ff5101dff4c6181755c1f83fafc`
- **Rasteriser:** sharp 0.34.5 (libvips 8.17.3, librsvg 2.61.2)
- **Render:** 1089.253 dpi, 4× supersampled and area-averaged
- **Rendered:** 2026-09-28T04:22:59.830Z
- **Sprite size:** 384px
- **Tests:** the tape — boss teal at boss scale, a paper tape curling off the top of the frame, gold only on its figures

**Why this life stage.** College is the first stage that ends on a number the player will still be paying when the act is long over.

## Description

a boxy adding machine seen from the front at boss scale, a wide flat body with a row of round keys, the only curl in the act rising out of its top, flat muted deep teal (#2F7370), the boss colour, one solid tone with warm near-black (#2A2521) key rims, a paper tape in muted tan (#D2C6AC) rising from a slot in the top, curling once and running off the top edge of the frame, short flat marks in muted gold (#D69A3C) down the tape as figures, never legible digits, a face on the front panel above the keys: two open dark dots for eyes and one short flat line for a mouth, patient, no hands, no desk, no coins, no dollar signs, no text, no red, no purple anywhere

## Mechanical checks

| Check | Result | Measured | Expected |
|---|---|---|---|
| silhouette-area | pass | 0.4611 | 0.25–0.95 of canvas |
| background-contrast | pass | 0.1882 | >= 0.12 median Oklab L from college-deep |
| background-contrast-coverage | pass | 0.3158 | <= 0.4 of sprite may vanish into college-deep |
| palette-conformance | pass | 0.0293 | <= 0.0353 Oklab from a palette entry |
| palette-variety | pass | 4 | >= 3 distinct palette colours |
| palette-dominance | pass | 0.5033 | no colour above 0.9 of the sprite |
| readable-48px-silhouette | pass | 0.4688 | >= 0.175 coverage at 48px |
| readable-48px-structure | pass | 6 | >= 3 palette colours still visible at 48px |
| enemy-value-ceiling | pass | 0.8512 | <= 0.856 Oklab L (bone); paper belongs to the player |
| readable-48px-detail | pass | 0.4722 | >= 0.06 edge density at 48px |
