/**
 * The item registry. ONE record, deliberately (CONCEPTION-ROSTER §5.3).
 *
 * Passives have no cooldown, damage or projectile speed and do not fit the
 * weapon shape. The obvious move is a second `PASSIVES` record — and that is
 * the trap: `content.test.ts` enforces `enables` and `tradesAway` by iterating
 * a collection, so a sibling collection is a content rule that silently stops
 * applying to a third of the act's items. That is precisely the failure
 * mechanism 5 exists to prevent.
 *
 * So there is one registry, discriminated by `kind`, and the test iterates it.
 * Adding a category cannot drop the rule, because there is nowhere else to put
 * an item. The budget is roughly thirty for the whole game (mechanism 5); these
 * seven are Conception's entire allocation and there is no room for an eighth.
 *
 * Every one of them subtracts something (G-014). An item that cannot state what
 * build it enables AND what it trades away is cut rather than shipped.
 */

export type ItemKind = 'weapon' | 'control' | 'passive';

interface ItemBase {
  id: string;
  name: string;
  kind: ItemKind;
  /** What build this makes possible. Required, over 30 characters. */
  enables: string;
  /** What it costs. Required, over 30 characters. */
  tradesAway: string;
  maxLevel: number;
}

/** Fires something. `control` fires something that does no damage. */
export interface ActiveItem extends ItemBase {
  kind: 'weapon' | 'control';
  /** Seconds between activations at level 1. */
  cooldown: number;
  /** Damage per hit at level 1. Zero for control items. */
  damage: number;
  /** How the effect is delivered. The sim switches on this. */
  mode: 'seeking' | 'line' | 'burst' | 'trail' | 'attractor';
  /** Pixels. Meaning depends on mode: travel range, burst radius, pull radius. */
  range: number;
  projectileSpeed: number;
  radius: number;
  pierce: number;
}

/** Changes the player rather than the field. */
export interface PassiveItem extends ItemBase {
  kind: 'passive';
  /** Multiplier on movement speed, per level, applied multiplicatively. */
  speedMultiplier: number;
  /** Multiplier on maximum health. */
  healthMultiplier: number;
  /** Multiplier on contact damage taken. */
  damageTakenMultiplier: number;
  /**
   * Damage multiplier at the START of the run, ramping to `rampTo` by the end
   * of the act. 1 means no ramp.
   */
  damageMultiplier: number;
  rampTo: number;
}

export type ItemDef = ActiveItem | PassiveItem;

