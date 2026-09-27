import Phaser from 'phaser';
import { ACTS } from '../data/acts';
import { actVisuals } from '../data/act-visuals';
import { sfx } from '../audio/sfx';
import { INK, VIEW_HEIGHT, VIEW_WIDTH } from '../config';
import { addVignette, ensureFieldTile } from './dressing';
import { obituary, recentLives } from '../meta/ancestors';

/**
 * The front door. Until this existed the game booted straight into the field,
 * which meant a run began before the player had agreed to one — and there was
 * no user gesture anywhere for the browser to unlock audio on. "Press any key"
 * does both jobs at once.
 */
/**
 * The act the title starts: the first startable one. `ACTS` is the list an
 * act joins when its atlas, player frame and boss frame exist, and a test
 * holds it to `ACT_VISUALS`, so reading from it here is what makes "startable"
 * mean something rather than being a label on a list nothing consults.
 */
const FIRST_ACT = ACTS[0]!;

/** How many ancestors the title remembers aloud. */
const OBITUARIES = 6;

export class TitleScene extends Phaser.Scene {
  constructor() {
    super('title');
  }

  preload(): void {
    const v = actVisuals(FIRST_ACT.id);
    this.load.atlas(v.atlas.key, v.atlas.png, v.atlas.json);
  }

  create(): void {
    const v = actVisuals(FIRST_ACT.id);
    this.cameras.main.setBackgroundColor(v.background);
    const cx = VIEW_WIDTH / 2;

    // The same material as the field, so the title is the game and not a
    // slide in front of it: paper tooth, corners that fall away, a hairline.
    this.add.tileSprite(0, 0, VIEW_WIDTH, VIEW_HEIGHT, ensureFieldTile(this)).setOrigin(0, 0);
    addVignette(this, VIEW_WIDTH, VIEW_HEIGHT, 50);

    const text = (y: number, str: string, size: number, alpha = 1) =>
      this.add
        .text(cx, y, str, {
          fontFamily: 'monospace',
          fontSize: `${size}px`,
          color: '#EFE7D6',
          align: 'center',
          lineSpacing: 8,
        })
        .setOrigin(0.5)
        .setAlpha(alpha);

    text(180, 'N A T U R A L   C A U S E S', 44);
    this.add.rectangle(cx, 216, 336, 2, 0xefe7d6, 0.28);
    text(240, `a life, from ${FIRST_ACT.name.toLowerCase()}`, 18, 0.85);

    // The face the whole game hangs on (G-003), given a slow idle bob and a
    // grounding shadow so it floats in a place rather than on a slide.
    const shadow = this.add.ellipse(cx, 442, 74, 14, INK, 0.22);
    this.tweens.add({
      targets: shadow,
      scaleX: 0.85,
      duration: 1600,
      yoyo: true,
      repeat: -1,
      ease: 'Sine.easeInOut',
    });
    const player = this.add.image(cx, 380, v.atlas.key, v.playerFrame).setDisplaySize(96, 96);
    this.tweens.add({
      targets: player,
      rotation: 0.06,
      duration: 2100,
      yoyo: true,
      repeat: -1,
      ease: 'Sine.easeInOut',
    });
    this.tweens.add({
      targets: player,
      y: 392,
      duration: 1600,
      yoyo: true,
      repeat: -1,
      ease: 'Sine.easeInOut',
    });

    const controls = text(
      520,
      'WASD or arrows (or drag anywhere) to move   ·   you fire automatically\n1/2/3 or tap a card to upgrade   ·   P pauses   ·   M mutes',
      15,
      0.8,
    );

    // The ancestors: the lives already lived here, newest first, so "try
    // again" has a history. Nothing at all on a first visit. The prompt only
    // moves down when the lines need the room.
    let promptY = 600;
    const lives = recentLives(OBITUARIES);
    if (lives.length > 0) {
      const top = controls.y + controls.displayHeight / 2 + 14;
      const obits = this.add
        .text(cx, top, ['before you:', ...lives.map(obituary)].join('\n'), {
          fontFamily: 'monospace',
          fontSize: '13px',
          color: '#EFE7D6',
          align: 'center',
          lineSpacing: 1,
        })
        .setOrigin(0.5, 0)
        .setAlpha(0.6);
      promptY = Math.min(VIEW_HEIGHT - 20, Math.max(promptY, top + obits.displayHeight + 22));
    }
    const prompt = text(promptY, 'press any key or tap', 18);
    this.tweens.add({ targets: prompt, alpha: 0.35, duration: 900, yoyo: true, repeat: -1 });

    const begin = () => {
      // The gesture the audio unlock has been waiting for.
      sfx.unlock();
      sfx.choose();
      this.scene.start('act', { acts: ACTS });
    };
    this.input.keyboard?.once('keydown', begin);
    this.input.once('pointerdown', begin);
  }
}
