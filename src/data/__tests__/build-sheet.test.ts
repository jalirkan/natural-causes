import { describe, expect, it } from 'vitest';
import { ADOLESCENCE, CONCEPTION } from '../acts';
import { INHERITANCES } from '../inheritances';
import {
  ITEM_IDS,
  ITEMS,
  damageScale,
  isActive,
  levelBonus,
  offerIdFor,
  type ActiveItem,
  type PassiveItem,
} from '../items';
import { STAT_LINE_MAX, heldLines, percentTerm, statLines } from '../item-text';
import { buildSheet, pipString, type BuildSheet } from '../build-sheet';
import { hudAge } from '../../scenes/certificate';
import { World } from '../../sim/world';

/**
 * The pause screen's build sheet (G-043's vocabulary on the life): every
 * figure is the world's own or derived from the same data the sim pays, so
 * the expectations here are computed from the defs by the same formulas, not
 * typed — a placeholder moving in items.ts moves the test with it.
 */

const STILL = { moveX: 0, moveY: 0 };
const grudge = ITEMS['grudge'] as ActiveItem;
const restless = ITEMS['midpiece'] as PassiveItem;
const skin = ITEMS['membrane'] as PassiveItem;

/** Every line the sheet would draw, the title with its pips as the scene sets it. */
function drawn(sheet: BuildSheet): string[] {
  return [
    sheet.header,
    ...sheet.items.flatMap((e) => [`${e.title}  ${pipString(e.pips)}`, ...e.paths, ...e.lines]),
    ...sheet.totals,
  ];
}

function expectClean(sheet: BuildSheet): void {
  for (const line of drawn(sheet)) {
    expect(line.length, line).toBeLessThanOrEqual(STAT_LINE_MAX);
    expect(line, line).not.toMatch(/NaN|undefined|Infinity|null/);
    expect(line.length, 'an empty line').toBeGreaterThan(0);
  }
}

/** Mobile 4 with The Farm 2, Restlessness 2, Thick Skin 1, two attached; age 14 at level 12. */
function built(): World {
  const w = new World({ act: ADOLESCENCE, startingItems: [] });
  w.items.set('grudge', 4);
  w.pathLevels.set(offerIdFor(grudge, { id: 'company' }), 2);
  w.items.set('midpiece', 2);
  w.items.set('membrane', 1);
  w.dragStacks = 2;
  w.level = 12;
  // Adolescence runs 13 to 18: three tenths of the way is fourteen and a half.
  w.time = ADOLESCENCE.durationSeconds * 0.3;
  return w;
}

