/**
 * D-007, enforced. Enemies are conditions, institutions and abstractions —
 * never identity groups. No enemy is defined by religion, ethnicity,
 * nationality or race, in art, name, description, or generation prompt.
 *
 * A generation prompt that violates this is a BUILD FAILURE, not a review
 * comment. Everything here throws.
 *
 * Why this is code and not a guideline: unattended agents drift toward
 * whatever is generically "military" in training data, and the Service act is
 * the obvious place for it to happen at 4am with nobody watching. The rule has
 * to survive a long run in which no human reads the prompts before they are
 * sent. So the check runs on every text field of every asset, before the
 * network call.
 *
 * The creative reason is the stronger one (PLAN.md): the satire is aimed at
 * the American life script, so an enemy that is *a category of person* aims at
 * the wrong target and is straightforwardly less funny than the bureaucracy.
 */

export type RuleCategory = 'religion' | 'ethnicity' | 'nationality';

export interface Violation {
  category: RuleCategory;
  matched: string;
  field: string;
  rule: string;
}

/**
 * Terms that identify a person by religion. Institutions and buildings are
 * deliberately NOT here — a church, a synagogue or a diocese is an
 * institution, and institutions are legitimate enemies. What is banned is
 * describing a *person* by their faith.
 */
const RELIGION = [
  'muslim',
  'moslem',
  'islamic',
  'islamist',
  'islam',
  'christian',
  'christianity',
  'catholic',
  'protestant',
  'evangelical',
  'baptist',
  'methodist',
  'mormon',
  'jewish',
  'judaism',
  'jew',
  'jews',
  'zionist',
  'hindu',
  'hinduism',
  'buddhist',
  'buddhism',
  'sikh',
  'jain',
  'shinto',
  'taoist',
  'rastafarian',
  'pagan',
  'jihadi',
  'jihadist',
  'jihad',
  'sharia',
  'infidel',
  'mujahideen',
  'taliban',
  'shia',
  'shiite',
  'sunni',
  'wahhabi',
];

/** Terms that identify a person by ethnicity or race. */
const ETHNICITY = [
  'caucasian',
  'negro',
  'oriental',
  'mulatto',
  'aryan',
  'semitic',
  'antisemitic',
  'arab',
  'arabic',
  'arabian',
  'bedouin',
  'kurdish',
  'kurd',
  'persian',
  'slavic',
  'slav',
  'nordic',
  'anglo',
  'saxon',
  'celtic',
  'hispanic',
  'latino',
  'latina',
  'latinx',
  'chicano',
  'mestizo',
  'romani',
  'gypsy',
  'gypsies',
  'aboriginal',
  'indigenous',
  'inuit',
  'eskimo',
  'polynesian',
  'melanesian',
  'ethnic',
  'ethnicity',
  'race',
  'racial',
  'tribe',
  'tribal',
  'tribesman',
  'tribesmen',
];

/**
 * Nationalities and regional demonyms. Only the person-describing forms —
 * bare place names are not listed, because "a drone over a desert" is fine
 * and "an Afghan fighter" is not. The Service act fights the war: paperwork,
 * heat, drones, the absurdity of being nineteen and there.
 */
const NATIONALITY = [
  'afghan',
  'afghani',
  'iraqi',
  'iranian',
  'syrian',
  'yemeni',
  'somali',
  'libyan',
  'lebanese',
  'palestinian',
  'israeli',
  'saudi',
  'emirati',
  'qatari',
  'egyptian',
  'turkish',
  'pakistani',
  'indian',
  'bangladeshi',
  'chinese',
  'japanese',
  'korean',
  'vietnamese',
  'filipino',
  'thai',
  'indonesian',
  'malaysian',
  'russian',
  'ukrainian',
  'polish',
  'german',
  'french',
  'british',
  'english',
  'irish',
  'scottish',
  'italian',
  'spanish',
  'portuguese',
  'greek',
  'serbian',
  'croatian',
  'bosnian',
  'albanian',
  'romanian',
  'hungarian',
  'czech',
  'mexican',
  'colombian',
  'venezuelan',
  'cuban',
  'haitian',
  'brazilian',
  'nigerian',
  'kenyan',
  'ethiopian',
  'sudanese',
  'moroccan',
  'algerian',
  'tunisian',
  'american',
  'canadian',
  'australian',
  'middle eastern',
  'middle-eastern',
  'mideast',
  'third world',
  'third-world',
  'foreigner',
  'foreigners',
  'immigrant',
  'immigrants',
  'refugee',
  'refugees',
];

