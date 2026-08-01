import Phaser from 'phaser';
import { rateAt, spawnStreams, type ActDef, type SpawnWave } from '../data/acts';
import { enemyDef, type EnemyDef } from '../data/enemies';
import { weaponDef, type WeaponDef } from '../data/weapons';
import { Pool } from '../systems/pool';
import { INK, PAPER, THREAT_CONTACT, WORLD_HEIGHT, WORLD_WIDTH } from '../config';

interface Enemy {
  sprite: Phaser.GameObjects.Image;
  def: EnemyDef;
  hp: number;
  hitFlash: number;
  /** Fixed heading for `cross` and `drift`. Unused by `chase`. */
  vx: number;
  vy: number;
  /** Seconds alive. Drives the spermicide fuse. */
  age: number;
}

/** A burst spermicide. Not a thing — a condition, so it carries no face. */
interface Ring {
  gfx: Phaser.GameObjects.Arc;
  x: number;
  y: number;
  age: number;
  maxRadius: number;
  seconds: number;
  damage: number;
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
 * Hard ceiling on live enemies. Measured cost is 0.35ms/update at 1200, so
 * this is nowhere near a frame-budget limit — it exists so an unattended
 * playtest run cannot spawn without bound when a bot stops killing things.
 */
const MAX_ACTIVE_ENEMIES = 1500;
/** Non-chasers are culled past this, or they drift away and never come back. */
const DESPAWN_RADIUS = 1600;
/** Angular spread of a drifting current, radians. Wide enough to read as one. */
const DRIFT_SPREAD = (120 * Math.PI) / 180;
/** Stroke weight of the spermicide ring, and its collision band. */
const RING_WEIGHT = 6;
/** Antibody drag per stack, and the floor it can never take the player below. */
const DRAG_PER_STACK = 0.025;
const MIN_SPEED_FRACTION = 0.35;
/** Attached Y-shapes drawn on the player. Stacks keep counting past this. */
const MAX_ATTACHED_SPRITES = 16;

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
  private rings!: Pool<Ring>;
  private weapon!: WeaponDef;

  /** Antibody stacks. They do not expire; they come off when the act ends. */
  private dragStacks = 0;
  private attachedSprites: Phaser.GameObjects.Image[] = [];
  /** White cell engulf: seconds remaining of hold-and-slow. */
  private engulfTimer = 0;
  private engulfSlow = 1;
  private engulfDps = 0;

  private hp = PLAYER_MAX_HP;
  private invulnerable = 0;
  private elapsed = 0;
  private kills = 0;
  private streams: Map<string, SpawnWave[]> = new Map();
  private spawnAccumulators: Map<string, number> = new Map();
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
    this.streams = spawnStreams(this.act.waves);
    this.spawnAccumulators = new Map();
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

    this.dragStacks = 0;
    this.attachedSprites = [];
    this.engulfTimer = 0;

    this.enemies = new Pool<Enemy>(
      () => ({
        sprite: this.add.image(0, 0, this.act.atlas.key).setDepth(5),
        def: enemyDef('rival-sperm'),
        hp: 0,
        hitFlash: 0,
        vx: 0,
        vy: 0,
        age: 0,
      }),
      (e) => e.sprite.setVisible(false).setActive(false),
    );

    this.rings = new Pool<Ring>(
      () => ({
        gfx: this.add.circle(0, 0, 10).setFillStyle().setDepth(4),
        x: 0,
        y: 0,
        age: 0,
        maxRadius: 0,
        seconds: 0,
        damage: 0,
      }),
      (r) => r.gfx.setVisible(false).setActive(false),
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
    this.updateRings(dt);
    this.updateAttached();
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
    move.normalize().scale(this.playerSpeed() * dt);
    this.player.x = Phaser.Math.Clamp(this.player.x + move.x, 0, WORLD_WIDTH);
    this.player.y = Phaser.Math.Clamp(this.player.y + move.y, 0, WORLD_HEIGHT);
    // The sperm faces where it is going. One flip, no animation.
    if (move.x !== 0) this.player.setFlipX(move.x < 0);
  }

  /**
   * One concurrent stream per enemy type, each with its own rate and its own
   * accumulator. The wave table is a rate rather than a schedule, so spawning
   * accumulates fractional enemies instead of firing on a timer.
   */
  private spawn(dt: number): void {
    for (const [enemyId, stream] of this.streams) {
      const rate = rateAt(stream, this.elapsed);
      if (rate === 0) continue;

      const accumulated = (this.spawnAccumulators.get(enemyId) ?? 0) + rate * dt;
      let whole = Math.floor(accumulated);
      this.spawnAccumulators.set(enemyId, accumulated - whole);
      // A safety valve, not a difficulty knob. Four escalating streams with a
      // player who has stopped killing things grows without bound, and a
      // headless playtest bot has no one to notice it has stopped responding.
      while (whole > 0 && this.enemies.active < MAX_ACTIVE_ENEMIES) {
        whole--;
        this.spawnEnemy(enemyId);
      }
    }
  }

