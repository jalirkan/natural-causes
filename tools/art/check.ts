import { CHANNELS, index, opaqueBounds, opaqueCount, resizeSmooth, type Bitmap } from './bitmap';
import {
  actBackground,
  actPalette,
  distanceToPalette,
  lightness,
  nearest,
  rgbToOklab,
  type ActId,
} from './palette';
import { GRAIN_AMPLITUDE } from './texture';

/**
 * Stage 5 — CHECK. Mechanical rejection.
 *
 * This is the stage that makes the run unattended (D-005). A failed asset is
 * regenerated with a mutated seed; it is never escalated to a human and never
 * hand-corrected. Everything that survives is in-style by construction.
 *
 * Every check reports the number it measured, not just a verdict, because the
 * thresholds here are guesses until the test batch says otherwise and the
 * measurements are what will correct them.
 */

/** Gameplay size. Law 7: authored to be recognisable here, not at 1024px. */
export const GAMEPLAY_PX = 48;

export interface CheckResult {
  name: string;
  pass: boolean;
  measured: number;
  expected: string;
  note?: string;
}

export interface CheckReport {
  pass: boolean;
  results: CheckResult[];
  failures: string[];
}

export interface CheckThresholds {
  /** Opaque fraction of the canvas. Too low reads as a speck, too high as a slab. */
  minCoverage: number;
  maxCoverage: number;
  /** Minimum mean Oklab lightness separation from the act background. */
  minContrast: number;
  /** Max fraction of the sprite allowed to sit within minContrast of the background. */
  maxLowContrastFraction: number;
  /** Distinct palette colours the sprite must actually use. */
  minDistinctColours: number;
  /** No single colour may exceed this share of the sprite. */
  maxSingleColourShare: number;
  /** Edge density at 48px — the proxy for "features survive to gameplay size". */
  minEdgeDensity48: number;
}

export const DEFAULT_THRESHOLDS: CheckThresholds = {
  minCoverage: 0.12,
  maxCoverage: 0.82,
  minContrast: 0.12,
  maxLowContrastFraction: 0.4,
  minDistinctColours: 3,
  maxSingleColourShare: 0.9,
  minEdgeDensity48: 0.06,
};

/** Bosses are meant to fill the frame; the coverage band has to allow it. */
export const BOSS_THRESHOLDS: CheckThresholds = {
  ...DEFAULT_THRESHOLDS,
  minCoverage: 0.25,
  maxCoverage: 0.95,
};

function paletteHistogram(bmp: Bitmap, act: ActId): Map<string, number> {
  const palette = actPalette(act);
  const hist = new Map<string, number>();
  const cache = new Map<number, string>();
  for (let i = 0; i < bmp.data.length; i += CHANNELS) {
    if (bmp.data[i + 3] === 0) continue;
    const r = bmp.data[i]!;
    const g = bmp.data[i + 1]!;
    const b = bmp.data[i + 2]!;
    const key = (r << 16) | (g << 8) | b;
    let name = cache.get(key);
    if (!name) {
      name = nearest(palette, r, g, b).name;
      cache.set(key, name);
    }
    hist.set(name, (hist.get(name) ?? 0) + 1);
  }
  return hist;
}

/**
 * Fraction of pixels at 48px whose colour differs materially from a
 * neighbour. A sprite that survives downscaling as a flat blob scores near
 * zero here, which is precisely the "unreadable in a crowd" failure.
 */
function edgeDensity(bmp: Bitmap): number {
  let edges = 0;
  let counted = 0;
  for (let y = 0; y < bmp.height - 1; y++) {
    for (let x = 0; x < bmp.width - 1; x++) {
      const i = index(bmp, x, y);
      if (bmp.data[i + 3]! < 128) continue;
      counted++;
      const right = index(bmp, x + 1, y);
      const down = index(bmp, x, y + 1);
      const here = rgbToOklab(bmp.data[i]!, bmp.data[i + 1]!, bmp.data[i + 2]!);
      for (const j of [right, down]) {
        if (bmp.data[j + 3]! < 128) {
          edges++;
          break;
        }
        const other = rgbToOklab(bmp.data[j]!, bmp.data[j + 1]!, bmp.data[j + 2]!);
        if (Math.abs(here.L - other.L) > 0.12) {
          edges++;
          break;
        }
      }
    }
  }
  return counted === 0 ? 0 : edges / counted;
}

