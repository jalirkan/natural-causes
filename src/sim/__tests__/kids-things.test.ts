import { describe, expect, it } from 'vitest';
import { CONCEPTION, type ActDef } from '../../data/acts';
import { enemyDef, type EnemyDef } from '../../data/enemies';
import { ITEMS, PATH_OPENS_AT, isActive, offerIdFor, type ActiveItem } from '../../data/items';
import { ARENA_WIDTH, World, type AreaState, type EnemyState } from '../world';

/**
 * G-054: the weapons are the kid's things. Two of them carry a new verb:
 * Spilt Milk (id `acrosome`, and its evolution Tantrum) leaves a puddle that
 * holds what stands in it, by the one slow every hold shares (`slowAt`), and
 * never its holder; Cry (id `cry`) spreads a ring that shoves what its edge
 * crosses and holds it a moment, once per enemy per cry, on `World.cries`.
 * Every figure below is read from the registry, so a placeholder moving in
 * items.ts moves the test with it.
 */

/** No schedule, so nothing is on the field but what the test places there. */
const QUIET: ActDef = {
  id: 'kids-things-fixture',
  name: 'Fixture',
  durationSeconds: 300,
  bossName: 'Fixture',
  boss: { kind: 'egg' },
  age: { from: 0, to: 0 },
  waves: [],
};

/** A target that stands still and does not die of one hit. */
const DUMMY: EnemyDef = { ...enemyDef('rival-sperm'), movement: 'static', speed: 0, hp: 1000 };
/** One that walks at the player, for measuring a hold. */
const CHASER: EnemyDef = { ...enemyDef('rival-sperm'), movement: 'chase', speed: 60, hp: 1000 };

const DT = 1 / 60;
const still = { moveX: 0, moveY: 0 };

