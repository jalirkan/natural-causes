import { describe, expect, it } from 'vitest';
import { InputLog, SECTORS, headingSector } from '../input-log';
import type { Input } from '../../sim/world';

const DT = 1 / 60;
const IDLE: Input = { moveX: 0, moveY: 0 };
const EAST: Input = { moveX: 1, moveY: 0 };
const SOUTH: Input = { moveX: 0, moveY: 1 };
/** A unit heading at `deg` degrees from +x toward +y. */
const at = (deg: number): Input => ({
  moveX: Math.cos((deg * Math.PI) / 180),
  moveY: Math.sin((deg * Math.PI) / 180),
});

/** One step per hold, of exactly `seconds`, alternating sectors so each ends the last. */
function logOf(seconds: number[]): InputLog {
  const log = new InputLog();
  seconds.forEach((s, i) => log.record(s, i % 2 ? SOUTH : EAST));
  log.record(DT, IDLE);
  return log;
}

describe('headingSector', () => {
  it('is null when idle, and for a NaN input', () => {
    expect(headingSector(IDLE)).toBeNull();
    expect(headingSector({ moveX: NaN, moveY: 0 })).toBeNull();
  });

  it('gives eight distinct sectors, one per compass point, each centred on it', () => {
    const sectors = Array.from({ length: SECTORS }, (_, k) => headingSector(at(k * 45)));
    expect(sectors).toEqual([0, 1, 2, 3, 4, 5, 6, 7]);
    expect(new Set(sectors).size).toBe(8);
  });

  it('puts the eight keyboard vectors, unnormalised diagonals included, on eight sectors', () => {
    const keys: Input[] = [];
    for (const x of [-1, 0, 1]) for (const y of [-1, 0, 1]) if (x || y) keys.push({ moveX: x, moveY: y });
    expect(new Set(keys.map(headingSector)).size).toBe(8);
  });

  it('reads -180° and 180° as the same sector', () => {
    expect(headingSector({ moveX: -1, moveY: -0 })).toBe(headingSector({ moveX: -1, moveY: 0 }));
  });
});

describe('the input log', () => {
  it('holds a constant heading for N steps as one hold of N*dt, filed when it changes', () => {
    const log = new InputLog();
    for (let i = 0; i < 120; i++) log.record(DT, EAST);
    expect(log.holds()).toEqual([]);
    log.record(DT, SOUTH);
    expect(log.holds()).toHaveLength(1);
    expect(log.holds()[0]).toBeCloseTo(120 * DT, 9);
  });

  it('holds across many steps without drifting', () => {
    const log = new InputLog();
    for (let i = 0; i < 60 * 600; i++) log.record(DT, EAST);
    log.record(DT, IDLE);
    expect(log.holds()[0]).toBeCloseTo(600, 6);
  });

  it('ends a hold on idle, counts the idle beside it, and is not itself a hold', () => {
    const log = new InputLog();
    for (let i = 0; i < 30; i++) log.record(DT, EAST);
    for (let i = 0; i < 90; i++) log.record(DT, IDLE);
    for (let i = 0; i < 60; i++) log.record(DT, EAST);
    log.record(DT, IDLE);
    const holds = log.holds();
    expect(holds).toHaveLength(2);
    expect(holds[0]).toBeCloseTo(0.5, 9);
    expect(holds[1]).toBeCloseTo(1, 9);
    const s = log.summary();
    expect(s.idleSeconds).toBeCloseTo(91 * DT, 9);
    expect(s.totalSeconds).toBeCloseTo(181 * DT, 9);
  });

  it('ignores a zero, negative or NaN dt rather than filing a zero-second hold', () => {
    const log = new InputLog();
    log.record(DT, EAST);
    log.record(0, SOUTH);
    log.record(-DT, SOUTH);
    log.record(NaN, SOUTH);
    log.record(Infinity, SOUTH);
    log.record(DT, EAST);
    log.record(DT, IDLE);
    expect(log.holds()).toEqual([2 * DT]);
    expect(log.summary().totalSeconds).toBeCloseTo(3 * DT, 12);
  });

  it('keeps a 44° drift inside one sector', () => {
    const log = new InputLog();
    for (let d = -22; d <= 22; d += 0.5) log.record(DT, at(d));
    log.record(DT, IDLE);
    expect(log.holds()).toHaveLength(1);
  });

  it('splits any 46° drift, wherever in the sector it starts', () => {
    for (let start = -22.5; start < 22.5; start += 0.5) {
      const log = new InputLog();
      for (let d = start; d <= start + 46; d += 0.5) log.record(DT, at(d));
      log.record(DT, IDLE);
      expect(log.holds().length, `from ${start}°`).toBeGreaterThanOrEqual(2);
    }
  });

  it('counts a wobble across a boundary as a change: the hands, not the intent', () => {
    const log = new InputLog();
    for (const d of [20, 23, 22, 23, 22]) log.record(DT, at(d));
    log.record(DT, IDLE);
    expect(log.holds()).toHaveLength(5);
  });
});

describe('summary', () => {
  it('is all zeros on an empty log', () => {
    expect(new InputLog().summary()).toEqual({ count: 0, median: 0, p90: 0, idleSeconds: 0, totalSeconds: 0 });
  });

  it('takes the midpoint median and the nearest-rank p90, as the bot report does', () => {
    const s = logOf([0.3, 0.1, 0.8, 0.5, 0.2, 1.0, 0.4, 0.7, 0.9, 0.6]).summary();
    expect(s.count).toBe(10);
    expect(s.median).toBeCloseTo(0.55, 12);
    expect(s.p90).toBe(0.9);
  });

  it('takes the middle value for an odd count, and p90 of one hold is that hold', () => {
    expect(logOf([0.2, 0.9, 0.4]).summary().median).toBe(0.4);
    expect(logOf([0.25]).summary().p90).toBe(0.25);
  });
});

describe('toJSON / fromJSON', () => {
  it('round-trips through a string, open hold included', () => {
    const log = logOf([0.3, 0.5]);
    for (let i = 0; i < 12; i++) log.record(DT, SOUTH);
    const back = InputLog.fromJSON(JSON.parse(JSON.stringify(log)));
    expect(back.toJSON()).toEqual(log.toJSON());
    expect(back.summary()).toEqual(log.summary());
    // The open hold resumes rather than splitting at the save.
    for (const l of [log, back]) for (let i = 0; i < 12; i++) l.record(DT, SOUTH);
    log.record(DT, EAST);
    back.record(DT, EAST);
    expect(back.holds()).toEqual(log.holds());
    expect(back.holds()[2]).toBeCloseTo(24 * DT, 9);
  });

  it('reads garbage as an empty log and drops malformed fields', () => {
    for (const junk of [null, 3, 'x', [], {}]) expect(InputLog.fromJSON(junk).summary().count).toBe(0);
    const back = InputLog.fromJSON({ holds: [0.4, -1, 'a', NaN, 0], sector: 9, open: 1, idleSeconds: -2 });
    expect(back.toJSON()).toEqual({ holds: [0.4], sector: null, open: 0, idleSeconds: 0, totalSeconds: 0 });
  });
});
