import { describe, expect, it } from 'vitest';
import {
  ageYears,
  certificateFields,
  certificateLines,
  certificateStamp,
  effectLines,
  hudAge,
  lifeClock,
  NARROW_SCREEN,
  NARROW_TYPE,
  NARROW_WIDTH,
  narrowCanvas,
  narrowRows,
  NARROW_WORN_CHARS,
  effectsColumn,
  pauseTypeScale,
  WIDE_FLOOR,
  WIDE_SHEET,
  WIDE_TYPE,
  wideLayout,
  wideType,
  wornText,
} from '../certificate';
import { CONCEPTION, SCHOOL } from '../../data/acts';
import { World, type Certificate } from '../../sim/world';

const base: Certificate = {
  outcome: 'died',
  actId: 'school',
  actName: 'School',
  actIndex: 1,
  age: 9.7,
  causeId: 'homework',
  cause: 'Homework',
};

describe('certificateLines', () => {
  it('names the cause and the whole age on a death', () => {
    expect(certificateLines(base)).toEqual(['Cause of death: Homework.', 'Age 9.']);
  });

  it('names the boss by its act name', () => {
    expect(certificateLines({ ...base, causeId: 'boss', cause: 'The Gym Teacher', age: 12 })).toEqual([
      'Cause of death: The Gym Teacher.',
      'Age 12.',
    ]);
  });

  it('is natural causes when the last act is outlived', () => {
    expect(
      certificateLines({ ...base, outcome: 'won', causeId: 'natural-causes', cause: 'natural causes', age: 12 }),
    ).toEqual(['Natural causes.', 'Age 12.']);
  });
});

describe('age', () => {
  it('floors to whole years and never goes negative', () => {
    expect(ageYears(0)).toBe(0);
    expect(ageYears(4.999)).toBe(4);
    expect(ageYears(5)).toBe(5);
    expect(ageYears(-0.1)).toBe(0);
    expect(hudAge(7.4)).toBe('age 7');
  });

  it('reads the certificate a real death writes', () => {
    // A life of two acts, killed early in the second: the renderer prints
    // what the sim recorded, and the age is School's, not Conception's.
    const w = new World({ acts: [CONCEPTION, SCHOOL], seed: 3 });
    w.actIndex = 1;
    w.actTime = 0;
    w.hp = 0.01;
    for (let i = 0; i < 2000 && !w.dead; i++) w.step(1 / 60, { moveX: 0, moveY: 0 });
    expect(w.certificate).not.toBeNull();
    const [cause, age] = certificateLines(w.certificate!);
    expect(cause).toMatch(/^Cause of death: .+\.$/);
    expect(age).toMatch(/^Age (5|6|7|8|9|10|11|12)\.$/);
  });
});

describe('lifeClock', () => {
  it('is m:ss', () => {
    expect(lifeClock(0)).toBe('0:00');
    expect(lifeClock(605.9)).toBe('10:05');
  });
});

describe('certificateFields', () => {
  const won: Certificate = { ...base, outcome: 'won', actName: 'Adolescence', causeId: 'natural-causes', cause: 'natural causes', age: 18.2 };

  it('is the form in reading order: name, age, act, time, cause', () => {
    expect(certificateFields(base, { name: 'Justin', lived: 252.9 })).toEqual([
      { key: 'name', label: 'NAME OF DECEASED', value: 'Justin' },
      { key: 'age', label: 'AGE, LAST BIRTHDAY', value: '9' },
      { key: 'act', label: 'ACT', value: 'School' },
      { key: 'time', label: 'TIME OF DEATH, FROM CONCEPTION', value: '4:12' },
      { key: 'cause', label: 'CAUSE OF DEATH', value: 'Homework' },
    ]);
  });

  it('leaves the name rule blank when there is no name', () => {
    expect(certificateFields(base, { lived: 0 })[0]!.value).toBe('');
    expect(certificateFields(base, { name: '  ', lived: 0 })[0]!.value).toBe('');
  });

  it('is the same form on a win, and the cause is natural causes', () => {
    const f = certificateFields(won, { name: 'Nobody', lived: 855 });
    expect(f.map((x) => x.key)).toEqual(['name', 'age', 'act', 'time', 'cause']);
    expect(f.find((x) => x.key === 'cause')!.value).toBe('Natural causes');
    expect(f.find((x) => x.key === 'age')!.value).toBe('18');
    expect(f.find((x) => x.key === 'time')!.value).toBe('14:15');
  });

  it('agrees with the prose it sits beside', () => {
    // The receipt under the form prints certificateLines; the two must not disagree.
    for (const c of [base, won]) {
      const f = certificateFields(c, { lived: 60 });
      const [cause, age] = certificateLines(c);
      expect(cause).toContain(f.find((x) => x.key === 'cause')!.value);
      expect(age).toBe(`Age ${f.find((x) => x.key === 'age')!.value}.`);
    }
  });

  it('stamps a win NATURAL CAUSES and files a death', () => {
    expect(certificateStamp(won)).toBe('NATURAL CAUSES');
    expect(certificateStamp(base)).toBe('FILED');
  });
});

