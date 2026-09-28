import conceptionAtlasPng from '../../assets/atlas/conception.png';
import conceptionAtlasJson from '../../assets/atlas/conception.json';
import schoolAtlasPng from '../../assets/atlas/school.png';
import schoolAtlasJson from '../../assets/atlas/school.json';
import adolescenceAtlasPng from '../../assets/atlas/adolescence.png';
import adolescenceAtlasJson from '../../assets/atlas/adolescence.json';
import collegeAtlasPng from '../../assets/atlas/college.png';
import collegeAtlasJson from '../../assets/atlas/college.json';
import officeAtlasPng from '../../assets/atlas/office.png';
import officeAtlasJson from '../../assets/atlas/office.json';

export interface AtlasJson {
  frames: Record<string, unknown>;
}

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
  /**
   * The atlas JSON is typed by its frame names so a test can ask whether a
   * frame an act draws is actually in it, without a browser.
   */
  atlas: { key: string; png: string; json: AtlasJson };
  playerFrame: string;
  bossFrame: string;
  /**
   * The boss's round body within its frame, as fractions of the frame: where
   * its centre sits and how big it is (AUDIT 34). The Egg fills its frame;
   * Prom hangs on a chain, so its ball sits low and small, and drawing the
   * frame at the hitbox's size put the ball 36px below the sim's and 113px
   * across a 150px hitbox. Absent: centred, filling the frame.
   */
  bossBody?: { cy: number; r: number };
  /**
   * What an attach stack is drawn as on the player when the def that attached
   * it has no frame the scene can find: the antibody in Conception, acne in
   * Adolescence (ADOLESCENCE-ROSTER §5), the invoice in College
   * (COLLEGE-ROSTER §3.3), the ping in The Office (OFFICE-ROSTER §3.3).
   * A FALLBACK since AUDIT six's 38: the scene draws each worn stack
   * (`World.wornBy`) in its own def's frame from its own act's atlas, so
   * tuition's invoices, which persist through the crossing, still draw as
   * invoices in The Office and not as pings. Absent for an act with no
   * attaching enemy.
   */
  attachFrame?: string;
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
    attachFrame: 'antibody.png',
    bossFrame: 'boss-egg.png',
    // conception-light.
    pickup: 0xc99b8c,
  },
  school: {
    // school-deep.
    background: 0x3d5148,
    atlas: { key: 'school', png: schoolAtlasPng, json: schoolAtlasJson },
    playerFrame: 'player-school.png',
    // The Gym Teacher's frame on the Egg's behaviour: the sim has one boss
    // (acts.ts, `bossName`), so this is the name and the picture, not the fight.
    bossFrame: 'boss-gym-teacher.png',
    // school-light.
    pickup: 0x9fa86b,
  },
  adolescence: {
    // adolescence-deep: night, the darkest ground in the life.
    background: 0x2e3453,
    atlas: { key: 'adolescence', png: adolescenceAtlasPng, json: adolescenceAtlasJson },
    playerFrame: 'player-adolescence.png',
    // Prom's picture on the Egg's behaviour until Prom's own kind exists
    // (ADOLESCENCE-ROSTER §4); the hormones already race for it.
    bossFrame: 'boss-prom.png',
    // boss-prom.svg: the ball hangs on its chain, <circle cy="62.5" r="37">.
    bossBody: { cy: 0.625, r: 0.37 },
    attachFrame: 'acne.png',
    // adolescence-light: blush, pickups only.
    pickup: 0xd6aebb,
  },
  college: {
    // college-deep: burgundy.
    background: 0x4e2233,
    atlas: { key: 'college', png: collegeAtlasPng, json: collegeAtlasJson },
    playerFrame: 'player-college.png',
    bossFrame: 'boss-loan.png',
    // The adding machine under its tape (COLLEGE-ROSTER §4). MEASURED, not
    // read from the drawing: the machine is a box, so boss-loan.svg has no
    // <circle> to read as Prom's does. Its teal spans 0.51–0.94 of the
    // sprite's height and 0.12–0.88 of its width (the drawer's note in the
    // SVG); this is the drawer's recommended circle for that box.
    bossBody: { cy: 0.73, r: 0.3 },
    // The worn invoice: tuition's stacks draw as tuition (§3.3).
    attachFrame: 'tuition.png',
    // college-light: old gold, pickups only.
    pickup: 0xe6c98f,
  },
  office: {
    // office-deep: the carpet (OFFICE-ROSTER §1).
    background: 0x3a4a5c,
    atlas: { key: 'office', png: officeAtlasPng, json: officeAtlasJson },
    playerFrame: 'player-office.png',
    // The org chart, standing (OFFICE-ROSTER §4, G-004).
    bossFrame: 'boss-reorg.png',
    // MEASURED, as the Loan's is: the chart is four rows of boxes, not a
    // circle, so boss-reorg.svg has none to read. This is the drawer's
    // recommended circle over the chart's boxes, as fractions of the frame.
    bossBody: { cy: 0.526, r: 0.3 },
    // The worn ping (§3.3); a fallback only (see `attachFrame`): tuition
    // carried in from College draws as tuition.
    attachFrame: 'ping.png',
    // office-light: the strip light, pickups only.
    pickup: 0xa8b7c4,
  },
};

export function actVisuals(actId: string): ActVisuals {
  const v = ACT_VISUALS[actId];
  if (!v) throw new Error(`No visuals registered for act "${actId}"`);
  return v;
}
