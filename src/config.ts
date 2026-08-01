/**
 * Phase 0 constants. Deliberately tiny — this file exists so the numbers the
 * scene uses are named rather than buried, not as a pre-emptive settings
 * system. It grows when there is something real to put in it.
 */

/** Internal render size. The scale manager fits this to whatever the window is. */
export const VIEW_WIDTH = 1280;
export const VIEW_HEIGHT = 720;

/** The field. Flat, green, and for now the entire art budget. */
export const FIELD_COLOUR = 0x4c7a35;

/** The player stand-in. Lightest thing on screen, per TEST-BATCH-CONCEPTS §2. */
export const DOT_COLOUR = 0xf4f0e2;
export const DOT_RADIUS = 13;

/** Pixels per second. Tuned by feel later; this is only "does input work". */
export const DOT_SPEED = 340;
