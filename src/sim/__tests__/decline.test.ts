import { describe, expect, it } from 'vitest';
import { CONCEPTION, DECLINE, type ActDef } from '../../data/acts';
import { enemyDef, type EnemyDef } from '../../data/enemies';
import { buildSheet } from '../../data/build-sheet';
import {
  BOSS_HP,
  DESPAWN_RADIUS,
  MAX_HP_FLOOR,
  PLAYER_BASE_HP,
  World,
  type AreaState,
  type EnemyState,
  type ProjectileState,
} from '../world';

/**
 * Decline's verbs (DECLINE-ROSTER §3.1, §3.4, §3.5, §4), one describe each:
 * the medication's heal on a kill (`killHeal`), the form's decision
 * (`ranged.maxHpLoss`) and its floor (MAX_HP_FLOOR), the stairs' hold that
 * never adjourns (`hold` with `seconds` 0), and Time — untouchable, a clock,
 * and the win when it runs out. Then the rule every one of them keeps: no
 * dice. decline-act.test.ts runs the act and the life to their end.
 *
 * Every number read here is a placeholder under `DECLINE.provisional`; what
 * is under test is the rule, and each assertion is written against the def's
 * own figure rather than a copy of it.
 */

let uid = 700000;
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

let serial = 5e8;
/** A player's shot, standing still at (x, y), that hits whatever it is on for `damage`. */
function shot(x: number, y: number, damage: number): ProjectileState {
  return { x, y, vx: 0, vy: 0, life: 1, damage, pierce: 1, radius: 4, hostile: false, serial: serial++ };
}

/** A one-shot burst at (x, y), as an item's burst is built. */
function burst(x: number, y: number, damage: number): AreaState {
  return { x, y, age: 0, seconds: 0.2, radius: 40, damage, pull: false, tick: false, serial: serial++ };
}

const DT = 1 / 60;
const still = { moveX: 0, moveY: 0 };
const MEDICATION = enemyDef('medication');
const WEATHER = enemyDef('weather');
const STAIRS = enemyDef('stairs');
const FORM = enemyDef('insurance-form');
const HEAL = MEDICATION.killHeal!;
const LOSS = FORM.ranged!.maxHpLoss!;
const HOLD = STAIRS.hold!;

/**
 * The act with nothing scheduled: nothing spawns, so nothing draws the dice
 * but what a test puts on the field. Its id is Decline's, so the item pool is
 * the one a life at fifty-five would roll.
 */
const QUIET: ActDef = { ...DECLINE, waves: [] };

