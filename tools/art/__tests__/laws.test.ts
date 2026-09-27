import { existsSync, readFileSync } from 'node:fs';
import { resolve } from 'node:path';
import { describe, expect, it } from 'vitest';
import { fromPng } from '../bitmap';
import { ALL_ASSETS, DETAIL_THRESHOLD_PX, styleSuffixFor } from '../batch';
import { generate } from '../generate';
import { MAX_ENEMY_LIGHTNESS, reservedColourViolations, threatColourViolations } from '../check';
import {
  PICKUP_SILHOUETTE,
  PROJECTILE_HOLDER,
  RESERVATIONS,
  ReservationError,
  assertReserved,
  refuses,
  reservationVerdict,
} from '../reservations';
import type { AssetSpec } from '../types';
import { UI_FILL } from '../../../src/config';
import { rgbToOklab } from '../palette';
import { THREAT } from '../palette';

/**
 * Laws 10 and 11 were both marked "no check yet" in ART-DIRECTION.md. A law
 * that is written down and unenforced is a suggestion, and law 10 in
 * particular is one a single reasonable-looking commit deletes without anyone
 * noticing — which is exactly what happened, four times, before this existed.
 */

describe('law 10 — the player never wears a threat colour', () => {
  const guarded = ALL_ASSETS.filter((s) => s.role === 'player' || s.role === 'pickup');

  it('there is at least one asset this law applies to', () => {
    expect(guarded.length).toBeGreaterThan(0);
  });

  for (const spec of guarded) {
    it(`${spec.id} carries no threat colour`, async () => {
      const file = resolve(process.cwd(), `assets/sprites/${spec.act}/${spec.id}.png`);
      if (!existsSync(file)) return; // not generated yet; the batch covers that
      const violations = threatColourViolations(await fromPng(readFileSync(file)));
      expect(violations, `${spec.id} wears ${violations.join(', ')}`).toEqual([]);
    });
  }

  it('runtime pickup and UI colours are not threat colours either', () => {
    // The sprite scan cannot see anything drawn in code, and every violation
    // found so far was drawn in code: XP gems, the XP bar, the boss bar, and
    // the player's health bar flashing contact-red on invulnerability — which
    // is the case law 10 names in its own text.
    const threats = new Set(Object.values(THREAT).map((c) => parseInt(c.hex.slice(1), 16)));
    expect(threats.has(UI_FILL), 'UI_FILL is a threat colour').toBe(false);
    // The per-act pickup colour lives in act-visuals.ts, which is browser-side
    // and imports an atlas — importing it here would drag a PNG into the
    // headless build, which is exactly the coupling the rules/presentation
    // split exists to prevent. Asserted in src/data/__tests__ instead.
  });

});

describe('G-032 — the sprite arrives dark; nothing is corrected on the GPU', () => {
  const enemySprites = ALL_ASSETS.filter((s) => s.role === 'swarm' || s.role === 'boss');

  for (const spec of enemySprites) {
    it(`${spec.id} is no lighter than bone, and wears nothing reserved`, async () => {
      const file = resolve(process.cwd(), `assets/sprites/${spec.act}/${spec.id}.png`);
      if (!existsSync(file)) return;
      const bmp = await fromPng(readFileSync(file));

      // The value requirement law 6 always meant, asserted against the drawn
      // sprite rather than against a tint value that stood in for it.
      let brightest = 0;
      for (let i = 0; i < bmp.data.length; i += 4) {
        if (bmp.data[i + 3] === 0) continue;
        const L = rgbToOklab(bmp.data[i]!, bmp.data[i + 1]!, bmp.data[i + 2]!).L;
        if (L > brightest) brightest = L;
      }
      expect(brightest, `${spec.id} brightest pixel`).toBeLessThanOrEqual(MAX_ENEMY_LIGHTNESS);

      // Reserved colours: paper is the player's, the act light tone is the
      // pickups', and a threat colour belongs only to an asset that holds it.
      const held = RESERVATIONS[spec.act];
      const holds = held
        ? (Object.entries(held.reservedThreat)
            .filter(([, who]) => who === spec.id)
            .map(([cls]) => cls) as Parameters<typeof reservedColourViolations>[2])
        : [];
      expect(reservedColourViolations(bmp, spec.act, holds)).toEqual([]);
    });
  }
});

