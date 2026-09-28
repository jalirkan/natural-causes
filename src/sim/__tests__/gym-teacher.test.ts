import { describe, expect, it } from 'vitest';
import { CONCEPTION, SCHOOL, whistleInterval, type ActDef, type GymTeacherBoss } from '../../data/acts';
import { ENEMIES } from '../../data/enemies';
import { BOSS_HP, BOSS_RADIUS, World, type BossState, type EnemyState } from '../world';

/**
 * The Gym Teacher (SCHOOL-ROSTER §9). He stands where the boss spawns and
 * never moves or touches the player; his telegraph is the whistle rising and
 * his attack is the whistle, which relaunches every dodgeball on the field at
 * the player and throws three more; he cannot be damaged while any dodgeball
 * is alive; at zero the act ends, on PARTICIPATION.
 *
 * Every number is read off `SCHOOL.boss` or the ball's def, never written
 * here: they are placeholders under SCHOOL's `provisional` label, and a test
 * asserting one would be a placeholder pretending to be a decision.
 */

const DT = 1 / 60;
const STILL = { moveX: 0, moveY: 0 };

function gymTeacher(): GymTeacherBoss {
  if (SCHOOL.boss.kind !== 'gym-teacher') throw new Error('School does not declare the Gym Teacher');
  return SCHOOL.boss;
}
const GYM = gymTeacher();
const BALL = ENEMIES[GYM.enemyId]!;

/**
 * A School world at its boss: the field emptied, the player unarmed and 600px
 * to his right, and the whistle quiet unless a test says otherwise.
 */
function atTheGymTeacher(act: ActDef = SCHOOL): World {
  const w = new World({ act, seed: 7, startingItems: [] });
  w.time = act.durationSeconds;
  w.step(DT, STILL);
  expect(w.boss).not.toBeNull();
  w.enemies.length = 0;
  w.projectiles.length = 0;
  w.gems.length = 0;
  w.boss!.timer = 999;
  w.x = w.boss!.x + 600;
  w.y = w.boss!.y;
  return w;
}

/** A ball placed exactly, standing still unless given a velocity. */
function ball(w: World, x: number, y: number, vx = 0, vy = 0): EnemyState {
  w.spawnEnemy(BALL.id);
  const e = w.enemies[w.enemies.length - 1]!;
  e.x = x;
  e.y = y;
  e.vx = vx;
  e.vy = vy;
  return e;
}

let serial = 900_000;
/** A friendly shot parked on the boss. */
function shoot(w: World, damage: number): void {
  const b = w.boss!;
  w.projectiles.push({
    x: b.x,
    y: b.y,
    vx: 0,
    vy: 0,
    life: 1,
    damage,
    pierce: 1,
    radius: 10,
    hostile: false,
    serial: serial++,
  });
}

/** Steps with the player kept alive (not the subject), choosing the first offer. */
function alive(w: World, seconds: number, moveX = 0, moveY = 0, each?: () => void): void {
  const steps = Math.round(seconds * 60);
  for (let i = 0; i < steps; i++) {
    if (w.offers) {
      w.choose(w.offers[0]!);
      continue;
    }
    if (w.won) return;
    w.hp = w.maxHp;
    w.dead = false;
    w.step(DT, { moveX, moveY });
    each?.();
  }
}

/** Read through a call, so a test that just assigned a phase is not narrowed to it. */
const phase = (w: World): BossState['phase'] => w.boss!.phase;
const hostile = (w: World) => w.projectiles.filter((p) => p.hostile);
const balls = (w: World) => w.enemies.filter((e) => e.def.id === BALL.id);

