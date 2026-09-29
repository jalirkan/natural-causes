# Homework

- **Asset id:** `homework`
- **Act:** school
- **Role:** swarm
- **Source:** rendered and cut out outside this repo, taken in by `pnpm art:intake` from `assets/raw/homework.png`
- **Model:** `Lykon/dreamshaper-xl-v2-turbo`
- **Seed:** `1`
- **Steps / guidance:** 7 / 2
- **Render size:** 768×768px
- **Generated:** 2026-09-29T04:50:36+00:00
- **Cutter:** rembg isnet-general-use
- **Raw sha256:** `0b80fe91bacf167ffba119413177297b4a2fb44102b62a5e380cd73ffe2be284`
- **Finish:** render
- **Taken in:** 2026-09-29T04:59:50.968Z
- **Sprite size:** 72px
- **Tests:** the wedge — paper that is deliberately not a rectangle, with a face (law 5)

**Why this life stage.** School is the first stage that follows the player home and takes up the part of the day nobody was counting.

## Prompt

```
3D rendered toy-like stack of paper homework sheets with a grumpy cartoon face, an object, no people, soft global illumination, clean matte plastic materials, cute, Pixar-like, plain neutral grey background, centered, full body
```

Negative:

```
text, watermark, blurry, deformed, extra limbs, logo, crowd, photo, realistic
```

## Mechanical checks

| Check | Result | Measured | Expected |
|---|---|---|---|
| silhouette-area | pass | 0.5939 | 0.12–0.82 of canvas |
| background-contrast | pass | 0.2317 | >= 0.12 median Oklab L from school-deep |
| background-contrast-coverage | skipped | — | <= 0.4 of sprite may vanish into school-deep |
| palette-conformance | skipped | — | <= 0.0353 Oklab from a palette entry |
| palette-variety | skipped | — | >= 2 distinct palette colours |
| palette-dominance | skipped | — | no colour above 0.97 of the sprite |
| readable-48px-silhouette | pass | 0.5681 | >= 0.084 coverage at 48px |
| readable-48px-structure | pass | 7 | >= 2 palette colours still visible at 48px |
| enemy-value-ceiling | skipped | — | <= 0.856 Oklab L (bone); paper belongs to the player |
| readable-48px-detail | pass | 0.3653 | >= 0.06 edge density at 48px |
