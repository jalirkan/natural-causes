import { existsSync, mkdirSync, mkdtempSync, readFileSync, rmSync, writeFileSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join, resolve } from 'node:path';
import sharp from 'sharp';
import { afterAll, describe, expect, it } from 'vitest';
import { blank, fromPng, index, toPng, type Bitmap } from '../bitmap';
import { ALL_ASSETS } from '../batch';
import { ContentRuleViolation } from '../content-rule';
import { INK, actPalette } from '../palette';
import {
  IntakeRefusal,
  checkRows,
  conformAndCheck,
  recordedChecks,
  runIntakeAsset,
  type RenderSidecar,
} from '../pipeline';
import { sha256 } from '../rasterise';
import type { AssetSpec } from '../types';

/**
 * The render intake: a character rendered by an image model and cut out by
 * an external tool comes in through CONFORM and CHECK without the flat-art
 * corrections — no palette snap, no ink outline, no binarised alpha — and
 * without the checks that only mean anything for flat art.
 */

const tmp = mkdtempSync(join(tmpdir(), 'nc-intake-'));
afterAll(() => rmSync(tmp, { recursive: true, force: true }));

const hallMonitor = ALL_ASSETS.find((s) => s.id === 'hall-monitor')!;

/**
 * A stand-in for a toy render: a round body lit from the upper left (a
 * smooth radial gradient), a soft alpha edge a few pixels wide, and two dark
 * eyes. Nothing in it is on any act's palette.
 */
function toyRender(size = 160): Bitmap {
  const bmp = blank(size, size);
  const c = size / 2;
  const r = size * 0.42;
  const light = { x: size * 0.38, y: size * 0.34 };
  for (let y = 0; y < size; y++) {
    for (let x = 0; x < size; x++) {
      const d = Math.hypot(x - c, y - c);
      const alpha = Math.max(0, Math.min(1, (r - d) / 6));
      if (alpha === 0) continue;
      const t = Math.min(1, Math.hypot(x - light.x, y - light.y) / (r * 1.6));
      const eye =
        Math.hypot(x - c * 0.8, y - c * 0.9) < size * 0.05 ||
        Math.hypot(x - c * 1.2, y - c * 0.9) < size * 0.05;
      const i = index(bmp, x, y);
      if (eye) {
        bmp.data.set([35, 40, 70], i);
      } else {
        bmp.data[i] = Math.round(236 - 120 * t);
        bmp.data[i + 1] = Math.round(170 - 90 * t);
        bmp.data[i + 2] = Math.round(120 - 50 * t);
      }
      bmp.data[i + 3] = Math.round(alpha * 255);
    }
  }
  return bmp;
}

function distinctColours(bmp: Bitmap): number {
  const seen = new Set<number>();
  for (let i = 0; i < bmp.data.length; i += 4) {
    if (bmp.data[i + 3] === 0) continue;
    seen.add((bmp.data[i]! << 16) | (bmp.data[i + 1]! << 8) | bmp.data[i + 2]!);
  }
  return seen.size;
}

/** Opaque pixels on the silhouette's rim that are exactly ink: CONFORM's outline. */
function inkRimPixels(bmp: Bitmap): number {
  let n = 0;
  for (let y = 0; y < bmp.height; y++) {
    for (let x = 0; x < bmp.width; x++) {
      const i = index(bmp, x, y);
      if (bmp.data[i + 3] === 0) continue;
      const rim = [
        [1, 0],
        [-1, 0],
        [0, 1],
        [0, -1],
      ].some(([dx, dy]) => {
        const nx = x + dx!;
        const ny = y + dy!;
        return nx < 0 || ny < 0 || nx >= bmp.width || ny >= bmp.height || bmp.data[index(bmp, nx, ny) + 3] === 0;
      });
      if (rim && bmp.data[i] === INK.rgb[0] && bmp.data[i + 1] === INK.rgb[1] && bmp.data[i + 2] === INK.rgb[2]) n++;
    }
  }
  return n;
}

const PALETTE_CHECKS = ['palette-conformance', 'palette-variety', 'palette-dominance', 'enemy-value-ceiling'];
const RENDER_CHECKS = [
  'silhouette-area',
  'background-contrast',
  'background-contrast-coverage',
  'readable-48px-silhouette',
  'readable-48px-structure',
  'readable-48px-detail',
];

describe('the School characters are rendered', () => {
  it('the seven School specs are source render, finish render', () => {
    const school = ALL_ASSETS.filter((s) => s.act === 'school');
    expect(school.map((s) => s.id).sort()).toEqual([
      'boss-gym-teacher',
      'clique',
      'dodgeball',
      'hall-monitor',
      'homework',
      'player-school',
      'substitute-teacher',
    ]);
    for (const spec of school) {
      expect(spec.source, spec.id).toBe('render');
      expect(spec.finish, spec.id).toBe('render');
    }
  });
});

