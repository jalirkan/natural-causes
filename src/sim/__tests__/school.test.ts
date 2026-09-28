import { describe, expect, it } from 'vitest';
import type { ActDef } from '../../data/acts';
import { CONCEPTION } from '../../data/acts';
import { ENEMIES } from '../../data/enemies';
import {
  ARENA_WIDTH,
  DESPAWN_RADIUS,
  IFRAMES,
  PLAYER_BASE_SPEED,
  PLAYER_RADIUS,
  TRAIL_SECONDS,
  World,
  type EnemyState,
} from '../world';

/**
 * The three behaviours SCHOOL-ROSTER.md §4 says `EnemyDef` could not express:
 * `bounce`, `patrol`, `merge`.
 *
 * All three are tested by placing an enemy and stepping, rather than by
 * running an act, so each behaviour is isolated from any schedule. School's
 * schedule exists (`SCHOOL` in acts.ts, provisional under D-022) and
 * `school-act.test.ts` runs it; the fixture below has no waves at all, spawns
 * nothing by itself, and carries no number that could be mistaken for a
 * balance decision.
 */
const EMPTY_ACT: ActDef = {
  id: 'school-behaviour-fixture',
  name: 'Fixture',
  durationSeconds: 300,
  bossName: 'Fixture',
  boss: { kind: 'egg' },
  age: { from: 0, to: 0 },
  waves: [],
};

/**
 * A world whose enemies all arrive at one predictable point.
 *
 * `spawnOverride` is the sim's existing A/B hook (it isolated G-019 from
 * G-020). Used here because merging happens ON ARRIVAL and the default entry
 * point is a random angle on a 780px ring, so two piles never land on each
 * other by chance. Homework's own entry point, `trail`, is tested separately
 * below; the override is kept here because it lands every pile on one point
 * without depending on where the player has been.
 */
function arrivingAtLead(seed = 7): World {
  return new World({ act: EMPTY_ACT, seed, spawnOverride: 'lead' });
}

/** A world with nothing in it, and one enemy placed exactly where we want it. */
function place(
  id: string,
  at: { x: number; y: number; vx?: number; vy?: number },
): { world: World; enemy: EnemyState } {
  const world = new World({ act: EMPTY_ACT, seed: 7 });
  world.spawnEnemy(id);
  const enemy = world.enemies[0]!;
  enemy.x = at.x;
  enemy.y = at.y;
  if (at.vx !== undefined) enemy.vx = at.vx;
  if (at.vy !== undefined) enemy.vy = at.vy;
  return { world, enemy };
}

function step(world: World, seconds: number, moveX = 0, moveY = 0): void {
  const steps = Math.round(seconds * 60);
  for (let i = 0; i < steps; i++) {
    if (world.offers) {
      world.choose(world.offers[0]!);
      continue;
    }
    world.hp = world.maxHp;
    world.dead = false;
    world.step(1 / 60, { moveX, moveY });
  }
}

