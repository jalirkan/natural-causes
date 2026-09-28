import { describe, expect, it } from 'vitest';
import { COLLEGE, OFFICE, type ActDef } from '../../data/acts';
import { enemyDef, type EnemyDef } from '../../data/enemies';
import { MAX_ACTIVE_ENEMIES, World, xpToNextLevel, type EnemyState } from '../world';

/**
 * The Office's verbs (OFFICE-ROSTER §3.1, §3.3–§3.5, G-048), one describe
 * each: reply-all's split, the ping's cost to cadence, the review's cut of
 * the level bar, and the meeting's arrival on the player. The meeting's hold
 * itself — its contraction, its wall and its slow — is not here. Then the
 * worn stacks counted by the kind that attached them (AUDIT six, 38).
 *
 * Every number read here is a placeholder under `OFFICE.provisional`; what is
 * under test is the rule, and each assertion is written against the def's own
 * figure rather than a copy of it.
 */

let uid = 300000;
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

const DT = 1 / 60;
const still = { moveX: 0, moveY: 0 };
const REPLY_ALL = enemyDef('reply-all');
const PING = enemyDef('ping');
const REVIEW = enemyDef('performance-review');
const TUITION = enemyDef('tuition');
const SPLIT = REPLY_ALL.split!;
const PER_PING = PING.attach!.cooldownMultiplier!;
const XP_LOSS = REVIEW.ranged!.xpLoss!;

/** Steps with the player kept alive, choosing the first offer when asked. */
function alive(world: World, seconds: number): void {
  const steps = Math.round(seconds * 60);
  for (let i = 0; i < steps; i++) {
    if (world.offers) {
      world.choose(world.offers[0]!);
      continue;
    }
    if (world.won) return;
    world.hp = world.maxHp;
    world.dead = false;
    world.step(DT, still);
  }
}

/** The act's clock run out, the boss up, then felled and its exit skipped: the crossing (life.test.ts). */
function cross(world: World): void {
  world.actTime = world.act.durationSeconds;
  alive(world, DT);
  const b = world.boss;
  expect(b, 'the boss did not appear at the act clock').not.toBeNull();
  b!.hp = 0;
  b!.phase = 'absorbing';
  b!.timer = 0;
  alive(world, DT);
}

/** `n` of `def` worn: placed on the player and touched in one step. */
function wear(w: World, def: EnemyDef, n: number): void {
  for (let i = 0; i < n; i++) place(w, def, 0, 0);
  w.step(DT, still);
}

/** A World with nothing on it and nothing firing, one step from its start. */
function empty(seed: number, act: ActDef = OFFICE): World {
  return new World({ act, seed, startingItems: [] });
}

/** A static that never fires: `def` with its `ranged` taken off, and any overrides. */
function mute(def: EnemyDef, over: Partial<EnemyDef> = {}): EnemyDef {
  const out: EnemyDef = { ...def, ...over };
  delete out.ranged;
  return out;
}

const replies = (w: World): EnemyState[] => w.enemies.filter((e) => e.def.id === 'reply-all');

