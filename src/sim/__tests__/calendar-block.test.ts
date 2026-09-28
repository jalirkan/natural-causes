import { describe, expect, it } from 'vitest';
import { ALL_ACTS, CONCEPTION, OFFICE, type ActDef } from '../../data/acts';
import { ENEMIES, enemyDef, type EnemyDef } from '../../data/enemies';
import { heldLines, statLines } from '../../data/item-text';
import { itemIconFrame } from '../../data/item-visuals';
import {
  ITEMS,
  OFFER_PATH_SEPARATOR,
  PATH_OPENS_AT,
  cooldownScale,
  isActive,
  offerIdFor,
  type ActiveItem,
  type ItemPath,
} from '../../data/items';
import { meetingCloses } from '../../scenes/edges';
import { World, type EnemyState, type HoldState, type Input, type ProjectileState } from '../world';

/**
 * Calendar block (items.ts, The Office's first item, G-048): the meeting's
 * hold (OFFICE-ROSTER §3.4) turned inside out and put down by the player. On
 * its cooldown it places a hold on `World.holds` centred on the player, owned
 * by the player: its edge walls the crowd both ways exactly as the meeting's
 * does (hold.test.ts), it slows nothing, hurts nothing and stops no shot, the
 * player walks out of it, and it stays where it was put until `range`
 * seconds have passed. Every number is a placeholder under OFFICE's
 * `provisional`, so every assertion reads it off the registry.
 */

const BLOCK = ITEMS['calendar-block'] as ActiveItem;
if (!isActive(BLOCK) || BLOCK.kind !== 'control') throw new Error('Calendar block is a control item');

/** No schedule, so nothing is on the field but what the test places there. */
const QUIET: ActDef = { ...CONCEPTION, id: 'calendar-block-fixture', waves: [] };

/** A walker that never dies and touches nobody. */
const CHASER: EnemyDef = { ...enemyDef('rival-sperm'), id: 'block-chaser', contact: 'none', hp: 1e6 };
/** A crosser on its spawn heading, fast enough to cross the block in its seconds. */
const CROSSER: EnemyDef = { ...enemyDef('white-cell'), id: 'block-crosser', contact: 'none', hp: 1e6, speed: 300 };

const DT = 1 / 60;
const still: Input = { moveX: 0, moveY: 0 };
const east: Input = { moveX: 1, moveY: 0 };

/** A world holding Calendar block at `level` (and nothing else), before its first step. */
function holding(level = 1, act: ActDef = QUIET, seed = 1): World {
  const w = new World({ act, seed, startingItems: [] });
  w.items.set(BLOCK.id, level);
  return w;
}

/** Its cooldown starts at zero, so the first step puts the block down on the player. */
function placed(w: World): HoldState {
  const x = w.x;
  const y = w.y;
  w.step(DT, still);
  expect(w.holds, 'one hold after the first step').toHaveLength(1);
  const h = w.holds[0]!;
  expect(h).toMatchObject({ x, y, owner: 'player', source: BLOCK.id });
  return h;
}

