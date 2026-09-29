import type Phaser from 'phaser';
import schoolFloorPng from '../../assets/floors/school.png';
import { INK, SHADOW } from '../config';
import { actVisuals } from '../data/act-visuals';

/**
 * The ground each act is played on: a tile drawn with Graphics and repeated
 * across the arena, and the act's landmarks (a court, a rug, a corridor)
 * drawn once over it in world coordinates, because a landmark that repeats
 * every tile reads as wallpaper; all of it baked into one texture per act
 * (`bakeFloor`). The player spawns at the arena's centre, so no landmark is
 * centred there: a ring around the player means a weapon.
 *
 * Everything is the act's deep tone with structure in its mid tone, ink and
 * shadow at low alpha, so the act's colour is unchanged and nothing competes
 * with a sprite. Law 10: paper is the player's and the light tone is the
 * pickups', so neither appears here (floors.test.ts holds it). No lozenges:
 * the pickup holds that shape game-wide (law 11).
 *
 * An act may instead take its tile from a generated picture (`image`, loaded
 * by `preloadFloors`; its provenance in assets/prompts/floor-<act>.md): a
 * real texture reaches what rectangles drawn at low alpha cannot. The
 * Graphics tile stays as the fallback for when the picture is not loaded,
 * and the landmarks are still drawn here, over whichever tile is laid, so a
 * court does not repeat with the tile.
 */

type G = Phaser.GameObjects.Graphics;
type Rnd = () => number;
interface Pt {
  x: number;
  y: number;
}
interface Tones {
  deep: number;
  mid: number;
}

interface Floor {
  /**
   * The repeating tile as a generated picture: its URL, imported so Vite
   * hashes and copies it on build (as the atlases are, src/data/act-visuals.ts).
   * Laid in place of `tile` whenever it has loaded.
   */
  image?: string;
  /**
   * The repeating tile, drawn into a TILE square; a mark that crosses an edge is drawn wrapped.
   * With an `image`, the fallback for when the picture has not loaded.
   */
  tile(g: G, t: Tones, rnd: Rnd): void;
  /** The landmarks, in world coordinates. */
  marks?(g: G, t: Tones, rnd: Rnd, w: number, h: number): void;
}

/** A power of two, so the tile repeats exactly. */
const TILE = 512;
/** The shadow at the foot of the walls, from the wall inward: [width px, alpha] multiplied. */
const WALL_SHADE: readonly (readonly [number, number])[] = [
  [4, 0.6],
  [4, 0.42],
  [4, 0.28],
  [6, 0.14],
];
const TAU = Math.PI * 2;
/** How much of the tile a thing laid over it hides (a rug, a path): the deep tone at this alpha. */
const COVER = 0.75;

