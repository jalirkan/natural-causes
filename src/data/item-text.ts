/**
 * What an offer card says a level is worth (G-043), in the terms a survivors
 * player already reads — "attack speed +8%", "+1 orbiting" — derived here
 * from the data and never typed by hand, so a joke can never claim a number
 * the sim does not pay (AUDIT.md's class of bug: the card lies and nothing
 * throws). The ONE place a stat line is written; the card only draws it.
 *
 * Every figure comes from the same fields and the same exported formulas the
 * sim reads (`damageScale`, `cooldownScale`, `levelBonus`), so moving a
 * placeholder number in `items.ts` moves the card with it. The figures are
 * the item's own, before the player's passives, as a survivors card prints
 * them.
 *
 * Node-safe and pure: imports only the registries' data and types.
 */
import {
  cooldownScale,
  damageScale,
  foldBonus,
  isActive,
  itemDef,
  levelBonus,
  offerIdFor,
  parseOfferId,
  type ActiveItem,
  type LevelBonus,
  type PassiveItem,
} from './items';
import type { StatLine } from './inheritances';

/** The longest stat line the card is sized for, in characters (13px monospace). */
export const STAT_LINE_MAX = 44;

const SEP = ' · ';
/** The real minus sign: a reduction reads as one, not as a hyphen. */
const MINUS = '−';

/** How much of the item and its path the player holds before taking this card. */
export interface OwnedLevels {
  /** The weapon's (or passive's) own level; 0 when the item is new. */
  level: number;
  /** The path's level, for a path offer; 0 when the path is new. */
  pathLevel: number;
}

/*
 * The coming modes (G-044: `aura`, `sweep`, `strike`) are handled by name
 * before they exist in the `mode` union, so the switch widens it to a string;
 * a mode this file does not know falls back to the generic terms, never throws.
 * `arc` (radians, `sweep` only) is read the same way until the field lands.
 */
type Mode = string;
type WithArc = ActiveItem & { arc?: number };

// --- number formatting ----------------------------------------------------

function finite(...ns: number[]): boolean {
  return ns.every((n) => Number.isFinite(n));
}

/** Damage and plain quantities: at most one decimal, trailing zeros trimmed. */
function num(n: number): string {
  const r = Math.round(n * 10) / 10;
  return String(r === 0 ? 0 : r);
}

/** Seconds, trimmed: `0.55s`, `0.5s`, `1s`, `1.4s`. */
function secs(n: number): string {
  const r = Math.round(n * 100) / 100;
  return `${r === 0 ? 0 : r}s`;
}

/** Pixels, whole. */
function px(n: number): string {
  const r = Math.round(n);
  return String(r === 0 ? 0 : r);
}

/** A signed whole percentage for a change of `delta` (0.15 is +15%); null when it rounds to nothing. */
function pct(delta: number): string | null {
  if (!finite(delta)) return null;
  const v = Math.round(delta * 100);
  if (v === 0) return null;
  return v > 0 ? `+${v}%` : `${MINUS}${-v}%`;
}

/** `label +15%`, or null when the change rounds to nothing. */
function labelled(label: string, delta: number): string | null {
  const p = pct(delta);
  return p === null ? null : `${label} ${p}`;
}

/** A signed whole count: `+1`, `−2`; null for zero. */
function signed(n: number): string | null {
  if (!finite(n) || Math.round(n) === 0) return null;
  const r = Math.round(n);
  return r > 0 ? `+${r}` : `${MINUS}${-r}`;
}

/** `2 targets`; null for one or fewer (one is what the weapon is). */
function many(n: number, noun: string): string | null {
  if (!finite(n) || n <= 1) return null;
  return `${Math.round(n)} ${noun}s`;
}

// --- vocabulary by mode ---------------------------------------------------

