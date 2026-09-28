/**
 * Challenge runs (G-055): rules a life is played under, chosen at the title,
 * carried by `World` and printed on the certificate. A rule is part of the
 * game, never a cheat: the bots play a ruled life exactly as a person does,
 * and a ruled life is recorded as an ancestor with its rules. One registry
 * for every rule (CONCEPTION-ROSTER §5.3); a sibling list is a rule that
 * silently stops applying.
 *
 * `World` reads `RunRules` from its options and enforces each rule inside
 * the sim (`applyRules`, `rollOffers`): the title only chooses.
 */

export type RuleId = 'couch-potato' | 'one-trick';

export interface RuleDef {
  id: RuleId;
  /** On the title's line and the HUD. */
  name: string;
  /** One line under the name at the title. */
  blurb: string;
  /** The certificate's line, past tense, as a form would print it. */
  certificate: string;
}

export const RULES: Record<RuleId, RuleDef> = {
  'couch-potato': {
    id: 'couch-potato',
    name: 'Couch Potato',
    blurb: 'You never move. Everything comes to you.',
    certificate: 'Never moved.',
  },
  'one-trick': {
    id: 'one-trick',
    name: 'One Trick',
    blurb: 'You start with nothing, choose one weapon, and never get another.',
    certificate: 'Had one trick.',
  },
};

/** The rules a life is played under; empty for the life the title starts. */
export type RunRules = readonly RuleId[];

export const NO_RULES: RunRules = [];

/** Every rule, in the order the title lists them. */
export const RULE_IDS: readonly RuleId[] = ['couch-potato', 'one-trick'];
