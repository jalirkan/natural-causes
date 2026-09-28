import Phaser from 'phaser';
import { ACTS, type ActDef, type BossDef } from '../data/acts';
import { ACT_VISUALS, actVisuals, type ActVisuals } from '../data/act-visuals';
import { ENEMIES } from '../data/enemies';
import { ITEMS, isActive, itemDef, type ItemIcon } from '../data/items';
import { neutralDevState, type DevState } from '../dev/state';
import { addVignette, ensureFieldTile, ensureGemTexture, ensureShotTextures } from './dressing';
import { ITEM_ICON_ATLAS, itemIconFrame } from '../data/item-visuals';
import { parseOfferId } from '../data/items';
import { offerPips, offerTitle, statLines } from '../data/item-text';
import { buildSheet, pipString } from '../data/build-sheet';
import { actDocument, PAPER_NARROW_TITLE, PAPER_SHEET, paperType } from '../data/documents';
import { sfx } from '../audio/sfx';
import { combineMoves, stickVector, type Move } from './touch';
import { healthBar } from './health-bar';
import { oncePerEvent } from './keys';
import {
  certificateFields,
  certificateLines,
  certificateStamp,
  effectLines,
  hudAge,
  NARROW_TYPE,
  NARROW_WIDTH,
  narrowCanvas,
  narrowRows,
  effectsColumn,
  pauseTypeScale,
  WIDE_SHEET,
  wideLayout,
  wornText,
} from './certificate';
import { recordLife } from '../meta/ancestors';
import { InputLog } from '../meta/input-log';
import { DEFAULT_NAME, misspell, readPlayerName } from '../meta/name';
import {
  BOSS_RADIUS,
  PLAYER_RADIUS,
  STRIKE_DELAY,
  TIME_HAND_REST,
  World,
  type Certificate,
  type EnemyState,
  type GemState,
  type HoldState,
  type Input,
  type ProjectileState,
} from '../sim/world';
import {
  consulting,
  holdTaken,
  instalmentPaid,
  meetingCloses,
  memoDrafted,
  newestAbove,
  statementDrafted,
  vehiclesEntered,
  wornGained,
} from './edges';
import {
  BONE,
  INK,
  PAPER,
  SHADOW,
  THREAT_BOSS,
  THREAT_CONTACT,
  THREAT_ELITE,
  THREAT_RANGED,
  UI_FILL,
  VIEW_HEIGHT,
  VIEW_WIDTH,
  WORLD_HEIGHT,
  WORLD_WIDTH,
} from '../config';

/**
 * The renderer. It owns no rules.
 *
 * Everything that decides what happens is in `World`; this reads that state
 * each frame and makes the screen agree with it. The only logic here is
 * presentation: which sprite, what tint, where the camera looks.
 *
 * Sprites are kept in parallel arrays indexed against the world's entity
 * arrays and recycled rather than created — the world swap-removes, so the
 * indices shuffle every frame and identity is not worth tracking for things
 * that live two seconds.
 */

const PLAYER_DISPLAY = 56;
const GEM_SIZE = 9;
/** Attached Y-shapes drawn on the player. Stacks keep counting past this. */
const MAX_ATTACHED_SPRITES = 16;
/**
 * Enemies whose aimed shot is drawn as a word in the ranged gold instead of the
 * gold dot: the substitute's (the player's name, misspelled), the registrar's
 * (HOLD), the performance review's rating (MEETS, OFFICE-ROSTER §3.5), the
 * phone's call (HELLO?, FAMILY-ROSTER §3.5) and the insurance form's decision
 * (DENIED, DECLINE-ROSTER §3.5). Keyed on the id because the word is the
 * drawing; `SHOT_WORDS` holds the fixed ones, and the substitute's is the name.
 */
const SHOT_WORDS: Readonly<Record<string, string>> = {
  registrar: 'HOLD',
  'performance-review': 'MEETS',
  'phone-call': 'HELLO?',
  'insurance-form': 'DENIED',
};
const WORDED_SHOTS: ReadonlySet<string> = new Set(['substitute-teacher', ...Object.keys(SHOT_WORDS)]);
/**
 * The boss's shots drawn as a word, by the kind of boss that fired them: a
 * boss's shot has no owner (it names the boss), so it is keyed on the act's
 * boss kind. The Mortgage's statement is DUE (FAMILY-ROSTER §4). Every other
 * kind's shot is the Egg's hostile dot, the Reorg's memo among them.
 */
const BOSS_SHOT_WORDS: Readonly<Partial<Record<BossDef['kind'], string>>> = { mortgage: 'DUE' };
/**
 * The Loan's tape jerking on its interest tick: how long the jolt rings, in
 * world seconds, and how far it stretches the frame at its peak.
 */
const LOAN_JERK_SECONDS = 0.45;
const LOAN_JERK = 0.07;
/**
 * The Reorg's restructure (OFFICE-ROSTER §4): the chart lands somewhere new
 * and settles, a quick squash (wider and shorter first) ringing down the way
 * the Loan's jerk does. PLACEHOLDER, watched by nobody yet.
 */
const REORG_SWAP_SECONDS = 0.4;
const REORG_SWAP = 0.12;
/**
 * The chart greys from the bottom (G-004: damaged boxes go grey and stay in
 * the chart). Where each of its three faced rows begins, top to bottom, as a
 * share of the frame's height, read from boss-reorg.svg's note for the
 * renderer (rows 2–4 at y 132, 236 and 340 of 384, each with 8 of ink above,
 * cut 2 higher so the ink goes with it). The top box is empty and never
 * greys. PLACEHOLDER as a picture: one frame exists, so the grey is the same
 * frame cropped to the rows below the cut and laid over the chart in the
 * shadow tone at `REORG_GREY` — a render tint (G-032 retired those for
 * sprites; this marks a state, not a corrected colour) until a grey chart is
 * drawn and packed, when the overlay wears that frame and drops the tint.
 */
const REORG_ROW_TOPS = [122 / 384, 226 / 384, 330 / 384];
const REORG_GREY = 2 / 3;
/**
 * The Mortgage's door, its mouth (FAMILY-ROSTER §4): the rectangle
 * boss-mortgage.svg's note for the renderer measures on the 384 sprite, frame
 * included — x 160–223, y 266–351 — as shares of the frame. On the twelfth
 * payment the door opens. PLACEHOLDER as a picture, as the Reorg's grey rows
 * are (AUDIT seven, 55): one frame exists, so the open door is that rectangle
 * filled in the act's deep tone, the carpet seen through the doorway, laid
 * over the house for the absorb; when an open door is drawn and packed, the
 * overlay wears that frame instead.
 */
const MORTGAGE_DOOR = { x0: 160 / 384, x1: 223 / 384, y0: 266 / 384, y1: 351 / 384 };
/**
 * The door ajar: the share of its width open between the last instalment
 * being met and the window closing on it (`syncDoor`). PLACEHOLDER.
 */
const MORTGAGE_AJAR = 0.35;
/**
 * A hold taking the player (an engulf: the white cell's, the toddler's,
 * FAMILY-ROSTER §3.4): the grab is a squash, wider first, ringing down as the
 * Reorg's landing does, and for as long as the hold runs the swim's wiggle
 * runs at the hold's share of speed. Shape and motion, not tint (G-032, law
 * 10). The toddler's hold does no damage, so without these nothing on screen
 * said the player was held. PLACEHOLDER, watched by nobody yet.
 */
const HOLD_GRAB_SECONDS = 0.4;
const HOLD_GRAB = 0.12;
/** A body holding the player that is drawn smaller than them draws in front of them, between the player and what they wear. */
const HOLDER_DEPTH = 10.5;
/**
 * Time's minute hand (DECLINE-ROSTER §4, AUDIT 96). boss-time.svg's note for
 * the renderer, measured on the 384 sprite: the pivot where both hands turn
 * and the face sits, as shares of the frame (a pixel from the boss point,
 * which is `bossBody`'s cy 0.47), and the cap's ink edge, r 33px, which the
 * hands pass under. The long hand's rest pose, ten past ten, is the sim's
 * `TIME_HAND_REST`, where its hand starts. The drawn hand is the sim's honest
 * rectangle (`sweepLength` × `sweepWidth` from the boss point, turned by
 * `boss.hand`), in the boss teal because it hurts, from the cap's edge out, so
 * the face stays on top as the drawing has it.
 */
const TIME_PIVOT = { x: 0.499, y: 0.472 };
const TIME_CAP_R = 33 / 384;
/**
 * The baked long hand, covered (PLACEHOLDER as a picture, as the Mortgage's
 * door and the Reorg's grey rows are, AUDIT seven 55): the sprite has its
 * long hand at the rest pose, so once the drawn hand turns there would be two
 * teal hands on the face and only one of them hurts. Until a frame without the
 * long hand is drawn and packed, a strip of the dial's bone is laid over the
 * baked one, from the cap's edge to past its ink tip (127px of 384) and wider
 * than its ink edge (27px), at the rest pose, about the sprite's own pivot
 * (`TIME_PIVOT`). Shares of the frame.
 */
const TIME_BAKED_HAND = { from: 30 / 384, to: 131 / 384, width: 31 / 384 };
/**
 * A Highlighter mark (College's first item): a flat level band with square
 * ends at the foot of the marked body, as the icon's own stroke lies under
 * its pen: the stroke's bone (`MARK_BONE`, the ink the pen lays) edged in the
 * pen's rose (`MARK_ROSE`, conception-mid) — both colours the field-riding
 * icons already wear; never the ranged gold, G-031, and never a threat
 * colour, law 10. Rose alone on College's burgundy was low contrast (AUDIT
 * 123). `MARK_BAND` is the band as shares of the body across: its width, its
 * height (held between `min` and `max` px; a boss's is `max`), how far below
 * the centre an enemy's sits (`at`), the edge's px, and how far a boss's
 * tucks under the foot of its frame (`tuck`, px). It fades over the mark's
 * last `MARK_FADE` seconds. PLACEHOLDER, every number, watched by nobody yet.
 */
const MARK_BONE = BONE;
const MARK_ROSE = 0xa86a63;
const MARK_BAND = { width: 1.2, height: 0.22, min: 6, max: 24, at: 0.38, edge: 1.5, tuck: 6 };
const MARK_FADE = 0.5;
/**
 * The boss's entrance (AUDIT 37). Every boss stands 420px above the player
 * and the view reaches 360, so on the boss's first frame the camera goes to
 * look: out to where the whole drawing is in view, a hold, and back to the
 * player. Presentation only; the sim steps on and the bots never see it.
 * PLACEHOLDER timings, watched by nobody yet: 450ms out, 800ms held, 600ms back.
 */
const ENTRANCE_OUT_MS = 450;
const ENTRANCE_HOLD_MS = 800;
const ENTRANCE_BACK_MS = 600;
/**
 * How far a finger travels for full stick, in CSS pixels rather than game
 * pixels: the canvas is FIT-scaled, and a radius in game units would be a
 * third of the size on a portrait phone that it is on a desktop.
 */
const STICK_RADIUS_CSS = 56;
/** A tap this soon after the run ends is the thumb still steering, not a restart. */
const RESTART_GRACE_MS = 700;
/** How long the act's document stays up at the crossing unless a key or a tap takes it first. */
const DOCUMENT_MS = 4000;
/** The last clean run's held headings (src/meta/input-log.ts), beside `nc-ancestors`. One run, overwritten. */
const INPUT_LOG_KEY = 'nc-input-log';
/**
 * Every stack the player wears, whatever it costs (`World.wornBy`): the
 * antibody's drag, tuition's tax, the ping's attention, the HOA letter's
 * reach. Acts one to four
 * attach only things that drag, so there it equals `dragStacks`; in The
 * Office a ping adds to it and not to the drag.
 */
function wornCount(w: World): number {
  let n = 0;
  for (const k of w.wornBy.values()) n += k;
  return n;
}
/** Arrival toasts stay below the HUD's top band (plate, boss bar, race bar) and this far off the edges. */
const TOAST_TOP = 104;
const TOAST_EDGE = 16;
/** The touch pause button's plate, a circle this wide in radius at the view's bottom-right corner (createTouch). */
const PAUSE_PLATE = 30;
/** A palette number as the CSS string a Text wants. */
const css = (n: number) => `#${n.toString(16).padStart(6, '0')}`;
/** The certificate's typed ink and its printed labels: ink and shadow, the document register's two tones. */
const CERT_INK = css(INK);
const CERT_PRINT = css(SHADOW);

/** An enemy kind waiting its frame to be named: its first instance, and where that was when seen. */
interface Arrival {
  name: string;
  uid: number;
  x: number;
  y: number;
}

/**
 * How far a view spanning [viewLo, viewHi] must move, on one axis, to hold
 * [lo, hi]: zero when it already does. When the span cannot all fit, its
 * low edge (the top, the left) wins, so a tall drawing shows its head. The
 * boss's entrance (AUDIT 37) asks it once per axis.
 */
function shiftToShow(lo: number, hi: number, viewLo: number, viewHi: number): number {
  if (lo < viewLo) return lo - viewLo;
  if (hi > viewHi) return Math.min(hi - viewHi, lo - viewLo);
  return 0;
}

/**
 * Where an arrival toast's centre goes, in screen pixels, for a thing whose
 * centre is at screen (sx, sy). On screen: `lift` above it, or below it when
 * above would leave `box`. Off screen: where the line from the middle of the
 * view toward it meets `box` -- the edge in its direction. Always inside `box`,
 * which is the rectangle the toast's centre may occupy.
 */
function toastPoint(
  sx: number,
  sy: number,
  lift: number,
  view: { width: number; height: number },
  box: { left: number; right: number; top: number; bottom: number },
): { x: number; y: number } {
  const clampX = (v: number) => Math.min(box.right, Math.max(box.left, v));
  const clampY = (v: number) => Math.min(box.bottom, Math.max(box.top, v));
  if (sx >= 0 && sx <= view.width && sy >= 0 && sy <= view.height) {
    return { x: clampX(sx), y: clampY(sy - lift < box.top ? sy + lift : sy - lift) };
  }
  const cx = view.width / 2;
  const cy = view.height / 2;
  const dx = sx - cx;
  const dy = sy - cy;
  const tx = dx > 0 ? (box.right - cx) / dx : dx < 0 ? (box.left - cx) / dx : Infinity;
  const ty = dy > 0 ? (box.bottom - cy) / dy : dy < 0 ? (box.top - cy) / dy : Infinity;
  const t = Math.min(tx, ty);
  return { x: clampX(cx + dx * t), y: clampY(cy + dy * t) };
}

export class ActScene extends Phaser.Scene {
  /** The life this scene plays (D-024): every act in order, one run. */
  private life!: ActDef[];
  private visuals!: ActVisuals;
  private world!: World;
  /** The act the screen is dressed for. Trails `world.actIndex` by a frame at a crossing. */
  private shownAct = -1;
  private gemKey = '';

  private player!: Phaser.GameObjects.Image;
  private cursors!: Phaser.Types.Input.Keyboard.CursorKeys;
  private wasd!: Record<'W' | 'A' | 'S' | 'D', Phaser.Input.Keyboard.Key>;

  private enemySprites: Phaser.GameObjects.Image[] = [];
  private projectileSprites: Phaser.GameObjects.Image[] = [];
  /**
   * Shots drawn as words (`shotWord`): the substitute's, the player's name
   * spelled wrong (SCHOOL-ROSTER §3.5), the registrar's HOLD (COLLEGE §3.5),
   * the review's MEETS (OFFICE §3.5), the phone's HELLO? and the Mortgage's
   * DUE (FAMILY §3.5, §4), the insurance form's DENIED (DECLINE §3.5).
   */
  private nameShotTexts: Phaser.GameObjects.Text[] = [];
  /** The name on the form, read once per life; the sim never knows it. */
  private playerName = DEFAULT_NAME;
  private gemSprites: Phaser.GameObjects.Image[] = [];
  private ringSprites: Phaser.GameObjects.Arc[] = [];
  private areaSprites: Phaser.GameObjects.Arc[] = [];
  /** Meetings (OFFICE-ROSTER §3.4): each hold's ring at its honest radius, and its chairs on it. */
  private holdRings: Phaser.GameObjects.Arc[] = [];
  private holdChairs: Phaser.GameObjects.Image[] = [];
  /** Orbit items' objects (Grudge), each wearing its card's icon (G-036). */
  private orbiterSprites: Phaser.GameObjects.Image[] = [];
  /** Aura rings (Personal Space, G-044) at their honest radius, and the icon riding each. */
  private auraRings: Phaser.GameObjects.Arc[] = [];
  private auraIcons: Phaser.GameObjects.Image[] = [];
  /** Sweep wedges (Backhand), redrawn every frame, and the hand crossing each. */
  private sweepFx!: Phaser.GameObjects.Graphics;
  private sweepIcons: Phaser.GameObjects.Image[] = [];
  private attachedSprites: Phaser.GameObjects.Image[] = [];
  private bossSprite?: Phaser.GameObjects.Image;
  /** Prom's dance floor, drawn as a ring at floorRadius; only while its boss stands. */
  private floorRing?: Phaser.GameObjects.Graphics;
  /** Scale the boss frame sits at when idle. The telegraph pulses around it. */
  private bossBaseScale = 1;
  /**
   * The boss's uniform scale this frame, eased toward the pulse's target. Kept
   * apart from the sprite so a stretch laid over it (the Loan's jerk) is never
   * read back as the next frame's starting size.
   */
  private bossScale = 1;
  /** The Loan's interest clock last frame; it wrapping upward is the tick. */
  private bossInterestIn = 0;
  /** World time of the Loan's last tick, which the tape's jerk rings down from. */
  private bossJerkAt = -Infinity;
  /**
   * The Reorg's restructures seen last frame, and the world time of the last
   * one, which the swap's squash rings down from (OFFICE-ROSTER §4).
   */
  private bossRestructures = 0;
  private bossSwapAt = -Infinity;
  /** The Reorg's greyed rows: the chart's own frame, cropped from a row down (`REORG_ROW_TOPS`). */
  private bossGrey?: Phaser.GameObjects.Image;
  /** The Mortgage's open door (`MORTGAGE_DOOR`), laid over the house from the last payment on. */
  private bossDoor?: Phaser.GameObjects.Rectangle;
  /**
   * Time's minute hand, drawn as its own shape over the clock (`syncTimeHand`),
   * and the bone strip that covers the sprite's baked one (`TIME_BAKED_HAND`).
   */
  private bossHand?: Phaser.GameObjects.Rectangle;
  private bossHandCover?: Phaser.GameObjects.Rectangle;
  /** Highlighter marks (`MARK_ROSE`), redrawn every frame under the crowd. */
  private markFx!: Phaser.GameObjects.Graphics;
  /**
   * The hold's cues (`HOLD_GRAB`): last frame's `engulfTimer`, which rising is
   * a new hold; the world time of that grab; and the swim's phase, advanced
   * by the world time each frame covers at the hold's share of speed.
   */
  private heldFor = 0;
  private grabAt = -Infinity;
  private swimPhase = 0;
  private swimAt = 0;
  /**
   * The boss's entrance (AUDIT 37): owed from the frame its sprite is made
   * until the camera goes to look, and the look while it runs. One per
   * sprite, so one per spawn; a restart or a crossing drops both.
   */
  private bossEntranceOwed = false;
  private bossEntrance?: Phaser.Tweens.TweenChain;

  /** Set by P or Escape. Distinct from the offer freeze, which is the rules. */
  private paused = false;

  /**
   * The drag-anywhere stick: the pointer that owns it (-1 when none), where it
   * went down, and the vector it currently asks for. The arithmetic is in
   * `touch.ts`; this is only the bookkeeping for pointer events.
   */
  private stickId = -1;
  private stickOrigin = { x: 0, y: 0 };
  private stickMove: Move = { moveX: 0, moveY: 0 };
  private stickRing!: Phaser.GameObjects.Arc;
  private stickKnob!: Phaser.GameObjects.Arc;
  /** Touch devices only: a corner tap target for pause. P/Esc still work. */
  private pauseButton?: Phaser.GameObjects.Container;
  private touch = false;
  /** `time.now` when the run was first seen over, for the restart grace. */
  private endedAt = -1;

  /**
   * Dev-mode cheats. Development builds only, and deliberately NOT inside
   * `World` — the playtest bots construct a World directly, and a `god` field
   * on the rules object is a field that can be set during a measured run.
   * Everything here is applied from outside the simulation instead.
   */
  private dev: DevState = neutralDevState();
  private detachDev?: () => void;

