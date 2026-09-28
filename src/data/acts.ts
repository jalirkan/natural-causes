/**
 * Act RULES. Deliberately free of anything a renderer needs.
 *
 * Atlases and colours live in `act-visuals.ts`. The split exists because the
 * playtest bots import this module in Node, and an act definition that reaches
 * for a PNG drags a browser asset into the headless build — the simulation
 * would then be unable to run without the thing it is supposed to be
 * independent of.
 */

export interface SpawnWave {
  /** Seconds into the run when this wave starts. */
  fromSeconds: number;
  enemyId: string;
  /** Enemies per second at the start of this wave. */
  rate: number;
}

/**
 * Waves grouped into one escalation schedule per enemy, each sorted by time.
 *
 * The flat `waves` array is a readable way to author an act and a misleading
 * way to consume one. An act does not have "a current wave" — it has one
 * concurrent stream per enemy type, each with its own curve. Reading the flat
 * list as a single sequence produced two bugs at once: a spawner that only
 * ever emitted one enemy type, and an escalation test that no roster with
 * more than one enemy in it could satisfy.
 */
export function spawnStreams(waves: SpawnWave[]): Map<string, SpawnWave[]> {
  const streams = new Map<string, SpawnWave[]>();
  for (const wave of waves) {
    const list = streams.get(wave.enemyId);
    if (list) list.push(wave);
    else streams.set(wave.enemyId, [wave]);
  }
  for (const list of streams.values()) list.sort((a, b) => a.fromSeconds - b.fromSeconds);
  return streams;
}

/** The rate for one stream at time `seconds` — the last entry that has started. */
export function rateAt(stream: SpawnWave[], seconds: number): number {
  let rate = 0;
  for (const wave of stream) {
    if (seconds < wave.fromSeconds) break;
    rate = wave.rate;
  }
  return rate;
}

/**
 * The Egg (CONCEPTION-ROSTER). Stands still, telegraphs, fires a fan of shots
 * at the player; if the act declares a `race`, the racers swim for it. Its
 * numbers live in world.ts, where they always have — the declaration names
 * the behaviour and carries nothing else.
 */
export interface EggBoss {
  kind: 'egg';
  /** Never shielded, so nothing to say. Declared so the HUD can read any boss's. */
  shieldHint?: never;
}

/**
 * The Gym Teacher (SCHOOL-ROSTER §9). Stands where the boss spawns and never
 * moves or touches the player. His telegraph is the whistle rising; his attack
 * is the whistle: every living `enemyId` on the field is relaunched at the
 * player at that enemy's own full speed, and `thrown` more are thrown from his
 * position. He takes no damage while any `enemyId` is alive. He never races.
 *
 * The enemy is named here rather than in world.ts, so the whistle commands
 * whatever the act says it does and the sim names no School enemy.
 */
export interface GymTeacherBoss {
  kind: 'gym-teacher';
  /** What the whistle relaunches and throws, and what shields him. */
  enemyId: string;
  /**
   * Seconds from one whistle to the next, at full health and at none; linear
   * between (`whistleInterval`). Read when a whistle ends, off the health left.
   */
  whistleSeconds: { atFull: number; atZero: number };
  /** Seconds the whistle rises before it blows. */
  telegraphSeconds: number;
  /** Thrown from his position per whistle. */
  thrown: number;
  /**
   * Radians between neighbouring thrown balls, fanned about the line to the
   * player. Without a spread the throw is N balls on one point with one
   * velocity: one ball to the eye and to the player's i-frames.
   */
  throwSpread: number;
  /** What the HUD says beside his name while he is shielded: how to open him. */
  shieldHint?: string;
}

/**
 * Prom (ADOLESCENCE-ROSTER §4): a mirror ball where the boss spawns, never
 * moving. Three parts, all borrowed. The race is the Egg's (`ActDef.race`).
 * The floor is the Gym Teacher's untouchability pointed at the player: no
 * damage while the player is farther than `floorRadius` from the ball. The
 * light is the Egg's machine (idle, telegraph, attack) with the Egg's timings
 * and shot, read from world.ts, firing a full ring of `spots` in every
 * direction instead of a fan, each ring turned half a spacing from the last.
 * Aimed at nobody, so a spot has no owner and a death to one names the boss.
 */
export interface PromBoss {
  kind: 'prom';
  /** Pixels, ball centre to player centre, beyond which it takes no damage. */
  floorRadius: number;
  /** Shots in one ring, evenly spaced about the ball. */
  spots: number;
  /** What the HUD says beside its name while it is shielded. */
  shieldHint?: string;
}

