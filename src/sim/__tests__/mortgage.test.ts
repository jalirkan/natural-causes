import { describe, expect, it } from 'vitest';
import { FAMILY, type ActDef, type MortgageBoss } from '../../data/acts';
import { ENEMIES } from '../../data/enemies';
import {
  ANTIBODY_LEAD,
  ARENA_HEIGHT,
  ARENA_WIDTH,
  BOSS_HP,
  EGG_ATTACK_SECONDS,
  EGG_IDLE_SECONDS,
  EGG_SHOT,
  EGG_TELEGRAPH_SECONDS,
  MAX_ACTIVE_ENEMIES,
  MORTGAGE_DOOR_BELOW,
  World,
  type AreaState,
  type EnemyState,
  type ProjectileState,
} from '../world';

/**
 * The Mortgage (FAMILY-ROSTER §4): paid on a schedule, not in a hurry. Its
 * health is BOSS_HP owed in `instalments` equal parts; damage in a window
 * counts toward that window's instalment only and caps at one; a missed
 * window moves nothing. Every window's end builds a room at the player's
 * lead; a missed one also sends a bill from the door. Its statement is one
 * aimed shot on the Egg's machine. Paid off, the act ends on EQUITY.
 *
 * Family exists, so the act here is Family with nothing scheduled: the boss
 * is the real declaration and nothing but a test's own shots and the boss's
 * windows puts anything on the field or rolls the dice. Every number is the
 * roster's placeholder, read off `FAMILY.boss` wherever a test depends on it,
 * so moving one moves the expectation with it. Nothing here claims a number
 * is right.
 */

/** A power of two, so a five-second window is exactly 320 steps and closes on a known one. */
const DT = 1 / 64;
const STILL = { moveX: 0, moveY: 0 };

if (FAMILY.boss.kind !== 'mortgage') throw new Error('Family does not fight the Mortgage');
const MORTGAGE: MortgageBoss = FAMILY.boss;
const QUIET: ActDef = { ...FAMILY, waves: [] };
const INSTALMENT = BOSS_HP / MORTGAGE.instalments;
const STEPS_PER_WINDOW = MORTGAGE.instalmentSeconds / DT;
const ROOM = ENEMIES[MORTGAGE.roomId]!;
const FEE = ENEMIES[MORTGAGE.feeId]!;

/**
 * A world at the Mortgage, the field emptied and the player unarmed, standing
 * where they started (the middle of the arena, far from every wall), facing
 * right. The first window opens as it stands.
 */
function atMortgage(seed = 7, act: ActDef = QUIET): World {
  const w = new World({ act, seed, startingItems: [] });
  w.time = act.durationSeconds;
  w.step(DT, STILL);
  expect(w.boss, 'the Mortgage did not appear at the act clock').not.toBeNull();
  w.enemies.length = 0;
  w.projectiles.length = 0;
  w.gems.length = 0;
  return w;
}

/**
 * Steps with the player held alive (the statement and the fees are not what
 * these tests are about), choosing the first offer whenever one is waiting.
 * Stops at the end of the life.
 */
function run(w: World, steps: number, each?: () => void): void {
  for (let i = 0; i < steps; i++) {
    if (w.offers) {
      w.choose(w.offers[0]!);
      continue;
    }
    if (w.won || w.dead) return;
    w.hp = w.maxHp;
    w.step(DT, STILL);
    each?.();
  }
}

let serial = 700_000;
/** A friendly shot parked on the boss. */
function shoot(w: World, damage: number): void {
  const b = w.boss!;
  w.projectiles.push({
    x: b.x, y: b.y, vx: 0, vy: 0,
    life: 1, damage, pierce: 1, radius: 10,
    hostile: false, serial: serial++,
  });
}

/** An area on the boss: a burst, a tick (Snooze's kind of field) or a strike landing next step. */
function area(w: World, damage: number, kind: 'burst' | 'tick' | 'strike'): void {
  const b = w.boss!;
  const a: AreaState = {
    x: b.x, y: b.y, age: 0, seconds: 0.1, radius: 60,
    damage, pull: false, tick: kind === 'tick', serial: serial++,
  };
  if (kind === 'strike') a.delay = DT / 2;
  w.areas.push(a);
}

/** The world's next roll of its own dice. Private because nothing outside the sim should roll. */
function nextRoll(w: World): number {
  return (w as unknown as { rng: () => number }).rng();
}

