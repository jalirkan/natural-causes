import { describe, expect, it } from 'vitest';
import { CONCEPTION, SCHOOL } from '../../data/acts';
import { ENEMIES } from '../../data/enemies';
import { certificateLines } from '../../scenes/certificate';
import { BOSS_RADIUS, World } from '../world';

/**
 * The Egg is a race the rivals also run (G-006). When it appears, every rival
 * on the field swims for it; `CONCEPTION.race.absorb` of them arriving is
 * someone else's life, and the player's ends.
 */

const DT = 1 / 60;
const STILL = { moveX: 0, moveY: 0 };

/** A world at the boss with an empty field, a quiet Egg and the player off to one side. */
function atTheEgg(act = CONCEPTION, acts?: (typeof CONCEPTION)[]): World {
  const w = new World({ ...(acts ? { acts } : { act }), seed: 7, startingItems: [] });
  w.time = act.durationSeconds;
  w.step(DT, STILL);
  expect(w.boss).not.toBeNull();
  w.enemies.length = 0;
  w.projectiles.length = 0;
  w.gems.length = 0;
  // Long enough that it never fires during a test unless the test says so.
  w.boss!.timer = 999;
  w.x = w.boss!.x + 600;
  w.y = w.boss!.y;
  return w;
}

let uid = 1_000_000;
function place(w: World, id: string, x: number, y: number): void {
  const def = ENEMIES[id]!;
  w.enemies.push({
    uid: uid++,
    hitBySerial: 0,
    hitByAreaSerial: 0,
    def,
    x,
    y,
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
  });
}

const absorb = CONCEPTION.race!.absorb;

describe('the race (G-006)', () => {
  it('exposes its target to the renderer', () => {
    const w = atTheEgg();
    expect(w.raceTarget).toBe(absorb);
    expect(w.raceAbsorbed).toBe(0);
  });

  it('at boss spawn a rival far from the player swims for the Egg, not the player', () => {
    const w = atTheEgg();
    const b = w.boss!;
    // Straight below the Egg, with the player off to the right: a chaser
    // drifts right, a racer goes straight up.
    place(w, 'rival-sperm', b.x, b.y + 500);
    const e = w.enemies[0]!;
    const toEgg = Math.hypot(e.x - b.x, e.y - b.y);
    for (let i = 0; i < 60; i++) w.step(DT, STILL);
    expect(Math.hypot(e.x - b.x, e.y - b.y)).toBeLessThan(toEgg - 30);
    expect(Math.abs(e.x - b.x)).toBeLessThan(0.5);
  });

  it('a rival reaching the corona is absorbed: counted, no gem, no kill', () => {
    const w = atTheEgg();
    const b = w.boss!;
    place(w, 'rival-sperm', b.x, b.y + BOSS_RADIUS + 5);
    const kills = w.kills;
    w.step(DT, STILL);
    expect(w.raceAbsorbed).toBe(1);
    expect(w.enemies).toHaveLength(0);
    expect(w.gems).toHaveLength(0);
    expect(w.kills).toBe(kills);
    expect(w.dead).toBe(false);
  });

  it('reaching the absorb count ends the life: someone else', () => {
    const w = atTheEgg();
    const b = w.boss!;
    w.raceAbsorbed = absorb - 1;
    place(w, 'rival-sperm', b.x, b.y - BOSS_RADIUS - 5);
    w.step(DT, STILL);
    expect(w.raceAbsorbed).toBe(absorb);
    expect(w.dead).toBe(true);
    expect(w.outcome).toBe('died');
    expect(w.certificate?.causeId).toBe('someone-else');
    expect(w.certificate?.cause).toBe('Someone else');
    expect(certificateLines(w.certificate!)[0]).toBe('Cause of death: Someone else.');
  });

  it('the Egg reaching zero first latches (G-033): no further absorption, the act is won', () => {
    const w = atTheEgg();
    const b = w.boss!;
    w.raceAbsorbed = absorb - 1;
    b.hp = 0;
    b.phase = 'absorbing';
    b.timer = 0.1;
    place(w, 'rival-sperm', b.x, b.y + BOSS_RADIUS + 5);
    for (let i = 0; i < 30 && !w.won; i++) w.step(DT, STILL);
    expect(w.raceAbsorbed).toBe(absorb - 1);
    expect(w.dead).toBe(false);
    expect(w.won).toBe(true);
    expect(w.certificate?.causeId).toBe('natural-causes');
  });

  it('the Egg reaching zero first crosses to the next act, where the count starts again', () => {
    const w = atTheEgg(CONCEPTION, [CONCEPTION, SCHOOL]);
    const b = w.boss!;
    w.raceAbsorbed = absorb - 1;
    b.hp = 0;
    b.phase = 'absorbing';
    b.timer = 0.1;
    place(w, 'rival-sperm', b.x, b.y + BOSS_RADIUS + 5);
    for (let i = 0; i < 30 && w.actIndex === 0; i++) w.step(DT, STILL);
    expect(w.dead).toBe(false);
    expect(w.act.id).toBe('school');
    expect(w.raceAbsorbed).toBe(0);
    expect(w.raceTarget).toBe(0);
  });

  it("the Egg's shot hits a racing rival, is consumed, and the kill drops its gem", () => {
    const w = atTheEgg();
    const b = w.boss!;
    place(w, 'rival-sperm', b.x - 400, b.y);
    const e = w.enemies[0]!;
    const kills = w.kills;
    w.projectiles.push({
      x: e.x,
      y: e.y,
      vx: 0,
      vy: 0,
      life: 4,
      damage: 12,
      pierce: 1,
      radius: 10,
      hostile: true,
      source: 'boss',
      serial: 999_999,
    });
    w.step(DT, STILL);
    expect(w.projectiles.filter((p) => p.hostile)).toHaveLength(0);
    expect(w.enemies).toHaveLength(0);
    expect(w.kills).toBe(kills + 1);
    expect(w.gems).toHaveLength(1);
    expect(w.raceAbsorbed).toBe(0);
  });
});

describe('an act with no race keeps the Egg as a fight only', () => {
  it('School has no race: nothing is absorbed and boss shots pass through the crowd', () => {
    expect(SCHOOL.race).toBeUndefined();
    const w = atTheEgg(SCHOOL);
    const b = w.boss!;
    expect(w.raceTarget).toBe(0);
    place(w, 'clique', b.x, b.y + BOSS_RADIUS + 5);
    place(w, 'clique', b.x - 400, b.y);
    const far = w.enemies[1]!;
    w.projectiles.push({
      x: far.x,
      y: far.y,
      vx: 0,
      vy: 0,
      life: 4,
      damage: 12,
      pierce: 1,
      radius: 10,
      hostile: true,
      source: 'boss',
      serial: 999_998,
    });
    const hp = far.hp;
    w.step(DT, STILL);
    expect(w.raceAbsorbed).toBe(0);
    expect(w.enemies).toHaveLength(2);
    expect(far.hp).toBe(hp);
    expect(w.projectiles.filter((p) => p.hostile)).toHaveLength(1);
    expect(w.dead).toBe(false);
  });
});
