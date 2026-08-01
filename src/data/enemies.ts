/**
 * Enemy definitions. Data, never hardcoded into systems.
 *
 * `whyThisStage` is required of every enemy before it ships (PLAN.md
 * mechanism 2). One sentence. A "flying skull" cannot answer it; a "substitute
 * teacher who does not know your name" can. There is a test that fails the
 * build if any entry is missing one, because the whole point of the rule is
 * that it survives a long unattended run with nobody reading the diffs.
 */

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
    whyThisStage:
      'Conception is the only competition the player has already won, so the game opens by making it feel like a commute.',
  },
};

export function enemyDef(id: string): EnemyDef {
  const def = ENEMIES[id];
  if (!def) throw new Error(`Unknown enemy "${id}"`);
  return def;
}
