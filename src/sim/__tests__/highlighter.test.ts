import { describe, expect, it } from 'vitest';
import { ADOLESCENCE, ALL_ACTS, COLLEGE, CONCEPTION, SCHOOL, type ActDef } from '../../data/acts';
import { enemyDef, type EnemyDef } from '../../data/enemies';
import { ITEMS, isActive, levelBonus, offerIdFor, type ActiveItem, type ItemPath } from '../../data/items';
import { heldLines, statLines } from '../../data/item-text';
import { BOSS_RADIUS, World, type BossState, type EnemyState } from '../world';

/**
 * College's Highlighter: a seeking stroke that MARKS what it lands on, and a
 * mark that makes everything hit harder for a while (items.ts `marks`). The
 * numbers are placeholders, so these read them off the data and assert the
 * shape: a hit marks for its seconds and no longer, every damage path pays
 * the mark through one gate, a mark does not stack, each path folds, the item
 * is born at eighteen, the card prints the mark, and nothing rolls a die.
 */

/** No schedule, so nothing is on the field but what the test places there. */
const QUIET: ActDef = {
  id: 'highlighter-fixture',
  name: 'Fixture',
  durationSeconds: 300,
  bossName: 'Fixture',
  boss: { kind: 'egg' },
  age: { from: 0, to: 0 },
  waves: [],
};

/** A target that stands still and outlives anything these tests throw at it. */
const DUMMY: EnemyDef = { ...enemyDef('rival-sperm'), movement: 'static', speed: 0, hp: 100000 };

const DT = 1 / 60;
const STILL = { moveX: 0, moveY: 0 };

let uid = 500000;
function place(w: World, dx: number, dy: number, def: EnemyDef = DUMMY): EnemyState {
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
  };
  w.enemies.push(e);
  return e;
}

function weapon(id: string): ActiveItem {
  const def = ITEMS[id];
  if (!def || !isActive(def)) throw new Error(`"${id}" is not an active item`);
  return def;
}

const HIGHLIGHTER = weapon('highlighter');
const MARKS = HIGHLIGHTER.marks!;

function pathOf(id: string): ItemPath {
  const path = HIGHLIGHTER.paths?.find((p) => p.id === id);
  if (!path) throw new Error(`the Highlighter has no path "${id}"`);
  return path;
}

function world(items: Record<string, number>, seed = 1): World {
  const w = new World({ act: QUIET, seed, startingItems: [] });
  for (const [id, level] of Object.entries(items)) w.items.set(id, level);
  return w;
}

/** Takes one level of an offer the way a player does: it is offered, then chosen. */
function takeOffer(w: World, id: string): void {
  w.offers = [id];
  w.choose(id);
  expect(w.offers).toBeNull();
}

/** Steps until `e` is marked; returns the life-clock time of the hit that marked it. */
function stepUntilMarked(w: World, e: { markedUntil?: number }, limit = 5): number {
  for (let i = 0; i < limit * 60; i++) {
    w.step(DT, STILL);
    if (e.markedUntil !== undefined) return w.time;
  }
  throw new Error('never marked');
}

/** Whether the gate reads `e` as marked now: the same comparison `markOn` makes. */
const marked = (w: World, e: { markedUntil?: number }): boolean =>
  e.markedUntil !== undefined && w.time < e.markedUntil;

/** A permanent mark of `k`, written straight on, for measuring the gate alone. */
function markForever(t: { markedUntil?: number; markMultiplier?: number }, k: number): void {
  t.markedUntil = Number.POSITIVE_INFINITY;
  t.markMultiplier = k;
}

describe('the item', () => {
  it('is a College weapon that seeks, hits softly and marks', () => {
    expect(HIGHLIGHTER.kind).toBe('weapon');
    expect(HIGHLIGHTER.mode).toBe('seeking');
    expect(HIGHLIGHTER.from).toBe(COLLEGE.id);
    expect(HIGHLIGHTER.maxLevel).toBe(8);
    expect(MARKS.seconds).toBeGreaterThan(0);
    expect(MARKS.multiplier).toBeGreaterThan(1);
    // The pen, not the argument: softer than Reflex, the weapon every life starts with.
    expect(HIGHLIGHTER.damage).toBeLessThan(weapon('lash').damage);
    expect(HIGHLIGHTER.paths!.map((p) => p.id)).toEqual(['fluorescent', 'every-page', 'underline']);
  });
});

