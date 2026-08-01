import type { ActId } from './palette';
import type { AssetSpec } from './types';

/**
 * The six-asset test batch (ART-DIRECTION.md, bottom; TEST-BATCH-CONCEPTS.md).
 *
 * Generated so Justin can answer one question: "is this funny, and would I
 * play a game that looked like this for twenty minutes." Assets 4 and 6 are
 * the real test — anything can draw a sperm cell, and the project lives or
 * dies on whether a substitute teacher and a corporate reorganisation are
 * funny as sprites.
 *
 * Nothing here is approved. ART-DIRECTION.md stays a draft until it is judged.
 */

/**
 * The chroma background. Not in the locked palette and far from every entry
 * in it, so the CUT stage can key it out by flood fill without eating the
 * subject. Pure magenta is the traditional choice for exactly this reason.
 */
export const CHROMA_BACKGROUND = '#FF00FF';

/**
 * The style half of every prompt, identical across all assets.
 *
 * It describes visual attributes rather than naming the shows in
 * ART-DIRECTION.md's reference list. Two reasons: naming a studio or series in
 * a generation prompt is a worse habit than describing what you actually want,
 * and attribute prompts are more reliable — "thick uniform outline, flat
 * fills, no gradients" hits the target far more often than a show title, which
 * the model interprets as a vibe.
 */
const SHARED_STYLE = [
  'flat 2D cartoon illustration, adult animated comedy style',
  'thick uniform black outline of even weight around every shape',
  'flat saturated fills only',
  'absolutely no gradients, no shading, no ambient occlusion, no rendered lighting, no glow',
  'deadpan expression, played completely straight',
  'single subject, centred, entire subject visible with margin around it',
  `plain solid ${CHROMA_BACKGROUND} magenta background, nothing else in frame`,
  // The subject floats. A cast shadow is connected to the subject, so the CUT
  // stage cannot tell it apart and it survives into the silhouette — the first
  // batch put a dark ellipse under the Reorg and thickened every outline
  // around it. Cheaper to forbid in the prompt than to segment out later.
  'floating with no ground and no horizon, no drop shadow, no cast shadow, no contact shadow',
  'no text, no letters, no numbers, no watermark, no signature, no border',
];

/**
 * The one clause that varies, and the only place the style is allowed to.
 *
 * Law 4 is "lumpy, never geometric — with the deliberate exception of the
 * Office act, where clean IS the joke." Everything in seven acts is
 * hand-wrong; the Reorg has right angles, and its wrongness comes from the
 * arrangement rather than the shapes. Encoding that here rather than leaving
 * it to the subject text matters: without it the suffix would order the
 * generator to make the org chart lumpy while the subject asks for rigid
 * boxes, and the two would fight inside one prompt.
 */
const PROPORTION_CLAUSE: Record<ActId, string> = {
  conception: 'lumpy asymmetric hand-drawn proportions, slightly wrong, never geometric',
  school: 'lumpy asymmetric hand-drawn proportions, slightly wrong, never geometric',
  service: 'lumpy asymmetric hand-drawn proportions, slightly wrong, never geometric',
  office:
    'rigid geometric shapes with clean straight edges and true right angles, ' +
    'the wrongness coming entirely from the arrangement and never from the shapes',
};

export function styleSuffix(act: ActId): string {
  return [SHARED_STYLE[0]!, PROPORTION_CLAUSE[act], ...SHARED_STYLE.slice(1)].join(', ');
}

/** The style as it applies to every act but the Office. Used in provenance. */
export const STYLE_SUFFIX = styleSuffix('conception');

