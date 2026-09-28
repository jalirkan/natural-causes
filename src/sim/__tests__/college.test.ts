import { describe, expect, it } from 'vitest';
import { ADOLESCENCE, COLLEGE, type ActDef } from '../../data/acts';
import { enemyDef, type EnemyDef } from '../../data/enemies';
import { ITEMS } from '../../data/items';
import { IFRAMES, World, hitsWeakPoint, type EnemyState } from '../world';

/**
 * College's three verbs (COLLEGE-ROSTER §3.3–§3.5, G-045), one describe each:
 * tuition's tax and its stacks that cross, the group project's weak point,
 * and the registrar's hold. Every number read here is a placeholder under
 * `COLLEGE.provisional`; what is under test is the rule, and each assertion
 * is written against the def's own figure rather than a copy of it.
 */

let uid = 200000;
/** An enemy of `def`, placed relative to the player, built as `addEnemy` builds one. */
function place(w: World, def: EnemyDef, dx: number, dy: number): EnemyState {
  const e: EnemyState = {
    uid: uid++,
    hitBySerial: 0,
    hitByAreaSerial: 0,
    def,
    x: w.x + dx,
    y: w.y + dy,
    vx: 0,
    vy: 0,
    hp: def.hp,
    age: 0,
    hitFlash: 0,
    radius: def.radius,
    displaySize: def.displaySize,
    xp: def.xp,
    consult: 0,
    reload: 0,
  };
  w.enemies.push(e);
  return e;
}

const DT = 1 / 60;
const still = { moveX: 0, moveY: 0 };
const TUITION = enemyDef('tuition');
const PROJECT = enemyDef('group-project');
const REGISTRAR = enemyDef('registrar');
const TAX = TUITION.attach!.tax!;

/** Steps with the player kept alive, choosing the first offer when asked. */
function alive(world: World, seconds: number): void {
  const steps = Math.round(seconds * 60);
  for (let i = 0; i < steps; i++) {
    if (world.offers) {
      world.choose(world.offers[0]!);
      continue;
    }
    if (world.won) return;
    world.hp = world.maxHp;
    world.dead = false;
    world.step(DT, still);
  }
}

/** The act's clock run out, the boss up, then felled and its exit skipped: the crossing (life.test.ts). */
function cross(world: World): void {
  world.actTime = world.act.durationSeconds;
  alive(world, DT);
  const b = world.boss;
  expect(b, 'the boss did not appear at the act clock').not.toBeNull();
  b!.hp = 0;
  b!.phase = 'absorbing';
  b!.timer = 0;
  alive(world, DT);
}

/** `n` of `def` worn: placed on the player and touched in one step. */
function wear(w: World, def: EnemyDef, n: number): void {
  for (let i = 0; i < n; i++) place(w, def, 0, 0);
  w.step(DT, still);
}

/** XP the player receives from one gem of `value`, with the bar made too long to tip. */
function collect(w: World, value: number): number {
  w.xp = 0;
  w.xpToNext = 1e6;
  w.gems.push({ x: w.x, y: w.y, value });
  w.step(DT, still);
  expect(w.gems, 'the gem was not collected').toEqual([]);
  return w.xp;
}

