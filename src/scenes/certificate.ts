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

/** One ruled field on the form: what is printed under the line and what is typed on it. */
export interface CertificateField {
  key: 'name' | 'age' | 'act' | 'time' | 'cause';
  /** Printed, and in capitals, as a form prints it. */
  label: string;
  /** Typed on the rule. Empty leaves the rule blank. */
  value: string;
}

/** What the form prints that the sim's record does not hold. */
export interface CertificateExtras {
  /** The name given at the title (`src/meta/name.ts`). Absent: the rule is left blank. */
  name?: string;
  /** Seconds lived (`World.time`), for the time-of-death line. */
  lived: number;
}

/**
 * The form's fields, in reading order (G-002, G-038). `certificateLines` is the
 * certificate as prose and stays the receipt's; this is the same record as a
 * form, so a value carries no full stop and the cause is the cause alone. A
 * win is still a death — natural causes is what it was of, which is the joke —
 * so the fields are the same fields either way.
 */
export function certificateFields(c: Certificate, extras: CertificateExtras): CertificateField[] {
  return [
    { key: 'name', label: 'NAME OF DECEASED', value: extras.name?.trim() ?? '' },
    { key: 'age', label: 'AGE, LAST BIRTHDAY', value: String(ageYears(c.age)) },
    { key: 'act', label: 'ACT', value: c.actName },
    { key: 'time', label: 'TIME OF DEATH, FROM CONCEPTION', value: lifeClock(extras.lived) },
    { key: 'cause', label: 'CAUSE OF DEATH', value: c.outcome === 'won' ? 'Natural causes' : c.cause },
  ];
}

/** The word stamped across the form: the win says what it was, a death is only filed. */
export function certificateStamp(c: Certificate): string {
  return c.outcome === 'won' ? 'NATURAL CAUSES' : 'FILED';
}

/**
 * The build as the receipt lists it, one entry per item ("Reflex 1"), packed
 * into lines of at most `width` characters joined by " · ". An entry is never
 * split; one longer than the width gets a line to itself.
 */
export function effectLines(entries: string[], width: number): string[] {
  const lines: string[] = [];
  let line = '';
  for (const e of entries) {
    const next = line ? `${line} · ${e}` : e;
    if (line && next.length > width) {
      lines.push(line);
      line = e;
    } else {
      line = next;
    }
  }
  if (line) lines.push(line);
  return lines;
}
