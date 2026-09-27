import { createHash } from 'node:crypto';
import { readFileSync } from 'node:fs';
import { resolve } from 'node:path';
import sharp from 'sharp';
import { blank, crop, index, opaqueBounds, type Bitmap } from './bitmap';
import { outlineWidthFor } from './conform';
import type { AssetSpec } from './types';

/**
 * The SVG stage (G-038). Authored sprites replace GENERATE and CUT; CONFORM
 * and CHECK stay exactly as they were.
 *
 * This stage only turns vectors into pixels. It does not fix colours, does not
 * add the outline and does not decide anything: an off-palette fill goes into
 * CONFORM off-palette, quantise snaps it, and CHECK judges what came out. The
 * pipeline rejects, it never corrects — an authored asset that fails is fixed
 * by its author, in the SVG.
 *
 * What it does own is the size. CONFORM scales the trimmed subject to
 * `targetSize − 2·outline` on its long side with nearest-neighbour, which on
 * a generated 1024px raw is a large clean reduction but on a vector rendered
 * at an arbitrary size is a resample that duplicates or drops rows. So the
 * SVG is rendered at the density that makes its trimmed content land on
 * exactly that long side, and CONFORM's resize becomes the identity.
 */

/** Supersampling factor: render this many times larger, then area-average down. */
export const SUPERSAMPLE = 4;

/**
 * Alpha a supersampled pixel needs to count toward the measured bounds.
 *
 * Chosen so the crop and CONFORM agree about where the subject ends: every
 * edge block of the crop contains at least one pixel at or above this, so its
 * area average is at least 136/16 = 8.5 — above the threshold of 8 that
 * `opaqueBounds` (and so CONFORM's crop) uses. Measuring at a lower alpha
 * would let faint antialiasing define an edge CONFORM then trims away.
 */
const MEASURE_ALPHA = 135;

/** Where an authored asset's source lives. */
export function svgPathFor(spec: Pick<AssetSpec, 'act' | 'id'>, root = process.cwd()): string {
  return resolve(root, `tools/art/svg/${spec.act}/${spec.id}.svg`);
}

/** Repo-relative, forward slashes: what provenance records. */
export function svgRelativePath(spec: Pick<AssetSpec, 'act' | 'id'>): string {
  return `tools/art/svg/${spec.act}/${spec.id}.svg`;
}

export function sha256(data: Buffer | string): string {
  return createHash('sha256').update(data).digest('hex');
}

/**
 * The human-readable text inside an SVG, as named fields for the content rule.
 *
 * D-007 runs on every text field of every asset, and an SVG carries its own:
 * `<title>`, `<desc>`, any `<text>`, `aria-label`s and comments. None of it is
 * sent to a generator any more, but it is committed next to the art and it is
 * what the drawing says it is.
 */
