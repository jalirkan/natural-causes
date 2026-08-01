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

/**
 * Ranged gold is held by projectiles rather than by any sprite (G-031).
 *
 * Measured cause: multiplying the substitute by gold took its brightest pixel
 * from L 0.930 to 0.685 and halved its contrast against the act background,
 * destroying the bright-hard-rectangle reservation the act is built around.
 * Putting the threat colour on the thing that does the reaching keeps both
 * reservations, and is a better reading of law 6 — the colour marks the
 * attack, which is the part that actually crosses the room.
 */
export const PROJECTILE_HOLDER = '(projectiles, game-wide)';

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
        // Narrowed by G-030. Pickups are hard-edged and sit outside the act
        // vocabulary, so the original "only straight lines in the act" was
        // false the moment pickups were assigned a shape.
        consequence: "The only straight lines among the act's enemies.",
      },
    ],
    reservedThreat: {
      // G-031. The Egg's BODY is boss teal; gold first appears as its first
      // projectile. Closer to what G-010 wanted than colouring the body — the
      // first aimed thing in the player's life announces itself by firing.
      boss: 'boss-egg',
      ranged: PROJECTILE_HOLDER,
    },
  },

  // Lifted from SCHOOL-ROSTER.md §1. Five shapes: one more than Conception,
  // because the act adds a pressure Conception did not have and the substitute
  // is a fixed point the roster had to be built around.
  //
  // The clipboard reservation is the one most at risk — School is full of paper
  // — and it is what forced homework into a wedge and the hall monitor's sash
  // off both edges of the body. Both would naturally have been rectangles.
  school: {
    silhouettes: [
      {
        silhouette: 'bright hard rectangle',
        heldBy: 'substitute-teacher',
        consequence:
          'Nothing else in the act is a bright hard-edged rectangle. The act is built around this one.',
      },
      {
        silhouette: 'circle',
        heldBy: 'dodgeball',
        consequence: 'The only perfect circle. Nothing else is radially symmetric.',
      },
      {
        silhouette: 'wedge',
        heldBy: 'homework',
        consequence: 'A leaning stack, triangular in profile. Paper that is deliberately not a rectangle.',
      },
      {
        silhouette: 'sash',
        heldBy: 'hall-monitor',
        consequence:
          'The only hard diagonal in the act. It runs off both edges so it reads as a stripe, never a slab.',
      },
      {
        silhouette: 'cluster',
        heldBy: 'clique',
        consequence: 'The only silhouette with more than one head. Nothing else is a fused mass.',
      },
    ],
    reservedThreat: {
      // Conception's first aimed thing was the boss; School's is a swarm
      // enemy, and that escalation is the act's whole point (G-010). Under
      // G-031 the gold rides the substitute's PROJECTILE — the misspelled
      // name it fires — and never its body, which has to stay the act's only
      // bright hard rectangle.
      ranged: PROJECTILE_HOLDER,
    },
  },

  // boss-gym-teacher is deliberately absent. It has no concept yet, so
  // assertReserved refuses it — which is G-011's before-not-after ordering
  // doing its job rather than an oversight to work around.
};

/**
 * Pickups sit outside every act's silhouette vocabulary and hold one shape
 * game-wide (G-030).
 *
 * The vocabulary answers *how does this hurt me*. A pickup does not hurt you,
 * so folding it into the act's shape budget is a category error — and it would
 * spend one of four or five reserved shapes per act on something that is the
 * same object in all seven.
 */
export const PICKUP_SILHOUETTE = 'lozenge';

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
    // Pickups are exempt: they hold PICKUP_SILHOUETTE game-wide rather than an
    // act shape (G-030).
    if (id.startsWith('pickup-')) continue;
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
