import { afterAll, beforeAll, describe, expect, it } from 'vitest';
import type { ActDef } from '../../data/acts';
import { ENEMIES, enemyDef, type EnemyDef } from '../../data/enemies';
import {
  SPAWN_RADIUS,
  World,
  type AreaState,
  type EnemyState,
  type HoldState,
  type Input,
  type ProjectileState,
} from '../world';

/**
 * The meeting's hold (OFFICE-ROSTER §3.4, G-048): a place, not a body. It
 * contracts from `from` to `to` over `seconds`, holds for `holdSeconds`, then
 * ends; inside it the player, the crowd and every shot move at `slow`; its
 * edge walls the crowd both ways and never the player; nothing can target it
 * or hurt it. The def here is a fixture under a test id carrying the roster's
 * placeholder numbers — every assertion reads them off the fixture, so the
 * rule is under test and not the figures.
 */

const MEETING: EnemyDef = {
  id: 'hold-fixture',
  name: 'Hold fixture',
  act: 'hold-fixture',
  frame: 'hold-fixture.png',
  hp: 1,
  speed: 0,
  contactDamage: 0,
  radius: 0,
  displaySize: 96,
  xp: 0,
  movement: 'static',
  contact: 'none',
  invulnerable: true,
  hold: { from: 260, to: 120, seconds: 30, holdSeconds: 12, slow: 0.6 },
  whyThisStage: 'A fixture: the meeting’s hold with nothing else attached.',
};
const H = MEETING.hold!;

// Registered for `spawnEnemy`, which looks defs up by id; this file's module
// graph only, and taken out again.
beforeAll(() => {
  ENEMIES[MEETING.id] = MEETING;
});
afterAll(() => {
  delete ENEMIES[MEETING.id];
});

/** No schedule, so nothing is on the field but what the test places there. */
const QUIET: ActDef = {
  id: 'hold-quiet',
  name: 'Fixture',
  durationSeconds: 600,
  bossName: 'Fixture',
  boss: { kind: 'egg' },
  age: { from: 0, to: 0 },
  waves: [],
};

/** A walker that never dies and touches nobody. */
const CHASER: EnemyDef = { ...enemyDef('rival-sperm'), id: 'hold-chaser', contact: 'none', hp: 1e6 };
/** A drifter placed with no heading: it moves only when something moves it. */
const DRIFTER: EnemyDef = { ...CHASER, id: 'hold-drifter', movement: 'drift' };
/** A crosser on its spawn heading, fast enough to cross a meeting in a few seconds. */
const CROSSER: EnemyDef = { ...enemyDef('white-cell'), id: 'hold-crosser', contact: 'none', hp: 1e6, speed: 200 };
/** A patrol line, the same. */
const PATROL: EnemyDef = { ...enemyDef('hall-monitor'), id: 'hold-patrol', contact: 'none', hp: 1e6, speed: 200 };

const DT = 1 / 60;
const still: Input = { moveX: 0, moveY: 0 };

function world(acts: ActDef[] = [QUIET], startingItems: string[] = []): World {
  return new World({ acts, seed: 1, startingItems });
}

/** A meeting placed by hand through `addEnemy`, as any placement reaches it. */
function meeting(w: World, x = w.x, y = w.y): HoldState {
  const add = (w as unknown as {
    addEnemy(def: EnemyDef, x: number, y: number, vx: number, vy: number): EnemyState | null;
  }).addEnemy.bind(w);
  expect(add(MEETING, x, y, 0, 0), 'a hold is not a body').toBeNull();
  return w.holds[w.holds.length - 1]!;
}

