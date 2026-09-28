import { describe, expect, it } from 'vitest';
import {
  ADOLESCENCE,
  ALL_ACTS,
  COLLEGE,
  CONCEPTION,
  FAMILY,
  OFFICE,
  type ActDef,
  type MortgageBoss,
  type ReorgBoss,
} from '../../data/acts';
import { enemyDef, type EnemyDef } from '../../data/enemies';
import { MAX_ACTIVE_ENEMIES, World, type EnemyState, type HoldState } from '../../sim/world';
import {
  consulting,
  holdArrived,
  holdTaken,
  instalmentPaid,
  meetingCloses,
  memoDrafted,
  newestAbove,
  statementDrafted,
  vehiclesEntered,
  wornGained,
} from '../edges';

/**
 * The Office's four sounds are fired off edges `ActScene.hearWorld` reads
 * from the world (OFFICE-ROSTER §6): the ping worn, the commute entering, a
 * meeting closing (the schedule's or a restructure's), the Reorg's memo
 * drafted. Family's (FAMILY-ROSTER §6) are read the same way: a bill arriving
 * (the doorbell), the phone consulting (the ring), the toddler taking hold
 * (the squeak), the flat-pack entering (the tape), the Mortgage's statement
 * drafted and a window of it paid (the till). Each is gated on a def id or
 * the boss kind, never on the act.
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
  bill = 0;
  ringing = 0;
  engulf: number;
  paid = 0;
  played = {
    ping: 0,
    attach: 0,
    carPass: 0,
    carriage: 0,
    chairs: 0,
    memo: 0,
    statement: 0,
    ding: 0,
    tape: 0,
    doorbell: 0,
    ring: 0,
    squeak: 0,
  };

  constructor(private readonly w: World) {
    this.worn = new Map(w.wornBy);
    this.holds = w.holds.slice();
    this.engulf = w.engulfTimer;
  }

  /** hearWorld's reading for these edges, in its order, then its bookkeeping. */
  listen(): void {
    const w = this.w;
    const gained = wornGained(w.wornBy, this.worn);
    if (gained.includes('ping')) this.played.ping++;
    if (gained.some((id) => id !== 'ping')) this.played.attach++;
    if (memoDrafted(w.boss, this.bossPhase)) this.played.memo++;
    if (meetingCloses(w.holds, w.boss, this)) this.played.chairs++;
    if (statementDrafted(w.boss, this.bossPhase)) this.played.statement++;
    if (instalmentPaid(w.boss, this.paid)) this.played.ding++;
    const vehicles = vehiclesEntered(w.enemies, this.car);
    if (vehicles.sounds.has('carPass')) this.played.carPass++;
    if (vehicles.sounds.has('carriage')) this.played.carriage++;
    if (vehicles.sounds.has('tape')) this.played.tape++;
    const bill = newestAbove(w.enemies, 'bill', this.bill);
    if (bill > this.bill) this.played.doorbell++;
    const ringing = consulting(w.enemies, 'phone-call');
    if (ringing > this.ringing) this.played.ring++;
    if (holdTaken(w, this.engulf) === 'toddler') this.played.squeak++;
    this.worn = new Map(w.wornBy);
    this.holds = w.holds.slice();
    this.restructures = w.boss?.restructures ?? 0;
    this.bossPhase = w.boss?.phase ?? '';
    this.car = vehicles.highest;
    this.bill = bill;
    this.ringing = ringing;
    this.engulf = w.engulfTimer;
    this.paid = w.boss?.paid ?? 0;
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

// --- Family -------------------------------------------------------------------

if (FAMILY.boss.kind !== 'mortgage') throw new Error('Family does not fight the Mortgage');
const MORTGAGE: MortgageBoss = FAMILY.boss;
/** Family with nothing scheduled: only a test's own arrivals and the Mortgage's windows reach the field. */
const FAMILY_QUIET: ActDef = { ...FAMILY, waves: [] };
const BILL = enemyDef('bill');
const TODDLER = enemyDef('toddler');
const PHONE = enemyDef('phone-call');
const HOA = enemyDef('hoa-letter');
const WHITE_CELL = enemyDef('white-cell');
const STANDARDISED_TEST = enemyDef('standardised-test');
const count = (w: World, id: string): number => w.enemies.filter((e) => e.def.id === id).length;

describe('the doorbell: a bill arriving, a late fee included', () => {
  it('reads the newest bill above the mark, and nothing but a bill moves it', () => {
    const w = new World({ act: FAMILY_QUIET, seed: 31, startingItems: [] });
    w.spawnEnemy('bill');
    const first = w.enemies.find((e) => e.def.id === 'bill')!;
    expect(newestAbove(w.enemies, 'bill', 0)).toBe(first.uid);
    // Heard: nothing new above it.
    expect(newestAbove(w.enemies, 'bill', first.uid)).toBe(first.uid);
    w.spawnEnemy('flat-pack');
    w.spawnEnemy('toddler');
    expect(newestAbove(w.enemies, 'bill', first.uid)).toBe(first.uid);
    w.spawnEnemy('bill');
    w.spawnEnemy('bill');
    const top = Math.max(...w.enemies.filter((e) => e.def.id === 'bill').map((e) => e.uid));
    expect(newestAbove(w.enemies, 'bill', first.uid)).toBe(top);
  });

  it('rings once a frame however many arrive, and again for each round of late fees', () => {
    const w = new World({ act: FAMILY_QUIET, seed: 32, startingItems: [] });
    const ear = new Ear(w);
    for (let i = 0; i < 3; i++) w.spawnEnemy('bill');
    run(w, ear, DT);
    expect(ear.played.doorbell).toBe(1);
    // Three bills of one age issue their fees on the same frames: one ring a round.
    const accrue = BILL.accrue!;
    run(w, ear, accrue.seconds * accrue.fees + 1);
    expect(w.enemies.filter((e) => e.def.id === 'bill' && e.fee === true)).toHaveLength(3 * accrue.fees);
    expect(ear.played.doorbell).toBe(1 + accrue.fees);
    expect(ear.played).toMatchObject({ tape: 0, squeak: 0, ring: 0, ding: 0 });
  });
});

describe('the tape: a flat-pack entering, on the car counter', () => {
  it('names the flat-pack the tape, never a car or a train', () => {
    const w = new World({ act: FAMILY_QUIET, seed: 33, startingItems: [] });
    w.spawnEnemy('flat-pack');
    const heard = vehiclesEntered(w.enemies, 0);
    expect([...heard.sounds]).toEqual(['tape']);
    w.spawnEnemy('flat-pack');
    w.spawnEnemy('drivers-ed');
    expect([...vehiclesEntered(w.enemies, heard.highest).sounds].sort()).toEqual(['carPass', 'tape']);
    // A bill above the mark is not a vehicle and does not move it.
    const after = vehiclesEntered(w.enemies, 0).highest;
    w.spawnEnemy('bill');
    expect(vehiclesEntered(w.enemies, after).sounds.size).toBe(0);
    expect(vehiclesEntered(w.enemies, after).highest).toBe(after);
  });

  it('a flat-pack crossing the field is heard once, when it enters', () => {
    const w = new World({ act: FAMILY_QUIET, seed: 34, startingItems: [] });
    const ear = new Ear(w);
    w.spawnEnemy('flat-pack');
    run(w, ear, 10);
    expect(ear.played).toMatchObject({ tape: 1, carPass: 0, carriage: 0, doorbell: 0 });
  });
});

describe('the ring: a phone consulting', () => {
  it('counts the phones consulting, by def', () => {
    const at = (id: string, consult: number) => ({ consult, def: { id } });
    expect(consulting([at('phone-call', 1.2), at('phone-call', 0), at('registrar', 0.8)], 'phone-call')).toBe(1);
    expect(consulting([at('group-chat', 0.4)], 'phone-call')).toBe(0);
    expect(consulting([], 'phone-call')).toBe(0);
  });

  it('rings once for each call it places, on the consult and not on the call', () => {
    const w = new World({ act: FAMILY_QUIET, seed: 35, startingItems: [] });
    const ear = new Ear(w);
    const phone = place(w, PHONE, 200, 0);
    // A call placed is the phone's cooldown starting. Not the shot: once the
    // first call has pulled the player onto the phone, the next lands on the
    // step it is placed and is never on the field between frames.
    let calls = 0;
    let reload = phone.reload;
    let ringsAtFirstCall = -1;
    run(w, ear, 20, () => {
      if (phone.reload > reload) {
        if (calls === 0) ringsAtFirstCall = ear.played.ring;
        calls++;
      }
      reload = phone.reload;
    });
    expect(calls).toBeGreaterThanOrEqual(2);
    // The ring came with the consult, before the call went; the call adds none.
    expect(ringsAtFirstCall).toBe(1);
    // A consult the clock ended inside has rung and not yet called.
    expect(ear.played.ring - calls).toBeGreaterThanOrEqual(0);
    expect(ear.played.ring - calls).toBeLessThanOrEqual(1);
  });

  it('two phones picking up on one frame ring once', () => {
    const w = new World({ act: FAMILY_QUIET, seed: 36, startingItems: [] });
    const ear = new Ear(w);
    place(w, PHONE, 200, 0);
    place(w, PHONE, -200, 0);
    run(w, ear, DT);
    expect(consulting(w.enemies, 'phone-call')).toBe(2);
    expect(ear.played.ring).toBe(1);
  });
});

describe("the squeak: the toddler taking hold, and nobody else's hold", () => {
  it('squeaks as a toddler takes hold, once for the hold, and again for the next toddler', () => {
    const w = new World({ act: FAMILY_QUIET, seed: 37, startingItems: [] });
    const ear = new Ear(w);
    place(w, TODDLER, 4, 0);
    run(w, ear, DT);
    expect(w.engulfTimer).toBeGreaterThan(0);
    expect(ear.played.squeak).toBe(1);
    run(w, ear, TODDLER.engulf!.seconds + 0.5);
    // Let go, and gone, delighted; the letting go is silent.
    expect(count(w, 'toddler')).toBe(0);
    expect(ear.played.squeak).toBe(1);
    place(w, TODDLER, 4, 0);
    run(w, ear, DT);
    expect(ear.played.squeak).toBe(2);
  });

  it('hears a hold taken on the step the last let go, which "rising from zero" would miss', () => {
    const w = new World({ act: FAMILY_QUIET, seed: 38, startingItems: [] });
    const ear = new Ear(w);
    place(w, TODDLER, 4, 0);
    place(w, TODDLER, -4, 0);
    let lowest = Infinity;
    run(w, ear, TODDLER.engulf!.seconds + 1, () => {
      lowest = Math.min(lowest, w.engulfTimer);
    });
    // The first let go and left; the second already had the leg.
    expect(count(w, 'toddler')).toBe(1);
    expect(w.engulfTimer).toBeGreaterThan(0);
    // No frame between the two holds read the clock at zero.
    expect(lowest).toBeGreaterThan(0);
    expect(ear.played.squeak).toBe(2);
  });

  it("the white cell's hold and the standardised test's run the same clock and never squeak", () => {
    for (const [act, def] of [
      [CONCEPTION, WHITE_CELL],
      [ADOLESCENCE, STANDARDISED_TEST],
    ] as const) {
      const w = new World({ act: { ...act, waves: [] }, seed: 39, startingItems: [] });
      const ear = new Ear(w);
      place(w, def, 4, 0);
      let holds = 0;
      let was = w.engulfTimer;
      run(w, ear, def.engulf!.seconds * 3 + 0.5, () => {
        if (w.engulfTimer > was) {
          holds++;
          expect(holdTaken(w, was), def.id).toBe(def.id);
        }
        was = w.engulfTimer;
      });
      // It stays on the field and takes hold again as each window ends.
      expect(holds, def.id).toBeGreaterThanOrEqual(3);
      expect(ear.played.squeak, def.id).toBe(0);
    }
  });

  it('on a field mixed by hand, names the body the sim chose: the last in the list within touch', () => {
    for (const order of [
      [WHITE_CELL, TODDLER],
      [TODDLER, WHITE_CELL],
    ]) {
      const w = new World({ act: FAMILY_QUIET, seed: 40, startingItems: [] });
      const ear = new Ear(w);
      for (const def of order) place(w, def, 4, 0);
      run(w, ear, DT);
      // The witness: of the two, only the toddler's hold multiplies the cooldowns.
      const toddlerHolds = w.engulfCooldownFactor > 1;
      expect(toddlerHolds).toBe(order[1] === TODDLER);
      expect(ear.played.squeak).toBe(toddlerHolds ? 1 : 0);
    }
  });

  it('no rise, no hold; out of touch, the nearest engulfing body answers', () => {
    const body = (id: string, x: number, contact: 'engulf' | 'damage' = 'engulf') => ({
      x,
      y: 0,
      radius: 14,
      def: { ...enemyDef(id), contact },
    });
    const view = (engulfTimer: number, enemies: ReturnType<typeof body>[]) => ({ engulfTimer, x: 0, y: 0, playerRadius: 16, enemies });
    const field = [body('white-cell', 300), body('toddler', 120), body('bill', 10, 'damage')];
    expect(holdTaken(view(3, field), 0)).toBe('toddler');
    expect(holdTaken(view(3, field), -0.004)).toBe('toddler');
    // Held, counting down: not a new hold.
    expect(holdTaken(view(2.9, field), 2.95)).toBeNull();
    expect(holdTaken(view(0, field), 0)).toBeNull();
    expect(holdTaken(view(3, []), 0)).toBeNull();
  });
});

describe('the HOA letter: worn, it is stamped like every notice', () => {
  it('in Family a letter worn is the attach stamp, never the ping', () => {
    const w = new World({ act: FAMILY_QUIET, seed: 41, startingItems: [] });
    const ear = new Ear(w);
    wear(w, ear, HOA, 2);
    expect(ear.played).toMatchObject({ attach: 1, ping: 0 });
    wear(w, ear, HOA, 1);
    expect(ear.played).toMatchObject({ attach: 2, ping: 0 });
  });
});

describe("the statement: the Mortgage's telegraph, on the edge", () => {
  it('is drafted once per DUE the Mortgage sends', () => {
    const { w, ear } = atBoss(FAMILY, 42);
    expect(w.boss!.kind).toBe('mortgage');
    let dues = 0;
    let seen = 0;
    run(w, ear, 12, () => {
      const shots = w.projectiles.filter((p) => p.hostile && !p.owner && p.serial > seen);
      if (shots.length === 0) return;
      dues++;
      seen = Math.max(...shots.map((p) => p.serial));
    });
    expect(dues).toBeGreaterThanOrEqual(3);
    // A telegraph the clock ended inside is drafted and not yet sent.
    expect(ear.played.statement - dues).toBeGreaterThanOrEqual(0);
    expect(ear.played.statement - dues).toBeLessThanOrEqual(1);
    expect(ear.played.memo).toBe(0);
  });

  it("is silent for the Loan's telegraph and the Egg's, the same machine", () => {
    for (const act of [COLLEGE, { ...FAMILY, boss: { kind: 'egg' } } as ActDef]) {
      const { w, ear } = atBoss(act, 43);
      let telegraphs = 0;
      let was = w.boss!.phase;
      run(w, ear, 12, () => {
        const phase = w.boss?.phase;
        if (phase === 'telegraph' && was !== 'telegraph') telegraphs++;
        was = phase ?? 'idle';
      });
      expect(telegraphs, act.boss.kind).toBeGreaterThanOrEqual(3);
      expect(ear.played.statement, act.boss.kind).toBe(0);
      expect(ear.played.ding, act.boss.kind).toBe(0);
    }
  });

  it('is heard entering the telegraph, never while it is held', () => {
    expect(statementDrafted({ kind: 'mortgage', phase: 'telegraph' }, 'idle')).toBe(true);
    expect(statementDrafted({ kind: 'mortgage', phase: 'telegraph' }, 'telegraph')).toBe(false);
    expect(statementDrafted({ kind: 'mortgage', phase: 'attack' }, 'telegraph')).toBe(false);
    expect(statementDrafted({ kind: 'loan', phase: 'telegraph' }, 'idle')).toBe(false);
    expect(statementDrafted({ kind: 'reorg', phase: 'telegraph' }, 'idle')).toBe(false);
    expect(statementDrafted(null, 'idle')).toBe(false);
  });
});

describe('the till: a Mortgage window paid, once a window', () => {
  /**
   * One window, paid first if asked as `bossTakes` pays one (the balance down
   * an instalment, `accepted` at it), then stepped to its close. What the
   * closing window sounded like; the bills are then swept up, so a late fee's
   * own fees never ring in a later window.
   */
  function window(w: World, ear: Ear, pay: boolean): { ding: number; doorbell: number } {
    const b = w.boss!;
    if (pay) {
      const instalment = b.maxHp / MORTGAGE.instalments;
      b.hp -= instalment;
      b.accepted = instalment;
    }
    const before = { ding: ear.played.ding, doorbell: ear.played.doorbell };
    let last = b.windowTimer;
    for (let i = 0; i < 2 * 60 * MORTGAGE.instalmentSeconds; i++) {
      run(w, ear, DT);
      if (b.windowTimer > last || b.phase === 'absorbing') break;
      last = b.windowTimer;
    }
    for (let i = w.enemies.length - 1; i >= 0; i--) if (w.enemies[i]!.def.id === 'bill') w.enemies.splice(i, 1);
    return { ding: ear.played.ding - before.ding, doorbell: ear.played.doorbell - before.doorbell };
  }

  it('a paid window is one ding; a missed one is its late fee at the door, the doorbell, and no ding', () => {
    const { w, ear } = atBoss(FAMILY_QUIET, 44);
    for (const pay of [true, false, true, true, false]) {
      expect(window(w, ear, pay), `${pay}`).toEqual(pay ? { ding: 1, doorbell: 0 } : { ding: 0, doorbell: 1 });
    }
    expect(w.boss!.paid).toBe(3);
  });

  it('paid off: twelve dings, the last on the window the door opens, and no bill', () => {
    const { w, ear } = atBoss(FAMILY_QUIET, 45);
    for (let k = 0; k < MORTGAGE.instalments; k++) expect(window(w, ear, true), `window ${k + 1}`).toEqual({ ding: 1, doorbell: 0 });
    expect(w.boss!.phase).toBe('absorbing');
    expect(ear.played.ding).toBe(MORTGAGE.instalments);
  });

  it('is the Mortgage paying, never another kind', () => {
    expect(instalmentPaid({ kind: 'mortgage', paid: 1 }, 0)).toBe(true);
    expect(instalmentPaid({ kind: 'mortgage', paid: 1 }, 1)).toBe(false);
    expect(instalmentPaid({ kind: 'loan', paid: 1 }, 0)).toBe(false);
    expect(instalmentPaid(null, 0)).toBe(false);
  });
});

describe('each schedule hears its own things', () => {
  /** An act run whole on its schedule with the player standing still and unarmed, then its boss a while. */
  function whole(act: ActDef, seed: number): Ear {
    const w = new World({ act, seed, startingItems: [] });
    const ear = new Ear(w);
    run(w, ear, act.durationSeconds + 15);
    return ear;
  }

  // A whole act is a few thousand steps with a crowd nobody thins: seconds
  // on a quiet box, several times that on a busy CI runner.
  const WHOLE_MS = 60_000;

  it(
    "Family's schedule rings the doorbell, tears the tape and squeaks, and plays none of The Office's",
    () => {
      const { played } = whole(FAMILY, 46);
      expect(played.doorbell).toBeGreaterThan(0);
      expect(played.tape).toBeGreaterThan(0);
      expect(played.squeak).toBeGreaterThan(0);
      expect(played.statement).toBeGreaterThan(0);
      expect(played).toMatchObject({ ping: 0, carPass: 0, carriage: 0, chairs: 0, memo: 0 });
    },
    WHOLE_MS,
  );

  it.each(ALL_ACTS.filter((act) => act !== FAMILY).map((act, i) => [act.id, act, 47 + i] as const))(
    "%s's schedule plays no sound of Family's",
    (_id, act, seed) => {
      const { played } = whole(act, seed);
      expect(played).toMatchObject({ doorbell: 0, tape: 0, ring: 0, squeak: 0, statement: 0, ding: 0 });
    },
    WHOLE_MS,
  );
});