describe('(a) each act declares its boss, and the sim spawns that one', () => {
  it('School declares the Gym Teacher, commanding the dodgeball; Conception declares the Egg', () => {
    expect(SCHOOL.boss.kind).toBe('gym-teacher');
    expect(GYM.enemyId).toBe('dodgeball');
    expect(CONCEPTION.boss.kind).toBe('egg');
  });

  it("at School's boss time the Gym Teacher appears; at Conception's, the Egg", () => {
    const school = new World({ act: SCHOOL, seed: 3 });
    school.time = SCHOOL.durationSeconds;
    school.step(DT, STILL);
    expect(school.boss?.kind).toBe('gym-teacher');

    const conception = new World({ act: CONCEPTION, seed: 3 });
    conception.time = CONCEPTION.durationSeconds;
    conception.step(DT, STILL);
    expect(conception.boss?.kind).toBe('egg');
    expect(conception.boss?.shielded).toBe(false);
  });

  it('in a life, the Egg ends Conception and the Gym Teacher is what School brings', () => {
    const w = new World({ acts: [CONCEPTION, SCHOOL], seed: 5 });
    w.time = CONCEPTION.durationSeconds;
    alive(w, DT);
    expect(w.boss?.kind).toBe('egg');
    w.boss!.hp = 0;
    w.boss!.phase = 'absorbing';
    w.boss!.timer = 0;
    alive(w, DT);
    expect(w.act).toBe(SCHOOL);
    w.actTime = SCHOOL.durationSeconds;
    alive(w, DT);
    expect(w.boss?.kind).toBe('gym-teacher');
  });

  it('arrives shielded when the crowd phase left a ball on the field', () => {
    const w = new World({ act: SCHOOL, seed: 7, startingItems: [] });
    w.time = SCHOOL.durationSeconds - DT / 2;
    ball(w, 200, 200);
    w.step(DT, STILL);
    expect(w.boss).not.toBeNull();
    expect(w.boss!.shielded).toBe(true);
  });

  it('never moves and never fires; he whistles instead', () => {
    const w = atTheGymTeacher();
    const b = w.boss!;
    b.timer = 0.5;
    const at = { x: b.x, y: b.y };
    let whistles = 0;
    let was = phase(w);
    alive(w, 20, 0, 0, () => {
      expect(hostile(w), 'the Gym Teacher fired a shot').toHaveLength(0);
      if (phase(w) === 'attack' && was !== 'attack') whistles++;
      was = phase(w);
    });
    expect(whistles).toBeGreaterThanOrEqual(2);
    expect(b.x).toBe(at.x);
    expect(b.y).toBe(at.y);
  });
});

describe('(b) he cannot be damaged while any ball is alive', () => {
  it('a shot and a field do nothing to him with a ball up; a shot lands once none is', () => {
    const w = atTheGymTeacher();
    const b = w.boss!;
    const e = ball(w, 200, 200);
    shoot(w, 10);
    w.areas.push({
      x: b.x, y: b.y, age: 0, seconds: 0.5, radius: 60,
      damage: 10, pull: false, tick: true, serial: serial++,
    });
    w.step(DT, STILL);
    expect(b.shielded).toBe(true);
    expect(b.hp).toBe(BOSS_HP);
    // It reached him and was stopped, not waved through.
    expect(w.projectiles.filter((p) => !p.hostile)).toHaveLength(0);

    w.areas.length = 0;
    e.hp = 0; // put away: reaped this step, drops its gem like any kill
    shoot(w, 10);
    w.step(DT, STILL);
    expect(w.enemies).not.toContain(e);
    expect(b.shielded).toBe(false);
    expect(b.hp).toBe(BOSS_HP - 10);
  });

  it('an orbiting weapon is shielded against too', () => {
    const hits = (withBall: boolean): number => {
      const w = atTheGymTeacher();
      const b = w.boss!;
      w.items.set('grudge', 1);
      // On his edge, so the orbit passes through him.
      w.x = b.x + BOSS_RADIUS;
      w.y = b.y;
      if (withBall) ball(w, 200, 200);
      for (let i = 0; i < 120; i++) {
        w.x = b.x + BOSS_RADIUS;
        w.y = b.y;
        w.step(DT, STILL);
      }
      return BOSS_HP - b.hp;
    };
    expect(hits(true)).toBe(0);
    expect(hits(false)).toBeGreaterThan(0);
  });

  it('a shielded Gym Teacher cannot be taken to zero at all', () => {
    const w = atTheGymTeacher();
    const b = w.boss!;
    ball(w, 200, 200);
    shoot(w, BOSS_HP * 10);
    w.step(DT, STILL);
    expect(b.hp).toBe(BOSS_HP);
    expect(b.phase).not.toBe('absorbing');
  });
});

