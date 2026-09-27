/**
 * The drag-anywhere stick, as arithmetic.
 *
 * Kept out of `ActScene` because touch cannot be exercised in CI and this can:
 * the scene owns the pointer events, this owns what they mean. No Phaser here.
 *
 * Note that `World.movePlayer` normalises its input, so today only the
 * DIRECTION of the stick reaches the rules — any vector past the dead zone is
 * full speed, exactly as a held key is. The magnitude is still computed and
 * clamped properly so that nothing here has to change if the sim ever reads it.
 */

export interface Move {
  moveX: number;
  moveY: number;
}

export interface Point {
  x: number;
  y: number;
}

/**
 * Fraction of the radius a finger must travel before it counts. Because the
 * sim treats any non-zero input as full speed, a finger resting on the glass
 * would otherwise walk the player off at full tilt on a one-pixel wobble.
 */
export const STICK_DEAD_ZONE = 0.15;

const ZERO: Move = { moveX: 0, moveY: 0 };

/** Scales a vector down to unit length if it is longer; shorter is kept. */
export function clampUnit(v: Move): Move {
  const len = Math.hypot(v.moveX, v.moveY);
  if (len <= 1) return { moveX: v.moveX, moveY: v.moveY };
  return { moveX: v.moveX / len, moveY: v.moveY / len };
}

/**
 * (current − origin) / radius, clamped to unit length, zero inside the dead
 * zone. `radius` is in the same units as the points.
 */
export function stickVector(origin: Point, current: Point, radius: number): Move {
  if (!(radius > 0)) return ZERO;
  const v = clampUnit({ moveX: (current.x - origin.x) / radius, moveY: (current.y - origin.y) / radius });
  if (Math.hypot(v.moveX, v.moveY) < STICK_DEAD_ZONE) return ZERO;
  return v;
}

/**
 * Keyboard and stick together: summed, then clamped. Chosen over "most
 * recently changed wins" because it needs no memory of which moved last, so
 * there is no state to go stale when a key-up or pointer-up is missed (a tab
 * switch mid-drag). In practice nobody holds both; when someone does, the
 * result is the direction they are asking for.
 */
export function combineMoves(keys: Move, stick: Move): Move {
  return clampUnit({ moveX: keys.moveX + stick.moveX, moveY: keys.moveY + stick.moveY });
}
