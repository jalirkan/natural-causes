import Phaser from 'phaser';
import { actVisuals } from '../data/act-visuals';
import { BONE, INK, PAPER, THREAT_CONTACT, VIEW_HEIGHT, VIEW_WIDTH } from '../config';
import { BOSS_RADIUS, type World } from '../sim/world';
import { ensureGemTexture } from './dressing';
import { ACT_MID, JuiceEdges, largestHits, PLAYER_HURT } from './juice-edges';

/**
 * The juice: what a hit, a kill, a pickup and a level look like, over what
 * the scene already draws. Damage numbers, kill pops, hit sparks, a scaled
 * screen shake, gem streams, the level-up ring and flash, and the low-health
 * edge.
 *
 * It reads the world and its own last-frame snapshot (`JuiceEdges`, which
 * holds the logic and its tests) and never writes to the world: the sim is
 * untouched and the bots see the same game. `ActScene` makes one in
 * `create`, calls `sync` once a frame after its own syncs, and destroys it at
 * shutdown. Everything is pooled and capped and animated here from the
 * frame's `dt` — no tweens — so steady state allocates nothing, and a
 * paused scene (which skips `sync`) holds every effect still.
 *
 * Colour (ART-DIRECTION law 10): bone and the act's mid tone, which are
 * "everything else"; the act's light tone only on what is a pickup's (the
 * gem's own afterimage); paper on the player's level-up, paper being the
 * player's; contact red only on the low-health edge, which is "this hurts
 * you". No tint on any art (G-032): the flecks are drawn in their colours,
 * and the level-up flash is a paper silhouette laid over the player, not a
 * multiply of it.
 *
 * PLACEHOLDER, every number here — sizes, lives, counts, shake strengths —
 * watched by nobody yet.
 */

/**
 * Depths. The field's effects sit at the scene's `depthBase` (ActScene passes
 * 7, its puffs' layer: over the crowd at 5 and the boss at 6, under the shots
 * at 8 and the player at 10); the rest are offsets from it or pinned to the
 * scene's screen layers, named here so a change there is found from here.
 */
const NUMBER_LIFT = 5; // numbers at 12: over the player (10) and what they wear (11)
const TRAIL_DROP = 4.05; // gem afterimages just under the gems (ActScene draws them at 3)
const EDGE_DEPTH = 91; // the low-health edge: over the corner vignette (90), under the HUD (100)
const OVER_OFFER_DEPTH = 196; // the level-up ring and flash: over the offer's scrim (195), under its cards (200)

/** Pool caps. Past a cap the newest (and, for numbers, the smallest) are dropped, never an old one cut short. */
const FLECK_CAP = 192;
const NUMBER_CAP = 48;
const PLAYER_NUMBER_CAP = 4;
const RING_CAP = 48;
/** Gems given a trail in one frame; three afterimages each. */
const TRAIL_CAP = 32;
const TRAIL = [
  { back: 5, alpha: 0.4, scale: 0.85 },
  { back: 10, alpha: 0.25, scale: 0.7 },
  { back: 15, alpha: 0.12, scale: 0.55 },
] as const;
/** The gem as ActScene draws it (GEM_SIZE 9, drawn 1.7 wide and 2.1 tall). */
const GEM_W = 9 * 1.7;
const GEM_H = 9 * 2.1;

/** A number rises `rise` px over `life` s; `spread` is how far (x, y) it may start from its body's top, so a crowd hit together does not print one stack. */
const NUMBER = { rise: 24, life: 0.5, spread: [18, 10] } as const;
const KILL = { min: 5, max: 8, speed: [70, 170], life: 0.35, ring: 12, ringLife: 0.26 } as const;
/** A boss's fall: more flecks, farther, longer, and drawn twice the size, so the burst reads against a 300px drawing. */
const BOSS_DOWN = { flecks: 28, speed: [140, 320], life: 0.6, ringLife: 0.6, scale: 2 } as const;
const SPARK = { min: 2, max: 3, speed: [60, 130], life: 0.2, spread: 1.1, cap: 24 } as const;
const PICKUP = { flecks: 3, speed: [50, 90], life: 0.22, cap: 3 } as const;
const LEVEL = { ringLife: 0.3, reach: 70, alpha: 0.5, flash: 0.06 } as const;
/**
 * Camera shake, as a share of the view (Phaser's `intensity`) for seconds.
 * A kill's is coalesced to one per `gap`, so a horde dying is a tremor and
 * not a blur; a boss hit's likewise, and further apart, because a boss
 * takes a hit several times a second for a whole fight and a shake that
 * never stops is no longer a hit. A stronger shake overrides a weaker one
 * running, never the other way. None on a level-up.
 */
