import { CHANNELS, blank, index, opaqueBounds, crop, centreOn, resize, type Bitmap } from './bitmap';
import {
  INK,
  actPalette,
  enemyPalette,
  nearest,
  type ActId,
  type Colour,
  type ThreatClass,
} from './palette';

/**
 * Stage 3 — CONFORM. Quantise to the locked palette, apply the standard
 * outline, normalise to the act's scale grid.
 *
 * This is where "looks art-directed" instead of "looks generated" is actually
 * produced (D-005). The generator is never asked to be consistent; it is asked
 * for a subject, and consistency is imposed here by code that cannot forget.
 */

/**
 * Outline weight as a fraction of the sprite's longest side (law 1: one
 * outline weight across the whole game, scaled proportionally with sprite
 * size, never varied for effect). A 96px swarm enemy gets 3px; a 384px boss
 * gets 12px; both read as the same line.
 */
export const OUTLINE_RATIO = 2 / 96;

export function outlineWidthFor(size: number): number {
  return Math.max(1, Math.round(size * OUTLINE_RATIO));
}

/**
 * Flat fills, no soft edges (law 2). Anti-aliased alpha is where generated
 * images leak gradients back in after everything else has been flattened.
 */
export function binariseAlpha(bmp: Bitmap, threshold = 128): void {
  for (let i = 3; i < bmp.data.length; i += CHANNELS) {
    bmp.data[i] = bmp.data[i]! >= threshold ? 255 : 0;
  }
}

/** Snap every opaque pixel to the nearest colour in the act's palette. */
export function quantise(bmp: Bitmap, palette: Colour[]): void {
  // Generated images have far more distinct colours than pixels worth
  // recomputing; a cache turns this from minutes into milliseconds.
  const cache = new Map<number, Colour>();
  for (let i = 0; i < bmp.data.length; i += CHANNELS) {
    if (bmp.data[i + 3] === 0) continue;
    const r = bmp.data[i]!;
    const g = bmp.data[i + 1]!;
    const b = bmp.data[i + 2]!;
    const key = (r << 16) | (g << 8) | b;
    let match = cache.get(key);
    if (!match) {
      match = nearest(palette, r, g, b);
      cache.set(key, match);
    }
    bmp.data[i] = match.rgb[0];
    bmp.data[i + 1] = match.rgb[1];
    bmp.data[i + 2] = match.rgb[2];
  }
}

/**
 * Draw the standard outline around the subject: dilate the alpha mask by
 * `width` and fill everything gained with ink, underneath the original.
 */
export function applyOutline(bmp: Bitmap, width: number): Bitmap {
  const out = blank(bmp.width, bmp.height);
  const r2 = width * width;

  // Offsets inside the dilation disc, computed once.
  const disc: Array<[number, number]> = [];
  for (let dy = -width; dy <= width; dy++) {
    for (let dx = -width; dx <= width; dx++) {
      if (dx * dx + dy * dy <= r2) disc.push([dx, dy]);
    }
  }

  for (let y = 0; y < bmp.height; y++) {
    for (let x = 0; x < bmp.width; x++) {
      const i = index(bmp, x, y);
      if (bmp.data[i + 3]! > 0) continue;

      let touches = false;
      for (const [dx, dy] of disc) {
        const nx = x + dx;
        const ny = y + dy;
        if (nx < 0 || ny < 0 || nx >= bmp.width || ny >= bmp.height) continue;
        if (bmp.data[index(bmp, nx, ny) + 3]! > 0) {
          touches = true;
          break;
        }
      }
      if (touches) {
        const o = index(out, x, y);
        out.data[o] = INK.rgb[0];
        out.data[o + 1] = INK.rgb[1];
        out.data[o + 2] = INK.rgb[2];
        out.data[o + 3] = 255;
      }
    }
  }

  // Original on top of the new ink ring.
  for (let i = 0; i < bmp.data.length; i += CHANNELS) {
    if (bmp.data[i + 3]! > 0) bmp.data.copy(out.data, i, i, i + CHANNELS);
  }
  return out;
}

export interface ConformOptions {
  act: ActId;
  /** Longest side of the finished sprite, in pixels — the act's scale grid. */
  targetSize: number;
  /**
   * Quantise against the enemy palette, which excludes paper (the player's)
   * and the act's light tone (the pickups'). Without this the quantiser can
   * produce a colour CHECK is guaranteed to reject.
   */
  forEnemy?: boolean;
  /** Threat colours this asset is allowed to wear. */
  holdsThreat?: ThreatClass[];
}

/**
 * Full CONFORM stage. Order matters: scale first so the outline is applied at
 * final resolution and comes out crisp and uniform, rather than being resized
 * afterwards into a different weight per asset.
 */
export async function conform(input: Bitmap, options: ConformOptions): Promise<Bitmap> {
  const { act, targetSize } = options;
  const outline = outlineWidthFor(targetSize);

  // Leave room for the outline ring so it is never clipped by the canvas.
  const inner = targetSize - outline * 2;

  const bounds = opaqueBounds(input);
  if (!bounds) throw new Error('conform received an empty bitmap');
  const subject = crop(input, bounds);

  const scale = inner / Math.max(subject.width, subject.height);
  const scaled = await resize(
    subject,
    Math.max(1, Math.round(subject.width * scale)),
    Math.max(1, Math.round(subject.height * scale)),
  );

  binariseAlpha(scaled);
  quantise(
    scaled,
    options.forEnemy ? enemyPalette(act, options.holdsThreat ?? []) : actPalette(act),
  );

  const centred = centreOn(scaled, targetSize);
  return applyOutline(centred, outline);
}
