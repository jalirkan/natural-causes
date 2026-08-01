/**
 * The locked palette (ART-DIRECTION.md law 3).
 *
 * Twenty colours, act tints included. Every asset is quantised to this after
 * generation; an asset that quantises badly is regenerated rather than
 * hand-corrected. Nothing outside this list may appear in a shipped sprite.
 *
 * PROVISIONAL. ART-DIRECTION.md is a draft until Justin has judged the test
 * batch, and these values are part of the hypothesis being tested, not a
 * settled decision. The structure is the point: one list, enforced in code.
 */

export interface Colour {
  readonly name: string;
  readonly hex: string;
  readonly rgb: readonly [number, number, number];
}

const c = (name: string, hex: string): Colour => ({
  name,
  hex,
  rgb: [
    parseInt(hex.slice(1, 3), 16),
    parseInt(hex.slice(3, 5), 16),
    parseInt(hex.slice(5, 7), 16),
  ] as const,
});

/**
 * Universal. Present in every act.
 *
 * INK is a warm near-black, not pure black. Pure black plus a heavy uniform
 * contour is the loudest "modern vector cartoon" signal there is, and it was
 * most of why the first test batch read as too toony — that outline was
 * imposed by this pipeline, not produced by the generator.
 *
 * PAPER is stock, not white: everything sits on printed paper now.
 */
export const INK = c('ink', '#2A2521');
export const SHADOW = c('shadow', '#6E6353');
export const PAPER = c('paper', '#EFE7D6');
export const BONE = c('bone', '#D2C6AC');

/**
 * Threat colours (law 6). These overlay the act palette and mean the same
 * thing in every act: colour carries threat, silhouette carries identity.
 */
export const THREAT = {
  contact: c('threat-contact', '#C4472E'),
  ranged: c('threat-ranged', '#D69A3C'),
  elite: c('threat-elite', '#7C5C8A'),
  boss: c('threat-boss', '#2F7370'),
} as const;

export type ThreatClass = keyof typeof THREAT;

/**
 * Act tints. Three tones each: deep doubles as the act's background.
 *
 * Spot inks on stock, not screen colours. Saturation is the other half of why
 * the first batch read as children's media — these are the same hues pulled
 * toward the muted, slightly dirty range that limited-run printing actually
 * produces.
 */
const ACT_TONES = {
  conception: [
    c('conception-deep', '#6B3A44'),
    c('conception-mid', '#A86A63'),
    c('conception-light', '#C99B8C'),
  ],
  school: [
    c('school-deep', '#3D5148'),
    c('school-mid', '#6B7F53'),
    c('school-light', '#9FA86B'),
  ],
  service: [
    c('service-deep', '#6E6248'),
    c('service-mid', '#A2946F'),
    c('service-light', '#CFC3A0'),
  ],
  office: [
    c('office-deep', '#3A4A5C'),
    c('office-mid', '#6B8299'),
    c('office-light', '#A8B7C4'),
  ],
} as const;

export type ActId = keyof typeof ACT_TONES;
export const ACT_IDS = Object.keys(ACT_TONES) as ActId[];

/** The act's background. Deep tone, so the palette stays at twenty. */
export function actBackground(act: ActId): Colour {
  return ACT_TONES[act][0];
}

/**
 * The act's light tone, which law 10 assigns to pickups (G-030).
 *
 * Threat colours to threats, paper to the player, this to pickups. Pickups are
 * then separated from the player by hue and from enemies by exclusivity, and
 * the rule costs nothing today because no enemy in either designed act uses
 * its act's light tone.
 *
 * Bone lost on two counts: it sits 0.03 above the luminance gap the enemy test
 * already enforces against the player, and it collides with the antibody's
 * bone junction tag — a small bone square on a grey Y reading as collectable
 * in an act where touching the wrong thing costs health.
 */
export function actLight(act: ActId): Colour {
  return ACT_TONES[act][2];
}

/**
 * The colours an asset in this act may use: the act's own tones, the
 * universal neutrals, and the threat colours. Restricting the quantiser per
 * act is most of what makes an act read as a place rather than a colour wheel.
 */