  /**
   * Last frame's world counters, for sound. The simulation emits no events —
   * it must not know sound exists — so the renderer notices changes the same
   * way it notices everything else: by reading state and diffing. `worn` and
   * `holds` are copies, never the world's live map and array.
   */
  private heard = { kills: 0, hp: 0, worn: new Map() as ReadonlyMap<string, number>, offers: false, boss: false, dead: false, won: false, xp: 0, level: 1, raced: 0, shot: 0, homework: 0, stun: 0, bossPhase: '', typing: 0, car: 0, bell: 0, interestIn: 0, time: 0, auraAt: -Infinity, holds: [] as readonly HoldState[], restructures: 0, bill: 0, ringing: 0, engulf: 0, paid: 0 };

  /**
   * How long this run held each heading (§12.4's sixth question). Fed the
   * exact input each step the world takes, so a person's number and a bot's
   * come from the same instrument. One per run; rebuilt in `create`.
   */
  private inputLog = new InputLog();

  private hudLevel!: Phaser.GameObjects.Text;
  private hudClock!: Phaser.GameObjects.Text;
  private hudRight!: Phaser.GameObjects.Text;
  private hudDrag!: Phaser.GameObjects.Text;
  /** The worn line's terms as drawHud last read them, so anchorHud can set them again for a new canvas. */
  private wornTerms: string[] = [];
  private hudBossLabel!: Phaser.GameObjects.Text;
  private hudRaceLabel!: Phaser.GameObjects.Text;
  private bars!: Phaser.GameObjects.Graphics;
  /**
   * The health bar's empty tail this frame, in HUD px: the part of the
   * items' maximum (`itemsMaxHp`) the insurance form's decisions have taken
   * (DECLINE-ROSTER §3.5, AUDIT 90, 122). Zero with nothing taken. Kept for
   * the smoke's probe (tools/smoke/run.ts), which cannot read a Graphics.
   */
  private hpTail = 0;
  /**
   * The certificate's words: `certificateLines`, typed on the receipt under
   * the form (showCertificate). The smoke reads this object's text for
   * "Natural causes." and "Age 34." (tools/smoke/run.ts), so those lines live
   * here and nowhere else on the sheet decides them.
   */
  private overlay!: Phaser.GameObjects.Text;
  /** "paused", centred. Was `overlay` before the certificate became a form. */
  private pauseNote!: Phaser.GameObjects.Text;
  /** The build sheet under "paused" (buildPauseSheet). Built on pause, torn down on resume. */
  private pauseSheet?: Phaser.GameObjects.Container;
  /** True while the sheet holds an upright phone's canvas, so only it gives that back. */
  private pauseSheetNarrow = false;
  /** The certificate as a document. Built the first frame the run is over. */
  private form?: Phaser.GameObjects.Container;
  /**
   * The act's document at the crossing (showDocument), its scrim with it; the
   * scene holds its steps while this is set. When it goes, whether it took an
   * upright phone's canvas, and the life clock the playing act began at.
   */
  private paper?: Phaser.GameObjects.Container;
  private paperUntil = 0;
  private paperNarrow = false;
  private actBegan = 0;
  private endScrim!: Phaser.GameObjects.Rectangle;
  private devBadge!: Phaser.GameObjects.Text;

  /** Kill/attach ripples. A pool, like every other transient. */
  private puffs: Phaser.GameObjects.Arc[] = [];
  /** Weapon-effect stamps: starbursts, footprints, the magnet. Pooled. */
  private areaIcons: Phaser.GameObjects.Image[] = [];
  /** Passive cues drawn around the player: Membrane's ring, Midpiece's streaks. */
  private playerFx!: Phaser.GameObjects.Graphics;
  private prevGemCount = 0;
  private absorbZoomed = false;

  /** The offer cards. Built when offers appear, torn down on the choice. */
  private offerCards: Phaser.GameObjects.Container[] = [];
  private offerScrim?: Phaser.GameObjects.Rectangle;
  private offerHeader?: Phaser.GameObjects.Text;
  /** What the current cards were built from, so drawHud can diff cheaply. */
  private shownOffers = '';

  /**
   * Arrival toasts (syncArrivals). The kinds already named this act, the
   * highest enemy uid already looked at (uids are monotonic across the life),
   * the names waiting their frame, and the toasts on screen with their tweens.
   */
  private named = new Set<string>();
  private arrivalUid = 0;
  private arrivals: Arrival[] = [];
  private arrivalCards: { card: Phaser.GameObjects.Text; chain: Phaser.Tweens.TweenChain }[] = [];

  constructor() {
    super('act');
  }

  init(data?: { acts?: ActDef[] }): void {
    const life = data?.acts ?? this.life ?? ACTS;
    if (life.length === 0) throw new Error('ActScene was started without an act');
    this.life = life;
    // Throws here, before a frame is drawn, if an act in the life has no art.
    for (const act of life) actVisuals(act.id);
  }

  preload(): void {
    // Every act's atlas up front: the crossing happens mid-run and must not
    // wait on a load, and an atlas is small next to a stall at the threshold.
    for (const act of this.life) {
      const v = actVisuals(act.id);
      if (!this.textures.exists(v.atlas.key)) this.load.atlas(v.atlas.key, v.atlas.png, v.atlas.json);
    }
    this.load.atlas(ITEM_ICON_ATLAS.key, ITEM_ICON_ATLAS.png, ITEM_ICON_ATLAS.json);
  }

  create(): void {
    // The world places the player itself — the arena is its own now.
    this.world = new World({ acts: this.life, seed: Date.now() & 0xffff });
    this.shownAct = this.world.actIndex;
    this.visuals = actVisuals(this.world.act.id);
    // A restart destroyed the paper with the display list; the shutdown gave its canvas back.
    delete this.paper;
    this.paperNarrow = false;
    this.actBegan = this.world.time - this.world.actTime;

    this.enemySprites = [];
    this.projectileSprites = [];
    this.nameShotTexts = [];
    this.playerName = readPlayerName() ?? DEFAULT_NAME;
    this.gemSprites = [];
    this.ringSprites = [];
    this.areaSprites = [];
    this.holdRings = [];
    this.holdChairs = [];
    this.orbiterSprites = [];
    this.auraRings = [];
    this.auraIcons = [];
    this.sweepIcons = [];
    this.attachedSprites = [];
    delete this.bossSprite;
    delete this.bossGrey;
    delete this.bossDoor;
    delete this.bossHand;
    delete this.bossHandCover;
    delete this.floorRing;
    this.heldFor = 0;
    this.grabAt = -Infinity;
    this.swimPhase = this.world.time * 9;
    this.swimAt = this.world.time;
    // The old scene's look went with its tweens, and startFollow below sets
    // the follow offset back to nothing; a new world has no boss to owe one.
    this.bossEntranceOwed = false;
    delete this.bossEntrance;

    this.puffs = [];
    this.areaIcons = [];
    this.prevGemCount = 0;
    this.absorbZoomed = false;
    this.cameras.main.setZoom(1);

    this.cameras.main.setBackgroundColor(this.visuals.background);
    ensureShotTextures(this, THREAT_RANGED);
    this.gemKey = ensureGemTexture(this, this.visuals.pickup);
    this.createField();
    // Corners that fall away instead of ending. Above the field and the
    // actors, below the HUD.
    addVignette(this, VIEW_WIDTH, VIEW_HEIGHT, 90);

    this.playerFx = this.add.graphics().setDepth(9);
    // Under the crowd, so what the swing hits is drawn on top of it.
    this.sweepFx = this.add.graphics().setDepth(4);
    // Over the crowd, so a marked enemy's hit flash does not dim its band, and
    // under the boss (6), whose band lies under its drawing (`syncMarks`).
    this.markFx = this.add.graphics().setDepth(5.5);
    this.player = this.add
      .image(this.world.x, this.world.y, this.visuals.atlas.key, this.visuals.playerFrame)
      .setDepth(10);
    this.player.setDisplaySize(PLAYER_DISPLAY, PLAYER_DISPLAY);

    this.cameras.main.startFollow(this.player, true, 0.12, 0.12);
    this.cameras.main.setBounds(0, 0, WORLD_WIDTH, WORLD_HEIGHT);

    const keyboard = this.input.keyboard;
    if (!keyboard) throw new Error('No keyboard input available.');
    this.cursors = keyboard.createCursorKeys();
    this.wasd = keyboard.addKeys('W,A,S,D') as typeof this.wasd;
    // A pause. Not a rules pause — the offer freeze is that, and it is in the
    // world. This one exists because a run is five minutes long and the world
    // does not care that someone is at the door.
    const togglePause = () => {
      if (this.world.dead || this.world.won || this.world.offers) return;
      this.paused = !this.paused;
      // A thumb held through the pause must not resume the walk on unpause.
      this.releaseStick();
    };
    // Every key handler takes each event once: Phaser replays a frame's key
    // queue on each new key event, and a replayed P unpauses, a replayed 1
    // chooses the next offer's card unseen (see `./keys`).
    keyboard.on('keydown-P', oncePerEvent(togglePause));
    keyboard.on('keydown-M', oncePerEvent(() => sfx.toggleMute()));
    // In case the title screen's unlock was missed (hot reload lands here).
    keyboard.on('keydown', oncePerEvent(() => sfx.unlock()));
    keyboard.on('keydown-ESC', oncePerEvent(togglePause));
    keyboard.on(
      'keydown-R',
      oncePerEvent(() => {
        // Mid-run restarts are a dev affordance. In a clean run R still only
        // works once the run is over, so it cannot be a panic button.
        const anytime = import.meta.env.DEV && this.dev.tainted;
        if (this.world.dead || this.world.won || anytime) this.scene.restart({ acts: this.life });
      }),
    );
    for (const [i, key] of ['ONE', 'TWO', 'THREE'].entries()) {
      keyboard.on(
        `keydown-${key}`,
        oncePerEvent(() => {
          const offers = this.world.offers;
          // Not under the act's document: the card is not drawn yet (drawHud).
          if (offers && offers[i] && !this.paper) {
            this.world.choose(offers[i]!);
            sfx.choose();
          }
        }),
      );
    }
    // Any key takes the act's document down. After the named keys: Phaser
    // emits `keydown-ONE` before `keydown`, so a 1 only lifts the paper.
    keyboard.on('keydown', oncePerEvent(() => this.hideDocument()));
    this.createTouch(togglePause);

    this.createHud();

    // A restart is the only thing that clears the taint, which is why the
    // state is rebuilt here rather than kept across scene restarts.
    this.offerCards = [];
    this.shownOffers = '';
    delete this.offerScrim;
    delete this.offerHeader;
    // The display list took the sheet with it; the shutdown gave its canvas back.
    delete this.pauseSheet;
    this.pauseSheetNarrow = false;
    this.arrivalCards = [];
    this.arrivalUid = 0;
    this.resetArrivals();

    this.dev = neutralDevState();
    this.heard = { kills: 0, hp: this.world.hp, worn: new Map(this.world.wornBy), offers: false, boss: false, dead: false, won: false, xp: 0, level: 1, raced: 0, shot: 0, homework: 0, stun: 0, bossPhase: '', typing: 0, car: 0, bell: 0, interestIn: 0, time: this.world.time, auraAt: -Infinity, holds: this.world.holds.slice(), restructures: 0, bill: 0, ringing: 0, engulf: 0, paid: 0 };
    this.inputLog = new InputLog();
    if (import.meta.env.DEV) {
      this.detachDev?.();
      void import('../dev/panel').then(({ attachDevPanel }) => {
        this.detachDev = attachDevPanel({
          world: this.world,
          dev: this.dev,
          inputLog: this.inputLog,
          restart: () => this.scene.restart({ acts: this.life }),
        });
      });
      this.events.once('shutdown', () => this.detachDev?.());
    }

    // Controls, stated. The first level-up arrives about fourteen seconds in
    // and freezes the world until a choice is made, which without a prompt is
    // indistinguishable from the game hanging — it was reported as exactly
    // that. Fades out once the player has started moving.
    const hint = this.add
      .text(
        this.cameras.main.width / 2,
        this.cameras.main.height - 54,
        this.touch
          ? 'drag anywhere to move   ·   you fire automatically   ·   tap a card to choose'
          : 'WASD or arrows to move   ·   you fire automatically   ·   1/2/3 choose an upgrade   ·   P pauses',
        { fontFamily: 'monospace', fontSize: '15px', color: '#EFE7D6' },
      )
      .setOrigin(0.5)
      .setScrollFactor(0)
      .setDepth(150)
      .setAlpha(0.85);
    this.tweens.add({ targets: hint, alpha: 0, delay: 6500, duration: 1200 });
    this.announceAct();
  }

  /**
   * The boss fell and the life went on (D-024). The sim has already cleared
   * the act and carried the player over; this re-dresses the screen for the
   * next one. Pools holding the last act's textures are dropped rather than
   * retextured — they refill on the next frame from the new atlas.
   */
  private crossThreshold(): void {
    this.shownAct = this.world.actIndex;
    this.visuals = actVisuals(this.world.act.id);
    this.cameras.main.setBackgroundColor(this.visuals.background);
    this.gemKey = ensureGemTexture(this, this.visuals.pickup);
    for (const g of this.gemSprites) g.destroy();
    this.gemSprites = [];
    this.prevGemCount = 0;
    for (const a of this.attachedSprites) a.destroy();
    this.attachedSprites = [];
    this.bossSprite?.destroy();
    delete this.bossSprite;
    this.bossGrey?.destroy();
    delete this.bossGrey;
    this.bossDoor?.destroy();
    delete this.bossDoor;
    this.bossHand?.destroy();
    delete this.bossHand;
    this.bossHandCover?.destroy();
    delete this.bossHandCover;
    this.endBossEntrance();
    this.floorRing?.destroy();
    delete this.floorRing;
    this.absorbZoomed = false;
    // `force`: the Egg's 1.5s lean-in may still be tweening at the crossing
    // (it always is at dev speed), and Phaser drops a zoomTo while one runs.
    // Found by the smoke test: School played zoomed in with the HUD clipped.
    this.cameras.main.zoomTo(1, 600, 'Sine.easeInOut', true);
    this.player
      .setTexture(this.visuals.atlas.key, this.visuals.playerFrame)
      .setDisplaySize(PLAYER_DISPLAY, PLAYER_DISPLAY);
    this.resetArrivals();
    // The finished act's paper first; the act is announced as it goes.
    if (!this.showDocument()) this.announceAct();
  }

  /**
   * The act's name and the age it starts at, across the middle, then gone.
   * At the first crossing, one line more: what the Egg dealt (G-042). It is
   * named once, there, and never explained.
   */
  private announceAct(): void {
    const cam = this.cameras.main;
    const act = this.world.act;
    const dealt = this.world.actIndex === 1 ? this.world.inheritance?.blurb : undefined;
    const lines = dealt ? [act.name, hudAge(act.age.from), dealt] : [act.name, hudAge(act.age.from)];
    const card = this.add
      .text(cam.width / 2, cam.height / 2 - 120, lines, {
        fontFamily: 'monospace',
        fontSize: '30px',
        color: '#EFE7D6',
        align: 'center',
        letterSpacing: 6,
        lineSpacing: 10,
      })
      .setOrigin(0.5)
      .setScrollFactor(0)
      .setDepth(150)
      .setAlpha(0);
    this.tweens.chain({
      targets: card,
      tweens: [
        { alpha: 0.9, duration: 350 },
        { alpha: 0, delay: 1600, duration: 700 },
      ],
      onComplete: () => card.destroy(),
    });
  }

  /**
   * One word across the middle as the act ends on it. The stopwatch click
   * and the word are the whole ceremony; it stays up as long as the exit.
   */
  private announceWord(word: string): void {
    const cam = this.cameras.main;
    const card = this.add
      .text(cam.width / 2, cam.height / 2 - 60, word, {
        fontFamily: 'monospace',
        fontSize: '44px',
        color: '#EFE7D6',
        align: 'center',
        letterSpacing: 10,
      })
      .setOrigin(0.5)
      .setScrollFactor(0)
      .setDepth(150)
      .setAlpha(0);
    this.tweens.chain({
      targets: card,
      tweens: [
        { alpha: 0.95, duration: 250 },
        { alpha: 0, delay: 1400, duration: 500 },
      ],
      onComplete: () => card.destroy(),
    });
  }

  /**
   * The act's document (`documents.ts`): the paper the crossing issues from
   * the life so far, before the next act is announced — the certificate's
   * sibling on a smaller sheet, in its register (G-038): the office, the
   * title in small caps, the fields numbered and typed on their rules, the
   * stamp in the new act's deep tone, on a scrim of its own.
   *
   * While it is up the scene holds its steps, as the pause does (`update`), so
   * nothing starts behind the paper; the rules never know. It goes after
   * `DOCUMENT_MS` or on any key or tap (`hideDocument`), and the act is
   * announced as it goes. False when the finished act issues none yet.
   *
   * On a screen wider than tall the type is raised to the certificate's floors
   * at the ratio FIT shows the canvas (`paperType`). An upright phone
   * (`narrowCanvas`) gets the pause sheet's treatment: the world is held, so
   * the paper takes a canvas of the screen's shape in the certificate's
   * narrow type, and `hideDocument` gives 1280×720 back.
   */
  private showDocument(): boolean {
    const w = this.world;
    // The finished act's clock, off the life clock: when this act began, less
    // when the last one did. Exact at any time scale, and under the dev
    // panel's skip, which moves both clocks together.
    const began = w.time - w.actTime;
    const clock = began - this.actBegan;
    this.actBegan = began;
    const finished = this.life[w.actIndex - 1];
    const doc = finished ? actDocument(w, this.playerName, finished, clock) : null;
    if (!doc) return false;

    const cam = this.cameras.main;
    const shape = narrowCanvas(this.scale.parentSize);
    const type = shape
      ? { line: NARROW_TYPE.print, label: NARROW_TYPE.print, value: NARROW_TYPE.value, title: PAPER_NARROW_TITLE, hint: NARROW_TYPE.hint }
      : paperType(this.scale.displaySize.width / this.scale.width);
    const view = shape ?? { width: cam.width, height: cam.height };
    const W = shape ? NARROW_WIDTH - 40 : PAPER_SHEET.width;
    const M = shape ? 40 : PAPER_SHEET.margin;
    // As showCertificate: an absorb's lean-in ends under the paper, which takes the zoom too.
    cam.zoomEffect.reset();
    cam.setZoom(1);
    const parts: Phaser.GameObjects.GameObject[] = [];
    const text = (x: number, y: number, s: string, size: number, colour: string, spacing = 0) => {
      const t = this.add.text(x, y, s, { fontFamily: 'monospace', fontSize: `${size}px`, color: colour, letterSpacing: spacing });
      parts.push(t);
      return t;
    };
    const sheet = this.add.graphics();
    const rules = this.add.graphics();

    // The office, the title, the double rule: the certificate's head.
    const office = text(W / 2, 32, doc.line, type.line, CERT_PRINT, shape ? 3 : 5).setOrigin(0.5, 0);
    const baseline = office.y + office.height + 16 + type.title;
    parts.push(...this.smallCaps(doc.title, W / 2, baseline, type.title, CERT_INK, shape ? 3 : 4));
    rules.lineStyle(2, INK, 1).lineBetween(M, baseline + 16, W - M, baseline + 16);
    rules.lineStyle(1, INK, 1).lineBetween(M, baseline + 21, W - M, baseline + 21);

    // The fields, numbered; a value too long for its rule wraps rather than spills.
    let y = baseline + 21 + (shape ? 30 : 24);
    let rule = y;
    doc.fields.forEach(([label, value], i) => {
      const printed = text(M, y, `${i + 1}. ${label}`, type.label, CERT_PRINT, 1);
      const typed = text(M + 6, printed.y + printed.height + 6, value, type.value, CERT_INK);
      typed.setWordWrapWidth(W - 2 * M - 6);
      rule = typed.y + Math.max(Math.round(type.value * 1.25), typed.height + 4);
      rules.lineStyle(1.5, INK, 1).lineBetween(M, rule, W - M, rule);
      y = rule + (shape ? 24 : 16);
    });

    // The stamp in a band of its own under the last rule, so it covers no value.
    const stamp = this.inkStamp(doc.stamp, shape ? 34 : 30, shape ? 48 : 44);
    // Its half-height, and what the tilt (inkStamp's 8°) lifts and drops its corners by.
    const half = stamp.height / 2 + (stamp.width / 2) * Math.sin(Phaser.Math.DegToRad(8));
    stamp.setPosition(W - M - 16 - stamp.width / 2, rule + 10 + half);
    const H = stamp.y + half + 28;
    sheet.fillStyle(INK, 0.55).fillRect(8, 10, W, H);
    sheet.fillStyle(PAPER, 1).fillRect(0, 0, W, H);
    sheet.lineStyle(3, INK, 1).strokeRect(14, 14, W - 28, H - 28);
    sheet.lineStyle(1, INK, 1).strokeRect(21, 21, W - 42, H - 42);
    const gap = shape ? 50 : 32;
    const hint = this.add
      .text(W / 2, H + gap, this.touch ? 'tap to continue' : 'any key to continue', {
        fontFamily: 'monospace',
        fontSize: `${type.hint}px`,
        color: css(PAPER),
      })
      .setOrigin(0.5)
      .setAlpha(0.85);

    // Centred on the view, sheet and hint together; scaled down only if FIT
    // shows the canvas so small the raised type overruns it.
    const need = H + gap + type.hint;
    const s = Math.min(1, (view.height - 16) / need);
    const paper = this.add
      .container(Math.round((view.width - W * s) / 2), Math.max(8, Math.round((view.height - need * s) / 2)), [
        sheet,
        rules,
        ...parts,
        stamp,
        hint,
      ])
      .setScale(s);
    const scrim = this.add.rectangle(view.width / 2, view.height / 2, view.width, view.height, INK, 0.62);
    this.paper = this.add.container(0, 0, [scrim, paper]).setScrollFactor(0).setDepth(202);
    this.paperUntil = this.time.now + DOCUMENT_MS;
    if (shape) {
      this.scale.setGameSize(shape.width, shape.height);
      // The follow would glide to the new view's centre; the world is still, so snap.
      cam.centerOn(this.player.x, this.player.y);
      this.events.off('shutdown', this.restoreCanvas, this).once('shutdown', this.restoreCanvas, this);
      this.paperNarrow = true;
      this.anchorHud(shape.width);
      this.devBadge.setPosition(shape.width - 14, shape.height - 14 - this.devBadge.height);
    }
    return true;
  }