/**
 * The Loan (COLLEGE-ROSTER §4): never attacks, never moves, never shields. Its
 * health compounds — every `interestSeconds` it grows by `interestRate` of
 * what it has, up to `cap` times where it started — and the fight is a
 * deadline with a number in it; at the cap it forecloses and the certificate
 * names it. Its attack drops `invoices` tuition envelopes at the player's
 * lead. It opens at BOSS_HP plus a tenth of that per invoice the player is
 * wearing when it appears. Every number is a placeholder.
 */
export interface LoanBoss {
  kind: 'loan';
  /** What its statement drops at the player's lead: the act's attach enemy (tuition). */
  enemyId: string;
  interestSeconds: number;
  interestRate: number;
  cap: number;
  invoices: number;
  shieldHint?: never;
}

/** Which boss an act fights. world.ts branches on `kind`. */
export type BossDef = EggBoss | GymTeacherBoss | PromBoss | LoanBoss;

/**
 * Seconds between the Gym Teacher's whistles at this share of his health: the
 * gap shortens as he falls (§9). Clamped, so an overkill reads as zero.
 */
export function whistleInterval(boss: GymTeacherBoss, hpFraction: number): number {
  const f = Math.min(1, Math.max(0, hpFraction));
  return boss.whistleSeconds.atZero + (boss.whistleSeconds.atFull - boss.whistleSeconds.atZero) * f;
}

export interface ActDef {
  id: string;
  name: string;
  /** How long the act runs before its boss, in seconds. */
  durationSeconds: number;
  waves: SpawnWave[];
  /**
   * What the act's boss is called on the certificate when it kills you. The
   * boss's behaviour is `boss`; this is only the name the record uses.
   */
  bossName: string;
  /**
   * Which boss the act fights, and the numbers its behaviour reads. Required:
   * an act cannot fall back to the Egg by forgetting to say.
   */
  boss: BossDef;
  /**
   * The one word the act ends on when its boss reaches zero, for the renderer
   * to show during the exit (`BossState.phase === 'absorbing'`). Absent: the
   * act ends on no word. School's is PARTICIPATION (§9).
   */
  endWord?: string;
  /**
   * The years this act covers, for the certificate. A run is one life
   * (PLAN.md 2026-09-27; D-024): age advances through the act's clock from
   * `from` to `to`, and the age at death is what the certificate prints.
   * Conception is age nought throughout; nobody has yet been born.
   */
  age: { from: number; to: number };
  /**
   * Set when the numbers in this act are placeholders nobody has played.
   *
   * One sentence: what is provisional and what resolves it. A test requires
   * the sentence, so a placeholder cannot be forgotten into a decision (the
   * failure PLAN.md's 2026-09-27 amendment names). Delete the field when a
   * person has played the act and the numbers have been moved in response —
   * not before, and not because the bots liked them.
   */
  provisional?: string;
  /**
   * The boss fight is a race (G-006). When the boss appears, every living
   * enemy of `enemyId` stops chasing the player and swims for it; if `absorb`
   * of them reach it before the player empties it, someone else got there
   * first and the life ends. Absent means the boss is only a fight.
   *
   * Only the Egg and Prom are raced for. world.ts reads this through
   * `boss.kind`, so a race declared beside any other boss is inert rather
   * than a second loss condition nobody designed.
   */
  race?: { enemyId: string; absorb: number };
}

