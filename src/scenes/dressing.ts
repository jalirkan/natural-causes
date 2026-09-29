import Phaser from 'phaser';
import { INK, PAPER, SHADOW } from '../config';

/**
 * Scene dressing shared by the title and the act: the vignette, the field
 * texture, and the small generated textures (gems, shots). All of it is drawn
 * in-house at boot from the locked palette — no assets, and none of it exists
 * on the Node side, which is why this file lives with the scenes.
 *
 * These are the details that separate "a prototype that works" from "a game
 * that was finished": a field with tooth instead of flat fill, corners that
 * fall away instead of ending, pickups with the lozenge silhouette law 11
 * reserved for them (drawn as circles until now — the art bible said lozenge
 * and nobody had read it back).
 */

/** A soft elliptical darkening toward the corners. Screen-fixed. */
export function addVignette(scene: Phaser.Scene, viewW: number, viewH: number, depth: number): void {
  const key = 'nc-vignette';
  if (!scene.textures.exists(key)) {
    const size = 512;
    const canvas = scene.textures.createCanvas(key, size, size);
    if (!canvas) return;
    const ctx = canvas.getContext();
    const grad = ctx.createRadialGradient(size / 2, size / 2, size * 0.3, size / 2, size / 2, size * 0.52);
    grad.addColorStop(0, 'rgba(18,16,12,0)');
    grad.addColorStop(1, 'rgba(18,16,12,0.40)');
    ctx.fillStyle = grad;
    ctx.fillRect(0, 0, size, size);
    canvas.refresh();
  }
  scene.add
    .image(viewW / 2, viewH / 2, key)
    .setDisplaySize(viewW * 1.03, viewH * 1.03)
    .setScrollFactor(0)
    .setDepth(depth);
}

/**
 * The field tile: paper tooth. Two dot weights and a faint shadow blotch so
 * the repeat is harder to see — one mark repeating reads as wallpaper, three
 * marks at different weights read as material.
 */
export function ensureFieldTile(scene: Phaser.Scene): string {
  const key = 'field-tile';
  if (!scene.textures.exists(key)) {
    const g = scene.make.graphics({ x: 0, y: 0 }, false);
    g.fillStyle(PAPER, 0.085);
    g.fillCircle(8, 8, 2.5);
    g.fillCircle(40, 32, 2);
    g.fillCircle(24, 52, 1.5);
    g.fillStyle(PAPER, 0.05);
    g.fillCircle(56, 14, 1.5);
    g.fillCircle(14, 34, 1);
    g.fillStyle(SHADOW, 0.06);
    g.fillEllipse(48, 54, 10, 6);
    g.generateTexture(key, 64, 64);
    g.destroy();
  }
  return key;
}

/** The pickup, as law 11 wrote it: a lozenge, outlined like everything else. */
export function ensureGemTexture(scene: Phaser.Scene, colour: number): string {
  // Keyed by colour: pickups wear each act's light tone, and one key would
  // carry the first act's colour through the whole life.
  const key = `nc-gem-${colour.toString(16)}`;
  if (!scene.textures.exists(key)) {
    const g = scene.make.graphics({ x: 0, y: 0 }, false);
    g.fillStyle(colour, 1);
    g.lineStyle(2, INK, 1);
    g.beginPath();
    g.moveTo(9, 1);
    g.lineTo(17, 11);
    g.lineTo(9, 21);
    g.lineTo(1, 11);
    g.closePath();
    g.fillPath();
    g.strokePath();
    g.generateTexture(key, 18, 22);
    g.destroy();
  }
  return key;
}

/**
 * The drop shadow under everything that stands (ActScene `DROP`): one soft
 * ellipse, three wide to one tall, drawn once as four concentric ellipses at
 * rising alpha toward the middle — a soft edge in four flat steps, not a
 * gradient. Ink, the palette's dark: the palette's SHADOW tone is lighter
 * than every act's floor, and under a body it read as a glow, not a shadow.
 * Opaque at its middle; the scene sets how dark it lies.
 */
export function ensureShadowTexture(scene: Phaser.Scene): string {
  const key = 'nc-shadow';
  if (!scene.textures.exists(key)) {
    const w = 96;
    const h = 32;
    const g = scene.make.graphics({ x: 0, y: 0 }, false);
    // Each step over the last, so the middle stacks up to about 0.95.
    for (const [share, alpha] of [
      [1, 0.3],
      [0.82, 0.4],
      [0.64, 0.5],
      [0.46, 0.65],
    ] as const) {
      g.fillStyle(INK, alpha);
      g.fillEllipse(w / 2, h / 2, w * share, h * share, 48);
    }
    g.generateTexture(key, w, h);
    g.destroy();
  }
  return key;
}

/** Player shots: a small paper dash that flies point-first, not a circle. */
export function ensureShotTextures(scene: Phaser.Scene, hostileColour: number): void {
  if (scene.textures.exists('nc-shot')) return;
  const g = scene.make.graphics({ x: 0, y: 0 }, false);
  g.fillStyle(PAPER, 1);
  g.fillRoundedRect(0, 0, 18, 7, 3.5);
  g.generateTexture('nc-shot', 18, 7);
  g.clear();
  g.fillStyle(hostileColour, 1);
  g.lineStyle(2, INK, 1);
  g.fillCircle(8, 8, 6);
  g.strokeCircle(8, 8, 6);
  g.generateTexture('nc-shot-hostile', 16, 16);
  g.destroy();
}
