import Phaser from 'phaser';
import { ACTS } from '../data/acts';
import { actVisuals } from '../data/act-visuals';
import { sfx } from '../audio/sfx';
import { REVIEW_TITLE_LINE, reviewMode } from '../dev/review';
import { BONE, INK, PAPER, VIEW_HEIGHT, VIEW_WIDTH } from '../config';
import { ensureFieldTile } from './dressing';
import { oncePerEvent } from './keys';
import { effectLines, narrowCanvas } from './certificate';
import {
  BLUSH,
  PLAIN,
  type Box,
  menuRows,
  rowAt,
  rulesFor,
  selectionForKey,
  shownAt,
  stackRows,
  titleTypeScale,
} from './title-menu';
import { obituary, recentLives } from '../meta/ancestors';
import { NAME_MAX, isNameChar, readPlayerName, writePlayerName } from '../meta/name';

/**
 * The front door. Until this existed the game booted straight into the field,
 * which meant a run began before the player had agreed to one — and there was
 * no user gesture anywhere for the browser to unlock audio on. "Press any key"
 * does both jobs at once.
 *
 * It sits between the two registers (ART-DIRECTION §2026-09-28): its picture
 * is the card's — the kid on a rounded plate, big — and its type is the
 * form's, set in ink on the stock the paperwork is printed on.
 */
/**
 * The act the title starts: the first startable one. `ACTS` is the list an
 * act joins when its atlas, player frame and boss frame exist, and a test
 * holds it to `ACT_VISUALS`, so reading from it here is what makes "startable"
 * mean something rather than being a label on a list nothing consults.
 */
const FIRST_ACT = ACTS[0]!;

/**
 * The kid on the card: the player as School draws them (G-003, G-053), the
 * figure the whole life keeps. Its atlas is loaded here; the act's preload
 * finds it already in the texture manager.
 */
const KID = actVisuals('school');

/** How many ancestors the title remembers aloud, when there is room for them. */
const OBITUARIES = 6;

/**
 * The type at 1280×720 shown 1280 CSS px across, in game px. A phone raises
 * all of it by one multiple (`titleTypeScale`), so the ancestors' line reads
 * at the certificate's print floor and every other line keeps its rank.
 */
const TYPE = {
  review: 14,
  title: 42,
  line: 18,
  label: 18,
  blurb: 14,
  name: 18,
  controls: 15,
  obits: 13,
  prompt: 18,
} as const;

/** The controls, as the wide title has always set them, and as phrases for a column too narrow for that. */
const CONTROLS = 'WASD or arrows (or drag anywhere) to move   ·   you fire automatically\n1/2/3 or tap a card to upgrade   ·   P pauses   ·   M mutes';
const CONTROL_PHRASES = [
  'WASD or arrows (or drag anywhere) to move',
  'you fire automatically',
  '1/2/3 or tap a card to upgrade',
  'P pauses',
  'M mutes',
];
/** A canvas monospace's advance, in em (as certificate.ts measures it). */
const MONO = 0.6;

/** A line unchosen, and chosen or under the pointer. */
const DIM = 0.6;
const LIT = 1;

const css = (n: number) => `#${n.toString(16).padStart(6, '0')}`;

/** What a restart for a new screen shape carries over: the name half typed, the life chosen. */
interface Kept {
  typed?: string;
  selected?: number;
}

export class TitleScene extends Phaser.Scene {
  private kept: Kept = {};

  constructor() {
    super('title');
  }

  init(data?: Kept): void {
    this.kept = data ?? {};
  }

  preload(): void {
    if (!this.textures.exists(KID.atlas.key)) this.load.atlas(KID.atlas.key, KID.atlas.png, KID.atlas.json);
  }

