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
