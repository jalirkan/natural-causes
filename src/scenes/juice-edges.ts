import type { BossState } from '../sim/world';

/**
 * The frame-to-frame edges the juice draws (src/scenes/juice.ts): which
 * enemies were hurt and by how much, which died, which player shots landed,
 * which gems are streaming to the player and which were picked up, and the
 * player's own falls. The sim emits no events (see `ActScene.hearWorld`), so
 * these compare the world this frame with a snapshot of it last frame. They
 * only read it. No Phaser here, so they run under the unit tests
 * (src/scenes/__tests__/juice-edges.test.ts).
 *
 * Identity is the object. The world swap-removes enemies, shots and gems, so
 * indices shuffle every step, but it mutates each thing in place for its
 * whole life and never touches it once removed: a removed enemy still holds
 * the hp it died on, a removed shot the `life` it had left, a removed gem
 * where it was when it was taken. That makes "gone, and why" exact rather
 * than a guess from counts — gems carry no id at all, and a count misses one
 * arriving on the frame another leaves.
 *
 * Steady state allocates nothing per frame: snapshots are pooled, and the
 * events are written into reusable buffers (`Events`) the renderer reads by
 * index before the next `read`.
 */

/**
 * The act's mid tone, by act id: half of a kill's flecks (the other half
 * bone). Duplicated from `tools/art/palette.ts`, which is Node-side, as
 * `config.ts` duplicates the universals; a test holds the two together.
 * Here rather than in `juice.ts` so that test runs without Phaser.
 */
export const ACT_MID: Readonly<Record<string, number>> = {
  conception: 0xa86a63,
  school: 0x6b7f53,
  adolescence: 0x5e95c3,
  college: 0x8e4a5c,
  office: 0x6b8299,
  family: 0xa3812f,
  decline: 0x7e9b8e,
};
/**
 * The player's own damage number: blush, the palette's one warm tone (G-053),
 * a warmer bone than the crowd's numbers. Never a threat colour: law 10 keeps
 * those for what hurts the player, not for the player hurt.
 */
export const PLAYER_HURT = 0xeba39c;

/** What the edges read of an enemy. `EnemyState` is one. */
export interface JuiceEnemy {
  readonly x: number;
  readonly y: number;
  readonly hp: number;
  readonly displaySize: number;
}

/** What the edges read of a shot. `ProjectileState` is one. */
export interface JuiceShot {
  readonly x: number;
  readonly y: number;
  readonly vx: number;
  readonly vy: number;
  readonly life: number;
  readonly hostile: boolean;
}

/** What the edges read of a gem. `GemState` is one. */
export interface JuiceGem {
  readonly x: number;
  readonly y: number;
}

/** The slice of `World` the edges read, so a test can hand-build one. `World` is one. */
export interface JuiceWorld {
  readonly enemies: readonly JuiceEnemy[];
  readonly projectiles: readonly JuiceShot[];
  readonly gems: readonly JuiceGem[];
  readonly boss: Pick<BossState, 'x' | 'y' | 'hp' | 'kind'> | null;
  readonly x: number;
  readonly y: number;
  readonly hp: number;
  readonly maxHp: number;
  readonly level: number;
  readonly xp: number;
  readonly actIndex: number;
  readonly dead: boolean;
  readonly won: boolean;
}

/**
 * One number per enemy at most this often, in seconds: an aura ticking every
 * step would otherwise print a column. Hits inside the gap accumulate and
 * show together when it opens, or at once on the death.
 */
export const NUMBER_GAP = 0.1;
/** A fall this small (rounded to nothing) waits for more rather than printing a 0. */
const SHOWABLE = 0.5;
/** The player's hp must fall by more than this to count as a hurt, as `hearWorld`'s does. */
const HURT_EPSILON = 0.01;
/** A gem moving less than this between frames is lying still. */
const STILL = 0.01;
/** Under this share of the maximum, the player is on low health. */
export const LOW_HEALTH = 1 / 3;

/** Damage to show: where the thing hurt was, how big it is drawn (0 for the boss), how much (unrounded), and whether it was the boss. */
export interface Hit {
  x: number;
  y: number;
  size: number;
  amount: number;
  boss: boolean;
}

/** Something that died: where, and how big it was drawn. */
export interface Pop {
  x: number;
  y: number;
  size: number;
}

/** A point event: a shot landing, a gem taken. `dx, dy` is the thing's heading, unit length (0, 0 when unknown). */
export interface Spark {
  x: number;
  y: number;
  dx: number;
  dy: number;
}