const TERMS: ReadonlyArray<readonly [RuleCategory, readonly string[]]> = [
  ['religion', RELIGION],
  ['ethnicity', ETHNICITY],
  ['nationality', NATIONALITY],
];

/**
 * Constructions that describe a person by appearance-as-category. Bare colour
 * words are NOT banned — "thick black outline" and "off-white body" are the
 * house style, and a checker that rejects them would be turned off within a
 * day, which is the real failure mode for a rule like this.
 */
const PERSON_NOUN =
  '(?:man|men|woman|women|person|people|child|children|boy|boys|girl|girls|guy|guys|folk|folks|male|males|female|females|soldier|soldiers|fighter|fighters|militant|militants|insurgent|insurgents|civilian|civilians|villager|villagers|native|natives|worker|workers|family|families)';

const DESCRIPTOR = '(?:black|white|brown|yellow|red|dark-skinned|light-skinned|coloured|colored)';

const PATTERNS: ReadonlyArray<readonly [RuleCategory, RegExp, string]> = [
  [
    'ethnicity',
    new RegExp(`\\b${DESCRIPTOR}[\\s-]+${PERSON_NOUN}\\b`, 'i'),
    'a person described by skin colour',
  ],
  [
    'ethnicity',
    new RegExp(`\\b${PERSON_NOUN}\\s+of\\s+colou?r\\b`, 'i'),
    'a person described by skin colour',
  ],
  [
    'ethnicity',
    /\b(?:dark|light|pale|olive|brown|black|white)[\s-]*skin(?:ned|s)?\b/i,
    'skin colour as a descriptor',
  ],
  [
    'religion',
    /\b(?:wearing|in)\s+a\s+(?:hijab|burqa|niqab|turban|yarmulke|kippah|keffiyeh|habit)\b/i,
    'religious dress as an identifier',
  ],
  ['religion', /\b(?:hijab|burqa|niqab|yarmulke|kippah|keffiyeh)\b/i, 'religious dress'],
];

/** Every violation in one string. Empty array means the text is clean. */
export function findViolations(text: string, field = 'text'): Violation[] {
  const found: Violation[] = [];
  const haystack = text.toLowerCase();

  for (const [category, list] of TERMS) {
    for (const term of list) {
      // Word-boundary match so "arab" does not fire on "parable" and
      // "jew" does not fire on "jewel" or "jewellery".
      const re = new RegExp(`\\b${term.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')}\\b`, 'i');
      if (re.test(haystack)) {
        found.push({
          category,
          matched: term,
          field,
          rule: `identifies a person or enemy by ${category}`,
        });
      }
    }
  }

  for (const [category, pattern, rule] of PATTERNS) {
    const m = pattern.exec(text);
    if (m) found.push({ category, matched: m[0], field, rule });
  }

  return found;
}

export class ContentRuleViolation extends Error {
  readonly violations: Violation[];

  constructor(subject: string, violations: Violation[]) {
    const lines = violations.map(
      (v) => `  - ${v.field}: "${v.matched}" — ${v.rule} (${v.category})`,
    );
    super(
      `D-007 violation in ${subject}. Enemies are conditions, institutions and\n` +
        `abstractions — never identity groups. Nothing generates until this is fixed.\n` +
        lines.join('\n'),
    );
    this.name = 'ContentRuleViolation';
    this.violations = violations;
  }
}

/**
 * Throws unless every supplied field is clean. Call this before the network
 * request, never after — the point is that the violating prompt is never sent.
 */
export function assertContentRule(subject: string, fields: Record<string, string | undefined>): void {
  const violations: Violation[] = [];
  for (const [field, value] of Object.entries(fields)) {
    if (value) violations.push(...findViolations(value, field));
  }
  if (violations.length > 0) throw new ContentRuleViolation(subject, violations);
}
