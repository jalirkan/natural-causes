import { describe, expect, it } from 'vitest';
import { ARENA_HEIGHT, ARENA_WIDTH, BOSS_RADIUS, World } from '../world';
import { CONCEPTION } from '../../data/acts';
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
    // White cells drop 12 XP and the first two levels cost 5 and 14, so a pair
    // of them collected together is an ordinary event, not a contrived one.
    w.gems.push({ x: w.x, y: w.y, value: 12 });
    w.gems.push({ x: w.x, y: w.y, value: 12 });
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
