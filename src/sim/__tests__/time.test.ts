import { describe, expect, it } from 'vitest';
import { DECLINE, type ActDef, type TimeBoss } from '../../data/acts';
import { enemyDef, type EnemyDef } from '../../data/enemies';
import { ITEMS, isActive } from '../../data/items';
import {
  ANTIBODY_LEAD,
  ARENA_HEIGHT,
  ARENA_WIDTH,
  EGG_SHOT,
  IFRAMES,
  MAX_ACTIVE_ENEMIES,
  TIME_FILES_PER_TURN,
  TIME_FILE_ID,
  TIME_HAND_REST,
  World,
  fromHand,
  type EnemyState,
} from '../world';

/**
 * Time's long hand and its file (DECLINE-ROSTER §4), and the stairs'
 * placement (AUDIT 93), which the hand's pass fixed beside it.
 *
 *   - The hand: `BossState.hand`, radians clockwise from twelve in world
 *     axes (+x right, +y down, so twelve is up the screen), from the drawn
 *     rest pose (TIME_HAND_REST), one turn every `sweepSeconds`; a player
 *     touching the rectangle `sweepLength` × `sweepWidth` along it takes the
 *     Egg's shot damage through `hurt`, with the usual i-frames.
 *   - The file: one TIME_FILE_ID at the player's lead at every quarter turn,
 *     placed as the Mortgage's room is placed — never on the player.
 *   - The stairs: a hold at the lead never lands with the player inside it.
 *
 * Every number read here is a placeholder under `DECLINE.provisional` (the
 * rest pose is the drawing's); each assertion is written against the def's
 * own figure rather than a copy of it. decline.test.ts pins the win at
 * `seconds`, and it stays as it was.
 */

const DT = 1 / 60;
const TAU = Math.PI * 2;
const still = { moveX: 0, moveY: 0 };
if (DECLINE.boss.kind !== 'time') throw new Error('Decline does not fight Time');
const TIME: TimeBoss = DECLINE.boss;
/** Radians the hand turns in one step. */
const PER_STEP = (TAU * DT) / TIME.sweepSeconds;
const STEPS_PER_TURN = Math.round(TIME.sweepSeconds / DT);

/** The act with nothing scheduled: nothing spawns, so nothing draws the dice but what a test does. */
const QUIET: ActDef = { ...DECLINE, waves: [] };

function empty(seed: number): World {
  return new World({ act: QUIET, seed, startingItems: [] });
}

/** The act's clock run out: Time up, on the step that crosses it. */
function toBoss(w: World): NonNullable<World['boss']> {
  w.actTime = w.act.durationSeconds;
  w.step(DT, still);
  expect(w.boss?.kind, 'Time did not appear at the act clock').toBe('time');
  return w.boss!;
}

/** The world's next roll of its own dice. Private because nothing outside the sim should roll. */
function nextRoll(w: World): number {
  return (w as unknown as { rng: () => number }).rng();
}

/**
 * A point `along` px out from the pivot on bearing `angle` (clockwise from
 * twelve), then `across` px clockwise of that line — the side the hand is
 * turning toward. Negative `across` is behind the hand.
 */
function at(b: { x: number; y: number }, angle: number, along: number, across = 0): { x: number; y: number } {
  const ux = Math.sin(angle);
  const uy = -Math.cos(angle);
  // Clockwise of the line at that bearing: the hand's motion there.
  const cx = Math.cos(angle);
  const cy = Math.sin(angle);
  return { x: b.x + ux * along + cx * across, y: b.y + uy * along + cy * across };
}

/** The smallest angle between two bearings. */
function apart(a: number, b: number): number {
  return Math.abs(Math.atan2(Math.sin(a - b), Math.cos(a - b)));
}

/** Contact reach from the hand's centre line: the player's radius and half the blade. */
const reachOf = (w: World) => w.playerRadius + TIME.sweepWidth / 2;

/** The player set down out of the hand's reach for the whole fight, facing right. */
function away(w: World, b: NonNullable<World['boss']>): void {
  w.x = b.x;
  w.y = b.y + TIME.sweepLength + w.playerRadius + 100;
  expect(w.y).toBeLessThanOrEqual(ARENA_HEIGHT);
  w.facingX = 1;
  w.facingY = 0;
}

