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

/**
 * The 1280×720 form (`ActScene.showCertificate`) on a screen wider than tall.
 * FIT shows the canvas at the screen's height, so a landscape phone (844×390)
 * shows it 693 CSS px across — 0.54 of a CSS pixel per game pixel — and the
 * form's 12–15px print came out at 7–8 CSS px. `wideLayout` raises each size
 * to its floor at the ratio the canvas is shown at (`wideType`); where the
 * raised labels no longer fit the 1280 form's rows it sets the compact form.
 * A canvas shown 1280 CSS px across or more moves nothing: the smoke's
 * `certificate.png` is that form.
 */

/** The wide sheet's width and inner margin, in game px. */
export const WIDE_SHEET = { width: 1120, margin: 48 } as const;

/** The wide form's type on a canvas shown 1280 CSS px across, in game px. */
export const WIDE_TYPE = {
  /** "OFFICE OF VITAL STATISTICS". */
  office: 13,
  /** A field's printed label. */
  label: 14,
  /** The receipt's two heads. */
  head: 12,
  /** The receipt's prose (`certificateLines`). */
  receipt: 18,
  /** The personal effects. */
  effects: 15,
  /** "tap to live again", on the scrim under the sheet. */
  hint: 20,
  /** A value typed on its rule. */
  value: 38,
  /** The cause. */
  cause: 50,
} as const;

export type WideType = Record<keyof typeof WIDE_TYPE, number>;

/**
 * The least a word may come out at on screen, in CSS px: every printed word
 * and the receipt's lines (`print`), every typed value (`value`).
 */
export const WIDE_FLOOR = { print: 11, value: 16 } as const;

/** A canvas monospace's advance, in em (DejaVu, Menlo, Roboto Mono and Courier are all 0.6). */
const MONO = 0.6;

/** A line of `chars` characters of monospace at `px`, letterspaced by `spacing`, estimated. */
function monoWidth(chars: number, px: number, spacing = 0): number {
  return chars * (MONO * px + spacing);
}

/**
 * The wide form's type for a canvas shown at `cssPerGamePx` CSS px per game px
 * (its displayed width over 1280): each size is its 1280 size or its
 * `WIDE_FLOOR` at that ratio, whichever is larger. Never smaller than 1280's.
 */
export function wideType(cssPerGamePx: number): WideType {
  const r = cssPerGamePx > 0 ? Math.min(1, cssPerGamePx) : 1;
  const type = { ...WIDE_TYPE } as WideType;
  for (const k of Object.keys(type) as (keyof WideType)[]) {
    const floor = k === 'value' || k === 'cause' ? WIDE_FLOOR.value : WIDE_FLOOR.print;
    type[k] = Math.max(WIDE_TYPE[k], Math.ceil(floor / r - 1e-9));
  }
  return type;
}

/** One field on the wide form: its box, from the left margin, and where its label, value and rule sit. */
export interface WideRow {
  key: CertificateField['key'];
  /** From the sheet's inner margin. */
  x: number;
  /** The rule's length. */
  w: number;
  /** Top of the printed label. */
  label: number;
  /** Top of the typed value. */
  value: number;
  /** The rule the value sits on. */
  rule: number;
  /** The value's size. */
  size: number;
}

/** Where everything on the wide form goes, in game px; every y includes `top`. */
export interface WideLayout {
  type: WideType;
  /**
   * The 1280 form's middle row (age, act, time) cannot hold its labels at this
   * type: two fields a row — name and age, act and time — and tighter leading.
   */
  compact: boolean;
  /** The sheet's top edge. */
  top: number;
  /** Top of "OFFICE OF VITAL STATISTICS". */
  office: number;
  /** In reading order. */
  rows: WideRow[];
  /** The stamp's centre, beside the cause. */
  stamp: number;
  /** The perforation. */
  perf: number;
  /** Top of the receipt's two heads. */
  receipt: number;
  /** Top of the receipt's prose and of the personal effects. */
  content: number;
  /** Leading of the prose and of the effects. */
  spacing: { prose: number; effects: number };
  /** Paper under the receipt's lowest line. */
  foot: number;
  /** The sheet's bottom edge to the hint's centre. */
  hint: number;
}

