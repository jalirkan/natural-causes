import { describe, expect, it } from 'vitest';
import { CONCEPTION, FAMILY, OFFICE, type ActDef } from '../../data/acts';
import { enemyDef, type EnemyDef } from '../../data/enemies';
import { ARENA_HEIGHT, MAGNET_RADIUS, World, type EnemyState } from '../world';

/**
 * Family's verbs (FAMILY-ROSTER §3.1, §3.3–§3.5), one describe each: the
 * bill's late fees (`accrue`), the HOA letter's cost to reach
 * (`attach.pickup`), the toddler's coyness (`coy`) and its hold
 * (`engulf.cooldownMultiplier`, `engulf.releases`), and the phone's pull
 * (`ranged.pull`). Then the rule every one of them keeps: no dice. The
 * Mortgage (§4) is not here; family-act.test.ts runs the act to its end.
 *
 * Every number read here is a placeholder under `FAMILY.provisional`; what is
 * under test is the rule, and each assertion is written against the def's own
 * figure rather than a copy of it.
 */

let uid = 600000;
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
const BILL = enemyDef('bill');
const LETTER = enemyDef('hoa-letter');
const TODDLER = enemyDef('toddler');
const PHONE = enemyDef('phone-call');
const PING = enemyDef('ping');
const WHITE_CELL = enemyDef('white-cell');
const REVIEW = enemyDef('performance-review');
const ACCRUE = BILL.accrue!;
const PICKUP = LETTER.attach!.pickup!;
const COY = TODDLER.coy!;
const HOLD = TODDLER.engulf!;
const RANGED = PHONE.ranged!;

/**
 * The act with nothing scheduled: nothing spawns, so nothing draws the dice
 * but what a test puts on the field. Its id is Family's, so the item pool is
 * the one a life at thirty-four would roll.
 */
const QUIET: ActDef = { ...FAMILY, waves: [] };

/** A World with nothing on it and nothing firing. */
function empty(seed: number, act: ActDef = QUIET): World {
  return new World({ act, seed, startingItems: [] });
}

