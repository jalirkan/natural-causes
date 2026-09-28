import { describe, expect, it } from 'vitest';
import { ADOLESCENCE, type ActDef, type ReorgBoss } from '../../data/acts';
import {
  ANTIBODY_LEAD,
  ARENA_HEIGHT,
  ARENA_WIDTH,
  BOSS_HP,
  EGG_ATTACK_SECONDS,
  EGG_IDLE_SECONDS,
  EGG_SHOT,
  EGG_TELEGRAPH_SECONDS,
  IFRAMES,
  REORG_MARGIN,
  REORG_MIN_DISTANCE,
  World,
  type EnemyState,
  type ProjectileState,
} from '../world';

/**
 * The Reorg (OFFICE-ROSTER §4, G-004): the memo on the Egg's machine, and at
 * each threshold of its health a restructure — the chart moves, the player's
 * box moves sideways, a meeting closes around them — with nothing added. It
 * never shields, is never raced for, and at zero ends the act on its word.
 *
 * The Office does not exist in this tree yet, and neither does the meeting,
 * so the act here is a FIXTURE: Adolescence's schedule with the Reorg for its
 * boss and no race, and acne standing in for the meeting. The restructure
 * spawns whatever `meetingId` names through `spawnEnemy`, so where it lands is
 * that def's arrival (acne's is the lead; the meeting's will be the player)
 * and what it does there is that def's. The numbers are the roster's
 * placeholders, read off the fixture's `boss` wherever a test depends on them.
 */

/** A power of two, so a phase boundary lands on a known step. */
const DT = 1 / 64;
const STILL = { moveX: 0, moveY: 0 };

const REORG: ReorgBoss = {
  kind: 'reorg',
  thresholds: [2 / 3, 1 / 3],
  lateralMove: 220,
  meetingId: 'acne',
  memoShots: 5,
  memoSpacing: 36,
};
const FIXTURE: ActDef = {
  id: 'reorg-test',
  name: ADOLESCENCE.name,
  durationSeconds: ADOLESCENCE.durationSeconds,
  waves: ADOLESCENCE.waves,
  bossName: 'The Reorg',
  boss: REORG,
  endWord: 'SYNERGY',
  age: ADOLESCENCE.age,
};

/**
 * A world at the Reorg, the field emptied and the player unarmed, standing
 * where they started (the middle of the arena, far from every wall), facing
 * right.
 */