export function svgTextFields(svg: string): Record<string, string> {
  const fields: Record<string, string> = {};
  const add = (kind: string, value: string): void => {
    const text = value
      .replace(/<[^>]*>/g, ' ')
      .replace(/\s+/g, ' ')
      .trim();
    if (!text) return;
    let n = 0;
    while (fields[`svg ${kind}${n === 0 ? '' : ` ${n + 1}`}`] !== undefined) n++;
    fields[`svg ${kind}${n === 0 ? '' : ` ${n + 1}`}`] = text;
  };
  for (const [, body] of svg.matchAll(/<title\b[^>]*>([\s\S]*?)<\/title>/gi)) add('title', body!);
  for (const [, body] of svg.matchAll(/<desc\b[^>]*>([\s\S]*?)<\/desc>/gi)) add('desc', body!);
  for (const [, body] of svg.matchAll(/<text\b[^>]*>([\s\S]*?)<\/text>/gi)) add('text', body!);
  for (const [, body] of svg.matchAll(/<!--([\s\S]*?)-->/g)) add('comment', body!);
  for (const [, , body] of svg.matchAll(/\baria-label\s*=\s*(["'])([\s\S]*?)\1/gi)) add('aria-label', body!);
  return fields;
}

async function renderAt(svg: Buffer, density: number): Promise<Bitmap> {
  const { data, info } = await sharp(svg, { density })
    .ensureAlpha()
    .raw()
    .toBuffer({ resolveWithObject: true });
  return { data, width: info.width, height: info.height };
}

/**
 * Downsample an RGBA bitmap by an integer factor: alpha is the block's area
 * average (true coverage, so the silhouette edge lands where the vector's
 * does), colour is the block's dominant colour weighted by alpha.
 *
 * Colour is not averaged because flat fills are categories, not signals.
 * Averaging a paper/shadow boundary invents a mid-tone the author never drew,
 * and CONFORM then quantises that blend to whatever palette entry happens to
 * sit between them — measured on the first school-age player: 66 pixels of
 * school-light (the pickups' colour, law 10) and a scatter of act tones along
 * every interior edge. Taking the dominant colour keeps each output pixel one
 * of the colours actually in the drawing, and CHECK still sees whatever the
 * author did draw, off-palette or not. Pixels past the source edge count as
 * transparent.
 */
export function boxDownsample(src: Bitmap, factor: number): Bitmap {
  const width = Math.ceil(src.width / factor);
  const height = Math.ceil(src.height / factor);
  const out = blank(width, height);
  const area = factor * factor;
  const weights = new Map<number, number>();
  for (let oy = 0; oy < height; oy++) {
    for (let ox = 0; ox < width; ox++) {
      let a = 0;
      weights.clear();
      for (let dy = 0; dy < factor; dy++) {
        const y = oy * factor + dy;
        if (y >= src.height) break;
        for (let dx = 0; dx < factor; dx++) {
          const x = ox * factor + dx;
          if (x >= src.width) break;
          const i = index(src, x, y);
          const alpha = src.data[i + 3]!;
          if (alpha === 0) continue;
          a += alpha;
          const key = (src.data[i]! << 16) | (src.data[i + 1]! << 8) | src.data[i + 2]!;
          weights.set(key, (weights.get(key) ?? 0) + alpha);
        }
      }
      if (a === 0) continue;
      let best = -1;
      let bestWeight = -1;
      for (const [key, w] of weights) {
        // Ties go to the lower key, so the result never depends on scan order.
        if (w > bestWeight || (w === bestWeight && key < best)) {
          best = key;
          bestWeight = w;
        }
      }
      const o = index(out, ox, oy);
      out.data[o] = (best >> 16) & 255;
      out.data[o + 1] = (best >> 8) & 255;
      out.data[o + 2] = best & 255;
      out.data[o + 3] = Math.round(a / area);
    }
  }
  return out;
}

export interface Rasterised {
  bitmap: Bitmap;
  /** The density the final render used (dpi; 72 is the SVG's own units). */
  density: number;
  /** Long side the trimmed subject was fitted to: targetSize − 2·outline. */
  inner: number;
  /**
   * Whether the render landed exactly on `inner`. If it did not, CONFORM's
   * nearest-neighbour resize does the last pixel of scaling — correct, just
   * not free of the resampling artefacts this stage exists to avoid.
   */
  fitted: boolean;
}

/**
 * Render an SVG so that its trimmed content is exactly the size CONFORM will
 * scale it to, supersampled and area-averaged.
 *
 * 1. Render once at SUPERSAMPLE × targetSize on the canvas's long side and
 *    measure the trimmed content.
 * 2. Re-render at the density that puts the content's long side in
 *    [S·inner − (S−1), S·inner] — the band whose ceil(L/S) is exactly `inner`.
 *    Rasterisation is not perfectly linear in density, so measure and correct
 *    a few times; it converges in one or two.
 * 3. Crop to the content and downsample by S (area-average alpha, dominant
 *    colour — see `boxDownsample`).
 */
export async function rasteriseSvgBuffer(svg: Buffer, targetSize: number): Promise<Rasterised> {
  const meta = await sharp(svg).metadata();
  if (!meta.width || !meta.height) throw new Error('SVG has no measurable canvas (width/height or viewBox)');
  const S = SUPERSAMPLE;
  const inner = targetSize - outlineWidthFor(targetSize) * 2;
  const lo = S * inner - (S - 1);
  const hi = S * inner;
  const goal = (lo + hi) / 2;

  let density = (72 * S * targetSize) / Math.max(meta.width, meta.height);
  let render = await renderAt(svg, density);
  let bounds = opaqueBounds(render, MEASURE_ALPHA);
  if (!bounds) throw new Error('SVG renders nothing opaque');

  let fitted = false;
  for (let attempt = 0; attempt < 8; attempt++) {
    const long = Math.max(bounds.right - bounds.left + 1, bounds.bottom - bounds.top + 1);
    if (long >= lo && long <= hi) {
      fitted = true;
      break;
    }
    density *= goal / long;
    render = await renderAt(svg, density);
    bounds = opaqueBounds(render, MEASURE_ALPHA);
    if (!bounds) throw new Error('SVG renders nothing opaque at the fitted density');
  }

  const bitmap = boxDownsample(crop(render, bounds), S);
  return { bitmap, density, inner, fitted };
}

/** Rasterise the SVG at `path` for `spec`. See `rasteriseSvgBuffer`. */
export async function rasteriseSvg(path: string, spec: Pick<AssetSpec, 'targetSize'>): Promise<Bitmap> {
  return (await rasteriseSvgBuffer(readFileSync(path), spec.targetSize)).bitmap;
}

/** The rasteriser, as provenance records it. */
export function rasteriserVersion(): string {
  const v = sharp.versions as Record<string, string | undefined>;
  return `sharp ${v['sharp'] ?? '?'} (libvips ${v['vips'] ?? '?'}, librsvg ${v['rsvg'] ?? '?'})`;
}

/** The SVG hash a provenance file recorded, or null if it recorded none. */
export function recordedSvgSha(markdown: string): string | null {
  return /\*\*SVG sha256:\*\* `([0-9a-f]{64})`/.exec(markdown)?.[1] ?? null;
}
