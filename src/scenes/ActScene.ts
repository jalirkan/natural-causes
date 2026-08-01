import Phaser from 'phaser';
import type { ActDef } from '../data/acts';
import { enemyDef, type EnemyDef } from '../data/enemies';
import { weaponDef, type WeaponDef } from '../data/weapons';
import { Pool } from '../systems/pool';
import { INK, PAPER, THREAT_CONTACT, WORLD_HEIGHT, WORLD_WIDTH } from '../config';

interface Enemy {
  sprite: Phaser.GameObjects.Image;
  def: EnemyDef;
  hp: number;
  hitFlash: number;
}

interface Projectile {
  sprite: Phaser.GameObjects.Arc;
  vx: number;
  vy: number;
  life: number;
  damage: number;
  pierce: number;
}

const PLAYER_SPEED = 190;
const PLAYER_MAX_HP = 100;
const PLAYER_RADIUS = 16;
const PLAYER_DISPLAY = 56;
/** Seconds of immunity after taking a hit. Without it a crowd deletes you. */
const IFRAMES = 0.6;

/**
 * One act of the run. Reads an ActDef and knows nothing about Conception
 * specifically, so the remaining acts are data rather than another scene.
 *
 * Movement, spawning and collision are integrated by hand rather than by
 * arcade physics: a horde game moves hundreds of entities itself, and the
 * physics system would be carried for no benefit.
 */
export class ActScene extends Phaser.Scene {
  private act!: ActDef;
  private player!: Phaser.GameObjects.Image;
  private cursors!: Phaser.Types.Input.Keyboard.CursorKeys;
  private wasd!: Record<'W' | 'A' | 'S' | 'D', Phaser.Input.Keyboard.Key>;

  private enemies!: Pool<Enemy>;
  private projectiles!: Pool<Projectile>;
  private weapon!: WeaponDef;

  private hp = PLAYER_MAX_HP;
  private invulnerable = 0;
  private elapsed = 0;
  private kills = 0;
  private spawnAccumulator = 0;
  private fireCooldown = 0;
  private dead = false;

  private hud!: Phaser.GameObjects.Text;
  private hpBar!: Phaser.GameObjects.Graphics;

  constructor() {
    super('act');
  }

  /**
   * `restart()` may be called without data — keep the act already running
   * rather than tearing down on an undefined field in preload, and say so
   * plainly if there genuinely is not one.
   */
  init(data?: { act?: ActDef }): void {
    const act = data?.act ?? this.act;
    if (!act) throw new Error('ActScene was started without an act');
    this.act = act;
  }

  preload(): void {
    this.load.atlas(this.act.atlas.key, this.act.atlas.png, this.act.atlas.json);
  }

  create(): void {
    this.hp = PLAYER_MAX_HP;
    this.elapsed = 0;
    this.kills = 0;
    this.spawnAccumulator = 0;
    this.fireCooldown = 0;
    this.invulnerable = 0;
    this.dead = false;

    this.cameras.main.setBackgroundColor(this.act.background);
    this.createField();

    this.player = this.add
      .image(WORLD_WIDTH / 2, WORLD_HEIGHT / 2, this.act.atlas.key, this.act.playerFrame)
      .setDepth(10);
    this.player.setDisplaySize(PLAYER_DISPLAY, PLAYER_DISPLAY);

    this.cameras.main.startFollow(this.player, true, 0.12, 0.12);
    this.cameras.main.setBounds(0, 0, WORLD_WIDTH, WORLD_HEIGHT);

    const keyboard = this.input.keyboard;
    if (!keyboard) throw new Error('No keyboard input available.');
    this.cursors = keyboard.createCursorKeys();
    this.wasd = keyboard.addKeys('W,A,S,D') as typeof this.wasd;
    keyboard.on('keydown-R', () => {
      if (this.dead) this.scene.restart({ act: this.act });
    });

    this.weapon = weaponDef('lash');

    this.enemies = new Pool<Enemy>(
      () => ({
        sprite: this.add.image(0, 0, this.act.atlas.key).setDepth(5),
        def: enemyDef('rival-sperm'),
        hp: 0,
        hitFlash: 0,
      }),
      (e) => e.sprite.setVisible(false).setActive(false),
    );

    this.projectiles = new Pool<Projectile>(
      () => ({
        sprite: this.add.circle(0, 0, 5, PAPER).setDepth(8),
        vx: 0,
        vy: 0,
        life: 0,
        damage: 0,
        pierce: 0,
      }),
      (p) => p.sprite.setVisible(false).setActive(false),
    );

    this.createHud();
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
    this.add
      .tileSprite(0, 0, WORLD_WIDTH, WORLD_HEIGHT, key)
      .setOrigin(0, 0)
      .setDepth(0);
  }

