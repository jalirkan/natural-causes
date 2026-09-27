import { CHANNELS, index, opaqueBounds, opaqueCount, resizeSmooth, type Bitmap } from './bitmap';
import {
  BONE,
  INK,
  PAPER,
  THREAT,
  actBackground,
  actLight,
  actPalette,
  distanceToPalette,
  lightness,
  nearest,
  rgbToOklab,
  type ActId,
  type Colour,
  type ThreatClass,
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
  /**
   * Where the sprite will actually sit. `field` (default) checks contrast
   * against the act background and enforces the enemy value ceiling; `card`
   * checks against INK — the offer cards' surface — and skips the ceiling,
   * because UI art may legally wear paper.
   */
  surface?: 'field' | 'card';
  /**
   * Distinct palette colours still present at 48px (D-018).
   *
   * This is the check that enforces the detail budget. An asset authored with
   * the full register's fine line and halftone looks superb at 1024px and
   * arrives in play as a pale smudge — two colours where there were six. The
   * sprite has to carry its structure at the size it is actually seen, not at
   * the size it was generated.
   */
  minDistinctColours48: number;
  /**
   * Whether the enemy value ceiling (G-032) applies. Default true on the
   * field. False for the player only: law 10 gives paper to the player, and
   * the ceiling exists to keep everything else below it — applying it to the
   * player rejects the one sprite the law says must wear paper.
   */
  valueCeiling?: boolean;
}

export const DEFAULT_THRESHOLDS: CheckThresholds = {
  minCoverage: 0.12,
  maxCoverage: 0.82,
  minContrast: 0.12,
  maxLowContrastFraction: 0.4,
  minDistinctColours: 3,
  maxSingleColourShare: 0.9,
  minEdgeDensity48: 0.06,
  minDistinctColours48: 3,
};

/** Bosses are meant to fill the frame; the coverage band has to allow it. */
export const BOSS_THRESHOLDS: CheckThresholds = {
  ...DEFAULT_THRESHOLDS,
  minCoverage: 0.25,
  maxCoverage: 0.95,
};

/**
 * Swarm-tier thresholds, per the detail budget (D-018).
 *
 * The colour-count floors were calibrated against the original toony style,
 * where every sprite had a body, a shadow tone and features. D-018 then asked
 * swarm assets for the opposite — "bold flat shapes, large uninterrupted
 * areas of flat colour, very few interior details" — and the two rules
 * contradict each other. CONCEPTION-ROSTER §3.2 makes it concrete: the
 * spermicide is specified as flat red with *no interior detail whatsoever*,
 * which is one fill plus the ink outline. Two colours is the correct answer
 * for that asset, and a check demanding three was rejecting the design.
 *
 * What is NOT relaxed: silhouette area, background contrast, and edge density
 * at 48px. Those are the checks that actually catch an unreadable sprite. A
 * flat two-tone shape with a strong outline is exactly what reads in a crowd —
 * colour count was never the property worth measuring here.
 */
export const SWARM_THRESHOLDS: CheckThresholds = {
  ...DEFAULT_THRESHOLDS,
  minDistinctColours: 2,
  maxSingleColourShare: 0.97,
  minDistinctColours48: 2,
};

/**
 * The player: swarm-scale on the field, and the one field sprite the value
 * ceiling does not bind (law 10, G-012). Found when the first authored
 * school-age player failed `enemy-value-ceiling` at exactly paper's
 * lightness; `player-sperm` predates G-032's ceiling and was never re-run
 * against it.
 */
export const PLAYER_THRESHOLDS: CheckThresholds = {
  ...SWARM_THRESHOLDS,
  valueCeiling: false,
};

/**
 * Item icons: card-surface UI art. Small objects with real negative space
 * (a manicule, an umbrella), so the coverage floor drops; two palette
 * colours plus ink is a legitimate mid-century pictogram.
 */