function atReorg(seed = 7, act: ActDef = FIXTURE): World {
  const w = new World({ act, seed, startingItems: [] });
  w.time = act.durationSeconds;
  w.step(DT, STILL);
  expect(w.boss, 'the Reorg did not appear at the act clock').not.toBeNull();
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

const hostile = (w: World): ProjectileState[] => w.projectiles.filter((p) => p.hostile);
const meetings = (w: World): EnemyState[] => w.enemies.filter((e) => e.def.id === REORG.meetingId);

/** Fires one memo on the next step: the telegraph's last instant. */
function fireMemo(w: World): ProjectileState[] {
  const b = w.boss!;
  b.phase = 'telegraph';
  b.timer = DT / 2;
  w.step(DT, STILL);
  expect(b.phase).toBe('attack');
  return hostile(w);
}

/** Health just under the next threshold, as a blow would leave it. */
function underThreshold(w: World, index: number): void {
  const b = w.boss!;
  b.hp = b.maxHp * REORG.thresholds[index]! - 1;
}

describe('the memo: a column across the line to the player, moving as one', () => {
  it("idle, drafted for the Egg's telegraph, then the memo, on the Egg's cycle", () => {
    const w = atReorg();
    const b = w.boss!;
    expect(b.kind).toBe('reorg');
    expect(b.phase).toBe('idle');
    const memos: number[] = [];
    let telegraphAt = -1;
    let seen = 0;
    run(w, 12 / DT, () => {
      w.hp = w.maxHp;
      if (b.phase === 'telegraph' && telegraphAt < 0) telegraphAt = w.time;
      const shots = w.projectiles.filter((p) => p.hostile && p.serial > seen);
      if (shots.length > 0) {
        memos.push(w.time);
        seen = Math.max(...shots.map((p) => p.serial));
        expect(b.phase).toBe('attack');
        expect(shots).toHaveLength(REORG.memoShots);
      }
    });
    expect(telegraphAt).toBeGreaterThan(0);
    expect(memos.length).toBeGreaterThanOrEqual(3);
    expect(Math.abs(memos[0]! - telegraphAt - EGG_TELEGRAPH_SECONDS)).toBeLessThanOrEqual(DT);
    const cycle = EGG_IDLE_SECONDS + EGG_TELEGRAPH_SECONDS + EGG_ATTACK_SECONDS;
    for (let i = 1; i < memos.length; i++) {
      expect(Math.abs(memos[i]! - memos[i - 1]! - cycle)).toBeLessThanOrEqual(DT);
    }
    // The first to the last is that many cycles within one frame, not one
    // frame per cycle: the overshoot is carried (a cycle is 179.2 steps).
    const n = memos.length - 1;
    expect(Math.abs(memos[n]! - memos[0]! - n * cycle)).toBeLessThanOrEqual(DT);
    expect(b.restructures).toBe(0);
  });

  it('`memoShots` of the Egg\'s shot, `memoSpacing` apart across the boss–player line, one velocity', () => {
    const w = atReorg();
    const b = w.boss!;
    // Off every axis, so a column drawn in screen space would fail.
    w.x = b.x + 300;
    w.y = b.y + 400;
    const shots = fireMemo(w);
    expect(shots).toHaveLength(REORG.memoShots);

    const d = Math.hypot(w.x - b.x, w.y - b.y);
    const ux = (w.x - b.x) / d;
    const uy = (w.y - b.y) / d;
    const across: number[] = [];
    for (const p of shots) {
      // On the line through the boss square to the line to the player.
      expect((p.x - b.x) * ux + (p.y - b.y) * uy).toBeCloseTo(0, 9);
      across.push((p.x - b.x) * -uy + (p.y - b.y) * ux);
      // Every shot the same velocity: at the player, at the Egg's speed.
      expect(p.vx).toBeCloseTo(ux * EGG_SHOT.speed, 9);
      expect(p.vy).toBeCloseTo(uy * EGG_SHOT.speed, 9);
      expect(p.vx).toBe(shots[0]!.vx);
      expect(p.vy).toBe(shots[0]!.vy);
      expect(p.damage).toBe(EGG_SHOT.damage);
      expect(p.radius).toBe(EGG_SHOT.radius);
      expect(p.life).toBe(EGG_SHOT.life);
      expect(p.hostile).toBe(true);
      expect(p.owner).toBeUndefined();
    }
    across.sort((a, c) => a - c);
    // Centred on the line: the middle shot is the one aimed at the player.
    expect(across.reduce((s, a) => s + a, 0)).toBeCloseTo(0, 9);
    expect(across[(REORG.memoShots - 1) / 2]).toBeCloseTo(0, 9);
    for (let i = 1; i < across.length; i++) {
      expect(across[i]! - across[i - 1]!).toBeCloseTo(REORG.memoSpacing, 9);
    }
  });

  it('a memo that lands kills in the name of the boss', () => {
    const w = atReorg();
    const b = w.boss!;
    w.x = b.x;
    w.y = b.y + 320;
    w.hp = 1;
    w.invulnerable = 0;
    fireMemo(w);
    run(w, 3 / DT);
    expect(w.dead).toBe(true);
    expect(w.certificate).toMatchObject({
      outcome: 'died',
      actId: 'reorg-test',
      causeId: 'boss',
      cause: 'The Reorg',
    });
    expect(w.certificate!.cause).toBe(FIXTURE.bossName);
  });
});

describe('the restructure: at each threshold, everything moves and nothing is added', () => {
  it('below two thirds: the chart elsewhere, the player moved sideways with i-frames, a meeting, the memo reset', () => {
    const w = atReorg();
    const b = w.boss!;
    const before = { bx: b.x, by: b.y, px: w.x, py: w.y };
    // A memo in its telegraph when the threshold goes is dropped.
    b.phase = 'telegraph';
    b.timer = DT / 2;
    underThreshold(w, 0);
    const hp = b.hp;
    w.step(DT, STILL);

    expect(b.restructures).toBe(1);
    // The chart is somewhere else, inside the arena, far enough from the player.
    expect(b.x !== before.bx || b.y !== before.by).toBe(true);
    expect(b.x).toBeGreaterThanOrEqual(REORG_MARGIN);
    expect(b.x).toBeLessThanOrEqual(ARENA_WIDTH - REORG_MARGIN);
    expect(b.y).toBeGreaterThanOrEqual(REORG_MARGIN);
    expect(b.y).toBeLessThanOrEqual(ARENA_HEIGHT - REORG_MARGIN);
    expect(Math.hypot(b.x - before.px, b.y - before.py)).toBeGreaterThanOrEqual(REORG_MIN_DISTANCE);
    // The player moved `lateralMove` across the line to the chart's new place:
    // never along it, so never nearer (the middle of the field: no wall binds).
    const mx = w.x - before.px;
    const my = w.y - before.py;
    expect(Math.hypot(mx, my)).toBeCloseTo(REORG.lateralMove, 9);
    expect(mx * (b.x - before.px) + my * (b.y - before.py)).toBeCloseTo(0, 6);
    expect(Math.hypot(b.x - w.x, b.y - w.y)).toBeGreaterThanOrEqual(REORG_MIN_DISTANCE);
    expect(w.invulnerable).toBe(IFRAMES);
    // One meeting, around where the player landed (the stand-in arrives at the
    // lead; the meeting will arrive on the player — within the lead either way).
    const m = meetings(w);
    expect(m).toHaveLength(1);
    expect(Math.hypot(m[0]!.x - w.x, m[0]!.y - w.y)).toBeLessThanOrEqual(ANTIBODY_LEAD + 1e-9);
    // The memo starts over; nothing was fired, nothing was added.
    expect(b.phase).toBe('idle');
    expect(b.timer).toBe(EGG_IDLE_SECONDS);
    expect(hostile(w)).toHaveLength(0);
    expect(b.hp).toBe(hp);
    expect(b.maxHp).toBe(BOSS_HP);
    expect(b.shielded).toBe(false);
    // The same memo after it.
    expect(fireMemo(w)).toHaveLength(REORG.memoShots);
  });

  it('i-frames already longer than the restructure\'s are kept', () => {
    const w = atReorg();
    w.invulnerable = 5;
    underThreshold(w, 0);
    w.step(DT, STILL);
    expect(w.boss!.restructures).toBe(1);
    expect(w.invulnerable).toBe(5 - DT);
  });

  it('below one third it happens again, and never a third time', () => {
    const w = atReorg();
    const b = w.boss!;
    underThreshold(w, 0);
    w.step(DT, STILL);
    expect(b.restructures).toBe(1);
    const first = { bx: b.x, by: b.y, px: w.x, py: w.y };

    // Between the thresholds, nothing moves.
    run(w, 4 / DT, () => {
      w.hp = w.maxHp;
    });
    expect(b.restructures).toBe(1);
    expect([b.x, b.y]).toEqual([first.bx, first.by]);
    expect(meetings(w)).toHaveLength(1);

    const before = { bx: b.x, by: b.y, px: w.x, py: w.y };
    underThreshold(w, 1);
    w.step(DT, STILL);
    expect(b.restructures).toBe(2);
    expect(b.x !== before.bx || b.y !== before.by).toBe(true);
    expect(Math.hypot(b.x - before.px, b.y - before.py)).toBeGreaterThanOrEqual(REORG_MIN_DISTANCE);
    expect(Math.hypot(w.x - before.px, w.y - before.py)).toBeLessThanOrEqual(REORG.lateralMove + 1e-9);
    expect(w.invulnerable).toBe(IFRAMES);
    expect(meetings(w)).toHaveLength(2);

    // Down to almost nothing, for long enough for several memos: no third.
    const settled = { bx: b.x, by: b.y };
    b.hp = 1;
    run(w, 10 / DT, () => {
      w.hp = w.maxHp;
    });
    expect(w.dead).toBe(false);
    expect(b.restructures).toBe(REORG.thresholds.length);
    expect([b.x, b.y]).toEqual([settled.bx, settled.by]);
    expect(meetings(w)).toHaveLength(2);
  });

  it('a blow across both thresholds restructures on that step and the next, once each', () => {
    const w = atReorg();
    const b = w.boss!;
    b.hp = b.maxHp * 0.2;
    w.step(DT, STILL);
    expect(b.restructures).toBe(1);
    w.step(DT, STILL);
    expect(b.restructures).toBe(2);
    run(w, 1 / DT, () => {
      w.hp = w.maxHp;
    });
    expect(b.restructures).toBe(2);
    expect(meetings(w)).toHaveLength(2);
  });

  it('at a wall the move is held inside the arena, never longer than `lateralMove`', () => {
    const w = atReorg();
    w.x = 0;
    w.y = 0;
    underThreshold(w, 0);
    w.step(DT, STILL);
    const b = w.boss!;
    expect(b.restructures).toBe(1);
    expect(Math.hypot(b.x, b.y)).toBeGreaterThanOrEqual(REORG_MIN_DISTANCE);
    expect(w.x).toBeGreaterThanOrEqual(0);
    expect(w.y).toBeGreaterThanOrEqual(0);
    expect(w.x).toBeLessThanOrEqual(ARENA_WIDTH);
    expect(w.y).toBeLessThanOrEqual(ARENA_HEIGHT);
    expect(Math.hypot(w.x, w.y)).toBeLessThanOrEqual(REORG.lateralMove + 1e-9);
    expect(w.invulnerable).toBe(IFRAMES);
  });

  it('the same seed restructures to the same places twice; another seed elsewhere', () => {
    const trace = (seed: number): number[] => {
      const w = atReorg(seed);
      const b = w.boss!;
      const out: number[] = [];
      for (const index of [0, 1]) {
        underThreshold(w, index);
        w.step(DT, STILL);
        const m = meetings(w).at(-1)!;
        out.push(b.x, b.y, w.x, w.y, m.x, m.y);
      }
      return out;
    };
    expect(trace(7)).toEqual(trace(7));
    expect(trace(8)).not.toEqual(trace(7));
  });

  it('over many seeds the chart always lands inside the arena and never near the player', () => {
    // About one roll in eighteen lands within REORG_MIN_DISTANCE of a player in
    // the middle of the field, so a hundred and twenty restructures reach the
    // re-roll several times over: taking the first roll whatever it is fails here.
    for (let seed = 1; seed <= 60; seed++) {
      const w = atReorg(seed);
      const b = w.boss!;
      for (const index of [0, 1]) {
        const px = w.x;
        const py = w.y;
        underThreshold(w, index);
        w.step(DT, STILL);
        expect(b.restructures).toBe(index + 1);
        expect(Math.hypot(b.x - px, b.y - py), `seed ${seed}`).toBeGreaterThanOrEqual(REORG_MIN_DISTANCE);
        expect(b.x).toBeGreaterThanOrEqual(REORG_MARGIN);
        expect(b.x).toBeLessThanOrEqual(ARENA_WIDTH - REORG_MARGIN);
        expect(b.y).toBeGreaterThanOrEqual(REORG_MARGIN);
        expect(b.y).toBeLessThanOrEqual(ARENA_HEIGHT - REORG_MARGIN);
      }
    }
  });

  it('a death in the step a threshold goes: the body stays where it fell, no meeting', () => {
    const w = atReorg();
    const b = w.boss!;
    const at = { x: w.x, y: w.y, bx: b.x, by: b.y };
    underThreshold(w, 0);
    // A memo shot on the player, for more than they have.
    w.hp = 1;
    w.invulnerable = 0;
    w.projectiles.push({
      x: w.x, y: w.y, vx: 0, vy: 0,
      life: 1, damage: 50, pierce: 1, radius: 10,
      hostile: true, source: 'boss', serial: serial++,
    });
    w.step(DT, STILL);
    expect(w.dead).toBe(true);
    expect(w.certificate).toMatchObject({ causeId: 'boss', cause: 'The Reorg' });
    expect(b.restructures).toBe(0);
    expect([w.x, w.y, b.x, b.y]).toEqual([at.x, at.y, at.bx, at.by]);
    expect(meetings(w)).toHaveLength(0);
  });

  it('the blow that empties the chart does not restructure it', () => {
    const w = atReorg();
    const b = w.boss!;
    b.hp = 5;
    shoot(w, 10);
    w.step(DT, STILL);
    expect(b.hp).toBe(0);
    expect(b.phase).toBe('absorbing');
    expect(b.restructures).toBe(0);
    expect(meetings(w)).toHaveLength(0);
  });
});

describe('it never shields and is never raced for', () => {
  it('thirty seconds of the fight: never shielded, and damage lands from anywhere', () => {
    const w = atReorg();
    const b = w.boss!;
    w.x = b.x + 900;
    run(w, 30 / DT, () => {
      w.hp = w.maxHp;
      expect(b.shielded).toBe(false);
    });
    const hp = b.hp;
    shoot(w, 10);
    w.step(DT, STILL);
    expect(b.hp).toBe(hp - 10);
    w.areas.push({
      x: b.x, y: b.y, age: 0, seconds: 0.1, radius: 60,
      damage: 10, pull: false, tick: false, serial: serial++, delay: DT / 2,
    });
    w.step(DT, STILL);
    expect(b.hp).toBe(hp - 20);
  });

  it('a race declared beside the Reorg is inert', () => {
    const w = atReorg(7, { ...FIXTURE, race: { enemyId: 'hormones', absorb: 1 } });
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

describe('zero ends the act on its word', () => {
  it('at zero: absorbing, SYNERGY, and a life of one act is won at natural causes', () => {
    const w = atReorg();
    const b = w.boss!;
    b.hp = 5;
    shoot(w, 10);
    w.step(DT, STILL);
    expect(b.phase).toBe('absorbing');
    // The renderer shows the word when it sees `absorbing` (ActScene).
    expect(w.act.endWord).toBe('SYNERGY');
    run(w, 5 / DT);
    expect(w.won).toBe(true);
    expect(w.certificate).toMatchObject({ outcome: 'won', actId: 'reorg-test', cause: 'natural causes' });
  });

  it('a life of [fixture, fixture] crosses at the first Reorg and is won at the second', () => {
    const w = new World({ acts: [FIXTURE, FIXTURE], seed: 11, startingItems: [] });
    for (const index of [0, 1]) {
      expect(w.actIndex).toBe(index);
      w.actTime = FIXTURE.durationSeconds;
      run(w, 1);
      const b = w.boss!;
      expect(b.kind).toBe('reorg');
      expect(b.restructures).toBe(0);
      w.enemies.length = 0;
      w.hp = w.maxHp;
      shoot(w, b.hp);
      run(w, 1);
      expect(b.phase).toBe('absorbing');
      run(w, 3 / DT);
    }
    expect(w.won).toBe(true);
    expect(w.certificate).toMatchObject({ outcome: 'won', actId: 'reorg-test', actIndex: 1 });
  });
});
