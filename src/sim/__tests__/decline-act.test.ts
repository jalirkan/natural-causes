import { describe, expect, it } from 'vitest';
import { ACTS, ALL_ACTS, DECLINE, FAMILY, spawnStreams } from '../../data/acts';
import { ENEMIES } from '../../data/enemies';
import { DECLINE_ROSTER } from '../../../tools/art/batch';
import { BOSS_HP, World } from '../world';

/**
 * Decline as an ACT (DECLINE-ROSTER.md §3.6 and §4), in the image of
 * `family-act.test.ts`.
 *
 * The schedule is provisional and says so (D-022). What is under test is the
 * part that IS the design — the five enemies and their order, the new fields
 * on the two that carry them, the stairs' hold and the knees' attach, Time's
 * declaration — and the presence claims a bot can make about an act nobody
 * has played. No rate is asserted. The verbs themselves are decline.test.ts's;
 * the rules for every act are content.test.ts's, over ALL_ACTS.
 */

/** §3's five, in the roster's order; `name` is the §3 heading the certificate prints. */
const FIVE: [string, string][] = [
  ['medication', 'Medication'],
  ['weather', 'Weather'],
  ['your-knees', 'Your knees'],
  ['stairs', 'Stairs'],
  ['insurance-form', 'Insurance form'],
];

const declineIds = (): string[] =>
  Object.values(ENEMIES)
    .filter((d) => d.act === 'decline')
    .map((d) => d.id);

describe('Decline has a schedule, and it is provisional', () => {
  it('is marked provisional, names what retires the label, and names every new placeholder', () => {
    const label = DECLINE.provisional;
    expect(label).toBeDefined();
    expect(label).toMatch(/D-022/);
    expect(label).toMatch(/\bperson\b/);
    // The two new fields, the stairs' hold, the floor, and Time's numbers, or
    // they read as decisions.
    for (const field of ['killHeal', 'maxHpLoss', 'hold', 'seconds', 'sweepSeconds']) {
      expect(label, field).toContain(field);
    }
    for (const field of ['ranged.maxHpLoss', 'MAX_HP_FLOOR', 'held 600s', 'sweepLength', 'sweepWidth', 'attach.drag']) {
      expect(label, field).toContain(field);
    }
    // The hand and the knees Time files are built now (time.test.ts): the
    // label names their numbers, the file's cadence in world.ts among them,
    // and no longer says they are missing. The rest pose is the drawing's.
    expect(label).not.toMatch(/not built yet/);
    for (const field of ['hand', 'knee', 'TIME_FILES_PER_TURN', 'TIME_HAND_REST', 'i-frames']) {
      expect(label, field).toContain(field);
    }
  });

  it('is the seventh and last act of the life, and the browser does not play it yet', () => {
    // In ALL_ACTS after Family, so the bots and the content rules run it; not
    // in ACTS until its atlas, `player-decline` and `boss-time` exist
    // (DECLINE-ROSTER §5; content.test.ts ties ACTS to ACT_VISUALS).
    expect(ALL_ACTS.indexOf(DECLINE)).toBe(ALL_ACTS.indexOf(FAMILY) + 1);
    expect(ALL_ACTS[ALL_ACTS.length - 1]).toBe(DECLINE);
    expect(ACTS).not.toContain(DECLINE);
    expect(ACTS[ACTS.length - 1]).toBe(FAMILY);
  });

  it('runs 120 seconds from fifty-five to eighty-four and ends on EVENTUALLY', () => {
    expect(DECLINE.id).toBe('decline');
    expect(DECLINE.name).toBe('Decline');
    expect(DECLINE.durationSeconds).toBe(120);
    expect(DECLINE.age).toEqual({ from: 55, to: 84 });
    expect(DECLINE.age.from).toBe(FAMILY.age.to);
    expect(DECLINE.endWord).toBe('EVENTUALLY');
  });

  it('fights Time (§4), which has a clock and no health, and which nobody races for', () => {
    expect(DECLINE.bossName).toBe('Time');
    expect(DECLINE.boss).toEqual({ kind: 'time', seconds: 60, sweepSeconds: 12, sweepLength: 520, sweepWidth: 40 });
    expect(DECLINE.race).toBeUndefined();
  });
});

