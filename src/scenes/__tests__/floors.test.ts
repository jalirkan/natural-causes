import { describe, expect, it } from 'vitest';
import type Phaser from 'phaser';
import { INK, PAPER, SHADOW, WORLD_HEIGHT, WORLD_WIDTH } from '../../config';
import { ACT_VISUALS } from '../../data/act-visuals';
import { drawFloorMarks, ensureFloor, FLOOR_IMAGES, paintFloorTile, preloadFloors } from '../floors';

/**
 * The floors (./floors) draw only the colours law 10 leaves to the ground:
 * the act's deep and mid tones, ink and shadow. Never paper (the player's)
 * nor the act's light tone (the pickups'). And faint: over the deep tone
 * nothing is laid stronger than a painted court line, so the floor stays
 * texture under the sprites.
 *
 * That holds the Graphics tile and the landmarks only. An act whose tile is a
 * generated picture (FLOOR_IMAGES) lays that picture instead when it has
 * loaded; a picture is not drawn in these colours and this law does not
 * reach it (its provenance is assets/prompts/floor-<act>.md). Its Graphics
 * tile is still the fallback, so it is still held here.
 */

interface Stroke {
  colour: number;
  alpha: number;
  what: string;
}

/** A Graphics that records every colour it is given and draws nothing. */
function recorder(): { g: Phaser.GameObjects.Graphics; used: Stroke[] } {
  const used: Stroke[] = [];
  const g: object = new Proxy(
    {},
    {
      get(_t, prop) {
        return (...args: unknown[]) => {
          if (prop === 'fillStyle') used.push({ colour: args[0] as number, alpha: (args[1] as number) ?? 1, what: 'fill' });
          if (prop === 'lineStyle') used.push({ colour: args[1] as number, alpha: (args[2] as number) ?? 1, what: 'line' });
          return g;
        };
      },
    },
  );
  return { g: g as Phaser.GameObjects.Graphics, used };
}

const hex = (n: number) => `#${n.toString(16).padStart(6, '0')}`;

describe('every act has a floor, in the ground’s colours only (law 10)', () => {
  for (const [id, v] of Object.entries(ACT_VISUALS)) {
    it(id, () => {
      const tile = recorder();
      paintFloorTile(tile.g, id);
      const marks = recorder();
      drawFloorMarks(marks.g, id, WORLD_WIDTH, WORLD_HEIGHT);
      const used = [...tile.used, ...marks.used];
      expect(tile.used.length, `${id} paints no tile`).toBeGreaterThan(0);

      const allowed = new Set([v.background, v.mid, INK, SHADOW]);
      for (const s of used) {
        expect(allowed.has(s.colour), `${id} uses ${hex(s.colour)}`).toBe(true);
        expect(s.colour, `${id} uses paper`).not.toBe(PAPER);
        expect(s.colour, `${id} uses its light tone`).not.toBe(v.pickup);
        // The deep tone may be laid at any strength: it is the ground itself.
        if (s.colour !== v.background) expect(s.alpha, `${id} ${s.what} ${hex(s.colour)}`).toBeLessThanOrEqual(0.25);
      }
      // The tile starts from the act's own ground, so the act's colour is unchanged.
      expect(tile.used[0]).toEqual({ colour: v.background, alpha: 1, what: 'fill' });
    });
  }
});

/**
 * A scene with just what ensureFloor and preloadFloors touch: which texture
 * keys exist, the Graphics a tile is painted into (drawing nothing), and the
 * loader's image queue.
 */
function fakeScene(existing: readonly string[]): {
  scene: Phaser.Scene;
  generated: string[];
  queued: [string, string][];
} {
  const keys = new Set(existing);
  const generated: string[] = [];
  const queued: [string, string][] = [];
  const g: object = new Proxy(
    {},
    {
      get(_t, prop) {
        return (...args: unknown[]) => {
          if (prop === 'generateTexture') {
            generated.push(args[0] as string);
            keys.add(args[0] as string);
          }
          return g;
        };
      },
    },
  );
  const scene = {
    textures: { exists: (k: string) => keys.has(k) },
    make: { graphics: () => g },
    load: { image: (k: string, url: string) => queued.push([k, url]) },
  };
  return { scene: scene as unknown as Phaser.Scene, generated, queued };
}

describe('a floor tile can be a generated picture', () => {
  it('School’s picture is registered, as the URL Vite resolves its import to', () => {
    // Vitest resolves an imported PNG to its path, as the build does to a hashed one.
    expect(typeof FLOOR_IMAGES.school).toBe('string');
    expect(FLOOR_IMAGES.school).toMatch(/\.png$/);
  });

  it('every act with a picture is an act with visuals', () => {
    for (const id of Object.keys(FLOOR_IMAGES)) expect(ACT_VISUALS, id).toHaveProperty(id);
  });

  it('ensureFloor lays the picture when it has loaded, and paints nothing', () => {
    const f = fakeScene(['nc-floor-img-school']);
    expect(ensureFloor(f.scene, 'school')).toBe('nc-floor-img-school');
    expect(f.generated).toEqual([]);
  });

  it('ensureFloor falls back to the Graphics tile when the picture has not loaded', () => {
    const f = fakeScene([]);
    expect(ensureFloor(f.scene, 'school')).toBe('nc-floor-school');
    expect(f.generated).toEqual(['nc-floor-school']);
    // Generated once per game.
    expect(ensureFloor(f.scene, 'school')).toBe('nc-floor-school');
    expect(f.generated).toEqual(['nc-floor-school']);
  });

  it('an act without a picture keeps its Graphics tile even if the key were taken', () => {
    const f = fakeScene(['nc-floor-img-conception']);
    expect(ensureFloor(f.scene, 'conception')).toBe('nc-floor-conception');
  });

  it('preloadFloors queues the picture of each act in the life that has one, once', () => {
    const f = fakeScene([]);
    preloadFloors(f.scene, ['conception', 'school']);
    expect(f.queued).toEqual([['nc-floor-img-school', FLOOR_IMAGES.school]]);
    const loaded = fakeScene(['nc-floor-img-school']);
    preloadFloors(loaded.scene, ['conception', 'school']);
    expect(loaded.queued).toEqual([]);
  });
});
