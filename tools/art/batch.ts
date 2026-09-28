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
export type Geometry = 'hand-cut' | 'ruled' | 'pictogram';

const GEOMETRY_CLAUSE: Record<Geometry, string> = {
  'hand-cut':
    'slightly irregular hand-cut paper shapes, organic and asymmetric, never mechanical',
  ruled:
    'precise ruled geometry with true right angles and straight edges, drafted rather than drawn, ' +
    'the wrongness coming entirely from the arrangement and never from the shapes',
  // Card-surface icons only. The hand-cut clause is right for creatures in
  // the field and wrong for UI at 52px, where irregular reads as crude rather
  // than deliberate. Same period, other tradition: the sleek half of
  // mid-century — international-style pictograms, airline and Olympic
  // iconography, Bass and Rand — confident, balanced, precisely designed.
  pictogram:
    'an elegant precisely designed pictogram in the manner of 1960s international graphic design, ' +
    'clean confident geometry, smooth crisp edges, perfectly balanced simplified form, ' +
    'the refined clarity of classic airline and olympic iconography',
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
  adolescence: 'hand-cut',
  college: 'hand-cut',
  service: 'hand-cut',
  office: 'hand-cut',
  family: 'hand-cut',
  decline: 'hand-cut',
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
    spec.geometry ?? (spec.role === 'icon' ? 'pictogram' : ACT_DEFAULT_GEOMETRY[spec.act]),
    spec.role === 'swarm' || spec.role === 'boss',
  );
}

/** The style as it applies to every act but the Office. Used in provenance. */
export const STYLE_SUFFIX = styleSuffix('conception');

export const TEST_BATCH: AssetSpec[] = [
  {
    id: 'player-sperm',
    source: 'svg',
    name: 'The player — sperm form',
    act: 'conception',
    role: 'player',
    tests: "G-003 and G-053 before birth: the kid's head, markup for markup, on a comma of a body, at the same size as at fifty-five",
    targetSize: 112,
    seed: 1001,
    // G-053: the greeting-card kid before it has a body. The head is
    // player-school's, copied verbatim; the body is a plump comma of a tail.
    subject: [
      'the player before birth, a greeting-card character: the same head as every act on a plump comma of a tail that curls away behind it, tapering to a round tip',
      'a big round head three fifths of the height with two big dark eyes, each with one small light glint at its upper left, a rosy oval (#EBA39C) on each cheek and a small content smile',
      'the same single asymmetric cowlick sticking up above the left eye, one tuft and no other hair',
      'paper coloured (#EFE7D6) head and tail, warm near-black (#2A2521) eyes, mouth, cowlick and chin line',
      'every mass rounded, flat fills, no gradients, no threat colour anywhere',
      'no clothing, no accessories, no helmet, no gear, it owns nothing',
    ].join(', '),
  },
  {
    id: 'rival-sperm',
    source: 'svg',
    name: 'Rival sperm',
    act: 'conception',
    role: 'swarm',
    tests: 'the comet in the greeting-card register: does a round face with a tail read at 48px in a crowd',
    targetSize: 96,
    seed: 2002,
    whyThisStage:
      'Conception is the only competition the player has already won, so the game opens by making it feel like a commute.',
    // G-053: redrawn in the greeting-card register. The comet is law 11's;
    // the face is the register's; the rose is the rivals' (no threat colour:
    // contact red is the spermicide's). G-040: it is racing you.
    subject: [
      'a single cartoon sperm cell seen from the side, facing right, in the greeting-card register',
      'a big smooth round head, most of the figure, with no hair and no tuft',
      'one wavy tail leaving the back of the head and tapering to a round tip, rounded where it meets the head',
      'two big dark eyes at the front of the head looking ahead along its line, one small light glint in each',
      'pink cheeks under the eyes and a small pleased smile: it is racing you and enjoying it',
      'one small light glint on the head at its upper left',
      'flat muted dusty rose colouring, mid-tone, never pale and never white',
    ].join(', '),
  },
  {
    id: 'boss-egg',
    source: 'svg',
    name: 'The Egg',
    act: 'conception',
    role: 'boss',
    tests: 'does scale hold up; is a boss impressive; does a cute face still read as already decided',
    targetSize: 384,
    seed: 3003,
    whyThisStage:
      'It is the only boss in the game that is beaten by being taken in rather than brought down.',
    // G-053: redrawn in the greeting-card register. The fingers have
    // background between them so the corona is never a scalloped edge (the
    // blot is the white cell's, law 11); the four outermost sit clear of the
    // gap its variants open (AUDIT 131), so all three frames share bounds.
    subject: [
      'an enormous smooth round cream egg filling the frame, in the greeting-card register',
      'a corona of fourteen blunt stubby teal fingers growing out from under its edge like a sun drawn by a child or a bad haircut, background showing between them',
      'no two fingers the same length and none quite straight, each rounded where it leaves the egg',
      'one small light glint on the upper-left finger',
      'one small face placed off-centre, low and to the right on the huge smooth mass',
      'big half-lidded dark eyes with one small light glint each, pink cheeks, a small closed-mouth knowing smile',
      'serene and faintly amused, not angry, it has already decided',
      'one flat rose crescent low and to the right as the only shadow',
    ].join(', '),
  },
  {
    id: 'substitute-teacher',
    name: 'Substitute teacher',
    act: 'school',
    role: 'swarm',
    source: 'svg',
    tests: 'the bright hard rectangle in the greeting-card register: a clipboard with rounded corners and straight sides, carried by a cute figure that is still the role',
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
    //
    // Drawn 2026-09-27 (G-038), the last generated sprite to go. The subject
    // is the drawing's description: the idle pose from §3.5 — stopped,
    // consulting the clipboard — with the clipboard in bone (§6.2) and no gold
    // on the body (§6.1, G-031).
    //
    // Redrawn 2026-09-28 in the greeting-card register (G-053): kid
    // proportions, the face, blush and bone glints. The clipboard keeps its
    // straight sides with rounded corners (the register's first rule names it), and
    // it is still the role: pleased with the clipboard, not with you.
    subject: [
      'a substitute schoolteacher drawn in the greeting-card register, standing and reading a clipboard',
      'kid proportions, as every sprite in the register has them: a big round head, a small round body, stubby legs, mitten hands, plain and generic, the role and not a portrait',
      'the head a rounded lump in flat muted sage green (#6B7F53, the act mid tone), wider than tall, no hair, the mitten hands in the same green',
      'a warm grey-brown cardigan (#6E6353) and warm near-black stubby legs and shoes (#2A2521)',
      'a dark lanyard on a soft curved cord with a small dark round-cornered badge hanging from it',
      'holding a big clipboard out in front and to one side, so its straight right side and straight bottom make that part of the outline, its corners rounded and its sides straight',
      'the clipboard is the brightest shape in the picture, a flat muted tan (#D2C6AC) and never white, with a dark clip on its top edge and three short rounded ruled lines, no text',
      'the other arm hanging at the side',
      'the face set low and to one side and cast down at the clipboard: two big dark eyes with one small tan glint each, a soft pink blush (#EBA39C) under each eye, a small pleased smile',
      'one small tan glint on the head and one on the cardigan, upper left, never white',
      'pleased with the clipboard and unbothered, indifferent to the viewer and not looking at them',
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
    // OFFICE-ROSTER §4: redrawn as SVG under this id (the test batch's own
    // description stands; the drawing is authored).
    source: 'svg',
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
    source: 'svg',
    name: 'White cell',
    act: 'conception',
    role: 'swarm',
    tests: 'the blot in the greeting-card register: a purple puff that stays purple under the contrast floor, with a face that survives 48px',
    targetSize: 96,
    seed: 7007,
    whyThisStage:
      'Before the player is anyone at all, there is already a process whose only job is to stop things that look like them.',
    // G-053: redrawn in the greeting-card register. Elite purple sits under
    // CHECK's contrast floor against conception-deep, so the purple body
    // wears a rose skin, as the blot always has.
    subject: [
      // Deliberately not "white blood cell": the word "white" is in the name
      // and the generator obliges, which failed enemy-value-ceiling at 0.9297
      // four attempts running. Same species as the antibody's "fork".
      'a single large round leukocyte cell seen from directly above, filling most of the frame, in the greeting-card register',
      'a soft round mass of eight lobes with a scalloped irregular edge, the lobes uneven in size and spacing so it never resolves into a flower, every notch rounded',
      'no tail, no limbs, no spikes, no protrusions',
      'a flat muted purple body inside an uneven rose skin, thickest at the upper left, where one small light glint sits',
      'a round face on the purple, high and to the right of the middle: two big dark eyes with one small light glint each, pink cheeks, a small contented smile',
      'the eyes gazing past the viewer rather than at them: it is not coming for you, it is going where it was going',
    ].join(', '),
  },
  {
    id: 'spermicide',
    source: 'svg',
    name: 'Spermicide',
    act: 'conception',
    role: 'swarm',
    tests: 'a droplet that reads as asleep in the greeting-card register, and as red',
    targetSize: 72,
    seed: 8008,
    whyThisStage:
      'Conception is the first stage where the environment was made lethal in advance by someone who will never be told whether it worked.',
    // G-053: redrawn in the greeting-card register, which gives it the one
    // glint and a mouth (law 5); cute is not safe, so it stays contact red.
    subject: [
      'a single plump teardrop-shaped droplet of liquid, most of it a round bottom, its point cut to a small flat top with rounded corners, in the greeting-card register',
      'flat muted red, one solid colour, one small light glint at its upper left and no other highlight, no bubbles',
      'a face low on the droplet: two closed sleeping eyes, lash lines bowed downward, pink cheeks, a tiny contented mouth',
      'peacefully asleep, unaware, completely unbothered',
      'no arms, no legs, no tail, no ring, no circle around it',
    ].join(', '),
  },
  {
    id: 'antibody',
    source: 'svg',
    name: 'Antibody',
    act: 'conception',
    role: 'swarm',
    tests: 'the Y — the only straight lines in the act, corners rounded, with a face that survives the smallest size in it',
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
      'perfectly straight edges with every corner slightly rounded, the only curves on the bars',
      'flat glossy near-black, one small light glint on the upper-left bar',
      'one small round muted-tan face centred on the junction where the bars meet, in the greeting-card register',
      'the face carries two small dark eyes with a light glint each, pink cheeks and a small smile, and nothing else',
      'no other detail, no texture, no shading',
      'not a fork, not cutlery, not a utensil, not a tree, not a branch, not a slingshot',
    ].join(', '),
  },
  {
    id: 'boss-egg-closing',
    name: 'The Egg, eyes closing',
    act: 'conception',
    role: 'boss',
    tests: 'the Egg exactly as boss-egg with its eyes closed: two lash lines bowed downward where the half-lidded eyes were, the same smile, the same corona',
    targetSize: 384,
    seed: 3103,
    source: 'svg',
    // D-029: a variant frame of its holder — the same drawing in another
    // state, swapped in by the renderer where a render overlay stood.
    whyThisStage: 'It is the only boss in the game that is beaten by being taken in rather than brought down.',
    subject: [
      'an enormous smooth round cream egg filling the frame, in the greeting-card register',
      'a corona of fourteen blunt stubby teal fingers growing out from under its edge like a sun drawn by a child, background showing between them',
      'one small face placed off-centre, low and to the right on the huge smooth mass',
      'the eyes closed: two dark lash lines bowed downward where the half-lidded eyes were, the same pink cheeks, the same small closed-mouth knowing smile',
      'everything else identical to boss-egg: the same mass, the same fingers, the same face position',
      'one flat rose crescent low and to the right as the only shadow',
    ].join(', '),
  },
  {
    id: 'boss-egg-parted',
    name: 'The Egg, corona parting',
    act: 'conception',
    role: 'boss',
    tests: 'the Egg exactly as boss-egg-closing with the corona parted: the two fingers low and to the right gone, the egg bare through the gap, the bounds unmoved',
    targetSize: 384,
    seed: 3203,
    source: 'svg',
    // D-029: a variant frame of its holder — the same drawing in another
    // state, swapped in by the renderer where a render overlay stood.
    whyThisStage: 'It is the only boss in the game that is beaten by being taken in rather than brought down.',
    subject: [
      'an enormous smooth round cream egg filling the frame, in the greeting-card register',
      'a corona of blunt stubby teal fingers growing out from under its edge like a sun drawn by a child, background showing between them',
      'the corona parted in one clear gap low and to the right, on the side the face sits toward: the two fingers there gone and the egg bare through the gap',
      'one small face placed off-centre, low and to the right on the huge smooth mass, the eyes closed as two dark lash lines bowed downward, the same pink cheeks and knowing smile',
      'everything else identical to boss-egg',
      'one flat rose crescent low and to the right as the only shadow',
    ].join(', '),
  },
];

