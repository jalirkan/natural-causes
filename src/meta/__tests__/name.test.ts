import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import {
  DEFAULT_NAME,
  NAME_KEY,
  NAME_MAX,
  cleanName,
  isNameChar,
  misspell,
} from '../name';

/**
 * The module keeps the name written on this page (for a storage that refuses
 * the write), so each storage test loads a fresh copy: a new page.
 */
let readPlayerName: typeof import('../name').readPlayerName;
let writePlayerName: typeof import('../name').writePlayerName;
beforeEach(async () => {
  vi.resetModules();
  ({ readPlayerName, writePlayerName } = await import('../name'));
});

/** Just enough of `Storage` to hold one key. */
class FakeStorage {
  private data = new Map<string, string>();
  getItem(k: string): string | null {
    return this.data.get(k) ?? null;
  }
  setItem(k: string, v: string): void {
    this.data.set(k, String(v));
  }
  removeItem(k: string): void {
    this.data.delete(k);
  }
}

const original = Object.getOwnPropertyDescriptor(globalThis, 'localStorage');

afterEach(() => {
  vi.unstubAllGlobals();
  if (original) Object.defineProperty(globalThis, 'localStorage', original);
  else delete (globalThis as { localStorage?: unknown }).localStorage;
});

const SEEDS = Array.from({ length: 400 }, (_, i) => i);
const NAMES = ['Justin', 'Nobody', 'Al', 'Bo', 'aa', 'Anna', 'Mary-Jane', "O'Neil", 'Zoë', 'JUSTIN', 'bob', 'Xi', 'Ng', 'Tsz'];

describe('misspell', () => {
  it('is deterministic for a seed', () => {
    for (const name of NAMES) {
      for (const seed of [0, 1, 7, 12345, 2 ** 31 + 5]) {
        expect(misspell(name, seed)).toBe(misspell(name, seed));
      }
    }
  });

  it('gets the name wrong differently across seeds', () => {
    for (const name of ['Justin', 'Nobody', 'Al']) {
      const spellings = new Set(SEEDS.slice(0, 40).map((s) => misspell(name, s)));
      expect(spellings.size).toBeGreaterThan(name.length > 2 ? 8 : 3);
    }
  });

  it('never returns the name unchanged, never empty, and keeps the first letter and its case', () => {
    for (const name of NAMES) {
      for (const seed of SEEDS) {
        const out = misspell(name, seed);
        expect(out, `${name} @ ${seed}`).not.toBe(name);
        expect(out.length).toBeGreaterThan(0);
        const first = [...name][0]!;
        const firstOut = [...out][0]!;
        const upper = (c: string) => c !== c.toLowerCase();
        expect(upper(firstOut), `${name} -> ${out}`).toBe(upper(first));
      }
    }
  });

  it('makes one plausible mistake: one letter in or out, or the same length', () => {
    for (const name of NAMES) {
      for (const seed of SEEDS) {
        const diff = [...misspell(name, seed)].length - [...name].length;
        expect(Math.abs(diff), `${name} -> ${misspell(name, seed)}`).toBeLessThanOrEqual(1);
      }
    }
  });

  it('reaches every kind of mistake on an ordinary name', () => {
    const seen = new Set(SEEDS.map((s) => misspell('Justin', s)));
    expect(seen).toContain('Jsutin'); // swapped
    expect([...seen].some((x) => /^Justt?in$|^Juss|^Juu|^Justii/.test(x) && x.length === 7)).toBe(true); // doubled
    expect([...seen].some((x) => x.length === 5 && x.startsWith('J'))).toBe(true); // dropped
    expect([...seen].some((x) => /^J[oe]stin$|^Just[ey]n$/.test(x))).toBe(true); // a vowel
    expect([...seen].some((x) => /^[GY]ustin$/.test(x))).toBe(true); // the first letter
  });

  it('handles short names: one letter, two letters, two the same', () => {
    for (const seed of SEEDS) {
      const a = misspell('A', seed);
      expect(['Aa', 'E', 'O']).toContain(a);
      expect(misspell('aa', seed)).not.toBe('aa');
      const al = misspell('Al', seed);
      expect(al).not.toBe('Al');
      expect(al.length).toBeGreaterThan(0);
    }
  });

  it('keeps a two-letter first-letter slip in title case', () => {
    const seen = new Set(SEEDS.map((s) => misspell('Frank', s)));
    expect([...seen].filter((x) => x.startsWith('P'))).toEqual(
      [...seen].filter((x) => x.startsWith('Ph')),
    );
    expect([...seen].some((x) => x.startsWith('PH'))).toBe(false);
  });

  it('misspells a name with no letters as the default', () => {
    for (const bad of ['', '   ', "-'-"]) {
      const out = misspell(bad, 3);
      expect(out.length).toBeGreaterThan(0);
      expect(out).toBe(misspell(DEFAULT_NAME, 3));
    }
  });
});

