import { describe, expect, it } from 'vitest';
import { ALL_ACTS, FAMILY, type ActDef } from '../../data/acts';
import { enemyDef, type EnemyDef } from '../../data/enemies';
import { heldLines, statLines } from '../../data/item-text';
import {
  ITEMS,
  damageScale,
  isActive,
  levelBonus,
  offerIdFor,
  strikeDelayAt,
  type ActiveItem,
  type ItemPath,
} from '../../data/items';
import { World, type AreaState, type EnemyState } from '../world';

/**
 * G-050's first item: the Strongly Worded Letter, born in Family. A strike
 * that marks the NEAREST enemy where it stands when the letter is sent
 * (`strikeNearest`, no dice) and lands on that spot `strikeDelay` later,
 * whatever has moved since. Every number is a PLACEHOLDER under FAMILY's
 * `provisional`, so these tests read them off the registry and assert
 * behaviour, direction and structure, never a value.
 */

const ID = 'strongly-worded-letter';

/** No schedule, so nothing is on the field but what the test places there. */
const QUIET: ActDef = {
  id: 'letter-fixture',
  name: 'Fixture',
  durationSeconds: 300,
  bossName: 'Fixture',
  boss: { kind: 'egg' },
  age: { from: 0, to: 0 },
  waves: [],
};

/** A target that stands still and does not die of one letter. */
const DUMMY: EnemyDef = { ...enemyDef('rival-sperm'), movement: 'static', speed: 0, hp: 100000 };

const DT = 1 / 60;
const STILL = { moveX: 0, moveY: 0 };

let uid = 500000;
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

function pathOf(id: string): ItemPath {
  const path = letter().paths?.find((p) => p.id === id);
  if (!path) throw new Error(`the letter has no path "${id}"`);
  return path;
}

const letter = (): ActiveItem => weapon(ID);

function world(items: Record<string, number>, seed = 1): World {
  const w = new World({ act: QUIET, seed, startingItems: [] });
  for (const [id, level] of Object.entries(items)) w.items.set(id, level);
  return w;
}

/** What one letter is worth at `level`, from the formula the sim pays (no passives held). */
function hit(level: number): number {
  const def = letter();
  return def.damage * damageScale(level) * levelBonus(def, level).damage;
}

/** The strikes waiting to land. */
const pending = (w: World): AreaState[] => w.areas.filter((a) => a.delay !== undefined && a.delay > 0);

/** Seconds on the card, as the card writes them. */
const secs = (n: number): string => `${Math.round(n * 100) / 100}s`;

