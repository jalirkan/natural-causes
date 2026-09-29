import { existsSync, mkdirSync, readFileSync, writeFileSync } from 'node:fs';
import { dirname, relative, resolve } from 'node:path';
import { fromPng, toPng } from './bitmap';
import { ALL_ASSETS, CONCEPTION_ROSTER, ITEM_ICONS, TEST_BATCH } from './batch';
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
 *   pnpm art:svg            rasterise authored SVGs through CONFORM and CHECK (G-038)
 *   pnpm art:svg -- --id=icon-strike | --act=decline | --sheet
 *   pnpm art:intake -- --act=school   take rendered characters in from assets/raw
 *   pnpm art:intake -- --id=<id> | --dir=<path>
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
    case 'icon':
      return v.fieldRiding
        ? `card icon that also rides the field (G-036) — outside the act vocabulary; ` +
            `keeps off ${v.keepsOff.join(', ')} (law 10)`
        : 'card-surface icon — never on the field, outside the act vocabulary (G-035)';
  }
}

async function cmdBatch(argv: string[]): Promise<number> {
  const dry = argv.includes('--dry');
  const only = argv.find((a) => a.startsWith('--only='))?.slice('--only='.length);
  const set = argv.find((a) => a.startsWith('--set='))?.slice('--set='.length);

  // Default stays TEST_BATCH so a bare `art:batch` never silently regenerates
  // approved art. --only searches everything; --set picks a named collection.
  const source =
    set === 'roster'
      ? CONCEPTION_ROSTER
      : set === 'icons'
        ? ITEM_ICONS
        : set === 'all'
          ? ALL_ASSETS
          : only
            ? ALL_ASSETS
            : TEST_BATCH;
  const matched: AssetSpec[] = only
    ? source.filter((s) => s.id === only || s.act === only)
    : source;
  // G-038: authored SVG assets are never generated, and neither are rendered
  // ones (taken in by `art:intake`). The dry run still puts them through
  // D-007 and law 11 (below); the paid run leaves them out.
  const authored = matched.filter((s) => s.source === 'svg');
  const rendered = matched.filter((s) => s.source === 'render');
  const specs = dry ? matched : matched.filter((s) => s.source === undefined);
  if (!dry && authored.length > 0) {
    log(`Skipping ${authored.length} authored SVG asset(s) — run \`pnpm art:svg\`: ${authored.map((s) => s.id).join(', ')}`);
  }
  if (!dry && rendered.length > 0) {
    log(`Skipping ${rendered.length} rendered asset(s) — run \`pnpm art:intake\`: ${rendered.map((s) => s.id).join(', ')}`);
  }

  if (matched.length === 0) {
    log(`No assets matched --only=${only}`);
    return 1;
  }
  if (specs.length === 0) {
    log('Nothing to generate.');
    return 0;
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

      if (spec.source === 'svg') {
        // The drawing's own words — <title>, <desc>, comments — are asset
        // text too, and CI's dry run is the cheapest place to read them.
        const { svgPathFor, svgRelativePath, svgTextFields } = await import('./rasterise');
        const file = svgPathFor(spec, root);
        if (existsSync(file)) {
          assertContentRule(
            `asset "${spec.id}" (${svgRelativePath(spec)})`,
            svgTextFields(readFileSync(file, 'utf8')),
          );
        }
      }

      const verdict = reservationVerdict(spec.act, spec.id, spec.role, spec.fieldRiding === true);
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
      if (spec.source === 'svg') {
        // Not a prompt: nothing is sent anywhere. The description is what the
        // content rule just ran on.
        log(`authored SVG (G-038) — tools/art/svg/${spec.act}/${spec.id}.svg — not generated`);
        log(spec.subject);
      } else if (spec.source === 'render') {
        // Rendered outside this repo; the prompt that made it is in its
        // sidecar, checked by intake. The description is what D-007 ran on.
        log(`rendered — taken in by \`pnpm art:intake\` from assets/raw/${spec.id}.png — not generated`);
        log(spec.subject);
      } else {
        log(fullPrompt(spec));
      }
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

/**
 * `pnpm art:svg` — rasterise every authored asset whose SVG exists, through
 * CONFORM and CHECK (G-038). `--id=<id>` or `--act=<act>` narrows it;
 * `--sheet` rebuilds the review page afterwards. Pack with `pnpm art:pack`.
 */
async function cmdSvg(argv: string[]): Promise<number> {
  const { runSvgAsset } = await import('./pipeline');
  const { svgPathFor } = await import('./rasterise');
  const id = argv.find((a) => a.startsWith('--id='))?.slice('--id='.length);
  const act = argv.find((a) => a.startsWith('--act='))?.slice('--act='.length);

  const matched = ALL_ASSETS.filter((s) => (!id || s.id === id) && (!act || s.act === act));
  if ((id || act) && matched.length === 0) {
    log(`No assets matched${id ? ` --id=${id}` : ''}${act ? ` --act=${act}` : ''}.`);
    return 1;
  }
  // Only authored assets are rasterised. A rendered or generated sprite is
  // never overwritten from an SVG, stale or otherwise.
  for (const s of matched.filter((m) => m.source !== 'svg')) {
    log(
      `  skip ${s.id}: not authored SVG (${s.source === 'render' ? 'rendered — `pnpm art:intake`' : 'generated — `pnpm art:batch`'})`,
    );
  }
  const candidates = matched.filter((s) => s.source === 'svg');
  const present = candidates.filter((s) => existsSync(svgPathFor(s, root)));
  const missing = candidates.filter((s) => !present.includes(s));
  if (missing.length > 0) {
    log(`Not drawn yet (no SVG): ${missing.map((s) => s.id).join(', ')}`);
  }
  if (present.length === 0) {
    log('No authored SVGs to rasterise.');
    return 0;
  }

  let failed = 0;
  for (const spec of present) {
    try {
      const o = await runSvgAsset(spec, { root, onProgress: log });
      if (!o.ok) {
        failed++;
        for (const r of o.report?.results ?? []) {
          if (!r.pass) {
            log(
              `      ${r.name}: measured ${r.measured}${r.detail ? ` (${r.detail})` : ''}, ` +
                `expected ${r.expected}`,
            );
          }
        }
      }
    } catch (err) {
      // D-007 and law 11 refusals land here, as do unreadable SVGs. All of
      // them fail the run; none of them is retried.
      failed++;
      log(`  ${spec.id}: REFUSED — ${err instanceof Error ? err.message : String(err)}`);
    }
  }
  log(`\n${present.length - failed}/${present.length} authored asset(s) passed.`);
  if (failed === 0) log('Run `pnpm art:pack` to rebuild the atlases.');
  if (argv.includes('--sheet')) await cmdSheet();
  return failed === 0 ? 0 : 1;
}

/**
 * `pnpm art:intake` — take rendered characters in: `<dir>/<id>.png` (cut out,
 * with a real alpha channel) and `<dir>/<id>.json` (its provenance), through
 * CONFORM and CHECK for the spec's finish. `--act=<act>` or `--id=<id>`
 * narrows it; `--dir=<path>` defaults to `assets/raw`. An asset whose PNG is
 * not there yet is one line and not an error. A refusal (no sidecar, no
 * alpha, D-007) or a failed CHECK writes nothing and fails the run. Pack
 * with `pnpm art:pack`.
 */
async function cmdIntake(argv: string[]): Promise<number> {
  const { IntakeRefusal, intakePaths, runIntakeAsset } = await import('./pipeline');
  const id = argv.find((a) => a.startsWith('--id='))?.slice('--id='.length);
  const act = argv.find((a) => a.startsWith('--act='))?.slice('--act='.length);
  const dirArg = argv.find((a) => a.startsWith('--dir='))?.slice('--dir='.length) ?? 'assets/raw';
  const dir = resolve(root, dirArg);

  const candidates = ALL_ASSETS.filter(
    (s) => s.source === 'render' && (!id || s.id === id) && (!act || s.act === act),
  );
  if (candidates.length === 0) {
    log(`No rendered assets matched${id ? ` --id=${id}` : ''}${act ? ` --act=${act}` : ''}.`);
    return 1;
  }

  let taken = 0;
  let failed = 0;
  let absent = 0;
  for (const spec of candidates) {
    const { png } = intakePaths(spec, dir);
    if (!existsSync(png)) {
      absent++;
      log(`  ${spec.id}: no file — expected ${relative(root, png) || png}`);
      continue;
    }
    try {
      const o = await runIntakeAsset(spec, { root, dir, onProgress: log });
      if (o.ok) {
        taken++;
        continue;
      }
      failed++;
      for (const r of o.report?.results ?? []) {
        if (!r.pass && !r.skipped) {
          log(
            `      ${r.name}: measured ${r.measured}${r.detail ? ` (${r.detail})` : ''}, ` +
              `expected ${r.expected}`,
          );
        }
      }
    } catch (err) {
      // No sidecar, no alpha, a D-007 or law 11 refusal: nothing written,
      // and none of them is retried.
      failed++;
      const refusal =
        err instanceof IntakeRefusal ||
        (err instanceof Error && (err.name === 'ContentRuleViolation' || err.name === 'ReservationError'));
      log(`  ${spec.id}: ${refusal ? 'REFUSED' : 'ERROR'} — ${err instanceof Error ? err.message : String(err)}`);
    }
  }
  const present = candidates.length - absent;
  const where = relative(root, dir) || dir;
  log(
    present === 0
      ? `\nNothing to take in: no rendered PNG in ${where} yet.`
      : `\n${taken}/${present} rendered asset(s) taken in${absent > 0 ? `; ${absent} with no file in ${where}` : ''}.`,
  );
  if (taken > 0 && failed === 0) log('Run `pnpm art:pack` to rebuild the atlases.');
  return failed === 0 ? 0 : 1;
}

async function cmdPack(): Promise<number> {
  let packed = 0;
  // Icons are game-wide UI art and get their own atlas: an act atlas is loaded
  // per act, and reloading School should not re-fetch the offer cards' art.
  {
    const entries: PackEntry[] = [];
    for (const spec of ITEM_ICONS) {
      const file = resolve(root, `assets/sprites/${spec.act}/${spec.id}.png`);
      try {
        entries.push({ id: spec.id, bitmap: await fromPng(readFileSync(file)) });
      } catch {
        // Not generated yet.
      }
    }
    if (entries.length > 0) {
      const result = pack(entries, 'icons.png');
      const png = resolve(root, 'assets/atlas/icons.png');
      mkdirSync(dirname(png), { recursive: true });
      writeFileSync(png, await toPng(result.image));
      writeFileSync(
        resolve(root, 'assets/atlas/icons.json'),
        `${JSON.stringify(result.atlas, null, 2)}
`,
      );
      log(`packed ${entries.length} icon(s) into assets/atlas/icons.png`);
      packed++;
    }
  }
  for (const act of ACT_IDS) {
    const entries: PackEntry[] = [];
    for (const spec of ALL_ASSETS.filter((s) => s.act === act && s.role !== 'icon')) {
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
    case 'svg':
      return cmdSvg(argv);
    case 'intake':
      return cmdIntake(argv);
    default:
      log(`Unknown command "${cmd}". Try: batch | svg | intake | pack | sheet`);
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
