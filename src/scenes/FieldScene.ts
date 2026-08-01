import Phaser from 'phaser';
import {
  DOT_COLOUR,
  DOT_RADIUS,
  DOT_SPEED,
  FIELD_COLOUR,
  VIEW_HEIGHT,
  VIEW_WIDTH,
} from '../config';

/**
 * Phase 0, and nothing beyond it: a green field, a dot you can drive, and a
 * frame-rate readout so "60fps" is something we checked rather than assumed.
 *
 * No physics body. Movement is integrated from delta directly, which is both
 * simpler than arcade physics and the behaviour we actually want later — a
 * horde game with hundreds of entities does its own movement.
 */
export class FieldScene extends Phaser.Scene {
  private dot!: Phaser.GameObjects.Arc;
  private cursors!: Phaser.Types.Input.Keyboard.CursorKeys;
  private wasd!: Record<'W' | 'A' | 'S' | 'D', Phaser.Input.Keyboard.Key>;
  private readout!: Phaser.GameObjects.Text;

  constructor() {
    super('field');
  }

  // Not `override`: Phaser's type definitions declare `update` on Scene but
  // not `create`, which the scene manager calls by convention.
  create(): void {
    this.cameras.main.setBackgroundColor(FIELD_COLOUR);

    this.dot = this.add.circle(VIEW_WIDTH / 2, VIEW_HEIGHT / 2, DOT_RADIUS, DOT_COLOUR);

    // Arrows and WASD both, because every playtester tries one of the two and
    // nobody should have to find out which.
    const keyboard = this.input.keyboard;
    if (!keyboard) throw new Error('No keyboard input available.');
    this.cursors = keyboard.createCursorKeys();
    this.wasd = keyboard.addKeys('W,A,S,D') as typeof this.wasd;

    this.readout = this.add
      .text(12, 10, '', {
        fontFamily: 'monospace',
        fontSize: '14px',
        color: '#f4f0e2',
      })
      .setAlpha(0.75);
  }

  override update(_time: number, delta: number): void {
    const left = this.cursors.left.isDown || this.wasd.A.isDown;
    const right = this.cursors.right.isDown || this.wasd.D.isDown;
    const up = this.cursors.up.isDown || this.wasd.W.isDown;
    const down = this.cursors.down.isDown || this.wasd.S.isDown;

    // Normalised so diagonals are not 41% faster than the cardinals.
    const move = new Phaser.Math.Vector2(
      (right ? 1 : 0) - (left ? 1 : 0),
      (down ? 1 : 0) - (up ? 1 : 0),
    );
    if (move.lengthSq() > 0) {
      move.normalize().scale((DOT_SPEED * delta) / 1000);
      this.dot.x = Phaser.Math.Clamp(this.dot.x + move.x, DOT_RADIUS, VIEW_WIDTH - DOT_RADIUS);
      this.dot.y = Phaser.Math.Clamp(this.dot.y + move.y, DOT_RADIUS, VIEW_HEIGHT - DOT_RADIUS);
    }

    this.readout.setText(
      `${Math.round(this.game.loop.actualFps)} fps  ${this.renderer.type === Phaser.WEBGL ? 'webgl' : 'canvas'}  wasd/arrows`,
    );
  }
}
