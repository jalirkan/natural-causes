# The Gym Teacher

- **Asset id:** `boss-gym-teacher`
- **Act:** school
- **Role:** boss
- **Source:** authored SVG, `tools/art/svg/school/boss-gym-teacher.svg`
- **SVG sha256:** `e7bb7879f65b7a776b688ee4d4714cd94a06d32066920ad5397a4206ffb31b0d`
- **Rasteriser:** sharp 0.34.5 (libvips 8.17.3, librsvg 2.61.2)
- **Render:** 91.076 dpi, 4× supersampled and area-averaged
- **Rendered:** 2026-09-27T23:11:41.868Z
- **Sprite size:** 384px

**Why this life stage.** School is where the player is first organised into a crowd by someone who never touches them, and the whistle is how it is done.

## Description

the tallest thing in the act: a standing figure in gym shorts with a whistle on a cord, eight times the player's height, shirt in flat muted deep teal (#2F7370), the boss colour, as Conception's Egg holds it, shorts in warm grey-brown (#6E6353), head, legs and whistle in muted tan (#D2C6AC), cord and face marks in warm near-black (#2A2521), the face is two small flat dots for eyes and one short straight line for a mouth, not looking at the viewer, the role, not a person: no clipboard, no lettering, no badge, no build described, no yellow, no gold anywhere on the figure

## Mechanical checks

| Check | Result | Measured | Expected |
|---|---|---|---|
| silhouette-area | pass | 0.6088 | 0.25–0.95 of canvas |
| background-contrast | pass | 0.1425 | >= 0.12 median Oklab L from school-deep |
| background-contrast-coverage | pass | 0.3554 | <= 0.4 of sprite may vanish into school-deep |
| palette-conformance | pass | 0.0293 | <= 0.0353 Oklab from a palette entry |
| palette-variety | pass | 4 | >= 3 distinct palette colours |
| palette-dominance | pass | 0.3548 | no colour above 0.9 of the sprite |
| readable-48px-silhouette | pass | 0.6202 | >= 0.175 coverage at 48px |
| readable-48px-structure | pass | 7 | >= 3 palette colours still visible at 48px |
| enemy-value-ceiling | pass | 0.8512 | <= 0.856 Oklab L (bone); paper belongs to the player |
| readable-48px-detail | pass | 0.4532 | >= 0.06 edge density at 48px |
