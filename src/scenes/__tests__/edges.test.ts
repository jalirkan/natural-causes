import { describe, expect, it } from 'vitest';
import {
  ADOLESCENCE,
  ALL_ACTS,
  COLLEGE,
  CONCEPTION,
  DECLINE,
  FAMILY,
  OFFICE,
  type ActDef,
  type MortgageBoss,
  type ReorgBoss,
  type TimeBoss,
} from '../../data/acts';
import { enemyDef, type EnemyDef } from '../../data/enemies';
import { MAX_ACTIVE_ENEMIES, TIME_FILES_PER_TURN, World, type EnemyState, type HoldState } from '../../sim/world';
import {
  TIME_COUNTDOWN,
  borrowsAhem,
  consulting,
  holdArrived,
  holdTaken,
  instalmentPaid,
  meetingCloses,
  memoDrafted,
  newestAbove,
  statementDrafted,
  timeTicks,
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
 * drafted and a window of it paid (the till). Decline's (DECLINE-ROSTER §6)
 * too: a medication arriving (the rattle), the weather entering (the rain),
 * a flight of stairs landing (the creak), the insurance form consulting
 * (DENIED's stamp, its shot silent), and Time's tick. Each is gated on a def
 * id or the boss kind, never on the act.
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
  shot = 0;
  medication = 0;
  denying = 0;
  secondsLeft = 0;
  filed = 0;
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
    ahem: 0,
    rattle: 0,
    rain: 0,
    creak: 0,
    denied: 0,
    tick: 0,
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
    // A shot from a ranged enemy with no voice of its own borrows the ah-hem.
    let shot = this.shot;
    let ahem = false;
    for (const p of w.projectiles) {
      if (!p.hostile || p.serial <= this.shot) continue;
      if (p.owner && borrowsAhem(p.owner.id)) ahem = true;
      shot = Math.max(shot, p.serial);
    }
    if (ahem) this.played.ahem++;
    const medication = newestAbove(w.enemies, 'medication', this.medication);
    if (medication > this.medication) this.played.rattle++;
    if (vehicles.sounds.has('rain')) this.played.rain++;
    if (holdArrived(w.holds, this.holds, 'stairs')) this.played.creak++;
    const denying = consulting(w.enemies, 'insurance-form');
    if (denying > this.denying) this.played.denied++;
    if (timeTicks(w.boss, this)) this.played.tick++;
    this.worn = new Map(w.wornBy);
    this.holds = w.holds.slice();
    this.restructures = w.boss?.restructures ?? 0;
    this.bossPhase = w.boss?.phase ?? '';
    this.car = vehicles.highest;
    this.bill = bill;
    this.ringing = ringing;
    this.engulf = w.engulfTimer;
    this.paid = w.boss?.paid ?? 0;
    this.shot = shot;
    this.medication = medication;
    this.denying = denying;
    this.secondsLeft = w.boss?.secondsLeft ?? 0;
    this.filed = w.boss?.filed ?? 0;
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

/**
 * One Mortgage window, paid first if asked as `bossTakes` pays one (the
 * balance down an instalment, `accepted` at it), then stepped to its close.
 * What the closing window sounded like; the bills are then swept up, so a
 * late fee's own fees never ring in a later window.
 */
function mortgageWindow(w: World, ear: Ear, pay: boolean): { ding: number; doorbell: number } {
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

describe('the till: a Mortgage window paid, once a window', () => {
  it('a paid window is one ding; a missed one is its late fee at the door, the doorbell, and no ding', () => {
    const { w, ear } = atBoss(FAMILY_QUIET, 44);
    for (const pay of [true, false, true, true, false]) {
      expect(mortgageWindow(w, ear, pay), `${pay}`).toEqual(pay ? { ding: 1, doorbell: 0 } : { ding: 0, doorbell: 1 });
    }
    expect(w.boss!.paid).toBe(3);
  });

  it('paid off: twelve dings, the last on the window the door opens, and no bill', () => {
    const { w, ear } = atBoss(FAMILY_QUIET, 45);
    for (let k = 0; k < MORTGAGE.instalments; k++) expect(mortgageWindow(w, ear, true), `window ${k + 1}`).toEqual({ ding: 1, doorbell: 0 });
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

// --- Decline ------------------------------------------------------------------

if (DECLINE.boss.kind !== 'time') throw new Error('Decline does not end on Time');
const TIME: TimeBoss = DECLINE.boss;
/** Decline with nothing scheduled: only a test's own arrivals and Time's file reach the field. */
const DECLINE_QUIET: ActDef = { ...DECLINE, waves: [] };
const FORM = enemyDef('insurance-form');

describe('the rattle: a medication arriving', () => {
  it('reads the newest medication above the mark, and nothing but a medication moves it', () => {
    const w = new World({ act: DECLINE_QUIET, seed: 61, startingItems: [] });
    w.spawnEnemy('medication');
    const first = w.enemies.find((e) => e.def.id === 'medication')!;
    expect(newestAbove(w.enemies, 'medication', 0)).toBe(first.uid);
    expect(newestAbove(w.enemies, 'medication', first.uid)).toBe(first.uid);
    for (const id of ['weather', 'your-knees', 'insurance-form', 'bill']) w.spawnEnemy(id);
    expect(newestAbove(w.enemies, 'medication', first.uid)).toBe(first.uid);
    w.spawnEnemy('medication');
    w.spawnEnemy('medication');
    const top = Math.max(...w.enemies.filter((e) => e.def.id === 'medication').map((e) => e.uid));
    expect(newestAbove(w.enemies, 'medication', first.uid)).toBe(top);
  });

  it('rattles once a frame however many arrive, not while they chase, and again for the next', () => {
    const w = new World({ act: DECLINE_QUIET, seed: 62, startingItems: [] });
    const ear = new Ear(w);
    for (let i = 0; i < 3; i++) w.spawnEnemy('medication');
    run(w, ear, DT);
    expect(ear.played.rattle).toBe(1);
    run(w, ear, 3);
    expect(count(w, 'medication')).toBe(3);
    expect(ear.played.rattle).toBe(1);
    w.spawnEnemy('medication');
    run(w, ear, DT);
    expect(ear.played.rattle).toBe(2);
    // A bill is the doorbell's, never a dose.
    w.spawnEnemy('bill');
    run(w, ear, DT);
    expect(ear.played).toMatchObject({ rattle: 2, doorbell: 1 });
  });
});

describe('the rain: the weather entering, on the car counter', () => {
  it('names the weather the rain, never a car, a train or the tape', () => {
    const w = new World({ act: DECLINE_QUIET, seed: 63, startingItems: [] });
    w.spawnEnemy('weather');
    const heard = vehiclesEntered(w.enemies, 0);
    expect([...heard.sounds]).toEqual(['rain']);
    // A front and a flat-pack on one frame: one of each.
    w.spawnEnemy('weather');
    w.spawnEnemy('flat-pack');
    expect([...vehiclesEntered(w.enemies, heard.highest).sounds].sort()).toEqual(['rain', 'tape']);
    // A dose above the mark is not a vehicle and does not move it.
    const after = vehiclesEntered(w.enemies, 0).highest;
    w.spawnEnemy('medication');
    expect(vehiclesEntered(w.enemies, after).sounds.size).toBe(0);
    expect(vehiclesEntered(w.enemies, after).highest).toBe(after);
  });

  it('a front crossing the field is heard once, when it enters, and not when it leaves', () => {
    const w = new World({ act: DECLINE_QUIET, seed: 64, startingItems: [] });
    const ear = new Ear(w);
    w.spawnEnemy('weather');
    let left = false;
    run(w, ear, 12, () => {
      left ||= count(w, 'weather') === 0;
    });
    expect(left, 'the weather never left').toBe(true);
    expect(ear.played).toMatchObject({ rain: 1, carPass: 0, carriage: 0, tape: 0, rattle: 0 });
  });
});

describe('the creak: a flight of stairs landing, and no other hold', () => {
  it('creaks once as a flight lands and never again while it stands, which is the act', () => {
    const w = new World({ act: DECLINE_QUIET, seed: 65, startingItems: [] });
    const ear = new Ear(w);
    w.spawnEnemy('stairs');
    run(w, ear, DT);
    expect(w.holds.filter((h) => h.source === 'stairs')).toHaveLength(1);
    expect(ear.played).toMatchObject({ creak: 1, chairs: 0 });
    run(w, ear, 20);
    expect(w.holds.filter((h) => h.source === 'stairs')).toHaveLength(1);
    expect(ear.played.creak).toBe(1);
    // The next flight creaks; two landing on one frame creak once.
    w.spawnEnemy('stairs');
    run(w, ear, DT);
    expect(ear.played.creak).toBe(2);
    w.spawnEnemy('stairs');
    w.spawnEnemy('stairs');
    run(w, ear, DT);
    expect(w.holds.filter((h) => h.source === 'stairs')).toHaveLength(4);
    expect(ear.played).toMatchObject({ creak: 3, chairs: 0 });
  });

  it("a meeting's hold is the chairs and never creaks, the schedule's or a restructure's", () => {
    const w = new World({ act: { ...OFFICE, waves: [] }, seed: 66, startingItems: [] });
    const ear = new Ear(w);
    w.spawnEnemy('meeting');
    const { seconds, holdSeconds } = enemyDef('meeting').hold!;
    run(w, ear, seconds + holdSeconds + 1);
    expect(ear.played).toMatchObject({ chairs: 1, creak: 0 });
    const { w: office, ear: officeEar } = atBoss(OFFICE, 67);
    const b = office.boss!;
    b.hp = b.maxHp * REORG.thresholds[0]! - 1;
    run(office, officeEar, DT);
    expect(office.holds.filter((h) => h.source === 'meeting')).toHaveLength(1);
    expect(officeEar.played).toMatchObject({ chairs: 1, creak: 0 });
  });
});

describe('DENIED: the insurance form consulting, its decision silent', () => {
  it('stamps once for each decision, on the consult, and the decision lands without an ah-hem', () => {
    const w = new World({ act: DECLINE_QUIET, seed: 68, startingItems: [] });
    const opening = w.maxHp;
    const ear = new Ear(w);
    const form = place(w, FORM, 200, 0);
    // A decision taken is the form's cooldown starting (the phone's reading).
    let decisions = 0;
    let reload = form.reload;
    let stampsAtFirst = -1;
    let flying = 0;
    run(w, ear, 20, () => {
      if (form.reload > reload) {
        if (decisions === 0) stampsAtFirst = ear.played.denied;
        decisions++;
      }
      reload = form.reload;
      flying = Math.max(flying, w.projectiles.filter((p) => p.owner?.id === FORM.id).length);
    });
    expect(decisions).toBeGreaterThanOrEqual(2);
    // The decisions were on the field between frames, and landed: the silence is heard, not assumed.
    expect(flying).toBeGreaterThan(0);
    expect(w.maxHp, 'no decision landed').toBeLessThan(opening);
    // The stamp came with the consult, before the decision went; the decision adds none.
    expect(stampsAtFirst).toBe(1);
    expect(ear.played.denied - decisions).toBeGreaterThanOrEqual(0);
    expect(ear.played.denied - decisions).toBeLessThanOrEqual(1);
    expect(ear.played).toMatchObject({ ahem: 0, ring: 0 });
  });

  it('two forms consulting on one frame stamp once', () => {
    const w = new World({ act: DECLINE_QUIET, seed: 69, startingItems: [] });
    const ear = new Ear(w);
    place(w, FORM, 200, 0);
    place(w, FORM, -200, 0);
    run(w, ear, DT);
    expect(consulting(w.enemies, 'insurance-form')).toBe(2);
    expect(ear.played.denied).toBe(1);
  });

  it('the voiced shots keep their voices, and one with none borrows the ah-hem', () => {
    for (const id of ['group-chat', 'substitute-teacher', 'registrar', 'phone-call', 'insurance-form']) expect(borrowsAhem(id), id).toBe(false);
    expect(borrowsAhem('edges-aimed')).toBe(true);
  });
});

describe("the tick: Time's quarter turns, then its last seconds, and nothing at zero", () => {
  it('ticks each quarter turn until the countdown, then each whole second, and not as the clock runs out', () => {
    const { w, ear } = atBoss(DECLINE_QUIET, 70);
    expect(w.boss!.kind).toBe('time');
    // `secondsLeft` on each frame that ticked, and whether the frame the clock ran out ticked.
    const ticked: number[] = [];
    let atZero: boolean | null = null;
    let heard = ear.played.tick;
    let was = w.boss!.secondsLeft;
    run(w, ear, TIME.seconds + 3, () => {
      const b = w.boss;
      if (!b) return;
      const tick = ear.played.tick > heard;
      if (tick) ticked.push(b.secondsLeft);
      if (b.secondsLeft === 0 && was > 0) atZero = tick;
      heard = ear.played.tick;
      was = b.secondsLeft;
    });
    expect(w.won, 'Time never ran out').toBe(true);
    expect(atZero, 'the run-out ticked, or was never seen').toBe(false);
    const quarter = TIME.sweepSeconds / TIME_FILES_PER_TURN;
    const quarters = Math.floor((TIME.seconds - TIME_COUNTDOWN) / quarter);
    expect(ticked).toHaveLength(quarters + TIME_COUNTDOWN);
    // A quarter turn each, as the file is read.
    ticked.slice(0, quarters).forEach((left, k) => expect(left, `quarter ${k + 1}`).toBeCloseTo(TIME.seconds - (k + 1) * quarter, 1));
    // Then 5, 4, 3, 2, 1 falling to the next whole second: one a second, the
    // quarter inside the countdown heard as its second's tick, never beside it.
    ticked.slice(quarters).forEach((left, i) => {
      expect(Math.floor(left), `countdown ${i}`).toBe(TIME_COUNTDOWN - 1 - i);
      expect(TIME_COUNTDOWN - i - left, `countdown ${i}`).toBeLessThan(0.05);
    });
    expect(w.boss!.filed).toBeGreaterThan(quarters);
  });

  it("the Mortgage's windows paid never tick", () => {
    const { w, ear } = atBoss(FAMILY_QUIET, 71);
    for (let k = 0; k < 3; k++) mortgageWindow(w, ear, true);
    expect(w.boss!.paid).toBe(3);
    expect(ear.played).toMatchObject({ ding: 3, tick: 0 });
  });

  it("the Egg's phases never tick, in Conception or standing where Time stands", () => {
    for (const act of [CONCEPTION, { ...DECLINE_QUIET, boss: { kind: 'egg' } } as ActDef]) {
      const { w, ear } = atBoss(act, 72);
      expect(w.boss!.kind).toBe('egg');
      let phases = 0;
      let was = w.boss!.phase;
      run(w, ear, 12, () => {
        const phase = w.boss?.phase ?? 'idle';
        if (phase !== was) phases++;
        was = phase;
      });
      expect(phases, act.id).toBeGreaterThanOrEqual(6);
      expect(ear.played.tick, act.id).toBe(0);
    }
  });

  it('is two edges read as one, on Time alone', () => {
    const time = (filed: number, secondsLeft: number) => ({ kind: 'time' as const, filed, secondsLeft });
    // A quarter turn, before the countdown; a frame without one.
    expect(timeTicks(time(4, 47.99), { filed: 3, secondsLeft: 48.01 })).toBe(true);
    expect(timeTicks(time(4, 47.5), { filed: 4, secondsLeft: 47.52 })).toBe(false);
    // Time arriving: sixty against the nothing heard before it.
    expect(timeTicks(time(0, 60), { filed: 0, secondsLeft: 0 })).toBe(false);
    // The countdown: each whole second falling, from five left to one.
    expect(timeTicks(time(18, 4.99), { filed: 18, secondsLeft: 5.01 })).toBe(true);
    expect(timeTicks(time(18, 4.5), { filed: 18, secondsLeft: 4.52 })).toBe(false);
    expect(timeTicks(time(19, 0.99), { filed: 19, secondsLeft: 1.01 })).toBe(true);
    // Inside it, a quarter turn alone is not a tick; with its second, one.
    expect(timeTicks(time(19, 3.0), { filed: 18, secondsLeft: 3.02 })).toBe(false);
    expect(timeTicks(time(19, 2.98), { filed: 18, secondsLeft: 3.01 })).toBe(true);
    // The run-out: a fraction to zero is no whole second falling.
    expect(timeTicks(time(19, 0), { filed: 19, secondsLeft: 0.01 })).toBe(false);
    // Any other kind, whatever its counters read.
    expect(timeTicks({ kind: 'mortgage', filed: 1, secondsLeft: 2.5 }, { filed: 0, secondsLeft: 3.5 })).toBe(false);
    expect(timeTicks({ kind: 'egg', filed: 1, secondsLeft: 0 }, { filed: 0, secondsLeft: 0 })).toBe(false);
    expect(timeTicks(null, { filed: 0, secondsLeft: 3.5 })).toBe(false);
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

  const OFFICE_SOUNDS = { ping: 0, carriage: 0, chairs: 0, memo: 0 };
  const FAMILY_SOUNDS = { doorbell: 0, tape: 0, ring: 0, squeak: 0, statement: 0, ding: 0 };
  const DECLINE_SOUNDS = { rattle: 0, rain: 0, creak: 0, denied: 0, tick: 0 };

  it(
    "Family's schedule rings the doorbell, tears the tape and squeaks, and plays none of The Office's or Decline's",
    () => {
      const { played } = whole(FAMILY, 46);
      expect(played.doorbell).toBeGreaterThan(0);
      expect(played.tape).toBeGreaterThan(0);
      expect(played.squeak).toBeGreaterThan(0);
      expect(played.statement).toBeGreaterThan(0);
      expect(played).toMatchObject({ ...OFFICE_SOUNDS, carPass: 0, ...DECLINE_SOUNDS });
    },
    WHOLE_MS,
  );

  it(
    "Decline's schedule rattles, rains, creaks and ticks, and plays none of The Office's or Family's",
    () => {
      const { played } = whole(DECLINE, 60);
      expect(played.rattle).toBeGreaterThan(0);
      expect(played.rain).toBeGreaterThan(0);
      expect(played.creak).toBeGreaterThan(0);
      // Fifteen seconds of Time: a tick a quarter turn.
      expect(played.tick).toBeGreaterThan(0);
      // The forms land beyond their range of a player who never moves
      // (decline-act.test.ts), so DENIED is its own test's, above; whatever
      // they do, nothing here borrows the ah-hem.
      expect(played).toMatchObject({ ...OFFICE_SOUNDS, carPass: 0, ...FAMILY_SOUNDS, ahem: 0 });
    },
    WHOLE_MS,
  );

  it.each(ALL_ACTS.filter((act) => act !== FAMILY && act !== DECLINE).map((act, i) => [act.id, act, 47 + i] as const))(
    "%s's schedule plays no sound of Family's or Decline's",
    (_id, act, seed) => {
      const { played } = whole(act, seed);
      expect(played).toMatchObject({ ...FAMILY_SOUNDS, ...DECLINE_SOUNDS });
    },
    WHOLE_MS,
  );
});
