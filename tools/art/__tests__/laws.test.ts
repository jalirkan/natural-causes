import { existsSync, readFileSync } from 'node:fs';
import { resolve } from 'node:path';
import { describe, expect, it } from 'vitest';
import { fromPng } from '../bitmap';
import { ALL_ASSETS } from '../batch';
import { threatColourViolations } from '../check';
import { RESERVATIONS, ReservationError, assertReserved } from '../reservations';
import { PICKUP, UI_FILL } from '../../../src/config';
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
    expect(threats.has(PICKUP), 'PICKUP is a threat colour').toBe(false);
    expect(threats.has(UI_FILL), 'UI_FILL is a threat colour').toBe(false);
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
    // one must fail closed, or the rule is advisory.
    expect(() => assertReserved('school', ['substitute-teacher'])).toThrow(ReservationError);
    expect(() => assertReserved('school', [])).toThrow(/before any asset/);
  });

  it('Conception accepts its own roster and rejects an undeclared asset', () => {
    const ids = RESERVATIONS['conception']!.silhouettes.map((r) => r.heldBy);
    expect(() => assertReserved('conception', ids)).not.toThrow();
    expect(() => assertReserved('conception', [...ids, 'some-new-enemy'])).toThrow(
      /holds no reserved silhouette/,
    );
  });
});
