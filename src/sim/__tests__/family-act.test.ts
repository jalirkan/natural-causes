import { describe, expect, it } from 'vitest';
import { ACTS, ALL_ACTS, DECLINE, FAMILY, OFFICE, spawnStreams } from '../../data/acts';
import { ENEMIES } from '../../data/enemies';
import { FAMILY_ROSTER } from '../../../tools/art/batch';
import { BOSS_HP, World } from '../world';

/**
 * Family as an ACT (FAMILY-ROSTER.md §3.6 and §4), in the image of
 * `office-act.test.ts`.
 *
 * The schedule is provisional and says so (D-022). What is under test is the
 * part that IS the design — the six enemies and their order, the new fields
 * on the four that carry them, The Mortgage's declaration — and the presence
 * claims a bot can make about an act nobody has played. No rate is asserted.
 * The verbs themselves are family.test.ts's; the rules for every act are
 * content.test.ts's, over ALL_ACTS.
 */

/** §3's five and §4's room, in the roster's order; `name` is the §3 heading the certificate prints. */
const SIX: [string, string][] = [
  ['bill', 'Bill'],
  ['flat-pack', 'Flat-pack'],
  ['hoa-letter', 'HOA letter'],
  ['toddler', 'Toddler'],
  ['phone-call', 'Phone call'],
  ['room', 'Room'],
];

const familyIds = (): string[] =>
  Object.values(ENEMIES)
    .filter((d) => d.act === 'family')
    .map((d) => d.id);

describe('Family has a schedule, and it is provisional', () => {
  it('is marked provisional, names what retires the label, and names every new placeholder', () => {
    const label = FAMILY.provisional;
    expect(label).toBeDefined();
    expect(label).toMatch(/D-022/);
    expect(label).toMatch(/\bperson\b/);
    // The five verbs' numbers and The Mortgage's, or they read as decisions.
    for (const field of ['accrue', 'pickup', 'coy', 'cooldownMultiplier', 'releases', 'pull', 'instalments']) {
      expect(label, field).toContain(field);
    }
    for (const field of ['attach.pickup', 'engulf.cooldownMultiplier', 'ranged.pull', 'instalmentSeconds', 'BOSS_HP']) {
      expect(label, field).toContain(field);
    }
    // And the Egg's machine its statement borrows (timings, shot, damage).
    expect(label).toMatch(/Egg/);
  });

  it('is the sixth act of the life, and the browser plays it', () => {
    // In ALL_ACTS after The Office, so the bots and the content rules run it;
    // and in ACTS after The Office too, now its atlas, `player-family` and
    // `boss-mortgage` exist (FAMILY-ROSTER §5; content.test.ts ties ACTS to
    // ACT_VISUALS and checks every frame it draws is in the atlas).
    expect(ALL_ACTS.indexOf(FAMILY)).toBe(ALL_ACTS.indexOf(OFFICE) + 1);
    // It was the last act of both until Decline (DECLINE-ROSTER §5), which
    // follows it in each now (decline-act.test.ts): the browser's life no
    // longer ends at fifty-five.
    expect(ALL_ACTS[ALL_ACTS.indexOf(FAMILY) + 1]).toBe(DECLINE);
    expect(ACTS.indexOf(FAMILY)).toBe(ACTS.indexOf(OFFICE) + 1);
    expect(ACTS[ACTS.indexOf(FAMILY) + 1]).toBe(DECLINE);
  });

  it('runs 150 seconds from thirty-four to fifty-five and ends on EQUITY', () => {
    expect(FAMILY.id).toBe('family');
    expect(FAMILY.name).toBe('Family');
    expect(FAMILY.durationSeconds).toBe(150);
    expect(FAMILY.age).toEqual({ from: 34, to: 55 });
    expect(FAMILY.age.from).toBe(OFFICE.age.to);
    expect(FAMILY.endWord).toBe('EQUITY');
  });

  it('fights The Mortgage (§4), which nobody races for', () => {
    expect(FAMILY.bossName).toBe('The Mortgage');
    expect(FAMILY.boss).toEqual({ kind: 'mortgage', instalments: 12, instalmentSeconds: 5, roomId: 'room', feeId: 'bill' });
    // The room it builds and the fee it sends are the act's own, and scheduled.
    if (FAMILY.boss.kind !== 'mortgage') throw new Error('not the Mortgage');
    const streams = spawnStreams(FAMILY.waves);
    for (const id of [FAMILY.boss.roomId, FAMILY.boss.feeId]) {
      expect(ENEMIES[id]?.act, id).toBe('family');
      expect(streams.has(id), id).toBe(true);
    }
    expect(ENEMIES[FAMILY.boss.roomId]).toMatchObject({ merge: true, movement: 'static', invulnerable: true });
    expect(ENEMIES[FAMILY.boss.feeId]?.accrue).toBeDefined();
    expect(FAMILY.race).toBeUndefined();
  });
});

