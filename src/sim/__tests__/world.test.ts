import { describe, expect, it } from 'vitest';
import { CONCEPTION } from '../../data/acts';
import { ITEMS } from '../../data/items';
import { World } from '../world';
import { Grid } from '../grid';

/** Runs the world forward with no input, which is a valid way to play badly. */
function run(w: World, seconds: number, moveX = 1, moveY = 0): void {
  const steps = Math.round(seconds * 60);
  for (let i = 0; i < steps; i++) {
    if (w.offers) {
      w.choose(w.offers[0]!);
      continue;
    }
    if (w.dead || w.won) return;
    w.step(1 / 60, { moveX, moveY });
  }
}

describe('the simulation is deterministic', () => {
  it('the same seed produces the same run', () => {
    const a = new World({ act: CONCEPTION, seed: 42 });
    const b = new World({ act: CONCEPTION, seed: 42 });
    run(a, 60);
    run(b, 60);
    expect(a.kills).toBe(b.kills);
    expect(a.enemies.length).toBe(b.enemies.length);
    expect(a.x).toBeCloseTo(b.x, 6);
    expect(a.hp).toBeCloseTo(b.hp, 6);
  });

  it('different seeds diverge', () => {
    const a = new World({ act: CONCEPTION, seed: 1 });
    const b = new World({ act: CONCEPTION, seed: 2 });
    run(a, 45);
    run(b, 45);
    expect(a.enemies.length !== b.enemies.length || a.kills !== b.kills).toBe(true);
  });
});

describe('levelling', () => {
  it('a level-up freezes the world until a choice is made', () => {
    const w = new World({ act: CONCEPTION, seed: 7 });
    run(w, 120);
    // Force the pending state and confirm nothing advances.
    w.offers = ['midpiece'];
    const time = w.time;
    const kills = w.kills;
    w.step(1 / 60, { moveX: 1, moveY: 0 });
    expect(w.time).toBe(time);
    expect(w.kills).toBe(kills);
    w.choose('midpiece');
    expect(w.offers).toBeNull();
    w.step(1 / 60, { moveX: 1, moveY: 0 });
    expect(w.time).toBeGreaterThan(time);
  });

  it('choosing an item it was not offered does nothing', () => {
    const w = new World({ act: CONCEPTION, seed: 3 });
    w.offers = ['midpiece'];
    w.choose('capacitation');
    expect(w.items.has('capacitation')).toBe(false);
    expect(w.offers).not.toBeNull();
  });

  it('never offers an item already at max level', () => {
    const w = new World({ act: CONCEPTION, seed: 9 });
    for (const id of Object.keys(ITEMS)) w.items.set(id, ITEMS[id]!.maxLevel);
    // With everything maxed there is nothing legal to offer.
    w.offers = null;
    run(w, 90);
    expect(w.offers ?? []).toEqual([]);
  });
});

describe('passives change the player', () => {
  it('midpiece trades health for speed', () => {
    const w = new World({ act: CONCEPTION, seed: 1 });
    const speed = w.speed;
    const hp = w.maxHp;
    w.items.set('midpiece', 1);
    expect(w.speed).toBeGreaterThan(speed);
    expect(w.maxHp).toBeLessThan(hp);
  });

  it('membrane trades speed for durability', () => {
    const w = new World({ act: CONCEPTION, seed: 1 });
    const speed = w.speed;
    w.items.set('membrane', 1);
    expect(w.speed).toBeLessThan(speed);
    expect(w.damageTaken).toBeLessThan(1);
  });

  it('capacitation starts below baseline and ends above it', () => {
    const w = new World({ act: CONCEPTION, seed: 1 });
    w.items.set('capacitation', 1);
    w.time = 0;
    const early = w.damageDealt;
    w.time = CONCEPTION.durationSeconds;
    const late = w.damageDealt;
    expect(early).toBeLessThan(1);
    expect(late).toBeGreaterThan(1);
    expect(late).toBeGreaterThan(early);
  });

  it('every passive actually does something', () => {
    // A passive that changes no derived stat is a dead item taking a slot in a
    // capped budget.
    for (const [id, def] of Object.entries(ITEMS)) {
      if (def.kind !== 'passive') continue;
      const changes =
        def.speedMultiplier !== 1 ||
        def.healthMultiplier !== 1 ||
        def.damageTakenMultiplier !== 1 ||
        def.damageMultiplier !== 1 ||
        def.rampTo !== 1;
      expect(changes, `passive "${id}" has no effect`).toBe(true);
    }
  });
});

