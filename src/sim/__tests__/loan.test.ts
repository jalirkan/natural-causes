import { describe, expect, it } from 'vitest';
import { ADOLESCENCE, type ActDef, type LoanBoss } from '../../data/acts';
import { ENEMIES } from '../../data/enemies';
import {
  ANTIBODY_LEAD,
  BOSS_HP,
  EGG_ATTACK_SECONDS,
  EGG_IDLE_SECONDS,
  EGG_TELEGRAPH_SECONDS,
  LOAN_INVOICE_SPREAD,
  LOAN_OPENING_PER_STACK,
  World,
  type EnemyState,
} from '../world';

/**
 * The Loan (COLLEGE-ROSTER §4): never attacks, never moves, never shields.
 * Its balance compounds toward a cap, the bar fills as it does, and at the cap
 * the player dies of it. Its statement drops invoices at the player's lead.
 * At zero it ends the act on its word, as every boss does.
 *
 * College does not exist in this tree yet, and neither does tuition, so the
 * act here is a FIXTURE: Adolescence's schedule with the Loan for its boss and
 * no race, and acne — a static attach enemy that arrives at the lead, which is
 * what tuition will be — for the invoice. The numbers are the brief's
 * placeholders, read off the fixture's `boss` wherever a test depends on them,
 * so moving one moves the expectation with it.
 */

/** A power of two, so five seconds is exactly 320 steps and a tick lands on a known one. */
const DT = 1 / 64;
const STILL = { moveX: 0, moveY: 0 };

const LOAN: LoanBoss = {
  kind: 'loan',
  enemyId: 'acne',
  interestSeconds: 5,
  interestRate: 0.06,
  cap: 3,
  invoices: 3,
};
const FIXTURE: ActDef = {
  id: 'loan-test',
  name: ADOLESCENCE.name,
  durationSeconds: ADOLESCENCE.durationSeconds,
  waves: ADOLESCENCE.waves,
  bossName: 'The Loan',
  boss: LOAN,
  endWord: 'CONGRATULATIONS',
  age: ADOLESCENCE.age,
};
const INVOICE = ENEMIES[LOAN.enemyId]!;
const STEPS_PER_TICK = LOAN.interestSeconds / DT;

/**
 * A world at the Loan: `stacks` worn when it appears, then the field emptied
 * and the player unarmed, standing where they started, facing right.
 */
function atLoan(stacks = 0, act: ActDef = FIXTURE): World {
  const w = new World({ act, seed: 7, startingItems: [] });
  w.dragStacks = stacks;
  w.time = act.durationSeconds;
  w.step(DT, STILL);
  expect(w.boss, 'the Loan did not appear at the act clock').not.toBeNull();
  w.enemies.length = 0;
  w.projectiles.length = 0;
  w.gems.length = 0;
  return w;
}

/** Steps, choosing the first offer whenever one is waiting. Stops at the end of the life. */
function run(w: World, steps: number, each?: () => void): void {
  for (let i = 0; i < steps; i++) {
    if (w.offers) {
      w.choose(w.offers[0]!);
      continue;
    }
    if (w.won || w.dead) return;
    w.step(DT, STILL);
    each?.();
  }
}

let serial = 900_000;
/** A friendly shot parked on the boss. */
function shoot(w: World, damage: number): void {
  const b = w.boss!;
  w.projectiles.push({
    x: b.x, y: b.y, vx: 0, vy: 0,
    life: 1, damage, pierce: 1, radius: 10,
    hostile: false, serial: serial++,
  });
}

const invoices = (w: World): EnemyState[] => w.enemies.filter((e) => e.def.id === LOAN.enemyId);