/** What one more projectile is called, by mode. */
function projectileTerm(mode: Mode, n: number): string | null {
  const s = signed(n);
  if (s === null) return null;
  const plural = Math.abs(Math.round(n)) !== 1;
  switch (mode) {
    case 'orbit':
      return `${s} orbiting`;
    case 'seeking':
      return `${s} ${plural ? 'targets' : 'target'}`;
    case 'line':
      return `${s} ${plural ? 'lines' : 'line'}`;
    case 'sweep':
      return `${s} ${plural ? 'sweeps' : 'sweep'}`;
    case 'strike':
      return `${s} ${plural ? 'bolts' : 'bolt'}`;
    default:
      return `${s} ${plural ? 'shots' : 'shot'}`;
  }
}

/** What a multiplier on `area` changes, by mode (`items.ts` LevelBonus.area). */
function areaTerm(mode: Mode, area: number): string | null {
  const p = pct(area - 1);
  if (p === null) return null;
  switch (mode) {
    case 'burst':
    case 'aura':
    case 'strike':
    case 'trail':
    case 'attractor':
    case 'field':
      return `radius ${p}`;
    case 'orbit':
      return `orbit ${p} wider`;
    case 'sweep':
      return `reach ${p}`;
    case 'seeking':
    case 'line':
      return `shot ${p} wider`;
    default:
      return `area ${p}`;
  }
}

/** A multiplier on projectile speed: an orbit's is its spin. */
function speedTerm(mode: Mode, speed: number): string | null {
  return labelled(mode === 'orbit' ? 'spin' : 'shot speed', speed - 1);
}

/**
 * A change in cadence, given as the ratio of the new rate to the old (above 1
 * is sooner). A weapon attacks, so it reads as attack speed; a control item
 * (Charisma, Snooze) does not attack, so it reads as its cooldown.
 */
function cadenceTerm(def: ActiveItem, rateRatio: number): string | null {
  if (!finite(rateRatio) || rateRatio <= 0) return null;
  return def.kind === 'control' ? labelled('cooldown', 1 / rateRatio - 1) : labelled('attack speed', rateRatio - 1);
}

/**
 * The fields a level (or a path level) carries of its own, in card order:
 * projectiles, pierce, area, duration, echo, chain, speed, knockback. Damage
 * and cooldown are not here: a caller folds them into its figures.
 */
function fieldTerms(def: ActiveItem, l: LevelBonus | undefined): Array<string | null> {
  if (!l) return [];
  const mode: Mode = def.mode;
  const pierce = signed(l.pierce ?? 0);
  const chain = signed(l.chain ?? 0);
  const knock = signed(l.knockback ?? 0);
  return [
    projectileTerm(mode, l.projectiles ?? 0),
    pierce === null ? null : `${pierce} pierce`,
    l.area === undefined ? null : areaTerm(mode, l.area),
    l.duration === undefined ? null : labelled('lasts', l.duration - 1),
    l.echo ? 'fires twice' : null,
    chain === null ? null : `${chain} ${Math.abs(Math.round(l.chain ?? 0)) === 1 ? 'jump' : 'jumps'}`,
    l.speed === undefined ? null : speedTerm(mode, l.speed),
    knock === null ? null : `pushes ${knock}px`,
  ];
}

// --- the three kinds of card ---------------------------------------------

/**
 * An active item as it stands at `level` with `b` (every bonus its levels and
 * paths add, folded as the sim folds them): what it is, in classic terms, by
 * mode. A new item is this at level one (`newActiveTerms`); the build sheet
 * is this at the level held (`heldLines`).
 */