/**
 * The School roster (SCHOOL-ROSTER.md §3). Four swarm-tier assets; the fifth,
 * `substitute-teacher`, is in the test batch above and already passed, and the
 * roster was written around it rather than over it. All five swarm assets,
 * the school-age player and the Gym Teacher are authored SVG (G-038,
 * `art:svg`), redrawn in the greeting-card register (G-053).
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
    tests: 'the cluster — one enemy that must not read as four, the same cute face four times',
    targetSize: 88,
    seed: 10010,
    source: 'svg',
    whyThisStage:
      'School is the first place that has an inside, and the player finds out where they are by walking into the edge of it.',
    // The failure this prompt is written against: four separate figures
    // standing near each other. It is ONE body and the silhouette has to say
    // so instantly, or the player tries to walk between the heads and dies
    // learning that they cannot. Hence "fused", "single", "one continuous
    // outline" — and the identical repeated face, which is both the joke and
    // cheaper to author than four faces.
    subject: [
      'a single soft round mass with four big round heads on top of it, fused together into one body at the shoulders, drawn in the greeting-card register',
      'one continuous outline around the whole group, no gaps between them and no space to pass through',
      'the heads at slightly different heights, each rimmed in dark where it meets the next, all turned the same way and all looking off to one side',
      'every head has exactly the same face: two big dark eyes with one small tan glint each, a soft pink blush (#EBA39C) under each eye, a small pleased smile',
      'no arms, no hands, no bags, no clothing detail, a row of little dark feet underneath, a pair under each head',
      'flat muted sage green heads and body (#6B7F53), one warm grey-brown tone (#6E6353) across the lower third as the only shadow',
      'one small tan glint on each head and one on the body, upper left, never white',
      'content and unbothered, not looking at the viewer, not reacting to anything',
      'no yellow, no gold, no pale yellow-green anywhere',
    ].join(', '),
  },
  {
    id: 'dodgeball',
    name: 'Dodgeball',
    act: 'school',
    role: 'swarm',
    tests: 'the circle — the only perfect circle in the act, cute and still contact red',
    targetSize: 44,
    seed: 11011,
    source: 'svg',
    whyThisStage:
      'School is where the player is first hurt by something that was aimed at the room rather than at them.',
    // A perfect circle at 44px carries nothing but its own edge, so nothing
    // touches the rim: a seam or a stripe would break the radial symmetry
    // that is the whole read at speed. The register's one glint and the face
    // sit inside it. Whoever threw it is not in the picture (law 9).
    //
    // Redrawn 2026-09-28 (G-053) in contact red, which the reservation holds
    // for it (SCHOOL-ROSTER §3.2): the grey-brown ball wore no threat colour
    // (AUDIT 132), and in the cute register the thing that hurts you is
    // still the thing wearing red.
    subject: [
      'a single perfectly round rubber playground ball seen straight on, one flat circle, drawn in the greeting-card register',
      'flat contact red (#C4472E), the threat colour School holds for the dodgeball alone, one solid colour across the whole ball',
      'no seam, no panel lines, no stripe, no texture, nothing on its rim, so the outline stays a perfect circle',
      'one small flat tan glint (#D2C6AC) at the upper left, a tenth of the ball across, never white',
      'a face dead centre: two big dark eyes more than a sixth of the ball across, one small tan glint in each, a soft pink blush (#EBA39C) under each eye, a small pleased smile',
      'pleased about nothing in particular, not angry, not menacing, aimed at the room rather than at the viewer',
      'nothing else in the picture, no hands, no arms, no motion lines, no impact marks',
      'no yellow, no gold, no olive green anywhere',
    ].join(', '),
  },
  {
    id: 'homework',
    name: 'Homework',
    act: 'school',
    role: 'swarm',
    tests: 'the wedge — paper that is deliberately not a rectangle, with a face (law 5)',
    targetSize: 72,
    seed: 12012,
    source: 'svg',
    whyThisStage:
      'School is the first stage that follows the player home and takes up the part of the day nobody was counting.',
    // §1: the bright hard rectangle is the substitute's and School is full of
    // paper, so the obvious slab is forbidden. A leaning triangular stack in
    // shadow separates from the clipboard on shape, edge and value at once.
    // "Dull" is the brief, not a compromise — it is the only enemy in the act
    // that cannot hurt anyone and it should look like it.
    //
    // Drawn in bone with shadow strata since the first SVG pass: shadow alone
    // sits 0.09 L from school-deep and CHECK sent it back on contrast, so the
    // wedge and its rounded top carry the separation from the clipboard.
    // Redrawn 2026-09-28 (G-053) with the register's face; law 5 gives it a
    // mouth the roster's two dots did not have.
    subject: [
      'a leaning stack of paper sheets seen from the side, triangular in profile, wide at the bottom and tapering to a soft rounded top that leans to one side, drawn in the greeting-card register',
      'every corner rounded, the sheets in flat muted tan (#D2C6AC) with three warm grey-brown (#6E6353) strata between them, tilting with the lean',
      'one loose sheet poking out of each side so the sheets never line up',
      'no straight rectangle, not a neat block, not a squared-off slab, not a folder, not a book',
      'a content little face on the front of the stack: two big dark eyes with one small tan glint each, a soft pink blush (#EBA39C) under each eye, a small pleased smile',
      'no glint on the stack itself, because a tan glint on tan paper is no glint',
      'doing nothing to anyone, not looking at anything',
      'no text, no handwriting, no ruled lines, no yellow, no gold, no olive green, never white',
    ].join(', '),
  },
  {
    id: 'hall-monitor',
    name: 'Hall monitor',
    act: 'school',
    role: 'swarm',
    tests: 'the sash — one hard diagonal that must not read as a badge, on a cute round figure',
    targetSize: 88,
    seed: 13013,
    source: 'svg',
    whyThisStage:
      'School is where authority is first handed to someone with no more standing than the player, and it works anyway.',
    // Law 9, and §1 twice over. The sash IS the character: at 48px the body
    // is a lump and the stripe is the identity, which is why it must run off
    // both edges rather than sit on the chest. A badge or a name tag would
    // have been the natural read and would have put a second bright hard
    // rectangle in an act that has exactly one.
    subject: [
      'an upright figure standing squarely and facing forward, drawn in the greeting-card register\'s kid proportions: a big round head, a small round body, stubby arms and legs, mitten hands',
      'one wide hard-edged diagonal band crossing the body from the left shoulder to the right hip, running all the way off both sides of the body and cut off by them',
      'the band is a flat muted tan (#D2C6AC) with straight parallel edges and no writing on it',
      'the sweater and sleeves in flat elite purple (#7C5C8A), the threat colour School holds for the hall monitor alone',
      'the head a rounded lump in flat muted sage green (#6B7F53, the act mid tone, never the pale pickup tone), wider than tall, no hair, the mitten hands in the same green, warm near-black stubby legs (#2A2521)',
      'the face turned along its own route off to one side: two big dark eyes with one small tan glint each, a soft pink blush (#EBA39C) under each eye, a small pleased smile, not looking at the viewer',
      'one small tan glint on the head and one on the sweater, upper left, never white',
      'no badge, no name tag, no lettering, no armband, no rectangle on the chest, no clipboard, no lanyard',
      'no yellow, no gold, no olive green anywhere on the figure',
    ].join(', '),
  },
  // G-038: the player and the boss for School are authored SVG from the
  // start. Neither was ever generated, so neither has a prompt history; the
  // subject is the drawing's written description, D-007 runs on it, and law
  // 11 gates the rasteriser exactly as it gated fal.
  {
    id: 'player-school',
    name: 'The player — school age',
    act: 'school',
    role: 'player',
    source: 'svg',
    targetSize: 112,
    seed: 14014,
    tests: 'G-003 and G-053 at five: the base drawing, whose head every act copies verbatim, and the figure every act is the same size as',
    // G-003: the face and the one cowlick are the identity in every act, and
    // the player is the only thing on the field wearing paper (law 10). G-053:
    // the greeting-card kid, and the kid for the whole life.
    subject: [
      'the player at school age, a greeting-card character: a small chubby child standing with its arms a little out',
      'a big round head three fifths of the height with two big dark eyes, each with one small light glint at its upper left, a rosy oval (#EBA39C) on each cheek and a small content smile',
      'the same single asymmetric cowlick sticking up above the left eye, one tuft and no other hair',
      'a round-bellied body, stubby arms with round mitten hands and short round legs, every mass rounded',
      'paper coloured (#EFE7D6) head, hands and body, warm near-black (#2A2521) eyes, mouth, cowlick and chin line',
      'no threat colour anywhere, no accessories, no gear',
    ].join(', '),
  },
  {
    id: 'boss-gym-teacher',
    name: 'The Gym Teacher',
    act: 'school',
    role: 'boss',
    source: 'svg',
    targetSize: 384,
    seed: 15015,
    whyThisStage:
      'School is where the player is first organised into a crowd by someone who never touches them, and the whistle is how it is done.',
    // Law 9: the whistle and the shorts are the character, the figure is what
    // carries them. Nothing about the body is described but its height and
    // the register's kid proportions (G-053). Redrawn 2026-09-28 with empty
    // hands: the reservation says the whistle is the only thing it carries,
    // so the stopwatch the 2026-09-27 drawing held is gone.
    subject: [
      'the tallest thing in the act: a standing figure in gym shorts with a whistle on a cord, eight times the player\'s height, drawn in the greeting-card register\'s kid proportions: a big round head, a round body, stubby arms and legs, mitten fists',
      'both fists on the hips with the elbows out and the hands empty: the whistle is the only thing it carries',
      'shirt and sleeves in flat muted deep teal (#2F7370), the boss colour, as Conception\'s Egg holds it',
      'round gym shorts in flat muted tan (#D2C6AC) with a teal stripe down each side, soft and never a hard rectangle',
      'knee-high tan tube socks with two teal stripes each, warm near-black sneakers (#2A2521) with tan soles, toes turned out',
      'the head, forearms and fists in flat muted sage green (#6B7F53, the act mid tone), no hair',
      'a tan whistle, a barrel and a mouthpiece, on a soft dark curved cord around the neck',
      'the face looking off to one side, not at the viewer: two big dark eyes with one small tan glint each, a soft pink blush (#EBA39C) under each eye, a small pleased smile',
      'one small tan glint on the head and one on the shirt, upper left, never white',
      'the role, not a person: no clipboard, no stopwatch, no lettering, no badge',
      'no yellow, no gold anywhere on the figure',
    ].join(', '),
  },
];

/** Everything the pipeline knows how to generate. */

