import { CHANNELS, blank, index, type Bitmap } from './bitmap';

/**
 * Stage 6 — PACK. One sprite atlas per act.
 *
 * Shelf packing, not a bin-packer. With ~30 sprites per act at two or three
 * distinct sizes, shelf packing wastes a few percent of the sheet and is
 * fifteen lines; a MaxRects implementation would recover that waste and is a
 * few hundred. The atlas is not the constraint on this project.
 */

export interface PackEntry {
  id: string;
  bitmap: Bitmap;
}

export interface AtlasFrame {
  frame: { x: number; y: number; w: number; h: number };
  rotated: false;
  trimmed: false;
  spriteSourceSize: { x: number; y: number; w: number; h: number };
  sourceSize: { w: number; h: number };
}

/** Phaser's JSON Hash atlas format, which `this.load.atlas` reads directly. */
export interface Atlas {
  frames: Record<string, AtlasFrame>;
  meta: {
    app: string;
    version: string;
    image: string;
    format: 'RGBA8888';
    size: { w: number; h: number };
    scale: '1';
  };
}

export interface PackResult {
  image: Bitmap;
  atlas: Atlas;
}

function nextPowerOfTwo(n: number): number {
  let p = 1;
  while (p < n) p *= 2;
  return p;
}

export function pack(entries: PackEntry[], imageName: string, padding = 2): PackResult {
  if (entries.length === 0) throw new Error('nothing to pack');

  // Tallest first: shelf packing wastes least when heights are grouped.
  const sorted = [...entries].sort((a, b) => b.bitmap.height - a.bitmap.height);

  const widest = Math.max(...sorted.map((e) => e.bitmap.width)) + padding * 2;
  const area = sorted.reduce(
    (sum, e) => sum + (e.bitmap.width + padding * 2) * (e.bitmap.height + padding * 2),
    0,
  );
  const sheetWidth = nextPowerOfTwo(Math.max(widest, Math.ceil(Math.sqrt(area * 1.3))));

  // Lay out on shelves to discover the height, then allocate once.
  let x = padding;
  let y = padding;
  let shelfHeight = 0;
  const placed: Array<{ id: string; bitmap: Bitmap; x: number; y: number }> = [];

  for (const e of sorted) {
    if (x + e.bitmap.width + padding > sheetWidth) {
      x = padding;
      y += shelfHeight + padding;
      shelfHeight = 0;
    }
    placed.push({ id: e.id, bitmap: e.bitmap, x, y });
    x += e.bitmap.width + padding;
    shelfHeight = Math.max(shelfHeight, e.bitmap.height);
  }

  const sheetHeight = nextPowerOfTwo(y + shelfHeight + padding);
  const image = blank(sheetWidth, sheetHeight);

  const frames: Record<string, AtlasFrame> = {};
  for (const p of placed) {
    for (let row = 0; row < p.bitmap.height; row++) {
      const src = index(p.bitmap, 0, row);
      const dst = index(image, p.x, p.y + row);
      p.bitmap.data.copy(image.data, dst, src, src + p.bitmap.width * CHANNELS);
    }
    frames[`${p.id}.png`] = {
      frame: { x: p.x, y: p.y, w: p.bitmap.width, h: p.bitmap.height },
      rotated: false,
      trimmed: false,
      spriteSourceSize: { x: 0, y: 0, w: p.bitmap.width, h: p.bitmap.height },
      sourceSize: { w: p.bitmap.width, h: p.bitmap.height },
    };
  }

  return {
    image,
    atlas: {
      frames,
      meta: {
        app: 'natural-causes/tools/art/pack.ts',
        version: '1',
        image: imageName,
        format: 'RGBA8888',
        size: { w: sheetWidth, h: sheetHeight },
        scale: '1',
      },
    },
  };
}