describe('a hit marks', () => {
  it('for `seconds` from the hit, and not longer: a second weapon pays the mark inside it and not after', () => {
    const w = world({ highlighter: 1 });
    const e = place(w, 60, 0);
    const hitAt = stepUntilMarked(w, e);
    const seconds = MARKS.seconds * levelBonus(HIGHLIGHTER, 1).duration;
    expect(e.markedUntil).toBeCloseTo(hitAt + seconds, 9);
    expect(e.markMultiplier).toBe(MARKS.multiplier);

    // The pen goes down, so nothing marks it again; a ring that hurts once
    // per cooldown measures the mark from the outside.
    w.items.delete('highlighter');
    w.items.set('personal-space', 1);
    const ring = weapon('personal-space').damage;
    let inside = 0;
    let after = 0;
    let hp = e.hp;
    while (w.time < hitAt + seconds + 3) {
      w.step(DT, STILL);
      const took = hp - e.hp;
      hp = e.hp;
      if (took === 0) continue;
      if (w.time < hitAt + seconds) {
        expect(took, `at ${w.time.toFixed(3)}s, inside the mark`).toBeCloseTo(ring * MARKS.multiplier, 9);
        inside++;
      } else {
        expect(took, `at ${w.time.toFixed(3)}s, after the mark`).toBeCloseTo(ring, 9);
        after++;
      }
    }
    expect(inside).toBeGreaterThan(0);
    expect(after).toBeGreaterThan(0);
    expect(marked(w, e)).toBe(false);
  });

  it('the stroke that marks is paid unmarked; the next one is paid marked', () => {
    const w = world({ highlighter: 1 });
    const e = place(w, 60, 0);
    const before = e.hp;
    stepUntilMarked(w, e);
    expect(before - e.hp).toBeCloseTo(HIGHLIGHTER.damage, 9);
    // The second stroke lands inside the first's mark (cooldown < seconds).
    expect(HIGHLIGHTER.cooldown).toBeLessThan(MARKS.seconds);
    const hp = e.hp;
    for (let i = 0; i < 120 && hp === e.hp; i++) w.step(DT, STILL);
    expect(hp - e.hp).toBeCloseTo(HIGHLIGHTER.damage * MARKS.multiplier, 9);
  });

  it('a marked enemy that dies drops what it always drops, and nothing else', () => {
    const w = world({ highlighter: 1 });
    const frail: EnemyDef = { ...DUMMY, hp: HIGHLIGHTER.damage * 1.5 };
    const e = place(w, 60, 0, frail);
    stepUntilMarked(w, e);
    expect(w.enemies).toContain(e);
    expect(w.gems).toHaveLength(0);
    for (let i = 0; i < 120 && w.enemies.includes(e); i++) w.step(DT, STILL);
    expect(w.enemies).not.toContain(e);
    expect(w.gems).toHaveLength(1);
    expect(w.gems[0]!.value).toBe(e.xp);
    expect(w.kills).toBe(1);
  });

  it('does not stack: a second mark restarts the clock and does not multiply again', () => {
    const w = world({ highlighter: 1 });
    const e = place(w, 60, 0);
    const first = stepUntilMarked(w, e);
    const firstUntil = e.markedUntil!;
    // The next stroke, one cooldown later, lands inside the first mark.
    let second = first;
    for (let i = 0; i < 120 && e.markedUntil === firstUntil; i++) {
      w.step(DT, STILL);
      second = w.time;
    }
    expect(second).toBeLessThan(firstUntil);
    expect(e.markedUntil).toBeCloseTo(second + MARKS.seconds, 9);
    expect(e.markMultiplier).toBe(MARKS.multiplier);
    // And what it costs a second weapon is one multiplier, not two.
    w.items.delete('highlighter');
    w.items.set('acrosome', 1);
    const hp = e.hp;
    w.step(DT, STILL);
    expect(hp - e.hp).toBeCloseTo(weapon('acrosome').damage * MARKS.multiplier, 9);
  });

  it('a real mark: a different weapon and an area both pay it', () => {
    // An orbiter (another weapon) and a burst (an area), each after a real
    // Highlighter hit, against the same hit on an unmarked twin.
    for (const [id, dx] of [
      ['grudge', 70],
      ['acrosome', 50],
    ] as const) {
      const took = (mark: boolean): number => {
        const w = world(mark ? { highlighter: 1 } : {});
        const e = place(w, dx, 0);
        if (mark) {
          stepUntilMarked(w, e);
          w.items.delete('highlighter');
        }
        w.items.set(id, 1);
        const start = e.hp;
        // Inside the mark's seconds: an orbiter may need most of a turn to come round.
        for (let i = 0; i < 150 && e.hp === start; i++) w.step(DT, STILL);
        if (mark) expect(marked(w, e), id).toBe(true);
        return start - e.hp;
      };
      const plain = took(false);
      expect(plain, id).toBeGreaterThan(0);
      expect(took(true), id).toBeCloseTo(plain * MARKS.multiplier, 9);
    }
  });
});

