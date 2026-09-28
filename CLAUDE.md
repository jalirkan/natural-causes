# Natural Causes — agent briefing

This file is the machine-portable brief. Several Claude instances work this
repo from different machines (a Windows desktop, a Linux box, cloud
sessions), so: **pull before starting, push when green, and trust the repo
over any one machine's memory.**

## Read first, in this order

1. `PLAN.md` — the premise, the act list, the six mechanisms, the content rule
2. `DECISIONS.md` (technical) and `DESIGN-DECISIONS.md` (creative, G-numbers)
3. `ART-DIRECTION.md` — BINDING. The eleven laws
4. `AUDIT.md` — defect history and the class of bug this project breeds
5. The act rosters (`CONCEPTION-ROSTER.md`, `SCHOOL-ROSTER.md`) and open
   briefs (`ITEMS-BRIEF.md`, `PLAYTEST-FINDINGS.md`) as the work demands

## The hard rule (D-007) — verbatim, non-negotiable

Enemies are conditions, institutions and abstractions — never identity
groups. No enemy is defined by religion, ethnicity, nationality or race in
art, name, description or generation prompt. A generation prompt violating
this is a build failure.

## Commands

```bash
pnpm install          # once per machine (sharp/esbuild builds are allowed
                      # via pnpm-workspace.yaml; pnpm 11+ required)
pnpm dev              # http://localhost:5173
pnpm test             # the whole suite — keep it green
pnpm typecheck
pnpm build
pnpm playtest -- --runs=40         # the bots, with intervals
pnpm art:batch -- --dry            # prompts + content rule, no API spend
pnpm art:batch -- --set=<name>     # generate (needs FAL_KEY)
pnpm art:pack                      # rebuild atlases from conformed sprites
```

CI (`.github/workflows/ci.yml`, ubuntu) runs the documented checks on every
push. If it fails, the check is right.

## Secrets

`.env` at the repo root, gitignored:

```
FAL_KEY=<key from fal.ai>
```

Needed **only** for `art:batch` generation. The game, tests, bots and packing
all run without it. The key is not in the repo — carry it over per machine.

## Architecture rules that gate everything

- **Rules/presentation split.** `src/sim/world.ts` is the whole game and is
  Node-safe — no Phaser, no assets, no sound. `ActScene` renders it; the
  playtest bots run it headless. A bot must play the identical game a person
  plays; that principle has already caught multi-week measurement errors.
- **Dev cheats never live in `World`.** `src/dev/` applies them from outside
  the sim, any cheat taints the run (HUD says so), and none of it ships in
  production builds.
- **The art pipeline rejects, it never corrects** (G-032). Consistency is
  imposed by CONFORM/CHECK, not asked of the generator. Every asset commits
  its provenance (`assets/prompts/`); law 11 (`tools/art/reservations.ts`)
  gates generation itself.
- **Decision records are append-only** and every content decision names at
  least two rejected alternatives (mechanism 1). An entry without them gets
  sent back.
- **Tuning is frozen** pending the human session (§11.5 / G-028): the drag
  floor, `k`, and the decision cadence are documented placeholders. Do not
  tune them from bot data alone.

## Platform notes

- **Linux/macOS**: nothing special. `pnpm install && pnpm dev`.
- **Windows**: run pnpm from `pwsh` (PowerShell 5.1 is AllSigned on the main
  desktop and blocks pnpm's shim; `pnpm.cmd` also works).
- Line endings are LF, enforced by `.gitattributes`. Beware editing tools
  that silently strip backslashes or normalise endings — both have caused
  real, committed bugs here (see AUDIT.md part two and the G-034 commit).

## Working with Justin

Concise and direct; don't recap work he just watched. When something needs
to go to a Cowork design session, put the substance in a repo doc and hand
him a short prompt that just says what to read (standing instruction).
