import { readFileSync } from 'node:fs';
import { resolve } from 'node:path';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { ACTS, DECLINE, FAMILY, type ActDef } from '../../data/acts';
import { INHERITANCES } from '../../data/inheritances';
import { ITEMS } from '../../data/items';
import { InputLog } from '../../meta/input-log';
import { BOSS_HP, World } from '../../sim/world';
import { attachDevPanel, type DevPanelHost } from '../panel';
import { reviewedLife } from '../review';
import { HABITS, LEVEL_JUMP, grantLevels, lifeFrom, nextAct, previewPaper, takeHabits } from '../review-cheats';
import { neutralDevState } from '../state';

/**
 * Review mode (D-030): the flag, the review row against a real `World`, the
 * panel's review section against a stand-in DOM, and the two guards that keep
 * a reviewed life out of the ancestors. Dev only; nothing here is a number
 * anyone should read as the game's.
 */

/** A power of two, as the boss row's tests step. */
const DT = 1 / 64;
const STILL = { moveX: 0, moveY: 0 };

/** A life from `act` on, as `start at` begins one. */
const at = (act: ActDef, seed = 7) => new World({ acts: lifeFrom(act.id), seed });

/** Steps with the player held alive, taking the first offer if one waits. */
function run(w: World, seconds: number): void {
  for (let i = 0; i < Math.round(seconds / DT); i++) {
    if (w.offers) {
      w.choose(w.offers[0]!);
      continue;
    }
    if (w.won || w.dead) return;
    w.hp = w.maxHp;
    w.step(DT, STILL);
  }
}

describe('reviewMode(): the flag', () => {
  afterEach(() => {
    vi.unstubAllEnvs();
    vi.unstubAllGlobals();
    vi.resetModules();
  });

  /** A fresh copy of the module, so its memo is read under this env. */
  async function flag(dev: boolean, search: string | null) {
    vi.stubEnv('DEV', dev);
    vi.stubGlobal('location', search === null ? undefined : { search });
    vi.resetModules();
    return import('../review');
  }

  it('in a production build: on with ?review, off without it, off with no location at all (Node, the bots)', async () => {
    expect((await flag(false, '?review')).reviewMode()).toBe(true);
    expect((await flag(false, '?seed=3&review')).reviewMode()).toBe(true);
    expect((await flag(false, '')).reviewMode()).toBe(false);
    expect((await flag(false, '?reviewer')).reviewMode()).toBe(false);
    expect((await flag(false, null)).reviewMode()).toBe(false);
  });

  it('a dev build is always in review mode, as it was always in dev mode', async () => {
    expect((await flag(true, '')).reviewMode()).toBe(true);
    expect((await flag(true, null)).reviewMode()).toBe(true);
  });

  it('is read once: a query that changes after the first read turns nothing on', async () => {
    const m = await flag(false, '');
    expect(m.reviewMode()).toBe(false);
    vi.stubGlobal('location', { search: '?review' });
    expect(m.reviewMode()).toBe(false);
  });

  it('the badge says which: REVIEW at the link, DEV in a dev build', async () => {
    expect((await flag(false, '?review')).taintBadge()).toBe('REVIEW · RUN TAINTED');
    expect((await flag(true, '')).taintBadge()).toBe('DEV · RUN TAINTED');
  });
});

