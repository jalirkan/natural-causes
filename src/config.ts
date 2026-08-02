/**
 * Constants shared across scenes.
 *
 * Colours here are the locked palette's (ART-DIRECTION law 3) as Phaser hex
 * numbers. They are duplicated from `tools/art/palette.ts` rather than
 * imported because that module is Node-side and pulls in sharp; a test asserts
 * the two agree, so the duplication cannot drift silently.
 */

/** Internal render size. The scale manager fits this to the window. */
export const VIEW_WIDTH = 1280;
export const VIEW_HEIGHT = 720;

/**
 * The playfield. Larger than the viewport; the camera follows the player.
 *
 * Re-exported from the simulation, which is where the boss needs them. Two
 * copies of the arena size is how the camera ends up bounded to a rectangle
 * the world does not use.
 */
export { ARENA_WIDTH as WORLD_WIDTH, ARENA_HEIGHT as WORLD_HEIGHT } from './sim/world';

/** Locked palette — universals. */
export const INK = 0x2a2521;
export const PAPER = 0xefe7d6;
export const BONE = 0xd2c6ac;
export const SHADOW = 0x6e6353;

/**
 * Pickups and UI chrome. Deliberately NOT a threat colour (law 10).
 *
 * "Contact, ranged, elite and boss appear on things that will hurt the player
 * and on nothing else — not on the player sprite, not on pickups, not on UI
 * chrome." The moment an XP gem is elite-violet, that colour means "collect
 * me" in one place and "this will hurt" everywhere else, and law 6's whole
 * claim is that colour carries threat.
 */
export const UI_FILL = BONE;
/**
 * NOT a pickup colour any more. G-030 assigns pickups the ACT'S light tone,
 * which is per act and lives in `act-visuals.ts`. Bone stays for UI chrome
 * only, which is act-independent.
 */

/** Locked palette — threat colours. Colour carries threat (law 6). */
export const THREAT_CONTACT = 0xc4472e;
export const THREAT_RANGED = 0xd69a3c;
export const THREAT_ELITE = 0x7c5c8a;
export const THREAT_BOSS = 0x2f7370;
