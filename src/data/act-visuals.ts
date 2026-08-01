import conceptionAtlasPng from '../../assets/atlas/conception.png';
import conceptionAtlasJson from '../../assets/atlas/conception.json';

/**
 * Act PRESENTATION. Imported only by the renderer.
 *
 * Kept apart from `acts.ts` so the simulation and the playtest bots never
 * reach for a browser asset. Atlases are imported rather than referenced by
 * path so Vite hashes and copies them on build — a string path under assets/
 * works in dev and 404s in production, which is discovered at the worst time.
 */

export interface ActVisuals {
  /** Act background, from the locked palette (ART-DIRECTION law 3). */
  background: number;
  atlas: { key: string; png: string; json: object };
  playerFrame: string;
  bossFrame: string;
}

export const ACT_VISUALS: Record<string, ActVisuals> = {
  conception: {
    // conception-deep.
    background: 0x6b3a44,
    atlas: { key: 'conception', png: conceptionAtlasPng, json: conceptionAtlasJson },
    playerFrame: 'player-sperm.png',
    bossFrame: 'boss-egg.png',
  },
};

export function actVisuals(actId: string): ActVisuals {
  const v = ACT_VISUALS[actId];
  if (!v) throw new Error(`No visuals registered for act "${actId}"`);
  return v;
}
