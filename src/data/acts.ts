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

export const ACTS: ActDef[] = [CONCEPTION];
