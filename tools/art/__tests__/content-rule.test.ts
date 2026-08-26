import { describe, expect, it } from 'vitest';
import { ALL_ASSETS, TEST_BATCH, styleSuffix, fullPrompt } from '../batch';
import { ACT_IDS } from '../palette';
import { ContentRuleViolation, assertContentRule, findViolations } from '../content-rule';

/**
 * D-007 is the one rule in this repository that is a build failure rather than
 * a review comment, so it gets the most tests. The two failure modes that
 * matter are opposite: a checker that misses a real violation is useless, and
 * a checker that fires on "thick black outline" gets switched off within a day.
 */

describe('D-007 content rule', () => {
  describe('rejects enemies defined by identity', () => {
    const violations: Array<[string, string]> = [
      ['religion', 'a muslim fighter with a rifle'],
      ['religion', 'an angry islamist militant'],
      ['religion', 'a jewish banker cartoon'],
      ['religion', 'a christian missionary enemy'],
      ['religion', 'a taliban insurgent'],
      ['religion', 'a woman wearing a hijab'],
      ['ethnicity', 'an arab man in the desert'],
      ['ethnicity', 'a tribal warrior'],
      ['ethnicity', 'a hispanic gardener'],
      ['ethnicity', 'gypsy caravan enemy'],
      ['nationality', 'an afghan villager'],
      ['nationality', 'iraqi soldiers advancing'],
      ['nationality', 'a russian tank commander'],
      ['nationality', 'middle eastern fighters'],
      ['nationality', 'a group of refugees'],
      ['skin colour', 'a black man holding a clipboard'],
      ['skin colour', 'two white women in a meeting'],
      ['skin colour', 'a dark-skinned soldier'],
      ['skin colour', 'a brown-skinned child'],
      ['skin colour', 'people of colour in an office'],
    ];

    for (const [category, prompt] of violations) {
      it(`${category}: "${prompt}"`, () => {
        expect(findViolations(prompt).length).toBeGreaterThan(0);
      });
    }
  });

  describe('does not fire on the house style', () => {
    const clean = [
      'thick uniform black outline of even weight around every shape',
      'an off-white oval head with two big flat eyes',
      'flat saturated fills only, no gradients, no shading',
      'a bright white clipboard held at chest height',
      'bone and sand coloured, almost no colour at all',
      'corporate blue-grey and white, clean and rigid',
      'a black and white photocopied homework sheet with a face',
      'a red threat colour on the head rim only',
      'a lumpy cartoon uncrewed surveillance aircraft with crooked antennae',
      'a mustard yellow sweater vest in a colour that was never in fashion',
      'a jewel-bright pickup that restores health',
      'a parable about a mortgage with a face on it',
      'the white noise of an open floor plan',
      'a tired office worker with a lanyard',
      'a hall monitor, a substitute teacher, a performance review',
    ];

    for (const prompt of clean) {
      it(`clean: "${prompt.slice(0, 48)}..."`, () => {
        expect(findViolations(prompt)).toEqual([]);
      });
    }
  });

  it('word boundaries: "jew" does not fire on "jewellery" or "jewel"', () => {
    expect(findViolations('a jewel, some jewellery, a jeweller')).toEqual([]);
  });

  it('word boundaries: "arab" does not fire on "parable"', () => {
    expect(findViolations('a parable, a scarab beetle')).toEqual([]);
  });

  it('assertContentRule throws with every offending field named', () => {
    let caught: unknown;
    try {
      assertContentRule('test asset', {
        name: 'Afghan Fighter',
        subject: 'a muslim soldier',
        prompt: 'clean text here',
      });
    } catch (err) {
      caught = err;
    }
    expect(caught).toBeInstanceOf(ContentRuleViolation);
    const v = (caught as ContentRuleViolation).violations;
    expect(v.map((x) => x.field).sort()).toEqual(['name', 'subject']);
    expect((caught as Error).message).toContain('D-007');
  });

  it('assertContentRule passes clean fields', () => {
    expect(() =>
      assertContentRule('ok', { name: 'The Reorg', subject: 'an org chart with faces' }),
    ).not.toThrow();
  });
});

