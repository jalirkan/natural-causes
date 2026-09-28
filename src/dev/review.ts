import { ACTS, type ActDef } from '../data/acts';

/**
 * Review mode (D-030): the dev panel at the link, behind `?review`.
 *
 * The one switch for everything the panel needs outside a dev build: the
 * panel's lazy import in `ActScene`, the cheats applied after the step, the
 * R key mid-run, and the title's line. A dev build is always in review mode,
 * as it was always in dev mode. The game imports this statically, so it
 * holds no cheat and imports nothing under src/dev; the production guard
 * (`__tests__/production.test.ts`) fails if it does.
 *
 * Read once, from the URL the page was loaded at: nothing in the game
 * changes the query, and a flag that could turn on mid-life would mount a
 * panel into a run that had begun honest.
 */

let memo: boolean | undefined;

export function reviewMode(): boolean {
  memo ??=
    import.meta.env.DEV ||
    (typeof location !== 'undefined' && new URLSearchParams(location.search).has('review'));
  return memo;
}

/** What the mode is called on the badge and the panel's head: DEV in a dev build, REVIEW at the link. */
export function modeName(): 'DEV' | 'REVIEW' {
  return import.meta.env.DEV ? 'DEV' : 'REVIEW';
}

/** What the HUD's badge reads on a tainted run. */
export function taintBadge(): string {
  return `${modeName()} · RUN TAINTED`;
}

/** The title's line while the flag is on. */
export const REVIEW_TITLE_LINE = 'review mode · the panel is open · a reviewed life is not recorded';

/**
 * True for a life that does not begin where the title begins one: all of
 * `ACTS`, in order. Only the panel's `start at` makes one. It is tainted from
 * its first frame (`ActScene.create`) and on every restart of it, so R or a
 * tap on the certificate cannot turn a life begun at Family into an ancestor.
 */
export function reviewedLife(life: readonly ActDef[]): boolean {
  return life.length !== ACTS.length || life.some((act, i) => act !== ACTS[i]);
}
