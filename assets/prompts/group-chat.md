# Group chat

- **Asset id:** `group-chat`
- **Act:** adolescence
- **Role:** swarm
- **Source:** authored SVG, `tools/art/svg/adolescence/group-chat.svg`
- **SVG sha256:** `e2e2b35cfeb9f02b7b4589070a63ea2ef4f063e057c15917b0ce8745398565f6`
- **Rasteriser:** sharp 0.34.5 (libvips 8.17.3, librsvg 2.61.2)
- **Render:** 41.775 dpi, 4× supersampled and area-averaged
- **Rendered:** 2026-09-29T02:41:08.629Z
- **Sprite size:** 72px
- **Tests:** the tail — a bubble that must not read as a phone or a cloud

**Why this life stage.** Adolescence is the first stage where the room is carried home in a pocket, and it keeps talking about the player after they have left.

## Description

a fat rounded speech bubble, wider than tall, with one short tail at a bottom corner, the only silhouette in the act with a tail, flat warm grey-brown (#6E6353), one solid tone, the colour of messages that are someone else's, two small dark dots for eyes looking straight out at the viewer and a small sideways smirk, no phone, no screen, no avatars, no names, no text, nobody in it drawn, no yellow, no gold anywhere on the bubble, no pink

## Mechanical checks

| Check | Result | Measured | Expected |
|---|---|---|---|
| silhouette-area | pass | 0.6497 | 0.12–0.82 of canvas |
| background-contrast | pass | 0.1709 | >= 0.12 median Oklab L from adolescence-deep |
| background-contrast-coverage | pass | 0.1155 | <= 0.4 of sprite may vanish into adolescence-deep |
| palette-conformance | pass | 0 | <= 0.0353 Oklab from a palette entry |
| palette-variety | pass | 2 | >= 2 distinct palette colours |
| palette-dominance | pass | 0.8845 | no colour above 0.97 of the sprite |
| readable-48px-silhouette | pass | 0.6584 | >= 0.084 coverage at 48px |
| readable-48px-structure | pass | 3 | >= 2 palette colours still visible at 48px |
| enemy-value-ceiling | pass | 0.5054 | <= 0.856 Oklab L (bone); paper belongs to the player |
| readable-48px-detail | pass | 0.1639 | >= 0.06 edge density at 48px |