describe('law 11 — each act reserves its silhouettes, before generation', () => {
  it('Conception matches CONCEPTION-ROSTER §2', () => {
    const shapes = RESERVATIONS['conception']!.silhouettes.map((r) => r.silhouette).sort();
    expect(shapes).toEqual(['Y', 'blot', 'comet', 'ring']);
  });

  it('G-031: gold is held by projectiles, and the Egg holds boss teal', () => {
    // Measured cause: a gold multiply on the substitute halved its contrast
    // and destroyed the reservation the School act is built around. The colour
    // moved to the thing that does the reaching.
    expect(RESERVATIONS['conception']!.reservedThreat.ranged).toBe(PROJECTILE_HOLDER);
    expect(RESERVATIONS['conception']!.reservedThreat.boss).toBe('boss-egg');
  });

  it('no two assets in an act share a silhouette', () => {
    for (const [act, reserved] of Object.entries(RESERVATIONS)) {
      const shapes = reserved!.silhouettes.map((r) => r.silhouette);
      expect(new Set(shapes).size, `act "${act}" reserves a shape twice`).toBe(shapes.length);
    }
  });

  it('an act with no list refuses generation rather than allowing it', () => {
    // G-011's ordering: the list is written BEFORE the assets. An act without
    // one must fail closed, or the rule is advisory. Service and Office have
    // no roster yet, so they are the live cases.
    expect(() => assertReserved('service', ['anything'])).toThrow(ReservationError);
    expect(() => assertReserved('office', [])).toThrow(/before any asset/);
  });

  it('School is lifted and accepts its five swarm shapes and its boss, and refuses the undeclared', () => {
    const ids = RESERVATIONS['school']!.silhouettes.map((r) => r.heldBy);
    expect(ids.sort()).toEqual([
      'boss-gym-teacher',
      'clique',
      'dodgeball',
      'hall-monitor',
      'homework',
      'substitute-teacher',
    ]);
    expect(() => assertReserved('school', ids)).not.toThrow();
    // The boss was refused here until its reservation was written (G-011:
    // before, not after — the entry landed in the same change as its spec,
    // ahead of its first rasterisation). What stays refused is anything the
    // act has not declared.
    expect(() => assertReserved('school', [...ids, 'some-new-enemy'])).toThrow(
      /holds no reserved silhouette/,
    );
  });

  it('the Gym Teacher holds boss teal, as the Egg does in Conception', () => {
    expect(RESERVATIONS['school']!.reservedThreat.boss).toBe('boss-gym-teacher');
  });

  it('G-031: School holds gold on the projectile, never on the body', () => {
    expect(RESERVATIONS['school']!.reservedThreat.ranged).toBe(PROJECTILE_HOLDER);
    // And no School sprite holds it, which is what keeps the clipboard bright.
    expect(Object.values(RESERVATIONS['school']!.reservedThreat)).not.toContain(
      'substitute-teacher',
    );
  });

  it('pickups sit outside every act vocabulary and hold one shape game-wide', () => {
    expect(PICKUP_SILHOUETTE.length).toBeGreaterThan(0);
    for (const [act, reserved] of Object.entries(RESERVATIONS)) {
      const shapes = reserved!.silhouettes.map((r) => r.silhouette);
      expect(shapes, `act "${act}" spends a reserved shape on the pickup`).not.toContain(
        PICKUP_SILHOUETTE,
      );
    }
    // And an asset named as a pickup is accepted without holding an act shape.
    const ids = RESERVATIONS['conception']!.silhouettes.map((r) => r.heldBy);
    expect(() => assertReserved('conception', [...ids, 'pickup-xp'])).not.toThrow();
  });

  it('Conception accepts its own roster and rejects an undeclared asset', () => {
    const ids = RESERVATIONS['conception']!.silhouettes.map((r) => r.heldBy);
    expect(() => assertReserved('conception', ids)).not.toThrow();
    expect(() => assertReserved('conception', [...ids, 'some-new-enemy'])).toThrow(
      /holds no reserved silhouette/,
    );
  });

  it('the player is outside the vocabulary, like the pickups and for the same reason', () => {
    // Found by wiring the law into the run rather than by reading it: --dry
    // refused `player-sperm` on its first pass, in an act whose list has been
    // correct since it was written. The vocabulary answers "how does this hurt
    // me", and the player is a comet with a tuft in an act where the comet
    // belongs to the rivals — which is the joke, not a clash.
    expect(reservationVerdict('conception', 'player-sperm', 'player').status).toBe('player');
    expect(() => assertReserved('conception', ['player-sperm'], 'player')).not.toThrow();
    // And it is exempt as the player, not as a favour to that one id.
    expect(reservationVerdict('conception', 'player-sperm', 'swarm').status).toBe('unlisted');
  });
});

/**
 * Law 11 with a caller (G-011).
 *
 * The list, the assert and the tests for both existed; the pipeline called
 * none of them. Law 11 constrained a test file rather than a generation run,
 * which is the same failure the list was written to fix one document up — and
 * the failure ART-DIRECTION.md already claimed was fixed ("Enforced —
 * tools/art/reservations.ts, and an act with no entry refuses generation").
 */
