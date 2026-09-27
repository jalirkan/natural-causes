import { describe, expect, it } from 'vitest';
import type { ActDef } from '../../data/acts';
import { CONCEPTION } from '../../data/acts';
import { ENEMIES } from '../../data/enemies';
import {
  SPAWN_RADIUS,
  TRAIL_DELAY,
  TRAIL_JITTER,
  TRAIL_SAMPLE,
  World,
  type EnemyState,
} from '../world';

/**
 * The three School behaviours D-021 left unbuilt and D-022 owed as labelled
 * placeholders: the substitute's attack (`shoots`), homework's arrival point
 * (`spawnAt: 'trail'`) and the hall monitor's stop (`stopsPlayer`). What is
 * under test is that each happens, not its numbers — every one is a
 * placeholder named in School's `provisional`.
 */

const DT = 1 / 60;
const STILL = { moveX: 0, moveY: 0 };

const EMPTY_ACT: ActDef = {
  id: 'school-behaviours-fixture',
  name: 'Fixture',
  durationSeconds: 300,
  bossName: 'Fixture',
  age: { from: 0, to: 0 },
  waves: [],
};

/** No weapons, so nothing placed here is killed by the player. */
function emptyWorld(): World {
  return new World({ act: EMPTY_ACT, seed: 7, startingItems: [] });
}

/** Spawns `id` through the sim, then pins it at `x, y`, standing still. */
function put(w: World, id: string, x: number, y: number, vx = 0, vy = 0): EnemyState {
  w.spawnEnemy(id);
  const e = w.enemies[w.enemies.length - 1]!;
  e.x = x;
  e.y = y;
  e.vx = vx;
  e.vy = vy;
  return e;
}

function run(w: World, seconds: number, input = STILL): void {
  for (let i = 0; i < Math.round(seconds / DT); i++) {
    if (w.dead) return;
    w.step(DT, input);
  }
}

describe('substitute teacher — shoots', () => {
  const shoots = ENEMIES['substitute-teacher']!.shoots!;

  it('in range, fires one hostile shot aimed at the player', () => {
    const w = emptyWorld();
    put(w, 'substitute-teacher', w.x + shoots.range - 100, w.y);
    run(w, shoots.cooldown + 0.1);
    const shots = w.projectiles.filter((p) => p.hostile);
    expect(shots).toHaveLength(1);
    expect(shots[0]!.cause?.id).toBe('substitute-teacher');
    // Aimed: heading straight back along the line to the player.
    expect(shots[0]!.vx).toBeLessThan(0);
    expect(Math.abs(shots[0]!.vy)).toBeLessThan(1e-9);
  });

  it('out of range, fires nothing', () => {
    const w = emptyWorld();
    put(w, 'substitute-teacher', w.x + shoots.range + 100, w.y);
    run(w, shoots.cooldown * 2);
    expect(w.projectiles.filter((p) => p.hostile)).toHaveLength(0);
  });

  it('a death to its shot is the substitute teacher’s on the certificate', () => {
    const w = emptyWorld();
    put(w, 'substitute-teacher', w.x + 200, w.y);
    w.hp = 1;
    run(w, shoots.cooldown + 3);
    expect(w.dead).toBe(true);
    expect(w.certificate?.causeId).toBe('substitute-teacher');
    expect(w.certificate?.cause).toBe('Substitute teacher');
  });

  it('does not hit a racing rival, or anything else in the crowd — only boss shots thin a race', () => {
    const w = new World({ act: CONCEPTION, seed: 7, startingItems: [] });
    w.time = CONCEPTION.durationSeconds;
    w.step(DT, STILL);
    expect(w.boss).not.toBeNull();
    w.enemies.length = 0;
    w.projectiles.length = 0;
    w.boss!.timer = 999;
    w.x = w.boss!.x + 600;
    w.y = w.boss!.y;

    const rival = put(w, 'rival-sperm', w.boss!.x - 400, w.boss!.y);
    const sub = ENEMIES['substitute-teacher']!;
    w.projectiles.push({
      x: rival.x,
      y: rival.y,
      vx: 0,
      vy: 0,
      life: 4,
      damage: 12,
      pierce: 1,
      radius: 10,
      hostile: true,
      source: sub.id,
      cause: sub,
      serial: 999_997,
    });
    const hp = rival.hp;
    w.step(DT, STILL);
    expect(rival.hp).toBe(hp);
    expect(w.enemies).toContain(rival);
    expect(w.projectiles.filter((p) => p.hostile)).toHaveLength(1);
  });
});

