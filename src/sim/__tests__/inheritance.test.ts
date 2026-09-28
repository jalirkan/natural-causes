import { describe, expect, it } from 'vitest';
import { ADOLESCENCE, CONCEPTION, SCHOOL, type ActDef } from '../../data/acts';
import { INHERITANCES, INHERITANCE_IDS } from '../../data/inheritances';
import { isActive, parseOfferId } from '../../data/items';
import { MAGNET_RADIUS, PLAYER_BASE_HP, World, xpToNextLevel } from '../world';

/**
 * The Egg's drop (G-017, G-042). At the crossing out of Conception the life
 * is dealt one inheritance from the world's own dice, kept for every act after
 * it, never asked and never rolled again. Each roll has a real upside and a
 * real downside, and both are measured here in a scripted world — the numbers
 * are placeholders (G-042), so these tests assert direction and path, and
 * read the magnitudes off the data rather than restating them.
 */

const DT = 1 / 60;
const STILL = { moveX: 0, moveY: 0 };
const LIFE: ActDef[] = [CONCEPTION, SCHOOL, ADOLESCENCE];

/** No schedule, so nothing is on the field but what a test places there. */
const EMPTY: ActDef = {
  id: 'inheritance-fixture-one',
  name: 'Fixture',
  durationSeconds: 300,
  bossName: 'Fixture',
  boss: { kind: 'egg' },
  age: { from: 0, to: 0 },
  waves: [],
};
const FIXTURES: ActDef[] = [EMPTY, { ...EMPTY, id: 'inheritance-fixture-two' }, { ...EMPTY, id: 'inheritance-fixture-three' }];

/** Steps with the player kept alive, choosing the first offer when asked. */
function alive(world: World, seconds: number, moveX = 0, moveY = 0): void {
  for (let i = 0; i < Math.round(seconds * 60); i++) {
    if (world.offers) {
      world.choose(world.offers[0]!);
      continue;
    }
    world.hp = world.maxHp;
    world.step(DT, { moveX, moveY });
  }
}

/** Runs the act out, empties its boss, and plays the exit: one crossing. */
function cross(world: World): void {
  const from = world.actIndex;
  world.actTime = world.act.durationSeconds;
  world.step(DT, STILL);
  const b = world.boss!;
  expect(b, 'the boss did not appear at the act clock').not.toBeNull();
  b.hp = 0;
  b.phase = 'absorbing';
  b.timer = 0;
  world.step(DT, STILL);
  expect(world.actIndex).toBe(from + 1);
}

/**
 * Seeds whose first crossing, straight away in an empty life, deals `id`.
 * The dice decide; this only looks. A world that plays before it crosses
 * draws more dice, so a test uses the seed exactly this way.
 */
function seedsDealing(id: string, count: number, startingItems = ['lash']): number[] {
  const out: number[] = [];
  for (let seed = 1; seed < 500 && out.length < count; seed++) {
    const w = new World({ acts: FIXTURES, seed, startingItems });
    cross(w);
    if (w.inheritance?.id === id) out.push(seed);
  }
  expect(out.length, `no seed under 500 deals ${id}`).toBe(count);
  return out;
}

/**
 * Every level the life owns, by offer id: items' and (G-043) paths'. A dealt
 * level may be either, since `takeUnaskedLevels` deals from the offer pool.
 */
function owned(world: World): Map<string, number> {
  return new Map([...world.items, ...world.pathLevels]);
}

function totalLevels(items: ReadonlyMap<string, number>): number {
  let n = 0;
  for (const level of items.values()) n += level;
  return n;
}

