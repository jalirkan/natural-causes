import { existsSync, mkdirSync, readFileSync, writeFileSync } from 'node:fs';
import { dirname, resolve } from 'node:path';
import { fromPng, toPng, type Bitmap } from './bitmap';
import { DETAIL_THRESHOLD_PX, fullPrompt, styleSuffixFor } from './batch';
import {
  BOSS_THRESHOLDS,
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

/** The mechanical-checks table body. The contact sheet parses this format. */
export function checkRows(checks: GenerationRecord['checks']): string {
  return checks
    .map((c) => `| ${c.name} | ${c.pass ? 'pass' : 'FAIL'} | ${c.measured} | ${c.expected} |`)
    .join('\n');
}

export function thresholdsFor(spec: AssetSpec): CheckThresholds {
  if (spec.role === 'boss') return BOSS_THRESHOLDS;
  if (spec.role === 'icon') return ICON_THRESHOLDS;
  if (spec.role === 'player') return PLAYER_THRESHOLDS;
  return SWARM_THRESHOLDS;
}

/** Threat colours this asset holds under law 11 — what CONFORM may quantise into. */
export function heldThreats(spec: AssetSpec): ThreatClass[] {
  const held = RESERVATIONS[spec.act];
  return held
    ? (Object.entries(held.reservedThreat)
        .filter(([, who]) => who === spec.id)
        .map(([cls]) => cls) as ThreatClass[])
    : [];
}

/**
 * CONFORM → TEXTURE → CHECK, shared by both sources. Whatever produced the
 * bitmap — a generator or an author — everything after this point is the
 * same code, which is what lets a rule in CONFORM or CHECK bind both.
 */
export async function conformAndCheck(
  spec: AssetSpec,
  bmp: Bitmap,
): Promise<{ sprite: Bitmap; report: CheckReport }> {
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
      record.checks = report.results.map((r) => ({
        name: r.name,
        pass: r.pass,
        measured: r.measured,
        expected: r.expected,
      }));

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
    throw new Error(`asset "${spec.id}" is not an authored SVG asset`);
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
      checks: report.results.map((r) => ({
        name: r.name,
        pass: r.pass,
        measured: r.measured,
        expected: r.expected,
      })),
    }),
  );
  log(`  ${spec.id}: PASS${raster.fitted ? '' : ' (render not exactly fitted)'}`);
  return { spec, ok: true, sprite, report, svgSha256, failures: [] };
}
