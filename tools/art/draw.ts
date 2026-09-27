import { existsSync, mkdirSync, readFileSync, writeFileSync } from 'node:fs';
import { dirname, resolve } from 'node:path';
import sharp from 'sharp';
import { ALL_ASSETS, DETAIL_THRESHOLD_PX } from './batch';
import { fromPng, toPng, type Bitmap } from './bitmap';
import {
  BOSS_THRESHOLDS,
  PLAYER_THRESHOLDS,
  SWARM_THRESHOLDS,
  check,
  reservedColourViolations,
  threatColourViolations,
  type CheckReport,
  type CheckThresholds,
} from './check';
import { conform, quantise } from './conform';
import { enemyPalette, type ActId, type ThreatClass } from './palette';
import { RESERVATIONS, ReservationError, reservationVerdict } from './reservations';
import { texture } from './texture';
import type { AssetRole } from './types';

/**
 * DRAW — the pipeline's second front door.
 *
 * GENERATE asks a model for a picture and CUT keys it out; DRAW reads an SVG
 * from `assets/svg/<act>/<id>.svg` and rasterises it. Both hand a bitmap to
 * CONFORM, and from there the road is the same: quantise to the act's
 * palette, apply the one outline weight, scale to the act's grid, CHECK,
 * pack. A drawn asset therefore passes exactly the tests a generated one
 * does, and the laws are enforced on it by the same code.
 *
 * Why it exists: the register the owner wants is flat cartoon shapes with
 * faces, which is a thing a drawing can state exactly and a generator can
 * only be asked for. Drawing costs nothing per asset, needs no key, is
 * deterministic, and its provenance (D-010) is the SVG itself, committed
 * beside the sprite. The generator stays available for what a drawing
 * cannot do; nothing here removes it.
 *
 * Authoring rules, enforced downstream rather than here:
 *   - Flat fills in palette colours (`tools/art/palette.ts` hex values).
 *     Anything else is quantised to the nearest palette entry.
 *   - No outline. CONFORM draws the one outline weight around the alpha
 *     mask; an outline in the SVG would double it.
 *   - Draw large. Set width/height to at least four times the target size;
 *     CONFORM scales down with nearest-neighbour after binarising alpha.
 *   - Faces on everything (law 5), big enough to survive 48px.
 */

export interface DrawSpec {
  id: string;
  name: string;
  act: ActId;
  role: AssetRole;
  /** Longest side of the finished sprite — the act's scale grid. */
  targetSize: number;
}

/**
 * Assets that exist only as drawings: no generation spec, no prompt.
 *
 * The player at school is the first. G-003 says the player is a face and one
 * cowlick in every act, so it is the same drawing with the costume changed.
 */
export const DRAWN_ONLY: DrawSpec[] = [
  { id: 'player-school', name: 'The player, at school', act: 'school', role: 'player', targetSize: 112 },
];

/**
 * A conformed sprite from one act standing in for one another act lacks.
 *
 * The sim has one boss and it is the Egg (acts.ts: "the Egg stands in"), so
 * the boss frame School's atlas needs until the Gym Teacher is designed is
 * the Egg's. It is copied at pack time, re-checked against School's own
 * background, and labelled here rather than reserved: law 11 governs an
 * act's OWN silhouettes, and this is Conception's, on loan.
 */
export interface StandIn {
  act: ActId;
  id: string;
  from: { act: ActId; id: string };
  role: AssetRole;
  why: string;
}

export const STAND_INS: StandIn[] = [
  {
    act: 'school',
    id: 'boss-egg',
    from: { act: 'conception', id: 'boss-egg' },
    role: 'boss',
    why: 'School has no boss of its own (SCHOOL-ROSTER §5); the sim fights the Egg there and the atlas has to show something.',
  },
];

export function svgPath(root: string, spec: Pick<DrawSpec, 'act' | 'id'>): string {
  return resolve(root, `assets/svg/${spec.act}/${spec.id}.svg`);
}

function spritePath(root: string, act: ActId, id: string): string {
  return resolve(root, `assets/sprites/${act}/${id}.png`);
}

/** Everything that MAY be drawn: every field asset with a spec, plus the drawn-only ones. */
export function drawableSpecs(): DrawSpec[] {
  const generated = ALL_ASSETS.filter((s) => s.role !== 'icon').map(
    ({ id, name, act, role, targetSize }) => ({ id, name, act, role, targetSize }),
  );
  return [...generated, ...DRAWN_ONLY];
}

/** Everything that goes into an act's atlas: generated, drawn, or standing in. */
export function packableIds(act: ActId): string[] {
  const ids = new Set<string>();
  for (const s of ALL_ASSETS) if (s.act === act && s.role !== 'icon') ids.add(s.id);
  for (const s of DRAWN_ONLY) if (s.act === act) ids.add(s.id);
  for (const s of STAND_INS) if (s.act === act) ids.add(s.id);
  return [...ids];
}

