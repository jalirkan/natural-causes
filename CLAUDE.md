# Natural Causes — agent briefing

This file is the machine-portable brief. Several Claude instances work this
repo from different machines (a Windows desktop, a Linux box, cloud
sessions), so: **pull before starting, push when green, and trust the repo
over any one machine's memory.**

## Read first, in this order

1. `PLAN.md` — the premise, the act list, the six mechanisms, the content
   rule, and the **2026-09-27 reorientation** at the end, which governs how
   work is done now
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

## What a session is for

**A session ends with something Justin can play from the link.** `main`
deploys to GitHub Pages on every push (`.github/workflows/deploy.yml`,
D-023). If the work cannot be seen there, it is not finished; if it is
bot-only or data-only, say so and say what would make it visible.

The project's failure mode is documented in `PLAN.md` §2026-09-27: two
months blocked on a human answering number questions from prose. Do not
recreate it. Specifically:

- **Build with placeholder numbers; label them; never claim them.** A system
  whose values nobody has played carries a `provisional` sentence in its
  data naming what retires it (both acts in `src/data/acts.ts` carry one; a
  test requires it). Conception's placeholders are the antibody drag floor
  and curvature (`ANTIBODY_FLOOR`, `ANTIBODY_DRAG_K`), the bot cadence and
  the boss HP; School's is its whole schedule. Do not withhold a feature
  because a number is unset, and do not move a labelled number on bot data
  alone.
- **Ask Justin for reactions, not values.** "Play this — what felt wrong?"
  is a question. "What should `k` be?" is not. If it cannot be answered in
  five minutes at the link, rewrite it.
- **Bots establish presence and ordering, never calibration** (G-026,
  G-027). Read `PLAYTEST-FINDINGS.md`'s header before reporting a number.

## Model routing

One session holds the judgement and delegates the bounded work.

- **Fable (the session itself):** reading the state and deciding what to
  build; anything touching D-007 or the art laws; decision records; audits
  for the class of bug in `AUDIT.md` (does not throw, does not fail a test,
  looks like the game working); reviewing subagent output before it lands.
- **Opus subagents:** implementation with a spec and a test to satisfy —
  an `ActDef`, a workflow file, a pipeline stage, a bot policy; code review
  of a diff before push; art batch runs. Run several in parallel when the
  pieces do not share files.
- **Sonnet or Haiku subagents:** read-only searches and summaries.

No cloud fan-out: spawned cloud sessions prompt Justin for every permission.
Parallelism is in-session subagents and workflows only.

A subagent gets the files it needs by path, the rule it must not break, and
the test that says it is done. It does not get "improve the game".

## Documentation budget

- A decision entry is at most fifteen lines. At least two rejected
  alternatives, one line each, remain mandatory (mechanism 1); an entry
  without them gets sent back.
- A playtest entry is a table and five sentences. Newest first.
- A roster section states the design and its one open question. Amendments
  append; they do not argue across sections.
- Long-form reasoning belongs in the commit message, attached to the change.
- Decision records are append-only.

## Commands

```bash
pnpm install          # once per machine (sharp/esbuild builds are allowed
                      # via pnpm-workspace.yaml; pnpm 11 in CI)
pnpm dev              # http://localhost:5173
pnpm test             # the whole suite — keep it green
pnpm typecheck
pnpm build
pnpm playtest -- --runs=40              # the bots, Conception, with intervals
pnpm playtest -- --runs=16 --act=school # any act with a schedule
pnpm art:svg                            # every SVG in tools/art/svg through the pipeline (then art:pack)
pnpm art:svg -- --id=<id>               # one drawing (iterate on it; --sheet rebuilds the review page)
pnpm art:batch -- --dry                 # prompts + content rule, no API spend
pnpm art:batch -- --set=<name>          # generate (needs FAL_KEY; drawing needs nothing)
pnpm art:pack                           # rebuild atlases from conformed sprites
```

CI (`.github/workflows/ci.yml`, ubuntu) runs typecheck, test, build and the
dry art run on every push and PR to `main`. If it fails, the check is right.
`deploy.yml` publishes `main` to Pages independently of CI.

## Secrets

`.env` at the repo root, gitignored:

```
FAL_KEY=<key from fal.ai>
```

Needed **only** for `art:batch` generation. The game, tests, bots, packing
and deploy all run without it. The key is not in the repo — carry it over
per machine. Never add it to CI.

## Architecture rules that gate everything

- **Rules/presentation split.** `src/sim/world.ts` is the whole game and is
  Node-safe — no Phaser, no assets, no sound. `ActScene` renders it; the
  playtest bots run it headless. A bot must play the identical game a person
  plays; that principle has already caught multi-week measurement errors.
- **`ALL_ACTS` is every schedule; `ACTS` is what the title can start.** The
  content rules iterate `ALL_ACTS`. A test ties `ACTS` to `ACT_VISUALS`; an
  act moves in when its atlas, player frame and boss frame exist.
- **Dev cheats never live in `World`.** `src/dev/` applies them from outside
  the sim, any cheat taints the run (HUD says so), and none of it ships in
  production builds — including the Pages build.
- **The art pipeline rejects, it never corrects** (G-032). Consistency is
  imposed by CONFORM/CHECK, not asked of the generator. Every asset commits
  its provenance (`assets/prompts/` records it; `tools/art/svg/` is the source of drawn art,
  D-025); law 11 (`tools/art/reservations.ts`) gates both doors. Prefer
  drawing: it needs no key and states the shape exactly.
- **One registry per kind of content** (CONCEPTION-ROSTER §5.3). A sibling
  collection is a rule that silently stops applying.

## Platform notes

- **Linux/macOS**: nothing special. `pnpm install && pnpm dev`.
- **Windows**: run pnpm from `pwsh` (PowerShell 5.1 is AllSigned on the main
  desktop and blocks pnpm's shim; `pnpm.cmd` also works).
- Line endings are LF, enforced by `.gitattributes`. Beware editing tools
  that silently strip backslashes or normalise endings — both have caused
  real, committed bugs here (see AUDIT.md part two and the G-034 commit).

## Working with Justin

Concise and direct; don't recap work he just watched. Hand him a link and a
reaction question, not a document and a number question. When a design
conversation genuinely needs to happen out loud, put the substance in a repo
doc and give him a one-line prompt saying what to read.
