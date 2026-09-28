import { ACTS, type ActDef } from '../data/acts';
import { actDocument, type ActDocument } from '../data/documents';
import { ITEMS } from '../data/items';
import { xpToNextLevel, type BossState, type World } from '../sim/world';
import { TIME_CUT_SECONDS, bossCheats, type BossCheat } from './boss-cheats';

/**
 * The dev panel's review row (D-030), with no DOM in it, so each control can
 * be tested against a real `World` (`__tests__/review.test.ts`). Imported by
 * `panel.ts` alone, so it rides the panel's lazy chunk; the guard test fails
 * if anything else imports it.
 *
 * Every write here is from outside the sim, as every cheat is, and the panel
 * taints the run for each (`act` in panel.ts). The row moves one person
 * across seven acts to look at them; nothing it does is a number anyone
 * should read as the game's.
 */

/**
 * `start at`: the life the title would start, from `id` on. A fresh life
 * (level 1, the lash), as a restart makes one: the name is the one on the
 * form, and the inheritance is the world's to deal at the life's first
 * crossing, as it always is. Such a life is tainted (`reviewedLife`).
 */
export function lifeFrom(id: string): ActDef[] {
  const i = ACTS.findIndex((act) => act.id === id);
  if (i < 0) throw new Error(`start at: "${id}" is not an act the title can start`);
  return ACTS.slice(i);
}

/** `skip to boss`: the act clock to its length. The boss stands at the end of the next step. */
export function skipToBoss(w: World): void {
  w.time += Math.max(0, w.act.durationSeconds - w.actTime);
}

/**
 * A boss row control by the label the panel shows it under. Throws if the row
 * no longer offers it: a `next act` that silently dropped nothing would read
 * as the boss being slow.
 */
function rowCheat(b: BossState, label: string): BossCheat {
  const cheat = bossCheats(b).find((c) => c.label === label);
  if (!cheat) throw new Error(`next act: the boss row offers no "${label}" for ${b.kind}`);
  return cheat;
}

/**
 * `next act`: `skip to boss`, then the boss row's own control once the boss
 * stands — `kill`, or at Time `−30 s` until its clock reads 0, which the sim
 * latches as the win on its next step (the clock run out, not a kill).
 *
 * The boss is made inside a step the scene takes, so this returns a poll the
 * panel calls until it says done: true once the boss is dropped or already
 * on its way out, or once there is nothing to drop (the life over, or the
 * act no longer the one the press was made in).
 */
export function nextAct(w: World): () => boolean {
  const at = w.actIndex;
  skipToBoss(w);
  return () => {
    const b = w.boss;
    if (w.dead || w.won || w.actIndex !== at) return true;
    if (!b) return false;
    if (b.phase === 'absorbing') return true;
    if (b.kind === 'time') {
      const cut = rowCheat(b, `−${TIME_CUT_SECONDS} s`);
      const presses = Math.ceil(b.secondsLeft / TIME_CUT_SECONDS);
      for (let i = 0; i < presses; i++) cut.apply(b);
    } else {
      rowCheat(b, 'kill').apply(b);
    }
    return true;
  };
}

/**
 * `preview paper`: the playing act's paper as it would read if the act ended
 * now, on its own clock. Null for an act that issues none (Decline: its
 * paper is the certificate).
 */
export function previewPaper(w: World, name: string): ActDocument | null {
  return actDocument(w, name, w.act, w.actTime);
}

/** How many level-ups `level +5` grants. */
export const LEVEL_JUMP = 5;

/**
 * `level +5`: `n` level-ups' worth of XP as one gem at the player's feet —
 * the `level up` button's path, so pickup, `settleXp` and the offer queue
 * run as they would, one card at a time. Worth it after the tax (AUDIT 42),
 * rounded up past float, and priced as `World.xpCost` prices each level
 * after this one (the inheritance's multiplier with it); the test holds this
 * to the world's own count.
 */
export function grantLevels(w: World, n = LEVEL_JUMP): void {
  let need = w.xpToNext - w.xp;
  const price = w.inheritance?.xpMultiplier ?? 1;
  for (let k = 1; k < n; k++) need += Math.round(xpToNextLevel(w.level + k) * price);
  w.gems.push({ x: w.x, y: w.y, value: Math.max(1, Math.ceil(need / w.xpTax + 1e-9)) });
}

/**
 * The four habits born in their acts and kept (README, "Playing"): College's
 * Highlighter, the Office's Calendar Block, Family's Strongly Worded Letter,
 * Decline's Nap. Named here rather than read off `from`: Adolescence's two
 * (Growth Spurt, Snooze) are act-born as well and are not habits.
 */
export const HABITS = ['highlighter', 'calendar-block', 'strongly-worded-letter', 'nap'] as const;

/** `every habit`: each at level 1 if not held, as the items row's `+` writes it. */
export function takeHabits(w: World): void {
  for (const id of HABITS) if (ITEMS[id] && !w.items.has(id)) w.items.set(id, 1);
  w.hp = Math.min(w.hp, w.maxHp);
}
