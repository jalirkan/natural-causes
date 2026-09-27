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

export interface ActDef {
  id: string;
  name: string;
  /** How long the act runs before its boss, in seconds. */
  durationSeconds: number;
  waves: SpawnWave[];
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
}

export const CONCEPTION: ActDef = {
  id: 'conception',
  name: 'Conception',
  durationSeconds: 300,
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
  provisional:
    'Every rate and time here is a placeholder built to make the act runnable; SCHOOL-ROSTER.md §5 leaves the schedule undesigned, and a person playing it is what moves these (D-022).',
  // SCHOOL-ROSTER.md §3.6 gives an introduction ORDER and no table: clique
  // from the start, dodgeball early, homework from the first third, hall
  // monitor mid, substitute last — and pure contact until the substitute
  // arrives, so that gold appearing means something. That order is the
  // design and is under test. The rates are not the design; they are the
  // smallest numbers that make the order playable, chosen with two things in
  // mind that Conception never had to consider:
  //
  //   - Dodgeballs, monitors and homework never despawn (they belong to the
  //     arena), so their rates are cumulative counts, not densities. At these
  //     rates a full act ends with roughly twenty balls, five monitors and
  //     seventy piles' worth of paper on the field.
  //   - Cliques drift and are culled like Conception's drifters, so their
  //     stream is the act's density and escalates the way rivals did.
  //
  // The act clock matches Conception's so the bots' 300s instrumentation
  // reads unchanged. The boss is NOT this act's: nothing here spawns a Gym
  // Teacher, because none is designed (§5), so at 300s the sim spawns the Egg
  // as a stand-in. A School run reaching its boss is therefore a claim about
  // the crowd phase and nothing else.
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

/**
 * Every act with a schedule. The content rules iterate THIS list, so an act
 * cannot escape them by not being startable yet (the sibling-collection trap
 * CONCEPTION-ROSTER §5.3 describes — here, deliberately, the rules run over
 * the superset).
 */
export const ALL_ACTS: ActDef[] = [CONCEPTION, SCHOOL];

/**
 * The acts the title screen can start: those with an atlas, a player frame
 * and a boss frame registered in `act-visuals.ts`. School has a schedule and
 * the bots can run it; it is not here because four of its five sprites have
 * never been generated and it has no boss. A test asserts this list and
 * `ACT_VISUALS` agree, so moving an act in is a one-line change that fails
 * loudly if the art is not there.
 */
export const ACTS: ActDef[] = [CONCEPTION];
