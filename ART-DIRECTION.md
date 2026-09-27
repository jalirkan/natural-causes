# Art direction

> **Status: BINDING as of 2026-08-01.** Promoted from draft after the six-asset
> test batch was generated and judged. The laws below are enforced
> mechanically by `tools/art/` — an asset that breaks one is regenerated, not
> argued with.
>
> Rewritten by Claude Code from what the pipeline actually does, after three
> batches. The creative expansion of this document — new acts, new enemy
> families, the reserved-silhouette lists — is design judgement, held by
> whichever session holds it (`PLAN.md`, 2026-09-27); Cowork is no longer a
> required stage.

---

## The register

**Mid-century institutional.** The visual language of insurance pamphlets,
safety posters, annual reports and the diagrams that explain your benefits to
you. Muted spot inks on off-white stock, fine even line, strictly flat, visible
halftone. Printed, not rendered.

**Reference points:** mid-century commercial and instructional illustration —
Charley Harper, Jim Flora, corporate annual-report art, safety signage. Chris
Ware is the north star for applying that vocabulary to bleak ordinary American
life, and for rendering a life *as a diagram*.

The joke is that the game is drawn in the register of the institutions it is
about. That is a joke a modern cartoon style cannot make, because it comments
on the thing rather than being it.

**Not:** Adult Swim / modern thick-line cartoon — tried first, judged too toony
(D-017). Not Cuphead, not pixel art, not painterly storybook. Alt-comix
editorial ink and risograph zine were both considered and rejected for the same
reason: they are made of hatching and texture, and neither survives to 48px.

### What the first batch got wrong, recorded so it is not repeated

Two of the three "toony" signals were the *pipeline's*, not the generator's: a
pure-black uniform contour applied in post, and a twenty-colour saturated
palette. When the look is wrong, check `conform.ts` and `palette.ts` before
blaming the model.

## The laws

Enforced in code. The check that enforces each one is named.

1. **One outline weight across the whole game**, scaled proportionally with
   sprite size, never varied for effect. `OUTLINE_RATIO`, 2/96, in a warm
   near-black — never pure black.
2. **Flat fills.** No gradients, no rendered lighting, no ambient occlusion.
   Shadow is a second flat tone at most. Alpha is binarised, so no soft edge
   survives.
3. **Locked palette.** Twenty colours, act tints included. Every asset is
   quantised to it after generation. `palette-conformance`, tolerant of exactly
   the grain amplitude and nothing more.
4. **Hand-cut, never mechanical** — with the deliberate exception of **the
   Reorg**, and nothing else in the Office act (G-013). Ruled geometry is one
   object's characterisation, not an act's style: everything else in that
   building was made by people and looks it, and the diagram that outranks all
   of it was drawn by nobody. Selected by `styleSuffix()`, because in prose this
   exception produced a prompt demanding both at once. **The selector is
   currently per act and now needs to be per asset.**
5. **Faces on everything that can hold one.** Homework has a face. The mortgage
   has a face. Every box in the org chart has a face.
6. **Silhouette carries identity; colour carries threat.** A fixed threat
   palette — contact, ranged, elite, boss — overlays the act palette.
   **Ranged gold goes on the projectile, not the body** (G-031). Contact, elite
   and boss describe an enemy; ranged describes a *relationship* — the damage
   arrives separately from the thing that made it — so the colour belongs on the
   thing that separates. Gold on a body means "this will emit something that
   hurts you", which is an indirection the other three do not have.
   **Where the two channels conflict on one asset, identity wins**, because it
   is the channel law 11 makes exclusive and enforces.
7. **Readable at 48px.** Authored to be recognisable at gameplay size against
   its act background. `readable-48px-silhouette`, `readable-48px-detail`,
   `readable-48px-structure`.
8. **The comic register is indifference, not anxiety.** Enemies do not react to
   the player. They are bored, already decided, looking somewhere else. This is
   the throughline of everything that worked in the first batch, and the one
   asset that emoted at the player is the one that failed.
9. **Enemies are roles, not people.** A human enemy is rendered as the role it
   performs — the clipboard and the lanyard are the character; the person
   carries them. An enemy the player pities is aimed at the wrong target, and
   is the same failure as D-007 one step over.
