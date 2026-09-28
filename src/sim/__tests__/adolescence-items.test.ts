import { describe, expect, it } from 'vitest';
import { ADOLESCENCE, ALL_ACTS, CONCEPTION, SCHOOL, type ActDef } from '../../data/acts';
import { enemyDef, type EnemyDef } from '../../data/enemies';
import { ITEMS, isActive, type ActiveItem } from '../../data/items';
import { MAGNET_RADIUS, PLAYER_RADIUS, World, type EnemyState, type ProjectileState } from '../world';

/**
 * Adolescence's two items (ADOLESCENCE-ROSTER §6): Growth Spurt makes the
 * player's radius a stat and every weapon's reach longer; Snooze drops a field
 * that holds enemies, shots and the player at half speed. Neither is in the
 * pool before thirteen. Every number read here is a placeholder under
 * ADOLESCENCE's `provisional`; the tests read them off the registry rather
 * than restating them.
 */

const QUIET: ActDef = { ...CONCEPTION, id: 'adolescence-items-fixture', waves: [] };
const DT = 1 / 60;
const still = { moveX: 0, moveY: 0 };

const GROWTH = ITEMS['growth-spurt']!;
const SNOOZE = ITEMS['snooze'] as ActiveItem;
if (GROWTH.kind !== 'passive') throw new Error('Growth Spurt is a passive');

/** A chaser that does not die of one hit and hurts on contact. */
const CHASER: EnemyDef = { ...enemyDef('rival-sperm'), hp: 1000 };
/** The same, standing still. */
const DUMMY: EnemyDef = { ...CHASER, movement: 'static', speed: 0 };

let uid = 200000;
function place(w: World, def: EnemyDef, dx: number, dy: number): EnemyState {
  const e: EnemyState = {
    uid: uid++,
    hitBySerial: 0,
    hitByAreaSerial: 0,
    def,
    x: w.x + dx,
    y: w.y + dy,
    vx: 0,
    vy: 0,
    hp: def.hp,
    age: 0,
    hitFlash: 0,
    radius: def.radius,
    displaySize: def.displaySize,
    xp: def.xp,
    consult: 0,
    reload: 0,
  };
  w.enemies.push(e);
  return e;
}

function shot(w: World, dx: number, dy: number, hostile: boolean): ProjectileState {
  const p: ProjectileState = {
    x: w.x + dx,
    y: w.y + dy,
    vx: 0,
    vy: 300,
    life: 5,
    damage: 1,
    pierce: 1,
    radius: 4,
    hostile,
    serial: 900000 + uid++,
  };
  w.projectiles.push(p);
  return p;
}

