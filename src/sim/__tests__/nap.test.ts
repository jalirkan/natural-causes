import { describe, expect, it } from 'vitest';
import { ALL_ACTS, CONCEPTION, DECLINE, type ActDef } from '../../data/acts';
import { enemyDef, type EnemyDef } from '../../data/enemies';
import { heldLines, statLines } from '../../data/item-text';
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
import { World, type EnemyState, type Input, type ProjectileState } from '../world';

/**
 * The Nap (items.ts, Decline's item, G-051, DECLINE-ROSTER §6): a control
 * that fires nothing. When health is under `nap.threshold` of the maximum
 * and it is off its cooldown, the player falls asleep for `range` seconds
 * (times `duration`): input is ignored, as a stun ignores it (the stop IS
 * the stun's); no contact hurts them, as i-frames skip it, though no
 * i-frames are set; a hostile shot still lands; and `nap.heal` of the
 * maximum (times `damage`) comes back, evenly, across the window. The clock
 * keeps running. Every number is a placeholder under DECLINE's
 * `provisional`, so every assertion reads it off the registry.
 */

const NAP = ITEMS['nap'] as ActiveItem;
if (!isActive(NAP) || NAP.kind !== 'control' || NAP.mode !== 'nap' || !NAP.nap) {
  throw new Error('The Nap is a control item in mode nap');
}
const { threshold: THRESHOLD, heal: HEAL } = NAP.nap;

/** Decline with no schedule: nothing on the field but what the test places. */
const QUIET: ActDef = { ...DECLINE, id: 'nap-fixture', waves: [] };

/** A body that stands on the player and hurts on contact, and never dies. */
const TOUCHER: EnemyDef = { ...enemyDef('rival-sperm'), id: 'nap-toucher', hp: 1e6, movement: 'static', speed: 0 };

const DT = 1 / 60;
const still: Input = { moveX: 0, moveY: 0 };
const east: Input = { moveX: 1, moveY: 0 };

/** A world holding the Nap at `level` and nothing else. */
function holding(level = 1, act: ActDef = QUIET, seed = 1): World {
  const w = new World({ act, seed, startingItems: [] });
  w.items.set(NAP.id, level);
  return w;
}

/** Health just under the threshold, and one step: the player is asleep. */
function fallAsleep(w: World, share = THRESHOLD - 0.01): void {
  w.hp = w.maxHp * share;
  w.step(DT, still);
  expect(w.napTimer, 'asleep after one step under the threshold').toBeGreaterThan(0);
}