function activeTerms(def: ActiveItem, level: number, b: Required<LevelBonus>): Array<string | null> {
  const mode: Mode = def.mode;
  const damage = def.damage * damageScale(level) * b.damage;
  const cooldown = def.cooldown * cooldownScale(level) * b.cooldown;
  const radius = def.radius * b.area;
  const count = 1 + b.projectiles;
  const pierce = def.pierce + b.pierce;

  const hits = finite(damage) && damage > 0 ? `damage ${num(damage)}` : null;
  const every = finite(cooldown) && cooldown > 0 ? `every ${secs(cooldown)}` : null;
  const rehits = finite(cooldown) && cooldown > 0 ? `re-hits every ${secs(cooldown)}` : null;
  const within = finite(radius) && radius > 0 ? `radius ${px(radius)}` : null;
  const lasts = finite(def.range * b.duration) && def.range > 0 ? `lasts ${secs(def.range * b.duration)}` : null;
  const range = finite(def.range) && def.range > 0 ? `range ${px(def.range)}` : null;
  // `pierce` counts hits: 1 is an ordinary shot, 99 is the "never stops" idiom.
  const through = pierce >= 99 ? 'pierces all' : pierce > 1 ? `pierces ${Math.round(pierce - 1)}` : null;

  let terms: Array<string | null>;
  switch (mode) {
    case 'seeking':
      terms = [hits, every, range, many(count, 'target'), through];
      break;
    case 'line':
      terms = [hits, every, through, many(count, 'line')];
      break;
    case 'burst':
      terms = [hits, every, within];
      break;
    case 'trail':
      // Rut (G-046): a trail that also holds what crosses it.
      terms = [
        hits && `${hits} per tick`,
        lasts,
        within,
        def.slow !== undefined && finite(def.slow) ? `slows to ${Math.round(def.slow * 100)}%` : null,
      ];
      break;
    case 'orbit':
      terms = [hits, finite(count) ? `${Math.round(count)} orbiting` : null, rehits];
      break;
    case 'aura':
      terms = [hits, within, rehits];
      break;
    case 'sweep': {
      const arc = (def as WithArc).arc;
      const reach = def.range * b.area;
      terms = [
        hits,
        every,
        finite(reach) && reach > 0 ? `reach ${px(reach)}` : null,
        arc !== undefined && finite(arc) && arc > 0 ? `arc ${Math.round((arc * 180) / Math.PI)}°` : null,
        many(count, 'sweep'),
      ];
      break;
    }
    case 'strike':
      terms = [hits, every, range, within, many(count, 'bolt')];
      break;
    case 'attractor':
      terms = [within && `pulls within ${px(radius)}`, every];
      break;
    case 'field':
      terms = [
        // Calendar block (The Office): a hold that walls rather than slows.
        def.wall && within ? `walls within ${px(radius)}` : null,
        // A slow of 1 holds nothing still, so it is not printed.
        def.slow !== undefined && finite(def.slow) && def.slow < 1 ? `slows to ${Math.round(def.slow * 100)}%` : null,
        lasts,
        every,
      ];
      break;
    default:
      // A mode this file has not met: the generic figures, never a throw.
      terms = [hits, every, within];
  }

  // What level one adds beyond the shape (Gossip's jumps), and a push (Tantrum's).
  const knockback = (def.knockback ?? 0) + b.knockback;
  terms.push(
    b.chain > 0 ? `${Math.round(b.chain)} ${Math.round(b.chain) === 1 ? 'jump' : 'jumps'}` : null,
    b.echo ? 'fires twice' : null,
    finite(knockback) && Math.round(knockback) > 0 ? `pushes ${px(knockback)}px` : null,
  );
  return terms;
}

/** A new active item: what it is at level one. */
function newActiveTerms(def: ActiveItem): Array<string | null> {
  return activeTerms(def, 1, levelBonus(def, 1));
}

/**
 * An active item's level-up, from `level` to `level + 1`: the total change in
 * damage and cadence (the generic scaling and the level's own multipliers
 * together, as the sim pays them), then what the level reached adds.
 */
function levelUpTerms(def: ActiveItem, level: number): Array<string | null> {
  const was = levelBonus(def, level);
  const now = levelBonus(def, level + 1);
  const damage =
    def.damage > 0 ? labelled('damage', (damageScale(level + 1) * now.damage) / (damageScale(level) * was.damage) - 1) : null;
  const cadence = cadenceTerm(
    def,
    (cooldownScale(level) * was.cooldown) / (cooldownScale(level + 1) * now.cooldown),
  );
  return [damage, cadence, ...fieldTerms(def, def.levels[level])];
}

/**
 * A path's level-up: only what that path level carries. No generic scaling —
 * a path levels apart from the weapon — unless the level itself multiplies
 * damage or cooldown.
 */