  private spawnEnemy(id: string): void {
    const def = enemyDef(id);
    const cam = this.cameras.main;
    // Just outside the viewport, so nothing appears in front of the player.
    const radius = Math.hypot(cam.width, cam.height) / 2 + 40;
    const angle = Math.random() * Math.PI * 2;
    const x = this.player.x + Math.cos(angle) * radius;
    const y = this.player.y + Math.sin(angle) * radius;

    const e = this.enemies.spawn();
    e.def = def;
    e.hp = def.hp;
    e.hitFlash = 0;
    e.age = 0;

    if (def.movement === 'cross') {
      // Aimed at where the player happens to be right now, and never
      // corrected. The whole design is that it has not noticed them: a thing
      // this large that will not route around you is the act.
      const dx = this.player.x - x;
      const dy = this.player.y - y;
      const d = Math.hypot(dx, dy) || 1;
      e.vx = (dx / d) * def.speed;
      e.vy = (dy / d) * def.speed;
    } else if (def.movement === 'drift') {
      // A current that crosses the arena, not a random walk.
      //
      // The first version picked a uniformly random heading, which is the
      // literal reading of "never acknowledges the player's position". It
      // produced 3 antibody attachments across a whole 300s act from 220
      // spawns — half of them turned straight back out of the ring they spawned
      // on and were culled — against a design that expects roughly a dozen
      // stacks by minute four. The mechanic simply never happened.
      //
      // The heading is now inbound with a wide spread, so drifters cross the
      // play area. Nothing steers and nothing is ever corrected, so "drifts,
      // does not pursue" still holds; the spread is wide enough that being hit
      // by one is a current catching you rather than a thing coming for you.
      const inbound = Math.atan2(this.player.y - y, this.player.x - x);
      const spread = (Math.random() - 0.5) * DRIFT_SPREAD;
      e.vx = Math.cos(inbound + spread) * def.speed;
      e.vy = Math.sin(inbound + spread) * def.speed;
    }

    e.sprite
      .setTexture(this.act.atlas.key, def.frame)
      .setPosition(x, y)
      .setDisplaySize(def.displaySize, def.displaySize)
      .setVisible(true)
      .setActive(true)
      .setTint(def.tint);
  }

  /** Bursts a spermicide into its ring and removes the droplet. */
  private burst(e: Enemy): void {
    const b = e.def.burst;
    if (!b) return;
    const r = this.rings.spawn();
    r.x = e.sprite.x;
    r.y = e.sprite.y;
    r.age = 0;
    r.maxRadius = b.ringRadius;
    r.seconds = b.ringSeconds;
    r.damage = b.ringDamage;
    r.gfx
      .setPosition(r.x, r.y)
      .setRadius(1)
      .setStrokeStyle(RING_WEIGHT, e.def.tint, 1)
      .setVisible(true)
      .setActive(true);
  }

  private updateRings(dt: number): void {
    for (let i = this.rings.items.length - 1; i >= 0; i--) {
      const r = this.rings.items[i]!;
      r.age += dt;
      if (r.age >= r.seconds) {
        this.rings.releaseAt(i);
        continue;
      }
      const t = r.age / r.seconds;
      const radius = r.maxRadius * t;
      r.gfx.setRadius(radius).setStrokeStyle(RING_WEIGHT, THREAT_CONTACT, 1 - t);

      // The band is what hurts, not the disc. Being caught is always the
      // player's fault and never the spermicide's intent, because it has none.
      if (this.dead || this.invulnerable > 0) continue;
      const d = Math.hypot(this.player.x - r.x, this.player.y - r.y);
      if (Math.abs(d - radius) <= RING_WEIGHT + PLAYER_RADIUS) this.hurt(r.damage);
    }
  }