  /**
   * Takes the act's document down, and announces the act it held back. Fades
   * where it can; an upright phone's paper goes at once, because the canvas
   * it was set on goes back to 1280×720 with it. No-op with no paper up.
   */
  private hideDocument(): void {
    const paper = this.paper;
    if (!paper) return;
    delete this.paper;
    if (this.paperNarrow) {
      this.paperNarrow = false;
      paper.destroy();
      if (this.restoreCanvas()) this.events.off('shutdown', this.restoreCanvas, this);
      this.cameras.main.centerOn(this.player.x, this.player.y);
      this.anchorHud(VIEW_WIDTH);
      this.devBadge.setPosition(VIEW_WIDTH - 14, 58);
    } else {
      this.tweens.add({ targets: paper, alpha: 0, duration: 300, onComplete: () => paper.destroy() });
    }
    this.announceAct();
  }

  /**
   * Arrival toasts: the first of each enemy kind in an act is named, small, beside it or at its edge.
   * From DIRECTION-PANEL-2026-09-27 ("named on screen when it first arrives"), kept in HANDOFF.md.
   * PLAN.md: the name is the whole delivery; the certificate's cause of death is the payoff.
   * Read off `world.enemies` by uid, as hearWorld hears homework; the sim never knows. One a frame.
   * Held while paused or choosing a card, so no name is spent under the scrim; dropped at the end.
   */
  private syncArrivals(): void {
    const w = this.world;
    const hold = this.paused || !!w.offers;
    for (const a of this.arrivalCards) {
      if (hold) a.chain.pause();
      else a.chain.resume();
    }
    if (w.dead || w.won) {
      this.arrivals.length = 0;
      return;
    }
    // `enemies` holds neither the player, nor the boss (its bar names it), nor
    // an attached antibody (contact swaps it out into `dragStacks`). The name
    // check is the guard for the day a boss's kind walks the field.
    let top = this.arrivalUid;
    for (const e of w.enemies) {
      if (e.uid <= this.arrivalUid) continue;
      top = Math.max(top, e.uid);
      if (this.named.has(e.def.id)) continue;
      this.named.add(e.def.id);
      if (e.def.name === w.act.bossName) continue;
      this.arrivals.push({ name: e.def.name, uid: e.uid, x: e.x, y: e.y });
    }
    this.arrivalUid = top;
    if (hold) return;
    const next = this.arrivals.shift();
    if (next) this.showArrival(next);
  }

  /**
   * A new act names its own arrivals: forget the last act's, and clear any
   * still up. Nothing already on the field when the act began is an arrival.
   * `beginAct` clears the field, so today this marks nothing; it is the guard
   * for the day it does not. Older than the act means there before it, and at
   * `create` the world has not stepped, so everything present was.
   */
  private resetArrivals(): void {
    for (const a of this.arrivalCards) {
      a.chain.stop();
      a.card.destroy();
    }
    this.arrivalCards = [];
    this.arrivals = [];
    this.named = new Set();
    const w = this.world;
    for (const e of w.enemies) if (w.time === 0 || e.age > w.actTime) this.named.add(e.def.id);
  }

  /** One toast. Placed where the enemy is now if it is still there (a queued name can wait out a card choice). */
  private showArrival(a: Arrival): void {
    const cam = this.cameras.main;
    const e = this.world.enemies.find((o) => o.uid === a.uid);
    const card = this.add
      .text(0, 0, a.name, {
        fontFamily: 'monospace',
        fontSize: '15px',
        color: '#EFE7D6',
        letterSpacing: 2,
      })
      .setOrigin(0.5)
      .setScrollFactor(0)
      // Above the field, its vignette and the HUD; under the stick, the act
      // card, and the offer scrim and cards.
      .setDepth(120)
      .setAlpha(0);
    const box = {
      left: TOAST_EDGE + card.width / 2,
      right: cam.width - TOAST_EDGE - card.width / 2,
      top: TOAST_TOP + card.height / 2,
      bottom: cam.height - TOAST_EDGE - card.height / 2,
    };
    // Screen space for a scroll-factor-0 object is world minus scroll at any
    // zoom: Phaser zooms both about the same centre.
    const at = toastPoint(
      (e?.x ?? a.x) - cam.scrollX,
      (e?.y ?? a.y) - cam.scrollY,
      (e?.displaySize ?? 48) / 2 + 12,
      cam,
      box,
    );
    // On touch the bottom-right corner is the pause button's: a name pushed to
    // that edge printed across its plate, so it stands clear above the plate.
    const pause = this.pauseButton;
    if (pause && Math.abs(at.x - pause.x) < PAUSE_PLATE + 8 + card.width / 2) {
      at.y = Math.min(at.y, pause.y - PAUSE_PLATE - 8 - card.height / 2);
    }
    // Two kinds arriving from one side a frame apart would print on top of
    // each other: step the newer one toward the middle until it clears.
    for (let n = 0; n < 4; n++) {
      const clash = this.arrivalCards.some(
        (o) =>
          Math.abs(o.card.x - at.x) < (o.card.width + card.width) / 2 + 8 &&
          Math.abs(o.card.y - at.y) < (o.card.height + card.height) / 2 + 2,
      );
      if (!clash) break;
      const step = (card.height + 4) * (at.y > cam.height / 2 ? -1 : 1);
      at.y = Math.min(box.bottom, Math.max(box.top, at.y + step));
    }
    card.setPosition(at.x, at.y);
    const chain = this.tweens.chain({
      targets: card,
      tweens: [
        { alpha: 0.9, duration: 150 },
        { alpha: 0, delay: 1050, duration: 500 },
      ],
      onComplete: () => {
        card.destroy();
        this.arrivalCards = this.arrivalCards.filter((o) => o.card !== card);
      },
    });
    this.arrivalCards.push({ card, chain });
  }

  /**
   * Pointer input: a drag anywhere is a stick, a tap on a card chooses it (the
   * cards' own handler, in buildOfferUi), a tap on the ended run restarts, and
   * on touch devices a corner button pauses. Mouse drags count too — the
   * pointer events do not distinguish, and there is no reason they should.
   */
  private createTouch(togglePause: () => void): void {
    this.touch = this.sys.game.device.input.touch;
    this.stickId = -1;
    this.stickMove = { moveX: 0, moveY: 0 };
    this.endedAt = -1;
    delete this.pauseButton;
    // A second touch pointer, so a card or the pause button can be tapped
    // with the steering thumb still down. The pointers belong to the game,
    // not the scene, so only add it once across restarts. (`pointersTotal`
    // counts touch pointers only; the default is one.)
    if (this.input.manager.pointersTotal < 2) this.input.addPointer(1);

    // Where the thumb went down and where it is now. Screen space, faint:
    // this is feedback that the drag registered, not a control to look at.
    this.stickRing = this.add
      .circle(0, 0, 10)
      .setFillStyle()
      .setStrokeStyle(2, UI_FILL, 0.3)
      .setScrollFactor(0)
      .setDepth(140)
      .setVisible(false);
    this.stickKnob = this.add.circle(0, 0, 14, UI_FILL, 0.25).setScrollFactor(0).setDepth(140).setVisible(false);

    if (this.touch) {
      const cam = this.cameras.main;
      const plate = this.add.graphics();
      plate.fillStyle(INK, 0.4).fillCircle(0, 0, PAUSE_PLATE);
      plate.lineStyle(2, UI_FILL, 0.45).strokeCircle(0, 0, PAUSE_PLATE);
      plate.fillStyle(PAPER, 0.85).fillRect(-10, -12, 7, 24).fillRect(3, -12, 7, 24);
      // The hit area is larger than the plate: a thumb is not a cursor.
      this.pauseButton = this.add
        .container(cam.width - 64, cam.height - 64, [plate])
        .setSize(104, 104)
        .setScrollFactor(0)
        .setDepth(205);
      this.pauseButton.setInteractive();
      this.pauseButton.on('pointerdown', togglePause);
    }

    this.input.on(
      'pointerdown',
      (p: Phaser.Input.Pointer, over: Phaser.GameObjects.GameObject[]) => {
        sfx.unlock();
        // Any tap takes the act's document down, and only that: no stick
        // starts under the paper (a tap on the pause button also pauses).
        if (this.paper) {
          this.hideDocument();
          return;
        }
        // The pause button and the offer cards handle their own taps (their
        // events fire before this one); a stick must not start under them.
        if (over.length > 0) return;
        if (this.paused) {
          togglePause();
          return;
        }
        if (this.world.dead || this.world.won) {
          if (this.endedAt >= 0 && this.time.now - this.endedAt >= RESTART_GRACE_MS) {
            this.scene.restart({ acts: this.life });
          }
          return;
        }
        if (this.stickId !== -1) return;
        this.stickId = p.id;
        this.stickOrigin = { x: p.x, y: p.y };
        this.stickMove = { moveX: 0, moveY: 0 };
        this.stickRing.setPosition(p.x, p.y).setRadius(this.stickRadius()).setVisible(true);
        this.stickKnob.setPosition(p.x, p.y).setVisible(true);
      },
    );
    this.input.on('pointermove', (p: Phaser.Input.Pointer) => {
      if (p.id !== this.stickId) return;
      const radius = this.stickRadius();
      this.stickMove = stickVector(this.stickOrigin, p, radius);
      // The knob follows the finger but stops at the rim, as the vector does.
      const dx = p.x - this.stickOrigin.x;
      const dy = p.y - this.stickOrigin.y;
      const k = Math.min(1, radius / (Math.hypot(dx, dy) || 1));
      this.stickKnob.setPosition(this.stickOrigin.x + dx * k, this.stickOrigin.y + dy * k);
    });
    const up = (p: Phaser.Input.Pointer) => {
      if (p.id === this.stickId) this.releaseStick();
    };
    this.input.on('pointerup', up);
    this.input.on('pointerupoutside', up);
  }

  /** Stick radius in game pixels for the canvas's current CSS size. */
  private stickRadius(): number {
    return STICK_RADIUS_CSS * this.scale.displayScale.x;
  }

  private releaseStick(): void {
    this.stickId = -1;
    this.stickMove = { moveX: 0, moveY: 0 };
    this.stickRing?.setVisible(false);
    this.stickKnob?.setVisible(false);
  }

  /**
   * A flat field of one colour gives no motion cue — the player moves and
   * nothing appears to happen. A sparse tiled mark fixes that for the cost of
   * one texture, and reads as paper tooth, which is the register.
   */
  private createField(): void {
    const key = ensureFieldTile(this);
    this.add.tileSprite(0, 0, WORLD_WIDTH, WORLD_HEIGHT, key).setOrigin(0, 0).setDepth(0);
  }

  private createHud(): void {
    const cam = this.cameras.main;
    const style = (size: number, colour: string) => ({
      fontFamily: 'monospace',
      fontSize: `${size}px`,
      color: colour,
    });

    // The old HUD was one debug string — time, level, kills, entity count and
    // an fps counter, comma-spliced. Structured now: bars in a plate top-left,
    // the clock alone top-centre (it is the act's real antagonist), counts
    // right-aligned top-right. The fps counter is dev-only; a frame counter in
    // a shipped HUD is the single fastest way to say "unfinished".
    this.hudLevel = this.add.text(20, 12, '', style(13, '#D2C6AC')).setScrollFactor(0).setDepth(100);
    this.hudClock = this.add
      .text(cam.width / 2, 12, '', {
        ...style(24, '#EFE7D6'),
        letterSpacing: 3,
      })
      .setOrigin(0.5, 0)
      .setScrollFactor(0)
      .setDepth(100);
    this.hudRight = this.add
      .text(cam.width - 16, 12, '', style(15, '#EFE7D6'))
      .setOrigin(1, 0)
      .setScrollFactor(0)
      .setDepth(100);
    // Right-aligned: on an upright phone's canvas it breaks onto lines (wornText).
    this.hudDrag = this.add
      .text(cam.width - 16, 34, '', { ...style(13, '#D2C6AC'), align: 'right' })
      .setOrigin(1, 0)
      .setScrollFactor(0)
      .setDepth(100);
    this.hudBossLabel = this.add
      .text(cam.width / 2, 50, '', style(12, '#D2C6AC'))
      .setOrigin(0.5, 0)
      .setScrollFactor(0)
      .setDepth(100)
      .setVisible(false);
    this.hudRaceLabel = this.add
      .text(cam.width / 2, 86, 'someone else', style(10, '#D2C6AC'))
      .setOrigin(0.5, 0)
      .setScrollFactor(0)
      .setDepth(100)
      .setVisible(false);
    this.bars = this.add.graphics().setScrollFactor(0).setDepth(100);

    this.endScrim = this.add
      .rectangle(cam.width / 2, cam.height / 2, cam.width, cam.height, INK, 0.45)
      .setScrollFactor(0)
      .setDepth(199)
      .setVisible(false);
    this.pauseNote = this.add
      .text(cam.width / 2, cam.height / 2, '', {
        ...style(20, '#EFE7D6'),
        align: 'center',
        lineSpacing: 8,
      })
      .setOrigin(0.5)
      .setScrollFactor(0)
      .setDepth(200)
      .setVisible(false);
    // Placed by showCertificate, which owns the sheet's geometry; above the
    // form's container (200), which is built after it.
    this.overlay = this.add
      .text(0, 0, '', { ...style(18, CERT_INK), lineSpacing: 6 })
      .setScrollFactor(0)
      .setDepth(201)
      .setVisible(false);
    // A restart destroys the old sheet with the display list; forget it.
    delete this.form;
    this.devBadge = this.add
      .text(cam.width - 14, 58, 'DEV · RUN TAINTED', {
        ...style(13, '#EFE7D6'),
        backgroundColor: '#2A2521',
        padding: { x: 7, y: 3 },
      })
      .setOrigin(1, 0)
      .setScrollFactor(0)
      .setDepth(210)
      .setVisible(false);
  }

  override update(_time: number, deltaMs: number): void {
    if (this.paused) {
      this.syncArrivals();
      this.drawHud();
      return;
    }
    // The act's document holds the scene's steps, as the pause does, so the
    // next act does not begin behind a piece of paper. The rules are untouched.
    if (this.paper) {
      if (this.time.now < this.paperUntil) return;
      this.hideDocument();
    }

    // Clamp: a stalled tab must not teleport the horde.
    const dt = Math.min(deltaMs, 50) / 1000;

    const left = this.cursors.left.isDown || this.wasd.A.isDown;
    const right = this.cursors.right.isDown || this.wasd.D.isDown;
    const up = this.cursors.up.isDown || this.wasd.W.isDown;
    const down = this.cursors.down.isDown || this.wasd.S.isDown;
    const input = combineMoves(
      {
        moveX: (right ? 1 : 0) - (left ? 1 : 0),
        moveY: (down ? 1 : 0) - (up ? 1 : 0),
      },
      this.stickMove,
    );

    // Fast-forward runs whole extra steps rather than a longer one: a 4x dt
    // would be a 200ms step, and things that move at 640px/s tunnel straight
    // through a 15px enemy at that size.
    const scale = this.dev.timeScale;
    if (scale >= 1) for (let i = 0; i < Math.round(scale); i++) this.stepWorld(dt, input);
    else this.stepWorld(dt * scale, input);

    this.applyDevCheats();
    if (this.world.actIndex !== this.shownAct) this.crossThreshold();

    const over = this.world.dead || this.world.won;
    if (over && this.endedAt < 0) {
      this.endedAt = this.time.now;
      this.releaseStick();
      // The ancestor log and the input log (src/meta): once per life, outside
      // World. Not for a tainted run: a cheated life is not an ancestor, and
      // under a time scale every hold is multiplied, so its log is not a
      // person's number. The HUD said DEV · RUN TAINTED the whole way.
      if (!this.dev.tainted) {
        if (this.world.certificate) recordLife(this.world.certificate, this.playerName);
        try {
          localStorage.setItem(INPUT_LOG_KEY, JSON.stringify(this.inputLog.toJSON()));
        } catch {
          // Absent or blocked storage: the measurement is lost, the game is not.
        }
      }
    }
    // Pause refuses during offers and after the run, so the button hides then.
    this.pauseButton?.setVisible(!over && !this.world.offers);

    this.hearWorld();
    this.syncArrivals();
    this.syncPlayer();
    this.syncEnemies();
    this.syncMarks();
    this.syncProjectiles();
    this.syncGems();
    this.syncRings();
    this.syncAreas();
    this.syncHolds();
    this.syncOrbiters();
    this.syncAuras();
    this.syncSweeps();
    this.syncBoss();
    this.syncAttached();
    this.drawHud();
  }

  /**
   * One sim step, and the same input into the log — but only if the world
   * took the step. It ignores input while an offer is open and after the run;
   * a key held through a card choice is not a heading held in play.
   */
  private stepWorld(dt: number, input: Input): void {
    const before = this.world.time;
    this.world.step(dt, input);
    if (this.world.time > before) this.inputLog.record(dt, input);
  }

