# Concept boards — what the game could look like

Five directions, three scenes each, written to be pasted into any image model
(Flux, SDXL, SD 1.5 all take them as-is). Generate at 1024×576 or 1280×720,
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

`stop-motion claymation diorama photographed from directly above, built inside a shoebox, clay figures with thumbprints, felt and cardboard set, hand-painted details, warm tungsten key light, soft cast shadows, shallow depth of field, Aardman and Laika craft feel, fingerprints visible in the clay —`

- A: `— a school gymnasium: varnished wood-grain floor with painted court lines, a tiny clay child with one cowlick in the centre, red clay dodgeballs rolling toward it, stacks of paper homework with drawn faces, a felt gym-teacher figure with a whistle at the edge`
- B: `— a living room: a clay house with a face in the centre, twelve notches cut into its roofline, cardboard rooms glued on around it, paper bills with faces chasing a small clay figure in a shirt and tie, a clay telephone at the edge`
- C: `— a desk: a typed death certificate reading "Natural causes. Age 84." lying on green felt, a clay hand's cowlick tuft just visible at the bottom of the frame`

## 2 · The pop-up book

`a pop-up book page seen from above, cut-paper layers with real cast shadows, gouache on cardstock, figures standing up from the page on tabs, visible cut edges, paper grain, warm bookshop light —`

- A: `— a school gymnasium painted on the page, a paper child with one cowlick standing up on a tab, paper dodgeballs, homework as stacked paper strips with drawn faces, a paper gym-teacher cut-out with a whistle at the edge`
- B: `— a living room painted on the page, a paper house with a face standing up in the centre, twelve notches on its roof, paper rooms unfolding around it, paper bills with faces on tabs chasing a small paper figure in a shirt and tie`
- C: `— the last page of the book: a paper death certificate reading "Natural causes. Age 84." glued flat, a small paper cowlick tab at the bottom edge`

## 3 · The New Yorker cartoon

`black ink pen-and-wash cartoon in the style of a New Yorker magazine cartoon, viewed from above, cross-hatching, off-white paper, one spot colour, deadpan —`

- A: `— a school gymnasium, a small child with one cowlick in the centre, dodgeballs rolling in, stacks of homework with faces, a hall monitor with a sash, a gym teacher with a whistle, spot colour school-bus yellow`
- B: `— a living room, a house with a face in the centre with twelve notches on its roof, rooms sketched growing around it, bills with faces chasing a small figure in a shirt and tie, a ringing telephone, spot colour envelope-window blue`
- C: `— a death certificate on a desk reading "Natural causes. Age 84.", a cowlick tuft at the bottom edge, spot colour a single red stamp`

## 4 · The painted picture book

`gouache picture-book illustration seen from above, visible brush texture, painted highlights, soft painted shadows, no outlines, 1950s Little Golden Book palette —`

- A: `— a school gymnasium with a warm painted wood floor, a small round-headed child with one cowlick, red rubber dodgeballs, stacks of homework with drawn faces, a gym teacher with a whistle`
- B: `— a living room with a painted carpet, a house with a face in the centre, twelve notches on its roof, painted rooms growing around it, bills with faces chasing a small figure in a shirt and tie, a telephone`
- C: `— a painted desk with a death certificate reading "Natural causes. Age 84.", a small cowlick at the bottom edge`

## 5 · The tabletop

`tilt-shift photograph of a tabletop toy set from directly above, plastic toy pieces on a kitchen table, real window light, shallow depth of field, miniature effect, slightly worn toys, no brand shapes —`

- A: `— a school gymnasium built from toy pieces, a small toy child figure with one cowlick, toy dodgeballs, paper homework stacks, a toy gym-teacher figure with a whistle`
- B: `— a living room built from toy pieces, a toy house with a painted face in the centre, twelve notches on its roof, toy rooms clipped on around it, paper bills chasing a small toy figure in a shirt and tie, a toy telephone`
- C: `— a toy desk with a paper death certificate reading "Natural causes. Age 84.", a toy figure's cowlick at the bottom edge`

## Running them locally

A local Stable Diffusion or Flux runner (diffusers) takes each line as the
prompt; a negative prompt of `text, watermark, blurry, extra limbs, logo` helps
SD 1.5 and SDXL. Save as `boards/<direction>-<scene>-<seed>.png`. Send the
folder to whichever session is judging.