export const TEST_BATCH: AssetSpec[] = [
  {
    id: 'player-sperm',
    name: 'The player — sperm form',
    act: 'conception',
    role: 'player',
    tests: 'can the style do a protagonist at all',
    targetSize: 112,
    seed: 1001,
    subject: [
      'a single cartoon sperm cell character seen from the side',
      'a large lopsided off-white oval head taking up most of the body',
      'two big flat eyes at visibly different heights, the left eye slightly larger',
      'a short flat line for a mouth',
      'thick eyebrows furrowed with effort, the face of something doing its best with no information',
      'one asymmetric tuft of hair sticking up above the left eye',
      'a single thin tapering tail trailing behind',
      'no clothing, no accessories, no helmet, no gear, it owns nothing',
    ].join(', '),
  },
  {
    id: 'rival-sperm',
    name: 'Rival sperm',
    act: 'conception',
    role: 'swarm',
    tests: 'does it read at 48px in a crowd',
    targetSize: 96,
    seed: 2002,
    whyThisStage:
      'Conception is the only competition the player has already won, so the game opens by making it feel like a commute.',
    subject: [
      'a single cartoon sperm cell seen from the side',
      'a smooth blunt domed head with no hair and no tuft',
      'half-lidded eyes almost closed, a flat horizontal line for a mouth, no eyebrows',
      'a blank disinterested expression, completely uninterested, looking straight ahead in its direction of travel and not at the viewer',
      'a single thin curled tail',
      'muted darker colouring',
    ].join(', '),
  },
  {
    id: 'boss-egg',
    name: 'The Egg',
    act: 'conception',
    role: 'boss',
    tests: 'does scale hold up; is a boss impressive',
    targetSize: 384,
    seed: 3003,
    whyThisStage:
      'It is the only boss in the game that is beaten by being taken in rather than brought down.',
    subject: [
      'an enormous smooth round cartoon egg cell filling the frame',
      'a thick irregular fringe of blunt stubby finger-like protrusions all the way around it like a lumpy crown or a bad haircut',
      'no two protrusions the same length',
      'one small calm face placed off-centre and low on the huge smooth mass',
      'half-lidded eyes and a small closed-mouth knowing smile',
      'serene and faintly amused, not angry, it has already decided',
      'one flat darker tone across the lower third as the only shadow',
    ].join(', '),
  },
  {
    id: 'substitute-teacher',
    name: 'Substitute teacher',
    act: 'school',
    role: 'swarm',
    tests: 'faces, humour, human characters — THE REAL TEST',
    targetSize: 96,
    seed: 4004,
    whyThisStage:
      'School is the first place the player is judged by someone who does not know who they are, and the substitute is that experience with a lanyard on.',
    subject: [
      'a cartoon adult substitute schoolteacher standing facing forward',
      'no neck, the head sitting directly on a soft rectangle torso with sloping shoulders',
      'wearing a mustard yellow sweater vest in a colour that was never in fashion',
      'holding an oversized bright white clipboard with both hands at chest height like a shield',
      'a crooked lanyard loop hanging from the neck',
      'two flat dot eyes at visibly different heights and a small horizontal mouth',
      'eyebrows raised in permanent mild apology, the expression of someone who arrived twenty minutes ago and has been told none of this',
      'ordinary, tired, out of place',
    ].join(', '),
  },
  {
    id: 'surveillance-drone',
    name: 'Surveillance drone',
    act: 'service',
    role: 'swarm',
    tests: 'a mechanical subject in an organic style',
    targetSize: 96,
    seed: 5005,
    whyThisStage:
      "Service is the stage where everything that decides the player's day is far away and looking at something else.",
    // D-007: this is equipment, unattributed and indifferent. No operator, no
    // flag, no insignia, no nationality, no person. The prompt describes an
    // aircraft and a mood, and content-rule.ts fails the build if it ever
    // describes anything else.
    subject: [
      'a lumpy cartoon uncrewed surveillance aircraft seen from above and slightly to the side',
      'long thin wings of visibly unequal length',
      'a bulbous drooping nose and a V-shaped tail',
      'the fuselage sagging slightly in the middle as if drawn from memory by someone who saw one once',
      'crooked bent antennae',
      'a single large half-lidded bored eye set into the camera pod under the nose, aimed slightly off to one side, not looking at the viewer',
      'bone and sand coloured, almost no colour at all',
      'completely blank surfaces, no markings, no insignia, no flags, no emblems, no lettering',
    ].join(', '),
  },
  {
    id: 'boss-reorg',
    name: 'The Reorg',
    act: 'office',
    role: 'boss',
    tests: 'can the style render an abstraction as a monster — THE REAL TEST',
    targetSize: 384,
    seed: 6006,
    whyThisStage:
      "The Office is the first stage where the player's life is decided by a diagram that somebody else is allowed to edit.",
    subject: [
      'a cartoon monster made entirely of a tall swaying organisational chart',
      'a lumpy ziggurat of rectangular boxes, wider at the base, stacked several rows high',
      'the boxes at slightly different sizes and slight rotations',
      'joined by thick straight right-angled connector lines drawn at the same heavy weight as the outlines',
      'corporate blue-grey and white, clean and rigid, right angles everywhere',
      'every box has a small flat deadpan face inside it',
      'the faces look at each other or upward, none of them looking at the viewer',
      'one slightly larger box at the very top is completely empty with no face inside it',
    ].join(', '),
  },
];

export function fullPrompt(spec: AssetSpec): string {
  return `${spec.subject}, ${styleSuffix(spec.act)}`;
}
