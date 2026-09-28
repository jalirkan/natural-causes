import { describe, expect, it } from 'vitest';
import { FAMILY, type ActDef } from '../../../src/data/acts';
import { enemyDef, type EnemyDef } from '../../../src/data/enemies';
import { World, type EnemyState, type Input, type ProjectileState } from '../../../src/sim/world';
import {
  COY_RADIUS_PX,
  POLICIES,
  decideOnce,
  instalmentsLeft,
  pastCoy,
  runOnce,
  stacksWorn,
  summarise,
  threatOf,
  threatens,
} from '../bots';

/**
 * Family's toddler and letters, as the bots see them (FAMILY-ROSTER §3.3,
 * §3.4, §5: "a toddler-aware policy (walk at it) is presence, not
 * calibration").
 *
 * The toddler's hold does no damage, so by damage alone it weighed nothing
 * and the bots walked into it; `coy` makes it faster while the player moves
 * away, so fleeing it is the wrong answer too. The assertions are directions
 * and contact geometry (reach = player radius + enemy radius, as
 * `resolveContact` has it), never the placeholders' values.
 */

const SIGHTED = POLICIES.find((p) => p.name === 'midpiece+wake')!;
const DT = 1 / 60;
const STILL: Input = { moveX: 0, moveY: 0 };
const TODDLER = enemyDef('toddler');
const LETTER = enemyDef('hoa-letter');
const TUITION = enemyDef('tuition');
const PING = enemyDef('ping');

/** Family with nothing scheduled: nothing on the field but what a test puts there. */
const QUIET: ActDef = { ...FAMILY, id: 'family-bots-quiet', waves: [] };

let uid = 3_000_000;
/** An enemy of `def`, placed relative to the player, built as `addEnemy` builds one. */
function place(w: World, def: EnemyDef, dx: number, dy: number): EnemyState {
  const e: EnemyState = {
    uid: uid++,
    hitBySerial: 0,
    hitByAreaSerial: 0,
    def,
    x: w.x + dx,
    y: w.y + dy,
    vx: 0,
    vy: 0,
    hp: def.hp,
    age: 0,
    hitFlash: 0,
    radius: def.radius,
    displaySize: def.displaySize,
    xp: def.xp,
    consult: 0,
    reload: 0,
    generation: 0,
  };
  w.enemies.push(e);
  return e;
}

function empty(seed = 7): World {
  return new World({ acts: [QUIET], seed, startingItems: [] });
}

/** The unit vector from the enemy to the player: "away from it". */
function away(w: World, e: EnemyState): { x: number; y: number; d: number } {
  const d = Math.hypot(w.x - e.x, w.y - e.y);
  return { x: (w.x - e.x) / d, y: (w.y - e.y) / d, d };
}

/** How near the enemy the straight line along `move` passes, from where the player stands. */
function missBy(w: World, e: EnemyState, move: Input): number {
  const len = Math.hypot(move.moveX, move.moveY);
  const ex = e.x - w.x;
  const ey = e.y - w.y;
  const along = (ex * move.moveX + ey * move.moveY) / len;
  // Behind the player on this line: it only gets farther.
  if (along <= 0) return Math.hypot(ex, ey);
  return Math.abs(ex * move.moveY - ey * move.moveX) / len;
}

/**
 * A toddler set down `behind` px behind a player facing +x, then left to come
 * on for `seconds` while the player stands: it is approaching from behind.
 */
function fromBehind(behind: number, seconds = 0.25): { w: World; t: EnemyState } {
  const w = empty();
  w.facingX = 1;
  w.facingY = 0;
  const t = place(w, TODDLER, -behind, 0);
  const before = away(w, t).d;
  for (let i = 0; i < Math.round(seconds / DT); i++) w.step(DT, STILL);
  // The situation: still behind, nearer than it was, inside the coy radius,
  // and not yet holding the player.
  const now = away(w, t);
  expect(now.d, 'the toddler came on').toBeLessThan(before);
  expect(now.d, 'inside the coy radius').toBeLessThan(COY_RADIUS_PX);
  expect(w.facingX * -now.x + w.facingY * -now.y, 'it is behind').toBeLessThan(0);
  expect(w.engulfTimer, 'not holding yet').toBe(0);
  return { w, t };
}

