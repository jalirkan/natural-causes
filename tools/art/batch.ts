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
  'limited spot-colour screenprint, two or three flat muted ink colours',
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
/**
 * The value ceiling, in the prompt (G-032).
 *
 * Render tinting is retired, so the sprite has to arrive dark enough on its
 * own. The old shared style asked for "off-white paper stock" and got exactly
 * that — every enemy sprite in the project came back with paper as its
 * brightest pixel, which belongs to the player alone (law 10). It did not
 * matter while a GPU multiply darkened everything afterwards; it matters now.
 *
 * Enemies only. The player is supposed to be the lightest thing on screen.
 */
const ENEMY_VALUE_CLAUSE = [
  'muted mid-tone colouring throughout',
  'no white, no off-white, no cream, no ivory, nothing paler than a soft tan',
  'the lightest area is a muted tan and the darkest is a warm near-black',
].join(', ');

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
export type Geometry = 'hand-cut' | 'ruled';

const GEOMETRY_CLAUSE: Record<Geometry, string> = {
  'hand-cut':
    'slightly irregular hand-cut paper shapes, organic and asymmetric, never mechanical',
  ruled:
    'precise ruled geometry with true right angles and straight edges, drafted rather than drawn, ' +
    'the wrongness coming entirely from the arrangement and never from the shapes',
};

/**
 * Law 4's default per act. The Office is ruled; everywhere else is hand-cut.
 *
 * This is only the DEFAULT now. G-013 moved the exception from per-act to
 * per-asset — ruled geometry characterises one object rather than styling a
 * whole act — and Conception forces the point immediately: the antibody's Y is
 * "the only straight lines in the act" (CONCEPTION-ROSTER §2), so it needs the
 * ruled clause inside an otherwise hand-cut act. An asset overrides with
 * `geometry`.
 */
const ACT_DEFAULT_GEOMETRY: Record<ActId, Geometry> = {
  conception: 'hand-cut',
  school: 'hand-cut',
  service: 'hand-cut',
  office: 'hand-cut',
};

export function styleSuffix(
  act: ActId,
  targetSize = DETAIL_THRESHOLD_PX + 1,
  geometry: Geometry = ACT_DEFAULT_GEOMETRY[act],
  isEnemy = false,
): string {
  const detail = DETAIL_CLAUSE[targetSize >= DETAIL_THRESHOLD_PX ? 'large' : 'small'];
  return [
    SHARED_STYLE[0]!,
    SHARED_STYLE[1]!,
    detail,
    GEOMETRY_CLAUSE[geometry],
    ...(isEnemy ? [ENEMY_VALUE_CLAUSE] : []),
    ...SHARED_STYLE.slice(2),
  ].join(', ');
}

