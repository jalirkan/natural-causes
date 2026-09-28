import type { PassiveItem } from './items';

/**
 * The Egg's drop (G-017, G-042): one inheritance, dealt from the world's own
 * dice at the crossing out of Conception and kept for the rest of the life.
 * Never offered, never rerolled, never explained beyond its name.
 *
 * Not an item, and not a second item system (CONCEPTION-ROSTER §5.3). It
 * carries the passive stat line from `items.ts` as-is, and world.ts multiplies
 * it in through the same `passiveProduct` that Thick Skin and Restlessness go
 * through, as one level of a passive nobody chose. The two things a passive
 * cannot say — what a level costs, and a level taken without asking — are the
 * two fields beside it.
 *
 * G-038 retired "every item subtracts" for the offer pool. The inheritance
 * keeps its downside on purpose: it is the one thing in the life the player
 * did not choose, and that is the joke (G-042). `costs` is a real cost.
 *
 * About the body, never about a category of person (D-007).
 */

/** The passive stat line (items.ts), reused rather than restated. 1 is no effect. */
export type StatLine = Pick<
  PassiveItem,
  'speedMultiplier' | 'healthMultiplier' | 'damageTakenMultiplier' | 'cooldownMultiplier' | 'pickupMultiplier'
>;

export interface InheritanceDef {
  id: string;
  name: string;
  /** The one line the crossing's card shows under the act and the age. */
  blurb: string;
  /** Design record: the upside. Over 30 characters. */
  gives: string;
  /** Design record: the downside, which is a real one. Over 30 characters. */
  costs: string;
  /** Multiplied in as one level of a passive, for the rest of the life. */
  stats: StatLine;
  /** Multiplier on the XP every level costs, from the crossing on. 1 is none. */
  xpMultiplier: number;
  /**
   * Levels taken at the start of every act from the crossing on, each one the
   * first card of an offer the player never sees. 0 is none.
   */
  levelsPerAct: number;
  /** One sentence: which numbers are placeholders and what retires them. */
  provisional: string;
}

const NONE: StatLine = {
  speedMultiplier: 1,
  healthMultiplier: 1,
  damageTakenMultiplier: 1,
  cooldownMultiplier: 1,
  pickupMultiplier: 1,
};

/*
 * PLACEHOLDER NUMBERS, every one (G-042): written to make the three rolls
 * felt, not measured. A person living past the Egg at the link moves them.
 */
export const INHERITANCES: Record<string, InheritanceDef> = {
  constitution: {
    id: 'constitution',
    name: 'Constitution',
    blurb: 'You inherited: Constitution.',
    gives: 'Half as much health again, for the whole life, from the moment the Egg lets go.',
    costs: 'Every level from then on costs a quarter more XP: slower to become anything at all.',
    stats: { ...NONE, healthMultiplier: 1.5 },
    xpMultiplier: 1.25,
    levelsPerAct: 0,
    provisional:
      'healthMultiplier 1.5 and xpMultiplier 1.25 were written, not played; a person living past the Egg at the link is what moves them.',
  },

  precocity: {
    id: 'precocity',
    name: 'Precocity',
    blurb: 'You inherited: Precocity.',
    gives: 'Every act from School on starts with one level already taken, before the first step.',
    costs: 'Nobody asked which: that level is dealt at random from the pool, whatever the build wanted.',
    stats: { ...NONE },
    xpMultiplier: 1,
    levelsPerAct: 1,
    provisional:
      'levelsPerAct 1 was written, not played; a person living past the Egg at the link is what moves it.',
  },

  sensitivity: {
    id: 'sensitivity',
    name: 'Sensitivity',
    blurb: 'You inherited: Sensitivity.',
    gives: 'Gems come from twice as far away, for the whole life: everything on the floor notices you.',
    costs: 'Everything that touches you hurts a quarter more, through the multiplier Thick Skin lowers.',
    stats: { ...NONE, pickupMultiplier: 2, damageTakenMultiplier: 1.25 },
    xpMultiplier: 1,
    levelsPerAct: 0,
    provisional:
      'pickupMultiplier 2 and damageTakenMultiplier 1.25 were written, not played; a person living past the Egg at the link is what moves them.',
  },
};

/** Registry order: the order the world's dice index into. */
export const INHERITANCE_IDS = Object.keys(INHERITANCES);