let uid = 700000;
function place(w: World, def: EnemyDef, x: number, y: number): EnemyState {
  const e: EnemyState = {
    uid: uid++,
    hitBySerial: 0,
    hitByAreaSerial: 0,
    def,
    x,
    y,
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

function hostileShot(w: World, damage: number): ProjectileState {
  const p: ProjectileState = {
    x: w.x,
    y: w.y,
    vx: 0,
    vy: 0,
    life: 5,
    damage,
    pierce: 1,
    radius: 4,
    hostile: true,
    serial: 900000 + uid++,
  };
  w.projectiles.push(p);
  return p;
}

/** Steps until the nap running now is over, calling `each` after every step; returns the steps taken. */
function sleepThrough(w: World, input: Input = still, each?: () => void): number {
  let steps = 0;
  while (w.napTimer > 0) {
    w.step(DT, input);
    steps++;
    each?.();
    if (steps > 100000) throw new Error('a nap that never ends');
  }
  return steps;
}

const cooldowns = (w: World) => (w as unknown as { cooldowns: Map<string, number> }).cooldowns;
const roll = (w: World) => (w as unknown as { rollOffers(): string[] }).rollOffers();

function pathOf(id: string): ItemPath {
  const path = NAP.paths?.find((p) => p.id === id);
  if (!path) throw new Error(`The Nap has no path ${id}`);
  return path;
}

/** Everything a table of levels multiplies `field` by, up to `level`. */
function product(levels: ReadonlyArray<Record<string, unknown>>, field: string, level = levels.length): number {
  let k = 1;
  for (const l of levels.slice(0, level)) k *= (l[field] as number | undefined) ?? 1;
  return k;
}

describe('it falls asleep under the threshold, and not at or above it', () => {
  it('just under: asleep for the registry seconds; at and above: awake', () => {
    const at = holding();
    at.hp = at.maxHp * THRESHOLD;
    at.step(DT, still);
    expect(at.napTimer, 'exactly at the threshold').toBe(0);

    const above = holding();
    above.hp = above.maxHp * THRESHOLD + 0.5;
    above.step(DT, still);
    expect(above.napTimer).toBe(0);

    const under = holding();
    fallAsleep(under);
    expect(under.napTimer).toBeCloseTo(NAP.range, 9);
  });

  it('a full-health life never naps', () => {
    const w = holding();
    for (let i = 0; i < 600; i++) w.step(DT, still);
    expect(w.napTimer).toBe(0);
    expect(w.hp).toBe(w.maxHp);
  });

  it('in any act once held: a nap in Conception is the same nap', () => {
    const w = holding(1, { ...CONCEPTION, id: 'nap-conception', waves: [] });
    fallAsleep(w);
    expect(w.napTimer).toBeCloseTo(NAP.range, 9);
  });
});

describe('asleep: input is ignored, as a stun ignores it', () => {
  it('the player does not move for the whole nap, and walks again the step after', () => {
    const w = holding();
    fallAsleep(w);
    const x = w.x;
    const y = w.y;
    const facing = [w.facingX, w.facingY];
    sleepThrough(w, east, () => {
      expect(w.x).toBe(x);
      expect(w.y).toBe(y);
    });
    expect([w.facingX, w.facingY]).toEqual(facing);
    w.step(DT, east);
    expect(w.x - x).toBeCloseTo(w.speed * DT, 9);
  });

  it('the stop is the stun’s: the renderer’s squash and the bots read `stunTimer` beside `napTimer`', () => {
    const w = holding();
    fallAsleep(w);
    expect(w.stunTimer).toBeCloseTo(w.napTimer, 9);
    sleepThrough(w, east, () => expect(w.stunTimer).toBeCloseTo(w.napTimer, 9));
    expect(w.stunTimer).toBe(0);
  });
});

describe('asleep: contact does nothing, and a hostile shot still lands', () => {
  it('a body standing on the sleeper never hurts it, and no i-frames are handed out for it', () => {
    const w = holding();
    fallAsleep(w);
    const rate = (HEAL * w.maxHp) / NAP.range;
    place(w, TOUCHER, w.x, w.y);
    let hp = w.hp;
    // What was left of the nap going into each step: the last step heals
    // only that (the float residue of 1.5 − 90 steps, as a stun's has).
    let left = w.napTimer;
    sleepThrough(w, still, () => {
      expect(w.hp - hp, 'only the heal moves health').toBeCloseTo(rate * Math.min(DT, left), 9);
      expect(w.invulnerable).toBe(0);
      hp = w.hp;
      left = w.napTimer;
    });
    // Awake, the same body lands on the next step.
    w.step(DT, still);
    expect(w.hp).toBeCloseTo(hp - TOUCHER.contactDamage * w.damageTaken, 9);
  });

  it('a hostile shot lands on a sleeper as on anyone', () => {
    const w = holding();
    fallAsleep(w);
    const rate = (HEAL * w.maxHp) / NAP.range;
    const hp = w.hp;
    const damage = 5;
    hostileShot(w, damage);
    w.step(DT, still);
    expect(w.projectiles.filter((p) => p.hostile)).toEqual([]);
    expect(w.hp).toBeCloseTo(hp - damage * w.damageTaken + rate * DT, 9);
    expect(w.napTimer, 'the shot does not wake it').toBeGreaterThan(0);
  });
});

describe('it heals the stated share, evenly, by the end', () => {
  it('`heal` of the maximum over `range` seconds, never past the maximum', () => {
    const w = holding();
    const start = 0.1;
    fallAsleep(w, start);
    const hp0 = w.hp;
    expect(hp0).toBeCloseTo(w.maxHp * start, 9);
    const steps = sleepThrough(w);
    // `range / DT` steps, give or take the float residue's last one.
    expect(steps).toBeGreaterThanOrEqual(Math.round(NAP.range / DT));
    expect(steps).toBeLessThanOrEqual(Math.round(NAP.range / DT) + 1);
    expect(w.hp).toBeCloseTo(hp0 + HEAL * w.maxHp, 9);
    // Nothing more once awake.
    const after = w.hp;
    w.step(DT, still);
    expect(w.hp).toBe(after);
  });

  it('never past the maximum', () => {
    const w = holding();
    fallAsleep(w);
    // A medication taken mid-nap, as it were: health set near the top.
    w.hp = w.maxHp - 0.001;
    sleepThrough(w);
    expect(w.hp).toBe(w.maxHp);
  });
});

describe('the cooldown holds', () => {
  it('a second nap waits the whole cooldown from the first, however low health stays', () => {
    const w = holding();
    fallAsleep(w);
    const cooldown = NAP.cooldown * cooldownScale(1);
    expect(cooldowns(w).get(NAP.id)).toBeCloseTo(cooldown, 9);
    const low = w.maxHp * (THRESHOLD / 2);
    let naps = 0;
    let was = w.napTimer;
    const steps = Math.round((cooldown - 0.1) / DT);
    for (let i = 0; i < steps; i++) {
      if (w.napTimer === 0) w.hp = low;
      w.step(DT, still);
      if (w.napTimer > was) naps++;
      was = w.napTimer;
    }
    expect(naps, 'no nap inside the cooldown').toBe(0);
    for (let i = 0; i < Math.round(0.2 / DT); i++) {
      if (w.napTimer === 0) w.hp = low;
      w.step(DT, still);
      if (w.napTimer > was) naps++;
      was = w.napTimer;
    }
    expect(naps, 'one nap once it is over').toBe(1);
  });

  it('never at the crossing: a nap running when the act ends is gone in the next', () => {
    const w = new World({ acts: [QUIET, { ...QUIET, id: 'nap-fixture-2' }], seed: 1, startingItems: [] });
    w.items.set(NAP.id, 1);
    fallAsleep(w);
    (w as unknown as { beginAct(i: number): void }).beginAct(1);
    expect(w.napTimer).toBe(0);
    expect(w.stunTimer).toBe(0);
  });
});

describe('never once the outcome has latched', () => {
  it('not during a boss’s absorbing exit', () => {
    const w = holding(1, CONCEPTION);
    w.time = CONCEPTION.durationSeconds;
    w.step(DT, still);
    expect(w.boss).not.toBeNull();
    w.boss!.hp = 0;
    w.boss!.phase = 'absorbing';
    w.boss!.timer = 1.8;
    w.hp = w.maxHp * (THRESHOLD / 2);
    for (let i = 0; i < 60; i++) w.step(DT, still);
    expect(w.napTimer).toBe(0);
  });

  it('not once the life is over, won or lost', () => {
    for (const end of ['dead', 'won'] as const) {
      const w = holding();
      w.hp = w.maxHp * (THRESHOLD / 2);
      w[end] = true;
      w.step(DT, still);
      expect(w.napTimer, end).toBe(0);
    }
  });
});

describe('its levels and paths fold as every control item’s do', () => {
  it('level five: shorter, sooner and more by the level table, and sooner by the generic scaling', () => {
    const w = holding(NAP.maxLevel);
    fallAsleep(w, 0.1);
    const levels = NAP.levels as unknown as Array<Record<string, unknown>>;
    const duration = product(levels, 'duration');
    const heal = product(levels, 'damage');
    const cooldown = product(levels, 'cooldown');
    expect(duration, 'the upgrade is a shorter nap').toBeLessThan(1);
    expect(heal).toBeGreaterThan(1);
    expect(cooldown).toBeLessThan(1);
    expect(w.napTimer).toBeCloseTo(NAP.range * duration, 9);
    // The panel's sketch: 0.8s at level five.
    expect(w.napTimer).toBeCloseTo(0.8, 9);
    expect(cooldowns(w).get(NAP.id)).toBeCloseTo(NAP.cooldown * cooldownScale(NAP.maxLevel) * cooldown, 9);
    const hp0 = w.hp;
    sleepThrough(w);
    expect(w.hp - hp0).toBeCloseTo(HEAL * heal * w.maxHp, 9);
  });

  it('none of its paths is offered below PATH_OPENS_AT, every one of them at it', () => {
    const all = new Set(NAP.paths!.map((p) => offerIdFor(NAP, p)));
    const seen = (level: number) => {
      const out = new Set<string>();
      for (let seed = 1; seed <= 12; seed++) {
        const w = holding(level, DECLINE, seed);
        for (let i = 0; i < 60; i++) for (const id of roll(w)) if (id.startsWith(`${NAP.id}${OFFER_PATH_SEPARATOR}`)) out.add(id);
      }
      return out;
    };
    expect(NAP.paths!.map((p) => p.id)).toEqual(['power-nap', 'habit', 'deep-sleep']);
    expect(seen(PATH_OPENS_AT - 1)).toEqual(new Set());
    expect(seen(PATH_OPENS_AT)).toEqual(all);
  });

  const cases: Array<[string, 'duration' | 'cooldown' | 'damage']> = [
    ['power-nap', 'duration'],
    ['habit', 'cooldown'],
    ['deep-sleep', 'damage'],
  ];
  for (const [pathId, field] of cases) {
    it(`${pathOf(pathId).name} at two: only its ${field === 'damage' ? 'heal' : field}, both levels’ factors times the base`, () => {
      const path = pathOf(pathId);
      const factor = product(path.levels as unknown as Array<Record<string, unknown>>, field, 2);
      expect(factor, 'a path level that moves nothing').not.toBe(1);

      const base = holding(PATH_OPENS_AT);
      fallAsleep(base, 0.1);
      const w = holding(PATH_OPENS_AT);
      const id = offerIdFor(NAP, path);
      for (let i = 0; i < 2; i++) {
        w.offers = [id];
        w.choose(id);
      }
      expect(w.pathLevels.get(id)).toBe(2);
      expect(w.items.get(NAP.id)).toBe(PATH_OPENS_AT);
      fallAsleep(w, 0.1);

      expect(w.napTimer).toBeCloseTo(base.napTimer * (field === 'duration' ? factor : 1), 9);
      expect(cooldowns(w).get(NAP.id)).toBeCloseTo(cooldowns(base).get(NAP.id)! * (field === 'cooldown' ? factor : 1), 9);
      const b0 = base.hp;
      const w0 = w.hp;
      sleepThrough(base);
      sleepThrough(w);
      expect(w.hp - w0).toBeCloseTo((base.hp - b0) * (field === 'damage' ? factor : 1), 9);
    });
  }
});

describe('born at fifty-five: in the pool from Decline, and not before', () => {
  it('is registered from Decline, and Decline’s provisional names it', () => {
    expect(NAP.from).toBe(DECLINE.id);
    expect(DECLINE.provisional).toContain('the Nap');
  });

  it('a whole life rolls it in Decline, and never before', () => {
    const w = new World({ acts: ALL_ACTS, seed: 11 });
    const decline = ALL_ACTS.indexOf(DECLINE);
    expect(decline).toBe(ALL_ACTS.length - 1);
    for (let index = 0; index < ALL_ACTS.length; index++) {
      w.actIndex = index;
      const seen = new Set<string>();
      for (let i = 0; i < 400; i++) for (const id of roll(w)) seen.add(id);
      expect(seen.has(NAP.id), `act ${ALL_ACTS[index]!.id}`).toBe(index >= decline);
    }
  });
});

describe('the card prints its numbers, from the data', () => {
  const NEW = { level: 0, pathLevel: 0 };
  const pct = (m: number) => `${Math.round(m * 100)}%`;

  it('a new Nap: under what, how long, how much, how often, and that shots still land', () => {
    expect(statLines(NAP.id, NEW)).toEqual([
      `under ${pct(THRESHOLD)} health · naps ${NAP.range}s · heals ${pct(HEAL)}`,
      `every ${NAP.cooldown}s · immune to contact, not shots`,
    ]);
    expect(statLines(NAP.id, NEW).join(' ')).not.toContain('damage');
  });

  it('each level-up speaks of its cooldown and names what the level adds, never damage', () => {
    for (let level = 1; level < NAP.maxLevel; level++) {
      const line = statLines(NAP.id, { level, pathLevel: 0 }).join(' · ');
      const l = NAP.levels[level]!;
      expect(line, `level ${level + 1}`).toMatch(/cooldown −\d+%/);
      expect(line).not.toContain('attack speed');
      expect(line).not.toContain('damage');
      if (l.duration !== undefined) expect(line).toContain(`lasts −${Math.round((1 - l.duration) * 100)}%`);
      if (l.damage !== undefined) expect(line).toContain(`heals +${Math.round((l.damage - 1) * 100)}%`);
    }
  });

  it('each path card prints its one field', () => {
    const at = (p: string) => statLines(offerIdFor(NAP, pathOf(p)), { level: PATH_OPENS_AT, pathLevel: 0 }).join(' · ');
    const off = (m: number) => Math.round(Math.abs(m - 1) * 100);
    expect(at('power-nap')).toBe(`lasts −${off(pathOf('power-nap').levels[0]!.duration!)}%`);
    expect(at('habit')).toBe(`cooldown −${off(pathOf('habit').levels[0]!.cooldown!)}%`);
    expect(at('deep-sleep')).toBe(`heals +${off(pathOf('deep-sleep').levels[0]!.damage!)}%`);
  });

  it('the build sheet at level one is the new card, and at the top it still fits two lines', () => {
    expect(heldLines(NAP.id, 1, new Map())).toEqual(statLines(NAP.id, NEW));
    const all = new Map(NAP.paths!.map((p) => [offerIdFor(NAP, p), p.maxLevel] as const));
    const top = heldLines(NAP.id, NAP.maxLevel, all);
    expect(top).toHaveLength(2);
    expect(top.join(' ')).toContain('not shots');
  });
});

describe('no dice', () => {
  it('falling asleep, sleeping and waking draw no random number', () => {
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
    const nNap = count(w);
    for (const x of [bare, w]) {
      x.hp = x.maxHp * 0.1;
      place(x, TOUCHER, x.x + 200, x.y);
    }
    for (let i = 0; i < 180; i++) {
      bare.step(DT, east);
      w.step(DT, east);
    }
    expect(nNap()).toBe(nBare());
    // Two worlds on one seed and one input end in one place.
    const twin = holding(1, QUIET, 3);
    twin.hp = twin.maxHp * 0.1;
    place(twin, TOUCHER, twin.x + 200, twin.y);
    for (let i = 0; i < 180; i++) twin.step(DT, east);
    expect([twin.x, twin.y, twin.hp]).toEqual([w.x, w.y, w.hp]);
  });
});
