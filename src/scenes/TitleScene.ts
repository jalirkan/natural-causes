import Phaser from 'phaser';
import { CONCEPTION } from '../data/acts';
import { actVisuals } from '../data/act-visuals';
import { sfx } from '../audio/sfx';
import { VIEW_WIDTH } from '../config';

/**
 * The front door. Until this existed the game booted straight into the field,
 * which meant a run began before the player had agreed to one — and there was
 * no user gesture anywhere for the browser to unlock audio on. "Press any key"
 * does both jobs at once.
 */
export class TitleScene extends Phaser.Scene {
  constructor() {
    super('title');
  }

  preload(): void {
    const v = actVisuals(CONCEPTION.id);
    this.load.atlas(v.atlas.key, v.atlas.png, v.atlas.json);
  }

  create(): void {
    const v = actVisuals(CONCEPTION.id);
    this.cameras.main.setBackgroundColor(v.background);
    const cx = VIEW_WIDTH / 2;

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
    text(238, 'act one — conception', 18, 0.85);

    // The face the whole game hangs on (G-003), given a slow idle bob.
    const player = this.add.image(cx, 380, v.atlas.key, v.playerFrame).setDisplaySize(96, 96);
    this.tweens.add({
      targets: player,
      y: 392,
      duration: 1600,
      yoyo: true,
      repeat: -1,
      ease: 'Sine.easeInOut',
    });

    text(
      520,
      'WASD or arrows to move   ·   you fire automatically\n1/2/3 choose an upgrade   ·   P pauses   ·   M mutes',
      15,
      0.8,
    );
    const prompt = text(600, 'press any key', 18);
    this.tweens.add({ targets: prompt, alpha: 0.35, duration: 900, yoyo: true, repeat: -1 });

    const begin = () => {
      // The gesture the audio unlock has been waiting for.
      sfx.unlock();
      sfx.choose();
      this.scene.start('act', { act: CONCEPTION });
    };
    this.input.keyboard?.once('keydown', begin);
    this.input.once('pointerdown', begin);
  }
}