describe('effectLines', () => {
  it('packs entries into lines without splitting one', () => {
    expect(effectLines(['Reflex 1', 'Late Bloomer 1', 'Tail 3'], 30)).toEqual(['Reflex 1 · Late Bloomer 1', 'Tail 3']);
    expect(effectLines(['A very long entry indeed'], 10)).toEqual(['A very long entry indeed']);
    expect(effectLines([], 40)).toEqual([]);
  });
});

describe('the narrow certificate', () => {
  it('asks for a portrait canvas only when the screen is taller than wide', () => {
    expect(narrowCanvas({ width: 1280, height: 720 })).toBeNull();
    expect(narrowCanvas({ width: 844, height: 390 })).toBeNull();
    expect(narrowCanvas({ width: 600, height: 600 })).toBeNull();
    expect(narrowCanvas({ width: 0, height: 844 })).toBeNull();
    expect(narrowCanvas({ width: 390, height: 844 })).toEqual({ width: NARROW_WIDTH, height: 1558 });
  });

  it('is as tall as the form when the screen is stubbier than it', () => {
    expect(narrowCanvas({ width: 390, height: 664 }, 1400.2)).toEqual({ width: NARROW_WIDTH, height: 1401 });
    expect(narrowCanvas({ width: 390, height: 844 }, 1400)).toEqual({ width: NARROW_WIDTH, height: 1558 });
  });

  it('reads on the narrowest phone it is sized for: print at 11 CSS px or more, values at 18', () => {
    // FIT sets NARROW_WIDTH game px across NARROW_SCREEN CSS px.
    const css = (px: number) => (px * NARROW_SCREEN) / NARROW_WIDTH;
    for (const px of [NARROW_TYPE.print, NARROW_TYPE.receipt, NARROW_TYPE.effects, NARROW_TYPE.hint])
      expect(css(px)).toBeGreaterThanOrEqual(11);
    for (const px of [NARROW_TYPE.value, NARROW_TYPE.cause]) expect(css(px)).toBeGreaterThanOrEqual(18);
  });

  it('stacks the fields one per row, in reading order, none overlapping', () => {
    const fields = certificateFields(base, { name: 'Justin', lived: 252.9 });
    const { rows, bottom } = narrowRows(fields, 100);
    expect(rows.map((r) => r.key)).toEqual(['name', 'age', 'act', 'time', 'cause']);
    expect(rows[0]!.label).toBe(100);
    let above = -Infinity;
    for (const r of rows) {
      expect(r.label).toBeGreaterThan(above);
      expect(r.value - r.label).toBeGreaterThanOrEqual(NARROW_TYPE.print);
      expect(r.rule - r.value).toBeGreaterThanOrEqual(r.size);
      above = r.rule;
    }
    expect(rows.find((r) => r.key === 'cause')!.size).toBe(NARROW_TYPE.cause);
    expect(rows.find((r) => r.key === 'age')!.size).toBe(NARROW_TYPE.value);
    expect(bottom).toBe(rows[4]!.rule);
    expect(narrowRows([], 50)).toEqual({ rows: [], bottom: 50 });
  });
});

