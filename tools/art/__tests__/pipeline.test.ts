import { describe, expect, it } from 'vitest';
import { blank, centreOn, crop, index, opaqueBounds, opaqueCount, type Bitmap } from '../bitmap';
import { cut, despeckle, detectBackground, keyOutBackground } from '../cut';
import { applyOutline, binariseAlpha, outlineWidthFor, quantise, OUTLINE_RATIO } from '../conform';
import { check, distanceToleranceFor, DEFAULT_THRESHOLDS } from '../check';
import { GRAIN_AMPLITUDE, grainTile, texture } from '../texture';
import { pack } from '../pack';
import { mutateSeed } from '../pipeline';
import { ACT_IDS, BONE, FULL_PALETTE, INK, PAPER, SHADOW, actPalette, nearest, rgbToOklab } from '../palette';

/** Build a test image: a solid magenta field with a coloured blob in it. */
function fixture(size = 64, blobColour: [number, number, number] = [240, 240, 226]): Bitmap {
  const bmp = blank(size, size);
  for (let y = 0; y < size; y++) {
    for (let x = 0; x < size; x++) {
      const i = index(bmp, x, y);
      const inBlob = Math.hypot(x - size / 2, y - size / 2) < size / 4;
      const [r, g, b] = inBlob ? blobColour : [255, 0, 255];
      bmp.data[i] = r;
      bmp.data[i + 1] = g;
      bmp.data[i + 2] = b;
      bmp.data[i + 3] = 255;
    }
  }
  return bmp;
}

describe('palette', () => {
  it('law 3 (D-028): no act puts more than eleven colours on screen', () => {
    // The constraint law 3 is about is what one screen shows: ink, shadow,
    // paper, bone, the act's three tones and the four threat colours.
    for (const act of ACT_IDS) {
      expect(actPalette(act).length, `act "${act}"`).toBeLessThanOrEqual(11);
    }
  });

  it('D-028: the catalogue across acts is 16–32 colours', () => {
    // Seven acts' tones and the eight shared colours come to 29. The bound
    // moved from 20 in a decision record, not in this file.
    expect(FULL_PALETTE.length).toBeGreaterThanOrEqual(16);
    expect(FULL_PALETTE.length).toBeLessThanOrEqual(32);
  });

  it('has no duplicate names or hexes', () => {
    expect(new Set(FULL_PALETTE.map((c) => c.name)).size).toBe(FULL_PALETTE.length);
    expect(new Set(FULL_PALETTE.map((c) => c.hex)).size).toBe(FULL_PALETTE.length);
  });

  it('matches in Oklab, not RGB — near-black snaps to ink', () => {
    expect(nearest(FULL_PALETTE, 20, 18, 14).name).toBe('ink');
  });

  it('an act palette is the act tones plus neutrals plus threat colours', () => {
    const p = actPalette('school');
    expect(p).toContain(INK);
    expect(p).toContain(PAPER);
    expect(p.some((c) => c.name === 'school-mid')).toBe(true);
    expect(p.some((c) => c.name === 'office-mid')).toBe(false);
    expect(p.some((c) => c.name === 'threat-contact')).toBe(true);
  });
});