describe('homework — arrives on the trail', () => {
  it('with no history yet, enters from the edge', () => {
    const w = emptyWorld();
    w.spawnEnemy('homework');
    const pile = w.enemies[0]!;
    expect(Math.hypot(pile.x - w.x, pile.y - w.y)).toBeCloseTo(SPAWN_RADIUS, 3);
  });

  it('once there is history, lands near where the player was about TRAIL_DELAY ago', () => {
    const w = emptyWorld();
    const seen: { t: number; x: number; y: number }[] = [];
    const record = (seconds: number, input: typeof STILL): void => {
      for (let i = 0; i < Math.round(seconds / DT); i++) {
        w.step(DT, input);
        seen.push({ t: w.time, x: w.x, y: w.y });
      }
    };
    record(2, { moveX: -1, moveY: 0 });
    record(3, { moveX: 1, moveY: 0.3 });
    record(5, { moveX: 0, moveY: -1 });

    w.spawnEnemy('homework');
    const pile = w.enemies[0]!;
    // Within the jitter of some position the player held between TRAIL_DELAY
    // and TRAIL_DELAY + one sample ago.
    const window = seen.filter(
      (s) => s.t >= w.time - TRAIL_DELAY - TRAIL_SAMPLE - DT && s.t <= w.time - TRAIL_DELAY + DT,
    );
    expect(window.length).toBeGreaterThan(0);
    const nearest = Math.min(...window.map((s) => Math.hypot(pile.x - s.x, pile.y - s.y)));
    expect(nearest).toBeLessThanOrEqual(TRAIL_JITTER + 1e-6);
    // And not at the edge, and not on the player.
    const fromPlayer = Math.hypot(pile.x - w.x, pile.y - w.y);
    expect(Math.abs(fromPlayer - SPAWN_RADIUS)).toBeGreaterThan(TRAIL_JITTER);
    expect(fromPlayer).toBeGreaterThan(TRAIL_JITTER * 3);
  });

  it('the trail ring does not grow', () => {
    const w = emptyWorld();
    const capacity = w.trailCapacity;
    expect(capacity).toBe(Math.round(TRAIL_DELAY / TRAIL_SAMPLE) + 1);
    run(w, 120, { moveX: 1, moveY: 1 });
    expect(w.trailCapacity).toBe(capacity);
  });
});

describe('hall monitor — touching it stops the player dead (§3.4)', () => {
  it('stops the player for stopsPlayer seconds, then lets them go', () => {
    const stop = ENEMIES['hall-monitor']!.stopsPlayer!;
    const w = emptyWorld();
    const e = put(w, 'hall-monitor', w.x, w.y);
    w.step(DT, STILL);
    expect(w.stopTimer).toBeGreaterThan(0);
    expect(w.speed).toBe(0);
    // Out of its way, then try to walk.
    e.x = -5000;
    const x0 = w.x;
    run(w, stop - 4 * DT, { moveX: 1, moveY: 0 });
    expect(w.x).toBe(x0);
    run(w, 6 * DT, { moveX: 1, moveY: 0 });
    expect(w.x).toBeGreaterThan(x0);
  });

  it('never pauses on its own line', () => {
    const w = emptyWorld();
    w.x = 2000;
    const e = put(w, 'hall-monitor', 10, 900, -22, 0);
    for (let i = 0; i < Math.round(4 / DT); i++) {
      const before = e.x;
      w.step(DT, STILL);
      expect(e.x).not.toBe(before);
    }
  });
});
