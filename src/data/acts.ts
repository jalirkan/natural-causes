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