const knees = (w: World): EnemyState[] => w.enemies.filter((e) => e.def.id === TIME_FILE_ID);

describe('the hand turns (§4)', () => {
  it('the axes: 0 is twelve, up the screen (−y); π/2 is three (+x); π is six; one side of the pivot only', () => {
    const b = { x: 1000, y: 1000 };
    const L = TIME.sweepLength;
    const W = TIME.sweepWidth;
    expect(fromHand(b.x, b.y, 0, L, W, 1000, 700)).toBe(0);
    expect(fromHand(b.x, b.y, 0, L, W, 1000, 1300)).toBeCloseTo(300, 9);
    expect(fromHand(b.x, b.y, Math.PI / 2, L, W, 1300, 1000)).toBeCloseTo(0, 9);
    expect(fromHand(b.x, b.y, Math.PI / 2, L, W, 700, 1000)).toBeCloseTo(300, 9);
    expect(fromHand(b.x, b.y, Math.PI, L, W, 1000, 1300)).toBeCloseTo(0, 9);
    // Across the blade: its half-width is inside; beyond it, the distance to its edge.
    expect(fromHand(b.x, b.y, 0, L, W, 1000 + W / 2, 700)).toBeCloseTo(0, 9);
    expect(fromHand(b.x, b.y, 0, L, W, 1000 + W / 2 + 7, 700)).toBeCloseTo(7, 9);
    // Past the tip, the distance to the tip's edge.
    expect(fromHand(b.x, b.y, 0, L, W, 1000, 1000 - L - 5)).toBeCloseTo(5, 9);
  });

  it('starts at the drawn rest pose, pointing at two', () => {
    expect(TIME_HAND_REST).toBeCloseTo((60.6 * Math.PI) / 180, 12);
    // Two o'clock is 60°: the drawn pose is a little past it.
    expect(TIME_HAND_REST).toBeGreaterThan(Math.PI / 3);
    expect(TIME_HAND_REST).toBeLessThan(Math.PI / 2);
    const b = toBoss(empty(61));
    expect(b.hand).toBe(TIME_HAND_REST);
    expect(b.filed).toBe(0);
  });

  it('turns one full turn clockwise in `sweepSeconds`, the same angle every step, never faster, never reset', () => {
    const w = empty(62);
    const b = toBoss(w);
    away(w, b);
    let turned = 0;
    let seams = 0;
    let last = b.hand;
    for (let i = 0; i < STEPS_PER_TURN; i++) {
      w.step(DT, still);
      expect(b.hand).toBeGreaterThanOrEqual(0);
      expect(b.hand).toBeLessThan(TAU);
      if (b.hand < last) seams++;
      // Clockwise by exactly a step's share of the turn: never back, never faster.
      const moved = (((b.hand - last) % TAU) + TAU) % TAU;
      expect(moved).toBeCloseTo(PER_STEP, 9);
      turned += moved;
      last = b.hand;
      // A quarter turn in, a quarter round from two.
      if (i + 1 === STEPS_PER_TURN / 4) expect(apart(b.hand, TIME_HAND_REST + Math.PI / 2)).toBeLessThan(1e-9);
    }
    expect(turned).toBeCloseTo(TAU, 6);
    expect(apart(b.hand, TIME_HAND_REST)).toBeLessThan(1e-9);
    // It passed twelve once, wrapping, and carried on: not reset.
    expect(seams).toBe(1);
    expect(w.hp).toBe(w.maxHp);
  });
});

