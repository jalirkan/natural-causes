import type { Certificate } from '../sim/world';

/**
 * The words the life ends on, and the age the HUD shows while it lasts.
 *
 * Kept out of `ActScene` for the reason `touch.ts` is: the scene cannot run in
 * CI and this can. The sim writes the record (`World.certificate`); this only
 * decides how it reads. No Phaser here.
 */

/** Whole years. Nobody is "nine and a half" on a certificate. */
export function ageYears(age: number): number {
  return Math.max(0, Math.floor(age + 1e-9));
}

/** The HUD's clock: the life is measured in years now, not minutes (D-024). */
export function hudAge(age: number): string {
  return `age ${ageYears(age)}`;
}

/**
 * The certificate's two lines. A death names what did it; outliving the last
 * act is natural causes, which is the win.
 */
export function certificateLines(c: Certificate): [string, string] {
  const age = `Age ${ageYears(c.age)}.`;
  if (c.outcome === 'won') return ['Natural causes.', age];
  return [`Cause of death: ${c.cause}.`, age];
}

/** Life clock as m:ss, for the receipt under the certificate. */
export function lifeClock(seconds: number): string {
  const m = Math.floor(seconds / 60);
  const s = Math.floor(seconds % 60);
  return `${m}:${s.toString().padStart(2, '0')}`;
}