describe('the five (§3, §3.6)', () => {
  it('Decline is exactly these five, in this order, under these names', () => {
    expect(declineIds()).toEqual(FIVE.map(([id]) => id));
    for (const [id, name] of FIVE) {
      expect(ENEMIES[id]!.name, id).toBe(name);
      expect(ENEMIES[id]!.frame, id).toBe(`${id}.png`);
    }
  });

  it('the waves reference only them, and every one of them', () => {
    for (const wave of DECLINE.waves) {
      expect(ENEMIES[wave.enemyId], wave.enemyId).toBeDefined();
      expect(declineIds(), wave.enemyId).toContain(wave.enemyId);
    }
    expect([...spawnStreams(DECLINE.waves).keys()].sort()).toEqual(declineIds().sort());
  });

  it("each one's whyThisStage is the art batch's, verbatim", () => {
    // One sentence, two files: the roster lifts it into both, and a drift
    // between them is the prompt and the game disagreeing about the enemy.
    for (const [id] of FIVE) {
      const spec = DECLINE_ROSTER.find((s) => s.id === id);
      expect(spec, `no DECLINE_ROSTER spec for "${id}"`).toBeDefined();
      expect(ENEMIES[id]!.whyThisStage, id).toBe(spec!.whyThisStage);
    }
    // The line that named the act (DIRECTION-PANEL-2026-09-27).
    expect(ENEMIES['your-knees']!.whyThisStage).toBe(
      'Decline is where the record the player has been accumulating since before they were a person is finally read back to them by their own body.',
    );
  });

  it('§3.6, transcribed', () => {
    expect(ENEMIES['medication']).toMatchObject({
      movement: 'chase',
      contact: 'damage',
      killHeal: 2,
      hp: 6,
      speed: 56,
      contactDamage: 3,
      radius: 12,
      displaySize: 40,
      xp: 2,
    });
    expect(ENEMIES['weather']).toMatchObject({
      movement: 'cross',
      contact: 'damage',
      hp: 48,
      speed: 240,
      contactDamage: 18,
      radius: 28,
      displaySize: 112,
      xp: 8,
    });
    // It leaves: not a patrol (§3.2).
    expect(ENEMIES['weather']!.patrol).toBeUndefined();
    expect(ENEMIES['your-knees']).toMatchObject({
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
    // The antibody's drag, verbatim, and it persists (§3.3).
    expect(ENEMIES['your-knees']!.attach).toEqual({ drag: 0.03, persists: true });
    expect(ENEMIES['your-knees']!.attach!.drag).toBe(ENEMIES['antibody']!.attach!.drag);
    expect(ENEMIES['stairs']).toMatchObject({
      movement: 'static',
      contact: 'none',
      spawnAt: 'lead',
      invulnerable: true,
      hp: 1,
      speed: 0,
      contactDamage: 0,
      radius: 0,
      displaySize: 96,
      xp: 0,
    });
    expect(ENEMIES['stairs']!.hold).toEqual({ from: 130, to: 130, seconds: 0, holdSeconds: 600, slow: 0.45 });
    expect(ENEMIES['insurance-form']).toMatchObject({
      movement: 'static',
      contact: 'none',
      hp: 16,
      speed: 0,
      contactDamage: 0,
      radius: 24,
      displaySize: 80,
      xp: 8,
    });
    expect(ENEMIES['insurance-form']!.ranged).toEqual({
      range: 440,
      consultSeconds: 1.2,
      cooldownSeconds: 7,
      projectileSpeed: 220,
      damage: 4,
      maxHpLoss: 0.05,
    });
  });

  it('the two new fields are on the ones that carry them, and on nothing else', () => {
    for (const def of Object.values(ENEMIES)) {
      if (def.id !== 'medication') expect(def.killHeal, def.id).toBeUndefined();
      if (def.id !== 'insurance-form') expect(def.ranged?.maxHpLoss, def.id).toBeUndefined();
    }
  });

  it('the stairs never adjourn: their hold outlasts the act and Time together', () => {
    const hold = ENEMIES['stairs']!.hold!;
    const time = DECLINE.boss.kind === 'time' ? DECLINE.boss.seconds : NaN;
    expect(hold.seconds + hold.holdSeconds).toBeGreaterThan(DECLINE.durationSeconds + time);
  });
});

describe('the introduction order is §3.6, and it is the design', () => {
  const firstAppearance = (id: string): number =>
    Math.min(...DECLINE.waves.filter((w) => w.enemyId === id).map((w) => w.fromSeconds));

  it('medications from the start, then the knees, the stairs, the weather, the form', () => {
    const order = ['medication', 'your-knees', 'stairs', 'weather', 'insurance-form'].map(firstAppearance);
    expect(order).toEqual([0, 15, 30, 45, 60]);
    for (let i = 1; i < order.length; i++) expect(order[i]).toBeGreaterThan(order[i - 1]!);
  });

  it('nothing new after 60s: the last sixty seconds are escalation', () => {
    for (const [id, stream] of spawnStreams(DECLINE.waves)) {
      expect(stream[0]!.fromSeconds, `"${id}" opens after 60s`).toBeLessThanOrEqual(60);
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

describe('a Decline run', () => {
  it('is deterministic', () => {
    const a = new World({ act: DECLINE, seed: 42 });
    const b = new World({ act: DECLINE, seed: 42 });
    play(a, 110);
    play(b, 110);
    expect(a.kills).toBe(b.kills);
    expect(a.enemies.length).toBe(b.enemies.length);
    expect(a.holds.length).toBe(b.holds.length);
    expect(a.level).toBe(b.level);
    expect(a.xp).toBe(b.xp);
    expect(a.x).toBe(b.x);
    expect(a.maxHp).toBe(b.maxHp);
    expect(a.dragStacks).toBe(b.dragStacks);
  }, LONG);

  it('puts all five on the field before Time, and culls none but the one that leaves', () => {
    // Presence, not calibration. With no weapons nothing dies, and a player
    // who never moves never walks into a knee ahead of them, so every dose,
    // knee and form ever seen is still standing a second before Time, and
    // every flight of stairs is still a hold. The weather crosses and leaves
    // (§3.2), by design. The stairs' stream opens at 30s at 0.03, so the
    // first flight lands at about 63s; the form's at 80s (AUDIT 44). A form
    // lands on the edge ring, beyond its range of a player who never moves
    // (as the phone and the review do), so its decision is decline.test.ts's.
    const world = new World({ act: DECLINE, seed: 11, startingItems: [] });
    const seen = new Map<string, Set<number>>();
    let flights = 0;
    play(world, DECLINE.durationSeconds - 1, (w) => {
      for (const e of w.enemies) {
        let s = seen.get(e.def.id);
        if (!s) seen.set(e.def.id, (s = new Set()));
        s.add(e.uid);
      }
      flights = Math.max(flights, w.holds.filter((h) => h.source === 'stairs').length);
    });
    expect(world.boss).toBeNull();
    expect(flights, 'no flight of stairs ever landed').toBeGreaterThan(0);
    expect(world.holds.filter((h) => h.source === 'stairs')).toHaveLength(flights);
    for (const id of ['medication', 'weather', 'your-knees', 'insurance-form']) {
      const ever = seen.get(id)?.size ?? 0;
      expect(ever, `no "${id}" was ever seen`).toBeGreaterThan(0);
      if (id === 'weather') continue;
      const standing = world.enemies.filter((e) => e.def.id === id).length;
      expect(standing, `"${id}" was culled`).toBe(ever);
    }
  }, LONG);

  it('with the starting weapon, the doses it takes heal', () => {
    // Presence: some medication dies to Lash in the first minute, and a
    // player below the maximum is the better for it.
    const w = new World({ act: DECLINE, seed: 12 });
    let healed = 0;
    for (let i = 0; i < 60 * 60; i++) {
      if (w.offers) {
        w.choose(w.offers[0]!);
        continue;
      }
      w.hp = Math.min(w.hp, w.maxHp / 2);
      w.dead = false;
      const before = w.hp;
      const kills = w.kills;
      w.step(1 / 60, { moveX: 0, moveY: 0 });
      if (w.kills > kills && w.hp > before) healed++;
    }
    expect(healed, 'no dose Lash took ever healed').toBeGreaterThan(0);
  }, LONG);
});

describe('the life is seven acts long, and it ends', () => {
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

  it('The Mortgage paid off crosses into Decline; Time runs out and it is natural causes at eighty-four, on EVENTUALLY', () => {
    const w = new World({ acts: ALL_ACTS, seed: 5, startingItems: [] });
    for (let i = 0; i < ALL_ACTS.indexOf(DECLINE); i++) cross(w);
    expect(w.act).toBe(DECLINE);
    expect(w.won).toBe(false);
    expect(w.age).toBe(55);

    // The clock runs out and Time stands, with a clock of its own.
    w.actTime = DECLINE.durationSeconds;
    play(w, 1 / 60);
    const b = w.boss!;
    expect(b).not.toBeNull();
    expect(b.kind).toBe('time');
    expect(b.hp).toBe(BOSS_HP);
    if (DECLINE.boss.kind !== 'time') throw new Error('not Time');
    expect(b.secondsLeft).toBe(DECLINE.boss.seconds);
    expect(w.raceTarget).toBe(0);
    expect(w.age).toBe(84);

    // Survived: the clock runs down, nothing is ever taken from it, and the
    // hands stop on the act's word.
    let word: string | undefined;
    play(w, DECLINE.boss.seconds + 0.1, (world) => {
      if (world.boss?.phase === 'absorbing' && word === undefined) word = world.act.endWord;
    });
    expect(b.phase).toBe('absorbing');
    expect(word).toBe('EVENTUALLY');
    expect(b.hp).toBe(BOSS_HP);
    play(w, 2);
    expect(w.won).toBe(true);
    expect(w.outcome).toBe('won');
    expect(w.certificate).toEqual({
      outcome: 'won',
      actId: 'decline',
      actName: 'Decline',
      actIndex: ALL_ACTS.indexOf(DECLINE),
      age: 84,
      causeId: 'natural-causes',
      cause: 'natural causes',
    });
  }, LONG);
});