describe('the opening balance: what you owe is what you carried in', () => {
  it('opens at BOSS_HP with nothing worn, and its cap is `cap` times that', () => {
    const b = atLoan(0).boss!;
    expect(b.kind).toBe('loan');
    expect(b.hp).toBe(BOSS_HP);
    expect(b.maxHp).toBe(BOSS_HP * LOAN.cap);
    expect(b.interestIn).toBe(LOAN.interestSeconds);
  });

  it('opens a tenth higher for every invoice worn; the bar starts 1/cap full either way', () => {
    const b = atLoan(2).boss!;
    const opening = BOSS_HP * (1 + LOAN_OPENING_PER_STACK * 2);
    expect(LOAN_OPENING_PER_STACK).toBe(0.1);
    expect(b.hp).toBeCloseTo(BOSS_HP * 1.2, 9);
    expect(b.hp).toBe(opening);
    expect(b.maxHp).toBe(opening * LOAN.cap);
    expect(b.hp / b.maxHp).toBeCloseTo(1 / LOAN.cap, 12);
  });
});

describe('interest: every interestSeconds the balance grows by interestRate of itself', () => {
  it('nothing for interestSeconds, then exactly the rate, and the clock starts over', () => {
    const w = atLoan();
    const b = w.boss!;
    const opening = b.hp;
    run(w, STEPS_PER_TICK - 1);
    expect(b.hp).toBe(opening);
    expect(b.interestIn).toBeCloseTo(DT, 12);
    run(w, 1);
    expect(b.hp).toBeCloseTo(opening * (1 + LOAN.interestRate), 9);
    expect(b.interestIn).toBe(LOAN.interestSeconds);
    run(w, STEPS_PER_TICK);
    expect(b.hp).toBeCloseTo(opening * (1 + LOAN.interestRate) ** 2, 9);
  });

  it('compounds to the cap and never past it', () => {
    const w = atLoan();
    const b = w.boss!;
    let peak = 0;
    run(w, STEPS_PER_TICK * 40, () => {
      expect(b.hp).toBeLessThanOrEqual(b.maxHp);
      peak = Math.max(peak, b.hp);
    });
    expect(peak).toBe(b.maxHp);
    expect(b.hp).toBe(b.maxHp);
  });

  it('accrues at any frame rate on the same clock, the overshoot carried', () => {
    // Ten ticks apart is ten intervals, within a frame, at 60Hz, 144Hz and a
    // 7Hz stutter.
    for (const dt of [1 / 60, 1 / 144, 1 / 7]) {
      const w = atLoan();
      const b = w.boss!;
      b.maxHp = Infinity;
      const tickedAt: number[] = [];
      let last = b.hp;
      for (let i = 0; i < Math.ceil(60 / dt) && tickedAt.length < 11; i++) {
        w.step(dt, STILL);
        if (b.hp > last) tickedAt.push(w.time);
        last = b.hp;
      }
      expect(tickedAt.length, `${dt}`).toBe(11);
      expect(Math.abs(tickedAt[10]! - tickedAt[0]! - 10 * LOAN.interestSeconds), `${dt}`).toBeLessThanOrEqual(dt);
    }
  });
});

describe('foreclosure: at the cap the player dies of the Loan', () => {
  it('dies on the tick that reaches the cap, whatever their health and i-frames', () => {
    const w = atLoan();
    const b = w.boss!;
    const ticks = Math.ceil(Math.log(LOAN.cap) / Math.log(1 + LOAN.interestRate));
    let steps = 0;
    for (; steps < STEPS_PER_TICK * (ticks + 2) && !w.dead; steps++) {
      // Nothing that stands in front of damage stands in front of this.
      w.hp = w.maxHp;
      w.invulnerable = 100;
      w.step(DT, STILL);
    }
    expect(w.dead).toBe(true);
    expect(steps).toBe(STEPS_PER_TICK * ticks);
    expect(b.hp).toBe(b.maxHp);
    expect(w.hp).toBe(0);
    expect(w.outcome).toBe('died');
    expect(w.certificate).toMatchObject({
      outcome: 'died',
      actId: 'loan-test',
      causeId: 'boss',
      cause: 'The Loan',
    });
    expect(w.certificate!.cause).toBe(FIXTURE.bossName);
    expect(w.certificate!.age).toBeCloseTo(FIXTURE.age.to, 6);
  });

  it('does not overwrite a death that came first in the same step', () => {
    const w = atLoan();
    const b = w.boss!;
    b.hp = b.maxHp - 1e-9;
    b.interestIn = DT / 2;
    // A shot of the Egg's kind with an enemy owner, on the player, for more than they have.
    w.hp = 1;
    w.invulnerable = 0;
    w.projectiles.push({
      x: w.x, y: w.y, vx: 0, vy: 0,
      life: 1, damage: 50, pierce: 1, radius: 10,
      hostile: true, source: 'group-chat', owner: ENEMIES['group-chat']!, serial: serial++,
    });
    w.step(DT, STILL);
    expect(w.dead).toBe(true);
    expect(w.certificate).toMatchObject({ causeId: 'group-chat' });
  });
});

