import { describe, expect, it } from 'vitest';
import { COLLEGE, OFFICE, type ActDef, type ReorgBoss } from '../../data/acts';
import { enemyDef, type EnemyDef } from '../../data/enemies';
import { MAX_ACTIVE_ENEMIES, World, type EnemyState, type HoldState } from '../../sim/world';
import { holdArrived, meetingCloses, memoDrafted, vehiclesEntered, wornGained } from '../edges';

/**
 * The Office's four sounds are fired off edges `ActScene.hearWorld` reads
 * from the world (OFFICE-ROSTER §6): the ping worn, the commute entering, a
 * meeting closing (the schedule's or a restructure's), the Reorg's memo
 * drafted. Each is gated on a def id or the boss kind, never on the act.
 *
 * `Ear` keeps what hearWorld keeps for these edges and counts what it would
 * play, a step standing for a frame (the scene takes one step a frame).
 * Every count is "how many times it sounded", against a real World.
 */

class Ear {
  worn: ReadonlyMap<string, number>;
  holds: readonly HoldState[];
  restructures = 0;
  bossPhase = '';
  car = 0;
  played = { ping: 0, attach: 0, carPass: 0, carriage: 0, chairs: 0, memo: 0 };

  constructor(private readonly w: World) {
    this.worn = new Map(w.wornBy);
    this.holds = w.holds.slice();
  }

  /** hearWorld's reading for these edges, in its order, then its bookkeeping. */
  listen(): void {
    const w = this.w;
    const gained = wornGained(w.wornBy, this.worn);
    if (gained.includes('ping')) this.played.ping++;
    if (gained.some((id) => id !== 'ping')) this.played.attach++;
    if (memoDrafted(w.boss, this.bossPhase)) this.played.memo++;
    if (meetingCloses(w.holds, w.boss, this)) this.played.chairs++;
    const vehicles = vehiclesEntered(w.enemies, this.car);
    if (vehicles.sounds.has('carPass')) this.played.carPass++;
    if (vehicles.sounds.has('carriage')) this.played.carriage++;
    this.worn = new Map(w.wornBy);
    this.holds = w.holds.slice();
    this.restructures = w.boss?.restructures ?? 0;
    this.bossPhase = w.boss?.phase ?? '';
    this.car = vehicles.highest;
  }
}

const DT = 1 / 60;
const STILL = { moveX: 0, moveY: 0 };

/** Steps with the player kept alive, choosing the first offer when asked, the ear listening after each. */
function run(w: World, ear: Ear, seconds: number, each?: () => void): void {
  const steps = Math.round(seconds / DT);
  for (let i = 0; i < steps; i++) {
    if (w.offers) {
      w.choose(w.offers[0]!);
      continue;
    }
    if (w.won) return;
    w.hp = w.maxHp;
    w.dead = false;
    w.step(DT, STILL);
    ear.listen();
    each?.();
  }
}