describe('the Strongly Worded Letter is a Family weapon that strikes the nearest', () => {
  it('is registered as the brief has it: a weapon from Family, a strike that holds a mark and waits', () => {
    const def = letter();
    expect(def.kind).toBe('weapon');
    expect(def.from).toBe(FAMILY.id);
    expect(def.mode).toBe('strike');
    expect(def.strikeNearest).toBe(true);
    expect(def.strikeDelay).toBeGreaterThan(0);
    expect(def.icon).toBe('letter');
  });

  it('lands nothing before the delay, then everything within its radius of the mark, once', () => {
    const def = letter();
    const w = world({ [ID]: 1 });
    const target = place(w, 200, 0);
    // Inside the letter's radius of the target, and well outside it.
    const neighbour = place(w, 200 + def.radius / 2, 0);
    const far = place(w, 200 + def.radius * 2, 0);
    w.step(DT, STILL);
    const marks = pending(w);
    expect(marks).toHaveLength(1);
    // The item's own radius and damage, at the target's spot.
    expect(marks[0]!).toMatchObject({ x: target.x, y: target.y, radius: def.radius, damage: hit(1), source: ID });
    // To within a frame: the fire step counts toward the delay, as Judgement's does.
    while (w.time < def.strikeDelay! - 1.5 * DT) {
      w.step(DT, STILL);
      for (const e of [target, neighbour, far]) expect(e.hp, `at ${w.time.toFixed(3)}s`).toBe(DUMMY.hp);
    }
    for (let i = 0; i < 5; i++) w.step(DT, STILL);
    expect(DUMMY.hp - target.hp).toBeCloseTo(hit(1), 9);
    expect(DUMMY.hp - neighbour.hp).toBeCloseTo(hit(1), 9);
    expect(far.hp).toBe(DUMMY.hp);
    expect(pending(w)).toHaveLength(0);
  });

  it('lands at the marked position after the delay, even when the target has moved 200px', () => {
    const def = letter();
    const w = world({ [ID]: 1 });
    const target = place(w, 200, 0);
    const markX = target.x;
    const markY = target.y;
    w.step(DT, STILL);
    expect(pending(w).map((a) => [a.x, a.y])).toEqual([[markX, markY]]);
    // The problem moves on; something else stands where it was.
    target.x += 200;
    expect(200).toBeGreaterThan(def.radius + target.radius);
    const standIn = place(w, 0, 0);
    standIn.x = markX;
    standIn.y = markY;
    // One letter only: the next is not sent before this one lands.
    expect(def.cooldown).toBeGreaterThan(def.strikeDelay!);
    for (let i = 0; i < Math.ceil(def.strikeDelay! / DT) + 5; i++) {
      w.step(DT, STILL);
      // The mark never follows the target.
      for (const a of pending(w)) expect([a.x, a.y]).toEqual([markX, markY]);
    }
    expect(target.hp, 'the letter followed the problem').toBe(DUMMY.hp);
    expect(DUMMY.hp - standIn.hp).toBeCloseTo(hit(1), 9);
  });

  it('marks the nearest, on every seed, and extra letters the next-nearest in order', () => {
    for (let seed = 1; seed <= 8; seed++) {
      const w = world({ [ID]: 5 }, seed);
      // Out of order in the list and around the player, all in range.
      const second = place(w, 0, -220);
      const third = place(w, -300, 0);
      const first = place(w, 150, 60);
      const outOfRange = place(w, 0, letter().range + 200);
      w.step(DT, STILL);
      const bolts = 1 + levelBonus(letter(), 5).projectiles;
      expect(bolts, 'level five is three letters in flight').toBe(3);
      const marks = pending(w).map((a) => [a.x, a.y]);
      expect(marks, `seed ${seed}`).toEqual([first, second, third].map((e) => [e.x, e.y]));
      expect(marks).not.toContainEqual([outOfRange.x, outOfRange.y]);
    }
  });

  it('draws no dice: sending and landing take nothing from the world’s rng, where Tattle’s pick does', () => {
    const draws = (items: Record<string, number>): number => {
      const w = world(items);
      place(w, 200, 0);
      place(w, -180, 40);
      place(w, 30, 250);
      const internal = w as unknown as { rng: () => number };
      const rng = internal.rng;
      let n = 0;
      internal.rng = () => {
        n++;
        return rng();
      };
      for (let i = 0; i < Math.ceil((letter().strikeDelay! + 1) / DT); i++) w.step(DT, STILL);
      return n;
    };
    const none = draws({});
    expect(draws({ [ID]: 8 })).toBe(none);
    // The control: the same field, the random strike, and the counter moves.
    expect(draws({ judgement: 1 })).toBeGreaterThan(none);
  });
});

