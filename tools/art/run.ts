import { mkdirSync, readFileSync, writeFileSync } from 'node:fs';
import { dirname, resolve } from 'node:path';
import { fromPng, toPng } from './bitmap';
import { ALL_ASSETS, CONCEPTION_ROSTER, TEST_BATCH } from './batch';
import { pack, type PackEntry } from './pack';
import { runBatch } from './pipeline';
import { ACT_IDS, type ActId } from './palette';
import { buildContactSheet } from './contact-sheet';
import type { ReservationVerdict } from './reservations';
import type { AssetSpec } from './types';

/**
 * CLI for the art pipeline.
 *
 *   pnpm art:batch          generate the six-asset test batch
 *   pnpm art:batch -- --dry print the prompts, run D-007 and law 11, no API
 *   pnpm art:batch -- --dry --only=school   one act's prompts and verdicts
 *   pnpm art:pack           pack conformed sprites into per-act atlases
 *   pnpm art:sheet          rebuild the review page from what is on disk
 */

const root = process.cwd();

function log(msg: string): void {
  process.stdout.write(`${msg}\n`);
}

/** One line per asset, so the reserved list is readable from the run itself. */
function describeVerdict(v: ReservationVerdict): string {
  switch (v.status) {
    case 'holds':
      return `holds "${v.silhouette}" in act "${v.act}"`;
    case 'holds-threat':
      return `holds ${v.threat} threat colour in act "${v.act}"`;
    case 'pickup':
      return `pickup — holds "${v.silhouette}" game-wide (G-030)`;
    case 'player':
      return 'the player — outside every act vocabulary, holds paper game-wide (law 10)';
    case 'no-list':
      return `REFUSED at generation — act "${v.act}" has no reserved-silhouette list (G-011)`;
    case 'unlisted':
      return `REFUSED — not on act "${v.act}"'s reserved list (G-011)`;
  }
}

async function cmdBatch(argv: string[]): Promise<number> {
  const dry = argv.includes('--dry');
  const only = argv.find((a) => a.startsWith('--only='))?.slice('--only='.length);
  const set = argv.find((a) => a.startsWith('--set='))?.slice('--set='.length);

  // Default stays TEST_BATCH so a bare `art:batch` never silently regenerates
  // approved art. --only searches everything; --set picks a named collection.
  const source =
    set === 'roster' ? CONCEPTION_ROSTER : set === 'all' ? ALL_ASSETS : only ? ALL_ASSETS : TEST_BATCH;
  const specs: AssetSpec[] = only
    ? source.filter((s) => s.id === only || s.act === only)
    : source;

  if (specs.length === 0) {
    log(`No assets matched --only=${only}`);
    return 1;
  }

  if (dry) {
    // Both pre-generation rules run inside generate(), but --dry has to
    // exercise them too, otherwise the cheap checks are the ones nobody runs.
    const { assertContentRule } = await import('./content-rule');
    const { ReservationError, refuses, reservationVerdict } = await import('./reservations');
    const { fullPrompt, styleSuffixFor } = await import('./batch');

    const refused: string[] = [];
    for (const spec of specs) {
      assertContentRule(`asset "${spec.id}"`, {
        name: spec.name,
        subject: spec.subject,
        whyThisStage: spec.whyThisStage,
        prompt: fullPrompt(spec),
        styleSuffix: styleSuffixFor(spec),
      });

      const verdict = reservationVerdict(spec.act, spec.id, spec.role);
      // An asset missing from a list its act HAS is this repository
      // contradicting itself, and it fails here exactly as it would fail at
      // generation. An act with no list at all is a document nobody has
      // written yet (ART-DIRECTION.md: "the remaining five acts still need
      // theirs"), so it is named and counted rather than failing a run whose
      // subject is prompts. Either way `generate()` refuses it.
      if (verdict.status === 'unlisted') throw new ReservationError(verdict.reason);
      if (refuses(verdict)) refused.push(`${spec.id} (${spec.act})`);

      log(`\n=== ${spec.id} (${spec.act}, ${spec.role}, ${spec.targetSize}px) ===`);
      log(`law 11: ${describeVerdict(verdict)}`);
      log(fullPrompt(spec));
    }

    log(`\n${specs.length} prompts, all clean under D-007.`);
    // "Generatable", not "hold a silhouette": the player and the pickups are
    // accepted while holding none, which is the point of them being outside
    // the vocabulary rather than an exception to it.
    log(
      `law 11: ${specs.length - refused.length} of ${specs.length} generatable` +
        (refused.length === 0
          ? '.'
          : `; ${refused.length} refused at generation — ${refused.join(', ')}.`),
    );
    log('Nothing was generated.');
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
    for (const spec of ALL_ASSETS.filter((s) => s.act === act)) {
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
  const html = await buildContactSheet(root, ALL_ASSETS);
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