const rooms = (w: World): EnemyState[] => w.enemies.filter((e) => e.def.id === MORTGAGE.roomId);
/** Rooms landed, merged or not: a merge sums hp, and a room is 1 hp. */
const roomsLanded = (w: World): number => rooms(w).reduce((n, e) => n + e.hp / ROOM.hp, 0);
/** Whole bills: the door's late fees, not the fees a bill accrues itself. */
const lateFees = (w: World): EnemyState[] => w.enemies.filter((e) => e.def.id === MORTGAGE.feeId && e.fee !== true);
const bossShots = (w: World): ProjectileState[] => w.projectiles.filter((p) => p.hostile && p.source === 'boss');

describe('it stands as the Mortgage, on the roster’s numbers', () => {
  it('opens owing BOSS_HP in `instalments`, nothing paid, the first window full', () => {
    const b = atMortgage().boss!;
    expect(MORTGAGE).toEqual({ kind: 'mortgage', instalments: 12, instalmentSeconds: 5, roomId: 'room', feeId: 'bill' });
    expect(b.kind).toBe('mortgage');
    expect(b.hp).toBe(BOSS_HP);
    expect(b.maxHp).toBe(BOSS_HP);
    expect(b.paid).toBe(0);
    expect(b.accepted).toBe(0);
    expect(b.windowTimer).toBe(MORTGAGE.instalmentSeconds);
    expect(b.shielded).toBe(false);
  });

  it('the other kinds carry the three fields at zero', () => {
    const w = new World({ act: { ...QUIET, boss: { kind: 'egg' } }, seed: 1, startingItems: [] });
    w.time = QUIET.durationSeconds;
    w.step(DT, STILL);
    expect(w.boss).toMatchObject({ kind: 'egg', paid: 0, windowTimer: 0, accepted: 0 });
  });
});

