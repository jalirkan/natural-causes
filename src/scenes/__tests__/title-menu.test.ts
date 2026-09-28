import { describe, expect, it } from 'vitest';
import { RULES, RULE_IDS } from '../../sim/rules';
import { BLUSH as PALETTE_BLUSH } from '../../../tools/art/palette';
import { WIDE_FLOOR } from '../certificate';
import {
  BLUSH,
  PLAIN,
  menuRows,
  rowAt,
  rulesFor,
  selectionForKey,
  shownAt,
  stackRows,
  titleTypeScale,
} from '../title-menu';

describe("the title's menu rows", () => {
  it('is one row per rule in the registry, in its order, numbered from 1', () => {
    const rows = menuRows();
    expect(rows.map((r) => r.id)).toEqual([...RULE_IDS]);
    expect(rows.map((r) => r.key)).toEqual(RULE_IDS.map((_, i) => String(i + 1)));
  });

  it("prints each rule's registry name and blurb, and nothing typed here", () => {
    for (const row of menuRows()) {
      const def = RULES[row.id];
      expect(row.label).toBe(`${row.key}. ${def.name.toLowerCase()}`);
      expect(row.blurb).toBe(def.blurb);
    }
  });
});

describe('stackRows and rowAt', () => {
  const boxes = stackRows(100, 20, 300, [40, 60], 10);

  it('stacks the rows down from the top, a gap apart', () => {
    expect(boxes).toEqual([
      { x: 20, y: 100, width: 300, height: 40 },
      { x: 20, y: 150, width: 300, height: 60 },
    ]);
  });

  it('finds the row a point is in, edges included', () => {
    expect(rowAt(boxes, { x: 20, y: 100 })).toBe(0);
    expect(rowAt(boxes, { x: 170, y: 140 })).toBe(0);
    expect(rowAt(boxes, { x: 320, y: 210 })).toBe(1);
  });

  it('is the plain life everywhere else: above, beside, between and below the rows', () => {
    for (const p of [
      { x: 170, y: 99 },
      { x: 19, y: 120 },
      { x: 321, y: 170 },
      { x: 170, y: 145 },
      { x: 170, y: 211 },
    ]) {
      expect(rowAt(boxes, p)).toBe(PLAIN);
    }
    expect(rowAt([], { x: 0, y: 0 })).toBe(PLAIN);
  });
});

describe('selectionForKey', () => {
  const n = RULE_IDS.length;

  it('steps down from the plain life through each rule, and stops at the last', () => {
    let sel = PLAIN;
    const seen: number[] = [];
    for (let i = 0; i < n + 2; i++) {
      sel = selectionForKey('ArrowDown', sel, n)!;
      seen.push(sel);
    }
    expect(seen.slice(0, n)).toEqual(RULE_IDS.map((_, i) => i));
    expect(seen.slice(n)).toEqual([n - 1, n - 1]);
  });

  it('steps up back to the plain life, and stops there', () => {
    expect(selectionForKey('ArrowUp', 0, n)).toBe(PLAIN);
    expect(selectionForKey('ArrowUp', PLAIN, n)).toBe(PLAIN);
  });

  it("selects a row by its number, the plain life by 0, and ignores a number with no row", () => {
    menuRows().forEach((row, i) => expect(selectionForKey(row.key, PLAIN, n)).toBe(i));
    expect(selectionForKey('0', n - 1, n)).toBe(PLAIN);
    expect(selectionForKey(String(n + 1), PLAIN, n)).toBeNull();
  });

  it("leaves every other key to the name on the form, Enter and Space included", () => {
    for (const key of ['Enter', ' ', 'a', 'J', 'Backspace', '-', "'", 'ArrowLeft']) {
      expect(selectionForKey(key, PLAIN, n)).toBeNull();
    }
  });
});

describe('rulesFor', () => {
  it('starts the plain life under no rule', () => {
    expect(rulesFor(PLAIN)).toEqual([]);
  });

  it('starts a row under its one rule', () => {
    RULE_IDS.forEach((id, i) => expect(rulesFor(i)).toEqual([id]));
  });

  it('starts the plain life for a selection past the rows', () => {
    expect(rulesFor(RULE_IDS.length)).toEqual([]);
  });
});

describe("the title's type", () => {
  it('is set at its 1280 sizes on a canvas shown 1280 across or more', () => {
    expect(titleTypeScale(1, 13)).toBe(1);
    expect(titleTypeScale(1.5, 13)).toBe(1);
  });

  it("raises its smallest line to the certificate's print floor on a phone, and stays 1 with no size", () => {
    // 844×390 sideways: FIT shows 1280×720 at 693×390.
    const sideways = shownAt({ width: 844, height: 390 }, { width: 1280, height: 720 });
    expect(13 * titleTypeScale(sideways, 13) * sideways).toBeCloseTo(WIDE_FLOOR.print);
    // 390×844 upright, on the narrow canvas the certificate asks for (720 wide).
    const upright = shownAt({ width: 390, height: 844 }, { width: 720, height: 1558 });
    expect(13 * titleTypeScale(upright, 13) * upright).toBeCloseTo(WIDE_FLOOR.print);
    expect(titleTypeScale(0, 13)).toBe(1);
  });

  it('measures FIT as the smaller of the two ratios', () => {
    expect(shownAt({ width: 844, height: 390 }, { width: 1280, height: 720 })).toBeCloseTo(390 / 720);
    expect(shownAt({ width: 1920, height: 1080 }, { width: 1280, height: 720 })).toBeCloseTo(1.5);
    expect(shownAt({ width: 0, height: 390 }, { width: 1280, height: 720 })).toBe(0);
  });
});

describe("the title's blush", () => {
  it("is the palette's (D-031)", () => {
    expect(`#${BLUSH.toString(16).toUpperCase().padStart(6, '0')}`).toBe(PALETTE_BLUSH.hex.toUpperCase());
  });
});
