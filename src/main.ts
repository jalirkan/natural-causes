import Phaser from 'phaser';
import { ActScene } from './scenes/ActScene';
import { CONCEPTION } from './data/acts';
import { VIEW_HEIGHT, VIEW_WIDTH } from './config';

const config: Phaser.Types.Core.GameConfig = {
  type: Phaser.AUTO,
  parent: 'game',
  width: VIEW_WIDTH,
  height: VIEW_HEIGHT,
  scale: {
    mode: Phaser.Scale.FIT,
    autoCenter: Phaser.Scale.CENTER_BOTH,
  },
  // Vsync-paced by default. Phaser only falls back to setTimeout if the
  // browser gives it no rAF, which is the case we would want to see fail
  // loudly rather than have papered over.
  fps: { target: 60, forceSetTimeOut: false },
  scene: [ActScene],
};

const game = new Phaser.Game(config);
game.scene.start('act', { act: CONCEPTION });

// Dev-only handle, stripped from production builds by the `import.meta.env.DEV`
// guard. Exists so the running game can be inspected and driven from the
// console or an automated browser check — verifying "60fps" by looking at a
// screenshot is not verifying it.
if (import.meta.env.DEV) {
  (globalThis as { game?: Phaser.Game }).game = game;
}