describe('reply-all splits when it is killed (split, §3.1)', () => {
  it('killed at generation 0 it leaves two children at scale of its hp, radius and size, and no gem', () => {
    const w = empty(1);
    const parent = place(w, REPLY_ALL, 300, 40);
    parent.hp = 0;
    w.step(DT, still);

    const children = replies(w);
    expect(children).toHaveLength(SPLIT.children);
    expect(SPLIT).toEqual({ children: 2, generations: 3, scale: 0.75 }); // the placeholder this was written against
    for (const c of children) {
      expect(c.generation).toBe(1);
      expect(c.def).toBe(REPLY_ALL);
      expect(c.hp).toBeCloseTo(REPLY_ALL.hp * 0.75, 12);
      expect(c.radius).toBeCloseTo(REPLY_ALL.radius * 0.75, 12);
      expect(c.displaySize).toBeCloseTo(REPLY_ALL.displaySize * 0.75, 12);
      expect(c.uid).not.toBe(parent.uid);
    }
    expect(w.gems).toEqual([]);
    expect(w.kills).toBe(1);

    // Side by side where it died, touching and not stacked: each its own
    // radius from the centre, on opposite sides.
    const [a, b] = children as [EnemyState, EnemyState];
    expect(Math.hypot(a.x - b.x, a.y - b.y)).toBeCloseTo(2 * a.radius, 9);
    expect((a.x + b.x) / 2).toBeCloseTo(parent.x, 9);
    expect((a.y + b.y) / 2).toBeCloseTo(parent.y, 9);
  });

  it('a child splits again, smaller: scale to the power of its generation', () => {
    const w = empty(2);
    const child = place(w, REPLY_ALL, 300, 40);
    child.generation = 1;
    child.hp = 0;
    w.step(DT, still);
    const grandchildren = replies(w);
    expect(grandchildren).toHaveLength(SPLIT.children);
    for (const g of grandchildren) {
      expect(g.generation).toBe(2);
      expect(g.hp).toBeCloseTo(REPLY_ALL.hp * 0.75 ** 2, 12);
      expect(g.radius).toBeCloseTo(REPLY_ALL.radius * 0.75 ** 2, 12);
      expect(g.displaySize).toBeCloseTo(REPLY_ALL.displaySize * 0.75 ** 2, 12);
    }
    expect(w.gems).toEqual([]);
  });

  it('the last generation leaves a gem and no children', () => {
    const w = empty(3);
    const last = place(w, REPLY_ALL, 300, 40);
    last.generation = SPLIT.generations - 1;
    last.hp = 0;
    w.step(DT, still);
    expect(replies(w)).toEqual([]);
    expect(w.gems).toHaveLength(1);
    expect(w.gems[0]!.value).toBe(REPLY_ALL.xp);
  });

  it('a whole reply-all is children ** (generations − 1) gems, and only the last generation drops any', () => {
    const w = empty(4);
    place(w, REPLY_ALL, 400, 40).hp = 0;
    for (let g = 1; g < SPLIT.generations; g++) {
      w.step(DT, still);
      expect(w.gems, `generation ${g}`).toEqual([]);
      expect(replies(w)).toHaveLength(SPLIT.children ** g);
      for (const e of replies(w)) e.hp = 0;
    }
    w.step(DT, still);
    expect(replies(w)).toEqual([]);
    expect(w.gems).toHaveLength(SPLIT.children ** (SPLIT.generations - 1));
    expect(w.kills).toBe(1 + 2 + 4);
  });

  it('draws no dice: a split leaves the next roll where it was', () => {
    const next = (split: boolean): { x: number; y: number } => {
      const w = empty(5);
      const e = place(w, REPLY_ALL, 300, 40);
      if (split) e.hp = 0;
      w.step(DT, still);
      w.enemies.length = 0;
      w.spawnEnemy('commute'); // an edge arrival, one roll of the dice
      const c = w.enemies[0]!;
      return { x: c.x - w.x, y: c.y - w.y };
    };
    expect(next(true)).toEqual(next(false));
  });

  it('children count against the cap: at MAX_ACTIVE_ENEMIES a split fills only the slot it left, and drops nothing', () => {
    const w = empty(6);
    const e = place(w, REPLY_ALL, 300, 40);
    // Filled to the cap with statics far away that nothing touches.
    const filler = mute(REVIEW);
    while (w.enemies.length < MAX_ACTIVE_ENEMIES) place(w, filler, -900, -600);
    e.hp = 0;
    w.step(DT, still);
    // The parent is gone before its children arrive, so one of two fits.
    expect(replies(w)).toHaveLength(1);
    expect(w.enemies.length).toBe(MAX_ACTIVE_ENEMIES);
    expect(w.gems).toEqual([]);
  });

  it('the piercing shot that killed the parent flies over the children without landing', () => {
    // Stubbornness fires along the facing and pierces everything. The parent
    // dies to its first shot; the children are born across the shot's line,
    // inside its reach, carrying its serial, and it passes over them. Without
    // the serial it would hit them on the next step (the next shot is 0.9s
    // away, well outside the window).
    const w = new World({ act: OFFICE, seed: 7, startingItems: ['motility'] });
    const parent = place(w, REPLY_ALL, 60, 0);
    parent.hp = 0.01;
    for (let i = 0; i < 30 && replies(w).includes(parent); i++) w.step(DT, still);
    expect(replies(w), 'the shot never killed the parent').not.toContain(parent);
    const shot = w.projectiles.find((p) => p.source === 'motility');
    expect(shot, 'the shot was spent on the parent').toBeDefined();
    for (let i = 0; i < 10; i++) w.step(DT, still);
    const children = replies(w);
    expect(children).toHaveLength(SPLIT.children);
    for (const c of children) {
      expect(c.hp).toBeCloseTo(REPLY_ALL.hp * 0.75, 12);
      expect(c.hitBySerial).toBe(shot!.serial);
    }
  });

  it('nor does the burst that killed it: one burst is one split, not the whole chain', () => {
    // Temper's burst lives 0.12s, several steps, and hits each enemy once by
    // its serial. Children born inside it would each take its full damage on
    // the next step and split again, three generations in one burst.
    const w = new World({ act: OFFICE, seed: 9, startingItems: ['acrosome'] });
    const parent = place(w, REPLY_ALL, 40, 10);
    parent.hp = 1;
    w.step(DT, still);
    expect(replies(w), 'the burst never killed the parent').not.toContain(parent);
    expect(w.areas.length, 'the burst is gone already').toBeGreaterThan(0);
    for (let i = 0; i < 6; i++) w.step(DT, still);
    const children = replies(w);
    expect(children).toHaveLength(SPLIT.children);
    for (const c of children) {
      expect(c.generation).toBe(1);
      expect(c.hp).toBeCloseTo(REPLY_ALL.hp * 0.75, 12);
    }
  });

  it('in a run with a weapon, every generation reaches the field', () => {
    // Presence, not calibration: the split happens in play, three deep.
    const w = new World({ act: OFFICE, seed: 8, startingItems: ['lash'] });
    const seen = new Set<number>();
    for (let i = 0; i < 60 * 60; i++) {
      if (w.offers) {
        w.choose(w.offers[0]!);
        continue;
      }
      w.hp = w.maxHp;
      w.dead = false;
      w.step(DT, still);
      for (const e of w.enemies) if (e.def.id === 'reply-all') seen.add(e.generation ?? 0);
    }
    expect([...seen].sort()).toEqual([0, 1, 2]);
  }, 30_000);
});

