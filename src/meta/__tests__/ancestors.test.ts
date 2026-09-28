import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import {
  ANCESTORS_CAP,
  ANCESTORS_KEY,
  obituary,
  recentLives,
  recordLife,
  type Ancestor,
} from '../ancestors';
import type { Certificate } from '../../sim/world';

/** Just enough of `Storage` to hold one key. */
class FakeStorage {
  private data = new Map<string, string>();
  get length(): number {
    return this.data.size;
  }
  getItem(k: string): string | null {
    return this.data.get(k) ?? null;
  }
  setItem(k: string, v: string): void {
    this.data.set(k, String(v));
  }
  removeItem(k: string): void {
    this.data.delete(k);
  }
  clear(): void {
    this.data.clear();
  }
  key(i: number): string | null {
    return [...this.data.keys()][i] ?? null;
  }
}

const death: Certificate = {
  outcome: 'died',
  actId: 'school',
  actName: 'School',
  actIndex: 1,
  age: 9.7,
  causeId: 'homework',
  cause: 'Homework',
  rules: [],
};

const win: Certificate = {
  ...death,
  outcome: 'won',
  age: 12,
  causeId: 'natural-causes',
  cause: 'natural causes',
};

const original = Object.getOwnPropertyDescriptor(globalThis, 'localStorage');

afterEach(() => {
  vi.unstubAllGlobals();
  vi.useRealTimers();
  if (original) Object.defineProperty(globalThis, 'localStorage', original);
  else delete (globalThis as { localStorage?: unknown }).localStorage;
});

describe('the ancestor log, with storage', () => {
  let storage: FakeStorage;
  beforeEach(() => {
    storage = new FakeStorage();
    vi.stubGlobal('localStorage', storage);
  });

  it('is empty before anyone has lived', () => {
    expect(recentLives(6)).toEqual([]);
  });

  it('appends each ended life with its outcome, act, age, cause and time', () => {
    vi.useFakeTimers();
    vi.setSystemTime(1_000);
    recordLife(death);
    vi.setSystemTime(2_000);
    recordLife(win);

    const stored = JSON.parse(storage.getItem(ANCESTORS_KEY)!) as Ancestor[];
    expect(stored).toEqual([
      { outcome: 'died', actName: 'School', age: 9.7, cause: 'Homework', at: 1_000 },
      { outcome: 'won', actName: 'School', age: 12, cause: 'natural causes', at: 2_000 },
    ]);
  });

  it('returns the newest n, most recent first', () => {
    for (let i = 0; i < 5; i++) recordLife({ ...death, age: i });
    expect(recentLives(3).map((a) => a.age)).toEqual([4, 3, 2]);
    expect(recentLives(10)).toHaveLength(5);
    expect(recentLives(0)).toEqual([]);
  });

  it(`keeps only the last ${ANCESTORS_CAP}`, () => {
    for (let i = 0; i < ANCESTORS_CAP + 7; i++) recordLife({ ...death, age: i });
    const stored = JSON.parse(storage.getItem(ANCESTORS_KEY)!) as Ancestor[];
    expect(stored).toHaveLength(ANCESTORS_CAP);
    expect(stored[0]!.age).toBe(7);
    expect(stored[ANCESTORS_CAP - 1]!.age).toBe(ANCESTORS_CAP + 6);
    expect(recentLives(1)[0]!.age).toBe(ANCESTORS_CAP + 6);
  });

  it('reads garbage in the key as nobody, and records over it', () => {
    storage.setItem(ANCESTORS_KEY, '{not json');
    expect(recentLives(6)).toEqual([]);
    recordLife(death);
    expect(recentLives(6)).toHaveLength(1);
  });

  it('records the name the scene held, and leaves a blank one out', () => {
    vi.useFakeTimers();
    vi.setSystemTime(3_000);
    recordLife(death, 'Nobody');
    recordLife(win, '  ');
    const stored = JSON.parse(storage.getItem(ANCESTORS_KEY)!) as Ancestor[];
    expect(stored).toEqual([
      { outcome: 'died', actName: 'School', age: 9.7, cause: 'Homework', at: 3_000, name: 'Nobody' },
      { outcome: 'won', actName: 'School', age: 12, cause: 'natural causes', at: 3_000 },
    ]);
    expect(recentLives(6).map(obituary)).toEqual([
      'Age 12 · natural causes',
      'Nobody · Age 9 · School · Homework',
    ]);
  });

  it('still loads lives recorded before names, beside ones with a name', () => {
    storage.setItem(
      ANCESTORS_KEY,
      JSON.stringify([
        { outcome: 'died', actName: 'School', age: 9.7, cause: 'Homework', at: 1 },
        { outcome: 'won', actName: 'School', age: 18, cause: 'natural causes', at: 2, name: 'Justin' },
      ]),
    );
    expect(recentLives(6).map(obituary)).toEqual([
      'Justin · Age 18 · natural causes',
      'Age 9 · School · Homework',
    ]);
  });

  it('drops an entry whose name is not a string', () => {
    storage.setItem(
      ANCESTORS_KEY,
      JSON.stringify([{ outcome: 'died', actName: 'School', age: 9, cause: 'Homework', at: 1, name: 7 }]),
    );
    expect(recentLives(6)).toEqual([]);
  });

  it('drops malformed entries rather than printing them', () => {
    storage.setItem(ANCESTORS_KEY, JSON.stringify([{ outcome: 'died' }, null, 3]));
    expect(recentLives(6)).toEqual([]);
  });

  it('keeps a ruled life’s rules (G-055), and writes none for a plain one', () => {
    vi.useFakeTimers();
    vi.setSystemTime(4_000);
    recordLife({ ...death, rules: ['couch-potato', 'one-trick'] }, 'Justin');
    recordLife(death);
    const stored = JSON.parse(storage.getItem(ANCESTORS_KEY)!) as Ancestor[];
    expect(stored).toEqual([
      { outcome: 'died', actName: 'School', age: 9.7, cause: 'Homework', at: 4_000, name: 'Justin', rules: ['couch-potato', 'one-trick'] },
      { outcome: 'died', actName: 'School', age: 9.7, cause: 'Homework', at: 4_000 },
    ]);
    // Round trip: what was written reads back as it was.
    expect(recentLives(6).map((a) => a.rules)).toEqual([undefined, ['couch-potato', 'one-trick']]);
    expect(recentLives(6).map(obituary)).toEqual([
      'Age 9 · School · Homework',
      'Justin · Age 9 · School · Homework · couch potato · one trick',
    ]);
  });

  it('reads a record from before rules as a plain life, beside a ruled one', () => {
    storage.setItem(
      ANCESTORS_KEY,
      JSON.stringify([
        { outcome: 'died', actName: 'School', age: 9.7, cause: 'Homework', at: 1 },
        { outcome: 'won', actName: 'Decline', age: 84, cause: 'natural causes', at: 2, rules: ['one-trick'] },
      ]),
    );
    const lives = recentLives(6);
    expect(lives.map((a) => a.rules ?? [])).toEqual([['one-trick'], []]);
    expect(lives.map(obituary)).toEqual(['Age 84 · natural causes · one trick', 'Age 9 · School · Homework']);
  });

  it('drops an entry whose rules it cannot read: not a list, or a rule the registry does not hold', () => {
    storage.setItem(
      ANCESTORS_KEY,
      JSON.stringify([
        { outcome: 'died', actName: 'School', age: 9, cause: 'Homework', at: 1, rules: 'couch-potato' },
        { outcome: 'died', actName: 'School', age: 9, cause: 'Homework', at: 2, rules: ['sit-still'] },
        { outcome: 'died', actName: 'School', age: 9, cause: 'Homework', at: 3, rules: [] },
      ]),
    );
    expect(recentLives(6).map((a) => a.at)).toEqual([3]);
  });
});