let uid = 700_000;
/** An enemy of `def` on the player, built as `addEnemy` builds one. */
function place(w: World, def: EnemyDef, dx = 0, dy = 0): EnemyState {
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

/** `n` of `def` worn in one step. */
function wear(w: World, ear: Ear, def: EnemyDef, n: number): void {
  for (let i = 0; i < n; i++) place(w, def);
  run(w, ear, DT);
}

/** The act's clock run out, the boss up, then felled and its exit skipped: the crossing. */
function cross(w: World, ear: Ear): void {
  w.actTime = w.act.durationSeconds;
  run(w, ear, DT);
  const b = w.boss!;
  b.hp = 0;
  b.phase = 'absorbing';
  b.timer = 0;
  run(w, ear, DT);
}

/** A world at its boss, the field emptied and the player unarmed. */
function atBoss(act: ActDef, seed: number): { w: World; ear: Ear } {
  const w = new World({ act, seed, startingItems: [] });
  const ear = new Ear(w);
  w.actTime = act.durationSeconds;
  run(w, ear, DT);
  expect(w.boss, 'the boss did not appear at the act clock').not.toBeNull();
  w.enemies.length = 0;
  w.projectiles.length = 0;
  return { w, ear };
}

const PING = enemyDef('ping');
const TUITION = enemyDef('tuition');
const REORG = OFFICE.boss as ReorgBoss;
/** Stands where it is put and touches nobody: a body to fill the field to the cap with. */
const INERT: EnemyDef = { ...enemyDef('reply-all'), id: 'edges-inert', movement: 'static', contact: 'none', hp: 1e6 };

describe('the ping: a worn stack read per def off wornBy', () => {
  it('names each def whose count rose, and none that held or fell', () => {
    const m = (o: Record<string, number>) => new Map(Object.entries(o));
    expect(wornGained(m({ ping: 1 }), m({}))).toEqual(['ping']);
    expect(wornGained(m({ tuition: 3, ping: 1 }), m({ tuition: 2, ping: 1 }))).toEqual(['tuition']);
    expect(wornGained(m({ tuition: 3, ping: 2 }), m({ tuition: 2, ping: 1 })).sort()).toEqual(['ping', 'tuition']);
    // The crossing takes the pings off: a fall is not an arrival.
    expect(wornGained(m({ tuition: 2 }), m({ tuition: 2, ping: 3 }))).toEqual([]);
    expect(wornGained(m({ tuition: 2 }), m({ tuition: 2 }))).toEqual([]);
  });

  it('in The Office a ping pings and an invoice carried in still stamps, once a frame each', () => {
    const w = new World({ acts: [COLLEGE, OFFICE], seed: 41, startingItems: [] });
    const ear = new Ear(w);
    wear(w, ear, TUITION, 2);
    expect(ear.played).toMatchObject({ attach: 1, ping: 0 });
    cross(w, ear);
    expect(w.act).toBe(OFFICE);
    // The invoices crossed with the player; nothing new was worn.
    expect(ear.played).toMatchObject({ attach: 1, ping: 0 });
    wear(w, ear, PING, 3);
    expect(ear.played).toMatchObject({ attach: 1, ping: 1 });
    wear(w, ear, TUITION, 1);
    expect(ear.played).toMatchObject({ attach: 2, ping: 1 });
    // Both on one frame: one of each.
    place(w, PING);
    wear(w, ear, TUITION, 1);
    expect(ear.played).toMatchObject({ attach: 3, ping: 2 });
  });

  it('a ping after the crossing took the day off is heard, not measured against the old day', () => {
    const w = new World({ acts: [COLLEGE, OFFICE], seed: 42, startingItems: [] });
    const ear = new Ear(w);
    wear(w, ear, PING, 3);
    expect(ear.played.ping).toBe(1);
    cross(w, ear);
    expect(w.wornBy.get('ping') ?? 0).toBe(0);
    wear(w, ear, PING, 1);
    expect(ear.played.ping).toBe(2);
  });
});

describe('the carriage: a commute entering, on the car counter', () => {
  it('names each arrival by its own sound, so a commute is never also a car', () => {
    const w = new World({ act: OFFICE, seed: 5, startingItems: [] });
    w.spawnEnemy('commute');
    let heard = vehiclesEntered(w.enemies, 0);
    expect([...heard.sounds]).toEqual(['carriage']);
    const commute = w.enemies.find((e) => e.def.id === 'commute')!;
    expect(heard.highest).toBe(commute.uid);
    // Heard: nothing new above it.
    expect(vehiclesEntered(w.enemies, heard.highest).sounds.size).toBe(0);
    // A car and a train on one frame: one of each.
    w.spawnEnemy('drivers-ed');
    w.spawnEnemy('deadline');
    w.spawnEnemy('commute');
    heard = vehiclesEntered(w.enemies, heard.highest);
    expect([...heard.sounds].sort()).toEqual(['carPass', 'carriage']);
    // Anything else above the mark is not a vehicle and does not move it.
    w.spawnEnemy('reply-all');
    const after = vehiclesEntered(w.enemies, heard.highest);
    expect(after.sounds.size).toBe(0);
    expect(after.highest).toBe(heard.highest);
  });

  it('a commute patrolling its line is heard once, when it enters', () => {
    const w = new World({ act: { ...OFFICE, waves: [] }, seed: 6, startingItems: [] });
    const ear = new Ear(w);
    w.spawnEnemy('commute');
    run(w, ear, 12);
    expect(w.enemies.filter((e) => e.def.id === 'commute')).toHaveLength(1);
    expect(ear.played).toMatchObject({ carriage: 1, carPass: 0 });
  });
});

describe("the chairs: a meeting closing, the schedule's or a restructure's, heard once", () => {
  it('a hold is new by identity, so one arriving as another ends is still heard', () => {
    const hold = (source: string): HoldState => ({ x: 0, y: 0, radius: 260, from: 260, to: 120, seconds: 30, holdSeconds: 12, age: 0, slow: 0.6, source });
    const a = hold('meeting');
    const b = hold('meeting');
    expect(holdArrived([a], [], 'meeting')).toBe(true);
    expect(holdArrived([a], [a], 'meeting')).toBe(false);
    expect(holdArrived([b], [a], 'meeting')).toBe(true);
    expect(holdArrived([hold('snooze')], [], 'meeting')).toBe(false);
  });

  it("the schedule's meeting scrapes once when it is called and not when it ends", () => {
    const w = new World({ act: { ...OFFICE, waves: [] }, seed: 7, startingItems: [] });
    const ear = new Ear(w);
    w.spawnEnemy('meeting');
    const { seconds, holdSeconds } = enemyDef('meeting').hold!;
    run(w, ear, seconds + holdSeconds + 1);
    expect(w.holds).toHaveLength(0);
    expect(ear.played.chairs).toBe(1);
  });

  it('each restructure scrapes exactly once, with its meeting and at the spawn cap without one', () => {
    const { w, ear } = atBoss(OFFICE, 8);
    const b = w.boss!;
    expect(b.kind).toBe('reorg');
    // The first threshold, under the cap: the count rises and a meeting arrives on one frame.
    b.hp = b.maxHp * REORG.thresholds[0]! - 1;
    run(w, ear, DT);
    expect(b.restructures).toBe(1);
    expect(w.holds.filter((h) => h.source === 'meeting')).toHaveLength(1);
    expect(ear.played.chairs).toBe(1);
    run(w, ear, 2);
    expect(ear.played.chairs).toBe(1);
    // The second, at the cap: no meeting is seated, and the count alone is heard.
    while (w.enemies.length < MAX_ACTIVE_ENEMIES) place(w, INERT, 900, 900);
    const holdsBefore = w.holds.slice();
    b.hp = b.maxHp * REORG.thresholds[1]! - 1;
    run(w, ear, DT);
    expect(b.restructures).toBe(2);
    expect(w.holds).toEqual(holdsBefore);
    expect(ear.played.chairs).toBe(2);
    run(w, ear, 0.5);
    expect(ear.played.chairs).toBe(2);
  });

  it('a restructure count on any other boss is not a meeting', () => {
    const before = { holds: [], restructures: 0 };
    expect(meetingCloses([], { kind: 'egg', phase: 'idle', restructures: 1 }, before)).toBe(false);
    expect(meetingCloses([], { kind: 'reorg', phase: 'idle', restructures: 1 }, before)).toBe(true);
    expect(meetingCloses([], null, before)).toBe(false);
  });
});

describe("the memo: the Reorg's telegraph, on the edge", () => {
  it('is drafted once per column the Reorg fires', () => {
    const { w, ear } = atBoss(OFFICE, 9);
    let volleys = 0;
    let seen = 0;
    run(w, ear, 12, () => {
      const shots = w.projectiles.filter((p) => p.hostile && p.serial > seen);
      if (shots.length === 0) return;
      volleys++;
      seen = Math.max(...shots.map((p) => p.serial));
    });
    expect(volleys).toBeGreaterThanOrEqual(3);
    // A telegraph the clock ended inside is drafted and not yet fired.
    expect(ear.played.memo - volleys).toBeGreaterThanOrEqual(0);
    expect(ear.played.memo - volleys).toBeLessThanOrEqual(1);
  });

  it("is silent for the Egg's telegraph, the same machine", () => {
    const { w, ear } = atBoss({ ...OFFICE, boss: { kind: 'egg' } }, 10);
    let telegraphs = 0;
    let was = w.boss!.phase;
    run(w, ear, 12, () => {
      const phase = w.boss?.phase;
      if (phase === 'telegraph' && was !== 'telegraph') telegraphs++;
      was = phase ?? 'idle';
    });
    expect(telegraphs).toBeGreaterThanOrEqual(3);
    expect(ear.played.memo).toBe(0);
    expect(ear.played.chairs).toBe(0);
  });

  it('is heard entering the telegraph, never while it is held', () => {
    const reorg = { kind: 'reorg' as const, restructures: 0 };
    expect(memoDrafted({ ...reorg, phase: 'telegraph' }, 'idle')).toBe(true);
    expect(memoDrafted({ ...reorg, phase: 'telegraph' }, 'telegraph')).toBe(false);
    expect(memoDrafted({ ...reorg, phase: 'attack' }, 'telegraph')).toBe(false);
    expect(memoDrafted({ kind: 'prom', phase: 'telegraph', restructures: 0 }, 'idle')).toBe(false);
    expect(memoDrafted(null, 'idle')).toBe(false);
  });
});
