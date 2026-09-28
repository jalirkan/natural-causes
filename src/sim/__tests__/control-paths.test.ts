import { describe, expect, it } from 'vitest';
import { ADOLESCENCE, CONCEPTION, type ActDef } from '../../data/acts';
import { ITEMS, OFFER_PATH_SEPARATOR, PATH_OPENS_AT, isActive, offerIdFor, type ActiveItem, type ItemPath } from '../../data/items';
import { World, type AreaState } from '../world';

/**
 * G-043's paths on the two control items: Charisma (`chemotaxis`, mode
 * `attractor`) and Snooze (`snooze`, mode `field`). The same machinery as the
 * weapons' (paths.test.ts); these say it reaches the two modes that deal no
 * damage. Magnitudes are placeholders, so the expected factors are read off
 * the data, never typed here.
 */

const DT = 1 / 60;
const STILL = { moveX: 0, moveY: 0 };

function control(id: string): ActiveItem {
  const def = ITEMS[id]!;
  if (!isActive(def) || def.kind !== 'control') throw new Error(`${id} is not a control item`);
  return def;
}

function pathOf(id: string, pathId: string): ItemPath {
  const path = control(id).paths?.find((p) => p.id === pathId);
  if (!path) throw new Error(`${id} has no path ${pathId}`);
  return path;
}

/** A world holding exactly `items`, at the given levels. */
function holding(items: Record<string, number>, seed = 1, act: ActDef = CONCEPTION): World {
  const w = new World({ act, seed, startingItems: [] });
  for (const [id, level] of Object.entries(items)) w.items.set(id, level);
  return w;
}

/** rollOffers is private: nothing outside the sim should roll. The rule is about it. */
function roll(w: World): string[] {
  return (w as unknown as { rollOffers(): string[] }).rollOffers();
}

/** Takes one level of an offer id the way a player does: it is offered, then chosen. */
function takeOffer(w: World, id: string): void {
  w.offers = [id];
  w.choose(id);
  expect(w.offers).toBeNull();
}

/** Every path id the roll deals across a few seeds of worlds built by `make`. */
function rolledPaths(make: (seed: number) => World, seeds = 12, rolls = 60): Set<string> {
  const seen = new Set<string>();
  for (let seed = 1; seed <= seeds; seed++) {
    const w = make(seed);
    for (let i = 0; i < rolls; i++) {
      for (const id of roll(w)) if (id.includes(OFFER_PATH_SEPARATOR)) seen.add(id);
    }
  }
  return seen;
}

/**
 * The area the control item drops on its first activation. Nothing else is
 * held, so the one area of the kind asked for is the item's; its cooldown
 * starts at zero, so the first step fires it.
 */
function firstArea(w: World, kind: 'attractor' | 'field'): AreaState {
  w.step(DT, STILL);
  const found = w.areas.filter((a) => (kind === 'attractor' ? a.pull : a.slow !== undefined));
  expect(found.length, `one ${kind} after the first step`).toBe(1);
  return found[0]!;
}

describe('a control item’s paths join the pool when it opens', () => {
  const cases: Array<[string, ActDef]> = [
    ['chemotaxis', CONCEPTION],
    ['snooze', ADOLESCENCE],
  ];
  for (const [id, act] of cases) {
    it(`${control(id).name}: none below PATH_OPENS_AT, every one of them at it`, () => {
      const def = control(id);
      expect(def.paths?.length ?? 0).toBeGreaterThanOrEqual(2);
      const all = new Set(def.paths!.map((p) => offerIdFor(def, p)));
      expect(rolledPaths((seed) => holding({ [id]: PATH_OPENS_AT - 1 }, seed, act))).toEqual(new Set());
      expect(rolledPaths((seed) => holding({ [id]: PATH_OPENS_AT }, seed, act))).toEqual(all);
    });
  }
});

describe('a control path level is read by the sim', () => {
  it('Candy · Wrapper (chemotaxis/magnetism) at two: the next pull’s radius is both levels’ area times the base', () => {
    const magnetism = pathOf('chemotaxis', 'magnetism');
    const base = firstArea(holding({ chemotaxis: PATH_OPENS_AT }), 'attractor');

    const w = holding({ chemotaxis: PATH_OPENS_AT });
    takeOffer(w, 'chemotaxis/magnetism');
    takeOffer(w, 'chemotaxis/magnetism');
    expect(w.pathLevels.get('chemotaxis/magnetism')).toBe(2);
    // The item's own level did not move: a path is levelled apart.
    expect(w.items.get('chemotaxis')).toBe(PATH_OPENS_AT);
    const pulled = firstArea(w, 'attractor');

    // 1.15 squared today; read from the data because it is a placeholder.
    const factor = magnetism.levels[0]!.area! * magnetism.levels[1]!.area!;
    expect(factor).toBeGreaterThan(1);
    expect(pulled.radius).toBeCloseTo(base.radius * factor, 6);
    // Only the reach: the pull lasts as long as it did.
    expect(pulled.seconds).toBeCloseTo(base.seconds, 6);
  });

  it('Snooze · Nine More Minutes at one: the field lasts the level’s duration times longer', () => {
    const nineMore = pathOf('snooze', 'nine-more');
    const base = firstArea(holding({ snooze: PATH_OPENS_AT }, 1, ADOLESCENCE), 'field');

    const w = holding({ snooze: PATH_OPENS_AT }, 1, ADOLESCENCE);
    takeOffer(w, 'snooze/nine-more');
    const held = firstArea(w, 'field');

    // 1.25 today; read from the data because it is a placeholder.
    const factor = nineMore.levels[0]!.duration!;
    expect(factor).toBeGreaterThan(1);
    expect(held.seconds).toBeCloseTo(base.seconds * factor, 6);
    // Only the time: the field is as wide and holds as hard as it did.
    expect(held.radius).toBeCloseTo(base.radius, 6);
    expect(held.slow).toBe(base.slow);
  });
});