/**
 * A reusable event list. `add` hands back a slot to fill, reused frame to
 * frame; `length` is how many are this frame's. Read with `at(i)` for
 * `i < length`, before the next `clear`.
 */
export class Events<T> {
  private readonly items: T[] = [];
  length = 0;
  constructor(private readonly make: () => T) {}
  add(): T {
    let item = this.items[this.length];
    if (!item) this.items.push((item = this.make()));
    this.length++;
    return item;
  }
  at(i: number): T {
    return this.items[i]!;
  }
  clear(): void {
    this.length = 0;
  }
  /** A copy of this frame's events. Allocates: for tests, not the frame loop. */
  toArray(): T[] {
    return this.items.slice(0, this.length);
  }
}

interface EnemyTrack {
  hp: number;
  /** Fallen since the last number was shown. */
  pending: number;
  /** When the last number was shown, on the caller's clock. */
  shownAt: number;
  seen: number;
}

interface ShotTrack {
  seen: number;
}

interface GemTrack {
  x: number;
  y: number;
  seen: number;
}

export class JuiceEdges {
  /** Enemies hurt this frame (their accumulated fall, once the per-enemy gap allows), and the boss. */
  readonly hits = new Events<Hit>(() => ({ x: 0, y: 0, size: 0, amount: 0, boss: false }));
  /** Enemies killed this frame: gone from the field with their hp at or below zero. */
  readonly kills = new Events<Pop>(() => ({ x: 0, y: 0, size: 0 }));
  /** The player's shots consumed this frame (a hit, or stopped at the boss), at where they ended: gone with life left. */
  readonly landed = new Events<Spark>(() => ({ x: 0, y: 0, dx: 0, dy: 0 }));
  /** Gems moving toward the player this frame, where they are now and which way they travel. */
  readonly streams = new Events<Spark>(() => ({ x: 0, y: 0, dx: 0, dy: 0 }));
  /** Gems taken this frame, where each was taken. */
  readonly pickups = new Events<Spark>(() => ({ x: 0, y: 0, dx: 0, dy: 0 }));
  /** How much the player's hp fell this frame; 0 when it did not. */
  hurt = 0;
  /** True when the boss's hp fell this frame, whether or not a number was due. */
  bossHit = false;
  /** The boss's hp reached zero this frame, from above it: its fall, however it reads (`Juice` decides what to draw). */
  bossDown = false;
  /** A level was gained this frame. */
  levelUp = false;
  /** The player is alive and under `LOW_HEALTH` of their maximum. */
  lowHealth = false;
  /** The act changed this frame: everything the last act held was cleared, not killed. */
  crossed = false;

  private readonly enemies = new Map<JuiceEnemy, EnemyTrack>();
  private readonly shots = new Map<JuiceShot, ShotTrack>();
  private readonly gems = new Map<JuiceGem, GemTrack>();
  private readonly freeEnemies: EnemyTrack[] = [];
  private readonly freeShots: ShotTrack[] = [];
  private readonly freeGems: GemTrack[] = [];
  private frame = 0;
  private started = false;
  private act = 0;
  private hp = 0;
  private level = 0;
  private xp = 0;
  private boss: JuiceWorld['boss'] = null;
  private bossHp = 0;
  private bossPending = 0;
  private bossShownAt = -Infinity;
  /** A gem was taken this frame, by the xp: read by `sweepGem`, a `forEach` callback made once so the sweep does not allocate. */
  private taken = false;

  /**
   * Reads this frame's world against last frame's snapshot, fills the
   * events, and keeps this frame's as the next snapshot. `now` is the
   * caller's clock in seconds, for the per-enemy gap; it need not be the
   * world's (a held world still lets a pending number out).
   */
  read(w: JuiceWorld, now: number): void {
    this.hits.clear();
    this.kills.clear();
    this.landed.clear();
    this.streams.clear();
    this.pickups.clear();
    this.hurt = 0;
    this.bossHit = false;
    this.bossDown = false;
    this.levelUp = false;
    this.frame++;

    // The first read, and every crossing, only takes the snapshot: at a
    // crossing the world clears the field, the shots and the gems (the gems
    // into xp), and none of that is a kill, a hit or a pickup.
    this.crossed = this.started && w.actIndex !== this.act;
    if (!this.started || this.crossed) {
      // A level the crossing's gems paid for is still a level.
      this.levelUp = this.crossed && w.level > this.level;
      this.forget();
      this.started = true;
      this.act = w.actIndex;
      this.hp = w.hp;
      this.level = w.level;
      this.xp = w.xp;
      this.boss = w.boss;
      this.bossHp = w.boss?.hp ?? 0;
      this.bossPending = 0;
      this.snapshot(w);
      this.lowHealth = isLow(w);
      return;
    }

    if (w.hp < this.hp - HURT_EPSILON) this.hurt = this.hp - w.hp;
    this.hp = w.hp;
    this.levelUp = w.level > this.level;
    // XP rises on a pickup and falls at a level-up; either says a gem was taken.
    this.taken = w.xp > this.xp || w.level > this.level;
    this.level = w.level;
    this.xp = w.xp;
    this.lowHealth = isLow(w);

    this.readEnemies(w, now);
    this.readBoss(w, now);
    this.readShots(w);
    this.readGems(w);
  }

