import type { BossDef } from '../data/acts';
import type { ActVisuals } from '../data/act-visuals';
import type { BossState } from '../sim/world';

/**
 * The absorb's length, seconds: every boss's exit (`BossState.phase`), set to
 * 1.8 wherever the sim latches it (world.ts `bossTakes`, `closeWindow`,
 * `timePhase`) and by the dev panel's kill. The Egg's halfway is half of it.
 */
export const ABSORB_SECONDS = 1.8;

/**
 * Which of its frames the boss is drawn in this frame (D-029): the holder
 * (`ActVisuals.bossFrame`) or one of its variants (`bossFrames`), chosen from
 * the sim's boss state alone. `ActScene.syncBoss` swaps the sprite to it on
 * the frame it changes; the variants share the holder's size, bounds and
 * body, so the swap is the only thing that moves. No Phaser here, so it runs
 * under the unit tests (src/scenes/__tests__/boss-frames.test.ts).
 *
 * Keyed on the boss kind, so a variant follows its behaviour and nothing
 * else's, and on the frame being there: a kind whose act has no such variant
 * draws the holder, as every boss did before its variants were drawn.
 *
 * - The Egg (G-006): its eyes close as the absorb begins (`closing`), and its
 *   corona parts halfway through it (`parted`).
 * - The Reorg (G-004): each restructure greys the next row up, bottom first
 *   (`grey[0]`, then `grey[1]`), and the absorb greys them all (the last);
 *   the dev panel's kill skips the restructures and lands there too. It reads
 *   the count, not the health, so a row greys when the chart moves and stays
 *   grey (the chart stays).
 * - The Mortgage (FAMILY-ROSTER §4): the door is shut until the window closes
 *   on the twelfth payment, which is the absorb (`open`). Never ajar: the last
 *   instalment met with a window still to run leaves the door shut until that
 *   window closes, and a life that ends before it (a death) never opens it.
 * - Time (DECLINE-ROSTER §4): the face without its long hand (`face`) for its
 *   whole fight, absorb included; the renderer draws the hand that turns.
 */
export function bossFrameFor(
  visuals: Pick<ActVisuals, 'bossFrame' | 'bossFrames'>,
  kind: BossDef['kind'],
  phase: BossState['phase'],
  restructures: number,
  timer: number,
): string {
  const base = visuals.bossFrame;
  const v = visuals.bossFrames;
  if (!v) return base;
  const absorbing = phase === 'absorbing';
  switch (kind) {
    case 'egg': {
      if (!absorbing) return base;
      const closing = v.closing ?? base;
      return timer > ABSORB_SECONDS / 2 ? closing : (v.parted ?? closing);
    }
    case 'reorg': {
      const grey = v.grey ?? [];
      if (grey.length === 0) return base;
      if (absorbing) return grey[grey.length - 1]!;
      if (!(restructures >= 1)) return base;
      return grey[Math.min(restructures, grey.length) - 1]!;
    }
    case 'mortgage':
      return absorbing ? (v.open ?? base) : base;
    case 'time':
      return v.face ?? base;
    default:
      return base;
  }
}
