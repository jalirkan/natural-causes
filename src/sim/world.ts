import type { ActDef, SpawnWave } from '../data/acts';
import { rateAt, spawnStreams } from '../data/acts';
import { enemyDef, type EnemyDef } from '../data/enemies';
import { ITEMS, isActive, itemDef, type ItemDef } from '../data/items';
import { Grid } from './grid';

/**
 * The whole game, with no renderer in it.
 *
 * Everything that decides what happens lives here: movement, spawning,
 * collision, levelling, items, the boss. `ActScene` reads this and draws it;
 * the playtest bots run it directly with no browser at all.
 *
 * The split is not tidiness. Bots that re-implement the rules measure a
 * different game from the one people play, and their numbers would be worse
 * than no numbers — confidently wrong rather than absent. One rule set, two
 * front ends, so a bot result is a statement about the real game.
 *
 * Determinism is the other half: the only randomness is `this.rng`, seeded per
 * run, so a seed reproduces a run exactly and a failure found by a bot can be
 * replayed.
 */

export const PLAYER_BASE_SPEED = 190;
export const PLAYER_BASE_HP = 100;
export const PLAYER_RADIUS = 16;
/** Seconds of immunity after a hit. Without it a crowd deletes you. */
export const IFRAMES = 0.6;
export const MAX_ACTIVE_ENEMIES = 1500;
export const DESPAWN_RADIUS = 1600;
export const DRIFT_SPREAD = (120 * Math.PI) / 180;
/**
 * Antibody drag: a curve with a floor, not a cap (G-025).
 *
 * The floor is an ASYMPTOTE on resulting speed, not a clamp on stack count.
 * Marginal drag is strictly positive at every count, so the fiftieth stack
 * still costs something and an enemy that spawns for five minutes keeps
 * mattering for all five.
 *
 * The previous form clamped with `max(FLOOR, ...)`, which flattened at about
 * 17 stacks. Under an honest instrument the operating range is 48-76, so the
 * cap WAS the operating point. Two consequences, and the second is why this is
 * a ruling rather than a tidy-up:
 *
 *   - Stacks 18 through 76 did nothing at all.
 *   - §8.4's dispersion condition passed at 2.5x while both of its terms sat
 *     above the clamp, so the careful policy and the careless one arrived at
 *     exactly the same speed. Experienced dispersion was 1.0x. A criterion
 *     reporting "working" while the property it detects has gone to zero is
 *     worse than a stale one, because nothing downstream ever asks again.
 *
 * §3.3 asks for three properties: no single stack feels unfair, the aggregate
 * is decisive, the player cannot say when it went wrong. A clamp keeps the
 * first and third and breaks the second the moment it is reached.
 *
 * PLACEHOLDER VALUES. Both numbers below are placeholders awaiting §11.5, the
 * session with a human. The shape is settled (G-025); neither value is.
 *
 * ANTIBODY_FLOOR is 0.65 because that is the RETIRED SAFETY-VALVE value from
 * §7.5 — a number chosen to prevent a death spiral, not to express an intended
 * worst case. It is not a design choice and should not be treated as one.
 * §3.3's intended worst case is that a careless run *ends*; a player at 65%
 * speed is inconvenienced. Cowork's starting guess is 0.35-0.45, offered to be
 * reacted to rather than as a proposal.
 */
export const ANTIBODY_DRAG_K = 0.03;
export const ANTIBODY_FLOOR = 0.65;
/** How close a gem has to be before it comes to the player. */
export const MAGNET_RADIUS = 96;
export const GEM_SPEED = 320;
export const RING_BAND = 6;
/** Spawn ring radius. Matches the 1280x720 viewport the game is authored at. */
export const SPAWN_RADIUS = 780;
/** The Egg is roughly 8x player height and does not move from centre. */
export const BOSS_RADIUS = 150;
/**
 * The Egg's constant radial pull, in pixels per second. **Zero: dropped.**
 *
 * G-019 reverses G-015. The pull was chosen to fix a participation problem that
 * did not exist — the 97% and 86% boss-HP-remaining that motivated it were two
 * defects in the playtest instrument, and with those fixed the short builds
 * participate fully with this at zero. What remained was characterisation, and
 * the A/B killed that too: motility, greedy-capacitation and random score
 * identically in both arms (56/56, 100/100, 94/94), so what shipped was a
 * range-dependent assist to the two builds that already wanted to be close
 * rather than the universal positional question G-015 described.
 *
 * The constant and the code path stay, deliberately (§8.2). Two reasons:
 *
 * 1. The §7.2 non-negotiable test stays live, and now guards against anyone
 *    reintroducing an inward force without re-deriving the slowest legal
 *    build. That is worth more than the feature was.
 * 2. It is the cheapest experiment available if the fight reads as a shooting
 *    gallery in front of a human, which is the one piece of evidence nobody
 *    has.
 *
 * **EXPIRY (§8.2).** If Justin plays the Egg fight and does not ask for
 * something in this space, delete this constant and `applyBossPull` at the next
 * close. An inert feature is a fossil; an expiry is what makes it a knob.
 */
export const BOSS_PULL = 0;

/**
 * How far ahead of the player an antibody appears (G-020).
 *
 * Antibodies stop entering at the arena edge. Survivability was never the
 * binding constraint on them — arrival was. A thing drifting at 34 against a
 * player at 190, which the bot routes around at 260px, does not need to be
 * tougher; it needs to not be approaching from somewhere the player is leaving.
 *
 * This is the tuning dial and it is monotonic between the two failure modes
 * §8.4 separates: a longer lead gives more time to change heading and fewer
 * stacks, a shorter lead gives less and more. Spawn rate is the second knob and
 * stays fixed until this one is settled.
 */