  /** Reads what changed this frame and gives it a sound. */
  private hearWorld(): void {
    const w = this.world;
    const h = this.heard;
    if (w.kills > h.kills) sfx.kill();
    // XP rises only on pickup; it falls at a level-up, which is not a pickup.
    if (w.xp > h.xp && w.level === h.level) sfx.gem();
    if (w.hp < h.hp - 0.01) {
      sfx.hurt();
      // Three pixels for ninety milliseconds. Feedback, not an earthquake.
      this.cameras.main.shake(90, 0.0035);
    }
    // Every stack worn, not only the ones that drag, read per def off
    // `wornBy`: a ping pings (OFFICE-ROSTER §3.3), and anything else worn —
    // an antibody, acne, a tuition invoice carried into The Office — stamps.
    // A frame that wore both plays both, once each; one puff either way.
    const gained = wornGained(w.wornBy, h.worn);
    if (gained.length > 0) {
      if (gained.includes('ping')) sfx.ping();
      if (gained.some((id) => id !== 'ping')) sfx.attach();
      this.spawnPuff(w.x, w.y);
    }
    if (!!w.offers && !h.offers) sfx.offer();
    if (w.boss && !h.boss) sfx.bossSpawn();
    // A rival got there. The Egg flinches; the bar under its name moves.
    if (w.boss && w.raceAbsorbed > h.raced) this.spawnPuff(w.boss.x, w.boss.y);
    // Hostile shots fired since last frame: every projectile's serial comes
    // off one monotonic counter, so a hostile serial above the highest heard
    // is new. No owner is the boss's; an owner is the ranged enemy that fired
    // it (the substitute). At most one of each sound per frame — a volley is
    // five shots. This replaced `life > 3.9`, which was "an Egg shot just
    // appeared" and so could never hear a shot that lives 3.2s.
    let shot = h.shot;
    let bossFired = false;
    // Which ranged enemies fired: each has its own sound, because the
    // substitute's ah-hem on a group chat's notification is the wrong joke.
    const firedBy = new Set<string>();
    for (const p of w.projectiles) {
      if (!p.hostile || p.serial <= h.shot) continue;
      if (p.owner) firedBy.add(p.owner.id);
      else bossFired = true;
      shot = Math.max(shot, p.serial);
    }
    if (bossFired) sfx.bossShot();
    if (firedBy.has('group-chat')) sfx.notification();
    if (firedBy.has('substitute-teacher')) sfx.substituteShot();
    // Any ranged enemy nobody has given a voice yet borrows the substitute's.
    // The registrar has one (its stamp, under the gate with College's below);
    // the phone's is its ring on the consult (Family, below), and its HELLO?
    // lands without an ah-hem after it.
    for (const id of firedBy) if (id !== 'group-chat' && id !== 'substitute-teacher' && id !== 'registrar' && id !== 'phone-call') sfx.substituteShot();
    // The Gym Teacher's whistle (SCHOOL-ROSTER §9): rising on the telegraph,
    // one long blow on the exit. Read off the phase edge like everything else;
    // the Egg's phases make no sound of their own.
    const bossPhase = w.boss?.phase ?? '';
    if (w.boss?.kind === 'gym-teacher' && bossPhase !== h.bossPhase) {
      if (bossPhase === 'telegraph') sfx.whistle();
      else if (bossPhase === 'absorbing') sfx.whistle(true);
    }
    // Prom's telegraph is the lights going down (ADOLESCENCE-ROSTER §4): the slow
    // song, on the edge into it. String(): typechecks before and after 'prom' joins BossDef['kind'].
    if (String(w.boss?.kind) === 'prom' && bossPhase === 'telegraph' && h.bossPhase !== 'telegraph') sfx.slowSong();
    // The Reorg (OFFICE-ROSTER §4): the memo drafted is its telegraph, on the
    // same edge (the column itself fires on `bossShot`). A meeting closing
    // round the player — the schedule's, or a restructure's — is the chairs,
    // once however it was seen: the hold arriving and the count rising land
    // on one frame, and at the spawn cap a restructure seats no hold at all.
    if (memoDrafted(w.boss, h.bossPhase)) sfx.memo();
    if (meetingCloses(w.holds, w.boss, h)) sfx.chairs();
    // The Mortgage (FAMILY-ROSTER §4): the statement drafted is its telegraph,
    // the letterbox in its door, on the edge (DUE fires on `bossShot`); a
    // window paid is `paid` rising, the till, once a window at most. A missed
    // window sends a bill from the door, and the doorbell below hears that.
    if (statementDrafted(w.boss, h.bossPhase)) sfx.statement();
    const paid = w.boss?.paid ?? 0;
    if (instalmentPaid(w.boss, h.paid)) sfx.ding();
    // The hall monitor's stop, on its leading edge. A touch during a running
    // stun refreshes it without an edge, and stays silent.
    if (w.stunTimer > 0 && h.stun <= 0) sfx.stun();
    // A homework pile that actually landed: uids are monotonic, and paper
    // that lands on a pile merges into it without a uid of its own, so a
    // growing pile is heard once, when it first arrives. One per frame.
    let homework = h.homework;
    for (const e of w.enemies) if (e.def.id === 'homework' && e.uid > homework) homework = e.uid;
    if (homework > h.homework) sfx.homeworkLand();
    // Adolescence (§3.5, §3.2). A consult starting is the number of group chats
    // typing rising; a car entering is a drivers-ed uid above the highest heard,
    // as homework's is. One of each per frame. College's deadline (§3.2) is
    // driver's ed without the wheels and arrives on the same engine; its
    // registrars consulting are counted here and rung under the gate below.
    // The Office's commute (§3.2) enters on that engine too and shares the
    // counter, but it is a train: `vehiclesEntered` names each arrival's own
    // sound, so a commute is the carriage and never also a car.
    let typing = 0;
    let bell = 0;
    for (const e of w.enemies) {
      if (e.def.id === 'group-chat' && e.consult > 0) typing++;
      else if (e.def.id === 'registrar' && e.consult > 0) bell++;
    }
    if (typing > h.typing) sfx.typing();
    const vehicles = vehiclesEntered(w.enemies, h.car);
    const car = vehicles.highest;
    if (vehicles.sounds.has('carPass')) sfx.carPass();
    if (vehicles.sounds.has('carriage')) sfx.carriage();
    // Family (§3.2): the flat-pack crosses on that engine as well and shares
    // the counter; its arrival is the tape torn off the box, never a car.
    if (vehicles.sounds.has('tape')) sfx.tape();
    // Family (§6): a bill arriving is the doorbell — a bill uid above the
    // highest heard, a late fee's included, one ring a frame. The phone
    // consulting is the ring, the number consulting rising as the group
    // chat's typing is. The toddler taking hold is the squeak: the hold's
    // clock rising, and the one holding is a toddler — a white cell's or a
    // standardised test's hold rises the same clock and stays silent.
    const bill = newestAbove(w.enemies, 'bill', h.bill);
    if (bill > h.bill) sfx.doorbell();
    const ringing = consulting(w.enemies, 'phone-call');
    if (ringing > h.ringing) sfx.ring();
    if (holdTaken(w, h.engulf) === 'toddler') sfx.squeak();
    // G-044's three weapons. Unlike the counters above, their state sits still
    // while the world does (a card up, the run over), so an arc or a landed
    // bolt read off a held world would sound every frame. They hear only the
    // world time this frame's steps covered, and nothing while an offer is
    // open or the life is done.
    const elapsed = w.time - h.time;
    const live = elapsed > 0 && !w.offers && !w.dead && !w.won;
    let auraAt = h.auraAt;
    if (live) {
      // Backhand: arcs are aged before the swing (updateSweeps runs first), so
      // one swung on this frame's step reads 0 and one from the frame before
      // reads a whole step; half the frame's world time splits them with room
      // for float. One swish however many arcs swung.
      if (w.sweeps.some((s) => s.age < elapsed / 2)) sfx.sweep();
      // Judgement: the landing, never the telegraph. A strike holds `delay`
      // above zero while it comes, then 0 with `age` counting from the moment
      // it landed, so an age inside this frame's world time landed this frame.
      if (w.areas.some((a) => a.delay === 0 && a.age < elapsed)) sfx.gavel();
      // Personal Space: a tap at most every 0.6s of world time while anything
      // stands in a ring — a throttle, not a count of hits. The sim's
      // per-enemy re-hit map is private, so this is the renderer's honest
      // approximation: its reach test (centre within ring plus body), skipping
      // what it skips, on end-of-step positions.
      if (w.auras.length > 0 && w.time - auraAt >= 0.6) {
        const b = w.boss;
        let inside = false;
        for (const a of w.auras) {
          if (b && b.phase !== 'absorbing' && (b.x - a.x) ** 2 + (b.y - a.y) ** 2 <= (a.radius + BOSS_RADIUS) ** 2) inside = true;
          for (let i = 0; !inside && i < w.enemies.length; i++) {
            const e = w.enemies[i]!;
            if (e.def.invulnerable || e.hp <= 0) continue;
            const r = a.radius + e.radius;
            inside = (e.x - a.x) ** 2 + (e.y - a.y) ** 2 <= r * r;
          }
          if (inside) break;
        }
        if (inside) {
          sfx.auraTick();
          auraAt = w.time;
        }
      }
    }
    // College (COLLEGE-ROSTER §3.5, §4), under the same gate, so a frame that
    // opened a card or ended the life says only that. The registrar's bell is
    // the number consulting rising, as the group chat's typing is; its HOLD is
    // stamped on the post. The Loan's interest clock counts down and wraps UP
    // when the balance compounds, so a rise since last frame is the tape
    // advancing; `h.boss` keeps the clock appearing at spawn from sounding.
    if (live) {
      if (bell > h.bell) sfx.bell();
      if (firedBy.has('registrar')) sfx.stamp();
      if (w.boss?.kind === 'loan' && h.boss && w.boss.interestIn > h.interestIn) sfx.tapeTick();
    }
    if (w.dead && !h.dead) sfx.death();
    if (w.won && !h.won) sfx.win();
    this.heard = {
      kills: w.kills,
      hp: w.hp,
      // Copied every frame, falls included: a crossing that takes three pings
      // off must leave the next ping above what was heard.
      worn: new Map(w.wornBy),
      offers: !!w.offers,
      boss: !!w.boss,
      dead: w.dead,
      won: w.won,
      xp: w.xp,
      level: w.level,
      raced: w.raceAbsorbed,
      shot,
      homework,
      stun: w.stunTimer,
      bossPhase,
      typing,
      car,
      bell,
      interestIn: w.boss?.interestIn ?? 0,
      time: w.time,
      auraAt,
      holds: w.holds.slice(),
      restructures: w.boss?.restructures ?? 0,
      bill,
      ringing,
      // Copied every frame, the countdown included, so only a new hold rises.
      engulf: w.engulfTimer,
      paid,
    };
  }

  /**
   * The cheats, applied after the step rather than inside it.
   *
   * None of this is reachable from `World`, so no bot run and no test can be
   * affected by it — which is the point of doing it here.
   */
  private applyDevCheats(): void {
    if (!import.meta.env.DEV) return;
    const w = this.world;
    if (this.dev.god) {
      w.hp = w.maxHp;
      w.invulnerable = Math.max(w.invulnerable, 0.5);
      w.engulfTimer = 0;
      w.dead = false;
    }
    // The tax comes off with the drag (AUDIT 42): zeroing `dragStacks` alone
    // left the HUD reading `xp −8%` with nothing worn.
    if (this.dev.noDrag) w.shedWornStacks();
    if (this.dev.emptyField) w.enemies.length = 0;
  }

  private syncPlayer(): void {
    this.player.setPosition(this.world.x, this.world.y);
    if (this.world.facingX !== 0) this.player.setFlipX(this.world.facingX < 0);
    this.player.setAlpha(this.world.invulnerable > 0 ? 0.55 : 1);
    // Stopped dead by the hall monitor (§3.4): flattened, wiggle held, for as
    // long as the stun runs. Shape, not tint (G-032). Absolute size every
    // frame, so it springs back the frame the stun ends.
    const stun = this.world.stunTimer > 0 ? 0.14 : 0;
    // Growth Spurt: drawn as wide as it collides. Everyone can see you.
    const grown = this.world.playerRadius / PLAYER_RADIUS;
    // Held (`HOLD_GRAB`): the timer rising between two frames is a new hold,
    // and the grab rings down from it; while the hold runs the swim slows to
    // its share of speed (the toddler's 0.3), so being held reads without a
    // hit to show it.
    const held = this.world.engulfTimer > 0;
    if (this.world.engulfTimer > this.heldFor) this.grabAt = this.world.time;
    this.heldFor = this.world.engulfTimer;
    const grabbed = this.world.time - this.grabAt;
    const grab =
      grabbed >= 0 && grabbed < HOLD_GRAB_SECONDS ? HOLD_GRAB * Math.exp(-grabbed * 10) * Math.cos(grabbed * 30) : 0;
    this.player.setDisplaySize(
      PLAYER_DISPLAY * grown * (1 + stun + grab),
      PLAYER_DISPLAY * grown * (1 - stun - grab),
    );
    // The swim: quick small wiggle. It is the player character in an act
    // where the whole field is alive; a rigid sprite reads as a cursor. Its
    // phase follows the world clock (a held world holds it still), slowed by
    // a hold as the walk is.
    this.swimPhase += Math.max(0, this.world.time - this.swimAt) * 9 * (held ? this.world.engulfSlow : 1);
    this.swimAt = this.world.time;
    this.player.setRotation(stun ? 0 : Math.sin(this.swimPhase) * 0.09);

    // Passive cues (G-036): the invisible items get a presence. Membrane is a
    // ring — you can see the thicker skin. Midpiece is motion streaks behind
    // the heading. Capacitation stays invisible on purpose: it is the late
    // bloomer, and not showing yet is its whole joke.
    const w = this.world;
    this.playerFx.clear();
    const membrane = w.items.get('membrane') ?? 0;
    if (membrane > 0) {
      this.playerFx
        .lineStyle(2 + membrane, UI_FILL, 0.14 + membrane * 0.04)
        .strokeCircle(w.x, w.y, (33 + membrane) * grown);
    }
    const midpiece = w.items.get('midpiece') ?? 0;
    if (midpiece > 0 && (w.facingX !== 0 || w.facingY !== 0)) {
      const bx = -w.facingX;
      const by = -w.facingY;
      for (let k = 1; k <= Math.min(3, midpiece); k++) {
        const d = 26 + k * 11;
        this.playerFx
          .lineStyle(3, PAPER, 0.16 - k * 0.035)
          .lineBetween(
            w.x + bx * d - by * 7,
            w.y + by * d + bx * 7,
            w.x + bx * (d + 12) - by * 7,
            w.y + by * (d + 12) + bx * 7,
          )
          .lineBetween(
            w.x + bx * d + by * 7,
            w.y + by * d - bx * 7,
            w.x + bx * (d + 12) + by * 7,
            w.y + by * (d + 12) - bx * 7,
          );
      }
    }
  }

  /** Grows a sprite pool to match a world array, hiding the surplus. */
  private fit<T extends Phaser.GameObjects.GameObject>(
    pool: T[],
    needed: number,
    make: () => T,
  ): void {
    while (pool.length < needed) pool.push(make());
    for (let i = needed; i < pool.length; i++) {
      (pool[i] as unknown as { setVisible(v: boolean): void }).setVisible(false);
    }
  }

  private syncEnemies(): void {
    const w = this.world;
    const list: EnemyState[] = w.enemies;
    this.fit(this.enemySprites, list.length, () =>
      this.add.image(0, 0, this.visuals.atlas.key).setDepth(5),
    );
    // A hold (FAMILY-ROSTER §3.4): the toddler, 44px against the player's
    // 56, walks onto the player's centre and would be drawn under them for
    // the whole hold. So while a hold runs, the body holding the player
    // (`World.heldBy`, the one the sim chose at the touch), if it is drawn
    // smaller than them, draws in front of them: the bib at the leg. A
    // second toddler touching them waits its turn under them (AUDIT 81). A
    // larger holder (the white cell) already shows round the player and
    // stays under.
    const holder = w.heldBy;
    const front = holder ? PLAYER_DISPLAY * (w.playerRadius / PLAYER_RADIUS) : 0;
    for (let i = 0; i < list.length; i++) {
      const e = list[i]!;
      const s = this.enemySprites[i]!;
      const holding = e === holder && e.displaySize < front;
      // Only on a change: a depth set queues a sort of the whole display list.
      const depth = holding ? HOLDER_DEPTH : 5;
      if (s.depth !== depth) s.setDepth(depth);
      // G-032: no render tint. The sprite arrives in its final colours and
      // CHECK enforces the value ceiling, because a GPU multiply is invisible
      // to every check in the pipeline and was putting every enemy off-palette
      // by three times the tolerance at draw time.
      //
      // Hit feedback is value, not tint — law 10's own wording, and the same
      // reason the player dims rather than flashing red.
      s.setTexture(this.visuals.atlas.key, e.def.frame)
        .setPosition(e.x, e.y)
        .setDisplaySize(e.displaySize, e.displaySize)
        .setAlpha(e.hitFlash > 0 ? 0.55 : 1)
        .setVisible(true);
      // Reset the flip for non-chasers: pooled sprites inherit state from
      // whatever used the slot last frame, and a drifting antibody was
      // arriving pre-flipped by a dead rival.
      s.setFlipX(e.def.movement === 'chase' ? this.world.x < e.x : false);
      // Ambient motion — the art direction promised tween-driven life
      // (squash, bob, rotate) and until this pass nothing in the field moved
      // except positions, which is most of what read as unfinished. Driven
      // from the world clock and the enemy's uid, so pooled sprites need no
      // per-sprite state and a paused world holds still.
      const t = this.world.time;
      const ph = (e.uid % 61) * 0.618;
      switch (e.def.id) {
        case 'rival-sperm':
          s.setRotation(Math.sin(t * 7 + ph) * 0.1);
          break;
        case 'antibody':
          s.setRotation(t * 0.5 + ph);
          break;
        case 'spermicide': {
          s.setRotation(Math.sin(t * 0.9 + ph) * 0.1);
          const pulse = Math.sin(t * 2.2 + ph) * 0.045;
          s.setScale(s.scaleX * (1 + pulse), s.scaleY * (1 - pulse));
          break;
        }
        case 'white-cell': {
          s.setRotation(Math.sin(t * 0.7 + ph) * 0.06);
          const pulse = Math.sin(t * 1.4 + ph) * 0.02;
          s.setScale(s.scaleX * (1 + pulse), s.scaleY * (1 - pulse));
          break;
        }
        case 'drivers-ed':
        case 'deadline':
        case 'commute': {
          // A vehicle has a front (AUDIT part five): the car is drawn side-on
          // facing right, so it turns to its `cross` heading, and one driving
          // left flips and rotates by the remainder so the roof stays up.
          // Gated on the id, not on `cross`, because no per-def visual flag
          // exists and the other crossers have no front in this game's
          // drawing: the dodgeball and white cell are round, and the hall
          // monitor and substitute are people, who would walk left on their
          // heads. The deadline (COLLEGE-ROSTER §3.2) is driver's ed without
          // the wheels, a leaf in flight, so it leads with its edge the same
          // way and its curl stays up. The commute (OFFICE-ROSTER §3.2) is
          // the carriage drawn side-on facing right, its face in the front
          // window looking along the track: a third, and still no flag.
          const a = Math.atan2(e.vy, e.vx);
          const left = Math.abs(a) > Math.PI / 2;
          s.setFlipX(left).setRotation(left ? a - Math.PI : a);
          break;
        }
        default:
          s.setRotation(Math.sin(t * 2 + ph) * 0.08);
      }
    }
  }

  /**
   * The Highlighter's marks (College): a bone band with a rose edge
   * (`MARK_BONE`, `MARK_ROSE`) at the foot of every enemy whose mark is still
   * running on the world's clock, and of the boss, fading over its last
   * `MARK_FADE` seconds. Before this a mark changed what every hit was worth
   * and nothing on screen said which things were marked. Read off the
   * target's own `markedUntil` (the boss carries the same field, which
   * `bossTakes` pays); a mark past its time is not drawn, as the sim does not
   * read it. An enemy's band is sized by its body as drawn and lies over the
   * foot of its sprite, so the hit that marks it, which dims the sprite, does
   * not dim the band (AUDIT 123). The boss's is sized by its round body (the
   * sim's) and lies under its drawing, tucked under the foot of its frame
   * (`bossBody`): a band at its body's foot, as an enemy's is, sat under the
   * Loan's base and did not show. `markFx`'s depth sits between the two.
   */
  private syncMarks(): void {
    const w = this.world;
    this.markFx.clear();
    for (const e of w.enemies) {
      const size = e.displaySize;
      const height = Phaser.Math.Clamp(size * MARK_BAND.height, MARK_BAND.min, MARK_BAND.max);
      this.markBand(e.markedUntil, e.x, e.y + size * MARK_BAND.at, size * MARK_BAND.width, height);
    }
    const b = w.boss;
    if (b) {
      const body = this.visuals.bossBody ?? { cy: 0.5, r: 0.5 };
      const foot = (BOSS_RADIUS / body.r) * (1 - body.cy);
      const height = MARK_BAND.max;
      const y = b.y + foot + height / 2 - MARK_BAND.tuck;
      this.markBand(b.markedUntil, b.x, y, BOSS_RADIUS * 2 * MARK_BAND.width, height);
    }
  }

  /** One mark's band, `width` × `height` px centred on (x, y), while `until` is ahead of the clock. */
  private markBand(until: number | undefined, x: number, y: number, width: number, height: number): void {
    if (until === undefined) return;
    const left = until - this.world.time;
    if (!(left > 0)) return;
    const alpha = Math.min(1, left / MARK_FADE);
    const top = y - height / 2;
    this.markFx
      .fillStyle(MARK_BONE, 0.9 * alpha)
      .fillRect(x - width / 2, top, width, height)
      .lineStyle(MARK_BAND.edge, MARK_ROSE, alpha)
      .strokeRect(x - width / 2, top, width, height);
  }

