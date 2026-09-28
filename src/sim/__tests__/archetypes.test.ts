import { describe, expect, it } from 'vitest';
import type { ActDef } from '../../data/acts';
import { enemyDef, type EnemyDef } from '../../data/enemies';
import { ITEMS, cooldownScale, damageScale, isActive, levelBonus, type ActiveItem } from '../../data/items';
import { BOSS_RADIUS, STRIKE_DELAY, SWEEP_SECONDS, World, type EnemyState } from '../world';

/**
 * G-044: the three classic archetypes. Personal Space is an aura (always on,
 * each enemy once per cooldown), Backhand a sweep (an arc along the facing on
 * its cooldown), Judgement a strike (a random target in range, a telegraph,
 * then a one-shot area where the target was).
 */

/** No schedule, so nothing is on the field but what the test places there. */
const QUIET: ActDef = {
  id: 'archetypes-fixture',
  name: 'Fixture',
  durationSeconds: 300,
  bossName: 'Fixture',
  boss: { kind: 'egg' },
  age: { from: 0, to: 0 },
  waves: [],
};

/** A target that stands still and does not die of one hit. */
const DUMMY: EnemyDef = {
  ...enemyDef('rival-sperm'),
  movement: 'static',
  speed: 0,
  hp: 1000,
};

let uid = 200000;
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

function weapon(id: string): ActiveItem {
  const def = ITEMS[id];
  if (!def || !isActive(def)) throw new Error(`"${id}" is not an active item`);
  return def;
}

function world(items: Record<string, number>, seed = 1): World {
  const w = new World({ act: QUIET, seed, startingItems: [] });
  for (const [id, level] of Object.entries(items)) w.items.set(id, level);
  return w;
}

/** What one hit is worth, from the same formula the sim pays (no Late Bloomer held). */
function hit(id: string, level: number): number {
  const def = weapon(id);
  return def.damage * damageScale(level) * levelBonus(def, level).damage;
}

/** The re-hit, from the same formula (no Restlessness unless the world holds it). */
function cooldown(w: World, id: string, level: number): number {
  const def = weapon(id);
  return def.cooldown * cooldownScale(level) * levelBonus(def, level).cooldown * w.cooldownFactor;
}

/** Steps until the boss stands, then returns it. */
function withBoss(w: World) {
  w.time = QUIET.durationSeconds;
  w.step(DT, still);
  expect(w.boss).not.toBeNull();
  return w.boss!;
}

const DT = 1 / 60;
const still = { moveX: 0, moveY: 0 };

