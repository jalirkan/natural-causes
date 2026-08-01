import { CHANNELS, centreOn, crop, index, opaqueBounds, type Bitmap } from './bitmap';
import { oklabDistance, rgbToOklab, type Oklab } from './palette';

/**
 * Stage 2 — CUT. Background removal, alpha trim, centre on canvas.
 *
 * The generator is asked for a plain solid background in a colour that is not
 * in the palette (see batch.ts), so removal is a flood fill from the borders
 * rather than a model call. Two reasons that is the right trade: it costs
 * nothing per asset and it is deterministic, so a rerun of the pipeline on the
 * same raw image produces the same cut. A background-removal API is neither.
 *
 * The fill is seeded from the image edge and constrained to connected regions,
 * so a subject that happens to contain the background colour internally keeps
 * it — which a naive "replace all pixels near this colour" pass would eat.
 */

export interface CutOptions {
  /** Oklab distance at which a border-connected pixel counts as background. */
  tolerance?: number;
  /** Tighter tolerance for the anti-aliased halo left behind by the fill. */
  haloTolerance?: number;
  /** Passes of halo cleanup. Each one peels a ring of blended pixels. */
  haloPasses?: number;
  /** How far a shadow's hue may drift from the background's, in radians. */
  shadowHueTolerance?: number;
  /** How much darker than the background a shadow may be. */
  shadowDepth?: number;
  /** Fraction of the output canvas left as padding around the subject. */
  padding?: number;
}

const DEFAULTS: Required<CutOptions> = {
  tolerance: 0.14,
  haloTolerance: 0.22,
  haloPasses: 3,
  shadowHueTolerance: 0.35,
  shadowDepth: 0.45,
  padding: 0.06,
};

/** The dominant border colour, taken as the median of the image's edge ring. */
export function detectBackground(bmp: Bitmap): [number, number, number] {
  const rs: number[] = [];
  const gs: number[] = [];
  const bs: number[] = [];
  const sample = (x: number, y: number) => {
    const i = index(bmp, x, y);
    rs.push(bmp.data[i]!);
    gs.push(bmp.data[i + 1]!);
    bs.push(bmp.data[i + 2]!);
  };
  for (let x = 0; x < bmp.width; x++) {
    sample(x, 0);
    sample(x, bmp.height - 1);
  }
  for (let y = 0; y < bmp.height; y++) {
    sample(0, y);
    sample(bmp.width - 1, y);
  }
  const median = (xs: number[]) => xs.sort((a, b) => a - b)[Math.floor(xs.length / 2)]!;
  return [median(rs), median(gs), median(bs)];
}

