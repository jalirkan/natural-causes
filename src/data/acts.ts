import conceptionAtlasPng from '../../assets/atlas/conception.png';
import conceptionAtlasJson from '../../assets/atlas/conception.json';

/**
 * Act definitions. The scene reads these; it knows nothing about Conception
 * specifically, so the remaining acts are data rather than code.
 *
 * Atlases are imported rather than fetched by path so Vite hashes and copies
 * them on build — a string path under assets/ works in dev and 404s in
 * production, which is the kind of thing that is discovered at the worst time.
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
  /** Act background, from the locked palette (ART-DIRECTION law 3). */
  background: number;
  atlas: { key: string; png: string; json: object };
  playerFrame: string;
  /** How long the act runs before its boss, in seconds. */
  durationSeconds: number;
  waves: SpawnWave[];
}

export const CONCEPTION: ActDef = {
  id: 'conception',
  name: 'Conception',
  // conception-deep, the act background in the locked palette.
  background: 0x6b3a44,
  atlas: { key: 'conception', png: conceptionAtlasPng, json: conceptionAtlasJson },
  playerFrame: 'player-sperm.png',
  durationSeconds: 300,
  waves: [
    { fromSeconds: 0, enemyId: 'rival-sperm', rate: 1.5 },
    { fromSeconds: 30, enemyId: 'rival-sperm', rate: 3 },
    { fromSeconds: 75, enemyId: 'rival-sperm', rate: 5.5 },
    { fromSeconds: 140, enemyId: 'rival-sperm', rate: 9 },
    { fromSeconds: 210, enemyId: 'rival-sperm', rate: 14 },
  ],
};

export const ACTS: ActDef[] = [CONCEPTION];