describe('the build sheet', () => {
  it('heads with the HUD’s age and the level', () => {
    const w = built();
    const sheet = buildSheet(w);
    expect(sheet.header).toBe(`${hudAge(w.age)} · level 12`);
    expect(sheet.header).toBe('age 14 · level 12');
  });

  it('lists what is held in registry order, with levels, paths and what each is', () => {
    const w = built();
    const sheet = buildSheet(w);
    const order = ITEM_IDS.filter((id) => (w.items.get(id) ?? 0) > 0).map((id) => ITEMS[id]!.name);
    expect(sheet.items.map((e) => e.title)).toEqual(order);

    const g = sheet.items.find((e) => e.title === 'Mobile')!;
    expect(g.pips).toEqual({ owned: 4, max: grudge.maxLevel });
    const company = grudge.paths!.find((p) => p.id === 'company')!;
    expect(g.paths).toEqual([`${company.name} ${'●'.repeat(2)}${'○'.repeat(company.maxLevel - 2)}`]);
    expect(g.paths).toEqual(['The Farm ●●○']);

    // What it IS: the level's damage, and one orbiter plus every one its
    // levels and The Farm's two levels add.
    const count =
      1 +
      levelBonus(grudge, 4).projectiles +
      company.levels.slice(0, 2).reduce((n, l) => n + (l.projectiles ?? 0), 0);
    const line = g.lines.join(' · ');
    expect(line).toContain(`${count} orbiting`);
    expect(line).toContain('4 orbiting');
    expect(line).toContain(`damage ${Math.round(grudge.damage * damageScale(4) * levelBonus(grudge, 4).damage * 10) / 10}`);
    expect(line).toMatch(/re-hits every [\d.]+s/);

    // And the sim pays it: one step puts that many of Mobile's orbiters round the player.
    w.step(1 / 60, STILL);
    expect(w.orbiters.filter((o) => o.source === 'grudge')).toHaveLength(count);
  });

  it('totals the passives from the world’s getters, as the passives define them', () => {
    const w = built();
    const { totals } = buildSheet(w);
    const speed = percentTerm('speed', restless.speedMultiplier ** 2 - 1)!;
    const taken = percentTerm('damage taken', skin.damageTakenMultiplier ** 1 - 1)!;
    const attack = percentTerm('attack speed', 1 / restless.cooldownMultiplier ** 2 - 1)!;
    expect(speed).toBe('speed +21%');
    expect(attack).toBe('attack speed +16%');
    expect(taken).toMatch(/^damage taken −\d+%$/);
    expect(totals).toContain(speed);
    expect(totals).toContain(taken);
    expect(totals).toContain(attack);
    expect(totals).toContain(`health ${Math.ceil(w.hp)}/${Math.round(100 * skin.healthMultiplier)}`);
    expect(totals).toContain('2 attached');
    // Nothing held changes these, so they are not said.
    for (const quiet of ['reach', 'pickup', 'size', 'damage +', 'damage ×', 'inherited']) {
      expect(totals.some((t) => t.startsWith(quiet)), quiet).toBe(false);
    }
    expectClean(buildSheet(w));
  });

  it('a fresh life holding only Pointing is one entry and no totals', () => {
    const w = new World({ act: CONCEPTION });
    const sheet = buildSheet(w);
    expect(sheet.items).toHaveLength(1);
    expect(sheet.items[0]!.title).toBe(ITEMS['lash']!.name);
    expect(sheet.items[0]!.paths).toEqual([]);
    expect(sheet.items[0]!.lines).toEqual(statLines('lash', { level: 0, pathLevel: 0 }));
    expect(sheet.totals).toEqual([]);
  });

  it('an evolution names the pair it came from', () => {
    const w = new World({ act: CONCEPTION, startingItems: [] });
    w.items.set('tantrum', 1);
    const tantrum = ITEMS['tantrum'] as ActiveItem;
    const from = tantrum.evolvesFrom!;
    const [entry] = buildSheet(w).items;
    expect(entry!.title).toBe(`${tantrum.name} (${ITEMS[from.weapon]!.name} + ${ITEMS[from.with]!.name})`);
    expect(entry!.title).toBe('Tantrum (Spilt Milk + Restlessness)');
    expect(entry!.pips).toEqual({ owned: 1, max: tantrum.maxLevel });
  });

  it('Late Bloomer makes damage a moving figure, and the inheritance is named', () => {
    const w = new World({ act: CONCEPTION, startingItems: [] });
    w.items.set('capacitation', 2);
    w.inheritance = INHERITANCES['constitution']!;
    w.time = CONCEPTION.durationSeconds / 2;
    const { totals } = buildSheet(w);
    expect(totals).toContain(`damage ×${Math.round(w.damageDealt * 100) / 100} (ramping)`);
    expect(totals).toContain('inherited: Constitution');
    // Constitution's health is the world's max, and a full bar still says it.
    expect(totals).toContain(`health ${Math.ceil(w.hp)}/${Math.round(w.maxHp)}`);
  });

  it('every item at every level, with every path, fits the card width and never breaks', () => {
    for (const inherited of [null, ...Object.values(INHERITANCES)]) {
      const w = new World({ act: CONCEPTION, startingItems: [] });
      w.inheritance = inherited;
      w.dragStacks = 37;
      for (const id of ITEM_IDS) {
        const def = ITEMS[id]!;
        w.items.set(id, def.maxLevel);
        if (isActive(def)) for (const p of def.paths ?? []) w.pathLevels.set(offerIdFor(def, p), p.maxLevel);
      }
      const sheet = buildSheet(w);
      expect(sheet.items).toHaveLength(ITEM_IDS.length);
      expectClean(sheet);
    }
    // And every level on its own, without paths.
    for (const id of ITEM_IDS) {
      for (let level = 1; level <= ITEMS[id]!.maxLevel; level++) {
        for (const line of heldLines(id, level, new Map())) {
          expect(line.length, `${id} ${level}: ${line}`).toBeLessThanOrEqual(STAT_LINE_MAX);
          expect(line).not.toMatch(/NaN|undefined|Infinity/);
        }
      }
    }
  });

  it('an item held at level one with no paths reads exactly as its new-item card', () => {
    for (const id of ITEM_IDS) {
      expect(heldLines(id, 1, new Map()), id).toEqual(statLines(id, { level: 0, pathLevel: 0 }));
    }
  });

  it('a path that changes speed says so on the held line', () => {
    const spiralling = grudge.paths!.find((p) => p.id === 'spiralling')!;
    const lines = heldLines('grudge', 2, new Map([[offerIdFor(grudge, spiralling), 2]])).join(' · ');
    const spin = spiralling.levels.slice(0, 2).reduce((k, l) => k * (l.speed ?? 1), 1);
    expect(lines).toContain(percentTerm('spin', spin - 1)!);
  });
});
