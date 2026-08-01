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

/**
 * The dominant colour of a ring `inset` pixels in from the edge.
 *
 * `inset` exists because the mid-century register makes the generator draw
 * framed posters: a dark rule right around the image. The frame is the border
 * ring, so a fill seeded there stops instantly and the entire poster survives
 * as one solid rectangle — which is what the Reorg came back as.
 */
export function detectBackground(bmp: Bitmap, inset = 0): [number, number, number] {
  const rs: number[] = [];
  const gs: number[] = [];
  const bs: number[] = [];
  const sample = (x: number, y: number) => {
    if (x < 0 || y < 0 || x >= bmp.width || y >= bmp.height) return;
    const i = index(bmp, x, y);
    rs.push(bmp.data[i]!);
    gs.push(bmp.data[i + 1]!);
    bs.push(bmp.data[i + 2]!);
  };
  for (let x = inset; x < bmp.width - inset; x++) {
    sample(x, inset);
    sample(x, bmp.height - 1 - inset);
  }
  for (let y = inset; y < bmp.height - inset; y++) {
    sample(inset, y);
    sample(bmp.width - 1 - inset, y);
  }
  const median = (xs: number[]) => xs.sort((a, b) => a - b)[Math.floor(xs.length / 2)]!;
  return [median(rs), median(gs), median(bs)];
}

/**
 * Removes the background connected to a ring `inset` pixels in from the edge.
 *
 * Returns pixels cleared. Callers should prefer `keyOutBackground`, which
 * handles the framed case by trying more than one inset.
 */
export function keyOutBackgroundAt(bmp: Bitmap, inset: number, options: CutOptions = {}): number {
  const opts = { ...DEFAULTS, ...options };
  const [br, bg, bb] = detectBackground(bmp, inset);
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

  for (let x = inset; x < bmp.width - inset; x++) {
    push(x, inset);
    push(x, bmp.height - 1 - inset);
  }
  for (let y = inset; y < bmp.height - inset; y++) {
    push(inset, y);
    push(bmp.width - 1 - inset, y);
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
 * Did the fill actually reach the corners?
 *
 * This is the test for "was the flood blocked", and it is deliberately not a
 * test on cleared AREA. Area cannot tell a thin frame apart from a boss that
 * genuinely fills the frame, and getting that backwards is destructive: the
 * retry would re-seed from a ring lying inside the sprite and key out the
 * subject itself.
 *
 * Every prompt asks for the subject centred with margin around it, so the
 * corners are background in every well-formed generation. If they did not
 * clear, something at the edge stopped the fill.
 */
function cornersCleared(bmp: Bitmap): number {
  const ix = Math.max(1, Math.round(bmp.width * 0.05));
  const iy = Math.max(1, Math.round(bmp.height * 0.05));
  const probes: Array<[number, number]> = [
    [ix, iy],
    [bmp.width - 1 - ix, iy],
    [ix, bmp.height - 1 - iy],
    [bmp.width - 1 - ix, bmp.height - 1 - iy],
  ];
  return probes.filter(([x, y]) => bmp.data[index(bmp, x, y) + 3] === 0).length;
}

/**
 * Removes the background, coping with a drawn frame around the image.
 *
 * Tries the edge first, which is right for an unframed image and cheapest. If
 * the corners did not clear, the border ring was not background — it was a
 * rule drawn around a poster — so it retries from further in. Alpha is
 * restored between attempts, so a failed pass leaves no partial cut behind.
 */
export function keyOutBackground(bmp: Bitmap, options: CutOptions = {}): number {
  const total = bmp.width * bmp.height;
  const alpha = new Uint8Array(total);
  for (let p = 0; p < total; p++) alpha[p] = bmp.data[p * CHANNELS + 3]!;
  const restore = () => {
    for (let p = 0; p < total; p++) bmp.data[p * CHANNELS + 3] = alpha[p]!;
  };

  const short = Math.min(bmp.width, bmp.height);
  const insets = [0, Math.max(2, Math.round(short * 0.02)), Math.max(4, Math.round(short * 0.05))];

  let bestCleared = 0;
  let bestInset = 0;
  for (const inset of insets) {
    const cleared = keyOutBackgroundAt(bmp, inset, options);
    if (cornersCleared(bmp) >= 3) return cleared + clearOutside(bmp, inset);
    if (cleared > bestCleared) {
      bestCleared = cleared;
      bestInset = inset;
    }
    restore();
  }

  // Nothing reached the corners. Fall back to whichever attempt cleared most,
  // and let the CHECK stage reject the asset if the result is unusable —
  // that is what the regeneration loop is for.
  const cleared = keyOutBackgroundAt(bmp, bestInset, options);
  return cleared + clearOutside(bmp, bestInset);
}

/**
 * Clears the band outside an inset boundary.
 *
 * Only called when an inset was actually needed, which means the band is the
 * frame that blocked the fill. Leaving it behind would keep the sprite's
 * bounding box at the full image size and wrap the outline pass around a
 * rectangle. Every prompt puts the subject centred with margin, so nothing
 * real lives in the outer few percent.
 */
function clearOutside(bmp: Bitmap, inset: number): number {
  if (inset <= 0) return 0;
  let cleared = 0;
  for (let y = 0; y < bmp.height; y++) {
    const edgeRow = y < inset || y >= bmp.height - inset;
    for (let x = 0; x < bmp.width; x++) {
      if (!edgeRow && x >= inset && x < bmp.width - inset) continue;
      const i = index(bmp, x, y);
      if (bmp.data[i + 3] === 0) continue;
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
