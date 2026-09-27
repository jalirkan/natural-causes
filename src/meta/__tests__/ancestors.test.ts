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

  it('drops malformed entries rather than printing them', () => {
    storage.setItem(ANCESTORS_KEY, JSON.stringify([{ outcome: 'died' }, null, 3]));
    expect(recentLives(6)).toEqual([]);
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
});
