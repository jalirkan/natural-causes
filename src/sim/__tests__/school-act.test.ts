import { describe, expect, it } from 'vitest';
import { ACTS, SCHOOL, spawnStreams } from '../../data/acts';
import { ENEMIES } from '../../data/enemies';
import { DESPAWN_RADIUS, World } from '../world';

/**
 * School as an ACT, not as three behaviours (those are `school.test.ts`).
 *
 * The schedule is provisional and says so (D-022). What is under test here is
 * the part of it that IS the design — SCHOOL-ROSTER.md §3.6's introduction
 * order — and the presence claims the bots can make about an act nobody has
 * played: everything spawns, the act only gets worse, a run is deterministic.
 * No rate is asserted, because none of them is a decision; the only times
 * asserted are §3.6's own words — clique from 0s, homework within the first
 * third. The rules that hold for every act (an act spawns only its own
 * enemies, and all of them) live in content.test.ts over ALL_ACTS.
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

  it('is startable from the title: its art exists and the life is two acts', () => {
    // School's sprites are drawn (D-025) and the Egg stands in for its boss,
    // so it is in ACTS. The content test ties ACTS to ACT_VISUALS and checks
    // every frame is in the atlas; this one says which side School is on, so
    // a future change to either is deliberate.
    expect(ACTS).toContain(SCHOOL);
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
    // "from the first third": it starts within the first third of the act,
    // not after it. The first draft had this the other way round and passed
    // only because the placeholder sits exactly on the boundary.
    expect(homework).toBeLessThanOrEqual(SCHOOL.durationSeconds / 3);
    expect(homework).toBeLessThan(monitor);
    expect(monitor).toBeLessThan(substitute);
  });

  it('opens the substitute last (§3.6: pure contact until it arrives)', () => {
    // "The act should be pure contact until the substitute arrives, so that
    // gold appearing means something." The substitute is the act's only
    // ranged enemy — and its attack is not built (SCHOOL-ROSTER §7), so today
    // "last stream to open" is the whole of what this test can say.
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

  it('keeps the enemies that belong to the arena and culls the ones that do not', () => {
    // The property the placeholder rates assume, tested without reference to
    // any rate. With no weapons nothing is killed, so a dodgeball
    // or monitor ever seen is one still on the field, while cliques drift
    // through and are culled at DESPAWN_RADIUS. Counting uids ever seen
    // against uids alive separates "never despawns" from "was not killed" —
    // the first draft compared alive cliques to a spawn total and was really
    // asserting the schedule's late rates plus the build's kill rate.
    const world = new World({ act: SCHOOL, seed: 11, startingItems: [] });
    const seen = new Map<string, Set<number>>();
    const steps = Math.round(SCHOOL.durationSeconds * 60);
    for (let i = 0; i < steps; i++) {
      if (world.offers) {
        world.choose(world.offers[0]!);
        continue;
      }
      world.hp = world.maxHp;
      world.dead = false;
      world.step(1 / 60, { moveX: 0, moveY: 0 });
      for (const e of world.enemies) {
        let s = seen.get(e.def.id);
        if (!s) seen.set(e.def.id, (s = new Set()));
        s.add(e.uid);
      }
    }
    const standing = (id: string) => world.enemies.filter((e) => e.def.id === id).length;
    const ever = (id: string) => seen.get(id)?.size ?? 0;

    // Arena enemies: nothing killed, nothing culled, so everything ever seen is
    // still there.
    expect(ever('dodgeball')).toBeGreaterThan(0);
    expect(standing('dodgeball')).toBe(ever('dodgeball'));
    expect(ever('hall-monitor')).toBeGreaterThan(0);
    expect(standing('hall-monitor')).toBe(ever('hall-monitor'));
    // Homework merges on arrival, so fewer piles can stand than ever landed;
    // what must be true is that the paper is still there.
    expect(ever('homework')).toBeGreaterThan(0);
    expect(standing('homework')).toBeGreaterThan(0);
    expect(standing('homework')).toBeLessThanOrEqual(ever('homework'));

    // Cliques: some have been culled, and none stands beyond the cull radius
    // (with one second of drift as margin for where in the step the cull runs).
    expect(ever('clique')).toBeGreaterThan(standing('clique'));
    const margin = ENEMIES['clique']!.speed;
    for (const e of world.enemies) {
      if (e.def.id !== 'clique') continue;
      expect(Math.hypot(e.x - world.x, e.y - world.y)).toBeLessThanOrEqual(DESPAWN_RADIUS + margin);
    }
  });
});
