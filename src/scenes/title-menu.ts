import { RULES, RULE_IDS, type RuleId, type RunRules } from '../sim/rules';
import { WIDE_FLOOR } from './certificate';

/**
 * The title's menu, as arithmetic: which lives it offers, which one a key or
 * a point means, and how big its type is set. Kept out of `TitleScene` for
 * the reason `./touch` is: a pointer and a keyboard cannot be exercised in CI
 * and this can. The scene owns the events and the drawing; this owns what
 * they mean. No Phaser here.
 *
 * The plain life is not a row: it is the title's own line ("a life, from
 * conception"), what Enter starts until a key chooses otherwise, and what a
 * tap anywhere but on a rule starts, as it always has. Every other row is a
 * rule (G-055), one per id in `RULE_IDS`, named and described by `RULES` and
 * nothing else — a name typed here would be a sibling registry.
 */

/** The palette's blush (D-031) as a Phaser number, for the selection's band. A test ties it to `tools/art/palette.ts`. */
export const BLUSH = 0xeba39c;

/** The selection that means the plain life. Any other value is an index into `menuRows()`. */
export const PLAIN = -1;

/** One rule's line on the title. */
export interface MenuRow {
  id: RuleId;
  /** The key that selects it: its number, from 1. */
  key: string;
  /** The printed label, numbered as a form numbers its fields: "1. couch potato". */
  label: string;
  /** The rule's one line, set smaller under the label. */
  blurb: string;
}

/** Every rule the title offers, in `RULE_IDS`'s order. */
export function menuRows(ids: readonly RuleId[] = RULE_IDS): MenuRow[] {
  return ids.map((id, i) => ({
    id,
    key: String(i + 1),
    label: `${i + 1}. ${RULES[id].name.toLowerCase()}`,
    blurb: RULES[id].blurb,
  }));
}

/** A row's box on the canvas, in game px. */
export interface Box {
  x: number;
  y: number;
  width: number;
  height: number;
}

/**
 * The rows' boxes, stacked down from `top` at `x`, each `width` wide and as
 * tall as its entry in `heights`, `gap` apart. The gap belongs to no row: a
 * tap between two rules starts neither, and so starts the plain life.
 */
export function stackRows(top: number, x: number, width: number, heights: readonly number[], gap: number): Box[] {
  const boxes: Box[] = [];
  let y = top;
  for (const h of heights) {
    boxes.push({ x, y, width, height: h });
    y += h + gap;
  }
  return boxes;
}

/** The row a point is in, or `PLAIN` when it is in none. Edges count as in. */
export function rowAt(boxes: readonly Box[], p: { x: number; y: number }): number {
  return boxes.findIndex((b) => p.x >= b.x && p.x <= b.x + b.width && p.y >= b.y && p.y <= b.y + b.height);
}

/**
 * What a key does to the selection over `count` rows: ↓ and ↑ step through
 * the plain life and then each rule, stopping at either end; a row's number
 * selects it and 0 the plain life. Null for any key that is not the menu's,
 * so the name on the form still hears it.
 */
export function selectionForKey(key: string, selected: number, count: number): number | null {
  if (key === 'ArrowDown') return Math.min(count - 1, selected + 1);
  if (key === 'ArrowUp') return Math.max(PLAIN, selected - 1);
  if (key === '0') return PLAIN;
  if (/^[1-9]$/.test(key)) {
    const n = Number(key);
    return n <= count ? n - 1 : null;
  }
  return null;
}

/** The rules the selection starts a life under: none for the plain life, one rule per row. */
export function rulesFor(selected: number, ids: readonly RuleId[] = RULE_IDS): RunRules {
  const id = ids[selected];
  return selected >= 0 && id ? [id] : [];
}

/**
 * The title's type, in game px, as a multiple of its 1280 sizes: the least
 * that sets its smallest line (the ancestors', `smallest` px) at the
 * certificate's print floor (`WIDE_FLOOR.print`, in CSS px) for a canvas shown
 * at `cssPerGamePx` CSS px per game px, and never less than 1. A multiple
 * rather than a floor per size, so the lines keep their order of size on a
 * phone: raised to one floor, the rules' names and their blurbs would be set
 * the same.
 */
export function titleTypeScale(cssPerGamePx: number, smallest: number): number {
  const r = cssPerGamePx > 0 ? Math.min(1, cssPerGamePx) : 1;
  return Math.max(1, WIDE_FLOOR.print / (smallest * r));
}

/**
 * CSS px per game px for a canvas FIT sets in a parent of this size: the
 * smaller of the two ratios, as FIT letterboxes on the other axis. Zero for a
 * parent or canvas with no size.
 */
export function shownAt(parent: { width: number; height: number }, canvas: { width: number; height: number }): number {
  if (!(canvas.width > 0) || !(canvas.height > 0) || !(parent.width > 0) || !(parent.height > 0)) return 0;
  return Math.min(parent.width / canvas.width, parent.height / canvas.height);
}