  private readEnemies(w: JuiceWorld, now: number): void {
    const frame = this.frame;
    for (const e of w.enemies) {
      let t = this.enemies.get(e);
      if (!t) {
        t = this.freeEnemies.pop() ?? { hp: 0, pending: 0, shownAt: 0, seen: 0 };
        t.hp = e.hp;
        t.pending = 0;
        t.shownAt = -Infinity;
        this.enemies.set(e, t);
      } else if (e.hp < t.hp) {
        // A rise (a homework pile merging) is not a hit and does not refund one.
        t.pending += t.hp - e.hp;
      }
      t.hp = e.hp;
      t.seen = frame;
      if (t.pending >= SHOWABLE && now - t.shownAt >= NUMBER_GAP) {
        this.hit(e.x, e.y, e.displaySize, t.pending, false);
        t.pending = 0;
        t.shownAt = now;
      }
    }
    this.enemies.forEach(this.sweepEnemy);
  }

  /** An enemy not seen this frame left the field: a kill if it left on no hp, and its last fall shows now. */
  private readonly sweepEnemy = (t: EnemyTrack, e: JuiceEnemy): void => {
    if (t.seen === this.frame) return;
    // Every other way off the field — a burst, a racer let into the Egg, an
    // antibody attaching, a despawn, a hold letting go — leaves hp above zero.
    if (e.hp <= 0) {
      // The killing blow in full, overkill included: the number says what the hit was worth.
      const fall = t.pending + (t.hp - e.hp);
      if (fall >= SHOWABLE) this.hit(e.x, e.y, e.displaySize, fall, false);
      const pop = this.kills.add();
      pop.x = e.x;
      pop.y = e.y;
      pop.size = e.displaySize;
    }
    this.enemies.delete(e);
    this.freeEnemies.push(t);
  };

  private readBoss(w: JuiceWorld, now: number): void {
    const b = w.boss;
    if (b !== this.boss) {
      // A boss arriving (or leaving at the crossing) is not a hit.
      this.boss = b;
      this.bossHp = b?.hp ?? 0;
      this.bossPending = 0;
      this.bossShownAt = -Infinity;
      return;
    }
    if (!b) return;
    // Only falls: the Loan's balance compounds upward between hits.
    if (b.hp < this.bossHp) {
      this.bossHit = true;
      this.bossPending += this.bossHp - b.hp;
      if (this.bossHp > 0 && b.hp <= 0) this.bossDown = true;
    }
    this.bossHp = b.hp;
    if (this.bossPending >= SHOWABLE && (now - this.bossShownAt >= NUMBER_GAP || this.bossDown)) {
      this.hit(b.x, b.y, 0, this.bossPending, true);
      this.bossPending = 0;
      this.bossShownAt = now;
    }
  }

  private readShots(w: JuiceWorld): void {
    const frame = this.frame;
    for (const p of w.projectiles) {
      // The player's shots only. A hostile shot landing is the player hurt.
      if (p.hostile) continue;
      let t = this.shots.get(p);
      if (!t) {
        t = this.freeShots.pop() ?? { seen: 0 };
        this.shots.set(p, t);
      }
      t.seen = frame;
    }
    this.shots.forEach(this.sweepShot);
  }

  /**
   * A shot not seen this frame is gone. With life left it was consumed — a
   * hit that spent its last pierce, or stopped at the boss (`moveProjectiles`
   * removes a shot only when its life reaches zero); without, it expired.
   */
  private readonly sweepShot = (t: ShotTrack, p: JuiceShot): void => {
    if (t.seen === this.frame) return;
    if (p.life > 0) {
      const s = this.landed.add();
      s.x = p.x;
      s.y = p.y;
      const speed = Math.hypot(p.vx, p.vy);
      s.dx = speed > 0 ? p.vx / speed : 0;
      s.dy = speed > 0 ? p.vy / speed : 0;
    }
    this.shots.delete(p);
    this.freeShots.push(t);
  };