describe('Personal Space: an aura', () => {
  it('hurts what stands in its ring and nothing outside it', () => {
    const w = world({ 'personal-space': 1 });
    const near = place(w, 60, 0);
    const far = place(w, 200, 0);
    for (let i = 0; i < 5; i++) w.step(DT, still);
    expect(near.hp).toBeLessThan(DUMMY.hp);
    expect(far.hp).toBe(DUMMY.hp);
  });

  it('never activates: it has no cooldown clock of its own and no area', () => {
    const w = world({ 'personal-space': 1 });
    place(w, 60, 0);
    for (let i = 0; i < 30; i++) w.step(DT, still);
    expect(w.areas).toHaveLength(0);
    expect(w.projectiles).toHaveLength(0);
    expect(w.auras).toHaveLength(1);
  });

  it('hits one enemy at most once per cooldown', () => {
    const w = world({ 'personal-space': 1 });
    const e = place(w, 60, 0);
    const c = cooldown(w, 'personal-space', 1);
    const times: number[] = [];
    let hp = e.hp;
    for (let i = 0; i < 6 * 60; i++) {
      w.step(DT, still);
      if (e.hp < hp) {
        times.push(w.time);
        expect(hp - e.hp).toBeCloseTo(hit('personal-space', 1), 9);
        hp = e.hp;
      }
    }
    // Due on the first step, then every cooldown after it.
    expect(times.length).toBe(Math.floor((6 - DT) / c) + 1);
    // The overshoot carries (AUDIT 23), so a gap can be up to one step short
    // of the cooldown, and never more than that.
    for (let k = 1; k < times.length; k++) expect(times[k]! - times[k - 1]!).toBeGreaterThan(c - DT - 1e-9);
  });

  it('hurts at the same rate at 30, 60 and 144Hz, a cooldown that is not a whole number of frames', () => {
    // Restlessness makes the re-hit 0.558s: 33.48 frames at 60Hz. Reset to
    // the step it came due, the rate would be quantised to the frame.
    const hits = (hz: number): number => {
      const w = world({ 'personal-space': 1, midpiece: 1 });
      const e = place(w, 60, 0);
      for (let i = 0; i < 60 * hz; i++) w.step(1 / hz, still);
      return Math.round((DUMMY.hp - e.hp) / hit('personal-space', 1));
    };
    const w = world({ 'personal-space': 1, midpiece: 1 });
    const expected = 60 / cooldown(w, 'personal-space', 1);
    for (const hz of [30, 60, 144]) {
      expect(Math.abs(hits(hz) - expected), `${hz}Hz`).toBeLessThanOrEqual(1);
    }
  });

  it('reports the ring it hurts in: radius, level bonus and reach', () => {
    const w = world({ 'personal-space': 8, 'growth-spurt': 2 });
    w.step(DT, still);
    const def = weapon('personal-space');
    const radius = def.radius * levelBonus(def, 8).area * w.reach;
    expect(w.reach).toBeGreaterThan(1);
    expect(w.auras).toHaveLength(1);
    expect(w.auras[0]!.radius).toBeCloseTo(radius, 9);
    expect(w.auras[0]!.source).toBe('personal-space');
    // A body just reaching into it is hurt; one just short of it is not.
    const inside = place(w, radius + DUMMY.radius - 1, 0);
    const outside = place(w, -(radius + DUMMY.radius + 1), 0);
    for (let i = 0; i < 3; i++) w.step(DT, still);
    expect(inside.hp).toBeLessThan(DUMMY.hp);
    expect(outside.hp).toBe(DUMMY.hp);
  });

  it('hurts the boss once per cooldown while it stands in the ring', () => {
    const w = world({ 'personal-space': 1 });
    const b = withBoss(w);
    w.x = b.x;
    w.y = b.y + BOSS_RADIUS + 60;
    const before = b.hp;
    for (let i = 0; i < 30; i++) w.step(DT, still);
    expect(before - b.hp).toBeCloseTo(hit('personal-space', 1), 9);
  });
});