describe('every damage path pays the mark through the gate', () => {
  // Marked and unmarked twins of one world: same seed, same placement, same
  // steps, so every hit lands the same and the only difference is the mark.
  // The mark is written straight on and never runs out, so this measures the
  // gate and nothing else; the tests above measure the marking.
  const K = 1.75;
  const cases: Array<{ path: string; id: string; dx: number; dy: number }> = [
    { path: 'a seeking shot', id: 'lash', dx: 120, dy: 0 },
    { path: 'a line shot', id: 'motility', dx: 120, dy: 0 },
    { path: 'a chained shot', id: 'group-chat', dx: 120, dy: 0 },
    { path: 'an orbiter', id: 'grudge', dx: 70, dy: 0 },
    { path: 'a one-shot area (burst)', id: 'acrosome', dx: 50, dy: 0 },
    { path: 'a ticking area (trail)', id: 'wake', dx: 0, dy: 0 },
    { path: 'an aura', id: 'personal-space', dx: 60, dy: 0 },
    { path: 'a sweep', id: 'backhand', dx: 80, dy: 0 },
    { path: 'a landing strike', id: 'judgement', dx: 120, dy: 0 },
  ];

  for (const c of cases) {
    it(`on an enemy: ${c.path} (${c.id})`, () => {
      const took = (mark: boolean): number => {
        const w = world({ [c.id]: 1 }, 3);
        const e = place(w, c.dx, c.dy);
        // Gossip needs a second body to jump to; it is the one measured.
        if (c.id === 'group-chat') place(w, c.dx + 40, c.dy);
        if (mark) markForever(e, K);
        for (let i = 0; i < 120; i++) {
          w.hp = w.maxHp;
          w.step(DT, STILL);
        }
        return DUMMY.hp - e.hp;
      };
      const plain = took(false);
      expect(plain).toBeGreaterThan(0);
      expect(took(true)).toBeCloseTo(plain * K, 6);
    });
  }

  const bossCases: Array<{ path: string; id: string }> = [
    { path: 'a shot (updateBoss)', id: 'lash' },
    { path: 'an area (updateBoss)', id: 'acrosome' },
    { path: 'an aura (damageBoss)', id: 'personal-space' },
    { path: 'a landing strike (damageBoss)', id: 'judgement' },
  ];

  for (const c of bossCases) {
    it(`on the boss: ${c.path} (${c.id})`, () => {
      const took = (mark: boolean): number => {
        const w = world({}, 3);
        w.time = QUIET.durationSeconds;
        w.step(DT, STILL);
        const b: BossState = w.boss!;
        expect(b).not.toBeNull();
        w.x = b.x;
        w.y = b.y + BOSS_RADIUS + 60;
        if (mark) markForever(b, K);
        w.items.set(c.id, 1);
        const start = b.hp;
        for (let i = 0; i < 60; i++) {
          w.hp = w.maxHp;
          w.step(DT, STILL);
        }
        return start - b.hp;
      };
      const plain = took(false);
      expect(plain).toBeGreaterThan(0);
      expect(took(true)).toBeCloseTo(plain * K, 6);
    });
  }

  it('a stroke marks the boss too, and the next hit on him is paid marked', () => {
    const w = world({}, 3);
    w.time = QUIET.durationSeconds;
    w.step(DT, STILL);
    const b = w.boss!;
    w.x = b.x;
    w.y = b.y + BOSS_RADIUS + 60;
    w.items.set('highlighter', 1);
    stepUntilMarked(w, b);
    expect(b.markMultiplier).toBe(MARKS.multiplier);
    w.items.delete('highlighter');
    w.items.set('acrosome', 1);
    const hp = b.hp;
    w.step(DT, STILL);
    expect(hp - b.hp).toBeCloseTo(weapon('acrosome').damage * MARKS.multiplier, 9);
  });
});

