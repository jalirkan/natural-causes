/**
 * Enemy definitions. Data, never hardcoded into systems.
 *
 * `whyThisStage` is required of every enemy before it ships (PLAN.md
 * mechanism 2). One sentence. A "flying skull" cannot answer it; a "substitute
 * teacher who does not know your name" can. There is a test that fails the
 * build if any entry is missing one, because the whole point of the rule is
 * that it survives a long unattended run with nobody reading the diffs.
 *
 * Numbers are from CONCEPTION-ROSTER.md §3.4, SCHOOL-ROSTER.md §3.6 and
 * ADOLESCENCE-ROSTER.md §3.6, and are starting values in all three. The relationships are the design commitment —
 * the white cell is an order of magnitude tankier and slower than everything
 * else, the antibody's contact damage is nearly zero on purpose, homework
 * cannot hurt anyone at all — and the absolute figures are the playtest bots'
 * to move.
 *
 * ONE REGISTRY, and for the reason CONCEPTION-ROSTER §5.3 gives about items:
 * the content tests enforce their rules by iterating a collection, so a
 * second collection beside this one is a rule that silently stops applying to
 * an act. School is a section in here, not a sibling of here.
 */

/** How an enemy crosses the field. */
export type Movement =
  /** Steers at the player every frame. */
  | 'chase'
  /** Enters on a fixed heading taken at spawn and never steers again. */
  | 'cross'
  /** Drifts on a current that never acknowledged the player at all. */
  | 'drift'
  /** Lands and stays. Belongs to the arena rather than to the player. */
  | 'static';

/** What happens when it touches the player. */
export type Contact =
  | 'damage'
  /** Holds the player, slows them hard, and deals damage over the window. */
  | 'engulf'
  /** Despawns, sticks to the player, and adds a drag stack that never expires. */
  | 'attach'
  /**
   * Nothing at all. It is not doing anything to anyone.
   *
   * Not the same as `damage` with `contactDamage: 0`: that path calls `hurt`,
   * which sets i-frames, so a harmless enemy would hand the player free
   * invulnerability every time they brushed it.
   */
  | 'none';

