/**
 * Weapon definitions.
 *
 * PLAN.md mechanism 5: any item that cannot state what build it enables and
 * what it trades away is cut. `enables` and `tradesAway` are required fields
 * for exactly that reason — the content budget is capped at roughly 30 items,
 * and scarcity only forces deliberation if the justification is mandatory.
 */

export interface WeaponDef {
  id: string;
  name: string;
  /** Seconds between shots. */
  cooldown: number;
  damage: number;
  /** Pixels per second. */
  projectileSpeed: number;
  /** How far it will look for a target, in pixels. */
  range: number;
  /** Projectiles per volley. */
  count: number;
  /** Collision radius of the projectile. */
  radius: number;
  /** How many enemies one projectile can hit before expiring. */
  pierce: number;
  enables: string;
  tradesAway: string;
}

export const WEAPONS: Record<string, WeaponDef> = {
  lash: {
    id: 'lash',
    name: 'Lash',
    cooldown: 0.55,
    damage: 2,
    projectileSpeed: 420,
    range: 420,
    count: 1,
    radius: 7,
    pierce: 1,
    enables:
      'The default build. Fires at whatever is nearest, so it rewards nothing and asks nothing — the baseline every other weapon is measured against.',
    tradesAway:
      'Everything. No area, no pierce worth the name, no control over what it targets, and it cannot punish a crowd.',
  },
};

export function weaponDef(id: string): WeaponDef {
  const def = WEAPONS[id];
  if (!def) throw new Error(`Unknown weapon "${id}"`);
  return def;
}
