import { ACT_IDS, PAPER, THREAT, actLight, type ActId, type ThreatClass } from './palette';
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
      // CONCEPTION-ROSTER §3.1 and §3.2 give the white cell elite purple and
      // the spermicide contact red, and this table did not, so CONFORM
      // quantised both away (measured 2026-09-27: no shipped enemy wore a
      // threat colour). The roster is the design; the table says what it says.
      contact: 'spermicide',
      elite: 'white-cell',
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
      // SCHOOL-ROSTER §3.2 and §3.4 give the dodgeball contact red and the
      // hall monitor elite purple; the same finding as Conception's above.
      contact: 'dodgeball',
      elite: 'hall-monitor',
    },
  },

  // Lifted from ADOLESCENCE-ROSTER.md §1, consequences verbatim. Five shapes
  // and the boss's: School's count, because this act adds a pressure (being
  // followed) rather than a verb. The tall sheet is the one most at risk — a
  // phone and a car would both be rectangles — and it is what put the group
  // chat into a bubble and the car side-on on two wheels.
  adolescence: {
    silhouettes: [
      {
        silhouette: 'tall sheet',
        heldBy: 'standardised-test',
        consequence:
          'The only rectangle in the act, and the act is built around it: a phone and a car would both be rectangles, so neither is drawn as one.',
      },
      {
        silhouette: 'speech bubble',
        heldBy: 'group-chat',
        consequence:
          'The only silhouette with a tail. Drawn as what comes out of a phone, because the phone would be a rectangle.',
      },
      {
        silhouette: 'wheels',
        heldBy: 'drivers-ed',
        consequence: 'The only thing in the act with wheels.',
      },
      {
        silhouette: 'bolt',
        heldBy: 'hormones',
        consequence: 'The only jagged outline in the act. Nothing else zigzags.',
      },
      {
        silhouette: 'dome',
        heldBy: 'acne',
        consequence: 'The only half-circle, and the smallest thing in the act.',
      },
      {
        silhouette: 'hanging sphere',
        heldBy: 'boss-prom',
        consequence:
          'The only thing in the act that hangs from above. Its gold is on its reflections, never its body.',
      },
    ],
    reservedThreat: {
      // The act's heaviest hit is its only red thing. Acne, which anyone would
      // draw red, wears the antibody's colours, so red stays a claim about damage.
      contact: 'drivers-ed',
      // The white cell's colour on the white cell's successor (§3.4).
      elite: 'standardised-test',
      // G-031: the group chat's gold is on its notification, never its body,
      // and Prom's spots are the only other gold. Gold arrives in the first
      // minute and never leaves: School's order reversed, and the point (§2).
      ranged: PROJECTILE_HOLDER,
      // The mirror ball's body.
      boss: 'boss-prom',
    },
  },

  // Lifted from COLLEGE-ROSTER.md §1, consequences verbatim. Five shapes and
  // the boss's: the act adds a pressure (cost) rather than a verb. The square
  // is the one most at risk — a form and a screen would both be square — and
  // it is what put tuition into an envelope and the registrar behind a counter.
  college: {
    silhouettes: [
      {
        silhouette: 'stack',
        heldBy: 'reading',
        consequence: 'The only pile in the act. Nothing else is paper on paper.',
      },
      {
        silhouette: 'calendar leaf',
        heldBy: 'deadline',
        consequence:
          'The only square in the act. A form and a screen would both be square, so neither is drawn.',
      },
      {
        silhouette: 'windowed envelope',
        heldBy: 'tuition',
        consequence: 'The only rectangle wider than tall, and the only window.',
      },
      {
        silhouette: 'cluster',
        heldBy: 'group-project',
        consequence:
          'The only silhouette with more than one face. Nothing else is a fused mass. (School holds a cluster too; the list is per act.)',
      },
      {
        silhouette: 'counter',
        heldBy: 'registrar',
        consequence: 'The only architecture in the act, and the only bell.',
      },
      {
        silhouette: 'tape',
        heldBy: 'boss-loan',
        consequence:
          'The only curl in the act, and the only thing taller than the player by a multiple.',
      },
    ],
    reservedThreat: {
      // The act's heaviest hit is its only red thing. The invoice, which
      // anyone would print in red, is bone and ink.
      contact: 'deadline',
      // The test's colour on the test's successor: the slow, heavy thing that
      // costs the most to get past. On the whole body, never on one head.
      elite: 'group-project',
      // G-031: the registrar's gold is on the form it fires, never its body,
      // and it is the act's only gold: The Loan's figures are ink.
      ranged: PROJECTILE_HOLDER,
      // The adding machine's body.
      boss: 'boss-loan',
    },
  },

  // Lifted from OFFICE-ROSTER.md §1, consequences verbatim. The test batch's
  // org chart (G-013's ruled geometry) is the boss; the sheet is clipped
  // because the envelope is College's, and the meeting is chairs because the
  // meeting is not the people (law 9).
  office: {
    silhouettes: [
      {
        silhouette: 'clipped sheet',
        heldBy: 'reply-all',
        consequence:
          'The only sheet in the act, and the only clip. Its children are the same sheet smaller, never a different shape.',
      },
      {
        silhouette: 'carriage',
        heldBy: 'commute',
        consequence: 'The only thing in the act with wheels, and the widest.',
      },
      {
        silhouette: 'bell with a dot',
        heldBy: 'ping',
        consequence: 'The only bell, and the smallest thing in the act.',
      },
      {
        silhouette: 'ring of chairs',
        heldBy: 'meeting',
        consequence: 'The only ring in the act, and the only thing drawn around an empty middle.',
      },
      {
        silhouette: 'row of stars',
        heldBy: 'performance-review',
        consequence: 'The only stars. Nothing else in the act has points.',
      },
      {
        silhouette: 'tree of boxes',
        heldBy: 'boss-reorg',
        consequence:
          'The only ruled geometry in the act (G-013), and the only thing with an empty top box.',
      },
    ],
    reservedThreat: {
      // The act's heaviest hit is its only red thing.
      contact: 'commute',
      // The test's and the project's colour on the slow heavy thing: the chairs.
      elite: 'meeting',
      // G-031: the review's gold is on the rating it fires, never its body,
      // and it is the act's only gold.
      ranged: PROJECTILE_HOLDER,
      // The chart's boxes and connectors.
      boss: 'boss-reorg',
    },
  },

  // Lifted from FAMILY-ROSTER.md §1, consequences verbatim. Everything in the
  // act is post, packaging or plumbing; the one person in it is drawn as what
  // it is wearing (law 9), and the room is the boss's, not the schedule's
  // alone.
  family: {
    silhouettes: [
      {
        silhouette: 'windowed envelope',
        heldBy: 'bill',
        consequence:
          "The only envelope in the act (College's invoices are College's), and the only window. A late fee is the same envelope, never a different shape.",
      },
      {
        silhouette: 'flat box',
        heldBy: 'flat-pack',
        consequence: 'The only box, the only tape, and the widest thing.',
      },
      {
        silhouette: 'sealed letter',
        heldBy: 'hoa-letter',
        consequence: 'The only seal, and the only thing folded.',
      },
      {
        silhouette: 'bib with arms',
        heldBy: 'toddler',
        consequence: 'The only thing in the act reaching up, and the smallest mover.',
      },
      {
        silhouette: 'wall phone',
        heldBy: 'phone-call',
        consequence: 'The only cord, and the only coil.',
      },
      {
        silhouette: 'room',
        heldBy: 'room',
        consequence: 'The only square in the act, and the only outline with a gap. Solid.',
      },
      {
        silhouette: 'house with a face',
        heldBy: 'boss-mortgage',
        consequence: 'The only gable, and the only thing with a roof.',
      },
    ],
    reservedThreat: {
      // The act's heaviest hit is its only red thing: the tape.
      contact: 'flat-pack',
      // The meeting's colour on the bib: the act's elite weighs twelve kilos.
      elite: 'toddler',
      // G-031: the phone's gold is on the call it fires, never its body, and
      // it is the act's only gold.
      ranged: PROJECTILE_HOLDER,
      // The house's walls and roof. The rooms it adds do not hurt (law 10):
      // they are wallpaper.
      boss: 'boss-mortgage',
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

/**
 * The colours an icon that also rides the field keeps off (law 10, G-036), by
 * name, for the verdict to print: every threat colour (threats), paper (the
 * player) and every act's light tone (pickups). Every act's, because items
 * are not act-scoped — Reflex fires the same manicule in School as in
 * Conception.
 *
 * CHECK rejects a field-riding icon that wears one (`field-colours`, which
 * scans for exactly this list), so `art:svg` refuses the sprite before it is
 * written; `laws.test.ts` reads the committed sprites against it again
 * through the enemy scan (`reservedColourViolations`, once per act) and
 * requires the two to agree. Both share that scan's one blind spot:
 * service-light sits inside the grain tolerance of bone, so a service-light
 * pixel cannot be told from a legal bone one. A palette collision, recorded
 * in check.ts, not a licence.
 */
export const FIELD_RESERVED_COLOURS: readonly string[] = [
  ...Object.values(THREAT).map((c) => c.name),
  PAPER.name,
  ...ACT_IDS.map((a) => actLight(a).name),
];

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
  | {
      status: 'icon';
      act: ActId;
      assetId: string;
      /** Also drawn on the field (G-036); card-only when false. */
      fieldRiding: boolean;
      /** What it keeps off on the field: FIELD_RESERVED_COLOURS, or none. */
      keepsOff: readonly string[];
    }
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
  fieldRiding = false,
): ReservationVerdict {
  const reserved = RESERVATIONS[act];
  if (!reserved) return { status: 'no-list', act, assetId, reason: NO_LIST(act) };

  // Pickups are exempt: they hold PICKUP_SILHOUETTE game-wide rather than an
  // act shape (G-030).
  if (role === 'pickup' || assetId.startsWith('pickup-')) {
    return { status: 'pickup', act, assetId, silhouette: PICKUP_SILHOUETTE };
  }

  // Icons are exempt one step before either of those: law 11 reserves FIELD
  // silhouettes — the vocabulary a player reads threat from at a glance. A
  // card-only icon never reaches the field: an offer card appears with the
  // world stopped, on an ink panel; an umbrella there cannot be misread as a
  // swarm object, and putting it on the act's silhouette list would claim a
  // field shape it does not occupy. (G-035/G-037; the same surface boundary
  // CHECK draws with its 'card' thresholds.)
  //
  // A field-riding icon DOES reach the field — Reflex's shot is the manicule,
  // Baggage's stamps are the footprint (G-036) — so "never on the field" is false
  // for it and the verdict says so. It stays off the silhouette list for the
  // player's reason below (it is the player's weapon, and the list answers
  // "how does this hurt me"), but law 10 applies to it in full: the verdict
  // names the colours it keeps off, CHECK's `field-colours` rejects a sprite
  // that wears one, and laws.test.ts reads the committed sprite for them too.
  if (role === 'icon') {
    return {
      status: 'icon',
      act,
      assetId,
      fieldRiding,
      keepsOff: fieldRiding ? FIELD_RESERVED_COLOURS : [],
    };
  }

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
