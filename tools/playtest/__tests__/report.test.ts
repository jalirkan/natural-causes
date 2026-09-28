import { describe, expect, it } from 'vitest';
import { CONCEPTION, SCHOOL } from '../../../src/data/acts';
import { ITEMS, POLICIES, isActive, runOnce, summarise, type RunResult } from '../bots';

/**
 * The report's first-act figures in a life (D-024).
 *
 * The threshold into the next act clears the antibody drag and the life keeps
 * picking items after it. A first-act column that reads the END OF THE LIFE
 * therefore printed 0 stacks for every run that crossed, and let School's
 * picks into a Conception correlation — while every other column matched the
 * Conception-only run and made the report look right. INSTRUMENT, found on
 * the first life (PLAYTEST-FINDINGS.md, 2026-09-27).
 */

function fixture(over: Partial<RunResult>): RunResult {
  return {
    policy: 'p',
    seed: 1000,
    outcome: 'won',
    actIndex: 1,
    actId: 'school',
    age: 12,
    cause: 'natural causes',
    seconds: 800,
    kills: 0,
    level: 1,
    dragStacks: 0,
    stacksAt300: 0,
    headingChangeRate: 0,
    itemSpeedAt300: 0,
    reached300: true,
    stacksAtEnd: 0,
    stacksAtFirstActEnd: 0,
    hpAt300: 100,
    hpFractionAt300: 1,
    killsAt300: 0,
    enemiesAt300: 0,
    meanSpeed: 0,
    bossHpLeft: null,
    bossHpFraction: null,
    items: {},
    itemsAtFirstActEnd: {},
    shotsSeen: 0,
    shotsHit: 0,
    shotsBy: {},
    inheritance: null,
    ...over,
  };
}

describe('summarise: median@death is the first act’s', () => {
  it('reads stacksAtFirstActEnd, not the life’s end, which the threshold cleared', () => {
    const [row] = summarise([
      // Three lives that crossed: the drag is gone by the end of the life.
      fixture({ seed: 1000, stacksAtFirstActEnd: 30, stacksAtEnd: 0 }),
      fixture({ seed: 1001, stacksAtFirstActEnd: 40, stacksAtEnd: 0 }),
      fixture({ seed: 1002, stacksAtFirstActEnd: 50, stacksAtEnd: 0 }),
      // One that died in the first act: both figures are the same moment.
      fixture({
        seed: 1003,
        outcome: 'died',
        actIndex: 0,
        actId: 'conception',
        stacksAtFirstActEnd: 12,
        stacksAtEnd: 12,
      }),
    ]);
    expect(row!.medianStacksAtEnd).toBe(35);
  });
});

describe('runOnce over a two-act life', () => {
  it('keeps the first act’s stacks and items as they were at the threshold', () => {
    // Seed 1001 under greedy-capacitation clears the Egg and crosses into
    // School (checked by the first expectation, so a schedule change that
    // stops it crossing fails loudly instead of passing vacuously).
    const policy = POLICIES.find((p) => p.name === 'greedy-capacitation')!;
    const life = runOnce(policy, 1001, undefined, undefined, [CONCEPTION, SCHOOL]);
    expect(life.actIndex).toBeGreaterThanOrEqual(1);

    expect(life.stacksAtFirstActEnd).toBeGreaterThanOrEqual(life.stacksAtEnd);
    // An evolution replaces its weapon (G-038): a weapon held at the threshold
    // and evolved after it is still held, as the evolution. Seed 1001 does
    // this once the bots sidestep aimed shots.
    const evolvedAway = new Set(
      Object.keys(life.items).flatMap((id) => {
        const def = ITEMS[id];
        return def && isActive(def) && def.evolvesFrom ? [def.evolvesFrom.weapon] : [];
      }),
    );
    for (const [id, level] of Object.entries(life.itemsAtFirstActEnd)) {
      if (evolvedAway.has(id)) continue;
      expect(life.items[id] ?? 0, id).toBeGreaterThanOrEqual(level);
    }

    // And they are the Conception-only run's figures, which is the claim the
    // report makes about a life.
    const alone = runOnce(policy, 1001, undefined, undefined, [CONCEPTION]);
    expect(life.stacksAtFirstActEnd).toBe(alone.stacksAtEnd);
    expect(life.itemsAtFirstActEnd).toEqual(alone.items);
  }, 60_000);
});
