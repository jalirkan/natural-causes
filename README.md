# Natural Causes

[![CI](https://github.com/jalirkan/natural-causes/actions/workflows/ci.yml/badge.svg)](https://github.com/jalirkan/natural-causes/actions/workflows/ci.yml)

> **Status: phases 0 and 1 built, awaiting art review.** Plan in
> [`PLAN.md`](./PLAN.md), art spec in [`ART-DIRECTION.md`](./ART-DIRECTION.md)
> (**still a draft** — it does not become binding until Justin has judged the
> test batch), decisions in [`DECISIONS.md`](./DECISIONS.md). Name is
> provisional.
>
> A blank scene renders in the browser and the art pipeline generates, cuts,
> conforms, textures, checks and packs assets unattended. The six-asset test
> batch is generated and waiting at
> [`assets/review/test-batch.html`](./assets/review/test-batch.html). Nothing
> has been built against the style yet, on purpose.

**A horde-survival roguelike where the progression is a human life.** You begin
as one sperm cell among millions. If you survive long enough, you die of natural
causes. That is the good ending.

## Why this genre

A Vampire Survivors run is already a life. You get stronger, the screen gets
worse, and it ends. Nobody has pointed it at the obvious subject.

## The acts

Conception → School → Adolescence → Service or College → The Office → Family →
Decline. Every act's horde is the same thing in a different costume: cliques and
homework, bureaucracy and heat, meetings and email, bills and stairs. The enemy
is always the script.

The game never says this. It is delivered entirely by enemy design, and a player
either notices or just has a good time.

## Tone

Bleak in substance, completely unserious in delivery. Adult Swim register —
thick outlines, flat colour, lumpy proportions, deadpan faces on absurd things.
The comfort is structural rather than stated: everyone reading has fought these
exact enemies. That is funny before it is sad, and the game does not explain it.

## Built by agents, on purpose

This is also a record of how it was made. A Cowork instance leads design, Claude
Code runs long unattended implementation stretches, and a human decides what is
funny. The process is instrumented and the findings are published — including
what did not work.

Six mechanisms exist specifically to stop an unattended agent producing generic
content: mandatory rejected alternatives on every decision, a "why this life
stage" justification required of every enemy, checkable planted payoffs, a
read-only coherence pass, a hard content budget, and automated playtest bots.
Details in [`PLAN.md`](./PLAN.md).

## Stack

Phaser 3 · TypeScript · Vite · browser target, playable from a link. Art
generated via API and conformed to a locked palette by an in-repo pipeline —
consistency is enforced in code, not in prompts.

## Running it

```bash
pnpm install
```

```bash
pnpm dev
```

Then open <http://localhost:5173>. On Windows use `pwsh`, not PowerShell 5.1 —
it is set to `AllSigned` here and blocks pnpm's shim; `pnpm.cmd dev` also works.

Other tasks:

```bash
pnpm test                 # 239 tests: the sim, the content rules, the art pipeline
pnpm playtest -- --runs=40 # the bots, with intervals
pnpm art:batch            # regenerate sprites (needs FAL_KEY in .env)
pnpm art:batch -- --dry   # print the prompts and run the content rule, no API calls
```

### CI

[`.github/workflows/ci.yml`](./.github/workflows/ci.yml) runs `pnpm typecheck`,
`pnpm test`, `pnpm build` and `pnpm art:batch -- --dry` on every push and pull
request against `main`. Those are the same four commands above, on a machine
nobody here owns — the point being that "the tests pass" stops being something
you have to take on trust from one person's terminal.

The suite needs no network: it was run inside a namespace with no interfaces
and all 239 tests still passed. The dry art run has no `FAL_KEY` in CI and
never will, so a regression that made `--dry` reach the API would fail the step
rather than quietly spend money.

The playtest bots are **not** in CI. They print measurements and exit 0
whatever the measurements say, and tuning is frozen pending a session with a
human — a pass condition would have to be invented to gate on, and an invented
number is the thing this project is most careful not to produce.

### Playing

The game opens on a title screen; any key starts the run (and unlocks the
browser's audio — the sound is synthesised in-house, no files). **WASD** or the
arrow keys to move. You fire automatically — there is no attack button.
**1, 2 or 3** takes an upgrade when the game stops to offer three. **P** or
**Esc** pauses. **M** mutes. **R** restarts once the run is over.

One act, Conception, about five minutes to the Egg. Rival sperm from the start,
antibodies at 0:45, spermicide at 1:30, white cells at 2:10. Kill the Egg and
you win by being absorbed.

### Dev mode

Press **`** in a `pnpm dev` build for a panel: god mode, no antibody drag, an
empty field, 0.25x–4x speed, jump the clock or skip straight to the boss, set
any item to any level, spawn anything, and damage or kill the Egg.

It exists in development builds only — production bundles do not contain it —
and it never touches `World`. Every cheat is applied from `ActScene` after the
step, so nothing in the panel can reach the playtest bots or a test.

**Any cheat taints the run.** The HUD says `DEV · RUN TAINTED` for the rest of
it and only a restart clears the flag. §12.4 needs six questions answered by
someone playing honestly, and a badge is cheaper than remembering whether god
mode was still on twenty minutes ago.

## Status

| Phase | | |
|---|---|---|
| **0** | Scaffold, Phaser + Vite, blank scene | done |
| **1** | Art pipeline + test batch, art direction judged | done — `ART-DIRECTION.md` is binding |
| **2** | Core loop, Conception act | **complete** — title to Egg to win/loss, sound, no known bugs; numeric tuning awaits a human session (§11.5) |
| **3** | The School act | roster and reserved list written, no enemies built |

The art pipeline is six stages (`tools/art/`): generate via Flux on fal, cut the
background, conform to a locked 20-colour palette with a uniform outline,
texture, check, pack. The check stage is what makes it unattended — a failed
asset is regenerated with a mutated seed rather than escalated to a human.

`tools/art/content-rule.ts` enforces D-007 as a build failure: no enemy may be
defined by religion, ethnicity, nationality or race, and a prompt that does is
never sent to the API.