  create(): void {
    // An upright phone gets a canvas of the screen's shape, as the certificate
    // does (`narrowCanvas`): 1280×720 under FIT is 390×219 CSS px there. The
    // act is handed 1280×720 back when the title goes.
    const shape = narrowCanvas(this.scale.parentSize);
    if (shape) this.scale.setGameSize(shape.width, shape.height);
    const narrow = shape !== null;
    const W = this.scale.width;
    const H = this.scale.height;
    const k = titleTypeScale(shownAt(this.scale.parentSize, { width: W, height: H }), TYPE.obits);
    const px = (base: number) => Math.round(base * k);
    const ink = css(INK);

    // Stock, not a slide: the bone the forms are filed on, with the field's
    // tooth. No vignette: on a light ground its dark corners read as dirt.
    this.cameras.main.setBackgroundColor(BONE);
    this.add.tileSprite(0, 0, W, H, ensureFieldTile(this)).setOrigin(0, 0).setAlpha(0.5);

    const M = narrow ? 40 : 44;
    const text = (x: number, y: number, str: string, size: number, wrap?: number) =>
      this.add.text(x, y, str, {
        fontFamily: 'monospace',
        fontSize: `${size}px`,
        color: ink,
        lineSpacing: Math.round(size * 0.3),
        ...(wrap ? { wordWrap: { width: wrap } } : {}),
      });

    // D-030: at the link with `?review`, the page says so before a life begins.
    let top = M;
    if (reviewMode()) {
      const line = text(W / 2, Math.round(M * 0.3), REVIEW_TITLE_LINE, px(TYPE.review), W - 2 * M)
        .setOrigin(0.5, 0)
        .setAlign('center')
        .setAlpha(0.75);
      if (narrow) top = line.y + line.height + 24;
    }

    // The card's size, and the column the form's type is set in: beside the
    // card on a wide screen, under it on an upright phone.
    const cardW = narrow ? W - 2 * M - 40 : 400;
    // A card's proportion (5×7) where the screen has it.
    const cardH = narrow ? Math.round(cardW * 0.94) : Math.min(H - 2 * M, Math.round(cardW * 1.4));
    const colX = narrow ? M : M + cardW + 64;
    const colW = narrow ? W - 2 * M : W - colX - M;

    // ── The form ─────────────────────────────────────────────────────────
    const col = this.add.container(colX, 0);
    const add = <T extends Phaser.GameObjects.GameObject>(o: T): T => {
      col.add(o);
      return o;
    };
    const band = add(this.add.graphics());
    let y = 0;

    // The name, as wide as the column allows and never more than it was.
    const titleSize = Math.min(px(TYPE.title), Math.floor(colW / (27 * MONO)));
    const title = add(text(0, y, 'N A T U R A L   C A U S E S', titleSize));
    y += title.height + 10;
    // The certificate's double rule, under the name as under its title.
    const rules = add(this.add.graphics());
    rules.lineStyle(2, INK, 1).lineBetween(0, y, title.width, y);
    rules.lineStyle(1, INK, 1).lineBetween(0, y + 5, title.width, y + 5);
    y += 5 + px(18);

    // The plain life: the title's own line, and what Enter starts until a key
    // chooses a rule (G-055).
    const plain = add(text(0, y, `a life, from ${FIRST_ACT.name.toLowerCase()}`, px(TYPE.line)));
    const plainBox: Box = { x: 0, y, width: plain.width, height: plain.height };
    y += plain.height + px(10);

    // One line per rule, from the registry: the name numbered as a form
    // numbers its fields, and the rule's line set smaller under it.
    const rows = menuRows();
    const indent = Math.round(3 * MONO * px(TYPE.label));
    const drawn = rows.map((row) => {
      const label = add(text(0, 0, row.label, px(TYPE.label)));
      const blurb = add(text(indent, 0, row.blurb, px(TYPE.blurb), colW - indent));
      return { label, blurb };
    });
    const gap = px(8);
    const local = stackRows(
      y,
      0,
      colW,
      drawn.map(({ label, blurb }) => label.height + 2 + blurb.height),
      gap,
    );
    drawn.forEach(({ label, blurb }, i) => {
      label.setY(local[i]!.y);
      blurb.setY(local[i]!.y + label.height + 2);
    });
    y = (local.length > 0 ? local[local.length - 1]!.y + local[local.length - 1]!.height : y) + px(20);

    // The name on the form. Typed, not chosen: the substitute misspells it
    // (SCHOOL-ROSTER §3.5) and the certificate prints it (G-002). A
    // remembered name is already written in; Enter keeps it. On a phone
    // nobody types, and a tap starts the life as "Nobody" — which the
    // substitute misspells too. That is the joke, not a gap.
    let typed = this.kept.typed ?? readPlayerName() ?? '';
    let caretOn = true;
    const nameLabel = add(text(0, y, 'Name on the form: ', px(TYPE.name)));
    const field = add(text(nameLabel.width, y, '', px(TYPE.name)));
    // Laid out for the longest name, so the line stays put while it is typed.
    field.setText('M'.repeat(NAME_MAX + 1));
    add(this.add.rectangle(field.x, y + field.height + 2, field.width, 1, INK, 0.5).setOrigin(0, 0.5));
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
    y += field.height + px(16);

    // The controls, on the lines they have always had where those fit.
    const cSize = px(TYPE.controls);
    const fits = Math.max(...CONTROLS.split('\n').map((l) => l.length)) * MONO * cSize <= colW;
    const controls = add(
      text(0, y, fits ? CONTROLS : effectLines(CONTROL_PHRASES, Math.floor(colW / (MONO * cSize))).join('\n'), cSize),
    ).setAlpha(0.8);
    y += controls.height + px(14);

    // The ancestors: the lives already lived here, newest first, so "try
    // again" has a history. Nothing at all on a first visit, and on a short
    // screen only as many as fit above the prompt.
    const lives = recentLives(OBITUARIES).map(obituary);
    const obits = add(text(0, y, '', px(TYPE.obits), colW)).setAlpha(0.65);
    const promptSize = px(TYPE.prompt);
    // The column's height: between the margins beside the card, under the card below it.
    const budget = narrow ? H - M - (top + cardH + 48) : H - 2 * M;
    const tail = (n: number) => (n > 0 ? obits.height + px(16) : 0) + promptSize * 1.25;
    let shown = lives.length;
    // One life that fits shares the heading's line, so a short screen keeps it.
    const setObits = (n: number) =>
      obits.setText(n === 1 ? `before you: ${lives[0]}` : n > 1 ? ['before you:', ...lives.slice(0, n)].join('\n') : '');
    setObits(shown);
    while (shown > 0 && y + tail(shown) > budget) setObits(--shown);
    if (shown > 0) y += obits.height + px(16);

    const prompt = add(text(0, y, 'Enter or tap to begin', promptSize));
    this.tweens.add({ targets: prompt, alpha: 0.35, duration: 900, yoyo: true, repeat: -1 });
    y += prompt.height;

    // Placed: centred on the card beside it, or stacked under it, the stack
    // centred in what the column leaves. A column that still overruns (a
    // short screen with no ancestors to drop) is scaled to fit rather than cut.
    const total = y;
    const s = Math.min(1, budget / total);
    col.setScale(s);
    const slack = Math.max(0, Math.round((budget - total * s) / 2));
    const cardY = narrow ? top + slack : Math.round((H - cardH) / 2);
    const colY = narrow ? cardY + cardH + 48 : M + slack;
    col.setY(colY);
    const cardX = narrow ? Math.round((W - cardW) / 2) : M;

    // ── The card ─────────────────────────────────────────────────────────
    this.drawCard(cardX, cardY, cardW, cardH);

    // ── The menu's state ─────────────────────────────────────────────────
    const boxes = local.map((b) => ({ x: colX + b.x * s, y: colY + b.y * s, width: b.width * s, height: b.height * s }));
    let selected = Math.min(this.kept.selected ?? PLAIN, rows.length - 1);
    let hovered = PLAIN;
    const paint = () => {
      band.clear();
      const pad = { x: px(10), y: px(5) };
      const chosen = drawn[selected];
      const b: Box = chosen
        ? {
            x: 0,
            y: local[selected]!.y,
            width: Math.max(chosen.label.width, indent + chosen.blurb.width),
            height: local[selected]!.height,
          }
        : plainBox;
      band.fillStyle(BLUSH, 0.75).fillRoundedRect(b.x - pad.x, b.y - pad.y, b.width + 2 * pad.x, b.height + 2 * pad.y, px(9));
      plain.setAlpha(selected === PLAIN ? LIT : DIM);
      drawn.forEach(({ label, blurb }, i) => {
        const on = i === selected || i === hovered;
        label.setAlpha(on ? LIT : DIM);
        blurb.setAlpha(on ? LIT : DIM);
      });
    };
    paint();

    let begun = false;
    const begin = (choice: number) => {
      if (begun) return;
      begun = true;
      // Whatever is on the form. An empty one is Nobody, and is not
      // remembered as a name, so the next visit asks again.
      writePlayerName(typed);
      // The gesture the audio unlock has been waiting for.
      sfx.unlock();
      sfx.choose();
      // A rule is carried by the world (G-055); the plain life starts exactly
      // as it always has.
      const ruled = rulesFor(choice);
      this.scene.start('act', ruled.length > 0 ? { acts: ACTS, rules: ruled } : { acts: ACTS });
    };
    // Phaser 3.90 replays its whole key queue on every DOM key event until the
    // frame ends, so two keys typed inside one frame would arrive as "MMa";
    // each event is taken once (see `./keys`).
    this.input.keyboard?.on('keydown', oncePerEvent((e: KeyboardEvent) => {
      if (e.ctrlKey || e.metaKey || e.altKey) return;
      if (e.key === 'Enter') {
        begin(selected);
        return;
      }
      // ↑/↓ and the rows' numbers: none of them is a name's character, so the
      // form never hears them. Space is one ("Mary Jane"), and stays the name's.
      const next = selectionForKey(e.key, selected, rows.length);
      if (next !== null) {
        e.preventDefault();
        selected = next;
        paint();
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
    // A tap on a rule starts that life; a tap anywhere else, the plain one.
    this.input.on('pointerdown', (p: Phaser.Input.Pointer) => begin(rowAt(boxes, p)));
    this.input.on('pointermove', (p: Phaser.Input.Pointer) => {
      const over = rowAt(boxes, p);
      if (over === hovered) return;
      hovered = over;
      paint();
    });

    // A phone turned, a window resized: the title is laid out again for the
    // new shape, keeping the name and the choice. Settled first, so a drag
    // across a window's edge is one relayout and not a hundred.
    const laidOut = this.shapeKey();
    let settle: Phaser.Time.TimerEvent | undefined;
    const onResize = () => {
      settle?.remove();
      settle = this.time.delayedCall(200, () => {
        if (!begun && this.shapeKey() !== laidOut) this.scene.restart({ typed, selected } satisfies Kept);
      });
    };
    this.scale.on(Phaser.Scale.Events.RESIZE, onResize);
    this.events.once(Phaser.Scenes.Events.SHUTDOWN, () => {
      this.scale.off(Phaser.Scale.Events.RESIZE, onResize);
      if (this.scale.width !== VIEW_WIDTH || this.scale.height !== VIEW_HEIGHT) {
        this.scale.setGameSize(VIEW_WIDTH, VIEW_HEIGHT);
      }
    });
  }

  /**
   * What the title is laid out for: the canvas the screen asks for and the
   * type's multiple on it. The same parent gives the same key, so a resize
   * that changes neither (the canvas's own, set in `create`) lays nothing out.
   */
  private shapeKey(): string {
    const parent = this.scale.parentSize;
    const canvas = narrowCanvas(parent) ?? { width: VIEW_WIDTH, height: VIEW_HEIGHT };
    return `${canvas.width}x${canvas.height}@${titleTypeScale(shownAt(parent, canvas), TYPE.obits).toFixed(3)}`;
  }

  /**
   * The front of the card (G-053): a rounded paper plate with a shadow under
   * it, the act's ground in a rounded window, a blush rule inside the window,
   * and the kid standing in it, big, with the idle bob the face has always
   * had.
   */
  private drawCard(x: number, y: number, w: number, h: number): void {
    const r = Math.round(w / 14);
    const g = this.add.graphics();
    g.fillStyle(INK, 0.18).fillRoundedRect(x + 8, y + 10, w, h, r);
    g.fillStyle(PAPER, 1).fillRoundedRect(x, y, w, h, r);
    g.lineStyle(2, INK, 1).strokeRoundedRect(x, y, w, h, r);
    const inset = Math.round(w / 18);
    const win = { x: x + inset, y: y + inset, w: w - 2 * inset, h: h - 2 * inset };
    const wr = Math.max(8, r - inset / 2);
    g.fillStyle(KID.background, 1).fillRoundedRect(win.x, win.y, win.w, win.h, wr);
    g.lineStyle(2, INK, 1).strokeRoundedRect(win.x, win.y, win.w, win.h, wr);
    const b = Math.round(inset * 0.55);
    g.lineStyle(2, BLUSH, 1).strokeRoundedRect(win.x + b, win.y + b, win.w - 2 * b, win.h - 2 * b, Math.max(6, wr - b / 2));

    // Three times the frame (112), so its edges step evenly.
    const size = 336;
    const cx = win.x + win.w / 2;
    const cy = win.y + win.h * 0.5;
    const foot = cy + size * 0.47;
    const shadow = this.add.ellipse(cx, foot, size * 0.5, size * 0.09, INK, 0.3);
    this.tweens.add({ targets: shadow, scaleX: 0.85, duration: 1600, yoyo: true, repeat: -1, ease: 'Sine.easeInOut' });
    const kid = this.add.image(cx, cy - size * 0.06, KID.atlas.key, KID.playerFrame).setDisplaySize(size, size);
    this.tweens.add({ targets: kid, rotation: 0.05, duration: 2100, yoyo: true, repeat: -1, ease: 'Sine.easeInOut' });
    this.tweens.add({ targets: kid, y: kid.y + size * 0.1, duration: 1600, yoyo: true, repeat: -1, ease: 'Sine.easeInOut' });
  }
}