const SHAKE = {
  kill: { intensity: 0.0015, seconds: 0.04, gap: 0.08 },
  bossHit: { intensity: 0.0025, seconds: 0.06, gap: 0.2 },
  hurt: { intensity: 0.004, seconds: 0.09 },
  bossDown: { intensity: 0.004, seconds: 0.2 },
} as const;
/** The low-health edge: its band in view px, the peak alpha (law 10: a thin edge, ≤ 0.25), the pulse period, the fade in and out. */
const EDGE = { band: 28, pad: 16, peak: 0.25, floor: 0.4, period: 1.6, fade: 0.3 } as const;
/**
 * The Egg does not die (G-006): its eyes close and its corona parts, and "the
 * resolution must not read as a kill". Its fall gets no burst; every other
 * boss's does.
 */
const NO_BURST: ReadonlySet<string> = new Set(['egg']);

const css = (n: number) => `#${n.toString(16).padStart(6, '0')}`;

interface Fleck {
  img: Phaser.GameObjects.Image;
  x: number;
  y: number;
  vx: number;
  vy: number;
  age: number;
  life: number;
  scale: number;
}

interface Num {
  text: Phaser.GameObjects.Text;
  x: number;
  y: number;
  age: number;
}

interface Ring {
  x: number;
  y: number;
  r0: number;
  r1: number;
  age: number;
  life: number;
  width: number;
  colour: number;
  alpha: number;
  over: boolean;
}

/** A hit's number as it is printed, rounded and never 0; made once each under 1000, so the frame loop does not build strings. */
const LABELS: string[] = [];
function labelFor(amount: number): string {
  const n = Math.max(1, Math.round(amount));
  if (n >= 1000) return String(n);
  return (LABELS[n] ??= String(n));
}

export class Juice {
  private readonly edges = new JuiceEdges();
  private clock = 0;
  private act = -1;
  private fleckMid = '';
  private readonly fleckBone: string;
  private gemKey = '';

  private readonly flecks: Fleck[] = [];
  private readonly freeFlecks: Fleck[] = [];
  private readonly numbers: Num[] = [];
  private readonly freeNumbers: Num[] = [];
  private readonly playerNumbers: Num[] = [];
  private readonly rings: Ring[] = [];
  private readonly freeRings: Ring[] = [];
  private readonly trails: Phaser.GameObjects.Image[] = [];
  private readonly field: Phaser.GameObjects.Graphics;
  private readonly over: Phaser.GameObjects.Graphics;
  private readonly flash: Phaser.GameObjects.Image;
  private flashLeft = 0;
  private readonly edge: Phaser.GameObjects.Image;
  private edgeLevel = 0;
  private shakeUntil = -Infinity;
  private shakeIntensity = 0;
  private killShakeAt = -Infinity;
  private bossShakeAt = -Infinity;
  /** `largestHits`' output, reused. */
  private readonly chosen: number[] = [];

  constructor(
    private readonly scene: Phaser.Scene,
    private readonly depthBase: number,
    private readonly player: Phaser.GameObjects.Image,
  ) {
    this.fleckBone = ensureFleck(scene, BONE);
    this.field = scene.add.graphics().setDepth(depthBase);
    this.over = scene.add.graphics().setDepth(OVER_OFFER_DEPTH);
    this.flash = scene.add
      .image(0, 0, player.texture.key, player.frame.name)
      .setDepth(OVER_OFFER_DEPTH)
      .setTintFill(PAPER)
      .setVisible(false);
    this.edge = scene.add
      .image(0, 0, ensureHurtEdge(scene))
      .setScrollFactor(0)
      .setDepth(EDGE_DEPTH)
      .setVisible(false);
  }

