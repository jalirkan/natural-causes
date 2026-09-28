import { describe, expect, it } from 'vitest';
import { DECLINE, type ActDef } from '../../data/acts';
import { enemyDef } from '../../data/enemies';
import { ITEMS, type PassiveItem } from '../../data/items';
import { MAX_HP_FLOOR, PLAYER_BASE_HP, World } from '../../sim/world';
import { healthBar } from '../health-bar';

/**
 * The HUD's health bar (AUDIT 90, 122, 123), as the numbers `drawHud` draws:
 * the track is the items' maximum, the live part ends at the maximum now,
 * the tail is what the insurance form's decisions took, and the floor's tick
 * shows while a tail does. Against a real World, so the bar reads the sim's
 * own getters; the decisions are the form's own shot landing, as decline's
 * tests land one.
 */

const W = 216;
const DT = 1 / 60;
const FORM = enemyDef('insurance-form');
const LOSS = FORM.ranged!.maxHpLoss!;
const SKIN = (ITEMS['membrane'] as PassiveItem).healthMultiplier;
const QUIET: ActDef = { ...DECLINE, waves: [] };

let serial = 1;
/** A decision landing on the player: the form's own shot, on them, out of i-frames. */
function decision(w: World): void {
  const r = FORM.ranged!;
  w.projectiles.push({
    x: w.x,
    y: w.y,
    vx: 0,
    vy: 0,
    life: 1,
    damage: r.damage,
    pierce: 1,
    radius: 10,
    hostile: true,
    source: FORM.id,
    owner: FORM,
    serial: serial++,
  });
  w.invulnerable = 0;
  w.step(DT, { moveX: 0, moveY: 0 });
}

function world(): World {
  return new World({ act: QUIET, seed: 7, startingItems: [] });
}

describe('the health bar draws a decision’s loss against the items’ maximum (AUDIT 122)', () => {
  it('nothing decided: the whole track is live, no tail, no tick', () => {
    const w = world();
    expect(healthBar(W, w)).toEqual({ live: W, tail: 0, fill: W, floorAt: null });
    // A Thick Skin with nothing decided lengthens nothing that shows.
    w.items.set('membrane', 1);
    w.hp = w.maxHp;
    expect(healthBar(W, w)).toMatchObject({ live: W, tail: 0, floorAt: null });
  });

  it('a decision shows as a tail of its share of the track', () => {
    const w = world();
    decision(w);
    const bar = healthBar(W, w);
    expect(bar.tail).toBe(W - Math.round(W * (1 - LOSS)));
    expect(bar.tail).toBeGreaterThan(0);
    expect(bar.live + bar.tail).toBe(W);
    // Health is held inside the maximum, so the fill ends inside the live track.
    expect(bar.fill).toBeLessThanOrEqual(bar.live);
  });

  it('a decision then a Thick Skin still shows the tail, where the opening maximum hid it', () => {
    const w = world();
    decision(w);
    const before = healthBar(W, w).tail;
    w.items.set('membrane', 1);
    // The maximum now is above the act's opening one: a track drawn at the
    // larger of the two (the old bar) had no tail left to draw.
    expect(w.maxHp).toBeGreaterThan(w.openingMaxHp);
    const old = W - Math.round((W * w.maxHp) / Math.max(w.openingMaxHp, w.maxHp));
    expect(old).toBe(0);
    const bar = healthBar(W, w);
    expect(bar.tail).toBe(before);
    expect(bar.tail).toBe(W - Math.round(W * (1 - LOSS)));
    expect(w.itemsMaxHp).toBeCloseTo(PLAYER_BASE_HP * SKIN, 9);
  });

  it('the floor’s tick sits at the floor’s share of the items’ maximum, and moves left as the items grow', () => {
    const w = world();
    decision(w);
    const at = healthBar(W, w).floorAt;
    expect(at).toBe(Math.round(W * MAX_HP_FLOOR));
    w.items.set('membrane', 2);
    // The floor is health (a fifth of the act's opening maximum); the track grew.
    const grown = healthBar(W, w).floorAt;
    expect(grown).toBe(Math.round((W * MAX_HP_FLOOR * PLAYER_BASE_HP) / (PLAYER_BASE_HP * SKIN ** 2)));
    expect(grown!).toBeLessThan(at!);
  });

  it('decided down to the floor, the live track ends at the tick', () => {
    const w = world();
    for (let i = 0; i < 200 && w.maxHp > w.maxHpFloor + 1e-9; i++) {
      w.hp = w.maxHp;
      decision(w);
    }
    const bar = healthBar(W, w);
    expect(bar.live).toBe(bar.floorAt);
    expect(bar.tail).toBe(W - bar.floorAt!);
  });

  it('as arithmetic: rounding, a hurt player, and inputs the sim never gives', () => {
    const base = { hp: 50, maxHp: 80, itemsMaxHp: 100, maxHpFloor: 20 };
    expect(healthBar(200, base)).toEqual({ live: 160, tail: 40, fill: 100, floorAt: 40 });
    // Health past the maximum is drawn at the maximum; below zero, empty.
    expect(healthBar(200, { ...base, hp: 95 }).fill).toBe(160);
    expect(healthBar(200, { ...base, hp: -5 }).fill).toBe(0);
    // An items' maximum under the maximum (never, in the sim) is read as the maximum.
    expect(healthBar(200, { ...base, itemsMaxHp: 60 })).toMatchObject({ live: 200, tail: 0, floorAt: null });
    expect(healthBar(200, { ...base, itemsMaxHp: 0 })).toMatchObject({ live: 200, tail: 0 });
    // No floor, no tick.
    expect(healthBar(200, { ...base, maxHpFloor: 0 }).floorAt).toBeNull();
    for (const bad of [NaN, 0, -1]) {
      const bar = healthBar(200, { hp: bad, maxHp: bad, itemsMaxHp: bad, maxHpFloor: bad });
      expect(Object.values(bar).every((v) => v === null || Number.isFinite(v)), String(bad)).toBe(true);
    }
  });
});
