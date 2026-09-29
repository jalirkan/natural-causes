# Hall monitor

- **Asset id:** `hall-monitor`
- **Act:** school
- **Role:** swarm
- **Source:** rendered and cut out outside this repo, taken in by `pnpm art:intake` from `assets/raw/hall-monitor.png`
- **Model:** `Lykon/dreamshaper-xl-v2-turbo`
- **Seed:** `1`
- **Steps / guidance:** 7 / 2
- **Render size:** 768×768px
- **Generated:** 2026-09-29T04:51:25+00:00
- **Cutter:** rembg isnet-general-use
- **Raw sha256:** `b2d87001cc1dbca03f641b2f0cbe78d4c0777497568bbfff7a899967258757fc`
- **Finish:** render
- **Taken in:** 2026-09-29T04:59:50.995Z
- **Sprite size:** 88px
- **Tests:** the sash — one hard diagonal that must not read as a badge, on a cute round figure

**Why this life stage.** School is where authority is first handed to someone with no more standing than the player, and it works anyway.

## Prompt

```
3D rendered toy-like tall skinny kid figure wearing a diagonal orange fabric sash across the chest like a school hall monitor, stern, arms folded, soft global illumination, clean matte plastic materials, cute, Pixar-like, plain neutral grey background, centered, full body
```

Negative:

```
text, watermark, blurry, deformed, extra limbs, logo, crowd, photo, realistic
```

## Mechanical checks

| Check | Result | Measured | Expected |
|---|---|---|---|
| silhouette-area | pass | 0.184 | 0.12–0.82 of canvas |
| background-contrast | pass | 0.1461 | >= 0.12 median Oklab L from school-deep |
| background-contrast-coverage | skipped | — | <= 0.4 of sprite may vanish into school-deep |
| palette-conformance | skipped | — | <= 0.0353 Oklab from a palette entry |
| palette-variety | skipped | — | >= 2 distinct palette colours |
| palette-dominance | skipped | — | no colour above 0.97 of the sprite |
| readable-48px-silhouette | pass | 0.1645 | >= 0.084 coverage at 48px |
| readable-48px-structure | pass | 10 | >= 2 palette colours still visible at 48px |
| enemy-value-ceiling | skipped | — | <= 0.856 Oklab L (bone); paper belongs to the player |
| readable-48px-detail | pass | 0.5299 | >= 0.06 edge density at 48px |