describe('the six (§3, §3.6)', () => {
  it('Family is exactly these six, in this order, under these names', () => {
    expect(familyIds()).toEqual(SIX.map(([id]) => id));
    for (const [id, name] of SIX) {
      expect(ENEMIES[id]!.name, id).toBe(name);
      expect(ENEMIES[id]!.frame, id).toBe(`${id}.png`);
    }
  });

  it('the waves reference only them, and every one of them', () => {
    for (const wave of FAMILY.waves) expect(familyIds(), wave.enemyId).toContain(wave.enemyId);
    expect([...spawnStreams(FAMILY.waves).keys()].sort()).toEqual(familyIds().sort());
  });

  it("each one's whyThisStage is the art batch's, verbatim", () => {
    // One sentence, two files: the roster lifts it into both, and a drift
    // between them is the prompt and the game disagreeing about the enemy.
    for (const [id] of SIX) {
      const spec = FAMILY_ROSTER.find((s) => s.id === id);
      expect(spec, `no FAMILY_ROSTER spec for "${id}"`).toBeDefined();
      expect(ENEMIES[id]!.whyThisStage, id).toBe(spec!.whyThisStage);
    }
    expect(ENEMIES['room']!.whyThisStage).toBe(
      'Family is the first stage where the place the player lives is built around them while they are standing in it.',
    );
  });

  it('§3.6, transcribed', () => {
    expect(ENEMIES['bill']).toMatchObject({
      movement: 'chase',
      contact: 'damage',
      hp: 8,
      speed: 52,
      contactDamage: 4,
      radius: 14,
      displaySize: 48,
      xp: 2,
    });
    expect(ENEMIES['bill']!.accrue).toEqual({ seconds: 8, fees: 2 });
    expect(ENEMIES['flat-pack']).toMatchObject({
      movement: 'cross',
      contact: 'damage',
      hp: 40,
      speed: 260,
      contactDamage: 16,
      radius: 26,
      displaySize: 104,
      xp: 8,
    });
    // It leaves: not a patrol (§3.2).
    expect(ENEMIES['flat-pack']!.patrol).toBeUndefined();
    expect(ENEMIES['hoa-letter']).toMatchObject({
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
    expect(ENEMIES['hoa-letter']!.attach).toEqual({ drag: 0, pickup: 0.93, persists: true });
    expect(ENEMIES['toddler']).toMatchObject({
      movement: 'chase',
      contact: 'engulf',
      spawnAt: 'trail',
      invulnerable: true,
      hp: 1,
      speed: 70,
      contactDamage: 0,
      radius: 14,
      displaySize: 44,
      xp: 0,
    });
    expect(ENEMIES['toddler']!.coy).toEqual({ flee: 1.6, approach: 0.5 });
    expect(ENEMIES['toddler']!.engulf).toEqual({
      seconds: 3,
      slow: 0.3,
      damagePerSecond: 0,
      cooldownMultiplier: 1.4,
      releases: true,
    });
    expect(ENEMIES['phone-call']).toMatchObject({
      movement: 'static',
      contact: 'none',
      hp: 16,
      speed: 0,
      contactDamage: 0,
      radius: 24,
      displaySize: 80,
      xp: 8,
    });
    expect(ENEMIES['phone-call']!.ranged).toEqual({
      range: 440,
      consultSeconds: 1.2,
      cooldownSeconds: 6,
      projectileSpeed: 240,
      damage: 4,
      stun: 0.3,
      pull: 180,
    });
    expect(ENEMIES['room']).toMatchObject({
      movement: 'static',
      contact: 'none',
      merge: true,
      invulnerable: true,
      spawnAt: 'lead',
      hp: 1,
      speed: 0,
      contactDamage: 0,
      radius: 40,
      displaySize: 96,
      xp: 0,
    });
  });

  it('the five new fields are on the ones that carry them, and on nothing else', () => {
    for (const def of Object.values(ENEMIES)) {
      if (def.id !== 'bill') expect(def.accrue, def.id).toBeUndefined();
      if (def.id !== 'hoa-letter') expect(def.attach?.pickup, def.id).toBeUndefined();
      if (def.id !== 'toddler') {
        expect(def.coy, def.id).toBeUndefined();
        expect(def.engulf?.cooldownMultiplier, def.id).toBeUndefined();
        expect(def.engulf?.releases, def.id).toBeUndefined();
      }
      if (def.id !== 'phone-call') expect(def.ranged?.pull, def.id).toBeUndefined();
    }
  });
});

describe('the introduction order is §3.6, and it is the design', () => {
  const firstAppearance = (id: string): number =>
    Math.min(...FAMILY.waves.filter((w) => w.enemyId === id).map((w) => w.fromSeconds));

  it('bills from the start, then the flat-pack, the letters, the toddler, the phone, the rooms', () => {
    const order = ['bill', 'flat-pack', 'hoa-letter', 'toddler', 'phone-call', 'room'].map(firstAppearance);
    expect(order[0]).toBe(0);
    for (let i = 1; i < order.length; i++) expect(order[i]).toBeGreaterThan(order[i - 1]!);
  });

  it('nothing new after 100s: the last fifty seconds are escalation', () => {
    for (const [id, stream] of spawnStreams(FAMILY.waves)) {
      expect(stream[0]!.fromSeconds, `"${id}" opens after 100s`).toBeLessThanOrEqual(100);
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

describe('a Family run', () => {
  it('is deterministic', () => {
    const a = new World({ act: FAMILY, seed: 42 });
    const b = new World({ act: FAMILY, seed: 42 });
    play(a, 120);
    play(b, 120);
    expect(a.kills).toBe(b.kills);
    expect(a.enemies.length).toBe(b.enemies.length);
    expect(a.level).toBe(b.level);
    expect(a.xp).toBe(b.xp);
    expect(a.x).toBe(b.x);
    expect(a.enemies.map((e) => e.fee === true)).toEqual(b.enemies.map((e) => e.fee === true));
    expect(a.pickupFactor).toBe(b.pickupFactor);
  }, LONG);

  it('puts five of its six on the field before The Mortgage, and culls none but the two that leave', () => {
    // Presence, not calibration. With no weapons nothing dies, and a player
    // who never moves never walks into a letter ahead of them, so every bill,
    // letter and phone ever seen is still standing a second before the boss.
    // The flat-pack leaves (§3.2: it crosses and is culled far off, not a
    // patrol) and the toddler lets go (§3.4), each by design.
    const world = new World({ act: FAMILY, seed: 11, startingItems: [] });
    const seen = new Map<string, Set<number>>();
    let fees = 0;
    let released = 0;
    let held = false;
    play(world, FAMILY.durationSeconds - 1, (w) => {
      for (const e of w.enemies) {
        let s = seen.get(e.def.id);
        if (!s) seen.set(e.def.id, (s = new Set()));
        s.add(e.uid);
        if (e.fee) fees = Math.max(fees, 1);
      }
      if (held && w.engulfTimer <= 0) released++;
      held = w.engulfTimer > 0;
    });
    expect(world.boss).toBeNull();
    expect(fees, 'no bill ever issued a fee').toBeGreaterThan(0);
    expect(released, 'no toddler ever let go').toBeGreaterThan(0);
    for (const id of ['bill', 'flat-pack', 'hoa-letter', 'toddler', 'phone-call', 'room']) {
      const ever = seen.get(id)?.size ?? 0;
      expect(ever, `no "${id}" was ever seen`).toBeGreaterThan(0);
      // The flat-pack crosses and leaves, the toddler lets go and leaves, and
      // rooms merge on arrival (a room landing on a room is one bigger room).
      if (id === 'flat-pack' || id === 'toddler' || id === 'room') continue;
      const standing = world.enemies.filter((e) => e.def.id === id).length;
      expect(standing, `"${id}" was culled`).toBe(ever);
    }
    // A room lands before The Mortgage (§3.6: the house starts growing before
    // it arrives), at 110s: the stream opens at 90s at 0.05. The second, at
    // 130s, lands at the same lead when the player has not moved and merges
    // into the first without a uid of its own, so one is what a still player
    // sees; a moving one gets two.
    const rooms = seen.get('room')?.size ?? 0;
    expect(rooms, 'no room landed before The Mortgage').toBeGreaterThanOrEqual(1);
  }, LONG);
});

describe('the life is six acts long now', () => {
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

  it('The Reorg falling crosses into Family; The Mortgage, paid off, falls at its last window and it is natural causes at fifty-five', () => {
    // The life up to and including Family. This was ALL_ACTS, and then ACTS,
    // while Family was the last act; Decline follows it in both now
    // (DECLINE-ROSTER §5), and there The Mortgage paid off is a crossing, not
    // the end (decline-act.test.ts). A life cut here still ends at fifty-five.
    const life = ALL_ACTS.slice(0, ALL_ACTS.indexOf(FAMILY) + 1);
    expect(life).toEqual(ACTS.slice(0, ACTS.indexOf(FAMILY) + 1));
    const w = new World({ acts: life, seed: 5, startingItems: [] });
    for (let i = 0; i < ALL_ACTS.indexOf(FAMILY); i++) cross(w);
    expect(w.act).toBe(FAMILY);
    expect(w.won).toBe(false);
    expect(w.age).toBe(34);

    // The clock runs out and The Mortgage stands, owing BOSS_HP, nothing paid.
    w.actTime = FAMILY.durationSeconds;
    play(w, 1 / 60);
    const b = w.boss!;
    expect(b).not.toBeNull();
    expect(b.kind).toBe('mortgage');
    expect(b.maxHp).toBe(BOSS_HP);
    expect(b.paid).toBe(0);
    expect(b.shielded).toBe(false);
    expect(w.raceTarget).toBe(0);

    // Its statement is the Egg's machine with one shot, not the fan (§4).
    let fired = 0;
    play(w, 4, (world) => {
      fired = Math.max(fired, world.projectiles.filter((p) => p.hostile && p.source === 'boss').length);
    });
    expect(fired, 'The Mortgage never fired its statement').toBe(1);

    // Eleven paid (the panel's kind of write: paid is read off the health at
    // the window's end), and a real hit meets the twelfth. It does not fall
    // on the hit: the window has to close (mortgage.test.ts has the schedule).
    if (FAMILY.boss.kind !== 'mortgage') throw new Error('not the Mortgage');
    b.hp = b.maxHp / FAMILY.boss.instalments;
    w.projectiles.length = 0;
    w.projectiles.push({
      x: b.x,
      y: b.y,
      vx: 0,
      vy: 0,
      life: 1,
      damage: BOSS_HP,
      pierce: 1,
      radius: 4,
      hostile: false,
      serial: 1e9,
    });
    play(w, 1 / 60);
    expect(b.hp).toBe(0);
    expect(b.phase).not.toBe('absorbing');
    play(w, FAMILY.boss.instalmentSeconds);
    expect(b.phase).toBe('absorbing');
    expect(b.paid).toBe(FAMILY.boss.instalments);
    expect(w.act.endWord).toBe('EQUITY');
    play(w, 3);
    expect(w.won).toBe(true);
    expect(w.certificate).toEqual({
      outcome: 'won',
      actId: 'family',
      actName: 'Family',
      actIndex: ALL_ACTS.indexOf(FAMILY),
      age: 55,
      causeId: 'natural-causes',
      cause: 'natural causes',
      rules: [],
    });
  }, LONG);

  it('a death to its statement names The Mortgage at fifty-five', () => {
    const w = new World({ acts: [FAMILY], seed: 6, startingItems: [] });
    w.actTime = FAMILY.durationSeconds;
    play(w, 1 / 60);
    expect(w.boss?.kind).toBe('mortgage');
    // Stepped without the health held, until a shot of its fan lands.
    w.hp = 1;
    for (let i = 0; i < 60 * 10 && !w.dead; i++) w.step(1 / 60, { moveX: 0, moveY: 0 });
    expect(w.dead).toBe(true);
    expect(w.certificate).toMatchObject({ outcome: 'died', actId: 'family', causeId: 'boss', cause: 'The Mortgage', age: 55 });
  }, LONG);
});