describe('the statement: invoices at the player\'s lead', () => {
  it("idle, the tape jerks for the Egg's telegraph, then `invoices` land at the lead, fanned", () => {
    const w = atLoan();
    const b = w.boss!;
    expect(b.phase).toBe('idle');
    let telegraphAt = -1;
    let attackAt = -1;
    run(w, 10 / DT, () => {
      if (b.phase === 'telegraph' && telegraphAt < 0) telegraphAt = w.time;
      if (b.phase === 'attack' && attackAt < 0) attackAt = w.time;
      if (attackAt < 0) expect(invoices(w)).toHaveLength(0);
    });
    expect(telegraphAt).toBeGreaterThan(0);
    expect(Math.abs(attackAt - telegraphAt - EGG_TELEGRAPH_SECONDS)).toBeLessThanOrEqual(DT);
  });

  it('drops exactly `invoices`, each at the lead distance, distinct, the heading put back', () => {
    const w = atLoan();
    const b = w.boss!;
    const fx = w.facingX;
    const fy = w.facingY;
    b.phase = 'telegraph';
    b.timer = DT / 2;
    w.step(DT, STILL);
    expect(b.phase).toBe('attack');
    const dropped = invoices(w);
    expect(dropped).toHaveLength(LOAN.invoices);
    expect(w.facingX).toBe(fx);
    expect(w.facingY).toBe(fy);
    const lead = { x: w.x + fx * ANTIBODY_LEAD, y: w.y + fy * ANTIBODY_LEAD };
    const fan = ANTIBODY_LEAD * LOAN_INVOICE_SPREAD * ((LOAN.invoices - 1) / 2);
    for (const e of dropped) {
      expect(Math.hypot(e.x - w.x, e.y - w.y)).toBeCloseTo(ANTIBODY_LEAD, 9);
      expect(Math.hypot(e.x - lead.x, e.y - lead.y)).toBeLessThanOrEqual(fan + 1e-9);
      expect(e.vx).toBe(0);
      expect(e.vy).toBe(0);
    }
    for (let i = 0; i < dropped.length; i++) {
      for (let j = i + 1; j < dropped.length; j++) {
        const [p, q] = [dropped[i]!, dropped[j]!];
        expect(Math.hypot(p.x - q.x, p.y - q.y)).toBeGreaterThan(p.radius + q.radius);
      }
    }
  });

  it('an invoice attaches when touched: one stack, off the floor, the rest stay', () => {
    const w = atLoan();
    const b = w.boss!;
    b.phase = 'telegraph';
    b.timer = DT / 2;
    w.step(DT, STILL);
    const [first, ...rest] = invoices(w);
    expect(INVOICE.contact).toBe('attach');
    w.x = first!.x;
    w.y = first!.y;
    w.step(DT, STILL);
    expect(w.dragStacks).toBe(1);
    expect(w.enemies).not.toContain(first);
    for (const e of rest) expect(w.enemies).toContain(e);
  });

  it("recurs on the Egg's cycle, and nothing else on the field goes anywhere", () => {
    const w = atLoan();
    const b = w.boss!;
    const counts: { t: number; n: number }[] = [];
    run(w, 12 / DT, () => {
      const n = invoices(w).length;
      if (n > (counts.at(-1)?.n ?? 0)) counts.push({ t: w.time, n });
    });
    expect(counts.length).toBeGreaterThanOrEqual(3);
    const cycle = EGG_IDLE_SECONDS + EGG_TELEGRAPH_SECONDS + EGG_ATTACK_SECONDS;
    expect(Math.abs(counts[1]!.t - counts[0]!.t - cycle)).toBeLessThanOrEqual(DT);
    counts.forEach((c, i) => expect(c.n).toBe((i + 1) * LOAN.invoices));
    expect(b.phase).not.toBe('absorbing');
  });
});