describe('(c) the whistle', () => {
  it('rises for the telegraph, then relaunches every ball at the player and throws exactly three more', () => {
    const w = atTheGymTeacher();
    const b = w.boss!;
    // Heading away from the player, into the far wall.
    const old = ball(w, 300, b.y + 900, -BALL.speed, 0);
    const oldUid = old.uid;
    // Not a ball: the whistle does not command it.
    w.spawnEnemy('clique');
    const clique = w.enemies[1]!;
    clique.x = 3000;
    clique.y = 200;
    clique.vx = 7;
    clique.vy = -3;

    b.phase = 'idle';
    b.timer = DT / 2;
    w.step(DT, STILL);
    expect(b.phase).toBe('telegraph');

    let rising = 0;
    while (phase(w) === 'telegraph' && rising < 600) {
      expect(balls(w), 'something was thrown during the telegraph').toHaveLength(1);
      w.hp = w.maxHp;
      w.step(DT, STILL);
      rising++;
    }
    expect(b.phase).toBe('attack');
    // The rise lasted the declared telegraph, within a frame.
    expect(Math.abs((rising + 0.5) * DT - GYM.telegraphSeconds)).toBeLessThanOrEqual(DT);

    // The old ball: aimed at where the player is, at its own full speed.
    const toX = w.x - old.x;
    const toY = w.y - old.y;
    const cos = (old.vx * toX + old.vy * toY) / (Math.hypot(old.vx, old.vy) * Math.hypot(toX, toY));
    expect(cos).toBeGreaterThan(0.9999);
    expect(Math.hypot(old.vx, old.vy)).toBeCloseTo(BALL.speed, 6);

    // Exactly GYM.thrown new balls, at his position, through the one
    // constructor: every field a spawned ball has.
    const thrown = balls(w).filter((e) => e.uid !== oldUid);
    expect(GYM.thrown).toBe(3);
    expect(thrown).toHaveLength(GYM.thrown);
    expect(new Set(thrown.map((e) => e.uid)).size).toBe(GYM.thrown);
    const base = Math.atan2(w.y - b.y, w.x - b.x);
    const offsets: number[] = [];
    for (const e of thrown) {
      expect(e.uid).toBeGreaterThan(oldUid);
      expect(e.def).toBe(BALL);
      expect(e.x).toBe(b.x);
      expect(e.y).toBe(b.y);
      expect(Math.hypot(e.vx, e.vy)).toBeCloseTo(BALL.speed, 6);
      expect(e).toMatchObject({
        hp: BALL.hp,
        radius: BALL.radius,
        displaySize: BALL.displaySize,
        xp: BALL.xp,
        age: 0,
        hitFlash: 0,
        hitBySerial: 0,
        hitByAreaSerial: 0,
        consult: 0,
        reload: 0,
      });
      offsets.push(Math.atan2(e.vy, e.vx) - base);
    }
    // A fan centred on the player: one straight at them, the rest either side.
    offsets.sort((p, q) => p - q);
    offsets.forEach((o, i) => expect(o).toBeCloseTo((i - (GYM.thrown - 1) / 2) * GYM.throwSpread, 6));

    // The clique was not whistled at, nothing was fired, and he is shielded.
    expect(clique.vx).toBe(7);
    expect(clique.vy).toBe(-3);
    expect(hostile(w)).toHaveLength(0);
    expect(b.shielded).toBe(true);
  });
});

