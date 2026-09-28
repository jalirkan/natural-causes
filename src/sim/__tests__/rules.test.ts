import { describe, expect, it } from 'vitest';
import { CONCEPTION, FAMILY, type ActDef } from '../../data/acts';
import { enemyDef, type EnemyDef } from '../../data/enemies';
import { ITEMS, OFFER_PATH_SEPARATOR, PATH_OPENS_AT, isActive, parseOfferId } from '../../data/items';
import { certificateConditions } from '../../scenes/certificate';
import { NO_RULES, RULES, RULE_IDS, type RuleId } from '../rules';
import { World, type EnemyState } from '../world';

/**
 * Challenge runs (G-055): rules chosen at the title and enforced inside the
 * sim, so the bots play the identical game. Couch Potato refuses the walk and
 * nothing else; One Trick starts empty-handed with three weapons on offer and
 * never deals another. A plain life is the game exactly as it was.
 *
 * Nothing here asserts a number from an act or an item; what is under test is
 * the rule's shape.
 */

const DT = 1 / 60;
const still = { moveX: 0, moveY: 0 };
const right = { moveX: 1, moveY: 0 };

/** Conception with nothing scheduled: nothing spawns but what a test places. */
const QUIET: ActDef = { ...CONCEPTION, waves: [] };
/** Family with nothing scheduled, for the phone. */
const QUIET_FAMILY: ActDef = { ...FAMILY, waves: [] };

let uid = 700000;
/** An enemy of `def`, placed relative to the player, built as `addEnemy` builds one. */
function place(w: World, def: EnemyDef, dx: number, dy: number): EnemyState {
  const e: EnemyState = {
    uid: uid++,
    hitBySerial: 0,
    hitByAreaSerial: 0,
    def,
    x: w.x + dx,
    y: w.y + dy,
    vx: 0,
    vy: 0,
    hp: def.hp,
    age: 0,
    hitFlash: 0,
    radius: def.radius,
    displaySize: def.displaySize,
    xp: def.xp,
    consult: 0,
    reload: 0,
    generation: 0,
  };
  w.enemies.push(e);
  return e;
}

/** The world's own roll, as a level-up would call it. Private: only the sim deals. */
function roll(w: World): string[] {
  return (w as unknown as { rollOffers(): string[] }).rollOffers();
}

/** A level reached by the sim's own path: the bar filled, the queue settled. */
function levelUp(w: World): void {
  w.xp = w.xpToNext;
  (w as unknown as { settleXp(): void }).settleXp();
}

const isWeapon = (id: string): boolean => ITEMS[id]?.kind === 'weapon';
/** The weapons One Trick's opening may deal: the kid's, none born later, none an evolution. */
const OPENING = Object.keys(ITEMS).filter((id) => {
  const def = ITEMS[id]!;
  return def.kind === 'weapon' && def.from === undefined && !(isActive(def) && def.evolvesFrom);
});

describe('the registry', () => {
  it('names every rule once, with a certificate line in the form’s register', () => {
    expect(Object.keys(RULES).sort()).toEqual([...RULE_IDS].sort());
    for (const id of RULE_IDS) {
      expect(RULES[id].id).toBe(id);
      expect(RULES[id].certificate).toMatch(/^[A-Z].*\.$/);
    }
  });

  it('a World refuses a rule the registry does not hold, rather than playing a plain life', () => {
    expect(() => new World({ act: QUIET, rules: ['sit-still' as RuleId] })).toThrow(/sit-still/);
    // Not fooled by what every object has.
    expect(() => new World({ act: QUIET, rules: ['toString' as RuleId] })).toThrow(/toString/);
  });

  it('holds each rule once, in the registry’s order, whatever order it was given in', () => {
    const w = new World({ act: QUIET, rules: ['one-trick', 'couch-potato', 'one-trick'] });
    expect(w.rules).toEqual(['couch-potato', 'one-trick']);
    expect(new World({ act: QUIET }).rules).toEqual([]);
  });
});