  private createHud(): void {
    this.hud = this.add
      .text(14, 12, '', { fontFamily: 'monospace', fontSize: '15px', color: '#EFE7D6' })
      .setScrollFactor(0)
      .setDepth(100);
    this.hpBar = this.add.graphics().setScrollFactor(0).setDepth(100);
  }

  override update(_time: number, deltaMs: number): void {
    const dt = Math.min(deltaMs, 50) / 1000; // clamp: a stalled tab must not teleport the horde
    if (!this.dead) {
      this.elapsed += dt;
      this.invulnerable = Math.max(0, this.invulnerable - dt);
      this.movePlayer(dt);
      this.spawn(dt);
      this.fire(dt);
    }
    this.moveEnemies(dt);
    this.moveProjectiles(dt);
    if (!this.dead) this.resolveContact(dt);
    this.resolveHits();
    this.drawHud();
  }

  private movePlayer(dt: number): void {
    const left = this.cursors.left.isDown || this.wasd.A.isDown;
    const right = this.cursors.right.isDown || this.wasd.D.isDown;
    const up = this.cursors.up.isDown || this.wasd.W.isDown;
    const down = this.cursors.down.isDown || this.wasd.S.isDown;

    const move = new Phaser.Math.Vector2(
      (right ? 1 : 0) - (left ? 1 : 0),
      (down ? 1 : 0) - (up ? 1 : 0),
    );
    if (move.lengthSq() === 0) return;
    move.normalize().scale(PLAYER_SPEED * dt);
    this.player.x = Phaser.Math.Clamp(this.player.x + move.x, 0, WORLD_WIDTH);
    this.player.y = Phaser.Math.Clamp(this.player.y + move.y, 0, WORLD_HEIGHT);
    // The sperm faces where it is going. One flip, no animation.
    if (move.x !== 0) this.player.setFlipX(move.x < 0);
  }

  /** The wave table is a rate, so spawning is an accumulator, not a timer. */
  private spawn(dt: number): void {
    let rate = 0;
    let enemyId = '';
    for (const wave of this.act.waves) {
      if (this.elapsed >= wave.fromSeconds) {
        rate = wave.rate;
        enemyId = wave.enemyId;
      }
    }
    if (rate === 0) return;

    this.spawnAccumulator += rate * dt;
    while (this.spawnAccumulator >= 1) {
      this.spawnAccumulator -= 1;
      this.spawnEnemy(enemyId);
    }
  }

  private spawnEnemy(id: string): void {
    const def = enemyDef(id);
    const cam = this.cameras.main;
    // Just outside the viewport, so nothing appears in front of the player.
    const radius = Math.hypot(cam.width, cam.height) / 2 + 40;
    const angle = Math.random() * Math.PI * 2;
    const e = this.enemies.spawn();
    e.def = def;
    e.hp = def.hp;
    e.hitFlash = 0;
    e.sprite
      .setTexture(this.act.atlas.key, def.frame)
      .setPosition(this.player.x + Math.cos(angle) * radius, this.player.y + Math.sin(angle) * radius)
      .setDisplaySize(def.displaySize, def.displaySize)
      .setVisible(true)
      .setActive(true)
      .setTint(def.tint);
  }

  private moveEnemies(dt: number): void {
    for (const e of this.enemies.items) {
      const dx = this.player.x - e.sprite.x;
      const dy = this.player.y - e.sprite.y;
      const d = Math.hypot(dx, dy) || 1;
      e.sprite.x += (dx / d) * e.def.speed * dt;
      e.sprite.y += (dy / d) * e.def.speed * dt;
      e.sprite.setFlipX(dx < 0);
      if (e.hitFlash > 0) {
        e.hitFlash -= dt;
        if (e.hitFlash <= 0) e.sprite.setTint(e.def.tint);
      }
    }
  }