/**
 * Item icons for the offer cards (G-034). Card-surface UI art, generated by
 * the same pipeline as everything else so the cards carry the game's hand
 * instead of programmer line-art.
 *
 * The subjects are OBJECTS FROM THE LIFE, not game abstractions — the items
 * are the life script and the icons say so: a kid's pointing hand for the
 * reflex weapon (G-054), a sneaker for Youth, an umbrella for Adulthood, an alarm
 * clock for the late bloomer. All conditions and objects; D-007 applies to
 * icons exactly as it does to enemies.
 */
export const ITEM_ICONS: AssetSpec[] = [
  // G-054: the weapons are the kid's things, drawn in G-053's greeting-card
  // register. The ones that ride the field keep off paper, every threat
  // colour and every light tone (law 10), so each glint is bone, not paper,
  // and a mass that is itself bone carries none.
  {
    id: 'icon-strike',
    name: 'Pointing icon',
    act: 'conception',
    role: 'icon',
    fieldRiding: true,
    source: 'svg',
    targetSize: 96,
    seed: 61011,
    tests: "a kid's hand pointing, read at 52px on a card and 30px flying at the nearest thing, never a printer's manicule",
    subject: [
      "a chubby child's hand, round as a mitten, pointing to the right, filling most of the frame",
      'one short fat index finger held straight out, the thumb a round nub lying along its top, three curled fingers stacked below, a sweater cuff at the wrist',
      'flat muted dusty rose (#A86A63) hand with one small pale warm (#D2C6AC) glint on its back, pale warm cuff, dark (#2A2521) lines where the fingers and thumb meet the hand',
      'no face, no paper white, no red, no text',
    ].join(', '),
  },
  {
    id: 'icon-pierce',
    name: 'Spitball icon',
    act: 'conception',
    role: 'icon',
    fieldRiding: true,
    // The straight shot wears it (G-036), so the wad is bone, never paper.
    source: 'svg',
    targetSize: 96,
    seed: 61022,
    tests: 'a wet wad of notebook paper, read at 52px on a card and 42px in flight, never a cloud, a walnut or a stone',
    subject: [
      'a wet wad of chewed notebook paper flying to the right, one slightly squashed ball, filling most of the frame',
      'balled up into three rounded facets, the ruled lines of the page running a different way on each, one long crease corner to corner and one meeting it from the side',
      'three small wet flecks flying off behind it',
      'flat pale warm tan (#D2C6AC) wad and flecks, the ruled lines and the soaked lower right side in warm grey-brown (#6E6353), the creases warm near-black (#2A2521)',
      'no face, no paper white, no blue, no red, no text',
    ].join(', '),
  },
  {
    id: 'icon-burst',
    name: 'Spilt Milk icon',
    act: 'conception',
    role: 'icon',
    fieldRiding: true,
    source: 'svg',
    targetSize: 96,
    seed: 61013,
    tests: 'a splat of spilt milk with its cup, read at 52px on a card and as the pop round the player, never a cloud, a germ or a sun',
    subject: [
      'spilt milk seen from above: one big splat thrown out every way at once, filling most of the frame',
      'uneven splashes reaching out from its edge, some long and thin, some short and fat, each ending round, and drops stretched along the way they fly',
      "a child's sippy cup tipped over on its side at the lower left, its spout in the milk, no handles, a small surprised face on the cup with two dark eyes, blush cheeks and a round little mouth",
      'flat pale warm tan (#D2C6AC) milk, dusty rose (#A86A63) cup with one pale warm glint, deep wine (#6B3A44) lid and spout, blush (#EBA39C) cheeks, warm near-black (#2A2521) eyes, mouth and the edge where the cup lies in the milk',
      'no paper white, no red, no gold, no text',
    ].join(', '),
  },
  // Legos (G-054). The trail stamps this on the field behind the player
  // (G-036; ActScene syncAreas, 26px), so the toy's red is rose here: contact
  // red on the player's own trail would read as a threat.
  {
    id: 'icon-trail',
    name: 'Legos icon',
    act: 'conception',
    role: 'icon',
    fieldRiding: true,
    source: 'svg',
    targetSize: 96,
    seed: 61034,
    tests: 'one toy brick, two studs by two, read at 52px on a card and 26px stamped along a trail, never a tile or a box',
    subject: [
      'one chunky plastic toy building brick, two studs by two, seen from low and a little to one side so all four round studs stand up along its top, filling most of the frame',
      'rounded corners and straight sides, the front face lit, the side face in shadow, one small glint on the front',
      'flat dusty rose (#A86A63) brick and studs, deep wine (#6B3A44) side face, one pale warm (#D2C6AC) glint, warm near-black (#2A2521) lines where the faces meet and round each stud',
      'no face, no red, no paper white, no logo, no text',
    ].join(', '),
  },
  {
    id: 'icon-pull',
    name: 'Candy icon',
    act: 'conception',
    role: 'icon',
    fieldRiding: true,
    source: 'svg',
    targetSize: 96,
    seed: 61015,
    // G-054: the kid's thing. Planted at the pull's centre on the field
    // (ActScene syncAreas, 40px), so it keeps to rose, deep, blush, bone and
    // ink: its glint is bone, since paper is the player's (law 10).
    tests: 'one wrapped sweet everything comes over for, read at 52px on a card and 40px at the centre of the pull',
    subject: [
      'one wrapped sweet seen flat and straight on, a plump round middle twisted tight at each side into a crimped fan of wrapper, a bow-tie silhouette',
      'a pleased little face on the middle: two big dark eyes with one small pale glint each, a blush oval under each eye, a small smile',
      'the middle in flat muted dusty rose (#A86A63) with one small pale warm (#D2C6AC) glint at its upper left and one deep wine (#6B3A44) shadow along its lower right, the twists deep wine',
      'the fans in flat soft blush pink (#EBA39C) with two dusty rose pleats in each, cheeks blush pink, eyes and smile warm near-black (#2A2521)',
      'round masses, kid proportions, flat fills, no stripes, no text, no brand, no stick',
    ].join(', '),
  },
  {
    id: 'icon-speed',
    name: 'Midpiece icon',
    act: 'conception',
    role: 'icon',
    targetSize: 96,
    seed: 61036,
    tests: 'Youth as an object',
    subject: [
      'a single chunky high-top basketball sneaker seen in profile facing right, filling most of the frame',
      'a tall rounded ankle, a thick flat pale rubber sole, a rounded pale toe cap, three short lace crosses',
      'the fabric one single flat unbroken brick red colour, completely plain, no pattern, no mottling, no spots',
    ].join(', '),
  },
  {
    id: 'icon-guard',
    name: 'Membrane icon',
    act: 'conception',
    role: 'icon',
    targetSize: 96,
    seed: 61017,
    tests: 'Adulthood as an object',
    subject: [
      'an open umbrella seen in profile, a wide simple canopy with a few flat panels and a straight shaft with a curved handle below',
      'seen perfectly flat, filling most of the frame',
      // "deep plum" quantised to INK — an ink canopy on an ink card scored a
      // background-contrast of literally zero, four attempts running. The
      // canopy has to be a colour the conception palette actually contains.
      'flat muted brick red canopy with a dusty rose underside edge, pale warm shaft and curved handle',
    ].join(', '),
  },
  {
    id: 'icon-clock',
    name: 'Capacitation icon',
    act: 'conception',
    role: 'icon',
    targetSize: 96,
    seed: 61018,
    tests: 'the only item about time, wearing the object for it',
    subject: [
      'a twin-bell alarm clock seen straight on, a round face with two small bells on top and two short splayed legs, filling most of the frame',
      'the face plain pale warm with two simple dark hands pointing at nothing in particular, no numerals',
      'flat muted brick red body, one darker shadow tone',
    ].join(', '),
  },
  // G-038: the three icons added with Grudge, Gossip and Appetite are drawn,
  // not generated. Grudge's (the Mobile's star since G-054) and Gossip's also
  // fly on the field (the orbiter and the shot wear the card's icon, G-036),
  // so both keep off every threat colour, paper and every pickup tone.
  // Appetite is card-only.
  {
    id: 'icon-orbit',
    name: 'Mobile icon',
    act: 'conception',
    role: 'icon',
    fieldRiding: true,
    source: 'svg',
    targetSize: 96,
    seed: 61019,
    tests: 'one smiling star from a crib mobile, read at 52px on a card and 36px circling the player, never a badge or a medal',
    subject: [
      'one fat five-pointed star from a crib mobile, every point rounded, hanging point-up on a short ribbon tied off in a loop, filling most of the frame',
      'a small pleased face: two big dark eyes each with one pale glint, a blush oval under each eye, a little smile',
      'flat pale warm tan (#D2C6AC) star with one warm grey-brown (#6E6353) shadow along its lower right edges, dusty rose (#A86A63) ribbon and loop, blush (#EBA39C) cheeks, warm near-black (#2A2521) eyes and smile',
      'no paper white, no gold, no yellow, no red, no text',
    ].join(', '),
  },
  // G-054's new weapon: Cry, the ring from the player that shoves and stuns.
  // Its icon is held at the top of the expanding ring on the field, so it
  // rides the field and keeps off paper, every threat colour and every light
  // tone: the drop is bone, the lightest colour a rider may wear.
  {
    id: 'icon-cry',
    name: 'Cry icon',
    act: 'conception',
    role: 'icon',
    fieldRiding: true,
    source: 'svg',
    targetSize: 96,
    seed: 61052,
    tests: 'one teardrop with a worried little face, read at 52px on a card and about 36px riding the top of the ring, never a flame, an onion or a ghost',
    subject: [
      'one big teardrop seen straight on, the point up and rounded, the belly round below, filling most of the frame',
      'a faintly worried little face on the belly: two big dark eyes each with one pale glint, brows lifted in the middle, a blush oval under each eye, a small wobbly mouth',
      'flat pale warm tan (#D2C6AC) drop with one warm grey-brown (#6E6353) shadow along its lower right, blush (#EBA39C) cheeks, warm near-black (#2A2521) eyes, brows and mouth',
      'no paper white, no red, no gold, no text',
    ].join(', '),
  },
  {
    id: 'icon-chain',
    name: 'Telephone icon',
    act: 'conception',
    role: 'icon',
    fieldRiding: true,
    source: 'svg',
    targetSize: 96,
    seed: 61020,
    // G-054: the whispering game, as a toy. The shot itself on the field
    // (ActScene syncProjectiles, 30px, turned to its heading), so it keeps to
    // rose, deep, blush, shadow, bone and ink: its glints are bone, since
    // paper is the player's (law 10). Generic, nothing brand-shaped.
    tests: 'a toy telephone passing it on, read at 52px on a card and 30px in flight; the handset says telephone, never a car',
    subject: [
      'a toy telephone on two little round wheels, seen straight on: a plump dome of a body with a fat curved handset lying across its top, each end of the handset resting on a shoulder of the body',
      'a pleased face on the body: two big dark eyes with one small pale glint each, a blush oval under each eye, a small smile',
      'the body in flat muted dusty rose (#A86A63) with one deep wine (#6B3A44) shadow along its right side and underneath and one small pale warm (#D2C6AC) glint high on its left',
      'the handset in flat soft blush pink (#EBA39C) with one small pale warm glint, the wheels warm grey-brown (#6E6353) with pale warm hubs, eyes and smile warm near-black (#2A2521)',
      'no dial on its front, no eyes on stalks, no cord, no text, no brand, no rectangle',
    ].join(', '),
  },
  {
    id: 'icon-magnet',
    name: 'Appetite icon',
    act: 'conception',
    role: 'icon',
    source: 'svg',
    targetSize: 96,
    seed: 61021,
    tests: 'a meal at a glance: the dining-car sign, read at 52px on a card',
    subject: [
      'a round plate seen from directly above between an upright fork on the left and an upright knife on the right, as on a station sign',
      'the plate a pale warm rim around a paler well, one dark line between them',
      'fork and knife in flat muted dusty rose, three tines on the fork, a rounded blade on the knife',
    ].join(', '),
  },
  // Growth Spurt and Snooze arrive with Adolescence (G-039) and are drawn,
  // like the three above. Growth Spurt is a passive, card-only. Snooze also
  // marks its field where it was dropped (ActScene syncAreas, 40px), so it
  // keeps to rose, bone and ink as Grudge and Gossip do.
  {
    id: 'icon-grow',
    name: 'Growth Spurt icon',
    act: 'conception',
    role: 'icon',
    source: 'svg',
    targetSize: 96,
    seed: 61023,
    tests: 'taller than the thing that measures you, read at 52px on a card',
    subject: [
      'a measuring rule standing on end with five ticks, long and short, in from the edge facing the arrow',
      'beside it one tall upright arrow standing on the same floor, its point well above the top of the rule',
      'pale warm rule with dusty rose ticks, flat muted dusty rose arrow, no figure, no numbers',
    ].join(', '),
  },
  {
    id: 'icon-slow',
    name: 'Snooze icon',
    act: 'conception',
    role: 'icon',
    fieldRiding: true,
    source: 'svg',
    targetSize: 96,
    seed: 61024,
    // A digital bedside clock was drawn first and read as a kitchen scale.
    tests: 'nine more minutes, read at 52px on a card and 40px on its field; never the twin-bell clock',
    subject: [
      'a round bedside clock seen straight on on two short feet, one wide flat bar across its top where bells would be, no bells',
      'a pale face with two dark hands at nine minutes to the hour, no numerals',
      'one bold z drawn as a shape rising off the top right',
      'flat muted dusty rose case, pale warm face, bar and z',
    ].join(', '),
  },
  // --- The Office (G-048): Calendar block ---------------------------------
  // The first item born at twenty-two is drawn, like Snooze. Its icon also
  // marks its hold on the field where it was put (ActScene syncHolds, 40px),
  // so it keeps to rose, bone and ink: never the elite purple the meeting's
  // chairs wear, since this ring is the meeting's wall turned inside out.
  {
    id: 'icon-block',
    name: 'Calendar Block icon',
    act: 'conception',
    role: 'icon',
    fieldRiding: true,
    source: 'svg',
    targetSize: 96,
    seed: 61048,
    tests: 'a calendar page with one day struck through, read at 52px on a card and 40px on its hold, never a grid of numbers',
    subject: [
      'one wall-calendar page seen flat and straight on, a sheet a little taller than it is wide, with two binder rings standing up off its top edge and a solid header band under them',
      'below the band a grid of nine plain day cells, three by three, with no numbers, the middle one filled in and struck through with one bold diagonal bar',
      'flat muted dusty rose header band and filled day, pale warm sheet, rings and cells, dark lines between the cells and the one strike',
      'no text, no numbers, no figure, no clock, no purple',
    ].join(', '),
  },
  // Cooties (G-054; personal-space) is drawn. Its icon also rides the aura
  // ring on the field (about 32px), so it keeps to rose, deep, blush, bone
  // and ink: its glint is bone, since paper is the player's (law 10).
  {
    id: 'icon-aura',
    name: 'Cooties icon',
    act: 'conception',
    role: 'icon',
    fieldRiding: true,
    source: 'svg',
    targetSize: 96,
    seed: 61025,
    tests: 'the playground cootie shot, circle, circle, dot, dot, read at 52px on a card and 32px riding the ring',
    subject: [
      'the playground cootie shot seen flat: one fat round ring with two big round dots inside it, and the two dots are the eyes of a pleased little face',
      'each dot with one small pale glint, a blush oval under each, a small smile under them',
      'the ring in flat muted dusty rose (#A86A63) with one small pale warm (#D2C6AC) glint at its upper left and one deep wine (#6B3A44) shadow along its lower right',
      'inside the ring flat pale warm (#D2C6AC), dots and smile warm near-black (#2A2521), cheeks soft blush pink (#EBA39C)',
      'nothing else: no bug, no arm, no pen, no text',
    ].join(', '),
  },
  // Tattle (G-054; judgement) is drawn too. Its bubble comes down on the
  // target during the telegraph (36px) and sits at the impact point (40px),
  // never turned, so it keeps to blush, rose, bone and ink: its glint is
  // bone, since paper is the player's (law 10). No face: Adolescence's group
  // chat is the speech bubble with a face.
  {
    id: 'icon-bolt',
    name: 'Tattle icon',
    act: 'conception',
    role: 'icon',
    fieldRiding: true,
    source: 'svg',
    targetSize: 96,
    seed: 61027,
    tests: 'somebody telling on somebody, read upright at 52px on a card and 36px dropping onto the field',
    subject: [
      'one round speech bubble seen flat and upright, with one small tail at its lower left pointing down at whoever it is about',
      'one fat exclamation mark in the middle of it, a tapering bar and a round dot, and nothing else written',
      'the bubble in flat soft blush pink (#EBA39C) with one small pale warm (#D2C6AC) glint at its upper left and one dusty rose (#A86A63) shadow along its lower right',
      'the exclamation mark warm near-black (#2A2521)',
      'no face, no words, no letters, no second bubble, no phone',
    ].join(', '),
  },
  // Rattle (G-054; backhand, mode sweep) is drawn like the five above. Its
  // icon also rides each sweep across its arc on the field (~36px, turned to
  // the swing's radial angle), so it lies along +x with the handle toward the
  // player and the head swinging out, and keeps to rose, deep, blush, bone
  // and ink: its glint is bone, since paper is the player's (law 10).
  {
    id: 'icon-sweep',
    name: 'Rattle icon',
    act: 'conception',
    role: 'icon',
    fieldRiding: true,
    source: 'svg',
    targetSize: 96,
    seed: 61026,
    tests: 'a baby rattle swung at the crowd, read at 52px on a card and 36px turning through the sweep, head out and handle in',
    subject: [
      'a baby rattle lying on its side: a big round head on the right, a short fat handle running left from a little collar, and a round ring on the end of the handle',
      'a pleased face on the head: two big dark eyes with one small pale glint each, a blush oval under each eye, a small smile',
      'the head in flat muted dusty rose (#A86A63) with one small pale warm (#D2C6AC) glint at its upper left and one deep wine (#6B3A44) shadow along its lower right',
      'the handle and ring flat pale warm (#D2C6AC), the collar soft blush pink (#EBA39C), eyes and smile warm near-black (#2A2521)',
      'kid proportions, stubby handle, no hand holding it, no motion lines, no text',
    ].join(', '),
  },
  // G-046's five evolutions, each an object from the life that the weapon
  // becomes, drawn so the field sprite reads too (the orbit's gloves, the
  // shots' cups, the sweep's edge, the bolt's target, the trail's stamps).
  // All keep to rose, bone and ink like the other field-riding icons.
  {
    id: 'icon-vendetta',
    name: 'Vendetta icon',
    act: 'conception',
    role: 'icon',
    fieldRiding: true,
    source: 'svg',
    targetSize: 96,
    seed: 61028,
    tests: 'a boxing glove — the grudge with thick skin on — read at 52px on a card and 36px circling the player, never the bare fist',
    subject: [
      'a boxing glove seen from the side, thumb up, a fat rounded mitt with a short laced cuff, no forearm',
      'flat muted dusty rose glove, pale warm cuff and laces, dark interior line where the thumb meets the mitt',
      'nothing else: no ring, no ropes, no figure, no text',
    ].join(', '),
  },
  {
    id: 'icon-jump',
    name: 'Jumpiness icon',
    act: 'conception',
    role: 'icon',
    fieldRiding: true,
    source: 'svg',
    targetSize: 96,
    seed: 61029,
    tests: 'a small espresso cup with three steam lines, read at 52px on a card and 30px in flight',
    subject: [
      'a small espresso cup on a saucer seen from the side, one round handle on the right, three short wavy steam lines rising from it',
      'flat muted dusty rose cup, pale warm saucer and steam, a dark interior line at the rim',
      'no spoon, no table, no text, no face',
    ].join(', '),
  },
  {
    id: 'icon-reach',
    name: 'Reach icon',
    act: 'conception',
    role: 'icon',
    fieldRiding: true,
    source: 'svg',
    targetSize: 96,
    seed: 61030,
    tests: 'a grabber tool — a long rod with a trigger handle and a two-finger claw — read at 52px on a card and 36px at the edge of a sweep',
    subject: [
      'a long-handled grabber tool seen from the side, a pistol-grip trigger handle at the left, a straight rod, a two-finger open claw at the right',
      'flat muted dusty rose handle and claw, pale warm rod, dark interior lines at the trigger and the claw hinge',
      'no hand holding it, no figure, no text',
    ].join(', '),
  },
  {
    id: 'icon-hindsight',
    name: 'Hindsight icon',
    act: 'conception',
    role: 'icon',
    fieldRiding: true,
    source: 'svg',
    targetSize: 96,
    seed: 61031,
    tests: 'a rear-view mirror on its stalk, read at 52px on a card and 36px dropping onto the field, never a hand mirror',
    subject: [
      'a wide flat rear-view mirror seen straight on, a rounded landscape rectangle on a short stalk rising from below',
      'flat muted dusty rose frame and stalk, pale warm mirror face with one darker flat band across it as the reflection',
      'no car, no road, no figure, no text',
    ].join(', '),
  },
  {
    id: 'icon-rut',
    name: 'Rut icon',
    act: 'conception',
    role: 'icon',
    fieldRiding: true,
    source: 'svg',
    targetSize: 96,
    seed: 61032,
    tests: 'a pair of worn slippers seen from above, read at 52px on a card and 26px stamped along a trail, never a pair of shoes',
    subject: [
      'a pair of soft house slippers seen from directly above, toes up, side by side and slightly splayed, each a rounded sole with a low toe pocket',
      'flat muted dusty rose slippers, pale warm inner soles showing at the heels, a dark interior line along each toe pocket edge',
      'no feet in them, no floor, no laces, no text',
    ].join(', '),
  },
  // College: the Highlighter, the first item born at eighteen, is drawn.
  // Its icon is also the stroke it fires (a seeking shot wears its card's
  // icon, ActScene syncProjectiles, 30px turned to its heading), so it keeps
  // to rose, bone and ink like Reflex's manicule — never the highlighter
  // yellow people expect, which is the ranged threat's gold (G-031).
  {
    id: 'icon-highlight',
    name: 'Highlighter icon',
    act: 'conception',
    role: 'icon',
    fieldRiding: true,
    source: 'svg',
    targetSize: 96,
    seed: 61041,
    tests: 'a chisel-tip marker laying one broad stroke, read at 52px on a card and 30px in flight, never a pencil, a crayon or a syringe',
    subject: [
      'a fat chisel-tip highlighter marker seen from the side, the cap off, tilted down to the right as if writing, a short clip along the top of the barrel',
      'its slanted chisel tip pressed onto the right-hand end of one broad flat stroke it has just laid, a level band with square ends running back to the left, as if drawn under a line of text',
      'flat muted dusty rose barrel and felt tip, pale warm back plug, clip, collar and stroke, dark interior lines either side of the collar, under the clip and along the chisel face',
      'no yellow, no paper, no text, no hand, no page',
    ].join(', '),
  },
  // --- Born in Family (G-050): the Strongly Worded Letter ------------------
  // A strike (mode `strike`, `strikeNearest`): its icon comes down onto the
  // mark during the telegraph (~36px) and sits on the landing (~40px),
  // through the same syncAreas code as Judgement's gavel, so it keeps to
  // rose, bone and ink. Family reserves the windowed envelope (the bill) and
  // the sealed, folded letter (the HOA letter: "the only seal, and the only
  // thing folded"), and this rides that field, so it is neither: one flat
  // sheet, never an envelope, never folded, never sealed, in the player's
  // rose where the act's post is bone.
  {
    id: 'icon-letter',
    name: 'Strongly Worded Letter icon',
    act: 'conception',
    role: 'icon',
    fieldRiding: true,
    source: 'svg',
    targetSize: 96,
    seed: 61050,
    tests: 'a written letter, one flat sheet, read at 52px on a card and 36px coming down on the mark, never an envelope, never folded, never sealed',
    subject: [
      'one flat sheet of writing paper, taller than wide, tipped a little to the left as if just sent, seen straight on',
      'a letter laid out as a letter: one short line top left for the greeting, a block of four heavy lines of writing, one short line bottom right for the signature',
      'the last line of the block underlined twice, hard',
      'flat muted dusty rose sheet, pale warm lines of writing, the double underline dark',
      'no envelope, no fold, no dog-ear, no seal, no stamp, no window, no hand, no figure, no legible text',
    ].join(', '),
  },
  // --- Born in Decline (G-051): the Nap ------------------------------------
  // A control that fires nothing, so its icon is card-only: nothing of it is
  // drawn on the field (the nap shows as the stop, the swim held still).
  // The panel's line is "You fell asleep in the chair", so it is the chair,
  // seen from the front and empty: the one who napped in it is off playing.
  // Rose, bone and ink like the others. Never the Office's ring of chairs
  // (upholstered, winged, one on its own) and never a clock (Time's).
  {
    id: 'icon-nap',
    name: 'Nap icon',
    act: 'conception',
    role: 'icon',
    source: 'svg',
    targetSize: 96,
    seed: 61051,
    tests: 'an empty wingback armchair seen from the front, read at 52px on a card, never an office chair, a throne or a sofa',
    subject: [
      'one upholstered wingback armchair seen straight from the front, empty, a tall back with a wing standing out at each top corner',
      'two fat rolled arms either side of one deep seat cushion, two short stubby legs under the front',
      'a small cloth laid over the top of the back where a head would rest, and a soft dent in the seat cushion',
      'flat muted dusty rose frame, back, wings and arms, pale warm cushion and head cloth, dark interior lines where the cushion meets the arms and the back',
      'nobody sitting in it, no figure, no clock, no blanket, no text',
    ].join(', '),
  },
];

