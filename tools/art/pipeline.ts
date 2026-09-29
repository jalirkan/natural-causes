import { existsSync, mkdirSync, readFileSync, writeFileSync } from 'node:fs';
import { dirname, relative, resolve, sep } from 'node:path';
import { fromPng, toPng, type Bitmap } from './bitmap';
import { DETAIL_THRESHOLD_PX, fullPrompt, styleSuffixFor } from './batch';
import {
  BOSS_THRESHOLDS,
  FIELD_RIDING_ICON_THRESHOLDS,
  ICON_THRESHOLDS,
  PLAYER_THRESHOLDS,
  SWARM_THRESHOLDS,
  check,
  type CheckReport,
  type CheckThresholds,
} from './check';
import { conform } from './conform';
import { RESERVATIONS, assertReserved } from './reservations';
import { assertContentRule } from './content-rule';
import {
  SUPERSAMPLE,
  rasteriseSvgBuffer,
  rasteriserVersion,
  sha256,
  svgPathFor,
  svgRelativePath,
  svgTextFields,
} from './rasterise';
import type { ThreatClass } from './palette';
import { cut } from './cut';
import { DEFAULT_MODEL, generate, type GenerateOptions } from './generate';
import { texture } from './texture';
import type { AssetSpec, GenerationRecord } from './types';

/**
 * The pipeline: GENERATE → CUT → CONFORM → TEXTURE → CHECK, with automatic
 * regeneration on failure.
 *
 * The regeneration loop is the whole reason the CHECK stage exists. A failed
 * asset gets a mutated seed and another attempt; nothing is escalated to a
 * human and nothing is hand-corrected. That is what lets asset work happen
 * overnight instead of in Justin's evenings (D-004, D-005).
 */

export interface PipelineOptions extends GenerateOptions {
  /** Attempts before giving up on an asset and reporting it as failed. */
  maxAttempts?: number;
  /** Repo root. Output paths are resolved against it. */
  root?: string;
  /** Keep raw and rejected candidates on disk for inspection. */
  keepRejects?: boolean;
  onProgress?: (message: string) => void;
}

export interface AssetOutcome {
  spec: AssetSpec;
  ok: boolean;
  sprite?: Bitmap;
  report?: CheckReport;
  record: GenerationRecord;
  error?: string;
}

/** Seeds for retries. Deterministic, so a rerun reproduces the same sequence. */
export function mutateSeed(base: number, attempt: number): number {
  return (base + attempt * 7919) % 2147483647;
}

function write(file: string, data: Buffer | string): void {
  mkdirSync(dirname(file), { recursive: true });
  writeFileSync(file, data);
}

/**
 * The mechanical-checks table body. The contact sheet parses this format. A
 * check a render did not run reads `skipped`, with no measurement: never
 * `pass`, so the table does not claim what nobody measured.
 */
export function checkRows(checks: GenerationRecord['checks']): string {
  return checks
    .map((c) =>
      c.skipped
        ? `| ${c.name} | skipped | — | ${c.expected} |`
        : `| ${c.name} | ${c.pass ? 'pass' : 'FAIL'} | ${c.measured} | ${c.expected} |`,
    )
    .join('\n');
}

/** A CHECK report as provenance records it. */
export function recordedChecks(report: CheckReport): GenerationRecord['checks'] {
  return report.results.map((r) => ({
    name: r.name,
    pass: r.pass,
    measured: r.measured,
    expected: r.expected,
    ...(r.skipped ? { skipped: true as const } : {}),
  }));
}

export function thresholdsFor(spec: AssetSpec): CheckThresholds {
  if (spec.role === 'boss') return BOSS_THRESHOLDS;
  // G-036: an icon whose object is also drawn on the field keeps law 10 there,
  // and CHECK rejects it if it does not (`field-colours`), rather than only
  // laws.test.ts noticing after the sprite is committed.
  if (spec.role === 'icon') return spec.fieldRiding ? FIELD_RIDING_ICON_THRESHOLDS : ICON_THRESHOLDS;
  if (spec.role === 'player') return PLAYER_THRESHOLDS;
  return SWARM_THRESHOLDS;
}