describe('the hand touches (§4)', () => {
  /**
   * Five worlds on one seed, stepped one full turn together, the player in
   * each set down relative to the hand before every step with health and
   * i-frames cleared, so every step asks the geometry alone. The hand moves
   * PER_STEP inside the step, a few px at 300px, well inside the margins.
   */
  it('hurts a player on the blade at every angle of a turn, across the seam at twelve, and none beside it, past its tip or on the short hand’s side', () => {
    const cases: Record<string, (w: World, b: NonNullable<World['boss']>) => { x: number; y: number }> = {
      on: (_w, b) => at(b, b.hand, 300),
      behind: (w, b) => at(b, b.hand, 300, -(reachOf(w) + 4)),
      ahead: (w, b) => at(b, b.hand, 300, reachOf(w) + 4 + 300 * PER_STEP),
      pastTip: (w, b) => at(b, b.hand, TIME.sweepLength + w.playerRadius + 4),
      opposite: (_w, b) => at(b, b.hand + Math.PI, 200),
    };
    for (const [name, where] of Object.entries(cases)) {
      const w = empty(63);
      const b = toBoss(w);
      let hurt = 0;
      let nearTwelve = 0;
      for (let i = 0; i < STEPS_PER_TURN; i++) {
        const p = where(w, b);
        w.x = p.x;
        w.y = p.y;
        w.hp = w.maxHp;
        w.invulnerable = 0;
        const before = b.hand;
        w.step(DT, still);
        const hit = w.hp < w.maxHp;
        if (hit) {
          hurt++;
          expect(w.maxHp - w.hp, name).toBeCloseTo(EGG_SHOT.damage * w.damageTaken, 9);
        }
        if (name === 'on') {
          expect(hit, `on the blade at ${before.toFixed(3)} rad and not hurt`).toBe(true);
          if (before > TAU - 0.05 || before < 0.05) nearTwelve++;
        }
      }
      if (name === 'on') {
        expect(hurt).toBe(STEPS_PER_TURN);
        // Both sides of the seam at twelve were asked.
        expect(nearTwelve).toBeGreaterThan(2);
      } else {
        expect(hurt, name).toBe(0);
      }
      expect(w.dead).toBe(false);
    }
  });

  it('the short hand is drawn and harmless: its drawn pose at Time’s arrival hurts nobody', () => {
    const SHORT = (305.2 * Math.PI) / 180; // boss-time.svg: the short hand, ten past ten
    const w = empty(64);
    const b = toBoss(w);
    for (const along of [40, 60, 80]) {
      const p = at(b, SHORT, along);
      w.x = p.x;
      w.y = p.y;
      w.step(DT, still);
      expect(w.hp).toBe(w.maxHp);
    }
  });

  it('a player held on the blade is hurt once per i-frame window, for the Egg’s shot damage', () => {
    const w = empty(65);
    const b = toBoss(w);
    const hits: number[] = [];
    for (let i = 0; i < 4 * 60; i++) {
      const p = at(b, b.hand, 300);
      w.x = p.x;
      w.y = p.y;
      w.hp = w.maxHp;
      w.step(DT, still);
      if (w.hp < w.maxHp) {
        expect(w.maxHp - w.hp).toBeCloseTo(EGG_SHOT.damage * w.damageTaken, 9);
        hits.push(i);
      }
    }
    expect(hits[0]).toBe(0);
    const window = Math.round(IFRAMES / DT);
    for (let k = 1; k < hits.length; k++) {
      const gap = hits[k]! - hits[k - 1]!;
      expect(gap).toBeGreaterThanOrEqual(window);
      expect(gap).toBeLessThanOrEqual(window + 1);
    }
    expect(hits.length).toBeGreaterThanOrEqual(Math.floor(4 / IFRAMES));
  });

  it('standing still 300px out is one hit a turn: the i-frames outlast the blade’s pass there', () => {
    const w = empty(66);
    const b = toBoss(w);
    // A quarter turn round from the rest pose, 300px out: the blade reaches it in about three seconds.
    const p = at(b, TIME_HAND_REST + Math.PI / 2, 300);
    w.x = p.x;
    w.y = p.y;
    let hits = 0;
    for (let i = 0; i < STEPS_PER_TURN; i++) {
      const hp = w.hp;
      w.step(DT, still);
      if (w.hp < hp) hits++;
      w.hp = w.maxHp;
    }
    expect(hits).toBe(1);
  });

  it('is not contact: a sleeper on the Nap is hit by it, as a shot hits them — the clock keeps running', () => {
    const nap = ITEMS['nap'];
    if (!nap || !isActive(nap) || !nap.nap) throw new Error('the Nap is a nap-mode item');
    const w = empty(69);
    w.items.set(nap.id, 1);
    const b = toBoss(w);
    // Off the blade, under the Nap's threshold for one step: asleep.
    let p = at(b, b.hand + Math.PI, 200);
    w.x = p.x;
    w.y = p.y;
    w.hp = w.maxHp * (nap.nap.threshold - 0.01);
    w.step(DT, still);
    expect(w.napTimer, 'the Nap did not put the player to sleep').toBeGreaterThan(0);
    // The Nap sets no i-frames: it skips touches, and the hand is not one.
    expect(w.invulnerable).toBe(0);
    // Onto the blade, still asleep: hit for the Egg's damage, less a step of the nap's heal.
    p = at(b, b.hand, 300);
    w.x = p.x;
    w.y = p.y;
    const hp = w.hp;
    w.step(DT, still);
    expect(w.napTimer).toBeGreaterThan(0);
    expect(hp - w.hp).toBeGreaterThan(EGG_SHOT.damage * w.damageTaken - 1);
    expect(hp - w.hp).toBeLessThanOrEqual(EGG_SHOT.damage * w.damageTaken);
    expect(w.invulnerable).toBeGreaterThan(0);
  });

  it('a death to the hand is a death to Time, and no knee is filed on the body', () => {
    const w = empty(67);
    const b = toBoss(w);
    // A step short of the first quarter, off the blade.
    for (let i = 0; i < STEPS_PER_TURN / TIME_FILES_PER_TURN - 1; i++) {
      const p = at(b, b.hand + Math.PI, 200);
      w.x = p.x;
      w.y = p.y;
      w.step(DT, still);
    }
    expect(b.filed).toBe(0);
    // Then on it, at one health, for a step three steps long: the quarter is
    // certainly due on it (a sum of sixtieths is not exact), and the blade
    // turns under 8px there, well inside its reach.
    const p = at(b, b.hand, 300);
    w.x = p.x;
    w.y = p.y;
    w.hp = 1;
    w.step(3 * DT, still);
    expect(w.dead).toBe(true);
    expect(w.certificate).toMatchObject({ outcome: 'died', actId: 'decline', causeId: 'boss', cause: 'Time' });
    expect(knees(w)).toEqual([]);
  });
});