describe('the Egg deals one inheritance, once (G-042)', () => {
  it('is never dealt in Conception, and is dealt at the crossing out of it', () => {
    const world = new World({ acts: LIFE, seed: 7 });
    alive(world, 20, 1, 0);
    expect(world.inheritance).toBeNull();
    world.actTime = world.act.durationSeconds;
    alive(world, DT);
    expect(world.boss).not.toBeNull();
    expect(world.inheritance, 'dealt at the Egg rather than after it').toBeNull();
    const b = world.boss!;
    b.hp = 0;
    b.phase = 'absorbing';
    b.timer = 0.5;
    alive(world, 0.25);
    expect(world.actIndex).toBe(0);
    expect(world.inheritance, 'dealt during the absorb').toBeNull();
    alive(world, 0.5);
    expect(world.act).toBe(SCHOOL);
    expect(world.inheritance).not.toBeNull();
    expect(INHERITANCE_IDS).toContain(world.inheritance!.id);
  });

  it('is not re-dealt at the second crossing, and carries into every later act', () => {
    for (let seed = 1; seed <= 12; seed++) {
      const world = new World({ acts: FIXTURES, seed });
      cross(world);
      const dealt = world.inheritance;
      expect(dealt).not.toBeNull();
      alive(world, 5);
      cross(world);
      expect(world.inheritance, `seed ${seed}: re-dealt at the second crossing`).toBe(dealt);
      alive(world, 5);
      expect(world.inheritance).toBe(dealt);
    }
  });

  it('the same seed deals the same roll, and the dice reach all three', () => {
    for (let seed = 1; seed <= 6; seed++) {
      const a = new World({ acts: LIFE, seed });
      const b = new World({ acts: LIFE, seed });
      for (const w of [a, b]) {
        alive(w, 15, 1, 0);
        w.actTime = w.act.durationSeconds;
        alive(w, DT);
        w.boss!.hp = 0;
        w.boss!.phase = 'absorbing';
        w.boss!.timer = 0;
        alive(w, DT);
        expect(w.act).toBe(SCHOOL);
      }
      expect(a.inheritance).not.toBeNull();
      expect(b.inheritance).toBe(a.inheritance);
    }
    const seen = new Set<string>();
    for (let seed = 1; seed <= 60; seed++) {
      const w = new World({ acts: FIXTURES, seed });
      cross(w);
      seen.add(w.inheritance!.id);
    }
    expect([...seen].sort()).toEqual([...INHERITANCE_IDS].sort());
  });

  it('every roll is named on the card, argued both ways, and labelled a placeholder', () => {
    for (const def of Object.values(INHERITANCES)) {
      expect(def.blurb).toContain(def.name);
      expect(def.gives.length).toBeGreaterThan(30);
      expect(def.costs.length).toBeGreaterThan(30);
      expect(def.provisional.length).toBeGreaterThan(30);
    }
  });
});