describe('(d) the gap shortens as his health falls', () => {
  /** Seconds between the second and third whistles, at a given health. */
  function whistleGap(hp: number): number {
    const w = atTheGymTeacher();
    const b = w.boss!;
    b.hp = hp;
    b.phase = 'idle';
    b.timer = DT / 2;
    const blown: number[] = [];
    let was = phase(w);
    for (let i = 0; i < 60 * 30 && blown.length < 3; i++) {
      w.hp = w.maxHp;
      w.dead = false;
      w.step(DT, STILL);
      if (phase(w) === 'attack' && was !== 'attack') blown.push(w.time);
      was = phase(w);
    }
    expect(blown).toHaveLength(3);
    // Unarmed: nothing touched him, so the gap was read at the health set.
    expect(b.hp).toBe(hp);
    return blown[2]! - blown[1]!;
  }

  it('whistles on the declared cadence at full health and faster near zero', () => {
    const full = whistleGap(BOSS_HP);
    const low = whistleGap(1);
    expect(low).toBeLessThan(full);
    expect(Math.abs(full - whistleInterval(GYM, 1))).toBeLessThanOrEqual(DT * 1.5);
    expect(Math.abs(low - whistleInterval(GYM, 1 / BOSS_HP))).toBeLessThanOrEqual(DT * 1.5);
  });

  it('the interval runs from the full-health figure to the zero figure, and only down', () => {
    expect(whistleInterval(GYM, 1)).toBe(GYM.whistleSeconds.atFull);
    expect(whistleInterval(GYM, 0)).toBe(GYM.whistleSeconds.atZero);
    expect(GYM.whistleSeconds.atZero).toBeLessThan(GYM.whistleSeconds.atFull);
    let previous = Infinity;
    for (let f = 1; f >= 0; f -= 0.1) {
      const now = whistleInterval(GYM, f);
      expect(now).toBeLessThan(previous);
      previous = now;
    }
  });
});

describe('(e) at zero the act ends, the way any act ends', () => {
  const WON_AT_TWELVE = {
    outcome: 'won',
    actId: 'school',
    actName: 'School',
    age: SCHOOL.age.to,
    causeId: 'natural-causes',
    cause: 'natural causes',
    rules: [],
  };

  it('School is the last act: zero is the win, of natural causes, aged 12', () => {
    const w = atTheGymTeacher();
    const b = w.boss!;
    b.hp = 5;
    shoot(w, 10);
    w.step(DT, STILL);
    expect(b.hp).toBe(0);
    expect(b.phase).toBe('absorbing');
    for (let i = 0; i < 300 && !w.won; i++) w.step(DT, STILL);
    expect(w.won).toBe(true);
    expect(w.outcome).toBe('won');
    expect(w.certificate).toEqual({ ...WON_AT_TWELVE, actIndex: 0 });
    expect(SCHOOL.age.to).toBe(12);
  });

  it('the same at the end of a life of two acts', () => {
    const w = new World({ acts: [CONCEPTION, SCHOOL], seed: 9, startingItems: [] });
    w.time = CONCEPTION.durationSeconds;
    w.step(DT, STILL);
    w.boss!.hp = 0;
    w.boss!.phase = 'absorbing';
    w.boss!.timer = 0;
    w.step(DT, STILL);
    expect(w.act).toBe(SCHOOL);
    w.actTime = SCHOOL.durationSeconds;
    w.step(DT, STILL);
    const b = w.boss!;
    expect(b.kind).toBe('gym-teacher');
    w.enemies.length = 0;
    b.timer = 999;
    shoot(w, BOSS_HP);
    for (let i = 0; i < 300 && !w.won; i++) {
      w.hp = w.maxHp;
      w.step(DT, STILL);
    }
    expect(w.won).toBe(true);
    expect(w.certificate).toEqual({ ...WON_AT_TWELVE, actIndex: 1 });
  });

  it('School ends on PARTICIPATION; Conception on no word', () => {
    expect(SCHOOL.endWord).toBe('PARTICIPATION');
    expect(CONCEPTION.endWord).toBeUndefined();
  });
});

