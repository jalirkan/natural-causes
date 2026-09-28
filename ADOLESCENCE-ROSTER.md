# Adolescence — reserved list and enemy roster

> **Status: design, ready to lift.** Written against `ART-DIRECTION.md` (laws
> 5, 6, 7, 9, 10, 11) in the flat cartoon School is drawn in (G-038, D-025);
> only the colours and shapes change. Same shape as `SCHOOL-ROSTER.md` §1–§3
> and §9. Ages 13 to 18, on a 240-second clock.
>
> **§1 is the blocking item:** `ActId` is the keys of `ACT_TONES`, and the
> tones take `FULL_PALETTE` past its test's bound (§5). **No new `EnemyDef`
> field:** every enemy is fields that exist, and Prom is boss-machine parts
> that exist or are being built (§4).

## 1 · The reserved list (`G-011`, law 11)

Five shapes and the boss's: School's count, because this act adds a pressure
rather than a verb (§2). The consequence strings lift verbatim.

| Reserved | Held by | Consequence |
|---|---|---|
| **Tall sheet** — a portrait rectangle with one column of dots | `standardised-test` | The only rectangle in the act, and the act is built around it: a phone and a car would both be rectangles, so neither is drawn as one. |
| **Speech bubble** — rounded, one tail | `group-chat` | The only silhouette with a tail. Drawn as what comes out of a phone, because the phone would be a rectangle. |
| **Wheels** — a lumpy hatchback side-on on two ink wheels, a plate on the roof | `drivers-ed` | The only thing in the act with wheels. |
| **Bolt** — a fat three-stroke zigzag | `hormones` | The only jagged outline in the act. Nothing else zigzags. |
| **Dome** — a low half-circle on a flat base, a bone dot on top | `acne` | The only half-circle, and the smallest thing in the act. |
| **Hanging sphere** — a ball on a chain from the top of the frame, at boss scale | `boss-prom` | The only thing in the act that hangs from above. Its gold is on its reflections, never its body. |

**Threat colours held back:**

| Class | Held by | Why |
|---|---|---|
| **Contact `#C4472E`** | `drivers-ed` | The act's heaviest hit is its only red thing. Acne, which anyone would draw red, is shadow and bone — the antibody's colours — so red stays a claim about damage. |
| **Elite `#7C5C8A`** | `standardised-test` | The white cell's colour on the white cell's successor (§3.4). |
| **Ranged `#D69A3C`** | `group-chat` — **on its notification, never its body** (`G-031`); in data, `PROJECTILE_HOLDER` | Prom's reflections are the only other gold. Gold arrives in the first minute and never leaves (§3.6): School's order reversed, and the point (§2). |
| **Boss `#2F7370`** | `boss-prom` | The mirror ball's body. |

**The act's tones**, for `ACT_TONES` in `tools/art/palette.ts`:

```ts
  adolescence: [
    c('adolescence-deep', '#2E3453'), // night; the act background
    c('adolescence-mid', '#5E95C3'), // a screen in that room
    c('adolescence-light', '#D6AEBB'), // blush; pickups only (law 10, G-030)
  ],
```