describe('Backhand: a sweep', () => {
  it('swings along the facing: in front is hit, behind is not', () => {
    const w = world({ backhand: 1 });
    const front = place(w, 80, 0);
    const back = place(w, -80, 0);
    w.step(DT, still);
    expect(DUMMY.hp - front.hp).toBeCloseTo(hit('backhand', 1), 9);
    expect(back.hp).toBe(DUMMY.hp);
  });

  it('turns with the player', () => {
    const w = world({ backhand: 1 });
    const right = place(w, 80, 0);
    const up = place(w, 0, -80);
    w.facingX = 0;
    w.facingY = -1;
    w.step(DT, still);
    expect(up.hp).toBeLessThan(DUMMY.hp);
    expect(right.hp).toBe(DUMMY.hp);
  });

  it('at level three a second arc goes straight behind', () => {
    const w = world({ backhand: 3 });
    const front = place(w, 80, 0);
    const back = place(w, -80, 0);
    const side = place(w, 0, 80);
    w.step(DT, still);
    expect(front.hp).toBeLessThan(DUMMY.hp);
    expect(back.hp).toBeLessThan(DUMMY.hp);
    expect(side.hp).toBe(DUMMY.hp);
  });

  it('at level seven the third arc is the left side, and the right is still open', () => {
    const w = world({ backhand: 7 });
    const left = place(w, 0, -80);
    const right = place(w, 0, 80);
    w.step(DT, still);
    expect(left.hp).toBeLessThan(DUMMY.hp);
    expect(right.hp).toBe(DUMMY.hp);
  });

  it('an enemy where two arcs overlap is hit once', () => {
    // Front covers -50..50 degrees, left -140..-40: both hold -45.
    const w = world({ backhand: 7 });
    const a = (-45 * Math.PI) / 180;
    const e = place(w, Math.cos(a) * 80, Math.sin(a) * 80);
    w.step(DT, still);
    expect(DUMMY.hp - e.hp).toBeCloseTo(hit('backhand', 7), 9);
  });

  it('knocks what it hits straight away from the player', () => {
    const w = world({ backhand: 1 });
    const e = place(w, 80, 0);
    w.step(DT, still);
    expect(Math.hypot(e.x - w.x, e.y - w.y)).toBeCloseTo(80 + weapon('backhand').knockback!, 6);
    expect(e.y).toBeCloseTo(w.y, 6);
  });

  it('swings on its cooldown with nothing there, drawn along the facing and gone after SWEEP_SECONDS', () => {
    const w = world({ backhand: 1 });
    w.facingX = 0;
    w.facingY = 1;
    w.step(DT, still);
    expect(w.sweeps).toHaveLength(1);
    const s = w.sweeps[0]!;
    expect(s.angle).toBeCloseTo(Math.PI / 2, 9);
    expect(s.reach).toBeCloseTo(weapon('backhand').range * w.reach, 9);
    expect(s.arc).toBeCloseTo(weapon('backhand').arc!, 9);
    expect(s.source).toBe('backhand');
    expect(SWEEP_SECONDS).toBeLessThan(0.2);
    for (let i = 0; i < 12; i++) w.step(DT, still);
    expect(w.sweeps).toHaveLength(0);
  });

  it('hits the boss in front of it once a swing', () => {
    const w = world({ backhand: 1 });
    const b = withBoss(w);
    w.x = b.x;
    w.y = b.y + BOSS_RADIUS + 50;
    w.facingX = 0;
    w.facingY = -1;
    const before = b.hp;
    // It swung at air on the step the boss arrived; the next swing is a
    // cooldown later, and the one after that is outside this window.
    const c = cooldown(w, 'backhand', 1);
    for (let t = 0; t < c + 0.25; t += DT) w.step(DT, still);
    expect(before - b.hp).toBeCloseTo(hit('backhand', 1), 9);
  });
});