describe('the ping costs cadence, never speed (attach.cooldownMultiplier, §3.3)', () => {
  it('two worn make every cooldown 1.06², and attentionFactor reads it', () => {
    const w = empty(11);
    expect(w.attentionFactor).toBe(1);
    expect(w.pingStacks).toBe(0);
    expect(w.cooldownFactor).toBe(1);
    const speed = w.baseSpeed;
    wear(w, PING, 2);
    expect(PER_PING).toBe(1.06); // the placeholder this was written against
    expect(w.pingStacks).toBe(2);
    expect(w.attentionFactor).toBeCloseTo(1.06 ** 2, 12);
    expect(w.cooldownFactor).toBeCloseTo(1.06 ** 2, 12);
    // drag 0: no drag stack, no speed lost, no XP taxed.
    expect(w.dragStacks).toBe(0);
    expect(w.baseSpeed).toBe(speed);
    expect(w.taxStacks).toBe(0);
    expect(w.xpTax).toBe(1);
    expect(w.enemies.filter((e) => e.def.id === 'ping')).toEqual([]);
  });

  it("multiplies Restlessness's factor rather than replacing it", () => {
    const w = new World({ act: OFFICE, seed: 12, startingItems: ['midpiece'] });
    const own = w.cooldownFactor;
    expect(own).toBeLessThan(1);
    wear(w, PING, 1);
    expect(w.cooldownFactor).toBeCloseTo(own * PER_PING, 12);
  });

  it('a College world wearing tuition keeps its cooldowns', () => {
    const w = empty(13, COLLEGE);
    wear(w, TUITION, 3);
    expect(w.dragStacks).toBe(3);
    expect(w.pingStacks).toBe(0);
    expect(w.attentionFactor).toBe(1);
    expect(w.cooldownFactor).toBe(1);
  });

  it('a weapon fires less often with pings worn', () => {
    // The multiplier reaches the weapons, not only the getter: Reflex at a
    // target it cannot kill, for ten seconds, with none and with eight worn.
    const shots = (pings: number): number => {
      const w = new World({ act: OFFICE, seed: 14, startingItems: ['lash'] });
      if (pings > 0) wear(w, PING, pings);
      w.enemies.length = 0;
      const post = place(w, mute(REVIEW, { hp: 1e9 }), 150, 0);
      const seen = new Set<object>();
      for (let i = 0; i < 600; i++) {
        post.hp = 1e9;
        w.step(DT, still);
        for (const p of w.projectiles) if (p.source === 'lash') seen.add(p);
      }
      return seen.size;
    };
    const clean = shots(0);
    expect(clean).toBeGreaterThan(0);
    expect(shots(8)).toBeLessThan(clean);
  });

  it('comes off at the crossing; tuition does not (a life of College then The Office)', () => {
    const w = new World({ acts: [COLLEGE, OFFICE], seed: 15, startingItems: [] });
    wear(w, TUITION, 2);
    wear(w, PING, 2);
    expect(w.pingStacks).toBe(2);
    expect(w.taxStacks).toBe(2);
    cross(w);
    expect(w.act).toBe(OFFICE);
    expect(w.pingStacks).toBe(0);
    expect(w.attentionFactor).toBe(1);
    expect(w.cooldownFactor).toBe(1);
    expect(w.taxStacks).toBe(2);
    expect(w.dragStacks).toBe(2);
    // And worn again in The Office, it costs again.
    wear(w, PING, 1);
    expect(w.pingStacks).toBe(1);
    expect(w.cooldownFactor).toBeCloseTo(PER_PING, 12);
  });
});