describe('cleanName', () => {
  it('keeps letters, spaces, hyphens and apostrophes, trimmed and capped', () => {
    expect(cleanName('  Mary   Jane ')).toBe('Mary Jane');
    expect(cleanName("O'Neil-Smith")).toBe("O'Neil-Smith");
    expect(cleanName('R2-D2')).toBe('R-D');
    expect(cleanName('Bartholomew Jones')).toBe('Bartholomew');
    expect([...cleanName('abcdefghijklmnop')!]).toHaveLength(NAME_MAX);
  });

  it('is null when no letter is left', () => {
    expect(cleanName('')).toBeNull();
    expect(cleanName('  ')).toBeNull();
    expect(cleanName("-'-")).toBeNull();
    expect(cleanName('1234')).toBeNull();
  });

  it('agrees with isNameChar on what a name is made of', () => {
    for (const c of ['a', 'Z', 'é', ' ', '-', "'"]) expect(isNameChar(c)).toBe(true);
    for (const c of ['1', '.', '_', '`', 'Enter', '']) expect(isNameChar(c)).toBe(false);
  });
});

describe('the remembered name, with storage', () => {
  let storage: FakeStorage;
  beforeEach(() => {
    storage = new FakeStorage();
    vi.stubGlobal('localStorage', storage);
  });

  it('is null before one is given', () => {
    expect(readPlayerName()).toBeNull();
  });

  it('round-trips a name', () => {
    writePlayerName('Justin');
    expect(storage.getItem(NAME_KEY)).toBe('Justin');
    expect(readPlayerName()).toBe('Justin');
  });

  it('forgets the name when given none', () => {
    writePlayerName('Justin');
    writePlayerName('  ');
    expect(storage.getItem(NAME_KEY)).toBeNull();
    expect(readPlayerName()).toBeNull();
  });

  it('reads a name a previous visit stored', () => {
    storage.setItem(NAME_KEY, 'Justin');
    expect(readPlayerName()).toBe('Justin');
  });

  it('reads garbage in the key as clean or as nothing', () => {
    storage.setItem(NAME_KEY, '  <b>Jo</b>  ');
    expect(readPlayerName()).toBe('bJob');
    storage.setItem(NAME_KEY, '42');
    expect(readPlayerName()).toBeNull();
  });
});

describe('the remembered name, without storage', () => {
  it('is null when localStorage is absent, and keeps a name written on this page', () => {
    vi.stubGlobal('localStorage', undefined);
    expect(readPlayerName()).toBeNull();
    expect(() => writePlayerName('Justin')).not.toThrow();
    expect(readPlayerName()).toBe('Justin');
  });

  it('is null when touching localStorage throws (blocked site data), and does not throw', () => {
    Object.defineProperty(globalThis, 'localStorage', {
      configurable: true,
      get() {
        throw new Error('SecurityError');
      },
    });
    expect(readPlayerName()).toBeNull();
    expect(() => writePlayerName('Justin')).not.toThrow();
    expect(readPlayerName()).toBe('Justin');
  });

  it('is null when every read and write throws, and does not throw', () => {
    vi.stubGlobal('localStorage', {
      getItem() {
        throw new Error('denied');
      },
      setItem() {
        throw new Error('QuotaExceededError');
      },
      removeItem() {
        throw new Error('denied');
      },
    });
    expect(readPlayerName()).toBeNull();
    expect(() => writePlayerName('Justin')).not.toThrow();
    expect(readPlayerName()).toBe('Justin');
    writePlayerName('');
    expect(readPlayerName()).toBeNull();
  });
});
