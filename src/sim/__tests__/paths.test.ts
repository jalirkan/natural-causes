import { describe, expect, it } from 'vitest';
import { CONCEPTION } from '../../data/acts';
import { enemyDef, type EnemyDef } from '../../data/enemies';
import { INHERITANCES } from '../../data/inheritances';
import {
  ITEMS,
  OFFER_PATH_SEPARATOR,
  PATH_OPENS_AT,
  isActive,
  levelBonus,
  offerIdFor,
  parseOfferId,
  type ActiveItem,
  type ItemPath,
  type LevelBonus,
} from '../../data/items';
import { World, xpToNextLevel, type EnemyState } from '../world';
import { chooseOffer, type BotPolicy } from '../../../tools/playtest/bots';

/**
 * G-043: a weapon's paths. From PATH_OPENS_AT each path is its own offer
 * (`grudge/company`), levelled apart from the weapon in `pathLevels` and
 * folded into the same bonus total. Magnitudes are placeholders, so these
 * tests read them off the data and assert direction and structure.
 */

const DT = 1 / 60;
const STILL = { moveX: 0, moveY: 0 };
const DUMMY: EnemyDef = { ...enemyDef('rival-sperm'), movement: 'static', speed: 0, hp: 100000 };

let uid = 300000;
function place(w: World, dx: number, dy: number): EnemyState {
  const e: EnemyState = {
    uid: uid++,
    hitBySerial: 0,
    hitByAreaSerial: 0,
    def: DUMMY,
    x: w.x + dx,
    y: w.y + dy,
    vx: 0,
    vy: 0,
    hp: DUMMY.hp,
    age: 0,
    hitFlash: 0,
    radius: DUMMY.radius,
    displaySize: DUMMY.displaySize,
    xp: DUMMY.xp,
    consult: 0,
    reload: 0,
  };
  w.enemies.push(e);
  return e;
}

function weapon(id: string): ActiveItem {
  const def = ITEMS[id]!;
  if (!isActive(def)) throw new Error(`${id} is not active`);
  return def;
}

function pathOf(id: string, pathId: string): ItemPath {
  const path = weapon(id).paths?.find((p) => p.id === pathId);
  if (!path) throw new Error(`${id} has no path ${pathId}`);
  return path;
}

/** A world holding exactly `items`, at the given levels. */
function holding(items: Record<string, number>, seed = 1): World {
  const w = new World({ act: CONCEPTION, seed, startingItems: [] });
  for (const [id, level] of Object.entries(items)) w.items.set(id, level);
  return w;
}

/** rollOffers is private: nothing outside the sim should roll. The rule is about it. */
function roll(w: World): string[] {
  return (w as unknown as { rollOffers(): string[] }).rollOffers();
}

function bonusOf(w: World, def: ActiveItem, level: number): Required<LevelBonus> {
  return (w as unknown as { bonusFor(d: ActiveItem, l: number): Required<LevelBonus> }).bonusFor(def, level);
}

/** Takes one level of an offer id the way a player does: it is offered, then chosen. */
function takeOffer(w: World, id: string): void {
  w.offers = [id];
  w.choose(id);
  expect(w.offers).toBeNull();
}

/** Every path id the roll deals across `seeds` worlds built by `make`, `rolls` rolls each. */
function rolledPaths(make: (seed: number) => World, seeds = 12, rolls = 60): Set<string> {
  const seen = new Set<string>();
  for (let seed = 1; seed <= seeds; seed++) {
    const w = make(seed);
    for (let i = 0; i < rolls; i++) {
      const offers = roll(w);
      expect(new Set(offers).size, 'an offer repeats a card').toBe(offers.length);
      for (const id of offers) if (id.includes(OFFER_PATH_SEPARATOR)) seen.add(id);
    }
  }
  return seen;
}

const orbitersOf = (w: World, id: string): number => w.orbiters.filter((o) => o.source === id).length;

