# The Gym Teacher

- **Asset id:** `boss-gym-teacher`
- **Act:** school
- **Role:** boss
- **Source:** rendered and cut out outside this repo, taken in by `pnpm art:intake` from `assets/raw/boss-gym-teacher.png`
- **Model:** `Lykon/dreamshaper-xl-v2-turbo`
- **Seed:** `1`
- **Steps / guidance:** 7 / 2
- **Render size:** 768×768px
- **Generated:** 2026-09-29T04:53:19+00:00
- **Cutter:** rembg isnet-general-use
- **Raw sha256:** `9f5d388af2051d8b867324ac32f6a05ad71dbbadab4cd6ac66ec906fe729299c`
- **Finish:** render
- **Taken in:** 2026-09-29T04:59:51.130Z
- **Sprite size:** 384px

**Why this life stage.** School is where the player is first organised into a crowd by someone who never touches them, and the whistle is how it is done.

## Prompt

```
3D rendered toy-like big burly gym teacher figure with a whistle on a cord, short shorts, tube socks, hands on hips, soft global illumination, clean matte plastic materials, cute, Pixar-like, plain neutral grey background, centered, full body
```

Negative:

```
text, watermark, blurry, deformed, extra limbs, logo, crowd, photo, realistic
```

## Mechanical checks

| Check | Result | Measured | Expected |
|---|---|---|---|
| silhouette-area | pass | 0.3569 | 0.25–0.95 of canvas |
| background-contrast | pass | 0.213 | >= 0.12 median Oklab L from school-deep |
| background-contrast-coverage | skipped | — | <= 0.4 of sprite may vanish into school-deep |
| palette-conformance | skipped | — | <= 0.0353 Oklab from a palette entry |
| palette-variety | skipped | — | >= 3 distinct palette colours |
| palette-dominance | skipped | — | no colour above 0.9 of the sprite |
| readable-48px-silhouette | pass | 0.3611 | >= 0.175 coverage at 48px |
| readable-48px-structure | pass | 10 | >= 3 palette colours still visible at 48px |
| enemy-value-ceiling | skipped | — | <= 0.856 Oklab L (bone); paper belongs to the player |
| readable-48px-detail | pass | 0.3871 | >= 0.06 edge density at 48px |
