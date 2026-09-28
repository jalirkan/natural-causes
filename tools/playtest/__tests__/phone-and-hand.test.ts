import { describe, expect, it } from 'vitest';
import { ALL_ACTS, COLLEGE, DECLINE, FAMILY, type ActDef } from '../../../src/data/acts';
import { enemyDef, type EnemyDef } from '../../../src/data/enemies';
import { IFRAMES, World, fromHand, type EnemyState, type Input, type ProjectileState } from '../../../src/sim/world';
import {
  ITEMS,
  HandLog,
  POLICIES,
  ShotLog,
  bossCannotBeHurt,
  bossHazardReach,
  bossStandoff,
  decideOnce,
  isActive,
  runOnce,
  summarise,
} from '../bots';

/**
 * Three instrument fixes, each read against the sim's own rules.
 *
 * AUDIT eight, 86: the shot log never credited a phone call, because the
 * call's pull moves the player up to 180px inside the step that lands it and
 * the log looked for the vanished shot beside where the player ended up.
 *
 * AUDIT nine, 119: at Time the bots stood off at their weapons' reach, inside
 * the hand's disc, and the hand's hits showed only as "Time" deaths. The
 * standoff for a boss that cannot be hurt is beyond the hand, and the hand's
 * contacts are counted (`HandLog`).
 *
 * Presence, not calibration: the assertions are contact geometry and the
 * sim's ordering, never a placeholder's value.
 */

const SIGHTED = POLICIES.find((p) => p.name === 'midpiece+wake')!;
const DT = 1 / 60;
const STILL: Input = { moveX: 0, moveY: 0 };
const PHONE = enemyDef('phone-call');
/** A body that hurts on touch: contact 'damage', and less than the hand's 12. */
const BODY = enemyDef('substitute-teacher');
if (DECLINE.boss.kind !== 'time') throw new Error('Decline does not fight Time');
const TIME = DECLINE.boss;

let uid = 5_000_000;
let serial = 5_500_000;

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
    reload: 99,
    generation: 0,
  };
  w.enemies.push(e);
  return e;
}

/** A hostile shot placed relative to the player, closing along −x; the Egg's unless overridden. */
function shot(w: World, dx: number, over: Partial<ProjectileState> = {}): ProjectileState {
  const p: ProjectileState = {
    x: w.x + dx,
    y: w.y,
    vx: -240,
    vy: 0,
    life: 4,
    damage: 12,
    pierce: 1,
    radius: 10,
    hostile: true,
    source: 'boss',
    serial: serial++,
    ...over,
  };
  w.projectiles.push(p);
  return p;
}

function quiet(act: ActDef): World {
  return new World({ acts: [{ ...act, id: `${act.id}-instrument-fixture`, waves: [] }], seed: 7, startingItems: [] });
}

/** Time standing, nothing else on the field. */
function atTime(): { w: World; b: NonNullable<World['boss']> } {
  const w = quiet(DECLINE);
  w.actTime = DECLINE.durationSeconds;
  w.step(DT, STILL);
  expect(w.boss?.kind).toBe('time');
  return { w, b: w.boss! };
}

/** The bot `along` px out from the pivot on bearing `angle`, clockwise from twelve. */
function put(w: World, b: { x: number; y: number }, angle: number, along: number): void {
  w.x = b.x + Math.sin(angle) * along;
  w.y = b.y - Math.cos(angle) * along;
}

/** One step as `runOnce` takes it: both logs look, the world steps, both settle. */
function stepLogged(w: World, shots: ShotLog, hand: HandLog, input: Input = STILL): boolean {
  shots.look(w);
  hand.look(w);
  w.step(DT, input);
  return hand.settle(w, DT, shots.settle(w, DT));
}