describe('a path joins the pool when its weapon opens', () => {
  const grudgePaths = weapon('grudge').paths!.map((p) => offerIdFor(weapon('grudge'), p));

  it('not below PATH_OPENS_AT, every one of them at it, and only the opened weapon’s', () => {
    expect(rolledPaths((seed) => holding({ grudge: PATH_OPENS_AT - 1 }, seed))).toEqual(new Set());
    expect(rolledPaths((seed) => holding({ grudge: PATH_OPENS_AT }, seed))).toEqual(new Set(grudgePaths));
  });

  it('through a real level-up too: the offer the player sees can hold a path', () => {
    let seen = false;
    for (let seed = 1; seed <= 60 && !seen; seed++) {
      const w = holding({ grudge: PATH_OPENS_AT }, seed);
      w.gems.push({ x: w.x, y: w.y, value: xpToNextLevel(1) });
      w.step(DT, STILL);
      expect(w.offers).not.toBeNull();
      for (const id of w.offers!) {
        // Every card names something that exists, item or path.
        expect(() => parseOfferId(id)).not.toThrow();
        if (grudgePaths.includes(id)) seen = true;
      }
    }
    expect(seen, 'no seed under 60 offered a Grudge path at its first level-up').toBe(true);
  });

  it('a path at its max level is no longer offered; its siblings still are', () => {
    const company = pathOf('grudge', 'company');
    const seen = rolledPaths((seed) => {
      const w = holding({ grudge: PATH_OPENS_AT }, seed);
      w.pathLevels.set('grudge/company', company.maxLevel);
      return w;
    });
    expect(seen.has('grudge/company')).toBe(false);
    expect(seen.has('grudge/spiralling')).toBe(true);
    expect(seen.has('grudge/weight')).toBe(true);
  });
});

describe('a path level is read by the sim', () => {
  it('The Farm (grudge/company): one more orbiter per level', () => {
    const level = PATH_OPENS_AT;
    const plain = holding({ grudge: level });
    const directed = holding({ grudge: level });
    takeOffer(directed, 'grudge/company');
    plain.step(DT, STILL);
    directed.step(DT, STILL);
    const base = orbitersOf(plain, 'grudge');
    expect(base).toBeGreaterThan(0);
    expect(orbitersOf(directed, 'grudge')).toBe(base + 1);

    takeOffer(directed, 'grudge/company');
    expect(directed.pathLevels.get('grudge/company')).toBe(2);
    directed.step(DT, STILL);
    expect(orbitersOf(directed, 'grudge')).toBe(base + 2);
    // The weapon's own level did not move: a path is levelled apart.
    expect(directed.items.get('grudge')).toBe(level);
  });

  it('Lullaby (grudge/spiralling): the orbiters go round faster, by the path’s multiplier per level', () => {
    const spiralling = pathOf('grudge', 'spiralling');
    const angleStep = (levels: number): number => {
      const w = holding({ grudge: PATH_OPENS_AT });
      for (let i = 0; i < levels; i++) takeOffer(w, 'grudge/spiralling');
      const angle = (): number => Math.atan2(w.orbiters[0]!.y - w.y, w.orbiters[0]!.x - w.x);
      w.step(DT, STILL);
      const a0 = angle();
      w.step(DT, STILL);
      let d = angle() - a0;
      if (d > Math.PI) d -= 2 * Math.PI;
      if (d < -Math.PI) d += 2 * Math.PI;
      return Math.abs(d);
    };
    const base = angleStep(0);
    expect(base).toBeGreaterThan(0);
    let expected = 1;
    for (let n = 1; n <= spiralling.maxLevel; n++) {
      expected *= spiralling.levels[n - 1]!.speed!;
      expect(angleStep(n)).toBeCloseTo(base * expected, 6);
    }
    expect(expected).toBeGreaterThan(1);
  });

  it('Slammed Door: an enemy the burst hits is pushed further than without it', () => {
    const pushed = (levels: number): number => {
      const w = holding({ acrosome: PATH_OPENS_AT });
      for (let i = 0; i < levels; i++) takeOffer(w, 'acrosome/slammed-door');
      const e = place(w, 40, 0);
      for (let i = 0; i < 10; i++) {
        w.hp = w.maxHp;
        w.step(DT, STILL);
      }
      return Math.hypot(e.x - w.x, e.y - w.y);
    };
    const none = pushed(0);
    const one = pushed(1);
    const two = pushed(2);
    expect(one).toBeGreaterThan(none);
    expect(two).toBeGreaterThan(one);
  });

  it('a path dealt without asking (Precocity) is levelled the same way', () => {
    const w = holding({});
    // Every item maxed, so the pool is only the opened weapons' paths.
    for (const def of Object.values(ITEMS)) w.items.set(def.id, def.maxLevel);
    w.inheritance = INHERITANCES['precocity']!;
    const perAct = w.inheritance.levelsPerAct;
    expect(perAct).toBeGreaterThan(0);
    const level = w.level;
    (w as unknown as { takeUnaskedLevels(): void }).takeUnaskedLevels();
    let pathTotal = 0;
    for (const n of w.pathLevels.values()) pathTotal += n;
    expect(pathTotal).toBe(perAct);
    expect(w.level).toBe(level + perAct);
  });
});

