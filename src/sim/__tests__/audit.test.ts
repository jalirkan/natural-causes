import { describe, expect, it } from 'vitest';
import { ARENA_HEIGHT, ARENA_WIDTH, BOSS_RADIUS, World, xpToNextLevel } from '../world';
import { CONCEPTION, type ActDef } from '../../data/acts';
import { ITEMS } from '../../data/items';

/**
 * Regressions from the 2026-08-01 audit. Each of these was reachable in normal
 * play and each was found by reading rather than by a crash, which is why they
 * get tests: none of them threw, and three of them looked like the game working.
 */

describe('a level-up always has something to choose, or does not block', () => {
  it('a level reached with every item maxed does not freeze the world', () => {
    const w = new World({ act: CONCEPTION, seed: 1 });
    for (const id of Object.keys(ITEMS)) w.items.set(id, ITEMS[id]!.maxLevel);
    w.gems.push({ x: w.x, y: w.y, value: 999 });
    w.step(1 / 60, { moveX: 0, moveY: 0 });

    // `rollOffers` returns [] when the pool is empty, and [] is truthy, so
    // assigning it to `offers` stopped `step()` forever behind a panel that
    // listed nothing and accepted no key.
    expect(w.offers).toBeNull();
    const at = w.time;
    for (let i = 0; i < 120; i++) w.step(1 / 60, { moveX: 1, moveY: 0 });
    expect(w.time).toBeGreaterThan(at);
  });

  it('two levels in one frame present two choices, not one', () => {
    const w = new World({ act: CONCEPTION, seed: 2 });
    // White cells drop 12 XP and the first two levels cost less than that
    // together, so two gems collected in one frame crossing two levels is an
    // ordinary event, not a contrived one. Sized off the curve so the test
    // survives the curve (a placeholder) moving.
    w.gems.push({ x: w.x, y: w.y, value: xpToNextLevel(1) });
    w.gems.push({ x: w.x, y: w.y, value: xpToNextLevel(2) });
    w.step(1 / 60, { moveX: 0, moveY: 0 });
    expect(w.level).toBe(3);

    const owned = () => [...w.items.values()].reduce((a, b) => a + b, 0);
    const start = owned();
    expect(w.offers).not.toBeNull();
    w.choose(w.offers![0]!);
    // The second level's choice must still be waiting.
    expect(w.offers).not.toBeNull();
    w.choose(w.offers![0]!);
    expect(w.offers).toBeNull();
    expect(owned() - start).toBe(2);
  });
});

describe('the Egg is placed where it can be seen', () => {
  it('stays inside the arena wherever the player is standing', () => {
    for (const [px, py] of [
      [1600, 60],
      [1600, 2150],
      [20, 400],
      [3180, 1900],
    ]) {
      const w = new World({ act: CONCEPTION, seed: 3 });
      w.x = px!;
      w.y = py!;
      w.time = CONCEPTION.durationSeconds;
      w.step(1 / 60, { moveX: 0, moveY: 0 });
      const b = w.boss!;
      // Unclamped this put the Egg at y=-360 for a player near the top. The
      // camera is bounded by the arena and cannot scroll there, and the player
      // cannot walk above y=0 to bring it into view.
      expect(b.x - BOSS_RADIUS).toBeGreaterThanOrEqual(0);
      expect(b.y - BOSS_RADIUS).toBeGreaterThanOrEqual(0);
      expect(b.x + BOSS_RADIUS).toBeLessThanOrEqual(ARENA_WIDTH);
      expect(b.y + BOSS_RADIUS).toBeLessThanOrEqual(ARENA_HEIGHT);
    }
  });
});

describe('the arena has walls, and the simulation owns them', () => {
  it('starts the player in the middle of the field, not in a corner', () => {
    const w = new World({ act: CONCEPTION, seed: 1 });
    // These defaulted to (0, 0) and only ActScene moved the player. Harmless
    // while the sim had no walls; a corner start once it did.
    expect(w.x).toBe(ARENA_WIDTH / 2);
    expect(w.y).toBe(ARENA_HEIGHT / 2);
  });

  it('holds the player inside the field, so bots and players play one game', () => {
    const w = new World({ act: CONCEPTION, seed: 2 });
    for (let i = 0; i < 60 * 60; i++) {
      if (w.dead) break;
      w.hp = w.maxHp;
      if (w.offers) { w.choose(w.offers[0]!); continue; }
      w.step(1 / 60, { moveX: 1, moveY: 1 });
      expect(w.x).toBeLessThanOrEqual(ARENA_WIDTH);
      expect(w.y).toBeLessThanOrEqual(ARENA_HEIGHT);
    }
    // A minute of holding one heading must actually reach the corner, or the
    // clamp is not being exercised by this test.
    expect(w.x).toBe(ARENA_WIDTH);
    expect(w.y).toBe(ARENA_HEIGHT);
  });
});

describe('G-033 — the outcome latches when the Egg reaches zero', () => {
  it('dying during the absorb does not turn a win into a loss', () => {
    const w = new World({ act: CONCEPTION, seed: 4 });
    w.time = CONCEPTION.durationSeconds;
    w.step(1 / 60, { moveX: 0, moveY: 0 });
    w.boss!.hp = 0;
    w.boss!.phase = 'absorbing';
    w.boss!.timer = 1.8;
    w.hp = 1;
    // A rival standing on the player through the whole absorb.
    w.spawnEnemy('rival-sperm');
    const e = w.enemies[w.enemies.length - 1]!;
    for (let i = 0; i < 130; i++) {
      e.x = w.x;
      e.y = w.y;
      w.step(1 / 60, { moveX: 0, moveY: 0 });
    }
    expect(w.outcome).toBe('won');
    expect(w.won).toBe(true);
    expect(w.dead).toBe(false);
    expect(w.hp).toBeGreaterThan(0);
  });
});

