import { describe, expect, it } from 'vitest';
import iconsAtlas from '../../../assets/atlas/icons.json';
import { ALL_ACTS, CONCEPTION, type ActDef } from '../../data/acts';
import { enemyDef, type EnemyDef } from '../../data/enemies';
import { itemIconFrame } from '../../data/item-visuals';
import {
  ITEMS,
  OFFER_PATH_SEPARATOR,
  damageScale,
  isActive,
  levelBonus,
  offerIdFor,
  type ActiveItem,
} from '../../data/items';
import { World, scalingLevel, type EnemyState } from '../world';

/**
 * G-046: five more evolutions, dealt as Tantrum is — one card alone once the
 * weapon is maxed beside its partner, never rolled, replacing the weapon and
 * the paths taken on it — each with the one mechanic it needed: a fist that
 * shoves (Grudge, id vendetta), a sweep that is a circle (Backhand, id
 * reach), a bolt with no warning (Judgement, id hindsight), a trail that
 * holds (Baggage, id rut). Jumpiness needed none. G-054 gave them the adult
 * words and their weapons the kid's things; the ids never moved.
 */

/** G-046's table: each evolution, the weapon it replaces, the partner beside it. */
const FIVE = [
  { id: 'vendetta', weapon: 'grudge', partner: 'membrane' },
  { id: 'jumpiness', weapon: 'lash', partner: 'midpiece' },
  { id: 'reach', weapon: 'backhand', partner: 'growth-spurt' },
  { id: 'hindsight', weapon: 'judgement', partner: 'capacitation' },
  { id: 'rut', weapon: 'wake', partner: 'snooze' },
] as const;

/** No schedule, so nothing is on the field but what the test places there. */
const QUIET: ActDef = {
  id: 'evolutions-fixture',
  name: 'Fixture',
  durationSeconds: 300,
  bossName: 'Fixture',
  boss: { kind: 'egg' },
  age: { from: 0, to: 0 },
  waves: [],
};

/** A target that stands still and does not die of one hit. */
const DUMMY: EnemyDef = {
  ...enemyDef('rival-sperm'),
  movement: 'static',
  speed: 0,
  hp: 1000,
};

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
  const def = ITEMS[id];
  if (!def || !isActive(def)) throw new Error(`"${id}" is not an active item`);
  return def;
}

function world(items: Record<string, number>, seed = 1): World {
  const w = new World({ act: QUIET, seed, startingItems: [] });
  for (const [id, level] of Object.entries(items)) w.items.set(id, level);
  return w;
}

/** What one hit is worth, from the same formula the sim pays (no Late Bloomer held). */
function hit(id: string, level: number): number {
  const def = weapon(id);
  // G-047: an evolution is paid at its weapon's max level.
  return def.damage * damageScale(scalingLevel(def, level)) * levelBonus(def, level).damage;
}

/** The act a partner is first in the pool in: an evolution is only ever ready from there. */
function actFor(partner: string): ActDef {
  const from = ITEMS[partner]!.from;
  return from === undefined ? CONCEPTION : ALL_ACTS.find((a) => a.id === from)!;
}

/** One level's worth of XP, collected on the next step. */
function levelUp(w: World): void {
  w.gems.push({ x: w.x, y: w.y, value: w.xpToNext });
  w.step(DT, still);
}

const DT = 1 / 60;
const still = { moveX: 0, moveY: 0 };