/** Seeded per act, so a floor is the same floor every life. */
function rng(seed: string): Rnd {
  let a = 0x9e3779b9;
  for (const ch of seed) a = Math.imul(a ^ ch.charCodeAt(0), 0x85ebca6b) >>> 0;
  return () => {
    a = (a + 0x6d2b79f5) >>> 0;
    let t = a;
    t = Math.imul(t ^ (t >>> 15), t | 1);
    t ^= t + Math.imul(t ^ (t >>> 7), t | 61);
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

/** Calls `at` for every copy of (x, y) that reaches into the tile, so an edge-crossing mark comes back on the far side. */
function wrap(x: number, y: number, reach: number, at: (x: number, y: number) => void): void {
  for (const ox of [-TILE, 0, TILE]) {
    for (const oy of [-TILE, 0, TILE]) {
      const px = x + ox;
      const py = y + oy;
      if (px + reach < 0 || px - reach > TILE || py + reach < 0 || py - reach > TILE) continue;
      at(px, py);
    }
  }
}

/** A horizontal run of the tile, wrapped at the right edge. */
function run(g: G, x: number, y: number, w: number, h: number): void {
  const x0 = ((x % TILE) + TILE) % TILE;
  g.fillRect(x0, y, Math.min(w, TILE - x0), h);
  if (x0 + w > TILE) g.fillRect(0, y, x0 + w - TILE, h);
}

/** Points on the tile's torus at least `gap` apart: even, without being a grid. */
function scatter(n: number, gap: number, rnd: Rnd): Pt[] {
  const pts: Pt[] = [];
  const d = (a: number, b: number) => {
    const v = Math.abs(a - b) % TILE;
    return Math.min(v, TILE - v);
  };
  for (let tries = 0; tries < n * 60 && pts.length < n; tries++) {
    const x = rnd() * TILE;
    const y = rnd() * TILE;
    if (pts.every((p) => Math.hypot(d(p.x, x), d(p.y, y)) >= gap)) pts.push({ x, y });
  }
  return pts;
}

/** A rounded, slightly lopsided blob around the origin. */
function blob(r: number, rnd: Rnd, squash = 1): Pt[] {
  const p1 = rnd() * TAU;
  const p2 = rnd() * TAU;
  const a1 = 0.05 + rnd() * 0.08;
  const a2 = 0.03 + rnd() * 0.05;
  const rot = rnd() * TAU;
  const out: Pt[] = [];
  for (let i = 0; i < 32; i++) {
    const th = (i / 32) * TAU;
    const rr = r * (1 + a1 * Math.sin(2 * th + p1) + a2 * Math.sin(3 * th + p2));
    const lx = Math.cos(th) * rr;
    const ly = Math.sin(th) * rr * squash;
    out.push({ x: lx * Math.cos(rot) - ly * Math.sin(rot), y: lx * Math.sin(rot) + ly * Math.cos(rot) });
  }
  return out;
}

const at = (pts: Pt[], x: number, y: number): Pt[] => pts.map((p) => ({ x: p.x + x, y: p.y + y }));

/** Local (u along, v across) to world, for a thing laid at (cx, cy) turned by `rot`. */
function frame(cx: number, cy: number, rot: number): (u: number, v: number) => Pt {
  const c = Math.cos(rot);
  const s = Math.sin(rot);
  return (u, v) => ({ x: cx + u * c - v * s, y: cy + u * s + v * c });
}

interface BoardSpec {
  width: number;
  /** Board lengths: well under the tile, so a row has joints enough that the repeat does not show. */
  minLen: number;
  maxLen: number;
  /** Alpha of the seam between rows and of the joint where two boards meet. */
  seam: number;
  /** Chance a board has a knot. */
  knots: number;
}

/** Boards laid in rows: a shade per board, seams between rows, a joint where boards meet, grain along. */
function boards(g: G, t: Tones, rnd: Rnd, b: BoardSpec): void {
  const { width, minLen, maxLen, seam, knots } = b;
  for (let row = 0; row < TILE / width; row++) {
    const y = row * width;
    let x = rnd() * TILE;
    const end = x + TILE;
    while (x < end - 1) {
      let len = minLen + rnd() * (maxLen - minLen);
      if (end - x - len < minLen) len = end - x;
      const light = rnd() < 0.5;
      g.fillStyle(light ? t.mid : INK, 0.01 + rnd() * (light ? 0.03 : 0.04));
      run(g, x, y, len, width);
      // Grain: long hairlines along the board, lighter and darker, in from its ends.
      for (let k = 0; k < Math.max(2, Math.round(width / 7)); k++) {
        const dark = rnd() < 0.35;
        g.fillStyle(dark ? INK : t.mid, dark ? 0.05 + rnd() * 0.04 : 0.04 + rnd() * 0.05);
        const from = rnd() * len * 0.3;
        run(g, x + from, y + 2 + rnd() * (width - 4), Math.min(len - from - 2, len * (0.35 + rnd() * 0.6)), 1);
      }
      if (rnd() < knots) {
        const kx = (x + len * (0.2 + rnd() * 0.6)) % TILE;
        const ky = y + width * (0.3 + rnd() * 0.4);
        const kw = 7 + rnd() * 5;
        const kh = 3 + rnd() * 2;
        wrap(kx, ky, kw, (px, py) => {
          g.fillStyle(INK, 0.1);
          g.fillEllipse(px, py, kw, kh);
        });
      }
      g.fillStyle(INK, seam);
      run(g, x, y, 1.5, width);
      x += len;
    }
    g.fillStyle(INK, seam);
    g.fillRect(0, y, TILE, 1.5);
  }
}

/** A rug: the field, a border band, the lines either side of it, fringe at the short ends. */
function rug(g: G, t: Tones, cx: number, cy: number, w: number, h: number, rot: number, band: number): void {
  const f = frame(cx, cy, rot);
  const rect = (u0: number, v0: number, u1: number, v1: number) => [f(u0, v0), f(u1, v0), f(u1, v1), f(u0, v1)];
  const hw = w / 2;
  const hh = h / 2;
  // Mostly hides the floor under it, so the rug lies on the floor and not in it.
  g.fillStyle(t.deep, COVER);
  g.fillPoints(rect(-hw, -hh, hw, hh), true);
  g.fillStyle(t.mid, 0.05);
  g.fillPoints(rect(-hw, -hh, hw, hh), true);
  // The border band, as four pieces that do not overlap.
  g.fillStyle(t.mid, 0.05);
  g.fillPoints(rect(-hw, -hh, hw, -hh + band), true);
  g.fillPoints(rect(-hw, hh - band, hw, hh), true);
  g.fillPoints(rect(-hw, -hh + band, -hw + band, hh - band), true);
  g.fillPoints(rect(hw - band, -hh + band, hw, hh - band), true);
  g.lineStyle(3, t.mid, 0.12);
  g.strokePoints(rect(-hw, -hh, hw, hh), true);
  g.strokePoints(rect(-hw + band, -hh + band, hw - band, hh - band), true);
  g.lineStyle(2, t.mid, 0.09);
  g.strokePoints(rect(-hw + band + 16, -hh + band + 16, hw - band - 16, hh - band - 16), true);
  g.lineStyle(3, t.mid, 0.1);
  for (let v = -hh + 8; v <= hh - 8; v += 14) {
    const a = f(-hw, v);
    const b = f(-hw - 18, v);
    const c = f(hw, v);
    const d = f(hw + 18, v);
    g.lineBetween(a.x, a.y, b.x, b.y);
    g.lineBetween(c.x, c.y, d.x, d.y);
  }
}

const FLOORS: Record<string, Floor> = {
  /** Tissue: packed cells, their walls the dark between them, the odd nucleus and pore. */
  conception: {
    tile(g, t, rnd) {
      g.fillStyle(t.deep, 1);
      g.fillRect(0, 0, TILE, TILE);
      for (const c of scatter(400, 44, rnd)) {
        const r = 21 + rnd() * 9;
        const cell = blob(r, rnd, 0.8 + rnd() * 0.2);
        const alpha = 0.035 + rnd() * 0.04;
        const nucleus =
          rnd() < 0.45 ? { pts: blob(r * 0.26, rnd, 0.8), ox: (rnd() - 0.5) * r * 0.6, oy: (rnd() - 0.5) * r * 0.6 } : null;
        wrap(c.x, c.y, r * 1.3, (x, y) => {
          g.fillStyle(t.mid, alpha);
          g.fillPoints(at(cell, x, y), true);
          g.lineStyle(1.5, INK, 0.05);
          g.strokePoints(at(cell, x, y), true);
          if (nucleus) {
            g.fillStyle(INK, 0.06);
            g.fillPoints(at(nucleus.pts, x + nucleus.ox, y + nucleus.oy), true);
          }
        });
      }
      for (let i = 0; i < 9; i++) {
        const x = rnd() * TILE;
        const y = rnd() * TILE;
        const r = 1.5 + rnd() * 2;
        wrap(x, y, r, (px, py) => {
          g.fillStyle(INK, 0.16);
          g.fillCircle(px, py, r);
        });
      }
    },
  },

  /** The gym: maple strip in long rows (a generated varnished plank), and one court painted over it. */
  school: {
    image: schoolFloorPng,
    tile(g, t, rnd) {
      g.fillStyle(t.deep, 1);
      g.fillRect(0, 0, TILE, TILE);
      boards(g, t, rnd, { width: 16, minLen: 120, maxLen: 330, seam: 0.16, knots: 0 });
    },
    marks(g, t, _rnd, w, h) {
      const cw = 2300;
      const ch = 1400;
      // Left of centre, so the player spawns by the centre circle and not inside it.
      const cx = w / 2 - 320;
      const cy = h / 2;
      const x0 = cx - cw / 2;
      const y0 = cy - ch / 2;
      const key = { len: 560, half: 230 };
      // The keys and the jump circle are painted in, faintly, as a gym's are.
      g.fillStyle(t.mid, 0.07);
      g.fillRect(x0, cy - key.half, key.len, key.half * 2);
      g.fillRect(x0 + cw - key.len, cy - key.half, key.len, key.half * 2);
      g.fillCircle(cx, cy, 70);
      g.lineStyle(6, t.mid, 0.25);
      g.strokeRect(x0, y0, cw, ch);
      g.lineBetween(cx, y0, cx, y0 + ch);
      g.strokeCircle(cx, cy, 180);
      const arcR = 640;
      const corner = 620;
      const reach = Math.sqrt(arcR * arcR - corner * corner);
      const sweep = Math.atan2(corner, reach);
      for (const side of [-1, 1] as const) {
        const base = side < 0 ? x0 : x0 + cw;
        const inward = -side;
        const line = base + inward * key.len;
        g.strokeRect(Math.min(base, line), cy - key.half, key.len, key.half * 2);
        g.strokeCircle(line, cy, 170);
        const hoop = base + inward * 150;
        const facing = inward > 0 ? 0 : Math.PI;
        g.beginPath();
        g.arc(hoop, cy, arcR, facing - sweep, facing + sweep);
        g.strokePath();
        for (const s of [-1, 1]) g.lineBetween(base, cy + s * corner, hoop + inward * reach, cy + s * corner);
      }
    },
  },

  /** A bedroom at night: loop-pile carpet, a rug, socks and a cable or two where they fell. */
  adolescence: {
    tile(g, t, rnd) {
      g.fillStyle(t.deep, 1);
      g.fillRect(0, 0, TILE, TILE);
      for (let y = 0; y < TILE; y += 4) {
        for (let x = 0; x < TILE; x += 4) {
          const a = rnd() * 0.08;
          if (a < 0.02) continue;
          g.fillStyle(t.mid, a);
          g.fillRect(x + Math.floor(rnd() * 2), y + Math.floor(rnd() * 2), 2, 2);
        }
      }
      for (let i = 0; i < 900; i++) {
        g.fillStyle(INK, 0.1 + rnd() * 0.08);
        g.fillRect(Math.floor(rnd() * TILE), Math.floor(rnd() * TILE), 2, 2);
      }
    },
    marks(g, t, rnd, w, h) {
      rug(g, t, w * 0.4, h * 0.45, 1150, 720, 0.06, 56);
      for (let i = 0; i < 18; i++) {
        const f = frame(120 + rnd() * (w - 240), 120 + rnd() * (h - 240), rnd() * TAU);
        // A sock: the cuff, the leg, the heel's turn, the toe.
        const sock = [f(-8, -26), f(8, -26), f(8, 2), f(24, 6), f(26, 16), f(18, 22), f(-4, 20), f(-8, 10)];
        g.fillStyle(t.mid, 0.09);
        g.fillPoints(sock, true);
        g.fillStyle(t.mid, 0.06);
        g.fillPoints([f(-8, -26), f(8, -26), f(8, -19), f(-8, -19)], true);
      }
      for (let i = 0; i < 7; i++) {
        // A charging cable: a lazy curve with a plug on the end.
        let x = 150 + rnd() * (w - 300);
        let y = 150 + rnd() * (h - 300);
        let dir = rnd() * TAU;
        const bend = (rnd() - 0.5) * 0.08;
        const pts: Pt[] = [{ x, y }];
        const len = 30 + Math.floor(rnd() * 30);
        for (let k = 0; k < len; k++) {
          dir += bend + Math.sin(k * 0.35 + i) * 0.09;
          x += Math.cos(dir) * 12;
          y += Math.sin(dir) * 12;
          pts.push({ x, y });
        }
        g.lineStyle(3.5, t.mid, 0.1);
        g.strokePoints(pts, false);
        const end = frame(x, y, dir);
        g.fillStyle(t.mid, 0.12);
        g.fillPoints([end(0, -5), end(16, -5), end(16, 5), end(0, 5)], true);
      }
    },
  },

  /** The quad: a mown lawn, and two paths across it that meet at a round plaza. */
  college: {
    tile(g, t, rnd) {
      g.fillStyle(t.deep, 1);
      g.fillRect(0, 0, TILE, TILE);
      // Mowing stripes, the mower's passes up and down.
      g.fillStyle(t.mid, 0.045);
      for (let x = 0; x < TILE; x += 256) g.fillRect(x, 0, 128, TILE);
      // Tufts: a few blades fanning up from one root, some in shade.
      for (let i = 0; i < 1500; i++) {
        const x = rnd() * TILE;
        const y = rnd() * TILE;
        const light = rnd() < 0.7;
        const alpha = light ? 0.07 + rnd() * 0.06 : 0.1 + rnd() * 0.06;
        const blades = Array.from({ length: 2 + Math.floor(rnd() * 3) }, () => ({
          len: 5 + rnd() * 6,
          lean: (rnd() - 0.5) * 1.1,
        }));
        wrap(x, y, 14, (px, py) => {
          g.lineStyle(1.5, light ? t.mid : INK, alpha);
          for (const b of blades) g.lineBetween(px, py, px + b.lean * b.len, py - b.len);
        });
      }
    },
    marks(g, t, _rnd, w, h) {
      // Up and right of centre, so the player spawns on the grass by a path.
      const cx = w / 2 + 520;
      const cy = h / 2 - 300;
      const plaza = 230;
      const half = 64;
      const cut = Math.sqrt(plaza * plaza - half * half);
      const ends: Pt[] = [
        { x: -200, y: -200 },
        { x: w + 200, y: -200 },
        { x: w + 200, y: h + 200 },
        { x: -200, y: h + 200 },
      ];
      for (const e of ends) {
        // Each arm from the plaza's edge out past a corner, so no two overlap.
        const rot = Math.atan2(e.y - cy, e.x - cx);
        const len = Math.hypot(e.x - cx, e.y - cy);
        const f = frame(cx, cy, rot);
        const arm = [f(cut, -half), f(len, -half), f(len, half), f(cut, half)];
        g.fillStyle(t.deep, COVER);
        g.fillPoints(arm, true);
        g.fillStyle(t.mid, 0.1);
        g.fillPoints(arm, true);
        g.lineStyle(3, t.mid, 0.18);
        for (const v of [-half, half]) {
          const a = f(cut, v);
          const b = f(len, v);
          g.lineBetween(a.x, a.y, b.x, b.y);
        }
        g.lineStyle(2.5, INK, 0.14);
        for (let u = cut + 60; u < len; u += 60) {
          const a = f(u, -half);
          const b = f(u, half);
          g.lineBetween(a.x, a.y, b.x, b.y);
        }
      }
      g.fillStyle(t.deep, COVER);
      g.fillCircle(cx, cy, plaza);
      g.fillStyle(t.mid, 0.1);
      g.fillCircle(cx, cy, plaza);
      g.lineStyle(3, t.mid, 0.18);
      g.strokeCircle(cx, cy, plaza);
      g.lineStyle(2.5, INK, 0.14);
      g.strokeCircle(cx, cy, 160);
      // A flowerbed in the middle, where nobody is meant to walk.
      g.fillStyle(INK, 0.12);
      g.fillCircle(cx, cy, 90);
    },
  },

  /** Carpet tiles laid in quarter turns, and the ghost of where the cubicles stood before the last move. */
  office: {
    tile(g, t, rnd) {
      g.fillStyle(t.deep, 1);
      g.fillRect(0, 0, TILE, TILE);
      const T = 64;
      for (let ty = 0; ty < TILE / T; ty++) {
        for (let tx = 0; tx < TILE / T; tx++) {
          const x0 = tx * T;
          const y0 = ty * T;
          g.fillStyle(rnd() < 0.5 ? t.mid : INK, rnd() * 0.035);
          g.fillRect(x0, y0, T, T);
          const across = (tx + ty) % 2 === 0;
          for (let k = 3; k < T - 2; k += 4) {
            g.fillStyle(t.mid, 0.025 + rnd() * 0.025);
            if (across) g.fillRect(x0 + 2, y0 + k, T - 4, 1);
            else g.fillRect(x0 + k, y0 + 2, 1, T - 4);
          }
        }
      }
      g.fillStyle(INK, 0.15);
      for (let i = 0; i < TILE / T; i++) {
        g.fillRect(i * T, 0, 1.5, TILE);
        g.fillRect(0, i * T, TILE, 1.5);
      }
      // A pod of two cubicles, walls on the tile lines, each open to the aisle.
      g.fillStyle(t.mid, 0.08);
      const wall = (x: number, y: number, w: number, h: number) => g.fillRect(x - 4, y - 4, w + 8, h + 8);
      wall(64, 64, 384, 0);
      wall(64, 72, 0, 248);
      wall(448, 72, 0, 248);
      wall(256, 72, 0, 248);
      wall(72, 320, 88, 0);
      wall(264, 320, 88, 0);
    },
    marks(g, _t, rnd, w, h) {
      for (let i = 0; i < 26; i++) {
        const x = 100 + rnd() * (w - 200);
        const y = 100 + rnd() * (h - 200);
        const r = 8 + rnd() * 2;
        g.lineStyle(2.5, SHADOW, 0.16);
        g.strokeCircle(x, y, r);
        if (rnd() < 0.4) {
          const a = rnd() * TAU;
          g.lineStyle(2, SHADOW, 0.12);
          g.beginPath();
          g.arc(x + 5, y + 3, r, a, a + 2.4);
          g.strokePath();
        }
      }
    },
  },

  /** The living room: wide boards, a rug with a border, and the toys nobody put away. */
  family: {
    tile(g, t, rnd) {
      g.fillStyle(t.deep, 1);
      g.fillRect(0, 0, TILE, TILE);
      boards(g, t, rnd, { width: 64, minLen: 160, maxLen: 400, seam: 0.24, knots: 0.4 });
    },
    marks(g, t, rnd, w, h) {
      // Down and left of centre, so the player spawns on its edge and not on the medallion.
      const rx = w / 2 - 420;
      const ry = h / 2 + 230;
      rug(g, t, rx, ry, 1500, 960, 0, 70);
      g.lineStyle(3, t.mid, 0.09);
      g.strokeEllipse(rx, ry, 460, 280);
      for (let i = 0; i < 40; i++) {
        const x = 120 + rnd() * (w - 240);
        const y = 120 + rnd() * (h - 240);
        const f = frame(x, y, (rnd() - 0.5) * 0.5);
        const kind = rnd();
        g.fillStyle(t.mid, 0.1);
        g.lineStyle(5, t.mid, 0.1);
        if (kind < 0.35) {
          // A building block.
          const s = 10 + rnd() * 4;
          g.fillPoints([f(-s, -s), f(s, -s), f(s, s), f(-s, s)], true);
        } else if (kind < 0.6) {
          g.fillCircle(x, y, 9 + rnd() * 6);
        } else if (kind < 0.8) {
          // A stacking ring.
          g.strokeCircle(x, y, 10);
        } else {
          // A toy car: the body and two wheels.
          g.fillPoints([f(-18, -8), f(18, -8), f(18, 6), f(-18, 6)], true);
          g.fillStyle(INK, 0.12);
          const a = f(-10, 8);
          const b = f(10, 8);
          g.fillCircle(a.x, a.y, 5);
          g.fillCircle(b.x, b.y, 5);
        }
      }
    },
  },

  /** The ward: linoleum in two close tones, and the corridor worn down its middle. */
  decline: {
    tile(g, t, rnd) {
      g.fillStyle(t.deep, 1);
      g.fillRect(0, 0, TILE, TILE);
      const T = 128;
      g.fillStyle(t.mid, 0.05);
      for (let ty = 0; ty < TILE / T; ty++) {
        for (let tx = 0; tx < TILE / T; tx++) if ((tx + ty) % 2 === 0) g.fillRect(tx * T, ty * T, T, T);
      }
      for (let i = 0; i < 1600; i++) {
        const light = rnd() < 0.5;
        g.fillStyle(light ? t.mid : INK, light ? 0.06 + rnd() * 0.05 : 0.08 + rnd() * 0.04);
        g.fillRect(Math.floor(rnd() * TILE), Math.floor(rnd() * TILE), 1 + Math.floor(rnd() * 2), 1 + Math.floor(rnd() * 2));
      }
      for (let i = 0; i < TILE / T; i++) {
        g.fillStyle(INK, 0.2);
        g.fillRect(i * T, 0, 1.5, TILE);
        g.fillRect(0, i * T, TILE, 1.5);
        g.fillStyle(t.mid, 0.06);
        g.fillRect(i * T + 2, 0, 1, TILE);
        g.fillRect(0, i * T + 2, TILE, 1);
      }
    },
    marks(g, t, rnd, w, h) {
      const cy = h / 2;
      // Worn toward the middle of the corridor, in steps too fine to see as steps.
      for (let i = 0; i < 6; i++) {
        const half = 190 - i * 28;
        g.fillStyle(t.mid, 0.012);
        g.fillRect(0, cy - half, w, half * 2);
      }
      // Wheels: two tracks down the corridor, not quite straight.
      g.lineStyle(2, INK, 0.12);
      for (const off of [-44, -30, 30, 44]) {
        const pts: Pt[] = [];
        for (let x = 0; x <= w; x += 40) pts.push({ x, y: cy + off + Math.sin(x * 0.004 + off) * 6 });
        g.strokePoints(pts, false);
      }
      for (let i = 0; i < 50; i++) {
        const x = rnd() * w;
        const y = cy + (rnd() - 0.5) * 300;
        const a = (rnd() - 0.5) * 0.6;
        const len = 20 + rnd() * 40;
        g.lineStyle(2.5, INK, 0.1);
        g.beginPath();
        g.arc(x, y + 200, 200, -Math.PI / 2 + a, -Math.PI / 2 + a + len / 200);
        g.strokePath();
      }
      // The line painted along the corridor to follow.
      g.fillStyle(t.mid, 0.22);
      g.fillRect(0, cy + 150, w, 10);
    },
  },
};

/**
 * The acts whose tile is a generated picture, by act id: that picture's URL.
 * Read from FLOORS, so a floor's picture is registered in one place, beside
 * its fallback tile and its landmarks.
 */
export const FLOOR_IMAGES: Readonly<Record<string, string>> = Object.fromEntries(
  Object.entries(FLOORS).flatMap(([id, f]) => (f.image ? [[id, f.image]] : [])),
);

/** The texture key an act's floor picture is loaded under. */
export const floorImageKey = (actId: string): string => `nc-floor-img-${actId}`;

/**
 * Queues the floor picture of every act in `actIds` that has one, for a
 * scene's `preload`: the crossing happens mid-run and must not wait on a
 * load. A picture that fails to load leaves its act on the Graphics tile.
 */
export function preloadFloors(scene: Phaser.Scene, actIds: readonly string[]): void {
  for (const id of actIds) {
    const url = FLOOR_IMAGES[id];
    const key = floorImageKey(id);
    if (url && !scene.textures.exists(key)) scene.load.image(key, url);
  }
}

function floorFor(actId: string): Floor {
  const f = FLOORS[actId];
  if (!f) throw new Error(`No floor registered for act "${actId}"`);
  return f;
}

function tones(actId: string): Tones {
  const v = actVisuals(actId);
  return { deep: v.background, mid: v.mid };
}

/** Draws the act's tile into `g` at the origin, TILE square. */
export function paintFloorTile(g: G, actId: string): void {
  floorFor(actId).tile(g, tones(actId), rng(actId));
}

/** Draws the act's landmarks into `g` in world coordinates; nothing for an act without any. */
export function drawFloorMarks(g: G, actId: string, w: number, h: number): void {
  floorFor(actId).marks?.(g, tones(actId), rng(`${actId}/marks`), w, h);
}

/**
 * The act's floor tile, returning its texture key: the act's picture when it
 * has one and it has loaded, else the Graphics tile, generated once per game.
 */
export function ensureFloor(scene: Phaser.Scene, actId: string): string {
  const image = floorImageKey(actId);
  if (floorFor(actId).image && scene.textures.exists(image)) return image;
  const key = `nc-floor-${actId}`;
  if (!scene.textures.exists(key)) {
    const g = scene.make.graphics({ x: 0, y: 0 }, false);
    paintFloorTile(g, actId);
    g.generateTexture(key, TILE, TILE);
    g.destroy();
  }
  return key;
}

const rgb = (c: number) => `${(c >> 16) & 0xff},${(c >> 8) & 0xff},${c & 0xff}`;

/**
 * The foot of the walls: a band of shadow inside the arena's edges, darkest
 * at the wall, so the arena ends at a wall and not at the edge of the
 * picture. Multiplied: every act's ground is darker than shadow, so shadow
 * laid over it normally would lighten the edge instead.
 */
function shadeWalls(ctx: CanvasRenderingContext2D, w: number, h: number): void {
  ctx.save();
  ctx.globalCompositeOperation = 'multiply';
  let inset = 0;
  for (const [width, alpha] of WALL_SHADE) {
    ctx.fillStyle = `rgba(${rgb(SHADOW)},${alpha})`;
    ctx.fillRect(inset, inset, w - inset * 2, width);
    ctx.fillRect(inset, h - inset - width, w - inset * 2, width);
    ctx.fillRect(inset, inset + width, width, h - (inset + width) * 2);
    ctx.fillRect(w - inset - width, inset + width, width, h - (inset + width) * 2);
    inset += width;
  }
  ctx.restore();
}

/**
 * The whole floor of a `w`×`h` world, baked once into one texture: the tile
 * repeated, the landmarks over it, the shadow at the walls. Drawn as one
 * image, it costs a frame what the paper tooth's tile sprite did; drawn as
 * three layers it cost a third more under software WebGL, the CI smoke's
 * renderer.
 *
 * One act's at a time, since each is world-sized: the others are released
 * here, so the caller must stop showing them straight after.
 */
export function bakeFloor(scene: Phaser.Scene, actId: string, w: number, h: number): string {
  const key = `nc-floor-world-${actId}`;
  for (const k of scene.textures.getTextureKeys()) {
    if (k.startsWith('nc-floor-world-') && k !== key) scene.textures.remove(k);
  }
  if (scene.textures.exists(key)) return key;
  // A loaded picture's source is an <img>, a generated tile's a <canvas>: a pattern takes either.
  const tile = scene.textures.get(ensureFloor(scene, actId)).getSourceImage() as HTMLImageElement | HTMLCanvasElement;
  const tex = scene.textures.createCanvas(key, w, h);
  if (!tex) throw new Error(`Could not create the floor texture "${key}"`);
  const ctx = tex.getContext();
  const pattern = ctx.createPattern(tile, 'repeat');
  if (pattern) ctx.fillStyle = pattern;
  ctx.fillRect(0, 0, w, h);
  if (floorFor(actId).marks) {
    const g = scene.make.graphics({ x: 0, y: 0 }, false);
    drawFloorMarks(g, actId, w, h);
    // Into the canvas just made: generateTexture draws over an existing canvas key.
    g.generateTexture(key, w, h);
    g.destroy();
  }
  shadeWalls(ctx, w, h);
  tex.refresh();
  return key;
}