let uid = 400000;
/** An enemy of `def` at (x, y), built as `addEnemy` builds one. */
function place(w: World, def: EnemyDef, x: number, y: number, vx = 0, vy = 0): EnemyState {
  const e: EnemyState = {
    uid: uid++,
    hitBySerial: 0,
    hitByAreaSerial: 0,
    def,
    x,
    y,
    vx,
    vy,
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

/** Steps with the player kept alive, choosing the first offer when asked; `each` after every step. */
function run(w: World, seconds: number, input: Input = still, each?: () => void): void {
  const steps = Math.round(seconds * 60);
  for (let i = 0; i < steps; i++) {
    if (w.offers) {
      w.choose(w.offers[0]!);
      continue;
    }
    w.hp = w.maxHp;
    w.dead = false;
    w.step(DT, input);
    each?.();
  }
}

const dist = (a: { x: number; y: number }, b: { x: number; y: number }) => Math.hypot(a.x - b.x, a.y - b.y);

describe('a meeting is a hold, not a body', () => {
  it('spawned at the player, it contracts to `to` over `seconds` and ends `holdSeconds` later', () => {
    const w = world();
    const h = meeting(w);
    expect(w.enemies).toEqual([]);
    expect(w.holds).toEqual([h]);
    expect(h).toMatchObject({ x: w.x, y: w.y, radius: H.from, age: 0, slow: H.slow, source: MEETING.id });

    run(w, H.seconds / 2);
    expect(h.radius).toBeCloseTo((H.from + H.to) / 2, 3);
    run(w, H.seconds / 2);
    expect(h.radius).toBeCloseTo(H.to, 6);
    run(w, H.holdSeconds - 0.1);
    expect(w.holds).toEqual([h]);
    expect(h.radius).toBe(H.to);
    run(w, 0.2);
    expect(w.holds).toEqual([]);
  });

  it('whatever placed it, it becomes a hold: a wave spawn leaves no enemy on the field', () => {
    const w = world();
    w.spawnEnemy(MEETING.id);
    expect(w.enemies).toEqual([]);
    expect(w.holds).toHaveLength(1);
    // The fixture names no `spawnAt`, so the edge placed it.
    expect(dist(w.holds[0]!, w)).toBeCloseTo(SPAWN_RADIUS, 6);
  });
});

describe('its edge is a wall for the crowd, both ways', () => {
  it('an enemy outside walking in is held at the edge, and follows it in as it closes', () => {
    const w = world();
    const h = meeting(w);
    const c = place(w, CHASER, h.x + H.from + 40, h.y);
    let breached = 0;
    run(w, 10, still, () => {
      if (dist(c, h) <= h.radius) breached++;
    });
    expect(breached).toBe(0);
    // Pressed against it the whole time, not merely somewhere outside.
    expect(dist(c, h) - h.radius).toBeLessThan(1);
    expect(h.radius).toBeLessThan(H.from - 30);
  });

  it('an enemy inside walking out is held in, at `slow`, and carried inward as the room closes', () => {
    const w = world();
    // The player stands outside the meeting; the chaser inside walks at them.
    const h = meeting(w, w.x - 400, w.y);
    const c = place(w, CHASER, h.x, h.y);
    w.step(DT, still);
    expect(c.x - h.x).toBeCloseTo(CHASER.speed * H.slow * DT, 9);

    let escaped = 0;
    run(w, 20, still, () => {
      if (dist(c, h) > h.radius) escaped++;
    });
    expect(escaped).toBe(0);
    // At the edge nearest the player, and the edge has closed since it got there.
    expect(h.radius - dist(c, h)).toBeLessThan(1);
    expect(h.radius).toBeLessThan(H.from - 80);
  });

  it('holds against a shove and a pull, as against the walk', () => {
    const w = world();
    const h = meeting(w);
    // Inside, near the edge, shoved outward from the player at the centre.
    const inside = place(w, CHASER, h.x + h.radius - 10, h.y);
    (w as unknown as { knockBack(e: EnemyState, distance: number): void }).knockBack(inside, 100);
    expect(dist(inside, h)).toBeLessThanOrEqual(h.radius);
    expect(dist(inside, h)).toBeGreaterThan(h.radius - 1);

    // Outside and not walking (a drifter with no heading), pulled inward by
    // an attractor whose centre is inside: only the pull moves it.
    const outside = place(w, DRIFTER, h.x, h.y + h.radius + 2);
    const y0 = outside.y;
    const pull: AreaState = {
      x: h.x, y: h.y + h.radius - 20, age: 0, seconds: 5, radius: 120,
      damage: 0, pull: true, tick: true, serial: 0,
    };
    w.areas.push(pull);
    let breached = 0;
    run(w, 1, still, () => {
      if (dist(outside, h) <= h.radius) breached++;
    });
    expect(breached).toBe(0);
    expect(outside.y).toBeLessThan(y0);
  });

  it('a crosser and a patrol line pass straight through: a commute does not attend', () => {
    for (const def of [CROSSER, PATROL]) {
      const w = world();
      const h = meeting(w);
      const e = place(w, def, h.x - H.from - 50, h.y + 40, def.speed, 0);
      let wasIn = false;
      run(w, 8, still, () => {
        if (dist(e, h) < h.radius) wasIn = true;
      });
      expect(wasIn, def.id).toBe(true);
      expect(e.x - h.x, def.id).toBeGreaterThan(h.radius);
    }
  });
});

describe('inside it everything moves at `slow`', () => {
  it('the player inside moves at `slow`, is never walled, and walks out at full speed', () => {
    const w = world();
    const h = meeting(w);
    expect(w.speed).toBeCloseTo(w.baseSpeed * H.slow, 9);
    const x0 = w.x;
    w.step(DT, { moveX: 1, moveY: 0 });
    expect(w.x - x0).toBeCloseTo(w.baseSpeed * H.slow * DT, 9);

    run(w, 4, { moveX: 1, moveY: 0 });
    expect(w.x - h.x).toBeGreaterThan(h.radius);
    expect(w.speed).toBe(w.baseSpeed);
    const x1 = w.x;
    w.step(DT, { moveX: 1, moveY: 0 });
    expect(w.x - x1).toBeCloseTo(w.baseSpeed * DT, 9);
  });

  it('a shot inside moves at `slow`, hostile or not; one outside does not', () => {
    const w = world();
    const h = meeting(w);
    const shot = (x: number, y: number, hostile: boolean): ProjectileState => ({
      x, y, vx: 200, vy: 0, life: 5, damage: 0, pierce: 0, radius: 4, hostile, serial: 900000,
    });
    const mine = shot(h.x, h.y - 100, false);
    const theirs = shot(h.x, h.y + 100, true);
    const far = shot(h.x, h.y + H.from + 100, false);
    w.projectiles.push(mine, theirs, far);
    w.step(DT, still);
    expect(mine.x - h.x).toBeCloseTo(200 * H.slow * DT, 9);
    expect(theirs.x - h.x).toBeCloseTo(200 * H.slow * DT, 9);
    expect(far.x - h.x).toBeCloseTo(200 * DT, 9);
  });
});

describe('nothing reaches it, and the act takes it with it', () => {
  it('it is never a target and a burst over it hurts nothing', () => {
    const w = world([QUIET], ['acrosome']);
    const h = meeting(w);
    const nearest = (w as unknown as {
      nearestEnemies(within: number, n: number, out: EnemyState[]): EnemyState[];
    }).nearestEnemies(10_000, 8, []);
    expect(nearest).toEqual([]);

    // Temper is the only item: every area on the field is its burst, on the player, over the centre.
    let bursts = 0;
    run(w, 4, still, () => {
      if (w.areas.length > 0) bursts++;
    });
    expect(bursts).toBeGreaterThan(0);
    expect(w.holds).toEqual([h]);
    expect(h.radius).toBeCloseTo(H.from + ((H.to - H.from) * 4) / H.seconds, 3);
    expect(w.kills).toBe(0);
    expect(w.gems).toEqual([]);
  });

  it('`beginAct` clears it with the areas', () => {
    const NEXT: ActDef = { ...QUIET, id: 'hold-quiet-next' };
    const w = world([QUIET, NEXT]);
    meeting(w);
    w.actTime = w.act.durationSeconds;
    run(w, DT);
    expect(w.boss).not.toBeNull();
    // It keeps its time through the boss's arrival: the Reorg closes them in its fight.
    expect(w.holds).toHaveLength(1);
    const b = w.boss!;
    b.hp = 0;
    b.phase = 'absorbing';
    b.timer = 0;
    run(w, DT);
    expect(w.actIndex).toBe(1);
    expect(w.holds).toEqual([]);
  });
});