describe('the five are dealt as Tantrum is (G-046)', () => {
  for (const { id, weapon: from, partner } of FIVE) {
    describe(`${ITEMS[id]?.name ?? id}`, () => {
      it(`is offered alone once ${ITEMS[from]!.name} is maxed beside ${ITEMS[partner]!.name}, and replaces it`, () => {
        const w = new World({ act: actFor(partner), seed: 1, startingItems: ['lash'] });
        const def = weapon(from);
        w.items.set(from, def.maxLevel);
        w.items.set(partner, 1);
        // A path taken on the weapon dies with it (G-046, Temper's rule).
        const path = offerIdFor(def, def.paths![0]!);
        w.pathLevels.set(path, 1);
        levelUp(w);
        expect(w.offers).toEqual([id]);
        w.choose(id);
        expect(w.items.get(id)).toBe(1);
        expect(w.items.has(from)).toBe(false);
        expect(w.pathLevels.has(path)).toBe(false);

        // Neither the evolution, the weapon it replaced, nor that weapon's paths come round again.
        for (let i = 0; i < 40; i++) {
          levelUp(w);
          if (!w.offers) continue;
          expect(w.offers).not.toContain(id);
          expect(w.offers).not.toContain(from);
          for (const o of w.offers) expect(o.startsWith(from + OFFER_PATH_SEPARATOR), o).toBe(false);
          w.choose(w.offers[0]!);
          w.hp = w.maxHp;
        }
      });

      it('is not offered without the partner', () => {
        const w = new World({ act: actFor(partner), seed: 1, startingItems: ['lash'] });
        w.items.set(from, weapon(from).maxLevel);
        levelUp(w);
        expect(w.offers).not.toBeNull();
        expect(w.offers).not.toContain(id);
        expect(w.readyEvolution()).toBeNull();
      });

      it('is not offered a level before the weapon is maxed', () => {
        const w = new World({ act: actFor(partner), seed: 1, startingItems: ['lash'] });
        w.items.set(from, weapon(from).maxLevel - 1);
        w.items.set(partner, 1);
        expect(w.readyEvolution()).toBeNull();
      });
    });
  }

  it('two ready at once are dealt in registry order, one level each: Tantrum, then Grudge (vendetta)', () => {
    const w = new World({ act: CONCEPTION, seed: 1, startingItems: ['lash'] });
    w.items.set('acrosome', weapon('acrosome').maxLevel);
    w.items.set('midpiece', 1);
    w.items.set('grudge', weapon('grudge').maxLevel);
    w.items.set('membrane', 1);
    levelUp(w);
    expect(w.offers).toEqual(['tantrum']);
    w.choose('tantrum');
    // One level, one card: the second waits for the next level.
    expect(w.offers).toBeNull();
    levelUp(w);
    expect(w.offers).toEqual(['vendetta']);
    w.choose('vendetta');
    expect(w.items.has('acrosome')).toBe(false);
    expect(w.items.has('grudge')).toBe(false);
    expect(w.readyEvolution()).toBeNull();
  });
});

describe('Grudge (vendetta): the fists shove', () => {
  it('pushes an enemy its fist hits straight away from the player', () => {
    const w = world({ vendetta: 1 });
    const def = weapon('vendetta');
    // Fist zero's place on the first step, from the same clock the sim reads.
    const angle = (def.projectileSpeed / def.range) * DT;
    const e = place(w, Math.cos(angle) * def.range, Math.sin(angle) * def.range);
    w.step(DT, still);
    expect(w.orbiters).toHaveLength(1 + levelBonus(def, 1).projectiles);
    expect(DUMMY.hp - e.hp).toBeCloseTo(hit('vendetta', 1), 9);
    expect(Math.hypot(e.x - w.x, e.y - w.y)).toBeCloseTo(def.range + def.knockback!, 6);
    expect(Math.atan2(e.y - w.y, e.x - w.x)).toBeCloseTo(angle, 6);
  });

  it('Mobile (grudge), which carries no knockback, still never pushes', () => {
    const w = world({ grudge: 1 });
    const def = weapon('grudge');
    expect(def.knockback).toBeUndefined();
    const angle = (def.projectileSpeed / def.range) * DT;
    const e = place(w, Math.cos(angle) * def.range, Math.sin(angle) * def.range);
    const before = { x: e.x, y: e.y };
    w.step(DT, still);
    expect(e.hp).toBeLessThan(DUMMY.hp);
    expect(e.x).toBe(before.x);
    expect(e.y).toBe(before.y);
  });
});

describe('Jumpiness: fires at everything, all the time', () => {
  it('fires more shots a second than a maxed Pointing beside the same Restlessness', () => {
    const shots = (items: Record<string, number>, source: string): number => {
      const w = world(items);
      for (let k = 0; k < 8; k++) {
        const a = (k * Math.PI * 2) / 8;
        place(w, Math.cos(a) * 250, Math.sin(a) * 250);
      }
      const seen = new Set<number>();
      for (let i = 0; i < 3 * 60; i++) {
        w.step(DT, still);
        for (const p of w.projectiles) if (p.source === source) seen.add(p.serial);
      }
      return seen.size;
    };
    const reflex = shots({ lash: weapon('lash').maxLevel, midpiece: 1 }, 'lash');
    const jumpy = shots({ jumpiness: 1, midpiece: 1 }, 'jumpiness');
    expect(reflex).toBeGreaterThan(0);
    expect(jumpy).toBeGreaterThan(reflex);
  });
});