The first act after dark, on the darkest ground in the life (Oklab L 0.33
against the others' 0.40–0.41). By `palette.ts`'s own Oklab every existing
entry is at least 0.066 away, about twice the 0.0353 tolerance, and the light
tone is 0.073 from bone, so the pickup reservation is enforceable here, unlike
Service's. No enemy below wears `adolescence-light`.

### Why the vocabulary is what it is

The tall sheet is a claim about two other enemies, as the clipboard was:

- **The group chat is a bubble because the rectangle is taken.** The obvious
  drawing of a group chat is a phone, and a phone is a rectangle. So the chat
  is drawn as what comes out of it, which is the better drawing: the bubble is
  the part that talks.
- **The car is side-on because the rectangle and the dome are both taken.**
  From above a car is a slab; side-on, a cartoon car wants to be a dome. It is
  a lumpy hatchback on two wheels, and the wheels became the reservation.

## 2 · What the act is

Adolescence's costume of the life script: **everything is suddenly about you,
and none of it is for you.** School's line was that nothing in the act had
anything against you. This act's is that everything in it is looking at you:
every face in §3 looks straight out of the screen, at the person playing,
except the car's, which has its eyes on the road.

| | Enemy | Teaches |
|---|---|---|
| Crowd | Hormones | That the crowd can come out of where you were standing |
| Velocity | Driver's ed | That some things are faster than you, and the only question is when to cross |
| Accumulator | Acne | That the only way to clear some things is to wear them |
| Roadblock | Standardised test | That a slow thing still arrives on the date |
| **Ranged** | Group chat | That the aimed thing can follow you |

**The new pressure is attention:** Conception's first aimed thing was the Egg
and School's was a substitute across the room who had to look you up, but
Adolescence's follows you, and so do three of the act's five.

## 3 · The enemies

All five are swarm-tier (D-018): bold flat shapes, one face each. D-007 on its
face: nothing in this act is a person, and nothing is drawn with skin.

### 3.1 · Hormones — crowd

**`whyThisStage`** — lift verbatim:

> Adolescence is the first stage where the crowd comes from inside the player, so there is no edge of it to walk out of.

**Threat:** contact · **Colour:** `#5E95C3` (adolescence-mid) · **Silhouette:** bolt

**48px** — a fat three-stroke zigzag, taller than wide, thick enough to carry
two dots on the middle stroke. In a horde it is a squiggle with a face: correct.

**Visual** — flat mid blue, one shadow tone. Eyes straight out, a wide flat
grin. It is thrilled. It does not know about what.

**Behaviour** — `chase`, entering at `spawnAt: 'trail'`: where the player was
`TRAIL_SECONDS` ago, on screen, in their own wake. Faster than the rival sperm,
slower than the player, weak, never in short supply. The clique had an edge you
walked into; this crowd comes out of your footsteps and follows. A player who
stands still longer than `TRAIL_SECONDS` is standing where it arrives.

**Why it earns its slot** — the only crowd in the life that arrives on screen,
which makes Baggage (the trail) its build; and it runs Prom's race (§4).

### 3.2 · Driver's ed — velocity

**`whyThisStage`** — lift verbatim:

> Adolescence is the only stage where the most dangerous thing the player will ever do is scheduled as a class.

**Threat:** contact · **Colour:** `#C4472E` (threat-contact) · **Silhouette:** wheels

**48px** — side-on: a lumpy hatchback on two ink wheels, a flat plate on the
roof. The wheels are the read; the plate is what makes it a lesson.

**Visual** — flat contact red, ink wheels, a bone plate. The windscreen is the
face: two dots looking along the road and a flat line — the one face in §3 not
looking at the player, because it was taught not to. The instructor is never
drawn (law 9): the plate on the roof is the instructor.

**Behaviour** — `cross` with `patrol`: it enters aimed at where the player
stands, drives to the arena's edge and reverses back down the same line,
forever (a patrol is never culled). The first enemy in the life faster than the
player; it never steers or brakes, and its hit is the act's heaviest. The hall
monitor's line at a speed nobody can walk (`G-001`).

**Why it earns its slot** — the only enemy the player cannot outrun, so it is
answered by timing alone; every one adds a road, and by Prom they cross the floor.

### 3.3 · Acne — accumulator

**`whyThisStage`** — lift verbatim:

> Adolescence is the first stage where the player's own body gets to every important moment first, and it cannot be shot because it is theirs.

**Threat:** none to health — a drag stack · **Colour:** `#6E6353` (shadow), head
`#D2C6AC` (bone) · **Silhouette:** dome

**48px** — a low dome on a flat base, a bone dot on top. The act's one sprite
under 48px, as the antibody was; if it fails `readable-48px-silhouette`, raise
the size, never add detail.

**Visual** — flat shadow, one bone dot. Eyes straight out, a small proud smile.
It has been waiting for today. It is drawn as the spot, never the face it is
on: there is no skin tone anywhere in this act.

**Behaviour** — `static`, `invulnerable`, `spawnAt: 'lead'`, `contact: 'attach'`.
It appears `ANTIBODY_LEAD` ahead of wherever the player is heading and stays;
it cannot be shot and is never culled, so every one the player swerved around
is still on the floor at Prom. Walking into one attaches it, one stack on the
antibody's drag curve (`antibodyDrag`, shared on purpose): the only way to clear
one from the floor is to wear it. The stacks come off at the crossing, as every
attach stack does; for this one it is simply true. The antibody drifted to where
the player was going; acne is already there, waiting (`G-001`).

**Why it earns its slot** — it turns the player's own heading into the threat.
A straight-line kite walks into every one; the floor fills with the rest.

### 3.4 · Standardised test — roadblock

**`whyThisStage`** — lift verbatim:

> Adolescence is the first stage where one morning with a pencil decides where the player goes next, and the morning was booked before anyone asked if they were ready.

**Threat:** elite · **Colour:** `#7C5C8A` (threat-elite) · **Silhouette:** tall sheet

**48px** — an upright portrait rectangle, one column of ink dots down its left
edge, one filled. The column is the whole read.

**Visual** — flat elite purple, ink dots. Eyes straight out, a flat line. It is
completely calm. It has all morning.

**Behaviour** — `chase` at the slowest speed in the act, large and tanky, with
`contact: 'engulf'`: touching it holds the player, slows them hard and deals
damage across the hold. That is sitting it. The player can always walk out,
slowly — its speed stays below an engulfed player's at full drag, a relationship
and not a number — and it follows at walking pace for the rest of the act,
because chasers are never culled. Ignore them and a queue follows you across
the arena: the retakes. It is the white cell's successor with the white cell's
engulf (`G-001`): the white cell crossed without noticing you and the hall
monitor closed a line you could time; the test has your name on it and arrives
on the date.

**Why it earns its slot** — elite XP and target priority, and Temper is the
only build that wants to sit it.

### 3.5 · Group chat — ranged

**`whyThisStage`** — lift verbatim:

> Adolescence is the first stage where the room is carried home in a pocket, and it keeps talking about the player after they have left.

**Threat:** ranged · **Colour:** `#6E6353` (shadow) body; `#D69A3C` on its
notification only (`G-031`) · **Silhouette:** speech bubble

**48px** — a fat rounded bubble, wider than tall, one tail at a bottom corner.
The tail is the read.

**Visual** — flat shadow grey: the colour of messages that are theirs, not
yours. Eyes straight out, a small smirk. While it consults, the face is
replaced by three ink dots. No avatars, no names; nobody in it is drawn.

**Behaviour** — `chase`, `contact: 'none'`, `ranged`. It follows, slower than
the player. In range and off cooldown it stops and types — the consult, and the
three dots are the telegraph — sends one gold notification at where the player
is, and resumes following. It never touches the player; it has no need to.
Killing it is leaving the chat. The substitute had to look the player up; this
one already knows where they are (`G-010`). School's placeholder projectile was
a stand-in for a joke. This one is a gold dot, which is what a notification is.

**Why it earns its slot** — aimed pressure from the act's first minute, and it
gets worse the longer the player stays still: stop, and they gather and type.

### 3.6 · Introduction order and placeholder schedule

**Every number from here to the end of §4 is a placeholder.** Nobody has played
any of it; `ADOLESCENCE.provisional` carries the sentence (D-022), and a person
at the link is what moves them.

**The order is the design.** Age runs 13 to 18, a year every 48 seconds, and
each enemy arrives about when it does in a life: hormones from 0s (13), acne at
24s, the group chat at 48s (14), the standardised test at 120s, driver's ed at
144s (16). School held gold back so it would mean something; here it arrives in
the first minute and means that it is always there. Nothing new arrives after
144s; the last 96 seconds are escalation, then Prom.

| id | movement | contact | other fields | hp | speed | contactDamage | radius | displaySize | xp |
|---|---|---|---|---|---|---|---|---|---|
| `hormones` | chase | damage | `spawnAt: 'trail'` | 2 | 58 | 4 | 14 | 48 | 1 |
| `acne` | static | attach | `spawnAt: 'lead'`, `invulnerable`, `attach: { drag: 0.03 }` | 1 | 0 | 0 | 12 | 44 | 0 |
| `group-chat` | chase | none | `ranged: { range: 420, consultSeconds: 0.8, cooldownSeconds: 3.5, projectileSpeed: 260, damage: 6 }` | 10 | 70 | 0 | 24 | 72 | 5 |
| `standardised-test` | chase | engulf | `engulf: { seconds: 1.2, slow: 0.35, damagePerSecond: 10 }` | 48 | 18 | 0 | 34 | 96 | 12 |
| `drivers-ed` | cross | damage | `patrol: true` | 30 | 240 | 16 | 26 | 88 | 8 |

Each has `act: 'adolescence'`, `frame: '<id>.png'` and its §3 heading as `name`
(the certificate prints it). The test's 18 against an engulfed 43 is §3.4.

```ts
export const ADOLESCENCE: ActDef = {
  id: 'adolescence', name: 'Adolescence', durationSeconds: 240, bossName: 'Prom',
  age: { from: 13, to: 18 }, race: { enemyId: 'hormones', absorb: 40 },
  provisional:
    "Every rate, time and enemy number here, the race's absorb count and Prom's ring, floor and cadence were written as placeholders before anyone played the act; a person playing it at the link is what moves them (D-022).",
  waves: [
    { fromSeconds: 0, enemyId: 'hormones', rate: 1.2 },
    { fromSeconds: 24, enemyId: 'acne', rate: 0.15 },
    { fromSeconds: 48, enemyId: 'group-chat', rate: 0.06 },
    { fromSeconds: 48, enemyId: 'hormones', rate: 2.2 },
    { fromSeconds: 96, enemyId: 'acne', rate: 0.25 },
    { fromSeconds: 96, enemyId: 'hormones', rate: 3.5 },
    { fromSeconds: 120, enemyId: 'group-chat', rate: 0.12 },
    { fromSeconds: 120, enemyId: 'standardised-test', rate: 0.03 },
    { fromSeconds: 144, enemyId: 'drivers-ed', rate: 0.03 },
    { fromSeconds: 144, enemyId: 'hormones', rate: 5.5 },
    { fromSeconds: 192, enemyId: 'acne', rate: 0.4 },
    { fromSeconds: 192, enemyId: 'group-chat', rate: 0.2 },
    { fromSeconds: 192, enemyId: 'hormones', rate: 8 },
    { fromSeconds: 192, enemyId: 'standardised-test', rate: 0.06 },
    { fromSeconds: 216, enemyId: 'drivers-ed', rate: 0.06 },
  ],
};
```

This passes `content.test.ts`'s act rules as written. Four of the five are never
culled, so their rates are counts: an act that kills nothing spawns about five
tests, four cars, fifty spots and twenty chats.

## 4 · Prom

**What it is.** The event, drawn as its mirror ball: a sphere on a chain over
the dance floor, where the boss spawns, never moving. Boss teal tiled with ink
grout and a few bone glints, in the full boss register (D-018); a face across
four tiles, low and off-centre like the Egg's, eyes closed, smiling. It is
having the best night of its life. No dancers, no dates, no crowns: nobody at
Prom is drawn (law 9, D-007).

**What it does.** Three parts, all borrowed.

- **The race** (the Egg's, `G-040`). When it appears, every living hormone
  stops following the player and goes to the dance. Each one that reaches the
  ball is gone; if forty get there before the player empties it, the
  certificate reads *Cause of death: Someone else. Age 18.* It is the second
  race of the player's life, and the first one they were invited to.
- **The floor** (the Gym Teacher's untouchability, SCHOOL-ROSTER §9, pointed at
  the player). It takes no damage while the player is off the dance floor.
  Nobody wins Prom from the wall.
- **The light.** Idle, it turns; its telegraph is the lights going down; its
  attack is a full ring of gold spots in every direction, each ring turned a
  step from the last so the spots sweep the room — the first attack in the life
  aimed at nobody. They are densest under the ball, which is where the floor
  is, and they thin the racers as the Egg's spread thins the rivals.

Everything already on the field stays. The cars keep driving their roads across
the dance floor, the tests keep coming, and the group chat is still typing.

**The ending.** At zero it does not fall (`G-033`'s latch holds). The house
lights come up, a camera flashes, and the act ends on one word: **SMILE.** A
death to its light prints *Cause of death: Prom. Age 18.* Until Service or
College exists, beating it ends the life, and the certificate says natural
causes at eighteen.

**Numbers.** A ring of sixteen spots turned half a spacing per attack; the Egg's
telegraph, idle, spot speed and damage; a dance floor of radius 360 around the
ball, inside Reflex's reach so the starting weapon works from its edge;
`race.absorb` forty; health `BOSS_HP`.

**Sim cost.** The Egg's race as act data (built), its five-shot fan widened to
a full ring that turns a step per attack, and the Gym Teacher's untouchability
check pointed at the player's distance from the ball — on the per-act boss
selector the Gym Teacher's build adds, since today every act fights the Egg.

**Built 2026-09-27.** `PromBoss { kind: 'prom', floorRadius: 360, spots: 16 }`,
both under `provisional`; the light reads the Egg's timings and shot (`EGG_*`,
world.ts), the Egg unchanged. The HUD says *get on the floor* while `shielded`;
`BossState.rings` counts rings. Only the boss's shots thin the racers: the group
chat's pass through the dance. Bots: all 36 Prom fights end (35 won, on the floor
76–100% of it; one race lost in 1.4s); in a life the build kills it before its
first ring (31 of 31), so no bot has seen the light. `prom.test.ts`.

## 5 · Handoff

- **The palette bound.** The tones take `FULL_PALETTE` to 23; `pipeline.test.ts`
  asserts 16–20. `ART-DIRECTION.md`'s open item reads twenty as the on-screen
  budget (eleven per act), which admits it, and G-038 says law 3 waits on the
  register batch: a decision record moves the bound, not a quiet test edit.
- **One registry.** Five entries in `ENEMIES` under an Adolescence section
  (CONCEPTION-ROSTER §5.3), a test pinning the act to exactly these five as
  School's is pinned, a drawing for each plus `boss-prom`, `ADOLESCENCE` into
  `ALL_ACTS` after `SCHOOL`, and into `ACTS` once its atlas and frames exist.
- **The name Group Chat is taken.** G-039 gave it to a weapon (`group-chat` in
  `items.ts`). PLAN.md has had group chats in this act's horde since 2026-08-01,
  and the weapon's chain is the panel's Gossip ("Travels on its own. Loses
  nothing in the telling."): the weapon should take that name. A G-entry decides.
- **The attached sprite.** `ActScene` draws every attach stack as
  `antibody.png`. In this act it has to draw acne.

**Lifted 2026-09-27**: data in `enemies.ts`/`acts.ts`, tones and reservations in `tools/art`, D-028 and G-041 written; drawings and Prom's behaviour still owed.

## 6 · Not designed yet

- **The player at thirteen.** G-003's face and cowlick, one frame; taller is
  Growth Spurt's joke, and Growth Spurt is not in the pool.
- **Adolescence's items.** What enters G-039's pool at thirteen is unwritten.
- **The document at the crossing**: the report card's successor, a yearbook page.
- **Sounds** (the typing, the car, the slow song), and **Service or College**,
  where the life goes at eighteen.

## 7 · Open question

Three of the five follow the player: on paper the escalation, and played it
could be Conception again in different hats. Play it — does being followed feel
like being looked at, or like the rival sperm? Only a person can say which.
