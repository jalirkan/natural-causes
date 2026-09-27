import { describe, expect, it } from 'vitest';
import { ACTS, ADOLESCENCE, ALL_ACTS, SCHOOL, spawnStreams } from '../../data/acts';
import { ENEMIES } from '../../data/enemies';
import { World } from '../world';

/**
 * Adolescence as an ACT (ADOLESCENCE-ROSTER.md §3.6), in the image of
 * `school-act.test.ts`.
 *
 * The schedule is provisional and says so (D-022). What is under test is the
 * part of it that IS the design — the introduction order, and gold in the
 * first minute — and the presence claims the bots can make about an act
 * nobody has played: everything spawns, nothing the roster says stays is
 * culled, a run is deterministic. No rate is asserted, because none of them
 * is a decision. The rules that hold for every act live in content.test.ts
 * over ALL_ACTS.
 */

const ids = (): string[] =>
  Object.values(ENEMIES)
    .filter((d) => d.act === 'adolescence')
    .map((d) => d.id)
    .sort();

describe('Adolescence has a schedule, and it is provisional', () => {
  it('is marked provisional, names what retires the label, and says the Egg stands in', () => {
    expect(ADOLESCENCE.provisional).toBeDefined();
    expect(ADOLESCENCE.provisional).toMatch(/D-022/);
    expect(ADOLESCENCE.provisional).toMatch(/Egg stands in/);
  });

  it('is the third act of the life, and not startable until its art exists', () => {
    // No atlas, no player frame, no Prom frame: the content test ties ACTS to
    // ACT_VISUALS, and this says which side Adolescence is on today.
    expect(ALL_ACTS.indexOf(ADOLESCENCE)).toBe(ALL_ACTS.indexOf(SCHOOL) + 1);
    expect(ACTS).not.toContain(ADOLESCENCE);
  });

  it("fights the Egg under Prom's name until Prom's kind exists (§4)", () => {
    expect(ADOLESCENCE.bossName).toBe('Prom');
    expect(ADOLESCENCE.boss.kind).toBe('egg');
    expect(ADOLESCENCE.endWord).toBe('SMILE');
    // The Egg races, so the race is live today: hormones go to the dance.
    expect(ADOLESCENCE.race?.enemyId).toBe('hormones');
    expect(ADOLESCENCE.age).toEqual({ from: 13, to: 18 });
  });
});

describe('the introduction order is §3.6, and it is the design', () => {
  const firstAppearance = (id: string): number =>
    Math.min(...ADOLESCENCE.waves.filter((w) => w.enemyId === id).map((w) => w.fromSeconds));

  it('hormones from the start, then acne, the group chat, the standardised test, driver\'s ed', () => {
    const hormones = firstAppearance('hormones');
    const acne = firstAppearance('acne');
    const chat = firstAppearance('group-chat');
    const test = firstAppearance('standardised-test');
    const car = firstAppearance('drivers-ed');

    expect(hormones).toBe(0);
    expect(acne).toBeGreaterThan(hormones);
    expect(chat).toBeGreaterThan(acne);
    expect(test).toBeGreaterThan(chat);
    expect(car).toBeGreaterThan(test);
  });

  it('gold arrives in the first minute (§1, §2: School\'s order reversed)', () => {
    // The group chat is the act's only ranged enemy. School held gold back so
    // it would mean something; here it arrives early and means it is always
    // there — and content.test.ts already says no stream is dead at the end.
    const ranged = ids().filter((id) => ENEMIES[id]!.ranged !== undefined);
    expect(ranged).toEqual(['group-chat']);
    expect(firstAppearance('group-chat')).toBeLessThan(60);
  });

  it("opens driver's ed last: nothing new arrives after it, only escalation", () => {
    const car = firstAppearance('drivers-ed');
    for (const [id, stream] of spawnStreams(ADOLESCENCE.waves)) {
      if (id === 'drivers-ed') continue;
      expect(stream[0]!.fromSeconds, `"${id}" opens after driver's ed`).toBeLessThan(car);
    }
  });
});

/** Play with health held full, choosing the first offer, until `seconds`. */
function play(world: World, seconds: number, onStep: (w: World) => void = () => {}): void {
  const steps = Math.round(seconds * 60);
  for (let i = 0; i < steps; i++) {
    if (world.offers) {
      world.choose(world.offers[0]!);
      continue;
    }
    world.hp = world.maxHp;
    world.dead = false;
    if (world.won) return;
    world.step(1 / 60, { moveX: 0, moveY: 0 });
    onStep(world);
  }
}

describe('an Adolescence run', () => {
  it('is deterministic', () => {
    const a = new World({ act: ADOLESCENCE, seed: 42 });
    const b = new World({ act: ADOLESCENCE, seed: 42 });
    play(a, 90);
    play(b, 90);
    expect(a.kills).toBe(b.kills);
    expect(a.enemies.length).toBe(b.enemies.length);
    expect(a.level).toBe(b.level);
  });

  it('puts every Adolescence enemy on the field by the end of the crowd phase', () => {
    // Presence, not calibration.
    const world = new World({ act: ADOLESCENCE, seed: 3 });
    const seen = new Set<string>();
    play(world, ADOLESCENCE.durationSeconds, (w) => {
      for (const e of w.enemies) seen.add(e.def.id);
    });
    expect([...seen].sort()).toEqual(ids());
  });

  it('culls nothing: every one the player did not kill or wear is still there at Prom', () => {
    // §3: chasers are never culled (the retakes queue, the chat follows), acne
    // is static (every spot swerved around is on the floor at Prom), and the
    // cars patrol (every one adds a road). With no weapons nothing is killed,
    // and a player standing still walks into no spot, so everything ever seen
    // is standing — checked a second before the boss, so no hormone has yet
    // left for the dance.
    const world = new World({ act: ADOLESCENCE, seed: 11, startingItems: [] });
    const seen = new Map<string, Set<number>>();
    play(world, ADOLESCENCE.durationSeconds - 1, (w) => {
      for (const e of w.enemies) {
        let s = seen.get(e.def.id);
        if (!s) seen.set(e.def.id, (s = new Set()));
        s.add(e.uid);
      }
    });
    expect(world.boss).toBeNull();
    for (const id of ids()) {
      const ever = seen.get(id)?.size ?? 0;
      const standing = world.enemies.filter((e) => e.def.id === id).length;
      expect(ever, `no "${id}" was ever seen`).toBeGreaterThan(0);
      expect(standing, `"${id}" was culled`).toBe(ever);
    }
  });
});
