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
  // Mid-century institutional, not Adult Swim. The register the game is
  // satirising is the register it should be drawn in: the visual language of
  // insurance pamphlets, safety posters and annual reports.
  'mid-century modern commercial illustration, 1950s 1960s printed institutional graphic design',
  'limited spot-colour screenprint, two or three flat muted ink colours on off-white paper stock',
  // Flatness is load-bearing twice over: it is the register, and the first
  // batch's Reorg read as a dresser because the boxes were drawn in 3D.
  'strictly flat two-dimensional, no perspective, no depth, no 3D, no isometric view',
  'absolutely no gradients, no shading, no ambient occlusion, no rendered lighting, no glow',
  // Affect is the throughline of everything that worked in the first batch:
  // the rivals are not looking at you, the Egg has already decided, the drone
  // is bored. The one asset that emoted at the player was the one that failed.
  'completely affectless, blank deadpan expression, indifferent, unbothered, not reacting',
  'single subject, centred, entire subject visible with margin around it',
  `plain solid ${CHROMA_BACKGROUND} magenta background, nothing else in frame`,
  // A cast shadow is connected to the subject, so CUT cannot tell it apart and
  // it survives into the silhouette — the first batch put a dark ellipse under
  // the Reorg. Cheaper to forbid here than to segment out later.
  'floating with no ground and no horizon, no drop shadow, no cast shadow, no contact shadow',
  'not cute, not childish, not a modern cartoon, not vector clipart',
  // The register makes the generator draw framed posters, and a frame at the
  // image edge blocks the CUT stage's flood fill — the Reorg came back as one
  // solid rectangle because of it. The pipeline now works around a frame, but
  // not asking for one is still cheaper than removing it.
  'full bleed, no frame, no border, no rule around the image, no poster edge, no panel',
  'no text, no letters, no numbers, no watermark, no signature, no artist signature',
  'no stamp, no seal, no chop mark, no printed margin, no caption',
];

/**
 * D-018: the detail budget is uneven, and the prompt is where it starts.
 *
 * Mid-century institutional is built out of fine line and halftone, both of
 * which are illegible below about 100px. A swarm enemy that is authored with
 * that detail arrives in play as a pale smudge — which is exactly what the
 * second test batch produced. So small assets are asked for the register's
 * SHAPES and colour without its surface, and bosses get the whole thing.
 *
 * The register is not being watered down; it is being spent where the camera
 * rests, the same logic as the animation budget in D-006.
 */
const DETAIL_CLAUSE: Record<'small' | 'large', string> = {
  small: [
    'bold simplified flat shapes with a strong clear silhouette',
    'very few interior details, large uninterrupted areas of flat colour',
    'heavy confident line weight, chunky and readable',
    'high contrast between shapes, designed to be recognised at a glance from a distance',
    'no halftone dots, no fine hairlines, no small detail, no surface texture, no cross-hatching',
  ].join(', '),
  large: [
    'visible halftone dot texture, paper grain, slightly misregistered ink edges',
    'fine even line weight, thin restrained linework, no heavy black outlines',
    'simplified geometric stylised forms, flat graphic shapes',
  ].join(', '),
};

/**
 * Where the detail budget divides. Below this the sprite is displayed at
 * roughly 48px in play and cannot carry surface texture; above it, the camera
 * rests long enough for the register to be worth rendering.
 */
export const DETAIL_THRESHOLD_PX = 200;

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
  conception: 'slightly irregular hand-cut paper shapes, organic and asymmetric, never mechanical',
  school: 'slightly irregular hand-cut paper shapes, organic and asymmetric, never mechanical',
  service: 'slightly irregular hand-cut paper shapes, organic and asymmetric, never mechanical',
  office:
    'precise ruled geometry with true right angles and straight edges, drafted rather than drawn, ' +
    'the wrongness coming entirely from the arrangement and never from the shapes',
};

export function styleSuffix(act: ActId, targetSize = DETAIL_THRESHOLD_PX + 1): string {
  const detail = DETAIL_CLAUSE[targetSize >= DETAIL_THRESHOLD_PX ? 'large' : 'small'];
  return [SHARED_STYLE[0]!, SHARED_STYLE[1]!, detail, PROPORTION_CLAUSE[act], ...SHARED_STYLE.slice(2)].join(
    ', ',
  );
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
    // Rewritten after the first batch. The old version asked for an
    // apologetic, anxious figure and got a sad heavy man — which put the joke
    // on his body and his nerves instead of on his position, and that is
    // punching down. Same failure shape as D-007, one step over.
    //
    // The fix is to make the ROLE the character. The clipboard and the lanyard
    // are the enemy; the person is what carries them. Nobody feels sorry for a
    // clipboard, and an adult who has already forgotten you and is untroubled
    // by it is funnier and colder than one who is sorry about it.
    subject: [
      'a substitute schoolteacher drawn as a mid-century institutional pictogram',
      'an ordinary adult figure of average unremarkable build, standing squarely and symmetrically facing forward',
      'a simplified geometric body, plain and generic, more diagram than portrait',
      'holding a large plain white clipboard flat against the chest with both hands, the clipboard is the brightest and hardest shape in the picture',
      'a plain lanyard loop around the neck',
      'the face is almost blank, two small flat dots for eyes and one short straight line for a mouth, no eyebrows',
      'no expression whatsoever, completely indifferent, unbothered, not looking at the viewer but slightly past and to one side',
      'institutional and anonymous, not sad, not nervous, not sympathetic',
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
    // Rewritten after the first batch, which read as a chest of drawers.
    // The cause was "a ziggurat of boxes stacked wider at the base", drawn in
    // 3D: stacked solid cubes ARE furniture. An org chart is not a stack, it
    // is a TREE — boxes separated by empty space and joined by visible
    // connector lines, drawn strictly flat. The connectors are the thing that
    // makes it a diagram rather than a pile, so they are named first.
    subject: [
      'a corporate organisational chart drawn as a flat printed diagram, standing upright as if it were a creature',
      'a branching hierarchy tree of separate plain rectangular outlined boxes, four rows deep, widening toward the bottom',
      'the boxes are clearly separated from one another with empty space between them, never touching and never stacked',
      'thin straight vertical and horizontal connector lines join each box down to the boxes below it, the connector lines clearly visible against the background',
      'each box contains one small flat deadpan face and a short solid blank label bar beneath the face',
      'the faces look at each other or upward, none of them looking at the viewer',
      'one slightly larger box alone at the very top of the tree is completely empty, no face and no label bar',
      'strictly flat and two-dimensional like a printed chart on a page',
      'not a stack of boxes, not a pile of crates, not a chest of drawers, not cubes, not a pyramid, no 3D boxes',
    ].join(', '),
  },
];

export function fullPrompt(spec: AssetSpec): string {
  return `${spec.subject}, ${styleSuffix(spec.act, spec.targetSize)}`;
}