describe('the levels and each path fold into the mark', () => {
  /** The first stroke's mark and how many strokes the first volley fires, with `setup` applied. */
  function firstVolley(level: number, setup: (w: World) => void = () => {}) {
    const w = world({ highlighter: level });
    setup(w);
    const targets = [0, 1, 2, 3, 4, 5, 6, 7].map((k) => place(w, 60 + 12 * k, 30 * (k % 3) - 30));
    w.step(DT, STILL);
    const strokes = w.projectiles.filter((p) => p.source === 'highlighter');
    expect(strokes.length).toBeGreaterThan(0);
    // The nearest, so the first stroke's target.
    const e = targets[0]!;
    return { w, e, strokes, seconds: strokes[0]!.markSeconds!, k: strokes[0]!.markMultiplier! };
  }

  it('the levels table: longer marks, more strokes, harder marks, from the data', () => {
    for (let level = 1; level <= HIGHLIGHTER.maxLevel; level++) {
      const b = levelBonus(HIGHLIGHTER, level);
      const v = firstVolley(level);
      expect(v.seconds, `level ${level}`).toBeCloseTo(MARKS.seconds * b.duration, 9);
      expect(v.k, `level ${level}`).toBeCloseTo(MARKS.multiplier * b.mark, 9);
      expect(v.strokes, `level ${level}`).toHaveLength(1 + b.projectiles);
    }
    const top = levelBonus(HIGHLIGHTER, HIGHLIGHTER.maxLevel);
    expect(top.duration).toBeGreaterThan(1);
    expect(top.mark).toBeGreaterThan(1);
    expect(top.projectiles).toBeGreaterThan(0);
    expect(top.cooldown).toBeLessThan(1);
  });

  it('Fluorescent: `duration` lengthens the mark, by the path’s multiplier per level', () => {
    const path = pathOf('fluorescent');
    const base = firstVolley(2).seconds;
    let expected = base;
    for (let n = 1; n <= path.maxLevel; n++) {
      expected *= path.levels[n - 1]!.duration!;
      const v = firstVolley(2, (w) => {
        for (let i = 0; i < n; i++) takeOffer(w, offerIdFor(HIGHLIGHTER, path));
      });
      expect(v.seconds, `Fluorescent ${n}`).toBeCloseTo(expected, 9);
      // And the enemy it lands on is marked that long.
      const hitAt = stepUntilMarked(v.w, v.e);
      expect(v.e.markedUntil! - hitAt).toBeCloseTo(expected, 9);
    }
    expect(expected).toBeGreaterThan(base);
  });

  it('Every Page: `projectiles` adds a stroke per level, each at a distinct target', () => {
    const path = pathOf('every-page');
    const base = firstVolley(2).strokes.length;
    for (let n = 1; n <= path.maxLevel; n++) {
      const v = firstVolley(2, (w) => {
        for (let i = 0; i < n; i++) takeOffer(w, offerIdFor(HIGHLIGHTER, path));
      });
      let added = 0;
      for (const l of path.levels.slice(0, n)) added += l.projectiles ?? 0;
      expect(added).toBe(n);
      expect(v.strokes, `Every Page ${n}`).toHaveLength(base + added);
    }
  });

  it('Underline: `mark` raises the multiplier, by the path’s multiplier per level', () => {
    const path = pathOf('underline');
    const base = firstVolley(2).k;
    let expected = base;
    for (let n = 1; n <= path.maxLevel; n++) {
      expected *= path.levels[n - 1]!.mark!;
      const v = firstVolley(2, (w) => {
        for (let i = 0; i < n; i++) takeOffer(w, offerIdFor(HIGHLIGHTER, path));
      });
      expect(v.k, `Underline ${n}`).toBeCloseTo(expected, 9);
      stepUntilMarked(v.w, v.e);
      expect(v.e.markMultiplier).toBeCloseTo(expected, 9);
    }
    expect(expected).toBeGreaterThan(base);
  });

  it('a weapon with no `marks` carries none, whatever its levels hold', () => {
    const w = world({ lash: 8, wake: 8 });
    place(w, 80, 0);
    w.step(DT, STILL);
    for (const p of w.projectiles) {
      expect(p.markSeconds).toBeUndefined();
      expect(p.markMultiplier).toBeUndefined();
    }
  });
});