describe('the file: a knee at every quarter turn (§4)', () => {
  it('is the roster’s knee, a Decline enemy that lands at the lead', () => {
    const def = enemyDef(TIME_FILE_ID);
    expect(def.act).toBe('decline');
    expect(def.spawnAt).toBe('lead');
    expect(def.movement).toBe('static');
    expect(def.contact).toBe('attach');
    expect(TIME_FILES_PER_TURN).toBe(4); // the placeholder: "a knee a quarter turn"
  });

  it('lands one at the player’s lead at each quarter turn, never on them', () => {
    const w = empty(71);
    const b = toBoss(w);
    away(w, b);
    const landed: number[] = [];
    // A step past the turn: a sum of sixtieths is not exact.
    for (let i = 0; i <= STEPS_PER_TURN; i++) {
      const n = knees(w).length;
      w.step(DT, still);
      const now = knees(w);
      expect(now.length - n).toBeLessThanOrEqual(1);
      if (now.length > n) {
        landed.push(i + 1);
        const k = now[now.length - 1]!;
        expect(k.x).toBeCloseTo(w.x + ANTIBODY_LEAD, 9);
        expect(k.y).toBeCloseTo(w.y, 9);
        expect(Math.hypot(k.x - w.x, k.y - w.y)).toBeGreaterThan(k.radius + w.playerRadius);
      }
      expect(b.filed).toBe(knees(w).length);
    }
    expect(landed).toHaveLength(TIME_FILES_PER_TURN);
    // At each quarter of the turn, to within a step.
    landed.forEach((step, k) => {
      expect(Math.abs(step - ((k + 1) * STEPS_PER_TURN) / TIME_FILES_PER_TURN)).toBeLessThanOrEqual(1);
    });
    expect(w.hp).toBe(w.maxHp);
  });

  it('at a wall the player faces, lands at the lead behind them, never on them', () => {
    const r = Math.SQRT1_2;
    const spots: Array<[number, number, number, number]> = [
      [ARENA_WIDTH, ARENA_HEIGHT / 2 + 300, 1, 0],
      [0, ARENA_HEIGHT / 2 + 300, -1, 0],
      [ARENA_WIDTH / 2 + 700, ARENA_HEIGHT, 0, 1],
      [ARENA_WIDTH, ARENA_HEIGHT, r, r],
      [0, ARENA_HEIGHT, -r, r],
      [ARENA_WIDTH - 5, ARENA_HEIGHT - 5, 1, 0],
    ];
    for (const [x, y, fx, fy] of spots) {
      const w = empty(72);
      const b = toBoss(w);
      w.x = x;
      w.y = y;
      w.facingX = fx;
      w.facingY = fy;
      // Out of the hand's reach, so only the file is under test.
      expect(Math.hypot(x - b.x, y - b.y)).toBeGreaterThan(TIME.sweepLength + w.playerRadius + 10);
      for (let i = 0; i < STEPS_PER_TURN / TIME_FILES_PER_TURN + 1; i++) w.step(DT, still);
      const [k] = knees(w);
      expect(k, `no knee at (${x}, ${y})`).toBeDefined();
      // Behind, held inside the arena as a static is held.
      const kr = k!.radius;
      expect(k!.x).toBeCloseTo(Math.min(ARENA_WIDTH - kr, Math.max(kr, w.x - fx * ANTIBODY_LEAD)), 9);
      expect(k!.y).toBeCloseTo(Math.min(ARENA_HEIGHT - kr, Math.max(kr, w.y - fy * ANTIBODY_LEAD)), 9);
      expect(Math.hypot(k!.x - w.x, k!.y - w.y)).toBeGreaterThan(k!.radius + w.playerRadius);
      // The heading is the player's again after the call.
      expect([w.facingX, w.facingY]).toEqual([fx, fy]);
      expect(w.hp).toBe(w.maxHp);
    }
  });

  it('at MAX_ACTIVE_ENEMIES none lands, and the quarter is still counted', () => {
    const w = empty(73);
    const b = toBoss(w);
    away(w, b);
    // An inert body: the stairs' def without its hold, so it stays on `enemies`.
    const { hold: _hold, ...inert } = enemyDef('stairs');
    const filler: EnemyDef = { ...inert, id: 'filler', radius: 4 };
    let uid = 900000;
    while (w.enemies.length < MAX_ACTIVE_ENEMIES) {
      w.enemies.push({
        uid: uid++,
        hitBySerial: 0,
        hitByAreaSerial: 0,
        def: filler,
        x: 40 + (uid % 60) * 10,
        y: 40,
        vx: 0,
        vy: 0,
        hp: 1,
        age: 0,
        hitFlash: 0,
        radius: 4,
        displaySize: 8,
        xp: 0,
        consult: 0,
        reload: 0,
        generation: 0,
      });
    }
    for (let i = 0; i < STEPS_PER_TURN / TIME_FILES_PER_TURN + 1; i++) w.step(DT, still);
    expect(b.filed).toBe(1);
    expect(knees(w)).toEqual([]);
    expect(w.enemies.length).toBe(MAX_ACTIVE_ENEMIES);
  });
});