describe('a render keeps its shading through CONFORM and CHECK', () => {
  it('a smooth gradient survives, with a soft edge and no ink ring; the palette checks are skipped', async () => {
    const { sprite, report } = await conformAndCheck(hallMonitor, toyRender());
    expect(sprite.width).toBe(hallMonitor.targetSize);
    expect(sprite.height).toBe(hallMonitor.targetSize);

    expect(distinctColours(sprite)).toBeGreaterThan(64);
    expect(inkRimPixels(sprite)).toBe(0);
    const alphas = new Set<number>();
    for (let i = 3; i < sprite.data.length; i += 4) alphas.add(sprite.data[i]!);
    expect([...alphas].some((a) => a > 8 && a < 255), 'the soft edge was binarised').toBe(true);
    expect([...alphas].some((a) => a > 0 && a < 8), 'alpha under 8 should be cleared').toBe(false);

    for (const name of PALETTE_CHECKS) {
      const r = report.results.find((x) => x.name === name);
      expect(r, `${name} is listed`).toBeDefined();
      expect(r!.skipped, `${name} skipped`).toBe(true);
      expect(r!.pass, `${name} is not a pass`).toBe(false);
    }
    for (const name of RENDER_CHECKS) {
      const r = report.results.find((x) => x.name === name);
      expect(r, `${name} ran`).toBeDefined();
      expect(r!.skipped, name).toBeUndefined();
    }
    expect(report.failures.filter((f) => PALETTE_CHECKS.some((n) => f.startsWith(n)))).toEqual([]);
    expect(report.pass, report.failures.join(', ')).toBe(true);

    const rows = checkRows(recordedChecks(report));
    expect(rows).toContain('| palette-conformance | skipped | — |');
    expect(rows).toContain('| silhouette-area | pass |');
  });

  it('the same bitmap under a flat spec is quantised, outlined and hard-edged as before', async () => {
    const flat: AssetSpec = { ...hallMonitor, source: 'svg', finish: 'flat' };
    const { sprite, report } = await conformAndCheck(flat, toyRender());
    expect(distinctColours(sprite)).toBeLessThanOrEqual(actPalette('school').length);
    expect(inkRimPixels(sprite)).toBeGreaterThan(0);
    for (let i = 3; i < sprite.data.length; i += 4) expect([0, 255]).toContain(sprite.data[i]);
    expect(report.results.some((r) => r.skipped)).toBe(false);
    expect(report.results.find((r) => r.name === 'palette-conformance')!.pass).toBe(true);
  });
});

const SIDECAR: RenderSidecar = {
  model: 'stabilityai/sdxl-turbo',
  seed: 424242,
  steps: 4,
  guidance: 0,
  width: 640,
  height: 640,
  prompt: 'a soft vinyl toy of a hall monitor with a wide sash, studio light, plain ground',
  negative: 'text, watermark, blurry',
  cutter: 'test fixture (already cut)',
  generatedAt: '2026-09-29T00:00:00.000Z',
};

function stage(root: string, id: string, png: Buffer | null, sidecar: unknown): void {
  const dir = resolve(root, 'assets/raw');
  mkdirSync(dir, { recursive: true });
  if (png) writeFileSync(resolve(dir, `${id}.png`), png);
  if (sidecar !== null) writeFileSync(resolve(dir, `${id}.json`), JSON.stringify(sidecar, null, 2));
}