describe('the act runs to its end', () => {
  it('the boss arrives when the act clock does, and normal spawning stops', () => {
    const w = new World({ act: CONCEPTION, seed: 11 });
    w.time = CONCEPTION.durationSeconds - 0.1;
    run(w, 1);
    expect(w.boss).not.toBeNull();
    const before = w.enemies.length;
    run(w, 5);
    // Nothing new arrives once it is here. Attrition only.
    expect(w.enemies.length).toBeLessThanOrEqual(before);
  });

  it('the boss is the first thing in the act that aims at the player', () => {
    const w = new World({ act: CONCEPTION, seed: 12 });
    run(w, 100);
    expect(w.projectiles.some((p) => p.hostile)).toBe(false);
    w.time = CONCEPTION.durationSeconds;
    run(w, 8);
    expect(w.boss).not.toBeNull();
    expect(w.projectiles.some((p) => p.hostile)).toBe(true);
  });

  it('killing the boss wins the run rather than ending it', () => {
    const w = new World({ act: CONCEPTION, seed: 13 });
    w.time = CONCEPTION.durationSeconds;
    run(w, 0.1);
    expect(w.boss).not.toBeNull();
    w.boss!.hp = 0;
    w.boss!.phase = 'absorbing';
    w.boss!.timer = 0.05;
    run(w, 1);
    expect(w.won).toBe(true);
    expect(w.outcome).toBe('won');
    expect(w.dead).toBe(false);
  });
});

describe('one-shot bursts and lingering fields are not the same effect', () => {
  /** No items, so nothing but the area under test can deal damage. */
  function unarmed(seed: number): World {
    const w = new World({ act: CONCEPTION, seed, startingItems: [] });
    w.time = 1;
    return w;
  }

  it('a one-shot burst applies its damage exactly once, however long it lives', () => {
    const w = unarmed(5);
    w.spawnEnemy('white-cell');
    const e = w.enemies[0]!;
    e.x = w.x;
    e.y = w.y;
    const before = e.hp;
    w.areas.push({
      x: w.x, y: w.y, age: 0, seconds: 5, radius: 200,
      damage: 7, pull: false, tick: false, serial: 999_999,
    });
    for (let i = 0; i < 60; i++) w.step(1 / 60, { moveX: 0, moveY: 0 });
    expect(before - e.hp).toBeCloseTo(7, 5);
  });

  it('a lingering field ticks, so it scales with how long the enemy stays in it', () => {
    const w = unarmed(6);
    w.spawnEnemy('white-cell');
    const e = w.enemies[0]!;
    e.x = w.x;
    e.y = w.y;
    const before = e.hp;
    w.areas.push({
      x: w.x, y: w.y, age: 0, seconds: 5, radius: 200,
      damage: 1, pull: false, tick: true, serial: 999_998,
    });
    for (let i = 0; i < 60; i++) w.step(1 / 60, { moveX: 0, moveY: 0 });
    // One second at damage 1 and the 6x tick rate. The point is that it is
    // many applications rather than one, which is what a burst is not.
    expect(before - e.hp).toBeGreaterThan(4);
  });
});

describe('grid', () => {
  it('finds everything within the radius and nothing far away', () => {
    const grid = new Grid<{ x: number; y: number }>();
    const items = [
      { x: 0, y: 0 },
      { x: 50, y: 0 },
      { x: 1000, y: 1000 },
    ];
    grid.build(items);
    const out: Array<{ x: number; y: number }> = [];
    grid.query(0, 0, 120, out);
    expect(out).toContain(items[0]);
    expect(out).toContain(items[1]);
    expect(out).not.toContain(items[2]);
  });

  it('reuses the output array, so the hot path allocates nothing', () => {
    const grid = new Grid<{ x: number; y: number }>();
    grid.build([{ x: 0, y: 0 }]);
    const out: Array<{ x: number; y: number }> = [];
    grid.query(0, 0, 50, out);
    grid.query(9999, 9999, 50, out);
    expect(out.length).toBe(0);
  });
});