describe('born at eighteen: the pool has it from College and never before', () => {
  const roll = (w: World) => (w as unknown as { rollOffers(): string[] }).rollOffers();

  it('a one-act life before College never rolls it; one of College does', () => {
    for (const act of [CONCEPTION, SCHOOL, ADOLESCENCE]) {
      const w = new World({ act, seed: 7 });
      for (let i = 0; i < 300; i++) {
        for (const id of roll(w)) expect(id, `${act.id} rolled it`).not.toBe('highlighter');
      }
    }
    const w = new World({ act: COLLEGE, seed: 7 });
    const seen = new Set<string>();
    for (let i = 0; i < 300; i++) for (const id of roll(w)) seen.add(id);
    expect(seen.has('highlighter'), 'College never rolled it').toBe(true);
  });

  it('in a whole life it enters the pool at College and stays for every act after', () => {
    const w = new World({ acts: ALL_ACTS, seed: 11 });
    const college = ALL_ACTS.indexOf(COLLEGE);
    expect(college).toBeGreaterThan(0);
    for (let index = 0; index < ALL_ACTS.length; index++) {
      w.actIndex = index;
      const seen = new Set<string>();
      for (let i = 0; i < 300; i++) for (const id of roll(w)) seen.add(id);
      expect(seen.has('highlighter'), `act ${ALL_ACTS[index]!.id}`).toBe(index >= college);
    }
  });

  it('its paths open like any weapon’s, once it is held at the opening level', () => {
    const w = new World({ act: COLLEGE, seed: 5, startingItems: [] });
    w.items.set('highlighter', 2);
    const seen = new Set<string>();
    for (let i = 0; i < 400; i++) for (const id of roll(w)) seen.add(id);
    for (const path of HIGHLIGHTER.paths!) expect(seen.has(offerIdFor(HIGHLIGHTER, path)), path.id).toBe(true);
  });
});

