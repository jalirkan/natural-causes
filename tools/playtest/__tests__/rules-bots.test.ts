import { describe, expect, it } from 'vitest';
import { CONCEPTION } from '../../../src/data/acts';
import { ITEMS, POLICIES, runOnce } from '../bots';

/**
 * The bots under a rule (G-055): the World enforces it, so `runOnce` only
 * hands it over. Presence, not calibration: a ruled life runs, ends, and is
 * the ruled game — one weapon under One Trick, taken from the opening offer
 * by the policy's own pick.
 */

const weapons = (items: Record<string, number>): string[] =>
  Object.keys(items).filter((id) => ITEMS[id]?.kind === 'weapon');

describe('runOnce under rules', () => {
  const policy = POLICIES[0]!;

  it('One Trick: the bot answers the opening offer and ends its life holding one weapon', () => {
    const r = runOnce(policy, 1000, undefined, undefined, [CONCEPTION], ['one-trick']);
    expect(r.outcome).not.toBe('alive');
    expect(weapons(r.items)).toHaveLength(1);
  });

  it('Couch Potato: the life runs to an end', () => {
    const r = runOnce(policy, 1000, undefined, undefined, [CONCEPTION], ['couch-potato']);
    expect(r.outcome).not.toBe('alive');
    expect(r.cause).not.toBeNull();
  });

  it('no rules is the run it always was', () => {
    const a = runOnce(policy, 1001, undefined, undefined, [CONCEPTION]);
    const b = runOnce(policy, 1001, undefined, undefined, [CONCEPTION], []);
    expect(b).toEqual(a);
  });
});
