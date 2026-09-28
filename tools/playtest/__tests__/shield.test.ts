import { describe, expect, it } from 'vitest';
import { ADOLESCENCE, CONCEPTION, SCHOOL, type ActDef } from '../../../src/data/acts';
import { World, type Input } from '../../../src/sim/world';
import { POLICIES, decideOnce } from '../bots';

/**
 * The bots read a shielded boss (SCHOOL-ROSTER §9, ADOLESCENCE-ROSTER §4): 8
 * of 52 School fights sat at the 120s cap "because no bot hunts the last
 * ball". The bot cannot aim, so the reading is where it walks — to the Gym
 * Teacher's nearest ball, onto Prom's floor.
 *
 * Every world is its act with the schedule emptied, stepped once past the
 * clock so the boss stands; nothing moves but what is placed. The assertions
 * are directions (a dot product with the bearing), not the placeholders'
 * values.
 */

const SIGHTED = POLICIES.find((p) => p.name === 'midpiece+wake')!;
const BLIND = POLICIES.find((p) => p.name === 'random')!;
const DT = 1 / 60;
const STILL: Input = { moveX: 0, moveY: 0 };

const quiet = (act: ActDef): ActDef => ({ ...act, id: `${act.id}-shield-fixture`, waves: [] });

/** The act's boss standing, the player where it was when he arrived. */
function atBoss(act: ActDef): World {
  const w = new World({ acts: [quiet(act)], seed: 7 });
  w.time = act.durationSeconds;
  w.step(DT, STILL);
  expect(w.boss?.kind).toBe(act.boss.kind);
  return w;
}

/** Normalised move · unit bearing from the player to (x, y). */
function toward(move: Input, w: World, x: number, y: number): number {
  const d = Math.hypot(x - w.x, y - w.y);
  const m = Math.hypot(move.moveX, move.moveY);
  return (move.moveX * (x - w.x) + move.moveY * (y - w.y)) / (d * m);
}

/**
 * A dodgeball `dist` px from the player, on the far side from the Gym Teacher
 * (he stands 420px up; the ball is straight down), so a bot that walks to him
 * walks away from it. Stepped once, so the sim raises the shield itself.
 */
function schoolWithBall(dist: number): { w: World; ball: { x: number; y: number } } {
  const w = atBoss(SCHOOL);
  w.spawnEnemy('dodgeball');
  const e = w.enemies[w.enemies.length - 1]!;
  e.x = w.x;
  e.y = w.y + dist;
  // Moving across the bearing, not along it: one step must not close the gap.
  e.vx = 165;
  e.vy = 0;
  w.step(DT, STILL);
  return { w, ball: e };
}

describe('the Gym Teacher: the bot hunts the last ball', () => {
  it('shielded by one ball far off, the steering points at the ball', () => {
    const { w, ball } = schoolWithBall(700);
    expect(w.boss!.shielded).toBe(true);
    expect(toward(decideOnce(SIGHTED, w), w, ball.x, ball.y)).toBeGreaterThan(0);
  });

  it('with no ball alive it does not — it goes back to the boss', () => {
    const { w, ball } = schoolWithBall(700);
    const { x, y } = ball;
    w.enemies.length = 0;
    w.step(DT, STILL);
    expect(w.boss!.shielded).toBe(false);
    expect(toward(decideOnce(SIGHTED, w), w, x, y)).toBeLessThanOrEqual(0);
    expect(toward(decideOnce(SIGHTED, w), w, w.boss!.x, w.boss!.y)).toBeGreaterThan(0);
  });

  it('approaches to weapon range, not to contact: a ball already in range is not walked into', () => {
    // Lash alone: the build's range notion puts the hold at ~294px.
    const { w, ball } = schoolWithBall(120);
    expect(w.boss!.shielded).toBe(true);
    expect(toward(decideOnce(SIGHTED, w), w, ball.x, ball.y)).toBeLessThanOrEqual(0);
  });

  it('random is blind to it — it walks to the boss', () => {
    const { w, ball } = schoolWithBall(700);
    expect(toward(decideOnce(BLIND, w), w, ball.x, ball.y)).toBeLessThanOrEqual(0);
    expect(toward(decideOnce(BLIND, w), w, w.boss!.x, w.boss!.y)).toBeGreaterThan(0);
  });
});

describe('Prom: the bot gets on the floor', () => {
  /** The act's boss standing, the player `dist` px straight below it. */
  function below(act: ActDef, dist: number): World {
    const w = atBoss(act);
    const place = () => {
      w.x = w.boss!.x;
      w.y = w.boss!.y + dist;
    };
    place();
    w.step(DT, STILL);
    // Again: the Egg's pull moved the player during the step, and the two
    // worlds must stand the bot on the same spot.
    place();
    return w;
  }
  const floor = ADOLESCENCE.boss.kind === 'prom' ? ADOLESCENCE.boss.floorRadius : NaN;

  it('500px off the floor, the steering points at the ball', () => {
    const w = below(ADOLESCENCE, 500);
    expect(w.boss!.shielded).toBe(true);
    expect(toward(decideOnce(SIGHTED, w), w, w.boss!.x, w.boss!.y)).toBeGreaterThan(0);
  });

  it('500px off, it walks in harder than a bot that plays Prom as the Egg', () => {
    const prom = below(ADOLESCENCE, 500);
    const egg = below(CONCEPTION, 500);
    const inward = (w: World) => toward(decideOnce(SIGHTED, w), w, w.boss!.x, w.boss!.y);
    expect(inward(prom)).toBeGreaterThan(inward(egg));
  });

  it('inside 0.8 of the floor it does not push further in', () => {
    const w = below(ADOLESCENCE, floor * 0.8 - 40);
    expect(w.boss!.shielded).toBe(false);
    expect(toward(decideOnce(SIGHTED, w), w, w.boss!.x, w.boss!.y)).toBeLessThanOrEqual(0);
    // Nothing added: the same move as the control, which reads no floor.
    expect(decideOnce(SIGHTED, w)).toEqual(decideOnce(BLIND, w));
  });

  it('random is blind to it — it plays Prom exactly as it plays the Egg', () => {
    const prom = below(ADOLESCENCE, 500);
    const egg = below(CONCEPTION, 500);
    expect(prom.boss!.x).toBe(egg.boss!.x);
    expect(prom.boss!.y).toBe(egg.boss!.y);
    expect(decideOnce(BLIND, prom)).toEqual(decideOnce(BLIND, egg));
    expect(decideOnce(SIGHTED, prom)).not.toEqual(decideOnce(SIGHTED, egg));
  });
});