/** Threat colours this asset holds under law 11 — what CONFORM may quantise into. */
export function heldThreats(spec: Pick<AssetSpec, 'act' | 'id'>): ThreatClass[] {
  const held = RESERVATIONS[spec.act];
  if (!held) return [];
  // D-029: a variant frame wears its holder's threat colour.
  const holder = Object.entries(held.variants ?? {}).find(([, ids]) => ids.includes(spec.id))?.[0] ?? spec.id;
  return Object.entries(held.reservedThreat)
    .filter(([, who]) => who === holder)
    .map(([cls]) => cls) as ThreatClass[];
}

/**
 * CONFORM → TEXTURE → CHECK, shared by every source. Whatever produced the
 * bitmap — a generator, an author or a renderer — everything after this
 * point is the same code, which is what lets a rule in CONFORM or CHECK bind
 * them all. What differs is the spec's `finish`: a render skips the flat
 * corrections, the grain and the palette checks.
 */
export async function conformAndCheck(
  spec: AssetSpec,
  bmp: Bitmap,
): Promise<{ sprite: Bitmap; report: CheckReport }> {
  const finish = spec.finish ?? 'flat';
  if (finish === 'render') {
    // A render keeps its own shading: no palette, no outline, no grain (the
    // grain is the flat register's paper, and on a render it is only noise).
    const sprite = await conform(bmp, { act: spec.act, targetSize: spec.targetSize, finish });
    const report = await check(sprite, spec.act, thresholdsFor(spec), finish);
    return { sprite, report };
  }
  const isEnemy = spec.role === 'swarm' || spec.role === 'boss';
  const conformed = await conform(bmp, {
    act: spec.act,
    targetSize: spec.targetSize,
    forEnemy: isEnemy,
    holdsThreat: heldThreats(spec),
  });
  // D-018: grain is part of the register, and at swarm scale it is
  // indistinguishable from noise — it costs contrast and buys nothing a
  // player can see. Spend it where the camera rests.
  const sprite = texture(conformed, spec.targetSize >= DETAIL_THRESHOLD_PX ? 1 : 0);
  const report = await check(sprite, spec.act, thresholdsFor(spec));
  return { sprite, report };
}

/**
 * D-010: every generation prompt is committed alongside the asset it produced.
 * An asset whose prompt is not in the repository does not ship — a result
 * without its provenance is not evidence, and a style that cannot be
 * regenerated cannot be extended six months later.
 */
export function provenanceMarkdown(record: GenerationRecord, spec: AssetSpec): string {
  const rejects =
    record.rejected.length === 0
      ? '_None — passed on the first attempt._'
      : record.rejected
          .map((r, i) => `${i + 1}. seed \`${r.seed}\` — failed ${r.failures.join(', ')}`)
          .join('\n');

  const checks = checkRows(record.checks);

  return `# ${spec.name}

- **Asset id:** \`${spec.id}\`
- **Act:** ${spec.act}
- **Role:** ${spec.role}
- **Model:** \`${record.model}\`
- **Seed:** \`${record.seed}\` (attempt ${record.attempt})
- **Generated:** ${record.generatedAt}
- **Sprite size:** ${spec.targetSize}px
${spec.tests ? `- **Tests:** ${spec.tests}\n` : ''}${spec.whyThisStage ? `\n**Why this life stage.** ${spec.whyThisStage}\n` : ''}
## Prompt

\`\`\`
${record.prompt}
\`\`\`

The subject half is authored per asset; the style half is identical for every
asset in the game and lives in \`tools/art/batch.ts\`:

\`\`\`
${record.styleSuffix}
\`\`\`

## Mechanical checks

| Check | Result | Measured | Expected |
|---|---|---|---|
${checks}

## Rejected candidates

${rejects}
`;
}