10. **Every colour has exactly one job** (G-012, extended by G-030). The
    original rule was that the player never wears a threat colour; enforcement
    found that it left a gap rather than a hole, and XP gems fell in it. The
    complete assignment, inside the play field:

    | | |
    |---|---|
    | **Threat colours** | Things that hurt the player. Nothing else — not the player, not pickups, not UI chrome. |
    | **Paper `#EFE7D6`** | The player. Nothing else. |
    | **The act's light tone** | Pickups. No enemy in any act may take it. |
    | **Act deep and mid, shadow, ink, bone** | Everything else. |

    Damage feedback goes to value and outline weight, never to tint, because the
    moment the player flashes contact red the colour means "someone is being
    hurt" instead of "this hurts". **Enforced** — the palette scan caught four
    violations on its first run.
11. **Each act reserves its silhouettes and its threat colours** (G-011).
    A small exclusive shape vocabulary per act, declared before any asset in
    that act is generated. Conception is the worked example — comet, blot, ring,
    Y, with gold held for the boss (`CONCEPTION-ROSTER.md` §2); School is comet's
    successor at five shapes (`SCHOOL-ROSTER.md` §1). Law 6 only delivers at
    horde density if the vocabulary is small and nothing shares. **Enforced** —
    `tools/art/reservations.ts`, and an act with no entry refuses generation.

    **Pickups sit outside the act vocabulary and hold one shape game-wide**
    (G-030). The vocabulary exists to say *how a thing hurts you*; a pickup does
    not, so folding it in is a category error. Instead it is reserved globally:
    one shape, the same in every act, and no enemy in any act may take it.

## The detail budget (D-018)

Uneven on purpose, like the animation budget. The register is built out of fine
line and halftone, both illegible below roughly 100px.

| | Treatment |
|---|---|
| **Swarm enemies, player** | Bold flat shapes, strong silhouette, large uninterrupted colour. No halftone, no hairlines. No grain. |
| **Bosses, backgrounds, UI, title, certificate** | The full register — halftone, fine line, misregistration, grain |

Spend the register where the camera rests. `readable-48px-structure` fails any
asset that only reads at the resolution it was generated in.

## Animation budget

| | Treatment | Why |
|---|---|---|
| **Enemies** | Single static sprite + tweens | Reads at horde scale; costs nothing |
| **Player** | Real frames — idle, walk, hit, death | Always on screen |
| **Bosses** | Real frames — idle, telegraph, attack, death | The telegraph is a gameplay requirement |
| **Pickups / UI** | Static + tween | — |

## The pipeline

Consistency is a code problem, not a prompting problem (D-005).

```
1. GENERATE   Flux via fal. One entity per image, chroma background,
              style suffix varying only by act and by detail budget.
   — or —
1. DRAW       An SVG in assets/svg/<act>/<id>.svg, rasterised (D-025).
              Flat palette fills, no outline, faces on everything. The
              SVG is the provenance. `pnpm art:draw`.
2. CUT        Background removal, shadow removal, frame handling,
              scenery removal, alpha trim, centre on canvas. (GENERATE only.)
3. CONFORM    Quantise to the locked palette. Outline to standard weight.
              Normalise to the act's scale grid.
4. TEXTURE    Grain — bosses only.
5. CHECK      Mechanical rejection. Regenerate on failure with a mutated seed.
6. PACK       Sprite atlas, per act.
```

Three things the register does that CUT has to survive, all learned the hard
way and all covered by tests:

- **It draws cast shadows** however firmly the prompt forbids them. Keyed by
  hue angle, because Oklab chroma shrinks with lightness.
- **It draws framed posters**, and a frame at the image edge blocks the flood
  fill. CUT retries from deeper insets; the test for "blocked" is whether the
  fill reached the corners, never cleared area.
- **It composes pictures** — cloud banks, distant aircraft, signatures.
  Anything wholly outside the subject's bounding box is not the subject.

**The generator ignores the requested backdrop colour.** It is detected from
the border ring, never assumed.

**Every generation prompt is committed** alongside the asset it produced
(D-010). An asset whose prompt is not in `assets/prompts/` does not ship.

## Still open

The three questions raised by `TEST-BATCH-CONCEPTS.md` are **settled** — they are
now laws 10 and 11 and the amendment to law 4, recorded as G-011, G-012 and
G-013. All three are now enforced as well:

- ~~**Law 10 needs a check.**~~ **Done.** The palette scan caught four
  violations on its first run, including XP gems in threat-elite. Moving them to
  bone was legal and exposed that the law had a *gap* rather than a hole — no
  colour was assigned to pickups at all. Law 10 is now a complete role→colour
  assignment (G-030) and pickups take the act's light tone, which no enemy uses
  in any act designed so far, so the rule costs nothing today.