describe('a reviewed life is never an ancestor', () => {
  it('a life that does not begin where the title begins one is a reviewed life', () => {
    expect(reviewedLife(ACTS)).toBe(false);
    expect(reviewedLife([...ACTS])).toBe(false);
    expect(reviewedLife(lifeFrom(ACTS[0]!.id))).toBe(false);
    for (const act of ACTS.slice(1)) expect(reviewedLife(lifeFrom(act.id)), act.id).toBe(true);
    expect(reviewedLife([ACTS[0]!])).toBe(true);
  });

  // ActScene is Phaser and cannot run here, so its two guards are read off
  // its source: the taint set before the first step, and the record behind it.
  const scene = readFileSync(resolve(process.cwd(), 'src/scenes/ActScene.ts'), 'utf8').split('\n');
  const indent = (s: string) => s.length - s.trimStart().length;
  /** The line opening the block line `i` sits in, looking through a `try`. */
  const guard = (i: number): string => {
    let open = i - 1;
    while (open >= 0 && (!scene[open]!.trim() || indent(scene[open]!) >= indent(scene[i]!))) open--;
    const line = scene[open]?.trim() ?? '';
    return line === 'try {' ? guard(open) : line;
  };

  it('ActScene taints a life start at began, or one begun past the title’s first act, before its first step', () => {
    const fresh = scene.findIndex((l) => l.trim() === 'this.dev = neutralDevState();');
    expect(fresh).toBeGreaterThan(0);
    const next = scene.slice(fresh + 1).find((l) => l.trim() && !l.trim().startsWith('//'));
    expect(next?.trim()).toBe('this.dev.tainted = this.startTainted || reviewedLife(this.life);');
    expect(scene.some((l) => l.trim() === 'this.startTainted = data?.tainted === true;')).toBe(true);
  });

  it('ActScene records the life, and the input log, only when the run is not tainted', () => {
    const records = scene.flatMap((l, i) => (/\brecordLife\(|setItem\(INPUT_LOG_KEY/.test(l) ? [i] : []));
    expect(records.length).toBe(2);
    for (const i of records) expect(guard(i), `ActScene.ts:${i + 1}`).toBe('if (!this.dev.tainted) {');
  });
});

describe('start at', () => {
  it('begins a fresh life at the named act: that act first, the rest of the title’s after it', () => {
    for (const [i, act] of ACTS.entries()) {
      const life = lifeFrom(act.id);
      expect(life).toEqual(ACTS.slice(i));
      const w = new World({ acts: life, seed: 3 });
      expect(w.act.id).toBe(act.id);
      expect(w.age).toBe(act.age.from);
      expect(w.level).toBe(1);
      expect([...w.items]).toEqual([['lash', 1]]);
    }
    expect(() => lifeFrom('toString')).toThrow(/not an act/);
  });
});

describe('next act', () => {
  it('at every act but the last: the boss stands and falls, and the life crosses into the next', () => {
    for (const act of ACTS.slice(0, -1)) {
      const w = at(act);
      const poll = nextAct(w);
      expect(poll(), `${act.id}: nothing to drop before a step`).toBe(false);
      w.step(DT, STILL);
      expect(w.boss, act.id).not.toBeNull();
      expect(poll(), act.id).toBe(true);
      expect(w.boss!.phase, act.id).toBe('absorbing');
      run(w, 3);
      expect(w.actIndex, act.id).toBe(1);
    }
  });

  it('at Time runs the clock out: its health untouched, the life won of natural causes', () => {
    const w = at(DECLINE);
    const poll = nextAct(w);
    w.step(DT, STILL);
    const b = w.boss!;
    expect(b.kind).toBe('time');
    expect(b.secondsLeft).toBeGreaterThan(0);
    expect(poll()).toBe(true);
    expect(b.secondsLeft).toBe(0);
    expect(b.hp).toBe(BOSS_HP);
    run(w, DT);
    expect(b.phase).toBe('absorbing');
    run(w, 3);
    expect(w.won).toBe(true);
    expect(w.certificate?.cause).toBe('natural causes');
  });

  it('does nothing once the life is over, or once the act it was pressed in has gone', () => {
    const w = at(FAMILY);
    const poll = nextAct(w);
    w.step(DT, STILL);
    expect(poll()).toBe(true);
    run(w, 3);
    expect(w.act.id).toBe('decline');
    // The same poll again, in Decline: it must not reach for Time.
    w.time += w.act.durationSeconds;
    w.step(DT, STILL);
    const time = w.boss!;
    const left = time.secondsLeft;
    expect(poll()).toBe(true);
    expect(time.secondsLeft).toBe(left);
  });
});

describe('preview paper', () => {
  it('is null for Decline, whose paper is the certificate', () => {
    expect(previewPaper(at(DECLINE), 'Justin')).toBeNull();
  });

  it('is Family’s mortgage statement, as it would read if the act ended now', () => {
    const w = at(FAMILY);
    run(w, 2);
    const doc = previewPaper(w, 'Justin');
    expect(doc?.kind).toBe('mortgage-statement');
    expect(doc?.fields.length).toBeGreaterThan(0);
    expect(doc?.fields[0]).toEqual([expect.any(String), 'Justin']);
    for (const [label, value] of doc!.fields) expect(`${label} ${value}`).not.toMatch(/\b(NaN|undefined|null|Infinity)\b/);
  });

  it('every act the title starts but the last issues one', () => {
    for (const act of ACTS) expect(previewPaper(at(act), 'Nobody') === null, act.id).toBe(act.id === 'decline');
  });
});

describe('level +5', () => {
  /** Levels gained and cards shown once the gem is picked up and every card answered. */
  function jump(w: World): { levels: number; cards: number } {
    const from = w.level;
    grantLevels(w);
    let cards = 0;
    for (let i = 0; i < 64 && (w.gems.length > 0 || w.offers); i++) {
      if (w.offers) {
        cards++;
        w.choose(w.offers[0]!);
        continue;
      }
      w.step(DT, STILL);
    }
    return { levels: w.level - from, cards };
  }

  const quiet = (act: ActDef): World => new World({ act: { ...act, waves: [] }, seed: 5 });

  it('five levels exactly, each offered as its own card, through the gem at the player’s feet', () => {
    const w = quiet(ACTS[0]!);
    expect(jump(w)).toEqual({ levels: LEVEL_JUMP, cards: LEVEL_JUMP });
    // From part way up a bar, and again from higher up the curve.
    w.xp = Math.floor(w.xpToNext / 2);
    expect(jump(w).levels).toBe(LEVEL_JUMP);
    for (let n = 0; n < 4; n++) expect(jump(w).levels).toBe(LEVEL_JUMP);
  });

  it('at the inheritance’s price: Constitution’s dearer levels are still five', () => {
    const w = quiet(ACTS[0]!);
    w.inheritance = INHERITANCES.constitution!;
    expect(w.inheritance.xpMultiplier).not.toBe(1);
    for (let n = 0; n < 4; n++) expect(jump(w).levels).toBe(LEVEL_JUMP);
  });
});

describe('every habit', () => {
  it('the four are items born in their acts', () => {
    for (const id of HABITS) {
      const def = ITEMS[id];
      expect(def, id).toBeDefined();
      expect(def!.from, id).toBeTruthy();
    }
  });

  it('takes each at level 1 if not held, and leaves a held one where it was', () => {
    const w = at(ACTS[0]!);
    w.items.set('nap', 3);
    takeHabits(w);
    for (const id of HABITS) expect(w.items.get(id), id).toBe(id === 'nap' ? 3 : 1);
    expect(w.items.get('lash')).toBe(1);
    const before = [...w.items];
    takeHabits(w);
    expect([...w.items]).toEqual(before);
    // The life runs on with them.
    run(w, 2);
    expect(w.dead).toBe(false);
  });
});

// --- the panel's review section, against a stand-in DOM -------------------

/** Just enough of an element for `attachDevPanel`: text, children, a click. */
class Node_ {
  kids: Node_[] = [];
  own = '';
  className = '';
  id = '';
  title = '';
  style: Record<string, string> = {};
  onclick: ((e: { currentTarget: Node_ }) => void) | null = null;
  constructor(readonly tag: string, text = '') {
    this.own = text;
  }
  get textContent(): string {
    return this.own + this.kids.map((k) => k.textContent).join('');
  }
  set textContent(s: string) {
    this.own = s;
    this.kids = [];
  }
  parent: Node_ | null = null;
  append(...kids: Node_[]): void {
    for (const k of kids) k.parent = this;
    this.kids.push(...kids);
  }
  remove(): void {
    if (this.parent) this.parent.kids = this.parent.kids.filter((k) => k !== this);
    this.parent = null;
  }
  blur(): void {}
  *walk(): Generator<Node_> {
    yield this;
    for (const k of this.kids) yield* k.walk();
  }
}

describe('the panel’s review section', () => {
  let body: Node_;
  beforeEach(() => {
    vi.useFakeTimers();
    body = new Node_('body');
    vi.stubGlobal('document', {
      head: new Node_('head'),
      body,
      createElement: (tag: string) => new Node_(tag),
      createTextNode: (s: string) => new Node_('#text', s),
    });
    vi.stubGlobal('window', {
      addEventListener: () => {},
      removeEventListener: () => {},
      setInterval: (fn: () => void, ms: number) => setInterval(fn, ms),
      clearInterval: (id: ReturnType<typeof setInterval>) => clearInterval(id),
    });
  });
  afterEach(() => {
    vi.useRealTimers();
    vi.unstubAllGlobals();
  });

  interface Mount {
    host: DevPanelHost;
    started: ActDef[][];
    papers: string[];
    buttons: () => Node_[];
    press: (label: string) => void;
    text: () => string;
    detach: () => void;
  }

  function mount(w: World): Mount {
    const started: ActDef[][] = [];
    const papers: string[] = [];
    const host: DevPanelHost = {
      world: w,
      dev: neutralDevState(),
      inputLog: new InputLog(),
      restart: () => {},
      startAt: (acts) => void started.push(acts),
      showPaper: (doc) => (papers.push(doc.kind), true),
      playerName: 'Justin',
    };
    const detach = attachDevPanel(host);
    const panel = () => body.kids.find((k) => k.id === 'nc-dev')!;
    /** The review section: from its heading to the next one. */
    const section = (): Node_[] => {
      const kids = panel().kids;
      const start = kids.findIndex((k) => k.tag === 'h4' && k.textContent === 'review');
      const end = kids.findIndex((k, i) => i > start && k.tag === 'h4');
      return kids.slice(start, end);
    };
    const buttons = () => section().flatMap((k) => [...k.walk()].filter((n) => n.tag === 'button'));
    return {
      host,
      started,
      papers,
      buttons,
      press: (label) => {
        const b = buttons().find((x) => x.textContent === label);
        if (!b) throw new Error(`no review button "${label}" (${buttons().map((x) => x.textContent).join(', ')})`);
        b.onclick!({ currentTarget: b });
      },
      text: () => section().map((k) => k.textContent).join(' | '),
      detach,
    };
  }

  it('at every act: a start per act, next act, the paper or its absence, level +5, every habit — each a cheat that says so', () => {
    for (const act of ACTS) {
      const m = mount(at(act));
      const labels = m.buttons().map((b) => b.textContent);
      const paper = act.id === 'decline' ? [] : ['preview paper'];
      expect(labels, act.id).toEqual([...ACTS.map((a) => a.name), 'next act', ...paper, 'level +5', 'every habit']);
      for (const b of m.buttons()) expect(b.title, `${act.id} ${b.textContent}`).toMatch(/^cheat: /);
      if (act.id === 'decline') expect(m.text()).toContain('Decline issues no paper');
      m.detach();
    }
  });

  it('each control taints the run', () => {
    for (const label of [...ACTS.map((a) => a.name), 'next act', 'preview paper', 'level +5', 'every habit']) {
      const m = mount(at(FAMILY));
      expect(m.host.dev.tainted).toBe(false);
      m.press(label);
      expect(m.host.dev.tainted, label).toBe(true);
      m.detach();
    }
  });

  it('start at hands the scene the life from that act, and a restart of it stays reviewed', () => {
    const m = mount(at(ACTS[0]!));
    m.press('Family');
    expect(m.started).toEqual([lifeFrom('family')]);
    expect(m.started[0]![0]!.id).toBe('family');
    expect(reviewedLife(m.started[0]!)).toBe(true);
    m.detach();
  });

  it('next act drops the boss the scene makes on its next step', () => {
    const w = at(FAMILY);
    const m = mount(w);
    m.press('next act');
    expect(w.boss).toBeNull();
    w.step(DT, STILL);
    expect(w.boss?.phase).not.toBe('absorbing');
    vi.advanceTimersByTime(60);
    expect(w.boss?.phase).toBe('absorbing');
    m.detach();
  });

  it('preview paper goes through the scene’s paper path, and says when it cannot', () => {
    const m = mount(at(FAMILY));
    m.press('preview paper');
    expect(m.papers).toEqual(['mortgage-statement']);
    m.host.showPaper = () => false;
    m.press('preview paper');
    expect(m.text()).toContain('No paper now');
    m.detach();
  });
});