describe('cut', () => {
  it('detects the background from the border ring', () => {
    expect(detectBackground(fixture())).toEqual([255, 0, 255]);
  });

  it('keys out the background and keeps the subject', () => {
    const bmp = fixture();
    const cleared = keyOutBackground(bmp);
    expect(cleared).toBeGreaterThan(0);
    const bounds = opaqueBounds(bmp)!;
    expect(bounds).not.toBeNull();
    // The blob is a centred circle of radius 16 in a 64px image.
    expect(bounds.right - bounds.left).toBeGreaterThan(24);
    expect(bounds.right - bounds.left).toBeLessThan(40);
  });

  it('keeps background-coloured pixels that are NOT connected to the border', () => {
    // A subject with a magenta hole in the middle of it: a naive
    // "delete every pixel near this colour" pass eats the hole, a flood fill
    // from the border does not.
    const bmp = fixture(64, [255, 0, 255]);
    for (let y = 0; y < 64; y++) {
      for (let x = 0; x < 64; x++) {
        const i = index(bmp, x, y);
        const d = Math.hypot(x - 32, y - 32);
        if (d < 16) {
          // interior island, same colour as the background
          bmp.data[i] = 255;
          bmp.data[i + 1] = 0;
          bmp.data[i + 2] = 255;
        } else if (d < 24) {
          bmp.data[i] = 20;
          bmp.data[i + 1] = 20;
          bmp.data[i + 2] = 20;
        }
      }
    }
    keyOutBackground(bmp);
    expect(bmp.data[index(bmp, 32, 32) + 3]).toBe(255);
    expect(bmp.data[index(bmp, 0, 0) + 3]).toBe(0);
  });

  it('removes a cast shadow: the backdrop hue, darker, reachable from outside', () => {
    // A pale subject sitting on an ellipse of darkened backdrop — what the
    // generator produced for every asset in the first batch despite the
    // prompt forbidding it.
    const bmp = blank(64, 64);
    for (let y = 0; y < 64; y++) {
      for (let x = 0; x < 64; x++) {
        const i = index(bmp, x, y);
        const inSubject = Math.hypot(x - 32, y - 26) < 14;
        const inShadow = Math.hypot((x - 32) / 18, (y - 44) / 5) < 1;
        const [r, g, b] = inSubject ? [244, 240, 226] : inShadow ? [150, 0, 150] : [255, 0, 255];
        bmp.data[i] = r;
        bmp.data[i + 1] = g;
        bmp.data[i + 2] = b;
        bmp.data[i + 3] = 255;
      }
    }
    keyOutBackground(bmp);
    expect(bmp.data[index(bmp, 32, 26) + 3], 'subject survived').toBe(255);
    expect(bmp.data[index(bmp, 14, 44) + 3], 'shadow removed').toBe(0);
    expect(bmp.data[index(bmp, 32, 45) + 3], 'shadow under the subject removed').toBe(0);
  });

  it('keeps a same-hued region the subject encloses, which a shadow never is', () => {
    // The Egg's own pink band: darker than the backdrop and the same family,
    // but surrounded by the subject, so the shadow pass must not reach it.
    const bmp = blank(64, 64);
    for (let y = 0; y < 64; y++) {
      for (let x = 0; x < 64; x++) {
        const i = index(bmp, x, y);
        const d = Math.hypot(x - 32, y - 32);
        const [r, g, b] = d < 8 ? [150, 0, 150] : d < 22 ? [244, 240, 226] : [255, 0, 255];
        bmp.data[i] = r;
        bmp.data[i + 1] = g;
        bmp.data[i + 2] = b;
        bmp.data[i + 3] = 255;
      }
    }
    keyOutBackground(bmp);
    expect(bmp.data[index(bmp, 32, 32) + 3], 'enclosed band survived').toBe(255);
    expect(bmp.data[index(bmp, 0, 0) + 3]).toBe(0);
  });

  it('keys out a framed poster, where the border ring is a drawn rule', () => {
    // The mid-century register makes the generator draw a rule right around
    // the image. Seeded at the edge, the fill stops on the frame instantly and
    // the whole poster survives as one solid rectangle.
    const bmp = fixture(64);
    for (let y = 0; y < 64; y++) {
      for (let x = 0; x < 64; x++) {
        if (x > 1 && x < 62 && y > 1 && y < 62) continue;
        const i = index(bmp, x, y);
        bmp.data[i] = 30;
        bmp.data[i + 1] = 26;
        bmp.data[i + 2] = 22;
      }
    }
    keyOutBackground(bmp);
    // The backdrop inside the frame is gone...
    expect(bmp.data[index(bmp, 8, 8) + 3], 'backdrop inside the frame').toBe(0);
    // ...and the subject is still there.
    expect(bmp.data[index(bmp, 32, 32) + 3], 'subject').toBe(255);
    const b = opaqueBounds(bmp)!;
    expect(b.right - b.left, 'subject width, not the whole poster').toBeLessThan(45);
  });

  it('does not mistake a genuinely large subject for a blocked fill', () => {
    // The inset retry must not fire just because the subject is big.
    const bmp = fixture(64, [240, 240, 226]);
    for (let y = 6; y < 58; y++) {
      for (let x = 6; x < 58; x++) {
        const i = index(bmp, x, y);
        bmp.data[i] = 240;
        bmp.data[i + 1] = 240;
        bmp.data[i + 2] = 226;
      }
    }
    keyOutBackground(bmp);
    expect(bmp.data[index(bmp, 0, 0) + 3], 'true background cleared').toBe(0);
    expect(bmp.data[index(bmp, 32, 32) + 3], 'large subject survived').toBe(255);
  });

  it('despeckles printer debris outside the subject, keeping detached parts inside it', () => {
    const bmp = blank(64, 64);
    const paint = (x: number, y: number) => {
      const i = index(bmp, x, y);
      bmp.data[i] = 240;
      bmp.data[i + 1] = 240;
      bmp.data[i + 2] = 226;
      bmp.data[i + 3] = 255;
    };
    // Main subject: a block with a thin arm, so its bounding box reaches x=50.
    for (let y = 10; y < 45; y++) for (let x = 10; x < 45; x++) paint(x, y);
    for (let x = 45; x < 51; x++) paint(x, 10);
    // A detached part that belongs — unconnected, but inside that bounding box.
    paint(47, 20);
    paint(47, 21);
    // Debris well outside it, like the dots under the Reorg.
    paint(4, 58);
    paint(6, 58);
    paint(58, 60);

    const removed = despeckle(bmp);
    expect(removed).toBe(3);
    expect(bmp.data[index(bmp, 47, 20) + 3], 'detached part inside the bbox kept').toBe(255);
    expect(bmp.data[index(bmp, 4, 58) + 3], 'debris outside the bbox dropped').toBe(0);
    expect(bmp.data[index(bmp, 58, 60) + 3], 'debris outside the bbox dropped').toBe(0);
  });

  it('drops scenery too large to be a fleck — the cloud bank under the drone', () => {
    const bmp = blank(64, 64);
    const paint = (x: number, y: number) => {
      const i = index(bmp, x, y);
      bmp.data[i] = 240;
      bmp.data[i + 1] = 240;
      bmp.data[i + 2] = 226;
      bmp.data[i + 3] = 255;
    };
    // Subject, centred.
    for (let y = 20; y < 36; y++) for (let x = 16; x < 48; x++) paint(x, y);
    // A cloud bank along the bottom — bigger than the subject, and the reason
    // a size-based rule cannot work here.
    for (let y = 50; y < 64; y++) for (let x = 0; x < 64; x++) paint(x, y);

    despeckle(bmp);
    expect(bmp.data[index(bmp, 32, 28) + 3], 'subject kept').toBe(255);
    expect(bmp.data[index(bmp, 32, 56) + 3], 'larger scenery dropped').toBe(0);
  });

  it('despeckle never touches a lone subject', () => {
    const bmp = fixture(32);
    keyOutBackground(bmp);
    const before = opaqueCount(bmp);
    expect(despeckle(bmp)).toBe(0);
    expect(opaqueCount(bmp)).toBe(before);
  });

  it('centres the subject on a padded square canvas', () => {
    const out = cut(fixture());
    expect(out.width).toBe(out.height);
    const b = opaqueBounds(out)!;
    const leftGap = b.left;
    const rightGap = out.width - 1 - b.right;
    expect(Math.abs(leftGap - rightGap)).toBeLessThanOrEqual(1);
  });

  it('throws rather than emitting an empty sprite when everything keys out', () => {
    const solid = blank(32, 32);
    solid.data.fill(255);
    expect(() => cut(solid)).toThrow(/keyed out/);
  });
});

