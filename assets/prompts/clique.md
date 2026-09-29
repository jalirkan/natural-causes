# Clique

- **Asset id:** `clique`
- **Act:** school
- **Role:** swarm
- **Source:** rendered and cut out outside this repo, taken in by `pnpm art:intake` from `assets/raw/clique.png`
- **Model:** `Lykon/dreamshaper-xl-v2-turbo`
- **Seed:** `1`
- **Steps / guidance:** 7 / 2
- **Render size:** 768×768px
- **Generated:** 2026-09-29T04:52:02+00:00
- **Cutter:** rembg isnet-general-use
- **Raw sha256:** `3f8762290e471ff2002faeed1ae0e53288f59034bb19e0852118cac8723ad029`
- **Finish:** render
- **Taken in:** 2026-09-29T04:59:50.907Z
- **Sprite size:** 88px
- **Tests:** the cluster — one enemy that must not read as four, the same cute face four times

**Why this life stage.** School is the first place that has an inside, and the player finds out where they are by walking into the edge of it.

## Prompt

```
3D rendered toy-like exactly four kid figures standing glued together shoulder to shoulder in a row, whispering, soft global illumination, clean matte plastic materials, cute, Pixar-like, plain neutral grey background, centered, full body
```

Negative:

```
text, watermark, blurry, deformed, extra limbs, logo, crowd, photo, realistic
```

## Mechanical checks

| Check | Result | Measured | Expected |
|---|---|---|---|
| silhouette-area | pass | 0.6838 | 0.12–0.82 of canvas |
| background-contrast | pass | 0.122 | >= 0.12 median Oklab L from school-deep |
| background-contrast-coverage | skipped | — | <= 0.4 of sprite may vanish into school-deep |
| palette-conformance | skipped | — | <= 0.0353 Oklab from a palette entry |
| palette-variety | skipped | — | >= 2 distinct palette colours |
| palette-dominance | skipped | — | no colour above 0.97 of the sprite |
| readable-48px-silhouette | pass | 0.6445 | >= 0.084 coverage at 48px |
| readable-48px-structure | pass | 11 | >= 2 palette colours still visible at 48px |
| enemy-value-ceiling | skipped | — | <= 0.856 Oklab L (bone); paper belongs to the player |
| readable-48px-detail | pass | 0.4475 | >= 0.06 edge density at 48px |
