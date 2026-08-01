import { existsSync, readFileSync } from 'node:fs';
import { resolve } from 'node:path';
import { describe, expect, it } from 'vitest';
import { fromPng } from '../bitmap';
import { ALL_ASSETS } from '../batch';
import { threatColourViolations } from '../check';
import { PICKUP_SILHOUETTE, RESERVATIONS, ReservationError, assertReserved } from '../reservations';
import { ENEMIES } from '../../../src/data/enemies';
import { UI_FILL } from '../../../src/config';
import { ACT_IDS, actLight } from '../palette';
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

  it("G-030: no enemy uses its act's light tone — the rule costs nothing today", () => {
    // The whole argument for assigning pickups the light tone is that it was
    // sitting idle in both designed acts. If an enemy ever takes it, pickups
    // and that enemy collide and this fails before anyone sees it in play.
    for (const [id, def] of Object.entries(ENEMIES)) {
      for (const act of ACT_IDS) {
        const light = parseInt(actLight(act).hex.slice(1), 16);
        expect(def.tint, `enemy "${id}" wears ${act}-light, which belongs to pickups`).not.toBe(
          light,
        );
      }
    }
  });
});

describe('law 11 — each act reserves its silhouettes, before generation', () => {
  it('Conception matches CONCEPTION-ROSTER §2', () => {
    const shapes = RESERVATIONS['conception']!.silhouettes.map((r) => r.silhouette).sort();
    expect(shapes).toEqual(['Y', 'blot', 'comet', 'ring']);
  });

  it('gold is held for the Egg and appears on nothing before it', () => {
    expect(RESERVATIONS['conception']!.reservedThreat.ranged).toBe('boss-egg');
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

  it('School is lifted and accepts its five, and still refuses the unwritten boss', () => {
    const ids = RESERVATIONS['school']!.silhouettes.map((r) => r.heldBy);
    expect(ids.sort()).toEqual([
      'clique',
      'dodgeball',
      'hall-monitor',
      'homework',
      'substitute-teacher',
    ]);
    expect(() => assertReserved('school', ids)).not.toThrow();
    // boss-gym-teacher has no concept yet. Refusing it is G-011 working.
    expect(() => assertReserved('school', [...ids, 'boss-gym-teacher'])).toThrow(
      /holds no reserved silhouette/,
    );
  });

  it("School holds gold to the substitute — the act's only aimed thing", () => {
    expect(RESERVATIONS['school']!.reservedThreat.ranged).toBe('substitute-teacher');
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
});
