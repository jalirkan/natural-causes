# Natural Causes

[![CI](https://github.com/jalirkan/natural-causes/actions/workflows/ci.yml/badge.svg)](https://github.com/jalirkan/natural-causes/actions/workflows/ci.yml)

> **Play it: <https://jalirkan.github.io/natural-causes/>** — the current
> `main`, published by [`deploy.yml`](./.github/workflows/deploy.yml) on every
> push once a repository admin has pointed Pages at GitHub Actions (see CI,
> below). One run is one life (D-024); today that life is Conception then
> School, about ten minutes. Keyboard, or one thumb on a phone.
>
> **Status: a two-act life — Conception, then School — playable at the link,
> drawn in a first authored-SVG batch (G-038). Every number is a labelled placeholder.**
> Plan in [`PLAN.md`](./PLAN.md) (read its 2026-09-27 amendment first), art
> spec in [`ART-DIRECTION.md`](./ART-DIRECTION.md) (binding), decisions in
> [`DECISIONS.md`](./DECISIONS.md). Name is provisional.

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

This is also a record of how it was made. One Claude Code session holds the
design judgement and delegates bounded implementation to subagents — it began
as a Cowork/Claude Code split, and `PLAN.md`'s 2026-09-27 amendment says why
that changed — and a human decides what is funny. The process is instrumented
and the findings are published, including what did not work.

Six mechanisms were planned to stop an unattended agent producing generic
content. Four are built and enforced by tests: mandatory rejected alternatives
on every decision, a "why this life stage" justification required of every
enemy, a hard content budget, and automated playtest bots. Two — checkable
planted payoffs and a read-only coherence pass — are not built, and
[`PLAN.md`](./PLAN.md)'s 2026-09-27 amendment says what happens to them.

## Stack

Phaser 3 · TypeScript · Vite · browser target, playable from a link. Sprites
are being moved to authored SVG, rasterised and checked by an in-repo pipeline
(G-038) — consistency is enforced in code, not asked of a generator.

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
pnpm test                 # the whole suite: the sim, the content rules, the art pipeline
pnpm playtest -- --runs=40 # the bots, with intervals
pnpm playtest -- --runs=16 --act=school   # any act with a schedule
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
and the whole suite still passed. The dry art run has no `FAL_KEY` in CI and
never will, so a regression that made `--dry` reach the API would fail the step
rather than quietly spend money.

[`deploy.yml`](./.github/workflows/deploy.yml) publishes `main` to GitHub
Pages on every push, independently of CI (D-023). First-time setup is one
repository setting: Pages → Source → "GitHub Actions". The workflow asks for
it itself, but the default token is not allowed to change settings, so the
first run fails at that step until an admin has done it; re-run it after.

The playtest bots are **not** in CI. They print measurements and exit 0
whatever the measurements say, and every act's values are labelled provisional
until a person has played it — a pass condition would have to be invented to
gate on, and an invented number is the thing this project is most careful not
to produce.

### Playing

The game opens on a title screen; any key starts the run (and unlocks the
browser's audio — the sound is synthesised in-house, no files). **WASD** or the
arrow keys to move. You fire automatically — there is no attack button.
**1, 2 or 3** takes an upgrade when the game stops to offer three. **P** or
**Esc** pauses. **M** mutes. **R** restarts once the run is over.
On a phone: tap to start, drag anywhere to move, tap a card to choose, the
corner button pauses, and a tap restarts once the run is over.

A life: Conception, about five minutes to the Egg, then School, ages five to
twelve. When the Egg appears every rival swims for it; beat them to it and you
cross into School with everything you took. Outlive School and you die of
natural causes, aged twelve. Dying earlier, the certificate names what did it.

#### After you play — five things to say

These replace the six calibration questions in `CONCEPTION-ROSTER.md` §12.4.
Nothing here asks for a number; every one is about the run you just had.

1. **Did you want to go again?** If not, at what point did you stop caring?
2. **Were you slower by the end?** When did you first notice, and did it keep
   getting worse or stop mattering at some point?
3. **Was the Egg a fight or a shooting gallery?**
4. **Did you work out what the magnet does?** Did it seem to help or hurt?
5. **Did anything make you laugh?** Once is enough. Say what.

§12.4's sixth question — how long you hold a heading — is not asked, because
it is answered by an input log the game does not write yet. It is what sets
the bots' decision cadence, and until the log exists the cadence stays a
labelled placeholder.

### Dev mode

Press **`** in a `pnpm dev` build for a panel: god mode, no antibody drag, an
empty field, 0.25x–4x speed, jump the clock or skip straight to the boss, set
any item to any level, spawn anything, and damage or kill the Egg.

It exists in development builds only — production bundles do not contain it —
and it never touches `World`. Every cheat is applied from `ActScene` after the
step, so nothing in the panel can reach the playtest bots or a test.

**Any cheat taints the run.** The HUD says `DEV · RUN TAINTED` for the rest of
it and only a restart clears the flag. The five questions under "Playing" need
someone playing honestly, and a badge is cheaper than remembering whether god
mode was still on twenty minutes ago.

## Status

| Phase | | |
|---|---|---|
| **0** | Scaffold, Phaser + Vite, blank scene | done |
| **1** | Art pipeline + test batch, art direction judged | done — `ART-DIRECTION.md` is binding |
| **2** | Core loop, Conception act | **complete and unjudged** — title to Egg to certificate, sound, no known bugs, playable at the link; the drag curve and cadence are labelled placeholders until a person has played it |
| **3** | The School act | five enemies and three behaviours built; a **provisional** schedule the bots run (`--act=school`, D-022); not startable — four sprites ungenerated, no boss, no player frame |

The art pipeline is six stages (`tools/art/`): generate via Flux on fal, cut the
background, conform to a locked 20-colour palette with a uniform outline,
texture, check, pack. The check stage is what makes it unattended — a failed
asset is regenerated with a mutated seed rather than escalated to a human.

`tools/art/content-rule.ts` enforces D-007 as a build failure: no enemy may be
defined by religion, ethnicity, nationality or race, and a prompt that does is
never sent to the API.
