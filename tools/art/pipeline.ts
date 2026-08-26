import { mkdirSync, writeFileSync } from 'node:fs';
import { dirname, resolve } from 'node:path';
import { fromPng, toPng, type Bitmap } from './bitmap';
import { DETAIL_THRESHOLD_PX, fullPrompt, styleSuffixFor } from './batch';
import { BOSS_THRESHOLDS, ICON_THRESHOLDS, SWARM_THRESHOLDS, check, type CheckReport } from './check';
import { conform } from './conform';
import { RESERVATIONS } from './reservations';
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

  const checks = record.checks
    .map((c) => `| ${c.name} | ${c.pass ? 'pass' : 'FAIL'} | ${c.measured} | ${c.expected} |`)
    .join('\n');

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
  const root = options.root ?? process.cwd();
  const maxAttempts = options.maxAttempts ?? 4;
  const log = options.onProgress ?? (() => {});
  const thresholds =
    spec.role === 'boss' ? BOSS_THRESHOLDS : spec.role === 'icon' ? ICON_THRESHOLDS : SWARM_THRESHOLDS;

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
      const isEnemy = spec.role === 'swarm' || spec.role === 'boss';
      const held = RESERVATIONS[spec.act];
      const holdsThreat = held
        ? (Object.entries(held.reservedThreat)
            .filter(([, who]) => who === spec.id)
            .map(([cls]) => cls) as ThreatClass[])
        : [];
      const conformed = await conform(cut(bmp), {
        act: spec.act,
        targetSize: spec.targetSize,
        forEnemy: isEnemy,
        holdsThreat,
      });
      // D-018: grain is part of the register, and at swarm scale it is
      // indistinguishable from noise — it costs contrast and buys nothing a
      // player can see. Spend it where the camera rests.
      const sprite = texture(conformed, spec.targetSize >= DETAIL_THRESHOLD_PX ? 1 : 0);
      const report = await check(sprite, spec.act, thresholds);

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
      // the problem and it will still be the problem next time.
      if (err instanceof Error && err.name === 'ContentRuleViolation') throw err;
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