describe('instalments: one a window, no prepayment, the overflow lost', () => {
  it('one hit larger than the whole balance removes exactly one instalment', () => {
    const w = atMortgage();
    const b = w.boss!;
    shoot(w, BOSS_HP * 10);
    run(w, 1);
    expect(b.phase).not.toBe('absorbing');
    expect(b.accepted).toBe(INSTALMENT);
    expect(b.hp).toBeCloseTo(BOSS_HP - INSTALMENT, 9);
    expect(w.projectiles.filter((p) => !p.hostile)).toHaveLength(0);

    run(w, STEPS_PER_WINDOW - 1);
    expect(b.paid).toBe(1);
    expect(b.accepted).toBe(0);
    expect(b.hp).toBe((BOSS_HP * (MORTGAGE.instalments - 1)) / MORTGAGE.instalments);
    expect(b.hp / b.maxHp).toBeCloseTo(11 / 12, 12);
  });

  it('two hits in one window remove one instalment', () => {
    const w = atMortgage();
    const b = w.boss!;
    shoot(w, INSTALMENT * 0.75);
    run(w, 1);
    expect(b.accepted).toBeCloseTo(INSTALMENT * 0.75, 9);
    expect(b.hp).toBeCloseTo(BOSS_HP - INSTALMENT * 0.75, 9);
    shoot(w, INSTALMENT * 0.75);
    run(w, 1);
    expect(b.accepted).toBe(INSTALMENT);
    expect(b.hp).toBeCloseTo(BOSS_HP - INSTALMENT, 9);
    // And a third, later in the same window, is lost too.
    run(w, 100);
    shoot(w, INSTALMENT);
    run(w, 1);
    expect(b.hp).toBeCloseTo(BOSS_HP - INSTALMENT, 9);
    run(w, STEPS_PER_WINDOW - 102);
    expect(b.paid).toBe(1);
  });

  it('every damage path goes through the one gate: shot, burst, tick and strike each take one instalment', () => {
    // updateBoss's two passes (shots; bursts and ticks) and damageBoss (a
    // landing strike here; sweeps, auras and orbiters call the same line).
    for (const path of ['shot', 'burst', 'tick', 'strike'] as const) {
      const w = atMortgage();
      const b = w.boss!;
      if (path === 'shot') shoot(w, BOSS_HP * 10);
      else area(w, BOSS_HP * 10, path);
      run(w, 3);
      expect(b.accepted, path).toBe(INSTALMENT);
      expect(b.hp, path).toBeCloseTo(BOSS_HP - INSTALMENT, 9);
      run(w, STEPS_PER_WINDOW - 3);
      expect(b.paid, path).toBe(1);
    }
  });

  it('paths together in one window still take one instalment between them', () => {
    const w = atMortgage();
    const b = w.boss!;
    shoot(w, INSTALMENT / 3);
    area(w, INSTALMENT / 3, 'burst');
    area(w, INSTALMENT, 'strike');
    run(w, 3);
    expect(b.accepted).toBe(INSTALMENT);
    expect(b.hp).toBeCloseTo(BOSS_HP - INSTALMENT, 9);
  });

  it('a window with no damage moves nothing and sends one bill from the door, below the boss', () => {
    const w = atMortgage();
    const b = w.boss!;
    run(w, STEPS_PER_WINDOW - 1);
    expect(lateFees(w)).toHaveLength(0);
    expect(roomsLanded(w)).toBe(0);
    run(w, 1);
    expect(b.windowTimer).toBe(MORTGAGE.instalmentSeconds);
    expect(b.hp).toBe(BOSS_HP);
    expect(b.paid).toBe(0);
    const fees = lateFees(w);
    expect(fees).toHaveLength(1);
    const fee = fees[0]!;
    expect(fee.def).toBe(FEE);
    expect(fee.fee).toBeUndefined();
    expect(fee.x).toBe(b.x);
    expect(fee.y).toBe(b.y + MORTGAGE_DOOR_BELOW);
    expect(fee.y).toBeGreaterThan(b.y);
    expect(fee.y).toBeLessThanOrEqual(ARENA_HEIGHT - FEE.radius);
    expect(roomsLanded(w)).toBe(1);
  });

  it('a window short of its instalment is missed: what it accepted is refunded, and a bill comes', () => {
    // Most of one, not half: `paid` is read off the health by rounding, so a
    // missing refund would pass under half an instalment and pay over it.
    for (const share of [0.1, 0.5, 0.9, 0.999]) {
      const w = atMortgage();
      const b = w.boss!;
      shoot(w, INSTALMENT * share);
      run(w, 1);
      expect(b.hp, `${share}`).toBeCloseTo(BOSS_HP - INSTALMENT * share, 9);
      run(w, STEPS_PER_WINDOW - 1);
      expect(b.hp, `${share}`).toBe(BOSS_HP);
      expect(b.paid, `${share}`).toBe(0);
      expect(b.accepted, `${share}`).toBe(0);
      expect(lateFees(w), `${share}`).toHaveLength(1);
    }
  });

  it('a missed window after paid ones refunds to the paid balance, not past it', () => {
    const w = atMortgage();
    const b = w.boss!;
    shoot(w, BOSS_HP);
    run(w, STEPS_PER_WINDOW);
    shoot(w, BOSS_HP);
    run(w, STEPS_PER_WINDOW);
    expect(b.paid).toBe(2);
    shoot(w, INSTALMENT * 0.9);
    run(w, STEPS_PER_WINDOW);
    expect(b.paid).toBe(2);
    expect(b.hp).toBe((BOSS_HP * (MORTGAGE.instalments - 2)) / MORTGAGE.instalments);
    expect(lateFees(w)).toHaveLength(1);
  });

  it('a paid window sends no bill', () => {
    const w = atMortgage();
    shoot(w, BOSS_HP);
    run(w, STEPS_PER_WINDOW);
    expect(w.boss!.paid).toBe(1);
    expect(lateFees(w)).toHaveLength(0);
    expect(roomsLanded(w)).toBe(1);
  });

  it('the window closes on the same clock at any frame rate, the overshoot carried', () => {
    for (const dt of [1 / 60, 1 / 144, 1 / 7]) {
      const w = atMortgage();
      const b = w.boss!;
      const closedAt: number[] = [];
      let last = b.windowTimer;
      for (let i = 0; i < Math.ceil(40 / dt) && closedAt.length < 6; i++) {
        w.hp = w.maxHp;
        w.step(dt, STILL);
        if (b.windowTimer > last) closedAt.push(w.time);
        last = b.windowTimer;
      }
      expect(closedAt.length, `${dt}`).toBe(6);
      expect(Math.abs(closedAt[5]! - closedAt[0]! - 5 * MORTGAGE.instalmentSeconds), `${dt}`).toBeLessThanOrEqual(dt);
    }
  });
});

