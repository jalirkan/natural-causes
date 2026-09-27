import { describe, expect, it } from 'vitest';
import { CONCEPTION, type ActDef } from '../../../src/data/acts';
import { ENEMIES } from '../../../src/data/enemies';
import { World, type ProjectileState } from '../../../src/sim/world';
import { POLICIES, SHOT_LOOKAHEAD_SECONDS, ShotLog, decideOnce } from '../bots';

/**
 * The bots read aimed shots (AUDIT part three: they never read
 * `w.projectiles`, so they walked through every one).
 *
 * Every world here is empty — no waves, no items, nothing that moves but the
 * shot placed in it — so a heading can only have come from the shot. The
 * numbers asserted are geometry, not the placeholders' values: a shot passing
 * 5px from the player is on a collision course under any sane look-ahead, and
 * one passing 200px wide is not.
 */

const QUIET: ActDef = { ...CONCEPTION, id: 'shots-fixture', waves: [] };
const SIGHTED = POLICIES.find((p) => p.name === 'midpiece+wake')!;
const BLIND = POLICIES.find((p) => p.name === 'random')!;
const SUBSTITUTE = ENEMIES['substitute-teacher']!;
const DT = 1 / 60;
/** The Egg's and the substitute's shot speed. */
const SPEED = 260;

function quiet(): World {
  return new World({ acts: [QUIET], seed: 7, startingItems: [] });
}

let serial = 1_000_000;
/** A hostile shot placed relative to the player; the Egg's unless overridden. */
function shot(w: World, dx: number, dy: number, vx: number, vy: number, over: Partial<ProjectileState> = {}): ProjectileState {
  const p: ProjectileState = {
    x: w.x + dx,
    y: w.y + dy,
    vx,
    vy,
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

const fromSubstitute = { owner: SUBSTITUTE, source: SUBSTITUTE.id, damage: 8 };

describe('steering: the sidestep', () => {
  it('steps off a shot on a collision course, perpendicular to its path and away from it', () => {
    const w = quiet();
    // Nothing to react to: the bot coasts the way it faces, +x.
    expect(decideOnce(SIGHTED, w)).toEqual({ moveX: 1, moveY: 0 });

    // Falling straight down, passing 5px on the player's +x side. The path is
    // along y, so the sidestep is along x — and away is -x, against the coast.
    shot(w, 5, -150, 0, SPEED);
    const move = decideOnce(SIGHTED, w);
    expect(move.moveX).toBeLessThan(-0.99);
    expect(Math.abs(move.moveY)).toBeLessThan(0.01);
  });

  it('dead on, keeps going the way it was already heading', () => {
    const w = quiet();
    shot(w, 0, -150, 0, SPEED);
    expect(decideOnce(SIGHTED, w).moveX).toBeGreaterThan(0.99);
    w.facingX = -1;
    expect(decideOnce(SIGHTED, w).moveX).toBeLessThan(-0.99);
  });

  it('the random policy is blind to it — the control arm', () => {
    const w = quiet();
    const before = decideOnce(BLIND, w);
    shot(w, 5, -150, 0, SPEED);
    expect(decideOnce(BLIND, w)).toEqual(before);
    expect(decideOnce(SIGHTED, w)).not.toEqual(before);
  });

  it('a shot that will miss produces no sidestep', () => {
    const cases: Array<[string, (w: World) => void]> = [
      ['passes 200px wide', (w) => shot(w, 200, -150, 0, SPEED)],
      ['already past, moving away', (w) => shot(w, 5, 60, 0, SPEED)],
      ['on course but beyond the look-ahead', (w) => shot(w, 5, -(SPEED * SHOT_LOOKAHEAD_SECONDS + 100), 0, SPEED)],
      ['on course but expires short', (w) => shot(w, 5, -150, 0, SPEED, { life: 0.1 })],
      ['on course but the player’s own', (w) => shot(w, 5, -150, 0, SPEED, { hostile: false, source: 'lash' })],
    ];
    for (const [name, place] of cases) {
      const w = quiet();
      const before = decideOnce(SIGHTED, w);
      place(w);
      expect(decideOnce(SIGHTED, w), name).toEqual(before);
    }
  });

  it('beats a gem, loses to a white cell close by', () => {
    const w = quiet();
    // Away from the shot is -x; the gem pulls +x.
    shot(w, 5, -150, 0, SPEED);
    w.gems.push({ x: w.x + 120, y: w.y, value: 1 });
    expect(decideOnce(SIGHTED, w).moveX).toBeLessThan(0);

    const v = quiet();
    shot(v, 5, -150, 0, SPEED);
    v.spawnEnemy('white-cell');
    const cell = v.enemies[0]!;
    cell.x = v.x - 60;
    cell.y = v.y;
    expect(decideOnce(SIGHTED, v).moveX).toBeGreaterThan(0);
  });
});

describe('ShotLog: seen, hit, and by whom', () => {
  function stepOnce(w: World, log: ShotLog): void {
    log.look(w);
    w.step(DT, { moveX: 0, moveY: 0 });
    log.settle(w, DT);
  }

  it('counts a shot that came and hurt, by owner, and ignores one passing wide', () => {
    const w = quiet();
    const log = new ShotLog();
    shot(w, 0, -20, 0, SPEED);
    shot(w, 200, -150, 0, SPEED, fromSubstitute);
    const hp = w.hp;
    stepOnce(w, log);
    expect(w.hp).toBeLessThan(hp);
    expect(log.seen).toBe(1);
    expect(log.hit).toBe(1);
    expect(log.by).toEqual({ boss: { seen: 1, hit: 1 } });
  });

  it('a shot consumed through i-frames was seen, not a hit', () => {
    const w = quiet();
    const log = new ShotLog();
    w.invulnerable = 1;
    shot(w, 0, -20, 0, SPEED, fromSubstitute);
    const hp = w.hp;
    stepOnce(w, log);
    expect(w.projectiles.filter((p) => p.hostile)).toHaveLength(0);
    expect(w.hp).toBe(hp);
    expect(log.seen).toBe(1);
    expect(log.hit).toBe(0);
    expect(log.by).toEqual({ 'substitute-teacher': { seen: 1, hit: 0 } });
  });

  it('two shots arriving together: both seen, one hit — the i-frames take the other', () => {
    const w = quiet();
    const log = new ShotLog();
    shot(w, 0, -20, 0, SPEED);
    shot(w, 0, 20, 0, -SPEED, fromSubstitute);
    stepOnce(w, log);
    expect(log.seen).toBe(2);
    expect(log.hit).toBe(1);
    expect(log.by['boss']!.seen + log.by['substitute-teacher']!.seen).toBe(2);
    expect(log.by['boss']!.hit + log.by['substitute-teacher']!.hit).toBe(1);
  });

  it('counts a shot once however many steps it is in view', () => {
    const w = quiet();
    const log = new ShotLog();
    shot(w, 0, -150, 0, SPEED);
    for (let i = 0; i < 60 && w.projectiles.some((p) => p.hostile); i++) stepOnce(w, log);
    expect(w.projectiles.some((p) => p.hostile)).toBe(false);
    expect(log.seen).toBe(1);
    expect(log.hit).toBe(1);
  });
});