export async function runAsset(
  spec: AssetSpec,
  options: PipelineOptions = {},
): Promise<AssetOutcome> {
  if (spec.source === 'svg') {
    // G-038: an authored asset is never sent to a generator. Refusing here
    // rather than filtering only in the CLI keeps a stray caller from
    // spending money to overwrite a drawing.
    throw new Error(`asset "${spec.id}" is authored SVG; run \`pnpm art:svg\`, not the generator`);
  }
  if (spec.source === 'render') {
    // Rendered outside this repo and brought in by intake; fal never
    // overwrites it.
    throw new Error(`asset "${spec.id}" is rendered; bring it in with \`pnpm art:intake\`, not the generator`);
  }
  const root = options.root ?? process.cwd();
  const maxAttempts = options.maxAttempts ?? 4;
  const log = options.onProgress ?? (() => {});

  const record: GenerationRecord = {
    assetId: spec.id,
    model: options.model ?? DEFAULT_MODEL,
    seed: spec.seed,
    prompt: fullPrompt(spec),
    styleSuffix: styleSuffixFor(spec),
    attempt: 0,
    rejected: [],
    checks: [],
    generatedAt: new Date().toISOString(),
  };

  let lastError: string | undefined;

  for (let attempt = 0; attempt < maxAttempts; attempt++) {
    const seed = attempt === 0 ? spec.seed : mutateSeed(spec.seed, attempt);
    log(`  ${spec.id}: attempt ${attempt + 1}/${maxAttempts}, seed ${seed}`);

    try {
      const raw = await generate(spec, seed, options);
      write(resolve(root, `assets/raw/${spec.id}-${seed}.png`), raw.png);

      const bmp = await fromPng(raw.png);
      const { sprite, report } = await conformAndCheck(spec, cut(bmp));

      record.attempt = attempt + 1;
      record.seed = seed;
      record.checks = recordedChecks(report);

      if (report.pass) {
        write(resolve(root, `assets/sprites/${spec.act}/${spec.id}.png`), await toPng(sprite));
        write(resolve(root, `assets/prompts/${spec.id}.md`), provenanceMarkdown(record, spec));
        log(`  ${spec.id}: PASS`);
        return { spec, ok: true, sprite, report, record };
      }

      log(`  ${spec.id}: rejected — ${report.failures.join(', ')}`);
      record.rejected.push({ seed, failures: report.failures });
      if (options.keepRejects !== false) {
        write(resolve(root, `assets/rejected/${spec.id}-${seed}.png`), await toPng(sprite));
      }
    } catch (err) {
      // A content-rule violation is a build failure, not a bad roll of the
      // dice. Retrying it with a different seed would be absurd: the prompt is
      // the problem and it will still be the problem next time. A reservation
      // refusal is the same shape of error one document up — the act's shape
      // vocabulary is the problem, and no seed has ever fixed a document.
      if (err instanceof Error && (err.name === 'ContentRuleViolation' || err.name === 'ReservationError')) {
        throw err;
      }
      lastError = err instanceof Error ? err.message : String(err);
      log(`  ${spec.id}: error — ${lastError}`);
      record.rejected.push({ seed, failures: [`error: ${lastError}`] });
    }
  }

  // Provenance is written even for failures. A rejection is a result, and the
  // prompt that produced four rejections is the most useful one to look at.
  write(resolve(root, `assets/prompts/${spec.id}.md`), provenanceMarkdown(record, spec));
  const outcome: AssetOutcome = { spec, ok: false, record };
  if (lastError !== undefined) outcome.error = lastError;
  return outcome;
}

export async function runBatch(
  specs: AssetSpec[],
  options: PipelineOptions = {},
): Promise<AssetOutcome[]> {
  const outcomes: AssetOutcome[] = [];
  for (const spec of specs) {
    outcomes.push(await runAsset(spec, options));
  }
  return outcomes;
}

// ---------------------------------------------------------------------------
// The SVG path (G-038): AUTHOR → RASTERISE → CONFORM → TEXTURE → CHECK.
// ---------------------------------------------------------------------------

export interface SvgOptions {
  /** Repo root. Output paths are resolved against it. */
  root?: string;
  /** Override the source file; defaults to `tools/art/svg/<act>/<id>.svg`. */
  svgPath?: string;
  onProgress?: (message: string) => void;
}

export interface SvgOutcome {
  spec: AssetSpec;
  ok: boolean;
  sprite?: Bitmap;
  report?: CheckReport;
  /** sha256 of the SVG bytes that were rasterised. */
  svgSha256: string;
  failures: string[];
}

export interface SvgProvenance {
  sourcePath: string;
  svgSha256: string;
  rasteriser: string;
  density: number;
  fitted: boolean;
  renderedAt: string;
  checks: GenerationRecord['checks'];
}