describe('art:intake refuses what it cannot take in, and writes nothing', () => {
  it('a PNG with no alpha channel', async () => {
    const root = mkdtempSync(join(tmp, 'opaque-'));
    const rgb = await sharp({ create: { width: 64, height: 64, channels: 3, background: '#C08050' } }).png().toBuffer();
    stage(root, hallMonitor.id, rgb, SIDECAR);
    await expect(runIntakeAsset(hallMonitor, { root })).rejects.toThrow(IntakeRefusal);
    await expect(runIntakeAsset(hallMonitor, { root })).rejects.toThrow(/no alpha/);
    expect(existsSync(resolve(root, 'assets/sprites'))).toBe(false);
    expect(existsSync(resolve(root, 'assets/prompts'))).toBe(false);
  });

  it('an alpha channel that is opaque everywhere', async () => {
    const root = mkdtempSync(join(tmp, 'opaque-rgba-'));
    const bmp = blank(32, 32);
    for (let i = 0; i < bmp.data.length; i += 4) bmp.data.set([200, 160, 120, 255], i);
    stage(root, hallMonitor.id, await toPng(bmp), SIDECAR);
    await expect(runIntakeAsset(hallMonitor, { root })).rejects.toThrow(/no alpha/);
    expect(existsSync(resolve(root, 'assets/sprites'))).toBe(false);
  });

  it('a missing sidecar', async () => {
    const root = mkdtempSync(join(tmp, 'nosidecar-'));
    stage(root, hallMonitor.id, await toPng(toyRender()), null);
    await expect(runIntakeAsset(hallMonitor, { root })).rejects.toThrow(/no sidecar/);
    expect(existsSync(resolve(root, 'assets/sprites'))).toBe(false);
    expect(existsSync(resolve(root, 'assets/prompts'))).toBe(false);
  });

  it('a sidecar missing a field, naming it', async () => {
    const root = mkdtempSync(join(tmp, 'partial-'));
    const { seed: _seed, ...partial } = SIDECAR;
    stage(root, hallMonitor.id, await toPng(toyRender()), partial);
    await expect(runIntakeAsset(hallMonitor, { root })).rejects.toThrow(/seed \(number\)/);
    expect(existsSync(resolve(root, 'assets/sprites'))).toBe(false);
  });

  it('D-007: a sidecar whose prompt names a nationality', async () => {
    const root = mkdtempSync(join(tmp, 'd007-'));
    // The content-rule suite's own fixture phrase: this is the refusal test.
    stage(root, hallMonitor.id, await toPng(toyRender()), { ...SIDECAR, prompt: 'an afghan villager' });
    await expect(runIntakeAsset(hallMonitor, { root })).rejects.toThrow(ContentRuleViolation);
    expect(existsSync(resolve(root, 'assets/sprites'))).toBe(false);
    expect(existsSync(resolve(root, 'assets/prompts'))).toBe(false);
  });

  it('D-007 reads the negative too', async () => {
    const root = mkdtempSync(join(tmp, 'd007-neg-'));
    stage(root, hallMonitor.id, await toPng(toyRender()), { ...SIDECAR, negative: 'an afghan villager' });
    await expect(runIntakeAsset(hallMonitor, { root })).rejects.toThrow(ContentRuleViolation);
    expect(existsSync(resolve(root, 'assets/sprites'))).toBe(false);
  });

  it('a failed CHECK writes nothing', async () => {
    const root = mkdtempSync(join(tmp, 'slab-'));
    // A full square with one cut corner: it has alpha, and fills its canvas
    // far past the silhouette ceiling.
    const slab = blank(64, 64);
    for (let i = 0; i < slab.data.length; i += 4) slab.data.set([150, 110, 80, 255], i);
    slab.data[3] = 0;
    stage(root, hallMonitor.id, await toPng(slab), SIDECAR);
    const outcome = await runIntakeAsset(hallMonitor, { root });
    expect(outcome.ok).toBe(false);
    expect(outcome.failures.some((f) => f.startsWith('silhouette-area'))).toBe(true);
    expect(existsSync(resolve(root, 'assets/sprites'))).toBe(false);
    expect(existsSync(resolve(root, 'assets/prompts'))).toBe(false);
  });

  it('a spec that is not rendered', async () => {
    const root = mkdtempSync(join(tmp, 'notrender-'));
    await expect(runIntakeAsset({ ...hallMonitor, source: 'svg' }, { root })).rejects.toThrow(/source: 'render'/);
  });
});

describe('art:intake round trip', () => {
  it('a cut-out render and its sidecar become a sprite and its provenance', async () => {
    const root = mkdtempSync(join(tmp, 'roundtrip-'));
    const png = await toPng(toyRender());
    stage(root, hallMonitor.id, png, SIDECAR);

    const outcome = await runIntakeAsset(hallMonitor, { root });
    expect(outcome.failures).toEqual([]);
    expect(outcome.ok).toBe(true);
    expect(outcome.rawSha256).toBe(sha256(png));

    const spriteFile = resolve(root, 'assets/sprites/school/hall-monitor.png');
    expect(existsSync(spriteFile)).toBe(true);
    const sprite = await fromPng(readFileSync(spriteFile));
    expect(sprite.width).toBe(hallMonitor.targetSize);
    expect(distinctColours(sprite)).toBeGreaterThan(64);

    const md = readFileSync(resolve(root, 'assets/prompts/hall-monitor.md'), 'utf8');
    expect(md).toContain('## Mechanical checks');
    expect(md).toContain(`\`${SIDECAR.model}\``);
    expect(md).toContain(`\`${SIDECAR.seed}\``);
    expect(md).toContain(SIDECAR.prompt);
    expect(md).toContain(SIDECAR.negative);
    expect(md).toContain(SIDECAR.cutter);
    expect(md).toContain(sha256(png));
    expect(md).toContain('| palette-conformance | skipped |');
    expect(md).toContain('| enemy-value-ceiling | skipped |');
    for (const name of RENDER_CHECKS) expect(md).toContain(`| ${name} | pass |`);
    // The table is the one the review page reads: rows under the heading.
    const table = md.split('## Mechanical checks')[1]!.split('##')[0]!;
    expect(table.split('\n').filter((l) => l.startsWith('| ') && !l.startsWith('| Check'))).toHaveLength(
      RENDER_CHECKS.length + PALETTE_CHECKS.length,
    );
  });

  it('--dir: the PNG and sidecar can live anywhere', async () => {
    const root = mkdtempSync(join(tmp, 'dir-'));
    const elsewhere = mkdtempSync(join(tmp, 'renders-'));
    writeFileSync(resolve(elsewhere, 'hall-monitor.png'), await toPng(toyRender()));
    writeFileSync(resolve(elsewhere, 'hall-monitor.json'), JSON.stringify(SIDECAR));
    const outcome = await runIntakeAsset(hallMonitor, { root, dir: elsewhere });
    expect(outcome.ok).toBe(true);
    expect(existsSync(resolve(root, 'assets/sprites/school/hall-monitor.png'))).toBe(true);
  });
});
