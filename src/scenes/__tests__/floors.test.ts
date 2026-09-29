import { describe, expect, it } from 'vitest';
import type Phaser from 'phaser';
import { INK, PAPER, SHADOW, WORLD_HEIGHT, WORLD_WIDTH } from '../../config';
import { ACT_VISUALS } from '../../data/act-visuals';
import { drawFloorMarks, paintFloorTile } from '../floors';

/**
 * The floors (./floors) draw only the colours law 10 leaves to the ground:
 * the act's deep and mid tones, ink and shadow. Never paper (the player's)
 * nor the act's light tone (the pickups'). And faint: over the deep tone
 * nothing is laid stronger than a painted court line, so the floor stays
 * texture under the sprites.
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
