import { describe, expect, it } from 'vitest';
import { CONCEPTION, DECLINE, type ActDef } from '../../../src/data/acts';
import { World, fromHand, type Input } from '../../../src/sim/world';
import { HAND_CLEARANCE_PX, POLICIES, SHOT_SIDESTEP_WEIGHT, decideOnce, handPush, sidestep } from '../bots';

/**
 * Time's hand in the sidestep (DECLINE-ROSTER §4, §5: "keep off the line;
 * cross behind the hand"). The hand is the sim's own — Time stands, its
 * blade turns — and the test stands the bot beside it. The assertions are
 * directions: off the line, and never clockwise, the way the hand is going.
 * Presence, not calibration; HAND_CLEARANCE_PX is the bot's placeholder.
 */

const SIGHTED = POLICIES.find((p) => p.name === 'midpiece+wake')!;
const BLIND = POLICIES.find((p) => p.blindToShots)!;
const DT = 1 / 60;
const STILL: Input = { moveX: 0, moveY: 0 };
if (DECLINE.boss.kind !== 'time') throw new Error('Decline does not fight Time');
const TIME = DECLINE.boss;
const TURN = (Math.PI * 2) / TIME.sweepSeconds;
/** The bot's cadence (bots.ts, `cadenceSeconds`), the look-ahead the push reads by default. */
const CADENCE = 0.2;

/** Time standing, nothing else on the field. */
function atTime(act: ActDef = DECLINE): { w: World; b: NonNullable<World['boss']> } {
  const w = new World({ acts: [{ ...act, id: `${act.id}-hand-fixture`, waves: [] }], seed: 11, startingItems: [] });
  w.actTime = act.durationSeconds;
  w.step(DT, STILL);
  expect(w.boss).not.toBeNull();
  return { w, b: w.boss! };
}

/** The bot `along` px out on bearing `angle` (clockwise from twelve), `across` px clockwise of that line. */
function put(w: World, b: { x: number; y: number }, angle: number, along: number, across = 0): void {
  w.x = b.x + Math.sin(angle) * along + Math.cos(angle) * across;
  w.y = b.y - Math.cos(angle) * along + Math.sin(angle) * across;
}

/** The clockwise unit tangent at the bot's bearing from the pivot: the hand's motion there. */
function clockwise(w: World, b: { x: number; y: number }): { x: number; y: number } {
  const bearing = Math.atan2(w.x - b.x, -(w.y - b.y));
  return { x: Math.cos(bearing), y: Math.sin(bearing) };
}

const reachOf = (w: World) => w.playerRadius + TIME.sweepWidth / 2;

describe('Time’s hand, as the sidestep reads it', () => {
  it('is nothing where there is no Time, and nothing once the hands have stopped', () => {
    const egg = atTime(CONCEPTION);
    put(egg.w, egg.b, 0, 250);
    expect(handPush(egg.w)).toBeNull();

    const { w, b } = atTime();
    put(w, b, b.hand, 250);
    expect(handPush(w)).not.toBeNull();
    b.phase = 'absorbing';
    expect(handPush(w)).toBeNull();
  });

  it('is nothing on the far side of the pivot, or past the tip and its clearance', () => {
    const { w, b } = atTime();
    put(w, b, b.hand + Math.PI, 250);
    expect(handPush(w)).toBeNull();
    put(w, b, b.hand, TIME.sweepLength + reachOf(w) + HAND_CLEARANCE_PX + 5);
    expect(handPush(w)).toBeNull();
    // Well behind it, beyond the clearance: nothing either.
    put(w, b, b.hand, 250, -(reachOf(w) + HAND_CLEARANCE_PX + 5));
    expect(handPush(w)).toBeNull();
  });

  it('beside the line, behind the hand: steps off it, counterclockwise, never ahead', () => {
    const { w, b } = atTime();
    // Behind the blade (the side it has passed), inside the clearance, out of contact.
    put(w, b, b.hand, 250, -(reachOf(w) + HAND_CLEARANCE_PX / 2));
    expect(fromHand(b.x, b.y, b.hand, TIME.sweepLength, TIME.sweepWidth, w.x, w.y)).toBeGreaterThan(w.playerRadius);
    const push = handPush(w)!;
    expect(push).not.toBeNull();
    const cw = clockwise(w, b);
    // Unit, and exactly against the hand's motion: away from the line on this side.
    expect(Math.hypot(push.x, push.y)).toBeCloseTo(1, 9);
    expect(push.x * cw.x + push.y * cw.y).toBeCloseTo(-1, 9);
    // The sidestep carries it, capped at the shot's weight, as a shot's push is.
    const s = sidestep(w, { headingX: 1, headingY: 0 });
    expect(Math.hypot(s.x, s.y)).toBeCloseTo(SHOT_SIDESTEP_WEIGHT, 9);
    expect(s.x * cw.x + s.y * cw.y).toBeLessThan(0);

    // The whole decision: off the line, and no step the way the hand is going.
    const move = decideOnce(SIGHTED, w);
    const along = move.moveX * cw.x + move.moveY * cw.y;
    expect(along, 'the bot stepped ahead of the hand’s motion').toBeLessThan(0);
    // Held for one cadence, as the bot holds a decision: further off the line
    // than standing still would leave it, and never touched.
    const before = fromHand(b.x, b.y, b.hand, TIME.sweepLength, 0, w.x, w.y);
    const hp = w.hp;
    for (let i = 0; i < Math.round(CADENCE / DT); i++) w.step(DT, move);
    expect(w.hp).toBe(hp);
    const after = fromHand(b.x, b.y, b.hand, TIME.sweepLength, 0, w.x, w.y);
    expect(after).toBeGreaterThan(before + TURN * CADENCE * 250);
  });

  it('ahead of the hand, where it sweeps before the next decision: crosses behind it, never runs ahead of it', () => {
    const { w, b } = atTime();
    // Just ahead of the blade, inside the wedge one cadence of turn sweeps.
    put(w, b, b.hand + (TURN * CADENCE) / 2, 250);
    const push = handPush(w)!;
    expect(push).not.toBeNull();
    expect(push.off).toBe(0);
    const cw = clockwise(w, b);
    expect(push.x * cw.x + push.y * cw.y).toBeCloseTo(-1, 9);
    const move = decideOnce(SIGHTED, w);
    expect(move.moveX * cw.x + move.moveY * cw.y).toBeLessThan(0);

    // Ahead of the next decision's blade, inside the clearance: still behind, never with it.
    put(w, b, b.hand + TURN * CADENCE, 250, reachOf(w) + HAND_CLEARANCE_PX / 2);
    const next = handPush(w)!;
    expect(next).not.toBeNull();
    const cw2 = clockwise(w, b);
    expect(next.x * cw2.x + next.y * cw2.y).toBeCloseTo(-1, 9);
  });

  it('the hand is a thing the sighted bot reads and the blind control does not', () => {
    const { w, b } = atTime();
    put(w, b, b.hand, 250, -(reachOf(w) + HAND_CLEARANCE_PX / 2));
    const cw = clockwise(w, b);
    const sighted = decideOnce(SIGHTED, w);
    const blind = decideOnce(BLIND, w);
    const s = sighted.moveX * cw.x + sighted.moveY * cw.y;
    const k = blind.moveX * cw.x + blind.moveY * cw.y;
    // Both leave counterclockwise (the orbit already does); the sighted more so.
    expect(s).toBeLessThan(k);
  });
});