describe('dodgeball — bounce (§3.2)', () => {
  it('reflects off the arena edge and keeps going', () => {
    const { world, enemy } = place('dodgeball', {
      x: ARENA_WIDTH - 10,
      y: 600,
      vx: 165,
      vy: 0,
    });
    step(world, 0.5);
    expect(world.enemies.length, 'the ball left the field').toBe(1);
    expect(enemy.vx, 'did not turn around').toBeLessThan(0);
    expect(enemy.x).toBeLessThan(ARENA_WIDTH + 10);
  });

  it('reflects only the component that crossed, so it goes somewhere new', () => {
    // This is the whole difference between a bounce and a patrol, and it is
    // the difference between "the arena edges matter" and "there is a thing
    // on a rail".
    const { world, enemy } = place('dodgeball', { x: 5, y: 600, vx: -120, vy: -80 });
    step(world, 0.2);
    expect(enemy.vx).toBeGreaterThan(0);
    expect(enemy.vy, 'the untouched component was reversed too').toBeLessThan(0);
  });

  it('does not turn around before it has arrived', () => {
    // Enemies enter from a spawn ring that is outside the arena more often
    // than not. A naive "past the bound, reverse" test bounces the ball back
    // out of the field it was entering, and the enemy never plays.
    const { world, enemy } = place('dodgeball', { x: -300, y: 600, vx: 165, vy: 0 });
    step(world, 0.5);
    expect(enemy.vx, 'bounced on the way in').toBeGreaterThan(0);
    expect(enemy.x).toBeGreaterThan(-300);
  });

  it('never despawns, however far the player walks away', () => {
    const { world, enemy } = place('dodgeball', { x: 200, y: 200, vx: 0, vy: 0 });
    world.x = 200 + DESPAWN_RADIUS + 400;
    world.y = 200;
    step(world, 1);
    expect(world.enemies).toContain(enemy);
  });

  it('a drifting Conception enemy is still culled at the same distance', () => {
    // The exemption is for the three that belong to the arena, not a hole in
    // the cull. If this stops passing, the exemption has widened.
    const { world, enemy } = place('spermicide', { x: 200, y: 200, vx: 0, vy: 0 });
    world.x = 200 + DESPAWN_RADIUS + 400;
    world.y = 200;
    step(world, 0.2);
    expect(world.enemies).not.toContain(enemy);
  });
});

describe('hall monitor — patrol (§3.4)', () => {
  it('reverses both components at the end and comes back along its own line', () => {
    const { world, enemy } = place('hall-monitor', { x: 40, y: 900, vx: -18, vy: -13 });
    const before = { x: enemy.x, y: enemy.y, vx: enemy.vx, vy: enemy.vy };

    step(world, 6);
    expect(enemy.vx, 'never turned around').toBe(-before.vx);
    expect(enemy.vy).toBe(-before.vy);

    // Retracing, not merely returning: the point it reaches after the turn is
    // on the line it went out on. Cross product of the two offsets is zero.
    const after = { x: enemy.x, y: enemy.y };
    const cross = (after.x - before.x) * before.vy - (after.y - before.y) * before.vx;
    expect(Math.abs(cross)).toBeLessThan(0.001);
  });

  it('never reacts to the player, wherever the player goes', () => {
    const { world, enemy } = place('hall-monitor', { x: 1600, y: 1100, vx: 22, vy: 0 });
    world.x = 1600;
    world.y = 1400;
    step(world, 2, 0, -1);
    expect(enemy.vy).toBe(0);
    expect(enemy.vx).toBe(22);
  });

  it('closes a line rather than occupying a point — it crosses the whole arena', () => {
    const { world, enemy } = place('hall-monitor', { x: 20, y: 500, vx: 22, vy: 0 });
    const seen: number[] = [];
    for (let i = 0; i < 60 * 200; i++) {
      world.hp = world.maxHp;
      world.step(1 / 60, { moveX: 0, moveY: 0 });
      seen.push(enemy.x);
    }
    expect(Math.min(...seen)).toBeLessThan(100);
    expect(Math.max(...seen)).toBeGreaterThan(ARENA_WIDTH - 100);
  });
});

