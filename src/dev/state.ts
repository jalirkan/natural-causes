/**
 * Dev-mode state, with no DOM in it.
 *
 * Separate from `panel.ts` so `ActScene` can hold the state statically while
 * the panel itself stays behind a dynamic import under `reviewMode()`, in a
 * chunk of its own that a page without `?review` never loads (D-030).
 */

export interface DevState {
  /** Sub-steps per frame above 1; a fraction of a step below it. */
  timeScale: number;
  god: boolean;
  /** Clears the enemy array every frame. Free roaming with the horde off. */
  emptyField: boolean;
  /** Holds worn stacks at zero, and tuition's XP tax with them (`World.shedWornStacks`). */
  noDrag: boolean;
  /** Latches on the first cheat. Only a restart clears it. */
  tainted: boolean;
}

export function neutralDevState(): DevState {
  return { timeScale: 1, god: false, emptyField: false, noDrag: false, tainted: false };
}