describe('tuition takes a share of every gem (attach.tax, §3.3)', () => {
  it('two invoices leave (1 − tax)² of a gem; none leave all of it', () => {
    const clean = new World({ act: COLLEGE, seed: 1, startingItems: [] });
    expect(clean.xpTax).toBe(1);
    expect(clean.taxStacks).toBe(0);
    expect(collect(clean, 10)).toBe(10);

    const billed = new World({ act: COLLEGE, seed: 1, startingItems: [] });
    wear(billed, TUITION, 2);
    expect(billed.taxStacks).toBe(2);
    // Still an attach: each invoice is a drag stack too.
    expect(billed.dragStacks).toBe(2);
    expect(billed.xpTax).toBeCloseTo((1 - TAX) ** 2, 12);
    expect(TAX).toBe(0.08); // the placeholder this file was written against: 0.92²
    expect(collect(billed, 10)).toBeCloseTo(10 * (1 - TAX) ** 2, 12);
  });

  it("the gem's own value is untouched; the cut is taken as the player collects it", () => {
    const w = new World({ act: COLLEGE, seed: 2, startingItems: [] });
    wear(w, TUITION, 1);
    const gem = { x: w.x + 500, y: w.y, value: 10 };
    w.gems.push(gem);
    w.step(DT, still);
    expect(gem.value).toBe(10);
  });

  it('is not rounded: one invoice already costs a one-XP gem its share', () => {
    // Reading's gem is 1 XP and the act's commonest. Rounded per gem it would
    // be untaxed until the ninth invoice and worth nothing from there — a
    // cliff, where the design is a cost that every invoice adds to.
    const w = new World({ act: COLLEGE, seed: 3, startingItems: [] });
    wear(w, TUITION, 1);
    expect(collect(w, 1)).toBeCloseTo(1 - TAX, 12);
  });

  it('an attach without a tax (acne) costs speed and never XP', () => {
    const w = new World({ act: COLLEGE, seed: 4, startingItems: [] });
    wear(w, enemyDef('acne'), 3);
    expect(w.dragStacks).toBe(3);
    expect(w.taxStacks).toBe(0);
    expect(w.xpTax).toBe(1);
    expect(collect(w, 10)).toBe(10);
  });
});

describe('the invoices do not come off at the crossing (attach.persists, §3.3)', () => {
  it('two worn in one College are still worn in the next, and still taxing', () => {
    const w = new World({ acts: [COLLEGE, COLLEGE], seed: 5, startingItems: [] });
    wear(w, TUITION, 2);
    cross(w);
    expect(w.actIndex).toBe(1);
    expect(w.dragStacks).toBe(2);
    expect(w.taxStacks).toBe(2);
    expect(w.xpTax).toBeCloseTo((1 - TAX) ** 2, 12);
    expect(collect(w, 10)).toBeCloseTo(10 * (1 - TAX) ** 2, 12);
  });

  it("only the persisting part crosses: acne's stacks come off beside them", () => {
    const w = new World({ acts: [COLLEGE, COLLEGE], seed: 6, startingItems: [] });
    wear(w, TUITION, 2);
    wear(w, enemyDef('acne'), 3);
    expect(w.dragStacks).toBe(5);
    cross(w);
    expect(w.actIndex).toBe(1);
    expect(w.dragStacks).toBe(2);
    expect(w.taxStacks).toBe(2);
  });

  it('they cross every threshold after, and new ones join them', () => {
    const w = new World({ acts: [COLLEGE, COLLEGE, COLLEGE], seed: 7, startingItems: [] });
    wear(w, TUITION, 1);
    cross(w);
    wear(w, TUITION, 1);
    cross(w);
    expect(w.actIndex).toBe(2);
    expect(w.dragStacks).toBe(2);
    expect(w.xpTax).toBeCloseTo((1 - TAX) ** 2, 12);
  });

  it('gems still on the ground at the crossing are collected at the tax', () => {
    const w = new World({ acts: [COLLEGE, COLLEGE], seed: 8, startingItems: [] });
    wear(w, TUITION, 2);
    w.actTime = w.act.durationSeconds;
    alive(w, DT);
    // A high level, so the bar the crossing re-reads (the inheritance's
    // price, G-042) is far longer than the gem and nothing tips.
    w.level = 50;
    w.xp = 0;
    w.xpToNext = 1e6;
    w.gems.length = 0;
    w.gems.push({ x: w.x + 900, y: w.y, value: 10 });
    const b = w.boss!;
    b.hp = 0;
    b.phase = 'absorbing';
    b.timer = 0;
    alive(w, DT);
    expect(w.actIndex).toBe(1);
    expect(w.xp).toBeCloseTo(10 * (1 - TAX) ** 2, 12);
  });

  it('a life of Adolescence then College loses its acne at the crossing, as before', () => {
    const life: ActDef[] = [ADOLESCENCE, COLLEGE];
    const w = new World({ acts: life, seed: 9, startingItems: [] });
    wear(w, enemyDef('acne'), 2);
    expect(w.dragStacks).toBe(2);
    cross(w);
    expect(w.act).toBe(COLLEGE);
    expect(w.dragStacks).toBe(0);
    expect(w.taxStacks).toBe(0);
    expect(w.xpTax).toBe(1);
  });
});