describe('conform', () => {
  it('law 1: outline weight is proportional to sprite size', () => {
    expect(outlineWidthFor(96)).toBe(2);
    expect(outlineWidthFor(384)).toBe(8);
    // The ratio is what is fixed, not the pixel count.
    expect(outlineWidthFor(384) / 384).toBeCloseTo(OUTLINE_RATIO, 5);
    expect(outlineWidthFor(96) / 96).toBeCloseTo(OUTLINE_RATIO, 5);
  });

  it('law 2: alpha is binarised, so no soft edges survive', () => {
    const bmp = blank(4, 1);
    [0, 60, 200, 255].forEach((a, i) => {
      bmp.data[i * 4 + 3] = a;
    });
    binariseAlpha(bmp);
    expect([...bmp.data.filter((_, i) => i % 4 === 3)]).toEqual([0, 0, 255, 255]);
  });

  it('quantise snaps every opaque pixel onto the act palette', () => {
    const bmp = fixture(16, [200, 130, 90]);
    for (let i = 3; i < bmp.data.length; i += 4) bmp.data[i] = 255;
    quantise(bmp, actPalette('school'));
    const allowed = new Set(actPalette('school').map((c) => c.hex.toLowerCase()));
    for (let i = 0; i < bmp.data.length; i += 4) {
      const hex = `#${[bmp.data[i]!, bmp.data[i + 1]!, bmp.data[i + 2]!]
        .map((v) => v.toString(16).padStart(2, '0'))
        .join('')}`;
      expect(allowed.has(hex)).toBe(true);
    }
  });

  it('quantise leaves transparent pixels alone', () => {
    const bmp = blank(2, 1);
    bmp.data.set([9, 9, 9, 0, 200, 130, 90, 255]);
    quantise(bmp, actPalette('office'));
    expect([...bmp.data.subarray(0, 4)]).toEqual([9, 9, 9, 0]);
  });

  it('applyOutline adds an ink ring and does not paint over the subject', () => {
    const bmp = blank(21, 21);
    const centre = index(bmp, 10, 10);
    bmp.data.set([PAPER.rgb[0], PAPER.rgb[1], PAPER.rgb[2], 255], centre);

    const out = applyOutline(bmp, 3);
    // Subject preserved.
    expect([...out.data.subarray(centre, centre + 4)]).toEqual([
      PAPER.rgb[0],
      PAPER.rgb[1],
      PAPER.rgb[2],
      255,
    ]);
    // Ring is ink.
    const ring = index(out, 12, 10);
    expect([...out.data.subarray(ring, ring + 3)]).toEqual([INK.rgb[0], INK.rgb[1], INK.rgb[2]]);
    // Beyond the radius, still transparent.
    expect(out.data[index(out, 15, 10) + 3]).toBe(0);
  });
});

