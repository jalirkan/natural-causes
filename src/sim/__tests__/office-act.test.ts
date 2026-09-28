import { describe, expect, it } from 'vitest';
import { ACTS, ALL_ACTS, COLLEGE, OFFICE, spawnStreams } from '../../data/acts';
import { ENEMIES } from '../../data/enemies';
import { OFFICE_ROSTER } from '../../../tools/art/batch';
import { World } from '../world';

/**
 * The Office as an ACT (OFFICE-ROSTER.md §3.6, G-048), in the image of
 * `college-act.test.ts`.
 *
 * The schedule is provisional and says so (D-022). What is under test is the
 * part that IS the design — the five enemies and their order, the new fields
 * on the four that carry them, The Reorg's declaration — and the presence
 * claims a bot can make about an act nobody has played. No rate is asserted.
 * The verbs themselves are office.test.ts's; the rules for every act are
 * content.test.ts's, over ALL_ACTS.
 */

/** §3's five, in the roster's order; `name` is the §3 heading the certificate prints. */
const FIVE: [string, string][] = [
  ['reply-all', 'Reply-all'],
  ['commute', 'Commute'],
  ['ping', 'Ping'],
  ['meeting', 'Meeting'],
  ['performance-review', 'Performance review'],
];

const officeIds = (): string[] =>
  Object.values(ENEMIES)
    .filter((d) => d.act === 'office')
    .map((d) => d.id);

describe('The Office has a schedule, and it is provisional', () => {
  it('is marked provisional, names what retires the label, and names every new placeholder', () => {
    const label = OFFICE.provisional;
    expect(label).toBeDefined();
    expect(label).toMatch(/D-022/);
    expect(label).toMatch(/G-048/);
    expect(label).toMatch(/\bperson\b/);
    // The four verbs' numbers and The Reorg's, or they read as decisions.
    for (const field of ['split', 'attach.cooldownMultiplier', 'hold', 'ranged.xpLoss']) {
      expect(label, field).toContain(field);
    }
    for (const field of ['thresholds', 'lateralMove', 'memoShots', 'memoSpacing', 'BOSS_HP']) {
      expect(label, field).toContain(field);
    }
  });

  it('is the fifth act of the life, and the browser plays it', () => {
    // In ALL_ACTS after College (G-048), so the bots and the content rules
    // run it; and in ACTS after College too, now its atlas, its player frame
    // and The Reorg's frame exist (content.test.ts ties ACTS to ACT_VISUALS
    // and checks every frame it draws is in the atlas).
    expect(ALL_ACTS.indexOf(OFFICE)).toBe(ALL_ACTS.indexOf(COLLEGE) + 1);
    expect(ALL_ACTS[ALL_ACTS.length - 1]).toBe(OFFICE);
    expect(ACTS.indexOf(OFFICE)).toBe(ACTS.indexOf(COLLEGE) + 1);
  });

  it('runs 180 seconds from twenty-two to thirty-four and ends on SYNERGY', () => {
    expect(OFFICE.id).toBe('office');
    expect(OFFICE.name).toBe('The Office');
    expect(OFFICE.durationSeconds).toBe(180);
    expect(OFFICE.age).toEqual({ from: 22, to: 34 });
    expect(OFFICE.age.from).toBe(COLLEGE.age.to);
    expect(OFFICE.endWord).toBe('SYNERGY');
  });

  it('fights The Reorg (§4), which nobody races for', () => {
    expect(OFFICE.bossName).toBe('The Reorg');
    expect(OFFICE.boss).toEqual({
      kind: 'reorg',
      thresholds: [2 / 3, 1 / 3],
      lateralMove: 220,
      meetingId: 'meeting',
      memoShots: 5,
      memoSpacing: 64,
    });
    // The hold it closes around the player is the act's own, and scheduled.
    if (OFFICE.boss.kind !== 'reorg') throw new Error('not the Reorg');
    expect(ENEMIES[OFFICE.boss.meetingId]?.act).toBe('office');
    expect(ENEMIES[OFFICE.boss.meetingId]?.hold).toBeDefined();
    expect(OFFICE.race).toBeUndefined();
  });
});

