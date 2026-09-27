import { describe, expect, it } from 'vitest';
import { ENEMIES } from '../enemies';
import { ITEMS, isActive } from '../items';
import { itemIconFrame } from '../item-visuals';
import iconsAtlas from '../../../assets/atlas/icons.json';
import { World } from '../../sim/world';
import { ACT_VISUALS } from '../act-visuals';
import { ACTS, ALL_ACTS, rateAt, spawnStreams } from '../acts';
import { BONE, INK, PAPER, SHADOW, THREAT_BOSS, THREAT_CONTACT, THREAT_ELITE, THREAT_RANGED } from '../../config';
import { ALL_ASSETS } from '../../../tools/art/batch';
import { reservationVerdict } from '../../../tools/art/reservations';
import { enemyPalette } from '../../../tools/art/palette';
import {
  BONE as ART_BONE,
  INK as ART_INK,
  PAPER as ART_PAPER,
  SHADOW as ART_SHADOW,
  THREAT as ART_THREAT,
  actBackground,
  actLight,
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

// law 6's value requirement moved to tools/art/__tests__/laws.test.ts when
// G-032 retired render tinting. It was asserted against the TINT VALUE, which
// only ever stood in for the drawn sprite; now it is asserted against the
// sprite, which is what it always meant.

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

describe('every enemy holds a reserved silhouette in its own act (law 11)', () => {
  // The join the `act` field exists for. Law 11 lives in the art pipeline and
  // the enemies live in the game, and until these two are checked against each
  // other the reserved list constrains what gets DRAWN and not what gets
  // SHIPPED — an enemy could be added here with no reservation, no asset and
  // no shape anybody claimed, and every existing test would pass.
  for (const [id, def] of Object.entries(ENEMIES)) {
    it(`${id}`, () => {
      const verdict = reservationVerdict(def.act as 'conception', def.id, 'swarm');
      expect(verdict.status, `"${id}" is in act "${def.act}", which has no list`).toBe('holds');
      expect(def.frame).toBe(`${id}.png`);
    });
  }

  it('School is exactly the five the roster reserves, no more', () => {
    const school = Object.values(ENEMIES)
      .filter((d) => d.act === 'school')
      .map((d) => d.id)
      .sort();
    expect(school).toEqual([
      'clique',
      'dodgeball',
      'hall-monitor',
      'homework',
      'substitute-teacher',
    ]);
  });

  it('every enemy has an asset specified for it', () => {
    // An enemy with no prompt is an enemy that cannot be drawn, which is a
    // thing that only shows up when someone runs a batch months later.
    const specified = new Set(ALL_ASSETS.map((s) => s.id));
    for (const id of Object.keys(ENEMIES)) {
      expect(specified.has(id), `"${id}" has no entry in the art batch`).toBe(true);
    }
  });
});

describe('the School behaviours are coherent (SCHOOL-ROSTER.md §4)', () => {
  for (const [id, def] of Object.entries(ENEMIES)) {
    it(`${id}`, () => {
      const flags = [def.bounce, def.patrol, def.merge].filter(Boolean).length;
      // Bounce reflects, patrol reverses, merge does neither and does not
      // move. Two at once is not a richer enemy, it is an undefined one.
      expect(flags, `"${id}" declares more than one edge behaviour`).toBeLessThanOrEqual(1);

      if (def.merge) {
        expect(def.movement, `"${id}" merges but moves`).toBe('static');
        expect(def.contact, `"${id}" merges and also hurts`).toBe('none');
      }
      if (def.movement === 'static') expect(def.speed, `"${id}" is static with a speed`).toBe(0);
      if (def.contact === 'none') expect(def.contactDamage, `"${id}"`).toBe(0);
      if (def.bounce === true || def.patrol === true) {
        // Both take their heading at spawn and keep it. A chaser steers every
        // frame, so it has no heading to reflect or reverse.
        expect(def.movement, `"${id}" cannot both steer and bounce`).not.toBe('chase');
        expect(def.movement, `"${id}" cannot bounce while static`).not.toBe('static');
        expect(def.speed, `"${id}" bounces at a standstill`).toBeGreaterThan(0);
      }
    });
  }
});

describe("law 10 / G-030 — pickups take the act's light tone", () => {
  const threats = [THREAT_CONTACT, THREAT_RANGED, THREAT_ELITE, THREAT_BOSS];

  it('every registered act draws pickups in its own light tone', () => {
    for (const [act, v] of Object.entries(ACT_VISUALS)) {
      const expected = parseInt(actLight(act as 'conception').hex.slice(1), 16);
      expect(v.pickup, `act "${act}" pickup is not its light tone`).toBe(expected);
    }
  });

  it('no act lets an enemy near the two reserved colours, sprites or not', () => {
    // The per-sprite scan in tools/art/__tests__ can only check assets that
    // exist, and School has one of five. This checks the same law one stage
    // earlier, where it is enforceable today: the palette an enemy in each act
    // is allowed to be quantised INTO excludes paper (the player's) and the
    // act's light tone (the pickups').
    for (const act of ['conception', 'school'] as const) {
      const allowed = enemyPalette(act).map((c) => c.name);
      expect(allowed, `act "${act}" lets an enemy be paper`).not.toContain('paper');
      expect(allowed, `act "${act}" lets an enemy take the pickup tone`).not.toContain(
        `${act}-light`,
      );
    }
  });

  it('no pickup colour is a threat colour', () => {
    for (const [act, v] of Object.entries(ACT_VISUALS)) {
      expect(threats, `act "${act}" pickup is a threat colour`).not.toContain(v.pickup);
    }
  });

});

describe('every item states what it enables and what it trades away (mechanism 5)', () => {
  // Iterates the ONE registry (CONCEPTION-ROSTER §5.3). A sibling collection
  // would be a content rule that silently stopped applying to part of the act,
  // which is the failure mechanism 5 exists to prevent — so there is nowhere
  // else for an item to live.
  for (const [id, def] of Object.entries(ITEMS)) {
    it(`${id}`, () => {
      expect(def.enables.length, `"${id}" does not say what build it enables`).toBeGreaterThan(30);
      expect(def.tradesAway.length, `"${id}" does not say what it trades away`).toBeGreaterThan(30);
      // The offer card shows `blurb` — one line, and the cap is what keeps a
      // card readable at decision speed, so it is a test. (The card's first
      // draft showed a gain/cost pair; it read as homework and was cut.)
      expect(def.blurb.length, `"${id}" has no offer-card blurb`).toBeGreaterThan(10);
      expect(def.blurb.length, `"${id}" blurb overflows the card`).toBeLessThan(64);
      expect(def.blurb, `"${id}" blurb must be one line`).not.toContain(String.fromCharCode(10));
    });
  }
});

describe('upgrades gain (G-038)', () => {
  const items = Object.values(ITEMS);

  it('every active item has one level entry per level, each an offer-card line', () => {
    for (const def of items) {
      if (!isActive(def)) continue;
      expect(def.levels.length, `"${def.id}" levels vs maxLevel`).toBe(def.maxLevel);
      def.levels.forEach((level, i) => {
        const where = `"${def.id}" level ${i + 1}`;
        expect(level.text.length, `${where} text too short`).toBeGreaterThanOrEqual(10);
        expect(level.text.length, `${where} text overflows the card`).toBeLessThanOrEqual(63);
        expect(level.text, `${where} must be one line`).not.toContain(String.fromCharCode(10));
      });
    }
  });

  it('every evolution names an active weapon and a partner that exist', () => {
    for (const def of items) {
      if (!isActive(def) || !def.evolvesFrom) continue;
      const weapon = ITEMS[def.evolvesFrom.weapon];
      expect(weapon, `"${def.id}" evolves from unknown "${def.evolvesFrom.weapon}"`).toBeDefined();
      expect(isActive(weapon!), `"${def.id}" evolves from a passive`).toBe(true);
      expect(ITEMS[def.evolvesFrom.with], `"${def.id}" needs unknown "${def.evolvesFrom.with}"`).toBeDefined();
      expect(def.evolvesFrom.weapon).not.toBe(def.id);
    }
  });

  it('an evolved item never comes out of the ordinary roll', () => {
    // rollOffers is private because nothing outside the sim should roll; the
    // rule is about exactly that function, so the test reaches it directly,
    // across states that make an evolution ready and states that do not.
    const evolved = items.filter((d) => isActive(d) && d.evolvesFrom).map((d) => d.id);
    expect(evolved.length).toBeGreaterThan(0);
    for (let seed = 1; seed <= 30; seed++) {
      const w = new World({ act: ALL_ACTS[0]!, seed });
      if (seed % 2 === 0) {
        w.items.set('acrosome', ITEMS['acrosome']!.maxLevel);
        w.items.set('midpiece', 1);
      }
      const roll = (w as unknown as { rollOffers(): string[] }).rollOffers.bind(w);
      for (let i = 0; i < 40; i++) {
        for (const id of roll()) expect(evolved, `seed ${seed} rolled "${id}"`).not.toContain(id);
      }
    }
  });

  it('every passive is a gain; a cost may only be a timing (Late Bloomer\'s ramp)', () => {
    for (const def of items) {
      if (def.kind !== 'passive') continue;
      expect(def.speedMultiplier, `"${def.id}" speed`).toBeGreaterThanOrEqual(1);
      expect(def.healthMultiplier, `"${def.id}" health`).toBeGreaterThanOrEqual(1);
      expect(def.cooldownMultiplier, `"${def.id}" cooldown`).toBeLessThanOrEqual(1);
      expect(def.pickupMultiplier, `"${def.id}" pickup`).toBeGreaterThanOrEqual(1);
      expect(def.damageTakenMultiplier, `"${def.id}" damage taken`).toBeLessThanOrEqual(1);
      if (def.rampTo !== def.damageMultiplier) {
        // A ramp: it may start below baseline, it must end above it.
        expect(def.rampTo, `"${def.id}" ramps to a loss`).toBeGreaterThan(1);
        expect(def.rampTo, `"${def.id}" ramps downward`).toBeGreaterThan(def.damageMultiplier);
      } else {
        expect(def.damageMultiplier, `"${def.id}" damage`).toBeGreaterThanOrEqual(1);
      }
    }
  });

  it('every icon is in the atlas, or the item says what retires its placeholder', () => {
    const frames = (iconsAtlas as { frames: Record<string, unknown> }).frames;
    for (const def of items) {
      const drawn = itemIconFrame(def.icon) in frames;
      if (drawn) {
        expect(def.iconPending, `"${def.id}" has art and still says it is pending`).toBeUndefined();
        continue;
      }
      expect(def.iconPending, `"${def.id}" icon "${def.icon}" has no frame and no pending note`).toBeDefined();
      expect(def.iconPending!.length).toBeGreaterThan(30);
    }
  });
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
    // ACTS, not ALL_ACTS: this is a rule about acts the title can start. An
    // act with a schedule and no art is legal and is kept out of ACTS by the
    // test below rather than by memory.
    for (const act of ACTS) {
      const visuals = ACT_VISUALS[act.id];
      expect(visuals, `act "${act.id}" has no visuals`).toBeDefined();
      const expected = actBackground(act.id as 'conception').hex.toUpperCase();
      expect(hex(visuals!.background), `act "${act.id}"`).toBe(expected);
    }
  });

  it('an act is startable exactly when it has visuals', () => {
    // The two lists in acts.ts and the record in act-visuals.ts have to agree
    // in both directions: an act in ACTS without visuals would throw in
    // ActScene.init; visuals for an act not in ACTS is art nobody can reach.
    // And ACTS is a subset of ALL_ACTS by definition, said out loud so an act
    // added to the startable list alone is caught here and not by the palette
    // test three assertions later.
    for (const act of ACTS) {
      expect(ALL_ACTS, `"${act.id}" is startable but not in ALL_ACTS`).toContain(act);
    }
    for (const act of ALL_ACTS) {
      const startable = ACTS.includes(act);
      const hasVisuals = ACT_VISUALS[act.id] !== undefined;
      expect(startable, `act "${act.id}": in ACTS=${startable}, visuals=${hasVisuals}`).toBe(
        hasVisuals,
      );
    }
    for (const id of Object.keys(ACT_VISUALS)) {
      expect(ALL_ACTS.some((a) => a.id === id), `visuals for unknown act "${id}"`).toBe(true);
    }
  });
});