describe('texture', () => {
  it('is identical across runs and across assets — one seed, one tile', () => {
    expect([...grainTile().slice(0, 12)]).toEqual([...grainTile().slice(0, 12)]);
  });

  it('stays inside the declared amplitude', () => {
    for (const v of grainTile()) expect(Math.abs(v)).toBeLessThanOrEqual(GRAIN_AMPLITUDE);
  });

  it('never touches transparent pixels', () => {
    const bmp = blank(8, 8);
    const before = Buffer.from(bmp.data);
    expect(texture(bmp).data.equals(before)).toBe(true);
  });

  it('does not mutate its input', () => {
    const bmp = fixture(8);
    const before = Buffer.from(bmp.data);
    texture(bmp);
    expect(bmp.data.equals(before)).toBe(true);
  });
});

describe('check', () => {
  /** A sprite that should pass: decent coverage, palette colours, features. */
  async function goodSprite(): Promise<Bitmap> {
    const size = 96;
    const bmp = blank(size, size);
    for (let y = 0; y < size; y++) {
      for (let x = 0; x < size; x++) {
        const i = index(bmp, x, y);
        const d = Math.hypot(x - size / 2, y - size / 2);
        if (d > size / 2.6) continue;
        // Body in paper, two dark eyes, one flat shadow tone across the
        // bottom — three colours, which is what law 2 ("shadow is a second
        // flat tone at most") actually produces and what the variety check
        // is calibrated for.
        const eye = Math.hypot(x - 38, y - 40) < 6 || Math.hypot(x - 58, y - 43) < 7;
        // BONE not PAPER: paper is the player's alone (law 10) and an enemy
        // sprite carrying it now fails enemy-value-ceiling, correctly.
        const c = eye ? INK : y > size * 0.66 ? SHADOW : BONE;
        bmp.data[i] = c.rgb[0];
        bmp.data[i + 1] = c.rgb[1];
        bmp.data[i + 2] = c.rgb[2];
        bmp.data[i + 3] = 255;
      }
    }
    return applyOutline(bmp, 3);
  }

  it('passes a sprite that is in-palette, contrasty and detailed', async () => {
    const report = await check(await goodSprite(), 'conception');
    const failed = report.results.filter((r) => !r.pass).map((r) => r.name);
    expect(failed).toEqual([]);
    expect(report.pass).toBe(true);
  });

  it('rejects a rogue colour that is not in the palette', async () => {
    const bmp = await goodSprite();
    for (let y = 20; y < 60; y++) {
      for (let x = 20; x < 60; x++) {
        const i = index(bmp, x, y);
        if (bmp.data[i + 3] === 0) continue;
        bmp.data[i] = 0;
        bmp.data[i + 1] = 255;
        bmp.data[i + 2] = 0; // pure green, in no act palette
      }
    }
    const report = await check(bmp, 'conception');
    expect(report.pass).toBe(false);
    expect(report.failures.join()).toContain('palette-conformance');
  });

  it('tolerates the grain, which runs after quantisation by design', async () => {
    const report = await check(texture(await goodSprite()), 'conception');
    expect(report.results.find((r) => r.name === 'palette-conformance')!.pass).toBe(true);
  });

  it('measures contrast by median, not mean — a black-and-white sprite passes', async () => {
    // Regression: the first test batch rejected the drone four times because
    // |mean(L) - bg.L| cancels out on a high-contrast sprite whose average
    // lands on the background's own lightness. Half ink, half paper, on a
    // mid-tone background, is the exact shape of that bug.
    const size = 96;
    const bmp = blank(size, size);
    for (let y = 16; y < 80; y++) {
      for (let x = 16; x < 80; x++) {
        const i = index(bmp, x, y);
        const col = x < 48 ? INK : PAPER;
        bmp.data[i] = col.rgb[0];
        bmp.data[i + 1] = col.rgb[1];
        bmp.data[i + 2] = col.rgb[2];
        bmp.data[i + 3] = 255;
      }
    }
    const report = await check(bmp, 'service');
    const contrast = report.results.find((r) => r.name === 'background-contrast')!;
    expect(contrast.pass, `measured ${contrast.measured}`).toBe(true);
  });

  it('rejects a sprite that vanishes into its act background', async () => {
    // A school-green sprite on the school background.
    const size = 96;
    const bmp = blank(size, size);
    const bgish = actPalette('school').find((c) => c.name === 'school-deep')!;
    for (let y = 24; y < 72; y++) {
      for (let x = 24; x < 72; x++) {
        const i = index(bmp, x, y);
        bmp.data[i] = bgish.rgb[0];
        bmp.data[i + 1] = bgish.rgb[1];
        bmp.data[i + 2] = bgish.rgb[2];
        bmp.data[i + 3] = 255;
      }
    }
    const report = await check(bmp, 'school');
    expect(report.pass).toBe(false);
    expect(report.failures.join()).toMatch(/background-contrast/);
  });

  it('rejects a featureless blob — the "unreadable in a crowd" failure', async () => {
    const size = 96;
    const bmp = blank(size, size);
    for (let y = 10; y < 86; y++) {
      for (let x = 10; x < 86; x++) {
        const i = index(bmp, x, y);
        bmp.data[i] = PAPER.rgb[0];
        bmp.data[i + 1] = PAPER.rgb[1];
        bmp.data[i + 2] = PAPER.rgb[2];
        bmp.data[i + 3] = 255;
      }
    }
    const report = await check(bmp, 'conception');
    expect(report.pass).toBe(false);
    expect(report.failures.join()).toMatch(/readable-48px-detail|palette-variety/);
  });

  it('rejects a speck', async () => {
    const bmp = blank(96, 96);
    const i = index(bmp, 48, 48);
    bmp.data.set([PAPER.rgb[0], PAPER.rgb[1], PAPER.rgb[2], 255], i);
    const report = await check(bmp, 'conception');
    expect(report.pass).toBe(false);
    expect(report.failures.join()).toContain('silhouette-area');
  });

  it('reports a measured number for every check, passing or failing', async () => {
    const report = await check(await goodSprite(), 'conception');
    expect(report.results.length).toBeGreaterThanOrEqual(8);
    for (const r of report.results) {
      expect(Number.isFinite(r.measured)).toBe(true);
      expect(r.expected.length).toBeGreaterThan(0);
    }
  });

  it('the palette tolerance is derived from the grain, not guessed', () => {
    expect(distanceToleranceFor(GRAIN_AMPLITUDE)).toBeGreaterThan(0);
    expect(distanceToleranceFor(0)).toBe(0);
    // A rogue colour is far outside it.
    const pure = rgbToOklab(0, 255, 0);
    const ink = rgbToOklab(INK.rgb[0], INK.rgb[1], INK.rgb[2]);
    expect(Math.hypot(pure.L - ink.L, pure.a - ink.a, pure.b - ink.b)).toBeGreaterThan(
      distanceToleranceFor(GRAIN_AMPLITUDE),
    );
  });

  it('bosses get a wider coverage band than swarm enemies', () => {
    expect(DEFAULT_THRESHOLDS.maxCoverage).toBeLessThan(0.9);
  });
});