export async function check(
  bmp: Bitmap,
  act: ActId,
  thresholds: CheckThresholds = DEFAULT_THRESHOLDS,
): Promise<CheckReport> {
  const results: CheckResult[] = [];
  const total = bmp.width * bmp.height;
  const opaque = opaqueCount(bmp);
  const bg = actBackground(act);
  const bgL = lightness(bg);

  // 1. Silhouette area.
  const coverage = opaque / total;
  results.push({
    name: 'silhouette-area',
    pass: coverage >= thresholds.minCoverage && coverage <= thresholds.maxCoverage,
    measured: +coverage.toFixed(4),
    expected: `${thresholds.minCoverage}–${thresholds.maxCoverage} of canvas`,
  });

  // 2. Contrast against the act background.
  //
  // MEDIAN separation, not mean. The mean is actively wrong here: a sprite
  // that is half black outline and half bone averages to mid-grey, so
  // |mean(L) - bg.L| reports near-zero against a mid-tone background for a
  // sprite that in fact has excellent contrast. The first test batch failed
  // the drone four times on exactly that, which is what the measured numbers
  // are in the report for.
  const diffs: number[] = [];
  let lowContrast = 0;
  for (let i = 0; i < bmp.data.length; i += CHANNELS) {
    if (bmp.data[i + 3] === 0) continue;
    const d = Math.abs(rgbToOklab(bmp.data[i]!, bmp.data[i + 1]!, bmp.data[i + 2]!).L - bgL);
    diffs.push(d);
    if (d < thresholds.minContrast) lowContrast++;
  }
  diffs.sort((a, b) => a - b);
  const contrast = diffs.length === 0 ? 0 : diffs[Math.floor(diffs.length / 2)]!;
  results.push({
    name: 'background-contrast',
    pass: contrast >= thresholds.minContrast,
    measured: +contrast.toFixed(4),
    expected: `>= ${thresholds.minContrast} median Oklab L from ${bg.name}`,
  });

  const lowFraction = opaque === 0 ? 1 : lowContrast / opaque;
  results.push({
    name: 'background-contrast-coverage',
    pass: lowFraction <= thresholds.maxLowContrastFraction,
    measured: +lowFraction.toFixed(4),
    expected: `<= ${thresholds.maxLowContrastFraction} of sprite may vanish into ${bg.name}`,
    note: 'a sprite can average acceptable contrast while a whole limb disappears',
  });

  // 3. Palette conformance. Tolerant of exactly the grain amplitude and no
  //    more, so TEXTURE stays legal and a rogue colour still fails.
  const palette = actPalette(act);
  const tolerance = distanceToleranceFor(GRAIN_AMPLITUDE);
  let worst = 0;
  for (let i = 0; i < bmp.data.length; i += CHANNELS) {
    if (bmp.data[i + 3] === 0) continue;
    const d = distanceToPalette(palette, bmp.data[i]!, bmp.data[i + 1]!, bmp.data[i + 2]!);
    if (d > worst) worst = d;
  }
  results.push({
    name: 'palette-conformance',
    pass: worst <= tolerance,
    measured: +worst.toFixed(4),
    expected: `<= ${tolerance.toFixed(4)} Oklab from a palette entry`,
  });

  const hist = paletteHistogram(bmp, act);
  results.push({
    name: 'palette-variety',
    pass: hist.size >= thresholds.minDistinctColours,
    measured: hist.size,
    expected: `>= ${thresholds.minDistinctColours} distinct palette colours`,
  });

  const dominant = Math.max(0, ...hist.values()) / Math.max(1, opaque);
  results.push({
    name: 'palette-dominance',
    pass: dominant <= thresholds.maxSingleColourShare,
    measured: +dominant.toFixed(4),
    expected: `no colour above ${thresholds.maxSingleColourShare} of the sprite`,
  });

  // 4. Readability at gameplay size.
  const small = await resizeSmooth(bmp, GAMEPLAY_PX, GAMEPLAY_PX);
  const smallBounds = opaqueBounds(small, 96);
  const smallCoverage = opaqueCount(small, 96) / (GAMEPLAY_PX * GAMEPLAY_PX);
  results.push({
    name: 'readable-48px-silhouette',
    pass: smallBounds !== null && smallCoverage >= thresholds.minCoverage * 0.7,
    measured: +smallCoverage.toFixed(4),
    expected: `>= ${(thresholds.minCoverage * 0.7).toFixed(3)} coverage at ${GAMEPLAY_PX}px`,
  });

  const density = edgeDensity(small);
  results.push({
    name: 'readable-48px-detail',
    pass: density >= thresholds.minEdgeDensity48,
    measured: +density.toFixed(4),
    expected: `>= ${thresholds.minEdgeDensity48} edge density at ${GAMEPLAY_PX}px`,
    note: 'below this the sprite has collapsed to a featureless blob in a crowd',
  });

  const failures = results.filter((r) => !r.pass).map((r) => `${r.name} (${r.measured})`);
  return { pass: failures.length === 0, results, failures };
}

/**
 * Oklab distance corresponding to a per-channel RGB deviation, measured at
 * mid-grey where the sRGB curve is shallowest and the deviation is largest.
 */
export function distanceToleranceFor(amplitude: number): number {
  const base = rgbToOklab(128, 128, 128);
  const shifted = rgbToOklab(128 + amplitude, 128 + amplitude, 128 + amplitude);
  return Math.hypot(base.L - shifted.L, base.a - shifted.a, base.b - shifted.b) * 1.5;
}