describe('the shot log credits a phone call (AUDIT eight, 86)', () => {
  it('a call that lands: health falls, the player is pulled out of reach of it, and the log credits phone-call', () => {
    const w = quiet(FAMILY);
    const phone = place(w, PHONE, 400, 0);
    const call = shot(w, 20, {
      vx: -PHONE.ranged!.projectileSpeed,
      damage: PHONE.ranged!.damage,
      source: PHONE.id,
      owner: PHONE,
      shooter: phone,
      fromX: phone.x,
      fromY: phone.y,
    });
    const log = new ShotLog();
    const x0 = w.x;
    const hp = w.hp;
    log.look(w);
    w.step(DT, STILL);
    const credited = log.settle(w, DT);

    expect(w.hp, 'the call hurt').toBeLessThan(hp);
    expect(w.projectiles.includes(call), 'the call was consumed').toBe(false);
    // The reproduction: the player now stands farther from where the call
    // vanished than contact reach, so reading the new position alone missed it.
    const reach = w.playerRadius + call.radius;
    expect(Math.hypot(call.x - w.x, call.y - w.y)).toBeGreaterThan(reach);
    expect(w.x - x0, 'pulled toward the phone').toBeGreaterThan(100);

    expect(credited).toBe(true);
    expect(log.hit).toBe(1);
    expect(log.by).toEqual({ 'phone-call': { seen: 1, hit: 1 } });
  });

  it('a call consumed through i-frames is seen, not a hit', () => {
    const w = quiet(FAMILY);
    const phone = place(w, PHONE, 400, 0);
    shot(w, 20, { damage: PHONE.ranged!.damage, source: PHONE.id, owner: PHONE, shooter: phone });
    w.invulnerable = 1;
    const log = new ShotLog();
    log.look(w);
    w.step(DT, STILL);
    expect(log.settle(w, DT)).toBe(false);
    expect(log.by).toEqual({ 'phone-call': { seen: 1, hit: 0 } });
  });

  it('a shot that ran out beside the player is never credited for a fall the step a body hurt them', () => {
    const w = quiet(FAMILY);
    // Spent inside this step (`moveProjectiles` drops it before contact), on the player.
    const spent = shot(w, 0, { vx: 0, life: DT / 2, damage: 4 });
    place(w, BODY, 10, 0);
    const log = new ShotLog();
    const hp = w.hp;
    log.look(w);
    w.step(DT, STILL);
    expect(w.hp, 'the body hurt').toBeLessThan(hp);
    expect(hp - w.hp).toBeGreaterThanOrEqual(spent.damage);
    expect(w.projectiles.includes(spent)).toBe(false);
    expect(log.settle(w, DT)).toBe(false);
    expect(log.hit).toBe(0);
  });
});

describe('the standoff from a boss that cannot be hurt (AUDIT nine, 119)', () => {
  it('only Time cannot be hurt, and only its hazard has a reach the bot reads', () => {
    for (const act of ALL_ACTS) {
      expect(bossCannotBeHurt(act.boss), act.id).toBe(act.boss.kind === 'time');
      expect(bossHazardReach(act.boss, 16) === null, act.id).toBe(act.boss.kind !== 'time');
    }
  });

  it('at Time the chosen standoff is beyond the hand; at every other boss, the Loan among them, it is unchanged', () => {
    // No damaging item held: the fought standoff is 300 × 0.7, as `shortestReach` has it.
    const fought = Math.max(175, Math.min(300 * 0.7, 300));
    for (const act of ALL_ACTS) {
      const w = quiet(act);
      if (act.boss.kind === 'time') {
        const contact = Math.hypot(TIME.sweepLength, TIME.sweepWidth / 2) + w.playerRadius;
        expect(bossStandoff(w)).toBeGreaterThan(TIME.sweepLength);
        expect(bossStandoff(w)).toBeGreaterThan(contact);
      } else {
        expect(bossStandoff(w), act.id).toBe(fought);
      }
    }
    // With the starting Lash held, the Loan's is the Lash's reach × 0.7, as it was.
    const loan = new World({ acts: [{ ...COLLEGE, waves: [] }], seed: 7 });
    expect(COLLEGE.boss.kind).toBe('loan');
    const lash = ITEMS['lash']!;
    if (!isActive(lash)) throw new Error('Lash is not a weapon');
    expect(bossStandoff(loan)).toBe(Math.max(175, Math.min(lash.range * 0.7, 300)));
  });

  it('a standoff point is out of the hand’s reach at every angle it could turn to', () => {
    const { w, b } = atTime();
    const d = bossStandoff(w);
    for (let k = 0; k < 64; k++) {
      put(w, b, 0, d);
      const angle = (Math.PI * 2 * k) / 64;
      expect(fromHand(b.x, b.y, angle, TIME.sweepLength, TIME.sweepWidth, w.x, w.y)).toBeGreaterThan(w.playerRadius);
    }
  });

  it('inside the disc the bot walks out, against the hand’s turn; at the Loan the same spot walks in', () => {
    const { w, b } = atTime();
    // Well clear of the blade (on the far side of the pivot), 400px out: inside the disc.
    put(w, b, b.hand + Math.PI, 400);
    const move = decideOnce(SIGHTED, w);
    const out = { x: (w.x - b.x) / 400, y: (w.y - b.y) / 400 };
    expect(move.moveX * out.x + move.moveY * out.y, 'outward').toBeGreaterThan(0);
    // The clockwise tangent at the bot's bearing is the hand's motion there.
    const bearing = Math.atan2(w.x - b.x, -(w.y - b.y));
    expect(move.moveX * Math.cos(bearing) + move.moveY * Math.sin(bearing), 'against the hand').toBeLessThan(0);

    const loan = quiet(COLLEGE);
    loan.actTime = COLLEGE.durationSeconds;
    loan.step(DT, STILL);
    const lb = loan.boss!;
    expect(lb.kind).toBe('loan');
    loan.x = lb.x;
    loan.y = lb.y + 400;
    const inward = decideOnce(SIGHTED, loan);
    expect(inward.moveY, 'inward, toward the Loan').toBeLessThan(0);
  });
});