/** The 1280 form's vertical rhythm, and the compact form's (in `WideLayout` terms). */
const WIDE_GAPS = {
  top: 30,
  office: 36,
  fields: 136,
  labelGap: 8,
  rowGap: 22,
  perf: 35,
  receipt: 30,
  head: 12,
  prose: 6,
  effects: 5,
  foot: 26,
  hint: 36,
};
const COMPACT_GAPS: typeof WIDE_GAPS = {
  top: 14,
  office: 28,
  fields: 132,
  labelGap: 6,
  rowGap: 16,
  perf: 28,
  receipt: 26,
  head: 8,
  prose: 3,
  effects: 3,
  foot: 22,
  hint: 30,
};

/**
 * The wide form for a canvas shown at `cssPerGamePx` (see `wideType`). The
 * 1280 form sets the name, then age, act and time, then the cause; when the
 * raised labels overrun that middle row's boxes, the compact form sets the
 * name beside the age and the act beside the time, the right-hand fields on
 * one column as wide as the longer of their labels.
 */
export function wideLayout(fields: readonly CertificateField[], cssPerGamePx: number): WideLayout {
  const type = wideType(cssPerGamePx);
  const room = WIDE_SHEET.width - 2 * WIDE_SHEET.margin;
  const labelWidth = (key: CertificateField['key']) => {
    const i = fields.findIndex((f) => f.key === key);
    return i < 0 ? 0 : monoWidth(`${i + 1}. ${fields[i]!.label}`.length, type.label, 1);
  };
  type Box = { x: number; w: number };
  const wide: Record<CertificateField['key'], Box> = {
    name: { x: 0, w: room },
    age: { x: 0, w: 220 },
    act: { x: 256, w: 372 },
    time: { x: 664, w: room - 664 },
    cause: { x: 0, w: room },
  };
  const keys = Object.keys(wide) as CertificateField['key'][];
  const compact = keys.some((k) => labelWidth(k) > wide[k].w);
  let boxes = wide;
  let lines: CertificateField['key'][][] = [['name'], ['age', 'act', 'time'], ['cause']];
  if (compact) {
    const split = room - Math.ceil(Math.max(labelWidth('age'), labelWidth('time')));
    const left = { x: 0, w: split - 36 };
    const right = { x: split, w: room - split };
    boxes = { name: left, age: right, act: left, time: right, cause: { x: 0, w: room } };
    lines = [['name', 'age'], ['act', 'time'], ['cause']];
  }
  const g = compact ? COMPACT_GAPS : WIDE_GAPS;
  const sizeOf = (k: CertificateField['key']) => (k === 'cause' ? type.cause : type.value);
  const placed = new Map<CertificateField['key'], WideRow>();
  let y = g.top + g.fields;
  for (const line of lines) {
    const value = y + type.label + g.labelGap;
    const rule = value + Math.round(Math.max(...line.map(sizeOf)) * 1.25);
    for (const k of line) placed.set(k, { key: k, ...boxes[k], label: y, value, rule, size: sizeOf(k) });
    y = rule + g.rowGap;
  }
  const rows = fields.map((f) => placed.get(f.key)!).filter(Boolean);
  const cause = placed.get('cause')!;
  const perf = cause.rule + g.perf;
  const receipt = perf + g.receipt;
  return {
    type,
    compact,
    top: g.top,
    office: g.top + g.office,
    rows,
    stamp: cause.value + 24,
    perf,
    receipt,
    content: receipt + type.head + g.head,
    spacing: { prose: g.prose, effects: g.effects },
    foot: g.foot,
    hint: g.hint,
  };
}

/**
 * The personal effects' column beside the receipt's prose, which is `prose` px
 * wide: where it starts, from the inner margin (472 at 1280, or clear of the
 * prose), and how many characters of the effects' type a line of it holds.
 */
export function effectsColumn(prose: number, type: WideType): { x: number; chars: number } {
  const room = WIDE_SHEET.width - 2 * WIDE_SHEET.margin;
  const x = Math.max(472, Math.ceil(prose) + 36);
  return { x, chars: Math.min(58, Math.floor((room - x) / (MONO * type.effects))) };
}
