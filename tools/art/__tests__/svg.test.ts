import { existsSync, mkdtempSync, readFileSync, rmSync, writeFileSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join, resolve } from 'node:path';
import { afterAll, describe, expect, it } from 'vitest';
import { opaqueBounds } from '../bitmap';
import { ALL_ASSETS } from '../batch';
import { conform, outlineWidthFor } from '../conform';
import { ContentRuleViolation } from '../content-rule';
import { enemyPalette } from '../palette';
import { runAsset, runSvgAsset } from '../pipeline';
import {
  boxDownsample,
  rasteriseSvg,
  rasteriseSvgBuffer,
  recordedSvgSha,
  sha256,
  svgPathFor,
  svgTextFields,
} from '../rasterise';
import { ReservationError } from '../reservations';
import type { AssetSpec } from '../types';

/**
 * G-038: the SVG stage. Authored vectors in, through the same CONFORM and
 * CHECK as generated art. The stage rasterises; it never corrects.
 */

const tmp = mkdtempSync(join(tmpdir(), 'nc-svg-'));
afterAll(() => rmSync(tmp, { recursive: true, force: true }));

function svgFile(name: string, body: string): string {
  const file = join(tmp, name);
  writeFileSync(
    file,
    `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 100 100">${body}</svg>`,
  );
  return file;
}

// A lumpy blob with a face, drawn partly off-palette: #FF0000 is in no act's
// palette. CONFORM has to snap it and nothing before CONFORM may touch it.
const BLOB = `
  <title>Test blob</title>
  <desc>A fixture shape with a face.</desc>
  <path d="M20 30 C20 10 80 10 80 30 L85 80 C60 95 40 95 15 80 Z" fill="#6B7F53"/>
  <circle cx="50" cy="68" r="12" fill="#FF0000"/>
  <circle cx="42" cy="50" r="4" fill="#2A2521"/>
  <circle cx="58" cy="50" r="4" fill="#2A2521"/>
`;

const hallMonitor = ALL_ASSETS.find((s) => s.id === 'hall-monitor')!;

describe('the SVG stage rasterises to the size CONFORM wants', () => {
  it('the trimmed content lands exactly on targetSize − 2·outline', async () => {
    const file = svgFile('blob.svg', BLOB);
    for (const targetSize of [44, 88, 112, 384]) {
      const r = await rasteriseSvgBuffer(readFileSync(file), targetSize);
      const inner = targetSize - 2 * outlineWidthFor(targetSize);
      expect(r.inner).toBe(inner);
      expect(r.fitted, `${targetSize}px`).toBe(true);
      // CONFORM crops at alpha > 8; its crop must be the whole bitmap, so
      // its nearest-neighbour resize is the identity.
      const b = opaqueBounds(r.bitmap)!;
      expect(b.right - b.left + 1).toBe(r.bitmap.width);
      expect(b.bottom - b.top + 1).toBe(r.bitmap.height);
      expect(Math.max(r.bitmap.width, r.bitmap.height), `${targetSize}px`).toBe(inner);
    }
  });

  it('rasteriseSvg reads a path and returns the fitted bitmap', async () => {
    const file = svgFile('blob2.svg', BLOB);
    const bmp = await rasteriseSvg(file, { targetSize: 88 });
    expect(Math.max(bmp.width, bmp.height)).toBe(88 - 2 * outlineWidthFor(88));
  });

  it('CONFORM still quantises: only palette colours survive, off-palette fills included', async () => {
    const file = svgFile('blob3.svg', BLOB);
    const bmp = await rasteriseSvg(file, { targetSize: 88 });
    // Before CONFORM the red is still red — this stage does not correct.
    let sawRed = false;
    for (let i = 0; i < bmp.data.length; i += 4) {
      if (bmp.data[i + 3]! > 200 && bmp.data[i]! > 240 && bmp.data[i + 1]! < 20) sawRed = true;
    }
    expect(sawRed, 'the rasteriser altered an off-palette colour').toBe(true);

    const out = await conform(bmp, { act: 'school', targetSize: 88, forEnemy: true });
    expect(out.width).toBe(88);
    expect(out.height).toBe(88);
    const legal = new Set(enemyPalette('school').map((c) => c.hex.toUpperCase()));
    for (let i = 0; i < out.data.length; i += 4) {
      const a = out.data[i + 3]!;
      expect([0, 255]).toContain(a);
      if (a === 0) continue;
      const hex = `#${[0, 1, 2].map((k) => out.data[i + k]!.toString(16).padStart(2, '0')).join('')}`.toUpperCase();
      expect(legal.has(hex), `${hex} is not in School's enemy palette`).toBe(true);
    }
  });

  it('boxDownsample: alpha is coverage, colour is never a blend', () => {
    // One opaque bone pixel and three transparent: bone at quarter alpha, not
    // a darkened bone.
    const edge = { width: 2, height: 2, data: Buffer.alloc(16, 0) };
    edge.data.set([210, 198, 172, 255], 0);
    expect([...boxDownsample(edge, 2).data]).toEqual([210, 198, 172, 64]);

    // Three bone and one ink: bone, not a mid-grey that quantise would snap
    // to some third colour nobody drew.
    const seam = { width: 2, height: 2, data: Buffer.alloc(16, 0) };
    seam.data.set([210, 198, 172, 255, 210, 198, 172, 255, 210, 198, 172, 255, 42, 37, 33, 255]);
    expect([...boxDownsample(seam, 2).data]).toEqual([210, 198, 172, 255]);
  });
});