describe('Growth Spurt: the player radius is a stat', () => {
  it('the collision radius, reach and pickup grow by the registry multipliers per level', () => {
    const w = new World({ act: QUIET, seed: 1, startingItems: [] });
    expect(w.playerRadius).toBe(PLAYER_RADIUS);
    expect(w.reach).toBe(1);
    for (let level = 1; level <= GROWTH.maxLevel; level++) {
      w.items.set('growth-spurt', level);
      expect(w.playerRadius).toBeCloseTo(PLAYER_RADIUS * GROWTH.sizeMultiplier ** level, 9);
      expect(w.reach).toBeCloseTo(GROWTH.reachMultiplier ** level, 9);
      expect(w.magnetRadius).toBeCloseTo(MAGNET_RADIUS * GROWTH.pickupMultiplier ** level, 9);
    }
    expect(GROWTH.sizeMultiplier).toBeGreaterThan(1);
    expect(GROWTH.reachMultiplier).toBeGreaterThan(1);
  });

  it('touches an enemy the base radius does not', () => {
    const gap = DUMMY.radius + PLAYER_RADIUS + 0.5;
    const base = new World({ act: QUIET, seed: 1, startingItems: [] });
    place(base, DUMMY, gap, 0);
    base.step(DT, still);
    expect(base.hp).toBe(base.maxHp);

    const tall = new World({ act: QUIET, seed: 1, startingItems: [] });
    tall.items.set('growth-spurt', 1);
    place(tall, DUMMY, gap, 0);
    tall.step(DT, still);
    expect(tall.hp).toBeLessThan(tall.maxHp);
  });

  it('is hit by a shot the base radius is missed by', () => {
    // Falling past the player's side, not toward them.
    const gap = PLAYER_RADIUS + 4 + 0.5;
    const base = new World({ act: QUIET, seed: 1, startingItems: [] });
    shot(base, gap, 0, true).vy = 0;
    base.step(DT, still);
    expect(base.hp).toBe(base.maxHp);

    const tall = new World({ act: QUIET, seed: 1, startingItems: [] });
    tall.items.set('growth-spurt', 1);
    shot(tall, gap, 0, true).vy = 0;
    tall.step(DT, still);
    expect(tall.hp).toBeLessThan(tall.maxHp);
  });

  it('collects a gem from further away on the first step', () => {
    const at = PLAYER_RADIUS + 0.5;
    const base = new World({ act: QUIET, seed: 1, startingItems: [] });
    base.gems.push({ x: base.x + at, y: base.y, value: 1 });
    base.step(DT, still);
    expect(base.gems).toHaveLength(1);

    const tall = new World({ act: QUIET, seed: 1, startingItems: [] });
    tall.items.set('growth-spurt', 1);
    tall.gems.push({ x: tall.x + at, y: tall.y, value: 1 });
    tall.step(DT, still);
    expect(tall.gems).toHaveLength(0);
  });

  it('Reflex reaches a target past its base range, and its shot flies further', () => {
    const lash = ITEMS['lash'] as ActiveItem;
    const past = lash.range + 20;
    const base = new World({ act: QUIET, seed: 1, startingItems: ['lash'] });
    place(base, DUMMY, past, 0);
    base.step(DT, still);
    expect(base.projectiles.filter((p) => p.source === 'lash')).toHaveLength(0);

    for (let level = 1; level <= GROWTH.maxLevel; level++) {
      const tall = new World({ act: QUIET, seed: 1, startingItems: ['lash'] });
      tall.items.set('growth-spurt', level);
      place(tall, DUMMY, past, 0);
      tall.step(DT, still);
      const shots = tall.projectiles.filter((p) => p.source === 'lash');
      expect(shots, `level ${level}`).toHaveLength(1);
      // Life at launch, less the one step it has already flown.
      const range = lash.range * GROWTH.reachMultiplier ** level;
      expect(shots[0]!.life + DT).toBeCloseTo(range / lash.projectileSpeed, 9);
    }
  });

  it('widens a burst and an orbit by the same reach', () => {
    const temper = ITEMS['acrosome'] as ActiveItem;
    const grudge = ITEMS['grudge'] as ActiveItem;
    for (const level of [0, 1, 3]) {
      const w = new World({ act: QUIET, seed: 1, startingItems: ['acrosome', 'grudge'] });
      if (level > 0) w.items.set('growth-spurt', level);
      w.step(DT, still);
      const burst = w.areas.find((a) => !a.tick && !a.pull)!;
      expect(burst.radius).toBeCloseTo(temper.radius * GROWTH.reachMultiplier ** level, 9);
      const o = w.orbiters[0]!;
      expect(Math.hypot(o.x - w.x, o.y - w.y)).toBeCloseTo(grudge.range * GROWTH.reachMultiplier ** level, 6);
    }
  });
});