/** A World with nothing on it and nothing firing. */
function empty(seed: number, act: ActDef = QUIET, startingItems: string[] = []): World {
  return new World({ act, seed, startingItems });
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

/** The world's next roll of its own dice. Private because nothing outside the sim should roll. */
function nextRoll(w: World): number {
  return (w as unknown as { rng: () => number }).rng();
}

/** The act's clock run out: the boss up, on the step that crosses it. */
function toBoss(w: World): NonNullable<World['boss']> {
  w.actTime = w.act.durationSeconds;
  w.step(DT, still);
  expect(w.boss, 'the boss did not appear at the act clock').not.toBeNull();
  return w.boss!;
}

/** A decision landing on the player: the form's own shot, as `fireRanged` builds it, on them. */
function decision(w: World): void {
  const r = FORM.ranged!;
  w.projectiles.push({
    x: w.x,
    y: w.y,
    vx: 0,
    vy: 0,
    life: 1,
    damage: r.damage,
    pierce: 1,
    radius: 10,
    hostile: true,
    source: FORM.id,
    owner: FORM,
    serial: serial++,
  });
  w.invulnerable = 0;
  w.step(DT, still);
}

describe('the medication is good for you if you get to it first (killHeal, §3.1)', () => {
  it('killed, it restores `killHeal` health', () => {
    expect(HEAL).toBe(2); // the placeholder this was written against
    const w = empty(1);
    w.hp = 50;
    const pill = place(w, MEDICATION, 400, 0);
    w.projectiles.push(shot(pill.x, pill.y, MEDICATION.hp));
    w.step(DT, still);
    expect(w.enemies).not.toContain(pill);
    expect(w.kills).toBe(1);
    expect(w.hp).toBe(50 + HEAL);
  });

  it('by any weapon: a burst that kills it heals as a shot does', () => {
    const w = empty(2);
    w.hp = 50;
    const pill = place(w, MEDICATION, 400, 0);
    w.areas.push(burst(pill.x, pill.y, MEDICATION.hp));
    w.step(DT, still);
    expect(w.kills).toBe(1);
    expect(w.hp).toBe(50 + HEAL);
  });

  it('and by the starting weapon, from the start of a life', () => {
    const w = new World({ act: QUIET, seed: 3, startingItems: ['lash'] });
    w.hp = 50;
    const pill = place(w, MEDICATION, 200, 0);
    for (let i = 0; i < 600 && w.enemies.includes(pill); i++) {
      if (w.offers) w.choose(w.offers[0]!);
      else w.step(DT, still);
    }
    expect(w.enemies, 'Lash never killed the medication').not.toContain(pill);
    expect(w.hp).toBe(50 + HEAL);
  });

  it('never past the maximum, and never lowering a health already at it', () => {
    const w = empty(4);
    w.hp = w.maxHp - HEAL / 2;
    const a = place(w, MEDICATION, 400, 0);
    w.projectiles.push(shot(a.x, a.y, MEDICATION.hp));
    w.step(DT, still);
    expect(w.hp).toBe(w.maxHp);
    const b = place(w, MEDICATION, -400, 0);
    w.projectiles.push(shot(b.x, b.y, MEDICATION.hp));
    w.step(DT, still);
    expect(w.kills).toBe(2);
    expect(w.hp).toBe(w.maxHp);
  });

  it('to the maximum as the form has left it, not as the items give it', () => {
    const w = empty(5);
    decision(w);
    const ceiling = w.maxHp;
    expect(ceiling).toBeLessThan(PLAYER_BASE_HP);
    w.hp = ceiling - HEAL / 2;
    const pill = place(w, MEDICATION, 400, 0);
    w.projectiles.push(shot(pill.x, pill.y, MEDICATION.hp));
    w.step(DT, still);
    expect(w.hp).toBe(ceiling);
  });

  it('a dose that reaches you first hurts, and heals nothing', () => {
    const w = empty(6);
    const hp = w.hp;
    place(w, MEDICATION, 0, 0);
    w.step(DT, still);
    expect(w.hp).toBe(hp - MEDICATION.contactDamage);
    expect(w.kills).toBe(0);
  });

  it('not on a despawn: a crosser culled far off is not taken', () => {
    // The medication chases and is never culled; a crossing variant of it,
    // past DESPAWN_RADIUS, is — and a cull is not a kill.
    const w = empty(7);
    w.hp = 50;
    const far = place(w, { ...MEDICATION, movement: 'cross' }, DESPAWN_RADIUS + 100, 0);
    w.step(DT, still);
    expect(w.enemies).not.toContain(far);
    expect(w.kills).toBe(0);
    expect(w.hp).toBe(50);
    // And it never merges: a merge is not a kill either, and the registry's
    // rule (merge is static and harmless) keeps it off the medication.
    expect(MEDICATION.merge).toBeUndefined();
  });

  it('nothing else heals on a kill', () => {
    const w = empty(8);
    w.hp = 50;
    const plain: EnemyDef = { ...MEDICATION };
    delete plain.killHeal;
    const e = place(w, plain, 400, 0);
    w.projectiles.push(shot(e.x, e.y, MEDICATION.hp));
    w.step(DT, still);
    expect(w.kills).toBe(1);
    expect(w.hp).toBe(50);
  });
});

describe('the insurance form decides how much of you there is (ranged.maxHpLoss, §3.5)', () => {
  it('a landing decision hurts, then lowers the maximum by `maxHpLoss` of itself and holds health inside it', () => {
    expect(LOSS).toBe(0.05); // the placeholder this was written against
    const w = empty(11);
    expect(w.maxHp).toBe(PLAYER_BASE_HP);
    expect(w.openingMaxHp).toBe(PLAYER_BASE_HP);
    place(w, FORM, 360, 0);
    let hp0 = w.hp;
    for (let i = 0; i < 60 * 12 && w.maxHp === PLAYER_BASE_HP; i++) {
      hp0 = w.hp;
      w.step(DT, still);
    }
    expect(w.maxHp, 'the decision never landed').toBeCloseTo(PLAYER_BASE_HP * (1 - LOSS), 9);
    // Full health less the damage is above the new ceiling: held to it.
    expect(hp0 - FORM.ranged!.damage).toBeGreaterThan(w.maxHp);
    expect(w.hp).toBe(w.maxHp);
    // The hit's i-frames, as any shot's; no stop (the form carries none).
    expect(w.invulnerable).toBeGreaterThan(0);
    expect(w.stunTimer).toBe(0);
  });

  it('each takes `maxHpLoss` of the maximum as it stands, and health below the ceiling is only hurt', () => {
    const w = empty(12);
    decision(w);
    decision(w);
    expect(w.maxHp).toBeCloseTo(PLAYER_BASE_HP * (1 - LOSS) ** 2, 9);
    w.hp = 40;
    decision(w);
    expect(w.maxHp).toBeCloseTo(PLAYER_BASE_HP * (1 - LOSS) ** 3, 9);
    expect(w.hp).toBeCloseTo(40 - FORM.ranged!.damage, 9);
  });

  it('stops at the floor, a fifth of the act’s opening maximum, and takes nothing more there', () => {
    expect(MAX_HP_FLOOR).toBe(1 / 5); // the placeholder this was written against
    const w = empty(13);
    const floor = MAX_HP_FLOOR * PLAYER_BASE_HP;
    expect(w.maxHpFloor).toBeCloseTo(floor, 9);
    let before = w.maxHp;
    let n = 0;
    for (; n < 200 && w.maxHp > floor; n++) {
      w.hp = w.maxHp;
      decision(w);
      expect(w.maxHp, `decision ${n + 1} went under the floor`).toBeGreaterThanOrEqual(floor - 1e-9);
      expect(w.maxHp, `decision ${n + 1} took nothing above the floor`).toBeLessThan(before);
      before = w.maxHp;
    }
    // Thirty-odd decisions at 0.95 each reach a fifth, not two hundred.
    expect(n).toBeLessThan(40);
    expect(w.maxHp).toBeCloseTo(floor, 9);
    // At the floor: the damage lands, the maximum does not move.
    for (let i = 0; i < 5; i++) {
      w.hp = w.maxHp;
      decision(w);
      expect(w.maxHp).toBeCloseTo(floor, 9);
      expect(w.hp).toBeCloseTo(floor - FORM.ranged!.damage, 9);
    }
    expect(w.dead).toBe(false);
  });

  it('a decision on an i-framed player is spent and decides nothing', () => {
    const w = empty(14);
    w.projectiles.push({ ...shot(w.x, w.y, FORM.ranged!.damage), hostile: true, owner: FORM });
    w.invulnerable = 100;
    w.step(DT, still);
    expect(w.projectiles).toEqual([]);
    expect(w.maxHp).toBe(PLAYER_BASE_HP);
  });

  it('a decision that kills decides nothing more', () => {
    const w = empty(15);
    w.hp = 1;
    decision(w);
    expect(w.dead).toBe(true);
    expect(w.maxHp).toBe(PLAYER_BASE_HP);
    expect(w.certificate).toMatchObject({ outcome: 'died', causeId: 'insurance-form', cause: 'Insurance form' });
  });

  it('a Thick Skin taken after it raises the maximum by its own multiplier, and the decision stands', () => {
    const w = empty(16);
    decision(w);
    const decided = w.maxHp;
    w.items.set('membrane', 1);
    const skin = PLAYER_BASE_HP * 1.06;
    expect(w.maxHp).toBeCloseTo(skin * (1 - LOSS), 9);
    expect(w.maxHp).toBeGreaterThan(decided);
  });

  it('the items’ maximum (itemsMaxHp, AUDIT 122) moves with a Thick Skin and never with a decision', () => {
    const w = empty(18);
    expect(w.itemsMaxHp).toBe(PLAYER_BASE_HP);
    decision(w);
    decision(w);
    expect(w.maxHp).toBeLessThan(PLAYER_BASE_HP);
    expect(w.itemsMaxHp, 'a decision moved the items’ maximum').toBe(PLAYER_BASE_HP);
    w.items.set('membrane', 1);
    expect(w.itemsMaxHp).toBeCloseTo(PLAYER_BASE_HP * 1.06, 9);
    expect(w.maxHp).toBeCloseTo(w.itemsMaxHp * (1 - LOSS) ** 2, 9);
    // Down at the floor it still reads what the items give, not the floor.
    for (let i = 0; i < 200 && w.maxHp > w.maxHpFloor + 1e-9; i++) {
      w.hp = w.maxHp;
      decision(w);
    }
    expect(w.maxHp).toBeCloseTo(w.maxHpFloor, 9);
    expect(w.itemsMaxHp).toBeCloseTo(PLAYER_BASE_HP * 1.06, 9);
  });

  it('the pause sheet prints the lowered maximum', () => {
    const w = empty(17);
    decision(w);
    const max = Math.round(w.maxHp);
    expect(max).toBeLessThan(PLAYER_BASE_HP);
    expect(buildSheet(w).totals).toContain(`health ${Math.ceil(w.hp)}/${max}`);
  });

  it('is for the rest of the act: off at the crossing, and the floor read again from the next act’s maximum', () => {
    const after: ActDef = { ...QUIET, id: 'decline-after', name: 'After' };
    const w = new World({ acts: [QUIET, after], seed: 18, startingItems: [] });
    for (let i = 0; i < 3; i++) decision(w);
    expect(w.maxHp).toBeLessThan(PLAYER_BASE_HP);
    const b = toBoss(w);
    b.hp = 0;
    b.phase = 'absorbing';
    b.timer = 0;
    alive(w, DT);
    expect(w.act).toBe(after);
    // The inheritance dealt at the crossing may carry health of its own; the
    // maximum is whatever the items give, undecided, and the floor a fifth of it.
    const opening = w.openingMaxHp;
    expect(w.maxHp).toBe(opening);
    expect(w.hp).toBe(opening);
    expect(w.maxHpFloor).toBeCloseTo(MAX_HP_FLOOR * opening, 9);
  });

  it('only the form decides: an older ranged shot leaves the maximum alone', () => {
    const w = empty(19);
    const review = enemyDef('performance-review');
    w.projectiles.push({ ...shot(w.x, w.y, review.ranged!.damage), hostile: true, owner: review });
    w.step(DT, still);
    expect(w.hp).toBe(PLAYER_BASE_HP - review.ranged!.damage);
    expect(w.maxHp).toBe(PLAYER_BASE_HP);
  });
});

describe('the stairs are a meeting that never adjourns (hold, seconds 0, §3.4)', () => {
  /** A world with one flight of stairs landed at the player's lead, facing right. */
  function flight(seed: number) {
    const w = empty(seed);
    w.facingX = 1;
    w.facingY = 0;
    w.spawnEnemy('stairs');
    expect(w.enemies).toEqual([]);
    expect(w.holds).toHaveLength(1);
    return { w, h: w.holds[0]! };
  }

  it('lands at the lead, at `to` from its first frame, and nothing divides by its zero `seconds`', () => {
    expect(HOLD).toEqual({ from: 130, to: 130, seconds: 0, holdSeconds: 600, slow: 0.45 }); // the placeholder
    const { w, h } = flight(21);
    expect(h.x).toBeGreaterThan(w.x);
    expect(h.y).toBe(w.y);
    expect(h.radius).toBe(HOLD.to);
    for (let i = 0; i < 60; i++) {
      w.step(DT, still);
      expect(Number.isFinite(h.radius)).toBe(true);
      expect(h.radius).toBe(HOLD.to);
    }
    // A hold whose `from` differs is at `to` from its first frame too, before
    // any step: the walk that walls on the step it lands reads this radius.
    const at = empty(22);
    const unlike: EnemyDef = { ...STAIRS, hold: { ...HOLD, from: 400 } };
    (at as unknown as { addEnemy(d: EnemyDef, x: number, y: number, vx: number, vy: number): unknown }).addEnemy(
      unlike,
      at.x + 300,
      at.y,
      0,
      0,
    );
    expect(at.holds[0]!.radius).toBe(HOLD.to);
    at.step(DT, still);
    expect(at.holds[0]!.radius).toBe(HOLD.to);
  });

  it('never ends within the act, nor within Time', () => {
    const { w, h } = flight(23);
    const act = DECLINE.durationSeconds + (DECLINE.boss.kind === 'time' ? DECLINE.boss.seconds : 0);
    expect(HOLD.seconds + HOLD.holdSeconds).toBeGreaterThan(act);
    alive(w, act);
    expect(w.holds).toEqual([h]);
    expect(h.radius).toBe(HOLD.to);
  });

  it('its edge walls a chaser both ways', () => {
    // Out: the player stands in the stairs, a dose outside comes for them and
    // stops at the edge.
    const { w, h } = flight(24);
    w.x = h.x;
    w.y = h.y;
    const out = place(w, MEDICATION, 300, 0);
    alive(w, 8);
    expect(Math.hypot(out.x - h.x, out.y - h.y)).toBeGreaterThan(h.radius);
    expect(Math.hypot(out.x - h.x, out.y - h.y)).toBeLessThan(h.radius + 1);
    expect(w.hp).toBe(w.maxHp);

    // In: a dose inside with the player outside cannot follow them out.
    const inside = empty(25);
    inside.facingX = 1;
    inside.facingY = 0;
    inside.spawnEnemy('stairs');
    const g = inside.holds[0]!;
    const held = place(inside, MEDICATION, g.x - inside.x, 0);
    inside.x = g.x - 400;
    alive(inside, 8);
    expect(Math.hypot(held.x - g.x, held.y - g.y)).toBeLessThanOrEqual(g.radius);
    expect(Math.hypot(held.x - g.x, held.y - g.y)).toBeGreaterThan(g.radius - 1);
  });

  it('lets the player walk in, up at `slow`, and out the far side', () => {
    const { w, h } = flight(26);
    const right = { moveX: 1, moveY: 0 };
    let inside = false;
    let slowed = false;
    for (let i = 0; i < 60 * 10 && w.x < h.x + h.radius + 20; i++) {
      const x0 = w.x;
      w.step(DT, right);
      const within = (w.x - h.x) ** 2 + (w.y - h.y) ** 2 <= h.radius ** 2;
      const was = (x0 - h.x) ** 2 + (w.y - h.y) ** 2 <= h.radius ** 2;
      if (within && was) {
        inside = true;
        expect(w.x - x0).toBeCloseTo(w.baseSpeed * HOLD.slow * DT, 9);
        slowed = true;
      }
    }
    expect(inside, 'the player never got onto the stairs').toBe(true);
    expect(slowed).toBe(true);
    expect(w.x, 'the player never came out the far side').toBeGreaterThan(h.x + h.radius);
  });

  it('the weather crosses it: a crosser is never walled, and the rain comes up the stairs', () => {
    const { w, h } = flight(27);
    w.x = h.x;
    w.y = h.y;
    const front = place(w, WEATHER, 400, 0);
    front.vx = -WEATHER.speed;
    const x0 = front.x;
    // Slowed on the stairs as everything is (`slow`), and not stopped.
    alive(w, 6);
    expect(w.enemies).toContain(front);
    expect(front.x).toBeLessThan(h.x - h.radius);
    expect(x0 - front.x).toBeGreaterThan(2 * h.radius);
  });
});

/**
 * The same fight against The Egg and against Time: the damage that one takes
 * is the damage the other refuses. A quiet act each, the player at `dy` below
 * the boss point facing it, stepped `seconds` with health held.
 */
function fight(
  act: ActDef,
  items: string[],
  dy: number,
  seconds: number,
  each: (w: World, b: NonNullable<World['boss']>) => void = () => {},
): { w: World; lost: number } {
  const w = empty(31, { ...act, waves: [] }, items);
  const b = toBoss(w);
  w.x = b.x;
  w.y = b.y + dy;
  w.facingX = 0;
  w.facingY = -1;
  const hp0 = b.hp;
  const steps = Math.round(seconds * 60);
  for (let i = 0; i < steps && !w.won; i++) {
    each(w, b);
    if (w.offers) w.choose(w.offers[0]!);
    w.hp = w.maxHp;
    w.dead = false;
    w.step(DT, still);
  }
  return { w, lost: hp0 - b.hp };
}

describe('Time cannot be hurt (§4)', () => {
  it('declares a clock and no health: seconds, a hand (time.test.ts), no shield, no race', () => {
    expect(DECLINE.boss).toEqual({ kind: 'time', seconds: 60, sweepSeconds: 12, sweepLength: 520, sweepWidth: 40 });
    const w = empty(30);
    const b = toBoss(w);
    expect(b.kind).toBe('time');
    expect(b.hp).toBe(BOSS_HP);
    expect(b.maxHp).toBe(BOSS_HP);
    expect(b.secondsLeft).toBe(DECLINE.boss.kind === 'time' ? DECLINE.boss.seconds : NaN);
    expect(b.shielded).toBe(false);
    expect(w.raceTarget).toBe(0);
  });

  it('a shot: spent on the clock, and nothing taken', () => {
    const on = (w: World, b: NonNullable<World['boss']>) => {
      if (w.projectiles.every((p) => p.hostile)) w.projectiles.push(shot(b.x, b.y, 50));
    };
    expect(fight(CONCEPTION, [], 300, 1, on).lost).toBeGreaterThan(0);
    const { w, lost } = fight(DECLINE, [], 300, 1, on);
    expect(lost).toBe(0);
    expect(w.boss!.hp).toBe(BOSS_HP);
  });

  it('an area: nothing taken', () => {
    const on = (w: World, b: NonNullable<World['boss']>) => {
      if (w.areas.length === 0) w.areas.push(burst(b.x, b.y, 50));
    };
    expect(fight(CONCEPTION, [], 300, 1, on).lost).toBeGreaterThan(0);
    expect(fight(DECLINE, [], 300, 1, on).lost).toBe(0);
  });

  it('an orbiter: nothing taken', () => {
    // Grudge circles at 70px: at the boss's edge, it passes through the boss.
    expect(fight(CONCEPTION, ['grudge'], 150, 3).lost).toBeGreaterThan(0);
    expect(fight(DECLINE, ['grudge'], 150, 3).lost).toBe(0);
  });

  it('a sweep: nothing taken', () => {
    // Backhand swings along the facing, at the boss.
    expect(fight(CONCEPTION, ['backhand'], 200, 3).lost).toBeGreaterThan(0);
    expect(fight(DECLINE, ['backhand'], 200, 3).lost).toBe(0);
  });

  it('an aura: nothing taken', () => {
    // Personal Space's ring, 90px about the player, reaches past the boss's edge.
    expect(fight(CONCEPTION, ['personal-space'], 160, 3).lost).toBeGreaterThan(0);
    expect(fight(DECLINE, ['personal-space'], 160, 3).lost).toBe(0);
  });

  it('a strike landing on it: nothing taken', () => {
    // Judgement never picks Time (below), so the bolt is set down on it by hand.
    const on = (w: World, b: NonNullable<World['boss']>) => {
      if (w.areas.length === 0) w.areas.push({ ...burst(b.x, b.y, 50), delay: 0.05, source: 'judgement' });
    };
    expect(fight(CONCEPTION, [], 300, 1, on).lost).toBeGreaterThan(0);
    expect(fight(DECLINE, [], 300, 1, on).lost).toBe(0);
  });

  it('a weapon does not aim at it: Lash and Judgement with nothing else on the field never fire', () => {
    const egg = fight(CONCEPTION, ['lash'], 300, 3);
    expect(egg.lost, 'Lash never reached the Egg: the control is broken').toBeGreaterThan(0);
    expect(fight(CONCEPTION, ['judgement'], 250, 3).lost, 'Judgement never reached the Egg').toBeGreaterThan(0);
    let fired = 0;
    fight(DECLINE, ['lash', 'judgement'], 250, 3, (w) => {
      fired += w.projectiles.filter((p) => !p.hostile).length + w.areas.length;
    });
    expect(fired).toBe(0);
  });
});

describe('Time runs out, and the life ends won (§4)', () => {
  const SECONDS = DECLINE.boss.kind === 'time' ? DECLINE.boss.seconds : NaN;

  it('its clock counts down from `seconds` at its arrival', () => {
    const w = empty(41);
    const b = toBoss(w);
    expect(b.secondsLeft).toBe(SECONDS);
    alive(w, 10);
    expect(b.secondsLeft).toBeCloseTo(SECONDS - 10, 6);
    expect(b.phase).toBe('idle');
    expect(w.won).toBe(false);
  });

  it('at `seconds` the outcome latches on EVENTUALLY, and after the exit it is natural causes at eighty-four', () => {
    const w = empty(42);
    const b = toBoss(w);
    // A step short: still counting.
    alive(w, SECONDS - 2 * DT);
    expect(b.phase).toBe('idle');
    expect(b.secondsLeft).toBeGreaterThan(0);
    // Within two steps of `seconds` (a sum of sixtieths is not exact): latched.
    alive(w, 3 * DT);
    expect(b.phase).toBe('absorbing');
    expect(b.secondsLeft).toBe(0);
    expect(w.won).toBe(false);
    // The exit every boss takes, with the act's word in it.
    expect(w.act.endWord).toBe('EVENTUALLY');
    // Nothing latched is undone: a clock that ran out does not run again.
    alive(w, 1);
    expect(b.phase).toBe('absorbing');
    alive(w, 1);
    expect(w.won).toBe(true);
    expect(w.outcome).toBe('won');
    expect(b.hp).toBe(BOSS_HP);
    expect(w.certificate).toEqual({
      outcome: 'won',
      actId: 'decline',
      actName: 'Decline',
      actIndex: 0,
      age: 84,
      causeId: 'natural-causes',
      cause: 'natural causes',
      rules: [],
    });
    expect(w.certificate!.age).toBe(DECLINE.age.to);
  });

  it('the dev panel’s kill ends it the same way, won', () => {
    // The panel's own write: health to zero, the exit, 1.8s (src/dev/panel.ts).
    const w = empty(43);
    const b = toBoss(w);
    alive(w, 5);
    b.hp = 0;
    b.phase = 'absorbing';
    b.timer = 1.8;
    alive(w, 2);
    expect(w.won).toBe(true);
    expect(w.certificate).toMatchObject({ outcome: 'won', causeId: 'natural-causes', age: 84 });
  });

  it('health written to zero alone is the clock run out: no boss stands at zero forever', () => {
    const w = empty(44);
    const b = toBoss(w);
    alive(w, 5);
    b.hp = 0;
    alive(w, DT);
    expect(b.phase).toBe('absorbing');
    expect(b.secondsLeft).toBe(0);
    alive(w, 2);
    expect(w.won).toBe(true);
    expect(w.certificate).toMatchObject({ outcome: 'won', causeId: 'natural-causes', age: 84 });
  });

  it('a death on the step it runs out is a death, at eighty-four', () => {
    const w = empty(45);
    const b = toBoss(w);
    b.secondsLeft = DT / 2;
    w.hp = 1;
    place(w, MEDICATION, 0, 0);
    w.step(DT, still);
    expect(w.dead).toBe(true);
    expect(b.phase).not.toBe('absorbing');
    expect(w.won).toBe(false);
    expect(w.certificate).toMatchObject({ outcome: 'died', actId: 'decline', causeId: 'medication', age: 84 });
  });

  it('a death to it would name Time: the certificate reads the act’s boss name', () => {
    expect(DECLINE.bossName).toBe('Time');
  });
});

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

  it('killHeal', () => {
    sameNextRoll((fires) => {
      const w = empty(51);
      w.hp = 50;
      const def: EnemyDef = { ...MEDICATION };
      if (!fires) delete def.killHeal;
      const e = place(w, def, 400, 0);
      w.projectiles.push(shot(e.x, e.y, def.hp));
      w.step(DT, still);
      expect(w.hp).toBe(fires ? 50 + HEAL : 50);
      return w;
    });
  });

  it('ranged.maxHpLoss', () => {
    sameNextRoll((fires) => {
      const w = empty(52);
      const ranged = { ...FORM.ranged! };
      if (!fires) delete ranged.maxHpLoss;
      place(w, { ...FORM, ranged }, 360, 0);
      for (let i = 0; i < 60 * 12; i++) {
        w.hp = w.maxHp;
        w.step(DT, still);
      }
      expect(w.maxHp < PLAYER_BASE_HP).toBe(fires);
      return w;
    });
  });

  it('the stairs’ hold', () => {
    sameNextRoll((fires) => {
      const w = empty(53);
      if (fires) w.spawnEnemy('stairs');
      alive(w, 2);
      expect(w.holds.length).toBe(fires ? 1 : 0);
      return w;
    });
  });

  it('Time, from its arrival to the win', () => {
    sameNextRoll((fires) => {
      const w = empty(54);
      if (fires) {
        toBoss(w);
        alive(w, (DECLINE.boss.kind === 'time' ? DECLINE.boss.seconds : 0) + 2);
        expect(w.won).toBe(true);
      }
      return w;
    });
  });
});