/**
 * The Adolescence roster (ADOLESCENCE-ROSTER.md §1, §3, §4). Five swarm-tier
 * enemies, Prom and the player at thirteen, all authored SVG (G-038) and none
 * drawn yet: every spec here is the written description a drawing is owed
 * against, so D-007 and law 11 run on it before a line exists.
 *
 * The tall sheet is the act's claim about two other enemies, as the clipboard
 * was School's: the group chat is a bubble because a phone would be a
 * rectangle, and the car is side-on because from above it would be a slab.
 *
 * **Gold appears on no body here.** The group chat's notification and Prom's
 * spots are the act's gold, and both are projectiles drawn in code (G-031), so
 * every subject excludes it. So is blush: `adolescence-light` is the pickups'
 * (law 10, G-030). Nothing in the act is a person and nothing is drawn with
 * skin (§3); every face looks straight out at the player except the car's.
 */
export const ADOLESCENCE_ROSTER: AssetSpec[] = [
  {
    id: 'hormones',
    name: 'Hormones',
    act: 'adolescence',
    role: 'swarm',
    tests: 'the bolt — the only jagged outline, a squiggle with a face in a horde',
    targetSize: 48,
    seed: 16016,
    source: 'svg',
    whyThisStage:
      'Adolescence is the first stage where the crowd comes from inside the player, so there is no edge of it to walk out of.',
    subject: [
      'a fat three-stroke zigzag bolt, taller than wide, the only jagged outline in the act',
      'strokes thick enough to carry two small dark dots for eyes on the middle one',
      'flat mid blue (#5E95C3, the act mid tone) with one darker flat tone as the only shadow',
      'eyes looking straight out at the viewer and a wide flat grin',
      'thrilled, and it does not know about what',
      'no arms, no legs, no spark lines, no glow',
      'no yellow, no gold, no pink anywhere',
    ].join(', '),
  },
  {
    id: 'drivers-ed',
    name: "Driver's ed",
    act: 'adolescence',
    role: 'swarm',
    tests: 'the wheels — side-on, so the car is neither a rectangle nor a dome',
    targetSize: 88,
    seed: 17017,
    source: 'svg',
    whyThisStage:
      'Adolescence is the only stage where the most dangerous thing the player will ever do is scheduled as a class.',
    // Law 9: the plate on the roof is the instructor, who is never drawn. The
    // one face in the act not looking at the player, because it was taught not to.
    subject: [
      'a lumpy little hatchback seen exactly side-on, a rounded uneven body on two round wheels',
      'the body flat muted red (#C4472E), the contact threat colour, one solid tone',
      'two wheels in warm near-black (#2A2521), the only wheels in the act',
      'a flat blank muted tan (#D2C6AC) plate standing on the roof',
      'the windscreen is the face: two small dark dots looking forward along the road and one short flat line for a mouth',
      'not looking at the viewer, eyes on the road',
      'nobody inside, no driver, no instructor, no lettering on the plate',
      'no yellow, no gold, no pink, no headlight glow',
    ].join(', '),
  },
  {
    id: 'acne',
    name: 'Acne',
    act: 'adolescence',
    role: 'swarm',
    tests: 'the dome — the smallest thing in the act; raise the size, never add detail',
    targetSize: 44,
    seed: 18018,
    source: 'svg',
    whyThisStage:
      "Adolescence is the first stage where the player's own body gets to every important moment first, and it cannot be shot because it is theirs.",
    // §3.3: anyone would draw it red, and red is the car's claim about damage,
    // so it wears the antibody's colours. Drawn as the spot, never the face it
    // is on.
    subject: [
      'a low half-circle dome on a flat base, wider than tall, the smallest thing in the act',
      'flat warm grey-brown (#6E6353), one solid tone, with one round muted tan (#D2C6AC) dot on the very top',
      'two small dark dots for eyes looking straight out at the viewer and a small proud closed smile',
      'it has been waiting for today',
      'the spot alone: no face around it, no cheek, no skin, nothing it sits on',
      'not red, no pink, no yellow, no gold',
    ].join(', '),
  },
  {
    id: 'standardised-test',
    name: 'Standardised test',
    act: 'adolescence',
    role: 'swarm',
    tests: 'the tall sheet — the only rectangle in the act, read by its column of dots',
    targetSize: 96,
    seed: 19019,
    source: 'svg',
    whyThisStage:
      'Adolescence is the first stage where one morning with a pencil decides where the player goes next, and the morning was booked before anyone asked if they were ready.',
    subject: [
      'an upright portrait rectangle, taller than wide, the only rectangle in the act',
      'one column of small round warm near-black (#2A2521) dots down its left edge, exactly one of them filled in',
      'flat muted purple (#7C5C8A), the elite threat colour, one solid tone',
      'two small dark dots for eyes looking straight out at the viewer and one short flat line for a mouth',
      'completely calm, it has all morning',
      'no text, no letters, no numbers, no pencil, no desk',
      'no yellow, no gold, no pink anywhere',
    ].join(', '),
  },
  {
    id: 'group-chat',
    name: 'Group chat',
    act: 'adolescence',
    role: 'swarm',
    tests: 'the tail — a bubble that must not read as a phone or a cloud',
    targetSize: 72,
    seed: 20020,
    source: 'svg',
    whyThisStage:
      'Adolescence is the first stage where the room is carried home in a pocket, and it keeps talking about the player after they have left.',
    // One frame. §3.5's typing face (three ink dots while it consults) is a
    // second frame and belongs to the renderer; the gold notification it
    // sends is a projectile, drawn in code (G-031).
    subject: [
      'a fat rounded speech bubble, wider than tall, with one short tail at a bottom corner',
      'the only silhouette in the act with a tail',
      "flat warm grey-brown (#6E6353), one solid tone, the colour of messages that are someone else's",
      'two small dark dots for eyes looking straight out at the viewer and a small sideways smirk',
      'no phone, no screen, no avatars, no names, no text, nobody in it drawn',
      'no yellow, no gold anywhere on the bubble, no pink',
    ].join(', '),
  },
  {
    id: 'boss-prom',
    name: 'Prom',
    act: 'adolescence',
    role: 'boss',
    tests: 'the hanging sphere — boss teal at boss scale, gold only on the light it throws',
    targetSize: 384,
    seed: 21021,
    source: 'svg',
    // Not in the roster, which gives Prom a design and no sentence; written
    // here from §4 ("the best night of its life", "the first one they were
    // invited to") because the batch requires one of every boss.
    whyThisStage:
      "Adolescence is the first stage that ends on a night everyone agreed in advance would be the best of the player's life.",
    // Law 9 and D-007: the event, drawn as its mirror ball. Nobody at Prom is
    // drawn. Its gold is on its reflections (projectiles), never its body.
    subject: [
      'a mirror ball hanging on a short chain from the top edge of the frame, at boss scale',
      'the only thing in the act that hangs from above',
      'tiled all over with small square tiles in flat muted deep teal (#2F7370), the boss colour, with warm near-black (#2A2521) grout between them',
      'a few single tiles in muted tan (#D2C6AC) as glints',
      'a face spread across four tiles, low and off-centre: two closed eye arcs and a wide closed smile',
      'having the best night of its life',
      'no dancers, no couples, no crowns, nobody at the dance drawn',
      'no yellow, no gold anywhere on the ball or the chain, no pink',
    ].join(', '),
  },
  {
    id: 'player-adolescence',
    name: 'The player — thirteen',
    act: 'adolescence',
    role: 'player',
    tests: 'G-003 and G-053 at thirteen: the same head, no taller, in a round hoodie with both hands in its pocket',
    source: 'svg',
    targetSize: 112,
    seed: 22022,
    // ADOLESCENCE-ROSTER §6 leaves the player at thirteen undesigned beyond
    // G-003. Taller is Growth Spurt's joke, and Growth Spurt is not in the pool.
    subject: [
      'the player at thirteen: the same chubby child as at school age, standing, no taller, with the same head, face and cowlick',
      'a big round head three fifths of the height with two big dark eyes, each with one small light glint at its upper left, a rosy oval (#EBA39C) on each cheek and a small content smile',
      'a plain round hoodie with the hood rolled down behind the neck and two short drawstrings, elbows out and both hands stuffed in the front pocket',
      'paper coloured (#EFE7D6) head, legs and drawstrings, the hoodie in warm grey-brown (#6E6353) edged in warm near-black (#2A2521), one small light glint on the hoodie',
      'no threat colour anywhere, no phone, no accessories, no gear',
    ].join(', '),
  },
];