export const ANTIBODY_LEAD = 320;
/**
 * Calibrated against measured bot damage, not guessed.
 *
 * The first figure was 900, invented with no basis. Bots reached the boss in
 * 11 of 12 runs and left 75-99% of it standing, so the fight was not hard —
 * it was arithmetic that could not close. This is set so a build that has come
 * together kills it in roughly forty seconds and a build that has not, does
 * not. Expect the bots to move it again.
 */
export const BOSS_HP = 320;

export interface EnemyState {
  /** Monotonic. Lets a piercing shot avoid re-hitting without a Set per shot. */
  uid: number;
  hitBySerial: number;
  def: EnemyDef;
  x: number;
  y: number;
  vx: number;
  vy: number;
  hp: number;
  age: number;
  hitFlash: number;
  /**
   * Size and worth, per instance rather than per definition.
   *
   * They were read off `def` everywhere until homework arrived, and homework
   * merges: two piles become one larger pile, so an enemy's radius, drawn
   * size and XP stop being properties of its kind. Every other enemy in the
   * game initialises these from its def and never changes them, so nothing
   * about Conception moves.
   */
  radius: number;
  displaySize: number;
  xp: number;
}

export interface ProjectileState {
  x: number;
  y: number;
  vx: number;
  vy: number;
  life: number;
  damage: number;
  pierce: number;
  radius: number;
  /** Boss shots. The only things in the act that aim at the player. */
  hostile: boolean;
  /** Identifies this shot to enemies it has already hit. */
  serial: number;
}

export interface RingState {
  x: number;
  y: number;
  age: number;
  seconds: number;
  maxRadius: number;
  damage: number;
}

export interface AreaState {
  x: number;
  y: number;
  age: number;
  seconds: number;
  radius: number;
  damage: number;
  /** Attractors pull instead of hurting. */
  pull: boolean;
  /**
   * True for a lingering field, false for a one-shot burst.
   *
   * Ticking damage is scaled by dt, so a short-lived area was delivering a
   * fraction of its listed damage while a long-lived one delivered many times
   * it: Acrosome's 0.12s burst landed 0.72x its number and Wake's 2.4s trail
   * landed 14.4x. That is not a balance problem, it is two different effects
   * sharing one formula.
   */
  tick: boolean;
  /** One-shot areas hit each enemy once. Reuses the projectile serial trick. */
  serial: number;
}

export interface GemState {
  x: number;
  y: number;
  value: number;
}

export interface BossState {
  x: number;
  y: number;
  hp: number;
  maxHp: number;
  /** `idle` → `telegraph` → `attack`, then back. Death is `absorbing`. */
  phase: 'idle' | 'telegraph' | 'attack' | 'absorbing';
  timer: number;
}

export interface Input {
  moveX: number;
  moveY: number;
}

export interface WorldOptions {
  act: ActDef;
  seed?: number;
  /** Items the run starts with. */
  startingItems?: string[];
  /**
   * Overrides the Egg's pull, for A/B experiments only.
   *
   * Exists so the pull can be isolated from everything else that changed in
   * the same pass. Not a difficulty setting — the shipped value is BOSS_PULL.
   */
  bossPull?: number;
  /**
   * Forces every enemy's entry point, for A/B experiments only.
   *
   * G-020 and G-019 landed together and §8.5 assumed they could not confound
   * each other. They can: antibody stacks cost speed, so moving where
   * antibodies arrive moves every policy's effective speed, and a slower
   * short-range build participates in the boss fight less. This isolates it.
   */
  spawnOverride?: 'edge' | 'lead';
}

