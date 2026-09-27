import { describe, expect, it } from 'vitest';
import { ageYears, certificateLines, hudAge, lifeClock } from '../certificate';
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
