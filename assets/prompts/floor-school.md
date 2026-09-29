# floor-school

- **act:** school
- **role:** floor tile (repeated by `bakeFloor`; not a sprite, so it does not pass through conform/check)
- **model:** Lykon/dreamshaper-xl-v2-turbo, 7 steps, guidance 2.0, 768×768, seed 1, resized to 512×512 (lanczos3)
- **generated:** 2026-09-29
- **cutter:** none

## Prompt

seamless tileable texture, top-down view of a toy wooden gymnasium floor, glossy varnished wood planks, painted court lines, flat, seen from directly above, no figures, no shadows, evenly lit

Negative: text, watermark, blurry, people, figures, characters

## Notes

The model ignored "painted court lines" (good: the court is drawn by `floors.ts` as marks so it does not repeat every tile). Tiled 2×2 there is a faint horizontal seam at the join; acceptable for the first in-game look.
