import { describe, expect, it } from 'vitest';
import { ADOLESCENCE, ALL_ACTS, CONCEPTION, SCHOOL, type ActDef, type PromBoss } from '../../data/acts';
import { ENEMIES } from '../../data/enemies';
import {
  BOSS_HP,
  BOSS_RADIUS,
  EGG_ATTACK_SECONDS,
  EGG_IDLE_SECONDS,
  EGG_SHOT,
  EGG_TELEGRAPH_SECONDS,
  World,
  type EnemyState,
  type ProjectileState,
} from '../world';

/**
 * Prom (ADOLESCENCE-ROSTER §4): a mirror ball where the boss spawns, never
 * moving, and three borrowed parts. The race is the Egg's: every hormone goes
 * to the dance. The floor is the Gym Teacher's untouchability pointed at the
 * player: no damage while they are farther than `floorRadius` from the ball.
 * The light is the Egg's machine firing a full ring of `spots`, each ring
 * turned a third of a spacing from the last. At zero the act ends on SMILE.
 *
 * The floor radius and the spot count are read off `ADOLESCENCE.boss`, never
 * written here: they are placeholders under the act's `provisional` label,
 * and a test asserting one would be a placeholder pretending to be a decision.
 * The distances 500 and 200 are the brief's, either side of §4's floor.
 */

const DT = 1 / 60;
const STILL = { moveX: 0, moveY: 0 };

function prom(): PromBoss {
  if (ADOLESCENCE.boss.kind !== 'prom') throw new Error('Adolescence does not declare Prom');
  return ADOLESCENCE.boss;
}
const PROM = prom();
const HORMONE = ENEMIES[ADOLESCENCE.race!.enemyId]!;
const SPACING = (Math.PI * 2) / PROM.spots;

/**
 * An Adolescence world at Prom: the field emptied, the player unarmed and
 * 600px to its right (off the floor), and the light quiet unless a test says
 * otherwise.
 */
function atProm(act: ActDef = ADOLESCENCE): World {
  const w = new World({ act, seed: 7, startingItems: [] });
  w.time = act.durationSeconds;
  w.step(DT, STILL);
  expect(w.boss).not.toBeNull();
  w.enemies.length = 0;
  w.projectiles.length = 0;
  w.gems.length = 0;
  w.boss!.timer = 999;
  w.x = w.boss!.x + 600;
  w.y = w.boss!.y;
  return w;
}

/** An enemy placed exactly, standing still unless given a velocity. */
function place(w: World, id: string, x: number, y: number): EnemyState {
  w.spawnEnemy(id);
  const e = w.enemies[w.enemies.length - 1]!;
  e.x = x;
  e.y = y;
  e.vx = 0;
  e.vy = 0;
  return e;
}

let serial = 900_000;
/** A friendly shot parked on the ball. */
function shoot(w: World, damage: number): void {
  const b = w.boss!;
  w.projectiles.push({
    x: b.x,
    y: b.y,
    vx: 0,
    vy: 0,
    life: 1,
    damage,
    pierce: 1,
    radius: 10,
    hostile: false,
    serial: serial++,
  });
}

/** Steps with the player kept alive (not the subject), choosing the first offer. */
function alive(w: World, seconds: number, moveX = 0, moveY = 0, each?: () => void, dt = DT): void {
  const steps = Math.round(seconds / dt);
  for (let i = 0; i < steps; i++) {
    if (w.offers) {
      w.choose(w.offers[0]!);
      continue;
    }
    if (w.won) return;
    w.hp = w.maxHp;
    w.dead = false;
    w.step(dt, { moveX, moveY });
    each?.();
  }
}

const hostile = (w: World): ProjectileState[] => w.projectiles.filter((p) => p.hostile);
/** A bearing folded into [0, 2π). */
const fold = (a: number): number => ((a % (Math.PI * 2)) + Math.PI * 2) % (Math.PI * 2);
const bearings = (shots: ProjectileState[]): number[] =>
  shots.map((p) => fold(Math.atan2(p.vy, p.vx))).sort((p, q) => p - q);

/** Runs the lights down and fires one ring on the next step. Returns that ring. */
function fireRing(w: World): ProjectileState[] {
  const b = w.boss!;
  const before = new Set(w.projectiles.map((p) => p.serial));
  b.phase = 'telegraph';
  b.timer = DT / 2;
  w.hp = w.maxHp;
  w.step(DT, STILL);
  expect(b.phase).toBe('attack');
  return hostile(w).filter((p) => !before.has(p.serial));
}

