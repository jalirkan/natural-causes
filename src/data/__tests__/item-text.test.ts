import { afterAll, describe, expect, it } from 'vitest';
import { ITEMS, isActive, offerIdFor, type ActiveItem } from '../items';
import { STAT_LINE_MAX, offerPips, offerTitle, statLines } from '../item-text';

/**
 * G-043: the card prints what a level is worth, derived from the data by one
 * module. These pin the vocabulary on real items (so a placeholder moving in
 * items.ts moves the card, and a card never claims a number the sim does not
 * pay), exercise the path and coming-mode branches on fixtures, and sweep
 * every offer the pool can make for a line that is empty, too long or broken.
 */

const NEW = { level: 0, pathLevel: 0 };
const at = (level: number, pathLevel = 0) => ({ level, pathLevel });
const joined = (id: string, owned = NEW) => statLines(id, owned).join(' · ');

/** Registered under `test-` ids, like bonus-fields.test.ts, and removed after. */
const fixtures: string[] = [];
function register(def: ActiveItem): ActiveItem {
  ITEMS[def.id] = def;
  fixtures.push(def.id);
  return def;
}
afterAll(() => {
  for (const id of fixtures) delete ITEMS[id];
});

const grudge = ITEMS['grudge'] as ActiveItem;
/** A mode the union may not have yet (G-044's arrive in another change), or never will. */
const mode = (m: string) => m as unknown as ActiveItem['mode'];

describe('real items read in classic terms', () => {
  it('a new Grudge is its damage, its count and its re-hit', () => {
    expect(statLines('grudge', NEW)).toEqual(['damage 3 · 1 orbiting · re-hits every 0.5s']);
  });

  it('Grudge 2 → 3 is more damage, faster, and one more orbiting', () => {
    const line = joined('grudge', at(2));
    expect(line).toContain('+1 orbiting');
    expect(line).toMatch(/damage \+\d+%/);
    expect(line).toMatch(/attack speed \+\d+%/);
  });

  it('a new weapon of each existing mode', () => {
    expect(statLines('lash', NEW)).toEqual(['damage 2 · every 0.55s · range 420']);
    expect(statLines('motility', NEW)).toEqual(['damage 4 · every 0.9s · pierces all']);
    expect(statLines('acrosome', NEW)).toEqual(['damage 5 · every 1.4s · radius 96']);
    expect(statLines('wake', NEW)).toEqual(['damage 2 per tick · lasts 2.4s · radius 26']);
    expect(statLines('chemotaxis', NEW)).toEqual(['pulls within 330 · every 5.5s']);
  });

  it('passives print their per-level multipliers', () => {
    const restless = joined('midpiece');
    expect(restless).toContain('speed +10%');
    expect(restless).toContain('attack speed +8%');
    const skin = joined('membrane');
    expect(skin).toContain('health +6%');
    expect(skin).toContain('damage taken −15%');
    const bloomer = joined('capacitation');
    expect(bloomer).toContain('70%');
    expect(bloomer).toContain('185%');
    const spurt = joined('growth-spurt');
    expect(spurt).toContain('reach +10%');
    expect(spurt).toContain('size +8%');
    expect(joined('appetite')).toBe('pickup +30%');
    // Each level is another multiplication, so a level-up says the same.
    expect(statLines('membrane', at(3))).toEqual(statLines('membrane', NEW));
  });

  it('a new Snooze says how hard it holds', () => {
    expect(joined('snooze')).toContain('slows to 50%');
  });

  it('a level-up of a control item speaks of its cooldown, not an attack', () => {
    const line = joined('chemotaxis', at(1));
    expect(line).toMatch(/cooldown −\d+%/);
    expect(line).not.toContain('damage');
    expect(line).not.toContain('attack speed');
  });
});