describe('the merged bonus', () => {
  const grudge = weapon('grudge');

  it('is levelBonus itself while no path is taken', () => {
    const w = holding({ grudge: PATH_OPENS_AT });
    w.step(DT, STILL);
    expect(bonusOf(w, grudge, PATH_OPENS_AT)).toBe(levelBonus(grudge, PATH_OPENS_AT));
  });

  it('is the same object across steps when nothing changed, and sees a direct write (the dev panel)', () => {
    const w = holding({ grudge: PATH_OPENS_AT });
    takeOffer(w, 'grudge/company');
    w.step(DT, STILL);
    const first = bonusOf(w, grudge, PATH_OPENS_AT);
    w.step(DT, STILL);
    expect(bonusOf(w, grudge, PATH_OPENS_AT)).toBe(first);
    const shared = levelBonus(grudge, PATH_OPENS_AT);
    expect(first.projectiles).toBe(shared.projectiles + 1);

    // Written straight into the map, as src/dev/panel.ts writes `items`.
    w.pathLevels.set('grudge/company', 2);
    const second = bonusOf(w, grudge, PATH_OPENS_AT);
    expect(second).not.toBe(first);
    expect(second.projectiles).toBe(shared.projectiles + 2);
    w.step(DT, STILL);
    expect(bonusOf(w, grudge, PATH_OPENS_AT)).toBe(second);
    expect(orbitersOf(w, 'grudge')).toBe(1 + shared.projectiles + 2);

    // And the weapon's own level, written the same way.
    w.items.set('grudge', grudge.maxLevel);
    w.step(DT, STILL);
    expect(orbitersOf(w, 'grudge')).toBe(1 + levelBonus(grudge, grudge.maxLevel).projectiles + 2);

    // The shared per-level total was never folded into.
    expect(levelBonus(grudge, PATH_OPENS_AT)).toBe(shared);
    const own = grudge.levels.slice(0, PATH_OPENS_AT).reduce((n, l) => n + (l.projectiles ?? 0), 0);
    expect(shared.projectiles).toBe(own);
    const fresh = holding({ grudge: PATH_OPENS_AT });
    fresh.step(DT, STILL);
    expect(orbitersOf(fresh, 'grudge')).toBe(1 + shared.projectiles);
  });
});

describe('paths and the evolution', () => {
  it('readyEvolution does not read paths: they neither count toward max level nor stand in for it', () => {
    const temper = weapon('acrosome');
    const maxed = (w: World): World => {
      for (const path of temper.paths!) w.pathLevels.set(offerIdFor(temper, path), path.maxLevel);
      return w;
    };
    expect(maxed(holding({ acrosome: temper.maxLevel - 1, midpiece: 1 })).readyEvolution()).toBeNull();
    expect(holding({ acrosome: temper.maxLevel, midpiece: 1 }).readyEvolution()).toBe('tantrum');
    expect(maxed(holding({ acrosome: temper.maxLevel, midpiece: 1 })).readyEvolution()).toBe('tantrum');
  });

  it('the evolution deletes the replaced weapon’s path levels, and nobody else’s', () => {
    const temper = weapon('acrosome');
    const w = holding({ acrosome: temper.maxLevel, midpiece: 1, grudge: PATH_OPENS_AT });
    w.pathLevels.set('acrosome/slammed-door', 2);
    w.pathLevels.set('acrosome/short-fuse', 1);
    w.pathLevels.set('grudge/company', 1);
    w.gems.push({ x: w.x, y: w.y, value: xpToNextLevel(1) });
    w.step(DT, STILL);
    expect(w.offers).toEqual(['tantrum']);
    w.choose('tantrum');
    expect(w.items.has('acrosome')).toBe(false);
    expect(w.items.get('tantrum')).toBe(1);
    expect([...w.pathLevels.keys()].filter((k) => k.startsWith('acrosome/'))).toEqual([]);
    expect(w.pathLevels.get('grudge/company')).toBe(1);
    // And Temper's paths are not offered again after it.
    const seen = rolledPaths(() => w, 1, 60);
    for (const id of seen) expect(id.startsWith('acrosome/'), id).toBe(false);
  });
});

describe('the bots take paths', () => {
  it('chooseOffer picks a path id in its priorities, and reads its level from pathLevels', () => {
    const policy: BotPolicy = { name: 'test', priorities: ['grudge/company', 'midpiece'] };
    const offers = ['lash', 'grudge/company', 'midpiece'];
    const rng = (): number => 0;
    const fresh = { items: new Map([['grudge', PATH_OPENS_AT]]), pathLevels: new Map<string, number>() };
    expect(chooseOffer(policy, offers, fresh, rng)).toBe('grudge/company');
    // Established on the path, so the spread pass moves on to the next want.
    // An `items` read of the path id would see 0 and take it again.
    const grown = { items: fresh.items, pathLevels: new Map([['grudge/company', 99]]) };
    expect(chooseOffer(policy, offers, grown, rng)).toBe('midpiece');
    // Nothing else it wants on offer: the path again, from the second pass.
    expect(chooseOffer(policy, ['lash', 'grudge/company'], grown, rng)).toBe('grudge/company');
  });
});