describe('the house grows: a room at the lead at every window’s end', () => {
  it('every window’s end lands one room at the lead, and never on the player', () => {
    const w = atMortgage();
    const b = w.boss!;
    // A different heading each window, so eleven rooms land apart and unmerged.
    for (let k = 0; k < MORTGAGE.instalments - 1; k++) {
      const angle = (k * 2 * Math.PI) / (MORTGAGE.instalments - 1);
      w.facingX = Math.cos(angle);
      w.facingY = Math.sin(angle);
      if (k % 2 === 0) shoot(w, BOSS_HP); // paid and missed alike
      const before = roomsLanded(w);
      run(w, STEPS_PER_WINDOW);
      expect(b.windowTimer, `window ${k}`).toBe(MORTGAGE.instalmentSeconds);
      expect(roomsLanded(w), `window ${k}`).toBe(before + 1);
      const lead = { x: w.x + w.facingX * ANTIBODY_LEAD, y: w.y + w.facingY * ANTIBODY_LEAD };
      const landed = rooms(w).find((e) => Math.hypot(e.x - lead.x, e.y - lead.y) < 1e-6);
      expect(landed, `window ${k}: no room at the lead`).toBeDefined();
      for (const r of rooms(w)) {
        expect(Math.hypot(r.x - w.x, r.y - w.y), `window ${k}`).toBeGreaterThanOrEqual(r.radius + w.playerRadius);
      }
    }
    expect(rooms(w)).toHaveLength(MORTGAGE.instalments - 1);
    for (const r of rooms(w)) expect(r.def).toBe(ROOM);
  });

  it('the same lead twice merges into one bigger room, as §3.6’s merge says', () => {
    const w = atMortgage();
    run(w, STEPS_PER_WINDOW * 2);
    const [only, ...rest] = rooms(w);
    expect(rest).toHaveLength(0);
    expect(only!.hp).toBe(2 * ROOM.hp);
    expect(only!.radius).toBeCloseTo(Math.hypot(ROOM.radius, ROOM.radius), 9);
  });

  it('at a wall the player faces, the room lands at the lead behind them, not on them', () => {
    const w = atMortgage();
    w.x = 20;
    w.facingX = -1;
    w.facingY = 0;
    run(w, STEPS_PER_WINDOW);
    const [room] = rooms(w);
    expect(room).toBeDefined();
    expect(room!.x).toBeCloseTo(20 + ANTIBODY_LEAD, 9);
    expect(room!.y).toBe(w.y);
    expect(Math.hypot(room!.x - w.x, room!.y - w.y)).toBeGreaterThanOrEqual(room!.radius + w.playerRadius);
    // The heading is put back.
    expect(w.facingX).toBe(-1);
    expect(w.facingY).toBe(0);
  });

  it('builds nothing past MAX_ACTIVE_ENEMIES', () => {
    const w = atMortgage();
    const b = w.boss!;
    // Filler far from everything: static, harmless, never culled.
    const filler = { ...ROOM, merge: false, id: 'filler' };
    for (let i = 0; i < MAX_ACTIVE_ENEMIES; i++) {
      w.enemies.push({
        uid: 1e6 + i, hitBySerial: 0, hitByAreaSerial: 0, def: filler,
        x: ARENA_WIDTH - 50, y: 50, vx: 0, vy: 0, hp: 1, age: 0, hitFlash: 0,
        radius: 1, displaySize: 1, xp: 0, consult: 0, reload: 0, generation: 0,
      });
    }
    b.windowTimer = DT / 2;
    run(w, 1);
    expect(b.windowTimer).toBeGreaterThan(DT);
    expect(w.enemies).toHaveLength(MAX_ACTIVE_ENEMIES);
    expect(roomsLanded(w)).toBe(0);
    expect(lateFees(w)).toHaveLength(0);
  });
});