describe('the five (§3)', () => {
  it('The Office is exactly these five, in this order, under these names', () => {
    expect(officeIds()).toEqual(FIVE.map(([id]) => id));
    for (const [id, name] of FIVE) {
      expect(ENEMIES[id]!.name, id).toBe(name);
      expect(ENEMIES[id]!.frame, id).toBe(`${id}.png`);
    }
  });

  it('the waves reference only them, and every one of them', () => {
    for (const wave of OFFICE.waves) expect(officeIds(), wave.enemyId).toContain(wave.enemyId);
    expect([...spawnStreams(OFFICE.waves).keys()].sort()).toEqual(officeIds().sort());
  });

  it("each one's whyThisStage is the art batch's, verbatim", () => {
    // One sentence, two files: the roster lifts it into both, and a drift
    // between them is the prompt and the game disagreeing about the enemy.
    for (const [id] of FIVE) {
      const spec = OFFICE_ROSTER.find((s) => s.id === id);
      expect(spec, `no OFFICE_ROSTER spec for "${id}"`).toBeDefined();
      expect(ENEMIES[id]!.whyThisStage, id).toBe(spec!.whyThisStage);
    }
  });

  it('§3.6, transcribed', () => {
    expect(ENEMIES['reply-all']).toMatchObject({
      movement: 'chase',
      contact: 'damage',
      split: { children: 2, generations: 3, scale: 0.75 },
      hp: 6,
      speed: 48,
      contactDamage: 4,
      radius: 14,
      displaySize: 48,
      xp: 2,
    });
    expect(ENEMIES['commute']).toMatchObject({
      movement: 'cross',
      contact: 'damage',
      patrol: true,
      hp: 40,
      speed: 320,
      contactDamage: 18,
      radius: 26,
      displaySize: 104,
      xp: 8,
    });
    expect(ENEMIES['ping']).toMatchObject({
      movement: 'static',
      contact: 'attach',
      spawnAt: 'lead',
      invulnerable: true,
      hp: 1,
      speed: 0,
      contactDamage: 0,
      radius: 12,
      displaySize: 40,
      xp: 0,
    });
    expect(ENEMIES['ping']!.attach).toEqual({ drag: 0, cooldownMultiplier: 1.06 });
    expect(ENEMIES['meeting']).toMatchObject({
      movement: 'static',
      contact: 'none',
      spawnAt: 'player',
      invulnerable: true,
      hp: 1,
      speed: 0,
      contactDamage: 0,
      radius: 0,
      displaySize: 96,
      xp: 0,
    });
    expect(ENEMIES['meeting']!.hold).toEqual({ from: 260, to: 120, seconds: 30, holdSeconds: 12, slow: 0.6 });
    expect(ENEMIES['performance-review']).toMatchObject({
      movement: 'static',
      contact: 'none',
      hp: 16,
      speed: 0,
      contactDamage: 0,
      radius: 26,
      displaySize: 88,
      xp: 8,
    });
    expect(ENEMIES['performance-review']!.ranged).toEqual({
      range: 460,
      consultSeconds: 1,
      cooldownSeconds: 5,
      projectileSpeed: 220,
      damage: 5,
      xpLoss: 0.15,
    });
  });

  it('the four new fields are on the ones that carry them, and on nothing else', () => {
    for (const def of Object.values(ENEMIES)) {
      if (def.id !== 'reply-all') expect(def.split, def.id).toBeUndefined();
      if (def.id !== 'ping') expect(def.attach?.cooldownMultiplier, def.id).toBeUndefined();
      if (def.id !== 'meeting') {
        expect(def.hold, def.id).toBeUndefined();
        expect(def.spawnAt, def.id).not.toBe('player');
      }
      if (def.id !== 'performance-review') expect(def.ranged?.xpLoss, def.id).toBeUndefined();
    }
  });
});