describe('homework — merge, static, solid (§3.3)', () => {
  const def = ENEMIES['homework']!;

  it('does not move, ever', () => {
    const { world, enemy } = place('homework', { x: 900, y: 900 });
    step(world, 3, 1, 1);
    expect(enemy.x).toBe(900);
    expect(enemy.y).toBe(900);
  });

  it('a pile that lands on a pile makes one larger pile, not two', () => {
    const world = arrivingAtLead();
    world.spawnEnemy('homework');
    const pile = world.enemies[0]!;
    const before = { radius: pile.radius, hp: pile.hp, xp: pile.xp, size: pile.displaySize };

    // Same player, same heading, so the second one lands on the first.
    world.spawnEnemy('homework');

    expect(world.enemies.length, 'two piles where there should be one').toBe(1);
    // Area-preserving: the paper that arrived is the paper that is there.
    expect(pile.radius).toBeCloseTo(Math.hypot(before.radius, def.radius), 6);
    expect(pile.radius).toBeGreaterThan(before.radius);
    expect(pile.displaySize).toBeGreaterThan(before.size);
    expect(pile.hp).toBe(before.hp + def.hp);
    expect(pile.xp).toBe(before.xp + def.xp);
  });

  it('grows with every pile that lands on it, and never stops mattering', () => {
    const world = arrivingAtLead();
    for (let i = 0; i < 9; i++) world.spawnEnemy('homework');
    const pile = world.enemies[0]!;
    expect(world.enemies.length).toBe(1);
    // Nine piles of radius 30, area-preserving: sqrt(9) x 30.
    expect(pile.radius).toBeCloseTo(def.radius * 3, 6);
    expect(pile.hp).toBe(def.hp * 9);
  });

  it('does not merge with a pile it is not touching', () => {
    const world = arrivingAtLead();
    world.spawnEnemy('homework');
    world.x += 2000;
    world.spawnEnemy('homework');
    expect(world.enemies.length).toBe(2);
  });

  it('drops the merged pile’s XP, not one pile’s', () => {
    const world = arrivingAtLead();
    world.spawnEnemy('homework');
    world.spawnEnemy('homework');
    expect(world.enemies.length).toBe(1);

    world.enemies[0]!.hp = 0;
    step(world, 1 / 60);
    expect(world.gems.map((g) => g.value)).toEqual([def.xp * 2]);
  });

  it('is solid: the player cannot stand inside it', () => {
    const { world, enemy } = place('homework', { x: 900, y: 900 });
    world.x = 900;
    world.y = 900;
    step(world, 1 / 60);
    const d = Math.hypot(world.x - enemy.x, world.y - enemy.y);
    expect(d).toBeGreaterThanOrEqual(enemy.radius + PLAYER_RADIUS - 0.001);
  });

  it('is solid to everything else as well', () => {
    const { world, enemy } = place('homework', { x: 900, y: 900 });
    world.x = 1800;
    world.y = 900;
    world.spawnEnemy('rival-sperm');
    const rival = world.enemies[1]!;
    rival.x = 905;
    rival.y = 902;
    step(world, 1 / 60);
    const d = Math.hypot(rival.x - enemy.x, rival.y - enemy.y);
    expect(d).toBeGreaterThanOrEqual(enemy.radius + rival.radius - 0.001);
  });

  it('cannot hurt the player, and cannot hand out i-frames either', () => {
    // `contact: 'none'` rather than zero damage. Zero damage still takes the
    // `hurt` path, which sets IFRAMES — so a harmless enemy would become a
    // free source of invulnerability, which is a nastier bug than a wrong
    // number because nothing about it looks wrong.
    //
    // Stepped raw rather than through the helper: the helper tops the player
    // up every frame, which is exactly what this test must not do.
    const { world } = place('homework', { x: 900, y: 900 });
    world.x = 900;
    world.y = 900;
    world.hp = 50;
    for (let i = 0; i < 120; i++) world.step(1 / 60, { moveX: 1, moveY: 0 });
    expect(world.hp).toBe(50);
    expect(world.invulnerable).toBe(0);
  });

  it('is destructible — it is not the antibody', () => {
    // §3.3 wants clearing it to be a real choice against the act clock, which
    // requires that it can be cleared at all. The antibody's `invulnerable`
    // is the opposite ruling for the opposite reason (G-018).
    expect(def.invulnerable).toBeUndefined();
    expect(def.hp).toBeGreaterThan(0);
  });
});