  private readGems(w: JuiceWorld): void {
    const frame = this.frame;
    for (const g of w.gems) {
      let t = this.gems.get(g);
      if (!t) {
        t = this.freeGems.pop() ?? { x: 0, y: 0, seen: 0 };
        this.gems.set(g, t);
      } else {
        // Gems lie still unless the magnet has them (`updateGems`), so a step
        // toward the player is a pull. Not "faster than the player": a player
        // quicker than the pull would outrun the stream and hide it.
        const dx = g.x - t.x;
        const dy = g.y - t.y;
        const moved = Math.hypot(dx, dy);
        if (moved > STILL && dx * (w.x - t.x) + dy * (w.y - t.y) > 0) {
          const s = this.streams.add();
          s.x = g.x;
          s.y = g.y;
          s.dx = dx / moved;
          s.dy = dy / moved;
        }
      }
      t.x = g.x;
      t.y = g.y;
      t.seen = frame;
    }
    this.gems.forEach(this.sweepGem);
  }

  /** A gem not seen this frame was taken, if the xp says so (the crossing's absorb is handled before this). */
  private readonly sweepGem = (t: GemTrack, g: JuiceGem): void => {
    if (t.seen === this.frame) return;
    if (this.taken) {
      const s = this.pickups.add();
      s.x = g.x;
      s.y = g.y;
      s.dx = 0;
      s.dy = 0;
    }
    this.gems.delete(g);
    this.freeGems.push(t);
  };

  private hit(x: number, y: number, size: number, amount: number, boss: boolean): void {
    const h = this.hits.add();
    h.x = x;
    h.y = y;
    h.size = size;
    h.amount = amount;
    h.boss = boss;
  }

  /** Drops every snapshot back into the pools. */
  private forget(): void {
    this.enemies.forEach(this.release);
    this.enemies.clear();
    this.shots.forEach(this.releaseShot);
    this.shots.clear();
    this.gems.forEach(this.releaseGem);
    this.gems.clear();
  }

  private readonly release = (t: EnemyTrack): void => void this.freeEnemies.push(t);
  private readonly releaseShot = (t: ShotTrack): void => void this.freeShots.push(t);
  private readonly releaseGem = (t: GemTrack): void => void this.freeGems.push(t);

  /** Takes this frame as the snapshot without reading any edge from it. */
  private snapshot(w: JuiceWorld): void {
    const frame = this.frame;
    for (const e of w.enemies) {
      const t = this.freeEnemies.pop() ?? { hp: 0, pending: 0, shownAt: 0, seen: 0 };
      t.hp = e.hp;
      t.pending = 0;
      t.shownAt = -Infinity;
      t.seen = frame;
      this.enemies.set(e, t);
    }
    for (const p of w.projectiles) {
      if (p.hostile) continue;
      const t = this.freeShots.pop() ?? { seen: 0 };
      t.seen = frame;
      this.shots.set(p, t);
    }
    for (const g of w.gems) {
      const t = this.freeGems.pop() ?? { x: 0, y: 0, seen: 0 };
      t.x = g.x;
      t.y = g.y;
      t.seen = frame;
      this.gems.set(g, t);
    }
  }
}

function isLow(w: JuiceWorld): boolean {
  return !w.dead && !w.won && w.hp > 0 && w.hp < w.maxHp * LOW_HEALTH;
}

/**
 * Which of this frame's hits get a number when only `free` can be shown:
 * the largest, so a cap drops the smallest new ones and never a big one.
 * Writes the chosen indices into `out` (reused; its length is set) in the
 * hits' own order, and returns how many.
 */
export function largestHits(hits: Events<Hit>, free: number, out: number[]): number {
  const n = hits.length;
  if (free <= 0) {
    out.length = 0;
    return 0;
  }
  out.length = n;
  for (let i = 0; i < n; i++) out[i] = i;
  if (n <= free) return n;
  sorting = hits;
  out.sort(byAmount);
  sorting = null;
  out.length = free;
  out.sort(byIndex);
  return free;
}

/** The comparators `largestHits` sorts with, made once rather than per call. */
let sorting: Events<Hit> | null = null;
const byAmount = (a: number, b: number): number => sorting!.at(b).amount - sorting!.at(a).amount || a - b;
const byIndex = (a: number, b: number): number => a - b;