describe('the dev panel\'s "no drag" takes the tax off too (World.shedWornStacks, AUDIT 42)', () => {
  it('stacks and tax both go; the persisting part is kept, and the next crossing restores it', () => {
    const w = new World({ acts: [COLLEGE, COLLEGE], seed: 10, startingItems: [] });
    wear(w, TUITION, 2);
    w.shedWornStacks();
    expect(w.dragStacks).toBe(0);
    expect(w.taxStacks).toBe(0);
    expect(w.xpTax).toBe(1);
    expect(collect(w, 10)).toBe(10);
    cross(w);
    expect(w.actIndex).toBe(1);
    expect(w.taxStacks).toBe(2);
    expect(w.xpTax).toBeCloseTo((1 - TAX) ** 2, 12);
  });
});

/** The quadrant (0–3) of the bearing from `e`'s centre to (x, y): the rule, written out again. */
function quadrantOf(e: EnemyState, x: number, y: number): number {
  let a = Math.atan2(y - e.y, x - e.x);
  if (a < 0) a += Math.PI * 2;
  return Math.floor(a / (Math.PI / 2)) % 4;
}

describe("the group project's hp is in one quadrant (weakPoint, §3.4)", () => {
  // Placed off the horizontal: at (+120, 0) the hit lands at a bearing of
  // exactly π, the line between two quadrants, and the test would be about
  // floating point rather than the rule.
  const DX = 120;
  const DY = 40;

  /** A Reflex shot's first flight at a project, followed until it is gone. */
  function shootAt(weak: (facing: number) => number) {
    const w = new World({ act: COLLEGE, seed: 11, startingItems: ['lash'] });
    const e = place(w, PROJECT, DX, DY);
    const facing = quadrantOf(e, w.x, w.y);
    e.weakQuadrant = weak(facing);
    w.step(DT, still);
    const shot = w.projectiles.find((p) => p.source === 'lash');
    expect(shot, 'Reflex did not fire at the project').toBeDefined();
    let flashed = false;
    for (let i = 0; i < 120 && w.projectiles.includes(shot!); i++) {
      w.step(DT, still);
      if (e.hitFlash > 0) flashed = true;
    }
    return { w, e, shot: shot!, flashed };
  }

  it('a shot striking the weak quadrant hurts it and flashes', () => {
    const { e, shot, flashed } = shootAt((facing) => facing);
    expect(e.hp).toBeLessThan(PROJECT.hp);
    expect(flashed).toBe(true);
    // It was spent on the body, not at the end of its range.
    expect(shot.life).toBeGreaterThan(0);
  });

  it('a shot striking the far side does nothing, does not flash, and is spent anyway', () => {
    const { e, shot, flashed } = shootAt((facing) => (facing + 2) % 4);
    expect(e.hp).toBe(PROJECT.hp);
    expect(e.hitFlash).toBe(0);
    expect(flashed).toBe(false);
    // Consumed as a hit (pierce spent, life left), so it does not pass
    // through and strike the weak side from behind on the same flight.
    expect(shot.pierce).toBe(0);
    expect(shot.life).toBeGreaterThan(0);
  });

  it('an area over its centre finds it whatever the quadrant: a burst, the aura', () => {
    for (const item of ['acrosome', 'personal-space']) {
      for (let q = 0; q < 4; q++) {
        const w = new World({ act: COLLEGE, seed: 12, startingItems: [item] });
        const e = place(w, PROJECT, 40, 10);
        e.weakQuadrant = q;
        w.step(DT, still);
        expect(e.hp, `${item}, weak quadrant ${q}`).toBeLessThan(PROJECT.hp);
        expect(e.hitFlash, `${item}, weak quadrant ${q}`).toBeGreaterThan(0);
      }
    }
  });

  it('an area that only reaches its rim lands on the side facing the area', () => {
    // Temper's 96 and Personal Space's 90 both reach a body 105px out, and
    // neither covers its centre; the hit is where the area's own centre is.
    for (const item of ['acrosome', 'personal-space']) {
      for (const hits of [true, false]) {
        const w = new World({ act: COLLEGE, seed: 13, startingItems: [item] });
        const e = place(w, PROJECT, 100, 30);
        const facing = quadrantOf(e, w.x, w.y);
        e.weakQuadrant = hits ? facing : (facing + 2) % 4;
        w.step(DT, still);
        if (hits) expect(e.hp, item).toBeLessThan(PROJECT.hp);
        else {
          expect(e.hp, item).toBe(PROJECT.hp);
          expect(e.hitFlash, item).toBe(0);
        }
      }
    }
  });

  it('a sweep lands on the side it was swung from, and knocks back only what it hurts', () => {
    for (const hits of [true, false]) {
      const w = new World({ act: COLLEGE, seed: 14, startingItems: ['backhand'] });
      const e = place(w, PROJECT, 70, 30);
      const facing = quadrantOf(e, w.x, w.y);
      e.weakQuadrant = hits ? facing : (facing + 2) % 4;
      const before = Math.hypot(e.x - w.x, e.y - w.y);
      w.step(DT, still);
      const after = Math.hypot(e.x - w.x, e.y - w.y);
      if (hits) {
        expect(e.hp).toBeLessThan(PROJECT.hp);
        expect(after).toBeGreaterThan(before);
      } else {
        expect(e.hp).toBe(PROJECT.hp);
        expect(e.hitFlash).toBe(0);
        // Its own chase step closed the gap; nothing pushed it back.
        expect(after).toBeLessThanOrEqual(before);
      }
    }
  });

  it('a bolt lands over its centre, so it finds it whatever the quadrant', () => {
    // Judgement strikes where its pick stood; the project walks a few pixels
    // in the telegraph, well inside the bolt.
    for (let q = 0; q < 4; q++) {
      const w = new World({ act: COLLEGE, seed: 16, startingItems: ['judgement'] });
      const e = place(w, PROJECT, 150, 40);
      e.weakQuadrant = q;
      for (let i = 0; i < 30; i++) w.step(DT, still);
      expect(e.hp, `weak quadrant ${q}`).toBeLessThan(PROJECT.hp);
    }
  });

  it('an orbiter counts by where it is, and a touch off the weak point spends nothing', () => {
    const grudge = ITEMS['grudge']!;
    if (grudge.kind === 'passive') throw new Error('grudge is active');
    // Where the one orbiter will be after one step (upgrades.test.ts), and
    // the project against it off the radial, so the bearing is clear of a line.
    const angle = (grudge.projectileSpeed / grudge.range) * DT;
    const ox = Math.cos(angle) * grudge.range;
    const oy = Math.sin(angle) * grudge.range;
    for (const hits of [true, false]) {
      const w = new World({ act: COLLEGE, seed: 17, startingItems: ['grudge'] });
      const e = place(w, PROJECT, ox + 30, oy + 25);
      const facing = quadrantOf(e, w.x + ox, w.y + oy);
      e.weakQuadrant = hits ? facing : (facing + 2) % 4;
      w.step(DT, still);
      if (hits) expect(e.hp).toBeLessThan(PROJECT.hp);
      else {
        expect(e.hp).toBe(PROJECT.hp);
        expect(e.hitFlash).toBe(0);
        // Turned to face the orbiter's side, it is hit on the next touch: the
        // miss did not start the re-hit clock.
        e.weakQuadrant = quadrantOf(e, w.orbiters[0]!.x, w.orbiters[0]!.y);
        w.step(DT, still);
        expect(e.hp).toBeLessThan(PROJECT.hp);
      }
    }
  });

  it('the helper: no weak point counts everywhere; a covering area counts whatever the bearing', () => {
    const w = new World({ act: COLLEGE, seed: 15, startingItems: [] });
    const reading = place(w, enemyDef('reading'), 200, 0);
    expect(hitsWeakPoint(reading, reading.x - 10, reading.y)).toBe(true);
    const e = place(w, PROJECT, 200, 0);
    e.weakQuadrant = 0; // bearings [0, π/2): +x and +y of the centre
    expect(hitsWeakPoint(e, e.x + 10, e.y + 10)).toBe(true);
    expect(hitsWeakPoint(e, e.x - 10, e.y + 10)).toBe(false);
    expect(hitsWeakPoint(e, e.x - 10, e.y - 10)).toBe(false);
    expect(hitsWeakPoint(e, e.x + 10, e.y - 10)).toBe(false);
    expect(hitsWeakPoint(e, e.x - 10, e.y - 10, 20)).toBe(true);
    expect(hitsWeakPoint(e, e.x - 30, e.y - 30, 20)).toBe(false);
  });

  it('is rolled from the seed at spawn, and only for an enemy with a weak point', () => {
    const first = (seed: number): number | undefined => {
      const w = new World({ act: COLLEGE, seed, startingItems: [] });
      w.spawnEnemy('group-project');
      return w.enemies[0]!.weakQuadrant;
    };
    expect(first(21)).toBe(first(21));
    const seen = new Set<number | undefined>();
    for (let seed = 1; seed <= 16; seed++) seen.add(first(seed));
    expect(seen.has(undefined)).toBe(false);
    for (const q of seen) expect([0, 1, 2, 3]).toContain(q);
    expect(seen.size).toBeGreaterThanOrEqual(2);

    // Nothing else draws it, so nothing else spends the dice on it.
    const w = new World({ act: COLLEGE, seed: 22, startingItems: [] });
    for (const id of ['reading', 'deadline', 'tuition', 'registrar']) w.spawnEnemy(id);
    for (const e of w.enemies) expect('weakQuadrant' in e, e.def.id).toBe(false);
  });
});