describe('none of this reaches Conception', () => {
  it('no Conception enemy declares a School behaviour', () => {
    for (const def of Object.values(ENEMIES)) {
      if (def.act !== 'conception') continue;
      expect(def.bounce, `${def.id}`).toBeUndefined();
      expect(def.patrol, `${def.id}`).toBeUndefined();
      expect(def.merge, `${def.id}`).toBeUndefined();
      expect(def.movement, `${def.id}`).not.toBe('static');
      expect(def.contact, `${def.id}`).not.toBe('none');
    }
  });

  it('a Conception run is still deterministic and still kills things', () => {
    // The per-instance radius/XP change touched every hit test in the file.
    // If it moved anything, it moved it for Conception too.
    const a = new World({ act: CONCEPTION, seed: 99 });
    const b = new World({ act: CONCEPTION, seed: 99 });
    step(a, 45, 1, 0);
    step(b, 45, 1, 0);
    expect(a.kills).toBe(b.kills);
    expect(a.kills).toBeGreaterThan(0);
    expect(a.x).toBe(b.x);
  });

  it('every enemy still has a radius and an XP value at spawn', () => {
    const world = new World({ act: EMPTY_ACT, seed: 3 });
    for (const id of Object.keys(ENEMIES)) {
      world.enemies.length = 0;
      world.spawnEnemy(id);
      // A hold (the meeting, OFFICE-ROSTER §3.4) never enters `enemies`; it
      // lives in `holds`, sized by its def.
      if (ENEMIES[id]!.hold) {
        expect(world.holds.length, id).toBe(1);
        world.holds.length = 0;
        continue;
      }
      const e = world.enemies[0]!;
      expect(e.radius, id).toBe(ENEMIES[id]!.radius);
      expect(e.xp, id).toBe(ENEMIES[id]!.xp);
      expect(e.displaySize, id).toBe(ENEMIES[id]!.displaySize);
    }
  });
});

/**
 * The three placeholders D-022 says School is owed (SCHOOL-ROSTER §8). What is
 * under test is the behaviour's shape; every number is read off the def or
 * the world's exported constant, so none of them is asserted as a decision.
 */
describe('substitute teacher — consult, then fire (§3.5)', () => {
  const def = ENEMIES['substitute-teacher']!;
  const ranged = def.ranged!;
  const hostile = (w: World) => w.projectiles.filter((p) => p.hostile);

  /** Unarmed, so Lash does not kill it; well inside range, walking in. */
  function inRange(): { world: World; enemy: EnemyState } {
    const world = new World({ act: EMPTY_ACT, seed: 7 });
    const px = world.x;
    const py = world.y;
    const out = place('substitute-teacher', { x: px + 300, y: py, vx: -def.speed, vy: 0 });
    out.world.items.clear();
    return out;
  }

  it('has an attack at all — ranged pressure is the point of School', () => {
    expect(ranged).toBeDefined();
    expect(ranged.range).toBeGreaterThan(0);
  });

  it('stops to consult, then fires one hostile shot at the player, then resumes', () => {
    const { world, enemy } = inRange();
    step(world, 1 / 60);
    expect(enemy.consult, 'did not start consulting with the player in range').toBeGreaterThan(0);
    const heldAt = enemy.x;

    step(world, ranged.consultSeconds - 3 / 60);
    expect(enemy.x, 'walked through its own telegraph').toBe(heldAt);
    expect(hostile(world), 'fired before the consult ended').toHaveLength(0);

    step(world, 4 / 60);
    const shots = hostile(world);
    expect(shots).toHaveLength(1);
    const shot = shots[0]!;
    expect(shot.owner).toBe(def);
    expect(shot.source).toBe('substitute-teacher');
    // Aimed at the player: velocity points from the substitute to them.
    const toX = world.x - heldAt;
    const toY = world.y - enemy.y;
    const cos = (shot.vx * toX + shot.vy * toY) / (Math.hypot(shot.vx, shot.vy) * Math.hypot(toX, toY));
    expect(cos).toBeGreaterThan(0.999);
    expect(Math.hypot(shot.vx, shot.vy)).toBeCloseTo(ranged.projectileSpeed, 6);

    step(world, 0.5);
    expect(enemy.x, 'never resumed after firing').toBeLessThan(heldAt);
  });

  it('does not consult with the player out of range', () => {
    const world = new World({ act: EMPTY_ACT, seed: 7 });
    const { world: w, enemy } = place('substitute-teacher', {
      x: world.x + ranged.range + 200,
      y: world.y,
      vx: 0,
      vy: 0,
    });
    w.items.clear();
    step(w, 1);
    expect(enemy.consult).toBe(0);
    expect(hostile(w)).toHaveLength(0);
  });

  it('cannot fire again until its cooldown has passed', () => {
    const { world, enemy } = inRange();
    const seen = new Set<number>();
    const firedAt: number[] = [];
    let consultedDuringCooldown = false;
    const seconds = ranged.consultSeconds * 2 + ranged.cooldownSeconds + 1;
    for (let i = 0; i < Math.round(seconds * 60); i++) {
      step(world, 1 / 60);
      for (const p of hostile(world)) {
        if (seen.has(p.serial)) continue;
        seen.add(p.serial);
        firedAt.push(world.time);
      }
      if (
        firedAt.length === 1 &&
        world.time - firedAt[0]! < ranged.cooldownSeconds - 1 / 60 &&
        enemy.consult > 0
      ) {
        consultedDuringCooldown = true;
      }
    }
    expect(firedAt, 'expected exactly two shots in one cooldown and two consults').toHaveLength(2);
    expect(consultedDuringCooldown, 'began a consult inside its cooldown').toBe(false);
    const gap = firedAt[1]! - firedAt[0]!;
    expect(gap).toBeGreaterThanOrEqual(ranged.cooldownSeconds);
    // The cooldown runs from the shot, and the next consult follows it.
    expect(gap).toBeCloseTo(ranged.cooldownSeconds + ranged.consultSeconds, 1);
  });

  it('a death to its shot puts the substitute on the certificate, not the boss', () => {
    const { world } = inRange();
    for (let i = 0; i < 600 && hostile(world).length === 0; i++) step(world, 1 / 60);
    expect(hostile(world)).toHaveLength(1);

    world.hp = 1;
    world.invulnerable = 0;
    for (let i = 0; i < 600 && !world.dead; i++) world.step(1 / 60, { moveX: 0, moveY: 0 });
    expect(world.dead).toBe(true);
    expect(world.certificate).toMatchObject({ causeId: 'substitute-teacher', cause: def.name });
  });
});