describe('law 11 is enforced on the path that spends money, not only in tests', () => {
  const unreserved: AssetSpec = {
    id: 'in-processing-packet',
    name: 'In-processing packet',
    act: 'service',
    role: 'swarm',
    subject: 'a stack of forms with a face on it',
    seed: 1,
    targetSize: 96,
  };

  it('generate() refuses an act with no list, before it reads a key or a network', async () => {
    // Deliberately the only generate() test here. The refusal path cannot
    // reach fal because it throws first; a spec that PASSED law 11 would
    // continue to loadKey and, on a machine with a .env, spend money to prove
    // a point that the assert already proves.
    await expect(generate(unreserved, 1)).rejects.toThrow(ReservationError);
    await expect(generate(unreserved, 1)).rejects.toThrow(/no reserved-silhouette list/);
  });

  it('a refusal is not retryable — a mutated seed cannot fix a document', () => {
    // The pipeline retries a rejected asset with a new seed four times. A
    // reservation refusal is the same class of error as a D-007 violation:
    // the prompt is not the problem, so the loop must not spend three more
    // attempts on it. Asserted on the error name, which is what pipeline.ts
    // switches on.
    const err = new ReservationError('x');
    expect(err.name).toBe('ReservationError');
  });

  it('every asset in the batch is generatable, or its act has no list yet', () => {
    // The drift this catches: someone adds an asset to batch.ts for an act
    // that has a list, and forgets the list. That is the repository
    // contradicting itself and it fails here rather than at generation.
    const contradictions = ALL_ASSETS.map((s) => reservationVerdict(s.act, s.id, s.role)).filter(
      (v) => v.status === 'unlisted',
    );
    expect(contradictions.map((v) => v.assetId)).toEqual([]);
  });

  it('acts without a list are named, not silently permitted', () => {
    const refusedActs = new Set(
      ALL_ASSETS.map((s) => reservationVerdict(s.act, s.id, s.role))
        .filter(refuses)
        .map((v) => v.act),
    );
    // Service and Office are the live cases and they are Cowork's open item,
    // not something to work around here. If either gains a list, this test is
    // where that shows up.
    expect([...refusedActs].sort()).toEqual(['office', 'service']);
  });
});

describe('the School roster is in the batch (SCHOOL-ROSTER.md §3)', () => {
  const school = ALL_ASSETS.filter((s) => s.act === 'school');

  it('all six School enemies are specified, one per reserved silhouette, plus the player', () => {
    expect(school.map((s) => s.id).sort()).toEqual([
      'boss-gym-teacher',
      'clique',
      'dodgeball',
      'hall-monitor',
      'homework',
      'player-school',
      'substitute-teacher',
    ]);
    // The player is outside the vocabulary (law 11's player exemption), so
    // the uniqueness count is over the enemies.
    const shapes = school
      .filter((s) => s.role !== 'player')
      .map((s) => {
        const v = reservationVerdict(s.act, s.id, s.role);
        return v.status === 'holds' ? v.silhouette : v.status;
      });
    expect(new Set(shapes).size, 'two School assets share a silhouette').toBe(6);
  });

  it('G-031: no School prompt asks for gold on a body', () => {
    // The act's only gold is the substitute's projectile, which is not a
    // generated asset. A prompt that asks for yellow puts the act's reserved
    // threat colour on a swarm body, and the whole reservation is that the
    // player sees gold for the first time when something aims at them.
    const asked = /\b(gold|golden|yellow|mustard|amber)\b/i;
    for (const spec of school) {
      // Clause by clause, because the prompts are comma-separated clauses and
      // the only legal mention of gold in one is an exclusion of it.
      for (const clause of spec.subject.split(',').map((c) => c.trim())) {
        if (!asked.test(clause)) continue;
        expect(clause, `${spec.id} asks for gold rather than excluding it`).toMatch(/^(no|not)\b/);
      }
    }
  });

  it('D-018: every School roster enemy is authored at the swarm detail budget', () => {
    // §3: "All five are swarm-tier — bold flat shapes, strong silhouette, no
    // halftone, no hairlines, no grain." That is not a note, it is which
    // clause the prompt gets, so it is asserted where the clause is chosen.
    // §3's five are the swarm; the boss and the player were never in it, and
    // the boss is at boss scale by definition (D-018 spends detail there).
    const roster = school.filter((s) => s.role !== 'boss' && s.role !== 'player');
    expect(roster).toHaveLength(5);
    for (const spec of roster) {
      expect(spec.role, `${spec.id}`).toBe('swarm');
      expect(spec.targetSize, `${spec.id} would take the boss detail clause`).toBeLessThan(
        DETAIL_THRESHOLD_PX,
      );
      expect(styleSuffixFor(spec)).toContain('no halftone dots');
    }
  });

  it('every enemy in the batch answers "why this life stage" (mechanism 2)', () => {
    // The same rule the enemy data file has carried since it existed, applied
    // where the asset is specified. An enemy that cannot answer it does not
    // ship, and a prompt is the earliest place that can be true.
    for (const spec of ALL_ASSETS) {
      if (spec.role !== 'swarm' && spec.role !== 'boss') continue;
      expect(spec.whyThisStage, `${spec.id} has no whyThisStage`).toBeTruthy();
      expect(spec.whyThisStage!.length, `${spec.id}`).toBeGreaterThan(30);
      expect(spec.whyThisStage!.trim()).toMatch(/\.$/);
    }
  });
});
