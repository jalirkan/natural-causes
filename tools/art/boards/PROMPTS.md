# Concept boards — what the game could look like

Five directions, three scenes each, written to be pasted into any image model
(Flux, SDXL, SD 1.5 all take them as-is). Each style line plus scene line stays
under CLIP's 77 tokens, or the model silently drops the end of the prompt. Generate at 1024×576 or 1280×720,
landscape, so a board reads like a screenshot. Nothing here is a sprite: these
are pictures to choose a look from. Once a direction is chosen, the next step
is a style sheet — six assets across three acts in that look — before any
sprite is rebuilt.

The three scenes are the same in every direction so the boards compare:

- **A. The gym** — School, from directly above: the kid (one cowlick) in the
  middle of a gymnasium floor, red dodgeballs rolling in, stacks of homework
  with faces shuffling toward them, a hall monitor with a sash, the gym
  teacher with a whistle at the edge.
- **B. The Mortgage** — Family, from above: a house with a face in the middle
  of a living-room floor, twelve notches on its roofline, rooms growing around
  it like extensions, bills chasing the kid (now in a shirt and tie, same
  size), a phone ringing at the edge.
- **C. The certificate** — the last screen: a death certificate on a desk,
  "Natural causes. Age 84." typed on it, the kid's cowlick just visible at
  the bottom edge of the frame.

Append the scene text to the direction's style line.

## 1 · The shoebox diorama

`claymation shoebox diorama seen from above, clay figures with thumbprints, felt and cardboard set, warm tungsten light, soft shadows, shallow depth of field —`
- A: `— a school gym with a wood floor and court lines, a small kid with one cowlick in the centre, red dodgeballs rolling in, stacks of homework with faces, a gym teacher with a whistle at the edge`
- B: `— a living room, a house with a face in the centre with twelve notches on its roof, rooms growing around it, bills with faces chasing a small figure in a shirt and tie, a ringing telephone`
- C: `— a desk with a death certificate that reads Natural causes, age 84, a small figure's cowlick just visible at the bottom edge`

## 2 · The pop-up book

## 2 · The pop-up book

`pop-up book page seen from above, cut paper layers with real cast shadows, gouache on cardstock, visible cut edges, paper grain, warm light —`
- A: `— a school gym with a wood floor and court lines, a small kid with one cowlick in the centre, red dodgeballs rolling in, stacks of homework with faces, a gym teacher with a whistle at the edge`
- B: `— a living room, a house with a face in the centre with twelve notches on its roof, rooms growing around it, bills with faces chasing a small figure in a shirt and tie, a ringing telephone`
- C: `— a desk with a death certificate that reads Natural causes, age 84, a small figure's cowlick just visible at the bottom edge`

## 3 · The New Yorker cartoon

## 3 · The New Yorker cartoon

`New Yorker style pen and ink cartoon with grey wash, seen from above, cross-hatching, off-white paper, one spot colour, deadpan —`
- A: `— a school gym with a wood floor and court lines, a small kid with one cowlick in the centre, red dodgeballs rolling in, stacks of homework with faces, a gym teacher with a whistle at the edge`
- B: `— a living room, a house with a face in the centre with twelve notches on its roof, rooms growing around it, bills with faces chasing a small figure in a shirt and tie, a ringing telephone`
- C: `— a desk with a death certificate that reads Natural causes, age 84, a small figure's cowlick just visible at the bottom edge`

## 4 · The painted picture book

## 4 · The painted picture book

`gouache picture book illustration seen from above, visible brush texture, painted highlights, soft shadows, no outlines, 1950s Little Golden Book palette —`
- A: `— a school gym with a wood floor and court lines, a small kid with one cowlick in the centre, red dodgeballs rolling in, stacks of homework with faces, a gym teacher with a whistle at the edge`
- B: `— a living room, a house with a face in the centre with twelve notches on its roof, rooms growing around it, bills with faces chasing a small figure in a shirt and tie, a ringing telephone`
- C: `— a desk with a death certificate that reads Natural causes, age 84, a small figure's cowlick just visible at the bottom edge`

## 5 · The tabletop

## 5 · The tabletop

`tilt-shift photo of a toy set on a kitchen table seen from above, plastic toy figures, real window light, shallow depth of field, miniature, slightly worn toys —`
- A: `— a school gym with a wood floor and court lines, a small kid with one cowlick in the centre, red dodgeballs rolling in, stacks of homework with faces, a gym teacher with a whistle at the edge`
- B: `— a living room, a house with a face in the centre with twelve notches on its roof, rooms growing around it, bills with faces chasing a small figure in a shirt and tie, a ringing telephone`
- C: `— a desk with a death certificate that reads Natural causes, age 84, a small figure's cowlick just visible at the bottom edge`
## Running them locally

A local Stable Diffusion or Flux runner (diffusers) takes each line as the
prompt; a negative prompt of `text, watermark, blurry, extra limbs, logo` helps
SD 1.5 and SDXL. Save as `boards/<direction>-<scene>-<seed>.png`. Send the
folder to whichever session is judging.