describe("the review's rating takes progress, never a level (ranged.xpLoss, §3.5)", () => {
  /** A review at range, stepped until its first rating is in the air. */
  function rated(seed: number): { w: World; rating: World['projectiles'][number] } {
    const w = empty(seed);
    place(w, REVIEW, 300, 0);
    let rating: World['projectiles'][number] | undefined;
    for (let i = 0; i < 240 && !rating; i++) {
      w.step(DT, still);
      rating = w.projectiles.find((p) => p.hostile && p.owner?.id === 'performance-review');
    }
    expect(rating, 'the review never fired').toBeDefined();
    return { w, rating: rating! };
  }

  it('a landing takes xpLoss of the bar to the next level, and hurts a little', () => {
    const { w, rating } = rated(21);
    expect(XP_LOSS).toBe(0.15); // the placeholder this was written against
    const level = w.level;
    const bar = w.xpToNext;
    expect(bar).toBe(xpToNextLevel(level));
    w.xp = bar * 0.8;
    w.invulnerable = 0;
    const hp = w.hp;
    rating.x = w.x;
    rating.y = w.y;
    w.step(DT, still);
    expect(w.projectiles).not.toContain(rating);
    expect(w.hp).toBeCloseTo(hp - REVIEW.ranged!.damage * w.damageTaken, 10);
    expect(w.xp).toBeCloseTo(bar * 0.8 - XP_LOSS * bar, 12);
    expect(w.level).toBe(level);
    expect(w.xpToNext).toBe(bar);
  });

  it('near the bottom of the bar it floors at nothing and the level stays', () => {
    const { w, rating } = rated(22);
    const level = w.level;
    w.xp = 0.1;
    w.invulnerable = 0;
    rating.x = w.x;
    rating.y = w.y;
    w.step(DT, still);
    expect(w.projectiles).not.toContain(rating);
    expect(w.xp).toBe(0);
    expect(w.level).toBe(level);
  });

  it('a rating landing inside the i-frames is spent and takes nothing', () => {
    const { w, rating } = rated(23);
    w.xp = 3;
    w.invulnerable = 1;
    const hp = w.hp;
    rating.x = w.x;
    rating.y = w.y;
    w.step(DT, still);
    expect(w.projectiles).not.toContain(rating);
    expect(w.hp).toBe(hp);
    expect(w.xp).toBe(3);
  });

  it("another ranged enemy's shot takes no XP (the registrar's)", () => {
    const w = empty(24, COLLEGE);
    place(w, enemyDef('registrar'), 300, 0);
    let form: World['projectiles'][number] | undefined;
    for (let i = 0; i < 240 && !form; i++) {
      w.step(DT, still);
      form = w.projectiles.find((p) => p.hostile && p.owner?.id === 'registrar');
    }
    w.xp = 3;
    w.invulnerable = 0;
    form!.x = w.x;
    form!.y = w.y;
    w.step(DT, still);
    expect(w.projectiles).not.toContain(form);
    expect(w.xp).toBe(3);
  });
});