describe('the wide certificate', () => {
  const fields = certificateFields(base, { name: 'Justin', lived: 252.9 });
  // FIT on an 844×390 landscape phone: the 16:9 canvas at the screen's height.
  const landscape = (390 * 16) / 9 / 1280;
  const room = WIDE_SHEET.width - 2 * WIDE_SHEET.margin;

  it('is the 1280 form, unmoved, on a canvas shown 1280 CSS px across or more', () => {
    for (const r of [1, 1.5]) {
      const lay = wideLayout(fields, r);
      expect(wideType(r)).toEqual(WIDE_TYPE);
      expect(lay.type).toEqual(WIDE_TYPE);
      expect(lay.compact).toBe(false);
      // The numbers showCertificate had before it scaled: the smoke's certificate.png.
      expect(lay.rows.map(({ key, x, w, label, value, rule, size }) => [key, x, w, label, value, rule, size])).toEqual([
        ['name', 0, 1024, 166, 188, 236, 38],
        ['age', 0, 220, 258, 280, 328, 38],
        ['act', 256, 372, 258, 280, 328, 38],
        ['time', 664, 360, 258, 280, 328, 38],
        ['cause', 0, 1024, 350, 372, 435, 50],
      ]);
      expect([lay.top, lay.office, lay.stamp, lay.perf, lay.receipt, lay.content]).toEqual([30, 66, 396, 470, 500, 524]);
      expect([lay.spacing.prose, lay.spacing.effects, lay.foot, lay.hint]).toEqual([6, 5, 26, 36]);
    }
    expect(effectsColumn(378, WIDE_TYPE)).toEqual({ x: 472, chars: 58 });
  });

  it('reads on an 844×390 phone held sideways: print at 11 CSS px or more, values at 16', () => {
    const { type } = wideLayout(fields, landscape);
    for (const k of ['office', 'label', 'head', 'receipt', 'effects', 'hint'] as const)
      expect(type[k] * landscape).toBeGreaterThanOrEqual(WIDE_FLOOR.print);
    for (const k of ['value', 'cause'] as const) expect(type[k] * landscape).toBeGreaterThanOrEqual(WIDE_FLOOR.value);
    for (const k of Object.keys(WIDE_TYPE) as (keyof typeof WIDE_TYPE)[]) expect(type[k]).toBeGreaterThanOrEqual(WIDE_TYPE[k]);
  });

  it('sets two fields a row when the 1280 middle row cannot hold the raised labels, none overlapping', () => {
    for (const r of [landscape, 0.5]) {
      const lay = wideLayout(fields, r);
      expect(lay.compact).toBe(true);
      expect(lay.rows.map((x) => x.key)).toEqual(['name', 'age', 'act', 'time', 'cause']);
      const mono = (s: string, px: number, spacing: number) => s.length * (0.6 * px + spacing);
      lay.rows.forEach((row, i) => {
        const f = fields[i]!;
        // The label on its rule's box; the box inside the margins.
        expect(mono(`${i + 1}. ${f.label}`, lay.type.label, 1)).toBeLessThanOrEqual(row.w + 1);
        expect(row.x).toBeGreaterThanOrEqual(0);
        expect(row.x + row.w).toBeLessThanOrEqual(room);
        expect(row.value - row.label).toBeGreaterThanOrEqual(lay.type.label);
        expect(row.rule - row.value).toBeGreaterThanOrEqual(row.size);
      });
      // Fields sharing a line do not share its width.
      const byLine = new Map<number, typeof lay.rows>();
      for (const row of lay.rows) byLine.set(row.label, [...(byLine.get(row.label) ?? []), row]);
      expect([...byLine.values()].map((l) => l.map((x) => x.key))).toEqual([['name', 'age'], ['act', 'time'], ['cause']]);
      for (const l of byLine.values()) for (let j = 1; j < l.length; j++) expect(l[j - 1]!.x + l[j - 1]!.w).toBeLessThan(l[j]!.x);
      // The stamp beside the cause, the tear under it, the receipt under the tear.
      const cause = lay.rows[4]!;
      expect(lay.stamp).toBeGreaterThan(cause.value);
      expect(lay.perf).toBeGreaterThan(cause.rule);
      expect(lay.content).toBeGreaterThanOrEqual(lay.receipt + lay.type.head);
    }
  });

  it('fits a whole build on the 720 canvas beside the receipt, the hint under the sheet', () => {
    const lay = wideLayout(fields, landscape);
    const col = effectsColumn(0.6 * lay.type.receipt * 'Cause of death: Substitute teacher.'.length, lay.type);
    expect(col.chars).toBeGreaterThanOrEqual(36);
    // Every item at its top level: the longest build there is.
    const build = ['Reflex', 'Stubbornness', 'Temper', 'Baggage', 'Tantrum', 'Grudge', 'Gossip', 'Charisma', 'Restlessness',
      'Thick Skin', 'Late Bloomer', 'Appetite', 'Growth Spurt', 'Snooze'].map((n) => `${n} 8`);
    const lines = effectLines(build, col.chars);
    for (const l of lines) expect(0.6 * lay.type.effects * l.length).toBeLessThanOrEqual(room - col.x);
    // A canvas text line is 1.3 em tall with its leading (27px at 21 in headless Chromium).
    const line = (px: number, spacing: number) => 1.3 * px + spacing;
    const effectsBottom = lay.content + lines.length * line(lay.type.effects, lay.spacing.effects);
    const proseBottom = lay.content + 3 * line(lay.type.receipt, lay.spacing.prose);
    const sheetBottom = Math.max(effectsBottom, proseBottom) + lay.foot;
    expect(sheetBottom + lay.hint + lay.type.hint / 2).toBeLessThanOrEqual(720);
  });
});

