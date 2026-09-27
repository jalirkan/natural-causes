import { describe, expect, it } from 'vitest';
import { CONCEPTION } from '../../data/acts';
import { enemyDef, type EnemyDef } from '../../data/enemies';
import { ITEMS } from '../../data/items';
import { World, xpToNextLevel, type EnemyState } from '../world';

/**
 * G-038: upgrades gain. Weapon levels add shots, pierce, area and echoes;
 * new modes orbit and chain; Temper evolves into Tantrum.
 */

/** A target that stands still and does not die of one hit. */
const DUMMY: EnemyDef = {
  ...enemyDef('rival-sperm'),
  movement: 'static',
  speed: 0,
  hp: 1000,
};

let uid = 100000;
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

describe('weapon levels add things', () => {
  it('seeking with a projectiles bonus fires at distinct next-nearest targets', () => {
    const w = new World({ act: CONCEPTION, seed: 1, startingItems: [] });
    w.items.set('lash', 5); // +1 at 3 and 5: three shots
    const targets = [place(w, 100, 0), place(w, 0, 150), place(w, -200, 0), place(w, 0, -250)];
    w.step(1 / 60, still);
    const shots = w.projectiles.filter((p) => p.source === 'lash');
    expect(shots).toHaveLength(3);
    const aimed = shots.map((p) => {
      const heading = Math.atan2(p.vy, p.vx);
      return targets.findIndex((t) => Math.abs(Math.atan2(t.y - w.y, t.x - w.x) - heading) < 0.01);
    });
    expect(new Set(aimed)).toEqual(new Set([0, 1, 2]));
  });

  it('line with a projectiles bonus fires backwards, then a pair either side', () => {
    const w = new World({ act: CONCEPTION, seed: 1, startingItems: [] });
    w.items.set('motility', 5);
    w.step(1 / 60, { moveX: 1, moveY: 0 });
    const headings = w.projectiles
      .filter((p) => p.source === 'motility')
      .map((p) => Math.round((Math.atan2(p.vy, p.vx) * 180) / Math.PI))
      .sort((a, b) => a - b);
    expect(headings).toEqual([-15, 0, 15, 180]);
  });

  it('a burst with echo goes off a second time a quarter-second later', () => {
    const w = new World({ act: CONCEPTION, seed: 1, startingItems: [] });
    w.items.set('acrosome', 4);
    w.step(1 / 60, still);
    const first = w.areas.length;
    expect(first).toBe(1);
    for (let i = 0; i < 20; i++) w.step(1 / 60, still);
    // The first has expired (0.12s); the echo is the one alive now.
    expect(w.areas.filter((a) => !a.tick && !a.pull)).toHaveLength(1);
  });
});

describe('Grudge orbits', () => {
  it('damages an enemy placed on its path, and exposes where it is', () => {
    const w = new World({ act: CONCEPTION, seed: 1, startingItems: ['grudge'] });
    const def = ITEMS['grudge']!;
    if (def.kind === 'passive') throw new Error('grudge is active');
    const omega = def.projectileSpeed / def.range;
    const angle = omega * (1 / 60);
    const e = place(w, Math.cos(angle) * def.range, Math.sin(angle) * def.range);
    w.step(1 / 60, still);
    expect(w.orbiters).toHaveLength(1);
    expect(e.hp).toBeLessThan(DUMMY.hp);
  });

  it('hits the same enemy at most once per cooldown per orbiter', () => {
    const w = new World({ act: CONCEPTION, seed: 1, startingItems: ['grudge'] });
    const def = ITEMS['grudge']!;
    if (def.kind === 'passive') throw new Error('grudge is active');
    // A dummy big enough to cover the whole circle is touched every frame, so
    // only the per-orbiter cooldown stands between it and sixty hits a second.
    const e = place(w, 0, 0);
    e.radius = def.range + 20;
    for (let i = 0; i < 30; i++) w.step(1 / 60, still); // 0.5s
    expect(DUMMY.hp - e.hp).toBeCloseTo(def.damage, 5);
  });

  it('adds orbiters with levels', () => {
    const w = new World({ act: CONCEPTION, seed: 1, startingItems: [] });
    w.items.set('grudge', 7);
    w.step(1 / 60, still);
    expect(w.orbiters).toHaveLength(4);
  });
});

describe('Gossip chains (item id group-chat, G-041)', () => {
  it('a hit sends a shot on to a second enemy nearby', () => {
    const w = new World({ act: CONCEPTION, seed: 1, startingItems: ['group-chat'] });
    const first = place(w, 100, 0);
    const second = place(w, 100, 90);
    for (let i = 0; i < 60; i++) w.step(1 / 60, still);
    expect(first.hp).toBeLessThan(DUMMY.hp);
    expect(second.hp).toBeLessThan(DUMMY.hp);
    // The chained hit carries less than the shot that started it.
    expect(DUMMY.hp - second.hp).toBeLessThan(DUMMY.hp - first.hp);
  });
});

describe('Tantrum', () => {
  it('knocks an enemy it hits away from the player', () => {
    const w = new World({ act: CONCEPTION, seed: 1, startingItems: ['tantrum'] });
    const e = place(w, 50, 0);
    const before = Math.hypot(e.x - w.x, e.y - w.y);
    w.step(1 / 60, still);
    expect(e.hp).toBeLessThan(DUMMY.hp);
    expect(Math.hypot(e.x - w.x, e.y - w.y)).toBeCloseTo(before + 70, 3);
  });

  it('is offered alone once Temper is maxed beside Restlessness, and replaces it', () => {
    const w = new World({ act: CONCEPTION, seed: 1, startingItems: ['lash'] });
    w.items.set('acrosome', ITEMS['acrosome']!.maxLevel);
    w.items.set('midpiece', 1);
    w.gems.push({ x: w.x, y: w.y, value: w.xpToNext });
    w.step(1 / 60, still);
    expect(w.offers).toEqual(['tantrum']);
    w.choose('tantrum');
    expect(w.items.get('tantrum')).toBe(1);
    expect(w.items.has('acrosome')).toBe(false);

    // Neither the evolution nor the weapon it replaced comes round again.
    for (let i = 0; i < 40; i++) {
      w.gems.push({ x: w.x, y: w.y, value: w.xpToNext });
      w.step(1 / 60, still);
      if (!w.offers) continue;
      expect(w.offers).not.toContain('tantrum');
      expect(w.offers).not.toContain('acrosome');
      w.choose(w.offers[0]!);
      w.hp = w.maxHp;
    }
  });

  it('is not offered without the partner item', () => {
    const w = new World({ act: CONCEPTION, seed: 1, startingItems: ['lash'] });
    w.items.set('acrosome', ITEMS['acrosome']!.maxLevel);
    w.gems.push({ x: w.x, y: w.y, value: w.xpToNext });
    w.step(1 / 60, still);
    expect(w.offers).not.toBeNull();
    expect(w.offers).not.toContain('tantrum');
  });
});

describe('the XP curve (placeholder)', () => {
  it('is monotonic', () => {
    for (let level = 1; level < 200; level++) {
      expect(xpToNextLevel(level + 1), `level ${level}`).toBeGreaterThan(xpToNextLevel(level));
    }
  });

  it('is cheaper than the old formula for the first five levels', () => {
    for (let level = 1; level <= 5; level++) {
      expect(xpToNextLevel(level)).toBeLessThan(Math.round(5 + level * 4.5));
    }
  });

  it('is what the world starts on', () => {
    expect(new World({ act: CONCEPTION, seed: 1 }).xpToNext).toBe(xpToNextLevel(1));
  });
});
