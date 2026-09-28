import type { BossDef } from '../data/acts';
import type { BossState } from '../sim/world';

/**
 * The dev panel's boss row, with no DOM in it: what the row reads and which
 * cheats it offers for the boss standing, so the choice per kind and every
 * write can be tested against a real `World` (`__tests__/boss-cheats.test.ts`).
 * Imported by `panel.ts` alone (and by `review-cheats.ts`, which the panel
 * alone imports), so it rides the panel's lazy chunk, loaded only under
 * `reviewMode()` (D-030); the guard test fails if anything else imports it.
 *
 * Every write here is from outside the sim, as every cheat is, and the panel
 * taints the run for each (`act` in panel.ts). None goes through the boss's
 * damage gate — `World.bossTakes` is private — so a write here skips the mark
 * (AUDIT 101), the Mortgage's cap (75) and a shield.
 */

export interface BossCheat {
  /** The button's text. The smoke presses `−50%` and `kill` by it: keep both. */
  label: string;
  /** The button's hover: what it writes. Every one is a cheat. */
  hint: string;
  apply: (b: BossState) => void;
}

/** What `−30 s` takes off Time's clock. */
export const TIME_CUT_SECONDS = 30;

/**
 * What `miss window` leaves on the Mortgage's window clock: a few steps, so
 * the window closes almost at once, through `closeWindow` as a real one does.
 */
export const MISS_WINDOW_SECONDS = 0.05;

/**
 * `hurt boss` takes a third of the maximum and this hair more of it, so a
 * press from full lands at or under two thirds, and a second at or under one
 * third, in spite of float: 352 − 352/3 is a hair over 2/3 of 352, and the
 * Reorg's watcher (`hp / maxHp <= threshold`) would not restructure on it.
 */
const HURT_SLACK = 1e-9;

/** The absorb every boss exits through (`bossTakes`, `timePhase`): 1.8s. */
const ABSORB_SECONDS = 1.8;

/**
 * The row's readout. Time has no health (its hp is BOSS_HP, inert): its bar
 * is its clock, rounded up as the HUD rounds it. The Mortgage adds windows
 * paid, so a forced miss can be seen not to pay. Every other kind: hp, both
 * sides rounded (the Loan's cap is its opening times `cap`, a float).
 */
export function bossReadout(b: BossState, def?: BossDef): string {
  if (b.kind === 'time') return `time · ${Math.ceil(Math.max(0, b.secondsLeft))} s`;
  const hp = `${Math.ceil(b.hp)} / ${Math.round(b.maxHp)} hp`;
  return def?.kind === 'mortgage' ? `${hp} · paid ${b.paid}/${def.instalments}` : hp;
}

/**
 * Health written straight down by half the maximum, never below 1 (a write to
 * 0 would not latch: only the gate does). At the Mortgage it counts as six
 * instalments at the window's end and snaps to a whole twelfth there (AUDIT
 * 75); the smoke uses it at the Reorg to cross one threshold.
 */
const HALVE: BossCheat = {
  label: '−50%',
  hint: 'cheat: health written down by half its maximum (not below 1), skipping the damage gate',
  apply: (b) => {
    b.hp = Math.max(1, b.hp - b.maxHp / 2);
  },
};

/**
 * A third of the maximum, written as `−50%` writes: the gate is private, so
 * this skips it, a shield included. From full, one press crosses the Reorg's
 * two-thirds line and a second its one third; the Gym Teacher's whistle
 * interval reads the health left. At the Loan a third of the cap is the
 * whole opening balance, so one press there pays it down to 1.
 */
const HURT: BossCheat = {
  label: 'hurt boss',
  hint: 'cheat: a third of its maximum health written off directly (not below 1), skipping the damage gate and any shield',
  apply: (b) => {
    b.hp = Math.max(1, b.hp - (b.maxHp / 3) * (1 + HURT_SLACK));
  },
};

/**
 * The same transition the damage paths make, so the absorb and the win both
 * run for real. At the Mortgage the absorb derives every window paid from hp
 * 0 (`updateBoss`). At Time, hp 0 is read as the clock run out, and the clock
 * is written to 0 with it so the readout and the HUD's bar say so through the
 * exit rather than the seconds that were left.
 */
const KILL: BossCheat = {
  label: 'kill',
  hint: 'cheat: the boss’s exit, now',
  apply: (b) => {
    b.hp = 0;
    b.phase = 'absorbing';
    b.timer = ABSORB_SECONDS;
    if (b.kind === 'time') b.secondsLeft = 0;
  },
};

/**
 * Time's clock, thirty seconds shorter, held at 0. The sim ends the life won
 * on its next step from 0 (`timePhase`: the clock at 0 latches `absorbing`).
 * The hand and the file run on their own sum (`handSeconds`), so the hand
 * does not jump and no knees are filed for the seconds taken.
 */
const CUT_TIME: BossCheat = {
  label: `−${TIME_CUT_SECONDS} s`,
  hint: `cheat: ${TIME_CUT_SECONDS} seconds off Time’s clock (not below 0)`,
  apply: (b) => {
    b.secondsLeft = Math.max(0, b.secondsLeft - TIME_CUT_SECONDS);
  },
};

/**
 * The Mortgage's window, missed: it closes within MISS_WINDOW_SECONDS with
 * nothing accepted, so `closeWindow` builds its room, sends a bill from the
 * door and pays nothing. What this window had already accepted is given back
 * to hp first, as `closeWindow` gives back a short window's: zeroing
 * `accepted` alone would leave that damage off the health, and `paid` is read
 * off the health by rounding (AUDIT 73), so a window met or more than half
 * met would count as paid — and billed as missed. The player's own fire in
 * the few steps before it closes still goes through the gate; a build that
 * meets a whole instalment in them pays the window anyway.
 */
const MISS_WINDOW: BossCheat = {
  label: 'miss window',
  hint: 'cheat: this window’s payment refunded and the window closed unpaid (a room, and a bill at the door)',
  apply: (b) => {
    b.hp += b.accepted;
    b.accepted = 0;
    b.windowTimer = MISS_WINDOW_SECONDS;
  },
};

/**
 * The boss row's buttons for the boss standing, in order, kill last. Time:
 * `−30 s` in place of `−50%` (its health is inert; AUDIT 95, 127). The
 * Mortgage: `miss window` beside `−50%`. Every other kind: `hurt boss` beside
 * `−50%`. The added ones are gone once the outcome has latched (`absorbing`):
 * nothing they write is read after it. `−50%` and `kill` stay as they were.
 */
export function bossCheats(b: BossState): BossCheat[] {
  const live = b.phase !== 'absorbing';
  if (b.kind === 'time') return live ? [CUT_TIME, KILL] : [KILL];
  const added = b.kind === 'mortgage' ? MISS_WINDOW : HURT;
  return live ? [HALVE, added, KILL] : [HALVE, KILL];
}
