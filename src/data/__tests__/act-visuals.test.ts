import { describe, expect, it } from 'vitest';
import { ACT_VISUALS, type BossFrames } from '../act-visuals';
import { RESERVATIONS } from '../../../tools/art/reservations';
import type { ActId } from '../../../tools/art/palette';

/** Every frame a `bossFrames` names, in the order the renderer steps through them. */
function named(frames: BossFrames): string[] {
  return [frames.closing, frames.parted, ...(frames.grey ?? []), frames.open, frames.face].filter(
    (f): f is string => f !== undefined,
  );
}

describe('boss variant frames (D-029)', () => {
  it('every variant frame an act names is in its atlas', () => {
    // As the boss frame's own test (content.test.ts): a frame missing from the
    // atlas does not throw, Phaser warns once and draws the atlas's FIRST
    // frame — the wrong sprite, silently, and only on the state edge that
    // swaps to it, which may be the last second of the act.
    let seen = 0;
    for (const [id, v] of Object.entries(ACT_VISUALS)) {
      if (!v.bossFrames) continue;
      const frames = Object.keys(v.atlas.json.frames);
      for (const f of named(v.bossFrames)) {
        expect(frames, `act "${id}" atlas lacks its boss variant "${f}"`).toContain(f);
        seen++;
      }
    }
    // The seven the atlases were packed with: two Egg, three chart, the door, the face.
    expect(seen).toBe(7);
  });

  it("every variant frame is a declared variant of the act's boss frame", () => {
    // Law 11 through D-029: a variant holds its holder's reservation and
    // reserves nothing, so the renderer may swap the boss only to a frame the
    // reservations list names as that holder's variant. A frame named here and
    // not there would be a second holder of the boss's shape, drawn past the
    // gate that stops one.
    for (const [id, v] of Object.entries(ACT_VISUALS)) {
      if (!v.bossFrames) continue;
      const holder = v.bossFrame.replace(/\.png$/, '');
      const declared = RESERVATIONS[id as ActId]?.variants?.[holder] ?? [];
      for (const f of named(v.bossFrames)) {
        expect(declared, `act "${id}": "${f}" is not a declared variant of "${holder}"`).toContain(
          f.replace(/\.png$/, ''),
        );
      }
    }
  });

  it("every variant frame is its holder's size", () => {
    // The renderer swaps the frame and keeps the holder's size and origin
    // (`setFrame(frame, false, false)` in ActScene.syncBoss), so a variant of
    // another size would be drawn squeezed to the holder's, silently.
    type Entry = {
      sourceSize: { w: number; h: number };
      spriteSourceSize: { x: number; y: number; w: number; h: number };
    };
    for (const [id, v] of Object.entries(ACT_VISUALS)) {
      if (!v.bossFrames) continue;
      const frames = v.atlas.json.frames as Record<string, Entry>;
      const holder = frames[v.bossFrame]!;
      for (const f of named(v.bossFrames)) {
        const variant = frames[f];
        expect(variant?.sourceSize, `act "${id}": "${f}" against "${v.bossFrame}"`).toEqual(holder.sourceSize);
        expect(variant?.spriteSourceSize, `act "${id}": "${f}" trimmed unlike "${v.bossFrame}"`).toEqual(
          holder.spriteSourceSize,
        );
      }
    }
  });

  it('the chart greys in the declared order, bottom row first', () => {
    // grey[0] is one row, grey[2] all three: the renderer indexes by the
    // restructure count, so an order shuffled here greys rows out of turn.
    expect(ACT_VISUALS.office!.bossFrames?.grey).toEqual([
      'boss-reorg-grey-1.png',
      'boss-reorg-grey-2.png',
      'boss-reorg-grey-3.png',
    ]);
  });
});