describe('Backhand (reach): the arc is a circle', () => {
  it('hits an enemy directly behind the player on its first swing, and beside it', () => {
    const w = world({ reach: 1 });
    expect(w.facingX).toBe(1);
    const behind = place(w, -100, 0);
    const beside = place(w, 0, 100);
    const front = place(w, 100, 0);
    w.step(DT, still);
    for (const e of [behind, beside, front]) expect(DUMMY.hp - e.hp).toBeCloseTo(hit('reach', 1), 9);
    // Shoved straight out, the one behind included.
    expect(behind.x - w.x).toBeCloseTo(-(100 + weapon('reach').knockback!), 6);
    expect(w.sweeps).toHaveLength(1);
    expect(w.sweeps[0]!.arc).toBeCloseTo(Math.PI * 2, 9);
  });
});

describe('Judgement (hindsight): no warning', () => {
  it('lands on the step it is fired: three bolts, no telegraph, each target hurt once', () => {
    const w = world({ hindsight: 1 });
    // Further apart than two radii, so each bolt hurts only the one it picked.
    const targets = [place(w, 200, 0), place(w, -200, 0), place(w, 0, 200)];
    w.step(DT, still);
    expect(w.areas.some((a) => a.delay !== undefined && a.delay > 0)).toBe(false);
    for (const e of targets) expect(DUMMY.hp - e.hp).toBeCloseTo(hit('hindsight', 1), 9);
    // The flash lives out inside the cooldown, and nothing lands twice.
    for (let i = 0; i < 20; i++) w.step(DT, still);
    for (const e of targets) expect(DUMMY.hp - e.hp).toBeCloseTo(hit('hindsight', 1), 9);
  });

  it('does not spend a bolt on what an earlier one, landing first, already killed', () => {
    // Two frail ones inside one bolt's area and two sturdy ones far off: the
    // first bolt on either frail one kills both, and a later pick of the other
    // is skipped, so the three bolts always reach both sturdy targets.
    for (let seed = 1; seed <= 12; seed++) {
      const w = world({ hindsight: 1 }, seed);
      const frail = [place(w, 200, 0), place(w, 205, 0)];
      for (const e of frail) e.hp = 1;
      const sturdy = [place(w, -200, 0), place(w, 0, 200)];
      w.step(DT, still);
      for (const e of frail) expect(e.hp, `seed ${seed}`).toBeLessThanOrEqual(0);
      for (const e of sturdy) expect(DUMMY.hp - e.hp, `seed ${seed}`).toBeCloseTo(hit('hindsight', 1), 9);
    }
  });
});

describe('Baggage (rut): the trail holds', () => {
  it('slows an enemy standing on a footprint and still hurts it', () => {
    const w = world({ rut: 1 });
    const x0 = w.x;
    const y0 = w.y;
    w.step(DT, still);
    const trail = w.areas.find((a) => a.tick && a.damage > 0);
    expect(trail).toBeDefined();
    expect(trail!.slow).toBe(weapon('rut').slow);
    // The player walks off; the enemy stands where the footprint is.
    w.x += 200;
    const e = place(w, x0 - w.x, y0 - w.y);
    expect(w.slowAt(e.x, e.y)).toBeCloseTo(0.6, 9);
    for (let i = 0; i < 30; i++) w.step(DT, still);
    expect(e.hp).toBeLessThan(DUMMY.hp);
  });

  it('never holds the player: the trail is laid where they stand, and they walk it at full speed', () => {
    // `slowAt` reads every area with a `slow` for enemies and shots; the
    // player's own hold (`speed`) skips a damaging trail, or Baggage would hold
    // its owner for as long as they kept moving.
    const w = world({ rut: 1 });
    for (let i = 0; i < 60; i++) w.step(DT, { moveX: 1, moveY: 0 });
    expect(w.areas.some((a) => a.slow !== undefined && a.damage > 0)).toBe(true);
    expect(w.speed / w.baseSpeed).toBeCloseTo(1, 9);
  });

  it("Legos' footprints (wake) still hold nothing", () => {
    const w = world({ wake: 1 });
    w.step(DT, still);
    const trail = w.areas.find((a) => a.tick && a.damage > 0);
    expect(trail).toBeDefined();
    expect(trail!.slow).toBeUndefined();
  });
});