/** Removes the border-connected background, in place. Returns pixels cleared. */
export function keyOutBackground(bmp: Bitmap, options: CutOptions = {}): number {
  const opts = { ...DEFAULTS, ...options };
  const [br, bg, bb] = detectBackground(bmp);
  const bgLab = rgbToOklab(br, bg, bb);

  const isBackground = (i: number, tolerance: number): boolean => {
    if (bmp.data[i + 3] === 0) return false;
    const lab = rgbToOklab(bmp.data[i]!, bmp.data[i + 1]!, bmp.data[i + 2]!);
    return oklabDistance(lab, bgLab) <= tolerance;
  };

  // Flood fill from every border pixel. Explicit stack: a 1024x1024 image
  // will blow the call stack with recursion.
  const seen = new Uint8Array(bmp.width * bmp.height);
  const stack: number[] = [];
  const push = (x: number, y: number) => {
    if (x < 0 || y < 0 || x >= bmp.width || y >= bmp.height) return;
    const p = y * bmp.width + x;
    if (seen[p]) return;
    seen[p] = 1;
    stack.push(p);
  };

  for (let x = 0; x < bmp.width; x++) {
    push(x, 0);
    push(x, bmp.height - 1);
  }
  for (let y = 0; y < bmp.height; y++) {
    push(0, y);
    push(bmp.width - 1, y);
  }

  let cleared = 0;
  while (stack.length > 0) {
    const p = stack.pop()!;
    const i = p * CHANNELS;
    if (!isBackground(i, opts.tolerance)) continue;
    bmp.data[i + 3] = 0;
    cleared++;
    const x = p % bmp.width;
    const y = (p / bmp.width) | 0;
    push(x - 1, y);
    push(x + 1, y);
    push(x, y - 1);
    push(x, y + 1);
  }

  // Cast shadows. The generator draws them however firmly the prompt asks it
  // not to, and they are connected to the subject, so the plain fill above
  // leaves them attached — the outline pass then wraps the sprite AND its
  // shadow in one ink ring, which is what put a dark ellipse under the Egg.
  //
  // A cast shadow is the backdrop at lower lightness: same hue, darker. That
  // is a precise enough description to key on. Crucially this pass is seeded
  // only from pixels already cleared, so it can eat a shadow reachable from
  // outside the subject and cannot reach a same-hued region enclosed by it —
  // the Egg's own pink band is safe because the egg surrounds it.
  {
    const shadowStack: number[] = [];
    const shadowSeen = new Uint8Array(bmp.width * bmp.height);
    const pushShadow = (x: number, y: number) => {
      if (x < 0 || y < 0 || x >= bmp.width || y >= bmp.height) return;
      const p = y * bmp.width + x;
      if (shadowSeen[p]) return;
      shadowSeen[p] = 1;
      shadowStack.push(p);
    };

    for (let y = 0; y < bmp.height; y++) {
      for (let x = 0; x < bmp.width; x++) {
        if (bmp.data[index(bmp, x, y) + 3] === 0) {
          pushShadow(x - 1, y);
          pushShadow(x + 1, y);
          pushShadow(x, y - 1);
          pushShadow(x, y + 1);
        }
      }
    }

    while (shadowStack.length > 0) {
      const p = shadowStack.pop()!;
      const i = p * CHANNELS;
      if (bmp.data[i + 3] === 0) continue;
      const lab = rgbToOklab(bmp.data[i]!, bmp.data[i + 1]!, bmp.data[i + 2]!);
      const darker = lab.L < bgLab.L && bgLab.L - lab.L <= opts.shadowDepth;
      if (!darker || !sameHueAsBackground(lab, bgLab, opts.shadowHueTolerance)) continue;
      bmp.data[i + 3] = 0;
      cleared++;
      const x = p % bmp.width;
      const y = (p / bmp.width) | 0;
      pushShadow(x - 1, y);
      pushShadow(x + 1, y);
      pushShadow(x, y - 1);
      pushShadow(x, y + 1);
    }
  }

  // Peel the anti-aliased ring the fill leaves behind. Without this the halo
  // survives to the quantiser, which snaps it to whichever palette colour is
  // nearest to "slightly magenta" — a bright fringe on every sprite.
  for (let pass = 0; pass < opts.haloPasses; pass++) {
    const doomed: number[] = [];
    for (let y = 0; y < bmp.height; y++) {
      for (let x = 0; x < bmp.width; x++) {
        const i = index(bmp, x, y);
        if (bmp.data[i + 3] === 0) continue;
        const touchesCleared =
          (x > 0 && bmp.data[i - CHANNELS + 3] === 0) ||
          (x < bmp.width - 1 && bmp.data[i + CHANNELS + 3] === 0) ||
          (y > 0 && bmp.data[i - bmp.width * CHANNELS + 3] === 0) ||
          (y < bmp.height - 1 && bmp.data[i + bmp.width * CHANNELS + 3] === 0);
        if (touchesCleared && isBackground(i, opts.haloTolerance)) doomed.push(i);
      }
    }
    if (doomed.length === 0) break;
    for (const i of doomed) {
      bmp.data[i + 3] = 0;
      cleared++;
    }
  }

  return cleared;
}

/**
 * Whether a colour is the background hue at some other lightness.
 *
 * Compared by HUE ANGLE, not by (a, b) distance. Oklab chroma shrinks as
 * lightness falls, so a darkened saturated backdrop moves a long way in (a, b)
 * while staying the same colour — an absolute chroma-distance test misses
 * exactly the shadows it is meant to catch. The angle is invariant to that.
 *
 * When the backdrop is near-neutral its hue angle is noise, so the test falls
 * back to requiring the candidate be near-neutral too.
 */
export function sameHueAsBackground(lab: Oklab, bg: Oklab, tolerance: number): boolean {
  const NEUTRAL = 0.02;
  const bgChroma = Math.hypot(bg.a, bg.b);
  const chroma = Math.hypot(lab.a, lab.b);

  if (bgChroma < NEUTRAL) return chroma < NEUTRAL * 2;
  // A shadow keeps the backdrop's hue; it does not become grey or invert.
  if (chroma < bgChroma * 0.25) return false;

  const diff = Math.abs(Math.atan2(lab.b, lab.a) - Math.atan2(bg.b, bg.a));
  return Math.min(diff, Math.PI * 2 - diff) <= tolerance;
}

export class CutError extends Error {}

/**
 * Full CUT stage: key out the background, trim to the subject, centre it on a
 * square canvas with uniform padding.
 */
export function cut(input: Bitmap, options: CutOptions = {}): Bitmap {
  const opts = { ...DEFAULTS, ...options };
  const bmp: Bitmap = { data: Buffer.from(input.data), width: input.width, height: input.height };

  keyOutBackground(bmp, opts);

  const bounds = opaqueBounds(bmp);
  if (!bounds) throw new CutError('background removal left nothing — the whole image keyed out');

  const subject = crop(bmp, bounds);
  const longest = Math.max(subject.width, subject.height);
  const canvas = Math.ceil(longest / (1 - 2 * opts.padding));
  return centreOn(subject, canvas);
}
