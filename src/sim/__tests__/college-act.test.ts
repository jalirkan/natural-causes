import { describe, expect, it } from 'vitest';
import { ACTS, ADOLESCENCE, ALL_ACTS, COLLEGE, spawnStreams } from '../../data/acts';
import { ENEMIES } from '../../data/enemies';
import { COLLEGE_ROSTER } from '../../../tools/art/batch';
import { World } from '../world';

/**
 * College as an ACT (COLLEGE-ROSTER.md §3.6, G-045), in the image of
 * `adolescence-act.test.ts`.
 *
 * The schedule is provisional and says so (D-022). What is under test is the
 * part that IS the design — the five enemies and their order, the new fields
 * on the three that carry them, the Loan's declaration — and the presence
 * claims a bot can make about an act nobody has played. No rate is asserted.
 * The verbs themselves are college.test.ts's; the rules for every act are
 * content.test.ts's, over ALL_ACTS.
 */

/** §3's five, in the roster's order; `name` is the §3 heading the certificate prints. */
const FIVE: [string, string][] = [
  ['reading', 'Reading'],
  ['deadline', 'Deadline'],
  ['tuition', 'Tuition'],
  ['group-project', 'Group project'],
  ['registrar', 'Registrar'],
];

const collegeIds = (): string[] =>
  Object.values(ENEMIES)
    .filter((d) => d.act === 'college')
    .map((d) => d.id);

describe('College has a schedule, and it is provisional', () => {
  it('is marked provisional, names what retires the label, and names every new placeholder', () => {
    const label = COLLEGE.provisional;
    expect(label).toBeDefined();
    expect(label).toMatch(/D-022/);
    expect(label).toMatch(/\bperson\b/);
    // The three verbs' numbers and the Loan's four, or they read as decisions.
    expect(label).toMatch(/attach\.tax/);
    expect(label).toMatch(/ranged\.stun/);
    expect(label).toMatch(/weak point/);
    for (const field of ['interestSeconds', 'interestRate', 'cap', 'invoices']) {
      expect(label, field).toContain(field);
    }
  });

  it('is the fourth act of the life, and not yet one the browser plays', () => {
    // In ALL_ACTS after Adolescence (G-045). Not in ACTS until its atlas, its
    // player frame and The Loan's frame exist; content.test.ts ties ACTS to
    // ACT_VISUALS, so moving it in is a one-line change that fails loudly.
    expect(ALL_ACTS.indexOf(COLLEGE)).toBe(ALL_ACTS.indexOf(ADOLESCENCE) + 1);
    expect(ACTS).not.toContain(COLLEGE);
  });

  it('runs 210 seconds from eighteen to twenty-two and ends on CONGRATULATIONS', () => {
    expect(COLLEGE.durationSeconds).toBe(210);
    expect(COLLEGE.age).toEqual({ from: 18, to: 22 });
    expect(COLLEGE.age.from).toBe(ADOLESCENCE.age.to);
    expect(COLLEGE.endWord).toBe('CONGRATULATIONS');
  });

  it('fights The Loan (§4), which nobody races for', () => {
    expect(COLLEGE.bossName).toBe('The Loan');
    expect(COLLEGE.boss).toEqual({
      kind: 'loan',
      enemyId: 'tuition',
      interestSeconds: 5,
      interestRate: 0.06,
      cap: 3,
      invoices: 3,
    });
    expect(COLLEGE.race).toBeUndefined();
  });
});

describe('the five (§3)', () => {
  it('College is exactly these five, in this order, under these names', () => {
    expect(collegeIds()).toEqual(FIVE.map(([id]) => id));
    for (const [id, name] of FIVE) expect(ENEMIES[id]!.name, id).toBe(name);
  });

  it('the waves reference only them, and every one of them', () => {
    for (const wave of COLLEGE.waves) expect(collegeIds(), wave.enemyId).toContain(wave.enemyId);
    expect([...spawnStreams(COLLEGE.waves).keys()].sort()).toEqual(collegeIds().sort());
  });

  it("each one's whyThisStage is the art batch's, verbatim", () => {
    // One sentence, two files: the roster lifts it into both, and a drift
    // between them is the prompt and the game disagreeing about the enemy.
    for (const [id] of FIVE) {
      const spec = COLLEGE_ROSTER.find((s) => s.id === id);
      expect(spec, `no COLLEGE_ROSTER spec for "${id}"`).toBeDefined();
      expect(ENEMIES[id]!.whyThisStage, id).toBe(spec!.whyThisStage);
    }
  });

  it('the three new fields are on the three that carry them, and on nothing else', () => {
    const t = ENEMIES['tuition']!;
    expect(t).toMatchObject({ movement: 'static', contact: 'attach', invulnerable: true, spawnAt: 'lead', xp: 0 });
    expect(t.attach).toEqual({ drag: 0.03, tax: 0.08, persists: true });

    const g = ENEMIES['group-project']!;
    expect(g).toMatchObject({ movement: 'chase', contact: 'damage', weakPoint: true });

    const r = ENEMIES['registrar']!;
    expect(r).toMatchObject({ movement: 'static', contact: 'none' });
    expect(r.ranged).toEqual({
      range: 440,
      consultSeconds: 0.9,
      cooldownSeconds: 4,
      projectileSpeed: 240,
      damage: 4,
      stun: 0.5,
    });

    expect(ENEMIES['deadline']).toMatchObject({ movement: 'cross', contact: 'damage', patrol: true });
    expect(ENEMIES['reading']).toMatchObject({ movement: 'chase', contact: 'damage', spawnAt: 'edge' });

    for (const def of Object.values(ENEMIES)) {
      if (def.id === 'tuition') continue;
      expect(def.attach?.tax, def.id).toBeUndefined();
      expect(def.attach?.persists, def.id).toBeUndefined();
    }
    for (const def of Object.values(ENEMIES)) {
      if (def.id !== 'group-project') expect(def.weakPoint, def.id).toBeUndefined();
      if (def.id !== 'registrar') expect(def.ranged?.stun, def.id).toBeUndefined();
    }
  });
});