  private syncProjectiles(): void {
    const list: ProjectileState[] = this.world.projectiles;
    // The weapon IS the object (G-036): Lash fires the manicule — a little
    // pointing hand flying at whatever is nearest — and Motility fires the
    // paper dart. The card icon and the field effect are the same drawing, so
    // a weapon chosen on a card is recognised the first time it fires. G-031
    // unchanged: hostile gold stays on aimed shots — the Egg's and the
    // substitute's — and nothing else.
    //
    // The substitute's shot is the player's name, spelled wrong (SCHOOL-ROSTER
    // §3.5): text in the HUD's hand, in the ranged gold, upright so it reads.
    // The shot's serial picks the mistake, so one shot keeps its spelling for
    // its whole flight and the next one gets it wrong differently.
    //
    // The registrar's form is the one word HOLD (COLLEGE-ROSTER §3.5), in the
    // same hand and the same pool: the aimed thing is not a hit but a hold.
    // The review's rating is the one word MEETS (OFFICE-ROSTER §3.5): the
    // number about the player, and the level bar slipping when it lands.
    // The phone's call is HELLO? (FAMILY-ROSTER §3.5): it wants nothing but
    // you, over there. The Mortgage's statement is DUE (§4): the boss's shot,
    // keyed on its kind. The Reorg's memo has no word, so it is the Egg's
    // hostile dot. The insurance form's decision is DENIED (DECLINE-ROSTER
    // §3.5): the aimed thing decides what you are covered for.
    this.fit(this.projectileSprites, list.length, () => this.add.image(0, 0, 'nc-shot').setDepth(8));
    let named = 0;
    for (const p of list) if (this.shotWord(p) !== undefined) named++;
    this.fit(this.nameShotTexts, named, () =>
      this.add
        .text(0, 0, '', {
          fontFamily: 'monospace',
          fontSize: '14px',
          color: '#D69A3C',
          stroke: '#2A2521',
          strokeThickness: 3,
        })
        .setOrigin(0.5)
        .setDepth(8),
    );
    named = 0;
    for (let i = 0; i < list.length; i++) {
      const p = list[i]!;
      const s = this.projectileSprites[i]!;
      const heading = Math.atan2(p.vy, p.vx);
      const word = this.shotWord(p);
      if (word !== undefined) {
        this.nameShotTexts[named++]!.setText(word).setPosition(p.x, p.y).setVisible(true);
        s.setVisible(false);
        continue;
      }
      if (p.hostile) {
        s.setTexture('nc-shot-hostile').setDisplaySize(p.radius * 2, p.radius * 2).setRotation(0);
      } else if (p.source && ITEMS[p.source]) {
        // Any item's shot is its card's icon: the manicule, the dart, the
        // three joined dots of Gossip.
        const def = ITEMS[p.source]!;
        const [key, frame] = this.iconTexture(def.icon, def.name);
        const size = isActive(def) && def.mode === 'line' ? 42 * (p.radius / def.radius) : 30;
        s.setTexture(key, frame).setDisplaySize(size, size).setRotation(heading);
      } else {
        s.setTexture('nc-shot')
          .setDisplaySize(p.radius * 3.2, p.radius * 1.3)
          .setRotation(heading);
      }
      s.setPosition(p.x, p.y).setVisible(true);
    }
  }

  /**
   * The word a hostile shot is drawn as, or undefined for the gold dot. An
   * enemy's shot by its owner's id (`SHOT_WORDS`; the substitute's is the
   * name, misspelled by the shot's serial so one shot keeps its spelling); the
   * boss's, which has no owner, by the act's boss kind (`BOSS_SHOT_WORDS`).
   */
  private shotWord(p: ProjectileState): string | undefined {
    if (!p.hostile) return undefined;
    const owner = p.owner?.id;
    if (owner === undefined) return BOSS_SHOT_WORDS[this.world.act.boss.kind];
    if (!WORDED_SHOTS.has(owner)) return undefined;
    return SHOT_WORDS[owner] ?? misspell(this.playerName, p.serial);
  }

  private syncGems(): void {
    const list: GemState[] = this.world.gems;
    // Law 11 wrote the pickup silhouette down as a LOZENGE, and until this
    // pass the renderer drew circles — the art bible said one thing and the
    // screen said another. Law 10 / G-030 give it the act's light tone.
    this.fit(this.gemSprites, list.length, () =>
      this.add.image(0, 0, this.gemKey).setDisplaySize(GEM_SIZE * 1.7, GEM_SIZE * 2.1).setDepth(3),
    );
    // Kill feedback: a gem appearing IS a death, so the ripple keys off the
    // gems the world just added rather than needing the sim to emit events.
    for (let i = this.prevGemCount; i < list.length; i++) {
      this.spawnPuff(list[i]!.x, list[i]!.y);
    }
    this.prevGemCount = list.length;
    const t = this.world.time;
    for (let i = 0; i < list.length; i++) {
      const g = this.gemSprites[i]!;
      g.setPosition(list[i]!.x, list[i]!.y).setVisible(true);
      // A slow one-by-one glimmer, phase-spread so the field never pulses in
      // unison. ABSOLUTE size each frame — multiplying the current scale
      // compounds it, and a gem became a screen-height beam in about a second.
      g.setDisplaySize(GEM_SIZE * 1.7, GEM_SIZE * 2.1 * (1 + 0.08 * Math.sin(t * 2.1 + i * 1.7)));
    }
  }

  /** A small expanding ring. Kills, attaches — anything that ends. */
  private spawnPuff(x: number, y: number): void {
    let a = this.puffs.find((c) => !c.visible);
    if (!a) {
      a = this.add.circle(0, 0, 8).setDepth(7);
      this.puffs.push(a);
    }
    a.setPosition(x, y).setRadius(7).setFillStyle().setStrokeStyle(3, UI_FILL, 0.5).setVisible(true);
    this.tweens.add({
      targets: a,
      radius: 22,
      alpha: 0,
      duration: 190,
      ease: 'Quad.easeOut',
      onComplete: () => {
        a!.setVisible(false).setAlpha(1);
      },
    });
  }

  private syncRings(): void {
    const list = this.world.rings;
    this.fit(this.ringSprites, list.length, () =>
      this.add.circle(0, 0, 10).setFillStyle().setDepth(4),
    );
    for (let i = 0; i < list.length; i++) {
      const r = list[i]!;
      const t = r.age / r.seconds;
      this.ringSprites[i]!.setPosition(r.x, r.y)
        .setRadius(Math.max(1, r.maxRadius * t))
        .setStrokeStyle(6, THREAT_CONTACT, 1 - t)
        .setVisible(true);
    }
  }

  /**
   * Area effects, each wearing its own card's art (G-036).
   *
   * An AreaState says what it is without a source tag: an attractor is
   * `pull`, Wake's trail ticks, Acrosome's burst does not. Three different
   * objects on screen — a starburst pop, footprints, the classroom magnet —
   * instead of three faint circles.
   */
  private syncAreas(): void {
    const list = this.world.areas;
    this.fit(this.areaSprites, list.length, () => this.add.circle(0, 0, 10).setDepth(2));
    this.fit(this.areaIcons, list.length, () => this.add.image(0, 0, 'nc-shot').setDepth(4));

    // Wake stamps point along the path, so each needs the NEXT footprint to
    // aim at. Collect the trail's indices once; the newest aims at the player.
    const wakeOrder: number[] = [];
    for (let i = 0; i < list.length; i++) {
      const a = list[i]!;
      if (a.tick && !a.pull && a.damage > 0) wakeOrder.push(i);
    }
    const wakeNext = new Map<number, { x: number; y: number }>();
    const wakeStride = new Map<number, number>();
    for (let k = 0; k < wakeOrder.length; k++) {
      const here = list[wakeOrder[k]!]!;
      const next = k + 1 < wakeOrder.length ? list[wakeOrder[k + 1]!]! : this.world;
      wakeNext.set(wakeOrder[k]!, { x: next.x - here.x, y: next.y - here.y });
      wakeStride.set(wakeOrder[k]!, k);
    }

    for (let i = 0; i < list.length; i++) {
      const a = list[i]!;
      const fade = 1 - a.age / a.seconds;
      const circle = this.areaSprites[i]!;
      const icon = this.areaIcons[i]!;

      if (a.delay !== undefined) {
        // Judgement (G-044): while it is coming, a ring closes on the spot
        // from twice its radius to its honest one and the card's icon comes
        // down onto it; on landing, a flash at the radius it hurts in with
        // the icon on the point. Checked first: a landed strike is one-shot
        // and would otherwise draw as Temper's starburst. The fraction is of
        // the strike's own wait (`telegraph`): read against Judgement's
        // STRIKE_DELAY, the Letter's five seconds would open the ring at
        // over a dozen times its radius with the icon off the top of the
        // screen. Clamped, so a wait nobody set still draws on the mark.
        const def = a.source ? ITEMS[a.source] : undefined;
        const [key, frame] = def ? this.iconTexture(def.icon, def.name) : ['nc-shot', undefined];
        if (a.delay > 0) {
          const t = Phaser.Math.Clamp(1 - a.delay / (a.telegraph ?? STRIKE_DELAY), 0, 1);
          circle
            .setPosition(a.x, a.y)
            .setRadius(a.radius * (2 - t))
            .setFillStyle()
            .setStrokeStyle(2, BONE, 0.35 + 0.45 * t)
            .setVisible(true);
          icon
            .setTexture(key, frame)
            .setPosition(a.x, a.y - 60 * (1 - t))
            .setDisplaySize(36, 36)
            .setRotation(0)
            .setFlipX(false)
            .setAlpha(0.5 + 0.5 * t)
            .setVisible(true);
        } else {
          circle
            .setPosition(a.x, a.y)
            .setRadius(a.radius)
            .setFillStyle(PAPER, 0.2 * fade)
            .setStrokeStyle(2, BONE, 0.6 * fade)
            .setVisible(true);
          icon
            .setTexture(key, frame)
            .setPosition(a.x, a.y)
            .setDisplaySize(40, 40)
            .setRotation(0)
            .setFlipX(false)
            .setAlpha(fade)
            .setVisible(true);
        }
      } else if (a.slow !== undefined && a.damage === 0) {
        // Snooze: the field it holds, drawn at its honest radius, with the
        // card's icon where it was dropped. Checked first: it ticks and does
        // not pull, which would otherwise draw it as Wake's footprints. Rut's
        // footprints hold too but hurt, so they fall through and draw as Wake's.
        const [key, frame] = this.iconTexture('slow', 'Snooze');
        circle
          .setPosition(a.x, a.y)
          .setRadius(a.radius)
          .setFillStyle(PAPER, 0.06 * fade)
          .setStrokeStyle(2, this.visuals.pickup, 0.3 * fade)
          .setVisible(true);
        icon
          .setTexture(key, frame)
          .setPosition(a.x, a.y)
          .setDisplaySize(40, 40)
          .setRotation(0)
          .setFlipX(false)
          .setAlpha(0.8 * fade)
          .setVisible(true);
      } else if (a.pull) {
        // Chemotaxis: the classroom magnet, planted where everything is
        // asked to go, with a ring contracting toward it. The fill stays as
        // the honest area of effect; law 10 keeps threat colours off it.
        circle
          .setPosition(a.x, a.y)
          .setRadius(a.radius * (1 - ((a.age * 0.9) % 1) * 0.85))
          .setFillStyle()
          .setStrokeStyle(2, this.visuals.pickup, 0.35 * fade)
          .setVisible(true);
        icon
          .setTexture(ITEM_ICON_ATLAS.key, itemIconFrame('pull'))
          .setPosition(a.x, a.y)
          .setDisplaySize(40, 40)
          .setRotation(0)
          .setFlipX(false)
          .setAlpha(0.9 * fade)
          .setVisible(true);
      } else if (a.tick) {
        // Wake: footprints. "Everything behind you regrets it" — the trail
        // is literally where you have walked, stamped left, right, left.
        // Every SECOND stamp: areas arrive every 0.18s (~34px apart at full
        // speed), and prints that dense merge into a caterpillar. Skipping
        // alternate ones gives a stride; the damage areas underneath are
        // unchanged, this is only what is drawn.
        const stride = wakeStride.get(i) ?? 0;
        const d = wakeNext.get(i);
        circle.setVisible(false);
        if (stride % 2 === 1) {
          icon.setVisible(false);
          continue;
        }
        icon
          .setTexture(ITEM_ICON_ATLAS.key, itemIconFrame('trail'))
          .setPosition(a.x, a.y)
          .setDisplaySize(26, 26)
          .setRotation(d ? Math.atan2(d.y, d.x) + Math.PI / 2 : 0)
          .setFlipX(stride % 4 === 0)
          .setAlpha(0.6 * fade)
          .setVisible(true);
      } else {
        // Acrosome: its own starburst, popping at full burst size and gone in
        // the same 0.12s the damage is.
        circle
          .setPosition(a.x, a.y)
          .setRadius(a.radius)
          .setFillStyle(PAPER, 0.12 * fade)
          .setStrokeStyle()
          .setVisible(true);
        icon
          .setTexture(ITEM_ICON_ATLAS.key, itemIconFrame('burst'))
          .setPosition(a.x, a.y)
          .setDisplaySize(a.radius * 1.7 * (0.85 + 0.3 * (a.age / a.seconds)), a.radius * 1.7 * (0.85 + 0.3 * (a.age / a.seconds)))
          .setRotation(0)
          .setFlipX(false)
          .setAlpha(0.75 * fade)
          .setVisible(true);
      }
    }
  }

  /**
   * Meetings (OFFICE-ROSTER §3.4): a ring at the radius the sim slows and
   * walls at, in the elite colour — it is the act's elite thing, and law 10
   * allows the threat colour on the threat — faint, with its fill fainter.
   * The meeting's own sprite is the ring of chairs, so its frame is drawn at
   * twice the live radius and the chairs sit on the edge as it closes. Until
   * the drawing lands in the act's atlas the ring is drawn alone.
   *
   * A hold the player put down (Calendar block, `owner: 'player'`) has no
   * enemy def behind it: it is drawn as Snooze's field is, a bone ring at the
   * radius it walls at, fading as it runs out, with the card's icon where it
   * was put. Never the elite purple: that is the meeting's.
   */
  private syncHolds(): void {
    const list = this.world.holds;
    const atlas = this.visuals.atlas.key;
    this.fit(this.holdRings, list.length, () => this.add.circle(0, 0, 10).setDepth(2));
    this.fit(this.holdChairs, list.length, () => this.add.image(0, 0, atlas).setDepth(3));
    for (let i = 0; i < list.length; i++) {
      const h = list[i]!;
      const item = h.owner === 'player' ? ITEMS[h.source] : undefined;
      if (item) {
        const fade = 1 - h.age / (h.seconds + h.holdSeconds);
        const [key, frame] = this.iconTexture(item.icon, item.name);
        this.holdRings[i]!.setPosition(h.x, h.y)
          .setRadius(h.radius)
          .setFillStyle(PAPER, 0.06 * fade)
          .setStrokeStyle(3, BONE, 0.25 + 0.4 * fade)
          .setVisible(true);
        this.holdChairs[i]!.setTexture(key, frame)
          .setPosition(h.x, h.y)
          .setDisplaySize(40, 40)
          .setAlpha(0.8 * fade)
          .setVisible(true);
        continue;
      }
      this.holdRings[i]!.setPosition(h.x, h.y)
        .setRadius(h.radius)
        .setFillStyle(THREAT_ELITE, 0.06)
        .setStrokeStyle(3, THREAT_ELITE, 0.4)
        .setVisible(true);
      const chairs = this.holdChairs[i]!;
      const frame = ENEMIES[h.source]?.frame;
      if (frame && this.textures.get(atlas).has(frame)) {
        chairs
          .setTexture(atlas, frame)
          .setPosition(h.x, h.y)
          .setDisplaySize(h.radius * 2, h.radius * 2)
          .setAlpha(1)
          .setVisible(true);
      } else {
        chairs.setVisible(false);
      }
    }
  }

  /** Grudge and anything else that circles: the item's own icon, turning. */
  private syncOrbiters(): void {
    const list = this.world.orbiters;
    this.fit(this.orbiterSprites, list.length, () => this.add.image(0, 0, 'nc-shot').setDepth(8));
    for (let i = 0; i < list.length; i++) {
      const o = list[i]!;
      const def = ITEMS[o.source];
      const [key, frame] = def ? this.iconTexture(def.icon, def.name) : ['nc-shot', undefined];
      this.orbiterSprites[i]!.setTexture(key, frame)
        .setPosition(o.x, o.y)
        .setDisplaySize(o.radius * 2.6, o.radius * 2.6)
        .setRotation(this.world.time * 2)
        .setVisible(true);
    }
  }

  /**
   * Personal Space and anything else that rings the player (G-044): the ring
   * at the radius the sim hurts in, faint, and the card's icon riding it like
   * a satellite. Under the player; bone and paper, never a threat colour (law
   * 10), and wider and fainter than Thick Skin's ring hugging the body.
   */
  private syncAuras(): void {
    const list = this.world.auras;
    this.fit(this.auraRings, list.length, () => this.add.circle(0, 0, 10).setDepth(2));
    this.fit(this.auraIcons, list.length, () => this.add.image(0, 0, 'nc-shot').setDepth(8));
    const t = this.world.time;
    for (let i = 0; i < list.length; i++) {
      const a = list[i]!;
      const def = ITEMS[a.source];
      this.auraRings[i]!.setPosition(a.x, a.y)
        .setRadius(a.radius)
        .setFillStyle(PAPER, 0.05)
        .setStrokeStyle(2, BONE, 0.3)
        .setVisible(true);
      const angle = t * 0.8 + (i * Math.PI * 2) / list.length;
      const [key, frame] = def ? this.iconTexture(def.icon, def.name) : ['nc-shot', undefined];
      this.auraIcons[i]!.setTexture(key, frame)
        .setPosition(a.x + Math.cos(angle) * a.radius, a.y + Math.sin(angle) * a.radius)
        .setDisplaySize(32, 32)
        .setRotation(0)
        .setAlpha(0.85)
        .setVisible(true);
    }
  }

  /**
   * Backhand's swings (G-044): each arc as a wedge at its honest reach and
   * width, fading over the moment it is drawn, with the card's icon crossing
   * it edge to edge — the swat. The hit was dealt on the step it swung.
   */
  private syncSweeps(): void {
    const list = this.world.sweeps;
    this.sweepFx.clear();
    this.fit(this.sweepIcons, list.length, () => this.add.image(0, 0, 'nc-shot').setDepth(8));
    for (let i = 0; i < list.length; i++) {
      const s = list[i]!;
      const t = Math.min(1, s.age / s.seconds);
      this.sweepFx
        .fillStyle(PAPER, 0.18 * (1 - t))
        .slice(s.x, s.y, s.reach, s.angle - s.arc / 2, s.angle + s.arc / 2, false)
        .fillPath();
      const def = ITEMS[s.source];
      const [key, frame] = def ? this.iconTexture(def.icon, def.name) : ['nc-shot', undefined];
      const lead = s.angle - s.arc / 2 + s.arc * t;
      this.sweepIcons[i]!.setTexture(key, frame)
        .setPosition(s.x + Math.cos(lead) * s.reach * 0.8, s.y + Math.sin(lead) * s.reach * 0.8)
        .setDisplaySize(36, 36)
        .setRotation(lead)
        .setAlpha(1 - 0.5 * t)
        .setVisible(true);
    }
  }

  /**
   * The texture for an item icon: the atlas frame when the atlas has it,
   * otherwise a PLACEHOLDER — a plain ring with the item's initial, made once
   * per icon key from the locked palette. Every shipped item has its frame
   * now; this stays for the next item drawn after its card is written (the
   * item's `iconPending` says so and a content test holds it to that).
   */
  private iconTexture(icon: ItemIcon, name: string): [string, string | undefined] {
    const frame = itemIconFrame(icon);
    if (this.textures.get(ITEM_ICON_ATLAS.key).has(frame)) return [ITEM_ICON_ATLAS.key, frame];
    const key = `nc-icon-pending-${icon}`;
    if (!this.textures.exists(key)) {
      const size = 96;
      const canvas = this.textures.createCanvas(key, size, size);
      const ctx = canvas?.getContext();
      if (canvas && ctx) {
        const hex = (n: number) => `#${n.toString(16).padStart(6, '0')}`;
        ctx.lineWidth = 7;
        ctx.strokeStyle = hex(PAPER);
        ctx.beginPath();
        ctx.arc(size / 2, size / 2, size / 2 - 8, 0, Math.PI * 2);
        ctx.stroke();
        ctx.fillStyle = hex(PAPER);
        // Word initials, so Grudge and Group Chat do not share a "G".
        const label = name.split(/\s+/).map((w) => w.charAt(0).toUpperCase()).join('').slice(0, 2);
        ctx.font = `bold ${label.length > 1 ? 34 : 44}px monospace`;
        ctx.textAlign = 'center';
        ctx.textBaseline = 'middle';
        ctx.fillText(label, size / 2, size / 2 + 2);
        canvas.refresh();
      }
    }
    return [key, undefined];
  }