  /** One frame: read the edges, start what they call for, and move everything alive by `dt` seconds. */
  sync(w: World, dt: number): void {
    this.clock += dt;
    if (w.actIndex !== this.act) this.dress(w);
    const e = this.edges;
    e.read(w, this.clock);

    // Kills first: they are the pops, and the flecks are shared with the sparks.
    for (let i = 0; i < e.kills.length; i++) {
      const k = e.kills.at(i);
      const budget = Math.floor(this.freeFleckCount() / (e.kills.length - i));
      const n = Math.min(budget, KILL.min + Math.floor(Math.random() * (KILL.max - KILL.min + 1)));
      this.burst(k.x, k.y, n, KILL.speed, KILL.life, k.size * 0.25, 1);
      this.ring(k.x, k.y, 3, KILL.ring * Math.max(1, k.size / 44), KILL.ringLife, 2, BONE, 0.7, false);
    }
    if (e.kills.length > 0) this.shake(SHAKE.kill, 'kill');

    if (e.bossDown && w.boss && !NO_BURST.has(w.boss.kind)) {
      this.burst(w.boss.x, w.boss.y, BOSS_DOWN.flecks, BOSS_DOWN.speed, BOSS_DOWN.life, BOSS_RADIUS * 0.5, BOSS_DOWN.scale);
      this.ring(w.boss.x, w.boss.y, BOSS_RADIUS * 0.5, BOSS_RADIUS * 1.4, BOSS_DOWN.ringLife, 4, BONE, 0.8, false);
      this.shake(SHAKE.bossDown);
    } else if (e.bossHit) this.shake(SHAKE.bossHit, 'boss');

    this.showNumbers();
    if (e.hurt > 0) {
      this.playerNumber(w.x, w.y - w.playerRadius - 8, e.hurt);
      this.shake(SHAKE.hurt);
    }

    for (let i = 0; i < Math.min(e.landed.length, SPARK.cap); i++) {
      const s = e.landed.at(i);
      const n = SPARK.min + Math.floor(Math.random() * (SPARK.max - SPARK.min + 1));
      // Back the way it came, fanned: the shot stops and its spray does not.
      const back = Math.atan2(-s.dy, -s.dx);
      for (let j = 0; j < n; j++) {
        const a = back + (Math.random() - 0.5) * 2 * SPARK.spread;
        this.fleck(s.x, s.y, a, SPARK.speed, SPARK.life, true);
      }
    }

    for (let i = 0; i < Math.min(e.pickups.length, PICKUP.cap); i++) {
      const s = e.pickups.at(i);
      // Out from the player through where the gem went in.
      const out = Math.atan2(s.y - w.y, s.x - w.x);
      for (let j = 0; j < PICKUP.flecks; j++) {
        this.fleck(s.x, s.y, out + (j - 1) * 0.6, PICKUP.speed, PICKUP.life, true);
      }
    }

    if (e.levelUp) {
      const r = w.playerRadius + 6;
      this.ring(w.x, w.y, r, r + LEVEL.reach, LEVEL.ringLife, 3, PAPER, LEVEL.alpha, true);
      this.flashLeft = LEVEL.flash;
    }

    this.stepFlecks(dt);
    this.stepNumbers(dt);
    this.drawRings(dt);
    this.drawTrails();
    this.drawFlash(dt);
    this.drawEdge(w, dt);
  }

  destroy(): void {
    for (const f of this.flecks) f.img.destroy();
    for (const n of this.numbers) n.text.destroy();
    for (const n of this.playerNumbers) n.text.destroy();
    for (const t of this.trails) t.destroy();
    this.field.destroy();
    this.over.destroy();
    this.flash.destroy();
    this.edge.destroy();
    this.flecks.length = 0;
    this.freeFlecks.length = 0;
    this.numbers.length = 0;
    this.freeNumbers.length = 0;
    this.playerNumbers.length = 0;
    this.rings.length = 0;
    this.freeRings.length = 0;
    this.trails.length = 0;
  }

  /** The act's colours: the flecks' mid tone and the gem the trails are drawn from. */
  private dress(w: World): void {
    this.act = w.actIndex;
    const id = w.act.id;
    this.fleckMid = ensureFleck(this.scene, ACT_MID[id] ?? BONE);
    this.gemKey = ensureGemTexture(this.scene, actVisuals(id).pickup);
    for (const t of this.trails) t.setTexture(this.gemKey);
  }

  // --- flecks -----------------------------------------------------------

  private freeFleckCount(): number {
    return this.freeFlecks.length + (FLECK_CAP - this.flecks.length);
  }

  /** `n` flecks outward from (x, y), from up to `from` px out, act mid and bone half and half, at `scale` times 3px. */
  private burst(
    x: number,
    y: number,
    n: number,
    speed: readonly [number, number],
    life: number,
    from: number,
    scale: number,
  ): void {
    for (let i = 0; i < n; i++) {
      const a = Math.random() * Math.PI * 2;
      const d = from * Math.random();
      this.fleck(x + Math.cos(a) * d, y + Math.sin(a) * d, a, speed, life, (i & 1) === 1, scale);
    }
  }