describe("the HUD on an upright phone's canvas", () => {
  // The Office's and Decline's longest worn lines seen in a browser, and every term at once.
  const office = ['5 attached  −3% speed', 'xp −22%', 'attention −11%'];
  const all = ['12 attached  −21% speed', 'xp −42%', 'attention −11%', 'reach −20%'];

  it('draws the worn line as 1280×720 always has when the canvas is not narrow', () => {
    expect(wornText(office, false)).toBe('5 attached  −3% speed · xp −22% · attention −11%');
    expect(wornText(all, false)).toBe(all.join(' · '));
    expect(wornText([], false)).toBe('');
  });

  it('breaks it between terms, never inside one, clear of the centred clock and boss label', () => {
    // Anchored 16 in from the right; the clock and the label reach 62 right of the middle.
    const room = NARROW_WIDTH - 16 - (NARROW_WIDTH / 2 + 62);
    expect(0.6 * 13 * NARROW_WORN_CHARS).toBeLessThanOrEqual(room - 12);
    for (const terms of [office, all]) {
      const lines = wornText(terms, true).split('\n');
      expect(lines.length).toBeGreaterThan(1);
      for (const l of lines) expect(l.length).toBeLessThanOrEqual(NARROW_WORN_CHARS);
      expect(lines.join(' · ')).toBe(terms.join(' · '));
    }
    expect(wornText(['reach −7%'], true)).toBe('reach −7%');
  });
});

describe('the pause sheet', () => {
  it('keeps its 1280 type on a canvas shown 1280 CSS px across, or near enough to read', () => {
    expect(pauseTypeScale(1, false)).toBe(1);
    expect(pauseTypeScale(1.5, false)).toBe(1);
    expect(pauseTypeScale(0.9, false)).toBe(1);
    expect(pauseTypeScale(0, false)).toBe(1);
  });

  it("sets its smallest lines at the certificate's floor on a landscape phone, and 1.7× on an upright one", () => {
    const landscape = (390 * 16) / 9 / 1280;
    const k = pauseTypeScale(landscape, false);
    expect(13 * k * landscape).toBeCloseTo(WIDE_FLOOR.print, 6);
    expect(pauseTypeScale(landscape, true)).toBe(1.7);
    // 13px at 1.7 on the narrow canvas, on the narrowest phone it is sized for.
    expect((13 * 1.7 * NARROW_SCREEN) / NARROW_WIDTH).toBeGreaterThanOrEqual(11);
  });
});
