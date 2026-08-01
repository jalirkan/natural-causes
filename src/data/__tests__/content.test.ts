import { describe, expect, it } from 'vitest';
import { ENEMIES } from '../enemies';
import { WEAPONS } from '../weapons';
import { ACTS, rateAt, spawnStreams } from '../acts';
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

describe('behaviours are fully specified (CONCEPTION-ROSTER §5.2)', () => {
  for (const [id, def] of Object.entries(ENEMIES)) {
    it(`${id}`, () => {
      // A contact mode without its parameters is a silently inert enemy: the
      // white cell becomes a large slow rival and the antibody becomes a weak
      // one, which is exactly the roster's stated failure case.
      if (def.contact === 'engulf') {
        expect(def.engulf, `"${id}" engulfs but has no engulf parameters`).toBeDefined();
        expect(def.engulf!.seconds).toBeGreaterThan(0);
        expect(def.engulf!.slow).toBeGreaterThan(0);
        expect(def.engulf!.slow).toBeLessThan(1);
        expect(def.engulf!.damagePerSecond).toBeGreaterThan(0);
      }
      if (def.contact === 'attach') {
        expect(def.attach, `"${id}" attaches but has no drag`).toBeDefined();
        expect(def.attach!.drag).toBeGreaterThan(0);
        // Small enough per stack that no single attachment feels unfair.
        expect(def.attach!.drag).toBeLessThan(0.1);
      }
      if (def.burst) {
        expect(def.burst.fuseSeconds, `"${id}" bursts instantly`).toBeGreaterThan(0);
        expect(def.burst.ringRadius).toBeGreaterThan(0);
        expect(def.burst.ringSeconds).toBeGreaterThan(0);
      }
      // A burst is on a timer, never on proximity, so it cannot chase.
      if (def.burst) expect(def.movement).not.toBe('chase');
    });
  }
});