function pathTerms(def: ActiveItem, l: LevelBonus | undefined): Array<string | null> {
  if (!l) return [];
  return [
    l.damage !== undefined && def.damage > 0 ? labelled('damage', l.damage - 1) : null,
    l.cooldown !== undefined && l.cooldown > 0 ? cadenceTerm(def, 1 / l.cooldown) : null,
    ...fieldTerms(def, l),
  ];
}

/**
 * A passive's line — what one level multiplies. Every level is another
 * multiplication, so a level-up prints the same line. Typed on the stat line
 * the inheritance shares (inheritances.ts), so it can print either.
 */
type PassiveLine = StatLine &
  Partial<Pick<PassiveItem, 'reachMultiplier' | 'sizeMultiplier' | 'damageMultiplier' | 'rampTo'>>;

function passiveTerms(s: PassiveLine): Array<string | null> {
  const from = s.damageMultiplier ?? 1;
  const to = s.rampTo ?? from;
  const ramp =
    from === to
      ? labelled('damage', from - 1)
      : finite(from, to)
        ? `damage ${Math.round(from * 100)}% → ${Math.round(to * 100)}% over each act`
        : null;
  return [
    labelled('speed', s.speedMultiplier - 1),
    s.cooldownMultiplier > 0 ? labelled('attack speed', 1 / s.cooldownMultiplier - 1) : null,
    labelled('health', s.healthMultiplier - 1),
    labelled('damage taken', s.damageTakenMultiplier - 1),
    labelled('reach', (s.reachMultiplier ?? 1) - 1),
    labelled('pickup', s.pickupMultiplier - 1),
    labelled('size', (s.sizeMultiplier ?? 1) - 1),
    ramp,
  ];
}

// --- layout ---------------------------------------------------------------

const BROKEN = /NaN|undefined|Infinity/;

/**
 * Terms into one line, or two split at a ` · ` so neither passes
 * `STAT_LINE_MAX` and the longer is as short as it can be (ties go to the top
 * line). Greedy lines past two only if nothing else fits.
 */
function pack(terms: string[]): string[] {
  const one = terms.join(SEP);
  if (one.length <= STAT_LINE_MAX) return [one];
  let best: [string, string] | null = null;
  for (let i = 1; i < terms.length; i++) {
    const a = terms.slice(0, i).join(SEP);
    const b = terms.slice(i).join(SEP);
    if (a.length > STAT_LINE_MAX || b.length > STAT_LINE_MAX) continue;
    if (!best || Math.max(a.length, b.length) <= Math.max(best[0].length, best[1].length)) best = [a, b];
  }
  if (best) return best;
  const lines: string[] = [];
  let line = '';
  for (const t of terms) {
    const next = line ? `${line}${SEP}${t}` : t;
    if (line && next.length > STAT_LINE_MAX) {
      lines.push(line);
      line = t;
    } else line = next;
  }
  lines.push(line);
  return lines;
}

// --- the exports ----------------------------------------------------------

/**
 * What taking this offer is worth, as one or two lines of `·`-joined terms,
 * each at most `STAT_LINE_MAX` characters. `owned` is what the player holds
 * before taking it. Never empty, never NaN, and a mode it does not know
 * prints the generic figures rather than throwing.
 */
export function statLines(offerId: string, owned: OwnedLevels): string[] {
  const { item, path } = parseOfferId(offerId);
  let terms: Array<string | null>;
  let fallback: string;
  if (path && isActive(item)) {
    terms = pathTerms(item, path.levels[owned.pathLevel]);
    fallback = `level ${owned.pathLevel + 1} of ${path.maxLevel}`;
  } else if (!isActive(item)) {
    terms = passiveTerms(item);
    fallback = `level ${owned.level + 1} of ${item.maxLevel}`;
  } else if (owned.level <= 0) {
    terms = newActiveTerms(item);
    fallback = `level 1 of ${item.maxLevel}`;
  } else {
    terms = levelUpTerms(item, owned.level);
    fallback = `level ${owned.level + 1} of ${item.maxLevel}`;
  }
  const clean = terms.filter((t): t is string => typeof t === 'string' && t.length > 0 && !BROKEN.test(t));
  return pack(clean.length > 0 ? clean : [fallback]);
}