  private moveEnemies(dt: number): void {
    // Backwards: releaseAt swap-removes, and both the fuse and the cull
    // release from inside this loop.
    for (let i = this.enemies.items.length - 1; i >= 0; i--) {
      const e = this.enemies.items[i]!;
      e.age += dt;

      if (e.def.movement === 'chase') {
        const dx = this.player.x - e.sprite.x;
        const dy = this.player.y - e.sprite.y;
        const d = Math.hypot(dx, dy) || 1;
        e.sprite.x += (dx / d) * e.def.speed * dt;
        e.sprite.y += (dy / d) * e.def.speed * dt;
        e.sprite.setFlipX(dx < 0);
      } else {
        // Fixed heading, taken at spawn and never revisited. The white cell
        // never steers; the drifters never knew where the player was.
        e.sprite.x += e.vx * dt;
        e.sprite.y += e.vy * dt;
      }

      if (e.hitFlash > 0) {
        e.hitFlash -= dt;
        if (e.hitFlash <= 0) e.sprite.setTint(e.def.tint);
      }

      if (e.def.burst && e.age >= e.def.burst.fuseSeconds) {
        this.burst(e);
        this.enemies.releaseAt(i);
        continue;
      }

      // Anything that does not steer drifts away for ever and would otherwise
      // sit in the pool until the cap starves the streams that matter.
      // Chasers always come back, so they are exempt.
      if (
        e.def.movement !== 'chase' &&
        Math.hypot(e.sprite.x - this.player.x, e.sprite.y - this.player.y) > DESPAWN_RADIUS
      ) {
        this.enemies.releaseAt(i);
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

  private hurt(amount: number): void {
    this.hp -= amount;
    this.invulnerable = IFRAMES;
    this.cameras.main.shake(90, 0.006);
    if (this.hp <= 0) {
      this.hp = 0;
      this.die();
    }
  }

  private resolveContact(dt: number): void {
    // The engulf is a hold, not a hit, so it runs through i-frames — otherwise
    // the white cell would be strictly weaker than a rival for most of it.
    if (this.engulfTimer > 0) {
      this.engulfTimer -= dt;
      this.hp -= this.engulfDps * dt;
      if (this.hp <= 0) {
        this.hp = 0;
        this.die();
        return;
      }
    }

    for (let i = this.enemies.items.length - 1; i >= 0; i--) {
      const e = this.enemies.items[i]!;
      const r = e.def.radius + PLAYER_RADIUS;
      const dx = e.sprite.x - this.player.x;
      const dy = e.sprite.y - this.player.y;
      if (dx * dx + dy * dy > r * r) continue;

      if (e.def.contact === 'attach') {
        // It sticks. Almost no damage, a small permanent penalty, and nothing
        // in the game says a word about it.
        this.attach(e);
        this.enemies.releaseAt(i);
        this.hp -= e.def.contactDamage;
        if (this.hp <= 0) {
          this.hp = 0;
          this.die();
        }
        continue;
      }

      if (e.def.contact === 'engulf' && e.def.engulf) {
        // It does not pursue afterward; it continues on the heading it
        // entered with. Only the player is held.
        if (this.engulfTimer <= 0) {
          this.engulfTimer = e.def.engulf.seconds;
          this.engulfSlow = e.def.engulf.slow;
          this.engulfDps = e.def.engulf.damagePerSecond;
          this.cameras.main.shake(140, 0.009);
        }
        continue;
      }

      if (this.invulnerable > 0) continue;
      this.hurt(e.def.contactDamage);
      return;
    }
  }

  /** Antibody stacks. They do not expire; they come off when the act ends. */
  private attach(e: Enemy): void {
    this.dragStacks++;
    if (this.attachedSprites.length < MAX_ATTACHED_SPRITES) {
      const angle = Math.random() * Math.PI * 2;
      const dist = PLAYER_RADIUS * (0.7 + Math.random() * 0.7);
      const s = this.add
        .image(0, 0, this.act.atlas.key, e.def.frame)
        .setDisplaySize(e.def.displaySize * 0.5, e.def.displaySize * 0.5)
        .setTint(e.def.tint)
        .setDepth(11)
        .setRotation(Math.random() * Math.PI * 2);
      s.setData('angle', angle);
      s.setData('dist', dist);
      this.attachedSprites.push(s);
    }
  }

  /**
   * What the player actually moves at: base, less the antibody drag, less the
   * white cell's hold. Floored so a heavily-stacked run is crippled rather
   * than frozen — a player who cannot move at all cannot learn anything.
   */
  private playerSpeed(): number {
    const drag = Math.max(MIN_SPEED_FRACTION, 1 - this.dragStacks * DRAG_PER_STACK);
    return PLAYER_SPEED * drag * (this.engulfTimer > 0 ? this.engulfSlow : 1);
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

  /** Attached antibodies ride the player. Cheap: position only, no physics. */
  private updateAttached(): void {
    for (const s of this.attachedSprites) {
      const angle = s.getData('angle') as number;
      const dist = s.getData('dist') as number;
      s.x = this.player.x + Math.cos(angle) * dist;
      s.y = this.player.y + Math.sin(angle) * dist;
    }
  }

  private drawHud(): void {
    const slow = Math.round((1 - this.playerSpeed() / PLAYER_SPEED) * 100);
    this.hud.setText(
      `${this.formatTime()}   ${this.kills} killed   ${this.enemies.active} on screen   ` +
        `${this.dragStacks} attached${slow > 0 ? ` (-${slow}% speed)` : ''}   ` +
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