let uid = 500000;
/** An enemy of `def` at (x, y), built as `addEnemy` builds one. */
function place(w: World, def: EnemyDef, x: number, y: number, vx = 0, vy = 0): EnemyState {
  const e: EnemyState = {
    uid: uid++,
    hitBySerial: 0,
    hitByAreaSerial: 0,
    def,
    x,
    y,
    vx,
    vy,
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

/** Steps with the player kept alive; `each` after every step. Offers are declined by choosing the first. */
function run(w: World, seconds: number, input: Input = still, each?: () => void): void {
  const steps = Math.round(seconds * 60);
  for (let i = 0; i < steps; i++) {
    if (w.offers) {
      w.choose(w.offers[0]!);
      continue;
    }
    w.hp = w.maxHp;
    w.dead = false;
    w.step(DT, input);
    each?.();
  }
}

const dist = (a: { x: number; y: number }, b: { x: number; y: number }) => Math.hypot(a.x - b.x, a.y - b.y);
const cooldowns = (w: World) => (w as unknown as { cooldowns: Map<string, number> }).cooldowns;
const roll = (w: World) => (w as unknown as { rollOffers(): string[] }).rollOffers();

function pathOf(id: string): ItemPath {
  const path = BLOCK.paths?.find((p) => p.id === id);
  if (!path) throw new Error(`Calendar block has no path ${id}`);
  return path;
}

describe('Calendar block puts down a hold of its own', () => {
  it('on the player, at the registry radius, for the registry seconds, with no slow and no contraction', () => {
    const w = holding();
    const h = placed(w);
    expect(h.radius).toBeCloseTo(BLOCK.radius, 9);
    expect(h.from).toBe(h.radius);
    expect(h.to).toBe(h.radius);
    expect(h.seconds).toBe(0);
    expect(h.holdSeconds).toBeCloseTo(BLOCK.range, 9);
    expect(h.slow).toBe(1);
    expect(BLOCK.slow).toBe(1);
    // A hold, not an area: nothing on `areas`, nothing on `enemies`.
    expect(w.areas).toEqual([]);
    expect(w.enemies).toEqual([]);
  });

  it('it ends at `range` seconds, the same size throughout, and comes back on its cooldown', () => {
    const w = holding();
    const h = placed(w);
    const radius = h.radius;
    run(w, BLOCK.range - 0.05, still, () => expect(h.radius).toBe(radius));
    expect(w.holds).toEqual([h]);
    run(w, 0.1);
    expect(w.holds).toEqual([]);
    // Its cooldown was set when it fired: the next one is that far from the first.
    const left = cooldowns(w).get(BLOCK.id)!;
    expect(left).toBeGreaterThan(0);
    run(w, left + DT);
    expect(w.holds).toHaveLength(1);
    expect(w.holds[0]).not.toBe(h);
  });
});

describe('its edge is the meeting’s wall, turned inside out', () => {
  it('a chaser outside cannot come in while it lasts, and walks in once it ends', () => {
    const w = holding();
    const h = placed(w);
    const c = place(w, CHASER, h.x + h.radius + 20, h.y);
    let breached = 0;
    run(w, BLOCK.range - 0.1, still, () => {
      if (w.holds.includes(h) && dist(c, h) <= h.radius) breached++;
    });
    expect(breached).toBe(0);
    // Pressed against the edge, not merely somewhere outside.
    expect(dist(c, h) - h.radius).toBeLessThan(1);
    // Once it is gone, the chaser walks on in to the player.
    run(w, 0.2);
    expect(w.holds).toEqual([]);
    run(w, 1.5);
    expect(dist(c, h)).toBeLessThan(h.radius - 20);
  });

  it('a chaser inside cannot leave, however far the player walks', () => {
    const w = holding();
    const h = placed(w);
    // Inside, half way to the edge the player is walking out through: close
    // enough to reach it well inside the block's seconds at its speed.
    const c = place(w, CHASER, h.x + h.radius / 2, h.y);
    let escaped = 0;
    run(w, BLOCK.range - 0.1, east, () => {
      if (dist(c, h) > h.radius) escaped++;
    });
    expect(escaped).toBe(0);
    // The player is well outside; the chaser is at the edge nearest them.
    expect(w.x - h.x).toBeGreaterThan(h.radius);
    expect(h.radius - dist(c, h)).toBeLessThan(1);
    expect(c.x).toBeGreaterThan(h.x);
  });

  it('the player walks out at full speed, and the block stays where it was put', () => {
    const w = holding();
    const h = placed(w);
    const at = { x: h.x, y: h.y };
    expect(w.speed).toBe(w.baseSpeed);
    let x = w.x;
    let steps = 0;
    run(w, 1.5, east, () => {
      expect(w.x - x).toBeCloseTo(w.baseSpeed * DT, 9);
      x = w.x;
      steps++;
    });
    expect(steps).toBeGreaterThan(0);
    expect(w.x - h.x).toBeGreaterThan(h.radius);
    expect({ x: h.x, y: h.y }).toEqual(at);
  });

  it('a crosser passes straight through, as it does a meeting (AUDIT seven, 49)', () => {
    const w = holding();
    const h = placed(w);
    const e = place(w, CROSSER, h.x - h.radius - 50, h.y + 40, CROSSER.speed, 0);
    let wasIn = false;
    run(w, 1.5, still, () => {
      if (dist(e, h) < h.radius) wasIn = true;
    });
    expect(wasIn).toBe(true);
    expect(e.x - h.x).toBeGreaterThan(h.radius);
  });
});

describe('it slows nothing and stops no shot', () => {
  it('a chaser inside walks at its own speed, and the player stands at theirs', () => {
    const w = holding();
    const h = placed(w);
    const c = place(w, CHASER, h.x, h.y - 60);
    const y0 = c.y;
    w.step(DT, still);
    expect(c.y - y0).toBeCloseTo(CHASER.speed * DT, 9);
    expect(w.slowAt(h.x, h.y)).toBe(1);
    expect(w.speed).toBe(w.baseSpeed);
  });

  it('a hostile shot crosses the edge both ways at full speed, and so does the player’s', () => {
    const w = holding();
    const h = placed(w);
    const shot = (x: number, vx: number, hostile: boolean): ProjectileState => ({
      x, y: h.y + 30, vx, vy: 0, life: 5, damage: 0, pierce: 0, radius: 4, hostile, serial: 900000 + uid++,
    });
    // One coming in from outside, one going out from inside, one of the player's.
    const incoming = shot(h.x - h.radius - 10, 300, true);
    const outgoing = shot(h.x + h.radius - 10, 300, true);
    const mine = shot(h.x + h.radius - 20, 300, false);
    w.projectiles.push(incoming, outgoing, mine);
    const x0 = [incoming.x, outgoing.x, mine.x];
    run(w, 0.2);
    // Damage 0 so nothing is spent on the player; each flew 0.2s at 300px/s.
    expect(incoming.x - x0[0]!).toBeCloseTo(300 * 0.2, 6);
    expect(outgoing.x - x0[1]!).toBeCloseTo(300 * 0.2, 6);
    expect(mine.x - x0[2]!).toBeCloseTo(300 * 0.2, 6);
    expect(dist(incoming, h)).toBeLessThan(h.radius);
    expect(dist(outgoing, h)).toBeGreaterThan(h.radius);
  });

  it('it hurts nothing and drops nothing', () => {
    const w = holding();
    const h = placed(w);
    const c = place(w, CHASER, h.x + 30, h.y);
    run(w, BLOCK.range);
    expect(c.hp).toBe(CHASER.hp);
    expect(w.kills).toBe(0);
    expect(w.gems).toEqual([]);
  });
});

describe('its levels and paths fold as every control item’s do', () => {
  it('level five: wider and longer by the level table, and sooner by the generic scaling and its own level', () => {
    const one = holding(1);
    const h1 = placed(one);
    const five = holding(BLOCK.maxLevel);
    const h5 = placed(five);
    let area = 1;
    let duration = 1;
    let cooldown = 1;
    for (const l of BLOCK.levels) {
      area *= l.area ?? 1;
      duration *= l.duration ?? 1;
      cooldown *= l.cooldown ?? 1;
    }
    expect(area).toBeGreaterThan(1);
    expect(duration).toBeGreaterThan(1);
    expect(cooldown).toBeLessThan(1);
    expect(h5.radius).toBeCloseTo(h1.radius * area, 9);
    expect(h5.holdSeconds).toBeCloseTo(h1.holdSeconds * duration, 9);
    const c1 = cooldowns(one).get(BLOCK.id)!;
    const c5 = cooldowns(five).get(BLOCK.id)!;
    // Fired on the first step, each carries its cooldown less that step's overshoot.
    expect(c5 + DT).toBeCloseTo(((c1 + DT) * cooldownScale(BLOCK.maxLevel) * cooldown) / cooldownScale(1), 9);
  });

  it('none of its paths is offered below PATH_OPENS_AT, every one of them at it', () => {
    const all = new Set(BLOCK.paths!.map((p) => offerIdFor(BLOCK, p)));
    const seen = (level: number) => {
      const out = new Set<string>();
      for (let seed = 1; seed <= 12; seed++) {
        const w = holding(level, OFFICE, seed);
        for (let i = 0; i < 60; i++) for (const id of roll(w)) if (id.includes(OFFER_PATH_SEPARATOR)) out.add(id);
      }
      return out;
    };
    expect(BLOCK.paths!.map((p) => p.id)).toEqual(['recurring', 'all-day', 'private']);
    expect(seen(PATH_OPENS_AT - 1)).toEqual(new Set());
    expect(seen(PATH_OPENS_AT)).toEqual(all);
  });

  const cases: Array<[string, 'cooldown' | 'duration' | 'area']> = [
    ['recurring', 'cooldown'],
    ['all-day', 'duration'],
    ['private', 'area'],
  ];
  for (const [pathId, field] of cases) {
    it(`${pathOf(pathId).name} at two: only its ${field}, both levels’ factors times the base`, () => {
      const path = pathOf(pathId);
      const factor = (path.levels[0]![field] ?? 1) * (path.levels[1]![field] ?? 1);
      expect(factor, 'a path level that moves nothing').not.toBe(1);

      const base = holding(PATH_OPENS_AT);
      const hb = placed(base);
      const w = holding(PATH_OPENS_AT);
      const id = offerIdFor(BLOCK, path);
      for (let i = 0; i < 2; i++) {
        w.offers = [id];
        w.choose(id);
      }
      expect(w.pathLevels.get(id)).toBe(2);
      expect(w.items.get(BLOCK.id)).toBe(PATH_OPENS_AT);
      const h = placed(w);

      const cb = cooldowns(base).get(BLOCK.id)! + DT;
      const cw = cooldowns(w).get(BLOCK.id)! + DT;
      expect(cw).toBeCloseTo(cb * (field === 'cooldown' ? factor : 1), 9);
      expect(h.holdSeconds).toBeCloseTo(hb.holdSeconds * (field === 'duration' ? factor : 1), 9);
      expect(h.radius).toBeCloseTo(hb.radius * (field === 'area' ? factor : 1), 9);
    });
  }
});

describe('born at twenty-two: in the pool from The Office, and for the rest of the life', () => {
  it('is registered from The Office', () => {
    expect(BLOCK.from).toBe(OFFICE.id);
  });

  it('a whole life rolls it from The Office on, and never before', () => {
    const w = new World({ acts: ALL_ACTS, seed: 11 });
    const office = ALL_ACTS.indexOf(OFFICE);
    expect(office).toBeGreaterThan(0);
    for (let index = 0; index < ALL_ACTS.length; index++) {
      w.actIndex = index;
      const seen = new Set<string>();
      for (let i = 0; i < 300; i++) for (const id of roll(w)) seen.add(id);
      expect(seen.has(BLOCK.id), `act ${ALL_ACTS[index]!.id}`).toBe(index >= office);
    }
  });
});

describe('the card prints its numbers, from the data', () => {
  const NEW = { level: 0, pathLevel: 0 };

  it('a new Calendar block: what it walls, how long, how often; never a slow', () => {
    expect(statLines(BLOCK.id, NEW)).toEqual([
      `walls within ${BLOCK.radius} · lasts ${BLOCK.range}s · every ${BLOCK.cooldown}s`,
    ]);
    expect(statLines(BLOCK.id, NEW).join(' ')).not.toContain('slows');
    // Snooze's card, which slows, still says so.
    expect(statLines('snooze', NEW).join(' ')).toContain('slows to');
  });

  it('each level-up speaks of its cooldown and names what the level adds', () => {
    for (let level = 1; level < BLOCK.maxLevel; level++) {
      const line = statLines(BLOCK.id, { level, pathLevel: 0 }).join(' · ');
      const l = BLOCK.levels[level]!;
      expect(line, `level ${level + 1}`).toMatch(/cooldown −\d+%/);
      expect(line).not.toContain('attack speed');
      expect(line).not.toContain('damage');
      if (l.area !== undefined) expect(line).toContain(`radius +${Math.round((l.area - 1) * 100)}%`);
      if (l.duration !== undefined) expect(line).toContain(`lasts +${Math.round((l.duration - 1) * 100)}%`);
    }
  });

  it('each path card prints its one field', () => {
    const at = (p: string) => statLines(offerIdFor(BLOCK, pathOf(p)), { level: PATH_OPENS_AT, pathLevel: 0 }).join(' · ');
    const pct = (m: number) => Math.round(Math.abs(m - 1) * 100);
    expect(at('recurring')).toBe(`cooldown −${pct(pathOf('recurring').levels[0]!.cooldown!)}%`);
    expect(at('all-day')).toBe(`lasts +${pct(pathOf('all-day').levels[0]!.duration!)}%`);
    expect(at('private')).toBe(`radius +${pct(pathOf('private').levels[0]!.area!)}%`);
  });

  it('the build sheet at level one is the new card', () => {
    expect(heldLines(BLOCK.id, 1, new Map())).toEqual(statLines(BLOCK.id, NEW));
  });
});

describe('no dice', () => {
  it('placing, walling and ending a block draws no random number', () => {
    const count = (w: World) => {
      const box = w as unknown as { rng: () => number };
      const real = box.rng;
      let n = 0;
      box.rng = () => {
        n++;
        return real();
      };
      return () => n;
    };
    const bare = new World({ act: QUIET, seed: 3, startingItems: [] });
    const w = holding(1, QUIET, 3);
    const nBare = count(bare);
    const nBlock = count(w);
    place(bare, CHASER, bare.x + 130, bare.y);
    place(w, CHASER, w.x + 130, w.y);
    run(bare, BLOCK.range + 1, east);
    run(w, BLOCK.range + 1, east);
    expect(nBlock()).toBe(nBare());
    // Two worlds on one seed and one input end in one place.
    const twin = holding(1, QUIET, 3);
    place(twin, CHASER, twin.x + 130, twin.y);
    run(twin, BLOCK.range + 1, east);
    expect(twin.enemies.map((e) => [e.x, e.y])).toEqual(w.enemies.map((e) => [e.x, e.y]));
  });
});

describe('the renderer’s contract: a hold with no enemy def', () => {
  it('names the item that placed it, which no enemy def shares, and the item wears the block icon', () => {
    const w = holding();
    const h = placed(w);
    // syncHolds draws a meeting's chairs from ENEMIES[source].frame; a
    // player's hold has none, and is drawn from the item's icon instead.
    expect(ENEMIES[h.source]).toBeUndefined();
    expect(ITEMS[h.source]!.icon).toBe('block');
    expect(itemIconFrame(ITEMS[h.source]!.icon)).toBe('icon-block.png');
  });

  it('is never heard as a meeting closing (the chairs)', () => {
    const w = holding();
    const h = placed(w);
    expect(meetingCloses([h], null, { holds: [], restructures: 0 })).toBe(false);
  });
});