/**
 * D-010 for an authored asset. There is no prompt and no seed; what makes
 * the sprite reproducible is the source file and the rasteriser, so those
 * are recorded — the SVG by hash, so a drawing edited without re-running
 * this stage is a mismatch a test can see.
 */
export function svgProvenanceMarkdown(spec: AssetSpec, p: SvgProvenance): string {
  return `# ${spec.name}

- **Asset id:** \`${spec.id}\`
- **Act:** ${spec.act}
- **Role:** ${spec.role}
- **Source:** authored SVG, \`${p.sourcePath}\`
- **SVG sha256:** \`${p.svgSha256}\`
- **Rasteriser:** ${p.rasteriser}
- **Render:** ${p.density.toFixed(3)} dpi, ${SUPERSAMPLE}× supersampled and area-averaged${p.fitted ? '' : ' (not exactly fitted; CONFORM finished the scale)'}
- **Rendered:** ${p.renderedAt}
- **Sprite size:** ${spec.targetSize}px
${spec.tests ? `- **Tests:** ${spec.tests}\n` : ''}${spec.whyThisStage ? `\n**Why this life stage.** ${spec.whyThisStage}\n` : ''}
## Description

${spec.subject}

## Mechanical checks

| Check | Result | Measured | Expected |
|---|---|---|---|
${checkRows(p.checks)}
`;
}

/**
 * Run one authored asset. Law 11 and D-007 gate it before a pixel is drawn,
 * exactly as they gated generation; CHECK decides it after. No retries and
 * no seed: a failed drawing is fixed by whoever drew it, and on failure
 * nothing is written.
 */
export async function runSvgAsset(spec: AssetSpec, options: SvgOptions = {}): Promise<SvgOutcome> {
  if (spec.source !== 'svg') {
    // A stale drawing must never overwrite a render (or a generation).
    throw new Error(
      spec.source === 'render'
        ? `asset "${spec.id}" is rendered, not an authored SVG asset; bring it in with \`pnpm art:intake\``
        : `asset "${spec.id}" is not an authored SVG asset`,
    );
  }
  const root = options.root ?? process.cwd();
  const log = options.onProgress ?? (() => {});

  // The spec first: an unreserved or D-007-violating asset is refused before
  // its file is even opened.
  assertReserved(spec.act, [spec.id], spec.role);
  assertContentRule(`asset "${spec.id}"`, {
    name: spec.name,
    subject: spec.subject,
    whyThisStage: spec.whyThisStage,
  });

  const path = options.svgPath ?? svgPathFor(spec, root);
  if (!existsSync(path)) throw new Error(`asset "${spec.id}": no SVG at ${path}`);
  const svg = readFileSync(path);
  assertContentRule(`asset "${spec.id}" (${svgRelativePath(spec)})`, svgTextFields(svg.toString('utf8')));
  const svgSha256 = sha256(svg);

  const raster = await rasteriseSvgBuffer(svg, spec.targetSize);
  const { sprite, report } = await conformAndCheck(spec, raster.bitmap);

  if (!report.pass) {
    log(`  ${spec.id}: FAIL — ${report.failures.join(', ')}`);
    return { spec, ok: false, sprite, report, svgSha256, failures: report.failures };
  }

  write(resolve(root, `assets/sprites/${spec.act}/${spec.id}.png`), await toPng(sprite));
  write(
    resolve(root, `assets/prompts/${spec.id}.md`),
    svgProvenanceMarkdown(spec, {
      sourcePath: svgRelativePath(spec),
      svgSha256,
      rasteriser: rasteriserVersion(),
      density: raster.density,
      fitted: raster.fitted,
      renderedAt: new Date().toISOString(),
      checks: recordedChecks(report),
    }),
  );
  log(`  ${spec.id}: PASS${raster.fitted ? '' : ' (render not exactly fitted)'}`);
  return { spec, ok: true, sprite, report, svgSha256, failures: [] };
}

// ---------------------------------------------------------------------------
// The render path: RENDER and CUT happen outside this repo; INTAKE →
// CONFORM → CHECK happen here (`pnpm art:intake`).
// ---------------------------------------------------------------------------