/** The style suffix an asset actually gets, honouring its geometry override. */
export function styleSuffixFor(spec: AssetSpec): string {
  return styleSuffix(
    spec.act,
    spec.targetSize,
    spec.geometry ?? ACT_DEFAULT_GEOMETRY[spec.act],
    spec.role === 'swarm' || spec.role === 'boss',
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
      'flat muted dusty rose colouring, mid-tone, never pale and never white',
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
      'an enormous smooth round egg cell filling the frame, flat muted deep teal',
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
      'holding a large plain muted-tan clipboard flat against the chest with both hands, the clipboard is the lightest and hardest-edged shape in the picture but is a soft tan and never white',
      'a plain lanyard loop around the neck',
      'the face is almost blank, two small flat dots for eyes and one short straight line for a mouth, no eyebrows',
      'no expression whatsoever, completely indifferent, unbothered, not looking at the viewer but slightly past and to one side',
      'institutional and anonymous, not sad, not nervous, not sympathetic',
      'no yellow, no gold, no olive green anywhere on the figure',
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
    // G-013: ruled geometry is this object's characterisation, not the Office
    // act's style. Everything else in that building was made by people and
    // looks it; the diagram that outranks all of it was drawn by nobody.
    geometry: 'ruled',
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
  return `${spec.subject}, ${styleSuffixFor(spec)}`;
}

/**
 * The Conception roster (CONCEPTION-ROSTER.md §3). Three swarm-tier assets,
 * each holding one reserved silhouette from §2: blot, droplet, Y. The ring is
 * the spermicide's second state and is drawn in code rather than generated —
 * it has to be an exactly even annulus at the standard outline weight, which
 * is a thing a renderer guarantees and a generator approximates.
 */
export const CONCEPTION_ROSTER: AssetSpec[] = [
  {
    id: 'white-cell',
    name: 'White cell',
    act: 'conception',
    role: 'swarm',
    tests: 'the blot silhouette, and a stamp face that must survive 48px',
    targetSize: 96,
    seed: 7007,
    whyThisStage:
      'Before the player is anyone at all, there is already a process whose only job is to stop things that look like them.',
    subject: [
      // Deliberately not "white blood cell": the word "white" is in the name
      // and the generator obliges, which failed enemy-value-ceiling at 0.9297
      // four attempts running. Same species as the antibody's "fork".
      'a single large round leukocyte cell seen from directly above, filling most of the frame',
      'a round lobed mass with a scalloped irregular edge, the lobes uneven in count and depth so it never resolves into a flower',
      'no tail, no limbs, no spikes, no protrusions',
      'flat muted purple, one darker shadow tone at most, no interior texture whatsoever',
      // Deliberately does not say "rubber stamp": the shared style suffix
      // carries "no stamp, no seal, no chop mark" to suppress the fake
      // signature marks the register keeps drawing in corners, and the two
      // would fight inside one prompt. The shape is what matters, not the word.
      'one small flat muted-tan oval disc set off-centre on the mass, lying flat on its surface',
      'that disc carries two small dark dots for eyes and one short horizontal line for a mouth and nothing else',
      'the eyes aimed a few degrees off to one side, looking past the viewer rather than at them',
    ].join(', '),
  },
  {
    id: 'spermicide',
    name: 'Spermicide',
    act: 'conception',
    role: 'swarm',
    tests: 'a droplet that reads as asleep, with no interior detail at all',
    targetSize: 72,
    seed: 8008,
    whyThisStage:
      'Conception is the first stage where the environment was made lethal in advance by someone who will never be told whether it worked.',
    subject: [
      'a single rounded teardrop-shaped droplet of liquid with a flat top and a smooth blunt bottom',
      'flat muted red, one solid colour, absolutely no interior detail, no highlight, no shine, no bubbles',
      'a small simple face low on the droplet: two downward-curving closed sleeping eye arcs and no mouth at all',
      'peacefully asleep, unaware, completely unbothered',
      'no arms, no legs, no tail, no ring, no circle around it',
    ].join(', '),
  },
  {
    id: 'antibody',
    name: 'Antibody',
    act: 'conception',
    role: 'swarm',
    tests: 'the Y — the only straight lines in the act, at the smallest size in it',
    targetSize: 44,
    seed: 9009,
    // §2 reserves the Y as the act's only straight lines, so this asset takes
    // law 4's ruled clause inside an otherwise hand-cut act (G-013).
    geometry: 'ruled',
    whyThisStage:
      'Conception is where the first record about the player is opened, and it describes a category rather than a person.',
    // The word "fork" is deliberately absent. It was in the first version and
    // the generator drew cutlery four times out of four — a literal dinner
    // fork, complete with a long thin handle that measured 11% coverage. The
    // shape wanted here is the letter, so the prompt says the letter.
    subject: [
      'a bold capital letter Y as a simple flat geometric symbol',
      'three thick straight bars of exactly equal thickness meeting at one central junction',
      'two bars angling upward and apart in a wide V, one bar pointing straight down',
      'all three limbs roughly the same length as each other, short and heavy, not thin, not tapering',
      'perfectly straight edges and sharp square corners, no curves anywhere on it',
      'flat dark grey-brown, one solid colour and nothing else',
      'one small muted-tan square tag centred on the junction where the bars meet',
      'the tag carries two small dark dots for eyes and no mouth and nothing else',
      'no other detail, no texture, no shading',
      'not a fork, not cutlery, not a utensil, not a tree, not a branch, not a slingshot',
    ].join(', '),
  },
];

/**
 * The School roster (SCHOOL-ROSTER.md §3). Four swarm-tier assets; the fifth,
 * `substitute-teacher`, is in the test batch above and already passed, and the
 * roster was written around it rather than over it.
 *
 * Every silhouette here is what it is because the clipboard took the bright
 * hard rectangle (§1). Homework is a wedge and the hall monitor's sash runs
 * off both edges of the body because both would naturally have been
 * rectangles, and the act only has one. That is the reserved list generating
 * drawings rather than merely forbidding them.
 *
 * **Gold appears on nothing here.** The substitute is the act's only ranged
 * thing and under G-031 its gold rides the projectile, so every prompt below
 * names yellow and gold in its exclusion list. Olive is excluded for the same
 * reason one step over: `school-light` is the pickup colour and no enemy in
 * any act may take its act's light tone (law 10, G-030).
 *
 * D-007 is live in this act in a way it was not in Conception (§4): three of
 * these four are people or rooms full of them. Every figure below is
 * described by what it is DOING and by nothing else — no ethnicity,
 * nationality, religion or race, and no build, age or skin described at all.
 */
export const SCHOOL_ROSTER: AssetSpec[] = [
  {
    id: 'clique',
    name: 'Clique',
    act: 'school',
    role: 'swarm',
    tests: 'the cluster — one enemy that must not read as four',
    targetSize: 88,
    seed: 10010,
    whyThisStage:
      'School is the first place that has an inside, and the player finds out where they are by walking into the edge of it.',
    // The failure this prompt is written against: four separate figures
    // standing near each other. It is ONE body and the silhouette has to say
    // so instantly, or the player tries to walk between the heads and dies
    // learning that they cannot. Hence "fused", "single", "one continuous
    // outline" — and the identical repeated face, which is both the joke and
    // cheaper to author than four faces.
    subject: [
      'a single wide lumpy mass with four heads growing out of the top of it, fused together into one body at the shoulders',
      'one continuous outline around the whole group, no gaps between them and no space to pass through',
      'the heads at slightly different heights, all turned the same way and all looking off to one side',
      'every head has exactly the same face: two small flat dots for eyes and one short straight line for a mouth, no eyebrows',
      'no arms, no legs, no hands, no bags, no clothing detail of any kind',
      'flat muted olive-grey green with one darker tone as the only shadow',
      'completely blank and unbothered, not looking at the viewer, not reacting to anything',
      'no yellow, no gold, no pale yellow-green anywhere',
    ].join(', '),
  },
  {
    id: 'dodgeball',
    name: 'Dodgeball',
    act: 'school',
    role: 'swarm',
    tests: 'the circle — the only radially symmetric thing in the act',
    targetSize: 44,
    seed: 11011,
    whyThisStage:
      'School is where the player is first hurt by something that was aimed at the room rather than at them.',
    // A perfect circle at 44px carries nothing but its own edge, so every
    // interior mark is a liability: a seam or a highlight would break the
    // radial symmetry that is the whole read at speed. The face is dead
    // centre and does nothing, because whoever threw it is not in the
    // picture (law 9) and it has no opinion about arriving.
    subject: [
      'a single perfectly round rubber ball seen straight on, one flat circle',
      'flat muted brick red, one solid colour across the whole ball',
      'absolutely no seam, no panel lines, no stripe, no highlight, no shine, no texture',
      'one small face dead centre: two small dark dots for eyes and one short straight horizontal line for a mouth',
      'completely blank and expressionless, not excited, not angry, not moving its face at all',
      'nothing else in the picture, no hands, no arms, no motion lines, no impact marks',
      'no yellow, no gold, no olive green anywhere',
    ].join(', '),
  },
  {
    id: 'homework',
    name: 'Homework',
    act: 'school',
    role: 'swarm',
    tests: 'the wedge — paper that is deliberately not a rectangle',
    targetSize: 72,
    seed: 12012,
    whyThisStage:
      'School is the first stage that follows the player home and takes up the part of the day nobody was counting.',
    // §1: the bright hard rectangle is the substitute's and School is full of
    // paper, so the obvious slab is forbidden. A leaning triangular stack in
    // shadow separates from the clipboard on shape, edge and value at once.
    // "Dull" is the brief, not a compromise — it is the only enemy in the act
    // that cannot hurt anyone and it should look like it.
    subject: [
      'a leaning stack of paper sheets seen from the side, triangular in profile, wider at the bottom and tapering toward the top',
      'the whole stack tilts to one side, the corners soft and rounded, the edges uneven where the sheets do not line up',
      'flat dull grey-brown, one solid colour, no white paper, no bright paper, no cream',
      'no straight rectangle, not a neat block, not a squared-off slab, not a folder, not a book',
      'one small face near the top of the stack: two small dark dots for eyes and no mouth at all',
      'completely inert and uninteresting, doing nothing, not looking at anything',
      'no text, no handwriting, no ruled lines, no yellow, no gold, no olive green',
    ].join(', '),
  },
  {
    id: 'hall-monitor',
    name: 'Hall monitor',
    act: 'school',
    role: 'swarm',
    tests: 'the sash — one hard diagonal that must not read as a badge',
    targetSize: 88,
    seed: 13013,
    whyThisStage:
      'School is where authority is first handed to someone with no more standing than the player, and it works anyway.',
    // Law 9, and §1 twice over. The sash IS the character: at 48px the body
    // is a lump and the stripe is the identity, which is why it must run off
    // both edges rather than sit on the chest. A badge or a name tag would
    // have been the natural read and would have put a second bright hard
    // rectangle in an act that has exactly one.
    subject: [
      'an upright figure standing squarely and facing forward, drawn as a plain mid-century institutional pictogram',
      'one wide hard-edged diagonal band crossing the whole body from shoulder to hip, running all the way off both sides of the body and cut off by them',
      'the band is a flat single tone with straight parallel edges and no writing on it',
      'a simplified geometric body, plain and generic, more diagram than portrait',
      'the face is two small flat dots for eyes and one short straight line for a mouth, no eyebrows',
      'looking along its own route off to one side, not at the viewer, completely indifferent and unbothered',
      'flat muted dusty purple with the band in one lighter flat tone',
      'no badge, no name tag, no lettering, no armband, no rectangle on the chest, no clipboard, no lanyard',
      'no yellow, no gold, no olive green anywhere on the figure',
    ].join(', '),
  },
];

/** Everything the pipeline knows how to generate. */
export const ALL_ASSETS: AssetSpec[] = [...TEST_BATCH, ...CONCEPTION_ROSTER, ...SCHOOL_ROSTER];