export const ITEMS: Record<string, ItemDef> = {
  // --- 4.1 Weapons ------------------------------------------------------
  lash: {
    id: 'lash',
    name: 'Lash',
    kind: 'weapon',
    mode: 'seeking',
    cooldown: 0.55,
    damage: 2,
    range: 420,
    projectileSpeed: 420,
    radius: 7,
    pierce: 1,
    maxLevel: 5,
    enables:
      'The default build. Fires at whatever is nearest, so it rewards nothing and asks nothing — the baseline every other weapon is measured against.',
    tradesAway:
      'Everything. No area, no pierce worth the name, no control over what it targets, and it cannot punish a crowd.',
  },

  motility: {
    id: 'motility',
    name: 'Motility',
    kind: 'weapon',
    mode: 'line',
    cooldown: 0.9,
    damage: 4,
    range: 520,
    projectileSpeed: 640,
    radius: 10,
    pierce: 99,
    maxLevel: 5,
    enables:
      'A positioning build: line the crowd up along one axis and the whole column dies at once, which turns the act’s density from a threat into the reason the weapon works.',
    tradesAway:
      'Any answer at all to being surrounded, since it only ever fires where the player is already pointed and does nothing whatsoever about what is behind them.',
  },

  acrosome: {
    id: 'acrosome',
    name: 'Acrosome',
    kind: 'weapon',
    mode: 'burst',
    cooldown: 1.4,
    damage: 5,
    range: 96,
    projectileSpeed: 0,
    radius: 96,
    pierce: 99,
    maxLevel: 5,
    enables:
      'A body-check build that wants to be inside the crowd rather than away from it, and the only weapon in the act that scales with how bad the player’s position is.',
    tradesAway:
      'Range, entirely. It cannot touch the spermicide ring, it cannot open on a white cell safely, and every use of it is paid for in contact damage first.',
  },

  wake: {
    id: 'wake',
    name: 'Wake',
    kind: 'weapon',
    mode: 'trail',
    cooldown: 0.18,
    damage: 2,
    range: 2.4,
    projectileSpeed: 0,
    radius: 26,
    pierce: 99,
    maxLevel: 5,
    enables:
      'A kiting build where the player never faces the crowd at all and kills by having already been somewhere, which is the only build in the act that rewards retreating.',
    tradesAway:
      'Everything about standing still. It deals no damage in front of the player, it cannot open a path, and a cornered player is holding a weapon that has stopped existing.',
  },

  // --- 4.2 Control ------------------------------------------------------
  chemotaxis: {
    id: 'chemotaxis',
    name: 'Chemotaxis',
    kind: 'control',
    mode: 'attractor',
    cooldown: 5.5,
    damage: 0,
    range: 330,
    projectileSpeed: 0,
    radius: 330,
    pierce: 0,
    maxLevel: 5,
    enables:
      'Every area weapon in the act at once, by choosing where the crowd will be instead of reacting to it. It is the item that makes Acrosome and Wake into builds rather than options.',
    tradesAway:
      'Its own damage, which is zero, and its safety margin: pulling a crowd into a tight point is exactly how a run ends for a player who has nothing to clear it with.',
  },

  // --- 4.3 Passives -----------------------------------------------------
  midpiece: {
    id: 'midpiece',
    name: 'Midpiece',
    kind: 'passive',
    speedMultiplier: 1.12,
    healthMultiplier: 0.9,
    damageTakenMultiplier: 1,
    damageMultiplier: 1,
    rampTo: 1,
    maxLevel: 5,
    enables:
      'Every build that depends on not being touched, and it is the only item that makes the white cell’s fixed heading and the spermicide’s timer into things a player can simply ignore.',
    tradesAway:
      'The margin for error. The health that absorbed a bad half-second is gone, so the first mistake in a run is now also the last one.',
  },

  membrane: {
    id: 'membrane',
    name: 'Membrane',
    kind: 'passive',
    speedMultiplier: 0.92,
    healthMultiplier: 1,
    damageTakenMultiplier: 0.82,
    damageMultiplier: 1,
    rampTo: 1,
    maxLevel: 5,
    enables:
      'Standing inside the crowd on purpose, which is the precondition for the Acrosome build and the only way to farm the rival wave rather than outrun it.',
    tradesAway:
      'The speed that made zones optional. A spermicide ring that used to be a detour is now a commitment, and a white cell crossing the lane has to be fought instead of avoided.',
  },

  capacitation: {
    id: 'capacitation',
    name: 'Capacitation',
    kind: 'passive',
    speedMultiplier: 1,
    healthMultiplier: 1,
    damageTakenMultiplier: 1,
    // Starts strictly worse than doing nothing and ends well ahead of it.
    damageMultiplier: 0.7,
    rampTo: 1.85,
    maxLevel: 5,
    enables:
      'A late-act scaling build that outperforms every other item in the last ninety seconds, and it is the only item in the game whose power is a function of the act clock rather than the player.',
    tradesAway:
      'The opening two minutes, which are strictly worse than doing nothing, on a hard timer. It is a bet that the run reaches the point where it pays, and act one is exactly long enough for that bet to be wrong.',
  },
};

export const ITEM_IDS = Object.keys(ITEMS);

export function itemDef(id: string): ItemDef {
  const def = ITEMS[id];
  if (!def) throw new Error(`Unknown item "${id}"`);
  return def;
}

export function isActive(def: ItemDef): def is ActiveItem {
  return def.kind === 'weapon' || def.kind === 'control';
}
