import { ACT_IDS, THREAT, type ActId, type ThreatClass } from './palette';

/**
 * Law 11 as data (G-011).
 *
 * "Each act reserves its silhouettes and its threat colours. A small exclusive
 * shape vocabulary per act, declared before any asset in that act is
 * generated." That was prose in `CONCEPTION-ROSTER.md` §2 and prose cannot be
 * enforced, so law 11 sat unchecked while law 6 depended on it — silhouette
 * only carries identity at horde density if the vocabulary is small and nothing
 * shares.
 *
 * **Declared before generation, not after.** An act with no entry here cannot
 * have assets generated for it; `assertReserved` refuses. That is the whole
 * point of the ordering in G-011 — a reservation list written after the assets
 * is a description, not a reservation.
 */

export interface Reservation {
  /** The shape, in the vocabulary the act's concepts use. */
  silhouette: string;
  /** Asset id that holds it. Exclusive within the act. */
  heldBy: string;
  /** What the exclusivity buys, for whoever reads this next. */
  consequence: string;
}

export interface ActReservations {
  /** Every silhouette in the act, and who holds it. Small on purpose. */
  silhouettes: Reservation[];
  /**
   * Threat colours held back from the act's ordinary enemies, and who holds
   * them. Gold reserved to the Egg is the worked example: it does not appear
   * before the boss, so its first appearance means something.
   */
  reservedThreat: Partial<Record<ThreatClass, string>>;
}

export const RESERVATIONS: Partial<Record<ActId, ActReservations>> = {
  // Lifted verbatim from CONCEPTION-ROSTER.md §2. Four shapes is the budget,
  // and the constraint is generative rather than limiting: "the ring is taken"
  // is what produced the antibody's Y.
  conception: {
    silhouettes: [
      {
        silhouette: 'comet',
        heldBy: 'rival-sperm',
        consequence: 'No other enemy has a tail.',
      },
      {
        silhouette: 'blot',
        heldBy: 'white-cell',
        consequence: 'No other enemy is lobed.',
      },
      {
        silhouette: 'ring',
        heldBy: 'spermicide',
        consequence: 'Nothing else in the act is a ring, including VFX.',
      },
      {
        silhouette: 'Y',
        heldBy: 'antibody',
        consequence: 'The only straight lines in the act.',
      },
    ],
    reservedThreat: {
      // Gold does not appear before the boss.
      ranged: 'boss-egg',
    },
  },

  // school: NOT YET WRITTEN — and no School asset may be generated until it is.
  //
  // The substitute's clipboard has to be the only bright hard rectangle in the
  // act, which is a claim about every other School enemy, none of which are
  // designed yet. That is Cowork's to author (G-011); this file is the shape it
  // goes into.
};

export class ReservationError extends Error {}

/**
 * Refuses to generate for an act with no reservation list, and refuses a list
 * that contradicts itself.
 *
 * Called before generation rather than after, because a list written after the
 * assets describes what happened instead of constraining it.
 */
export function assertReserved(act: ActId, assetIds: string[]): void {
  const reserved = RESERVATIONS[act];
  if (!reserved) {
    throw new ReservationError(
      `Act "${act}" has no reserved-silhouette list. Law 11 (G-011) requires one ` +
        `before any asset in the act is generated, not after. Add it to ` +
        `tools/art/reservations.ts.`,
    );
  }

  const shapes = new Map<string, string>();
  for (const entry of reserved.silhouettes) {
    const clash = shapes.get(entry.silhouette);
    if (clash) {
      throw new ReservationError(
        `Act "${act}": "${entry.silhouette}" is reserved twice, by "${clash}" and ` +
          `"${entry.heldBy}". Law 6 only delivers if nothing shares.`,
      );
    }
    shapes.set(entry.silhouette, entry.heldBy);
  }

  const holders = new Set(reserved.silhouettes.map((r) => r.heldBy));
  for (const id of assetIds) {
    if (!holders.has(id) && !Object.values(reserved.reservedThreat).includes(id)) {
      throw new ReservationError(
        `Act "${act}": asset "${id}" holds no reserved silhouette. Every asset in ` +
          `an act declares its shape, or the vocabulary is not exclusive and law 6 ` +
          `stops working at horde density.`,
      );
    }
  }
}

/** Acts with a list, for reporting. */
export function actsWithReservations(): ActId[] {
  return ACT_IDS.filter((a) => RESERVATIONS[a] !== undefined);
}

export { THREAT };