describe('the SVG stage is gated like generation was', () => {
  const unreserved: AssetSpec = {
    id: 'unreserved-thing',
    name: 'Unreserved thing',
    act: 'school',
    role: 'swarm',
    source: 'svg',
    subject: 'a shape nobody declared',
    seed: 1,
    targetSize: 88,
  };

  it('law 11 refuses an undeclared asset before its file is opened', async () => {
    // The path does not exist: reaching the rasteriser would be an ENOENT,
    // not a ReservationError.
    await expect(
      runSvgAsset(unreserved, { root: tmp, svgPath: join(tmp, 'does-not-exist.svg') }),
    ).rejects.toThrow(ReservationError);
  });

  it('law 11 refuses an act with no list', async () => {
    await expect(
      runSvgAsset({ ...unreserved, act: 'service' }, { root: tmp }),
    ).rejects.toThrow(/no reserved-silhouette list/);
  });

  it("D-007 runs on the SVG's own <title> and <desc>", async () => {
    const file = svgFile(
      'bad.svg',
      `<title>Hall monitor</title><desc>an afghan villager</desc><rect width="100" height="100" fill="#6E6353"/>`,
    );
    await expect(runSvgAsset(hallMonitor, { root: tmp, svgPath: file })).rejects.toThrow(
      ContentRuleViolation,
    );
    expect(existsSync(resolve(tmp, 'assets'))).toBe(false);
  });

  it('svgTextFields finds title, desc, text and comments', () => {
    const fields = svgTextFields(
      '<svg><title>T</title><desc>D <tspan>x</tspan></desc><!-- C --><text>W</text></svg>',
    );
    expect(Object.values(fields).sort()).toEqual(['C', 'D x', 'T', 'W']);
  });

  it('the generator refuses an authored asset', async () => {
    await expect(runAsset(hallMonitor, { root: tmp, maxAttempts: 1 })).rejects.toThrow(/art:svg/);
  });
});

describe('runSvgAsset writes on pass and only on pass', () => {
  it('a failed CHECK writes nothing', async () => {
    const root = mkdtempSync(join(tmp, 'fail-'));
    // A solid square: silhouette area far above the swarm ceiling, one colour.
    const file = svgFile('slab.svg', `<rect width="100" height="100" fill="#6E6353"/>`);
    const outcome = await runSvgAsset(hallMonitor, { root, svgPath: file });
    expect(outcome.ok).toBe(false);
    expect(outcome.failures.length).toBeGreaterThan(0);
    expect(existsSync(resolve(root, 'assets'))).toBe(false);
  });

  it('a pass writes the sprite and a provenance file carrying the SVG hash', async () => {
    const root = mkdtempSync(join(tmp, 'pass-'));
    const file = svgFile('pass.svg', BLOB);
    const outcome = await runSvgAsset(hallMonitor, { root, svgPath: file });
    expect(outcome.failures).toEqual([]);
    expect(outcome.ok).toBe(true);
    expect(existsSync(resolve(root, 'assets/sprites/school/hall-monitor.png'))).toBe(true);
    const md = readFileSync(resolve(root, 'assets/prompts/hall-monitor.md'), 'utf8');
    expect(recordedSvgSha(md)).toBe(sha256(readFileSync(file)));
    expect(md).toMatch(/## Mechanical checks/);
    expect(md).toMatch(/\*\*Rasteriser:\*\* sharp /);
  });
});

/**
 * D-010 made mechanical for authored art. A drawing committed without being
 * re-run has a sprite that is not its sprite; the hash in provenance is what
 * makes that visible. Nothing to check until an SVG exists.
 */
describe('every authored SVG in the repo has its sprite and matching provenance', () => {
  const authored = ALL_ASSETS.filter((s) => s.source === 'svg');

  for (const spec of authored) {
    it(`${spec.id}`, () => {
      const svg = svgPathFor(spec);
      if (!existsSync(svg)) return; // not drawn yet
      const sprite = resolve(process.cwd(), `assets/sprites/${spec.act}/${spec.id}.png`);
      const prov = resolve(process.cwd(), `assets/prompts/${spec.id}.md`);
      expect(existsSync(sprite), `${spec.id}: SVG exists but no sprite — run pnpm art:svg`).toBe(true);
      expect(existsSync(prov), `${spec.id}: no provenance — run pnpm art:svg`).toBe(true);
      expect(
        recordedSvgSha(readFileSync(prov, 'utf8')),
        `${spec.id}: the SVG changed since its sprite was rasterised — run pnpm art:svg`,
      ).toBe(sha256(readFileSync(svg)));
    });
  }
});