/**
 * What the renderer writes beside each cut-out PNG, `<dir>/<id>.json`. Every
 * field is required: it is the whole provenance of a rendered sprite (D-010),
 * and a sprite whose seed or model nobody wrote down cannot be made again.
 */
export interface RenderSidecar {
  model: string;
  seed: number;
  steps: number;
  guidance: number;
  width: number;
  height: number;
  prompt: string;
  negative: string;
  cutter: string;
  generatedAt: string;
}

const SIDECAR_FIELDS: Record<keyof RenderSidecar, 'string' | 'number'> = {
  model: 'string',
  seed: 'number',
  steps: 'number',
  guidance: 'number',
  width: 'number',
  height: 'number',
  prompt: 'string',
  negative: 'string',
  cutter: 'string',
  generatedAt: 'string',
};

/**
 * Intake would not take this asset in: no file, no provenance, no alpha to
 * cut by. Nothing is written. (A D-007 violation in the sidecar refuses too,
 * as the content rule's own `ContentRuleViolation`.)
 */
export class IntakeRefusal extends Error {
  constructor(message: string) {
    super(message);
    this.name = 'IntakeRefusal';
  }
}

/** Where intake reads an asset from: `<dir>/<id>.png` and `<dir>/<id>.json`. */
export function intakePaths(spec: Pick<AssetSpec, 'id'>, dir: string): { png: string; sidecar: string } {
  return { png: resolve(dir, `${spec.id}.png`), sidecar: resolve(dir, `${spec.id}.json`) };
}

/** Parse and validate a sidecar. Refuses, naming every missing or mistyped field. */
export function parseSidecar(text: string, where: string): RenderSidecar {
  let raw: unknown;
  try {
    raw = JSON.parse(text);
  } catch (err) {
    throw new IntakeRefusal(`${where} is not JSON: ${err instanceof Error ? err.message : String(err)}`);
  }
  if (typeof raw !== 'object' || raw === null || Array.isArray(raw)) {
    throw new IntakeRefusal(`${where} is not a JSON object`);
  }
  const obj = raw as Record<string, unknown>;
  const bad = (Object.entries(SIDECAR_FIELDS) as Array<[keyof RenderSidecar, string]>)
    .filter(([key, type]) => typeof obj[key] !== type || (type === 'number' && !Number.isFinite(obj[key])))
    .map(([key, type]) => `${key} (${type})`);
  if (bad.length > 0) {
    throw new IntakeRefusal(`${where} is missing or mistypes ${bad.join(', ')}`);
  }
  return obj as unknown as RenderSidecar;
}

export interface IntakeOptions {
  /** Repo root. Output paths are resolved against it. */
  root?: string;
  /** Where the cut-out PNGs and sidecars are, relative to root; default `assets/raw`. */
  dir?: string;
  onProgress?: (message: string) => void;
}

export interface IntakeOutcome {
  spec: AssetSpec;
  ok: boolean;
  sprite?: Bitmap;
  report?: CheckReport;
  /** sha256 of the PNG bytes taken in. */
  rawSha256: string;
  failures: string[];
}

export interface IntakeProvenance {
  sidecar: RenderSidecar;
  /** The PNG taken in, as a path relative to the root. */
  rawPath: string;
  rawSha256: string;
  takenInAt: string;
  checks: GenerationRecord['checks'];
}

function repoRelative(root: string, file: string): string {
  return relative(root, file).split(sep).join('/');
}

/**
 * D-010 for a rendered asset: the model, the seed and both halves of the
 * prompt from the renderer's sidecar, the cutter, the hash of the PNG that
 * was taken in, and the checks — the skipped ones reading `skipped`.
 */