let uid = 500000;
function place(w: World, dx: number, dy: number, def: EnemyDef = DUMMY): EnemyState {
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

function active(id: string): ActiveItem {
  const def = ITEMS[id];
  if (!def || !isActive(def)) throw new Error(`"${id}" is not an active item`);
  return def;
}

function world(items: Record<string, number>, seed = 1): World {
  const w = new World({ act: QUIET, seed, startingItems: [] });
  for (const [id, level] of Object.entries(items)) w.items.set(id, level);
  return w;
}

const puddles = (w: World, source = 'acrosome'): AreaState[] =>
  w.areas.filter((a) => a.source === source && a.owner === 'player');
const from = (w: World, e: EnemyState, x = w.x, y = w.y): number => Math.hypot(e.x - x, e.y - y);

describe('Spilt Milk leaves a puddle (G-054)', () => {
  const milk = active('acrosome');

  it('the names moved and the id did not', () => {
    expect(milk.name).toBe('Spilt Milk');
    expect(milk.mode).toBe('burst');
  });

  it('each burst lays one where it went off: no damage, the slow, a share of the burst, the player’s', () => {
    const w = world({ acrosome: 1 });
    w.step(DT, still);
    const burst = w.areas.find((a) => !a.tick && a.damage > 0);
    expect(burst).toBeDefined();
    const laid = puddles(w);
    expect(laid).toHaveLength(1);
    const p = laid[0]!;
    expect(p.damage).toBe(0);
    expect(p.pull).toBe(false);
    expect(p.slow).toBe(milk.puddle!.slow);
    expect(p.slow).toBe(0.6);
    expect(p.radius).toBeCloseTo(burst!.radius * milk.puddle!.radius, 9);
    expect(p.seconds).toBe(milk.puddle!.seconds);
    expect([p.x, p.y]).toEqual([w.x, w.y]);
  });

  it('an enemy standing in it moves at ×0.6, and one outside it at full speed', () => {
    const w = world({ acrosome: 1 });
    w.step(DT, still);
    const p = puddles(w)[0]!;
    const inside = place(w, 0, p.radius - 20, CHASER);
    const outside = place(w, 0, -(p.radius + 200), CHASER);
    expect(w.slowAt(inside.x, inside.y)).toBeCloseTo(milk.puddle!.slow, 9);
    expect(w.slowAt(outside.x, outside.y)).toBe(1);
    const was = [from(w, inside), from(w, outside)];
    w.step(DT, still);
    expect(was[0]! - from(w, inside)).toBeCloseTo(CHASER.speed * DT * milk.puddle!.slow, 6);
    expect(was[1]! - from(w, outside)).toBeCloseTo(CHASER.speed * DT, 6);
  });

  it('two puddles hold once: the slowest wins, nothing multiplies', () => {
    const w = world({ acrosome: 1 });
    w.step(DT, still);
    const first = puddles(w)[0]!;
    // A step to the side, and the next burst while the first puddle is still down.
    w.x += 30;
    for (let i = 0; i < 200 && puddles(w).length < 2; i++) w.step(DT, still);
    const both = puddles(w);
    expect(both).toHaveLength(2);
    expect(both).toContain(first);
    // A point inside both, off the player.
    const [a, b] = both as [AreaState, AreaState];
    const x = (a.x + b.x) / 2;
    const y = a.y + 60;
    for (const q of both) expect(Math.hypot(x - q.x, y - q.y)).toBeLessThan(q.radius);
    expect(w.slowAt(x, y)).toBeCloseTo(milk.puddle!.slow, 9);
    const e = place(w, x - w.x, y - w.y, CHASER);
    const was = from(w, e);
    w.step(DT, still);
    expect(was - from(w, e)).toBeCloseTo(CHASER.speed * DT * milk.puddle!.slow, 6);
  });

  it('never holds the player, who stands in one every burst', () => {
    const w = world({ acrosome: 1 });
    w.step(DT, still);
    const p = puddles(w)[0]!;
    expect(Math.hypot(w.x - p.x, w.y - p.y)).toBeLessThan(p.radius);
    expect(w.speed / w.baseSpeed).toBeCloseTo(1, 9);
    // Snooze's field, beside it, still holds everyone: the exemption is the puddle's alone.
    w.items.set('snooze', 1);
    w.step(DT, still);
    expect(w.speed / w.baseSpeed).toBeCloseTo(active('snooze').slow!, 9);
  });

  it('dries up after its seconds', () => {
    const w = world({ acrosome: 1 });
    w.step(DT, still);
    const p = puddles(w)[0]!;
    for (let i = 0; i < Math.ceil(milk.puddle!.seconds / DT) + 2; i++) w.step(DT, still);
    expect(w.areas).not.toContain(p);
  });

  it('the echo spills too: a burst that goes off twice leaves two', () => {
    const level = milk.levels.findIndex((l) => l.echo) + 1;
    expect(level).toBeGreaterThan(0);
    const w = world({ acrosome: level });
    w.step(DT, still);
    expect(puddles(w)).toHaveLength(1);
    for (let i = 0; i < 20; i++) w.step(DT, still);
    expect(puddles(w)).toHaveLength(2);
  });

  it('Tantrum keeps it, under its own name', () => {
    const tantrum = active('tantrum');
    expect(tantrum.puddle).toEqual(milk.puddle);
    const w = world({ tantrum: 1 });
    w.step(DT, still);
    const laid = puddles(w, 'tantrum');
    expect(laid).toHaveLength(1);
    expect(laid[0]!.damage).toBe(0);
    expect(laid[0]!.slow).toBe(tantrum.puddle!.slow);
  });
});

describe('Cry: the ring shoves and holds (G-054)', () => {
  const cry = active('cry');

  it('is a control item in the pool from conception, and hurts nothing', () => {
    expect(cry.name).toBe('Cry');
    expect(cry.kind).toBe('control');
    expect(cry.mode).toBe('cry');
    expect(cry.icon).toBe('cry');
    expect(cry.from).toBeUndefined();
    expect(cry.damage).toBe(0);
    const w = new World({ act: CONCEPTION, seed: 1 });
    const roll = (w as unknown as { rollOffers(): string[] }).rollOffers.bind(w);
    let seen = false;
    for (let i = 0; i < 300 && !seen; i++) seen = roll().includes('cry');
    expect(seen).toBe(true);
  });

  it('goes off on its cooldown: a ring on `cries`, never on `rings`, gone after its seconds', () => {
    const w = world({ cry: 1 });
    w.step(DT, still);
    expect(w.cries).toHaveLength(1);
    const c = w.cries[0]!;
    expect(c.source).toBe('cry');
    expect(c.maxRadius).toBe(cry.radius);
    expect(c.seconds).toBe(cry.range);
    expect(c.age).toBeCloseTo(DT, 9);
    expect([c.x, c.y]).toEqual([w.x, w.y]);
    expect(w.rings).toHaveLength(0);
    let steps = 1;
    while (w.cries.length > 0 && steps < 1000) {
      w.step(DT, still);
      steps++;
    }
    expect(steps * DT).toBeGreaterThanOrEqual(cry.range - 1e-9);
    expect(steps * DT).toBeLessThanOrEqual(cry.range + DT + 1e-9);
    // Not again until its cooldown has run.
    for (let i = 0; i < Math.floor((cry.cooldown - cry.range) / DT) - 2; i++) {
      w.step(DT, still);
      expect(w.cries).toHaveLength(0);
    }
  });

  it('shoves what its edge crosses straight out by its knockback, and not what lies beyond it', () => {
    const w = world({ cry: 1 });
    const x0 = w.x;
    const y0 = w.y;
    const ahead = place(w, 100, 0);
    const aslant = place(w, -60, 80);
    const beyond = place(w, cry.radius + DUMMY.radius + 60, 0);
    for (let i = 0; i < 60; i++) w.step(DT, still);
    expect(from(w, ahead, x0, y0)).toBeCloseTo(100 + cry.knockback!, 6);
    expect(ahead.y).toBeCloseTo(y0, 9);
    expect(from(w, aslant, x0, y0)).toBeCloseTo(100 + cry.knockback!, 6);
    expect(Math.atan2(aslant.y - y0, aslant.x - x0)).toBeCloseTo(Math.atan2(80, -60), 9);
    expect([beyond.x, beyond.y]).toEqual([x0 + cry.radius + DUMMY.radius + 60, y0]);
    expect(beyond.slowedUntil).toBeUndefined();
  });

  it('shoves each enemy once per cry, though the edge passes it again', () => {
    const w = world({ cry: 1 });
    const x0 = w.x;
    // Shoved to 100 + 120 = 220, inside the 260 the edge goes on to reach.
    const e = place(w, 100, 0);
    expect(100 + cry.knockback!).toBeLessThan(cry.radius);
    for (let i = 0; i < 60; i++) w.step(DT, still);
    expect(e.x - x0).toBeCloseTo(100 + cry.knockback!, 6);
  });

  it('holds what it crossed at ×0.5 for its seconds, wherever the shove put it, then lets go', () => {
    const w = world({ cry: 1 });
    const e = place(w, 100, 0, CHASER);
    for (let i = 0; i < 100 && e.slowedUntil === undefined; i++) w.step(DT, still);
    expect(e.slowedTo).toBe(cry.slow);
    expect(e.slowedTo).toBe(0.5);
    expect(e.slowedUntil! - w.time).toBeCloseTo(cry.slowSeconds!, 9);
    // Nothing on the floor holds it: the hold is the enemy's own.
    expect(w.slowAt(e.x, e.y)).toBe(1);
    const walk = (): number => {
      const was = from(w, e);
      w.step(DT, still);
      return was - from(w, e);
    };
    expect(walk()).toBeCloseTo(CHASER.speed * DT * cry.slow!, 6);
    while (w.time < e.slowedUntil! + DT) w.step(DT, still);
    expect(walk()).toBeCloseTo(CHASER.speed * DT, 6);
  });

  it('holds the arena’s wall, as every knockback does', () => {
    const w = world({ cry: 1 });
    w.x = 50;
    const e = place(w, -30, 0);
    for (let i = 0; i < 60; i++) w.step(DT, still);
    expect(e.x).toBe(0);
    expect(e.x).toBeLessThan(ARENA_WIDTH);
  });

  it('leaves a hostile shot alone', () => {
    const w = world({ cry: 1 });
    w.projectiles.push({
      x: w.x + 100,
      y: w.y,
      vx: 50,
      vy: 0,
      life: 5,
      damage: 1,
      pierce: 1,
      radius: 6,
      hostile: true,
      serial: 900000,
    });
    const shot = w.projectiles[0]!;
    const x0 = shot.x;
    for (let i = 0; i < 30; i++) w.step(DT, still);
    expect(shot.vx).toBe(50);
    expect(shot.vy).toBe(0);
    expect(shot.x).toBeCloseTo(x0 + 50 * 30 * DT, 6);
  });

  it('its paths open at PATH_OPENS_AT, as every weapon’s do', () => {
    expect(cry.paths!.map((p) => p.name)).toEqual(['Louder', 'Longer', 'Again']);
    const paths = cry.paths!.map((p) => offerIdFor(cry, p));
    const rolled = (level: number): Set<string> => {
      const w = new World({ act: CONCEPTION, seed: 3, startingItems: [] });
      w.items.set('cry', level);
      const roll = (w as unknown as { rollOffers(): string[] }).rollOffers.bind(w);
      const out = new Set<string>();
      for (let i = 0; i < 400; i++) for (const id of roll()) out.add(id);
      return out;
    };
    const before = rolled(PATH_OPENS_AT - 1);
    for (const p of paths) expect(before.has(p), p).toBe(false);
    const after = rolled(PATH_OPENS_AT);
    for (const p of paths) expect(after.has(p), p).toBe(true);
  });

  it('Louder widens the ring, Longer lengthens the hold, Again brings it sooner', () => {
    const louder = world({ cry: 1 });
    louder.pathLevels.set('cry/louder', 1);
    louder.step(DT, still);
    expect(louder.cries[0]!.maxRadius).toBeCloseTo(cry.radius * 1.15, 9);

    const longer = world({ cry: 1 });
    longer.pathLevels.set('cry/longer', 1);
    const e = place(longer, 60, 0);
    for (let i = 0; i < 60 && e.slowedUntil === undefined; i++) longer.step(DT, still);
    expect(e.slowedUntil! - longer.time).toBeCloseTo(cry.slowSeconds! * 1.25, 9);

    // Again: the second cry comes sooner than the plain one's.
    const second = (paths: Record<string, number>): number => {
      const w = world({ cry: 1 });
      for (const [k, v] of Object.entries(paths)) w.pathLevels.set(k, v);
      let cries = 0;
      let wasCrying = false;
      for (let i = 1; i < 60 * 30; i++) {
        w.step(DT, still);
        const crying = w.cries.length > 0;
        if (crying && !wasCrying && ++cries === 2) return i * DT;
        wasCrying = crying;
      }
      return Infinity;
    };
    expect(second({ 'cry/again': 1 })).toBeLessThan(second({}));
  });
});
