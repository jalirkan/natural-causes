# Dodgeball

- **Asset id:** `dodgeball`
- **Act:** school
- **Role:** swarm
- **Source:** rendered and cut out outside this repo, taken in by `pnpm art:intake` from `assets/raw/dodgeball.png`
- **Model:** `Lykon/dreamshaper-xl-v2-turbo`
- **Seed:** `2`
- **Steps / guidance:** 7 / 2
- **Render size:** 768×768px
- **Generated:** 2026-09-29T04:57:45+00:00
- **Cutter:** rembg isnet-general-use
- **Raw sha256:** `0958e2b8a5f55b7933191d595d0b974efa695d4d5d7041f735b23c8141524cca`
- **Finish:** render
- **Taken in:** 2026-09-29T05:00:53.239Z
- **Sprite size:** 44px
- **Tests:** the circle — the only perfect circle in the act, cute and still contact red

**Why this life stage.** School is where the player is first hurt by something that was aimed at the room rather than at them.

## Prompt

```
3D rendered toy-like red rubber dodgeball with a mischievous cartoon face, a ball, an object, no people, soft global illumination, clean matte plastic materials, cute, Pixar-like, plain neutral grey background, centered, full body
```

Negative:

```
text, watermark, blurry, deformed, extra limbs, logo, crowd, photo, realistic
```

## Mechanical checks

| Check | Result | Measured | Expected |
|---|---|---|---|
| silhouette-area | pass | 0.7639 | 0.12–0.82 of canvas |
| background-contrast | skipped | — | >= 0.12 median Oklab L from school-deep |
| background-contrast-coverage | skipped | — | <= 0.4 of sprite may vanish into school-deep |
| palette-conformance | skipped | — | <= 0.0353 Oklab from a palette entry |
| palette-variety | skipped | — | >= 2 distinct palette colours |
| palette-dominance | skipped | — | no colour above 0.97 of the sprite |
| readable-48px-silhouette | pass | 0.7361 | >= 0.084 coverage at 48px |
| readable-48px-structure | pass | 6 | >= 2 palette colours still visible at 48px |
| enemy-value-ceiling | skipped | — | <= 0.856 Oklab L (bone); paper belongs to the player |
| readable-48px-detail | pass | 0.2572 | >= 0.06 edge density at 48px |
