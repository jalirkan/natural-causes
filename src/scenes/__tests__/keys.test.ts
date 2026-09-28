import { describe, expect, it } from 'vitest';
import { oncePerEvent } from '../keys';

/** What Phaser 3.90 hands a listener: the DOM event, replayed by identity. */
const press = (code: string, timeStamp: number) => ({ code, timeStamp });

describe('oncePerEvent', () => {
  it('runs a handler once however often Phaser replays the event', () => {
    const seen: string[] = [];
    const onKey = oncePerEvent((e: { code: string }) => seen.push(e.code));
    const p = press('KeyP', 10);
    const m = press('KeyM', 12);
    // The queue as Phaser re-runs it: [P], then [P, M], then [P, M, A].
    onKey(p);
    onKey(p);
    onKey(m);
    onKey(p);
    onKey(m);
    onKey(press('KeyA', 14));
    expect(seen).toEqual(['KeyP', 'KeyM', 'KeyA']);
  });

  it('still takes a second genuine press of the same key', () => {
    let count = 0;
    const onKey = oncePerEvent(() => count++);
    onKey(press('KeyP', 10));
    onKey(press('KeyP', 10));
    expect(count).toBe(2);
  });

  it('keeps a record per handler, so every listener hears an event once', () => {
    let pause = 0;
    let unlock = 0;
    const onP = oncePerEvent(() => pause++);
    const onAny = oncePerEvent(() => unlock++);
    const p = press('KeyP', 10);
    for (let i = 0; i < 3; i++) {
      onP(p);
      onAny(p);
    }
    expect([pause, unlock]).toEqual([1, 1]);
  });
});