export function actPalette(act: ActId): Colour[] {
  return [INK, SHADOW, PAPER, BONE, ...ACT_TONES[act], ...Object.values(THREAT)];
}

/**
 * The colours an ENEMY may be quantised into (G-030, G-032).
 *
 * Paper is the player's and the act's light tone is the pickups', so neither
 * may appear on an enemy. They were still in the quantiser's palette, which
 * made the value ceiling unsatisfiable by construction: a light pixel snapped
 * to paper, CHECK rejected the sprite, and the regeneration snapped to paper
 * again. rival-sperm failed at exactly 0.9297 — paper's lightness — on three
 * of four attempts before this existed.
 *
 * Enforcing the reservation in CONFORM rather than only in CHECK means the
 * quantiser cannot produce a violation for CHECK to find.
 */
export function enemyPalette(act: ActId, holdsThreat: ThreatClass[] = []): Colour[] {
  const tones = ACT_TONES[act];
  return [
    INK,
    SHADOW,
    BONE,
    tones[0],
    tones[1],
    ...holdsThreat.map((cls) => THREAT[cls]),
  ];
}

/** The full locked palette. Law 3 caps this at twenty. */
export const FULL_PALETTE: Colour[] = [
  INK,
  SHADOW,
  PAPER,
  BONE,
  ...ACT_IDS.flatMap((a) => [...ACT_TONES[a]]),
  ...Object.values(THREAT),
];

// ---------------------------------------------------------------------------
// Oklab. Nearest-colour matching in sRGB picks visibly wrong neighbours on
// saturated fills, which is exactly what this palette is made of.
// ---------------------------------------------------------------------------

export interface Oklab {
  L: number;
  a: number;
  b: number;
}

function srgbToLinear(v: number): number {
  const s = v / 255;
  return s <= 0.04045 ? s / 12.92 : ((s + 0.055) / 1.055) ** 2.4;
}

export function rgbToOklab(r: number, g: number, b: number): Oklab {
  const lr = srgbToLinear(r);
  const lg = srgbToLinear(g);
  const lb = srgbToLinear(b);

  const l = Math.cbrt(0.4122214708 * lr + 0.5363325363 * lg + 0.0514459929 * lb);
  const m = Math.cbrt(0.2119034982 * lr + 0.6806995451 * lg + 0.1073969566 * lb);
  const s = Math.cbrt(0.0883024619 * lr + 0.2817188376 * lg + 0.6299787005 * lb);

  return {
    L: 0.2104542553 * l + 0.793617785 * m - 0.0040720468 * s,
    a: 1.9779984951 * l - 2.428592205 * m + 0.4505937099 * s,
    b: 0.0259040371 * l + 0.7827717662 * m - 0.808675766 * s,
  };
}

export function oklabDistance(x: Oklab, y: Oklab): number {
  return Math.hypot(x.L - y.L, x.a - y.a, x.b - y.b);
}

/** Perceptual lightness, 0..1. Used by the contrast check. */
export function lightness(colour: Colour): number {
  return rgbToOklab(colour.rgb[0], colour.rgb[1], colour.rgb[2]).L;
}

/** Nearest palette colour to an arbitrary RGB triple, in Oklab. */
export function nearest(palette: Colour[], r: number, g: number, b: number): Colour {
  const target = rgbToOklab(r, g, b);
  let best = palette[0]!;
  let bestD = Infinity;
  for (const p of palette) {
    const d = oklabDistance(target, rgbToOklab(p.rgb[0], p.rgb[1], p.rgb[2]));
    if (d < bestD) {
      bestD = d;
      best = p;
    }
  }
  return best;
}

/** Distance from an RGB triple to the closest palette entry. */
export function distanceToPalette(palette: Colour[], r: number, g: number, b: number): number {
  const target = rgbToOklab(r, g, b);
  let bestD = Infinity;
  for (const p of palette) {
    const d = oklabDistance(target, rgbToOklab(p.rgb[0], p.rgb[1], p.rgb[2]));
    if (d < bestD) bestD = d;
  }
  return bestD;
}