  private fleck(
    x: number,
    y: number,
    angle: number,
    speed: readonly [number, number],
    life: number,
    bone: boolean,
    scale = 1,
  ): void {
    let f = this.freeFlecks.pop();
    if (!f) {
      if (this.flecks.length >= FLECK_CAP) return;
      f = {
        img: this.scene.add.image(0, 0, this.fleckBone).setDepth(this.depthBase),
        x: 0,
        y: 0,
        vx: 0,
        vy: 0,
        age: 0,
        life: 0,
        scale: 1,
      };
      this.flecks.push(f);
    }
    const v = speed[0] + Math.random() * (speed[1] - speed[0]);
    f.x = x;
    f.y = y;
    f.vx = Math.cos(angle) * v;
    f.vy = Math.sin(angle) * v;
    f.age = 0;
    f.life = life;
    f.scale = scale;
    f.img
      .setTexture(bone ? this.fleckBone : this.fleckMid)
      .setPosition(x, y)
      .setAlpha(1)
      .setScale(scale)
      .setVisible(true);
  }

  private stepFlecks(dt: number): void {
    // Drag, so a burst flies out and settles rather than sailing off.
    const drag = Math.exp(-7 * dt);
    for (const f of this.flecks) {
      if (f.life <= 0) continue;
      f.age += dt;
      if (f.age >= f.life) {
        f.life = 0;
        f.img.setVisible(false);
        this.freeFlecks.push(f);
        continue;
      }
      f.vx *= drag;
      f.vy *= drag;
      f.x += f.vx * dt;
      f.y += f.vy * dt;
      const k = f.age / f.life;
      f.img
        .setPosition(f.x, f.y)
        .setAlpha(1 - k * k)
        .setScale(f.scale * (1 - 0.4 * k));
    }
  }

  // --- numbers ----------------------------------------------------------

  private showNumbers(): void {
    const hits = this.edges.hits;
    if (hits.length === 0) return;
    const free = this.freeNumbers.length + (NUMBER_CAP - this.numbers.length);
    const n = largestHits(hits, free, this.chosen);
    for (let i = 0; i < n; i++) {
      const h = hits.at(this.chosen[i]!);
      let x = h.x + (Math.random() - 0.5) * NUMBER.spread[0];
      let y = h.y - h.size * 0.35 + (Math.random() - 0.5) * NUMBER.spread[1];
      if (h.boss) {
        // Anywhere on its face, so a stream of hits does not print one column.
        x = h.x + (Math.random() - 0.5) * BOSS_RADIUS * 0.8;
        y = h.y - BOSS_RADIUS * 0.2 + (Math.random() - 0.5) * BOSS_RADIUS * 0.4;
      }
      const label = labelFor(h.amount);
      let num = this.freeNumber(label);
      if (!num) {
        num = { text: this.makeText(12, BONE), x: 0, y: 0, age: 0 };
        this.numbers.push(num);
      }
      this.start(num, x, y, label);
    }
  }

  /**
   * A free number, one already reading `label` if there is one: most hits
   * are the same few small numbers, and a Text whose string does not change
   * is not redrawn (its canvas and its texture upload are the cost here).
   */
  private freeNumber(label: string): Num | undefined {
    const free = this.freeNumbers;
    for (let i = free.length - 1; i >= 0; i--) {
      if (free[i]!.text.text !== label) continue;
      const num = free[i]!;
      free[i] = free[free.length - 1]!;
      free.length--;
      return num;
    }
    return free.pop();
  }

  /** The player's own damage taken: always shown, in its own small pool, the oldest reused when all four are up. */
  private playerNumber(x: number, y: number, amount: number): void {
    let num: Num | undefined;
    for (const p of this.playerNumbers) if (p.age >= NUMBER.life && (!num || p.age > num.age)) num = p;
    if (!num && this.playerNumbers.length < PLAYER_NUMBER_CAP) {
      num = { text: this.makeText(14, PLAYER_HURT), x: 0, y: 0, age: NUMBER.life };
      this.playerNumbers.push(num);
    }
    if (!num) for (const p of this.playerNumbers) if (!num || p.age > num.age) num = p;
    this.start(num!, x, y, labelFor(amount));
  }

