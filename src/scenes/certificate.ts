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

/**
 * The certificate on a screen taller than wide — a phone held upright, which is
 * how this game is played. The game renders 1280×720 under FIT, so on a
 * 390×844 phone the whole canvas is 390×219 CSS px and the wide form's printed
 * labels come out at 4 px. The run is over and the world frozen by then, so the
 * form asks for a canvas of the screen's shape, `NARROW_WIDTH` wide, and sets
 * the fields one per row in `NARROW_TYPE`. Leaving the certificate puts
 * 1280×720 back.
 */
export const NARROW_WIDTH = 720;

/** The narrowest upright phone `NARROW_TYPE` is sized for, in CSS px. */
export const NARROW_SCREEN = 360;

/**
 * The narrow form's type, in game px. On a `NARROW_SCREEN` phone a game pixel
 * is half a CSS pixel, so every printed word is at least 12 CSS px and every
 * typed value at least 20 (a test holds the floors: 11 and 18).
 */
export const NARROW_TYPE = {
  /** Every printed word: the labels, the office, the receipt's two heads. */
  print: 24,
  /** A value typed on its rule. */
  value: 40,
  /** The cause, which is what the form is for. */
  cause: 46,
  /** The receipt's prose (`certificateLines`). */
  receipt: 26,
  /** The personal effects, under the prose. */
  effects: 24,
  /** "Certificate of Death", its capitals; the rest is set at 0.78 of it. */
  title: 50,
  /** "tap to live again", on the scrim under the sheet. */
  hint: 32,
} as const;

/**
 * The canvas the certificate asks for on a screen of this CSS size: null when
 * the screen is not taller than wide (the 1280×720 form stands), otherwise
 * `NARROW_WIDTH` wide and as tall as the screen's shape — or as `content`, when
 * the form needs more, which FIT then letterboxes at the sides.
 */
export function narrowCanvas(
  screen: { width: number; height: number },
  content = 0,
): { width: number; height: number } | null {
  if (!(screen.width > 0) || !(screen.height > screen.width)) return null;
  const shaped = Math.round((NARROW_WIDTH * screen.height) / screen.width);
  return { width: NARROW_WIDTH, height: Math.max(shaped, Math.ceil(content)) };
}

/** One field's row on the narrow form: where its label, value and rule sit, and the value's size. */
export interface NarrowRow {
  key: CertificateField['key'];
  /** Top of the printed label. */
  label: number;
  /** Top of the typed value. */
  value: number;
  /** The rule the value sits on. */
  rule: number;
  /** The value's size: `NARROW_TYPE.cause` for the cause, `.value` otherwise. */
  size: number;
}

/**
 * The fields one per row from `top`, in the order given (reading order): the
 * label printed, the value typed under it, the rule under the value, and a
 * gap before the next label. `bottom` is the last rule.
 */
export function narrowRows(fields: readonly CertificateField[], top: number): { rows: NarrowRow[]; bottom: number } {
  const rows: NarrowRow[] = [];
  let y = top;
  for (const f of fields) {
    const size = f.key === 'cause' ? NARROW_TYPE.cause : NARROW_TYPE.value;
    const value = y + NARROW_TYPE.print + 10;
    const rule = value + Math.round(size * 1.25);
    rows.push({ key: f.key, label: y, value, rule, size });
    y = rule + 24;
  }
  return { rows, bottom: rows.length > 0 ? rows[rows.length - 1]!.rule : top };
}