describe('(a) each act declares its boss, and the sim spawns that one', () => {
  it("Adolescence declares Prom; Conception the Egg; School the Gym Teacher", () => {
    expect(ADOLESCENCE.boss.kind).toBe('prom');
    expect(ADOLESCENCE.bossName).toBe('Prom');
    expect(CONCEPTION.boss.kind).toBe('egg');
    expect(SCHOOL.boss.kind).toBe('gym-teacher');
  });

  it("at Adolescence's boss time Prom appears, off the player's floor, and never moves", () => {
    const w = new World({ act: ADOLESCENCE, seed: 3, startingItems: [] });
    w.time = ADOLESCENCE.durationSeconds;
    w.step(DT, STILL);
    const b = w.boss!;
    expect(b.kind).toBe('prom');
    expect(b.rings).toBe(0);
    // Placed 420px above the player, as every boss is: the player starts off
    // the floor and is asked to step onto it.
    expect(Math.hypot(w.x - b.x, w.y - b.y)).toBeGreaterThan(PROM.floorRadius);
    expect(b.shielded).toBe(true);
    const at = { x: b.x, y: b.y };
    alive(w, 10);
    expect(b.x).toBe(at.x);
    expect(b.y).toBe(at.y);
  });
});

describe('(b) the race: the hormones go to the dance', () => {
  it('raceTarget is the act\'s absorb count, and a hormone swims for the ball, not the player', () => {
    const w = atProm();
    const b = w.boss!;
    expect(w.raceTarget).toBe(ADOLESCENCE.race!.absorb);
    expect(w.raceTarget).toBe(40);
    // Straight below the ball with the player off to the right: a chaser
    // drifts right, a racer (`isRacing`) goes straight up.
    const e = place(w, HORMONE.id, b.x, b.y + 500);
    const before = Math.hypot(e.x - b.x, e.y - b.y);
    alive(w, 1);
    expect(Math.hypot(e.x - b.x, e.y - b.y)).toBeLessThan(before - 30);
    expect(Math.abs(e.x - b.x)).toBeLessThan(0.5);
  });

  it('a hormone reaching the ball is absorbed, and forty of them is someone else\'s life', () => {
    const w = atProm();
    const b = w.boss!;
    for (let i = 0; i < w.raceTarget; i++) {
      const a = (i / w.raceTarget) * Math.PI * 2;
      place(w, HORMONE.id, b.x + Math.cos(a) * (BOSS_RADIUS + 1), b.y + Math.sin(a) * (BOSS_RADIUS + 1));
    }
    w.step(DT, STILL);
    expect(w.raceAbsorbed).toBe(40);
    expect(w.dead).toBe(true);
    expect(w.certificate).toMatchObject({ outcome: 'died', actId: 'adolescence', causeId: 'someone-else' });
  });

  it("Prom's spot thins the racers; the group chat's notification does not", () => {
    const w = atProm();
    const b = w.boss!;
    const e = place(w, HORMONE.id, b.x - 400, b.y);
    const spot = (owner?: string): void => {
      w.projectiles.push({
        x: e.x, y: e.y, vx: 0, vy: 0,
        life: EGG_SHOT.life, damage: HORMONE.hp, pierce: 1, radius: EGG_SHOT.radius,
        hostile: true, source: owner ?? 'boss', serial: serial++,
        ...(owner ? { owner: ENEMIES[owner]! } : {}),
      });
    };
    // The chat's shot is aimed at the player; it passes through the dance.
    spot('group-chat');
    w.step(DT, STILL);
    expect(w.enemies).toContain(e);
    expect(e.hp).toBe(HORMONE.hp);
    expect(hostile(w)).toHaveLength(1);

    w.projectiles.length = 0;
    const kills = w.kills;
    spot();
    w.step(DT, STILL);
    expect(w.enemies).not.toContain(e);
    expect(hostile(w)).toHaveLength(0);
    expect(w.kills).toBe(kills + 1);
    expect(w.raceAbsorbed).toBe(0);
  });
});

describe('(c) the floor: nobody wins Prom from the wall', () => {
  function hitFrom(distance: number): { hp: number; shielded: boolean; shots: number } {
    const w = atProm();
    const b = w.boss!;
    w.x = b.x + distance;
    shoot(w, 10);
    w.areas.push({
      x: b.x, y: b.y, age: 0, seconds: 0.5, radius: 60,
      damage: 10, pull: false, tick: false, serial: serial++,
    });
    w.step(DT, STILL);
    return { hp: b.hp, shielded: b.shielded, shots: w.projectiles.filter((p) => !p.hostile).length };
  }

  it('takes nothing with the player at 500px, and takes it at 200px', () => {
    const off = hitFrom(500);
    expect(off.shielded).toBe(true);
    expect(off.hp).toBe(BOSS_HP);
    // It reached the ball and was stopped, not waved through.
    expect(off.shots).toBe(0);

    const on = hitFrom(200);
    expect(on.shielded).toBe(false);
    expect(on.hp).toBe(BOSS_HP - 20);
  });

  it("the edge is the declared floor radius, measured from the ball's centre", () => {
    expect(hitFrom(PROM.floorRadius + 1).hp).toBe(BOSS_HP);
    expect(hitFrom(PROM.floorRadius - 1).hp).toBe(BOSS_HP - 20);
  });

  it('cannot be taken to zero from off the floor at all', () => {
    const w = atProm();
    const b = w.boss!;
    w.x = b.x + 500;
    shoot(w, BOSS_HP * 10);
    w.step(DT, STILL);
    expect(b.hp).toBe(BOSS_HP);
    expect(b.phase).not.toBe('absorbing');
  });
});

