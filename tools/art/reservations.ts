import { ACT_IDS, THREAT, type ActId, type ThreatClass } from './palette';
import type { AssetRole } from './types';

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
      {
        silhouette:
          "the tallest thing in the act: a standing figure in gym shorts with a whistle on a cord, eight times the player's height",
        heldBy: 'boss-gym-teacher',
        consequence:
          'The only figure at boss scale: its height is the read, and the whistle is the only thing it carries. Law 9: the whistle and the shorts are the role, not a person.',
      },
    ],
    reservedThreat: {
      // Conception's first aimed thing was the boss; School's is a swarm
      // enemy, and that escalation is the act's whole point (G-010). Under
      // G-031 the gold rides the substitute's PROJECTILE — the misspelled
      // name it fires — and never its body, which has to stay the act's only
      // bright hard rectangle.
      ranged: PROJECTILE_HOLDER,
      // The boss colour, held as Conception's Egg holds it: the body is boss
      // teal and nothing else in the act wears it. Written in the same change
      // as the spec and before the first rasterisation, which is G-011's
      // before-not-after ordering — the concept exists now (the direction
      // panel's Gym Teacher), so the refusal that stood here has done its job.
      boss: 'boss-gym-teacher',
    },
  },
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

export class ReservationError extends Error {
  constructor(message: string) {
    super(message);
    this.name = 'ReservationError';
  }
}

/**
 * What law 11 has to say about one asset.
 *
 * Two of these are refusals and they are not the same refusal, which is the
 * only reason this is a verdict rather than a boolean:
 *
 * - `unlisted` — the act HAS a list and this asset is not on it. That is this
 *   repository contradicting itself, and it fails wherever it is found.
 * - `no-list` — the act has no list at all. That is a document nobody has
 *   written yet: it is Cowork's open item, recorded in `ART-DIRECTION.md`
 *   ("the remaining five acts still need theirs, each before its first
 *   asset"), and it is refused at generation exactly the same way. What it is
 *   not is a contradiction, so the dry run reports it rather than failing on
 *   it — see `run.ts`.
 */
export type ReservationVerdict =
  | { status: 'holds'; act: ActId; assetId: string; silhouette: string }
  | { status: 'holds-threat'; act: ActId; assetId: string; threat: ThreatClass }
  | { status: 'pickup'; act: ActId; assetId: string; silhouette: string }
  | { status: 'player'; act: ActId; assetId: string }
  | { status: 'icon'; act: ActId; assetId: string }
  | { status: 'unlisted'; act: ActId; assetId: string; reason: string }
  | { status: 'no-list'; act: ActId; assetId: string; reason: string };

/** True for the two verdicts that refuse generation. */
export function refuses(verdict: ReservationVerdict): boolean {
  return verdict.status === 'unlisted' || verdict.status === 'no-list';
}

const NO_LIST = (act: ActId): string =>
  `Act "${act}" has no reserved-silhouette list. Law 11 (G-011) requires one ` +
  `before any asset in the act is generated, not after. Add it to ` +
  `tools/art/reservations.ts.`;

const UNLISTED = (act: ActId, id: string): string =>
  `Act "${act}": asset "${id}" holds no reserved silhouette. Every asset in ` +
  `an act declares its shape, or the vocabulary is not exclusive and law 6 ` +
  `stops working at horde density.`;

/**
 * Law 11 applied to one asset, without throwing.
 *
 * The throwing form is below and is what the generation path calls. This one
 * exists so the dry run can PRINT the verdict for every asset it is about to
 * describe: a rule the pipeline enforces silently is one nobody can read the
 * state of, and "which of these could actually be generated today" is the
 * question a person asks before starting a run.
 */
export function reservationVerdict(
  act: ActId,
  assetId: string,
  role: AssetRole = 'swarm',
): ReservationVerdict {
  const reserved = RESERVATIONS[act];
  if (!reserved) return { status: 'no-list', act, assetId, reason: NO_LIST(act) };

  // Pickups are exempt: they hold PICKUP_SILHOUETTE game-wide rather than an
  // act shape (G-030).
  if (role === 'pickup' || assetId.startsWith('pickup-')) {
    return { status: 'pickup', act, assetId, silhouette: PICKUP_SILHOUETTE };
  }

  // Icons are exempt one step before either of those: law 11 reserves FIELD
  // silhouettes — the vocabulary a player reads threat from at a glance — and
  // card-surface art never reaches the field. An offer card appears with the
  // world stopped, on an ink panel; a manicule there cannot be misread as a
  // swarm object, and putting it on the act's silhouette list would claim a
  // field shape it does not occupy. (G-035/G-037; the same surface boundary
  // CHECK draws with its 'card' thresholds.)
  if (role === 'icon') return { status: 'icon', act, assetId };

  // So is the player, and for the same reason one step further along.
  //
  // The vocabulary answers *how does this hurt me*, which is why G-030 already
  // narrowed the antibody's clause from "the only straight lines in the act"
  // to "among the act's ENEMIES". The player is the other thing that clause
  // was narrowed around: it is a comet with a tuft in an act where the comet
  // belongs to `rival-sperm`, and it is supposed to be — the rivals are the
  // player wearing no expression, and that reading is the act.
  //
  // Found by wiring this into the run rather than by reading it: `--dry`
  // refused `player-sperm` the first time it was asked, in an act whose list
  // has been correct since it was written. The tests never caught it because
  // they only ever passed enemy ids in.
  if (role === 'player') return { status: 'player', act, assetId };

  const held = reserved.silhouettes.find((r) => r.heldBy === assetId);
  if (held) return { status: 'holds', act, assetId, silhouette: held.silhouette };

  const threat = (Object.entries(reserved.reservedThreat) as Array<[ThreatClass, string]>).find(
    ([, who]) => who === assetId,
  );
  if (threat) return { status: 'holds-threat', act, assetId, threat: threat[0] };

  return { status: 'unlisted', act, assetId, reason: UNLISTED(act, assetId) };
}

/**
 * Refuses to generate for an act with no reservation list, refuses an asset
 * that is not on the list its act does have, and refuses a list that
 * contradicts itself.
 *
 * Called before generation rather than after, because a list written after the
 * assets describes what happened instead of constraining it. `generate()` is
 * the caller that matters — it runs this before the network request, next to
 * the D-007 check, so an unreserved asset costs nothing rather than costing an
 * image.
 */
export function assertReserved(
  act: ActId,
  assetIds: string[],
  role: AssetRole = 'swarm',
): void {
  const reserved = RESERVATIONS[act];
  if (!reserved) throw new ReservationError(NO_LIST(act));

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

  for (const id of assetIds) {
    const verdict = reservationVerdict(act, id, role);
    if (verdict.status === 'unlisted') throw new ReservationError(verdict.reason);
  }
}

/** Acts with a list, for reporting. */
export function actsWithReservations(): ActId[] {
  return ACT_IDS.filter((a) => RESERVATIONS[a] !== undefined);
}

export { THREAT };