export const CONCEPTION: ActDef = {
  id: 'conception',
  name: 'Conception',
  durationSeconds: 300,
  bossName: 'The Egg',
  boss: { kind: 'egg' },
  age: { from: 0, to: 0 },
  // PLACEHOLDER: 60 is invented; named in `provisional` below.
  race: { enemyId: 'rival-sperm', absorb: 60 },
  provisional:
    'The rates, the antibody drag floor and curvature (ANTIBODY_FLOOR and ANTIBODY_DRAG_K in world.ts), the bot cadence, the boss HP, the absorb count of the race (`race.absorb`), the second the Egg parts the crowd by on arrival (RACE_PARTING_SECONDS) and the spacing of Wake drops (WAKE_MIN_SPACING) were all set from bot runs, the XP curve and the weapon level tables (xpToNextLevel in world.ts, `levels` in items.ts) were written as placeholders, and nobody has played the act; a person playing it at the link is what moves them (§11.5, G-028, G-038).',
  // CONCEPTION-ROSTER.md §3.5. One track per enemy, read as concurrent
  // streams. A new pressure roughly every forty-five seconds for the first
  // half, then only escalation: nothing new arrives after 130s, so the last
  // three minutes are the player's build against a curve they have already
  // seen. That is the shape that lets the boss afford a new mechanic.
  waves: [
    { fromSeconds: 0, enemyId: 'rival-sperm', rate: 1.5 },
    { fromSeconds: 30, enemyId: 'rival-sperm', rate: 3 },
    { fromSeconds: 45, enemyId: 'antibody', rate: 0.6 },
    { fromSeconds: 75, enemyId: 'rival-sperm', rate: 5.5 },
    { fromSeconds: 90, enemyId: 'spermicide', rate: 0.35 },
    { fromSeconds: 120, enemyId: 'antibody', rate: 1.2 },
    { fromSeconds: 130, enemyId: 'white-cell', rate: 0.08 },
    { fromSeconds: 140, enemyId: 'rival-sperm', rate: 9 },
    { fromSeconds: 165, enemyId: 'spermicide', rate: 0.7 },
    { fromSeconds: 195, enemyId: 'white-cell', rate: 0.14 },
    { fromSeconds: 200, enemyId: 'antibody', rate: 2.0 },
    { fromSeconds: 210, enemyId: 'rival-sperm', rate: 14 },
    { fromSeconds: 240, enemyId: 'spermicide', rate: 1.1 },
    { fromSeconds: 255, enemyId: 'white-cell', rate: 0.22 },
  ],
};

export const SCHOOL: ActDef = {
  id: 'school',
  name: 'School',
  durationSeconds: 300,
  // SCHOOL-ROSTER §9. The design is the whistle, the shield and the word;
  // every number below is a PLACEHOLDER under `provisional`, and none has
  // been played:
  //   whistleSeconds 6 → 3 — §9's own placeholder, "every 6s shortening to
  //     3s at low health";
  //   telegraphSeconds 0.85 — the Egg's telegraph;
  //   thrown 3 — §9's "three more";
  //   throwSpread 0.16 — the Egg's fan spacing, so three thrown balls are
  //     three balls rather than one drawn three times.
  // Relaunch and throw speed are the dodgeball's own `speed` (enemies.ts),
  // and his health is BOSS_HP (world.ts), the Egg's.
  bossName: 'The Gym Teacher',
  boss: {
    kind: 'gym-teacher',
    enemyId: 'dodgeball',
    whistleSeconds: { atFull: 6, atZero: 3 },
    telegraphSeconds: 0.85,
    thrown: 3,
    throwSpread: 0.16,
    shieldHint: 'put the equipment away',
  },
  endWord: 'PARTICIPATION',
  age: { from: 5, to: 12 },
  provisional:
    "Every rate and time here is a placeholder built to make the act runnable, as are the substitute's attack, homework's arrival point and the monitor's stop (`ranged`, TRAIL_SECONDS, `contactStun`) and every number in the Gym Teacher's `boss` (whistle cadence, telegraph, balls thrown); SCHOOL-ROSTER.md §5 leaves the schedule undesigned and §9 the fight's numbers, and a person playing it is what moves these (D-022).",
  // SCHOOL-ROSTER.md §3.6 gives an introduction ORDER and no table: clique
  // from the start, dodgeball early, homework from the first third, hall
  // monitor mid, substitute last — and pure contact until the substitute
  // arrives, so that gold appearing means something. That order is the
  // design and is under test. The rates are not the design; they are
  // placeholders that escalate in the shape Conception's rates did, written
  // with two things in mind that Conception never had to consider:
  //
  //   - Dodgeballs, monitors and homework never despawn (they belong to the
  //     arena), so their rates are cumulative counts, not densities. At these
  //     rates a full act SPAWNS roughly twenty balls, five monitors and
  //     seventy piles' worth of paper; how many are still standing at the end
  //     depends entirely on what the build killed.
  //   - Cliques drift and are culled like Conception's drifters, so their
  //     stream is the act's density and escalates the way rivals did.
  //
  // The act clock matches Conception's so the bots' 300s instrumentation
  // reads unchanged. At 300s the Gym Teacher arrives (`boss` above), and the
  // dodgeballs still on the field are his: the crowd phase decides how many
  // he starts the fight shielded by.
  waves: [
    { fromSeconds: 0, enemyId: 'clique', rate: 0.8 },
    { fromSeconds: 25, enemyId: 'dodgeball', rate: 0.03 },
    { fromSeconds: 60, enemyId: 'clique', rate: 1.6 },
    { fromSeconds: 75, enemyId: 'dodgeball', rate: 0.06 },
    { fromSeconds: 100, enemyId: 'homework', rate: 0.25 },
    { fromSeconds: 150, enemyId: 'clique', rate: 2.8 },
    { fromSeconds: 150, enemyId: 'hall-monitor', rate: 0.02 },
    { fromSeconds: 180, enemyId: 'dodgeball', rate: 0.12 },
    { fromSeconds: 200, enemyId: 'homework', rate: 0.5 },
    { fromSeconds: 220, enemyId: 'substitute-teacher', rate: 0.1 },
    { fromSeconds: 230, enemyId: 'clique', rate: 4.5 },
    { fromSeconds: 230, enemyId: 'hall-monitor', rate: 0.04 },
    { fromSeconds: 270, enemyId: 'substitute-teacher', rate: 0.2 },
  ],
};