describe('the schedule is the fight', () => {
  it(`lasts at least instalments × instalmentSeconds at unbounded DPS, one instalment a window`, () => {
    const w = atMortgage();
    const b = w.boss!;
    const x = b.x;
    const y = b.y;
    const from = w.time;
    let steps = 0;
    let paid = 0;
    let lowest = b.hp;
    while (b.phase !== 'absorbing' && steps < STEPS_PER_WINDOW * (MORTGAGE.instalments + 2)) {
      shoot(w, 1e9);
      area(w, 1e9, 'burst');
      run(w, 1);
      steps++;
      // Never more than one instalment below the window's opening balance.
      const opening = (BOSS_HP * (MORTGAGE.instalments - b.paid)) / MORTGAGE.instalments;
      if (w.boss!.phase !== 'absorbing') expect(b.hp).toBeGreaterThanOrEqual(opening - INSTALMENT - 1e-9);
      if (b.paid !== paid) {
        expect(b.paid).toBe(paid + 1);
        paid = b.paid;
      }
      lowest = Math.min(lowest, b.hp);
      expect(b.x).toBe(x);
      expect(b.y).toBe(y);
      expect(b.shielded).toBe(false);
    }
    expect(b.phase).toBe('absorbing');
    expect(b.paid).toBe(MORTGAGE.instalments);
    expect(steps).toBe(STEPS_PER_WINDOW * MORTGAGE.instalments);
    expect(w.time - from).toBeGreaterThanOrEqual(MORTGAGE.instalments * MORTGAGE.instalmentSeconds);
    expect(lowest).toBe(0);
    // Paid every window: no bill ever came, and a room landed after each but the last.
    expect(lateFees(w)).toHaveLength(0);
    expect(roomsLanded(w)).toBe(MORTGAGE.instalments - 1);
  });

  it('twelve paid windows end the act on EQUITY, and a life of one act is won at fifty-five', () => {
    const w = atMortgage();
    const b = w.boss!;
    for (let k = 0; k < MORTGAGE.instalments; k++) {
      expect(b.phase, `window ${k}`).not.toBe('absorbing');
      shoot(w, BOSS_HP);
      run(w, STEPS_PER_WINDOW);
    }
    expect(b.phase).toBe('absorbing');
    expect(b.hp).toBe(0);
    expect(b.paid).toBe(MORTGAGE.instalments);
    // The renderer shows the word when it sees `absorbing` (ActScene).
    expect(w.act.endWord).toBe('EQUITY');
    run(w, 5 / DT);
    expect(w.won).toBe(true);
    expect(w.certificate).toMatchObject({ outcome: 'won', actId: 'family', age: FAMILY.age.to, causeId: 'natural-causes' });
  });

  it('eleven paid and one missed is not paid off: the twelfth comes a window later', () => {
    const w = atMortgage();
    const b = w.boss!;
    for (let k = 0; k < MORTGAGE.instalments + 1; k++) {
      if (k !== 4) shoot(w, BOSS_HP);
      run(w, STEPS_PER_WINDOW);
      if (k < MORTGAGE.instalments) expect(b.phase, `window ${k}`).not.toBe('absorbing');
    }
    expect(b.phase).toBe('absorbing');
    expect(lateFees(w)).toHaveLength(1);
  });
});

describe('writes to the health from outside the sim (the dev panel) stay consistent', () => {
  it('hp = 0 still ends it, at the window’s end', () => {
    const w = atMortgage();
    const b = w.boss!;
    b.hp = 0;
    run(w, STEPS_PER_WINDOW - 1);
    expect(b.phase).not.toBe('absorbing');
    run(w, 1);
    expect(b.phase).toBe('absorbing');
    expect(b.paid).toBe(MORTGAGE.instalments);
    run(w, 5 / DT);
    expect(w.won).toBe(true);
  });

  it('the panel’s −50% is six instalments paid, and a second one pays it off', () => {
    const w = atMortgage();
    const b = w.boss!;
    const half = (): void => {
      b.hp = Math.max(1, b.hp - b.maxHp / 2);
    };
    half();
    run(w, STEPS_PER_WINDOW);
    expect(b.paid).toBe(MORTGAGE.instalments / 2);
    expect(b.hp).toBe(BOSS_HP / 2);
    // A paid window on top: seven.
    shoot(w, BOSS_HP);
    run(w, STEPS_PER_WINDOW);
    expect(b.paid).toBe(MORTGAGE.instalments / 2 + 1);
    half();
    expect(b.hp).toBe(1);
    run(w, STEPS_PER_WINDOW);
    expect(b.phase).toBe('absorbing');
    expect(b.paid).toBe(MORTGAGE.instalments);
  });

  it('the panel’s kill (hp 0, absorbing) ends it at once, and reads as paid off', () => {
    const w = atMortgage();
    const b = w.boss!;
    b.hp = 0;
    b.phase = 'absorbing';
    b.timer = 1.8;
    run(w, 1);
    expect(b.paid).toBe(MORTGAGE.instalments);
    run(w, 5 / DT);
    expect(w.won).toBe(true);
  });
});