describe('the reserved list (G-011, CONCEPTION-ROSTER §2)', () => {
  it('no enemy wears paper — it is the player, and law 10 depends on it', () => {
    for (const [id, def] of Object.entries(ENEMIES)) {
      expect(def.tint, `"${id}" wears the player's colour`).not.toBe(PAPER);
    }
  });

  it('gold does not appear before the boss', () => {
    // Reserved to the Egg. An enemy wearing it early spends the boss's only
    // colour before the boss arrives.
    for (const [id, def] of Object.entries(ENEMIES)) {
      expect(def.tint, `"${id}" wears the Egg's reserved gold`).not.toBe(THREAT_RANGED);
    }
  });

  it('no two enemies share a tint', () => {
    const seen = new Map<number, string>();
    for (const [id, def] of Object.entries(ENEMIES)) {
      const clash = seen.get(def.tint);
      expect(clash, `"${id}" and "${clash}" share a tint`).toBeUndefined();
      seen.set(def.tint, id);
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

  /**
   * Escalation is per enemy, not across the flat array.
   *
   * The original version asserted `rate` rose across `act.waves` as a single
   * sequence. That is satisfiable only by an act with one enemy type: a
   * roster where a rival wave at 3/s is followed in time by an elite at
   * 0.08/s cannot order itself to pass, and sorting by rate breaks the
   * time ordering the same assertion demands. It was a test that silently
   * constrained the design to one enemy, which is not a rule anyone chose.
   */
  const escalationProblems = (waves: typeof ACTS[number]['waves']): string[] => {
    const problems: string[] = [];
    for (const [enemyId, stream] of spawnStreams(waves)) {
      for (let i = 1; i < stream.length; i++) {
        const prev = stream[i - 1]!;
        const cur = stream[i]!;
        if (cur.fromSeconds === prev.fromSeconds) {
          problems.push(`${enemyId} has two entries at ${cur.fromSeconds}s`);
        }
        if (cur.rate <= prev.rate) {
          problems.push(
            `${enemyId} does not escalate at ${cur.fromSeconds}s (${prev.rate} -> ${cur.rate})`,
          );
        }
      }
    }
    return problems;
  };

  it('each enemy escalates along its own schedule', () => {
    for (const act of ACTS) {
      expect(escalationProblems(act.waves), `act "${act.id}"`).toEqual([]);
    }
  });

  it('the rule can express a real mixed roster (CONCEPTION-ROSTER.md §3)', () => {
    // The four-enemy table the old assertion could not represent. This is the
    // point of the change, so it is the thing under test — not a weakening.
    const roster = [
      { fromSeconds: 0, enemyId: 'rival-sperm', rate: 1.5 },
      { fromSeconds: 30, enemyId: 'rival-sperm', rate: 3 },
      { fromSeconds: 45, enemyId: 'antibody', rate: 0.6 },
      { fromSeconds: 75, enemyId: 'rival-sperm', rate: 5.5 },
      { fromSeconds: 90, enemyId: 'spermicide', rate: 0.35 },
      { fromSeconds: 120, enemyId: 'antibody', rate: 1.2 },
      { fromSeconds: 130, enemyId: 'white-cell', rate: 0.08 },
      { fromSeconds: 140, enemyId: 'rival-sperm', rate: 9 },
      { fromSeconds: 165, enemyId: 'spermicide', rate: 0.7 },
      { fromSeconds: 195, enemyId: 'white-cell', rate: 0.14 },
      { fromSeconds: 200, enemyId: 'antibody', rate: 2.0 },
      { fromSeconds: 210, enemyId: 'rival-sperm', rate: 14 },
      { fromSeconds: 240, enemyId: 'spermicide', rate: 1.1 },
      { fromSeconds: 255, enemyId: 'white-cell', rate: 0.22 },
    ];
    expect(escalationProblems(roster)).toEqual([]);
    expect(spawnStreams(roster).size).toBe(4);
  });

  it('still catches a stream that de-escalates', () => {
    const bad = [
      { fromSeconds: 0, enemyId: 'rival-sperm', rate: 3 },
      { fromSeconds: 30, enemyId: 'antibody', rate: 0.6 },
      { fromSeconds: 60, enemyId: 'rival-sperm', rate: 2 },
    ];
    expect(escalationProblems(bad)).toEqual([
      'rival-sperm does not escalate at 60s (3 -> 2)',
    ]);
  });

  it('streams run concurrently — every declared enemy spawns at act end', () => {
    // The spawner read the flat list as one active wave, so exactly one enemy
    // type could ever be live. Rates must be non-zero for every stream once
    // its schedule has started.
    for (const act of ACTS) {
      for (const [enemyId, stream] of spawnStreams(act.waves)) {
        const at = rateAt(stream, act.durationSeconds);
        expect(at, `"${enemyId}" is dead by the end of act "${act.id}"`).toBeGreaterThan(0);
      }
    }
  });

  it('total spawn rate never decreases over the act', () => {
    // The invariant the original flat-array assertion was actually reaching
    // for (CONCEPTION-ROSTER §5.1). Per-enemy escalation alone would permit an
    // act that gets quieter overall by retiring a stream; this is what says
    // the act only ever gets worse.
    for (const act of ACTS) {
      const streams = [...spawnStreams(act.waves).values()];
      const moments = [...new Set(act.waves.map((w) => w.fromSeconds))].sort((a, b) => a - b);
      let previous = 0;
      for (const t of moments) {
        const total = streams.reduce((sum, s) => sum + rateAt(s, t), 0);
        expect(total, `act "${act.id}" total rate drops at ${t}s`).toBeGreaterThanOrEqual(previous);
        previous = total;
      }
      expect(previous, `act "${act.id}" never escalates at all`).toBeGreaterThan(0);
    }
  });

  it('the last wave starts before the act ends', () => {
    for (const act of ACTS) {
      const last = act.waves[act.waves.length - 1]!;
      expect(last.fromSeconds).toBeLessThan(act.durationSeconds);
    }
  });
});