describe('the registry holds its evolutions to the rules (content)', () => {
  const evolutions = Object.values(ITEMS).filter((d): d is ActiveItem => isActive(d) && d.evolvesFrom !== undefined);
  const frames = (iconsAtlas as { frames: Record<string, unknown> }).frames;

  it("G-046's five are there, from the pairs it names, after Tantrum", () => {
    const ids = evolutions.map((d) => d.id);
    expect(ids[0]).toBe('tantrum');
    for (const { id, weapon: from, partner } of FIVE) {
      expect(ids, id).toContain(id);
      expect(weapon(id).evolvesFrom).toEqual({ weapon: from, with: partner });
    }
  });

  for (const def of evolutions) {
    it(`${def.id}`, () => {
      const { weapon: from, with: partner } = def.evolvesFrom!;
      expect(ITEMS[from], `"${def.id}" evolves from unknown "${from}"`).toBeDefined();
      expect(ITEMS[partner], `"${def.id}" needs unknown "${partner}"`).toBeDefined();
      const base = ITEMS[from]!;
      expect(isActive(base), `"${def.id}" evolves from a passive`).toBe(true);
      expect(isActive(base) && base.evolvesFrom, `"${def.id}" evolves from an evolution`).toBeFalsy();
      expect(partner).not.toBe(from);
      expect(def.maxLevel).toBe(1);
      expect(def.levels).toHaveLength(1);
      expect(def.paths, `"${def.id}": an evolution has no paths (G-046)`).toBeUndefined();
      expect(def.from, `"${def.id}" is gated by its partner, not by an act`).toBeUndefined();
      for (const line of [def.blurb, ...def.levels.map((l) => l.text)]) {
        expect(line, `"${line}"`).not.toMatch(/[0-9%]/);
        expect(line.length, `"${line}"`).toBeLessThan(64);
      }
      // Tantrum wears Spilt Milk's burst, which is drawn; the five wear their own
      // tags, drawn in a later wave, and say which file retires each.
      if (itemIconFrame(def.icon) in frames) {
        expect(def.iconPending).toBeUndefined();
      } else {
        expect(def.iconPending, `"${def.id}" has no frame and no pending note`).toBeDefined();
        expect(def.iconPending!).toContain(`tools/art/svg/conception/icon-${def.icon}.svg`);
      }
    });
  }

  it('no weapon evolves two ways: once the first replaced it, the second could never be ready', () => {
    const froms = evolutions.map((d) => d.evolvesFrom!.weapon);
    expect(new Set(froms).size).toBe(froms.length);
  });

  it('the five are drawn: each has its frame in the icon atlas and no pending note', () => {
    for (const { id } of FIVE) {
      const def = weapon(id);
      expect(itemIconFrame(def.icon) in frames, `${id} "${def.icon}"`).toBe(true);
      expect(def.iconPending, id).toBeUndefined();
    }
  });

  it('a strike delay of zero is the only one set; every other strike telegraphs', () => {
    for (const def of Object.values(ITEMS)) {
      if (!isActive(def) || def.strikeDelay === undefined) continue;
      expect(def.mode, def.id).toBe('strike');
      expect(def.strikeDelay, def.id).toBeGreaterThanOrEqual(0);
    }
    expect(weapon('judgement').strikeDelay).toBeUndefined();
    expect(weapon('hindsight').strikeDelay).toBe(0);
  });
});

describe('G-047: an evolution is paid at its weapon\'s max level', () => {
  it('Tantrum at level 1 scales as Spilt Milk did at 8', () => {
    expect(scalingLevel(ITEMS['tantrum']!, 1)).toBe(ITEMS['acrosome']!.maxLevel);
    expect(scalingLevel(ITEMS['acrosome']!, 3)).toBe(3);
  });

  it('a dealt Grudge (vendetta) hits at least as hard per fist as the maxed Mobile it replaced', () => {
    const before = world({ grudge: 8 });
    const after = world({ vendetta: 1 });
    const hit = (w: World, id: string): number => {
      const e = place(w, weapon(id).range, 0);
      const hp = e.hp;
      for (let i = 0; i < 120 && e.hp === hp; i++) w.step(DT, still);
      return hp - e.hp;
    };
    expect(hit(after, 'vendetta')).toBeGreaterThanOrEqual(hit(before, 'grudge'));
  });
});