export function intakeProvenanceMarkdown(spec: AssetSpec, p: IntakeProvenance): string {
  const s = p.sidecar;
  return `# ${spec.name}

- **Asset id:** \`${spec.id}\`
- **Act:** ${spec.act}
- **Role:** ${spec.role}
- **Source:** rendered and cut out outside this repo, taken in by \`pnpm art:intake\` from \`${p.rawPath}\`
- **Model:** \`${s.model}\`
- **Seed:** \`${s.seed}\`
- **Steps / guidance:** ${s.steps} / ${s.guidance}
- **Render size:** ${s.width}×${s.height}px
- **Generated:** ${s.generatedAt}
- **Cutter:** ${s.cutter}
- **Raw sha256:** \`${p.rawSha256}\`
- **Finish:** ${spec.finish ?? 'flat'}
- **Taken in:** ${p.takenInAt}
- **Sprite size:** ${spec.targetSize}px
${spec.tests ? `- **Tests:** ${spec.tests}\n` : ''}${spec.whyThisStage ? `\n**Why this life stage.** ${spec.whyThisStage}\n` : ''}
## Prompt

\`\`\`
${s.prompt}
\`\`\`

Negative:

\`\`\`
${s.negative}
\`\`\`

## Mechanical checks

| Check | Result | Measured | Expected |
|---|---|---|---|
${checkRows(p.checks)}
`;
}

/** True when every pixel is fully opaque: nothing was cut out. */
function fullyOpaque(bmp: Bitmap): boolean {
  for (let i = 3; i < bmp.data.length; i += 4) {
    if (bmp.data[i] !== 255) return false;
  }
  return true;
}

/**
 * Take in one rendered asset. The spec is gated first (law 11, and D-007 on
 * its own words), then its provenance (the sidecar must exist, be complete,
 * and pass D-007 on the prompt and the negative), then its pixels (a real
 * alpha channel — intake never removes a background: `cut()` is built for
 * flat art on magenta and would eat a render's shading). Then CONFORM and
 * CHECK for the spec's finish. On pass it writes the sprite and its
 * provenance; on any refusal or failure it writes nothing, so a sprite
 * already on disk keeps the provenance it was written with.
 */
export async function runIntakeAsset(spec: AssetSpec, options: IntakeOptions = {}): Promise<IntakeOutcome> {
  if (spec.source !== 'render') {
    throw new Error(`asset "${spec.id}" is not a rendered asset; intake takes source: 'render' only`);
  }
  const root = options.root ?? process.cwd();
  const dir = resolve(root, options.dir ?? 'assets/raw');
  const log = options.onProgress ?? (() => {});

  assertReserved(spec.act, [spec.id], spec.role);
  assertContentRule(`asset "${spec.id}"`, {
    name: spec.name,
    subject: spec.subject,
    whyThisStage: spec.whyThisStage,
  });

  const { png, sidecar } = intakePaths(spec, dir);
  if (!existsSync(png)) throw new IntakeRefusal(`asset "${spec.id}": no file at ${png}`);
  if (!existsSync(sidecar)) {
    throw new IntakeRefusal(
      `asset "${spec.id}": no sidecar at ${sidecar} — a render without its model, seed and prompt does not ship (D-010)`,
    );
  }
  const meta = parseSidecar(readFileSync(sidecar, 'utf8'), sidecar);
  assertContentRule(`asset "${spec.id}" (${repoRelative(root, sidecar)})`, {
    prompt: meta.prompt,
    negative: meta.negative,
  });

  const bytes = readFileSync(png);
  const bmp = await fromPng(bytes);
  if (fullyOpaque(bmp)) {
    throw new IntakeRefusal(
      `asset "${spec.id}": ${png} has no alpha — every pixel is opaque. Cut it out first; ` +
        'intake does not remove backgrounds.',
    );
  }
  const rawSha256 = sha256(bytes);

  const { sprite, report } = await conformAndCheck(spec, bmp);
  if (!report.pass) {
    log(`  ${spec.id}: FAIL — ${report.failures.join(', ')}`);
    return { spec, ok: false, sprite, report, rawSha256, failures: report.failures };
  }

  write(resolve(root, `assets/sprites/${spec.act}/${spec.id}.png`), await toPng(sprite));
  write(
    resolve(root, `assets/prompts/${spec.id}.md`),
    intakeProvenanceMarkdown(spec, {
      sidecar: meta,
      rawPath: repoRelative(root, png),
      rawSha256,
      takenInAt: new Date().toISOString(),
      checks: recordedChecks(report),
    }),
  );
  log(`  ${spec.id}: PASS`);
  return { spec, ok: true, sprite, report, rawSha256, failures: [] };
}