describe('Judgement: a strike', () => {
  /** Three pairs, each pair closer together than the bolt's radius, far from the others. */
  function pairs(w: World): EnemyState[][] {
    return [
      [place(w, 200, 0), place(w, 225, 0)],
      [place(w, -200, 0), place(w, -225, 0)],
      [place(w, 0, 200), place(w, 0, 225)],
    ];
  }
  const struck = (groups: EnemyState[][]) => groups.findIndex((g) => g.some((e) => e.hp < DUMMY.hp));

  it('hurts nothing before the delay, then the one it picked and its neighbour, once', () => {
    const w = world({ judgement: 1 });
    const groups = pairs(w);
    // To within a frame: the fire step counts toward the delay, as it does
    // toward a burst's age.
    while (w.time < STRIKE_DELAY - 1.5 * DT) {
      w.step(DT, still);
      for (const g of groups) for (const e of g) expect(e.hp, `at ${w.time.toFixed(3)}s`).toBe(DUMMY.hp);
    }
    for (let i = 0; i < 20; i++) w.step(DT, still);
    const k = struck(groups);
    expect(k).toBeGreaterThanOrEqual(0);
    for (const [j, g] of groups.entries()) {
      for (const e of g) {
        if (j === k) expect(DUMMY.hp - e.hp).toBeCloseTo(hit('judgement', 1), 9);
        else expect(e.hp).toBe(DUMMY.hp);
      }
    }
  });

  it("the world's dice pick: a seed replays the target, and seeds differ", () => {
    const pick = (seed: number): number => {
      const w = world({ judgement: 1 }, seed);
      const groups = pairs(w);
      for (let i = 0; i < 40; i++) w.step(DT, still);
      return struck(groups);
    };
    for (let seed = 1; seed <= 6; seed++) expect(pick(seed), `seed ${seed}`).toBe(pick(seed));
    const picks = new Set(Array.from({ length: 12 }, (_, i) => pick(i + 1)));
    expect(picks.size, 'twelve seeds always picked the same pair').toBeGreaterThan(1);
  });

  it('comes down where the target was, not where it went', () => {
    const w = world({ judgement: 1 });
    const e = place(w, 200, 0);
    w.step(DT, still);
    expect(w.areas.some((a) => a.delay !== undefined && a.delay > 0)).toBe(true);
    e.x += 150;
    for (let i = 0; i < 30; i++) w.step(DT, still);
    expect(e.hp).toBe(DUMMY.hp);
  });

  it('two bolts on one crowd hit each enemy once apiece, not every step of the flash', () => {
    // Two targets 10px apart: two bolts, each one's area over both. The
    // burst path's one-hit mark is a single serial per enemy, and two
    // overlapping one-shot areas would take turns re-arming it.
    const w = world({ judgement: 3 });
    const a = place(w, 200, 0);
    const b = place(w, 210, 0);
    for (let i = 0; i < 40; i++) w.step(DT, still);
    expect(DUMMY.hp - a.hp).toBeCloseTo(2 * hit('judgement', 3), 9);
    expect(DUMMY.hp - b.hp).toBeCloseTo(2 * hit('judgement', 3), 9);
  });

  it('with nothing in range it does not fire, and retries', () => {
    const w = world({ judgement: 1 });
    w.step(DT, still);
    expect(w.areas).toHaveLength(0);
    const e = place(w, 200, 0);
    for (let i = 0; i < 40; i++) w.step(DT, still);
    expect(e.hp).toBeLessThan(DUMMY.hp);
  });

  it('strikes the boss when it is the only thing in range, once, after the delay', () => {
    const w = world({ judgement: 1 });
    const b = withBoss(w);
    // Placed 420px above the player: its edge is 270px away, inside 300.
    expect(Math.hypot(b.x - w.x, b.y - w.y) - BOSS_RADIUS).toBeLessThanOrEqual(weapon('judgement').range);
    let landed = false;
    for (let i = 0; i < 60; i++) {
      const pending = w.areas.some((a) => a.delay !== undefined && a.delay > 0);
      w.step(DT, still);
      if (pending && w.areas.some((a) => a.delay !== undefined && a.delay > 0)) expect(b.hp).toBe(b.maxHp);
      if (b.hp < b.maxHp) landed = true;
    }
    expect(landed).toBe(true);
    // One bolt in the second, and the boss's own area pass did not add to it.
    expect(b.maxHp - b.hp).toBeCloseTo(hit('judgement', 1), 9);
  });
});

describe('the classic three print no numbers (G-043)', () => {
  for (const id of ['personal-space', 'backhand', 'judgement']) {
    it(id, () => {
      const def = weapon(id);
      const lines = [def.blurb, ...def.levels.map((l) => l.text)];
      for (const p of def.paths ?? []) {
        expect(p.levels, `${id}/${p.id}`).toHaveLength(p.maxLevel);
        lines.push(p.blurb, ...p.levels.map((l) => l.text));
      }
      expect(def.paths?.length ?? 0).toBeGreaterThanOrEqual(2);
      for (const line of lines) {
        expect(line, `"${line}"`).not.toMatch(/[0-9%]/);
        expect(line.length, `"${line}"`).toBeLessThan(64);
      }
      expect(def.from, 'in the pool from conception').toBeUndefined();
    });
  }
});