describe('(d) the light: a ring in every direction, turned each time', () => {
  it('one attack is exactly `spots` of the Egg\'s shot, owned by nobody, evenly spaced from the ball', () => {
    const w = atProm();
    const b = w.boss!;
    const ring = fireRing(w);
    expect(ring).toHaveLength(PROM.spots);
    expect(b.rings).toBe(1);
    for (const p of ring) {
      expect(p.owner).toBeUndefined();
      expect(p.source).toBe('boss');
      expect(p.x).toBe(b.x);
      expect(p.y).toBe(b.y);
      expect(Math.hypot(p.vx, p.vy)).toBeCloseTo(EGG_SHOT.speed, 9);
      expect(p).toMatchObject({ damage: EGG_SHOT.damage, radius: EGG_SHOT.radius, life: EGG_SHOT.life });
    }
    const at = bearings(ring);
    at.forEach((a, i) => expect(a).toBeCloseTo(at[0]! + i * SPACING, 9));
  });

  it('the next ring is turned a third of a spacing from the last (AUDIT 36)', () => {
    const w = atProm();
    const first = bearings(fireRing(w));
    w.projectiles.length = 0;
    const second = bearings(fireRing(w));
    expect(second).toHaveLength(PROM.spots);
    // Every spot of the second ring sits a third of the way between two of
    // the first; the third ring two thirds; the fourth is back on the first's
    // lines. Half a spacing retraced itself every other ring (AUDIT 36).
    for (const a of second) expect(fold(a - first[0]!) % SPACING).toBeCloseTo(SPACING / 3, 9);
    w.projectiles.length = 0;
    const third = bearings(fireRing(w));
    for (const a of third) expect(fold(a - first[0]!) % SPACING).toBeCloseTo((2 * SPACING) / 3, 9);
    w.projectiles.length = 0;
    const fourth = bearings(fireRing(w));
    fourth.forEach((a, i) => expect(a).toBeCloseTo(first[i]!, 9));
  });

  it('is aimed at nobody: the ring is the same wherever the player stands', () => {
    const ringWith = (dx: number, dy: number): number[] => {
      const w = atProm();
      w.x = w.boss!.x + dx;
      w.y = w.boss!.y + dy;
      return bearings(fireRing(w));
    };
    const right = ringWith(600, 0);
    const below = ringWith(-137, 290);
    below.forEach((a, i) => expect(a).toBeCloseTo(right[i]!, 12));
  });

  it("rings on the Egg's cycle at any frame rate, the overshoot carried (AUDIT 16)", () => {
    // Ten rings apart is ten cycles, within one frame, at 60Hz, 144Hz and a
    // 7Hz stutter. A phase that reset its timer instead of carrying would lose
    // up to a frame per phase per cycle, which at 7Hz is over a second here.
    const cycle = EGG_TELEGRAPH_SECONDS + EGG_ATTACK_SECONDS + EGG_IDLE_SECONDS;
    for (const dt of [1 / 60, 1 / 144, 1 / 7]) {
      const w = atProm();
      const b = w.boss!;
      b.phase = 'idle';
      b.timer = 0;
      const rungAt: number[] = [];
      alive(w, 40, 0, 0, () => {
        if (b.rings > rungAt.length) rungAt.push(w.time);
      }, dt);
      expect(rungAt.length, `${dt}`).toBeGreaterThanOrEqual(11);
      expect(Math.abs(rungAt[10]! - rungAt[0]! - 10 * cycle), `${dt}`).toBeLessThanOrEqual(dt);
    }
  });
});