describe('Couch Potato: the walk is refused, nothing else is', () => {
  it('sixty steps of full right do not move the player, and the plain life does', () => {
    const couch = new World({ act: QUIET, seed: 5, rules: ['couch-potato'] });
    const plain = new World({ act: QUIET, seed: 5 });
    const x0 = couch.x;
    const y0 = couch.y;
    for (let i = 0; i < 60; i++) {
      couch.step(DT, right);
      plain.step(DT, right);
    }
    expect(couch.time).toBeCloseTo(1, 9);
    expect(couch.x).toBe(x0);
    expect(couch.y).toBe(y0);
    expect(plain.x).toBeGreaterThan(x0 + 50);
  });

  it('the stick still turns the player: facing is the aim', () => {
    const w = new World({ act: QUIET, seed: 5, rules: ['couch-potato'] });
    const x0 = w.x;
    w.step(DT, { moveX: 0, moveY: -1 });
    expect(w.facingX).toBeCloseTo(0, 9);
    expect(w.facingY).toBe(-1);
    w.step(DT, { moveX: -1, moveY: 0 });
    expect(w.facingX).toBe(-1);
    expect(w.x).toBe(x0);
  });

  it('still takes contact damage', () => {
    const w = new World({ act: QUIET, seed: 5, rules: ['couch-potato'], startingItems: [] });
    const rival = enemyDef('rival-sperm');
    expect(rival.contact).toBe('damage');
    const hp0 = w.hp;
    place(w, rival, 0, 0);
    w.step(DT, right);
    expect(w.hp).toBeLessThan(hp0);
  });

  it('is still shoved: a pile that lands on the player pushes them out', () => {
    const w = new World({ act: QUIET, seed: 5, rules: ['couch-potato'], startingItems: [] });
    const homework = enemyDef('homework');
    expect(homework.merge).toBe(true);
    const pile = place(w, homework, 4, 0);
    w.step(DT, right);
    expect(Math.hypot(w.x - pile.x, w.y - pile.y)).toBeGreaterThanOrEqual(pile.radius + w.playerRadius - 0.001);
  });

  it('is still pulled: a landing call carries the player `pull` px toward the phone', () => {
    const phoneDef = enemyDef('phone-call');
    const pull = phoneDef.ranged!.pull!;
    const w = new World({ act: QUIET_FAMILY, seed: 41, rules: ['couch-potato'], startingItems: [] });
    const phone = place(w, phoneDef, 360, 0);
    for (let i = 0; i < 600 && !w.projectiles.some((p) => p.hostile); i++) w.step(DT, right);
    expect(w.projectiles.some((p) => p.hostile), 'the phone never rang').toBe(true);
    let x0 = w.x;
    let y0 = w.y;
    for (let i = 0; i < 600 && w.stunTimer === 0; i++) {
      x0 = w.x;
      y0 = w.y;
      w.step(DT, right);
    }
    expect(w.stunTimer, 'the call never landed').toBeGreaterThan(0);
    const before = Math.hypot(phone.x - x0, phone.y - y0);
    const after = Math.hypot(phone.x - w.x, phone.y - w.y);
    expect(before - after).toBeCloseTo(pull, 6);
  });
});

describe('One Trick: three weapons first, and never another', () => {
  it('opens on an offer of three distinct weapons, empty-handed, before the first step', () => {
    for (const seed of [1, 2, 3, 17, 99]) {
      const w = new World({ act: CONCEPTION, seed, rules: ['one-trick'] });
      expect(w.time).toBe(0);
      expect([...w.items.keys()]).toEqual([]);
      expect(w.level).toBe(1);
      expect(w.choosingTrick).toBe(true);
      expect(w.offers).not.toBeNull();
      expect(w.offers).toHaveLength(3);
      expect(new Set(w.offers).size).toBe(3);
      for (const id of w.offers!) expect(OPENING, id).toContain(id);
      // The choice is the only input: the world holds until it is made.
      w.step(DT, right);
      expect(w.time).toBe(0);
    }
  });

  it('the opening is a choice, not a level: the bar and the level stay where they were', () => {
    const w = new World({ act: CONCEPTION, seed: 3, rules: ['one-trick'] });
    const bar = w.xpToNext;
    w.choose(w.offers![1]!);
    expect(w.offers).toBeNull();
    expect(w.choosingTrick).toBe(false);
    expect(w.level).toBe(1);
    expect(w.xpToNext).toBe(bar);
    expect([...w.items]).toEqual([[w.items.keys().next().value!, 1]]);
    w.step(DT, still);
    expect(w.time).toBeGreaterThan(0);
  });

  it('after the choice no other weapon is ever dealt; its levels, its paths, passives and controls are', () => {
    const w = new World({ act: CONCEPTION, seed: 11, rules: ['one-trick'] });
    const trick = w.offers![0]!;
    w.choose(trick);
    const seen = new Set<string>();
    for (let n = 0; n < 300; n++) {
      const offers = roll(w);
      for (const id of offers) {
        seen.add(id);
        const { item } = parseOfferId(id);
        if (isWeapon(item.id)) expect(item.id, `offer ${n}: ${offers.join(', ')}`).toBe(trick);
      }
      // Take them in turn, as a person spreading their picks would.
      if (offers.length > 0) {
        w.offers = offers;
        w.choose(offers[n % offers.length]!);
      }
    }
    const kinds = new Set([...seen].map((id) => (id.includes(OFFER_PATH_SEPARATOR) ? 'path' : ITEMS[id]!.kind)));
    expect(seen.has(trick), 'the weapon’s own level never came up').toBe(true);
    expect(kinds.has('passive')).toBe(true);
    expect(kinds.has('control')).toBe(true);
    if (ITEMS[trick]!.kind === 'weapon' && isActive(ITEMS[trick]!) && ITEMS[trick]!.paths) {
      expect(w.items.get(trick) ?? 0).toBeGreaterThanOrEqual(PATH_OPENS_AT);
      expect(kinds.has('path'), 'the weapon’s paths never came up').toBe(true);
    }
  });

  it('the evolution is still dealt, and replaces the trick without opening the pool', () => {
    // Spilt Milk → Tantrum (with Restlessness): the first opening that holds it.
    let w: World | null = null;
    for (let seed = 1; seed < 200 && !w; seed++) {
      const c = new World({ act: CONCEPTION, seed, rules: ['one-trick'] });
      if (c.offers!.includes('acrosome')) w = c;
    }
    expect(w, 'no seed under 200 opened on Spilt Milk').not.toBeNull();
    w!.choose('acrosome');
    w!.items.set('acrosome', ITEMS['acrosome']!.maxLevel);
    w!.items.set('midpiece', 1);
    levelUp(w!);
    expect(w!.offers).toEqual(['tantrum']);
    w!.choose('tantrum');
    expect(w!.items.has('acrosome')).toBe(false);
    expect(w!.items.get('tantrum')).toBe(1);
    for (let n = 0; n < 200; n++) {
      for (const id of roll(w!)) expect(isWeapon(parseOfferId(id).item.id), id).toBe(false);
    }
  });

  it('a life given its weapon by name has its one trick, and is dealt no other', () => {
    const w = new World({ act: CONCEPTION, seed: 4, rules: ['one-trick'], startingItems: ['grudge'] });
    expect(w.offers).toBeNull();
    for (let n = 0; n < 200; n++) {
      for (const id of roll(w)) {
        const { item } = parseOfferId(id);
        if (isWeapon(item.id)) expect(item.id).toBe('grudge');
      }
    }
  });

  it('a life that somehow holds no weapon, with no offer up, is dealt weapons at its next level', () => {
    const w = new World({ act: CONCEPTION, seed: 8, rules: ['one-trick'], startingItems: ['midpiece'] });
    expect(w.choosingTrick).toBe(true);
    // Built oddly: the opening taken away unanswered.
    w.offers = null;
    levelUp(w);
    expect(w.offers).toHaveLength(3);
    for (const id of w.offers!) expect(OPENING).toContain(id);
  });

  it('under both rules, the life opens on the weapons and stands still after', () => {
    const w = new World({ act: QUIET, seed: 6, rules: ['couch-potato', 'one-trick'] });
    expect(w.offers).toHaveLength(3);
    w.choose(w.offers![0]!);
    const x0 = w.x;
    for (let i = 0; i < 60; i++) w.step(DT, right);
    expect(w.x).toBe(x0);
  });
});

