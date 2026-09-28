import { existsSync, readFileSync } from 'node:fs';
import { resolve } from 'node:path';
import { describe, expect, it } from 'vitest';
import { fromPng } from '../bitmap';
import { ALL_ASSETS, DETAIL_THRESHOLD_PX, styleSuffixFor } from '../batch';
import { generate } from '../generate';
import { MAX_ENEMY_LIGHTNESS, reservedColourViolations, threatColourViolations } from '../check';
import {
  FIELD_RESERVED_COLOURS,
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
import { ITEMS, isActive } from '../../../src/data/items';
import { ACT_IDS, PAPER, actLight, rgbToOklab } from '../palette';
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

/**
 * Law 10 on the icons that leave the card (G-036).
 *
 * An icon was card-surface art, judged against ink and free to wear paper
 * (G-035). Then the weapon on the field became the card's own object: Reflex
 * fires the manicule, Baggage stamps the footprint, Grudge circles the fist. On
 * the field every colour has one job — threat colours to threats, paper to the
 * player, the act's light tone to pickups — and a field-riding icon is none of
 * those, so it keeps off all of them, in every act, because items are not
 * act-scoped. This is the G-032 enemy scan (`reservedColourViolations`) run
 * once per act and holding no threat colour, so it shares that scan's one
 * blind spot: service-light is inside the grain tolerance of bone and cannot
 * be told from it.
 */
describe('law 10 — a field-riding icon wears nothing reserved on the field', () => {
  const riders = ALL_ASSETS.filter((s) => s.fieldRiding === true);

  /**
   * Field-riding icons that DO wear a reserved colour today, and exactly which
   * ones. Not a licence: each entry must still fail the scan with exactly the
   * colours listed, so a redraw that fixes it fails here until the entry is
   * deleted, and a new reserved colour on it fails here too. All five were
   * generated by fal for the card (G-035) before G-036 put them on the field:
   * their prompts' "brick red" landed on contact red, and the dart's body on
   * ranged gold. Whether to redraw is the design session's call. Pixel counts
   * are of the 96x96 conformed sprites, measured 2026-09-28.
   */
  const KNOWN_ON_FIELD_EXCEPTIONS = new Map<string, { colours: string[]; reason: string }>([
    [
      'icon-strike',
      {
        colours: ['conception-light', 'paper', 'threat-contact'],
        reason:
          "Reflex's manicule (lash), the shot: paper cuff (305 px), conception-light (29 px), " +
          'contact red (4 px). Paper on a projectile is the player.',
      },
    ],
  ]);

  /** The reserved colours a sprite wears on the field, by colour name, sorted. */
  async function onFieldViolations(file: string): Promise<string[]> {
    const bmp = await fromPng(readFileSync(file));
    const found = new Set<string>();
    for (const act of ACT_IDS) {
      for (const v of reservedColourViolations(bmp, act, [])) found.add(v.replace(/ \(.*\)$/, ''));
    }
    return [...found].sort();
  }

  it('the flag is on icons only, and some flagged icon has a sprite to read', () => {
    for (const spec of riders) expect(spec.role, spec.id).toBe('icon');
    const drawn = riders.filter((s) =>
      existsSync(resolve(process.cwd(), `assets/sprites/${s.act}/${s.id}.png`)),
    );
    expect(drawn.length).toBeGreaterThan(0);
  });

  it("every active item's icon is flagged: its shot, orbiter, stamp or rider is that icon", () => {
    // Passives stay on the card (Thick Skin's ring and Restlessness's streaks
    // are drawn in code, not with the icon); every weapon and control item draws
    // its card's icon on the field (ActScene: syncProjectiles, syncAreas,
    // syncOrbiters, syncAuras, syncSweeps). A new weapon that forgets the flag
    // would skip this law silently.
    const flagged = new Set(riders.map((s) => s.id));
    for (const def of Object.values(ITEMS)) {
      if (!isActive(def)) continue;
      expect(flagged.has(`icon-${def.icon}`), `${def.name} (icon-${def.icon})`).toBe(true);
    }
  });

  it('every exception names a field-riding icon', () => {
    const flagged = new Set(riders.map((s) => s.id));
    for (const id of KNOWN_ON_FIELD_EXCEPTIONS.keys()) expect(flagged.has(id), id).toBe(true);
  });

  for (const spec of riders) {
    const file = resolve(process.cwd(), `assets/sprites/${spec.act}/${spec.id}.png`);
    if (!existsSync(file)) {
      it.skip(`${spec.id} — no sprite yet; read once it is drawn`, () => {});
      continue;
    }
    const known = KNOWN_ON_FIELD_EXCEPTIONS.get(spec.id);
    if (known) {
      const listed = known.colours.join(', ');
      it(`${spec.id} is a known exception and still wears exactly ${listed}`, async () => {
        expect(await onFieldViolations(file), known.reason).toEqual([...known.colours].sort());
      });
      continue;
    }
    it(`${spec.id} wears no threat colour, no paper and no act's light tone`, async () => {
      const found = await onFieldViolations(file);
      expect(found, `${spec.id} rides the field wearing ${found.join(', ')}`).toEqual([]);
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

  it('an icon verdict says whether it rides the field, and what it keeps off if so', () => {
    // "Never on the field" was the verdict for every icon, printed by the dry
    // run beside icons whose shots fly across it (G-036).
    const cardOnly = reservationVerdict('conception', 'icon-guard', 'icon');
    expect(cardOnly).toMatchObject({ status: 'icon', fieldRiding: false, keepsOff: [] });
    const rider = reservationVerdict('conception', 'icon-strike', 'icon', true);
    expect(rider).toMatchObject({ status: 'icon', fieldRiding: true });
    const keepsOff = rider.status === 'icon' ? rider.keepsOff : [];
    expect([...keepsOff].sort()).toEqual(
      [
        ...Object.values(THREAT).map((c) => c.name),
        PAPER.name,
        ...ACT_IDS.map((a) => actLight(a).name),
      ].sort(),
    );
    expect(keepsOff).toEqual(FIELD_RESERVED_COLOURS);
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

describe('law 11 — Adolescence is lifted (ADOLESCENCE-ROSTER.md §1)', () => {
  const reserved = RESERVATIONS['adolescence']!;

  it('holds the six shapes the roster reserves, each by the asset it names', () => {
    const held = Object.fromEntries(reserved.silhouettes.map((r) => [r.silhouette, r.heldBy]));
    expect(held).toEqual({
      'tall sheet': 'standardised-test',
      'speech bubble': 'group-chat',
      wheels: 'drivers-ed',
      bolt: 'hormones',
      dome: 'acne',
      'hanging sphere': 'boss-prom',
    });
    const ids = reserved.silhouettes.map((r) => r.heldBy);
    expect(() => assertReserved('adolescence', ids)).not.toThrow();
    expect(() => assertReserved('adolescence', [...ids, 'some-new-enemy'])).toThrow(
      /holds no reserved silhouette/,
    );
  });

  it('holds all four threat colours, and gold on the projectile (G-031)', () => {
    // Red is the car's claim about damage, purple is the white cell's on its
    // successor, teal is the mirror ball's body, and the gold rides the
    // notification and Prom's spots — never a body.
    expect(reserved.reservedThreat).toEqual({
      contact: 'drivers-ed',
      elite: 'standardised-test',
      ranged: PROJECTILE_HOLDER,
      boss: 'boss-prom',
    });
  });
});

describe('the Adolescence roster is in the batch (ADOLESCENCE-ROSTER.md §3, §4)', () => {
  const adolescence = ALL_ASSETS.filter((s) => s.act === 'adolescence');

  it('five enemies, Prom and the player, one reserved silhouette each but the player', () => {
    expect(adolescence.map((s) => s.id).sort()).toEqual([
      'acne',
      'boss-prom',
      'drivers-ed',
      'group-chat',
      'hormones',
      'player-adolescence',
      'standardised-test',
    ]);
    const shapes = adolescence
      .filter((s) => s.role !== 'player')
      .map((s) => {
        const v = reservationVerdict(s.act, s.id, s.role);
        return v.status === 'holds' ? v.silhouette : v.status;
      });
    expect(new Set(shapes).size, 'two Adolescence assets share a silhouette').toBe(6);
  });

  it('every one is authored SVG (G-038)', () => {
    for (const spec of adolescence) expect(spec.source, spec.id).toBe('svg');
  });

  it('no Adolescence description asks for gold or blush on a body (G-031, law 10)', () => {
    // Gold is the notification's and Prom's light, both drawn in code; blush
    // is the pickups'. The only legal mention of either in a clause is an
    // exclusion of it.
    const asked = /\b(gold|golden|yellow|mustard|amber|pink|blush)\b/i;
    for (const spec of adolescence) {
      for (const clause of spec.subject.split(',').map((c) => c.trim())) {
        if (!asked.test(clause)) continue;
        expect(clause, `${spec.id} asks for a reserved colour rather than excluding it`).toMatch(
          /^(no|not)\b/,
        );
      }
    }
  });

  it('D-018: the five are authored at the swarm detail budget', () => {
    const roster = adolescence.filter((s) => s.role !== 'boss' && s.role !== 'player');
    expect(roster).toHaveLength(5);
    for (const spec of roster) {
      expect(spec.role, `${spec.id}`).toBe('swarm');
      expect(spec.targetSize, `${spec.id} would take the boss detail clause`).toBeLessThan(
        DETAIL_THRESHOLD_PX,
      );
    }
  });
});