describe('the introduction order is §3.6, and it is the design', () => {
  const firstAppearance = (id: string): number =>
    Math.min(...COLLEGE.waves.filter((w) => w.enemyId === id).map((w) => w.fromSeconds));

  it('reading from the start, then tuition, the registrar, the group project, the deadline', () => {
    const order = ['reading', 'tuition', 'registrar', 'group-project', 'deadline'].map(firstAppearance);
    expect(order[0]).toBe(0);
    for (let i = 1; i < order.length; i++) expect(order[i]).toBeGreaterThan(order[i - 1]!);
  });

  it('nothing new after 130s: the last eighty seconds are escalation', () => {
    for (const [id, stream] of spawnStreams(COLLEGE.waves)) {
      expect(stream[0]!.fromSeconds, `"${id}" opens after 130s`).toBeLessThanOrEqual(130);
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

/** A whole act of steps: about a second alone, several on a busy machine. */
const LONG = 30_000;

describe('a College run', () => {
  it('is deterministic', () => {
    const a = new World({ act: COLLEGE, seed: 42 });
    const b = new World({ act: COLLEGE, seed: 42 });
    play(a, 120);
    play(b, 120);
    expect(a.kills).toBe(b.kills);
    expect(a.enemies.length).toBe(b.enemies.length);
    expect(a.level).toBe(b.level);
    expect(a.xp).toBe(b.xp);
    expect(a.enemies.map((e) => e.weakQuadrant)).toEqual(b.enemies.map((e) => e.weakQuadrant));
  }, LONG);

  it('puts every College enemy on the field, and culls none of them, before The Loan', () => {
    // Presence, not calibration. Two chasers, two statics and a patrol:
    // nothing here is culled, so with no weapons and a player who never moves
    // (and so never walks into an invoice ahead of them) everything ever seen
    // is still standing a second before the boss.
    const world = new World({ act: COLLEGE, seed: 11, startingItems: [] });
    const seen = new Map<string, Set<number>>();
    play(world, COLLEGE.durationSeconds - 1, (w) => {
      for (const e of w.enemies) {
        let s = seen.get(e.def.id);
        if (!s) seen.set(e.def.id, (s = new Set()));
        s.add(e.uid);
      }
    });
    expect(world.boss).toBeNull();
    for (const id of collegeIds()) {
      const ever = seen.get(id)?.size ?? 0;
      const standing = world.enemies.filter((e) => e.def.id === id).length;
      expect(ever, `no "${id}" was ever seen`).toBeGreaterThan(0);
      expect(standing, `"${id}" was culled`).toBe(ever);
    }
  }, LONG);
});

describe('the life is four acts long now', () => {
  /** Runs an act's clock out and fells its boss, skipping the exit (life.test.ts). */
  function cross(w: World): void {
    w.actTime = w.act.durationSeconds;
    play(w, 1 / 60);
    const b = w.boss!;
    b.hp = 0;
    b.phase = 'absorbing';
    b.timer = 0;
    play(w, 1 / 60);
  }

  it('Prom falling crosses into College, and The Loan falling is natural causes at twenty-two', () => {
    const w = new World({ acts: ALL_ACTS, seed: 5, startingItems: [] });
    for (let i = 0; i < ALL_ACTS.indexOf(COLLEGE); i++) cross(w);
    expect(w.act).toBe(COLLEGE);
    expect(w.won).toBe(false);
    cross(w);
    expect(w.won).toBe(true);
    expect(w.certificate).toEqual({
      outcome: 'won',
      actId: 'college',
      actName: 'College',
      actIndex: ALL_ACTS.indexOf(COLLEGE),
      age: 22,
      causeId: 'natural-causes',
      cause: 'natural causes',
    });
  });
});
