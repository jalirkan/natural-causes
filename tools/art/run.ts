import { mkdirSync, readFileSync, writeFileSync } from 'node:fs';
import { dirname, resolve } from 'node:path';
import { fromPng, toPng } from './bitmap';
import { TEST_BATCH } from './batch';
import { pack, type PackEntry } from './pack';
import { runBatch } from './pipeline';
import { ACT_IDS, type ActId } from './palette';
import { buildContactSheet } from './contact-sheet';
import type { AssetSpec } from './types';

/**
 * CLI for the art pipeline.
 *
 *   pnpm art:batch          generate the six-asset test batch
 *   pnpm art:batch -- --dry print the prompts and run the content rule, no API
 *   pnpm art:pack           pack conformed sprites into per-act atlases
 *   pnpm art:sheet          rebuild the review page from what is on disk
 */

const root = process.cwd();

function log(msg: string): void {
  process.stdout.write(`${msg}\n`);
}

async function cmdBatch(argv: string[]): Promise<number> {
  const dry = argv.includes('--dry');
  const only = argv.find((a) => a.startsWith('--only='))?.slice('--only='.length);
  const specs: AssetSpec[] = only
    ? TEST_BATCH.filter((s) => s.id === only || s.act === only)
    : TEST_BATCH;

  if (specs.length === 0) {
    log(`No assets matched --only=${only}`);
    return 1;
  }

  if (dry) {
    // Content rule runs inside generate(), but --dry has to exercise it too,
    // otherwise the cheap check is the one nobody runs.
    const { assertContentRule } = await import('./content-rule');
    const { fullPrompt, styleSuffix } = await import('./batch');
    for (const spec of specs) {
      assertContentRule(`asset "${spec.id}"`, {
        name: spec.name,
        subject: spec.subject,
        whyThisStage: spec.whyThisStage,
        prompt: fullPrompt(spec),
        styleSuffix: styleSuffix(spec.act, spec.targetSize),
      });
      log(`\n=== ${spec.id} (${spec.act}, ${spec.role}, ${spec.targetSize}px) ===`);
      log(fullPrompt(spec));
    }
    log(`\n${specs.length} prompts, all clean under D-007. Nothing was generated.`);
    return 0;
  }

  log(`Generating ${specs.length} assets...`);
  const started = Date.now();
  const outcomes = await runBatch(specs, { root, onProgress: log });

  log('\n--- Result ---');
  for (const o of outcomes) {
    const attempts = o.record.attempt || o.record.rejected.length;
    log(
      `${o.ok ? 'PASS' : 'FAIL'}  ${o.spec.id.padEnd(22)} ` +
        `${attempts} attempt(s)` +
        (o.ok ? '' : `  ${o.error ?? o.record.rejected.at(-1)?.failures.join(', ') ?? ''}`),
    );
  }

  const passed = outcomes.filter((o) => o.ok).length;
  log(`\n${passed}/${outcomes.length} passed in ${((Date.now() - started) / 1000).toFixed(1)}s`);

  await cmdSheet();
  return passed === outcomes.length ? 0 : 1;
}

async function cmdPack(): Promise<number> {
  let packed = 0;
  for (const act of ACT_IDS) {
    const entries: PackEntry[] = [];
    for (const spec of TEST_BATCH.filter((s) => s.act === act)) {
      const file = resolve(root, `assets/sprites/${act}/${spec.id}.png`);
      try {
        entries.push({ id: spec.id, bitmap: await fromPng(readFileSync(file)) });
      } catch {
        // Not generated yet. Packing what exists is the useful behaviour.
      }
    }
    if (entries.length === 0) continue;

    const result = pack(entries, `${act}.png`);
    const png = resolve(root, `assets/atlas/${act}.png`);
    mkdirSync(dirname(png), { recursive: true });
    writeFileSync(png, await toPng(result.image));
    writeFileSync(
      resolve(root, `assets/atlas/${act}.json`),
      `${JSON.stringify(result.atlas, null, 2)}\n`,
    );
    log(
      `packed ${entries.length} sprite(s) into assets/atlas/${act}.png ` +
        `(${result.atlas.meta.size.w}x${result.atlas.meta.size.h})`,
    );
    packed++;
  }
  if (packed === 0) log('No conformed sprites found. Run `pnpm art:batch` first.');
  return 0;
}

async function cmdSheet(): Promise<number> {
  const out = resolve(root, 'assets/review/test-batch.html');
  const html = await buildContactSheet(root, TEST_BATCH);
  mkdirSync(dirname(out), { recursive: true });
  writeFileSync(out, html);
  log(`\nReview page: ${out}`);
  return 0;
}

async function main(): Promise<number> {
  const [cmd = 'batch', ...argv] = process.argv.slice(2);
  switch (cmd) {
    case 'batch':
      return cmdBatch(argv);
    case 'pack':
      return cmdPack();
    case 'sheet':
      return cmdSheet();
    default:
      log(`Unknown command "${cmd}". Try: batch | pack | sheet`);
      return 1;
  }
}

main().then(
  (code) => process.exit(code),
  (err: unknown) => {
    process.stderr.write(`${err instanceof Error ? err.stack ?? err.message : String(err)}\n`);
    process.exit(1);
  },
);

export type { ActId };