/**
 * The College roster (COLLEGE-ROSTER.md §1, §3, §4, §5). Five swarm-tier
 * enemies (one elite), The Loan and the player at eighteen, all authored SVG
 * (G-038) and none drawn yet: every spec here is the written description a
 * drawing is owed against, so D-007 and law 11 run on it before a line exists.
 * whyThisStage strings lift the roster's verbatim; enemies.ts carries the same.
 */
export const COLLEGE_ROSTER: AssetSpec[] = [
  {
    id: 'reading',
    name: 'Reading',
    act: 'college',
    role: 'swarm',
    tests: 'the stack — the only pile in the act, read by its fanned edges',
    targetSize: 48,
    seed: 23023,
    source: 'svg',
    whyThisStage:
      'College is the first stage where the work arrives faster than it can be done and nobody checks whether it was.',
    subject: [
      'a short pile of three or four pages seen from a low angle, their edges fanned out at one side, the top corner turned up',
      'pale muted tan (#D2C6AC) pages with warm near-black (#2A2521) edge lines, the only pile in the act',
      'two small dark dots for eyes on the top page, half-shut, and one short flat line for a mouth',
      'it has been on the pile a while',
      'no text, no letters, no lines of writing, no desk',
      'no red, no purple, no gold, no yellow anywhere',
    ].join(', '),
  },
  {
    id: 'deadline',
    name: 'Deadline',
    act: 'college',
    role: 'swarm',
    tests: 'the calendar leaf — the only square in the act, and its only red thing',
    targetSize: 84,
    seed: 24024,
    source: 'svg',
    whyThisStage:
      'College is where the date first crosses the room on its own schedule and does not slow down for anyone standing in it.',
    subject: [
      'a square calendar leaf seen flat on, its top edge curled over in a short roll, two round ring holes along the top',
      'flat muted red (#C4472E), the contact threat colour, one solid tone, the only square in the act',
      'the curl and the ring holes in muted tan (#D2C6AC)',
      'two small dark dots for eyes low on the sheet and one straight flat line for a mouth',
      'no date, no numbers, no letters, no month name, nothing printed',
      'no purple, no gold, no yellow anywhere',
    ].join(', '),
  },
  {
    id: 'tuition',
    name: 'Tuition',
    act: 'college',
    role: 'swarm',
    tests: 'the windowed envelope — the only rectangle wider than tall, read by its window',
    targetSize: 44,
    seed: 25025,
    source: 'svg',
    whyThisStage:
      'College is the first stage that takes a share of everything the player earns from then on, and the share does not come off at the end of the act.',
    subject: [
      'a landscape envelope seen flat on, wider than tall, with a darker address window low on its left side',
      'muted tan (#D2C6AC) paper, the window and the flap lines in warm near-black (#2A2521), nothing legible in the window',
      'the flap folded down across the top with a face on it: two closed eye arcs and one short flat line for a mouth',
      'it does not need to look at you, it has your address',
      'no stamp, no text, no numbers, no red anywhere',
      'no purple, no gold, no yellow anywhere',
    ].join(', '),
  },
  {
    id: 'group-project',
    name: 'Group project',
    act: 'college',
    role: 'swarm',
    tests: 'the cluster — four lumps, four faces, one awake, and the drawing does not say which one matters',
    targetSize: 100,
    seed: 26026,
    source: 'svg',
    whyThisStage:
      'College is where the player is first graded on something four were assigned and one did, and finding out which one costs more than doing the work.',
    subject: [
      'four rounded lumps fused into one uneven mass, the only fused mass in the act',
      'flat muted purple (#7C5C8A), the elite threat colour, on all four lumps, one solid tone with one darker flat tone as the only shadow',
      'four faces, one per lump: three with closed eye arcs and flat mouths, one with two open dark dots for eyes and a flat mouth',
      'nothing in the drawing marks any lump as different beyond the one open face',
      'no arms, no legs, no books, no laptops, no text',
      'no red, no gold, no yellow anywhere',
    ].join(', '),
  },
  {
    id: 'registrar',
    name: 'Registrar',
    act: 'college',
    role: 'swarm',
    tests: 'the counter — the only architecture in the act, read by its bell; nobody behind it',
    targetSize: 80,
    seed: 27027,
    source: 'svg',
    whyThisStage:
      'College is the first stage where the aimed thing is not a hit but a hold, placed by a window that has never seen the player and has the file.',
    subject: [
      'a low service counter seen straight on, a wide front panel under a ledge, a slot cut in the panel',
      'a small round desk bell standing on the ledge, the only bell in the act',
      'flat warm grey-brown (#6E6353) counter, the ledge and the bell in muted tan (#D2C6AC), the slot in warm near-black (#2A2521)',
      'two small dark dots for eyes on the front panel looking down at the slot and one short flat line for a mouth',
      'nobody behind the counter, no window glass, no sign, no text',
      'no red, no purple, no gold, no yellow anywhere',
    ].join(', '),
  },
  {
    id: 'boss-loan',
    name: 'The Loan',
    act: 'college',
    role: 'boss',
    tests: 'the tape — boss teal at boss scale, a paper tape curling off the top of the frame, gold only on its figures',
    targetSize: 384,
    seed: 28028,
    source: 'svg',
    // COLLEGE-ROSTER §4: the only boss in the life that wants nothing from the
    // player. It wants the balance. Law 9 and D-007: a machine and its tape.
    whyThisStage:
      'College is the first stage that ends on a number the player will still be paying when the act is long over.',
    subject: [
      'a boxy adding machine seen from the front at boss scale, a wide flat body with a row of round keys, the only curl in the act rising out of its top',
      'flat muted deep teal (#2F7370), the boss colour, one solid tone with warm near-black (#2A2521) key rims',
      'a paper tape in muted tan (#D2C6AC) rising from a slot in the top, curling once and running off the top edge of the frame',
      'short flat marks in muted gold (#D69A3C) down the tape as figures, never legible digits',
      'a face on the front panel above the keys: two open dark dots for eyes and one short flat line for a mouth, patient',
      'no hands, no desk, no coins, no dollar signs, no text',
      'no red, no purple anywhere',
    ].join(', '),
  },
  {
    id: 'player-college',
    name: 'The player — eighteen',
    act: 'college',
    role: 'player',
    tests: 'G-003 and G-053 at eighteen: the same head, no taller, the same hoodie, a lanyard and a takeaway cup',
    source: 'svg',
    targetSize: 112,
    seed: 29029,
    // COLLEGE-ROSTER §5: the face at eighteen, a lanyard, a paper cup. No taller
    // (Growth Spurt's joke is Growth Spurt's).
    subject: [
      'the player at eighteen: the same chubby child as every act, standing, no taller, with the same head, face and cowlick',
      'a big round head three fifths of the height with two big dark eyes, each with one small light glint at its upper left, a rosy oval (#EBA39C) on each cheek and a small content smile',
      'the same round hoodie, a lanyard around the neck ending in a small blank card, one hand in the pocket and the other holding up a small takeaway cup with a lid and a sleeve',
      'paper coloured (#EFE7D6) head, legs, hand and card, the hoodie in warm grey-brown (#6E6353), the cup in muted tan (#D2C6AC) with a warm grey-brown lid and sleeve',
      'no threat colour anywhere, no phone, no backpack, no lettering on the card',
    ].join(', '),
  },
];

