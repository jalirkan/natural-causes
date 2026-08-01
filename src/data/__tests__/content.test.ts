import { describe, expect, it } from 'vitest';
import { ENEMIES } from '../enemies';
import { WEAPONS } from '../weapons';
import { ACTS } from '../acts';
import { BONE, INK, PAPER, SHADOW, THREAT_BOSS, THREAT_CONTACT, THREAT_ELITE, THREAT_RANGED } from '../../config';
import {
  BONE as ART_BONE,
  INK as ART_INK,
  PAPER as ART_PAPER,
  SHADOW as ART_SHADOW,
  THREAT as ART_THREAT,
  actBackground,
  FULL_PALETTE,
} from '../../../tools/art/palette';

/**
 * The content rules from PLAN.md, enforced.
 *
 * These exist because the mechanisms are only worth anything if they survive a
 * long unattended run with nobody reading the diffs. A rule that lives in a
 * document is a suggestion; a rule with a test is a rule.
 */

describe('every enemy answers "why this life stage" (PLAN.md mechanism 2)', () => {
  for (const [id, def] of Object.entries(ENEMIES)) {
    it(`${id}`, () => {
      expect(def.whyThisStage, `"${id}" has no whyThisStage`).toBeTruthy();
      // A real sentence, not a placeholder. "A flying skull" cannot answer it.
      expect(def.whyThisStage.length).toBeGreaterThan(30);
      expect(def.whyThisStage.trim()).toMatch(/\.$/);
    });
  }
});

describe('law 6: the player is the lightest thing on screen', () => {
  const luminance = (c: number) =>
    (0.2126 * ((c >> 16) & 0xff) + 0.7152 * ((c >> 8) & 0xff) + 0.0722 * (c & 0xff)) / 255;

  it('every enemy tint is darker than the player, so the two never merge in a crowd', () => {
    for (const [id, def] of Object.entries(ENEMIES)) {
      expect(luminance(def.tint), `"${id}" is not darker than the player`).toBeLessThan(
        luminance(PAPER) - 0.1,
      );
    }
  });

  it('every enemy tint is a colour from the locked palette', () => {
    const allowed = new Set(FULL_PALETTE.map((c) => c.hex.toUpperCase()));
    for (const [id, def] of Object.entries(ENEMIES)) {
      const hex = `#${def.tint.toString(16).padStart(6, '0').toUpperCase()}`;
      expect(allowed.has(hex), `"${id}" tint ${hex} is not in the locked palette`).toBe(true);
    }
  });
});

describe('every item states what it enables and what it trades away (mechanism 5)', () => {
  for (const [id, def] of Object.entries(WEAPONS)) {
    it(`${id}`, () => {
      expect(def.enables.length, `"${id}" does not say what build it enables`).toBeGreaterThan(30);
      expect(def.tradesAway.length, `"${id}" does not say what it trades away`).toBeGreaterThan(30);
    });
  }
});

describe('the locked palette', () => {
  const hex = (n: number) => `#${n.toString(16).padStart(6, '0').toUpperCase()}`;

  it('the runtime colours match the pipeline palette exactly', () => {
    // src/config.ts duplicates these because tools/art/palette.ts is Node-side
    // and pulls in sharp. Duplication is fine; silent drift is not.
    expect(hex(INK)).toBe(ART_INK.hex.toUpperCase());
    expect(hex(PAPER)).toBe(ART_PAPER.hex.toUpperCase());
    expect(hex(BONE)).toBe(ART_BONE.hex.toUpperCase());
    expect(hex(SHADOW)).toBe(ART_SHADOW.hex.toUpperCase());
    expect(hex(THREAT_CONTACT)).toBe(ART_THREAT.contact.hex.toUpperCase());
    expect(hex(THREAT_RANGED)).toBe(ART_THREAT.ranged.hex.toUpperCase());
    expect(hex(THREAT_ELITE)).toBe(ART_THREAT.elite.hex.toUpperCase());
    expect(hex(THREAT_BOSS)).toBe(ART_THREAT.boss.hex.toUpperCase());
  });

  it('each act background is the act background from the locked palette', () => {
    for (const act of ACTS) {
      const expected = actBackground(act.id as 'conception').hex.toUpperCase();
      expect(hex(act.background), `act "${act.id}"`).toBe(expected);
    }
  });
});

describe('acts', () => {
  it('every wave references an enemy that exists', () => {
    for (const act of ACTS) {
      for (const wave of act.waves) {
        expect(ENEMIES[wave.enemyId], `act "${act.id}" spawns unknown "${wave.enemyId}"`).toBeDefined();
      }
    }
  });

  it('waves are ordered and escalate', () => {
    for (const act of ACTS) {
      for (let i = 1; i < act.waves.length; i++) {
        const prev = act.waves[i - 1]!;
        const cur = act.waves[i]!;
        expect(cur.fromSeconds, `act "${act.id}" waves out of order`).toBeGreaterThan(
          prev.fromSeconds,
        );
        expect(cur.rate, `act "${act.id}" wave ${i} does not escalate`).toBeGreaterThan(prev.rate);
      }
    }
  });

  it('the last wave starts before the act ends', () => {
    for (const act of ACTS) {
      const last = act.waves[act.waves.length - 1]!;
      expect(last.fromSeconds).toBeLessThan(act.durationSeconds);
    }
  });
});