describe('the stairs never land on the player (AUDIT 93)', () => {
  const STAIRS = enemyDef('stairs');
  const HOLD = STAIRS.hold!;

  it('at a wall they face, the flight lands at the lead behind them', () => {
    const w = empty(81);
    w.x = ARENA_WIDTH;
    w.y = ARENA_HEIGHT / 2;
    w.facingX = 1;
    w.facingY = 0;
    w.spawnEnemy('stairs');
    const h = w.holds[0]!;
    expect(h.x).toBeCloseTo(ARENA_WIDTH - ANTIBODY_LEAD, 9);
    expect(h.y).toBe(w.y);
    expect([w.facingX, w.facingY]).toEqual([1, 0]);
  });

  it('in the open field, at the lead ahead, as before', () => {
    const w = empty(82);
    w.facingX = 0;
    w.facingY = -1;
    w.spawnEnemy('stairs');
    const h = w.holds[0]!;
    expect(h.x).toBe(w.x);
    expect(h.y).toBeCloseTo(w.y - ANTIBODY_LEAD, 9);
  });

  it('from anywhere along every wall and in every corner, facing any of eight ways, no flight lands with the player inside it', () => {
    const w = empty(83);
    const xs = [0, 20, 100, 150, 300, ARENA_WIDTH / 2, ARENA_WIDTH - 300, ARENA_WIDTH - 150, ARENA_WIDTH - 100, ARENA_WIDTH - 20, ARENA_WIDTH];
    const ys = [0, 20, 100, 150, 300, ARENA_HEIGHT / 2, ARENA_HEIGHT - 300, ARENA_HEIGHT - 150, ARENA_HEIGHT - 100, ARENA_HEIGHT - 20, ARENA_HEIGHT];
    let turned = 0;
    for (const x of xs) {
      for (const y of ys) {
        for (let k = 0; k < 8; k++) {
          const a = (k * Math.PI) / 4;
          w.x = x;
          w.y = y;
          w.facingX = Math.cos(a);
          w.facingY = Math.sin(a);
          w.holds.length = 0;
          w.spawnEnemy('stairs');
          const h = w.holds[0]!;
          const d = Math.hypot(h.x - w.x, h.y - w.y);
          expect(d, `(${x}, ${y}) facing ${k * 45}°`).toBeGreaterThanOrEqual(HOLD.to + w.playerRadius);
          // Ahead where it fits, behind where it does not: never anywhere else.
          const ahead = (h.x - w.x) * w.facingX + (h.y - w.y) * w.facingY > 0;
          if (!ahead) turned++;
        }
      }
    }
    // The case exists: some of these put the lead against a wall.
    expect(turned).toBeGreaterThan(0);
  });

  it('draws no dice', () => {
    const run = (wall: boolean) => {
      const w = empty(84);
      if (wall) w.x = ARENA_WIDTH;
      w.facingX = 1;
      w.facingY = 0;
      w.spawnEnemy('stairs');
      return nextRoll(w);
    };
    expect(run(true)).toBe(run(false));
  });
});

