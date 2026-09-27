import { describe, expect, it } from 'vitest';
import type { ActDef } from '../../data/acts';
import { World, type EnemyState } from '../world';

/**
 * AUDIT.md part three (2026-09-27): each defect reproduced as a failing test
 * before it was fixed, kept as its regression. Each asserts the correct behaviour.
 */

const DT = 1 / 60;
const STILL = { moveX: 0, moveY: 0 };

const EMPTY_ACT: ActDef = {
  id: 'audit-fixture',
  name: 'Fixture',
  durationSeconds: 300,
  bossName: 'Fixture',
  boss: { kind: 'egg' },
  age: { from: 0, to: 0 },
  waves: [],
};

function world(items: string[]): World {
  return new World({ act: EMPTY_ACT, seed: 7, startingItems: items });
}

function put(w: World, id: string, x: number, y: number, vx = 0, vy = 0): EnemyState {
  w.spawnEnemy(id);
  const e = w.enemies[w.enemies.length - 1]!;
  e.x = x;
  e.y = y;
  e.vx = vx;
  e.vy = vy;
  return e;
}

describe('audit candidates', () => {
  it('A: Restlessness shortens Grudge’s hit cadence like every other weapon’s cooldown', () => {
    const hitsOver = (items: [string, number][]): number => {
      const w = world([]);
      for (const [id, lv] of items) w.items.set(id, lv);
      // A huge, tough target sitting on the player: every orbiter touches it always.
      const e = put(w, 'rival-sperm', w.x, w.y);
      e.radius = 200;
      e.hp = 1e9;
      w.hp = 1e9;
      const before = e.hp;
      let perHit = 0;
      for (let i = 0; i < Math.round(3 / DT); i++) {
        const h = e.hp;
        w.step(DT, STILL);
        if (h - e.hp > 0 && perHit === 0) perHit = h - e.hp;
      }
      return Math.round((before - e.hp) / perHit);
    };
    const plain = hitsOver([['grudge', 1]]);
    const restless = hitsOver([['grudge', 1], ['midpiece', 5]]);
    expect(restless).toBeGreaterThan(plain);
  });

  it('B: a hall monitor walking across a player who is moving away does not stun-lock them', () => {
    const w = world([]);
    // Monitor crossing slowly along x straight through the player.
    put(w, 'hall-monitor', w.x - 40, w.y, 22, 0);
    const hp0 = w.hp;
    let hits = 0;
    let last = w.hp;
    for (let i = 0; i < Math.round(4 / DT); i++) {
      w.step(DT, { moveX: 0, moveY: 1 });
      if (w.hp < last) hits++;
      last = w.hp;
      if (w.dead) break;
    }
    // Walking perpendicular at 190px/s out of a 42px contact radius takes a
    // fraction of a second of free movement. Two hits is generous.
    expect(hits).toBeLessThanOrEqual(2);
    expect(hp0 - w.hp).toBeLessThan(40);
  });

  it('C: knockback never moves an enemy toward the player (the arena clamp pulls it in)', () => {
    const w = world(['tantrum']);
    w.x = 150;
    const e = put(w, 'clique', -20, w.y);
    e.hp = 1e9;
    const d0 = Math.hypot(e.x - w.x, e.y - w.y);
    w.step(DT, STILL);
    const d1 = Math.hypot(e.x - w.x, e.y - w.y);
    expect(d1).toBeGreaterThanOrEqual(d0);
  });

  it('D: orbiters are not reallocated every step (step must not allocate per frame)', () => {
    const w = world(['grudge']);
    w.step(DT, STILL);
    const first = w.orbiters[0];
    w.step(DT, STILL);
    expect(w.orbiters[0]).toBe(first);
  });

  it('E: a seeking weapon does not spend its shot on an antibody it cannot hurt', () => {
    const w = world(['lash']);
    put(w, 'antibody', w.x + 100, w.y);
    put(w, 'rival-sperm', w.x - 300, w.y);
    w.step(DT, STILL);
    const shots = w.projectiles.filter((p) => !p.hostile);
    expect(shots).toHaveLength(1);
    expect(shots[0]!.vx).toBeLessThan(0);
  });
});
