import { describe, expect, it } from 'vitest';
import { ADOLESCENCE, CONCEPTION, type ActDef } from '../../../src/data/acts';
import { World, type Input, type ProjectileState } from '../../../src/sim/world';
import { POLICIES, SHOT_SIDESTEP_WEIGHT, decideOnce, sidestep, threatens } from '../bots';

/**
 * The sidestep between two of Prom's ring spots (AUDIT part five, minor): near
 * the ball two neighbouring spots both threaten, their pushes point at each
 * other, and the sum — at most 0.39, outward along the spots — left the bot
 * no sidestep while it stood in the nearer spot's light.
 *
 * The ring is the sim's own: Prom fires it, the test stands the player in it.
 * The assertions are directions and contact geometry (reach = player radius +
 * shot radius, as `resolveContact` has it), not the placeholders' values; the
 * preconditions say which placeholder moved if the situation stops existing.
 */

const SIGHTED = POLICIES.find((p) => p.name === 'midpiece+wake')!;
const DT = 1 / 60;
const STILL: Input = { moveX: 0, moveY: 0 };
const SPOTS = ADOLESCENCE.boss.kind === 'prom' ? ADOLESCENCE.boss.spots : NaN;
const SPACING = (Math.PI * 2) / SPOTS;

/** Prom standing, the first ring just out of the ball; nothing else on the field. */
function firstRing(): { w: World; ring: ProjectileState[] } {
  const w = new World({ acts: [{ ...ADOLESCENCE, id: 'ring-spots-fixture', waves: [] }], seed: 7 });
  w.time = ADOLESCENCE.durationSeconds;
  w.step(DT, STILL);
  expect(w.boss?.kind).toBe('prom');
  while (w.boss!.rings === 0) w.step(DT, STILL);
  const ring = w.projectiles.filter((p) => p.hostile && p.source === 'boss');
  expect(ring).toHaveLength(SPOTS);
  return { w, ring };
}

/** The spot leaving the ball on bearing `angle`, to the nearest thousandth of a radian. */
function spotAt(ring: ProjectileState[], angle: number): ProjectileState {
  const found = ring.find((p) => {
    const a = Math.atan2(p.vy, p.vx);
    return Math.abs(Math.atan2(Math.sin(a - angle), Math.cos(a - angle))) < 1e-3;
  });
  expect(found).toBeDefined();
  return found!;
}

/** The player's distance from a spot's path, and the unit vector away from it. */
function fromPath(w: World, p: ProjectileState): { off: number; ax: number; ay: number } {
  const speed = Math.hypot(p.vx, p.vy);
  const nx = -p.vy / speed;
  const ny = p.vx / speed;
  const side = (w.x - p.x) * nx + (w.y - p.y) * ny;
  const s = side > 0 ? 1 : -1;
  return { off: Math.abs(side), ax: nx * s, ay: ny * s };
}

const reach = (w: World, p: ProjectileState) => w.playerRadius + p.radius;

/**
 * The player `dist` px from the ball, `offA` px off spot A's path toward its
 * neighbour B (a spacing further round). Returns both spots.
 */
function between(dist: number, offA: number) {
  const { w, ring } = firstRing();
  const b = w.boss!;
  const a0 = Math.atan2(ring[0]!.vy, ring[0]!.vx);
  const A = spotAt(ring, a0);
  const B = spotAt(ring, a0 + SPACING);
  const bearing = a0 + Math.asin(offA / dist);
  w.x = b.x + Math.cos(bearing) * dist;
  w.y = b.y + Math.sin(bearing) * dist;
  return { w, A, B, ball: { x: b.x, y: b.y } };
}