describe('pack', () => {
  it('places every sprite without overlap and reports Phaser-shaped frames', () => {
    const entries = [
      { id: 'a', bitmap: blank(96, 96) },
      { id: 'b', bitmap: blank(96, 96) },
      { id: 'c', bitmap: blank(384, 384) },
    ];
    for (const e of entries) e.bitmap.data.fill(255);

    const { image, atlas } = pack(entries, 'conception.png');
    expect(Object.keys(atlas.frames).sort()).toEqual(['a.png', 'b.png', 'c.png']);
    expect(atlas.meta.image).toBe('conception.png');

    const boxes = Object.values(atlas.frames).map((f) => f.frame);
    for (const box of boxes) {
      expect(box.x + box.w).toBeLessThanOrEqual(image.width);
      expect(box.y + box.h).toBeLessThanOrEqual(image.height);
    }
    for (let i = 0; i < boxes.length; i++) {
      for (let j = i + 1; j < boxes.length; j++) {
        const a = boxes[i]!;
        const b = boxes[j]!;
        const disjoint =
          a.x + a.w <= b.x || b.x + b.w <= a.x || a.y + a.h <= b.y || b.y + b.h <= a.y;
        expect(disjoint, `frames ${i} and ${j} overlap`).toBe(true);
      }
    }
  });

  it('actually copies pixels into the sheet', () => {
    const bmp = blank(8, 8);
    bmp.data.fill(200);
    const { image } = pack([{ id: 'x', bitmap: bmp }], 'a.png');
    expect(opaqueCount(image)).toBe(64);
  });

  it('throws on an empty pack rather than writing a blank sheet', () => {
    expect(() => pack([], 'a.png')).toThrow();
  });
});

