import Phaser from 'phaser';
import { ACTS, type ActDef } from '../data/acts';
import { actVisuals, type ActVisuals } from '../data/act-visuals';
import { ITEMS, isActive, itemDef, type ItemIcon } from '../data/items';
import { neutralDevState, type DevState } from '../dev/state';
import { addVignette, ensureFieldTile, ensureGemTexture, ensureShotTextures } from './dressing';
import { ITEM_ICON_ATLAS, itemIconFrame } from '../data/item-visuals';
import { parseOfferId } from '../data/items';
import { offerPips, offerTitle, statLines } from '../data/item-text';
import { sfx } from '../audio/sfx';
import { combineMoves, stickVector, type Move } from './touch';
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
  WIDE_SHEET,
  wideLayout,
} from './certificate';
import { recordLife } from '../meta/ancestors';
import { InputLog } from '../meta/input-log';
import { DEFAULT_NAME, misspell, readPlayerName } from '../meta/name';
import {
  BOSS_RADIUS,
  PLAYER_RADIUS,
  STRIKE_DELAY,
  World,
  type Certificate,
  type EnemyState,
  type GemState,
  type Input,
  type ProjectileState,
} from '../sim/world';
import {
  BONE,
  INK,
  PAPER,
  SHADOW,
  THREAT_CONTACT,
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
 * How far a finger travels for full stick, in CSS pixels rather than game
 * pixels: the canvas is FIT-scaled, and a radius in game units would be a
 * third of the size on a portrait phone that it is on a desktop.
 */
const STICK_RADIUS_CSS = 56;
/** A tap this soon after the run ends is the thumb still steering, not a restart. */
const RESTART_GRACE_MS = 700;
/** The last clean run's held headings (src/meta/input-log.ts), beside `nc-ancestors`. One run, overwritten. */
const INPUT_LOG_KEY = 'nc-input-log';
/** Arrival toasts stay below the HUD's top band (plate, boss bar, race bar) and this far off the edges. */
const TOAST_TOP = 104;
const TOAST_EDGE = 16;
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
  /** The substitute's shots: the player's name, spelled wrong (SCHOOL-ROSTER §3.5). */
  private nameShotTexts: Phaser.GameObjects.Text[] = [];
  /** The name on the form, read once per life; the sim never knows it. */
  private playerName = DEFAULT_NAME;
  private gemSprites: Phaser.GameObjects.Image[] = [];
  private ringSprites: Phaser.GameObjects.Arc[] = [];
  private areaSprites: Phaser.GameObjects.Arc[] = [];
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
   * way it notices everything else: by reading state and diffing.
   */
  private heard = { kills: 0, hp: 0, stacks: 0, offers: false, boss: false, dead: false, won: false, xp: 0, level: 1, raced: 0, shot: 0, homework: 0, stun: 0, bossPhase: '', typing: 0, car: 0, time: 0, auraAt: -Infinity };

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
  private hudBossLabel!: Phaser.GameObjects.Text;
  private hudRaceLabel!: Phaser.GameObjects.Text;
  private bars!: Phaser.GameObjects.Graphics;
  /**
   * The certificate's words: `certificateLines`, typed on the receipt under
   * the form (showCertificate). The smoke reads this object's text for
   * "Natural causes." and "Age 18." (tools/smoke/run.ts), so those lines live
   * here and nowhere else on the sheet decides them.
   */
  private overlay!: Phaser.GameObjects.Text;
  /** "paused", centred. Was `overlay` before the certificate became a form. */
  private pauseNote!: Phaser.GameObjects.Text;
  /** The certificate as a document. Built the first frame the run is over. */
  private form?: Phaser.GameObjects.Container;
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

    this.enemySprites = [];
    this.projectileSprites = [];
    this.nameShotTexts = [];
    this.playerName = readPlayerName() ?? DEFAULT_NAME;
    this.gemSprites = [];
    this.ringSprites = [];
    this.areaSprites = [];
    this.orbiterSprites = [];
    this.auraRings = [];
    this.auraIcons = [];
    this.sweepIcons = [];
    this.attachedSprites = [];
    delete this.bossSprite;
    delete this.floorRing;

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
          if (offers && offers[i]) {
            this.world.choose(offers[i]!);
            sfx.choose();
          }
        }),
      );
    }
    this.createTouch(togglePause);

    this.createHud();

    // A restart is the only thing that clears the taint, which is why the
    // state is rebuilt here rather than kept across scene restarts.
    this.offerCards = [];
    this.shownOffers = '';
    delete this.offerScrim;
    delete this.offerHeader;
    this.arrivalCards = [];
    this.arrivalUid = 0;
    this.resetArrivals();

    this.dev = neutralDevState();
    this.heard = { kills: 0, hp: this.world.hp, stacks: 0, offers: false, boss: false, dead: false, won: false, xp: 0, level: 1, raced: 0, shot: 0, homework: 0, stun: 0, bossPhase: '', typing: 0, car: 0, time: this.world.time, auraAt: -Infinity };
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
    this.announceAct();
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
      plate.fillStyle(INK, 0.4).fillCircle(0, 0, 30);
      plate.lineStyle(2, UI_FILL, 0.45).strokeCircle(0, 0, 30);
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
    this.hudDrag = this.add
      .text(cam.width - 16, 34, '', style(13, '#D2C6AC'))
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
    this.syncProjectiles();
    this.syncGems();
    this.syncRings();
    this.syncAreas();
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
    if (w.dragStacks > h.stacks) {
      sfx.attach();
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
    for (const id of firedBy) if (id !== 'group-chat' && id !== 'substitute-teacher') sfx.substituteShot();
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
    // as homework's is. One of each per frame.
    let typing = 0;
    let car = h.car;
    for (const e of w.enemies) {
      if (e.def.id === 'group-chat' && e.consult > 0) typing++;
      else if (e.def.id === 'drivers-ed' && e.uid > car) car = e.uid;
    }
    if (typing > h.typing) sfx.typing();
    if (car > h.car) sfx.carPass();
    // G-044's three weapons. Unlike the counters above, their state sits still
    // while the world does (a card up, the run over), so an arc or a landed
    // bolt read off a held world would sound every frame. They hear only the
    // world time this frame's steps covered, and nothing while an offer is
    // open or the life is done.
    const elapsed = w.time - h.time;
    let auraAt = h.auraAt;
    if (elapsed > 0 && !w.offers && !w.dead && !w.won) {
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
    if (w.dead && !h.dead) sfx.death();
    if (w.won && !h.won) sfx.win();
    this.heard = {
      kills: w.kills,
      hp: w.hp,
      stacks: w.dragStacks,
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
      time: w.time,
      auraAt,
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
    if (this.dev.noDrag) w.dragStacks = 0;
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
    this.player.setDisplaySize(PLAYER_DISPLAY * grown * (1 + stun), PLAYER_DISPLAY * grown * (1 - stun));
    // The swim: quick small wiggle. It is the player character in an act
    // where the whole field is alive; a rigid sprite reads as a cursor.
    this.player.setRotation(stun ? 0 : Math.sin(this.world.time * 9) * 0.09);

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
    const list: EnemyState[] = this.world.enemies;
    this.fit(this.enemySprites, list.length, () =>
      this.add.image(0, 0, this.visuals.atlas.key).setDepth(5),
    );
    for (let i = 0; i < list.length; i++) {
      const e = list[i]!;
      const s = this.enemySprites[i]!;
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
        case 'drivers-ed': {
          // A vehicle has a front (AUDIT part five): the car is drawn side-on
          // facing right, so it turns to its `cross` heading, and one driving
          // left flips and rotates by the remainder so the roof stays up.
          // Gated on the id, not on `cross`, because no per-def visual flag
          // exists and the other crossers have no front in this game's
          // drawing: the dodgeball and white cell are round, and the hall
          // monitor and substitute are people, who would walk left on their
          // heads. A second vehicle is the moment to add a flag instead.
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
    this.fit(this.projectileSprites, list.length, () => this.add.image(0, 0, 'nc-shot').setDepth(8));
    let named = 0;
    for (const p of list) if (p.hostile && p.owner?.id === 'substitute-teacher') named++;
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
      if (p.hostile && p.owner?.id === 'substitute-teacher') {
        this.nameShotTexts[named++]!
          .setText(misspell(this.playerName, p.serial))
          .setPosition(p.x, p.y)
          .setVisible(true);
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
        // and would otherwise draw as Temper's starburst.
        const def = a.source ? ITEMS[a.source] : undefined;
        const [key, frame] = def ? this.iconTexture(def.icon, def.name) : ['nc-shot', undefined];
        if (a.delay > 0) {
          const t = 1 - a.delay / STRIKE_DELAY;
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
    this.bossSprite
      .setPosition(b.x, b.y)
      .setScale(Phaser.Math.Linear(this.bossSprite.scaleX, target, 0.14))
      // Value, not tint (G-032, law 10).
      .setAlpha(b.phase === 'absorbing' ? Math.max(0, b.timer / 1.8) : telegraph ? 0.72 : 1);
  }

  private syncAttached(): void {
    const want = Math.min(this.world.dragStacks, MAX_ATTACHED_SPRITES);
    while (this.attachedSprites.length < want) {
      const angle = Math.random() * Math.PI * 2;
      const s = this.add
        .image(0, 0, this.visuals.atlas.key, this.visuals.attachFrame ?? 'antibody.png')
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
      const angle = (s.getData('angle') as number) + this.world.time * 0.18;
      const dist = s.getData('dist') as number;
      s.setVisible(true).setPosition(
        this.world.x + Math.cos(angle) * dist,
        this.world.y + Math.sin(angle) * dist,
      );
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
      const owned = { level, pathLevel };
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
    this.hudDrag.setText(
      w.dragStacks > 0 ? `${w.dragStacks} attached  −${drag}% speed` : '',
    );

    this.bars.clear();
    // The plate: one quiet ink surface holding both bars, so the corner reads
    // as an instrument instead of two floating rectangles.
    this.bars.fillStyle(INK, 0.4).fillRoundedRect(12, 8, 236, 46, 7);
    // Health.
    this.bars.fillStyle(INK, 0.55).fillRect(22, 30, 216, 9);
    // Law 10 names this case directly: damage feedback goes to value, never to
    // tint, because a player flashing contact-red makes the colour mean
    // "someone is being hurt" instead of "this hurts". The player sprite
    // already dims on i-frames, which is the value channel doing the job.
    this.bars.fillStyle(PAPER, w.invulnerable > 0 ? 0.45 : 1);
    this.bars.fillRect(22, 30, (216 * Math.max(0, w.hp)) / w.maxHp, 9);
    // Experience.
    this.bars.fillStyle(INK, 0.55).fillRect(22, 43, 216, 4);
    this.bars.fillStyle(UI_FILL, 1).fillRect(22, 43, (216 * w.xp) / w.xpToNext, 4);
    // The boss carries its own bar across the top, under its name.
    // Shielded (the Gym Teacher with a ball still on the floor): the bar
    // dims and the label says why, because hitting him does nothing and the
    // bots showed a player who never learns that sits in the fight forever.
    const bossLabel = w.boss?.shielded && w.act.boss.shieldHint
      ? `${w.act.bossName.toLowerCase()} \u00b7 ${w.act.boss.shieldHint}`
      : w.act.bossName.toLowerCase();
    this.hudBossLabel.setText(bossLabel).setVisible(!!w.boss);
    if (w.boss) {
      const width = this.cameras.main.width - 480;
      this.bars.fillStyle(INK, 0.6).fillRoundedRect(240, 68, width, 8, 4);
      // Debatable — the bar represents a thing that does hurt — but law 10
      // says UI chrome, without an exception. Flagged rather than argued.
      const frac = w.boss.hp / w.boss.maxHp;
      if (frac > 0.02) {
        this.bars.fillStyle(UI_FILL, w.boss.shielded ? 0.35 : 1).fillRoundedRect(240, 68, width * frac, 8, 4);
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
    const offerKey = w.offers
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
      return;
    }
    this.pauseNote.setVisible(false);

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
   */
  private inkStamp(c: Certificate, long: number, short: number): Phaser.GameObjects.Container {
    const word = certificateStamp(c);
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
      this.devBadge.setPosition(VIEW_WIDTH - 14, 58);
      this.overlay.setFontSize(18).setLineSpacing(6).setWordWrapWidth(null);
    }
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