describe('the letter’s paths fold into the same strike (G-043)', () => {
  const opened = 2;

  it('Cc: one more letter per level, to the next problem along', () => {
    const count = (cc: number): number => {
      const w = world({ [ID]: opened });
      for (const [dx, dy] of [[140, 0], [0, 190], [-240, 0], [0, -290]] as const) place(w, dx, dy);
      if (cc > 0) w.pathLevels.set(offerIdFor(letter(), pathOf('cc')), cc);
      w.step(DT, STILL);
      return pending(w).length;
    };
    const plain = count(0);
    expect(plain).toBe(1 + levelBonus(letter(), opened).projectiles);
    for (let cc = 1; cc <= pathOf('cc').maxLevel; cc++) {
      const extra = pathOf('cc').levels.slice(0, cc).reduce((n, l) => n + (l.projectiles ?? 0), 0);
      expect(extra).toBeGreaterThan(0);
      expect(count(cc), `Cc ${cc}`).toBe(plain + extra);
    }
  });

  it('Registered: the delay divides by its speed, and the letter lands sooner', () => {
    const def = letter();
    const registered = pathOf('registered');
    /** The wait the sim gave the letter it sent, and the step it landed on. */
    const sent = (level: number) => {
      const w = world({ [ID]: opened });
      const e = place(w, 200, 0);
      if (level > 0) w.pathLevels.set(offerIdFor(def, registered), level);
      w.step(DT, STILL);
      const wait = pending(w)[0]!.telegraph!;
      let steps = 1;
      while (e.hp === DUMMY.hp && steps < 1000) {
        w.step(DT, STILL);
        steps++;
      }
      return { wait, steps };
    };
    const plain = sent(0);
    expect(plain.wait).toBeCloseTo(def.strikeDelay!, 9);
    let before = plain;
    for (let level = 1; level <= registered.maxLevel; level++) {
      const speed = registered.levels.slice(0, level).reduce((m, l) => m * (l.speed ?? 1), 1);
      expect(speed, 'Registered is a speed path').toBeGreaterThan(1);
      const now = sent(level);
      expect(now.wait, `Registered ${level}`).toBeCloseTo(strikeDelayAt(def.strikeDelay!, speed), 9);
      expect(now.wait).toBeLessThan(before.wait);
      expect(now.steps, `Registered ${level} landed no sooner`).toBeLessThan(before.steps);
      // It lands within a frame of the wait it was given.
      expect(Math.abs(now.steps * DT - now.wait)).toBeLessThanOrEqual(2 * DT);
      before = now;
    }
  });

  it('Capital Letters: each level multiplies what the letter lands', () => {
    const capitals = pathOf('capital-letters');
    const landed = (level: number): number => {
      const w = world({ [ID]: opened });
      place(w, 200, 0);
      if (level > 0) w.pathLevels.set(offerIdFor(letter(), capitals), level);
      w.step(DT, STILL);
      return pending(w)[0]!.damage;
    };
    const plain = landed(0);
    for (let level = 1; level <= capitals.maxLevel; level++) {
      const k = capitals.levels.slice(0, level).reduce((m, l) => m * (l.damage ?? 1), 1);
      expect(k).toBeGreaterThan(1);
      expect(landed(level), `Capital Letters ${level}`).toBeCloseTo(plain * k, 9);
    }
  });
});

describe('born at thirty-four: the letter enters the pool at Family and not before', () => {
  const roll = (w: World) => (w as unknown as { rollOffers(): string[] }).rollOffers();

  it('a one-act life of any act before Family never rolls it; one of Family does', () => {
    const family = ALL_ACTS.indexOf(FAMILY);
    expect(family).toBeGreaterThan(0);
    for (const act of ALL_ACTS.slice(0, family)) {
      const w = new World({ act, seed: 7 });
      for (let i = 0; i < 300; i++) expect(roll(w), `${act.id} rolled the letter`).not.toContain(ID);
    }
    const w = new World({ act: FAMILY, seed: 7 });
    let seen = false;
    for (let i = 0; i < 300 && !seen; i++) seen = roll(w).includes(ID);
    expect(seen, 'Family never rolled the letter').toBe(true);
  });

  it('in a whole life it enters the pool when the life reaches Family, and not before', () => {
    const w = new World({ acts: ALL_ACTS, seed: 11 });
    const family = ALL_ACTS.indexOf(FAMILY);
    for (let index = 0; index < ALL_ACTS.length; index++) {
      w.actIndex = index;
      let seen = false;
      for (let i = 0; i < 300 && !seen; i++) seen = roll(w).includes(ID);
      expect(seen, `act ${ALL_ACTS[index]!.id}`).toBe(index >= family);
    }
  });
});

