import { describe, expect, it } from 'vitest';
import { CONCEPTION } from '../../data/acts';
import { ACT_VISUALS } from '../../data/act-visuals';
import { World } from '../../sim/world';
import { actPalette, BLUSH, type ActId } from '../../../tools/art/palette';
import {
  ACT_MID,
  Events,
  JuiceEdges,
  largestHits,
  NUMBER_GAP,
  PLAYER_HURT,
  type Hit,
  type JuiceWorld,
} from '../juice-edges';

type Enemy = { x: number; y: number; hp: number; displaySize: number };
type Shot = { x: number; y: number; vx: number; vy: number; life: number; hostile: boolean };
type Gem = { x: number; y: number };
type Boss = { x: number; y: number; hp: number; kind: 'egg' | 'loan' };

/** A hand-built world: the slice the edges read, every field writable. */
function field(): {
  enemies: Enemy[];
  projectiles: Shot[];
  gems: Gem[];
  boss: Boss | null;
  x: number;
  y: number;
  hp: number;
  maxHp: number;
  level: number;
  xp: number;
  actIndex: number;
  dead: boolean;
  won: boolean;
} {
  return {
    enemies: [],
    projectiles: [],
    gems: [],
    boss: null,
    x: 0,
    y: 0,
    hp: 100,
    maxHp: 100,
    level: 1,
    xp: 0,
    actIndex: 0,
    dead: false,
    won: false,
  };
}

const enemy = (x: number, y: number, hp: number): Enemy => ({ x, y, hp, displaySize: 48 });
const shot = (x: number, y: number, life: number, hostile = false): Shot => ({ x, y, vx: 300, vy: 0, life, hostile });

/** Edges with the first (snapshot-only) read already taken at clock 0. */
function started(w: JuiceWorld): JuiceEdges {
  const e = new JuiceEdges();
  e.read(w, 0);
  return e;
}

describe('juice edges: the first read', () => {
  it('only takes the snapshot, so nothing on the field at the start is an event', () => {
    const w = field();
    w.enemies.push(enemy(10, 10, 5));
    w.projectiles.push(shot(0, 0, 1));
    w.gems.push({ x: 5, y: 0 });
    const e = new JuiceEdges();
    e.read(w, 0);
    expect([e.hits.length, e.kills.length, e.landed.length, e.streams.length, e.pickups.length]).toEqual([0, 0, 0, 0, 0]);
    expect(e.hurt).toBe(0);
    expect(e.levelUp).toBe(false);
  });
});

describe('juice edges: enemies hurt', () => {
  it('gives a hp fall as one number, hits within a frame summed', () => {
    const w = field();
    const a = enemy(10, 20, 10);
    w.enemies.push(a);
    const e = started(w);
    a.hp -= 2; // two hits in one frame
    a.hp -= 1.5;
    e.read(w, 1 / 60);
    expect(e.hits.toArray()).toEqual([{ x: 10, y: 20, size: 48, amount: 3.5, boss: false }]);
  });

  it('holds a second fall inside the gap and shows it, accumulated, once the gap opens', () => {
    const w = field();
    const a = enemy(0, 0, 20);
    w.enemies.push(a);
    const e = started(w);
    a.hp -= 1;
    e.read(w, 0.02);
    expect(e.hits.length).toBe(1);
    a.hp -= 1;
    e.read(w, 0.05);
    a.hp -= 1;
    e.read(w, 0.08);
    expect(e.hits.length).toBe(0);
    e.read(w, 0.02 + NUMBER_GAP);
    expect(e.hits.toArray().map((h) => h.amount)).toEqual([2]);
  });

  it('keeps a fall too small to print until more arrives', () => {
    const w = field();
    const a = enemy(0, 0, 20);
    w.enemies.push(a);
    const e = started(w);
    a.hp -= 0.3;
    e.read(w, 1);
    expect(e.hits.length).toBe(0);
    a.hp -= 0.3;
    e.read(w, 2);
    expect(e.hits.toArray().map((h) => h.amount)[0]).toBeCloseTo(0.6);
  });

  it('never counts a rise (a pile merging) as a hit', () => {
    const w = field();
    const a = enemy(0, 0, 10);
    w.enemies.push(a);
    const e = started(w);
    a.hp = 30;
    e.read(w, 1);
    expect(e.hits.length).toBe(0);
    a.hp = 29;
    e.read(w, 2);
    expect(e.hits.toArray().map((h) => h.amount)).toEqual([1]);
  });

  it('is the object, not the index: a swap-remove that shuffles the list moves no hp between enemies', () => {
    const w = field();
    const a = enemy(0, 0, 10);
    const b = enemy(50, 0, 3);
    const c = enemy(90, 0, 10);
    w.enemies.push(a, b, c);
    const e = started(w);
    // b dies; the world swap-removes it, so c takes its index.
    b.hp = 0;
    w.enemies.splice(1, 1, c);
    w.enemies.length = 2;
    e.read(w, 1);
    expect(e.hits.toArray().map((h) => [h.x, h.amount])).toEqual([[50, 3]]);
    expect(e.kills.length).toBe(1);
  });
});