export const ADOLESCENCE: ActDef = {
  id: 'adolescence',
  name: 'Adolescence',
  durationSeconds: 240,
  bossName: 'Prom',
  // ADOLESCENCE-ROSTER §4. Prom is the Egg's race, a full turning ring of gold
  // spots, and the Gym Teacher's untouchability pointed at the player's
  // distance from the ball. Both numbers are PLACEHOLDERS under `provisional`:
  //   floorRadius 360 — §4's dance floor, inside Reflex's 420 so the starting
  //     weapon works from its edge;
  //   spots 16 — §4's ring, turned half a spacing per attack.
  // The telegraph, idle, spot speed, damage and radius are the Egg's, read
  // from world.ts rather than copied here; its health is BOSS_HP.
  boss: { kind: 'prom', floorRadius: 360, spots: 16, shieldHint: 'get on the floor' },
  // The house lights come up, a camera flashes, and the act ends on one word.
  endWord: 'SMILE',
  age: { from: 13, to: 18 },
  // The second race of the player's life, and the first one they were invited
  // to: at Prom every living hormone goes to the dance. PLACEHOLDER: 40 is
  // §4's, named in `provisional` below.
  race: { enemyId: 'hormones', absorb: 40 },
  provisional:
    "Every rate, time and enemy number here, the race's absorb count, and Prom's floor radius (`boss.floorRadius`, 360) and spot count (`boss.spots`, 16) were written as placeholders before anyone played the act, and Prom's light borrows the Egg's telegraph, cadence and shot unplayed (ADOLESCENCE-ROSTER §4), and the two items born here, Growth Spurt and Snooze, carry numbers written from the direction panel's sketches (their multipliers, cooldown, radius, slow and duration in items.ts); a person playing it at the link is what moves them (D-022).",
  // ADOLESCENCE-ROSTER.md §3.6, transcribed. The ORDER is the design and is
  // under test (adolescence-act.test.ts): age runs 13 to 18, a year every 48
  // seconds, and each enemy arrives about when it does in a life — hormones
  // from 0s (13), acne at 24s, the group chat at 48s (14), the standardised
  // test at 120s, driver's ed at 144s (16). School held gold back so it would
  // mean something; here it arrives in the first minute and means that it is
  // always there. Nothing new arrives after 144s; the last 96 seconds are
  // escalation, then Prom.
  //
  // The rates are placeholders. Nothing in this act is ever culled (three
  // chasers, a static, a patrol), so every rate is a count: an act that kills
  // nothing spawns about five tests, four cars, fifty spots and twenty chats,
  // and the hormones are the density, as the rivals were.
  waves: [
    { fromSeconds: 0, enemyId: 'hormones', rate: 1.2 },
    { fromSeconds: 24, enemyId: 'acne', rate: 0.15 },
    { fromSeconds: 48, enemyId: 'group-chat', rate: 0.06 },
    { fromSeconds: 48, enemyId: 'hormones', rate: 2.2 },
    { fromSeconds: 96, enemyId: 'acne', rate: 0.25 },
    { fromSeconds: 96, enemyId: 'hormones', rate: 3.5 },
    { fromSeconds: 120, enemyId: 'group-chat', rate: 0.12 },
    { fromSeconds: 120, enemyId: 'standardised-test', rate: 0.03 },
    { fromSeconds: 144, enemyId: 'drivers-ed', rate: 0.03 },
    { fromSeconds: 144, enemyId: 'hormones', rate: 5.5 },
    { fromSeconds: 192, enemyId: 'acne', rate: 0.4 },
    { fromSeconds: 192, enemyId: 'group-chat', rate: 0.2 },
    { fromSeconds: 192, enemyId: 'hormones', rate: 8 },
    { fromSeconds: 192, enemyId: 'standardised-test', rate: 0.06 },
    { fromSeconds: 216, enemyId: 'drivers-ed', rate: 0.06 },
  ],
};

