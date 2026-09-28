import { readFileSync } from 'node:fs';
import { resolve } from 'node:path';
import { describe, expect, it } from 'vitest';
import { ANTIBODY_LEAD, ARENA_HEIGHT, ARENA_WIDTH, World, type EnemyState } from '../world';
import { ADOLESCENCE, type ActDef } from '../../data/acts';
import { ACT_VISUALS } from '../../data/act-visuals';
import { ENEMIES } from '../../data/enemies';

/**
 * Part five, 2026-09-28 (AUDIT.md): the third act. Every test below failed
 * against the tree the audit read; each names its entry. The patches are in
 * the entries, not here.
 */
describe('part five, fixed', () => {
  const DT = 1 / 60;
  const STILL = { moveX: 0, moveY: 0 };
  /** No schedule, so nothing is on the field but what the test places there. */
  const EMPTY: ActDef = {
    id: 'audit-fixture',
    name: 'Fixture',
    durationSeconds: 300,
    bossName: 'Fixture',
    boss: { kind: 'egg' },
    age: { from: 0, to: 0 },
    waves: [],
  };
  /** Adolescence with nothing spawning: Prom and what the test places. */
  const PROM_ONLY: ActDef = { ...ADOLESCENCE, waves: [] };

  /** Spawns through the sim's own constructor, then puts the enemy where the test needs it. */
  function place(w: World, id: string, x: number, y: number, vx = 0, vy = 0): EnemyState {
    w.spawnEnemy(id);
    const e = w.enemies[w.enemies.length - 1]!;
    e.x = x;
    e.y = y;
    e.vx = vx;
    e.vy = vy;
    return e;
  }

  it('31. acne lands on the floor, not past the wall the player is facing', () => {
    // `spawnAt: 'lead'` is ANTIBODY_LEAD along the facing, unclamped. Acne is
    // static and never culled, so one that lands outside is outside for good:
    // 107 of 988 in the bots' Adolescence (11%), 91 of them out of reach.
    const cases: Array<[number, number, number, number]> = [
      [ARENA_WIDTH - 10, 1100, 1, 0],
      [10, 1100, -1, 0],
      [1600, 10, 0, -1],
      [1600, ARENA_HEIGHT - 10, 0, 1],
      [ARENA_WIDTH - 100, ARENA_HEIGHT - 100, Math.SQRT1_2, Math.SQRT1_2],
    ];
    for (const [x, y, fx, fy] of cases) {
      const w = new World({ act: EMPTY, seed: 1, startingItems: [] });
      w.x = x;
      w.y = y;
      w.facingX = fx;
      w.facingY = fy;
      w.spawnEnemy('acne');
      const e = w.enemies[w.enemies.length - 1]!;
      const where = `player (${x}, ${y}) facing (${fx.toFixed(2)}, ${fy.toFixed(2)}): acne at (${e.x.toFixed(0)}, ${e.y.toFixed(0)})`;
      expect(e.x, where).toBeGreaterThanOrEqual(0);
      expect(e.x, where).toBeLessThanOrEqual(ARENA_WIDTH);
      expect(e.y, where).toBeGreaterThanOrEqual(0);
      expect(e.y, where).toBeLessThanOrEqual(ARENA_HEIGHT);
    }
    // In the open it is still exactly the lead ahead.
    const v = new World({ act: EMPTY, seed: 1, startingItems: [] });
    v.facingX = 1;
    v.facingY = 0;
    v.spawnEnemy('acne');
    const open = v.enemies[v.enemies.length - 1]!;
    expect([open.x, open.y]).toEqual([v.x + ANTIBODY_LEAD, v.y]);
  });

  it('32. the starting weapon reaches Prom with acne on the floor', () => {
    // ADOLESCENCE-ROSTER §4: the floor is inside Reflex's reach "so the
    // starting weapon works from its edge". `nearestEnemies` counted acne,
    // which cannot be hurt and is never culled, so one spot within 420px took
    // every Lash shot and Prom took nothing: 0 in 20s against 72 without it.
    const w = new World({ act: PROM_ONLY, seed: 3, startingItems: ['lash'] });
    w.time = PROM_ONLY.durationSeconds;
    w.step(DT, STILL);
    const b = w.boss!;
    expect(b.kind).toBe('prom');
    const px = b.x;
    const py = b.y + 250;
    // To one side, so no shot aimed at it crosses the ball on the way.
    place(w, 'acne', px + 120, py);
    const hp0 = b.hp;
    for (let i = 0; i < 10 * 60; i++) {
      w.x = px;
      w.y = py;
      w.step(DT, STILL);
      w.hp = w.maxHp;
    }
    expect(b.shielded).toBe(false);
    expect(hp0 - b.hp, 'damage to Prom in 10s, standing on its floor').toBeGreaterThan(0);
  });

  it('33. a knockback moves the crowd, not the room: roads, lines and piles stay put', () => {
    // AUDIT 28 took the room out of Chemotaxis's pull; Tantrum's push was the
    // other door. One burst moved a car's road 61px, a hall monitor's line
    // 69px and a homework pile 70px, each for the rest of the act.
    const w = new World({ act: EMPTY, seed: 1, startingItems: [] });
    const car = place(w, 'drivers-ed', w.x - 60, w.y + 100, ENEMIES['drivers-ed']!.speed, 0);
    const monitor = place(w, 'hall-monitor', w.x + 120, w.y - 20, 0, ENEMIES['hall-monitor']!.speed);
    // Clear of the others: a pile is solid, and would push the monitor itself.
    const pile = place(w, 'homework', w.x - 140, w.y - 80);
    const crowd = place(w, 'hormones', w.x, w.y + 100);
    for (const e of [car, monitor, pile, crowd]) e.hp = 1e9;
    const at = { carY: car.y, monitorX: monitor.x, pile: [pile.x, pile.y] };
    // Tantrum's burst: radius 210, knockback 70 (items.ts).
    w.areas.push({ x: w.x, y: w.y, age: 0, seconds: 0.12, radius: 210, damage: 1, pull: false, tick: false, serial: 1, knockback: 70 });
    w.step(DT, STILL);
    expect(car.y, "the car's road").toBe(at.carY);
    expect(monitor.x, "the monitor's line").toBe(at.monitorX);
    expect([pile.x, pile.y], 'the pile').toEqual(at.pile);
    // The crowd is still scattered.
    expect(Math.hypot(crowd.x - w.x, crowd.y - w.y)).toBeGreaterThan(150);
  });

  it("34. Prom is drawn on its hitbox: the visuals declare the ball the drawing has", () => {
    // boss-prom.svg hangs the ball on a chain: its centre is at 62.5% of the
    // frame and its radius 37%. Drawn centred at BOSS_RADIUS * 2, the ball sat
    // 36px below the sim's and 113px across a 150px hitbox, so shots stopped
    // and racers vanished in the air above and beside it. The renderer half of
    // the fix is in the entry; this pins the declaration it reads.
    const svg = readFileSync(resolve(process.cwd(), 'tools/art/svg/adolescence/boss-prom.svg'), 'utf8');
    const ball = /<circle cx="50" cy="([\d.]+)" r="([\d.]+)"/.exec(svg);
    expect(ball, 'the ball in boss-prom.svg').not.toBeNull();
    const cy = Number(ball![1]) / 100;
    const r = Number(ball![2]) / 100;
    const visuals = ACT_VISUALS.adolescence as unknown as { bossBody?: { cy: number; r: number } };
    expect(visuals.bossBody, 'ACT_VISUALS.adolescence.bossBody').toBeDefined();
    expect(visuals.bossBody!.cy).toBeCloseTo(cy, 2);
    expect(visuals.bossBody!.r).toBeCloseTo(r, 2);
  });

  it('35. a trail arrival inside the player\'s reach lands at its edge, seen, and still comes', () => {
    // 95% of hormone hits were the hormone's first step, drawn under the
    // player: a standing player was hit by something that had not arrived
    // yet. It lands at the edge of reach now and chases from there, so
    // standing still is still standing where it arrives — a step later.
    const w = new World({ act: EMPTY, seed: 5 });
    w.items.clear();
    for (let i = 0; i < 60 * 4; i++) w.step(DT, STILL); // the trail is where the player stands
    w.spawnEnemy('hormones');
    const h = w.enemies[w.enemies.length - 1]!;
    const d = Math.hypot(h.x - w.x, h.y - w.y);
    expect(d).toBeGreaterThanOrEqual(w.playerRadius + h.def.radius);
    expect(d).toBeLessThan(w.playerRadius + h.def.radius + 4);
    const hp = w.hp;
    w.step(DT, STILL);
    expect(w.hp).toBe(hp); // not hurt on the step it appeared
    for (let i = 0; i < 60; i++) w.step(DT, STILL);
    expect(w.hp).toBeLessThan(hp); // and hurt within the second, standing still
  });
});