describe('the certificate names the rules', () => {
  /** A life of Conception played `seconds`, taking the first card, then let die. */
  function lived(options: ConstructorParameters<typeof World>[0], seconds: number): World {
    const w = new World(options);
    for (let i = 0; i < seconds * 60; i++) {
      if (w.offers) {
        w.choose(w.offers[0]!);
        continue;
      }
      w.hp = w.maxHp;
      w.step(DT, { moveX: Math.sin(i / 90), moveY: Math.cos(i / 70) });
    }
    w.hp = 0.01;
    for (let i = 0; i < 20000 && !w.dead; i++) {
      if (w.offers) w.choose(w.offers[0]!);
      else w.step(DT, still);
    }
    expect(w.dead, 'the life did not end').toBe(true);
    return w;
  }

  it('a ruled life’s certificate carries its rules, and the form prints each one’s line', () => {
    const w = lived({ act: CONCEPTION, seed: 9, rules: ['one-trick', 'couch-potato'] }, 20);
    expect(w.certificate!.rules).toEqual(['couch-potato', 'one-trick']);
    expect(certificateConditions(w.certificate!)).toEqual([
      RULES['couch-potato'].certificate,
      RULES['one-trick'].certificate,
    ]);
    expect(certificateConditions(w.certificate!)).toEqual(['Never moved.', 'Had one trick.']);
  });

  it('the win carries them too', () => {
    const w = new World({ act: QUIET, seed: 3, rules: ['couch-potato'] });
    w.actTime = w.act.durationSeconds;
    w.step(DT, still);
    const b = w.boss!;
    b.hp = 0;
    b.phase = 'absorbing';
    b.timer = 0;
    w.step(DT, still);
    expect(w.won).toBe(true);
    expect(w.certificate!.rules).toEqual(['couch-potato']);
    expect(w.certificate!.causeId).toBe('natural-causes');
  });

  it('a plain life is the game as it was: `rules: []` and no option play the same life to the same certificate', () => {
    const none = lived({ act: CONCEPTION, seed: 21 }, 90);
    const empty = lived({ act: CONCEPTION, seed: 21, rules: [] }, 90);
    const named = lived({ act: CONCEPTION, seed: 21, rules: NO_RULES }, 90);
    expect(none.certificate!.rules).toEqual([]);
    expect(certificateConditions(none.certificate!)).toEqual([]);
    for (const w of [empty, named]) {
      expect(w.certificate).toEqual(none.certificate);
      expect([w.time, w.kills, w.level, w.x, w.y]).toEqual([none.time, none.kills, none.level, none.x, none.y]);
      expect([...w.items]).toEqual([...none.items]);
    }
    // Pointing, as it always was.
    expect(none.items.has('lash')).toBe(true);
  });
});
