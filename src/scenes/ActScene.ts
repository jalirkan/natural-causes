import Phaser from 'phaser';
import type { ActDef } from '../data/acts';
import { actVisuals, type ActVisuals } from '../data/act-visuals';
import { itemDef } from '../data/items';
import { neutralDevState, type DevState } from '../dev/state';
import { sfx } from '../audio/sfx';
import {
  BOSS_RADIUS,
  World,
  type EnemyState,
  type GemState,
  type ProjectileState,
} from '../sim/world';
import {
  INK,
  PAPER,
  THREAT_CONTACT,
  THREAT_RANGED,
  UI_FILL,
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

export class ActScene extends Phaser.Scene {
  private act!: ActDef;
  private visuals!: ActVisuals;
  private world!: World;

  private player!: Phaser.GameObjects.Image;
  private cursors!: Phaser.Types.Input.Keyboard.CursorKeys;
  private wasd!: Record<'W' | 'A' | 'S' | 'D', Phaser.Input.Keyboard.Key>;

  private enemySprites: Phaser.GameObjects.Image[] = [];
  private projectileSprites: Phaser.GameObjects.Arc[] = [];
  private gemSprites: Phaser.GameObjects.Arc[] = [];
  private ringSprites: Phaser.GameObjects.Arc[] = [];
  private areaSprites: Phaser.GameObjects.Arc[] = [];
  private attachedSprites: Phaser.GameObjects.Image[] = [];
  private bossSprite?: Phaser.GameObjects.Image;
  /** Scale the boss frame sits at when idle. The telegraph pulses around it. */
  private bossBaseScale = 1;

  /** Set by P or Escape. Distinct from the offer freeze, which is the rules. */
  private paused = false;

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
  private heard = { kills: 0, hp: 0, stacks: 0, offers: false, boss: false, dead: false, won: false, xp: 0, level: 1 };

  private hud!: Phaser.GameObjects.Text;
  private bars!: Phaser.GameObjects.Graphics;
  private overlay!: Phaser.GameObjects.Text;
  private offerText!: Phaser.GameObjects.Text;
  private devBadge!: Phaser.GameObjects.Text;

  constructor() {
    super('act');
  }

  init(data?: { act?: ActDef }): void {
    const act = data?.act ?? this.act;
    if (!act) throw new Error('ActScene was started without an act');
    this.act = act;
    this.visuals = actVisuals(act.id);
  }

  preload(): void {
    this.load.atlas(this.visuals.atlas.key, this.visuals.atlas.png, this.visuals.atlas.json);
  }

  create(): void {
    // The world places the player itself — the arena is its own now.
    this.world = new World({ act: this.act, seed: Date.now() & 0xffff });

    this.enemySprites = [];
    this.projectileSprites = [];
    this.gemSprites = [];
    this.ringSprites = [];
    this.areaSprites = [];
    this.attachedSprites = [];
    delete this.bossSprite;

    this.cameras.main.setBackgroundColor(this.visuals.background);
    this.createField();

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
      if (this.world.dead || this.world.won || anytime) this.scene.restart({ act: this.act });
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

    this.createHud();

    // A restart is the only thing that clears the taint, which is why the
    // state is rebuilt here rather than kept across scene restarts.
    this.dev = neutralDevState();
    this.heard = { kills: 0, hp: this.world.hp, stacks: 0, offers: false, boss: false, dead: false, won: false, xp: 0, level: 1 };
    if (import.meta.env.DEV) {
      this.detachDev?.();
      void import('../dev/panel').then(({ attachDevPanel }) => {
        this.detachDev = attachDevPanel({
          world: this.world,
          dev: this.dev,
          durationSeconds: this.act.durationSeconds,
          restart: () => this.scene.restart({ act: this.act }),
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
        'WASD or arrows to move   ·   you fire automatically   ·   1/2/3 choose an upgrade   ·   P pauses',
        { fontFamily: 'monospace', fontSize: '15px', color: '#EFE7D6' },
      )
      .setOrigin(0.5)
      .setScrollFactor(0)
      .setDepth(150)
      .setAlpha(0.85);
    this.tweens.add({ targets: hint, alpha: 0, delay: 6500, duration: 1200 });
  }

  /**
   * A flat field of one colour gives no motion cue — the player moves and
   * nothing appears to happen. A sparse tiled mark fixes that for the cost of
   * one texture, and reads as paper tooth, which is the register.
   */
  private createField(): void {
    const key = 'field-tile';
    if (!this.textures.exists(key)) {
      const g = this.add.graphics();
      g.fillStyle(PAPER, 0.09);
      g.fillCircle(8, 8, 2.5);
      g.fillCircle(40, 32, 2);
      g.fillCircle(24, 52, 1.5);
      g.generateTexture(key, 64, 64);
      g.destroy();
    }
    this.add.tileSprite(0, 0, WORLD_WIDTH, WORLD_HEIGHT, key).setOrigin(0, 0).setDepth(0);
  }

  private createHud(): void {
    this.hud = this.add
      .text(14, 12, '', { fontFamily: 'monospace', fontSize: '15px', color: '#EFE7D6' })
      .setScrollFactor(0)
      .setDepth(100);
    this.bars = this.add.graphics().setScrollFactor(0).setDepth(100);
    this.overlay = this.add
      .text(this.cameras.main.width / 2, this.cameras.main.height / 2, '', {
        fontFamily: 'monospace',
        fontSize: '20px',
        color: '#EFE7D6',
        align: 'center',
        lineSpacing: 8,
      })
      .setOrigin(0.5)
      .setScrollFactor(0)
      .setDepth(200)
      .setVisible(false);
    this.devBadge = this.add
      .text(this.cameras.main.width - 14, 12, 'DEV · RUN TAINTED', {
        fontFamily: 'monospace',
        fontSize: '13px',
        color: '#EFE7D6',
        backgroundColor: '#2A2521',
        padding: { x: 7, y: 3 },
      })
      .setOrigin(1, 0)
      .setScrollFactor(0)
      .setDepth(210)
      .setVisible(false);
    this.offerText = this.add
      .text(this.cameras.main.width / 2, this.cameras.main.height / 2, '', {
        fontFamily: 'monospace',
        fontSize: '16px',
        color: '#EFE7D6',
        align: 'left',
        lineSpacing: 6,
        backgroundColor: '#2A2521',
        padding: { x: 22, y: 18 },
        // The panel is centred with origin 0.5, so anything wider than the
        // viewport hangs off both edges. Item copy is capped at 64 characters
        // to fit; this wrap is the guard for the next time that cap is edited.
        wordWrap: { width: VIEW_WIDTH - 200, useAdvancedWrap: true },
      })
      .setOrigin(0.5)
      .setScrollFactor(0)
      .setDepth(200)
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
    const input = {
      moveX: (right ? 1 : 0) - (left ? 1 : 0),
      moveY: (down ? 1 : 0) - (up ? 1 : 0),
    };

    // Fast-forward runs whole extra steps rather than a longer one: a 4x dt
    // would be a 200ms step, and things that move at 640px/s tunnel straight
    // through a 15px enemy at that size.
    const scale = this.dev.timeScale;
    if (scale >= 1) for (let i = 0; i < Math.round(scale); i++) this.world.step(dt, input);
    else this.world.step(dt * scale, input);

    this.applyDevCheats();

    this.hearWorld();
    this.syncPlayer();
    this.syncEnemies();
    this.syncProjectiles();
    this.syncGems();
    this.syncRings();
    this.syncAreas();
    this.syncBoss();
    this.syncAttached();
    this.drawHud();
  }

  /** Reads what changed this frame and gives it a sound. */
  private hearWorld(): void {
    const w = this.world;
    const h = this.heard;
    if (w.kills > h.kills) sfx.kill();
    // XP rises only on pickup; it falls at a level-up, which is not a pickup.
    if (w.xp > h.xp && w.level === h.level) sfx.gem();
    if (w.hp < h.hp - 0.01) sfx.hurt();
    if (w.dragStacks > h.stacks) sfx.attach();
    if (!!w.offers && !h.offers) sfx.offer();
    if (w.boss && !h.boss) sfx.bossSpawn();
    if (w.projectiles.some((p) => p.hostile && p.life > 3.9)) sfx.bossShot();
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
        .setDisplaySize(e.def.displaySize, e.def.displaySize)
        .setAlpha(e.hitFlash > 0 ? 0.55 : 1)
        .setVisible(true);
      // Reset the flip for non-chasers: pooled sprites inherit state from
      // whatever used the slot last frame, and a drifting antibody was
      // arriving pre-flipped by a dead rival.
      s.setFlipX(e.def.movement === 'chase' ? this.world.x < e.x : false);
    }
  }

  private syncProjectiles(): void {
    const list: ProjectileState[] = this.world.projectiles;
    this.fit(this.projectileSprites, list.length, () => this.add.circle(0, 0, 5, PAPER).setDepth(8));
    for (let i = 0; i < list.length; i++) {
      const p = list[i]!;
      this.projectileSprites[i]!.setPosition(p.x, p.y)
        .setRadius(p.radius)
        // G-031: ranged gold lives on the PROJECTILE, game-wide. The Egg's
        // body is boss teal and gold first appears as its first shot, which
        // is closer to what G-010 wanted than colouring the body.
        .setFillStyle(p.hostile ? THREAT_RANGED : PAPER)
        .setVisible(true);
    }
  }

  private syncGems(): void {
    const list: GemState[] = this.world.gems;
    this.fit(this.gemSprites, list.length, () =>
      // Law 10 / G-030: a pickup wears the act's light tone. Not a threat
      // colour, and not bone — bone put it in competition with the player for
      // lightest thing on screen, which is the one read a horde game cannot
      // afford to blur.
      this.add.circle(0, 0, GEM_SIZE, this.visuals.pickup).setDepth(3),
    );
    for (let i = 0; i < list.length; i++) {
      this.gemSprites[i]!.setPosition(list[i]!.x, list[i]!.y).setVisible(true);
    }
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

  private syncAreas(): void {
    const list = this.world.areas;
    this.fit(this.areaSprites, list.length, () => this.add.circle(0, 0, 10).setDepth(2));
    for (let i = 0; i < list.length; i++) {
      const a = list[i]!;
      const fade = 1 - a.age / a.seconds;
      this.areaSprites[i]!.setPosition(a.x, a.y)
        .setRadius(a.radius)
        // The attractor is the player's own field and does not hurt them, so
        // law 10 keeps a threat colour off it too.
        .setFillStyle(a.pull ? this.visuals.pickup : PAPER, (a.pull ? 0.1 : 0.16) * fade)
        .setVisible(true);
    }
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
    const target = this.bossBaseScale * (telegraph ? 1.06 : 1);
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
      const angle = s.getData('angle') as number;
      const dist = s.getData('dist') as number;
      s.setVisible(true).setPosition(
        this.world.x + Math.cos(angle) * dist,
        this.world.y + Math.sin(angle) * dist,
      );
    }
  }

  private formatTime(): string {
    const m = Math.floor(this.world.time / 60);
    const s = Math.floor(this.world.time % 60);
    return `${m}:${s.toString().padStart(2, '0')}`;
  }

  private drawHud(): void {
    const w = this.world;
    // The antibodies' OWN cost, not the deviation from base speed. The latter
    // folded in passive item speed and so lied in both directions: Membrane
    // alone printed "0 attached (-8%)", and Midpiece hid a real 13% antibody
    // drag entirely by pushing the total back above base. §3.3 asks whether a
    // player can tell when it went wrong; this is the only instrument they get.
    const drag = Math.round((1 - w.antibodyDrag) * 100);
    this.hud.setText(
      `${this.formatTime()}   lv${w.level}   ${w.kills} killed   ${w.enemies.length} on screen   ` +
        `${w.dragStacks} attached${drag > 0 ? ` (-${drag}% speed)` : ''}   ` +
        `${Math.round(this.game.loop.actualFps)} fps`,
    );

    this.bars.clear();
    // Health.
    this.bars.fillStyle(INK, 0.5).fillRect(14, 36, 220, 9);
    // Law 10 names this case directly: damage feedback goes to value, never to
    // tint, because a player flashing contact-red makes the colour mean
    // "someone is being hurt" instead of "this hurts". The player sprite
    // already dims on i-frames, which is the value channel doing the job.
    this.bars.fillStyle(PAPER, w.invulnerable > 0 ? 0.45 : 1);
    this.bars.fillRect(14, 36, (220 * Math.max(0, w.hp)) / w.maxHp, 9);
    // Experience.
    this.bars.fillStyle(INK, 0.5).fillRect(14, 48, 220, 4);
    this.bars.fillStyle(UI_FILL, 1).fillRect(14, 48, (220 * w.xp) / w.xpToNext, 4);
    // The boss carries its own bar across the top.
    if (w.boss) {
      const width = this.cameras.main.width - 240;
      this.bars.fillStyle(INK, 0.6).fillRect(120, 68, width, 10);
      // Debatable — the bar represents a thing that does hurt — but law 10
      // says UI chrome, without an exception. Flagged rather than argued.
      this.bars.fillStyle(UI_FILL, 1).fillRect(120, 68, (width * w.boss.hp) / w.boss.maxHp, 10);
    }

    if (w.offers) {
      // Each item supplies its own one-line gain and cost. The design strings
      // are three sentences of argument apiece and were being cut at 78
      // characters, which ended every line mid-clause.
      const lines = [`LEVEL ${w.level}  —  CHOOSE ONE`, ''];
      for (const [i, id] of w.offers.entries()) {
        const def = itemDef(id);
        const owned = w.items.get(id) ?? 0;
        lines.push(`[${i + 1}]  ${def.name.padEnd(15)}${owned > 0 ? `lv ${owned} → ${owned + 1}` : 'new'}`);
        lines.push(`     + ${def.gain}`);
        lines.push(`     − ${def.cost}`);
        if (i < w.offers.length - 1) lines.push('');
      }
      this.offerText.setText(lines).setVisible(true);
    } else {
      this.offerText.setVisible(false);
    }

    // On the canvas, not in the DOM panel, so it is present in a screenshot
    // and present with the panel hidden. Paper on ink rather than a threat
    // colour: law 10 keeps those off UI chrome without an exception.
    this.devBadge.setVisible(import.meta.env.DEV && this.dev.tainted);

    if (this.paused) {
      this.overlay.setText('paused\n\nP or Esc to resume\n\nR restarts the run').setVisible(true);
      return;
    }

    if (w.dead || w.won) {
      // The run's receipt: what you took is as much the story as how far you
      // got, and it is the input to "what would I do differently" — which is
      // the thought that makes a survivors run repeatable.
      const build = [...w.items.entries()].map(([id, lv]) => `${itemDef(id).name} ${lv}`);
      const buildLines: string[] = [];
      for (let i = 0; i < build.length; i += 4) buildLines.push(build.slice(i, i + 4).join('  ·  '));
      this.overlay
        .setText(
          [
            w.dead ? 'you did not make it' : 'you were let in',
            '',
            `${this.formatTime()}   ${w.kills} killed   level ${w.level}`,
            ...buildLines,
            '',
            'R to try again',
          ].join('\n'),
        )
        .setVisible(true);
    } else {
      this.overlay.setVisible(false);
    }
  }
}
