import Phaser from 'phaser';
import { ACTS, type ActDef } from '../data/acts';
import { actVisuals, type ActVisuals } from '../data/act-visuals';
import { ITEMS, isActive, itemDef, type ItemIcon } from '../data/items';
import { neutralDevState, type DevState } from '../dev/state';
import { addVignette, ensureFieldTile, ensureGemTexture, ensureShotTextures } from './dressing';
import { ITEM_ICON_ATLAS, itemIconFrame } from '../data/item-visuals';
import { sfx } from '../audio/sfx';
import { combineMoves, stickVector, type Move } from './touch';
import { certificateLines, hudAge, lifeClock } from './certificate';
import { recordLife } from '../meta/ancestors';
import { InputLog } from '../meta/input-log';
import {
  BOSS_RADIUS,
  World,
  type EnemyState,
  type GemState,
  type Input,
  type ProjectileState,
} from '../sim/world';
import {
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
  private gemSprites: Phaser.GameObjects.Image[] = [];
  private ringSprites: Phaser.GameObjects.Arc[] = [];
  private areaSprites: Phaser.GameObjects.Arc[] = [];
  /** Orbit items' objects (Grudge), each wearing its card's icon (G-036). */
  private orbiterSprites: Phaser.GameObjects.Image[] = [];
  private attachedSprites: Phaser.GameObjects.Image[] = [];
  private bossSprite?: Phaser.GameObjects.Image;
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
  private heard = { kills: 0, hp: 0, stacks: 0, offers: false, boss: false, dead: false, won: false, xp: 0, level: 1, raced: 0, shot: 0, homework: 0, stun: 0, bossPhase: '' };

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
  private overlay!: Phaser.GameObjects.Text;
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
    this.gemSprites = [];
    this.ringSprites = [];
    this.areaSprites = [];
    this.orbiterSprites = [];
    this.attachedSprites = [];
    delete this.bossSprite;

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
    keyboard.on('keydown-P', togglePause);
    keyboard.on('keydown-M', () => sfx.toggleMute());
    // In case the title screen's unlock was missed (hot reload lands here).
    keyboard.on('keydown', () => sfx.unlock());
    keyboard.on('keydown-ESC', togglePause);
    keyboard.on('keydown-R', () => {
      // Mid-run restarts are a dev affordance. In a clean run R still only
      // works once the run is over, so it cannot be a panic button.
      const anytime = import.meta.env.DEV && this.dev.tainted;
      if (this.world.dead || this.world.won || anytime) this.scene.restart({ acts: this.life });
    });
    for (const [i, key] of ['ONE', 'TWO', 'THREE'].entries()) {
      keyboard.on(`keydown-${key}`, () => {
        const offers = this.world.offers;
        if (offers && offers[i]) {
          this.world.choose(offers[i]!);
          sfx.choose();
        }
      });
    }
    this.createTouch(togglePause);

    this.createHud();

    // A restart is the only thing that clears the taint, which is why the
    // state is rebuilt here rather than kept across scene restarts.
    this.offerCards = [];
    this.shownOffers = '';
    delete this.offerScrim;
    delete this.offerHeader;

    this.dev = neutralDevState();
    this.heard = { kills: 0, hp: this.world.hp, stacks: 0, offers: false, boss: false, dead: false, won: false, xp: 0, level: 1, raced: 0, shot: 0, homework: 0, stun: 0, bossPhase: '' };
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
    this.absorbZoomed = false;
    // `force`: the Egg's 1.5s lean-in may still be tweening at the crossing
    // (it always is at dev speed), and Phaser drops a zoomTo while one runs.
    // Found by the smoke test: School played zoomed in with the HUD clipped.
    this.cameras.main.zoomTo(1, 600, 'Sine.easeInOut', true);
    this.player
      .setTexture(this.visuals.atlas.key, this.visuals.playerFrame)
      .setDisplaySize(PLAYER_DISPLAY, PLAYER_DISPLAY);
    this.announceAct();
  }

  /** The act's name and the age it starts at, across the middle, then gone. */
  private announceAct(): void {
    const cam = this.cameras.main;
    const act = this.world.act;
    const card = this.add
      .text(cam.width / 2, cam.height / 2 - 120, [act.name, hudAge(act.age.from)], {
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
    this.overlay = this.add
      .text(cam.width / 2, cam.height / 2, '', {
        ...style(20, '#EFE7D6'),
        align: 'center',
        lineSpacing: 8,
      })
      .setOrigin(0.5)
      .setScrollFactor(0)
      .setDepth(200)
      .setVisible(false);
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
        if (this.world.certificate) recordLife(this.world.certificate);
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
    this.syncPlayer();
    this.syncEnemies();
    this.syncProjectiles();
    this.syncGems();
    this.syncRings();
    this.syncAreas();
    this.syncOrbiters();
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
    let enemyFired = false;
    for (const p of w.projectiles) {
      if (!p.hostile || p.serial <= h.shot) continue;
      if (p.owner) enemyFired = true;
      else bossFired = true;
      shot = Math.max(shot, p.serial);
    }
    if (bossFired) sfx.bossShot();
    if (enemyFired) sfx.substituteShot();
    // The Gym Teacher's whistle (SCHOOL-ROSTER §9): rising on the telegraph,
    // one long blow on the exit. Read off the phase edge like everything else;
    // the Egg's phases make no sound of their own.
    const bossPhase = w.boss?.phase ?? '';
    if (w.boss?.kind === 'gym-teacher' && bossPhase !== h.bossPhase) {
      if (bossPhase === 'telegraph') sfx.whistle();
      else if (bossPhase === 'absorbing') sfx.whistle(true);
    }
    // The hall monitor's stop, on its leading edge. A touch during a running
    // stun refreshes it without an edge, and stays silent.
    if (w.stunTimer > 0 && h.stun <= 0) sfx.stun();
    // A homework pile that actually landed: uids are monotonic, and paper
    // that lands on a pile merges into it without a uid of its own, so a
    // growing pile is heard once, when it first arrives. One per frame.
    let homework = h.homework;
    for (const e of w.enemies) if (e.def.id === 'homework' && e.uid > homework) homework = e.uid;
    if (homework > h.homework) sfx.homeworkLand();
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
    this.player.setDisplaySize(PLAYER_DISPLAY * (1 + stun), PLAYER_DISPLAY * (1 - stun));
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
        .strokeCircle(w.x, w.y, 33 + membrane);
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
    // unchanged: hostile gold stays on the Egg's shots and nothing else.
    this.fit(this.projectileSprites, list.length, () => this.add.image(0, 0, 'nc-shot').setDepth(8));
    for (let i = 0; i < list.length; i++) {
      const p = list[i]!;
      const s = this.projectileSprites[i]!;
      const heading = Math.atan2(p.vy, p.vx);
      if (p.hostile) {
        s.setTexture('nc-shot-hostile').setDisplaySize(p.radius * 2, p.radius * 2).setRotation(0);
      } else if (p.source && ITEMS[p.source]) {
        // Any item's shot is its card's icon: the manicule, the dart, the
        // group chat's placeholder until its art lands.
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

      if (a.pull) {
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
   * The texture for an item icon: the atlas frame when the atlas has it,
   * otherwise a PLACEHOLDER — a plain ring with the item's initial, made once
   * per icon key from the locked palette. It stands in until the authored SVG
   * icon set lands (G-038; the item's `iconPending` says so and a content
   * test holds it to that). Not art; a label.
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
      this.bossSprite.setDisplaySize(BOSS_RADIUS * 2, BOSS_RADIUS * 2);
      this.bossBaseScale = this.bossSprite.scaleX;
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
        .image(0, 0, this.visuals.atlas.key, 'antibody.png')
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

  /** One card per offer: glyph, name, level pips, one line of copy. */
  private buildOfferUi(offers: string[]): void {
    const cam = this.cameras.main;
    this.offerScrim = this.add
      .rectangle(cam.width / 2, cam.height / 2, cam.width, cam.height, INK, 0.45)
      .setScrollFactor(0)
      .setDepth(195);
    // An evolution arrives alone and is not a choice; the header says what it is.
    const first = offers.length === 1 ? itemDef(offers[0]!) : null;
    const evolution = first && isActive(first) && first.evolvesFrom ? first.evolvesFrom : null;
    this.offerHeader = this.add
      .text(cam.width / 2, 232, evolution ? 'EVOLUTION' : `LEVEL ${this.world.level}`, {
        fontFamily: 'monospace',
        fontSize: '15px',
        color: '#D2C6AC',
        letterSpacing: 8,
      })
      .setOrigin(0.5)
      .setScrollFactor(0)
      .setDepth(200);

    const W = 350;
    const H = 176;
    const GAP = 26;
    const total = offers.length * W + (offers.length - 1) * GAP;

    offers.forEach((id, i) => {
      const def = itemDef(id);
      const owned = this.world.items.get(id) ?? 0;
      const x = cam.width / 2 - total / 2 + W / 2 + i * (W + GAP);

      const g = this.add.graphics();
      g.fillStyle(INK, 1).fillRoundedRect(-W / 2, -H / 2, W, H, 10);
      g.lineStyle(2, UI_FILL, 0.5).strokeRoundedRect(-W / 2, -H / 2, W, H, 10);
      // The medallion: a quiet plate under the icon, so the art sits IN the
      // card instead of floating on it. A drawn keycap box for the number,
      // for the same reason.
      g.fillStyle(SHADOW, 0.3).fillCircle(-W / 2 + 54, -12, 36);
      g.lineStyle(1.5, UI_FILL, 0.25).strokeCircle(-W / 2 + 54, -12, 36);
      g.lineStyle(1.5, UI_FILL, 0.4).strokeRoundedRect(-W / 2 + 12, -H / 2 + 10, 22, 22, 5);

      const keycap = this.add
        .text(-W / 2 + 23, -H / 2 + 21, String(i + 1), {
          fontFamily: 'monospace',
          fontSize: '14px',
          color: '#D2C6AC',
        })
        .setOrigin(0.5);
      const [iconKey, iconFrame] = this.iconTexture(def.icon, def.name);
      const icon = this.add.image(-W / 2 + 54, -12, iconKey, iconFrame).setDisplaySize(52, 52);
      const name = this.add.text(-W / 2 + 100, -42, def.name, {
        fontFamily: 'monospace',
        fontSize: '20px',
        color: '#EFE7D6',
        letterSpacing: 1,
      });
      // Pips: up to eight now. Spaced when they fit, packed when they do not;
      // either way inside the 250px right of the medallion.
      const gap = def.maxLevel > 6 ? '' : ' ';
      const evolvedFrom =
        isActive(def) && def.evolvesFrom
          ? `${itemDef(def.evolvesFrom.weapon).name} + ${itemDef(def.evolvesFrom.with).name}`
          : null;
      const pips = this.add.text(
        -W / 2 + 100,
        -12,
        evolvedFrom ??
          (owned === 0 ? 'new' : ('●' + gap).repeat(owned) + ('○' + gap).repeat(def.maxLevel - owned)),
        { fontFamily: 'monospace', fontSize: '13px', color: '#D2C6AC' },
      );
      // New: what it is. Owned: what the next level adds.
      const next = owned > 0 && isActive(def) ? def.levels[owned]?.text : undefined;
      const blurb = this.add
        .text(-W / 2 + 24, 20, next ?? def.blurb, {
          fontFamily: 'monospace',
          fontSize: '15px',
          color: '#EFE7D6',
          lineSpacing: 6,
          wordWrap: { width: W - 48, useAdvancedWrap: true },
        })
        .setAlpha(0.88);

      const card = this.add
        .container(x, 396, [g, keycap, icon, name, pips, blurb])
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
    const bossLabel = w.boss?.shielded
      ? `${w.act.bossName.toLowerCase()} \u00b7 put the equipment away`
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
    // same three items, and the pips must not show the pre-choice level.
    const offerKey = w.offers
      ? `${w.level}:${w.offers.map((id) => `${id}@${w.items.get(id) ?? 0}`).join(',')}`
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
      this.overlay
        .setText('paused' + '\n\n' + (this.touch ? 'tap to resume' : 'P or Esc to resume'))
        .setVisible(true);
      return;
    }

    if (w.dead || w.won) {
      // The run's receipt: what you took is as much the story as how far you
      // got, and it is the input to "what would I do differently" — which is
      // the thought that makes a survivors run repeatable.
      const build = [...w.items.entries()].map(([id, lv]) => `${itemDef(id).name} ${lv}`);
      const buildLines: string[] = [];
      for (let i = 0; i < build.length; i += 4) buildLines.push(build.slice(i, i + 4).join('  ·  '));
      // The certificate (D-024): what ended it and how old you were. The sim
      // writes the record; certificate.ts decides how it reads.
      const said = w.certificate ? certificateLines(w.certificate) : ['', ''];
      this.endScrim.setVisible(true);
      this.overlay
        .setText(
          [
            said[0],
            said[1],
            '',
            `${w.act.name}   ${lifeClock(w.time)} lived   ${w.kills} killed   level ${w.level}`,
            ...buildLines,
            '',
            this.touch ? 'tap to live again' : 'R to live again',
          ].join('\n'),
        )
        .setVisible(true);
    } else {
      this.overlay.setVisible(false);
      this.endScrim.setVisible(false);
    }
  }
}