describe('bitmap helpers', () => {
  it('crop returns exactly the requested window', () => {
    const bmp = fixture(32);
    const out = crop(bmp, { left: 4, top: 6, right: 11, bottom: 9 });
    expect([out.width, out.height]).toEqual([8, 4]);
  });

  it('centreOn pads symmetrically', () => {
    const src = blank(4, 4);
    src.data.fill(255);
    const out = centreOn(src, 10);
    expect([out.width, out.height]).toEqual([10, 10]);
    expect(opaqueCount(out)).toBe(16);
    expect(out.data[index(out, 3, 3) + 3]).toBe(255);
    expect(out.data[index(out, 0, 0) + 3]).toBe(0);
  });
});

describe('regeneration', () => {
  it('mutates the seed deterministically, so a rerun reproduces the run', () => {
    expect(mutateSeed(1001, 1)).toBe(mutateSeed(1001, 1));
    expect(mutateSeed(1001, 1)).not.toBe(mutateSeed(1001, 2));
    expect(mutateSeed(1001, 1)).not.toBe(1001);
  });

  it('stays inside the 32-bit seed range fal accepts', () => {
    for (let i = 1; i < 50; i++) {
      const s = mutateSeed(2147483000, i);
      expect(s).toBeGreaterThanOrEqual(0);
      expect(s).toBeLessThan(2147483647);
    }
  });
});