export interface EnemyDef {
  id: string;
  name: string;
  /**
   * The act this enemy belongs to.
   *
   * Not decoration: law 11 reserves silhouettes per act, and a test asserts
   * every enemy here holds one in its own act's list. Without this field that
   * check has nothing to join on, and the reserved list goes back to being a
   * document that constrains the art pipeline and not the game.
   *
   * Typed as a string rather than the pipeline's `ActId` on purpose. This
   * module is imported by the browser build and by the bots; `tools/art` is
   * Node-side and pulls in sharp, so the join happens in the test, which is
   * allowed to import both.
   */
  act: string;
  /** Frame name in the act atlas. */
  frame: string;
  hp: number;
  /** Pixels per second. */
  speed: number;
  /** Damage dealt on contact, per hit. */
  contactDamage: number;
  /** Collision radius in world pixels, at display size. */
  radius: number;
  /** On-screen size. Law 7 authors everything to read at 48px. */
  displaySize: number;
  /** Experience dropped on death. */
  xp: number;
  /**
   * REMOVED by G-032. The field did two unrelated jobs and both have moved:
   * threat colour is now stated in the generation prompt and verified by
   * CONFORM and CHECK, and value correction is `enemy-value-ceiling`, a check
   * whose failure regenerates with a mutated seed rather than being papered
   * over on the GPU.
   */
  movement: Movement;
  contact: Contact;
  /** `engulf` only. */
  engulf?: { seconds: number; slow: number; damagePerSecond: number };
  /**
   * `attach` only. `drag`: fraction of movement speed removed per stack.
   * `tax` (COLLEGE-ROSTER §3.3): the share of every gem's value each worn
   * stack takes, compounding. `persists`: the stacks stay on through the
   * crossing instead of coming off with the act, so the next act inherits
   * them. Both absent everywhere but tuition. `cooldownMultiplier`
   * (OFFICE-ROSTER §3.3): each worn stack multiplies every active item's
   * cooldown — the ping costs cadence, never speed (its `drag` is 0).
   */
  attach?: { drag: number; tax?: number; persists?: boolean; cooldownMultiplier?: number };
  /**
   * COLLEGE-ROSTER §3.4: all the hp sits in one of four quadrants about the
   * centre, rolled at spawn from the world's dice. A hit counts only when it
   * lands there — a shot by where it strikes, an orbiter or a sweep by where
   * it is, an area by covering the centre — and a hit elsewhere neither hurts
   * nor flashes. The drawing does not say which.
   */
  weakPoint?: boolean;
  /**
   * OFFICE-ROSTER §3.1: when it dies it spawns `children` of itself at `scale`
   * of its hp, radius and size, each of which splits again, `generations`
   * deep; only the last generation drops the XP. The same def with a
   * generation on the state, never a second entry.
   */
  split?: { children: number; generations: number; scale: number };
  /**
   * OFFICE-ROSTER §3.4: a hold, not a mover. Spawned centred on the player
   * (`spawnAt: 'player'`), it contracts from `from` px to `to` over `seconds`,
   * holds at `to` for `holdSeconds`, then ends. Inside it everything moves at
   * `slow` (through `slowAt`); its edge is a wall for enemies both ways and
   * never for the player. No damage, no drop.
   */
  hold?: { from: number; to: number; seconds: number; holdSeconds: number; slow: number };
  /**
   * Weapons do not affect it (G-018). Shots pass through, areas ignore it, it
   * is never a kill and drops nothing.
   *
   * The alternative was a large `hp`, which makes the enemy's presence a
   * function of the player's damage output — a treadmill needing re-tuning
   * against every weapon buff for seven acts, firing hardest at the players
   * already losing. You cannot shoot a document.
   */
  invulnerable?: boolean;
  /**
   * Where it enters (G-020). `edge` is the arena rim; `lead` is a fixed
   * distance ahead of the player's current heading; `trail` is where the
   * player was `TRAIL_SECONDS` ago (world.ts), read off a short record of
   * where they have been. Defaults to `edge`.
   */
  spawnAt?: 'edge' | 'lead' | 'trail' | 'player';
  /** Zone hazards. Bursts on a timer, never on proximity. */
  burst?: { fuseSeconds: number; ringRadius: number; ringSeconds: number; ringDamage: number };
  /**
   * SCHOOL-ROSTER.md §4 — the three behaviours `EnemyDef` could not express.
   * All three are flags rather than systems, and all three are load-bearing
   * for the act rather than flourishes.
   *
   * Reflects off the arena edges and never despawns (dodgeball). It steers at
   * nothing and targets nothing; the threat is a function of where the player
   * is standing rather than of anything the ball does, which is what makes
   * the arena edges matter for the first time.
   */
  bounce?: boolean;
  /**
   * Reverses at the arena edges and retraces the same line (hall monitor).
   *
   * The difference from `bounce` is the whole design difference between the
   * two enemies and it is one line of arithmetic: a bounce reflects the
   * component that crossed the edge and goes somewhere new, a patrol negates
   * both and comes back along the line it arrived on. One closes a lane you
   * time; the other is weather.
   */
  patrol?: boolean;
  /**
   * Static, combines with its own kind on arrival, and solid to every mover
   * (homework).
   *
   * One flag rather than three because the roster hands it over as one — a
   * pile that merges but is not solid does not change the shape of the arena,
   * which is the only reason the enemy exists.
   */
  merge?: boolean;
  /**
   * An aimed attack (substitute teacher, SCHOOL-ROSTER §3.5).
   *
   * With the player within `range` and no cooldown running, it stops and
   * consults for `consultSeconds` — the standing still IS the telegraph, body
   * language rather than a colour flash — then fires one hostile shot at
   * where the player is at that moment, resumes its own movement, and cannot
   * begin another consult for `cooldownSeconds`. The shot is never corrected.
   */
  ranged?: {
    range: number;
    consultSeconds: number;
    cooldownSeconds: number;
    projectileSpeed: number;
    damage: number;
    /**
     * COLLEGE-ROSTER §3.5: seconds the player's input is ignored when the shot
     * lands — the hall monitor's stop, delivered by post. Its i-frames run
     * from the end of the stop, as `contactStun`'s do.
     */
    stun?: number;
    /**
     * OFFICE-ROSTER §3.5: the share of the player's progress toward the next
     * level a landing shot takes back — never a level already reached.
     */
    xpLoss?: number;
  };
  /**
   * Seconds the player's input is ignored after this enemy's contact damage
   * lands (hall monitor, §3.4: "stops the player dead for a moment").
   * Alongside the hit's i-frames, never instead of them; a second touch
   * refreshes the window and never extends it past this value.
   */
  contactStun?: number;
  /** One sentence. Required. */
  whyThisStage: string;
}

