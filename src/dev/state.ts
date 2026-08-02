/**
 * Dev-mode state, with no DOM in it.
 *
 * Separate from `panel.ts` so `ActScene` can hold the state statically while
 * the panel itself stays behind a dynamic `import.meta.env.DEV` branch and out
 * of production bundles.
 */

export interface DevState {
  /** Sub-steps per frame above 1; a fraction of a step below it. */
  timeScale: number;
  god: boolean;
  /** Clears the enemy array every frame. Free roaming with the horde off. */
  emptyField: boolean;
  /** Holds antibody stacks at zero — they are the act's main mobility tax. */
  noDrag: boolean;
  /** Latches on the first cheat. Only a restart clears it. */
  tainted: boolean;
}

export function neutralDevState(): DevState {
  return { timeScale: 1, god: false, emptyField: false, noDrag: false, tainted: false };
}