describe('juice edges: kills', () => {
  it('pops an enemy gone with its hp at or below zero, where it died, with the killing blow in full', () => {
    const w = field();
    const a = enemy(10, 10, 4);
    w.enemies.push(a);
    const e = started(w);
    a.x = 12;
    a.hp = -6; // overkill
    w.enemies.length = 0;
    e.read(w, 1);
    expect(e.kills.toArray()).toEqual([{ x: 12, y: 10, size: 48 }]);
    expect(e.hits.toArray().map((h) => h.amount)).toEqual([10]);
  });

  it('shows a pending number with the death, gap or no gap', () => {
    const w = field();
    const a = enemy(0, 0, 10);
    w.enemies.push(a);
    const e = started(w);
    a.hp = 8;
    e.read(w, 0.01); // shown
    a.hp = 6;
    e.read(w, 0.02); // held by the gap
    a.hp = 0;
    w.enemies.length = 0;
    e.read(w, 0.03);
    // The held 2 and the killing 6, together.
    expect(e.hits.toArray().map((h) => h.amount)).toEqual([8]);
  });

  it('does not pop what left alive: a despawn, a racer let in, an antibody attaching', () => {
    const w = field();
    const a = enemy(0, 0, 10);
    const b = enemy(0, 0, 10);
    w.enemies.push(a, b);
    const e = started(w);
    b.hp = 4; // hurt, then gone on its feet
    w.enemies.length = 0;
    e.read(w, 1);
    expect(e.kills.length).toBe(0);
  });

  it('hears every kill a real life makes as one pop, and nothing else as one', () => {
    // A minute of Conception with the player kept alive: every enemy the sim
    // reaps (`kills`) is one pop, whatever else left the field meanwhile —
    // bursts, attaches, despawns — and every pop is one of them.
    const w = new World({ act: CONCEPTION, seed: 7 });
    const e = new JuiceEdges();
    e.read(w, 0);
    let pops = 0;
    let landed = 0;
    for (let i = 0; i < 60 * 60; i++) {
      if (w.offers) {
        w.choose(w.offers[0]!);
        continue;
      }
      w.hp = w.maxHp;
      w.dead = false;
      w.step(1 / 60, { moveX: Math.sin(i / 90), moveY: Math.cos(i / 70) });
      e.read(w, i / 60);
      pops += e.kills.length;
      landed += e.landed.length;
    }
    expect(w.kills).toBeGreaterThan(20);
    expect(pops).toBe(w.kills);
    // Pointing's shots land on what they kill, so some landed.
    expect(landed).toBeGreaterThan(0);
  });
});

describe('juice edges: shots', () => {
  it('lands a player shot gone with life left, where it ended and heading as it flew', () => {
    const w = field();
    const p = shot(0, 0, 0.5);
    w.projectiles.push(p);
    const e = started(w);
    p.x = 5;
    p.life = 0.48;
    w.projectiles.length = 0;
    e.read(w, 1);
    expect(e.landed.toArray()).toEqual([{ x: 5, y: 0, dx: 1, dy: 0 }]);
  });

  it('lets a shot that ran out of life expire unmarked, and never reads a hostile shot', () => {
    const w = field();
    const spent = shot(0, 0, 0.01);
    const hostile = shot(0, 0, 3, true);
    w.projectiles.push(spent, hostile);
    const e = started(w);
    spent.life = -0.006;
    w.projectiles.length = 0; // the hostile one hit the player
    e.read(w, 1);
    expect(e.landed.length).toBe(0);
  });
});

describe('juice edges: gems', () => {
  it('streams a gem stepping toward the player, and not one lying still or moving away', () => {
    const w = field();
    const pulled = { x: 80, y: 0 };
    const still = { x: 0, y: 200 };
    const away = { x: -80, y: 0 };
    w.gems.push(pulled, still, away);
    const e = started(w);
    pulled.x = 74.7;
    away.x = -85;
    w.x = 3; // the player walking toward the pull, as well
    e.read(w, 1);
    expect(e.streams.toArray()).toEqual([{ x: 74.7, y: 0, dx: -1, dy: 0 }]);
  });

  it('picks up a gem gone while the xp rose, or while a level was gained, and not one gone with neither', () => {
    const w = field();
    const g = { x: 3, y: 0 };
    w.gems.push(g);
    const e = started(w);
    w.gems.length = 0;
    w.xp = 1;
    e.read(w, 1);
    expect(e.pickups.toArray()).toEqual([{ x: 3, y: 0, dx: 0, dy: 0 }]);

    const h = { x: 2, y: 0 };
    w.gems.push(h);
    e.read(w, 2);
    w.gems.length = 0;
    w.xp = 0; // the bar emptied into a level
    w.level = 2;
    e.read(w, 3);
    expect(e.pickups.length).toBe(1);
    expect(e.levelUp).toBe(true);

    const i = { x: 2, y: 0 };
    w.gems.push(i);
    e.read(w, 4);
    w.gems.length = 0;
    e.read(w, 5);
    expect(e.pickups.length).toBe(0);
  });
});