describe('(e) at zero the act ends, the way any act ends', () => {
  const WON_AT_EIGHTEEN = {
    outcome: 'won',
    actId: 'adolescence',
    actName: 'Adolescence',
    age: ADOLESCENCE.age.to,
    causeId: 'natural-causes',
    cause: 'natural causes',
  };

  it('Adolescence alone: zero is the win, of natural causes, aged 18, on SMILE', () => {
    const w = atProm();
    const b = w.boss!;
    w.x = b.x + 200;
    b.hp = 5;
    shoot(w, 10);
    w.step(DT, STILL);
    expect(b.hp).toBe(0);
    expect(b.phase).toBe('absorbing');
    alive(w, 5);
    expect(w.won).toBe(true);
    expect(w.certificate).toEqual({ ...WON_AT_EIGHTEEN, actIndex: 0 });
    expect(ADOLESCENCE.age.to).toBe(18);
    expect(ADOLESCENCE.endWord).toBe('SMILE');
  });

  it('the same at the end of a life that ends at Prom', () => {
    // The life up to and including Adolescence. This was ALL_ACTS while
    // Adolescence was the last act; College follows it now (G-045), and in
    // ALL_ACTS Prom falling is a crossing, not the end (college-act.test.ts).
    // The life got longer, which is the point.
    const life = ALL_ACTS.slice(0, ALL_ACTS.indexOf(ADOLESCENCE) + 1);
    const w = new World({ acts: life, seed: 9, startingItems: [] });
    for (const act of life.slice(0, -1)) {
      expect(w.act).toBe(act);
      w.actTime = act.durationSeconds;
      alive(w, DT);
      w.boss!.hp = 0;
      w.boss!.phase = 'absorbing';
      w.boss!.timer = 0;
      alive(w, DT);
    }
    expect(w.act).toBe(ADOLESCENCE);
    w.actTime = ADOLESCENCE.durationSeconds;
    alive(w, DT);
    const b = w.boss!;
    expect(b.kind).toBe('prom');
    w.enemies.length = 0;
    b.timer = 999;
    w.x = b.x;
    w.y = b.y + 200;
    shoot(w, BOSS_HP);
    alive(w, 5);
    expect(w.won).toBe(true);
    expect(w.certificate).toEqual({ ...WON_AT_EIGHTEEN, actIndex: life.indexOf(ADOLESCENCE) });
  });
});

describe('(f) a death to the light names Prom', () => {
  it('a spot kills: the certificate says Prom, aged 18', () => {
    const w = atProm();
    const b = w.boss!;
    w.x = b.x + 200;
    fireRing(w);
    w.hp = 1;
    w.invulnerable = 0;
    for (let i = 0; i < 120 && !w.dead; i++) w.step(DT, STILL);
    expect(w.dead).toBe(true);
    expect(w.certificate).toMatchObject({
      outcome: 'died',
      actId: 'adolescence',
      causeId: 'boss',
      cause: 'Prom',
    });
    expect(w.certificate!.age).toBeCloseTo(18, 6);
  });
});

describe('(g) the fight is deterministic', () => {
  it('two worlds on one seed are in the same state after the crowd phase and a minute of Prom', () => {
    const snapshot = (w: World) => ({
      time: w.time,
      x: w.x,
      y: w.y,
      kills: w.kills,
      level: w.level,
      raceAbsorbed: w.raceAbsorbed,
      outcome: w.outcome,
      certificate: w.certificate,
      boss: w.boss ? { ...w.boss } : null,
      enemies: w.enemies.map((e) => [e.uid, e.def.id, e.x, e.y, e.vx, e.vy, e.hp]),
      projectiles: w.projectiles.map((p) => [p.serial, p.x, p.y]),
    });
    const a = new World({ act: ADOLESCENCE, seed: 42 });
    const b = new World({ act: ADOLESCENCE, seed: 42 });
    alive(a, ADOLESCENCE.durationSeconds + 60, 1, 0.3);
    alive(b, ADOLESCENCE.durationSeconds + 60, 1, 0.3);
    expect(a.boss?.kind).toBe('prom');
    // The fight was actually fought, not skipped by an early end.
    expect(a.boss!.rings).toBeGreaterThanOrEqual(2);
    expect(snapshot(a)).toEqual(snapshot(b));
  });
});

describe('(h) the floor and the ring are Prom\'s alone', () => {
  it('the Egg is never shielded, however far away the player is, and still fires its aimed fan', () => {
    const w = atProm(CONCEPTION);
    const b = w.boss!;
    expect(b.kind).toBe('egg');
    w.x = b.x + 1000;
    shoot(w, 10);
    w.step(DT, STILL);
    expect(b.shielded).toBe(false);
    expect(b.hp).toBe(BOSS_HP - 10);
    const fan = fireRing(w);
    expect(fan).toHaveLength(5);
    expect(b.rings).toBe(0);
    const toPlayer = Math.atan2(w.y - b.y, w.x - b.x);
    const middle = fan.map((p) => Math.atan2(p.vy, p.vx)).sort((p, q) => p - q)[2]!;
    expect(middle).toBeCloseTo(toPlayer, 6);
  });

  it('the HUD hint comes from the boss: School and Prom say how to open them; the Egg never needs one', () => {
    expect(SCHOOL.boss.shieldHint).toBe('put the equipment away');
    expect(PROM.shieldHint).toBe('get on the floor');
    expect(CONCEPTION.boss.shieldHint).toBeUndefined();
  });
});