export const ICON_THRESHOLDS: CheckThresholds = {
  ...DEFAULT_THRESHOLDS,
  minCoverage: 0.1,
  maxCoverage: 0.8,
  minDistinctColours: 2,
  maxSingleColourShare: 0.97,
  minDistinctColours48: 2,
  surface: 'card',
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
  // Card-surface art is read against the offer cards' ink, not the field.
  const bg = thresholds.surface === 'card' ? INK : actBackground(act);
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

  const smallHist = paletteHistogram(small, act);
  // Ignore colours clinging on as a handful of anti-aliased pixels; they are
  // present in the histogram but invisible to a player.
  const smallOpaque = Math.max(1, opaqueCount(small, 96));
  const survivingColours = [...smallHist.values()].filter((n) => n / smallOpaque >= 0.02).length;
  results.push({
    name: 'readable-48px-structure',
    pass: survivingColours >= thresholds.minDistinctColours48,
    measured: survivingColours,
    expected: `>= ${thresholds.minDistinctColours48} palette colours still visible at ${GAMEPLAY_PX}px`,
    note: 'D-018: an asset that only reads at the size it was generated has failed',
  });

  // 5. Value ceiling (G-032). Replaces render tinting: the sprite must arrive
  //    dark enough on its own rather than being darkened on the GPU, because
  //    a GPU multiply is invisible to every other check in this function.
  //    Field art only — the ceiling exists so the player is the lightest
  //    thing on the FIELD, and card art never reaches the field.
  if (thresholds.surface !== 'card' && thresholds.valueCeiling !== false) {
  let brightest = 0;
  for (let i = 0; i < bmp.data.length; i += CHANNELS) {
    if (bmp.data[i + 3] === 0) continue;
    const L = rgbToOklab(bmp.data[i]!, bmp.data[i + 1]!, bmp.data[i + 2]!).L;
    if (L > brightest) brightest = L;
  }
  results.push({
    name: 'enemy-value-ceiling',
    pass: brightest <= MAX_ENEMY_LIGHTNESS,
    measured: +brightest.toFixed(4),
    expected: `<= ${MAX_ENEMY_LIGHTNESS.toFixed(3)} Oklab L (bone); paper belongs to the player`,
    note: 'law 10 — the player is the lightest thing on screen',
  });
  }

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
 * The brightest an enemy pixel may be (G-032).
 *
 * Derived from the palette rather than typed in: bone is the lightest colour
 * an enemy is allowed, paper belongs to the player alone (law 10), and the
 * gap between them is what stops an enemy competing with the player for
 * "lightest thing on screen" at horde density.
 *
 * This replaces render tinting. The tint field did two unrelated jobs — threat
 * colour and value correction — and value correction is a requirement, not a
 * post-process. A requirement belongs in CHECK, where failure regenerates with
 * a mutated seed through machinery D-005 already built.
 */
export const MAX_ENEMY_LIGHTNESS = (() => {
  // Bone plus the grain, because TEXTURE runs after CONFORM and lifts a bone
  // pixel above a bare bone ceiling. boss-egg failed four attempts at 0.8512
  // against 0.8395 for exactly this — the quantiser could not have produced
  // it, so the ceiling was rejecting the grain rather than the colour. Derived
  // from GRAIN_AMPLITUDE so the two cannot drift apart.
  const b = BONE.rgb;
  const lifted = rgbToOklab(
    Math.min(255, b[0] + GRAIN_AMPLITUDE),
    Math.min(255, b[1] + GRAIN_AMPLITUDE),
    Math.min(255, b[2] + GRAIN_AMPLITUDE),
  ).L;
  return lifted + 0.005;
})();

/**
 * Colours an enemy sprite may not contain, and who they belong to.
 *
 * Render tinting hid this: sprites were generated pale and darkened on the
 * GPU, so nobody looked at what the untinted pixels actually were. The
 * substitute turned out to carry paper, its act's light tone and two threat
 * colours it does not hold.
 */
export function reservedColourViolations(
  bmp: Bitmap,
  act: ActId,
  holdsThreat: ThreatClass[] = [],
): string[] {
  const tolerance = distanceToleranceFor(GRAIN_AMPLITUDE);
  const forbidden: Array<{ name: string; colour: Colour }> = [
    { name: 'paper (the player)', colour: PAPER },
  ];

  // The act's light tone is the pickups' (G-030) — but only if it is
  // distinguishable from a colour enemies ARE allowed. service-light #CFC3A0
  // and bone #D2C6AC are closer together than the quantiser's tolerance, so in
  // Service the check cannot tell a legal bone pixel from a reserved one and
  // would fail every enemy in the act for wearing bone. That is a palette
  // collision to be resolved in the palette, not a sprite defect to reject.
  const light = actLight(act);
  const lightLab = rgbToOklab(light.rgb[0], light.rgb[1], light.rgb[2]);
  const boneLab = rgbToOklab(BONE.rgb[0], BONE.rgb[1], BONE.rgb[2]);
  const lightIsDistinct =
    Math.hypot(lightLab.L - boneLab.L, lightLab.a - boneLab.a, lightLab.b - boneLab.b) > tolerance;
  if (lightIsDistinct) {
    forbidden.push({ name: `${act}-light (pickups)`, colour: light });
  }
  for (const [cls, colour] of Object.entries(THREAT) as Array<[ThreatClass, Colour]>) {
    if (!holdsThreat.includes(cls)) {
      forbidden.push({ name: `threat-${cls} (not held by this asset)`, colour });
    }
  }

  const found = new Set<string>();
  for (let i = 0; i < bmp.data.length; i += CHANNELS) {
    if (bmp.data[i + 3] === 0) continue;
    const lab = rgbToOklab(bmp.data[i]!, bmp.data[i + 1]!, bmp.data[i + 2]!);
    for (const f of forbidden) {
      const t = rgbToOklab(f.colour.rgb[0], f.colour.rgb[1], f.colour.rgb[2]);
      if (Math.hypot(lab.L - t.L, lab.a - t.a, lab.b - t.b) <= tolerance) found.add(f.name);
    }
  }
  return [...found];
}

/**
 * Law 10, enforced: no threat colour on a player or pickup frame.
 *
 * "Contact, ranged, elite and boss appear on things that will hurt the player
 * and on nothing else." This is the one law a single well-meaning "flash red
 * on hit" commit would quietly delete — and it had already been deleted in four
 * places by the time this check was written, all of them mine.
 *
 * Tolerant of exactly the grain amplitude, like palette conformance: a pixel
 * within the grain's reach of a threat colour IS that colour to a player.
 */
export function threatColourViolations(bmp: Bitmap): string[] {
  const tolerance = distanceToleranceFor(GRAIN_AMPLITUDE);
  const found = new Set<string>();
  for (let i = 0; i < bmp.data.length; i += CHANNELS) {
    if (bmp.data[i + 3] === 0) continue;
    const lab = rgbToOklab(bmp.data[i]!, bmp.data[i + 1]!, bmp.data[i + 2]!);
    for (const [name, colour] of Object.entries(THREAT)) {
      const t = rgbToOklab(colour.rgb[0], colour.rgb[1], colour.rgb[2]);
      if (Math.hypot(lab.L - t.L, lab.a - t.a, lab.b - t.b) <= tolerance) found.add(name);
    }
  }
  return [...found];
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
