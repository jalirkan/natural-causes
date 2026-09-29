# The player — school age

- **Asset id:** `player-school`
- **Act:** school
- **Role:** player
- **Source:** rendered and cut out outside this repo, taken in by `pnpm art:intake` from `assets/raw/player-school.png`
- **Model:** `Lykon/dreamshaper-xl-v2-turbo`
- **Seed:** `1`
- **Steps / guidance:** 7 / 2
- **Render size:** 768×768px
- **Generated:** 2026-09-29T04:49:19+00:00
- **Cutter:** rembg isnet-general-use
- **Raw sha256:** `b3112c31654b8dc4434a15c923dc14b01e102fbbc383613eddcff0d1e99bd94f`
- **Finish:** render
- **Taken in:** 2026-09-29T04:59:51.027Z
- **Sprite size:** 112px
- **Tests:** G-003 and G-053 at five: the base drawing, whose head every act copies verbatim, and the figure every act is the same size as

## Prompt

```
3D rendered toy-like small kid figure, round head, one big tuft of hair sticking straight up, t-shirt and shorts, soft global illumination, clean matte plastic materials, cute, Pixar-like, plain neutral grey background, centered, full body
```

Negative:

```
text, watermark, blurry, deformed, extra limbs, logo, crowd, photo, realistic
```

## Mechanical checks

| Check | Result | Measured | Expected |
|---|---|---|---|
| silhouette-area | pass | 0.2537 | 0.12–0.82 of canvas |
| background-contrast | pass | 0.1404 | >= 0.12 median Oklab L from school-deep |
| background-contrast-coverage | skipped | — | <= 0.4 of sprite may vanish into school-deep |
| palette-conformance | skipped | — | <= 0.0353 Oklab from a palette entry |
| palette-variety | skipped | — | >= 2 distinct palette colours |
| palette-dominance | skipped | — | no colour above 0.97 of the sprite |
| readable-48px-silhouette | pass | 0.2413 | >= 0.084 coverage at 48px |
| readable-48px-structure | pass | 11 | >= 2 palette colours still visible at 48px |
| readable-48px-detail | pass | 0.4906 | >= 0.06 edge density at 48px |
