# The Gym Teacher

- **Asset id:** `boss-gym-teacher`
- **Act:** school
- **Role:** boss
- **Source:** authored SVG, `tools/art/svg/school/boss-gym-teacher.svg`
- **SVG sha256:** `cc0139e01165605c7d52f48da7d1eb5dc4a2b9e39f3d3dc48ed5209b04e7330c`
- **Rasteriser:** sharp 0.34.5 (libvips 8.17.3, librsvg 2.61.2)
- **Render:** 92.933 dpi, 4× supersampled and area-averaged
- **Rendered:** 2026-09-29T02:41:08.463Z
- **Sprite size:** 384px

**Why this life stage.** School is where the player is first organised into a crowd by someone who never touches them, and the whistle is how it is done.

## Description

the tallest thing in the act: a standing figure in gym shorts with a whistle on a cord, eight times the player's height, drawn in the greeting-card register's kid proportions: a big round head, a round body, stubby arms and legs, mitten fists, both fists on the hips with the elbows out and the hands empty: the whistle is the only thing it carries, shirt and sleeves in flat muted deep teal (#2F7370), the boss colour, as Conception's Egg holds it, round gym shorts in flat muted tan (#D2C6AC) with a teal stripe down each side, soft and never a hard rectangle, knee-high tan tube socks with two teal stripes each, warm near-black sneakers (#2A2521) with tan soles, toes turned out, the head, forearms and fists in flat muted sage green (#6B7F53, the act mid tone), no hair, a tan whistle, a barrel and a mouthpiece, on a soft dark curved cord around the neck, the face looking off to one side, not at the viewer: two big dark eyes with one small tan glint each, a soft pink blush (#EBA39C) under each eye, a small pleased smile, one small tan glint on the head and one on the shirt, upper left, never white, the role, not a person: no clipboard, no stopwatch, no lettering, no badge, no yellow, no gold anywhere on the figure

## Mechanical checks

| Check | Result | Measured | Expected |
|---|---|---|---|
| silhouette-area | pass | 0.489 | 0.25–0.95 of canvas |
| background-contrast | pass | 0.1501 | >= 0.12 median Oklab L from school-deep |
| background-contrast-coverage | pass | 0.2967 | <= 0.4 of sprite may vanish into school-deep |
| palette-conformance | pass | 0.0293 | <= 0.0353 Oklab from a palette entry |
| palette-variety | pass | 5 | >= 3 distinct palette colours |
| palette-dominance | pass | 0.2963 | no colour above 0.9 of the sprite |
| readable-48px-silhouette | pass | 0.5009 | >= 0.175 coverage at 48px |
| readable-48px-structure | pass | 7 | >= 3 palette colours still visible at 48px |
| enemy-value-ceiling | pass | 0.8512 | <= 0.856 Oklab L (bone); paper belongs to the player |
| readable-48px-detail | pass | 0.3874 | >= 0.06 edge density at 48px |
