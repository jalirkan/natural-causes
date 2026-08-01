# Natural Causes

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
pnpm dev          # the game — a green field and a dot, so far
pnpm test         # 82 tests, mostly the art pipeline
pnpm art:batch    # regenerate the test batch (needs FAL_KEY in .env)
pnpm art:batch -- --dry   # print the prompts and run the content rule, no API calls
```

## Status

| Phase | | |
|---|---|---|
| **0** | Scaffold, Phaser + Vite, blank scene | done |
| **1** | Art pipeline + six-asset test batch | **built, awaiting Justin's judgement** |
| **2** | Core loop, Conception act | not started — blocked on the art review |

The art pipeline is six stages (`tools/art/`): generate via Flux on fal, cut the
background, conform to a locked 20-colour palette with a uniform outline,
texture, check, pack. The check stage is what makes it unattended — a failed
asset is regenerated with a mutated seed rather than escalated to a human.

`tools/art/content-rule.ts` enforces D-007 as a build failure: no enemy may be
defined by religion, ethnicity, nationality or race, and a prompt that does is
never sent to the API.