describe('the ancestor log, without storage', () => {
  it('is a no-op when localStorage is absent', () => {
    vi.stubGlobal('localStorage', undefined);
    expect(() => recordLife(death)).not.toThrow();
    expect(recentLives(6)).toEqual([]);
  });

  it('is a no-op when touching localStorage throws (blocked site data)', () => {
    Object.defineProperty(globalThis, 'localStorage', {
      configurable: true,
      get() {
        throw new Error('SecurityError');
      },
    });
    expect(() => recordLife(death)).not.toThrow();
    expect(recentLives(6)).toEqual([]);
  });

  it('is a no-op when every read and write throws (quota, private window)', () => {
    vi.stubGlobal('localStorage', {
      getItem() {
        throw new Error('denied');
      },
      setItem() {
        throw new Error('QuotaExceededError');
      },
    });
    expect(() => recordLife(death)).not.toThrow();
    expect(recentLives(6)).toEqual([]);
  });
});

describe('obituary', () => {
  const as = (c: Certificate): Ancestor => ({
    outcome: c.outcome,
    actName: c.actName,
    age: c.age,
    cause: c.cause,
    at: 0,
  });

  it('reads a death as age, act and cause, in whole years', () => {
    expect(obituary(as(death))).toBe('Age 9 · School · Homework');
  });

  it('reads the win as natural causes', () => {
    expect(obituary(as(win))).toBe('Age 12 · natural causes');
  });

  it('prints the name first when the life has one', () => {
    expect(obituary({ ...as(death), name: 'Nobody' })).toBe('Nobody · Age 9 · School · Homework');
    expect(obituary({ ...as(win), age: 18, name: 'Justin' })).toBe('Justin · Age 18 · natural causes');
  });
});