describe('a boss shot is evaluated on every frame', () => {
  it('is consumed even on a frame the player is touching an enemy', () => {
    const w = new World({ act: CONCEPTION, seed: 5 });
    w.spawnEnemy('rival-sperm');
    const e = w.enemies[0]!;
    e.x = w.x + 2;
    e.y = w.y;
    w.projectiles.push({
      x: w.x,
      y: w.y,
      vx: 0,
      vy: 0,
      life: 5,
      damage: 12,
      pierce: 1,
      radius: 10,
      hostile: true,
      serial: 9999,
    });
    w.step(1 / 60, { moveX: 0, moveY: 0 });
    // Contact used to `return` before the hostile-projectile pass, so the shot
    // survived the frame and stayed live to be re-checked later.
    expect(w.projectiles.some((p) => p.hostile)).toBe(false);
  });
});

/**
 * Part three, 2026-09-27 (AUDIT.md). Both were found by reading the LIFE for
 * the same class of defect, and both were reproduced before being written down.
 */
describe('part three', () => {
  /** No schedule, so nothing is on the field but what the test places there. */
  const EMPTY: ActDef = {
    id: 'audit-fixture',
    name: 'Fixture',
    durationSeconds: 300,
    bossName: 'Fixture',
    age: { from: 0, to: 0 },
    waves: [],
  };

  it('16. a weapon fires the same number of times a minute at 30, 60 and 144Hz', () => {
    // The cooldown was reset to its full value on the frame it expired, so the
    // overshoot was dropped and the rate was quantised to the frame: Wake fired
    // 300 times a minute at 30Hz, 328 at 60Hz, 333 at 144Hz. The bots run at
    // 60 and a browser runs at the display rate, so the two played different
    // games — the divergence world.ts exists to prevent.
    const fires = (item: string, hz: number): number => {
      const w = new World({ act: EMPTY, seed: 1, startingItems: [item] });
      // A target always in range that never dies, for the seeking weapon.
      w.spawnEnemy('white-cell');
      const e = w.enemies[0]!;
      let seen = 0;
      let count = 0;
      for (let i = 0; i < 60 * hz; i++) {
        e.x = w.x + 120; e.y = w.y; e.hp = 1e9; e.age = 0;
        w.step(1 / hz, { moveX: 0, moveY: 0 });
        // Serials are monotonic and at most one new one appears per step.
        for (const p of item === 'wake' ? w.areas : w.projectiles) {
          if (p.serial > seen) { seen = p.serial; count++; }
        }
      }
      return count;
    };
    for (const item of ['lash', 'wake']) {
      const [a, b, c] = [30, 60, 144].map((hz) => fires(item, hz)) as [number, number, number];
      expect(Math.abs(a - b), `${item}: ${a} at 30Hz vs ${b} at 60Hz`).toBeLessThanOrEqual(1);
      expect(Math.abs(b - c), `${item}: ${b} at 60Hz vs ${c} at 144Hz`).toBeLessThanOrEqual(1);
    }
  });

  it('17. a one-shot burst hits an enemy once, even when a shot lands on it mid-burst', () => {
    // `hitBySerial` was one field shared by shots and one-shot areas. A Lash
    // shot landing during Acrosome's 0.12s burst overwrote the burst's serial
    // and the burst hit again on its next frame: 5 damage became 12 in the
    // controlled case, and a Lash+Acrosome minute against one enemy applied 43
    // bursts 52 times.
    const w = new World({ act: EMPTY, seed: 1, startingItems: [] });
    w.spawnEnemy('white-cell');
    const e = w.enemies[0]!;
    e.x = w.x + 30; e.y = w.y; e.vx = 0; e.vy = 0;
    const hp0 = e.hp;
    w.areas.push({ x: w.x, y: w.y, age: 0, seconds: 0.12, radius: 96, damage: 5, pull: false, tick: false, serial: 100 });
    w.step(1 / 60, { moveX: 0, moveY: 0 });
    expect(hp0 - e.hp).toBe(5);
    w.projectiles.push({ x: e.x, y: e.y, vx: 0, vy: 0, life: 5, damage: 2, pierce: 1, radius: 7, hostile: false, serial: 101 });
    for (let i = 0; i < 6; i++) w.step(1 / 60, { moveX: 0, moveY: 0 });
    expect(hp0 - e.hp).toBe(7);

    // And the other way round: a piercing shot parked on the enemy must not
    // re-hit because a burst landed between its frames.
    const v = new World({ act: EMPTY, seed: 1, startingItems: [] });
    v.spawnEnemy('white-cell');
    const f = v.enemies[0]!;
    f.x = v.x + 30; f.y = v.y; f.vx = 0; f.vy = 0;
    const fhp0 = f.hp;
    v.projectiles.push({ x: f.x, y: f.y, vx: 0, vy: 0, life: 5, damage: 4, pierce: 99, radius: 10, hostile: false, serial: 200 });
    v.step(1 / 60, { moveX: 0, moveY: 0 });
    v.areas.push({ x: v.x, y: v.y, age: 0, seconds: 0.12, radius: 96, damage: 5, pull: false, tick: false, serial: 201 });
    for (let i = 0; i < 6; i++) v.step(1 / 60, { moveX: 0, moveY: 0 });
    expect(fhp0 - f.hp).toBe(9);
  });
});
