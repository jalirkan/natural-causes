import conceptionAtlasPng from '../../assets/atlas/conception.png';
import conceptionAtlasJson from '../../assets/atlas/conception.json';
import schoolAtlasPng from '../../assets/atlas/school.png';
import schoolAtlasJson from '../../assets/atlas/school.json';

/**
 * Act PRESENTATION. Imported only by the renderer.
 *
 * Kept apart from `acts.ts` so the simulation and the playtest bots never
 * reach for a browser asset. Atlases are imported rather than referenced by
 * path so Vite hashes and copies them on build — a string path under assets/
 * works in dev and 404s in production, which is discovered at the worst time.
 */

/** The slice of Phaser's JSON Hash atlas the tests need: which frames exist. */
export interface AtlasJson {
  frames: Record<string, unknown>;
}

export interface ActVisuals {
  /** Act background, from the locked palette (ART-DIRECTION law 3). */
  background: number;
  atlas: { key: string; png: string; json: AtlasJson };
  playerFrame: string;
  bossFrame: string;
  /**
   * Pickups take the ACT'S LIGHT TONE (law 10, G-030), so this is per act
   * rather than one global colour.
   *
   * Threat colours to threats, paper to the player, this to pickups. That
   * separates pickups from the player by hue and from enemies by exclusivity,
   * and costs nothing today because no enemy in either designed act uses its
   * act's light tone. Bone lost on the player-competition margin and on
   * colliding with the antibody's bone junction tag.
   */
  pickup: number;
}

export const ACT_VISUALS: Record<string, ActVisuals> = {
  conception: {
    // conception-deep.
    background: 0x6b3a44,
    atlas: { key: 'conception', png: conceptionAtlasPng, json: conceptionAtlasJson },
    playerFrame: 'player-sperm.png',
    bossFrame: 'boss-egg.png',
    // conception-light.
    pickup: 0xc99b8c,
  },
  school: {
    // school-deep.
    background: 0x3d5148,
    atlas: { key: 'school', png: schoolAtlasPng, json: schoolAtlasJson },
    // Drawn, not generated (D-025): assets/svg/school/player-school.svg.
    playerFrame: 'player-school.png',
    // The Egg, on loan from Conception, until the Gym Teacher is designed
    // (SCHOOL-ROSTER §5). The sim fights the Egg in School too; the
    // certificate names the Gym Teacher. See STAND_INS in tools/art/draw.ts.
    bossFrame: 'boss-egg.png',
    // school-light.
    pickup: 0x9fa86b,
  },
};

export function actVisuals(actId: string): ActVisuals {
  const v = ACT_VISUALS[actId];
  if (!v) throw new Error(`No visuals registered for act "${actId}"`);
  return v;
}