  private syncBoss(): void {
    const b = this.world.boss;
    if (!b) return;
    if (!this.bossSprite) {
      this.bossSprite = this.add
        .image(b.x, b.y, this.visuals.atlas.key, this.visuals.bossFrame)
        .setDepth(6);
      // Anchored on the body the drawing actually has (AUDIT 34), so the
      // hitbox and the picture agree: shots stop at its edge, not above it.
      const body = this.visuals.bossBody ?? { cy: 0.5, r: 0.5 };
      this.bossSprite.setOrigin(0.5, body.cy).setDisplaySize(BOSS_RADIUS / body.r, BOSS_RADIUS / body.r);
      this.bossBaseScale = this.bossSprite.scaleX;
      this.bossScale = this.bossBaseScale;
      this.bossInterestIn = b.interestIn;
      this.bossJerkAt = -Infinity;
      this.bossRestructures = b.restructures;
      this.bossSwapAt = -Infinity;
      this.bossEntranceOwed = true;
      // Prom's floor (ADOLESCENCE-ROSTER §4): the HUD says get on it, so it is
      // drawn — a thin paper ring at floorRadius, chrome not threat (law 10),
      // under everything that moves. Destroyed with the boss sprite.
      const boss = this.world.act.boss;
      if (boss.kind === 'prom') {
        this.floorRing?.destroy();
        this.floorRing = this.add.graphics().setDepth(2);
        this.floorRing.lineStyle(2, PAPER, 0.28).strokeCircle(b.x, b.y, boss.floorRadius);
      }
    }
    // The telegraph has to be legible from across the arena. With one authored
    // frame it is carried by scale and value rather than by a drawn frame —
    // D-006 wants real frames here and there is only one.
    const telegraph = b.phase === 'telegraph';
    // A PULSE, not a ratchet. This used to add 0.0008 to the scale on every
    // telegraph frame and never subtract it: a 40-second fight contains 459
    // telegraph frames, so the Egg finished 47% wider than the hitbox it kept,
    // and shots visibly passed through its outer third. It was also frame-rate
    // dependent — 2.4x the growth on a 144Hz display.
    // Breathing at idle, a firmer pulse on the telegraph. It has already
    // decided; it is not in a hurry.
    const breathe = 1 + 0.012 * Math.sin(this.world.time * 1.6);
    const target = this.bossBaseScale * (telegraph ? 1.06 : breathe);
    if (b.phase === 'absorbing' && !this.absorbZoomed) {
      // The ending leans in. Presentation only — the outcome latched already.
      this.absorbZoomed = true;
      this.cameras.main.zoomTo(1.1, 1500, 'Sine.easeInOut');
      // The act's one word, if it has one (ActDef.endWord: PARTICIPATION).
      if (this.world.act.endWord) this.announceWord(this.world.act.endWord);
    }
    // The Loan's tape jerks when its balance compounds (COLLEGE-ROSTER §4):
    // its interest clock counts down and wraps UP at the tick, so a rise
    // between two frames is the tick (the dev panel's kill cannot fake one:
    // the clock stops once it absorbs). Zero for the other kinds, which never
    // compound. Same rule as the pulse: the stretch is computed from the time
    // since the tick and laid over the eased scale, never added to it, so the
    // size each frame is absolute and the jolt ends where it began.
    if (b.interestIn > this.bossInterestIn) this.bossJerkAt = this.world.time;
    this.bossInterestIn = b.interestIn;
    const since = this.world.time - this.bossJerkAt;
    // The Reorg's restructure, found the same way (OFFICE-ROSTER §4): the
    // count rising between two frames is the chart having moved. The squash
    // is the Loan's ring with the sign turned, wider first, so the swap reads
    // as the chart landing rather than being yanked. Zero for the other kinds,
    // whose count never leaves 0.
    if (b.restructures > this.bossRestructures) this.bossSwapAt = this.world.time;
    this.bossRestructures = b.restructures;
    const swapped = this.world.time - this.bossSwapAt;
    const jerk =
      (since >= 0 && since < LOAN_JERK_SECONDS ? LOAN_JERK * Math.exp(-since * 9) * Math.cos(since * 28) : 0) -
      (swapped >= 0 && swapped < REORG_SWAP_SECONDS
        ? REORG_SWAP * Math.exp(-swapped * 10) * Math.cos(swapped * 30)
        : 0);
    this.bossScale = Phaser.Math.Linear(this.bossScale, target, 0.14);
    const alpha = b.phase === 'absorbing' ? Math.max(0, b.timer / 1.8) : telegraph ? 0.72 : 1;
    // Every frame at the sim's point: the Reorg relocates at a restructure,
    // and the sprite is wherever the chart is now, never where it spawned.
    this.bossSprite
      .setPosition(b.x, b.y)
      // Taller and thinner first (the tape yanked up), then a squash, ringing
      // down: about the body's anchor, so the machine stays on the floor.
      .setScale(this.bossScale * (1 - jerk), this.bossScale * (1 + jerk))
      // Value, not tint (G-032, law 10).
      .setAlpha(alpha);
    if (this.world.act.boss.kind === 'reorg') this.syncChartGrey(b, alpha);
    if (this.world.act.boss.kind === 'mortgage') this.syncDoor(b, alpha);
    if (this.world.act.boss.kind === 'time') this.syncTimeHand(b, alpha);
    // Behind a card nobody would see the look, so it waits for the choice.
    if (this.bossEntranceOwed && !this.world.offers) this.lookAtBoss(b.phase === 'absorbing');
  }

  /**
   * The Reorg's grey rows (G-004, OFFICE-ROSTER §4): one of the three faced
   * rows per share of its health gone, from the bottom — a share is what lies
   * between two of `thresholds`, so each restructure greys the next row up,
   * and the absorb greys them all (the dev panel's kill skips the
   * restructures and lands there too). It reads the restructures, not the
   * health, so a row greys when the chart moves and stays grey (the chart
   * stays).
   * Drawn as the chart's own frame cropped from the cut down, laid exactly
   * over the chart (same point, origin, scale and alpha) and filled with the
   * shadow tone at REORG_GREY: the rows above the cut are untouched.
   */
  private syncChartGrey(b: NonNullable<World['boss']>, alpha: number): void {
    const s = this.bossSprite!;
    const boss = this.world.act.boss;
    const shares = (boss.kind === 'reorg' ? boss.thresholds.length : 0) + 1;
    const gone = b.phase === 'absorbing' ? shares : b.restructures;
    const rows = Math.min(REORG_ROW_TOPS.length, Math.round((REORG_ROW_TOPS.length * gone) / shares));
    if (rows === 0) {
      this.bossGrey?.setVisible(false);
      return;
    }
    if (!this.bossGrey) {
      this.bossGrey = this.add
        .image(s.x, s.y, s.texture.key, s.frame.name)
        .setDepth(s.depth)
        .setTintFill(SHADOW);
    }
    const cut = Math.round(s.frame.height * REORG_ROW_TOPS[REORG_ROW_TOPS.length - rows]!);
    this.bossGrey
      .setCrop(0, cut, s.frame.width, s.frame.height - cut)
      .setOrigin(s.originX, s.originY)
      .setPosition(s.x, s.y)
      .setScale(s.scaleX, s.scaleY)
      .setAlpha(alpha * REORG_GREY)
      .setVisible(true);
  }

  /**
   * The Mortgage's door opening on the twelfth payment (FAMILY-ROSTER §4):
   * the door's rectangle (`MORTGAGE_DOOR`) laid over the house in the act's
   * deep tone, at the house's own place, size and alpha, so the mouth opens
   * on the carpet behind it and fades with the house. The last instalment can
   * be met with up to a window left to run (the sim pays at the window's
   * close, and the outcome latches only then), so the house would stand at
   * nothing owed for seconds looking stuck: from the take that meets it the
   * door stands ajar (`MORTGAGE_AJAR` of its width, the latch side), and it
   * opens whole when the house absorbs. Hidden before. A render overlay,
   * PLACEHOLDER as the Reorg's grey rows are.
   */
  private syncDoor(b: NonNullable<World['boss']>, alpha: number): void {
    const open = b.phase === 'absorbing';
    if (!open && !(b.hp <= 0)) {
      this.bossDoor?.setVisible(false);
      return;
    }
    const s = this.bossSprite!;
    if (!this.bossDoor) this.bossDoor = this.add.rectangle(0, 0, 1, 1).setOrigin(0, 0).setDepth(s.depth);
    const left = s.x - s.displayWidth * s.originX;
    const top = s.y - s.displayHeight * s.originY;
    const width = s.displayWidth * (MORTGAGE_DOOR.x1 - MORTGAGE_DOOR.x0) * (open ? 1 : MORTGAGE_AJAR);
    this.bossDoor
      .setPosition(left + s.displayWidth * MORTGAGE_DOOR.x0, top + s.displayHeight * MORTGAGE_DOOR.y0)
      .setSize(width, s.displayHeight * (MORTGAGE_DOOR.y1 - MORTGAGE_DOOR.y0))
      .setFillStyle(this.visuals.background, 1)
      .setAlpha(alpha)
      .setVisible(true);
  }

  /**
   * Time's minute hand (DECLINE-ROSTER §4, AUDIT 96). The sprite's own long
   * hand is baked at the rest pose; the hazard is drawn as its own shape: a
   * boss-teal rectangle (`THREAT_BOSS`: it hurts, law 10), `sweepLength` long
   * and `sweepWidth` wide with a square tip, pivoted on the boss point where
   * the sim's hand turns (`fromHand`), turned by the sim's `boss.hand` —
   * radians clockwise from twelve, pointing along (sin, −cos), so a strip
   * laid along +x takes Phaser's rotation `hand − π/2`. It starts at the
   * cap's edge (`TIME_CAP_R`), where the drawn hands pass under the face; the
   * part under the cap is inside the clock. On Time's first frame it lies
   * over the baked hand at `TIME_HAND_REST`; the bone strip
   * (`TIME_BAKED_HAND`) covers the baked one wherever the drawn one goes,
   * laid about the sprite's own pivot as drawn this frame, since it covers
   * pixels of the sprite. Ink-edged, as everything drawn is (law 1), so it
   * reads where it crosses the teal rim. PLACEHOLDER as a picture: a
   * rectangle at the sim's honest size, not a drawn blade, until the hand is
   * drawn as its own frame.
   */
  private syncTimeHand(b: NonNullable<World['boss']>, alpha: number): void {
    const owed = this.world.act.boss;
    if (owed.kind !== 'time') return;
    const s = this.bossSprite!;
    const angle = Number.isFinite(b.hand) ? b.hand : TIME_HAND_REST;
    const cap = TIME_CAP_R * s.displayWidth;
    this.bossHandCover ??= this.add.rectangle(0, 0, 1, 1, BONE).setDepth(s.depth + 0.1);
    this.bossHand ??= this.add.rectangle(0, 0, 1, 1, THREAT_BOSS).setStrokeStyle(3, INK, 1).setDepth(s.depth + 0.2);
    // Each a strip lying along its rotation from `start` px out of (px, py).
    const lay = (
      r: Phaser.GameObjects.Rectangle,
      px: number,
      py: number,
      start: number,
      length: number,
      width: number,
      turn: number,
    ) => {
      // A resize rebuilds the shape's path and resets its display origin, so
      // only on a change; the origin, which puts the pivot `start` px behind
      // the strip's near end, goes back on every frame after it.
      const l = Math.round(length);
      const w = Math.round(width);
      if (r.width !== l || r.height !== w) r.setSize(l, w);
      r.setDisplayOrigin(-start, w / 2)
        .setPosition(px, py)
        .setRotation(turn - Math.PI / 2)
        .setAlpha(alpha)
        .setVisible(true);
    };
    const d = s.displayWidth;
    const cx = s.x + (TIME_PIVOT.x - s.originX) * d;
    const cy = s.y + (TIME_PIVOT.y - s.originY) * s.displayHeight;
    const baked = TIME_BAKED_HAND;
    lay(this.bossHandCover, cx, cy, baked.from * d, (baked.to - baked.from) * d, baked.width * d, TIME_HAND_REST);
    lay(this.bossHand, b.x, b.y, cap, Math.max(1, owed.sweepLength - cap), owed.sweepWidth, angle);
  }

  /**
   * The boss's entrance (AUDIT 37): the camera eases from the player to the
   * nearest point that has the whole drawing in view below the HUD band,
   * holds, and eases back. It moves the follow OFFSET, never the follow, so
   * the camera is following the player the whole time and nothing has to
   * remember to turn it back on; the lerp smooths both legs. Measured from
   * the sprite as drawn (its display size about its origin, not the body
   * circle): the Loan's tape stands well above its anchor.
   */
  private lookAtBoss(over: boolean): void {
    this.bossEntranceOwed = false;
    const s = this.bossSprite;
    // Killed before the card was answered: the absorb is the moment now.
    if (!s || over) return;
    const cam = this.cameras.main;
    const zoom = cam.zoom;
    const halfW = cam.width / zoom / 2;
    const halfH = cam.height / zoom / 2;
    const left = s.x - s.displayWidth * s.originX;
    const top = s.y - s.displayHeight * s.originY;
    const dx = shiftToShow(
      left,
      left + s.displayWidth,
      this.player.x - halfW + TOAST_EDGE / zoom,
      this.player.x + halfW - TOAST_EDGE / zoom,
    );
    const dy = shiftToShow(
      top,
      top + s.displayHeight,
      this.player.y - halfH + TOAST_TOP / zoom,
      this.player.y + halfH - TOAST_EDGE / zoom,
    );
    if (dx === 0 && dy === 0) return;
    // The camera looks at the target minus the offset (Camera.preRender).
    this.bossEntrance = this.tweens.chain({
      targets: cam.followOffset,
      tweens: [
        { x: -dx, y: -dy, duration: ENTRANCE_OUT_MS, ease: 'Sine.easeInOut' },
        { x: 0, y: 0, delay: ENTRANCE_HOLD_MS, duration: ENTRANCE_BACK_MS, ease: 'Sine.easeInOut' },
      ],
      onComplete: () => delete this.bossEntrance,
    });
  }

  /** Drops a look owed or running and puts the camera back on the player. */
  private endBossEntrance(): void {
    this.bossEntranceOwed = false;
    this.bossEntrance?.stop();
    delete this.bossEntrance;
    this.cameras.main.followOffset.set(0, 0);
  }

  /**
   * The worn stacks on the player, one sprite per stack up to
   * MAX_ATTACHED_SPRITES, each in the frame of the def that attached it from
   * that def's act's atlas (AUDIT six, 38; OFFICE-ROSTER §5): tuition carried
   * out of College still draws as an invoice in The Office, and a ping as a
   * ping. Every act in the life has its atlas loaded (`preload`), and a stack
   * can only come from an act in the life. The act's `attachFrame` is the
   * fallback for a def with no frame the scene can find. In `wornBy`'s
   * order, which is the order first worn (the persisting ones first after a
   * crossing), so a slot keeps its drawing as more are worn.
   */
  private syncAttached(): void {
    const w = this.world;
    const frames: [string, string][] = [];
    for (const [id, n] of w.wornBy) {
      const def = ENEMIES[id];
      const own = def ? ACT_VISUALS[def.act] : undefined;
      const found = !!own && this.textures.exists(own.atlas.key) && this.textures.get(own.atlas.key).has(def!.frame);
      const drawn: [string, string] = found
        ? [own!.atlas.key, def!.frame]
        : [this.visuals.atlas.key, this.visuals.attachFrame ?? 'antibody.png'];
      for (let i = 0; i < n && frames.length < MAX_ATTACHED_SPRITES; i++) frames.push(drawn);
    }
    const want = frames.length;
    while (this.attachedSprites.length < want) {
      const angle = Math.random() * Math.PI * 2;
      const [key, frame] = frames[this.attachedSprites.length]!;
      const s = this.add
        .image(0, 0, key, frame)
        .setDisplaySize(22, 22)
        .setDepth(11)
        .setRotation(Math.random() * Math.PI * 2);
      s.setData('angle', angle);
      s.setData('dist', 12 + Math.random() * 12);
      this.attachedSprites.push(s);
    }
    // Hide the surplus. Stacks only ever rise in play, so this looked dead —
    // but dev mode's "no drag" takes them to zero and left sixteen antibodies
    // welded to the player for the rest of the run.
    for (let i = 0; i < this.attachedSprites.length; i++) {
      const s = this.attachedSprites[i]!;
      if (i >= want) {
        s.setVisible(false);
        continue;
      }
      // Retextured only when the slot's stack changed kind; a new frame may be
      // a different size, so the display size goes back on with it.
      const [key, frame] = frames[i]!;
      if (s.texture.key !== key || s.frame.name !== frame) s.setTexture(key, frame).setDisplaySize(22, 22);
      const angle = (s.getData('angle') as number) + w.time * 0.18;
      const dist = s.getData('dist') as number;
      s.setVisible(true).setPosition(w.x + Math.cos(angle) * dist, w.y + Math.sin(angle) * dist);
    }
  }

  /**
   * One card per offer: glyph, name, level pips, one line of copy, and under
   * it what the level is worth (G-043), from `item-text.ts` and never typed
   * here. An offer id is an item or a path (`grudge/company`); the card reads
   * both through `parseOfferId`, and the tap passes the id back unchanged.
   */
  private buildOfferUi(offers: string[]): void {
    const cam = this.cameras.main;
    // Cards centred where they always were; the header rides above them.
    const HEADER_Y = 226;
    const CARD_Y = 396;
    this.offerScrim = this.add
      .rectangle(cam.width / 2, cam.height / 2, cam.width, cam.height, INK, 0.45)
      .setScrollFactor(0)
      .setDepth(195);
    // An evolution arrives alone and is not a choice; the header says what it is.
    const first = offers.length === 1 ? parseOfferId(offers[0]!) : null;
    const evolution =
      first && !first.path && isActive(first.item) && first.item.evolvesFrom ? first.item.evolvesFrom : null;
    this.offerHeader = this.add
      .text(cam.width / 2, HEADER_Y, evolution ? 'EVOLUTION' : `LEVEL ${this.world.level}`, {
        fontFamily: 'monospace',
        fontSize: '15px',
        color: '#D2C6AC',
        letterSpacing: 8,
      })
      .setOrigin(0.5)
      .setScrollFactor(0)
      .setDepth(200);

    // Wide enough for a 44-character stat line at 13px monospace (≈7.8px a
    // character), tall enough for two lines of copy and two of stats; three
    // cards and their gaps stay inside the 1280 view.
    const W = 390;
    const H = 210;
    const GAP = 20;
    const total = offers.length * W + (offers.length - 1) * GAP;
    // The medallion's centre; the name sits above it, the pips beside it,
    // the copy and the stat lines below.
    const MID = -38;
    const STATS_Y = 56;

    offers.forEach((id, i) => {
      const { item: def, path } = parseOfferId(id);
      const level = this.world.items.get(def.id) ?? 0;
      // G-043's other half (the path roll) gives World `pathLevels`, keyed by
      // offer id; until it lands no offer is a path and this reads 0.
      const pathLevel = path
        ? ((this.world as { pathLevels?: Map<string, number> }).pathLevels?.get(id) ?? 0)
        : 0;
      // Every path held, so a path card can total the weapon (item-text.ts
      // `OwnedLevels.pathLevels`: the Letter's arrival under Registered).
      const owned = { level, pathLevel, pathLevels: this.world.pathLevels };
      const x = cam.width / 2 - total / 2 + W / 2 + i * (W + GAP);

      const g = this.add.graphics();
      g.fillStyle(INK, 1).fillRoundedRect(-W / 2, -H / 2, W, H, 10);
      g.lineStyle(2, UI_FILL, 0.5).strokeRoundedRect(-W / 2, -H / 2, W, H, 10);
      // The medallion: a quiet plate under the icon, so the art sits IN the
      // card instead of floating on it. A drawn keycap box for the number,
      // for the same reason.
      g.fillStyle(SHADOW, 0.3).fillCircle(-W / 2 + 54, MID, 36);
      g.lineStyle(1.5, UI_FILL, 0.25).strokeCircle(-W / 2 + 54, MID, 36);
      g.lineStyle(1.5, UI_FILL, 0.4).strokeRoundedRect(-W / 2 + 12, -H / 2 + 10, 22, 22, 5);
      // A hairline between the joke and the numbers.
      g.lineStyle(1, UI_FILL, 0.18).lineBetween(-W / 2 + 22, STATS_Y - 9, W / 2 - 22, STATS_Y - 9);

      const keycap = this.add
        .text(-W / 2 + 23, -H / 2 + 21, String(i + 1), {
          fontFamily: 'monospace',
          fontSize: '14px',
          color: '#D2C6AC',
        })
        .setOrigin(0.5);
      // A path wears its weapon's icon: it is the same object, pushed one way.
      const [iconKey, iconFrame] = this.iconTexture(def.icon, def.name);
      const icon = this.add.image(-W / 2 + 54, MID, iconKey, iconFrame).setDisplaySize(52, 52);
      const name = this.add.text(-W / 2 + 100, MID - 30, offerTitle(id), {
        fontFamily: 'monospace',
        fontSize: '20px',
        color: '#EFE7D6',
        letterSpacing: 1,
      });
      // A weapon and a path named together ("Stubbornness · Something") can
      // be wider than the room right of the medallion at 20px; a long title
      // steps its type down rather than running off the card.
      const room = W - 116;
      if (name.width > room) name.setFontSize(Math.max(13, Math.floor((20 * room) / name.width)));
      if (name.width > room) name.setScale(room / name.width);
      // Pips: up to eight now. Spaced when they fit, packed when they do not;
      // either way inside the room right of the medallion. A path card shows
      // the path's own levels.
      const pip = offerPips(id, owned);
      const gap = pip.max > 6 ? '' : ' ';
      const evolvedFrom =
        isActive(def) && def.evolvesFrom
          ? `${itemDef(def.evolvesFrom.weapon).name} + ${itemDef(def.evolvesFrom.with).name}`
          : null;
      const pips = this.add.text(
        -W / 2 + 100,
        MID,
        evolvedFrom ??
          (pip.owned === 0
            ? 'new'
            : ('●' + gap).repeat(pip.owned) + ('○' + gap).repeat(Math.max(0, pip.max - pip.owned))),
        { fontFamily: 'monospace', fontSize: '13px', color: '#D2C6AC' },
      );
      // New: what it is. Owned: what the next level adds. A path: its own line.
      const copy = path
        ? (path.levels[pathLevel]?.text ?? path.blurb)
        : ((level > 0 && isActive(def) ? def.levels[level]?.text : undefined) ?? def.blurb);
      const blurb = this.add
        .text(-W / 2 + 24, MID + 32, copy, {
          fontFamily: 'monospace',
          fontSize: '15px',
          color: '#EFE7D6',
          lineSpacing: 6,
          wordWrap: { width: W - 48, useAdvancedWrap: true },
        })
        .setAlpha(0.88);
      // What the level is worth, in a survivors player's terms. Lines are
      // already split to fit; the scale is a guard for a wide system font.
      const stats = this.add
        .text(-W / 2 + 22, STATS_Y, statLines(id, owned).join('\n'), {
          fontFamily: 'monospace',
          fontSize: '13px',
          color: '#D2C6AC',
          lineSpacing: 4,
        })
        .setAlpha(0.9);
      if (stats.width > W - 44) stats.setScale((W - 44) / stats.width);

      const card = this.add
        .container(x, CARD_Y, [g, keycap, icon, name, pips, blurb, stats])
        .setDepth(200)
        .setScrollFactor(0)
        .setSize(W, H)
        .setAlpha(0)
        .setScale(0.94);
      card.setInteractive({ useHandCursor: true });
      card.on('pointerdown', () => {
        if (this.world.offers?.includes(id)) {
          this.world.choose(id);
          sfx.choose();
        }
      });
      this.tweens.add({
        targets: card,
        alpha: 1,
        scale: 1,
        duration: 150,
        delay: i * 55,
        ease: 'Cubic.easeOut',
      });
      this.offerCards.push(card);
    });
  }

