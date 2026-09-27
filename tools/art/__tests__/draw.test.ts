import { existsSync, readdirSync } from 'node:fs';
import { resolve } from 'node:path';
import { describe, expect, it } from 'vitest';
import { DRAWN_ONLY, STAND_INS, drawAsset, drawableSpecs, packableIds, placeStandIn, svgPath } from '../draw';
import { ACT_IDS } from '../palette';

const root = resolve(__dirname, '../../..');

/**
 * Every drawing in the repository passes the same gates a generated sprite
 * does (D-005, G-032): it is the one place a drawn asset can fail the laws,
 * so it runs in CI. Nothing is written; the sprite on disk is what
 * `pnpm art:draw` last produced and is checked by laws.test.ts like any other.
 */
describe('drawn assets', () => {
  const drawn = drawableSpecs().filter((s) => existsSync(svgPath(root, s)));

  it('every SVG on disk belongs to a spec the pipeline knows', () => {
    for (const act of ACT_IDS) {
      const dir = resolve(root, `assets/svg/${act}`);
      if (!existsSync(dir)) continue;
      for (const file of readdirSync(dir)) {
        const id = file.replace(/\.svg$/, '');
        expect(
          drawableSpecs().some((s) => s.act === act && s.id === id),
          `assets/svg/${act}/${file} has no spec`,
        ).toBe(true);
      }
    }
  });

  for (const spec of drawn) {
    it(`${spec.act}/${spec.id} conforms and passes every check`, async () => {
      const outcome = await drawAsset(root, spec, { write: false });
      const failed = outcome.report?.results.filter((r) => !r.pass).map((r) => `${r.name}=${r.measured}`);
      expect(outcome.error).toBeUndefined();
      expect(failed, `checks failed: ${failed?.join(', ')}`).toEqual([]);
      expect(outcome.violations).toEqual([]);
      expect(outcome.sprite?.width).toBe(spec.targetSize);
    });
  }

  for (const s of STAND_INS) {
    it(`stand-in ${s.act}/${s.id} passes against its borrowed act's background`, async () => {
      const outcome = await placeStandIn(root, s, { write: false });
      const failed = outcome.report?.results.filter((r) => !r.pass).map((r) => `${r.name}=${r.measured}`);
      expect(outcome.error).toBeUndefined();
      expect(failed, `checks failed: ${failed?.join(', ')}`).toEqual([]);
    });
  }

  it('drawn-only assets are packable in their act and nowhere else', () => {
    for (const s of DRAWN_ONLY) {
      expect(packableIds(s.act)).toContain(s.id);
      for (const act of ACT_IDS) if (act !== s.act) expect(packableIds(act)).not.toContain(s.id);
    }
  });
});
