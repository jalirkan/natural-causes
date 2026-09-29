# Natural Causes — agent briefing

This file is the machine-portable brief. Several Claude instances work this
repo from different machines (a Windows desktop, a Linux box, cloud
sessions), so: **pull before starting, push when green, and trust the repo
over any one machine's memory.**

## Read this before anything else — 2026-09-29, after the art failed twice

Justin played the whole life and said it looks like a cheap Flash game. He was
right, and the cause was this file and the documents it points at. Rules a
past session wrote were treated as the truth of the project by every later
session, and the person who owns the game was treated as a source of
"reactions" to fit inside them. That ends here. In order of importance:

1. **Justin's judgement outranks every document in this repo**, including the
   ones marked binding. When he says something is bad, the answer is what
   changes *structurally*, never a variation of the same thing. A rule that
   stands between his reaction and the fix is the thing to delete.
2. **Character sprites are made by an image model, never drawn by hand as
   SVG.** An agent drawing with ellipses cannot reach the bar; three rounds
   proved it. Floors, effects, UI and props may be code. Characters, bosses
   and card art come from a generator (Stable Diffusion / SDXL on Justin's
   desktop GPU, or a Hugging Face model on a cloud session where
   `huggingface.co` is allowed) through the existing pipeline
   (`tools/art/generate.ts` and the boards script `tools/art/boards.py`).
   The look is chosen from generated boards (`tools/art/boards/PROMPTS.md`),
   not from prose.
3. **Say what you cannot do on day one, in one line, with the one route that
   works.** Missing capability (no image generation, a blocked host) is
   stated once with the exact setting, never repeated, never turned into a
   menu of options he did not ask for. This cloud environment needs
   `huggingface.co` and `cdn-lfs.huggingface.co` allowed (done 2026-09-29);
   a fresh session picks the policy up, a running one does not — spawn a
   child session for the job rather than asking him again.
4. **Talk like a person.** No decision-record voice in chat, no rosters,
   no AUDIT rows read aloud, no twenty questions. Answer the question he
   asked. He wants a workstation, not a configuration exercise.
5. **What makes the game good is feel before pictures**: shadows, floors,
   camera, hit and kill feedback, numbers, sound. Every session that touches
   the screen should leave it feeling better at the link, not documented
   better in the repo.
6. The records below (decisions, AUDIT, rosters) are optional and short.
   They never gate a change and are never the reason to keep a bad one.

## Read first, in this order

1. `PLAN.md` — the premise, the act list, the six mechanisms, the content
   rule, and the **2026-09-27 reorientation** at the end, which governs how
   work is done now
2. `DECISIONS.md` (technical) and `DESIGN-DECISIONS.md` (creative, G-numbers)
3. `ART-DIRECTION.md` — the pipeline's craft laws (outline, palette, readable at 48px, one job per colour) still run as checks on generated sprites; its registers are history, superseded by the boards
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

Parallelism is in-session subagents. A cloud child session is for one case:
a job that needs a network policy or a machine this container lacks (the
image generator), started with the whole job in its prompt and never asked to
report back through Justin.

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

CI (`.github/workflows/ci.yml`, ubuntu) runs typecheck, test, build, the
browser smoke (`pnpm smoke`) and the dry art run on every push and PR to
`main`. If it fails, the check is right.
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
  the sim, any cheat taints the run (HUD says so), and a tainted life is never
  recorded. The panel reaches the Pages build only behind `?review` (D-030:
  a lazily loaded chunk, mounted only with the flag).
- **The art pipeline rejects, it never corrects** (G-032). Consistency is
  imposed by CONFORM/CHECK, not asked of the generator. Every asset commits
  its provenance (`assets/prompts/` records it). **Characters come from a
  generator, never from hand-drawn SVG** (see the top of this file); the SVG
  path (`tools/art/svg/`) remains for floors, props, icons of objects and
  UI only.
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

Plain talk. Answer what he asked. Hand him a link. If he says it looks bad,
believe him and change the thing, not the wording. Never ask him to change a
setting unless it is the only route, and then once, with the exact clicks.
Never present a menu when he asked for a thing. Own the outcome: the goal is a
fun, addictive roguelite that plays on the American life script, and every
hour should move the link toward that, even by an inch.