/** The card's name: the item's, or `Weapon · Path` for a path offer. */
export function offerTitle(offerId: string): string {
  const { item, path } = parseOfferId(offerId);
  return path ? `${item.name}${SEP}${path.name}` : item.name;
}

/** The card's pips: the path's levels for a path offer, else the item's. */
export function offerPips(offerId: string, owned: OwnedLevels): { owned: number; max: number } {
  const { item, path } = parseOfferId(offerId);
  return path ? { owned: owned.pathLevel, max: path.maxLevel } : { owned: owned.level, max: item.maxLevel };
}

// --- the item as held (the build sheet) -----------------------------------

/**
 * Everything an active item's levels and its taken paths add, folded the way
 * `World.bonusFor` folds them: the weapon's `levelBonus`, then each path's
 * levels in `paths` order. `pathLevels` is keyed by offer id, as the world's.
 */
function heldBonus(def: ActiveItem, level: number, pathLevels: ReadonlyMap<string, number>): Required<LevelBonus> {
  const out = { ...levelBonus(def, level) };
  for (const path of def.paths ?? []) {
    const owned = pathLevels.get(offerIdFor(def, path)) ?? 0;
    for (const l of path.levels.slice(0, Math.max(0, owned))) foldBonus(out, l);
  }
  return out;
}

/** A passive's stat line taken `level` times, as `World.passiveProduct` multiplies it. */
function heldPassive(def: PassiveItem, level: number): PassiveLine {
  const times = (m: number) => m ** level;
  return {
    speedMultiplier: times(def.speedMultiplier),
    healthMultiplier: times(def.healthMultiplier),
    damageTakenMultiplier: times(def.damageTakenMultiplier),
    cooldownMultiplier: times(def.cooldownMultiplier),
    pickupMultiplier: times(def.pickupMultiplier),
    reachMultiplier: times(def.reachMultiplier),
    sizeMultiplier: times(def.sizeMultiplier),
    damageMultiplier: times(def.damageMultiplier),
    rampTo: times(def.rampTo),
  };
}

/**
 * What an item IS at the level held (the pause screen's build sheet), in the
 * card's vocabulary: an active item's figures at `level` with its taken paths
 * folded in (Grudge 4 with Company 2: `damage 4.8 · 4 orbiting · re-hits
 * every 0.38s`), plus a spin or shot speed a path changed; a passive's line
 * multiplied `level` times. Like every card, the item's own figures, before
 * the player's passives — those are the sheet's totals. One line, or two
 * split at a ` · ` when one would pass `STAT_LINE_MAX`; never empty, never
 * NaN. At level one with no paths it is exactly the new-item card.
 */
export function heldLines(itemId: string, level: number, pathLevels: ReadonlyMap<string, number>): string[] {
  const def = itemDef(itemId);
  const at = Math.max(1, Math.round(level));
  let terms: Array<string | null>;
  if (isActive(def)) {
    const b = heldBonus(def, at, pathLevels);
    // The one field `activeTerms` does not print, measured from level one so
    // a new item never claims a change and Spiralling's spin still shows.
    terms = [...activeTerms(def, at, b), speedTerm(def.mode, b.speed / levelBonus(def, 1).speed)];
  } else {
    terms = passiveTerms(heldPassive(def, at));
  }
  const clean = terms.filter((t): t is string => typeof t === 'string' && t.length > 0 && !BROKEN.test(t));
  return pack(clean.length > 0 ? clean : [`level ${at} of ${def.maxLevel}`]);
}

/**
 * `label +15%` for a change of `delta` (0.15), with the real minus sign; null
 * when it rounds to nothing or is not a number. The build sheet's totals use
 * it, so a total and a card print a percentage the same way.
 */
export function percentTerm(label: string, delta: number): string | null {
  return labelled(label, delta);
}