describe('a path card prints only its own level', () => {
  const pathed = register({
    ...grudge,
    id: 'test-pathed',
    name: 'Fixture',
    paths: [
      {
        id: 'turning',
        name: 'Turning',
        blurb: 'It goes round faster.',
        maxLevel: 3,
        levels: [
          { text: 'Faster.', speed: 1.3 },
          { text: 'Harder.', damage: 1.3, cooldown: 0.85 },
          { text: 'Nothing on the stat line.' },
        ],
      },
    ],
  });
  const id = offerIdFor(pathed, pathed.paths![0]!);

  it('spin +30%, and nothing about damage, from a path level of { speed: 1.3 }', () => {
    const line = joined(id, at(4, 0));
    expect(line).toBe('spin +30%');
    expect(line).not.toContain('damage');
    expect(line).not.toContain('attack speed');
  });

  it('a path level that multiplies damage or cooldown prints exactly that', () => {
    expect(joined(id, at(4, 1))).toBe('damage +30% · attack speed +18%');
  });

  it('a path level with no stat still prints a line', () => {
    const lines = statLines(id, at(4, 2));
    expect(lines.length).toBeGreaterThan(0);
    expect(lines.join('')).not.toBe('');
  });

  it('the title and pips are the path’s', () => {
    expect(offerTitle(id)).toBe('Fixture · Turning');
    expect(offerTitle('test-pathed')).toBe('Fixture');
    expect(offerPips(id, at(4, 1))).toEqual({ owned: 1, max: 3 });
    expect(offerPips('test-pathed', at(4, 1))).toEqual({ owned: 4, max: grudge.maxLevel });
  });
});

describe('the coming modes, and a mode nobody taught it', () => {
  it('a sweep prints its arc in degrees from radians', () => {
    const sweep = register({
      ...grudge,
      id: 'test-sweep',
      mode: mode('sweep'),
      damage: 6,
      cooldown: 1,
      range: 110,
      ...{ arc: (100 * Math.PI) / 180 },
    });
    expect(statLines(sweep.id, NEW)).toEqual(['damage 6 · every 1s · reach 110 · arc 100°']);
    expect(joined(sweep.id, at(2))).toContain('+1 sweep');
  });

  it('an aura and a strike read by name', () => {
    const aura = register({ ...grudge, id: 'test-aura', mode: mode('aura'), damage: 2, radius: 90, cooldown: 0.6 });
    expect(statLines(aura.id, NEW)).toEqual(['damage 2 · radius 90 · re-hits every 0.6s']);
    const strike = register({
      ...grudge,
      id: 'test-strike',
      mode: mode('strike'),
      damage: 9,
      cooldown: 1.6,
      range: 300,
      radius: 48,
    });
    expect(joined(strike.id)).toBe('damage 9 · every 1.6s · range 300 · radius 48');
    expect(joined(strike.id, at(2))).toContain('+1 bolt');
  });

  it('an unknown mode falls back to the generic figures without throwing', () => {
    const odd = register({ ...grudge, id: 'test-odd', mode: mode('teleport') });
    expect(() => statLines(odd.id, NEW)).not.toThrow();
    expect(joined(odd.id)).toContain('damage 3');
    expect(() => statLines(odd.id, at(2))).not.toThrow();
    expect(joined(odd.id, at(2))).toContain('+1 shot');
    expect(joined(odd.id, at(3))).toContain('area +15%');
  });
});

describe('every offer the pool can make prints a clean line', () => {
  function check(id: string, owned: { level: number; pathLevel: number }) {
    const lines = statLines(id, owned);
    const where = `${id} @ ${owned.level}/${owned.pathLevel}`;
    expect(lines.length, where).toBeGreaterThanOrEqual(1);
    for (const line of lines) {
      expect(line.length, `${where}: "${line}"`).toBeGreaterThan(0);
      expect(line.length, `${where}: "${line}"`).toBeLessThanOrEqual(STAT_LINE_MAX);
      expect(line, where).not.toMatch(/NaN|undefined|Infinity|null/);
    }
    return lines;
  }

  it('every item at every level it can be offered from, and every path at every level', () => {
    for (const def of Object.values(ITEMS)) {
      for (let level = 0; level < def.maxLevel; level++) {
        const lines = check(def.id, at(level));
        // The card is sized for two; a real item never needs a third.
        if (!def.id.startsWith('test-')) expect(lines.length, `${def.id} @ ${level}`).toBeLessThanOrEqual(2);
      }
      if (!isActive(def)) continue;
      for (const path of def.paths ?? []) {
        for (let pathLevel = 0; pathLevel < path.maxLevel; pathLevel++) {
          check(offerIdFor(def, path), at(def.maxLevel, pathLevel));
        }
      }
    }
  });
});