describe('the shipped test batch', () => {
  it('every prompt in the batch is clean, including the style suffix', () => {
    for (const spec of TEST_BATCH) {
      expect(
        () =>
          assertContentRule(spec.id, {
            name: spec.name,
            subject: spec.subject,
            whyThisStage: spec.whyThisStage,
            prompt: fullPrompt(spec),
            styleSuffix: styleSuffix(spec.act),
          }),
        `asset "${spec.id}" violates D-007`,
      ).not.toThrow();
    }
  });

  it('every act style suffix is clean, not just the ones in the batch', () => {
    for (const act of ACT_IDS) {
      expect(findViolations(styleSuffix(act)), `style suffix for "${act}"`).toEqual([]);
    }
  });

  it('law 4 is per asset now (G-013): every act defaults to hand-cut', () => {
    // The exception used to be the Office act's style. It is one object's
    // characterisation, so no act carries it any more — an asset opts in.
    for (const act of ACT_IDS) {
      expect(styleSuffix(act), `act "${act}" default`).toMatch(/hand-cut paper/);
      expect(styleSuffix(act)).not.toMatch(/precise ruled geometry/);
    }
  });

  it('every asset gets exactly one geometry clause, and the right one', () => {
    for (const spec of ALL_ASSETS) {
      const prompt = fullPrompt(spec);
      if (spec.geometry === 'ruled') {
        expect(prompt, `"${spec.id}"`).toMatch(/precise ruled geometry|true right angles/);
        expect(prompt, `"${spec.id}"`).not.toMatch(/hand-cut paper/);
      } else if (spec.role === 'icon') {
        // Card-surface pictograms: the sleek half of the period. Hand-cut is
        // for creatures in the field, where irregular reads as alive; at 52px
        // on a card it reads as crude.
        expect(prompt, `"${spec.id}"`).toMatch(/precisely designed pictogram/);
        expect(prompt, `"${spec.id}"`).not.toMatch(/hand-cut paper/);
        expect(prompt, `"${spec.id}"`).not.toMatch(/precise ruled geometry/);
      } else {
        expect(prompt, `"${spec.id}"`).toMatch(/hand-cut paper/);
        expect(prompt, `"${spec.id}"`).not.toMatch(/precise ruled geometry/);
      }
    }
  });

  it('ruled geometry stays scarce, and every holder can say why', () => {
    // The Reorg, because a diagram was drawn by nobody. The antibody, because
    // CONCEPTION-ROSTER §2 reserves the Y as the act's only straight lines.
    // The paper dart, because folds are its identity — and it does not breach
    // the antibody's reservation, which is about the FIELD read: cards appear
    // on an ink panel with the world stopped, where nothing can be mistaken
    // for a swarm object. A ruled FIELD asset in conception is still a bug.
    // The dart moved to the icon-wide pictogram clause, which carries its own
    // precision; ruled is back to exactly two holders.
    const ruled = ALL_ASSETS.filter((s) => s.geometry === 'ruled').map((s) => s.id).sort();
    expect(ruled).toEqual(['antibody', 'boss-reorg']);
    const fieldRuled = ALL_ASSETS.filter(
      (s) => s.geometry === 'ruled' && s.act === 'conception' && s.role !== 'icon',
    ).map((s) => s.id);
    expect(fieldRuled).toEqual(['antibody']);
  });

  it('the Reorg prompt names connectors and forbids the failure it already hit', () => {
    // It came back as a chest of drawers. Both halves of the fix are load
    // bearing: describe a separated tree joined by connector lines, and name
    // the furniture it must not be.
    const reorg = TEST_BATCH.find((s) => s.id === 'boss-reorg')!;
    expect(reorg.subject).toMatch(/connector lines/);
    expect(reorg.subject).toMatch(/separated/);
    expect(reorg.subject).toMatch(/chest of drawers/);
    expect(reorg.subject).toMatch(/flat/);
  });

  it('the substitute teacher is a role, not a person to feel sorry for', () => {
    const sub = TEST_BATCH.find((s) => s.id === 'substitute-teacher')!;
    expect(sub.subject).toMatch(/indifferent|unbothered/);
    expect(sub.subject).toMatch(/not sympathetic/);
    expect(sub.subject).not.toMatch(/apolog/);
    // The first version's build and mood descriptors are what put the joke on
    // the man instead of the institution. They may appear only as negations —
    // "not sad" is the fix, "tired" on its own was the bug.
    for (const word of ['sad', 'nervous', 'tired', 'heavy', 'fat']) {
      const asDescriptor = new RegExp(`(?<!not )\\b${word}\\b`);
      expect(sub.subject, `"${word}" must not describe the figure`).not.toMatch(asDescriptor);
    }
  });

  it('the drone prompt names no operator, force, nationality or insignia', () => {
    const drone = TEST_BATCH.find((s) => s.id === 'surveillance-drone');
    expect(drone).toBeDefined();
    expect(findViolations(drone!.subject)).toEqual([]);
    // It must also positively suppress markings, which is where a generator
    // reaches for a flag without being asked.
    expect(drone!.subject).toMatch(/no markings|no insignia|no flags/);
  });

  it('every enemy answers "why this life stage" (PLAN.md mechanism 2)', () => {
    for (const spec of TEST_BATCH) {
      if (spec.role === 'player') continue;
      expect(spec.whyThisStage, `"${spec.id}" has no whyThisStage`).toBeTruthy();
      expect(spec.whyThisStage!.length).toBeGreaterThan(20);
    }
  });
});