describe('the introduction order is §3.6, and it is the design', () => {
  const firstAppearance = (id: string): number =>
    Math.min(...OFFICE.waves.filter((w) => w.enemyId === id).map((w) => w.fromSeconds));

  it('reply-all from the start, then the ping, the meeting, the review, the commute', () => {
    const order = ['reply-all', 'ping', 'meeting', 'performance-review', 'commute'].map(firstAppearance);
    expect(order[0]).toBe(0);
    for (let i = 1; i < order.length; i++) expect(order[i]).toBeGreaterThan(order[i - 1]!);
  });

  it('nothing new after 90s: the last ninety seconds are escalation', () => {
    for (const [id, stream] of spawnStreams(OFFICE.waves)) {
      expect(stream[0]!.fromSeconds, `"${id}" opens after 90s`).toBeLessThanOrEqual(90);
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
const LONG = 60_000;

describe('an Office run', () => {
  it('is deterministic', () => {
    const a = new World({ act: OFFICE, seed: 42 });
    const b = new World({ act: OFFICE, seed: 42 });
    play(a, 120);
    play(b, 120);
    expect(a.kills).toBe(b.kills);
    expect(a.enemies.length).toBe(b.enemies.length);
    expect(a.level).toBe(b.level);
    expect(a.xp).toBe(b.xp);
    expect(a.enemies.map((e) => e.generation)).toEqual(b.enemies.map((e) => e.generation));
    expect(a.pingStacks).toBe(b.pingStacks);
  }, LONG);

  it('puts every Office enemy on the field before The Reorg, and culls none but the meeting', () => {
    // Presence, not calibration. With no weapons nothing splits, and with a
    // player who never moves (and so never walks into a ping ahead of them)
    // everything ever seen is still standing a second before the boss — but
    // the meeting, which ends by design (§3.4) once its hold is built.
    const world = new World({ act: OFFICE, seed: 11, startingItems: [] });
    const seen = new Map<string, Set<number>>();
    let meetings = 0;
    play(world, OFFICE.durationSeconds - 1, (w) => {
      for (const e of w.enemies) {
        let s = seen.get(e.def.id);
        if (!s) seen.set(e.def.id, (s = new Set()));
        s.add(e.uid);
      }
      // A meeting is a hold, never in `enemies` (§3.4): count it where it lives.
      meetings = Math.max(meetings, w.holds.filter((h) => h.source === 'meeting').length);
    });
    expect(meetings, 'no meeting was ever held').toBeGreaterThan(0);
    expect(world.boss).toBeNull();
    for (const id of officeIds()) {
      if (id === 'meeting') continue;
      const ever = seen.get(id)?.size ?? 0;
      expect(ever, `no "${id}" was ever seen`).toBeGreaterThan(0);
      const standing = world.enemies.filter((e) => e.def.id === id).length;
      expect(standing, `"${id}" was culled`).toBe(ever);
    }
  }, LONG);
});

describe('the life is five acts long now', () => {
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

  it('The Loan falling crosses into The Office, and The Reorg falling is natural causes at thirty-four', () => {
    const w = new World({ acts: ALL_ACTS, seed: 5, startingItems: [] });
    for (let i = 0; i < ALL_ACTS.indexOf(OFFICE); i++) cross(w);
    expect(w.act).toBe(OFFICE);
    expect(w.won).toBe(false);
    cross(w);
    expect(w.won).toBe(true);
    expect(w.certificate).toEqual({
      outcome: 'won',
      actId: 'office',
      actName: 'The Office',
      actIndex: ALL_ACTS.indexOf(OFFICE),
      age: 34,
      causeId: 'natural-causes',
      cause: 'natural causes',
    });
  });
});