/**
 * The Office roster (OFFICE-ROSTER.md §1, §3, §5). Five swarm-tier enemies
 * (one elite, the meeting) and the player at twenty-two, all authored SVG and
 * none drawn yet; the boss is the test batch's `boss-reorg`, redrawn as SVG
 * under its own id. whyThisStage strings lift the roster's verbatim.
 */
export const OFFICE_ROSTER: AssetSpec[] = [
  {
    id: 'reply-all',
    name: 'Reply-all',
    act: 'office',
    role: 'swarm',
    tests: 'the clipped sheet — the only sheet and the only clip in the act; its children are the same sheet smaller',
    targetSize: 48,
    seed: 30030,
    source: 'svg',
    whyThisStage: 'The Office is the first stage where dealing with a thing is precisely what makes more of it.',
    subject: [
      'a portrait sheet of paper seen flat on with a paperclip over its top-left corner, three short ruled lines across it',
      'muted tan (#D2C6AC) paper, the clip and the rules in warm near-black (#2A2521)',
      'two small dark dots for eyes low on the sheet looking straight out and one short flat line for a mouth',
      'no text, no letters, no envelope, no red anywhere',
      'no purple, no gold, no yellow, no pale blue-grey anywhere',
    ].join(', '),
  },
  {
    id: 'commute',
    name: 'Commute',
    act: 'office',
    role: 'swarm',
    tests: 'the carriage — the only wheels in the act, and the widest thing, read side-on crossing fast',
    targetSize: 104,
    seed: 31031,
    source: 'svg',
    whyThisStage:
      'The Office is the first stage where the same thing crosses the room twice a day at a speed set by nobody in it.',
    subject: [
      'a long low commuter rail carriage seen exactly side-on, a rounded box on two small wheel-sets, three square windows along its side',
      'flat muted red (#C4472E), the contact threat colour, one solid tone',
      'the windows in muted tan (#D2C6AC) with nothing in them, the wheels in warm near-black (#2A2521)',
      'the front window is the face: two small dark dots looking forward along the track and one short flat line for a mouth, not at the viewer',
      'nobody inside, no driver, no lettering, no number',
      'no purple, no gold, no yellow, no pale blue-grey anywhere',
    ].join(', '),
  },
  {
    id: 'ping',
    name: 'Ping',
    act: 'office',
    role: 'swarm',
    tests: 'the bell with a dot — the smallest thing in the act, read by its one dot',
    targetSize: 40,
    seed: 32032,
    source: 'svg',
    whyThisStage:
      'The Office is the first stage where every small thing that wants a second of the player gets it, and the seconds add up to the day.',
    subject: [
      'a small hand bell seen from the side, a rounded dome on a short handle, with one round dot floating just above its right shoulder',
      'muted tan (#D2C6AC) bell, the handle, rim and the dot in warm near-black (#2A2521)',
      'no face: a ping has no face, it has a count, and the count is the dot',
      'no text, no numbers, no red, no gold, no yellow, no pale blue-grey anywhere',
    ].join(', '),
  },
  {
    id: 'meeting',
    name: 'Meeting',
    act: 'office',
    role: 'swarm',
    tests: 'the ring of chairs — eight chair-backs on a circle around nothing, read as a ring at any size',
    targetSize: 96,
    seed: 33033,
    source: 'svg',
    whyThisStage: 'The Office is the first stage that takes the player’s time without touching them.',
    subject: [
      'eight small chair-backs seen from above and behind, spaced evenly on one circle, facing the empty middle',
      'flat muted purple (#7C5C8A), the elite threat colour, on every chair-back, one solid tone, the legs in warm near-black (#2A2521)',
      'nothing in the middle of the circle and nobody in any chair',
      'no table, no faces, no text, no red, no gold, no yellow, no pale blue-grey anywhere',
    ].join(', '),
  },
  {
    id: 'performance-review',
    name: 'Performance review',
    act: 'office',
    role: 'swarm',
    tests: 'the row of stars — five stars, one filled, the only points in the act; no gold on it',
    targetSize: 88,
    seed: 34034,
    source: 'svg',
    whyThisStage:
      'The Office is the first stage where the aimed thing is a number about the player, and the number takes something back.',
    subject: [
      'a short flat strip with five flat five-pointed star outlines in a row across it, the second star filled in',
      'the strip in muted tan (#D2C6AC), the star outlines in warm grey-brown (#6E6353), the filled star solid in warm near-black (#2A2521) so it is the odd one out',
      'two small dark dots for eyes on the strip below the stars looking up at them and one short flat line for a mouth',
      'no text, no numbers, no gold, no yellow, no red, no purple, no pale blue-grey anywhere',
    ].join(', '),
  },
  {
    id: 'player-office',
    name: 'The player — twenty-two',
    act: 'office',
    role: 'player',
    tests: 'G-003 and G-053 at twenty-two, a kid in a tie: the same head, no taller, a shirt with a round collar, a tie, a belt and a mug',
    source: 'svg',
    targetSize: 112,
    seed: 35035,
    subject: [
      'the player at twenty-two: the same chubby child as every act, standing, no taller, with the same head, face and cowlick',
      'a big round head three fifths of the height with two big dark eyes, each with one small light glint at its upper left, a rosy oval (#EBA39C) on each cheek and a small content smile',
      'a plain shirt with a round collar, a short tie and a belt, one arm down at its side and the other hand holding up a small mug',
      'paper coloured (#EFE7D6) head, shirt, collar, legs and hands, the tie and the mug in warm grey-brown (#6E6353), the belt in warm near-black (#2A2521)',
      'no threat colour anywhere, no lanyard, no phone, no lettering',
    ].join(', '),
  },
  {
    id: 'boss-reorg-grey-1',
    name: 'The Reorg, one row greyed',
    act: 'office',
    role: 'boss',
    tests: 'the org chart exactly as boss-reorg with the bottom row of boxes greyed: those boxes and their faces in warm grey-brown, their connectors still attached, the empty top box never greyed',
    targetSize: 384,
    seed: 33101,
    source: 'svg',
    // D-029: a variant frame of its holder — the same drawing in another
    // state, swapped in by the renderer where a render overlay stood.
    whyThisStage: 'The Office is the first stage where the structure outranks everyone in it, and damage to it goes grey and stays in the chart.',
    subject: [
      'a corporate organisational chart drawn as a flat printed diagram, standing upright as if it were a creature, a branching hierarchy tree of separate plain rectangular outlined boxes, four rows deep, widening toward the bottom, exactly as boss-reorg',
      'the bottom row of boxes filled in flat warm grey-brown (#6E6353) instead of teal, their small faces in muted tan (#D2C6AC) and their label bars kept in muted tan, the connectors to them still drawn in teal and still attached',
      'every other box in flat muted deep teal (#2F7370), the boss colour, as in boss-reorg, and the empty top box exactly as it is there, never greyed',
      'the connector lines ruled straight, thin, in flat muted deep teal (#2F7370) as in boss-reorg, the only ruled geometry in the act',
      'strictly flat and two-dimensional like a printed chart on a page, no 3D boxes, no text',
    ].join(', '),
  },
  {
    id: 'boss-reorg-grey-2',
    name: 'The Reorg, two rows greyed',
    act: 'office',
    role: 'boss',
    tests: 'the org chart exactly as boss-reorg with the bottom two rows of boxes greyed: those boxes and their faces in warm grey-brown, their connectors still attached, the empty top box never greyed',
    targetSize: 384,
    seed: 33102,
    source: 'svg',
    // D-029: a variant frame of its holder — the same drawing in another
    // state, swapped in by the renderer where a render overlay stood.
    whyThisStage: 'The Office is the first stage where the structure outranks everyone in it, and damage to it goes grey and stays in the chart.',
    subject: [
      'a corporate organisational chart drawn as a flat printed diagram, standing upright as if it were a creature, a branching hierarchy tree of separate plain rectangular outlined boxes, four rows deep, widening toward the bottom, exactly as boss-reorg',
      'the bottom two rows of boxes filled in flat warm grey-brown (#6E6353) instead of teal, their small faces in muted tan (#D2C6AC) and their label bars kept in muted tan, the connectors to them still drawn in teal and still attached',
      'every other box in flat muted deep teal (#2F7370), the boss colour, as in boss-reorg, and the empty top box exactly as it is there, never greyed',
      'the connector lines ruled straight, thin, in flat muted deep teal (#2F7370) as in boss-reorg, the only ruled geometry in the act',
      'strictly flat and two-dimensional like a printed chart on a page, no 3D boxes, no text',
    ].join(', '),
  },
  {
    id: 'boss-reorg-grey-3',
    name: 'The Reorg, three rows greyed',
    act: 'office',
    role: 'boss',
    tests: 'the org chart exactly as boss-reorg with the bottom three rows of boxes greyed: those boxes and their faces in warm grey-brown, their connectors still attached, the empty top box never greyed',
    targetSize: 384,
    seed: 33103,
    source: 'svg',
    // D-029: a variant frame of its holder — the same drawing in another
    // state, swapped in by the renderer where a render overlay stood.
    whyThisStage: 'The Office is the first stage where the structure outranks everyone in it, and damage to it goes grey and stays in the chart.',
    subject: [
      'a corporate organisational chart drawn as a flat printed diagram, standing upright as if it were a creature, a branching hierarchy tree of separate plain rectangular outlined boxes, four rows deep, widening toward the bottom, exactly as boss-reorg',
      'the bottom three rows of boxes filled in flat warm grey-brown (#6E6353) instead of teal, their small faces in muted tan (#D2C6AC) and their label bars kept in muted tan, the connectors to them still drawn in teal and still attached',
      'every other box in flat muted deep teal (#2F7370), the boss colour, as in boss-reorg, and the empty top box exactly as it is there, never greyed',
      'the connector lines ruled straight, thin, in flat muted deep teal (#2F7370) as in boss-reorg, the only ruled geometry in the act',
      'strictly flat and two-dimensional like a printed chart on a page, no 3D boxes, no text',
    ].join(', '),
  },
];