describe('damage still works, and zero ends the act on its word', () => {
  it('a shot and a landing strike (damageBoss) both take from the balance, from anywhere', () => {
    const w = atLoan();
    const b = w.boss!;
    w.x = b.x + 900;
    const opening = b.hp;
    shoot(w, 10);
    w.step(DT, STILL);
    expect(b.shielded).toBe(false);
    expect(b.hp).toBe(opening - 10);
    w.areas.push({
      x: b.x, y: b.y, age: 0, seconds: 0.1, radius: 60,
      damage: 10, pull: false, tick: false, serial: serial++, delay: DT / 2,
    });
    w.step(DT, STILL);
    expect(b.hp).toBe(opening - 20);
  });

  it('at zero: absorbing, no interest after, CONGRATULATIONS, and a life of one act is won', () => {
    const w = atLoan();
    const b = w.boss!;
    b.hp = 5;
    b.interestIn = DT / 2;
    shoot(w, 10);
    w.step(DT, STILL);
    expect(b.hp).toBe(0);
    expect(b.phase).toBe('absorbing');
    // The renderer shows the word when it sees `absorbing` (ActScene).
    expect(w.act.endWord).toBe('CONGRATULATIONS');
    run(w, 5 / DT, () => {
      if (!w.won) expect(b.hp).toBe(0);
    });
    expect(w.won).toBe(true);
    expect(w.certificate).toMatchObject({ outcome: 'won', actId: 'loan-test', cause: 'natural causes' });
  });

  it('a life of [fixture, fixture] crosses at the first Loan and is won at the second', () => {
    const w = new World({ acts: [FIXTURE, FIXTURE], seed: 11, startingItems: [] });
    for (const index of [0, 1]) {
      expect(w.actIndex).toBe(index);
      w.actTime = FIXTURE.durationSeconds;
      run(w, 1);
      const b = w.boss!;
      expect(b.kind).toBe('loan');
      w.enemies.length = 0;
      w.hp = w.maxHp;
      shoot(w, b.hp);
      run(w, 1);
      expect(b.phase).toBe('absorbing');
      run(w, 3 / DT);
    }
    expect(w.won).toBe(true);
    expect(w.certificate).toMatchObject({ outcome: 'won', actId: 'loan-test', actIndex: 1 });
  });
});

describe('it never shields, never moves, never attacks, and is never raced for', () => {
  it('thirty seconds of the fight: not shielded, not moved, no hostile shot', () => {
    const w = atLoan();
    const b = w.boss!;
    w.x = b.x + 800;
    w.y = b.y;
    const at = { x: b.x, y: b.y };
    run(w, 30 / DT, () => {
      expect(b.shielded).toBe(false);
      expect(w.projectiles.some((p) => p.hostile)).toBe(false);
    });
    expect(w.dead).toBe(false);
    expect(b.x).toBe(at.x);
    expect(b.y).toBe(at.y);
  });

  it('a race declared beside the Loan is inert', () => {
    const w = atLoan(0, { ...FIXTURE, race: { enemyId: 'hormones', absorb: 1 } });
    const b = w.boss!;
    expect(w.raceTarget).toBe(0);
    w.spawnEnemy('hormones');
    const e = w.enemies.at(-1)!;
    e.x = b.x;
    e.y = b.y;
    w.step(DT, STILL);
    expect(w.raceAbsorbed).toBe(0);
    expect(w.dead).toBe(false);
  });
});
