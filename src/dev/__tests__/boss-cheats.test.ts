import { describe, expect, it } from 'vitest';
import { ALL_ACTS, DECLINE, FAMILY, OFFICE, type ActDef } from '../../data/acts';
import { BOSS_HP, World, type BossState } from '../../sim/world';
import { MISS_WINDOW_SECONDS, TIME_CUT_SECONDS, bossCheats, bossReadout, type BossCheat } from '../boss-cheats';

/**
 * The dev panel's boss row (AUDIT 75, 95, 127): what it reads and which
 * cheats it offers per kind, and that each write lands in a real World the
 * way the panel says it does. Dev only; nothing here is a number anyone
 * should read as the game's.
 */

/** A power of two, so the Mortgage's five-second window is a whole number of steps. */
const DT = 1 / 64;
const STILL = { moveX: 0, moveY: 0 };

/** A world at `act`'s boss, nothing scheduled, the player unarmed. */
function atBoss(act: ActDef, seed = 7): World {
  const quiet: ActDef = { ...act, waves: [] };
  const w = new World({ act: quiet, seed, startingItems: [] });
  w.time = quiet.durationSeconds;
  w.step(DT, STILL);
  expect(w.boss, `${act.id}'s boss did not appear at the act clock`).not.toBeNull();
  w.enemies.length = 0;
  w.projectiles.length = 0;
  w.gems.length = 0;
  return w;
}

/** Steps with the player held alive, taking the first offer if one waits. */
function run(w: World, seconds: number): void {
  for (let i = 0; i < Math.round(seconds / DT); i++) {
    if (w.offers) {
      w.choose(w.offers[0]!);
      continue;
    }
    if (w.won || w.dead) return;
    w.hp = w.maxHp;
    w.step(DT, STILL);
  }
}

const labels = (b: BossState): string[] => bossCheats(b).map((c) => c.label);

function cheat(b: BossState, label: string): BossCheat {
  const c = bossCheats(b).find((x) => x.label === label);
  if (!c) throw new Error(`no "${label}" for ${b.kind} (offered: ${labels(b).join(', ')})`);
  return c;
}

describe('the row is chosen per boss kind', () => {
  it('every act’s boss: Time a clock and −30 s, the Mortgage miss window, every other hurt boss; kill always', () => {
    const seen = new Set<string>();
    for (const act of ALL_ACTS) {
      const b = atBoss(act).boss!;
      seen.add(b.kind);
      const expected =
        b.kind === 'time'
          ? [`−${TIME_CUT_SECONDS} s`, 'kill']
          : b.kind === 'mortgage'
            ? ['−50%', 'miss window', 'kill']
            : ['−50%', 'hurt boss', 'kill'];
      expect(labels(b), act.id).toEqual(expected);
      // Every cheat says it is one.
      for (const c of bossCheats(b)) expect(c.hint, `${act.id} ${c.label}`).toMatch(/^cheat: /);
      // The smoke's panel check.
      expect(bossReadout(b, act.boss), act.id).not.toMatch(/\b(NaN|undefined)\b/);
    }
    // The schedule still fights the kinds this row was written for.
    expect([...seen].sort()).toEqual(expect.arrayContaining(['mortgage', 'reorg', 'time']));
  });

  it('reads Time as its clock, never its inert health', () => {
    const b = atBoss(DECLINE).boss!;
    if (DECLINE.boss.kind !== 'time') throw new Error('Decline does not fight Time');
    expect(b.hp).toBe(BOSS_HP);
    expect(bossReadout(b, DECLINE.boss)).toBe(`time · ${DECLINE.boss.seconds} s`);
    expect(bossReadout(b, DECLINE.boss)).not.toMatch(/hp/);
    // Rounded up, as the HUD rounds it.
    b.secondsLeft = 12.2;
    expect(bossReadout(b, DECLINE.boss)).toBe('time · 13 s');
  });

  it('reads the Mortgage as health and windows paid, every other kind as health', () => {
    const m = atBoss(FAMILY).boss!;
    expect(bossReadout(m, FAMILY.boss)).toBe(`${BOSS_HP} / ${BOSS_HP} hp · paid 0/12`);
    const r = atBoss(OFFICE).boss!;
    expect(bossReadout(r, OFFICE.boss)).toBe(`${BOSS_HP} / ${BOSS_HP} hp`);
  });

  it('once the outcome has latched, only −50% and kill are left (and at Time, kill)', () => {
    for (const act of [OFFICE, FAMILY, DECLINE]) {
      const b = atBoss(act).boss!;
      b.phase = 'absorbing';
      expect(labels(b), act.id).toEqual(b.kind === 'time' ? ['kill'] : ['−50%', 'kill']);
    }
  });
});

describe('Time: −30 s', () => {
  it('takes thirty seconds off the clock and holds it at 0', () => {
    const b = atBoss(DECLINE).boss!;
    b.secondsLeft = 45;
    cheat(b, '−30 s').apply(b);
    expect(b.secondsLeft).toBe(15);
    cheat(b, '−30 s').apply(b);
    expect(b.secondsLeft).toBe(0);
    cheat(b, '−30 s').apply(b);
    expect(b.secondsLeft).toBe(0);
    expect(b.hp).toBe(BOSS_HP);
  });

  it('at 0 the sim ends the life won on its next step, and the hand does not jump', () => {
    const w = atBoss(DECLINE);
    run(w, 1);
    const b = w.boss!;
    const hand = b.hand;
    const filed = b.filed;
    while (b.secondsLeft > 0) cheat(b, '−30 s').apply(b);
    expect(b.hand).toBe(hand);
    expect(b.filed).toBe(filed);
    run(w, DT);
    expect(b.phase).toBe('absorbing');
    expect(b.hand).toBe(hand);
    run(w, 2);
    expect(w.won).toBe(true);
  });

  it('kill runs the clock out with it, so the bar reads 0 through the exit', () => {
    const w = atBoss(DECLINE);
    const b = w.boss!;
    cheat(b, 'kill').apply(b);
    expect(b.secondsLeft).toBe(0);
    expect(b.phase).toBe('absorbing');
    expect(bossReadout(b, DECLINE.boss)).toBe('time · 0 s');
    run(w, 2);
    expect(w.won).toBe(true);
  });
});

