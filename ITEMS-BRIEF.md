# Items — what a power-up is in a game whose progression is a life

Written 2026-08-01. A question, not a decision. Nothing here is settled and the
`DESIGN-DECISIONS.md` entries that would settle it have not been written.

This exists because Justin, playing the act, said the power-up system was worth
thinking about *philosophically* — how it relates to the plot rather than how it
balances. That is a different question from the one the system was built to
answer, and it has not been asked yet.

---

## 1. What is actually built

Seven items, in `src/data/items.ts`. Four weapons, one control, three passives.
Each carries three player-visible strings: `enables` and `tradesAway` (the
design argument, required over 30 characters, enforced by test) and `blurb`
(offer-card copy — ONE line under 64 characters carrying the mechanic and the
joke together, plus an `icon` tag the renderer draws). A `gain`/`cost` pair was
tried first and cut the same day: two lines per item read as homework at
decision speed.

| Item | Kind | Gain | Cost |
|---|---|---|---|
| Lash | weapon | seeking shot at the nearest thing | nothing else; it is the baseline |
| Motility | weapon | piercing line, kills a column | only forward; nothing covers the back |
| Acrosome | weapon | burst around the player | no reach; you take a hit to land one |
| Wake | weapon | damaging trail behind | nothing in front; useless cornered |
| Chemotaxis | control | pulls the crowd to a point | no damage, and it gathers antibodies |
| Midpiece | passive | +12% speed | −10% health |
| Membrane | passive | −18% damage taken | −8% speed |
| Capacitation | passive | damage ramps 0.7 → 1.85 over the act | strictly worse than nothing for two minutes |

The governing rule is **G-014: every item subtracts something.** An item that
cannot state both what build it enables and what it trades away is cut rather
than shipped. That rule is enforced by a test and it has already done work — it
is why there is no strictly-better item in the act.

The budget is **roughly thirty items for the whole game** (PLAN.md mechanism 5).
Conception has spent seven of them.

---

## 2. The problem with that

G-014 is a **balance** rule wearing a philosophical coat. It was argued on
build-diversity grounds: items that only add produce one dominant build and six
decorations. Every word of that is true and none of it is about the plot.

PLAN.md's thesis is that the genre already does the thematic work:

> a Vampire Survivors run is already a life — you get stronger, the screen gets
> worse, and it ends

If that is the thesis, then **the upgrade system is the part of the game closest
to the thesis, and it is currently the part with the least thematic argument
behind it.** The enemies each answer "why this life stage" — that is mechanism 2,
enforced in the data file. No item answers anything equivalent. Nothing asks an
item why it belongs to a life rather than to a build.

---

## 3. Five questions, roughly in order of how much they cost to answer late

### 3.1 Do items persist across acts?

Unanswered, and it is the arithmetic problem too: seven acts × seven items is
49 against a budget of 30. Something has to give, and the options are not
equivalent:

- **Items reset each act.** Each act is a self-contained build. Cheap to design,
  and it makes the game seven short games. It also throws away the single
  strongest thing the premise offers.
- **Items persist for the whole run.** Then a Conception item is still on the
  player in The Office. *Lash* — the reflex you developed before you were a
  person — is still what you do at forty. That is very close to the actual joke
  of the game, and it is nearly free: it is the same seven items, renamed or not
  renamed, carried forward.
- **Items persist but degrade.** Aging as a mechanic rather than a theme.

The middle option is worth arguing hard, because it converts an arithmetic
problem into the premise. But it has a real cost: an act's items must then be
legible out of their act, and "Acrosome" is not a word that survives contact
with a performance review.

### 3.2 Should items be named in-fiction or out?

Every current item is a piece of sperm biology. That was correct for one act and
does not generalise. Three positions:

- **In-fiction per act.** Acrosome in Conception, something scholastic in School.
  Consistent with the costume-per-act spine. Fatal to 3.1's middle option.
- **One vocabulary, act-agnostic** — items named for the *behaviour* rather than
  the biology, so the same item is legible in every act.
- **The same item, renamed per act.** Mechanically identical, presented as the
  act's costume. This is literally the game's stated spine ("every act's horde is
  the same thing wearing a different costume") applied to items. Nobody has
  proposed it and it may be the answer.

### 3.3 Is irreversible accumulation the actual progression spine?

The antibody is the most interesting object in the act and it is not an item.
It is invulnerable, deals no damage, drops no XP, and attaches permanently —
it only ever costs speed, and nothing in the act removes it. It is the one
mechanic that behaves like aging rather than like a game.

Right now it exists in one act as one enemy. The question is whether
**accumulating irreversible drag is the game's spine**, present in every act in
that act's costume, with the items as the thing that decides how well you cope
with it. If so, act one has already invented the game's central mechanic by
accident and nobody has named it.

Counter-argument, which should be taken seriously: it may simply not be fun, and
"thematically perfect" is how games get built that nobody finishes.

### 3.4 Should the player be able to refuse an upgrade?

Currently three offers, choose one, world frozen until you do. Refusal is not
possible. In a game about a life script, "you may decline" is a loaded option and
it is free to implement. It is also a balance hazard and probably a trap.

### 3.5 What is Capacitation actually saying?

It is the only item whose power is a function of the act clock rather than the
player — worse than nothing for two minutes, then far better. It is the only item
in the game that is *about time*, and it landed as a balance experiment. If the
game is about a life, an item that pays off only if you survive long enough is
either the thesis or a gimmick, and it has not been argued either way.

---

## 4. Constraints any answer has to respect

- **G-014 stands** unless it is explicitly argued down. Every item subtracts.
- **The 30-item budget** (mechanism 5) is the reason this question is urgent.
- **Mechanism 1:** every content decision names two rejected alternatives in
  `DESIGN-DECISIONS.md`. That applies to whatever comes out of this.
- **D-007 is not at issue here** — items are not enemies — but the content rule
  binds any item name and any generation prompt just the same.
- **The rules/presentation split.** `items.ts` is Node-safe and drives the
  playtest bots; anything visual goes in `act-visuals.ts`. An item change that
  imports a PNG into the rules layer breaks the headless build.
- **Balance is not blocked on this.** The floor, `k` and the decision cadence are
  frozen pending one session with Justin at a keyboard (§11.5, G-028). This
  brief is upstream of tuning and should not wait for it.

---

## 5. What is not being asked

Not asking for a rebalance, new numbers, or a Run 8. Not asking which items are
strong. The bots can answer those and mostly have.

Asking what an upgrade **means** here, and then what follows for the seven that
exist.

---

## Appendix — a reading failure worth knowing about

Justin, playing, asked whether the Y-shaped objects were **Y chromosomes.** They
are antibodies. The Y is correct immunology iconography and it is the antibody's
reserved silhouette under law 11 (`tools/art/reservations.ts`).

Both of those decisions are defensible alone and collide in this act specifically:
in a level about conception, a Y is not a neutral shape — it is the most loaded
glyph available in the subject matter, and the competing reading is *right there
in the theme*. The pipeline cannot catch this. `CHECK` verifies that silhouettes
are distinct from each other; it has no way to know that one of them means
something else entirely in context.

Filed here rather than in `ART-DIRECTION.md` because it bears on 3.3 — if the
antibody is promoted from "one enemy in act one" to the game's spine, what it
looks like stops being a local art question.

---

## Note — 2026-09-27

§4's "frozen pending one session with Justin at a keyboard" is superseded by
D-022: numbers nobody has played are built, labelled provisional in the data,
and moved in response to play. The five questions above are unchanged and
still open.