  private makeText(px: number, colour: number): Phaser.GameObjects.Text {
    return this.scene.add
      .text(0, 0, '', {
        fontFamily: 'monospace',
        fontSize: `${px}px`,
        color: css(colour),
        stroke: css(INK),
        strokeThickness: 3,
      })
      .setOrigin(0.5, 1)
      .setDepth(this.depthBase + NUMBER_LIFT)
      .setVisible(false);
  }

  private start(num: Num, x: number, y: number, label: string): void {
    // Only a changed string redraws the text's canvas.
    if (num.text.text !== label) num.text.setText(label);
    num.x = x;
    num.y = y;
    num.age = 0;
    num.text.setPosition(x, y).setAlpha(1).setVisible(true);
  }

  private stepNumbers(dt: number): void {
    for (const num of this.numbers) {
      if (num.age >= NUMBER.life) continue;
      if (this.moveNumber(num, dt)) this.freeNumbers.push(num);
    }
    for (const num of this.playerNumbers) if (num.age < NUMBER.life) this.moveNumber(num, dt);
  }

  /** Rises and fades; true when it has just finished. */
  private moveNumber(num: Num, dt: number): boolean {
    num.age += dt;
    if (num.age >= NUMBER.life) {
      num.age = NUMBER.life;
      num.text.setVisible(false);
      return true;
    }
    const k = num.age / NUMBER.life;
    const rise = 1 - (1 - k) * (1 - k);
    num.text.setPosition(num.x, num.y - NUMBER.rise * rise).setAlpha(k < 0.5 ? 1 : 2 - 2 * k);
    return false;
  }

  // --- rings ------------------------------------------------------------

  private ring(
    x: number,
    y: number,
    r0: number,
    r1: number,
    life: number,
    width: number,
    colour: number,
    alpha: number,
    over: boolean,
  ): void {
    let r = this.freeRings.pop();
    if (!r) {
      if (this.rings.length >= RING_CAP) return;
      r = { x: 0, y: 0, r0: 0, r1: 0, age: 0, life: 0, width: 0, colour: 0, alpha: 0, over: false };
      this.rings.push(r);
    }
    r.x = x;
    r.y = y;
    r.r0 = r0;
    r.r1 = r1;
    r.age = 0;
    r.life = life;
    r.width = width;
    r.colour = colour;
    r.alpha = alpha;
    r.over = over;
  }

  private drawRings(dt: number): void {
    this.field.clear();
    this.over.clear();
    for (const r of this.rings) {
      if (r.life <= 0) continue;
      r.age += dt;
      if (r.age >= r.life) {
        r.life = 0;
        this.freeRings.push(r);
        continue;
      }
      const k = r.age / r.life;
      const radius = r.r0 + (r.r1 - r.r0) * (1 - (1 - k) * (1 - k));
      (r.over ? this.over : this.field).lineStyle(r.width, r.colour, r.alpha * (1 - k)).strokeCircle(r.x, r.y, radius);
    }
  }

  // --- gem streams --------------------------------------------------------

  /**
   * Afterimages behind every gem the magnet has this frame, placed back along
   * its heading: stateless, so a gem taken or a stream stopping leaves
   * nothing to clean up.
   */
  private drawTrails(): void {
    const streams = this.edges.streams;
    const n = Math.min(streams.length, TRAIL_CAP) * TRAIL.length;
    while (this.trails.length < n) {
      this.trails.push(this.scene.add.image(0, 0, this.gemKey).setDepth(this.depthBase - TRAIL_DROP).setVisible(false));
    }
    let used = 0;
    for (let i = 0; i < Math.min(streams.length, TRAIL_CAP); i++) {
      const s = streams.at(i);
      for (const t of TRAIL) {
        this.trails[used++]!
          .setPosition(s.x - s.dx * t.back, s.y - s.dy * t.back)
          .setDisplaySize(GEM_W * t.scale, GEM_H * t.scale)
          .setAlpha(t.alpha)
          .setVisible(true);
      }
    }
    for (let i = used; i < this.trails.length; i++) {
      const t = this.trails[i]!;
      if (!t.visible) break;
      t.setVisible(false);
    }
  }

  // --- the player -----------------------------------------------------------

  /** The level-up's flash: a paper silhouette of the player, laid over them for `LEVEL.flash`. */
  private drawFlash(dt: number): void {
    if (this.flashLeft <= 0) {
      if (this.flash.visible) this.flash.setVisible(false);
      return;
    }
    this.flashLeft -= dt;
    const p = this.player;
    this.flash
      .setTexture(p.texture.key, p.frame.name)
      .setPosition(p.x, p.y)
      .setDisplaySize(p.displayWidth, p.displayHeight)
      .setFlipX(p.flipX)
      .setRotation(p.rotation)
      .setVisible(true);
  }