  private destroyOfferUi(): void {
    for (const c of this.offerCards) c.destroy();
    this.offerCards = [];
    this.offerScrim?.destroy();
    this.offerHeader?.destroy();
    delete this.offerScrim;
    delete this.offerHeader;
  }

  private drawHud(): void {
    const w = this.world;
    // The antibodies' OWN cost, not the deviation from base speed. The latter
    // folded in passive item speed and so lied in both directions: Membrane
    // alone printed "0 attached (-8%)", and Midpiece hid a real 13% antibody
    // drag entirely by pushing the total back above base. §3.3 asks whether a
    // player can tell when it went wrong; this is the only instrument they get.
    const drag = Math.round((1 - w.antibodyDrag) * 100);
    this.hudLevel.setText(`${w.act.name.toLowerCase()}   lv ${w.level}`);
    // The life is counted in years (D-024). Minutes live on the certificate.
    this.hudClock.setText(hudAge(w.age));
    this.hudRight.setText(
      `${w.kills} killed${import.meta.env.DEV ? `   ${Math.round(this.game.loop.actualFps)} fps` : ''}`,
    );
    // Tuition's cost is on the gems, not the legs (COLLEGE-ROSTER §3.3): what
    // every gem is worth now, derived from the sim's own factor so the HUD
    // cannot drift from the tax it reports.
    const tax = Math.round((1 - w.xpTax) * 100);
    // The ping's cost is on the cadence (OFFICE-ROSTER §3.3): every cooldown
    // is multiplied by `attentionFactor`, so the share of attack speed lost is
    // 1 − 1/factor (two pings, 1.06², read −11%). Derived, as the tax is. The
    // count is every stack worn, and the speed term is there only when one of
    // them drags: pings alone read `2 attached · attention −11%`.
    const attention = Math.round((1 - 1 / w.attentionFactor) * 100);
    // The HOA letter's cost is on the reach (FAMILY-ROSTER §3.3): the radius
    // gems start coming from is multiplied by `pickupFactor`, the sim's own
    // product of each worn notice's `attach.pickup` (two letters, 0.93², read
    // −14%). The radius itself shrinks by that share, so it is 1 − factor,
    // not the cadence's 1 − 1/factor. Derived, as the tax is; there whenever
    // a worn stack costs reach, whichever act it was worn in.
    const reach = Math.round((1 - w.pickupFactor) * 100);
    const worn = wornCount(w);
    this.wornTerms = [
      worn > 0 ? `${worn} attached${w.dragStacks > 0 ? `  −${drag}% speed` : ''}` : '',
      w.taxStacks > 0 ? `xp −${tax}%` : '',
      w.pingStacks > 0 ? `attention −${attention}%` : '',
      w.pickupFactor < 1 ? `reach −${reach}%` : '',
    ].filter((t) => t !== '');
    this.hudDrag.setText(wornText(this.wornTerms, this.scale.width < VIEW_WIDTH));

    this.bars.clear();
    // The plate: one quiet ink surface holding both bars, so the corner reads
    // as an instrument instead of two floating rectangles.
    this.bars.fillStyle(INK, 0.4).fillRoundedRect(12, 8, 236, 46, 7);
    // Health (`healthBar`, AUDIT 90, 122, 123). The track is the maximum the
    // items give (`itemsMaxHp`), so a decision that lowers the maximum
    // (DECLINE-ROSTER §3.5) visibly shortens what you have, and still does
    // after a Thick Skin taken later: the live track ends at the maximum and
    // the part taken stays as an empty tail — an outline with nothing in it,
    // value only and never a threat colour (law 10). While a tail shows, the
    // floor the cuts stop at (`maxHpFloor`) is a thin ink tick across the
    // bar, over the fill. Every other act's maximum is the items', and
    // neither is drawn. PLACEHOLDER weights (the tail's outline at 0.85, the
    // tick 2px standing 2px proud of the bar), watched by nobody yet.
    const bar = healthBar(216, w);
    this.hpTail = bar.tail;
    this.bars.fillStyle(INK, 0.55).fillRect(22, 30, bar.live, 9);
    if (this.hpTail > 0) {
      this.bars.lineStyle(1, BONE, 0.85).strokeRect(22 + bar.live + 0.5, 30.5, this.hpTail - 1, 8);
    }
    // Law 10 names this case directly: damage feedback goes to value, never to
    // tint, because a player flashing contact-red makes the colour mean
    // "someone is being hurt" instead of "this hurts". The player sprite
    // already dims on i-frames, which is the value channel doing the job.
    this.bars.fillStyle(PAPER, w.invulnerable > 0 ? 0.45 : 1);
    this.bars.fillRect(22, 30, bar.fill, 9);
    if (bar.floorAt !== null) this.bars.fillStyle(INK, 1).fillRect(22 + bar.floorAt - 1, 28, 2, 13);
    // Experience.
    this.bars.fillStyle(INK, 0.55).fillRect(22, 43, 216, 4);
    this.bars.fillStyle(UI_FILL, 1).fillRect(22, 43, (216 * w.xp) / w.xpToNext, 4);
    // The boss carries its own bar across the top, under its name.
    // Shielded (the Gym Teacher with a ball still on the floor): the bar
    // dims and the label says why, because hitting him does nothing and the
    // bots showed a player who never learns that sits in the fight forever.
    // Time's bar is its clock (DECLINE-ROSTER §4, AUDIT 96): the label says
    // how many seconds are left, never health, which it has none of.
    const clock = w.boss?.kind === 'time' ? Math.ceil(Math.max(0, w.boss.secondsLeft)) : -1;
    const bossLabel = clock >= 0
      ? `${w.act.bossName.toLowerCase()} \u00b7 ${clock} ${clock === 1 ? 'second' : 'seconds'}`
      : w.boss?.shielded && w.act.boss.shieldHint
        ? `${w.act.bossName.toLowerCase()} \u00b7 ${w.act.boss.shieldHint}`
        : w.act.bossName.toLowerCase();
    this.hudBossLabel.setText(bossLabel).setVisible(!!w.boss);
    if (w.boss) {
      const width = this.cameras.main.width - 480;
      this.bars.fillStyle(INK, 0.6).fillRoundedRect(240, 68, width, 8, 4);
      // Debatable — the bar represents a thing that does hurt — but law 10
      // says UI chrome, without an exception. Flagged rather than argued.
      const owed = w.act.boss;
      if (w.boss.kind === 'time' && owed.kind === 'time') {
        // Time has no health (§4): its hp stays at its maximum, inert, so the
        // bar reads the clock instead — the seconds left of `seconds`,
        // emptying left to right: what has gone is on the left, and what is
        // left sits at the right end and shrinks toward it.
        const left = owed.seconds > 0 ? Phaser.Math.Clamp(w.boss.secondsLeft / owed.seconds, 0, 1) : 0;
        if (left > 0.02) this.bars.fillStyle(UI_FILL, 1).fillRoundedRect(240 + width * (1 - left), 68, width * left, 8, 4);
      } else {
        const frac = w.boss.hp / w.boss.maxHp;
        if (frac > 0.02) {
          this.bars.fillStyle(UI_FILL, w.boss.shielded ? 0.35 : 1).fillRoundedRect(240, 68, width * frac, 8, 4);
        }
      }
      // The Mortgage is paid on a schedule (FAMILY-ROSTER §4): its bar is cut
      // into `instalments` cells by an ink notch at every instalment, over the
      // fill, so the health reads as a schedule. The fill is still hp/maxHp:
      // between windows the sim holds it at whole instalments (`paid`), so a
      // paid window leaves one more cell empty; inside a window the cell being
      // paid drains as the gate accepts damage, stops draining once it is met
      // (the overflow is lost), and fills back up if the window closes short
      // (a missed window is refunded — the one bar in the life that rises).
      // Under that cell, where the race bar sits for the acts that race, the
      // window's clock (`windowTimer`, counting down) runs left to right: the
      // time left to pay it, and after the last one is met, the time until
      // the house lets go. PLACEHOLDER as a picture: the smooth bar stays
      // under the notches until a person has read them, as §4 says.
      if (w.boss.kind === 'mortgage' && owed.kind === 'mortgage' && owed.instalments > 1) {
        const n = owed.instalments;
        this.bars.fillStyle(INK, 0.9);
        for (let k = 1; k < n; k++) this.bars.fillRect(Math.round(240 + (width * k) / n) - 1, 66, 2, 12);
        const due = n - 1 - w.boss.paid;
        if (w.boss.phase !== 'absorbing' && due >= 0 && owed.instalmentSeconds > 0) {
          const cell = width / n;
          const gone = Phaser.Math.Clamp(1 - w.boss.windowTimer / owed.instalmentSeconds, 0, 1);
          this.bars.fillStyle(INK, 0.6).fillRect(240 + cell * due + 2, 80, cell - 4, 3);
          this.bars.fillStyle(PAPER, 0.85).fillRect(240 + cell * due + 2, 80, (cell - 4) * gone, 3);
        }
      }
    }
    // The race (G-006): how close someone else is to getting there first.
    // Thinner than the boss bar and under it; chrome colours only (law 10).
    const racing = !!w.boss && w.raceTarget > 0;
    this.hudRaceLabel.setVisible(racing);
    if (racing) {
      const width = this.cameras.main.width - 480;
      this.bars.fillStyle(INK, 0.6).fillRoundedRect(240, 80, width, 4, 2);
      const frac = Math.min(1, w.raceAbsorbed / w.raceTarget);
      if (frac > 0) this.bars.fillStyle(PAPER, 0.85).fillRect(240, 80, width * frac, 4);
    }

    // Cards, not a text panel. drawHud runs every frame; the key turns
    // build-vs-teardown into a string comparison instead of a state machine.
    // Owned levels are part of the key: two queued level-ups can roll the
    // same three items, and the pips must not show the pre-choice level. A
    // path card's level lives in `pathLevels` (G-043); an id is in one map or
    // the other, never both.
    // Held under the act's document, whose paper a tap on a card would not reach.
    const offerKey = w.offers && !this.paper
      ? `${w.level}:${w.offers.map((id) => `${id}@${w.pathLevels.get(id) ?? w.items.get(id) ?? 0}`).join(',')}`
      : '';
    if (offerKey !== this.shownOffers) {
      this.destroyOfferUi();
      if (w.offers) this.buildOfferUi(w.offers);
      this.shownOffers = offerKey;
    }

    // On the canvas, not in the DOM panel, so it is present in a screenshot
    // and present with the panel hidden. Paper on ink rather than a threat
    // colour: law 10 keeps those off UI chrome without an exception.
    this.devBadge.setVisible(import.meta.env.DEV && this.dev.tainted);

    if (this.paused) {
      this.endScrim.setVisible(true);
      this.pauseNote
        .setText('paused' + '\n\n' + (this.touch ? 'tap to resume' : 'P or Esc to resume'))
        .setVisible(true);
      if (!this.pauseSheet) this.buildPauseSheet();
      return;
    }
    this.pauseNote.setVisible(false);
    if (this.pauseSheet) this.destroyPauseSheet();

    if (w.dead || w.won) {
      // Built once: the world is frozen from here, so the record cannot move.
      if (!this.form && w.certificate) this.showCertificate(w.certificate);
    } else {
      this.endScrim.setVisible(false);
      // God mode can take a death back (applyDevCheats); the paperwork goes with it.
      if (this.form) this.hideCertificate();
    }
  }

  /**
   * The build sheet under "paused" (`build-sheet.ts`): what the life holds,
   * with levels, paths and the totals, in the offer cards' words and ink. One
   * panel under the pause note: the totals in a column of their own, then the
   * items in whichever number of even columns lets the panel stand largest,
   * scaled down (never clipped) only if none fits at full size. Nothing on it
   * is interactive, so a tap anywhere still resumes. Every word is the
   * sheet's; nothing is typed here.
   *
   * An upright phone (`narrowCanvas`) shows the 1280×720 view 390 CSS px wide,
   * where 13px type is 4px. The world is held still, so, as the certificate
   * does, the sheet takes a canvas of the screen's shape, sets the type 1.7×
   * and the totals above the items; `destroyPauseSheet` gives 1280×720 back.
   */
  private buildPauseSheet(typeScale?: number): void {
    const sheet = buildSheet(this.world);
    const narrow = narrowCanvas(this.scale.parentSize) !== null;
    // A landscape phone raises the type to the certificate's floor (pauseTypeScale),
    // rounded up so no line lands a fraction under it; 1280's sizes are whole already.
    const k = typeScale ?? pauseTypeScale(this.scale.displaySize.width / this.scale.width, narrow);
    const px = (n: number) => (narrow ? Math.round(n * k) : Math.ceil(n * k - 1e-9));
    const mono = (size: number, color: string, letterSpacing = 0): Phaser.Types.GameObjects.Text.TextStyle => ({
      fontFamily: 'monospace',
      fontSize: `${px(size)}px`,
      color,
      lineSpacing: px(3),
      letterSpacing,
    });
    const PAD = px(20);
    const GAP_X = px(28);
    const GAP_Y = px(12);
    const MARGIN = narrow ? 20 : 24;
    const NOTE_GAP = px(14);
    const parts: Phaser.GameObjects.GameObject[] = [];
    const rules = this.add.graphics();
    parts.push(rules);
    const text = (s: string, style: Phaser.Types.GameObjects.Text.TextStyle) => {
      const t = this.add.text(0, 0, s, style);
      parts.push(t);
      return t;
    };

    // A block is text that moves as one: the totals, or one held item.
    type Block = { w: number; h: number; place: (x: number, y: number) => void };
    const header = text(sheet.header, mono(15, '#EFE7D6', 2)).setPosition(PAD, PAD);
    const totals: Block | null = (() => {
      if (sheet.totals.length === 0) return null;
      const t = text(sheet.totals.join('\n'), mono(14, '#EFE7D6')).setAlpha(0.9);
      return { w: t.width, h: t.height, place: (x, y) => t.setPosition(x, y) };
    })();
    const items: Block[] = sheet.items.map((e) => {
      const title = text(e.title, mono(15, '#EFE7D6'));
      const pips = text(pipString(e.pips), mono(13, '#D2C6AC'));
      const paths = e.paths.length > 0 ? text(e.paths.join('\n'), mono(13, '#EFE7D6')).setAlpha(0.8) : null;
      const stats = text(e.lines.join('\n'), mono(13, '#D2C6AC'));
      const PIP_GAP = px(10);
      const INDENT = px(12);
      const top = title.height + px(3);
      const mid = paths ? paths.height + px(2) : 0;
      return {
        w: Math.max(title.width + PIP_GAP + pips.width, paths ? INDENT + paths.width : 0, stats.width),
        h: top + mid + stats.height,
        place: (x, y) => {
          title.setPosition(x, y);
          pips.setPosition(x + title.width + PIP_GAP, y + (title.height - pips.height) / 2);
          paths?.setPosition(x + INDENT, y + top);
          stats.setPosition(x, y + top + mid);
        },
      };
    });
    if (items.length === 0) {
      const t = text('nothing held', mono(13, '#D2C6AC'));
      items.push({ w: t.width, h: t.height, place: (x, y) => t.setPosition(x, y) });
    }

    // The box the panel must fit: the view under the note, or on a phone the
    // screen's own shape (never grown to the content: FIT would then shrink
    // the whole canvas, scrim and all). Touch keeps clear of the corner button.
    const cam = this.cameras.main;
    const shape = narrow ? narrowCanvas(this.scale.parentSize) : null;
    const view = shape ?? { width: cam.width, height: cam.height - (this.pauseButton ? 76 : 0) };
    const note = this.pauseNote.setFontSize(px(20));
    // On the 1280×720 view the note starts under the HUD's clock, not over it;
    // on a phone's canvas under the whole top band, which is centred there too
    // (anchorHud). With a boss up the band reaches its bar and label, and the
    // note of a long sheet (pushed up to TOP) stops under them (`FLOOR`).
    const TOP = narrow ? TOAST_TOP : 56;
    const FLOOR = this.world.boss ? TOAST_TOP : TOP;
    const maxW = view.width - 2 * MARGIN;
    const maxH = view.height - FLOOR - MARGIN - note.height - NOTE_GAP;
    const headH = header.height + px(14);

    // Columns: greedy under a height limit; for n columns, the shortest limit
    // that needs no more than n, so they come out even rather than one tall
    // and one stub. Every n is tried and the one that lets the panel stand
    // largest wins (the fewest, on a tie), so a long life scales down only
    // as far as it must, and never clips.
    const greedy = (limit: number): Block[][] => {
      const cols: Block[][] = [];
      let h = 0;
      for (const b of items) {
        const col = cols[cols.length - 1];
        if (col && h + GAP_Y + b.h <= limit) {
          col.push(b);
          h += GAP_Y + b.h;
        } else {
          cols.push([b]);
          h = b.h;
        }
      }
      return cols;
    };
    const tallest = Math.max(...items.map((b) => b.h));
    const evenly = (n: number): Block[][] => {
      let lo = tallest;
      let hi = items.reduce((sum, b) => sum + GAP_Y + b.h, 0);
      if (greedy(lo).length <= n) return greedy(lo);
      for (let i = 0; i < 24; i++) {
        const mid = (lo + hi) / 2;
        if (greedy(mid).length <= n) hi = mid;
        else lo = mid;
      }
      return greedy(hi);
    };
    const measure = (cols: Block[][]) => {
      const colW = cols.map((c) => Math.max(...c.map((b) => b.w)));
      const itemsW = colW.reduce((sum, w) => sum + w, 0) + GAP_X * (cols.length - 1);
      const itemsH = Math.max(...cols.map((c) => c.reduce((h, b, i) => h + b.h + (i > 0 ? GAP_Y : 0), 0)));
      // The totals stand in a column of their own; on a phone, above the items.
      const innerW = !totals ? itemsW : narrow ? Math.max(totals.w, itemsW) : totals.w + GAP_X + itemsW;
      const innerH = !totals ? itemsH : narrow ? totals.h + 2 * GAP_Y + itemsH : Math.max(totals.h, itemsH);
      const W = 2 * PAD + Math.max(header.width, innerW);
      const H = 2 * PAD + headH + innerH;
      return { cols, colW, W, H, s: Math.min(1, maxW / W, maxH / H) };
    };
    let best = measure(evenly(1));
    for (let n = 2; n <= items.length && best.s < 1; n++) {
      const next = measure(evenly(n));
      if (next.s > best.s) best = next;
    }
    // Raised type that no longer fits would be scaled down past where 1280's
    // stands (the note grows with it): a sheet that long is set at 1280's sizes.
    if (k > 1 && !narrow && best.s < 1) {
      for (const p of parts) p.destroy();
      this.buildPauseSheet(1);
      return;
    }
    const { cols, colW, W, H, s } = best;

    const top = PAD + headH;
    let x = PAD;
    let itemsTop = top;
    let divider = -1;
    if (totals) {
      totals.place(PAD, top);
      if (narrow) itemsTop = top + totals.h + 2 * GAP_Y;
      else {
        x = PAD + totals.w + GAP_X;
        divider = x - GAP_X / 2;
      }
    }
    cols.forEach((col, i) => {
      let y = itemsTop;
      for (const b of col) {
        b.place(x, y);
        y += b.h + GAP_Y;
      }
      x += colW[i]! + GAP_X;
    });

    rules.fillStyle(INK, 0.9).fillRoundedRect(0, 0, W, H, 10);
    rules.lineStyle(2, UI_FILL, 0.5).strokeRoundedRect(0, 0, W, H, 10);
    rules.lineStyle(1, UI_FILL, 0.18).lineBetween(PAD, top - px(7), W - PAD, top - px(7));
    if (totals && narrow) rules.lineBetween(PAD, itemsTop - GAP_Y, W - PAD, itemsTop - GAP_Y);
    if (divider > 0) rules.lineBetween(divider, top, divider, H - PAD);

    if (shape) {
      this.scale.setGameSize(shape.width, shape.height);
      // The follow would glide to the new view's centre; the world is still, so snap.
      cam.centerOn(this.player.x, this.player.y);
      this.events.off('shutdown', this.restoreCanvas, this).once('shutdown', this.restoreCanvas, this);
      this.pauseSheetNarrow = true;
      this.endScrim.setPosition(shape.width / 2, shape.height / 2).setSize(shape.width, shape.height);
      this.anchorHud(shape.width);
      this.devBadge.setPosition(shape.width - 14, shape.height - 14 - this.devBadge.height);
    }
    const y0 = Math.max(FLOOR, TOP + Math.max(0, (view.height - TOP - MARGIN - (note.height + NOTE_GAP + H * s)) / 2));
    note.setPosition(view.width / 2, y0 + note.height / 2);
    this.pauseSheet = this.add
      .container((view.width - W * s) / 2, y0 + note.height + NOTE_GAP, parts)
      .setScale(s)
      .setScrollFactor(0)
      .setDepth(200);
  }