export const ENEMIES: Record<string, EnemyDef> = {
  'rival-sperm': {
    id: 'rival-sperm',
    name: 'Rival sperm',
    act: 'conception',
    frame: 'rival-sperm.png',
    hp: 3,
    speed: 46,
    contactDamage: 4,
    radius: 15,
    displaySize: 48,
    xp: 1,
    movement: 'chase',
    contact: 'damage',
    whyThisStage:
      'Conception is the only competition the player has already won, so the game opens by making it feel like a commute.',
  },

  antibody: {
    id: 'antibody',
    name: 'Antibody',
    act: 'conception',
    frame: 'antibody.png',
    // hp is inert: it cannot be damaged. Kept at 1 so nothing divides by zero.
    hp: 1,
    invulnerable: true,
    speed: 34,
    // It costs speed and never health, and it is not a kill, so it drops no XP.
    contactDamage: 0,
    radius: 11,
    displaySize: 44,
    xp: 0,
    movement: 'drift',
    contact: 'attach',
    // G-020: arrival was the binding constraint, not toughness. Only the entry
    // point moved — speed, invulnerability, contact damage and rate are all
    // unchanged.
    spawnAt: 'lead',
    // Retained for reference; the curve now lives in World.antibodyDrag,
    // because G-018 made the per-stack cost diminishing rather than flat.
    attach: { drag: 0.03 },
    whyThisStage:
      'Conception is where the first record about the player is opened, and it describes a category rather than a person.',
  },

  spermicide: {
    id: 'spermicide',
    name: 'Spermicide',
    act: 'conception',
    frame: 'spermicide.png',
    hp: 6,
    speed: 20,
    contactDamage: 9,
    radius: 26,
    displaySize: 72,
    xp: 3,
    movement: 'drift',
    contact: 'damage',
    burst: { fuseSeconds: 4.5, ringRadius: 130, ringSeconds: 1.6, ringDamage: 9 },
    whyThisStage:
      'Conception is the first stage where the environment was made lethal in advance by someone who will never be told whether it worked.',
  },

  'white-cell': {
    id: 'white-cell',
    name: 'White cell',
    act: 'conception',
    frame: 'white-cell.png',
    hp: 44,
    speed: 16,
    contactDamage: 14,
    radius: 34,
    displaySize: 96,
    xp: 12,
    movement: 'cross',
    contact: 'engulf',
    engulf: { seconds: 0.9, slow: 0.35, damagePerSecond: 14 },
    whyThisStage:
      'Before the player is anyone at all, there is already a process whose only job is to stop things that look like them.',
  },

  /**
   * School (SCHOOL-ROSTER.md §3). Five swarm-tier enemies.
   *
   * Numbers are §3.6's starting values, transcribed. They are the roster's
   * commitment rather than this file's: "relationships are the design; the
   * values are a starting point and the bots own them." Nothing here was
   * chosen, and nothing here has been played. `SCHOOL` in acts.ts spawns them
   * on a schedule that is labelled provisional (D-022); the title cannot start
   * the act until its art exists.
   *
   * The act's costume of the life script: you are sorted by people who are also
   * being sorted, judged by adults who have not been told who you are, and the
   * day has a shape you did not agree to. Nothing in the act has anything
   * against the player, which is law 8 and is also the joke.
   */
  clique: {
    id: 'clique',
    name: 'Clique',
    act: 'school',
    frame: 'clique.png',
    hp: 9,
    speed: 28,
    contactDamage: 5,
    radius: 38,
    displaySize: 88,
    xp: 3,
    // It occupies; it does not pursue. `drift` is the movement that never
    // acknowledged the player, which is exactly what this is — the cost is
    // not the contact damage, it is that a clique in the wrong place turns a
    // two-way route into a one-way one.
    movement: 'drift',
    contact: 'damage',
    whyThisStage:
      'School is the first place that has an inside, and the player finds out where they are by walking into the edge of it.',
  },

  dodgeball: {
    id: 'dodgeball',
    name: 'Dodgeball',
    act: 'school',
    frame: 'dodgeball.png',
    hp: 4,
    speed: 165,
    contactDamage: 11,
    radius: 14,
    displaySize: 44,
    xp: 2,
    // Enters on a fixed vector and never steers again, which is `cross`, and
    // then keeps it forever, which is `bounce`. The purest law-8 enemy in the
    // game: it has no relationship to the player at all and it will still
    // take a third of their health.
    movement: 'cross',
    contact: 'damage',
    bounce: true,
    whyThisStage:
      'School is where the player is first hurt by something that was aimed at the room rather than at them.',
  },

  homework: {
    id: 'homework',
    name: 'Homework',
    act: 'school',
    frame: 'homework.png',
    hp: 14,
    speed: 0,
    contactDamage: 0,
    radius: 30,
    displaySize: 72,
    xp: 1,
    movement: 'static',
    // Zero damage AND `none`: the two are not the same thing. See `Contact`.
    contact: 'none',
    merge: true,
    // BUILT as a labelled placeholder (D-022): where it lands. §3.3 says
    // homework "spawns where the player has recently been", so it lands where
    // the player was TRAIL_SECONDS ago (world.ts) and merges there. "Recently"
    // is the same class of dial as ANTIBODY_LEAD, which G-020 shows decides
    // whether an arrival mechanic exists at all; its value is a PLACEHOLDER
    // under SCHOOL's `provisional` label, and a person watching where the
    // paper lands behind them is what moves it.
    spawnAt: 'trail',
    whyThisStage:
      'School is the first stage that follows the player home and takes up the part of the day nobody was counting.',
  },

  'hall-monitor': {
    id: 'hall-monitor',
    name: 'Hall monitor',
    act: 'school',
    frame: 'hall-monitor.png',
    hp: 40,
    speed: 22,
    contactDamage: 13,
    radius: 26,
    displaySize: 88,
    xp: 11,
    movement: 'cross',
    // BUILT as a labelled placeholder (D-022): "touching it stops the player
    // dead for a moment" (§3.4). The moment is `contactStun`, a duration the
    // roster does not give. PLACEHOLDER 0.4s under SCHOOL's `provisional`
    // label — long enough to read as a stop, shorter than the 0.6s i-frames
    // it rides alongside; a person walking into it at the link moves it.
    contact: 'damage',
    contactStun: 0.4,
    patrol: true,
    whyThisStage:
      'School is where authority is first handed to someone with no more standing than the player, and it works anyway.',
  },

  'substitute-teacher': {
    id: 'substitute-teacher',
    name: 'Substitute teacher',
    act: 'school',
    frame: 'substitute-teacher.png',
    hp: 12,
    speed: 24,
    contactDamage: 6,
    radius: 20,
    displaySize: 96,
    xp: 5,
    movement: 'cross',
    contact: 'damage',
    // BUILT as a labelled placeholder (D-022): the attack, which is the
    // entire reason this enemy is in the roster and the act's only ranged
    // pressure (G-010). It stops, consults the clipboard, and fires one shot
    // at where the player is; see `ranged` on EnemyDef. The intended
    // projectile — the player's name, spelled wrong — still waits on the run
    // carrying a player name (G-002); that is a design dependency, not a
    // number, and this shot is a stand-in for a joke, not a joke. Gold is the
    // shot's colour (G-031) and belongs to the renderer.
    //
    // PLACEHOLDER, all five, under SCHOOL's `provisional` label; none has
    // been played, and a person dodging it at the link is what moves them:
    //   range 420 — Lash's range, so it opens fire from about where the
    //     starting weapon reaches it;
    //   consultSeconds 0.8 — about the Egg's 0.85s telegraph;
    //   cooldownSeconds 4 — "a few seconds";
    //   projectileSpeed 260 — the Egg's shot speed;
    //   damage 8 — under the dodgeball's 11, so the aimed thing is not the
    //     worst thing in the room.
    ranged: { range: 420, consultSeconds: 0.8, cooldownSeconds: 4, projectileSpeed: 260, damage: 8 },
    whyThisStage:
      'School is the first place the player is judged by someone who does not know who they are, and the substitute is that experience with a lanyard on.',
  },

  /**
   * Adolescence (ADOLESCENCE-ROSTER.md §3). Five swarm-tier enemies, and not
   * one new field: every behaviour below is a field Conception or School
   * already needed.
   *
   * Numbers are §3.6's table, transcribed, and every one is a PLACEHOLDER
   * under `ADOLESCENCE.provisional` (D-022). Nobody has played any of it. The
   * relationships are the roster's commitment — the car is the first thing in
   * the life faster than the player, the test is slower than an engulfed
   * player can walk, acne cannot be shot — and a person at the link moves the
   * figures. The act is in `ALL_ACTS` and not in `ACTS` until its art exists.
   *
   * The act's costume of the life script: everything is suddenly about you,
   * and none of it is for you. Every face in the act looks straight out of the
   * screen at the person playing, except the car's, which has its eyes on the
   * road. Three of the five follow the player; that is the new pressure.
   */
  hormones: {
    id: 'hormones',
    name: 'Hormones',
    act: 'adolescence',
    frame: 'hormones.png',
    hp: 2,
    // Faster than the rival sperm, slower than the player, weak, never in
    // short supply. It is the act's race (`ADOLESCENCE.race`): at Prom every
    // living one stops following the player and goes to the dance.
    speed: 58,
    contactDamage: 4,
    radius: 14,
    displaySize: 48,
    xp: 1,
    movement: 'chase',
    contact: 'damage',
    // The clique had an edge you walked into; this crowd comes out of your
    // footsteps. It enters where the player was TRAIL_SECONDS ago (world.ts),
    // on screen and in their own wake — homework's arrival on a chaser. A
    // player who stands still longer than that is standing where it arrives.
    spawnAt: 'trail',
    whyThisStage:
      'Adolescence is the first stage where the crowd comes from inside the player, so there is no edge of it to walk out of.',
  },

  acne: {
    id: 'acne',
    name: 'Acne',
    act: 'adolescence',
    frame: 'acne.png',
    // hp is inert: it cannot be damaged. Kept at 1 so nothing divides by zero.
    hp: 1,
    invulnerable: true,
    speed: 0,
    // It costs speed and never health, and it is not a kill, so no XP.
    contactDamage: 0,
    radius: 12,
    displaySize: 44,
    xp: 0,
    // The antibody drifted to where the player was going; acne is already
    // there, waiting (G-001). It appears ANTIBODY_LEAD ahead of the player's
    // heading and stays: static, so never culled, and every one the player
    // swerved around is still on the floor at Prom.
    movement: 'static',
    spawnAt: 'lead',
    // The only way to clear one from the floor is to wear it: one stack on the
    // antibody's drag curve (World.antibodyDrag, shared on purpose). `drag` is
    // the antibody's, retained for the same reason the antibody retains it.
    // The stacks come off at the crossing, as every attach stack does.
    contact: 'attach',
    attach: { drag: 0.03 },
    whyThisStage:
      "Adolescence is the first stage where the player's own body gets to every important moment first, and it cannot be shot because it is theirs.",
  },

  'group-chat': {
    id: 'group-chat',
    name: 'Group chat',
    act: 'adolescence',
    frame: 'group-chat.png',
    hp: 10,
    // Follows, slower than the player.
    speed: 70,
    contactDamage: 0,
    radius: 24,
    displaySize: 72,
    xp: 5,
    movement: 'chase',
    // It never touches the player; it has no need to. Zero damage AND `none`,
    // for the reason `Contact` gives.
    contact: 'none',
    // The substitute's attack on a chaser (G-010). In range and off cooldown
    // it stops and types — the consult, and the renderer's three dots are the
    // telegraph — sends one gold notification at where the player is (G-031:
    // the gold is the shot's, never the body's) and resumes following. The
    // substitute had to look the player up; this one already knows where they
    // are. Stop, and they gather and type.
    //
    // PLACEHOLDER, all five, under ADOLESCENCE's `provisional` label: the
    // substitute's numbers, with a shorter cooldown and a lighter hit because
    // there are more of them and they arrive in the first minute.
    ranged: { range: 420, consultSeconds: 0.8, cooldownSeconds: 3.5, projectileSpeed: 260, damage: 6 },
    whyThisStage:
      'Adolescence is the first stage where the room is carried home in a pocket, and it keeps talking about the player after they have left.',
  },

  'standardised-test': {
    id: 'standardised-test',
    name: 'Standardised test',
    act: 'adolescence',
    frame: 'standardised-test.png',
    hp: 48,
    // The slowest thing in the act, and the relationship is the design: its
    // speed stays below an engulfed player's at full drag, so the player can
    // always walk out of it, slowly (18 against an engulfed 43, §3.4). Chasers
    // are never culled, so ignore them and a queue follows you across the
    // arena: the retakes.
    speed: 18,
    contactDamage: 0,
    radius: 34,
    displaySize: 96,
    xp: 12,
    movement: 'chase',
    // Sitting it. The white cell's successor with the white cell's engulf
    // (G-001): the white cell crossed without noticing you; the test has your
    // name on it and arrives on the date.
    contact: 'engulf',
    engulf: { seconds: 1.2, slow: 0.35, damagePerSecond: 10 },
    whyThisStage:
      'Adolescence is the first stage where one morning with a pencil decides where the player goes next, and the morning was booked before anyone asked if they were ready.',
  },

  'drivers-ed': {
    id: 'drivers-ed',
    name: "Driver's ed",
    act: 'adolescence',
    frame: 'drivers-ed.png',
    hp: 30,
    // The first enemy in the life faster than the player. It never steers or
    // brakes, so it is answered by timing alone.
    speed: 240,
    // The act's heaviest hit, and its only red thing.
    contactDamage: 16,
    radius: 26,
    displaySize: 88,
    xp: 8,
    // Enters aimed at where the player stands, drives to the arena's edge and
    // reverses back down the same line, forever: the hall monitor's line at a
    // speed nobody can walk (G-001). A patrol is never culled, so every one
    // adds a road, and by Prom they cross the dance floor.
    movement: 'cross',
    contact: 'damage',
    patrol: true,
    whyThisStage:
      'Adolescence is the only stage where the most dangerous thing the player will ever do is scheduled as a class.',
  },

  // --- College (COLLEGE-ROSTER §3) ---
  //
  // Five enemies, four swarm-tier and one elite (the group project). Three
  // behaviours are new, each a field rather than a system: `attach.tax` and
  // `attach.persists` (tuition, §3.3), `weakPoint` (the group project, §3.4)
  // and `ranged.stun` (the registrar, §3.5). Everything else is a field an
  // earlier act already needed.
  //
  // EVERY NUMBER BELOW IS A PLACEHOLDER under `COLLEGE.provisional` (acts.ts,
  // D-022): §3.6's table transcribed, nothing chosen here and nothing played.
  // The relationships are the roster's — the deadline is the fastest and
  // heaviest thing in the life so far, tuition cannot be shot and costs XP
  // rather than health, the registrar's shot costs a second rather than a
  // life — and a person at the link moves the figures, never the bots.
  //
  // The act's costume of the life script: you are paying for this. Nothing in
  // it is a person (D-007, law 9), and nothing in it is paying attention to
  // the player (law 8): the registrar is looking at the file.
  reading: {
    id: 'reading',
    name: 'Reading',
    act: 'college',
    frame: 'reading.png',
    hp: 3,
    speed: 52,
    contactDamage: 3,
    radius: 14,
    displaySize: 48,
    xp: 1,
    // The rival sperm and the hormones again, from the edge: weak, slow, and
    // never in short supply. It comes in stacks because the schedule does.
    movement: 'chase',
    contact: 'damage',
    spawnAt: 'edge',
    whyThisStage:
      'College is the first stage where the work arrives faster than it can be done and nobody checks whether it was.',
  },

  deadline: {
    id: 'deadline',
    name: 'Deadline',
    act: 'college',
    frame: 'deadline.png',
    hp: 30,
    // Faster than driver's ed and heavier: the act's heaviest hit, and its
    // only red thing. Driver's ed without the wheels.
    speed: 300,
    contactDamage: 18,
    radius: 24,
    displaySize: 84,
    xp: 8,
    // Enters aimed at where the player stands and patrols that line for good.
    // Its cadence is the schedule's (about one every thirty seconds, §3.2), so
    // the player learns when to expect it and still gets caught.
    movement: 'cross',
    contact: 'damage',
    patrol: true,
    whyThisStage:
      'College is where the date first crosses the room on its own schedule and does not slow down for anyone standing in it.',
  },

  tuition: {
    id: 'tuition',
    name: 'Tuition',
    act: 'college',
    frame: 'tuition.png',
    // hp is inert: it cannot be damaged. Kept at 1 so nothing divides by zero.
    hp: 1,
    invulnerable: true,
    speed: 0,
    // It costs XP and speed, never health, and it is not a kill, so no XP.
    contactDamage: 0,
    radius: 12,
    displaySize: 44,
    xp: 0,
    // Acne's arrival: already where the player is going, and it stays. The
    // only way off the floor is to wear it.
    movement: 'static',
    spawnAt: 'lead',
    contact: 'attach',
    // One drag stack on the antibody's curve like every attach, and two new
    // costs (World.xpTax, World.beginAct): each worn invoice takes `tax` of
    // every gem's value, compounding, and the invoices do NOT come off at the
    // crossing. The Office will inherit them, and that is the joke (§3.3).
    attach: { drag: 0.03, tax: 0.08, persists: true },
    whyThisStage:
      'College is the first stage that takes a share of everything the player earns from then on, and the share does not come off at the end of the act.',
  },

  'group-project': {
    id: 'group-project',
    name: 'Group project',
    act: 'college',
    frame: 'group-project.png',
    // The elite: the slow, heavy thing that costs the most to get past.
    hp: 60,
    speed: 20,
    contactDamage: 12,
    radius: 34,
    displaySize: 100,
    xp: 14,
    movement: 'chase',
    contact: 'damage',
    // All its hp is in one of four quadrants, rolled at spawn (World.addEnemy,
    // `hitsWeakPoint`). A shot counts by where it strikes, an orbiter or a
    // sweep by where it is, an area by covering the centre; anything else
    // does nothing and does not flash. The drawing does not say which lump.
    weakPoint: true,
    whyThisStage:
      'College is where the player is first graded on something four were assigned and one did, and finding out which one costs more than doing the work.',
  },

  registrar: {
    id: 'registrar',
    name: 'Registrar',
    act: 'college',
    frame: 'registrar.png',
    hp: 14,
    speed: 0,
    contactDamage: 0,
    radius: 26,
    displaySize: 80,
    xp: 6,
    // A counter: it stays where it lands and never touches anyone. Zero damage
    // AND `none`, for the reason `Contact` gives.
    movement: 'static',
    contact: 'none',
    // The substitute's consult, from a window (G-010). In range and off
    // cooldown it consults the file — the bell and the slot are the telegraph
    // — and posts one gold form at where the player is (G-031: the gold is the
    // form's, never the counter's). A hit does little damage and stops the
    // player for `stun` seconds, the hall monitor's stop by post; the i-frames
    // run from the end of the stop (AUDIT part three, 18).
    ranged: { range: 440, consultSeconds: 0.9, cooldownSeconds: 4, projectileSpeed: 240, damage: 4, stun: 0.5 },
    whyThisStage:
      'College is the first stage where the aimed thing is not a hit but a hold, placed by a window that has never seen the player and has the file.',
  },
};

export function enemyDef(id: string): EnemyDef {
  const def = ENEMIES[id];
  if (!def) throw new Error(`Unknown enemy "${id}"`);
  return def;
}