describe('each roll gives and costs, measured', () => {
  it('Constitution: a higher ceiling for the whole life, and every level costs more XP', () => {
    const def = INHERITANCES['constitution']!;
    const [seed] = seedsDealing('constitution', 1);
    const world = new World({ acts: FIXTURES, seed });
    expect(world.maxHp).toBe(PLAYER_BASE_HP);
    const level = world.level;
    cross(world);
    expect(world.inheritance).toBe(def);

    // Gives: the ceiling, and the crossing's heal reaches it.
    expect(world.maxHp).toBeCloseTo(PLAYER_BASE_HP * def.stats.healthMultiplier, 6);
    expect(world.maxHp).toBeGreaterThan(PLAYER_BASE_HP);
    expect(world.hp).toBe(world.maxHp);

    // Costs: the bar the player is on, and every one after it.
    expect(world.level).toBe(level);
    expect(world.xpToNext).toBe(Math.round(xpToNextLevel(level) * def.xpMultiplier));
    expect(world.xpToNext).toBeGreaterThan(xpToNextLevel(level));
    // A gem that would have been a level is not one any more.
    world.gems.push({ x: world.x, y: world.y, value: xpToNextLevel(level) });
    world.step(DT, STILL);
    expect(world.level).toBe(level);
    expect(world.offers).toBeNull();
    world.gems.push({ x: world.x, y: world.y, value: world.xpToNext - world.xp });
    world.step(DT, STILL);
    expect(world.level).toBe(level + 1);
    world.choose(world.offers![0]!);
    expect(world.xpToNext).toBe(Math.round(xpToNextLevel(level + 1) * def.xpMultiplier));
  });

  it('Precocity: every act after the Egg starts a level up, and the level is not the player’s to choose', () => {
    const seeds = seedsDealing('precocity', 6);
    const taken = new Set<string>();
    for (const seed of seeds) {
      const world = new World({ acts: FIXTURES, seed });
      const level = world.level;
      const before = owned(world);
      cross(world);
      expect(world.inheritance!.id).toBe('precocity');

      // Gives: a level, before the act's first step, at no XP.
      expect(world.level).toBe(level + 1);
      expect(totalLevels(owned(world))).toBe(totalLevels(before) + 1);
      expect(world.xp).toBe(0);

      // Costs: nobody was asked. No card was shown, and what rose is whatever
      // the pool dealt — an offerable item, never an evolution.
      expect(world.offers).toBeNull();
      const [id] = [...owned(world)].find(([k, n]) => n !== (before.get(k) ?? 0))!;
      const def = parseOfferId(id).item;
      expect(isActive(def) && def.evolvesFrom).toBeFalsy();
      taken.add(id);

      // And again at the next act.
      alive(world, 2);
      const again = totalLevels(owned(world));
      const levelAgain = world.level;
      cross(world);
      expect(world.level).toBe(levelAgain + 1);
      expect(totalLevels(owned(world))).toBe(again + 1);
    }
    // At random from the pool: six lives did not all get the same thing.
    expect(taken.size).toBeGreaterThan(1);
  });

  it('Sensitivity: gems come from further, and contact hurts more', () => {
    const def = INHERITANCES['sensitivity']!;
    // No weapon, so nothing shoots the rival before it touches.
    const [seed] = seedsDealing('sensitivity', 1, []);

    // The same life on the Conception side of the Egg: a gem just outside the
    // base reach stays put, and a rival's touch costs its contact damage.
    const unborn = new World({ acts: FIXTURES, seed, startingItems: [] });
    const far = (MAGNET_RADIUS + MAGNET_RADIUS * def.stats.pickupMultiplier) / 2;
    expect(far).toBeGreaterThan(MAGNET_RADIUS);
    unborn.gems.push({ x: unborn.x + far, y: unborn.y, value: 1 });
    for (let i = 0; i < 60; i++) unborn.step(DT, STILL);
    expect(unborn.gems[0]!.x).toBe(unborn.x + far);
    const lossBefore = touch(unborn);
    expect(lossBefore).toBeGreaterThan(0);

    const world = new World({ acts: FIXTURES, seed, startingItems: [] });
    cross(world);
    expect(world.inheritance).toBe(def);

    // Gives: the same gem at the same distance now comes and is collected.
    world.gems.push({ x: world.x + far, y: world.y, value: 1 });
    for (let i = 0; i < 120 && world.gems.length > 0; i++) world.step(DT, STILL);
    expect(world.gems).toEqual([]);
    expect(world.magnetRadius).toBeCloseTo(MAGNET_RADIUS * def.stats.pickupMultiplier, 6);

    // Costs: the same touch takes more.
    const lossAfter = touch(world);
    expect(lossAfter).toBeGreaterThan(lossBefore);
    expect(lossAfter).toBeCloseTo(lossBefore * def.stats.damageTakenMultiplier, 6);
  });
});

/** One rival on the player for one step; the health it cost. Leaves the field empty. */
function touch(world: World): number {
  world.enemies.length = 0;
  world.invulnerable = 0;
  world.hp = world.maxHp;
  world.spawnEnemy('rival-sperm');
  const rival = world.enemies[0]!;
  rival.x = world.x;
  rival.y = world.y;
  const hp = world.hp;
  world.step(DT, STILL);
  world.enemies.length = 0;
  world.invulnerable = 0;
  return hp - world.hp;
}
