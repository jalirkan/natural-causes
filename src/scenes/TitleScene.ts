import Phaser from 'phaser';
import { ACTS } from '../data/acts';
import { actVisuals } from '../data/act-visuals';
import { sfx } from '../audio/sfx';
import { REVIEW_TITLE_LINE, reviewMode } from '../dev/review';
import { INK, VIEW_HEIGHT, VIEW_WIDTH } from '../config';
import { addVignette, ensureFieldTile } from './dressing';
import { oncePerEvent } from './keys';
import { obituary, recentLives } from '../meta/ancestors';
import { NAME_MAX, isNameChar, readPlayerName, writePlayerName } from '../meta/name';

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

    // D-030: at the link with `?review`, the page says so before a life begins.
    if (reviewMode()) text(40, REVIEW_TITLE_LINE, 14, 0.7);

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

    // The name on the form, under the face it belongs to. Typed, not chosen:
    // the substitute misspells it (SCHOOL-ROSTER §3.5) and the certificate
    // prints it (G-002). A remembered name is already written in; Enter keeps
    // it. On a phone nobody types, and a tap starts the life as "Nobody" —
    // which the substitute misspells too. That is the joke, not a gap.
    let typed = readPlayerName() ?? '';
    let caretOn = true;
    const nameStyle = { fontFamily: 'monospace', fontSize: '18px', color: '#EFE7D6' };
    const label = this.add.text(0, 470, 'Name on the form: ', nameStyle).setOrigin(0, 0.5).setAlpha(0.85);
    const field = this.add.text(0, 470, '', nameStyle).setOrigin(0, 0.5);
    // Laid out for the longest name, so the line stays put while it is typed.
    field.setText('M'.repeat(NAME_MAX + 1));
    const left = cx - (label.displayWidth + field.displayWidth) / 2;
    label.setX(left);
    field.setX(left + label.displayWidth);
    this.add.rectangle(field.x, 470 + 13, field.displayWidth, 1, 0xefe7d6, 0.28).setOrigin(0, 0.5);
    const showName = () => field.setText(typed + (caretOn ? '_' : ''));
    showName();
    this.time.addEvent({
      delay: 530,
      loop: true,
      callback: () => {
        caretOn = !caretOn;
        showName();
      },
    });

    const controls = text(
      530,
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
    const prompt = text(promptY, 'Enter or tap to begin', 18);
    this.tweens.add({ targets: prompt, alpha: 0.35, duration: 900, yoyo: true, repeat: -1 });

    let begun = false;
    const begin = () => {
      if (begun) return;
      begun = true;
      // Whatever is on the form. An empty one is Nobody, and is not
      // remembered as a name, so the next visit asks again.
      writePlayerName(typed);
      // The gesture the audio unlock has been waiting for.
      sfx.unlock();
      sfx.choose();
      this.scene.start('act', { acts: ACTS });
    };
    // Phaser 3.90 replays its whole key queue on every DOM key event until the
    // frame ends, so two keys typed inside one frame would arrive as "MMa";
    // each event is taken once (see `./keys`).
    this.input.keyboard?.on('keydown', oncePerEvent((e: KeyboardEvent) => {
      if (e.ctrlKey || e.metaKey || e.altKey) return;
      if (e.key === 'Enter') {
        begin();
        return;
      }
      if (e.key === 'Backspace') {
        typed = [...typed].slice(0, -1).join('');
      } else if ([...e.key].length === 1 && isNameChar(e.key)) {
        // Twelve at most, and no space where a name cannot start or has one.
        if ([...typed].length >= NAME_MAX || (e.key === ' ' && (typed === '' || typed.endsWith(' ')))) return;
        typed += e.key;
      } else {
        return;
      }
      // Space would scroll, Backspace navigate, an apostrophe open Firefox's find bar.
      e.preventDefault();
      caretOn = true;
      showName();
    }));
    this.input.on('pointerdown', begin);
  }
}
