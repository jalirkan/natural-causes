import { describe, expect, it } from 'vitest';
import { CONCEPTION } from '../../data/acts';
import { enemyDef, type EnemyDef } from '../../data/enemies';
import {
  ITEMS,
  cooldownScale,
  damageScale,
  levelBonus,
  offerIdFor,
  parseOfferId,
  type ActiveItem,
} from '../../data/items';
import { World, type EnemyState } from '../world';

/**
 * G-043's foundation: the four bonus fields a path (or a level) may carry —
 * damage, cooldown, speed, knockback — read by the sim through the same
 * `levelBonus` total as projectiles, pierce, area, duration, echo and chain.
 */

const DUMMY: EnemyDef = { ...enemyDef('rival-sperm'), movement: 'static', speed: 0, hp: 1000 };
let uid = 200000;
function place(w: World, dx: number, dy: number): EnemyState {
  const e: EnemyState = {
    uid: uid++,
    hitBySerial: 0,
    hitByAreaSerial: 0,
    def: DUMMY,
    x: w.x + dx,
    y: w.y + dy,
    vx: 0,
    vy: 0,
    hp: DUMMY.hp,
    age: 0,
    hitFlash: 0,
    radius: DUMMY.radius,
    displaySize: DUMMY.displaySize,
    xp: DUMMY.xp,
    consult: 0,
    reload: 0,
  };
  w.enemies.push(e);
  return e;
}
const still = { moveX: 0, moveY: 0 };

/** A copy of a weapon with one extra bonus on its second level, registered under a test id. */
function variant(base: string, id: string, bonus: Partial<ActiveItem['levels'][number]>): ActiveItem {
  const def = ITEMS[base] as ActiveItem;
  const levels = def.levels.map((l, i) => (i === 1 ? { ...l, ...bonus } : { ...l }));
  const out: ActiveItem = { ...def, id, levels };
  ITEMS[id] = out;
  return out;
}

describe('the generic scaling is exported as the formula the sim uses', () => {
  it('damage and cooldown scales are what World applied before they were exported', () => {
    expect(damageScale(1)).toBe(1);
    expect(damageScale(6)).toBeCloseTo(2);
    expect(cooldownScale(1)).toBe(1);
    expect(cooldownScale(2)).toBeCloseTo(0.92);
    expect(cooldownScale(20)).toBe(0.4);
  });
});

describe('levelBonus folds the four new fields', () => {
  it('multiplies damage, cooldown and speed and sums knockback across owned levels', () => {
    const def = variant('lash', 'test-fold', { damage: 1.5, cooldown: 0.8, speed: 1.25, knockback: 30 });
    def.levels[2] = { ...def.levels[2]!, damage: 2, knockback: 10 };
    const b = levelBonus(def, 3);
    expect(b.damage).toBeCloseTo(3);
    expect(b.cooldown).toBeCloseTo(0.8);
    expect(b.speed).toBeCloseTo(1.25);
    expect(b.knockback).toBe(40);
    expect(levelBonus(def, 1)).toMatchObject({ damage: 1, cooldown: 1, speed: 1, knockback: 0 });
  });
});

describe('the sim reads them', () => {
  it('a damage bonus multiplies the hit, and a speed bonus the shot', () => {
    variant('lash', 'test-hard', { damage: 2, speed: 1.5 });
    const plain = new World({ act: CONCEPTION, seed: 1, startingItems: [] });
    plain.items.set('lash', 2);
    const hard = new World({ act: CONCEPTION, seed: 1, startingItems: [] });
    hard.items.set('test-hard', 2);
    place(plain, 100, 0);
    place(hard, 100, 0);
    plain.step(1 / 60, still);
    hard.step(1 / 60, still);
    const p = plain.projectiles.find((s) => s.source === 'lash')!;
    const h = hard.projectiles.find((s) => s.source === 'test-hard')!;
    expect(h.damage).toBeCloseTo(p.damage * 2);
    expect(Math.hypot(h.vx, h.vy)).toBeCloseTo(Math.hypot(p.vx, p.vy) * 1.5);
  });

  it('a cooldown bonus fires sooner', () => {
    variant('lash', 'test-soon', { cooldown: 0.5 });
    const count = (id: string): number => {
      const w = new World({ act: CONCEPTION, seed: 1, startingItems: [] });
      w.items.set(id, 2);
      const e = place(w, 100, 0);
      let fired = 0;
      let last = 0;
      for (let i = 0; i < 240; i++) {
        w.step(1 / 60, still);
        e.hp = DUMMY.hp;
        const now = w.projectiles.length;
        if (now > last) fired += now - last;
        last = now;
        w.projectiles.length = 0;
        last = 0;
      }
      return fired;
    };
    expect(count('test-soon')).toBeGreaterThan(count('lash') * 1.6);
  });

  it('a knockback bonus on a burst pushes the enemy away; a speed bonus spins an orbit faster', () => {
    variant('acrosome', 'test-shove', { knockback: 50 });
    const w = new World({ act: CONCEPTION, seed: 1, startingItems: [] });
    w.items.set('test-shove', 2);
    const e = place(w, 40, 0);
    for (let i = 0; i < 10 && e.x < w.x + 60; i++) w.step(1 / 60, still);
    expect(e.x).toBeGreaterThan(w.x + 60);

    variant('grudge', 'test-spin', { speed: 2 });
    const slow = new World({ act: CONCEPTION, seed: 1, startingItems: [] });
    slow.items.set('grudge', 2);
    const fast = new World({ act: CONCEPTION, seed: 1, startingItems: [] });
    fast.items.set('test-spin', 2);
    const angleOf = (world: World): number => Math.atan2(world.orbiters[0]!.y - world.y, world.orbiters[0]!.x - world.x);
    slow.step(1 / 60, still);
    fast.step(1 / 60, still);
    const a0s = angleOf(slow);
    const a0f = angleOf(fast);
    slow.step(1 / 60, still);
    fast.step(1 / 60, still);
    const ds = Math.abs(angleOf(slow) - a0s);
    const df = Math.abs(angleOf(fast) - a0f);
    expect(df).toBeCloseTo(ds * 2, 3);
  });
});

describe('offer ids name a weapon, or a weapon and one of its paths', () => {
  it('round-trips and refuses what does not exist', () => {
    const lash = ITEMS['lash'] as ActiveItem;
    expect(parseOfferId('lash')).toEqual({ item: lash });
    expect(offerIdFor(lash)).toBe('lash');
    const path = { id: 'twitch', name: 'Twitch', blurb: 'x', maxLevel: 1, levels: [{ text: 'x' }] };
    const withPath: ActiveItem = { ...lash, id: 'test-pathed', paths: [path] };
    ITEMS['test-pathed'] = withPath;
    expect(offerIdFor(withPath, path)).toBe('test-pathed/twitch');
    expect(parseOfferId('test-pathed/twitch')).toEqual({ item: withPath, path });
    expect(() => parseOfferId('test-pathed/nope')).toThrow(/Unknown path/);
    expect(() => parseOfferId('midpiece/x')).toThrow(/active/);
  });
});