describe('juice edges: the crossing', () => {
  it('reads nothing out of what the crossing cleared: no kill, no landing, no pickup', () => {
    const w = field();
    const a = enemy(0, 0, 3);
    w.enemies.push(a);
    w.projectiles.push(shot(0, 0, 1));
    w.gems.push({ x: 1, y: 0 });
    const e = started(w);
    a.hp = 0;
    w.enemies.length = 0;
    w.projectiles.length = 0;
    w.gems.length = 0;
    w.xp = 5;
    w.actIndex = 1;
    e.read(w, 1);
    expect(e.crossed).toBe(true);
    expect([e.hits.length, e.kills.length, e.landed.length, e.pickups.length]).toEqual([0, 0, 0, 0]);
    expect(e.levelUp).toBe(false);
  });

  it('still hears a level the crossing\'s absorbed gems paid for', () => {
    const w = field();
    const e = started(w);
    w.actIndex = 1;
    w.level = 2;
    e.read(w, 1);
    expect(e.levelUp).toBe(true);
    e.read(w, 2);
    expect(e.levelUp).toBe(false);
  });
});

describe('juice edges: the player', () => {
  it('reads a fall as hurt and a rise as nothing', () => {
    const w = field();
    const e = started(w);
    w.hp = 88;
    e.read(w, 1);
    expect(e.hurt).toBe(12);
    w.hp = 100;
    e.read(w, 2);
    expect(e.hurt).toBe(0);
  });

  it('is on low health under a third, alive, and not once the life is over', () => {
    const w = field();
    const e = started(w);
    w.hp = 34;
    e.read(w, 1);
    expect(e.lowHealth).toBe(false);
    w.hp = 33;
    e.read(w, 2);
    expect(e.lowHealth).toBe(true);
    w.hp = 0;
    w.dead = true;
    e.read(w, 3);
    expect(e.lowHealth).toBe(false);
  });
});

describe('juice edges: the boss', () => {
  it('reads a fall as a hit, its arrival and a rise (the Loan compounding) as nothing, and zero as its fall', () => {
    const w = field();
    const e = started(w);
    w.boss = { x: 0, y: -400, hp: 50, kind: 'loan' };
    e.read(w, 1);
    expect(e.bossHit).toBe(false);
    expect(e.hits.length).toBe(0);
    w.boss.hp = 60;
    e.read(w, 2);
    expect(e.bossHit).toBe(false);
    w.boss.hp = 55;
    e.read(w, 3);
    expect(e.bossHit).toBe(true);
    expect(e.hits.toArray()).toEqual([{ x: 0, y: -400, size: 0, amount: 5, boss: true }]);
    w.boss.hp = 0;
    e.read(w, 3.01);
    expect(e.bossDown).toBe(true);
    expect(e.hits.toArray().map((h) => h.amount)).toEqual([55]);
    e.read(w, 4);
    expect(e.bossDown).toBe(false);
  });
});

describe('largestHits', () => {
  const hits = (amounts: number[]): Events<Hit> => {
    const ev = new Events<Hit>(() => ({ x: 0, y: 0, size: 0, amount: 0, boss: false }));
    for (const a of amounts) ev.add().amount = a;
    return ev;
  };

  it('takes every hit when they fit', () => {
    const out: number[] = [];
    expect(largestHits(hits([3, 1, 2]), 5, out)).toBe(3);
    expect(out).toEqual([0, 1, 2]);
  });

  it('drops the smallest past the cap, keeping the rest in order', () => {
    const out: number[] = [];
    expect(largestHits(hits([3, 1, 9, 2, 7]), 3, out)).toBe(3);
    expect(out).toEqual([0, 2, 4]);
  });

  it('takes nothing with no room', () => {
    const out = [4, 5];
    expect(largestHits(hits([3]), 0, out)).toBe(0);
    expect(out).toEqual([]);
  });
});

describe('juice colours', () => {
  it('holds each act\'s mid tone to the palette', () => {
    for (const id of Object.keys(ACT_VISUALS)) {
      const mid = actPalette(id as ActId).find((c) => c.name === `${id}-mid`);
      expect(mid, id).toBeDefined();
      expect(ACT_MID[id], id).toBe(parseInt(mid!.hex.slice(1), 16));
    }
  });

  it('draws the player\'s hurt in blush, the palette\'s warm tone', () => {
    expect(PLAYER_HURT).toBe(parseInt(BLUSH.hex.slice(1), 16));
  });
});