describe('Snooze: a field that holds everything inside it at half speed', () => {
  /** A world whose Snooze has just dropped its field on the player. */
  function snoozed(): World {
    const w = new World({ act: QUIET, seed: 1, startingItems: ['snooze'] });
    w.step(DT, still);
    expect(w.areas.filter((a) => a.slow !== undefined)).toHaveLength(1);
    return w;
  }

  it('drops one field at the player, at the registry radius, for the registry seconds', () => {
    const w = snoozed();
    const f = w.areas[0]!;
    expect(f.x).toBe(w.x);
    expect(f.y).toBe(w.y);
    expect(f.radius).toBeCloseTo(SNOOZE.radius, 9);
    expect(f.seconds).toBeCloseTo(SNOOZE.range, 9);
    expect(f.slow).toBe(SNOOZE.slow);
    expect(f.pull).toBe(false);
    expect(f.damage).toBe(0);
  });

  it('halves an enemy inside it and not one outside', () => {
    const w = snoozed();
    const inside = place(w, CHASER, 0, 100);
    const outside = place(w, CHASER, 0, -(SNOOZE.radius + 200));
    const before = { in: inside.y, out: outside.y };
    w.step(DT, still);
    const movedIn = Math.abs(inside.y - before.in);
    const movedOut = Math.abs(outside.y - before.out);
    expect(movedOut).toBeCloseTo(CHASER.speed * DT, 9);
    expect(movedIn).toBeCloseTo(CHASER.speed * DT * SNOOZE.slow!, 9);
  });

  it('halves a projectile inside it, hostile or not, and not one outside', () => {
    const w = snoozed();
    const mine = shot(w, 60, 0, false);
    const theirs = shot(w, -60, 0, true);
    const far = shot(w, SNOOZE.radius + 200, 0, false);
    const y0 = { mine: mine.y, theirs: theirs.y, far: far.y };
    const life0 = { mine: mine.life, far: far.life };
    w.step(DT, still);
    expect(far.y - y0.far).toBeCloseTo(300 * DT, 9);
    expect(mine.y - y0.mine).toBeCloseTo(300 * DT * SNOOZE.slow!, 9);
    expect(theirs.y - y0.theirs).toBeCloseTo(300 * DT * SNOOZE.slow!, 9);
    // Held, not shortened: its clock waits with it.
    expect(life0.mine - mine.life).toBeCloseTo(DT * SNOOZE.slow!, 9);
    expect(life0.far - far.life).toBeCloseTo(DT, 9);
  });

  it('halves the player inside it and not outside', () => {
    const w = snoozed();
    expect(w.speed).toBeCloseTo(w.baseSpeed * SNOOZE.slow!, 9);
    const x0 = w.x;
    w.step(DT, { moveX: 1, moveY: 0 });
    expect(w.x - x0).toBeCloseTo(w.baseSpeed * SNOOZE.slow! * DT, 9);

    w.x += SNOOZE.radius + 50;
    expect(w.speed).toBeCloseTo(w.baseSpeed, 9);
    const x1 = w.x;
    w.step(DT, { moveX: 1, moveY: 0 });
    expect(w.x - x1).toBeCloseTo(w.baseSpeed * DT, 9);
  });

  it('lets go when it expires', () => {
    const w = snoozed();
    for (let t = 0; t < SNOOZE.range + 0.1; t += DT) w.step(DT, still);
    expect(w.areas.some((a) => a.slow !== undefined)).toBe(false);
    expect(w.speed).toBeCloseTo(w.baseSpeed, 9);
  });

  it('widens with levels and comes sooner', () => {
    const one = new World({ act: QUIET, seed: 1, startingItems: [] });
    one.items.set('snooze', 1);
    one.step(DT, still);
    const six = new World({ act: QUIET, seed: 1, startingItems: [] });
    six.items.set('snooze', SNOOZE.maxLevel);
    six.step(DT, still);
    expect(six.areas[0]!.radius).toBeGreaterThan(one.areas[0]!.radius);
    const cooldown = (w: World) => (w as unknown as { cooldowns: Map<string, number> }).cooldowns.get('snooze')!;
    expect(cooldown(six)).toBeLessThan(cooldown(one));
  });
});

describe('born at thirteen: neither is offered before Adolescence', () => {
  const born = ['growth-spurt', 'snooze'];
  const roll = (w: World) => (w as unknown as { rollOffers(): string[] }).rollOffers();

  it('both are registered from Adolescence', () => {
    for (const id of born) expect(ITEMS[id]!.from, id).toBe(ADOLESCENCE.id);
  });

  it('a one-act life of Conception or School never rolls them; one of Adolescence does', () => {
    for (const act of [CONCEPTION, SCHOOL]) {
      const w = new World({ act, seed: 7 });
      for (let i = 0; i < 300; i++) {
        for (const id of roll(w)) expect(born, `${act.id} rolled "${id}"`).not.toContain(id);
      }
    }
    const w = new World({ act: ADOLESCENCE, seed: 7 });
    const seen = new Set<string>();
    for (let i = 0; i < 300; i++) for (const id of roll(w)) seen.add(id);
    for (const id of born) expect(seen.has(id), `Adolescence never rolled "${id}"`).toBe(true);
  });

  it('in a whole life they enter the pool when the life reaches Adolescence, and not before', () => {
    const w = new World({ acts: ALL_ACTS, seed: 11 });
    const adolescence = ALL_ACTS.indexOf(ADOLESCENCE);
    for (let index = 0; index < ALL_ACTS.length; index++) {
      w.actIndex = index;
      const seen = new Set<string>();
      for (let i = 0; i < 300; i++) for (const id of roll(w)) seen.add(id);
      for (const id of born) {
        expect(seen.has(id), `act ${ALL_ACTS[index]!.id}, "${id}"`).toBe(index >= adolescence);
      }
    }
  });

  it('every other item is in the pool from conception', () => {
    for (const def of Object.values(ITEMS)) {
      if (born.includes(def.id)) continue;
      expect(def.from, def.id).toBeUndefined();
    }
    // A sanity line: the field mode is Snooze's alone today.
    expect(Object.values(ITEMS).filter((d) => isActive(d) && d.mode === 'field').map((d) => d.id)).toEqual([
      'snooze',
    ]);
  });
});
