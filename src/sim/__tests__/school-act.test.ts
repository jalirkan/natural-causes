import { describe, expect, it } from 'vitest';
import { ACTS, SCHOOL, spawnStreams } from '../../data/acts';
import { ENEMIES } from '../../data/enemies';
import { World } from '../world';

/**
 * School as an ACT, not as three behaviours (those are `school.test.ts`).
 *
 * The schedule is provisional and says so (D-022). What is under test here is
 * the part of it that IS the design — SCHOOL-ROSTER.md §3.6's introduction
 * order — and the presence claims the bots can make about an act nobody has
 * played: everything spawns, the act only gets worse, a run is deterministic.
 * No number in the schedule is asserted, because none of them is a decision.
 */

function alive(world: World, seconds: number, moveX = 0, moveY = 0): void {
  const steps = Math.round(seconds * 60);
  for (let i = 0; i < steps; i++) {
    if (world.offers) {
      world.choose(world.offers[0]!);
      continue;
    }
    world.hp = world.maxHp;
    world.dead = false;
    if (world.won) return;
    world.step(1 / 60, { moveX, moveY });
  }
}

describe('School has a schedule, and it is provisional', () => {
  it('is marked provisional and names what retires the label', () => {
    expect(SCHOOL.provisional).toBeDefined();
    expect(SCHOOL.provisional).toMatch(/D-022/);
  });

  it('is not startable from the title until its art exists', () => {
    // Four of five School sprites have never been generated and there is no
    // boss. The content test ties ACTS to ACT_VISUALS; this one says which
    // side School is currently on, so a future change to either is deliberate.
    expect(ACTS).not.toContain(SCHOOL);
  });

  it('spawns only School enemies', () => {
    for (const wave of SCHOOL.waves) {
      expect(ENEMIES[wave.enemyId]?.act, `"${wave.enemyId}"`).toBe('school');
    }
  });

  it('spawns every School enemy the registry defines', () => {
    const inRoster = Object.values(ENEMIES)
      .filter((d) => d.act === 'school')
      .map((d) => d.id)
      .sort();
    const inSchedule = [...spawnStreams(SCHOOL.waves).keys()].sort();
    expect(inSchedule).toEqual(inRoster);
  });
});

describe('the introduction order is §3.6, and it is the design', () => {
  const firstAppearance = (id: string): number =>
    Math.min(...SCHOOL.waves.filter((w) => w.enemyId === id).map((w) => w.fromSeconds));

  it('clique from the start, dodgeball early, homework from the first third, monitor mid, substitute last', () => {
    const clique = firstAppearance('clique');
    const dodgeball = firstAppearance('dodgeball');
    const homework = firstAppearance('homework');
    const monitor = firstAppearance('hall-monitor');
    const substitute = firstAppearance('substitute-teacher');

    expect(clique).toBe(0);
    expect(dodgeball).toBeGreaterThan(clique);
    expect(dodgeball).toBeLessThan(homework);
    // "from the first third".
    expect(homework).toBeGreaterThanOrEqual(SCHOOL.durationSeconds / 3);
    expect(homework).toBeLessThan(monitor);
    expect(monitor).toBeLessThan(substitute);
  });

  it('is pure contact until the substitute arrives', () => {
    // §3.6: "the act should be pure contact until the substitute arrives, so
    // that gold appearing means something." The substitute is the act's only
    // ranged enemy and therefore the last stream to open.
    const substitute = firstAppearance('substitute-teacher');
    for (const [id, stream] of spawnStreams(SCHOOL.waves)) {
      if (id === 'substitute-teacher') continue;
      expect(stream[0]!.fromSeconds, `"${id}" opens after the substitute`).toBeLessThan(substitute);
    }
  });
});

describe('a School run', () => {
  it('is deterministic', () => {
    const a = new World({ act: SCHOOL, seed: 42 });
    const b = new World({ act: SCHOOL, seed: 42 });
    alive(a, 90, 1, 0);
    alive(b, 90, 1, 0);
    expect(a.kills).toBe(b.kills);
    expect(a.enemies.length).toBe(b.enemies.length);
    expect(a.level).toBe(b.level);
  });

  it('puts every School enemy on the field by the end of the crowd phase', () => {
    // Presence, not calibration: each stream has produced at least one enemy
    // by the time the boss is due. The three that belong to the arena never
    // despawn, so they are still there to be counted; the others are checked
    // as they spawn.
    const world = new World({ act: SCHOOL, seed: 3 });
    const seen = new Set<string>();
    const steps = Math.round(SCHOOL.durationSeconds * 60);
    for (let i = 0; i < steps; i++) {
      if (world.offers) {
        world.choose(world.offers[0]!);
        continue;
      }
      world.hp = world.maxHp;
      world.dead = false;
      world.step(1 / 60, { moveX: 0, moveY: 0 });
      for (const e of world.enemies) seen.add(e.def.id);
    }
    const expected = Object.values(ENEMIES)
      .filter((d) => d.act === 'school')
      .map((d) => d.id)
      .sort();
    expect([...seen].sort()).toEqual(expected);
  });

  it('accumulates the enemies that belong to the arena, and does not accumulate the ones that do not', () => {
    // The property the schedule's rates were chosen around: dodgeballs,
    // monitors and homework are cumulative counts, cliques are a density. A
    // standing player is the worst case for accumulation and the easiest for
    // culling, so both halves are readable from one run.
    const world = new World({ act: SCHOOL, seed: 11 });
    alive(world, SCHOOL.durationSeconds);
    const count = (id: string) => world.enemies.filter((e) => e.def.id === id).length;
    expect(count('dodgeball')).toBeGreaterThan(0);
    expect(count('hall-monitor')).toBeGreaterThan(0);
    // Homework merges on arrival, so its count can stay small while its mass
    // grows; what must be true is that some of it is still there.
    expect(count('homework')).toBeGreaterThan(0);
    // Cliques drift through and are culled; a player standing still for five
    // minutes should not be buried under every clique that ever spawned.
    const cliquesSpawned = SCHOOL.waves
      .filter((w) => w.enemyId === 'clique')
      .reduce((n, w, i, all) => {
        const until = all[i + 1]?.fromSeconds ?? SCHOOL.durationSeconds;
        return n + w.rate * (until - w.fromSeconds);
      }, 0);
    expect(count('clique')).toBeLessThan(cliquesSpawned / 2);
  });
});