/** Steps with the player kept alive, choosing the first offer when asked. */
function alive(world: World, seconds: number, input = still): void {
  const steps = Math.round(seconds * 60);
  for (let i = 0; i < steps; i++) {
    if (world.offers) {
      world.choose(world.offers[0]!);
      continue;
    }
    if (world.won) return;
    world.hp = world.maxHp;
    world.dead = false;
    world.step(DT, input);
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

/** The world's next roll of its own dice. Private because nothing outside the sim should roll. */
function nextRoll(w: World): number {
  return (w as unknown as { rng: () => number }).rng();
}

const bills = (w: World): EnemyState[] => w.enemies.filter((e) => e.def.id === 'bill');

describe('a bill left alone issues late fees (accrue, §3.1)', () => {
  it('alive `seconds`, it issues one fee: the same def, flagged, touching it across its line to the player', () => {
    expect(ACCRUE).toEqual({ seconds: 8, fees: 2 }); // the placeholder this was written against
    const w = empty(1);
    const bill = place(w, BILL, 300, 0);
    // A step short: nothing.
    bill.age = ACCRUE.seconds - 2 * DT;
    w.step(DT, still);
    expect(bills(w)).toEqual([bill]);

    // The step its age passes `seconds`.
    const x0 = bill.x;
    const y0 = bill.y;
    w.step(DT, still);
    const all = bills(w);
    expect(all).toHaveLength(2);
    const fee = all.find((e) => e !== bill)!;
    expect(fee.def).toBe(BILL);
    expect(fee.fee).toBe(true);
    expect(bill.fee).toBeUndefined();
    expect(bill.accrued).toBe(1);
    expect(fee.hp).toBe(BILL.hp);
    expect(fee.xp).toBe(BILL.xp);
    // Set down touching where the bill stood, across the line to the player:
    // as far from the player as the bill was, so it arrives beside it.
    expect(Math.hypot(fee.x - x0, fee.y - y0)).toBeCloseTo(2 * BILL.radius, 9);
    expect((fee.x - x0) * (w.x - x0) + (fee.y - y0) * (w.y - y0)).toBeCloseTo(0, 6);
    // Not a kill, and nothing dropped.
    expect(w.kills).toBe(0);
    expect(w.gems).toEqual([]);
  });

  it('issues one fee each `seconds`, on alternate sides, and never more than `fees`', () => {
    const w = empty(2);
    const bill = place(w, BILL, 400, 0);
    bill.age = ACCRUE.seconds - DT / 2;
    w.step(DT, still);
    bill.age = 2 * ACCRUE.seconds - DT / 2;
    w.step(DT, still);
    expect(bill.accrued).toBe(ACCRUE.fees);
    const fees = bills(w).filter((e) => e.fee);
    expect(fees).toHaveLength(ACCRUE.fees);
    // One each side of the line from the bill to the player (the player is
    // to its left, so the sides are up and down).
    expect(Math.sign(fees[0]!.y - bill.y)).toBe(-Math.sign(fees[1]!.y - bill.y));

    // Long past it, alive: no third.
    bill.age = 10 * ACCRUE.seconds;
    for (let i = 0; i < 30; i++) w.step(DT, still);
    expect(bills(w)).toHaveLength(1 + ACCRUE.fees);
  });

  it('a frame longer than `seconds` issues what is owed at once, and still no more than `fees`', () => {
    const w = empty(3);
    const bill = place(w, BILL, 400, 0);
    bill.age = 100 * ACCRUE.seconds;
    w.step(DT, still);
    expect(bills(w)).toHaveLength(1 + ACCRUE.fees);
  });

  it('a fee never accrues: a fee on a fee is a different act', () => {
    const w = empty(4);
    const fee = place(w, BILL, 300, 0);
    fee.fee = true;
    fee.age = 10 * ACCRUE.seconds;
    for (let i = 0; i < 30; i++) w.step(DT, still);
    expect(bills(w)).toEqual([fee]);

    // And one the sim issued ages past `seconds` without issuing.
    const w2 = empty(5);
    const bill = place(w2, BILL, 400, 0);
    bill.age = ACCRUE.seconds - DT / 2;
    w2.step(DT, still);
    const issued = bills(w2).find((e) => e.fee)!;
    issued.age = 10 * ACCRUE.seconds;
    for (let i = 0; i < 30; i++) w2.step(DT, still);
    expect(bills(w2)).toHaveLength(2);
    expect(issued.accrued).toBeUndefined();
  });

  it('killed before `seconds`, it issues nothing', () => {
    const w = new World({ act: QUIET, seed: 6, startingItems: ['lash'] });
    const bill = place(w, BILL, 200, 0);
    for (let i = 0; i < ACCRUE.seconds * 60 + 30 && w.enemies.includes(bill); i++) {
      if (w.offers) w.choose(w.offers[0]!);
      else w.step(DT, still);
    }
    expect(w.enemies.includes(bill), 'Lash never killed the bill').toBe(false);
    expect(bill.age).toBeLessThan(ACCRUE.seconds);
    for (let i = 0; i < 60 * ACCRUE.seconds; i++) {
      if (w.offers) w.choose(w.offers[0]!);
      else w.step(DT, still);
    }
    expect(bills(w)).toEqual([]);
  });
});

describe('the HOA letter costs reach, never speed (attach.pickup, §3.3)', () => {
  it('each worn notice multiplies the pickup radius by `pickup`, and nothing else', () => {
    expect(PICKUP).toBe(0.93); // the placeholder this was written against
    const w = empty(11);
    const speed = w.baseSpeed;
    const cooldown = w.cooldownFactor;
    expect(w.magnetRadius).toBe(MAGNET_RADIUS);
    expect(w.pickupFactor).toBe(1);
    for (let n = 1; n <= 3; n++) {
      wear(w, LETTER, 1);
      expect(w.wornBy.get('hoa-letter')).toBe(n);
      expect(w.pickupFactor).toBeCloseTo(PICKUP ** n, 12);
      expect(w.magnetRadius).toBeCloseTo(MAGNET_RADIUS * PICKUP ** n, 9);
    }
    // drag 0: no drag stack, no speed lost; no tax, no cadence.
    expect(w.dragStacks).toBe(0);
    expect(w.baseSpeed).toBe(speed);
    expect(w.taxStacks).toBe(0);
    expect(w.xpTax).toBe(1);
    expect(w.cooldownFactor).toBe(cooldown);
    expect(w.enemies.filter((e) => e.def.id === 'hoa-letter')).toEqual([]);
  });

  it("multiplies Appetite's radius rather than replacing it", () => {
    const w = new World({ act: QUIET, seed: 12, startingItems: ['appetite'] });
    const own = w.magnetRadius;
    expect(own).toBeGreaterThan(MAGNET_RADIUS);
    wear(w, LETTER, 2);
    expect(w.magnetRadius).toBeCloseTo(own * PICKUP ** 2, 9);
  });

  it('the shrunken radius is the one gems come from', () => {
    // A gem just inside the full radius and outside the shrunken one: it
    // comes to a player who wears nothing and lies still for one who wears
    // five notices.
    const gemMoves = (letters: number): boolean => {
      const w = empty(13);
      if (letters > 0) wear(w, LETTER, letters);
      const at = MAGNET_RADIUS - 2;
      expect(MAGNET_RADIUS * PICKUP ** 5).toBeLessThan(at);
      w.gems.push({ x: w.x + at, y: w.y, value: 1 });
      w.step(DT, still);
      return w.gems[0]!.x !== w.x + at;
    };
    expect(gemMoves(0)).toBe(true);
    expect(gemMoves(5)).toBe(false);
  });

  it('persists through the crossing with its cost; a ping worn beside it does not', () => {
    // Two quiet acts, so the crossing is the only thing that happens. The
    // inheritance dealt there may carry its own pickup, so the radius is read
    // against the same life crossing with nothing worn (same seed, same deal:
    // wearing draws no dice).
    const after: ActDef = { ...QUIET, id: 'family-after', name: 'After' };
    const life = (): World => new World({ acts: [QUIET, after], seed: 14, startingItems: [] });
    const control = life();
    cross(control);

    const w = life();
    wear(w, LETTER, 3);
    wear(w, PING, 2);
    expect(w.pingStacks).toBe(2);
    cross(w);
    expect(w.act).toBe(after);
    expect(w.wornBy.get('hoa-letter')).toBe(3);
    expect(w.pickupFactor).toBeCloseTo(PICKUP ** 3, 12);
    expect(w.magnetRadius).toBeCloseTo(control.magnetRadius * PICKUP ** 3, 9);
    // The ping is the day, not a file: off at the door, as in The Office.
    expect(w.wornBy.has('ping')).toBe(false);
    expect(w.pingStacks).toBe(0);
    expect(w.attentionFactor).toBe(1);
    // And worn again after it, it costs again, on top.
    wear(w, LETTER, 1);
    expect(w.pickupFactor).toBeCloseTo(PICKUP ** 4, 12);
  });

  it('an Office world wearing pings keeps its reach', () => {
    const w = empty(15, OFFICE);
    wear(w, PING, 3);
    expect(w.pickupFactor).toBe(1);
    expect(w.magnetRadius).toBe(MAGNET_RADIUS);
  });
});

describe('the toddler wants to be chased (coy, §3.4)', () => {
  /** How far the toddler walks in one step while the player does `input`, 300px to its left. */
  const stride = (input: { moveX: number; moveY: number }, before: (w: World) => void = () => {}): number => {
    const w = empty(21);
    const t = place(w, TODDLER, 300, 0);
    before(w);
    const x0 = t.x;
    const y0 = t.y;
    w.step(DT, input);
    return Math.hypot(t.x - x0, t.y - y0);
  };

  it('`flee` while the player walks away, `approach` while they walk at it, its own speed while they stand', () => {
    expect(COY).toEqual({ flee: 1.6, approach: 0.5 }); // the placeholder this was written against
    // The toddler is to the right: walking left is away, walking right is toward.
    expect(stride({ moveX: -1, moveY: 0 })).toBeCloseTo(TODDLER.speed * COY.flee * DT, 9);
    expect(stride({ moveX: 1, moveY: 0 })).toBeCloseTo(TODDLER.speed * COY.approach * DT, 9);
    expect(stride(still)).toBeCloseTo(TODDLER.speed * DT, 9);
  });

  it('reads what the player did, not where they face: stunned while pushing away is standing still', () => {
    expect(stride({ moveX: -1, moveY: 0 }, (w) => (w.stunTimer = 1))).toBeCloseTo(TODDLER.speed * DT, 9);
    // Pressed into the left wall, pushing further left: still.
    expect(
      stride({ moveX: -1, moveY: 0 }, (w) => {
        const t = w.enemies[0]!;
        w.x = 0;
        t.x = 300;
      }),
    ).toBeCloseTo(TODDLER.speed * DT, 9);
  });

  it('a chaser without `coy` walks at its own speed whatever the player does', () => {
    const plain: EnemyDef = { ...TODDLER };
    delete plain.coy;
    for (const input of [{ moveX: -1, moveY: 0 }, { moveX: 1, moveY: 0 }, still]) {
      const w = empty(22);
      const t = place(w, plain, 300, 0);
      const x0 = t.x;
      w.step(DT, input);
      expect(Math.abs(t.x - x0)).toBeCloseTo(TODDLER.speed * DT, 9);
    }
  });
});

describe('the toddler takes a hand, and lets go (engulf.cooldownMultiplier, engulf.releases, §3.4)', () => {
  it('its hold does no damage and sets no i-frames, multiplies every cooldown while it lasts, and then it is gone — not a kill', () => {
    expect(HOLD).toEqual({ seconds: 3, slow: 0.3, damagePerSecond: 0, cooldownMultiplier: 1.4, releases: true }); // the placeholder
    const w = empty(31);
    const before = w.cooldownFactor;
    const hp = w.hp;
    const t = place(w, TODDLER, 0, 0);
    w.step(DT, still);
    expect(w.engulfTimer).toBe(HOLD.seconds);
    expect(w.engulfCooldownFactor).toBe(HOLD.cooldownMultiplier);
    expect(w.cooldownFactor).toBeCloseTo(before * HOLD.cooldownMultiplier!, 12);

    let steps = 0;
    while (w.engulfTimer > 0 && steps < 60 * (HOLD.seconds + 1)) {
      expect(w.hp, `hurt at step ${steps}`).toBe(hp);
      expect(w.invulnerable, `i-frames at step ${steps}`).toBe(0);
      expect(w.enemies, `let go early at step ${steps}`).toContain(t);
      expect(w.cooldownFactor).toBeCloseTo(before * HOLD.cooldownMultiplier!, 12);
      w.step(DT, still);
      steps++;
    }
    expect(steps).toBeGreaterThanOrEqual(Math.round(HOLD.seconds * 60) - 1);
    expect(steps).toBeLessThanOrEqual(Math.round(HOLD.seconds * 60) + 1);
    // Gone: not a kill, no gem, no XP; the hand is free.
    expect(w.enemies).not.toContain(t);
    expect(w.kills).toBe(0);
    expect(w.gems).toEqual([]);
    expect(w.xp).toBe(0);
    expect(w.hp).toBe(hp);
    expect(w.engulfCooldownFactor).toBe(1);
    expect(w.cooldownFactor).toBe(before);
  });

  it('a weapon fires less often while it is held', () => {
    // The multiplier reaches the weapons, not only the getter: Lash at a post
    // it cannot kill for the hold's three seconds, held and not.
    const shots = (held: boolean): number => {
      const w = new World({ act: QUIET, seed: 32, startingItems: ['lash'] });
      const target = place(w, mute(REVIEW, { hp: 1e9 }), 150, 0);
      place(w, TODDLER, held ? 0 : 2000, 0);
      const seen = new Set<object>();
      for (let i = 0; i < 60 * HOLD.seconds - 5; i++) {
        target.hp = 1e9;
        w.step(DT, still);
        for (const p of w.projectiles) if (p.source === 'lash') seen.add(p);
      }
      if (held) expect(w.engulfTimer).toBeGreaterThan(0);
      return seen.size;
    };
    const free = shots(false);
    expect(free).toBeGreaterThan(2);
    expect(shots(true)).toBeLessThan(free);
  });

  it('the next toddler takes the hand on the step the first lets go', () => {
    const w = empty(33);
    const first = place(w, TODDLER, 0, 0);
    w.step(DT, still);
    const second = place(w, TODDLER, 0, 0);
    alive(w, HOLD.seconds - 0.5);
    expect(w.enemies).toContain(first);
    for (let i = 0; i < 120 && w.enemies.includes(first); i++) w.step(DT, still);
    expect(w.enemies, 'the first never let go').not.toContain(first);
    expect(w.enemies).toContain(second);
    expect(w.engulfTimer).toBeGreaterThan(HOLD.seconds - DT * 1.5);
    alive(w, HOLD.seconds + 0.1);
    expect(w.enemies).not.toContain(second);
    expect(w.kills).toBe(0);
  });

  it("the white cell's hold is as it was: it hurts, and its body stays on the field", () => {
    const w = empty(34, CONCEPTION);
    const cell = place(w, WHITE_CELL, 0, 0);
    const hp = w.hp;
    w.step(DT, still);
    expect(w.engulfCooldownFactor).toBe(1);
    for (let i = 0; i < 60 * WHITE_CELL.engulf!.seconds + 2; i++) w.step(DT, still);
    expect(w.hp).toBeLessThan(hp);
    expect(w.enemies).toContain(cell);
  });
});

describe('the phone moves you (ranged.pull, §3.5)', () => {
  /**
   * A phone `dx` to the right of a still, unarmed player, stepped until its
   * first call is in the air, then `meanwhile`, then until the call lands.
   * Returns the world, the phone, and where the player stood the step before.
   */
  function called(
    dx: number,
    meanwhile: (w: World, phone: EnemyState) => void = () => {},
    at?: { x: number; y: number },
  ): { w: World; phone: EnemyState; x0: number; y0: number; hp0: number } {
    const w = empty(41);
    if (at) {
      w.x = at.x;
      w.y = at.y;
    }
    const phone = place(w, PHONE, dx, 0);
    for (let i = 0; i < 600 && !w.projectiles.some((p) => p.hostile); i++) w.step(DT, still);
    expect(w.projectiles.some((p) => p.hostile), 'the phone never rang').toBe(true);
    meanwhile(w, phone);
    let x0 = w.x;
    let y0 = w.y;
    let hp0 = w.hp;
    for (let i = 0; i < 600 && w.stunTimer === 0; i++) {
      x0 = w.x;
      y0 = w.y;
      hp0 = w.hp;
      w.step(DT, still);
    }
    expect(w.stunTimer, 'the call never landed').toBeGreaterThan(0);
    return { w, phone, x0, y0, hp0 };
  }

  it('a landing call hurts, stops, and ends the player `pull` px nearer the phone', () => {
    expect(RANGED.pull).toBe(180); // the placeholder this was written against
    expect(RANGED.stun).toBe(0.3);
    const { w, phone, x0, y0, hp0 } = called(360);
    expect(w.hp).toBeCloseTo(hp0 - RANGED.damage, 9);
    const before = Math.hypot(phone.x - x0, phone.y - y0);
    const after = Math.hypot(phone.x - w.x, phone.y - w.y);
    expect(before - after).toBeCloseTo(RANGED.pull!, 6);
    // Straight at it, not sideways.
    expect(w.y).toBeCloseTo(y0, 9);
    // The stop's i-frames, as the registrar's.
    expect(w.invulnerable).toBeGreaterThan(RANGED.stun!);
  });

  it('toward where the phone is at the hit, while it is on the field', () => {
    // Moved after it rang (nothing in the act moves a phone; a test can): the
    // pull goes where it is now, not where it rang from.
    const { w, phone, x0, y0 } = called(360, (_w, p) => {
      p.y -= 200;
    });
    const before = Math.hypot(phone.x - x0, phone.y - y0);
    const after = Math.hypot(phone.x - w.x, phone.y - w.y);
    expect(before - after).toBeCloseTo(RANGED.pull!, 6);
    expect(w.y).toBeLessThan(y0);
  });

  it('toward where the call was made from, once the phone has gone', () => {
    let from = { x: 0, y: 0 };
    const { w, x0, y0 } = called(360, (world, p) => {
      from = { x: p.x, y: p.y };
      world.enemies.splice(world.enemies.indexOf(p), 1);
      // Somewhere else entirely, to show the gone phone's place is not read.
      p.x += 1000;
    });
    const before = Math.hypot(from.x - x0, from.y - y0);
    const after = Math.hypot(from.x - w.x, from.y - w.y);
    expect(before - after).toBeCloseTo(RANGED.pull!, 6);
  });

  it('held inside the arena, and never past the phone', () => {
    // A phone off the left wall (the edge ring is outside the arena more often
    // than not): the pull stops at the wall.
    const walled = called(-250, () => {}, { x: 100, y: ARENA_HEIGHT / 2 });
    expect(walled.w.x).toBe(0);
    // A phone nearer than `pull`: the player ends on it, not beyond it.
    const near = called(120);
    expect(near.w.x).toBeCloseTo(near.phone.x, 9);
  });

  it('a call on an i-framed player is spent and moves nobody, as the registrar’s stops nobody', () => {
    const w = empty(42);
    place(w, PHONE, 360, 0);
    for (let i = 0; i < 600 && !w.projectiles.some((p) => p.hostile); i++) w.step(DT, still);
    expect(w.projectiles.some((p) => p.hostile), 'the phone never rang').toBe(true);
    w.invulnerable = 100;
    const x0 = w.x;
    const hp0 = w.hp;
    for (let i = 0; i < 600 && w.projectiles.some((p) => p.hostile); i++) w.step(DT, still);
    expect(w.projectiles.some((p) => p.hostile), 'the call never landed').toBe(false);
    expect(w.x).toBe(x0);
    expect(w.hp).toBe(hp0);
    expect(w.stunTimer).toBe(0);
  });

  it('only a call that pulls carries who made it; every older shot is built as it was', () => {
    const w = empty(43, OFFICE);
    place(w, REVIEW, 300, 0);
    for (let i = 0; i < 600 && !w.projectiles.some((p) => p.hostile); i++) w.step(DT, still);
    const rating = w.projectiles.find((p) => p.hostile)!;
    expect(rating.shooter).toBeUndefined();
    expect(rating.fromX).toBeUndefined();
    expect(rating.fromY).toBeUndefined();
  });
});

/** `def` without one field of its `ranged`, or without `coy`: the same enemy, the verb off. */
function without(def: EnemyDef, field: 'pull' | 'coy'): EnemyDef {
  const out: EnemyDef = { ...def };
  if (field === 'coy') delete out.coy;
  else {
    const ranged = { ...def.ranged! };
    delete ranged.pull;
    out.ranged = ranged;
  }
  return out;
}

/** A static that never fires, to stand as a target: `def` with its `ranged` taken off. */
function mute(def: EnemyDef, over: Partial<EnemyDef> = {}): EnemyDef {
  const out: EnemyDef = { ...def, ...over };
  delete out.ranged;
  return out;
}

describe('no new verb draws the dice, so every earlier act replays as it did', () => {
  /**
   * Two worlds on one seed, stepped alike, one where the verb fires and one
   * where it does not; the act is quiet and nobody is armed, so nothing else
   * rolls. The next roll of each must be the same number.
   */
  function sameNextRoll(run: (fires: boolean) => World): void {
    const a = run(true);
    const b = run(false);
    expect(nextRoll(a)).toBe(nextRoll(b));
  }

  it('accrue', () => {
    sameNextRoll((fires) => {
      const w = empty(51);
      const bill = place(w, BILL, 400, 0);
      if (fires) bill.age = ACCRUE.seconds * ACCRUE.fees;
      w.step(DT, still);
      expect(bills(w)).toHaveLength(fires ? 1 + ACCRUE.fees : 1);
      return w;
    });
  });

  it('attach.pickup', () => {
    sameNextRoll((fires) => {
      const w = empty(52);
      place(w, LETTER, fires ? 0 : 600, 0);
      alive(w, 0.5);
      expect(w.pickupFactor < 1).toBe(fires);
      return w;
    });
  });

  it('coy', () => {
    sameNextRoll((fires) => {
      const w = empty(53);
      const t = place(w, fires ? TODDLER : without(TODDLER, 'coy'), 300, 0);
      const x0 = t.x;
      alive(w, 0.5, { moveX: -1, moveY: 0 });
      const walked = Math.abs(t.x - x0);
      expect(walked > TODDLER.speed * 0.5 * 1.2).toBe(fires);
      return w;
    });
  });

  it('engulf.cooldownMultiplier and engulf.releases', () => {
    sameNextRoll((fires) => {
      const w = empty(54);
      const t = place(w, TODDLER, fires ? 0 : 2000, 0);
      alive(w, HOLD.seconds + 0.2);
      expect(w.enemies.includes(t)).toBe(!fires);
      return w;
    });
  });

  it('ranged.pull', () => {
    sameNextRoll((fires) => {
      const w = empty(55);
      place(w, fires ? PHONE : without(PHONE, 'pull'), 360, 0);
      const x0 = w.x;
      alive(w, 4);
      expect(w.hp).toBe(w.maxHp);
      expect(w.x !== x0).toBe(fires);
      return w;
    });
  });
});