describe('the letter’s card prints its numbers, the delay included (G-043)', () => {
  const joined = (id: string, level: number, pathLevel = 0, pathLevels?: Map<string, number>) =>
    statLines(id, pathLevels ? { level, pathLevel, pathLevels } : { level, pathLevel }).join(' · ');

  it('the new card: damage, cadence, range, radius and when it arrives, from the data', () => {
    const def = letter();
    const card = joined(ID, 0);
    expect(card).toContain(`damage ${def.damage}`);
    expect(card).toContain(`every ${secs(def.cooldown)}`);
    expect(card).toContain(`range ${def.range}`);
    expect(card).toContain(`radius ${def.radius}`);
    expect(card).toContain(`arrives in ${secs(def.strikeDelay!)}`);
    for (const line of statLines(ID, { level: 0, pathLevel: 0 })) expect(line.length).toBeLessThanOrEqual(44);
  });

  it('Registered’s card prints where the letter will arrive once it is taken', () => {
    const def = letter();
    const registered = pathOf('registered');
    const id = offerIdFor(def, registered);
    for (let owned = 0; owned < registered.maxLevel; owned++) {
      const speed = registered.levels.slice(0, owned + 1).reduce((m, l) => m * (l.speed ?? 1), 1);
      const held = new Map([[id, owned]]);
      expect(joined(id, 2, owned, held), `Registered ${owned + 1}`).toContain(
        `arrives in ${secs(strikeDelayAt(def.strikeDelay!, speed))}`,
      );
    }
  });

  it('the other two print theirs: one more letter, harder', () => {
    const def = letter();
    expect(joined(offerIdFor(def, pathOf('cc')), 2)).toContain('+1');
    const k = pathOf('capital-letters').levels[0]!.damage!;
    expect(joined(offerIdFor(def, pathOf('capital-letters')), 2)).toContain(`damage +${Math.round((k - 1) * 100)}%`);
  });

  it('the build sheet says when it arrives with Registered held, once', () => {
    const def = letter();
    const registered = pathOf('registered');
    const held = new Map([[offerIdFor(def, registered), registered.maxLevel]]);
    const speed = registered.levels.reduce((m, l) => m * (l.speed ?? 1), 1);
    const sheet = heldLines(ID, 4, held).join(' · ');
    expect(sheet).toContain(`arrives in ${secs(strikeDelayAt(def.strikeDelay!, speed))}`);
    expect(sheet).not.toContain('delay');
  });

  it('the copy claims no number, fits the card, and its estimate brackets the delay it pays', () => {
    const def = letter();
    const lines = [def.blurb, ...def.levels.map((l) => l.text)];
    expect(def.paths).toHaveLength(3);
    for (const p of def.paths!) {
      expect(p.levels).toHaveLength(p.maxLevel);
      expect(p.maxLevel).toBeGreaterThanOrEqual(2);
      expect(p.maxLevel).toBeLessThanOrEqual(3);
      lines.push(p.blurb, ...p.levels.map((l) => l.text));
    }
    for (const line of lines) {
      expect(line, `"${line}"`).not.toMatch(/[0-9%]/);
      expect(line.length, `"${line}"`).toBeLessThan(64);
    }
    // "Arrives in four to six seconds": the word is an estimate, and the
    // placeholder it sits over has to stay inside it or the joke lies.
    expect(def.blurb).toContain('four to six seconds');
    expect(def.strikeDelay!).toBeGreaterThanOrEqual(4);
    expect(def.strikeDelay!).toBeLessThanOrEqual(6);
  });
});