/**
 * FAMILY-ROSTER.md §1–§4, lifted. Post, packaging and plumbing (law 9: the
 * one person in the act is drawn as what it is wearing); no enemy wears the
 * act's butter (law 10); the tape is the act's only red, the bib its only
 * purple, the house its only teal, and gold rides the phone's call alone
 * (G-031). Every sprite is drawn (`source: 'svg'`).
 */
export const FAMILY_ROSTER: AssetSpec[] = [
  {
    id: 'bill',
    name: 'Bill',
    act: 'family',
    role: 'swarm',
    tests: 'the windowed envelope — the only envelope and the only window in the act; a late fee is the same drawing',
    targetSize: 48,
    seed: 40040,
    source: 'svg',
    whyThisStage: 'Family is the first stage where leaving a thing alone is precisely what makes more of it.',
    subject: [
      'a landscape envelope seen flat on, a flap line across its top, a clear address window low on its face',
      'muted tan (#D2C6AC) paper, the flap line and the window frame in warm near-black (#2A2521)',
      'two small dark dots for eyes and one short flat line for a mouth inside the window where the address would be, looking straight out',
      'no text, no stamp, no red, no purple, no gold, no yellow anywhere',
    ].join(', '),
  },
  {
    id: 'flat-pack',
    name: 'Flat-pack',
    act: 'family',
    role: 'swarm',
    tests: 'the flat box — the only box, the only tape and the widest thing, read side-on crossing fast',
    targetSize: 104,
    seed: 41041,
    source: 'svg',
    whyThisStage: 'Family is the first stage where the heaviest thing in the room is something the player carried in.',
    subject: [
      'a long flat closed carton seen exactly side-on, twice as wide as it is tall, one strip of tape down its middle',
      'muted tan (#D2C6AC) carton with warm near-black (#2A2521) edges, the tape in flat muted red (#C4472E), the contact threat colour, the only red on it',
      'a face printed on the box as an assembly diagram would be: two small bolt-head dots for eyes looking along the box, not at the viewer, and one short dashed line for a mouth',
      'no lettering, no arrows, no numbers, no purple, no gold, no yellow anywhere',
    ].join(', '),
  },
  {
    id: 'hoa-letter',
    name: 'HOA letter',
    act: 'family',
    role: 'swarm',
    tests: 'the sealed letter — the only seal and the only fold in the act, read by the round seal',
    targetSize: 40,
    seed: 42042,
    source: 'svg',
    whyThisStage:
      'Family is the first stage where the rules of the place the player lives arrive by post, and every one makes the place smaller.',
    subject: [
      'a sheet of paper folded in thirds and standing open like a small tent, seen from slightly above, a round seal on its top panel',
      'muted tan (#D2C6AC) paper, the fold lines in warm near-black (#2A2521), the seal an ink ring',
      'the seal is the face: two small dark dots for eyes and one short flat line for a mouth inside the ring, looking straight out',
      'no text, no red, no purple, no gold, no yellow anywhere',
    ].join(', '),
  },
  {
    id: 'toddler',
    name: 'Toddler',
    act: 'family',
    role: 'swarm',
    tests: 'the bib with arms — the only thing in the act reaching up, and the smallest mover; the elite purple on the bib',
    targetSize: 44,
    seed: 43043,
    source: 'svg',
    // FAMILY-ROSTER §3.4: seen from the height of the leg it is about to hold;
    // the face is printed on the bib (law 9), nothing above it, no skin.
    whyThisStage: 'Family is the first stage where the thing slowing the player down is thrilled to see them.',
    subject: [
      'a round bib seen straight on with two short sleeves raised up and out beside it, nothing above the bib',
      'flat muted purple (#7C5C8A), the elite threat colour, on the whole bib, one solid tone, the sleeves in muted tan (#D2C6AC) with warm near-black (#2A2521) edges',
      'a face printed on the bib: two small dark dots for eyes and one wide flat line for a mouth, the only smile in the game, looking straight out',
      'no head, no hands, no hair, no skin, no text, no red, no gold, no yellow anywhere',
    ].join(', '),
  },
  {
    id: 'phone-call',
    name: 'Phone call',
    act: 'family',
    role: 'swarm',
    tests: 'the wall phone — the only cord and the only coil in the act; no gold on it',
    targetSize: 80,
    seed: 44044,
    source: 'svg',
    whyThisStage:
      'Family is the first stage where the aimed thing wants nothing from the player but the player, somewhere else.',
    subject: [
      'an upright wall telephone seen from the front, a tall rounded body with a handset laid across its top and a cord in three loose coils hanging down its right side',
      'muted tan (#D2C6AC) body, the handset and the cord in warm near-black (#2A2521)',
      'two small dark dots for eyes on the body under the handset looking up at it and one short flat line for a mouth, not at the viewer',
      'no buttons with numbers, no text, no gold, no yellow, no red, no purple anywhere',
    ].join(', '),
  },
  {
    id: 'room',
    name: 'Room',
    act: 'family',
    role: 'swarm',
    tests: 'the room — the only square in the act and the only outline with a gap; wallpaper, never a threat colour',
    targetSize: 96,
    seed: 45045,
    source: 'svg',
    // FAMILY-ROSTER §4: the Mortgage's, static, solid and merging. It does not
    // hurt, so it wears the act's mid tone and no threat colour (law 10).
    whyThisStage: 'Family is the first stage where the place the player lives is built around them while they are standing in it.',
    subject: [
      'a square room seen from above as a floor plan, its walls drawn in section as two ink lines with the floor showing between them, one door gap in the middle of its bottom side with the door leaf and its quarter-circle swing drawn on the floor inside',
      'the floor in flat muted mustard (#A3812F), the walls in warm near-black (#2A2521)',
      'two small dark dots for eyes and one short flat line for a mouth on the floor near the far wall, looking at the door gap',
      'no furniture, no text, no red, no purple, no gold, no yellow, no teal anywhere',
    ].join(', '),
  },
  {
    id: 'boss-mortgage',
    name: 'The Mortgage',
    act: 'family',
    role: 'boss',
    tests: 'the house with a face — boss teal at boss scale, a gable, a door and two windows, the only roof in the act',
    targetSize: 384,
    seed: 46046,
    source: 'svg',
    // FAMILY-ROSTER §4: paid on a schedule, not in a hurry. Law 5 wants a
    // face and the house has had one since children drew houses.
    whyThisStage: 'Family is the first stage that ends on a thing the player will be paying for after the act is long over.',
    subject: [
      'a house front seen straight on at boss scale, a wide rectangular wall under a plain gabled roof, a door in the middle of the ground floor and two square windows above it',
      'flat muted deep teal (#2F7370), the boss colour, on the walls and the roof, one solid tone with warm near-black (#2A2521) edges',
      'the windows are the eyes: two open dark dots on muted tan (#D2C6AC) panes; the door is the mouth: one short flat line, closed, patient',
      'no chimney smoke, no path, no fence, no lettering, no number on the door',
      'no red, no purple, no gold, no yellow anywhere',
    ].join(', '),
  },
  {
    id: 'player-family',
    name: 'The player — thirty-four',
    act: 'family',
    role: 'player',
    tests: 'G-003 and G-053 at thirty-four: the same head, no taller, the shirt without the tie, a tote bag and a ring of keys',
    source: 'svg',
    targetSize: 112,
    seed: 47047,
    subject: [
      'the player at thirty-four: the same chubby child as every act, standing, no taller, with the same head, face and cowlick',
      'a big round head three fifths of the height with two big dark eyes, each with one small light glint at its upper left, a rosy oval (#EBA39C) on each cheek and a small content smile',
      'the same shirt, round collar and belt with the tie gone, a round-cornered tote bag hanging from one shoulder and a ring of two keys dangling from the other hand, held up',
      'paper coloured (#EFE7D6) head, shirt, collar, legs and hands, the bag in warm grey-brown (#6E6353), the keys in muted tan (#D2C6AC)',
      'no threat colour anywhere, no tie, no mug, no lettering',
    ].join(', '),
  },
  {
    id: 'boss-mortgage-open',
    name: 'The Mortgage, door open',
    act: 'family',
    role: 'boss',
    tests: 'the house exactly as boss-mortgage with its door open: the doorway a dark opening in the act deep tone with the door leaf swung inward, the windows and roof identical',
    targetSize: 384,
    seed: 46146,
    source: 'svg',
    // D-029: a variant frame of its holder — the same drawing in another
    // state, swapped in by the renderer where a render overlay stood.
    whyThisStage: 'Family is the first stage that ends on a thing the player will be paying for after the act is long over.',
    subject: [
      'a house front seen straight on at boss scale, a wide rectangular wall under a plain gabled roof with a small chimney, two square windows above the door, exactly as boss-mortgage',
      'the door OPEN: the doorway a dark opening in flat umber (#4D3A1F), the act deep tone, with the door leaf swung inward and seen edge-on as a thin warm grey-brown (#6E6353) sliver at one jamb',
      'flat muted deep teal (#2F7370), the boss colour, on the walls and the roof, one solid tone with warm near-black (#2A2521) edges, the window panes in muted tan (#D2C6AC) with the same two open dark dots for eyes',
      'no red, no purple, no gold, no yellow anywhere, no text',
    ].join(', '),
  },
];