describe('the toddler (coy, FAMILY-ROSTER §3.4)', () => {
  it('weighs something: its hold costs time, though it does no damage', () => {
    expect(TODDLER.contactDamage).toBe(0);
    expect(TODDLER.engulf?.damagePerSecond).toBe(0);
    expect(threatOf(TODDLER)).toBeGreaterThan(0);
  });

  it('approaching from behind: the move goes at it and round it, never away, and is not nothing', () => {
    for (const behind of [60, 90, 120, COY_RADIUS_PX]) {
      const { w, t } = fromBehind(behind);
      const move = decideOnce(SIGHTED, w);
      const a = away(w, t);
      // Not nothing: a unit move, not a coast on the old heading (which was
      // straight away from it).
      expect(Math.hypot(move.moveX, move.moveY), `${behind}px`).toBeCloseTo(1, 9);
      // No component away from it: the toddler is slowed, not quickened.
      expect(move.moveX * a.x + move.moveY * a.y, `${behind}px`).toBeLessThanOrEqual(1e-9);
      // And round it, not into it: the line of the move clears contact.
      expect(missBy(w, t, move), `${behind}px`).toBeGreaterThan(w.playerRadius + t.radius);
    }
  });

  it('close in (inside the pass’s clearance), straight across: no component either way', () => {
    const w = empty();
    const t = place(w, TODDLER, -40, 0);
    w.facingX = 1;
    w.facingY = 0;
    const move = decideOnce(SIGHTED, w);
    const a = away(w, t);
    expect(Math.hypot(move.moveX, move.moveY)).toBeCloseTo(1, 9);
    expect(Math.abs(move.moveX * a.x + move.moveY * a.y)).toBeLessThan(1e-9);
  });

  it('a gem straight away from it does not pull the bot away from it', () => {
    const w = empty();
    w.facingX = 1;
    w.facingY = 0;
    w.gems.push({ x: w.x + 60, y: w.y, value: 1 });
    // The gem alone: straight at it, which is +x.
    expect(decideOnce(SIGHTED, w).moveX).toBeGreaterThan(0.999);
    const t = place(w, TODDLER, -100, 0);
    const move = decideOnce(SIGHTED, w);
    const a = away(w, t);
    expect(Math.hypot(move.moveX, move.moveY)).toBeCloseTo(1, 9);
    expect(move.moveX * a.x + move.moveY * a.y).toBeLessThanOrEqual(1e-9);
  });

  it('a shot is still dodged, even when the dodge is away from it: lost time is not worth a hit', () => {
    const w = empty();
    w.facingX = 1;
    w.facingY = 0;
    const t = place(w, TODDLER, -120, 0);
    // Falling straight down, 10px to the player's -x: the sidestep is +x,
    // which is away from the toddler.
    const shot: ProjectileState = {
      x: w.x - 10,
      y: w.y - 100,
      vx: 0,
      vy: 260,
      life: 4,
      damage: 12,
      pierce: 1,
      radius: 10,
      hostile: true,
      source: 'boss',
      serial: 3_500_000,
    };
    w.projectiles.push(shot);
    expect(threatens(w, shot)).toBe(true);
    const move = decideOnce(SIGHTED, w);
    const a = away(w, t);
    expect(move.moveX * a.x + move.moveY * a.y).toBeGreaterThan(0);
  });

  it('reads the def’s `coy`, never its id', () => {
    const renamed: EnemyDef = { ...TODDLER, id: 'some-later-coy-enemy' };
    const plain: EnemyDef = { ...TODDLER };
    delete plain.coy;
    const moveWith = (def: EnemyDef): Input => {
      const w = empty();
      w.facingX = 1;
      w.facingY = 0;
      place(w, def, -100, 0);
      return decideOnce(SIGHTED, w);
    };
    const toddler = moveWith(TODDLER);
    expect(moveWith(renamed)).toEqual(toddler);
    // Without `coy` it does no damage, weighs nothing, and the bot coasts on
    // straight away from it, as it did before: the field is what changed it.
    expect(threatOf(plain)).toBe(0);
    expect(moveWith(plain)).toEqual({ moveX: 1, moveY: 0 });
    expect(toddler.moveX).toBeLessThan(0);
  });

  it('passes the same way every time, and on the side the bot already leans', () => {
    const w = empty();
    const t = place(w, TODDLER, -100, 0);
    const up = pastCoy(w, t, { headingX: 0.9, headingY: -0.1 });
    const down = pastCoy(w, t, { headingX: 0.9, headingY: 0.1 });
    expect(up.y).toBeLessThan(0);
    expect(down.y).toBeGreaterThan(0);
    // Dead on: a fixed side, so a replay passes the same way.
    expect(pastCoy(w, t, { headingX: 1, headingY: 0 })).toEqual(pastCoy(w, t, { headingX: 1, headingY: 0 }));
    expect(pastCoy(w, t, { headingX: 1, headingY: 0 })).toEqual(pastCoy(w, t, { headingX: -1, headingY: 0 }));
  });
});