describe('homework — arrives where the player was (§3.3)', () => {
  it('declares the trail as its entry point', () => {
    expect(ENEMIES['homework']!.spawnAt).toBe('trail');
  });

  it('lands where the player was TRAIL_SECONDS ago, not where they are', () => {
    const world = new World({ act: EMPTY_ACT, seed: 7, startingItems: [] });
    const path: { t: number; x: number; y: number }[] = [];
    for (let i = 0; i < 300; i++) {
      world.step(1 / 60, { moveX: 1, moveY: 0 });
      path.push({ t: world.time, x: world.x, y: world.y });
    }
    world.spawnEnemy('homework');
    const pile = world.enemies[0]!;

    const target = world.time - TRAIL_SECONDS;
    const then = path.reduce((a, b) => (Math.abs(b.t - target) < Math.abs(a.t - target) ? b : a));
    // Within a tenth of a second's walking of where they were.
    expect(Math.hypot(pile.x - then.x, pile.y - then.y)).toBeLessThan(PLAYER_BASE_SPEED * 0.1);
    expect(Math.hypot(pile.x - world.x, pile.y - world.y), 'landed on the player').toBeGreaterThan(
      PLAYER_BASE_SPEED * TRAIL_SECONDS * 0.8,
    );
  });

  it('still merges on arrival: two piles landing on the same trail point are one', () => {
    const world = new World({ act: EMPTY_ACT, seed: 7, startingItems: [] });
    step(world, 4, 1, 0);
    world.spawnEnemy('homework');
    world.spawnEnemy('homework');
    expect(world.enemies.length).toBe(1);
  });

  it('paper dropped where the player stood merges into the pile already there', () => {
    // The first pile lands on a player standing still and pushes them to its
    // edge; the next lands where they were before the push, which is the pile.
    const world = new World({ act: EMPTY_ACT, seed: 7, startingItems: [] });
    step(world, 3);
    world.spawnEnemy('homework');
    const pile = world.enemies[0]!;
    const radius = pile.radius;
    step(world, 1);
    world.spawnEnemy('homework');
    expect(world.enemies.length).toBe(1);
    expect(pile.radius).toBeGreaterThan(radius);
  });
});

