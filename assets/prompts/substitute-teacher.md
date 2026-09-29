# Substitute teacher

- **Asset id:** `substitute-teacher`
- **Act:** school
- **Role:** swarm
- **Source:** rendered and cut out outside this repo, taken in by `pnpm art:intake` from `assets/raw/substitute-teacher.png`
- **Model:** `Lykon/dreamshaper-xl-v2-turbo`
- **Seed:** `1`
- **Steps / guidance:** 7 / 2
- **Render size:** 768×768px
- **Generated:** 2026-09-29T04:52:38+00:00
- **Cutter:** rembg isnet-general-use
- **Raw sha256:** `ceabaac3bb8f5abfdbdbac2c59ea1403b31449f79c658c8b2cb5ab246c01a579`
- **Finish:** render
- **Taken in:** 2026-09-29T04:59:50.861Z
- **Sprite size:** 96px
- **Tests:** the bright hard rectangle in the greeting-card register: a clipboard with rounded corners and straight sides, carried by a cute figure that is still the role

**Why this life stage.** School is the first place the player is judged by someone who does not know who they are, and the substitute is that experience with a lanyard on.

## Prompt

```
3D rendered toy-like tired adult teacher figure in a cardigan holding a clipboard, slouching, soft global illumination, clean matte plastic materials, cute, Pixar-like, plain neutral grey background, centered, full body
```

Negative:

```
text, watermark, blurry, deformed, extra limbs, logo, crowd, photo, realistic
```

## Mechanical checks

| Check | Result | Measured | Expected |
|---|---|---|---|
| silhouette-area | pass | 0.2859 | 0.12–0.82 of canvas |
| background-contrast | pass | 0.1242 | >= 0.12 median Oklab L from school-deep |
| background-contrast-coverage | skipped | — | <= 0.4 of sprite may vanish into school-deep |
| palette-conformance | skipped | — | <= 0.0353 Oklab from a palette entry |
| palette-variety | skipped | — | >= 2 distinct palette colours |
| palette-dominance | skipped | — | no colour above 0.97 of the sprite |
| readable-48px-silhouette | pass | 0.2739 | >= 0.084 coverage at 48px |
| readable-48px-structure | pass | 9 | >= 2 palette colours still visible at 48px |
| enemy-value-ceiling | skipped | — | <= 0.856 Oklab L (bone); paper belongs to the player |
| readable-48px-detail | pass | 0.3538 | >= 0.06 edge density at 48px |
