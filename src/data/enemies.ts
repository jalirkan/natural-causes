/**
 * Enemy definitions. Data, never hardcoded into systems.
 *
 * `whyThisStage` is required of every enemy before it ships (PLAN.md
 * mechanism 2). One sentence. A "flying skull" cannot answer it; a "substitute
 * teacher who does not know your name" can. There is a test that fails the
 * build if any entry is missing one, because the whole point of the rule is
 * that it survives a long unattended run with nobody reading the diffs.
 *
 * Numbers are from CONCEPTION-ROSTER.md §3.4 and are starting values. The
 * relationships are the design commitment — the white cell is an order of
 * magnitude tankier and slower than everything else, the antibody's contact
 * damage is nearly zero on purpose — and the absolute figures are the
 * playtest bots' to move.
 */

/** How an enemy crosses the field. */
export type Movement =
  /** Steers at the player every frame. */
  | 'chase'
  /** Enters on a fixed heading taken at spawn and never steers again. */
  | 'cross'
  /** Drifts on a current that never acknowledged the player at all. */
  | 'drift';

/** What happens when it touches the player. */
export type Contact =
  | 'damage'
  /** Holds the player, slows them hard, and deals damage over the window. */
  | 'engulf'
  /** Despawns, sticks to the player, and adds a drag stack that never expires. */
  | 'attach';

export interface EnemyDef {
  id: string;
  name: string;
  /** Frame name in the act atlas. */
  frame: string;
  hp: number;
  /** Pixels per second. */
  speed: number;
  /** Damage dealt on contact, per hit. */
  contactDamage: number;
  /** Collision radius in world pixels, at display size. */
  radius: number;
  /** On-screen size. Law 7 authors everything to read at 48px. */
  displaySize: number;
  /** Experience dropped on death. */
  xp: number;
  /**
   * Multiplied over the sprite at draw time, from the act palette.
   *
   * TEST-BATCH-CONCEPTS is explicit that the player is the lightest thing on
   * screen and the rivals are a darker tone — the player/enemy distinction is
   * carried by value, since the two share a body plan by design. The
   * generator does not reliably honour "muted darker colouring", and this is
   * a gameplay readability requirement rather than an art preference, so it
   * is imposed here instead of asked for. `0xffffff` leaves the sprite alone.
   */
  tint: number;
  movement: Movement;
  contact: Contact;
  /** `engulf` only. */
  engulf?: { seconds: number; slow: number; damagePerSecond: number };
  /** `attach` only. Fraction of movement speed removed per stack. */
  attach?: { drag: number };
  /**
   * Weapons do not affect it (G-018). Shots pass through, areas ignore it, it
   * is never a kill and drops nothing.
   *
   * The alternative was a large `hp`, which makes the enemy's presence a
   * function of the player's damage output — a treadmill needing re-tuning
   * against every weapon buff for seven acts, firing hardest at the players
   * already losing. You cannot shoot a document.
   */
  invulnerable?: boolean;
  /** Zone hazards. Bursts on a timer, never on proximity. */
  burst?: { fuseSeconds: number; ringRadius: number; ringSeconds: number; ringDamage: number };
  /** One sentence. Required. */
  whyThisStage: string;
}

export const ENEMIES: Record<string, EnemyDef> = {
  'rival-sperm': {
    id: 'rival-sperm',
    name: 'Rival sperm',
    frame: 'rival-sperm.png',
    hp: 3,
    speed: 46,
    contactDamage: 4,
    radius: 15,
    displaySize: 48,
    xp: 1,
    // conception-mid. Darker than the player against conception-deep, so a
    // dense crowd still reads as a crowd rather than a wall.
    tint: 0xa86a63,
    movement: 'chase',
    contact: 'damage',
    whyThisStage:
      'Conception is the only competition the player has already won, so the game opens by making it feel like a commute.',
  },

  antibody: {
    id: 'antibody',
    name: 'Antibody',
    frame: 'antibody.png',
    // hp is inert: it cannot be damaged. Kept at 1 so nothing divides by zero.
    hp: 1,
    invulnerable: true,
    speed: 34,
    // It costs speed and never health, and it is not a kill, so it drops no XP.
    contactDamage: 0,
    radius: 11,
    displaySize: 44,
    xp: 0,
    tint: 0x6e6353,
    movement: 'drift',
    contact: 'attach',
    // Retained for reference; the curve now lives in World.antibodyDrag,
    // because G-018 made the per-stack cost diminishing rather than flat.
    attach: { drag: 0.03 },
    whyThisStage:
      'Conception is where the first record about the player is opened, and it describes a category rather than a person.',
  },

  spermicide: {
    id: 'spermicide',
    name: 'Spermicide',
    frame: 'spermicide.png',
    hp: 6,
    speed: 20,
    contactDamage: 9,
    radius: 26,
    displaySize: 72,
    xp: 3,
    tint: 0xc4472e,
    movement: 'drift',
    contact: 'damage',
    burst: { fuseSeconds: 4.5, ringRadius: 130, ringSeconds: 1.6, ringDamage: 9 },
    whyThisStage:
      'Conception is the first stage where the environment was made lethal in advance by someone who will never be told whether it worked.',
  },

  'white-cell': {
    id: 'white-cell',
    name: 'White cell',
    frame: 'white-cell.png',
    hp: 44,
    speed: 16,
    contactDamage: 14,
    radius: 34,
    displaySize: 96,
    xp: 12,
    tint: 0x7c5c8a,
    movement: 'cross',
    contact: 'engulf',
    engulf: { seconds: 0.9, slow: 0.35, damagePerSecond: 14 },
    whyThisStage:
      'Before the player is anyone at all, there is already a process whose only job is to stop things that look like them.',
  },
};

export function enemyDef(id: string): EnemyDef {
  const def = ENEMIES[id];
  if (!def) throw new Error(`Unknown enemy "${id}"`);
  return def;
}