describe('acts', () => {
  // ALL_ACTS throughout: the rules apply to every schedule that exists,
  // whether or not the title can start it yet.
  it('every wave references an enemy that exists', () => {
    for (const act of ALL_ACTS) {
      for (const wave of act.waves) {
        expect(ENEMIES[wave.enemyId], `act "${act.id}" spawns unknown "${wave.enemyId}"`).toBeDefined();
      }
    }
  });

  it("a race names an enemy that exists, is the act's own and is scheduled, and needs at least one to arrive", () => {
    for (const act of ALL_ACTS) {
      if (!act.race) continue;
      const { enemyId, absorb } = act.race;
      expect(ENEMIES[enemyId], `act "${act.id}" races unknown "${enemyId}"`).toBeDefined();
      expect(ENEMIES[enemyId]?.act, `act "${act.id}" races "${enemyId}"`).toBe(act.id);
      expect(spawnStreams(act.waves).has(enemyId), `act "${act.id}" races "${enemyId}", which never spawns`).toBe(true);
      expect(absorb, `act "${act.id}" race absorb`).toBeGreaterThan(0);
    }
  });

  it('every wave spawns an enemy of its own act', () => {
    for (const act of ALL_ACTS) {
      for (const wave of act.waves) {
        expect(ENEMIES[wave.enemyId]?.act, `act "${act.id}" spawns "${wave.enemyId}"`).toBe(act.id);
      }
    }
  });

  it('every enemy the registry gives an act is scheduled by that act', () => {
    // The per-act form of the sibling-collection trap: an enemy defined for an
    // act and left out of its schedule is content nothing can reach, and it
    // would stay green forever.
    for (const act of ALL_ACTS) {
      const defined = Object.values(ENEMIES)
        .filter((d) => d.act === act.id)
        .map((d) => d.id)
        .sort();
      const scheduled = [...spawnStreams(act.waves).keys()].sort();
      expect(scheduled, `act "${act.id}"`).toEqual(defined);
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
    for (const act of ALL_ACTS) {
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
    for (const act of ALL_ACTS) {
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
    for (const act of ALL_ACTS) {
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
    for (const act of ALL_ACTS) {
      const last = act.waves[act.waves.length - 1]!;
      expect(last.fromSeconds).toBeLessThan(act.durationSeconds);
    }
  });

  it('every act names its boss and covers a span of years, in life order (D-024)', () => {
    let previousTo = -Infinity;
    for (const act of ALL_ACTS) {
      expect(act.bossName.length, `act "${act.id}" has no boss name`).toBeGreaterThan(2);
      expect(act.age.from, `act "${act.id}" ages backwards`).toBeLessThanOrEqual(act.age.to);
      expect(act.age.from, `act "${act.id}" starts before the act before it ended`).toBeGreaterThanOrEqual(
        previousTo,
      );
      previousTo = act.age.to;
    }
  });

  /**
   * Acts a person has played and whose numbers were moved in response.
   *
   * Empty today, deliberately. Removing an act's `provisional` label means
   * adding its id here, so "this act is tuned" is a reviewable line in a diff
   * and can never happen by omission — which is the hole a label with no
   * forcing function would have left open.
   */
  const TUNED: string[] = [];

  it('every act not listed as tuned carries a provisional label that names a person and a decision', () => {
    // The marker is the rule from PLAN.md's 2026-09-27 amendment: placeholder
    // numbers are allowed and must be labelled, in data, with the thing that
    // retires them. An empty or glib label is a placeholder pretending to be
    // a decision.
    //
    // What a regex can check: a PERSON is named as the resolver, on a word
    // boundary (the first draft matched /play|session/, which "playtest"
    // satisfies — a label retired by a bot is exactly what D-022 forbids); the
    // decision that made it provisional is cited; and no word claims finality.
    for (const act of ALL_ACTS) {
      if (TUNED.includes(act.id)) {
        expect(act.provisional, `act "${act.id}" is listed as tuned and still labelled`).toBeUndefined();
        continue;
      }
      const label = act.provisional;
      expect(label, `act "${act.id}" has no provisional label and is not listed as tuned`).toBeDefined();
      expect(label!.length, `act "${act.id}" provisional label is too short`).toBeGreaterThan(60);
      expect(label, `act "${act.id}" must name a person as what resolves it`).toMatch(
        /\b(person|human|Justin)\b/i,
      );
      expect(label, `act "${act.id}" must cite the decision that made it provisional`).toMatch(
        /\b[DG]-\d{3}\b/,
      );
      expect(label, `act "${act.id}" label claims finality`).not.toMatch(
        /\b(final|tuned|settled|calibrated)\b/i,
      );
    }
  });
});