- ~~**Law 11 needs the reservation list to be data.**~~ **Done.**
  `tools/art/reservations.ts`, and an act with no entry refuses generation rather
  than defaulting to permissive. School's list is `SCHOOL-ROSTER.md` §1;
  `boss-gym-teacher` is deliberately absent and therefore not generatable.
- ~~**Law 4's exception moved from per-act to per-asset** and `styleSuffix()` has
  not caught up.~~ **Done, Run 4.** `AssetSpec.geometry` selects it per asset,
  `styleSuffixFor()` applies it, and two tests assert that every act defaults to
  hand-cut and that exactly `boss-reorg` and `antibody` declare `ruled`. The
  antibody forced it — CONCEPTION-ROSTER §2 reserves the Y as the act's only
  straight lines, inside an otherwise hand-cut act.

- ~~**Law 3 is not enforced at render time, and every tinted enemy currently
  breaks it.**~~ **Settled — `G-032`. Render tinting is retired.** The pipeline
  quantised the sprite and checked it; the game then multiplied that sprite on
  the GPU, and a multiply of two palette colours is not generally a palette
  colour. All four Conception enemies measured 0.0000 off-palette as checked and
  0.084–0.107 as drawn, against a 0.0353 tolerance.

  Baking at pack time was the honest-looking option and it loses on the
  substitute's own numbers: the multiply halves the clipboard's background
  contrast, and re-quantising afterwards snaps the halved values onto palette
  entries without restoring anything. Law 3 would go green over a sprite that
  got worse — the third time this project has caught a check passing over a real
  regression. Restricting tints to palette-closed multiplies is the same harm in
  a smaller domain.

  So the value requirement becomes a check instead of a correction: no enemy
  sprite may contain a pixel lighter than the player's floor, and failure
  regenerates with a mutated seed. That is not a new philosophy — `D-005` already
  says consistency is enforced by mechanical rejection rather than
  post-processing, and render tinting was the one place in the pipeline that
  corrected pixels rather than rejecting the asset. It was also the one place
  that broke. Cost: four Conception sprites and one School sprite get re-checked,
  and this is the cheapest moment that will ever be true.

- **`service-light` and `bone` are the same colour to the quantiser.** `#CFC3A0`
  and `#D2C6AC` sit closer together than the palette tolerance, so G-030's
  "pickups take the act's light tone" is unenforceable in Service — a check
  cannot tell a legal bone pixel on an enemy from the reserved pickup colour.
  The check skips the reservation there and says so rather than failing every
  Service enemy. Resolve in the palette: move `service-light`, or accept that
  Service pickups are bone and the act has one fewer exclusive colour.

Genuinely open, and mine rather than the pipeline's:

- ~~**Per-act reserved lists for School onward.**~~ **School done** —
  `SCHOOL-ROSTER.md` §1, five shapes, written together with the roster because
  the clipboard reservation is a claim about every other enemy in the act. The
  remaining five acts still need theirs, each before its first asset.
- **Law 3 may be unsatisfiable as written, and I do not think it is.** "Twenty
  colours, act tints included" reads as a whole-game total, and the palette is
  already at twenty with only four of seven acts toned — the remaining three need
  nine more. The reading that works is that **twenty is the on-screen budget, not
  the catalogue**: any single act shows four universals, four threat colours and
  three act tones, which is eleven, comfortably inside the law. Twenty at once is
  a real constraint on how a screen looks; twenty across seven acts is arbitrary.
  Recorded rather than edited into the law, because it changes what a binding
  document means and Justin should see it before it does.
- **What the register does with a human figure.** Still open, and narrower than
  stated — **the pipeline half is already answered.**

  Correction of fact: the substitute *was* regenerated under this register and
  *did* pass. `assets/sprites/school/substitute-teacher.png`, seed `11923`,
  attempt 2, generated 2026-08-01T09:13Z. Its committed prompt in
  `assets/prompts/substitute-teacher.md` carries the mid-century style suffix and
  the law-9 rewrite — role forward, clipboard and lanyard as the character,
  average build, affectless — and it cleared CUT, CONFORM and all three 48px
  checks. Repeated in two amendments; the disk is the authority and it disagrees.

  What is genuinely unvalidated is the **creative** half, and it is a different
  and cheaper question than it has been filed as. Justin judged the *old*
  teacher "kind of mean". Nobody has judged the new one. So the assumption is
  untested because nobody has looked, not because it could not be built — and
  the asset is already sitting in the review sheet waiting for a verdict.

  It remains the largest unvalidated assumption and four of seven acts still
  depend on it. It just needs five minutes of a person, not a generation run.