  /**
   * Under a third of health, a thin contact-red edge round the view, pulsing
   * slowly: law 10's threat colour for "this hurts you", held to a band and a
   * quarter alpha, never a wash over the field.
   */
  private drawEdge(w: World, dt: number): void {
    const target = this.edges.lowHealth ? 1 : 0;
    const step = dt / EDGE.fade;
    this.edgeLevel = target > this.edgeLevel ? Math.min(target, this.edgeLevel + step) : Math.max(target, this.edgeLevel - step);
    if (this.edgeLevel <= 0) {
      if (this.edge.visible) this.edge.setVisible(false);
      return;
    }
    const cam = this.scene.cameras.main;
    const pulse = 0.5 + 0.5 * Math.sin((this.clock * Math.PI * 2) / EDGE.period);
    this.edge
      .setPosition(cam.width / 2, cam.height / 2)
      .setDisplaySize(cam.width + EDGE.pad * 2, cam.height + EDGE.pad * 2)
      .setAlpha(this.edgeLevel * EDGE.peak * (EDGE.floor + (1 - EDGE.floor) * pulse))
      .setVisible(!w.dead);
  }

  // --- the camera -----------------------------------------------------------

  /**
   * A shake, unless one at least as strong is still running. `coalesce`
   * names the kind held to one per its `gap`.
   */
  private shake(s: { intensity: number; seconds: number; gap?: number }, coalesce?: 'kill' | 'boss'): void {
    const now = this.clock;
    if (coalesce === 'kill') {
      if (now - this.killShakeAt < (s.gap ?? 0)) return;
      this.killShakeAt = now;
    } else if (coalesce === 'boss') {
      if (now - this.bossShakeAt < (s.gap ?? 0)) return;
      this.bossShakeAt = now;
    }
    if (now < this.shakeUntil && s.intensity <= this.shakeIntensity) return;
    this.scene.cameras.main.shake(s.seconds * 1000, s.intensity, true);
    this.shakeUntil = now + s.seconds;
    this.shakeIntensity = s.intensity;
  }
}

/** A 3×3 square in one flat colour, made once per colour. */
function ensureFleck(scene: Phaser.Scene, colour: number): string {
  const key = `nc-fleck-${colour.toString(16)}`;
  if (!scene.textures.exists(key)) {
    const g = scene.make.graphics({ x: 0, y: 0 }, false);
    g.fillStyle(colour, 1).fillRect(0, 0, 3, 3);
    g.generateTexture(key, 3, 3);
    g.destroy();
  }
  return key;
}

/**
 * The low-health edge: contact red, opaque in a `pad` margin (off screen at
 * rest, there so a shake never shows a gap) and falling off across `band`
 * inside it, clear in the middle. Drawn at a quarter of the view's size and
 * stretched, so the band scales the same on both axes.
 */
function ensureHurtEdge(scene: Phaser.Scene): string {
  const key = 'nc-hurt-edge';
  if (scene.textures.exists(key)) return key;
  const q = 4;
  const band = EDGE.band / q;
  const pad = EDGE.pad / q;
  const w = Math.round(VIEW_WIDTH / q + pad * 2);
  const h = Math.round(VIEW_HEIGHT / q + pad * 2);
  const canvas = scene.textures.createCanvas(key, w, h);
  if (!canvas) return key;
  const ctx = canvas.getContext();
  const img = ctx.createImageData(w, h);
  const r = (THREAT_CONTACT >> 16) & 0xff;
  const g = (THREAT_CONTACT >> 8) & 0xff;
  const b = THREAT_CONTACT & 0xff;
  for (let y = 0; y < h; y++) {
    for (let x = 0; x < w; x++) {
      const d = Math.min(x, y, w - 1 - x, h - 1 - y) - pad;
      const a = d <= 0 ? 1 : d >= band ? 0 : (1 - d / band) ** 2;
      const i = (y * w + x) * 4;
      img.data[i] = r;
      img.data[i + 1] = g;
      img.data[i + 2] = b;
      img.data[i + 3] = Math.round(a * 255);
    }
  }
  ctx.putImageData(img, 0, 0);
  canvas.refresh();
  return key;
}