export const COLLEGE: ActDef = {
  id: 'college',
  name: 'College',
  // The clock shrinks as the life goes on (the roster's header).
  durationSeconds: 210,
  bossName: 'The Loan',
  // COLLEGE-ROSTER §4. It never attacks, moves or shields: its health
  // compounds every `interestSeconds` by `interestRate` up to `cap` times its
  // start, and its statement drops `invoices` tuition at the player's lead.
  // All four are PLACEHOLDERS under `provisional`; its health is BOSS_HP.
  boss: { kind: 'loan', enemyId: 'tuition', interestSeconds: 5, interestRate: 0.06, cap: 3, invoices: 3 },
  // The tape stops, and the act ends on one word.
  endWord: 'CONGRATULATIONS',
  age: { from: 18, to: 22 },
  // No race: nobody else wants the balance.
  provisional:
    "Every rate, time and enemy number here, tuition's tax on each gem (`attach.tax`, 0.08 a stack), the registrar's stop (`ranged.stun`, 0.5s), the group project's weak point (one quadrant of four, rolled at spawn, and what counts as landing there), and all four of The Loan's numbers (`boss.interestSeconds` 5, `interestRate` 0.06, `cap` 3, `invoices` 3) were written as placeholders before anyone played the act (COLLEGE-ROSTER §3.6 and §4, G-045), as was the tenth of its health each worn invoice adds to its opening balance; a person playing it at the link is what moves them (D-022).",
  // COLLEGE-ROSTER.md §3.6, transcribed. The ORDER is the design and is under
  // test (college-act.test.ts): age runs 18 to 22, a year every 52.5 seconds.
  // Reading from 0s (18), the first week; tuition at 20s, the first bill; the
  // registrar at 45s, the first hold; the group project at 80s (19); the
  // deadline at 100s, then about every 30s. Nothing new after 130s; the last
  // 80 seconds are escalation, then The Loan.
  //
  // The rates are placeholders. Nothing in this act is ever culled (two
  // chasers, two statics, a patrol), so every rate is a count, and reading is
  // the density, as the rivals and the hormones were.
  waves: [
    { fromSeconds: 0, enemyId: 'reading', rate: 1.4 },
    { fromSeconds: 20, enemyId: 'tuition', rate: 0.12 },
    { fromSeconds: 45, enemyId: 'registrar', rate: 0.05 },
    { fromSeconds: 45, enemyId: 'reading', rate: 2.4 },
    { fromSeconds: 80, enemyId: 'group-project', rate: 0.04 },
    { fromSeconds: 100, enemyId: 'deadline', rate: 0.034 },
    { fromSeconds: 100, enemyId: 'tuition', rate: 0.2 },
    { fromSeconds: 130, enemyId: 'reading', rate: 4 },
    { fromSeconds: 130, enemyId: 'registrar', rate: 0.1 },
    { fromSeconds: 160, enemyId: 'group-project', rate: 0.08 },
    { fromSeconds: 160, enemyId: 'reading', rate: 6 },
    { fromSeconds: 160, enemyId: 'tuition', rate: 0.3 },
  ],
};

/**
 * Every act with a schedule, in life order. The content rules iterate THIS
 * list, so an act cannot escape them by not being startable yet (the
 * sibling-collection trap CONCEPTION-ROSTER §5.3 describes — here,
 * deliberately, the rules run over the superset).
 *
 * A run is one life (D-024): `World` takes a sequence of acts and plays them
 * end to end. The bots run this whole list (`--life`); the browser runs
 * `ACTS`, the prefix whose art exists, so the life gets longer as acts become
 * startable and nothing about the sim changes when one does.
 */
export const ALL_ACTS: ActDef[] = [CONCEPTION, SCHOOL, ADOLESCENCE, COLLEGE];

/**
 * The life the browser plays, in order: the prefix of `ALL_ACTS` with an
 * atlas, a player frame and a boss frame registered in `act-visuals.ts`.
 * School joined when its authored SVG sprites landed (G-038); its boss is the
 * Gym Teacher, picture and behaviour (SCHOOL-ROSTER §9). College waits on its
 * drawings (G-045): it has a schedule and no atlas. A test asserts this list and
 * `ACT_VISUALS` agree, so moving an act in is a one-line change that fails
 * loudly if the art is not there.
 */
export const ACTS: ActDef[] = [CONCEPTION, SCHOOL, ADOLESCENCE];