/**
 * DECLINE-ROSTER.md §1–§4, lifted. What the body and the building now do to
 * you; nothing is a person and the knees are your own (law 9 has nothing to
 * render); no enemy wears the act's mint (law 10); the rain is the act's
 * only red, the steps its only purple, the clock its only teal, and gold
 * rides the form's decision alone (G-031). Every sprite is drawn.
 */
export const DECLINE_ROSTER: AssetSpec[] = [
  {
    id: 'medication',
    name: 'Medication',
    act: 'decline',
    role: 'swarm',
    tests: 'the capsule — the only capsule and the smallest thing in the act, read by its seam',
    targetSize: 40,
    seed: 50050,
    source: 'svg',
    whyThisStage:
      'Decline is the first stage where taking care of yourself is a thing you chase, and it hurts when it catches you first.',
    subject: [
      'a rounded capsule seen exactly side-on, two halves with a seam between them',
      'the left half in muted tan (#D2C6AC), the right half in warm grey-brown (#6E6353), the seam and the outline in warm near-black (#2A2521)',
      'two small dark dots for eyes and one short flat line for a mouth on the tan half, looking at the seam',
      'no text, no red, no purple, no gold, no yellow, no teal anywhere',
    ].join(', '),
  },
  {
    id: 'weather',
    name: 'Weather',
    act: 'decline',
    role: 'swarm',
    tests: 'the front — the only cloud and the widest thing, read side-on crossing; red on the rain only',
    targetSize: 112,
    seed: 51051,
    source: 'svg',
    whyThisStage: 'Decline is the first stage where the weather is something that happens to the player.',
    subject: [
      'a long low bank of cloud seen side-on, twice as wide as it is tall, with five short straight rain lines falling from its underside',
      'muted tan (#D2C6AC) cloud with warm near-black (#2A2521) edges, the rain lines in flat muted red (#C4472E), the contact threat colour, the only red on it',
      'two small dark dots for eyes and one short flat line for a mouth in the cloud looking down at its own rain, not at the viewer',
      'no sun, no lightning, no text, no purple, no gold, no yellow, no teal anywhere',
    ].join(', '),
  },
  {
    id: 'stairs',
    name: 'Stairs',
    act: 'decline',
    role: 'swarm',
    tests: 'the flight of stairs — the only steps and the only rail in the act; the elite purple on the steps',
    targetSize: 96,
    seed: 52052,
    source: 'svg',
    whyThisStage: 'Decline is the first stage where the slow way up is the safe way, and the crowd cannot follow.',
    subject: [
      'a flight of six steps rising from left to right seen exactly side-on, one straight rail above them on two posts',
      'flat muted purple (#7C5C8A), the elite threat colour, on every step, one solid tone, the rail and posts and the outline in warm near-black (#2A2521)',
      'two small dark dots for eyes and one short flat line for a mouth on the riser of the top step, looking down the flight, not at the viewer',
      'no carpet, no banister curl, no text, no red, no gold, no yellow, no teal anywhere',
    ].join(', '),
  },
  {
    id: 'your-knees',
    name: 'Your knees',
    act: 'decline',
    role: 'swarm',
    tests: 'the knees — the only pair in the act, two domes side by side with one face between them',
    targetSize: 40,
    seed: 53053,
    source: 'svg',
    // DECLINE-ROSTER §3.3: the antibody's final costume. Bone, never skin;
    // the frown between them is the only one in the life.
    whyThisStage:
      'Decline is where the record the player has been accumulating since before they were a person is finally read back to them by their own body.',
    subject: [
      'two rounded kneecaps side by side seen from the front, two domes of equal size one face apart, a low hollow between them',
      'muted tan (#D2C6AC) domes with warm near-black (#2A2521) outlines',
      'the hollow between the domes in warm grey-brown (#6E6353) carries the face: two small dark dots for eyes and one short line for a mouth turned down one step at each end, worried',
      'no legs, no skin, no text, no red, no purple, no gold, no yellow, no teal anywhere',
    ].join(', '),
  },
  {
    id: 'insurance-form',
    name: 'Insurance form',
    act: 'decline',
    role: 'swarm',
    tests: 'the form on a board — the only board and the only boxes in the act; no gold on it',
    targetSize: 80,
    seed: 54054,
    source: 'svg',
    whyThisStage: 'Decline is the first stage where the aimed thing decides what the player is covered for.',
    subject: [
      'a portrait clipboard seen from the front, a sheet of paper on a board with a clip at its top and three small square tick boxes down the left side of the sheet, all empty',
      'the board in warm grey-brown (#6E6353), the sheet in muted tan (#D2C6AC), the clip, the boxes and the outline in warm near-black (#2A2521)',
      'two small dark dots for eyes and one short flat line for a mouth on the sheet beside the boxes, looking at the boxes, not at the viewer',
      'no text, no ticks, no gold, no yellow, no red, no purple, no teal anywhere',
    ].join(', '),
  },
  {
    id: 'boss-time',
    name: 'Time',
    act: 'decline',
    role: 'boss',
    tests: 'the clock face — boss teal at boss scale, a round dial with two hands and no numbers, the only circle in the act',
    targetSize: 384,
    seed: 55055,
    source: 'svg',
    // DECLINE-ROSTER §4: it cannot be hurt and its running out is the win.
    // Law 5: a clock has had a face since the word.
    whyThisStage: 'Decline is the last stage, and the thing that ends it was there the whole time.',
    subject: [
      'a round clock face seen straight on at boss scale, a wide rim, a plain dial with no numbers and no marks, two hands of different lengths meeting at the centre',
      'flat muted deep teal (#2F7370), the boss colour, on the rim and both hands, one solid tone with warm near-black (#2A2521) edges, the dial in muted tan (#D2C6AC)',
      'a small face at the centre where the hands meet: two open dark dots for eyes and one short flat line for a mouth, calm',
      'no numbers, no ticks, no pendulum, no text, no red, no purple, no gold, no yellow anywhere',
    ].join(', '),
  },
  {
    id: 'player-decline',
    name: 'The player — fifty-five',
    act: 'decline',
    role: 'player',
    tests: 'G-003 and G-053 at fifty-five: the same head, no taller, a cardigan and a cane; the kid is the kid at the end too',
    source: 'svg',
    targetSize: 112,
    seed: 56056,
    subject: [
      'the player at fifty-five: the same chubby child as every act, standing, no taller, with the same head, face and cowlick',
      'a big round head three fifths of the height with two big dark eyes, each with one small light glint at its upper left, a rosy oval (#EBA39C) on each cheek and a small content smile',
      'an oatmeal cardigan buttoned down the front with three round buttons over the same round shirt collar, one arm down at its side and the other hand on a plain crook-handled cane, its tip on the floor',
      'paper coloured (#EFE7D6) head, shirt, collar, legs and hands, the cardigan in muted tan (#D2C6AC), its bands, buttons and hem and the cane in warm grey-brown (#6E6353)',
      'no threat colour anywhere, no tote bag, no keys, no glasses, no lettering',
    ].join(', '),
  },
  {
    id: 'boss-time-face',
    name: 'Time, without its long hand',
    act: 'decline',
    role: 'boss',
    tests: 'the clock exactly as boss-time with only the short hand: the same rim, dial, face at the pivot and feet; the long hand absent',
    targetSize: 384,
    seed: 55155,
    source: 'svg',
    // D-029: a variant frame of its holder — the same drawing in another
    // state, swapped in by the renderer where a render overlay stood.
    whyThisStage: 'Decline is the last stage, and the thing that ends it was there the whole time.',
    subject: [
      'a round clock face seen straight on at boss scale, a wide rim, a plain dial with no numbers and no marks, exactly as boss-time',
      'only the SHORT hand drawn, pointing at ten as in boss-time; the long hand entirely absent, the dial bare where it was',
      'flat muted deep teal (#2F7370), the boss colour, on the rim, the short hand and the feet, one solid tone with warm near-black (#2A2521) edges, the dial in muted tan (#D2C6AC)',
      'the same small calm face at the centre on its bone cap: two open dark dots for eyes and one short flat line for a mouth',
      'no numbers, no ticks, no text, no red, no purple, no gold, no yellow anywhere',
    ].join(', '),
  },
];

export const ALL_ASSETS: AssetSpec[] = [
  ...TEST_BATCH,
  ...CONCEPTION_ROSTER,
  ...SCHOOL_ROSTER,
  ...ADOLESCENCE_ROSTER,
  ...COLLEGE_ROSTER,
  ...OFFICE_ROSTER,
  ...FAMILY_ROSTER,
  ...DECLINE_ROSTER,
  ...ITEM_ICONS,
];
