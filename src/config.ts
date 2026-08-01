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

/** The playfield. Larger than the viewport; the camera follows the player. */
export const WORLD_WIDTH = 3200;
export const WORLD_HEIGHT = 2200;

/** Locked palette — universals. */
export const INK = 0x2a2521;
export const PAPER = 0xefe7d6;
export const BONE = 0xd2c6ac;
export const SHADOW = 0x6e6353;

/** Locked palette — threat colours. Colour carries threat (law 6). */
export const THREAT_CONTACT = 0xc4472e;
export const THREAT_RANGED = 0xd69a3c;
export const THREAT_ELITE = 0x7c5c8a;
export const THREAT_BOSS = 0x2f7370;