describe("the meeting is called where the player stands (spawnAt: 'player', §3.4)", () => {
  it("a meeting spawned by the schedule sits at the player's position", () => {
    // A schedule of meetings alone, and a player walking, so the spot is not
    // the arena's centre and not where they began.
    const act: ActDef = { ...OFFICE, waves: [{ fromSeconds: 0, enemyId: 'meeting', rate: 1 }] };
    const w = new World({ act, seed: 31, startingItems: [] });
    const start = { x: w.x, y: w.y };
    let meeting: EnemyState | undefined;
    for (let i = 0; i < 180 && !meeting; i++) {
      w.step(DT, { moveX: 1, moveY: 0.5 });
      meeting = w.enemies.find((e) => e.def.id === 'meeting');
    }
    expect(meeting, 'the schedule never called a meeting').toBeDefined();
    expect(meeting!.x).toBe(w.x);
    expect(meeting!.y).toBe(w.y);
    expect(w.x).not.toBe(start.x);
  });

  it('draws no dice', () => {
    const next = (meeting: boolean): { x: number; y: number } => {
      const w = empty(32);
      if (meeting) w.spawnEnemy('meeting');
      w.spawnEnemy('commute');
      const c = w.enemies.find((e) => e.def.id === 'commute')!;
      return { x: c.x - w.x, y: c.y - w.y };
    };
    expect(next(true)).toEqual(next(false));
  });
});

describe('worn stacks are counted by the kind that attached them (AUDIT six, 38)', () => {
  it('reads { tuition: 2 } after two invoices and { tuition: 2, ping: 1 } after a ping', () => {
    const w = new World({ acts: [COLLEGE, OFFICE], seed: 41, startingItems: [] });
    expect(Object.fromEntries(w.wornBy)).toEqual({});
    wear(w, TUITION, 2);
    expect(Object.fromEntries(w.wornBy)).toEqual({ tuition: 2 });
    cross(w);
    // The invoices cross, and are still invoices in The Office.
    expect(w.act).toBe(OFFICE);
    expect(Object.fromEntries(w.wornBy)).toEqual({ tuition: 2 });
    wear(w, PING, 1);
    expect(Object.fromEntries(w.wornBy)).toEqual({ tuition: 2, ping: 1 });
    // `dragStacks` is still the sim's number: the invoices, not the ping.
    expect(w.dragStacks).toBe(2);
  });

  it('what does not persist comes off it at the crossing, beside what does', () => {
    const w = new World({ acts: [COLLEGE, OFFICE], seed: 42, startingItems: [] });
    wear(w, TUITION, 1);
    wear(w, enemyDef('acne'), 2);
    wear(w, PING, 3);
    expect(Object.fromEntries(w.wornBy)).toEqual({ tuition: 1, acne: 2, ping: 3 });
    cross(w);
    expect(Object.fromEntries(w.wornBy)).toEqual({ tuition: 1 });
  });
});