  /** Takes the sheet down on resume, and gives back what the phone's layout moved. */
  private destroyPauseSheet(): void {
    this.pauseSheet?.destroy();
    delete this.pauseSheet;
    this.pauseNote.setFontSize(20).setPosition(VIEW_WIDTH / 2, VIEW_HEIGHT / 2);
    if (!this.pauseSheetNarrow) return;
    this.pauseSheetNarrow = false;
    if (this.restoreCanvas()) this.events.off('shutdown', this.restoreCanvas, this);
    // Back where the run left it, not gliding there from the phone's view.
    this.cameras.main.centerOn(this.player.x, this.player.y);
    this.endScrim.setPosition(VIEW_WIDTH / 2, VIEW_HEIGHT / 2).setSize(VIEW_WIDTH, VIEW_HEIGHT);
    this.anchorHud(VIEW_WIDTH);
    this.devBadge.setPosition(VIEW_WIDTH - 14, 58);
  }

  /**
   * The certificate (G-002, D-024) as a document, in the register G-038 kept
   * for documents: a paper sheet on the dimmed field, labels printed small,
   * values typed large on ruled lines, a stamp. A win gets the same form —
   * natural causes is still a death; that is the joke. Below a perforation,
   * the receipt: `certificateLines` as prose (that is `overlay`, which the
   * smoke reads) and the build as personal effects, because what you took is
   * the input to "what would I do differently", which is what makes a
   * survivors run repeatable.
   *
   * One screen at 1280×720. A portrait phone gets `showNarrowCertificate`.
   * FIT shows the canvas smaller than 1280 CSS px on anything narrower — a
   * landscape phone at 0.54 — so `wideLayout` raises every size to its floor
   * in CSS px at the ratio it is shown at (11 for print, 16 for a value), and
   * where the 1280 form's middle row cannot hold the raised labels it sets two
   * fields a row. At 1280 and over, nothing moves.
   * Colours: paper and ink, shadow for print, the act's deep tone as the
   * stamp's ink. No threat colour — law 10 keeps them off chrome.
   */
  private showCertificate(c: Certificate): void {
    if (narrowCanvas(this.scale.parentSize)) {
      this.showNarrowCertificate(c);
      return;
    }
    const w = this.world;
    const cam = this.cameras.main;
    const fields = certificateFields(c, { name: this.playerName, lived: w.time });
    // CSS px per game px: under 1 when FIT shows the canvas narrower than 1280.
    const lay = wideLayout(fields, this.scale.displaySize.width / this.scale.width);
    const type = lay.type;
    const W = WIDE_SHEET.width;
    const L = Math.round((cam.width - W) / 2);
    const T = lay.top;
    /** Inner margin, and the tear line between the certificate and its receipt. */
    const M = WIDE_SHEET.margin;
    const PERF = lay.perf;
    // The last boss's absorb leans the camera in to 1.1 (syncBoss), and a
    // scroll-factor-0 object still takes the zoom: the sheet would be set at
    // 1232px and its hint pushed to the bottom edge. The field is dimmed from
    // this frame, so the lean-in ends here, under the paper.
    cam.zoomEffect.reset();
    cam.setZoom(1);
    const parts: Phaser.GameObjects.GameObject[] = [];
    const text = (x: number, y: number, s: string, size: number, colour: string, spacing = 0) => {
      const t = this.add.text(x, y, s, {
        fontFamily: 'monospace',
        fontSize: `${size}px`,
        color: colour,
        letterSpacing: spacing,
      });
      parts.push(t);
      return t;
    };
    const sheet = this.add.graphics();
    const rules = this.add.graphics();

    // The header: the office that issues it, then the title in small caps.
    text(cam.width / 2, lay.office, 'OFFICE OF VITAL STATISTICS', type.office, CERT_PRINT, 5).setOrigin(0.5, 0);
    parts.push(...this.smallCaps('Certificate of Death', cam.width / 2, T + 94, 36, CERT_INK, 4));
    rules.lineStyle(2, INK, 1).lineBetween(L + M, T + 112, L + W - M, T + 112);
    rules.lineStyle(1, INK, 1).lineBetween(L + M, T + 117, L + W - M, T + 117);

    // The fields. Numbered, as a form's are; the value sits on its rule.
    lay.rows.forEach((row, i) => {
      const f = fields[i]!;
      const x = L + M + row.x;
      text(x, row.label, `${i + 1}. ${f.label}`, type.label, CERT_PRINT, 1);
      text(x + 6, row.value, f.value, row.size, CERT_INK);
      rules.lineStyle(1.5, INK, 1).lineBetween(x, row.rule, x + row.w, row.rule);
    });

    // The receipt, below the tear: the prose, and the effects in a column clear of it.
    const R = lay.receipt;
    text(L + M, R, 'RECEIPT · DETACH AND RETAIN', type.head, CERT_PRINT, 3);
    this.overlay
      .setFontSize(type.receipt)
      .setLineSpacing(lay.spacing.prose)
      .setPosition(L + M, lay.content)
      .setText([...certificateLines(c), `${w.kills} killed, level ${w.level}.`].join('\n'))
      .setVisible(true);
    const column = effectsColumn(this.overlay.width, type);
    const effectsX = L + M + column.x;
    text(effectsX, R, 'PERSONAL EFFECTS', type.head, CERT_PRINT, 3);
    const build = [...w.items.entries()].map(([id, lv]) => `${itemDef(id).name} ${lv}`);
    const effects = text(effectsX, lay.content, effectLines(build, column.chars).join('\n') || 'None', type.effects, CERT_INK);
    effects.setLineSpacing(lay.spacing.effects);
    // Grows for a long build rather than spilling; the hint still fits under it.
    const bottom = Math.max(this.overlay.y + this.overlay.height, effects.y + effects.height) + lay.foot;
    const H = lay.compact ? bottom - T : Math.min(Math.max(600, bottom - T), cam.height - T - 70);

    // The sheet, under one flat tone for its shadow (law 2), double-ruled
    // above the tear and single-ruled below it; the perforation between.
    sheet.fillStyle(INK, 0.55).fillRect(L + 8, T + 10, W, H);
    sheet.fillStyle(PAPER, 1).fillRect(L, T, W, H);
    sheet.lineStyle(3, INK, 1).strokeRect(L + 14, T + 14, W - 28, PERF - T - 28);
    sheet.lineStyle(1, INK, 1).strokeRect(L + 21, T + 21, W - 42, PERF - T - 42);
    sheet.lineStyle(1, INK, 0.7).strokeRect(L + 14, PERF + 14, W - 28, T + H - PERF - 28);
    sheet.lineStyle(1.5, INK, 0.6);
    for (let x = L + 4; x < L + W - 4; x += 14) sheet.lineBetween(x, PERF, Math.min(x + 7, L + W - 4), PERF);

    // The stamp, bottom right, in the act's deep tone: a spot ink, not a threat.
    const stamp = this.inkStamp(c, 30, 44);
    stamp.setPosition(L + W - M - 40 - stamp.width / 2, lay.stamp);

    // The restart, under the form as it always was.
    const hint = this.add
      .text(cam.width / 2, T + H + lay.hint, this.touch ? 'tap to live again' : 'R to live again', {
        fontFamily: 'monospace',
        fontSize: `${type.hint}px`,
        color: css(PAPER),
      })
      .setOrigin(0.5);

    // The compact form is centred on the canvas, sheet and hint together; the
    // prose moves with the sheet it is typed on.
    const dy = lay.compact ? Math.max(4 - T, Math.floor((cam.height - 2 * T - H - lay.hint - type.hint / 2) / 2)) : 0;
    this.overlay.y += dy;
    this.endScrim.setFillStyle(INK, 0.62).setVisible(true);
    this.form = this.add
      .container(0, dy, [sheet, rules, ...parts, stamp, hint])
      .setScrollFactor(0)
      .setDepth(200);
  }

  /**
   * The certificate on a screen taller than wide (`narrowCanvas`): the same
   * form, stacked. FIT sets the 1280×720 canvas at 390×219 CSS px on an upright
   * phone, where the wide form's labels are 4 px; the run is over, so the form
   * takes a canvas of the screen's shape and sets the fields one per row in
   * `NARROW_TYPE`. The stamp gets a band of its own under the cause — on a
   * 600px column any cause would run under it — and the personal effects go
   * under the receipt's prose. The HUD keeps its 1280×720 places under the
   * scrim; `restoreCanvas` gives that canvas back when the certificate goes.
   */
  private showNarrowCertificate(c: Certificate): void {
    const w = this.world;
    const cam = this.cameras.main;
    const type = NARROW_TYPE;
    const L = 20;
    const W = NARROW_WIDTH - 2 * L;
    const T = 24;
    const M = 40;
    const left = L + M;
    const right = L + W - M;
    // As showCertificate: the last boss's lean-in ends under the paper.
    cam.zoomEffect.reset();
    cam.setZoom(1);
    const parts: Phaser.GameObjects.GameObject[] = [];
    const text = (x: number, y: number, s: string, size: number, colour: string, spacing = 0) => {
      const t = this.add.text(x, y, s, {
        fontFamily: 'monospace',
        fontSize: `${size}px`,
        color: colour,
        letterSpacing: spacing,
      });
      parts.push(t);
      return t;
    };
    const sheet = this.add.graphics();
    const rules = this.add.graphics();

    text(NARROW_WIDTH / 2, T + 40, 'OFFICE OF VITAL STATISTICS', type.print, CERT_PRINT, 3).setOrigin(0.5, 0);
    parts.push(...this.smallCaps('Certificate of Death', NARROW_WIDTH / 2, T + 126, type.title, CERT_INK, 3));
    rules.lineStyle(2, INK, 1).lineBetween(left, T + 146, right, T + 146);
    rules.lineStyle(1, INK, 1).lineBetween(left, T + 151, right, T + 151);

    const fields = certificateFields(c, { name: this.playerName, lived: w.time });
    const { rows, bottom } = narrowRows(fields, T + 178);
    fields.forEach((f, i) => {
      const row = rows[i]!;
      text(left, row.label, `${i + 1}. ${f.label}`, type.print, CERT_PRINT, 1);
      text(left + 6, row.value, f.value, row.size, CERT_INK);
      rules.lineStyle(1.5, INK, 1).lineBetween(left, row.rule, right, row.rule);
    });
    const stamp = this.inkStamp(c, 34, 48);
    stamp.setPosition(right - 16 - stamp.width / 2, bottom + 80);
    const PERF = bottom + 160;

    // The receipt: the prose, and the personal effects under it rather than beside.
    const R = PERF + 36;
    text(left, R, 'RECEIPT · DETACH AND RETAIN', type.print, CERT_PRINT, 2);
    this.overlay
      .setFontSize(type.receipt)
      .setLineSpacing(8)
      .setWordWrapWidth(right - left)
      .setPosition(left, R + 40)
      .setText([...certificateLines(c), `${w.kills} killed, level ${w.level}.`].join('\n'))
      .setVisible(true);
    const E = this.overlay.y + this.overlay.height + 30;
    text(left, E, 'PERSONAL EFFECTS', type.print, CERT_PRINT, 2);
    const build = [...w.items.entries()].map(([id, lv]) => `${itemDef(id).name} ${lv}`);
    // Forty characters of 24px monospace is the 600px column.
    const effects = text(left, E + 40, effectLines(build, 40).join('\n') || 'None', type.effects, CERT_INK);
    effects.setLineSpacing(6);
    const H = effects.y + effects.height + 34 - T;

    // The sheet as the wide form draws it.
    sheet.fillStyle(INK, 0.55).fillRect(L + 8, T + 10, W, H);
    sheet.fillStyle(PAPER, 1).fillRect(L, T, W, H);
    sheet.lineStyle(3, INK, 1).strokeRect(L + 14, T + 14, W - 28, PERF - T - 28);
    sheet.lineStyle(1, INK, 1).strokeRect(L + 21, T + 21, W - 42, PERF - T - 42);
    sheet.lineStyle(1, INK, 0.7).strokeRect(L + 14, PERF + 14, W - 28, T + H - PERF - 28);
    sheet.lineStyle(1.5, INK, 0.6);
    for (let x = L + 4; x < L + W - 4; x += 14) sheet.lineBetween(x, PERF, Math.min(x + 7, L + W - 4), PERF);

    const hint = this.add
      .text(NARROW_WIDTH / 2, T + H + 50, this.touch ? 'tap to live again' : 'R to live again', {
        fontFamily: 'monospace',
        fontSize: `${type.hint}px`,
        color: css(PAPER),
      })
      .setOrigin(0.5);

    // The canvas: the screen's shape, or the form's height if that is more.
    // Centred on it; the prose moves with the sheet it is typed on.
    const need = T + H + 50 + type.hint / 2 + T;
    const size = narrowCanvas(this.scale.parentSize, need) ?? { width: NARROW_WIDTH, height: need };
    this.scale.setGameSize(size.width, size.height);
    this.events.off('shutdown', this.restoreCanvas, this).once('shutdown', this.restoreCanvas, this);
    const dy = Math.floor((size.height - need) / 2);
    this.overlay.y += dy;
    // Off the sheet's header, into the scrim's bottom corner.
    this.anchorHud(size.width);
    this.devBadge.setPosition(size.width - 14, size.height - 14 - this.devBadge.height);
    this.endScrim
      .setPosition(size.width / 2, size.height / 2)
      .setSize(size.width, size.height)
      .setFillStyle(INK, 0.62)
      .setVisible(true);
    this.form = this.add
      .container(0, dy, [sheet, rules, ...parts, stamp, hint])
      .setScrollFactor(0)
      .setDepth(200);
  }

  /**
   * The stamp in the act's deep tone (a spot ink, not a threat): the word,
   * double-framed and tilted, at 0,0 for the form to place. `long` is its size
   * for a word of more than eight letters, `short` for one of eight or fewer.
   * A certificate stamps what `certificateStamp` says; an act's document, its own word.
   */
  private inkStamp(c: Certificate | string, long: number, short: number): Phaser.GameObjects.Container {
    const word = typeof c === 'string' ? c : certificateStamp(c);
    const size = word.length > 8 ? long : short;
    const inked = this.add
      .text(0, 0, word, {
        fontFamily: 'monospace',
        fontSize: `${size}px`,
        fontStyle: 'bold',
        color: css(this.visuals.background),
        letterSpacing: size > 40 ? 12 : 5,
      })
      .setOrigin(0.5);
    const bw = inked.width + 44;
    const bh = inked.height + 26;
    const frame = this.add.graphics();
    frame.lineStyle(4, this.visuals.background, 1).strokeRect(-bw / 2, -bh / 2, bw, bh);
    frame.lineStyle(1.5, this.visuals.background, 1).strokeRect(-bw / 2 + 7, -bh / 2 + 7, bw - 14, bh - 14);
    return this.add.container(0, 0, [frame, inked]).setSize(bw, bh).setAngle(-8).setAlpha(0.88);
  }

  private hideCertificate(): void {
    this.form?.destroy();
    delete this.form;
    this.overlay.setVisible(false);
    this.endScrim.setFillStyle(INK, 0.45);
    // God mode took the death back from the narrow form: the run goes on at
    // 1280×720, so what that form resized goes back to how createHud made it.
    if (this.restoreCanvas()) {
      this.events.off('shutdown', this.restoreCanvas, this);
      this.endScrim.setPosition(VIEW_WIDTH / 2, VIEW_HEIGHT / 2).setSize(VIEW_WIDTH, VIEW_HEIGHT);
      this.anchorHud(VIEW_WIDTH);
      this.devBadge.setPosition(VIEW_WIDTH - 14, 58);
      this.overlay.setFontSize(18).setLineSpacing(6).setWordWrapWidth(null);
    }
  }

  /**
   * The HUD's texts on a canvas `width` wide, where createHud set them on
   * 1280: the clock and the boss's label on its middle, the counts and the
   * worn line 16 in from its right edge. An upright phone's canvas (a paper,
   * the pause sheet, the narrow certificate) is `NARROW_WIDTH` wide, and at
   * 1280's places the right-hand texts ran off it and the clock stood
   * off-centre under the scrim. The bars follow the camera's width already.
   */
  private anchorHud(width: number): void {
    this.hudClock.setX(width / 2);
    this.hudBossLabel.setX(width / 2);
    this.hudRaceLabel.setX(width / 2);
    this.hudRight.setX(width - 16);
    // Set again here: the paper holds the scene's steps, and drawHud with them.
    this.hudDrag.setX(width - 16).setText(wornText(this.wornTerms, width < VIEW_WIDTH));
  }

  /**
   * Gives the 1280×720 canvas back if the narrow certificate took it; true
   * when it had. Also runs on shutdown, so a restart's `create` lays the HUD
   * out on the canvas it was written for.
   */
  private restoreCanvas(): boolean {
    if (this.scale.width === VIEW_WIDTH && this.scale.height === VIEW_HEIGHT) return false;
    this.scale.setGameSize(VIEW_WIDTH, VIEW_HEIGHT);
    return true;
  }

  /**
   * Small caps, which a canvas monospace does not have: a capital in `text` is
   * set at `big`, everything else capitalised at four-fifths of it, all on one
   * baseline and centred on `cx`.
   */
  private smallCaps(
    text: string,
    cx: number,
    baseline: number,
    big: number,
    colour: string,
    spacing: number,
  ): Phaser.GameObjects.Text[] {
    const small = Math.round(big * 0.78);
    const runs: { s: string; size: number }[] = [];
    for (const ch of text) {
      const size = ch !== ch.toLowerCase() ? big : small;
      const last = runs[runs.length - 1];
      if (last && last.size === size) last.s += ch.toUpperCase();
      else runs.push({ s: ch.toUpperCase(), size });
    }
    const parts = runs.map((r) =>
      this.add.text(0, 0, r.s, {
        fontFamily: 'monospace',
        fontSize: `${r.size}px`,
        color: colour,
        letterSpacing: spacing,
      }),
    );
    const total = parts.reduce((sum, t) => sum + t.width, 0) + spacing * (parts.length - 1);
    let x = cx - total / 2;
    for (const t of parts) {
      t.setPosition(x, baseline - t.getTextMetrics().ascent);
      x += t.width + spacing;
    }
    return parts;
  }
}
