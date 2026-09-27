/**
 * Enemy definitions. Data, never hardcoded into systems.
 *
 * `whyThisStage` is required of every enemy before it ships (PLAN.md
 * mechanism 2). One sentence. A "flying skull" cannot answer it; a "substitute
 * teacher who does not know your name" can. There is a test that fails the
 * build if any entry is missing one, because the whole point of the rule is
 * that it survives a long unattended run with nobody reading the diffs.
 *
 * Numbers are from CONCEPTION-ROSTER.md §3.4 and SCHOOL-ROSTER.md §3.6, and
 * are starting values in both. The relationships are the design commitment —
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
  /** `attach` only. Fraction of movement speed removed per stack. */
  attach?: { drag: number };
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
   * distance ahead of the player's current heading. Defaults to `edge`.
   */
  spawnAt?: 'edge' | 'lead';
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
    // NOT BUILT: where it lands. §3.3 says homework "spawns where the player
    // has recently been", and "recently" is a number nobody has set — the
    // same class of dial as ANTIBODY_LEAD, which G-020 shows is the knob that
    // decides whether an arrival mechanic exists at all. Left at the default
    // entry point rather than invented, so this is a placeholder standing in
    // for a decision, not the decision.
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
    // NOT BUILT: "touching it stops the player dead for a moment" (§3.4). The
    // moment is a duration and the roster does not give one. Contact is
    // elite-tier damage and nothing else until somebody sets it; the
    // roadblock reads off the patrol line, which needs no number.
    contact: 'damage',
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
    // NOT BUILT: the attack, which is the entire reason this enemy is in the
    // roster. §3.5 gates the intended projectile — the player's name, spelled
    // wrong — on the run carrying a player name, which G-002's certificate
    // needs and which does not exist. The roster says a placeholder is needed
    // and that it "should not be designed around"; every number a placeholder
    // would take (consult time, cadence, projectile speed, damage, range) is
    // one nobody has set. So this is currently a slow enemy that does not
    // pursue, and the act's ranged pressure — the whole point of School under
    // G-010 — is not in the game.
    whyThisStage:
      'School is the first place the player is judged by someone who does not know who they are, and the substitute is that experience with a lanyard on.',
  },
};

export function enemyDef(id: string): EnemyDef {
  const def = ENEMIES[id];
  if (!def) throw new Error(`Unknown enemy "${id}"`);
  return def;
}