describe('Prom: the sidestep between two ring spots', () => {
  it('in the nearer spot’s light with a gap beside it, steps out into the gap', () => {
    // 140px out, 22px off A: inside A's reach (26), B about 33px away.
    const { w, A, B, ball } = between(140, 22);

    // The situation, from the sim's own ring: both spots threaten, only
    // they do, the player is in A's light, and the gap between fits a player.
    expect(threatens(w, A) && threatens(w, B), 'both neighbours threaten').toBe(true);
    expect(w.projectiles.filter((p) => threatens(w, p)), 'only the two').toHaveLength(2);
    const a = fromPath(w, A);
    const bb = fromPath(w, B);
    expect(a.off).toBeLessThan(reach(w, A));
    // Stepping out of A's reach brings B's path nearer by the cosine between
    // the pushes; B must still be out of reach there.
    const c = -(a.ax * bb.ax + a.ay * bb.ay);
    expect(bb.off - c * (reach(w, A) - a.off)).toBeGreaterThan(reach(w, B));

    // The defect's arithmetic: the two unit pushes point at each other, and
    // what is left of them is small and points along the spots, outward.
    const sumX = a.ax + bb.ax;
    const sumY = a.ay + bb.ay;
    const sumLen = Math.hypot(sumX, sumY);
    expect(sumLen).toBeLessThan(0.4);
    const outX = (w.x - ball.x) / Math.hypot(w.x - ball.x, w.y - ball.y);
    const outY = (w.y - ball.y) / Math.hypot(w.x - ball.x, w.y - ball.y);
    expect((sumX * outX + sumY * outY) / sumLen).toBeGreaterThan(0.95);
    // ...which barely moves the player off A's path at all.
    expect((sumX * a.ax + sumY * a.ay) / sumLen).toBeLessThan(0.3);

    // The fix: a full sidestep, perpendicular to A's path and away from it.
    const heading = { headingX: w.facingX, headingY: w.facingY };
    const v = sidestep(w, heading);
    const len = Math.hypot(v.x, v.y);
    expect(len).toBeCloseTo(SHOT_SIDESTEP_WEIGHT, 9);
    expect((v.x * a.ax + v.y * a.ay) / len).toBeGreaterThan(0.999);

    // Out of the light: stepping along it just past A's reach lands outside
    // both spots' reach.
    const step = reach(w, A) - a.off + 1;
    w.x += (v.x / len) * step;
    w.y += (v.y / len) * step;
    expect(fromPath(w, A).off).toBeGreaterThan(reach(w, A));
    expect(fromPath(w, B).off).toBeGreaterThan(reach(w, B));
  });

  it('is the same whichever way the bot was heading, and the same every time', () => {
    const { w } = between(140, 22);
    const one = sidestep(w, { headingX: 1, headingY: 0 });
    expect(sidestep(w, { headingX: -1, headingY: 0 })).toEqual(one);
    expect(sidestep(w, { headingX: 0, headingY: 1 })).toEqual(one);
    expect(sidestep(w, { headingX: 1, headingY: 0 })).toEqual(one);
  });

  it('on the other side of the gap, steps the other way — out of B', () => {
    // 22px off B toward A: B is the nearer now.
    const { w, A, B } = between(140, 32.6);
    const a = fromPath(w, A);
    const bb = fromPath(w, B);
    expect(bb.off).toBeLessThan(a.off);
    expect(bb.off).toBeLessThan(reach(w, B));
    const v = sidestep(w, { headingX: w.facingX, headingY: w.facingY });
    const len = Math.hypot(v.x, v.y);
    expect((v.x * bb.ax + v.y * bb.ay) / len).toBeGreaterThan(0.999);
  });

  it('where no gap fits a player (close to the ball), the sum stands: outward, where the spots spread', () => {
    // 100px out the neighbours are ~39px apart: nowhere between is out of both.
    const { w, A, B, ball } = between(100, 15);
    expect(threatens(w, A) && threatens(w, B)).toBe(true);
    const a = fromPath(w, A);
    const bb = fromPath(w, B);
    expect(a.off + bb.off).toBeLessThan(reach(w, A) + reach(w, B));
    const v = sidestep(w, { headingX: w.facingX, headingY: w.facingY });
    const len = Math.hypot(v.x, v.y);
    const expected = { x: (a.ax + bb.ax) * SHOT_SIDESTEP_WEIGHT, y: (a.ay + bb.ay) * SHOT_SIDESTEP_WEIGHT };
    expect(v.x).toBeCloseTo(expected.x, 9);
    expect(v.y).toBeCloseTo(expected.y, 9);
    const d = Math.hypot(w.x - ball.x, w.y - ball.y);
    expect((v.x * (w.x - ball.x) + v.y * (w.y - ball.y)) / (len * d)).toBeGreaterThan(0.95);
  });
});

describe('the steering, with nothing else on the field', () => {
  const QUIET: ActDef = { ...CONCEPTION, id: 'ring-spots-quiet', waves: [] };
  let serial = 2_000_000;
  /** A spot as Prom fires one, leaving (cx, cy) on bearing `angle`. */
  function spot(w: World, cx: number, cy: number, angle: number): ProjectileState {
    const p: ProjectileState = {
      x: cx,
      y: cy,
      vx: Math.cos(angle) * 260,
      vy: Math.sin(angle) * 260,
      life: 4,
      damage: 12,
      pierce: 1,
      radius: 10,
      hostile: true,
      source: 'boss',
      serial: serial++,
    };
    w.projectiles.push(p);
    return p;
  }

  it('the move points out of the nearer spot even when the bot was heading into it', () => {
    const w = new World({ acts: [QUIET], seed: 7, startingItems: [] });
    // Two spots of a ring centred 140px away: A 22px from the player, B a
    // spacing further round, about 33px from it.
    const bearing = -Math.PI / 2 + 0.6;
    const cx = w.x - Math.cos(bearing) * 140;
    const cy = w.y - Math.sin(bearing) * 140;
    const aAngle = bearing - Math.asin(22 / 140);
    const A = spot(w, cx, cy, aAngle);
    spot(w, cx, cy, aAngle + SPACING);
    const a = fromPath(w, A);
    // Facing into A: a bot with no sidestep coasts that way.
    w.facingX = -a.ax;
    w.facingY = -a.ay;
    const move = decideOnce(SIGHTED, w);
    expect(move.moveX * a.ax + move.moveY * a.ay).toBeGreaterThan(0.999);
  });

  it('two parallel paths, the player in one’s light: once cancelled to exactly nothing, now a full step out', () => {
    const w = new World({ acts: [QUIET], seed: 7, startingItems: [] });
    // Falling straight down, 20px to the player's -x and 33px to its +x: the
    // two unit pushes are exactly opposite and sum to zero.
    spot(w, w.x - 20, w.y - 100, Math.PI / 2);
    spot(w, w.x + 33, w.y - 100, Math.PI / 2);
    const v = sidestep(w, { headingX: -1, headingY: 0 });
    expect(v.x).toBeCloseTo(SHOT_SIDESTEP_WEIGHT, 9);
    expect(v.y).toBeCloseTo(0, 9);
    w.facingX = -1;
    w.facingY = 0;
    expect(decideOnce(SIGHTED, w).moveX).toBeGreaterThan(0.999);
  });
});
