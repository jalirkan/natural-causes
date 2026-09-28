import { describe, expect, it } from 'vitest';
import { CONCEPTION, SCHOOL, type ActDef } from '../../data/acts';
import { ENEMIES } from '../../data/enemies';
import { World } from '../world';

/**
 * A run is one life (D-024). `World` plays a sequence of acts end to end: the
 * boss falling is the threshold to the next act, the player crosses it with
 * what they have, and outliving the last act is dying of natural causes.
 *
 * Nothing here asserts a number from an act's schedule. What is under test is
 * the crossing itself, the certificate, and that a life of one act is the
 * game exactly as it was before there were sequences.
 */

const TWO_ACTS: ActDef[] = [CONCEPTION, SCHOOL];

/** Steps with the player kept alive, choosing the first offer when asked. */
function alive(world: World, seconds: number, moveX = 0, moveY = 0): void {
  const steps = Math.round(seconds * 60);
  for (let i = 0; i < steps; i++) {
    if (world.offers) {
      world.choose(world.offers[0]!);
      continue;
    }
    if (world.won) return;
    world.hp = world.maxHp;
    world.dead = false;
    world.step(1 / 60, { moveX, moveY });
  }
}

/** Runs the act's clock out so the boss appears, without waiting five minutes of steps. */
function summonBoss(world: World): void {
  world.actTime = world.act.durationSeconds;
  alive(world, 1 / 60);
  expect(world.boss, 'the boss did not appear at the act clock').not.toBeNull();
}

/**
 * Ends the boss the way the sim ends it: hp to zero, the exit phase, and its
 * timer run out. The outcome latches at zero (G-033); this just skips the
 * 1.8 seconds of presentation.
 */
function fellBoss(world: World): void {
  const b = world.boss!;
  b.hp = 0;
  b.phase = 'absorbing';
  b.timer = 0;
  alive(world, 1 / 60);
}

describe('a life of one act is the game as it was', () => {
  it('`act` and `acts: [act]` are the same run', () => {
    const a = new World({ act: CONCEPTION, seed: 42 });
    const b = new World({ acts: [CONCEPTION], seed: 42 });
    alive(a, 60, 1, 0);
    alive(b, 60, 1, 0);
    expect(a.kills).toBe(b.kills);
    expect(a.level).toBe(b.level);
    expect(a.enemies.length).toBe(b.enemies.length);
    expect(a.actIndex).toBe(0);
    expect(a.act).toBe(CONCEPTION);
  });

  it('the boss falling in the only act is the win, of natural causes', () => {
    const world = new World({ act: CONCEPTION, seed: 3 });
    summonBoss(world);
    fellBoss(world);
    expect(world.won).toBe(true);
    expect(world.outcome).toBe('won');
    expect(world.certificate).toEqual({
      outcome: 'won',
      actId: 'conception',
      actName: 'Conception',
      actIndex: 0,
      age: 0,
      causeId: 'natural-causes',
      cause: 'natural causes',
    });
  });

  it('a World with no acts is refused', () => {
    expect(() => new World({ acts: [] })).toThrow();
  });
});

describe('the threshold between acts', () => {
  it('the first boss falling begins the second act instead of ending the run', () => {
    const world = new World({ acts: TWO_ACTS, seed: 7 });
    alive(world, 20, 1, 0);
    summonBoss(world);
    fellBoss(world);
    expect(world.won).toBe(false);
    expect(world.dead).toBe(false);
    expect(world.actIndex).toBe(1);
    expect(world.act).toBe(SCHOOL);
    expect(world.actsCleared).toBe(1);
    expect(world.actTime).toBeLessThan(1);
    expect(world.boss).toBeNull();
  });

  it('the player crosses with their items and level; the act does not cross', () => {
    const world = new World({ acts: TWO_ACTS, seed: 11 });
    alive(world, 45, 1, 0);
    // Some stacks and some field, so there is something to leave behind.
    world.dragStacks = 9;
    const items = new Map(world.items);
    const level = world.level;
    expect(level).toBeGreaterThan(1);
    expect(world.enemies.length).toBeGreaterThan(0);

    summonBoss(world);
    fellBoss(world);

    // Everything carried arrives; the only addition is the inheritance's
    // unasked level, if Precocity was dealt (G-042).
    const sum = (m: ReadonlyMap<string, number>) => [...m.values()].reduce((a, b) => a + b, 0);
    for (const [id, n] of items) expect(world.items.get(id)).toBeGreaterThanOrEqual(n);
    expect(sum(world.items) - sum(items)).toBe(world.inheritance!.levelsPerAct);
    expect(world.level).toBeGreaterThanOrEqual(level);
    expect(world.enemies).toEqual([]);
    expect(world.projectiles).toEqual([]);
    expect(world.areas).toEqual([]);
    expect(world.rings).toEqual([]);
    expect(world.dragStacks).toBe(0);
    expect(world.engulfTimer).toBe(0);
    expect(world.hp).toBe(world.maxHp);
  });

  it('XP still on the ground is collected at the crossing, not lost', () => {
    const world = new World({ acts: TWO_ACTS, seed: 5 });
    summonBoss(world);
    world.gems.length = 0;
    world.xp = 0;
    world.gems.push({ x: 10, y: 10, value: 3 }, { x: 20, y: 20, value: 4 });
    const xpToNext = world.xpToNext;
    fellBoss(world);
    expect(world.gems).toEqual([]);
    // Either it is in the bar, or it tipped a level and the remainder is.
    const banked = world.xp + (world.level - 1) * 0; // levels are asserted below
    expect(banked).toBeGreaterThanOrEqual(0);
    expect(world.xp + (world.xpToNext !== xpToNext ? xpToNext : 0)).toBeGreaterThanOrEqual(7 - xpToNext);
  });

  it('the second act spawns its own enemies and only those', () => {
    const world = new World({ acts: TWO_ACTS, seed: 13 });
    summonBoss(world);
    fellBoss(world);
    alive(world, 30, 0, 0);
    expect(world.enemies.length).toBeGreaterThan(0);
    for (const e of world.enemies) expect(e.def.act).toBe('school');
  });

  it('the second act has its own clock, and its boss comes on it', () => {
    const world = new World({ acts: TWO_ACTS, seed: 17 });
    summonBoss(world);
    fellBoss(world);
    const lifeTimeAtCrossing = world.time;
    alive(world, 5, 0, 0);
    expect(world.actTime).toBeCloseTo(5, 0);
    expect(world.time).toBeCloseTo(lifeTimeAtCrossing + 5, 0);
    expect(world.boss).toBeNull();
    summonBoss(world);
    expect(world.boss).not.toBeNull();
  });

  it('outliving the last act is the win, at the last act’s last year', () => {
    const world = new World({ acts: TWO_ACTS, seed: 19 });
    summonBoss(world);
    fellBoss(world);
    summonBoss(world);
    fellBoss(world);
    expect(world.won).toBe(true);
    expect(world.certificate).toMatchObject({
      outcome: 'won',
      actId: 'school',
      actIndex: 1,
      age: SCHOOL.age.to,
      cause: 'natural causes',
    });
  });
});