describe('the card prints the mark from the data (G-043)', () => {
  const NEW = { level: 0, pathLevel: 0 };
  const joined = (id: string, owned = NEW) => statLines(id, owned).join(' · ');
  const times = (n: number) => `×${Math.round(n * 100) / 100}`;
  const pct = (m: number) => `+${Math.round((m - 1) * 100)}%`;

  it('a new Highlighter: its damage, cadence, range and the mark', () => {
    const line = joined('highlighter');
    expect(line).toContain(`damage ${HIGHLIGHTER.damage}`);
    expect(line).toContain(`every ${HIGHLIGHTER.cooldown}s`);
    expect(line).toContain(`range ${HIGHLIGHTER.range}`);
    expect(line).toContain(`marks ${times(MARKS.multiplier)} for ${MARKS.seconds}s`);
  });

  it('each level prints what it adds to the mark, in the mark’s own words', () => {
    for (let level = 1; level < HIGHLIGHTER.maxLevel; level++) {
      const l = HIGHLIGHTER.levels[level]!;
      const line = joined('highlighter', { level, pathLevel: 0 });
      if (l.duration !== undefined) expect(line, `level ${level + 1}`).toContain(`mark lasts ${pct(l.duration)}`);
      if (l.mark !== undefined) expect(line, `level ${level + 1}`).toContain(`mark ${pct(l.mark)}`);
      if (l.projectiles !== undefined) expect(line, `level ${level + 1}`).toContain(`+${l.projectiles} target`);
      // A trail's word never reaches a pen.
      expect(line, `level ${level + 1}`).not.toMatch(/(^|· )lasts/);
    }
  });

  it('each path card prints its own level', () => {
    const fl = pathOf('fluorescent');
    const ep = pathOf('every-page');
    const ul = pathOf('underline');
    expect(joined(offerIdFor(HIGHLIGHTER, fl), { level: 2, pathLevel: 0 })).toBe(
      `mark lasts ${pct(fl.levels[0]!.duration!)}`,
    );
    expect(joined(offerIdFor(HIGHLIGHTER, ep), { level: 2, pathLevel: 0 })).toBe(
      `+${ep.levels[0]!.projectiles} target`,
    );
    expect(joined(offerIdFor(HIGHLIGHTER, ul), { level: 2, pathLevel: 0 })).toBe(`mark ${pct(ul.levels[0]!.mark!)}`);
  });

  it('the build sheet prints the mark as held: levels and paths folded as the sim folds them', () => {
    const fl = pathOf('fluorescent');
    const ul = pathOf('underline');
    const paths = new Map([
      [offerIdFor(HIGHLIGHTER, fl), fl.maxLevel],
      [offerIdFor(HIGHLIGHTER, ul), ul.maxLevel],
    ]);
    const b = levelBonus(HIGHLIGHTER, HIGHLIGHTER.maxLevel);
    let seconds = MARKS.seconds * b.duration;
    let k = MARKS.multiplier * b.mark;
    for (const l of fl.levels) seconds *= l.duration!;
    for (const l of ul.levels) k *= l.mark!;
    const secs = `${Math.round(seconds * 100) / 100}s`;
    expect(heldLines('highlighter', HIGHLIGHTER.maxLevel, paths).join(' · ')).toContain(`marks ${times(k)} for ${secs}`);
    // And the sim pays exactly that: the stroke's mark at the same holding.
    const w = world({ highlighter: HIGHLIGHTER.maxLevel });
    for (const [id, n] of paths) w.pathLevels.set(id, n);
    place(w, 80, 0);
    w.step(DT, STILL);
    const stroke = w.projectiles.find((p) => p.source === 'highlighter')!;
    expect(stroke.markSeconds).toBeCloseTo(seconds, 9);
    expect(stroke.markMultiplier).toBeCloseTo(k, 9);
  });

  it('the copy claims no number: the card prints them', () => {
    for (const line of [HIGHLIGHTER.blurb, ...HIGHLIGHTER.levels.map((l) => l.text)]) {
      expect(line, line).not.toMatch(/[0-9%]/);
    }
  });
});

describe('no dice', () => {
  it('marking draws nothing from the world’s dice: a Highlighter life draws what an empty one does', () => {
    const draws = (items: Record<string, number>): number => {
      const w = world(items, 9);
      for (let k = 0; k < 6; k++) place(w, 60 + 20 * k, (k % 2) * 40 - 20);
      const inner = w as unknown as { rng: () => number };
      const real = inner.rng;
      let n = 0;
      inner.rng = () => {
        n++;
        return real();
      };
      for (let i = 0; i < 6 * 60; i++) {
        w.hp = w.maxHp;
        w.step(DT, STILL);
      }
      if (items['highlighter']) expect(w.enemies.some((e) => e.markedUntil !== undefined)).toBe(true);
      return n;
    };
    expect(draws({ highlighter: HIGHLIGHTER.maxLevel })).toBe(draws({}));
    expect(draws({ highlighter: HIGHLIGHTER.maxLevel, grudge: 1 })).toBe(draws({ grudge: 1 }));
    // Beside a weapon that does roll (Judgement's pick), the mark adds no draw and takes none away.
    const judged = draws({ judgement: 1 });
    expect(judged).toBeGreaterThan(0);
    expect(draws({ highlighter: HIGHLIGHTER.maxLevel, judgement: 1 })).toBe(judged);
  });
});
