/**
 * The build sheet: what the pause screen says the player holds (G-043's
 * vocabulary, off the card and onto the life). Every figure is read from the
 * world's own getters or derived by `item-text.ts` from the same data the sim
 * pays, never typed here — the card rule, so the sheet can never claim a
 * number the run does not have (AUDIT.md's class of bug).
 *
 * Three parts: a header (the HUD's age and the level), one entry per held
 * item in registry order (its name, its pips, its taken paths with theirs,
 * and what it IS at the level held), and the totals — the player's stats
 * after every passive and the inheritance, shown only where they differ
 * from a body that took nothing.
 *
 * Node-safe and pure: it reads a `Pick` of `World` and returns lines, so a
 * test builds it from a real World and the scene only draws it.
 */
import {
  MAGNET_RADIUS,
  PLAYER_BASE_HP,
  PLAYER_BASE_SPEED,
  PLAYER_RADIUS,
  type World,
} from '../sim/world';
import { hudAge } from '../scenes/certificate';
import { ITEM_IDS, ITEMS, isActive, offerIdFor } from './items';
import { heldLines, percentTerm } from './item-text';

/** The world the sheet reads: its getters, nothing it could change. */
export type SheetWorld = Pick<
  World,
  | 'age'
  | 'level'
  | 'items'
  | 'pathLevels'
  | 'inheritance'
  | 'hp'
  | 'maxHp'
  | 'itemSpeed'
  | 'damageTaken'
  | 'damageDealt'
  | 'cooldownFactor'
  | 'reach'
  | 'magnetRadius'
  | 'playerRadius'
  | 'dragStacks'
>;

export interface SheetPips {
  owned: number;
  max: number;
}

/** One held item. */
export interface SheetEntry {
  /** The item's name; an evolution names what it came from: `Tantrum (Temper + Restlessness)`. */
  title: string;
  /** The item's level and its maximum, as the card's pips count them. */
  pips: SheetPips;
  /** Each taken path, in the weapon's order, as `Company ●●○`. */
  paths: string[];
  /**
   * What the item is at the level held, in the card's terms (`heldLines`):
   * one line, or two split at a ` · ` when one would pass `STAT_LINE_MAX`.
   */
  lines: string[];
}

export interface BuildSheet {
  /** `age 14 · level 12`. */
  header: string;
  /** Every held item, in registry order. */
  items: SheetEntry[];
  /** The player's stats where they differ from base, then the drag and the inheritance. */
  totals: string[];
}

const SEP = ' · ';

/** Pips as the sheet draws them: `●●○`, owned then the rest, no spaces. */
export function pipString(p: SheetPips): string {
  const max = Number.isFinite(p.max) ? Math.max(0, Math.round(p.max)) : 0;
  const owned = Number.isFinite(p.owned) ? Math.min(max, Math.max(0, Math.round(p.owned))) : 0;
  return '●'.repeat(owned) + '○'.repeat(max - owned);
}

/** A multiplier, at most two decimals: `×1.4`, `×0.49`. */
function times(n: number): string {
  const r = Math.round(n * 100) / 100;
  return `×${r}`;
}

function entry(world: SheetWorld, id: string, level: number): SheetEntry {
  const def = ITEMS[id]!;
  const from = isActive(def) ? def.evolvesFrom : undefined;
  const title = from
    ? `${def.name} (${ITEMS[from.weapon]?.name ?? from.weapon} + ${ITEMS[from.with]?.name ?? from.with})`
    : def.name;
  const paths: string[] = [];
  if (isActive(def)) {
    for (const path of def.paths ?? []) {
      const owned = world.pathLevels.get(offerIdFor(def, path)) ?? 0;
      if (owned > 0) paths.push(`${path.name} ${pipString({ owned, max: path.maxLevel })}`);
    }
  }
  return {
    title,
    pips: { owned: level, max: def.maxLevel },
    paths,
    lines: heldLines(id, level, world.pathLevels),
  };
}

/**
 * True when a held passive ramps its damage across the act (Late Bloomer), so
 * the damage total is a moving figure and says so.
 */
function ramping(world: SheetWorld): boolean {
  for (const [id, level] of world.items) {
    const def = ITEMS[id];
    if (level > 0 && def && def.kind === 'passive' && def.rampTo !== def.damageMultiplier) return true;
  }
  return false;
}

function totals(world: SheetWorld): string[] {
  const out: Array<string | null> = [];
  const hp = Math.ceil(Math.max(0, world.hp));
  const maxHp = Math.round(world.maxHp);
  if (Number.isFinite(hp) && Number.isFinite(maxHp) && (hp !== maxHp || maxHp !== PLAYER_BASE_HP)) {
    out.push(`health ${hp}/${maxHp}`);
  }
  out.push(
    percentTerm('speed', world.itemSpeed / PLAYER_BASE_SPEED - 1),
    percentTerm('damage taken', world.damageTaken - 1),
  );
  const dealt = world.damageDealt;
  if (ramping(world)) out.push(Number.isFinite(dealt) ? `damage ${times(dealt)} (ramping)` : null);
  else out.push(percentTerm('damage', dealt - 1));
  out.push(
    world.cooldownFactor > 0 ? percentTerm('attack speed', 1 / world.cooldownFactor - 1) : null,
    percentTerm('reach', world.reach - 1),
    percentTerm('pickup', world.magnetRadius / MAGNET_RADIUS - 1),
    percentTerm('size', world.playerRadius / PLAYER_RADIUS - 1),
  );
  if (world.dragStacks > 0) out.push(`${world.dragStacks} attached`);
  if (world.inheritance) out.push(`inherited: ${world.inheritance.name}`);
  return out.filter((t): t is string => typeof t === 'string' && t.length > 0 && !/NaN|undefined|Infinity/.test(t));
}

/** The sheet for the world as it stands. */
export function buildSheet(world: SheetWorld): BuildSheet {
  const items: SheetEntry[] = [];
  for (const id of ITEM_IDS) {
    const level = world.items.get(id) ?? 0;
    if (level > 0) items.push(entry(world, id, level));
  }
  return {
    header: `${hudAge(world.age)}${SEP}level ${world.level}`,
    items,
    totals: totals(world),
  };
}