describe('the hand, counted (AUDIT nine, 119)', () => {
  it('a still player the hand sweeps: one contact for the pass, never a shot', () => {
    const { w, b } = atTime();
    // Ahead of the blade, 250px out: it arrives in about half a second.
    put(w, b, b.hand + 0.3, 250);
    const shots = new ShotLog();
    const hand = new HandLog();
    let falls = 0;
    for (let i = 0; i < 120; i++) {
      const hp = w.hp;
      stepLogged(w, shots, hand);
      if (w.hp < hp) falls++;
    }
    expect(falls, 'the sim hit once').toBe(1);
    expect(hand.contacts).toBe(1);
    expect(hand.deaths).toBe(0);
    expect(shots.hit).toBe(0);
  });

  it('on the pivot, a hit every i-frame window: each one counted once, never twice in a window', () => {
    const { w, b } = atTime();
    w.x = b.x;
    w.y = b.y;
    const shots = new ShotLog();
    const hand = new HandLog();
    const counted: number[] = [];
    let falls = 0;
    // 2.5s: short of the first knee filed at a quarter turn.
    for (let i = 0; i < 150; i++) {
      const hp = w.hp;
      if (stepLogged(w, shots, hand)) counted.push(w.time);
      if (w.hp < hp) falls++;
    }
    expect(falls).toBeGreaterThanOrEqual(3);
    expect(hand.contacts).toBe(falls);
    for (let i = 1; i < counted.length; i++) {
      expect(counted[i]! - counted[i - 1]!).toBeGreaterThanOrEqual(IFRAMES - 1e-9);
    }
  });

  it('a death on the hand is the hand’s, and the certificate says Time', () => {
    const { w, b } = atTime();
    w.x = b.x;
    w.y = b.y;
    w.hp = 5;
    const hand = new HandLog();
    stepLogged(w, new ShotLog(), hand);
    expect(w.dead).toBe(true);
    expect(w.certificate?.cause).toBe(DECLINE.bossName);
    expect(hand.contacts).toBe(1);
    expect(hand.deaths).toBe(1);
  });

  it('a shot or a body that hurts first takes the i-frames, and the hand is not counted', () => {
    // A shot landing on a player standing on the hand: the shot's.
    {
      const { w, b } = atTime();
      w.x = b.x;
      w.y = b.y;
      shot(w, 20);
      const shots = new ShotLog();
      const hand = new HandLog();
      const hp = w.hp;
      stepLogged(w, shots, hand);
      expect(hp - w.hp).toBeCloseTo(12, 9);
      expect(shots.hit).toBe(1);
      expect(hand.contacts).toBe(0);
    }
    // A body touching a player standing on the hand: the body's.
    {
      const { w, b } = atTime();
      w.x = b.x;
      w.y = b.y;
      place(w, BODY, 10, 0);
      const hand = new HandLog();
      const hp = w.hp;
      stepLogged(w, new ShotLog(), hand);
      expect(hp - w.hp).toBeCloseTo(BODY.contactDamage, 9);
      expect(hand.contacts).toBe(0);
    }
  });

  it('a run at Time reports its fight, its contacts and its deaths', () => {
    const short: ActDef = { ...DECLINE, id: 'decline-instrument-short', durationSeconds: 2, waves: [] };
    const r = runOnce(SIGHTED, 1000, undefined, undefined, [short]);
    expect(r.timeFightSeconds).toBeGreaterThan(TIME.seconds - 1);
    expect(typeof r.handContacts).toBe('number');
    expect(r.handDeaths).toBe(r.cause === DECLINE.bossName ? 1 : 0);
    const [row] = summarise([r]);
    expect(row!.timeFights).toBe(1);
    expect(row!.handContacts).toBe(r.handContacts);
    expect(row!.handDeaths).toBe(r.handDeaths);
  }, 60_000);
});