describe('no dice, and the hands stop (§4)', () => {
  it('over a full turn, the hand touching and the knees filed, the next roll is the one a world without Time would roll', () => {
    const run = (fires: boolean) => {
      const w = empty(91);
      // A step past the turn in both: a sum of sixtieths is not exact.
      if (!fires) {
        w.step(DT, still);
        for (let i = 0; i <= STEPS_PER_TURN; i++) w.step(DT, still);
        expect(w.boss).toBeNull();
        return nextRoll(w);
      }
      const b = toBoss(w);
      // Where the blade reaches in about three seconds, standing still.
      const p = at(b, TIME_HAND_REST + Math.PI / 2, 300);
      w.x = p.x;
      w.y = p.y;
      let hits = 0;
      for (let i = 0; i <= STEPS_PER_TURN; i++) {
        const hp = w.hp;
        w.step(DT, still);
        if (w.hp < hp) hits++;
        w.hp = w.maxHp;
      }
      expect(hits).toBeGreaterThan(0);
      expect(b.filed).toBe(TIME_FILES_PER_TURN);
      return nextRoll(w);
    };
    expect(run(true)).toBe(run(false));
  });

  it('when the clock runs out the hands stop: neither the hand nor the file moves in the exit, and the life is won', () => {
    const w = empty(92);
    const b = toBoss(w);
    away(w, b);
    let steps = 0;
    while (b.phase !== 'absorbing' && steps < (TIME.seconds + 1) / DT) {
      w.step(DT, still);
      steps++;
    }
    expect(b.phase).toBe('absorbing');
    // Every quarter mark strictly before `seconds`: the one due on the step
    // the hands stop is not filed.
    expect(b.filed).toBe(Math.ceil((TIME.seconds * TIME_FILES_PER_TURN) / TIME.sweepSeconds) - 1);
    const hand = b.hand;
    const filed = b.filed;
    for (let i = 0; i < 60 && !w.won; i++) {
      w.step(DT, still);
      expect(b.hand).toBe(hand);
      expect(b.filed).toBe(filed);
    }
    for (let i = 0; i < 120 && !w.won; i++) w.step(DT, still);
    expect(w.won).toBe(true);
    expect(w.certificate).toMatchObject({ outcome: 'won', causeId: 'natural-causes', age: DECLINE.age.to });
  });
});