function mulberry32(seed: number): () => number {
  let a = seed >>> 0;
  return () => {
    a = (a + 0x6d2b79f5) >>> 0;
    let t = Math.imul(a ^ (a >>> 15), 1 | a);
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

/**
 * The drag curve, exported so the playtest report can convert stack counts
 * into experienced speed without duplicating the formula.
 *
 * A ratio of stack counts is only meaningful if both terms sit where the
 * quantity still maps to player experience (G-026). Reading dispersion off
 * raw counts is what let §8.4 pass while measuring nothing.
 */
export function antibodyDragFor(stacks: number): number {
  return ANTIBODY_FLOOR + (1 - ANTIBODY_FLOOR) / (1 + stacks * ANTIBODY_DRAG_K);
}

/**
 * The playfield, in world pixels.
 *
 * Lives here rather than in `config.ts` because the boss needs it and the
 * simulation must stay Node-safe for the bots. `config.ts` re-exports these.
 *
 * The player is clamped to these inside `step()` — see `clampPlayer`. It used
 * to be done by `ActScene` afterwards, which gave the bots a field with no
 * walls and measurably distorted every baseline (AUDIT.md finding 11).
 */
export const ARENA_WIDTH = 3200;
export const ARENA_HEIGHT = 2200;

function clamp(v: number, lo: number, hi: number): number {
  return v < lo ? lo : v > hi ? hi : v;
}

/** Removes index `i` in O(1). Reorders the array — walk backwards. */
function swapRemove<T>(arr: T[], i: number): void {
  const last = arr.pop()!;
  if (i < arr.length) arr[i] = last;
}

export class World {
  readonly act: ActDef;
  readonly seed: number;
  private readonly rng: () => number;
  private readonly streams: Map<string, SpawnWave[]>;
  private readonly accumulators = new Map<string, number>();
  private readonly cooldowns = new Map<string, number>();
  private readonly grid = new Grid<EnemyState>();
  /** Reused query buffer. The hot path must not allocate. */
  private readonly near: EnemyState[] = [];
  /**
   * Solid enemies, refilled during the movement pass each step.
   *
   * Rebuilt rather than maintained, for the reason `Grid` gives: there is no
   * stale state to get wrong, and a pile killed last step cannot be pushed
   * out of by this one.
   */
  private readonly solids: EnemyState[] = [];
  /**
   * The widest enemy alive, for query padding.
   *
   * Every grid query padded by a flat 64px, which was true of every enemy in
   * Conception and stops being true the moment two homework piles merge: a
   * shot aimed at the edge of a 90px pile would be looked up in cells the
   * pile is not in and pass through it.
   */
  private maxEnemyRadius = 0;
  private nextUid = 1;
  private nextSerial = 1;
  private bossHitSerial = 0;

  time = 0;
  dead = false;
  won = false;
  /** Set when the run ends, for the bots' report. */
  outcome: 'alive' | 'died' | 'won' = 'alive';

  /**
   * Set to the middle of the arena by the constructor.
   *
   * These defaulted to (0, 0) and only `ActScene` moved the player to the
   * centre, so every bot run started in the top-left CORNER. With no walls in
   * the simulation that was invisible; adding them made it a real handicap and
   * it broke two tests that had been passing only because the player could
   * flee off the field forever.
   */
  x = 0;
  y = 0;
  facingX = 1;
  facingY = 0;
  hp = PLAYER_BASE_HP;
  invulnerable = 0;
  engulfTimer = 0;
  engulfSlow = 1;
  engulfDps = 0;
  dragStacks = 0;

  level = 1;
  xp = 0;
  xpToNext = 5;
  kills = 0;
  /** Levels reached but not yet spent. See `presentOffers`. */
  private pendingLevels = 0;
  /** Non-null while a level-up is waiting. The world does not advance. */
  offers: string[] | null = null;
  readonly items = new Map<string, number>();

  enemies: EnemyState[] = [];
  projectiles: ProjectileState[] = [];
  rings: RingState[] = [];
  areas: AreaState[] = [];
  gems: GemState[] = [];
  boss: BossState | null = null;

  readonly bossPull: number;
  readonly spawnOverride: 'edge' | 'lead' | undefined;

  constructor(options: WorldOptions) {
    this.act = options.act;
    this.bossPull = options.bossPull ?? BOSS_PULL;
    this.spawnOverride = options.spawnOverride;
    this.seed = options.seed ?? 1;
    this.rng = mulberry32(this.seed);
    this.streams = spawnStreams(options.act.waves);
    this.x = ARENA_WIDTH / 2;
    this.y = ARENA_HEIGHT / 2;
    for (const id of options.startingItems ?? ['lash']) this.items.set(id, 1);
  }

  // --- derived stats ----------------------------------------------------

  /** Product of a passive multiplier across every level the player owns. */
  private passiveProduct(pick: (d: Extract<ItemDef, { kind: 'passive' }>) => number): number {
    let out = 1;
    for (const [id, level] of this.items) {
      const def = ITEMS[id];
      if (!def || def.kind !== 'passive') continue;
      out *= pick(def) ** level;
    }
    return out;
  }

  get maxHp(): number {
    return PLAYER_BASE_HP * this.passiveProduct((d) => d.healthMultiplier);
  }

  /**
   * Speed multiplier from attached antibodies (G-025).
   *
   * Approaches ANTIBODY_FLOOR asymptotically and never reaches it, so every
   * additional stack costs something and no count is a cliff.
   */
  get antibodyDrag(): number {
    return antibodyDragFor(this.dragStacks);
  }

  /**
   * Speed from items alone — no antibody drag, no engulf.
   *
   * The exogenous half of the player's speed: what the build chose, rather
   * than what happened to it. Correlating stacks against *realised* speed is
   * circular, because stacks are one of the things that lowers realised speed.
   * This is the variable §9.3's speed hypothesis is actually about.
   */
  get itemSpeed(): number {
    return PLAYER_BASE_SPEED * this.passiveProduct((d) => d.speedMultiplier);
  }

  /** Movement speed ignoring transient effects. The pull is measured against this. */
  get baseSpeed(): number {
    return PLAYER_BASE_SPEED * this.passiveProduct((d) => d.speedMultiplier) * this.antibodyDrag;
  }

  get speed(): number {
    return this.baseSpeed * (this.engulfTimer > 0 ? this.engulfSlow : 1);
  }

  get damageTaken(): number {
    return this.passiveProduct((d) => d.damageTakenMultiplier);
  }

  /** Capacitation: below baseline early, well above it late. */
  get damageDealt(): number {
    const progress = Math.min(1, this.time / this.act.durationSeconds);
    let out = 1;
    for (const [id, level] of this.items) {
      const def = ITEMS[id];
      if (!def || def.kind !== 'passive') continue;
      const at = def.damageMultiplier + (def.rampTo - def.damageMultiplier) * progress;
      out *= at ** level;
    }
    return out;
  }

  private activeDamage(def: ItemDef, level: number): number {
    if (!isActive(def)) return 0;
    return def.damage * (1 + 0.35 * (level - 1)) * this.damageDealt;
  }

  private activeCooldown(def: ItemDef, level: number): number {
    if (!isActive(def)) return Infinity;
    return def.cooldown * Math.max(0.4, 1 - 0.08 * (level - 1));
  }

  // --- the step ---------------------------------------------------------

  step(dt: number, input: Input): void {
    // A pending level-up freezes the world. The choice is the only input.
    if (this.offers || this.dead || this.won) return;

    this.time += dt;
    this.invulnerable = Math.max(0, this.invulnerable - dt);

    this.movePlayer(dt, input);
    this.applyBossPull(dt);
    // Unconditional, and after every path that can move the player. Hanging it
    // off `movePlayer` meant a frame with no input did not clamp at all, so any
    // other way of setting a position escaped the field.
    this.clampPlayer();
    if (!this.boss) this.spawn(dt);
    this.moveEnemies(dt);
    // Rebuilt after movement so every query this step sees current positions.
    this.grid.build(this.enemies);
    this.resolveSolids();
    this.applyAttractors(dt);
    this.fireItems(dt);
    this.moveProjectiles(dt);
    this.updateRings(dt);
    this.updateAreas(dt);
    this.updateGems(dt);
    this.resolveHits();
    this.resolveContact(dt);
    this.updateBoss(dt);

    if (!this.boss && this.time >= this.act.durationSeconds) this.spawnBoss();
  }

  private movePlayer(dt: number, input: Input): void {
    const len = Math.hypot(input.moveX, input.moveY);
    if (len === 0) return;
    const nx = input.moveX / len;
    const ny = input.moveY / len;
    this.facingX = nx;
    this.facingY = ny;
    this.x += nx * this.speed * dt;
    this.y += ny * this.speed * dt;
  }

  /**
   * The arena has walls, and they belong HERE.
   *
   * `ActScene` used to do this after `step()`, which meant the bots simulated a
   * field a player could walk out of forever. That is not a tidiness point: a
   * cornered player cannot keep running, and measuring it showed the bots were
   * playing a materially easier game — median survival 92s against 76s, 174
   * kills against 109, over thirty seeds of identical input. Every baseline
   * taken before this was biased in the same direction, and re-running them
   * moved the ranking of builds, not just the difficulty: motility fell 33% to
   * 8% because a cornered player fires into the wall they are facing.
   */
  private clampPlayer(): void {
    this.x = clamp(this.x, 0, ARENA_WIDTH);
    this.y = clamp(this.y, 0, ARENA_HEIGHT);
  }

  /**
   * G-015. Constant magnitude, no falloff, no dependence on the boss's health
   * or on anything the player does. The fight is an orbit.
   */
  private applyBossPull(dt: number): void {
    const b = this.boss;
    if (!b) return;
    const d = Math.hypot(b.x - this.x, b.y - this.y);
    if (d < 1) return;
    this.x += ((b.x - this.x) / d) * this.bossPull * dt;
    this.y += ((b.y - this.y) / d) * this.bossPull * dt;
  }

  /** One concurrent stream per enemy, each with its own rate and accumulator. */
  private spawn(dt: number): void {
    for (const [enemyId, stream] of this.streams) {
      const rate = rateAt(stream, this.time);
      if (rate === 0) continue;
      const acc = (this.accumulators.get(enemyId) ?? 0) + rate * dt;
      let whole = Math.floor(acc);
      this.accumulators.set(enemyId, acc - whole);
      while (whole > 0 && this.enemies.length < MAX_ACTIVE_ENEMIES) {
        whole--;
        this.spawnEnemy(enemyId);
      }
    }
  }

  /**
   * Enemies that belong to the arena rather than to the player's neighbourhood
   * (SCHOOL-ROSTER.md §3).
   *
   * The distance cull exists so drifters that wandered off do not accumulate.
   * These three are the opposite case: a dodgeball bounces "indefinitely", a
   * hall monitor patrols end to end, and homework is the enemy that changes
   * the shape of the room. Culling any of them at 1600px would mean the room
   * quietly reset itself every time the player walked away from it.
   */
  private static belongsToArena(def: EnemyDef): boolean {
    return def.bounce === true || def.patrol === true || def.movement === 'static';
  }

  spawnEnemy(id: string): void {
    const def = enemyDef(id);
    let x: number;
    let y: number;

    if ((this.spawnOverride ?? def.spawnAt) === 'lead') {
      // G-020: already where the player is going. It does not pursue, steer or
      // react — the player's own forward motion does all the closing, which is
      // the most law-8-compliant behaviour available. It is also whyThisStage
      // made literal: the record was opened before they arrived.
      x = this.x + this.facingX * ANTIBODY_LEAD;
      y = this.y + this.facingY * ANTIBODY_LEAD;
    } else {
      const angle = this.rng() * Math.PI * 2;
      x = this.x + Math.cos(angle) * SPAWN_RADIUS;
      y = this.y + Math.sin(angle) * SPAWN_RADIUS;
    }
    let vx = 0;
    let vy = 0;

    if (def.movement === 'cross') {
      // Aimed at where the player happens to be now, and never corrected.
      const d = Math.hypot(this.x - x, this.y - y) || 1;
      vx = ((this.x - x) / d) * def.speed;
      vy = ((this.y - y) / d) * def.speed;
    } else if (def.movement === 'drift') {
      // A current that crosses the arena. See D-019 for why this is not a
      // uniformly random heading.
      const inbound = Math.atan2(this.y - y, this.x - x);
      const spread = (this.rng() - 0.5) * DRIFT_SPREAD;
      vx = Math.cos(inbound + spread) * def.speed;
      vy = Math.sin(inbound + spread) * def.speed;
    }

    // Merge on arrival (SCHOOL-ROSTER.md §3.3). A pile that lands on an
    // existing pile does not become a second pile; the one already there gets
    // bigger, tougher and worth more.
    //
    // Conserving rather than choosing: the merged radius is area-preserving
    // (r = hypot(r1, r2)) and hp and XP are summed, so the paper that arrived
    // is the paper that is there. The roster says the merged shape is LARGER
    // and leaves the rest to playtest — "playtest owns the number, not the
    // shape" — and conservation is the only growth rule available that
    // introduces no free parameter for playtest to have to own.
    // A linear scan, deliberately: piles arrive rarely and the alternative is
    // the spatial grid, which holds LAST step's positions — a pile that landed
    // earlier in this same step would not be in it, and two piles would end up
    // on top of each other exactly when the act is at its busiest.
    if (def.merge) {
      for (const pile of this.enemies) {
        if (pile.def.id !== def.id || pile.hp <= 0) continue;
        if (Math.hypot(pile.x - x, pile.y - y) >= pile.radius + def.radius) continue;
        const grown = Math.hypot(pile.radius, def.radius);
        pile.displaySize *= grown / pile.radius;
        pile.radius = grown;
        pile.hp += def.hp;
        pile.xp += def.xp;
        return;
      }
    }

    this.enemies.push({
      uid: this.nextUid++,
      hitBySerial: 0,
      def,
      x, y, vx, vy,
      hp: def.hp,
      age: 0,
      hitFlash: 0,
      radius: def.radius,
      displaySize: def.displaySize,
      xp: def.xp,
    });
  }

  private moveEnemies(dt: number): void {
    this.solids.length = 0;
    this.maxEnemyRadius = 0;

    for (let i = this.enemies.length - 1; i >= 0; i--) {
      const e = this.enemies[i]!;
      e.age += dt;
      if (e.hitFlash > 0) e.hitFlash -= dt;
      if (e.radius > this.maxEnemyRadius) this.maxEnemyRadius = e.radius;
      if (e.def.merge) this.solids.push(e);

      if (e.def.movement === 'chase') {
        const d = Math.hypot(this.x - e.x, this.y - e.y) || 1;
        e.x += ((this.x - e.x) / d) * e.def.speed * dt;
        e.y += ((this.y - e.y) / d) * e.def.speed * dt;
      } else if (e.def.movement !== 'static') {
        e.x += e.vx * dt;
        e.y += e.vy * dt;
      }

      // The arena edge, for the two enemies that have a relationship with it.
      //
      // The test is "past the bound AND still heading further out", not "past
      // the bound", because both of these enter from the spawn ring, which is
      // outside the arena more often than not. Without the second half a
      // dodgeball would turn around before it ever arrived.
      if (e.def.bounce === true || e.def.patrol === true) {
        const outX = (e.x < 0 && e.vx < 0) || (e.x > ARENA_WIDTH && e.vx > 0);
        const outY = (e.y < 0 && e.vy < 0) || (e.y > ARENA_HEIGHT && e.vy > 0);
        if (outX || outY) {
          if (e.def.patrol === true) {
            // Reverse BOTH components: it comes back along the line it went
            // out on, which is what makes a patrol a line rather than a path.
            e.vx = -e.vx;
            e.vy = -e.vy;
          } else {
            // Reflect only the component that crossed, which is what makes a
            // bounce go somewhere new.
            if (outX) e.vx = -e.vx;
            if (outY) e.vy = -e.vy;
          }
        }
      }

      if (e.def.burst && e.age >= e.def.burst.fuseSeconds) {
        this.rings.push({
          x: e.x,
          y: e.y,
          age: 0,
          seconds: e.def.burst.ringSeconds,
          maxRadius: e.def.burst.ringRadius,
          damage: e.def.burst.ringDamage,
        });
        swapRemove(this.enemies, i);
        continue;
      }

      if (
        e.def.movement !== 'chase' &&
        !World.belongsToArena(e.def) &&
        Math.hypot(e.x - this.x, e.y - this.y) > DESPAWN_RADIUS
      ) {
        swapRemove(this.enemies, i);
      }
    }
  }

  /**
   * Homework is solid, to the player and to everything else (§3.3).
   *
   * Position-based rather than force-based: an overlapping mover is placed on
   * the pile's edge along the line it came in on. A pile does not push back
   * over time, it is simply somewhere you are not, which is the whole content
   * of "by minute four the room the player started in is a corridor".
   *
   * Costs nothing in an act with no piles: `solids` is filled during the
   * movement pass that was already walking the array, and this returns on the
   * first line.
   */
  private resolveSolids(): void {
    if (this.solids.length === 0) return;

    for (const s of this.solids) {
      if (s.hp <= 0) continue;

      const need = s.radius + PLAYER_RADIUS;
      const dx = this.x - s.x;
      const dy = this.y - s.y;
      const d = Math.hypot(dx, dy);
      if (d < need) {
        // A pile that lands exactly on the player has no direction to push
        // them; any consistent one will do, and this one is deterministic.
        if (d < 0.001) this.x = s.x + need;
        else {
          this.x = s.x + (dx / d) * need;
          this.y = s.y + (dy / d) * need;
        }
      }

      this.grid.query(s.x, s.y, s.radius + this.maxEnemyRadius, this.near);
      for (const e of this.near) {
        // Piles do not push each other: merging is what happens when two of
        // them meet, and it happens on arrival.
        if (e === s || e.def.merge === true || e.hp <= 0) continue;
        const r = s.radius + e.radius;
        const ex = e.x - s.x;
        const ey = e.y - s.y;
        const ed = Math.hypot(ex, ey);
        if (ed >= r) continue;
        if (ed < 0.001) {
          e.x = s.x + r;
        } else {
          e.x = s.x + (ex / ed) * r;
          e.y = s.y + (ey / ed) * r;
        }
      }
    }

    // Pushing the player off a pile can push them off the field.
    this.clampPlayer();
  }

  /**
   * Attractors pull the crowd toward a point. Chemotaxis is the only thing in
   * the act that moves an enemy against its own behaviour.
   *
   * Driven from the areas rather than from the enemies: there are a handful of
   * areas and up to 1500 enemies, so asking "who is near this attractor" is
   * cheap and asking every enemy "is any attractor near me" is not.
   */
  private applyAttractors(dt: number): void {
    for (const a of this.areas) {
      if (!a.pull) continue;
      this.grid.query(a.x, a.y, a.radius, this.near);
      for (const e of this.near) {
        const d = Math.hypot(a.x - e.x, a.y - e.y);
        if (d > a.radius || d < 1) continue;
        const strength = (1 - d / a.radius) * 130 * dt;
        e.x += ((a.x - e.x) / d) * strength;
        e.y += ((a.y - e.y) / d) * strength;
      }
    }
  }

  /** The boss as a seeking target, if it exists and is in range of its edge. */
  private bossAsTarget(within: number): { x: number; y: number } | null {
    const b = this.boss;
    if (!b || b.phase === 'absorbing') return null;
    const d = Math.hypot(b.x - this.x, b.y - this.y);
    return d - BOSS_RADIUS <= within ? { x: b.x, y: b.y } : null;
  }

  /** Grid padding: the flat 64 was every enemy in Conception, and is not every pile. */
  private get queryPad(): number {
    return this.maxEnemyRadius > 64 ? this.maxEnemyRadius : 64;
  }

  private nearestEnemy(within: number): EnemyState | null {
    let best: EnemyState | null = null;
    let bestD = within * within;
    this.grid.query(this.x, this.y, within, this.near);
    for (const e of this.near) {
      const d2 = (e.x - this.x) ** 2 + (e.y - this.y) ** 2;
      if (d2 < bestD) {
        bestD = d2;
        best = e;
      }
    }
    return best;
  }

  private fireItems(dt: number): void {
    for (const [id, level] of this.items) {
      const def = itemDef(id);
      if (!isActive(def)) continue;

      const remaining = (this.cooldowns.get(id) ?? 0) - dt;
      if (remaining > 0) {
        this.cooldowns.set(id, remaining);
        continue;
      }

      const damage = this.activeDamage(def, level);
      const fired = this.fireOne(def, level, damage);
      this.cooldowns.set(id, fired ? this.activeCooldown(def, level) : 0.1);
    }
  }

  /** Returns false if the item had nothing to do, so it retries sooner. */
  private fireOne(def: ItemDef, level: number, damage: number): boolean {
    if (!isActive(def)) return false;

    switch (def.mode) {
      case 'seeking': {
        // The boss is a target. It was not, and that meant Lash — the weapon
        // every run starts with — could not touch the Egg at all: with normal
        // spawning stopped there was often nothing in `enemies`, so a seeking
        // weapon simply never fired. It only ever hit the boss by accident,
        // when a shot aimed at a rival happened to pass through it.
        const enemy = this.nearestEnemy(def.range);
        const target = enemy ?? this.bossAsTarget(def.range);
        if (!target) return false;
        const d = Math.hypot(target.x - this.x, target.y - this.y) || 1;
        this.projectiles.push({
          x: this.x,
          y: this.y,
          vx: ((target.x - this.x) / d) * def.projectileSpeed,
          vy: ((target.y - this.y) / d) * def.projectileSpeed,
          life: def.range / def.projectileSpeed,
          damage,
          pierce: def.pierce,
          radius: def.radius,
          hostile: false,
          serial: this.nextSerial++,
        });
        return true;
      }
      case 'line': {
        // Along the player's facing, whatever is there. It does nothing about
        // what is behind them, which is the trade.
        this.projectiles.push({
          x: this.x,
          y: this.y,
          vx: this.facingX * def.projectileSpeed,
          vy: this.facingY * def.projectileSpeed,
          life: def.range / def.projectileSpeed,
          damage,
          pierce: def.pierce,
          radius: def.radius,
          hostile: false,
          serial: this.nextSerial++,
        });
        return true;
      }
      case 'burst': {
        this.areas.push({
          x: this.x,
          y: this.y,
          age: 0,
          seconds: 0.12,
          radius: def.radius * (1 + 0.08 * (level - 1)),
          damage,
          pull: false,
          tick: false,
          serial: this.nextSerial++,
        });
        return true;
      }
      case 'trail': {
        this.areas.push({
          x: this.x,
          y: this.y,
          age: 0,
          seconds: def.range,
          radius: def.radius,
          damage,
          pull: false,
          tick: true,
          serial: this.nextSerial++,
        });
        return true;
      }
      case 'attractor': {
        this.areas.push({
          x: this.x,
          y: this.y,
          age: 0,
          seconds: 3.2,
          radius: def.radius,
          damage: 0,
          pull: true,
          tick: true,
          serial: this.nextSerial++,
        });
        return true;
      }
    }
  }

  private moveProjectiles(dt: number): void {
    for (let i = this.projectiles.length - 1; i >= 0; i--) {
      const p = this.projectiles[i]!;
      p.x += p.vx * dt;
      p.y += p.vy * dt;
      p.life -= dt;
      if (p.life <= 0) swapRemove(this.projectiles, i);
    }
  }

  private updateRings(dt: number): void {
    for (let i = this.rings.length - 1; i >= 0; i--) {
      const r = this.rings[i]!;
      r.age += dt;
      if (r.age >= r.seconds) {
        swapRemove(this.rings, i);
        continue;
      }
      if (this.invulnerable > 0) continue;
      const radius = r.maxRadius * (r.age / r.seconds);
      const d = Math.hypot(this.x - r.x, this.y - r.y);
      if (Math.abs(d - radius) <= RING_BAND + PLAYER_RADIUS) this.hurt(r.damage);
    }
  }

  private updateAreas(dt: number): void {
    for (let i = this.areas.length - 1; i >= 0; i--) {
      const a = this.areas[i]!;
      a.age += dt;
      if (a.age >= a.seconds) {
        swapRemove(this.areas, i);
        continue;
      }
      if (a.pull || a.damage <= 0) continue;
      this.grid.query(a.x, a.y, a.radius + this.queryPad, this.near);
      for (const e of this.near) {
        if (e.def.invulnerable || e.hp <= 0) continue;
        if (Math.hypot(e.x - a.x, e.y - a.y) > a.radius + e.radius) continue;
        if (a.tick) {
          e.hp -= a.damage * dt * 6;
        } else {
          if (e.hitBySerial === a.serial) continue;
          e.hitBySerial = a.serial;
          e.hp -= a.damage;
        }
        e.hitFlash = 0.08;
      }
    }
    // Once, after every area — not once per area. Reaping inside the loop
    // made this O(areas x enemies), which is exactly the cost the grid was
    // added to remove: Wake alone keeps ~13 areas alive against a 1500-enemy
    // cap, so it was ~20,000 needless checks a frame for one item.
    this.reapDead();
  }

  private updateGems(dt: number): void {
    for (let i = this.gems.length - 1; i >= 0; i--) {
      const g = this.gems[i]!;
      const d = Math.hypot(this.x - g.x, this.y - g.y);
      if (d < MAGNET_RADIUS) {
        g.x += ((this.x - g.x) / (d || 1)) * GEM_SPEED * dt;
        g.y += ((this.y - g.y) / (d || 1)) * GEM_SPEED * dt;
      }
      if (d < PLAYER_RADIUS) {
        this.gainXp(g.value);
        swapRemove(this.gems, i);
      }
    }
  }

  private resolveHits(): void {
    for (let pi = this.projectiles.length - 1; pi >= 0; pi--) {
      const p = this.projectiles[pi]!;
      if (p.hostile) continue;
      this.grid.query(p.x, p.y, p.radius + this.queryPad, this.near);
      for (const e of this.near) {
        // You cannot shoot a document (G-018).
        if (e.def.invulnerable || e.hitBySerial === p.serial || e.hp <= 0) continue;
        const r = e.radius + p.radius;
        if ((e.x - p.x) ** 2 + (e.y - p.y) ** 2 > r * r) continue;

        e.hitBySerial = p.serial;
        e.hp -= p.damage;
        e.hitFlash = 0.08;
        if (--p.pierce <= 0) {
          swapRemove(this.projectiles, pi);
          break;
        }
      }
    }
    this.reapDead();
  }

  /**
   * Sweeps out everything killed this step.
   *
   * Damage is applied through grid queries, which hand back enemies rather
   * than indices, so removal is deferred to one pass instead of being done
   * inside a loop that would invalidate the array it is walking.
   */
  private reapDead(): void {
    for (let i = this.enemies.length - 1; i >= 0; i--) {
      const e = this.enemies[i]!;
      if (e.hp > 0) continue;
      this.gems.push({ x: e.x, y: e.y, value: e.xp });
      swapRemove(this.enemies, i);
      this.kills++;
    }
  }

  private resolveContact(dt: number): void {
    if (this.engulfTimer > 0) {
      this.engulfTimer -= dt;
      this.hp -= this.engulfDps * dt * this.damageTaken;
      if (this.hp <= 0) return this.die();
    }

    for (let i = this.enemies.length - 1; i >= 0; i--) {
      const e = this.enemies[i]!;
      const r = e.radius + PLAYER_RADIUS;
      if ((e.x - this.x) ** 2 + (e.y - this.y) ** 2 > r * r) continue;

      // It is not doing anything to anyone. Distinct from zero damage, which
      // would still take the `hurt` path and hand out i-frames.
      if (e.def.contact === 'none') continue;

      if (e.def.contact === 'attach') {
        this.dragStacks++;
        swapRemove(this.enemies, i);
        this.hp -= e.def.contactDamage * this.damageTaken;
        if (this.hp <= 0) return this.die();
        continue;
      }
      if (e.def.contact === 'engulf' && e.def.engulf) {
        if (this.engulfTimer <= 0) {
          this.engulfTimer = e.def.engulf.seconds;
          this.engulfSlow = e.def.engulf.slow;
          this.engulfDps = e.def.engulf.damagePerSecond;
        }
        continue;
      }
      if (this.invulnerable > 0) continue;
      this.hurt(e.def.contactDamage);
      // `break`, not `return`. Returning here skipped the boss-shot loop
      // below for the whole frame, so on any frame the player was touching a
      // rival a boss projectile passed through them and stayed alive to be
      // re-evaluated later. The i-frames just set will stop it doing damage;
      // it still has to be consumed.
      break;
    }

    // Boss shots. The only things in the act that were aimed.
    for (let i = this.projectiles.length - 1; i >= 0; i--) {
      const p = this.projectiles[i]!;
      if (!p.hostile) continue;
      const r = p.radius + PLAYER_RADIUS;
      if ((p.x - this.x) ** 2 + (p.y - this.y) ** 2 > r * r) continue;
      swapRemove(this.projectiles, i);
      if (this.invulnerable <= 0) this.hurt(p.damage);
    }
  }

  private hurt(amount: number): void {
    this.hp -= amount * this.damageTaken;
    this.invulnerable = IFRAMES;
    if (this.hp <= 0) this.die();
  }

  private die(): void {
    this.hp = 0;
    this.dead = true;
    this.outcome = 'died';
  }

  // --- levelling --------------------------------------------------------

  private gainXp(value: number): void {
    this.xp += value;
    while (this.xp >= this.xpToNext) {
      this.xp -= this.xpToNext;
      this.level++;
      this.xpToNext = Math.round(5 + this.level * 4.5);
      // Levels QUEUE. Assigning `offers` here discarded a pending one: two
      // gems collected in the same frame — routine once white cells drop 12
      // apiece — took the player from level 1 to level 3 and presented a
      // single choice for both.
      this.pendingLevels++;
    }
    this.presentOffers();
  }

  /**
   * Hands the player the next queued choice, if there is one to make.
   *
   * `rollOffers` returns an empty array once every item is at max level, and
   * an empty array is truthy: `step()` opens with `if (this.offers) return`,
   * so assigning one froze the world permanently behind a panel listing
   * nothing, with no key that would dismiss it. A level with nothing to offer
   * is still a level; it is just not a decision.
   */
  private presentOffers(): void {
    while (!this.offers && this.pendingLevels > 0) {
      this.pendingLevels--;
      const rolled = this.rollOffers();
      if (rolled.length > 0) this.offers = rolled;
    }
  }

  /** Three choices: upgrades to what you have, and things you do not. */
  private rollOffers(): string[] {
    const pool = Object.keys(ITEMS).filter((id) => (this.items.get(id) ?? 0) < ITEMS[id]!.maxLevel);
    const picked: string[] = [];
    while (picked.length < 3 && picked.length < pool.length) {
      const candidate = pool[Math.floor(this.rng() * pool.length)]!;
      if (!picked.includes(candidate)) picked.push(candidate);
    }
    return picked.length > 0 ? picked : [];
  }

  /** Take one of the pending offers. Unblocks the world. */
  choose(id: string): void {
    if (!this.offers || !this.offers.includes(id)) return;
    const before = this.maxHp;
    this.items.set(id, (this.items.get(id) ?? 0) + 1);
    // Midpiece lowers max health; keep current health inside the new ceiling
    // without silently healing a player who took the other one.
    const after = this.maxHp;
    if (after < before) this.hp = Math.min(this.hp, after);
    else this.hp += after - before;
    this.offers = null;
    this.presentOffers();
  }

  // --- the boss ---------------------------------------------------------

  private spawnBoss(): void {
    // The act stops producing. Everything already on the field stays.
    //
    // Placed 420px above the player, then held inside the arena. Unclamped,
    // a player standing in the top of the field got an Egg at negative y:
    // the camera is bounded by the arena and cannot scroll to it, and the
    // player cannot walk above y=0 to bring it into view, so the fight was a
    // health bar over an empty screen. Reachable from anywhere in the top
    // quarter of the field.
    const margin = BOSS_RADIUS + 40;
    this.boss = {
      x: clamp(this.x, margin, ARENA_WIDTH - margin),
      y: clamp(this.y - 420, margin, ARENA_HEIGHT - margin),
      hp: BOSS_HP,
      maxHp: BOSS_HP,
      phase: 'idle',
      timer: 2.2,
    };
  }

  private updateBoss(dt: number): void {
    const b = this.boss;
    if (!b) return;

    if (b.phase === 'absorbing') {
      b.timer -= dt;
      if (b.timer <= 0) {
        this.won = true;
        this.outcome = 'won';
      }
      return;
    }

    // Damage first, every frame. Folding this in after the phase timer would
    // mean the boss could only be hurt on the frames it changed phase.
    for (let i = this.projectiles.length - 1; i >= 0; i--) {
      const p = this.projectiles[i]!;
      if (p.hostile) continue;
      const r = BOSS_RADIUS + p.radius;
      if ((p.x - b.x) ** 2 + (p.y - b.y) ** 2 > r * r) continue;
      b.hp -= p.damage;
      swapRemove(this.projectiles, i);
      if (b.hp <= 0) {
        // It does not die. The eyes close, the corona parts, and the player
        // wins by being permitted to stop existing separately from it.
        b.hp = 0;
        b.phase = 'absorbing';
        b.timer = 1.8;
        return;
      }
    }
    for (const a of this.areas) {
      if (a.pull || a.damage <= 0) continue;
      if (Math.hypot(a.x - b.x, a.y - b.y) > a.radius + BOSS_RADIUS) continue;
      if (a.tick) b.hp -= a.damage * dt * 6;
      else if (a.serial !== this.bossHitSerial) {
        this.bossHitSerial = a.serial;
        b.hp -= a.damage;
      } else continue;
      if (b.hp <= 0) {
        b.hp = 0;
        b.phase = 'absorbing';
        b.timer = 1.8;
        return;
      }
    }

    // It does not move from where it is. It has already decided.
    b.timer -= dt;
    if (b.timer > 0) return;

    if (b.phase === 'idle') {
      b.phase = 'telegraph';
      b.timer = 0.85;
    } else if (b.phase === 'telegraph') {
      b.phase = 'attack';
      b.timer = 0.35;
      this.bossAttack(b);
    } else {
      b.phase = 'idle';
      b.timer = 1.6;
    }
  }

  private bossAttack(b: BossState): void {
    const spread = 5;
    const base = Math.atan2(this.y - b.y, this.x - b.x);
    for (let i = 0; i < spread; i++) {
      const angle = base + (i - (spread - 1) / 2) * 0.16;
      this.projectiles.push({
        x: b.x,
        y: b.y,
        vx: Math.cos(angle) * 260,
        vy: Math.sin(angle) * 260,
        life: 4,
        damage: 12,
        pierce: 1,
        radius: 10,
        hostile: true,
        serial: this.nextSerial++,
      });
    }
  }
}
