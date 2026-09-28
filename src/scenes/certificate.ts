import type { Certificate } from '../sim/world';
import { RULES, type RunRules } from '../sim/rules';

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
 * The rules the life is played under (G-055), as the HUD names them while it
 * lasts: each rule's name, lower case as the HUD's other labels are, joined
 * as the worn line joins its terms. Empty for a plain life, which shows none.
 */
export function hudRules(rules: RunRules): string {
  return rules.map((id) => RULES[id].name.toLowerCase()).join(' · ');
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

/**
 * The rules the life was played under (G-055), as the form types them: each
 * rule's `certificate` line from the registry, in the order the life holds
 * them. Empty for a plain life, and then the form prints nothing for them.
 */
export function certificateConditions(c: Certificate): string[] {
  return c.rules.map((id) => RULES[id].certificate);
}

/**
 * Printed before the conditions, beside the cause: what the examiner noted
 * that did not kill you. One short word, so that on the wide form the cause's
 * label, it and both rules share one line clear of the stamp on the smallest
 * phone held sideways (a canvas shown at half size).
 */
export const CONDITIONS_LABEL = 'NOTED';

/** The word stamped across the form: the win says what it was, a death is only filed. */
export function certificateStamp(c: Certificate): string {
  return c.outcome === 'won' ? 'NATURAL CAUSES' : 'FILED';
}

/**
 * The build as the receipt lists it, one entry per item ("Reflex 1"), packed
 * into lines of at most `width` characters joined by `separator` (" · "). An
 * entry is never split; one longer than the width gets a line to itself. The
 * conditions (G-055) are packed the same way, word by word, joined by a space.
 */
export function effectLines(entries: string[], width: number, separator = ' · '): string[] {
  const lines: string[] = [];
  let line = '';
  for (const e of entries) {
    const next = line ? `${line}${separator}${e}` : e;
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
 * The conditions (G-055) at the cause, on either form: where the printed
 * label (`CONDITIONS_LABEL`) and the typed lines sit. `labelX` and `x` are
 * from the inner margin; `bottom` is under the last typed line.
 */
export interface ConditionsBlock {
  /** The printed label's left edge. */
  labelX: number;
  /** Top of the printed label. */
  label: number;
  /** The typed lines' left edge. */
  x: number;
  /** Top of the first typed line. */
  value: number;
  /** `certificateConditions`, packed to the room there is, run on with a space. */
  lines: string[];
  /** Leading between typed lines. */
  spacing: number;
  bottom: number;
}

/**
 * The conditions as a typist runs them on: one sentence after another, a
 * space between, broken between words to lines of at most `chars`.
 */
function typedLines(conditions: readonly string[], chars: number): string[] {
  return effectLines(conditions.join(' ').split(' '), chars, ' ');
}

/** A canvas text line with its ascent and descent: 1.3 em, as the tests below measure headless Chromium. */
function lineHeight(px: number): number {
  return Math.ceil(1.3 * px);
}

/**
 * The narrow form's conditions, from `top` (the cause's rule) across a column
 * `width` wide: the label printed as every narrow label is, the lines typed
 * at the receipt's size under it, and the stamp's band under them (the
 * canvas grows to hold it). Null for a plain life: nothing is printed and
 * nothing under the cause moves.
 */
export function narrowConditions(conditions: readonly string[], top: number, width: number): ConditionsBlock | null {
  if (conditions.length === 0) return null;
  const lines = typedLines(conditions, Math.floor(width / (MONO * NARROW_TYPE.receipt)));
  const spacing = 6;
  const label = top + 18;
  const value = label + NARROW_TYPE.print + 10;
  const bottom = value + lines.length * lineHeight(NARROW_TYPE.receipt) + (lines.length - 1) * spacing;
  return { labelX: 0, label, x: 0, value, lines, spacing, bottom };
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

/**
 * How far along the cause's label line the conditions may run, from the inner
 * margin: short of the stamp beside the cause. Tilted 8° up to the right, its
 * top edge climbs into that line's band from below — NATURAL CAUSES (366
 * wide, framed) at 764 at 1280 and at 734 on a landscape phone, FILED's
 * corner at 743 — so everything typed there ends before 720.
 */
const CONDITIONS_LINE_END = 720;

/**
 * What the stamp keeps beside the cause, from the right of the inner margin,
 * for conditions set under the cause's rule instead: the widest stamp and its
 * 40 in from the margin, and a gap.
 */
const STAMP_ROOM = 420;

/**
 * `showCertificate` draws the form's inner frame 21 above the tear; a line
 * under the cause's rule keeps 4 clear of it, and the tear moves down for it.
 */
const FRAME_INSET = 25;

/** A line of `chars` characters of monospace at `px`, letterspaced by `spacing`, estimated. */
function monoWidth(chars: number, px: number, spacing = 0): number {
  return chars * (MONO * px + spacing);
}

/**
 * The HUD's worn line (`hudDrag`, 13px, right-aligned 16 in from the canvas's
 * right edge): its terms joined by " · " on one line, as 1280×720 draws it —
 * or, on an upright phone's canvas (a paper, the pause sheet or the narrow
 * certificate holding it at `NARROW_WIDTH`), packed as `effectLines` packs the
 * receipt into `NARROW_WORN_CHARS`, so it stays right of the clock and the
 * boss's label, which stand at the canvas's middle there.
 */
export function wornText(terms: string[], narrow: boolean): string {
  return narrow ? effectLines(terms, NARROW_WORN_CHARS).join('\n') : terms.join(' · ');
}

/**
 * Characters of 13px monospace (0.6 em) from the worn line's anchor, 16 in on
 * a `NARROW_WIDTH` canvas, to 12 clear of what is centred on it: the clock
 * ("age 84", 24px letterspaced 3, 104 wide) and under it the boss's label
 * ("time · 60 seconds" at 12px, 123 wide), each reaching at most 62 right of
 * the middle.
 */
export const NARROW_WORN_CHARS = Math.floor((NARROW_WIDTH / 2 - 16 - 62 - 12) / (MONO * 13));

/**
 * The pause sheet's type (`buildPauseSheet`), as a multiple of its 1280 sizes,
 * for a canvas shown at `cssPerGamePx` CSS px per game px: 1.7 on an upright
 * phone's canvas (`narrow`), where its 13px lines come out at 11 CSS px on a
 * `NARROW_SCREEN` phone; otherwise the least that sets those lines at
 * `WIDE_FLOOR.print`, as the certificate's and the papers' type is raised on
 * a landscape phone, and never less than 1. A sheet too long to stand whole
 * at the raised size is set at 1 and scaled to fit, as it always was: raised
 * and then scaled, it came out smaller than that.
 */
export function pauseTypeScale(cssPerGamePx: number, narrow: boolean): number {
  if (narrow) return 1.7;
  const r = cssPerGamePx > 0 ? Math.min(1, cssPerGamePx) : 1;
  return Math.max(1, WIDE_FLOOR.print / (13 * r));
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
  /**
   * The conditions (G-055) on the cause's label line, after the label and
   * short of the stamp — or, too long for it, under the cause's rule with the
   * tear moved down. Null for a plain life, whose form is exactly the one
   * before rules existed.
   */
  conditions: ConditionsBlock | null;
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
export function wideLayout(
  fields: readonly CertificateField[],
  cssPerGamePx: number,
  conditions: readonly string[] = [],
): WideLayout {
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
  const cond = conditions.length > 0 ? wideConditions(conditions, cause, labelWidth('cause'), type, g) : null;
  // On the label line the conditions cost nothing and the tear stays put;
  // under the rule, the tear moves down to keep the frame clear of them.
  const under = cond !== null && cond.label > cause.rule;
  const perf = Math.max(cause.rule + g.perf, under ? cond.bottom + FRAME_INSET : 0);
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
    conditions: cond,
    spacing: { prose: g.prose, effects: g.effects },
    foot: g.foot,
    hint: g.hint,
  };
}

/**
 * The wide form's conditions. Where a form's examiner would note them: on the
 * cause's own label line, after "5. CAUSE OF DEATH", the label printed and
 * the rules typed at the labels' size, ending before the stamp
 * (`CONDITIONS_LINE_END`). That costs the form no height, which it has little
 * of to spare: under the cause's rule sits the form's double frame, at 1280
 * the sheet is 12px from its cap, and a landscape phone's compact form holds
 * the longest build with 5px left. Rules too long for
 * that line go under the cause's rule, left of the stamp (`STAMP_ROOM`), and
 * the tear moves down for them (`FRAME_INSET`).
 */
function wideConditions(
  conditions: readonly string[],
  cause: WideRow,
  causeLabel: number,
  type: WideType,
  g: typeof WIDE_GAPS,
): ConditionsBlock {
  const line = lineHeight(type.label);
  const spacing = 2;
  const typed = conditions.join(' ');
  const labelX = cause.x + Math.ceil(causeLabel) + 16;
  const x = labelX + Math.ceil(monoWidth(CONDITIONS_LABEL.length, type.label, 1)) + 8;
  if (x + monoWidth(typed.length, type.label) <= CONDITIONS_LINE_END) {
    return { labelX, label: cause.label, x, value: cause.label, lines: [typed], spacing, bottom: cause.label + line };
  }
  const room = WIDE_SHEET.width - 2 * WIDE_SHEET.margin - STAMP_ROOM;
  const lines = typedLines(conditions, Math.floor(room / (MONO * type.label)));
  const label = cause.rule + g.labelGap;
  const value = label + line + spacing;
  const bottom = value + lines.length * line + (lines.length - 1) * spacing;
  return { labelX: cause.x, label, x: cause.x, value, lines, spacing, bottom };
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
