import { describe, expect, it } from 'vitest';
import { STICK_DEAD_ZONE, clampUnit, combineMoves, stickVector } from '../touch';

const O = { x: 100, y: 200 };
const R = 60;

describe('stickVector', () => {
  it('is (current − origin) / radius inside the radius', () => {
    const v = stickVector(O, { x: 130, y: 200 }, R);
    expect(v.moveX).toBeCloseTo(0.5);
    expect(v.moveY).toBeCloseTo(0);
  });

  it('keeps screen orientation: down the screen is +y', () => {
    const v = stickVector(O, { x: 100, y: 245 }, R);
    expect(v.moveX).toBeCloseTo(0);
    expect(v.moveY).toBeCloseTo(0.75);
  });

  it('clamps to unit length past the radius, keeping direction', () => {
    const v = stickVector(O, { x: 100 + 300, y: 200 - 400 }, R);
    expect(Math.hypot(v.moveX, v.moveY)).toBeCloseTo(1);
    expect(v.moveX).toBeCloseTo(0.6);
    expect(v.moveY).toBeCloseTo(-0.8);
  });

  it('is zero at the origin and inside the dead zone', () => {
    expect(stickVector(O, O, R)).toEqual({ moveX: 0, moveY: 0 });
    const inside = R * STICK_DEAD_ZONE * 0.9;
    expect(stickVector(O, { x: O.x + inside, y: O.y }, R)).toEqual({ moveX: 0, moveY: 0 });
  });

  it('moves just past the dead zone', () => {
    const past = R * STICK_DEAD_ZONE * 1.1;
    expect(stickVector(O, { x: O.x - past, y: O.y }, R).moveX).toBeLessThan(0);
  });

  it('is zero for a non-positive radius rather than dividing by it', () => {
    expect(stickVector(O, { x: 500, y: 500 }, 0)).toEqual({ moveX: 0, moveY: 0 });
    expect(stickVector(O, { x: 500, y: 500 }, -5)).toEqual({ moveX: 0, moveY: 0 });
  });
});

describe('clampUnit', () => {
  it('leaves short vectors alone and shortens long ones', () => {
    expect(clampUnit({ moveX: 0.3, moveY: -0.4 })).toEqual({ moveX: 0.3, moveY: -0.4 });
    const v = clampUnit({ moveX: 3, moveY: 4 });
    expect(v.moveX).toBeCloseTo(0.6);
    expect(v.moveY).toBeCloseTo(0.8);
  });
});

describe('combineMoves', () => {
  it('passes the keyboard through when the stick is idle', () => {
    expect(combineMoves({ moveX: 1, moveY: 0 }, { moveX: 0, moveY: 0 })).toEqual({ moveX: 1, moveY: 0 });
  });

  it('passes the stick through when no key is held', () => {
    expect(combineMoves({ moveX: 0, moveY: 0 }, { moveX: 0, moveY: -0.5 })).toEqual({ moveX: 0, moveY: -0.5 });
  });

  it('sums and clamps when both are active', () => {
    const v = combineMoves({ moveX: 1, moveY: 0 }, { moveX: 0, moveY: 1 });
    expect(Math.hypot(v.moveX, v.moveY)).toBeCloseTo(1);
    expect(v.moveX).toBeCloseTo(v.moveY);
  });

  it('opposing inputs cancel to standing still', () => {
    expect(combineMoves({ moveX: -1, moveY: 0 }, { moveX: 1, moveY: 0 })).toEqual({ moveX: 0, moveY: 0 });
  });
});