describe('(f) a death in the fight names what hit you', () => {
  it('a thrown ball kills: the certificate says Dodgeball, not the Gym Teacher', () => {
    const w = atTheGymTeacher();
    const b = w.boss!;
    b.phase = 'telegraph';
    b.timer = DT / 2;
    w.step(DT, STILL);
    expect(balls(w)).toHaveLength(GYM.thrown);

    w.hp = 1;
    w.invulnerable = 0;
    for (let i = 0; i < 600 && !w.dead; i++) {
      w.step(DT, STILL);
      expect(hostile(w)).toHaveLength(0);
    }
    expect(w.dead).toBe(true);
    expect(w.certificate).toMatchObject({
      outcome: 'died',
      actId: 'school',
      causeId: BALL.id,
      cause: BALL.name,
    });
    expect(w.certificate!.age).toBeCloseTo(SCHOOL.age.to, 6);
  });
});

describe('(g) he is not raced for', () => {
  it('a race declared beside him is inert: nothing swims to him, nothing is absorbed, nobody else wins', () => {
    const RACED: ActDef = { ...SCHOOL, id: 'school-raced-fixture', race: { enemyId: 'rival-sperm', absorb: 1 } };
    const w = atTheGymTeacher(RACED);
    const b = w.boss!;
    expect(b.kind).toBe('gym-teacher');
    expect(w.raceTarget).toBe(0);

    // On his corona: the Egg would absorb this on the first step.
    w.spawnEnemy('rival-sperm');
    const rival = w.enemies[0]!;
    rival.x = b.x;
    rival.y = b.y + BOSS_RADIUS + 5;
    w.step(DT, STILL);
    expect(w.raceAbsorbed).toBe(0);
    expect(w.enemies).toContain(rival);
    expect(w.dead).toBe(false);

    // And it chases the player, who is to his right, rather than him.
    const x0 = rival.x;
    for (let i = 0; i < 60; i++) w.step(DT, STILL);
    expect(rival.x).toBeGreaterThan(x0 + 20);
    expect(w.raceAbsorbed).toBe(0);
  });

  it('School declares no race at all', () => {
    expect(SCHOOL.race).toBeUndefined();
  });
});

describe('(h) the fight is deterministic', () => {
  it('two worlds on one seed are in the same state after the crowd phase and a minute of the fight', () => {
    const snapshot = (w: World) => ({
      time: w.time,
      x: w.x,
      y: w.y,
      kills: w.kills,
      level: w.level,
      outcome: w.outcome,
      certificate: w.certificate,
      boss: w.boss ? { ...w.boss } : null,
      enemies: w.enemies.map((e) => [e.uid, e.def.id, e.x, e.y, e.vx, e.vy, e.hp]),
      projectiles: w.projectiles.map((p) => [p.serial, p.x, p.y]),
    });
    const fight = (w: World): number => {
      let whistles = 0;
      let was: string | undefined;
      alive(w, SCHOOL.durationSeconds + 60, 1, 0.3, () => {
        const now = w.boss?.phase;
        if (now === 'attack' && was !== 'attack') whistles++;
        was = now;
      });
      return whistles;
    };
    const a = new World({ act: SCHOOL, seed: 42 });
    const b = new World({ act: SCHOOL, seed: 42 });
    const whistles = fight(a);
    fight(b);
    expect(a.boss?.kind).toBe('gym-teacher');
    // The fight was actually fought, not skipped by an early end.
    expect(whistles).toBeGreaterThanOrEqual(2);
    expect(snapshot(a)).toEqual(snapshot(b));
  });
});
