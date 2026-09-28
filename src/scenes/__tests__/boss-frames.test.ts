import { describe, expect, it } from 'vitest';
import { ACT_VISUALS } from '../../data/act-visuals';
import { ALL_ACTS } from '../../data/acts';
import { ABSORB_SECONDS, bossFrameFor } from '../boss-frames';

/**
 * The frame the boss is drawn in, from the sim's boss state (D-029). Pure, so
 * the swaps the overlays used to stand in for are checked here without a
 * browser; the smoke sees each drawn once.
 */
const EGG = ACT_VISUALS.conception!;
const REORG = ACT_VISUALS.office!;
const MORTGAGE = ACT_VISUALS.family!;
const TIME = ACT_VISUALS.decline!;

describe('bossFrameFor', () => {
  it('the Egg: the holder through the fight, eyes closing as the absorb starts, the corona parting halfway (G-006)', () => {
    for (const phase of ['idle', 'telegraph', 'attack'] as const) {
      expect(bossFrameFor(EGG, 'egg', phase, 0, 0.5)).toBe('boss-egg.png');
    }
    expect(bossFrameFor(EGG, 'egg', 'absorbing', 0, ABSORB_SECONDS)).toBe('boss-egg-closing.png');
    expect(bossFrameFor(EGG, 'egg', 'absorbing', 0, ABSORB_SECONDS / 2 + 0.01)).toBe('boss-egg-closing.png');
    expect(bossFrameFor(EGG, 'egg', 'absorbing', 0, ABSORB_SECONDS / 2)).toBe('boss-egg-parted.png');
    expect(bossFrameFor(EGG, 'egg', 'absorbing', 0, 0.01)).toBe('boss-egg-parted.png');
    // The timer runs past zero on the step that finishes the act.
    expect(bossFrameFor(EGG, 'egg', 'absorbing', 0, -0.02)).toBe('boss-egg-parted.png');
  });

  it('the Reorg: a row per restructure from the bottom, every row on the absorb (G-004)', () => {
    expect(bossFrameFor(REORG, 'reorg', 'idle', 0, 1)).toBe('boss-reorg.png');
    expect(bossFrameFor(REORG, 'reorg', 'attack', 1, 1)).toBe('boss-reorg-grey-1.png');
    expect(bossFrameFor(REORG, 'reorg', 'telegraph', 2, 1)).toBe('boss-reorg-grey-2.png');
    // The panel's kill skips the restructures and lands on every row greyed.
    expect(bossFrameFor(REORG, 'reorg', 'absorbing', 0, ABSORB_SECONDS)).toBe('boss-reorg-grey-3.png');
    expect(bossFrameFor(REORG, 'reorg', 'absorbing', 2, 0.1)).toBe('boss-reorg-grey-3.png');
    // More restructures than rows before the absorb stay on the last one.
    expect(bossFrameFor(REORG, 'reorg', 'idle', 7, 1)).toBe('boss-reorg-grey-3.png');
  });

  it('the Mortgage: the door shut until the absorb, open through it (§4)', () => {
    for (const phase of ['idle', 'telegraph', 'attack'] as const) {
      // Never ajar: nothing owed with a window to run is still a shut door.
      expect(bossFrameFor(MORTGAGE, 'mortgage', phase, 0, 0.3)).toBe('boss-mortgage.png');
    }
    expect(bossFrameFor(MORTGAGE, 'mortgage', 'absorbing', 0, ABSORB_SECONDS)).toBe('boss-mortgage-open.png');
    expect(bossFrameFor(MORTGAGE, 'mortgage', 'absorbing', 0, 0.05)).toBe('boss-mortgage-open.png');
  });

  it('Time: the face without its long hand, from its first frame to its last', () => {
    for (const phase of ['idle', 'absorbing'] as const) {
      expect(bossFrameFor(TIME, 'time', phase, 0, 1)).toBe('boss-time-face.png');
    }
  });

  it('a kind keeps to its own variants, and a boss with none is its holder', () => {
    // An act's frames are read by its boss's kind only: a Reorg's count on
    // another kind, or an absorb on a boss with no variant, draws the holder.
    for (const act of ALL_ACTS) {
      const v = ACT_VISUALS[act.id];
      if (!v || v.bossFrames) continue;
      for (const phase of ['idle', 'absorbing'] as const) {
        expect(bossFrameFor(v, act.boss.kind, phase, 2, 0.1), act.id).toBe(v.bossFrame);
      }
    }
    expect(bossFrameFor(EGG, 'reorg', 'idle', 1, 1)).toBe('boss-egg.png');
    expect(bossFrameFor(REORG, 'egg', 'absorbing', 0, 0.1)).toBe('boss-reorg.png');
    // A variant not drawn falls back: the closing Egg without a parted frame stays closed.
    expect(
      bossFrameFor({ bossFrame: 'e.png', bossFrames: { closing: 'c.png' } }, 'egg', 'absorbing', 0, 0.1),
    ).toBe('c.png');
  });
});
