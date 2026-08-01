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
export const DRAG_PER_STACK = 0.025;
export const MIN_SPEED_FRACTION = 0.35;
/** How close a gem has to be before it comes to the player. */
export const MAGNET_RADIUS = 96;
export const GEM_SPEED = 320;
export const RING_BAND = 6;
/** Spawn ring radius. Matches the 1280x720 viewport the game is authored at. */
export const SPAWN_RADIUS = 780;
/** The Egg is roughly 8x player height and does not move from centre. */
export const BOSS_RADIUS = 150;
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
  private nextUid = 1;
  private nextSerial = 1;
  private bossHitSerial = 0;

  time = 0;
  dead = false;
  won = false;
  /** Set when the run ends, for the bots' report. */
  outcome: 'alive' | 'died' | 'won' = 'alive';

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
  /** Non-null while a level-up is waiting. The world does not advance. */
  offers: string[] | null = null;
  readonly items = new Map<string, number>();

  enemies: EnemyState[] = [];
  projectiles: ProjectileState[] = [];
  rings: RingState[] = [];
  areas: AreaState[] = [];
  gems: GemState[] = [];
  boss: BossState | null = null;

  constructor(options: WorldOptions) {
    this.act = options.act;
    this.seed = options.seed ?? 1;
    this.rng = mulberry32(this.seed);
    this.streams = spawnStreams(options.act.waves);
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

  get speed(): number {
    const drag = Math.max(MIN_SPEED_FRACTION, 1 - this.dragStacks * DRAG_PER_STACK);
    const engulf = this.engulfTimer > 0 ? this.engulfSlow : 1;
    return PLAYER_BASE_SPEED * this.passiveProduct((d) => d.speedMultiplier) * drag * engulf;
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
    if (!this.boss) this.spawn(dt);
    this.moveEnemies(dt);
    // Rebuilt after movement so every query this step sees current positions.
    this.grid.build(this.enemies);
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

  spawnEnemy(id: string): void {
    const def = enemyDef(id);
    const angle = this.rng() * Math.PI * 2;
    const x = this.x + Math.cos(angle) * SPAWN_RADIUS;
    const y = this.y + Math.sin(angle) * SPAWN_RADIUS;
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

    this.enemies.push({
      uid: this.nextUid++,
      hitBySerial: 0,
      def,
      x, y, vx, vy,
      hp: def.hp,
      age: 0,
      hitFlash: 0,
    });
  }

  private moveEnemies(dt: number): void {
    for (let i = this.enemies.length - 1; i >= 0; i--) {
      const e = this.enemies[i]!;
      e.age += dt;
      if (e.hitFlash > 0) e.hitFlash -= dt;

      if (e.def.movement === 'chase') {
        const d = Math.hypot(this.x - e.x, this.y - e.y) || 1;
        e.x += ((this.x - e.x) / d) * e.def.speed * dt;
        e.y += ((this.y - e.y) / d) * e.def.speed * dt;
      } else {
        e.x += e.vx * dt;
        e.y += e.vy * dt;
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
        Math.hypot(e.x - this.x, e.y - this.y) > DESPAWN_RADIUS
      ) {
        swapRemove(this.enemies, i);
      }
    }
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
        const target = this.nearestEnemy(def.range);
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
      this.grid.query(a.x, a.y, a.radius + 64, this.near);
      for (const e of this.near) {
        if (e.hp <= 0) continue;
        if (Math.hypot(e.x - a.x, e.y - a.y) > a.radius + e.def.radius) continue;
        if (a.tick) {
          e.hp -= a.damage * dt * 6;
        } else {
          if (e.hitBySerial === a.serial) continue;
          e.hitBySerial = a.serial;
          e.hp -= a.damage;
        }
        e.hitFlash = 0.08;
      }
      this.reapDead();
    }
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
      this.grid.query(p.x, p.y, p.radius + 64, this.near);
      for (const e of this.near) {
        if (e.hitBySerial === p.serial || e.hp <= 0) continue;
        const r = e.def.radius + p.radius;
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
      this.gems.push({ x: e.x, y: e.y, value: e.def.xp });
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
      const r = e.def.radius + PLAYER_RADIUS;
      if ((e.x - this.x) ** 2 + (e.y - this.y) ** 2 > r * r) continue;

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
      return;
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
      this.offers = this.rollOffers();
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
  }

  // --- the boss ---------------------------------------------------------

  private spawnBoss(): void {
    // The act stops producing. Everything already on the field stays.
    this.boss = {
      x: this.x,
      y: this.y - 420,
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