describe('hall monitor — the stop (§3.4)', () => {
  const def = ENEMIES['hall-monitor']!;
  const stun = def.contactStun!;

  /** Unarmed player touching a monitor that is standing still. */
  function touching(): { world: World; enemy: EnemyState } {
    const world = new World({ act: EMPTY_ACT, seed: 7 });
    const out = place('hall-monitor', { x: world.x + def.radius, y: world.y, vx: 0, vy: 0 });
    out.world.items.clear();
    return out;
  }

  it('its touch deals its damage, sets the i-frames, and starts the stop — all three', () => {
    const { world } = touching();
    world.hp = 100;
    world.step(1 / 60, { moveX: 0, moveY: 0 });
    expect(world.hp).toBe(100 - def.contactDamage);
    // The i-frames run from the END of the stop (AUDIT part three, 18): a
    // stop equal to IFRAMES otherwise expired with them on one frame, and the
    // contact check ran before the player could move.
    expect(world.invulnerable).toBeCloseTo(stun + IFRAMES, 6);
    expect(world.stunTimer).toBeCloseTo(stun, 6);
  });

  it('stops movement for the window and no longer', () => {
    const { world, enemy } = touching();
    step(world, 1 / 60);
    expect(world.stunTimer).toBeGreaterThan(0);
    // Out of the way, so only the one touch counts.
    enemy.x = 200;
    enemy.y = 200;

    const at = { x: world.x, y: world.y };
    step(world, stun - 2 / 60, 1, 0);
    expect(world.x, 'moved while stopped').toBe(at.x);
    expect(world.y).toBe(at.y);

    step(world, 4 / 60, 1, 0);
    expect(world.x, 'still stopped after the window').toBeGreaterThan(at.x);
    expect(world.stunTimer).toBe(0);
  });

  it('a second touch refreshes the window, never extends it', () => {
    const { world } = touching();
    step(world, 1 / 60);
    step(world, stun / 2);
    // Still touching; strip the i-frames so the second touch lands.
    world.invulnerable = 0;
    step(world, 1 / 60);
    expect(world.stunTimer).toBeLessThanOrEqual(stun + 1e-9);
    expect(world.stunTimer).toBeGreaterThan(stun / 2);
  });

  it('an enemy without contactStun does not stop the player', () => {
    const { world } = place('dodgeball', { x: 0, y: 0, vx: 0, vy: 0 });
    const ball = world.enemies[0]!;
    ball.x = world.x + ball.radius;
    ball.y = world.y;
    world.items.clear();
    world.step(1 / 60, { moveX: 0, moveY: 0 });
    expect(world.invulnerable).toBeGreaterThan(0);
    expect(world.stunTimer).toBe(0);
  });
});

describe('none of the three placeholders reaches Conception', () => {
  it('no Conception enemy is ranged, stuns, or arrives on the trail', () => {
    for (const def of Object.values(ENEMIES)) {
      if (def.act !== 'conception') continue;
      expect(def.ranged, `${def.id}`).toBeUndefined();
      expect(def.contactStun, `${def.id}`).toBeUndefined();
      expect(def.spawnAt, `${def.id}`).not.toBe('trail');
    }
  });

  it('a Conception run never stuns the player and fires no owned shot', () => {
    const world = new World({ act: CONCEPTION, seed: 99 });
    for (let i = 0; i < 60 * 45; i++) {
      step(world, 1 / 60, 1, 0);
      expect(world.stunTimer).toBe(0);
      expect(world.projectiles.some((p) => p.owner !== undefined)).toBe(false);
    }
  });
});