describe('the HOA letter (attach.pickup, FAMILY-ROSTER §3.3)', () => {
  it('steers the bot exactly as tuition does: not at all', () => {
    expect(threatOf(LETTER)).toBe(0);
    expect(threatOf(TUITION)).toBe(0);
    const moveWith = (def: EnemyDef | null): Input => {
      const w = empty();
      w.facingX = 0.6;
      w.facingY = 0.8;
      if (def) place(w, def, 60, 80);
      return decideOnce(SIGHTED, w);
    };
    const nothing = moveWith(null);
    expect(moveWith(LETTER)).toEqual(nothing);
    expect(moveWith(TUITION)).toEqual(nothing);
  });

  it('a worn letter is counted in the stacks column, with the pings and the invoices', () => {
    const w = empty();
    const wear = (def: EnemyDef): void => {
      place(w, def, 0, 0);
      w.step(DT, STILL);
    };
    expect(stacksWorn(w)).toBe(0);
    wear(LETTER);
    expect(w.wornBy.get('hoa-letter')).toBe(1);
    // The letter costs reach, not speed: the drag count never sees it.
    expect(w.dragStacks).toBe(0);
    expect(stacksWorn(w)).toBe(1);
    wear(PING);
    wear(TUITION);
    expect(stacksWorn(w)).toBe(3);
    expect(w.dragStacks).toBe(1);
  });

  it('a run through letters reports them at the boss’s arrival', () => {
    // A short act of nothing but letters at the lead, which the bot walks
    // through (they weigh nothing). What is under test is the wiring from the
    // world's `wornBy` to the column, not how many.
    const letters: ActDef = {
      ...FAMILY,
      id: 'family-bots-letters',
      durationSeconds: 6,
      waves: [{ fromSeconds: 0, enemyId: 'hoa-letter', rate: 2 }],
    };
    const r = runOnce(SIGHTED, 1000, undefined, undefined, [letters]);
    expect(r.reached300).toBe(true);
    expect(r.stacksAt300).toBeGreaterThan(0);
    expect(summarise([r])[0]!.medianStacksAt300).toBe(r.stacksAt300);
  }, 60_000);
});

describe('The Mortgage in the report (FAMILY-ROSTER §4)', () => {
  it('instalments left reads `boss.paid` when the sim keeps it, and null when it does not', () => {
    const w = empty();
    expect(instalmentsLeft(w)).toBeNull();
    w.time = QUIET.durationSeconds;
    w.step(DT, STILL);
    expect(w.boss?.kind).toBe('mortgage');
    const owed = FAMILY.boss.kind === 'mortgage' ? FAMILY.boss.instalments : NaN;
    if ('paid' in w.boss! && typeof w.boss.paid === 'number') {
      // The count exists: nothing paid on the step it arrives.
      expect(instalmentsLeft(w)).toBe(owed - w.boss.paid);
    } else {
      // Not yet: the report prints "boss left" as it always has.
      expect(instalmentsLeft(w)).toBeNull();
    }
    Object.assign(w.boss!, { paid: 5 });
    expect(instalmentsLeft(w)).toBe(owed - 5);
  });
});