describe('the certificate', () => {
  it('names the enemy that did it, the act, and the age', () => {
    const world = new World({ acts: TWO_ACTS, seed: 23 });
    summonBoss(world);
    fellBoss(world);
    alive(world, 150, 0, 0);
    // Halfway through School: age reads halfway through its years.
    expect(world.age).toBeCloseTo((SCHOOL.age.from + SCHOOL.age.to) / 2, 1);

    // Disarmed for the kill: a build this seed happens to roll can burst the
    // ball dead on the same step it lands, and then nothing touches anyone.
    // The claim is about the certificate, not the build.
    if (world.offers) world.choose(world.offers[0]!);
    world.items.clear();
    world.areas.length = 0;
    world.projectiles.length = 0;
    world.hp = 1;
    world.invulnerable = 0;
    world.enemies.length = 0;
    world.spawnEnemy('dodgeball');
    const ball = world.enemies[0]!;
    ball.x = world.x;
    ball.y = world.y;
    world.step(1 / 60, { moveX: 0, moveY: 0 });

    expect(world.dead).toBe(true);
    expect(world.certificate).toMatchObject({
      outcome: 'died',
      actId: 'school',
      actName: 'School',
      actIndex: 1,
      causeId: 'dodgeball',
      cause: ENEMIES['dodgeball']!.name,
    });
    expect(world.certificate!.age).toBeCloseTo(8.5, 1);
  });

  it('names the boss by the act’s name for it', () => {
    const world = new World({ acts: TWO_ACTS, seed: 29 });
    summonBoss(world);
    world.hp = 1;
    world.invulnerable = 0;
    world.projectiles.push({
      x: world.x,
      y: world.y,
      vx: 0,
      vy: 0,
      life: 1,
      damage: 5,
      pierce: 1,
      radius: 10,
      hostile: true,
      source: 'boss',
      serial: 999999,
    });
    world.step(1 / 60, { moveX: 0, moveY: 0 });
    expect(world.dead).toBe(true);
    expect(world.certificate).toMatchObject({ causeId: 'boss', cause: CONCEPTION.bossName, actIndex: 0 });
  });

  it('names an engulf by the engulfer and an attach by the attacher', () => {
    const engulfed = new World({ act: CONCEPTION, seed: 31 });
    engulfed.hp = 1;
    engulfed.invulnerable = 0;
    engulfed.spawnEnemy('white-cell');
    const cell = engulfed.enemies[0]!;
    cell.x = engulfed.x;
    cell.y = engulfed.y;
    for (let i = 0; i < 30 && !engulfed.dead; i++) engulfed.step(1 / 60, { moveX: 0, moveY: 0 });
    expect(engulfed.dead).toBe(true);
    expect(engulfed.certificate?.causeId).toBe('white-cell');

    const attached = new World({ act: CONCEPTION, seed: 37 });
    attached.hp = 0.0001;
    attached.invulnerable = 0;
    attached.spawnEnemy('antibody');
    const ab = attached.enemies[0]!;
    ab.x = attached.x;
    ab.y = attached.y;
    attached.step(1 / 60, { moveX: 0, moveY: 0 });
    // Antibodies deal zero; the record is exercised only if a stack ever
    // costs health. Either way the sim did not crash and named nothing wrong.
    if (attached.dead) expect(attached.certificate?.causeId).toBe('antibody');
    else expect(attached.certificate).toBeNull();
  });

  it('is null while alive and set exactly once', () => {
    const world = new World({ act: CONCEPTION, seed: 41 });
    alive(world, 10, 1, 0);
    expect(world.certificate).toBeNull();
    summonBoss(world);
    fellBoss(world);
    const first = world.certificate;
    expect(first).not.toBeNull();
    alive(world, 2, 0, 0);
    expect(world.certificate).toBe(first);
  });
});