export interface DrawOutcome {
  id: string;
  act: ActId;
  source: 'svg' | 'stand-in';
  ok: boolean;
  report: CheckReport | null;
  /** Reserved-colour findings, which CHECK does not fold into its verdict. */
  violations: string[];
  sprite?: Bitmap;
  error?: string;
}

export interface DrawOptions {
  /** Write the passing sprite to assets/sprites. Tests pass false. */
  write?: boolean;
}

/** Rasterise an SVG document at the size its width/height attributes declare. */
export async function renderSvg(svg: string): Promise<Bitmap> {
  const png = await sharp(Buffer.from(svg)).png().toBuffer();
  return fromPng(png);
}

function thresholdsFor(role: AssetRole): CheckThresholds {
  if (role === 'boss') return BOSS_THRESHOLDS;
  if (role === 'player') return PLAYER_THRESHOLDS;
  return SWARM_THRESHOLDS;
}

/** The threat colours this asset holds, from the act's reservation table. */
function holdsThreatFor(act: ActId, id: string): ThreatClass[] {
  const held = RESERVATIONS[act];
  if (!held) return [];
  return Object.entries(held.reservedThreat)
    .filter(([, who]) => who === id)
    .map(([cls]) => cls as ThreatClass);
}

function write(file: string, data: Buffer): void {
  mkdirSync(dirname(file), { recursive: true });
  writeFileSync(file, data);
}

/**
 * One drawn asset through the pipeline from CONFORM on. Throws on a law 11
 * refusal, the same as GENERATE would; a failed check is an outcome, not an
 * exception, so a batch reports every failure rather than the first.
 */
export async function drawAsset(root: string, spec: DrawSpec, options: DrawOptions = {}): Promise<DrawOutcome> {
  const verdict = reservationVerdict(spec.act, spec.id, spec.role);
  if (verdict.status === 'unlisted' || verdict.status === 'no-list') {
    throw new ReservationError(verdict.reason);
  }

  const file = svgPath(root, spec);
  if (!existsSync(file)) {
    return { id: spec.id, act: spec.act, source: 'svg', ok: false, report: null, violations: [], error: `no drawing at ${file}` };
  }

  const raw = await renderSvg(readFileSync(file, 'utf8'));
  const isEnemy = spec.role === 'swarm' || spec.role === 'boss';
  const holdsThreat = holdsThreatFor(spec.act, spec.id);
  const conformed = await conform(raw, {
    act: spec.act,
    targetSize: spec.targetSize,
    forEnemy: isEnemy,
    holdsThreat,
  });
  // Same rule as GENERATE (D-018): grain only where the camera rests.
  const sprite = texture(conformed, spec.targetSize >= DETAIL_THRESHOLD_PX ? 1 : 0);
  const report = await check(sprite, spec.act, thresholdsFor(spec.role));
  const violations = isEnemy
    ? reservedColourViolations(sprite, spec.act, holdsThreat)
    : threatColourViolations(sprite).map((cls) => `threat-${cls} on the ${spec.role} (law 10)`);
  const ok = report.pass && violations.length === 0;

  if (ok && options.write !== false) write(spritePath(root, spec.act, spec.id), await toPng(sprite));
  return { id: spec.id, act: spec.act, source: 'svg', ok, report, violations, sprite };
}

/** Copy a conformed sprite into another act's set, re-checked against that act. */
export async function placeStandIn(root: string, s: StandIn, options: DrawOptions = {}): Promise<DrawOutcome> {
  const from = spritePath(root, s.from.act, s.from.id);
  if (!existsSync(from)) {
    return { id: s.id, act: s.act, source: 'stand-in', ok: false, report: null, violations: [], error: `no sprite at ${from}` };
  }
  const sprite = await fromPng(readFileSync(from));
  // It enters the act the way every asset does: through CONFORM's quantise.
  // The Egg carries a Service tone School's palette does not have, and law 3
  // is per act; without this the stand-in fails palette conformance at
  // 0.10 against a 0.035 tolerance. Outline and scale are already done.
  quantise(sprite, enemyPalette(s.act, holdsThreatFor(s.act, s.id)));
  const report = await check(sprite, s.act, thresholdsFor(s.role));
  const ok = report.pass;
  if (ok && options.write !== false) write(spritePath(root, s.act, s.id), await toPng(sprite));
  return { id: s.id, act: s.act, source: 'stand-in', ok, report, violations: [], sprite };
}

/**
 * Every drawing on disk (optionally one asset or one act), then the stand-ins.
 * A spec with no SVG is simply not drawn; nothing is generated in its place.
 */
export async function drawAll(root: string, only?: string, options: DrawOptions = {}): Promise<DrawOutcome[]> {
  const match = (act: string, id: string) => !only || only === id || only === act;
  const outcomes: DrawOutcome[] = [];
  for (const spec of drawableSpecs()) {
    if (!match(spec.act, spec.id) || !existsSync(svgPath(root, spec))) continue;
    outcomes.push(await drawAsset(root, spec, options));
  }
  for (const s of STAND_INS) {
    if (!match(s.act, s.id)) continue;
    outcomes.push(await placeStandIn(root, s, options));
  }
  return outcomes;
}