describe("the registrar's form is a hold (ranged.stun, §3.5)", () => {
  it('stops the player, hurts a little, and the i-frames run from the end of the stop', () => {
    const w = new World({ act: COLLEGE, seed: 31, startingItems: [] });
    place(w, REGISTRAR, 300, 0);
    let form: (typeof w.projectiles)[number] | undefined;
    for (let i = 0; i < 180 && !form; i++) {
      w.step(DT, still);
      form = w.projectiles.find((p) => p.hostile && p.owner?.id === 'registrar');
    }
    expect(form, 'the registrar never fired').toBeDefined();

    const stun = REGISTRAR.ranged!.stun!;
    const before = w.hp;
    w.invulnerable = 0;
    form!.x = w.x;
    form!.y = w.y;
    w.step(DT, still);

    expect(w.projectiles).not.toContain(form);
    expect(w.hp).toBeCloseTo(before - REGISTRAR.ranged!.damage * w.damageTaken, 10);
    expect(w.stunTimer).toBeGreaterThan(0);
    expect(w.stunTimer).toBeLessThanOrEqual(stun);
    expect(w.invulnerable).toBeGreaterThanOrEqual(stun + IFRAMES - 1e-9);

    // Stopped: input is ignored until the hold runs out...
    const x = w.x;
    while (w.stunTimer > 0) w.step(DT, { moveX: 1, moveY: 0 });
    expect(w.x).toBe(x);
    // ...and the i-frames are still whole when it does.
    expect(w.invulnerable).toBeGreaterThan(IFRAMES - 2 * DT);
    w.step(DT, { moveX: 1, moveY: 0 });
    expect(w.x).toBeGreaterThan(x);
  });

  it('a form landing inside the i-frames is spent and neither hurts nor holds', () => {
    const w = new World({ act: COLLEGE, seed: 32, startingItems: [] });
    place(w, REGISTRAR, 300, 0);
    let form: (typeof w.projectiles)[number] | undefined;
    for (let i = 0; i < 180 && !form; i++) {
      w.step(DT, still);
      form = w.projectiles.find((p) => p.hostile && p.owner?.id === 'registrar');
    }
    w.invulnerable = 1;
    const before = w.hp;
    form!.x = w.x;
    form!.y = w.y;
    w.step(DT, still);
    expect(w.projectiles).not.toContain(form);
    expect(w.hp).toBe(before);
    expect(w.stunTimer).toBe(0);
  });
});
