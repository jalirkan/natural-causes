import { CHANNELS, index, type Bitmap } from './bitmap';

/**
 * Stage 4 — TEXTURE. A light grain overlay, uniform across all assets.
 *
 * The job is not decoration. Flux output varies in surface quality from image
 * to image, and a single shared grain sitting on top of everything pulls those
 * differences together — the same trick print does when it screens two
 * photographs onto one page. It also hides the small artefacts left by
 * background removal along the outline.
 *
 * "Uniform" is meant literally: one tile, one seed, sampled by absolute
 * position, so every sprite in the game carries the identical grain rather
 * than its own random field.
 */

const TILE = 256;

/** Bounded deviation per channel. The palette check is tolerant of exactly this. */
export const GRAIN_AMPLITUDE = 7;

/** Deterministic PRNG — the grain must be identical on every machine and run. */
function mulberry32(seed: number): () => number {
  let a = seed >>> 0;
  return () => {
    a = (a + 0x6d2b79f5) >>> 0;
    let t = Math.imul(a ^ (a >>> 15), 1 | a);
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

let cachedTile: Int8Array | null = null;

/** The one grain field, built once and reused for every asset. */
export function grainTile(): Int8Array {
  if (cachedTile) return cachedTile;
  const rand = mulberry32(0x9e3779b9);
  const tile = new Int8Array(TILE * TILE);
  for (let i = 0; i < tile.length; i++) {
    // Two samples averaged: pure white noise reads as digital speckle,
    // this reads closer to paper.
    const n = (rand() + rand()) / 2 - 0.5;
    tile[i] = Math.round(n * 2 * GRAIN_AMPLITUDE);
  }
  cachedTile = tile;
  return tile;
}

const clamp255 = (v: number): number => (v < 0 ? 0 : v > 255 ? 255 : v);

/**
 * Apply the grain in place. Opaque pixels only — grain on transparent pixels
 * would fringe the sprite once it is composited over an act background.
 */
export function applyGrain(bmp: Bitmap, strength = 1): void {
  const tile = grainTile();
  for (let y = 0; y < bmp.height; y++) {
    for (let x = 0; x < bmp.width; x++) {
      const i = index(bmp, x, y);
      if (bmp.data[i + 3] === 0) continue;
      const n = Math.round(tile[(y % TILE) * TILE + (x % TILE)]! * strength);
      bmp.data[i] = clamp255(bmp.data[i]! + n);
      bmp.data[i + 1] = clamp255(bmp.data[i + 1]! + n);
      bmp.data[i + 2] = clamp255(bmp.data[i + 2]! + n);
    }
  }
}

export function texture(input: Bitmap, strength = 1): Bitmap {
  const out: Bitmap = {
    data: Buffer.from(input.data),
    width: input.width,
    height: input.height,
  };
  applyGrain(out, strength);
  return out;
}

export { CHANNELS };