  private fire(dt: number): void {
    this.fireCooldown -= dt;
    if (this.fireCooldown > 0) return;

    const target = this.nearestEnemy(this.weapon.range);
    if (!target) return;
    this.fireCooldown = this.weapon.cooldown;

    const dx = target.sprite.x - this.player.x;
    const dy = target.sprite.y - this.player.y;
    const d = Math.hypot(dx, dy) || 1;
    const p = this.projectiles.spawn();
    p.vx = (dx / d) * this.weapon.projectileSpeed;
    p.vy = (dy / d) * this.weapon.projectileSpeed;
    p.life = this.weapon.range / this.weapon.projectileSpeed;
    p.damage = this.weapon.damage;
    p.pierce = this.weapon.pierce;
    p.sprite
      .setPosition(this.player.x, this.player.y)
      .setRadius(this.weapon.radius)
      .setVisible(true)
      .setActive(true);
  }

  private nearestEnemy(within: number): Enemy | null {
    let best: Enemy | null = null;
    let bestD = within * within;
    for (const e of this.enemies.items) {
      const dx = e.sprite.x - this.player.x;
      const dy = e.sprite.y - this.player.y;
      const d2 = dx * dx + dy * dy;
      if (d2 < bestD) {
        bestD = d2;
        best = e;
      }
    }
    return best;
  }

  private moveProjectiles(dt: number): void {
    for (let i = this.projectiles.items.length - 1; i >= 0; i--) {
      const p = this.projectiles.items[i]!;
      p.sprite.x += p.vx * dt;
      p.sprite.y += p.vy * dt;
      p.life -= dt;
      if (p.life <= 0) this.projectiles.releaseAt(i);
    }
  }

  /** Projectiles against enemies. Walk backwards: releaseAt swap-removes. */
  private resolveHits(): void {
    for (let pi = this.projectiles.items.length - 1; pi >= 0; pi--) {
      const p = this.projectiles.items[pi]!;
      for (let ei = this.enemies.items.length - 1; ei >= 0; ei--) {
        const e = this.enemies.items[ei]!;
        const r = e.def.radius + this.weapon.radius;
        const dx = e.sprite.x - p.sprite.x;
        const dy = e.sprite.y - p.sprite.y;
        if (dx * dx + dy * dy > r * r) continue;

        e.hp -= p.damage;
        if (e.hp <= 0) {
          this.enemies.releaseAt(ei);
          this.kills++;
        } else {
          e.sprite.setTint(THREAT_CONTACT);
          e.hitFlash = 0.08;
        }
        if (--p.pierce <= 0) {
          this.projectiles.releaseAt(pi);
          break;
        }
      }
    }
  }

  private resolveContact(dt: number): void {
    if (this.invulnerable > 0) return;
    for (const e of this.enemies.items) {
      const r = e.def.radius + PLAYER_RADIUS;
      const dx = e.sprite.x - this.player.x;
      const dy = e.sprite.y - this.player.y;
      if (dx * dx + dy * dy > r * r) continue;

      this.hp -= e.def.contactDamage;
      this.invulnerable = IFRAMES;
      this.cameras.main.shake(90, 0.006);
      if (this.hp <= 0) {
        this.hp = 0;
        this.die();
      }
      return;
    }
    void dt;
  }

  private die(): void {
    this.dead = true;
    this.player.setTint(INK);
    this.add
      .text(
        this.cameras.main.width / 2,
        this.cameras.main.height / 2,
        `you did not make it\n\n${this.formatTime()}   ${this.kills} rivals\n\nR to try again`,
        {
          fontFamily: 'monospace',
          fontSize: '20px',
          color: '#EFE7D6',
          align: 'center',
          lineSpacing: 6,
        },
      )
      .setOrigin(0.5)
      .setScrollFactor(0)
      .setDepth(200);
  }

  private formatTime(): string {
    const m = Math.floor(this.elapsed / 60);
    const s = Math.floor(this.elapsed % 60);
    return `${m}:${s.toString().padStart(2, '0')}`;
  }

  private drawHud(): void {
    this.hud.setText(
      `${this.formatTime()}   ${this.kills} rivals   ${this.enemies.active} on screen   ` +
        `${Math.round(this.game.loop.actualFps)} fps`,
    );

    const w = 220;
    const h = 9;
    this.hpBar.clear();
    this.hpBar.fillStyle(INK, 0.5).fillRect(14, 36, w, h);
    this.hpBar
      .fillStyle(this.invulnerable > 0 ? THREAT_CONTACT : PAPER, 1)
      .fillRect(14, 36, (w * this.hp) / PLAYER_MAX_HP, h);
  }
}