describe('the Mortgage: miss window', () => {
  if (FAMILY.boss.kind !== 'mortgage') throw new Error('Family does not fight the Mortgage');
  const MORTGAGE = FAMILY.boss;
  const INSTALMENT = BOSS_HP / MORTGAGE.instalments;
  const bills = (w: World) => w.enemies.filter((e) => e.def.id === MORTGAGE.feeId && e.fee !== true).length;
  const rooms = (w: World) => w.enemies.filter((e) => e.def.id === MORTGAGE.roomId).length;

  /** A friendly shot parked on the boss: through the gate, as a weapon's is. */
  function pay(w: World, damage: number): void {
    const b = w.boss!;
    w.projectiles.push({ x: b.x, y: b.y, vx: 0, vy: 0, life: 1, damage, pierce: 1, radius: 10, hostile: false, serial: 900_000 });
    run(w, DT);
  }

  it('writes accepted 0 and the window clock to 0.05s', () => {
    const b = atBoss(FAMILY).boss!;
    cheat(b, 'miss window').apply(b);
    expect(b.accepted).toBe(0);
    expect(b.windowTimer).toBe(MISS_WINDOW_SECONDS);
  });

  it('an untouched window closes at once, missed: nothing paid, a room and a bill', () => {
    const w = atBoss(FAMILY);
    const b = w.boss!;
    cheat(b, 'miss window').apply(b);
    run(w, MISS_WINDOW_SECONDS + DT);
    expect(b.paid).toBe(0);
    expect(b.hp).toBe(BOSS_HP);
    expect(b.windowTimer).toBeGreaterThan(MORTGAGE.instalmentSeconds - 2 * DT);
    expect(bills(w)).toBe(1);
    expect(rooms(w)).toBe(1);
  });

  // The refund is load-bearing: `paid` is read off the health by rounding
  // (AUDIT 73), so zeroing `accepted` alone would leave a met window's
  // instalment off the health and the close would count it paid.
  for (const share of [1, 0.6, 0.3]) {
    it(`a window ${share} met is still missed: what it took goes back on the health`, () => {
      const w = atBoss(FAMILY);
      const b = w.boss!;
      pay(w, INSTALMENT * share);
      expect(b.accepted).toBeCloseTo(INSTALMENT * share, 9);
      cheat(b, 'miss window').apply(b);
      expect(b.accepted).toBe(0);
      expect(b.hp).toBeCloseTo(BOSS_HP, 9);
      run(w, MISS_WINDOW_SECONDS + DT);
      expect(b.paid).toBe(0);
      expect(b.hp).toBe(BOSS_HP);
      expect(bills(w)).toBe(1);
    });
  }

  it('a later window missed leaves the earlier payments where they were', () => {
    const w = atBoss(FAMILY);
    const b = w.boss!;
    pay(w, INSTALMENT);
    run(w, MORTGAGE.instalmentSeconds);
    expect(b.paid).toBe(1);
    pay(w, INSTALMENT);
    cheat(b, 'miss window').apply(b);
    run(w, MISS_WINDOW_SECONDS + DT);
    expect(b.paid).toBe(1);
    expect(b.hp).toBe((BOSS_HP * (MORTGAGE.instalments - 1)) / MORTGAGE.instalments);
  });
});

describe('hurt boss', () => {
  it('a third of the maximum, landing at or under each third in spite of float, never below 1', () => {
    for (const max of [320, 352, 416, 1000, 1056, 999.7]) {
      const b = { kind: 'egg', hp: max, maxHp: max, phase: 'idle' } as BossState;
      const hurt = cheat(b, 'hurt boss');
      hurt.apply(b);
      expect(b.hp / b.maxHp, `${max} once`).toBeLessThanOrEqual(2 / 3);
      expect(b.hp / b.maxHp, `${max} once`).toBeGreaterThan(2 / 3 - 1e-6);
      hurt.apply(b);
      expect(b.hp / b.maxHp, `${max} twice`).toBeLessThanOrEqual(1 / 3);
      hurt.apply(b);
      expect(b.hp, `${max} thrice`).toBe(1);
      hurt.apply(b);
      expect(b.hp, `${max} again`).toBe(1);
    }
  });

  it('crosses one of the Reorg’s thresholds per press, and never latches its exit', () => {
    if (OFFICE.boss.kind !== 'reorg') throw new Error('The Office does not fight the Reorg');
    expect(OFFICE.boss.thresholds).toEqual([2 / 3, 1 / 3]);
    const w = atBoss(OFFICE);
    const b = w.boss!;
    cheat(b, 'hurt boss').apply(b);
    run(w, DT);
    expect(b.restructures).toBe(1);
    cheat(b, 'hurt boss').apply(b);
    run(w, DT);
    expect(b.restructures).toBe(2);
    cheat(b, 'hurt boss').apply(b);
    run(w, 0.5);
    expect(b.hp).toBe(1);
    expect(b.phase).not.toBe('absorbing');
  });
});