describe('the statement: one aimed shot on the Egg’s machine', () => {
  it('idle, telegraph for the Egg’s seconds, then one shot at the player with the Egg’s damage and no pull', () => {
    const w = atMortgage();
    const b = w.boss!;
    expect(b.phase).toBe('idle');
    let telegraphAt = -1;
    let attackAt = -1;
    let shot: ProjectileState | undefined;
    let most = 0;
    run(w, 4 / DT, () => {
      if (b.phase === 'telegraph' && telegraphAt < 0) telegraphAt = w.time;
      if (b.phase === 'attack' && attackAt < 0) {
        attackAt = w.time;
        shot = bossShots(w)[0];
      }
      most = Math.max(most, bossShots(w).length);
    });
    expect(telegraphAt).toBeGreaterThan(0);
    expect(Math.abs(attackAt - telegraphAt - EGG_TELEGRAPH_SECONDS)).toBeLessThanOrEqual(DT);
    expect(most).toBe(1);
    expect(shot).toBeDefined();
    const p = shot!;
    expect(p.damage).toBe(EGG_SHOT.damage);
    expect(p.radius).toBe(EGG_SHOT.radius);
    expect(Math.hypot(p.vx, p.vy)).toBeCloseTo(EGG_SHOT.speed, 9);
    expect(p.owner).toBeUndefined();
    expect(p.shooter).toBeUndefined();
    expect(p.fromX).toBeUndefined();
    // Aimed at where the player is: the velocity and the line to them agree.
    const dx = w.x - p.x;
    const dy = w.y - p.y;
    expect((p.vx * dy - p.vy * dx) / (Math.hypot(dx, dy) * EGG_SHOT.speed)).toBeCloseTo(0, 6);
    expect(p.vx * dx + p.vy * dy).toBeGreaterThan(0);
  });

  it('recurs on the Egg’s cycle, one shot each time', () => {
    const w = atMortgage();
    const b = w.boss!;
    const firedAt: number[] = [];
    let was = b.phase;
    run(w, 12 / DT, () => {
      if (b.phase === 'attack' && was !== 'attack') {
        firedAt.push(w.time);
        expect(bossShots(w).filter((p) => p.life > EGG_SHOT.life - 2 * DT)).toHaveLength(1);
      }
      was = b.phase;
    });
    expect(firedAt.length).toBeGreaterThanOrEqual(3);
    const cycle = EGG_IDLE_SECONDS + EGG_TELEGRAPH_SECONDS + EGG_ATTACK_SECONDS;
    expect(Math.abs(firedAt[1]! - firedAt[0]! - cycle)).toBeLessThanOrEqual(DT);
  });

  it('a death to it names The Mortgage at fifty-five', () => {
    const w = atMortgage();
    w.hp = 1;
    for (let i = 0; i < 10 / DT && !w.dead; i++) w.step(DT, STILL);
    expect(w.dead).toBe(true);
    expect(w.certificate).toMatchObject({ outcome: 'died', actId: 'family', causeId: 'boss', cause: 'The Mortgage', age: 55 });
  });
});

describe('no dice: nothing of the Mortgage rolls, so every seed replays', () => {
  /**
   * Two worlds on one seed, stepped alike, one where the window closes and
   * one where it has been pushed out of reach; the act is quiet and nobody is
   * armed, so nothing else rolls. The next roll of each must be the same.
   */
  function sameNextRoll(setup: (w: World) => void, windows = 1): void {
    const make = (closes: boolean): World => {
      const w = atMortgage(31);
      setup(w);
      if (!closes) w.boss!.windowTimer = 1e9;
      run(w, STEPS_PER_WINDOW * windows);
      return w;
    };
    const a = make(true);
    const b = make(false);
    expect(roomsLanded(a)).toBeGreaterThan(0);
    expect(roomsLanded(b)).toBe(0);
    expect(nextRoll(a)).toBe(nextRoll(b));
  }

  it('a missed window: a room and a bill', () => {
    sameNextRoll(() => {});
  });

  it('a paid window: a room', () => {
    sameNextRoll((w) => shoot(w, BOSS_HP));
  });

  it('a room turned at a wall', () => {
    sameNextRoll((w) => {
      w.x = 20;
      w.facingX = -1;
      w.facingY = 0;
    });
  });

  it('three windows, merging onto one room, a bill from each', () => {
    sameNextRoll(() => {}, 3);
  });
});
