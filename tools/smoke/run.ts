import { mkdirSync, rmSync } from 'node:fs';
import { createServer as createNetServer, type AddressInfo } from 'node:net';
import { relative, resolve } from 'node:path';
import { setTimeout as sleep } from 'node:timers/promises';
import { fileURLToPath } from 'node:url';
import { chromium, type Browser, type Page } from 'playwright-core';
import { createServer, type ViteDevServer } from 'vite';
import { WORLD_ZOOM } from '../../src/config';

/**
 * CLI: `pnpm smoke`
 *
 * The browser half of "does it work". Everything else here runs in Node and
 * cannot see the class of bug that only exists on a canvas: an atlas missing
 * a frame (Phaser warns once and draws the atlas's FIRST frame — the wrong
 * sprite, silently), a texture key nobody loaded (the missing-texture
 * square), a scene that throws on the crossing between acts, a HUD that
 * reads NaN.
 *
 * It starts the Vite dev server, drives headless Chromium through one whole
 * life with the dev panel — god, 4x, skip to boss, kill, once an act; at the
 * Egg it sees the ending drawn, its eyes closing or its corona parted
 * (G-006, D-029), through the absorb; in College it also walks the player
 * into a tuition and a registrar's HOLD, the act's own drawings (AUDIT 39),
 * and in The Office it asks that the tuition still draws as tuition (AUDIT
 * 38), walks into a ping and within range of a performance review's MEETS,
 * waits for a commute on screen, and at The Reorg takes half its health from
 * the panel and waits for the restructure to be drawn, the chart in its
 * first grey frame, before the kill (AUDIT 54); at the crossing into Family
 * it asks that The Office's paper, the performance review, was drawn, and in
 * Family walks into an HOA letter (the HUD's `reach` term with it) and
 * within range of a phone's HELLO?, waits for a toddler on screen, sees The
 * Mortgage's DUE, and sees its door open on the kill, the open frame
 * (FAMILY-ROSTER §3–§5); at the crossing into Decline it asks that Family's
 * paper, the mortgage statement, was drawn, and in Decline walks into your
 * knees (the HUD's speed term with them), sees the stairs' ring, and lets an
 * insurance form's DENIED land with god off so the health bar's lost maximum
 * is drawn (AUDIT 90); at Time it asks for the face frame, the hand drawn on
 * it and the bar in seconds (AUDIT 96, 121), and then waits Time out, which
 * is the win (DECLINE-ROSTER §3–§5) — and at every milestone asserts: no
 * console error, no page error, no failed request, no Phaser texture
 * warning, nothing visible drawn from `__MISSING`, no NaN/undefined in any
 * text on screen, and after the crossing the screen dressed for the act the
 * world is in, with the camera back at its resting zoom (`WORLD_ZOOM`).
 * Screenshots go to tools/smoke/out/ (gitignored).
 *
 * Each kill is played at 1x. The absorb and the crossing are what a player
 * sees, and under 4x they are not that: the absorb's 1.8s runs in 0.45s,
 * inside the Egg's 1500ms lean-in, and Phaser drops a `zoomTo` issued while
 * one is running — so the crossing's zoom back to rest never happens and
 * School plays leaned in (at 1.1x, with the HUD clipped, before the HUD had
 * a camera of its own). That is dev-speed only (at 1x the
 * lean-in ends first), so the smoke steps around it rather than failing on it.
 * Time is not killed: its clock is waited out at 4x, because that is the win
 * path, and no crossing follows the last act for the lean-in to spoil.
 *
 * The cheats are clicked in the panel, exactly as a person would, so the run
 * is tainted and records no ancestor. Level-up cards are answered with "1",
 * the real key. Nothing in `World` or `ActScene` is written by this script;
 * the probe below only reads, through the dev-only `globalThis.game` handle.
 *
 * Presence, not calibration: this says the life can be walked end to end in a
 * browser without breaking. It says nothing about whether any of it is fun.
 */

const ROOT = fileURLToPath(new URL('../..', import.meta.url));
const OUT = resolve(ROOT, 'tools/smoke/out');
// A CI runner draws this game at 7–9 fps under software WebGL (measured on
// GitHub's ubuntu image), so a milestone that takes 8s here takes 25s there:
// at 4x dev speed the sim advances four steps a frame, and a School crowd
// spawned on the arena rim needs about ten seconds of act time to walk on
// screen. The budgets are sized for that machine, not this one; a milestone
// still fails loudly, only later.
//
// The run's budget (AUDIT 57), from GitHub's logs rather than a guess: two
// CI runs of the same thirteen milestones on 2026-09-28 (b936b60 on main and
// its PR head c1bbed5) took 153.2s and 87.7s, so runners differ 1.75x on the
// same code. office-play and office-reorg (AUDIT 54) add 8–12% to a run (7s
// of 89s at 11–21 fps; 23s of ~260s and 38s of ~310s at 3–8 fps), so the
// slowest CI run seen becomes about 170s: 70% of the old 240s, less headroom
// than the 1.75x the runners have already shown. And below 20 fps a 1x
// stretch (every kill here) slows with the frame rate, because a frame's step
// is clamped to 50ms: at 4 fps the absorb's 1.8s takes 9s. A four-core box
// shared with other sessions' bots and smokes ran this at 3–8 fps and ran
// out of 240s and then of 300s, at the certificate both times. 420s is 2.5
// times the slowest CI run and 1.35 times that shared box. A hang is still
// caught by MILESTONE_MS; the total only bounds a run that is slow but
// moving.
//
// The sum done again for the sixth act (2026-09-28, the four-core box, two
// runs at 5–20 fps): family, family-play, family-boss and Family's
// certificate took the place of a kill-to-certificate step that took 6s, and
// the runs ended at 118.5s and 151.5s where they would have at about 99s and
// 119s: +20% and +28%. At +28% the slowest CI run seen becomes about 218s,
// and 420s is 1.9 times it; the shared box's ~310s becomes about 400s, and
// 420s is 1.05 times it. Kept, because no run here came near it (two more,
// once The Mortgage's own sim landed, ended at 106.0s and 102.6s); thin on
// that box, so if it runs out there again, raise this before skipping an
// act's milestones.
//
// And for the seventh (2026-09-28, the same box, four runs at 8–25 fps):
// decline, decline-play, decline-boss and Decline's certificate took the
// place of Family's kill-to-certificate step (about 6s), and took 50s, 57s,
// 54s and 66s; the runs ended at 146s, 162s, 170s and 165s, where Family's
// would have ended near 98–119s: +45–60%. Most of it is Time's clock, which
// cannot be skipped (60s of act time at 4x: 26–32s here, about 37s at CI's
// 8 fps; its own limit is 150s). At +60% the slowest CI run seen becomes
// about 350s, and 420s is 1.2 times it; the shared box's ~400s becomes about
// 640s, past it. Kept, because no run here came near it; if CI's slowest
// does, raise it to 1.5 times that run before cutting a milestone.
const MILESTONE_MS = 60_000;
const BUDGET_MS = 420_000;
const VIEW = { width: 1280, height: 720 };

/**
 * Phaser's texture warnings. `Texture "%s" has no frame "%s"` is a frame
 * missing from an atlas (Texture.js, TEXTURE_MISSING_ERROR) — the only sign
 * of it, since the fallback frame is a real sprite. The others are a key
 * nobody loaded, a malformed atlas, and a file that failed to parse. A
 * lookup of an unknown KEY warns nothing and returns `__MISSING`; the probe
 * catches that one by walking the display list instead.
 */
const PHASER_WARNING =
  /has no frame|No texture found matching key|Invalid (Texture )?Atlas|Invalid atlas json|Failed to process file|__MISSING/i;

/** What the probe reports. Read-only; the page is never written through it. */
interface Probe {
  ready: boolean;
  scenes: string[];
  renderer: string;
  bad: string[];
  act: null | {
    index: number;
    shown: number;
    actTime: number;
    name: string;
    hud: string;
    level: string;
    overlay: string | null;
    /**
     * `restructures` is the world's count (The Reorg's thresholds passed);
     * `drawnRestructures` is the scene's own record of it (`bossRestructures`,
     * caught up in syncBoss), and `grey` whether the chart is drawn in one of
     * its greyed frames (`bossFrames.grey`, D-029). Zero, zero and false for
     * every boss that never restructures.
     */
    boss: {
      phase: string;
      hp: number;
      restructures: number;
      drawnRestructures: number;
      grey: boolean;
      /** The Mortgage drawn in its open frame (`bossFrames.open`): false for every other boss, and before its absorb. */
      door: boolean;
    } | null;
    /**
     * The boss as drawn, where it is drawn (the Reorg's moves at a restructure),
     * and whether that point is inside the camera's view.
     */
    bossSprite: { key: string; frame: string; x: number; y: number; inView: boolean } | null;
    /** The camera's look at the boss on its entrance (AUDIT 37) is owed or running. */
    bossLook: boolean;
    bossFrame: string;
    /** The act's boss variants (`ActVisuals.bossFrames`, D-029), `{}` for a boss with none. */
    bossFrames: { closing?: string; parted?: string; grey?: string[]; open?: string; face?: string };
    offers: string[] | null;
    won: boolean;
    dead: boolean;
    enemies: number;
    /** Enemies inside the camera's view: sprites a screenshot can judge. */
    onScreen: number;
    zoom: number;
    god: boolean;
    timeScale: number;
    tainted: boolean;
    fps: number;
    /** The sprites worn on the player (`attachedSprites`), visible ones, counted by frame name. */
    worn: Record<string, number>;
    /** The words drawn as shots this frame (`nameShotTexts`, visible): HOLD, a misspelled name. */
    words: string[];
    /** The HUD's worn line (`hudDrag`): `2 attached · reach −14%`. */
    wornLine: string;
    /**
     * The health bar's empty tail in HUD px (`hpTail`): the share of the
     * items' maximum the insurance form's decisions took (AUDIT 90, 122).
     * Zero with nothing taken. With the world's two maxima it was drawn from.
     */
    hpTail: number;
    maxHp: number;
    itemsMaxHp: number;
    /** The label over the boss's bar (`hudBossLabel`), while it shows: Time's reads its seconds. */
    bossLabel: string | null;
    /**
     * Time's minute hand as drawn (`bossHand`, visible): where its pivot is, its
     * rotation in Phaser's convention (clockwise from +x), and its size. Null
     * for every other boss.
     */
    hand: { x: number; y: number; rotation: number; length: number; width: number } | null;
    /** Holds drawn inside the camera's view, by source: the ring visible and the source's frame on it (the stairs). */
    holds: Record<string, number>;
    /** The act's `endWord` is drawn across the middle this frame (`announceWord`): EVENTUALLY. */
    endWord: boolean;
    /**
     * The act's document at a crossing, while it is up (`paper`): every text
     * drawn on it, in order, run together — the title's small-caps runs join
     * back into its words (PERFORMANCE REVIEW). Null with no paper up.
     */
    paper: string | null;
    /** The nearest enemy of each kind, from the player, in world pixels. For steering only. */
    nearest: Record<string, { dx: number; dy: number }>;
    /**
     * As `nearest`, counting only enemies inside the arena (the camera's
     * bounds): a static enemy spawned on the edge ring from a player near a
     * wall lands outside it and can never be reached. For steering only.
     */
    reachable: Record<string, { dx: number; dy: number }>;
    /** From the player to the middle of the arena, in world pixels. For steering only. */
    centre: { dx: number; dy: number };
    /**
     * Enemies of each kind drawn inside the camera's view: the sprite in the
     * enemy's slot visible and in the enemy's own frame. A sighting, where
     * `nearest` only says the world has one.
     */
    seen: Record<string, number>;
  };
}

/**
 * The probe runs in the page, so it is a string. tsx compiles with esbuild's
 * keepNames, which wraps any named inner function in a `__name(...)` call the
 * page has never heard of — a function argument to `page.evaluate` breaks the
 * first time someone gives a helper inside it a name.
 */
const PROBE = String.raw`(() => {
  const game = globalThis.game;
  if (!game || !game.scene) return { ready: false, scenes: [], renderer: '', bad: [], act: null };
  const bad = [];
  const live = game.scene.getScenes(true);
  for (const scene of live) {
    const where = scene.sys.settings.key;
    const stack = [...scene.children.list];
    while (stack.length > 0) {
      const o = stack.pop();
      if (!o || !o.visible) continue;
      if (Array.isArray(o.list)) stack.push(...o.list);
      const tex = o.texture;
      if (tex && tex.key === '__MISSING') bad.push(where + ': a ' + o.type + ' draws the missing texture');
      if (typeof o.text === 'string' && /\b(NaN|undefined|null|Infinity)\b/.test(o.text))
        bad.push(where + ': text reads ' + JSON.stringify(o.text));
    }
  }
  const panel = globalThis.document.getElementById('nc-dev');
  if (panel && /\b(NaN|undefined)\b/.test(panel.textContent || '')) bad.push('dev panel reads ' + JSON.stringify(panel.textContent));

  let act = null;
  const s = game.scene.getScene('act');
  if (s && s.sys.isActive() && s.world && s.hudClock) {
    const w = s.world;
    act = {
      index: w.actIndex,
      shown: s.shownAct,
      actTime: w.actTime,
      name: w.act.name,
      hud: s.hudClock.text,
      level: s.hudLevel.text,
      overlay: s.overlay.visible ? s.overlay.text : null,
      boss: w.boss
        ? {
            phase: w.boss.phase,
            hp: w.boss.hp,
            restructures: w.boss.restructures,
            drawnRestructures: s.bossRestructures,
            grey: !!s.bossSprite && (s.visuals.bossFrames?.grey || []).includes(s.bossSprite.frame.name),
            door: !!s.bossSprite && !!s.visuals.bossFrames?.open && s.bossSprite.frame.name === s.visuals.bossFrames.open,
          }
        : null,
      bossSprite: s.bossSprite
        ? {
            key: s.bossSprite.texture.key,
            frame: s.bossSprite.frame.name,
            x: s.bossSprite.x,
            y: s.bossSprite.y,
            inView: s.cameras.main.worldView.contains(s.bossSprite.x, s.bossSprite.y),
          }
        : null,
      bossLook: !!s.bossEntranceOwed || !!s.bossEntrance,
      bossFrame: s.visuals.bossFrame,
      bossFrames: s.visuals.bossFrames || {},
      offers: w.offers ? [...w.offers] : null,
      won: w.won,
      dead: w.dead,
      enemies: w.enemies.length,
      onScreen: w.enemies.filter((e) => s.cameras.main.worldView.contains(e.x, e.y)).length,
      zoom: s.cameras.main.zoom,
      god: s.dev.god,
      timeScale: s.dev.timeScale,
      tainted: s.dev.tainted,
      fps: Math.round(game.loop.actualFps),
      worn: {},
      words: [...new Set(s.nameShotTexts.filter((t) => t.visible).map((t) => t.text))],
      wornLine: s.hudDrag.text,
      hpTail: s.hpTail,
      maxHp: w.maxHp,
      itemsMaxHp: w.itemsMaxHp,
      bossLabel: s.hudBossLabel.visible ? s.hudBossLabel.text : null,
      hand:
        s.bossHand && s.bossHand.visible
          ? { x: s.bossHand.x, y: s.bossHand.y, rotation: s.bossHand.rotation, length: s.bossHand.width, width: s.bossHand.height }
          : null,
      holds: {},
      endWord: !!w.act.endWord && s.children.list.some((o) => o.visible && o.text === w.act.endWord),
      paper: null,
      nearest: {},
      reachable: {},
      centre: { dx: 0, dy: 0 },
      seen: {},
    };
    if (s.paper) {
      const texts = [];
      const walk = [s.paper];
      while (walk.length > 0) {
        const o = walk.shift();
        if (Array.isArray(o.list)) walk.unshift(...o.list);
        else if (typeof o.text === 'string') texts.push(o.text);
      }
      act.paper = texts.join('');
    }
    for (const a of s.attachedSprites) if (a.visible) act.worn[a.frame.name] = (act.worn[a.frame.name] || 0) + 1;
    // syncHolds draws hold i with ring i and its frame on sprite i.
    for (let i = 0; i < w.holds.length; i++) {
      const h = w.holds[i];
      const ring = s.holdRings[i];
      const chairs = s.holdChairs[i];
      if (!ring || !ring.visible || !chairs || !chairs.visible) continue;
      // An enemy's hold wears its def's frame, <id>.png; a player's, its card's icon.
      if (!h.owner && chairs.frame.name !== h.source + '.png') continue;
      if (!s.cameras.main.worldView.contains(h.x, h.y)) continue;
      act.holds[h.source] = (act.holds[h.source] || 0) + 1;
    }
    const arena = s.cameras.main.getBounds();
    act.centre = { dx: arena.centerX - w.x, dy: arena.centerY - w.y };
    for (const e of w.enemies) {
      const dx = e.x - w.x;
      const dy = e.y - w.y;
      const n = act.nearest[e.def.id];
      if (!n || dx * dx + dy * dy < n.dx * n.dx + n.dy * n.dy) act.nearest[e.def.id] = { dx, dy };
      if (!arena.contains(e.x, e.y)) continue;
      const r = act.reachable[e.def.id];
      if (!r || dx * dx + dy * dy < r.dx * r.dx + r.dy * r.dy) act.reachable[e.def.id] = { dx, dy };
    }
    // syncEnemies draws enemy i with sprite i, after the frame's steps; a panel
    // spawn between frames has no sprite yet and is simply not counted.
    const view = s.cameras.main.worldView;
    for (let i = 0; i < w.enemies.length; i++) {
      const e = w.enemies[i];
      const sprite = s.enemySprites[i];
      if (!sprite || !sprite.visible || sprite.frame.name !== e.def.frame || !view.contains(e.x, e.y)) continue;
      act.seen[e.def.id] = (act.seen[e.def.id] || 0) + 1;
    }
    if (!Number.isFinite(w.x) || !Number.isFinite(w.y) || !Number.isFinite(w.hp))
      bad.push('world: player at ' + w.x + ',' + w.y + ' hp ' + w.hp);
    // Once the screen has caught up with the world, it must be dressed for it.
    if (act.shown === act.index) {
      // Each act's atlas is keyed by its act id (act-visuals.ts).
      const v = s.visuals;
      if (v.atlas.key !== w.act.id) bad.push('dress: act ' + w.act.id + ' is drawn from atlas ' + v.atlas.key);
      if (s.cameras.main.backgroundColor.color !== v.background)
        bad.push('dress: background ' + s.cameras.main.backgroundColor.color.toString(16) + ', act wants ' + v.background.toString(16));
      // The floor is baked per act (src/scenes/floors.ts) and swapped at the crossing.
      if (s.floor.texture.key !== 'nc-floor-world-' + w.act.id)
        bad.push('dress: floor ' + s.floor.texture.key + ', act is ' + w.act.id);
      if (s.player.texture.key !== v.atlas.key || s.player.frame.name !== v.playerFrame)
        bad.push('dress: player drawn as ' + s.player.texture.key + '/' + s.player.frame.name + ', act wants ' + v.atlas.key + '/' + v.playerFrame);
    }
  }
  return {
    ready: true,
    scenes: live.map((x) => x.sys.settings.key),
    renderer: game.renderer.type === 2 ? 'WEBGL' : game.renderer.type === 1 ? 'CANVAS' : String(game.renderer.type),
    bad: [...new Set(bad)].slice(0, 20),
    act,
  };
})()`;

class SmokeFailure extends Error {
  constructor(
    readonly milestone: string,
    message: string,
    readonly last?: Probe,
  ) {
    super(message);
  }
}

const started = Date.now();
const seconds = (ms: number) => `${(ms / 1000).toFixed(1)}s`;
const problems: string[] = [];
/** When the milestone being waited for began: the last one's arrival. */
let since = started;
let lastShot = '(none yet)';
let server: ViteDevServer | undefined;
let browser: Browser | undefined;
let page: Page | undefined;

async function probe(): Promise<Probe> {
  return (await page!.evaluate(PROBE)) as Probe;
}

/** When the milestone being waited for fails: its limit (MILESTONE_MS unless it says) or the run's budget. */
const deadline = (limit = MILESTONE_MS) => Math.min(since + limit, started + BUDGET_MS);

/**
 * Polls until `ready` holds, answering any level-up offer with "1" on the way
 * (an open offer freezes the world, so nothing downstream of it can arrive).
 * `each` runs on every poll that is not yet ready: the College and Office
 * milestones steer with it. Fails on the first problem seen, or at the
 * milestone's MILESTONE_MS or the run's BUDGET_MS, whichever is first.
 */
async function waitFor(
  milestone: string,
  ready: (p: Probe) => boolean,
  each?: (p: Probe) => Promise<void>,
  limit = MILESTONE_MS,
): Promise<Probe> {
  let last: Probe | undefined;
  while (Date.now() < deadline(limit)) {
    last = await probe();
    if (problems.length > 0 || last.bad.length > 0) {
      throw new SmokeFailure(milestone, [...problems, ...last.bad].join('\n  '), last);
    }
    if (ready(last)) return last;
    await each?.(last);
    if (last.act?.offers) await page!.keyboard.press('1');
    await sleep(100);
  }
  const why =
    Date.now() >= started + BUDGET_MS
      ? `the run's ${seconds(BUDGET_MS)} budget ran out`
      : `did not arrive within ${seconds(limit)}`;
  throw new SmokeFailure(milestone, why, last);
}

/**
 * A dev panel button, by its label, through its own click handler.
 *
 * Not a pointer click: the panel rebuilds every button every 500ms, and at a
 * software-rendered 10fps Playwright's "stable for two frames" check kept
 * losing the element to the rebuild — 2-3s a click. A dispatched event
 * resolves and fires in one turn of the page, so the rebuild cannot land
 * between the two.
 */
async function press(milestone: string, label: string): Promise<void> {
  const timeout = Math.max(1000, deadline() - Date.now());
  try {
    await page!.getByRole('button', { name: label, exact: true }).dispatchEvent('click', undefined, { timeout });
  } catch (err) {
    throw new SmokeFailure(milestone, `dev panel button "${label}" could not be clicked: ${(err as Error).message.split('\n')[0]}`);
  }
}

/** Arrow keys the smoke is holding down, so a milestone can let go of every one. */
const held = new Set<string>();

/**
 * Walks the player toward a point `dx, dy` away with the arrow keys, as a
 * person would, and stands still within `stop` pixels of it. Eight headings:
 * an axis inside 6px is not pressed, so an overshoot turns back through the
 * point. Only the keys that change are sent.
 */
async function steer(dx: number, dy: number, stop: number): Promise<void> {
  const want = new Set<string>();
  if (Math.hypot(dx, dy) > stop) {
    if (dx > 6) want.add('ArrowRight');
    else if (dx < -6) want.add('ArrowLeft');
    if (dy > 6) want.add('ArrowDown');
    else if (dy < -6) want.add('ArrowUp');
  }
  for (const key of [...held]) {
    if (want.has(key)) continue;
    await page!.keyboard.up(key);
    held.delete(key);
  }
  for (const key of want) {
    if (held.has(key)) continue;
    await page!.keyboard.down(key);
    held.add(key);
  }
}

/** Asserts the milestone clean, screenshots it, prints its line. */
async function milestone(name: string, p: Probe, detail: string): Promise<void> {
  const file = resolve(OUT, `${name}.png`);
  // The panel sits over the HUD's top-right corner; hide it for the picture only.
  await page!.screenshot({ path: file, style: '#nc-dev{display:none!important}' });
  lastShot = relative(ROOT, file);
  if (problems.length > 0 || p.bad.length > 0) {
    throw new SmokeFailure(name, [...problems, ...p.bad].join('\n  '), p);
  }
  process.stdout.write(`ok  ${name.padEnd(16)} ${seconds(Date.now() - started).padStart(6)}  ${detail}\n`);
  since = Date.now();
}

const hudAge = (p: Probe) => /^age \d+$/.test(p.act?.hud ?? '');
/**
 * An enemy in view, so the screenshot has one to judge — or, failing that,
 * 20s of act clock: School's cliques drift rather than pursue, and whether
 * one wanders into frame is luck. The boss milestones always have company.
 */
const populated = (p: Probe) => !!p.act && (p.act.onScreen >= 1 || p.act.actTime >= 20);
const actLine = (p: Probe) =>
  `${p.act!.hud}  ${p.act!.level}  ${p.act!.onScreen}/${p.act!.enemies} enemies on screen  ${p.act!.fps} fps` +
  (p.act!.bossSprite ? `  boss ${p.act!.bossSprite.frame}` : '');

/** A port nobody is on. Vite reads a port of 0 as "unset" and takes 5173, which `pnpm dev` may hold. */
function freePort(): Promise<number> {
  return new Promise((done, fail) => {
    const probeServer = createNetServer();
    probeServer.once('error', fail);
    probeServer.listen(0, '127.0.0.1', () => {
      const { port } = probeServer.address() as AddressInfo;
      probeServer.close(() => done(port));
    });
  });
}

async function main(): Promise<void> {
  rmSync(OUT, { recursive: true, force: true });
  mkdirSync(OUT, { recursive: true });

  // No watcher and no HMR: other sessions edit this tree while the smoke runs,
  // and a hot reload halfway through a life is a failure that is not the game's.
  server = await createServer({
    root: ROOT,
    logLevel: 'error',
    clearScreen: false,
    server: { host: '127.0.0.1', port: await freePort(), strictPort: false, hmr: false, watch: null },
  });
  await server.listen();
  // Read back rather than assumed: if the port was taken in between, Vite moved up.
  const port = (server.httpServer!.address() as AddressInfo).port;
  const url = `http://127.0.0.1:${port}/`;

  try {
    browser = await chromium.launch({
      headless: true,
      // SwiftShader WebGL: the game asks for Phaser.AUTO, and a container has
      // no GPU. Without this Chromium refuses WebGL and Phaser quietly falls
      // back to Canvas — a different renderer from the one players get.
      args: ['--enable-unsafe-swiftshader', '--use-angle=swiftshader'],
      ...(process.env.SMOKE_CHROMIUM ? { executablePath: process.env.SMOKE_CHROMIUM } : {}),
    });
  } catch (err) {
    throw new SmokeFailure(
      'launch',
      `Chromium did not start: ${(err as Error).message.split('\n')[0]}\n  ` +
        `Install the matching browser with \`pnpm exec playwright-core install chromium-headless-shell\`, ` +
        `or point SMOKE_CHROMIUM at a Chromium binary.`,
    );
  }
  page = await browser.newPage({ viewport: VIEW, deviceScaleFactor: 1 });

  page.on('console', (msg) => {
    const text = msg.text();
    const at = msg.location().url ? ` (${msg.location().url.replace(url, '/')}:${msg.location().lineNumber})` : '';
    if (msg.type() === 'error') problems.push(`console.error: ${text}${at}`);
    else if (PHASER_WARNING.test(text)) problems.push(`phaser ${msg.type()}: ${text}${at}`);
  });
  page.on('pageerror', (err) => problems.push(`page error: ${err.stack ?? err.message}`));
  page.on('requestfailed', (req) => problems.push(`request failed: ${req.url()} ${req.failure()?.errorText ?? ''}`));
  page.on('response', (res) => {
    if (res.status() >= 400) problems.push(`HTTP ${res.status()}: ${res.url()}`);
  });

  await page.goto(url, { waitUntil: 'load' });

  let p = await waitFor('title', (q) => q.ready && q.scenes.includes('title'));
  await milestone('title', p, `renderer ${p.renderer}`);

  // "Enter or tap to begin": Enter accepts the name on the form (empty means
  // Nobody) and starts the run.
  await page.keyboard.press('Enter');
  p = await waitFor('conception', (q) => q.act?.index === 0 && hudAge(q));
  // The panel is a dynamic import in dev builds only (src/dev/panel.ts).
  await page
    .locator('#nc-dev')
    .waitFor({ timeout: Math.max(1000, deadline() - Date.now()) })
    .catch(() => {
      throw new SmokeFailure('conception', 'the dev panel (#nc-dev) never appeared', p);
    });
  await press('conception', 'god');
  await press('conception', '4x');
  p = await waitFor('conception', (q) => !!q.act && q.act.god && q.act.timeScale === 4 && populated(q));
  await milestone('conception', p, actLine(p));

  // The Egg stands in its own frame, and then does not die (G-006): through
  // the absorb its eyes close and its corona parts, each a drawn frame
  // (D-029) swapped in at the absorb's start and its halfway. The panel's
  // kill goes straight to the absorb, which runs 1.8s at 1x, so each frame is
  // up for 0.9s; either is latched drawn at any poll through the exit, and the
  // milestone's picture is taken on the parted one, or on the crossing if no
  // poll landed on it.
  await press('conception-boss', 'skip to boss');
  p = await waitFor('conception-boss', (q) => !!q.act?.boss && q.act.bossSprite?.frame === q.act.bossFrame);
  // The absorb and the crossing at player speed (see the header), then 4x again.
  const egg = { closing: false, parted: false };
  const readEgg = (q: Probe) => {
    const frame = q.act?.bossSprite?.frame;
    if (!frame || !q.act) return;
    egg.closing ||= frame === q.act.bossFrames.closing;
    egg.parted ||= frame === q.act.bossFrames.parted;
  };
  await press('conception-boss', '1x');
  await press('conception-boss', 'kill');
  p = await waitFor('conception-boss', (q) => {
    readEgg(q);
    return egg.parted || (q.act?.index ?? 0) > 0;
  });
  if (!egg.closing && !egg.parted) {
    throw new SmokeFailure('conception-boss', 'The Egg absorbed and was never drawn with its eyes closed or its corona parted', p);
  }
  await milestone(
    'conception-boss',
    p,
    `${actLine(p)}  eyes closed ${egg.closing ? 'seen' : 'not polled'}, corona parted ${egg.parted ? 'seen' : 'not polled'}`,
  );
  p = await waitFor('school', (q) => q.act?.index === 1 && q.act.shown === 1 && q.act.zoom === WORLD_ZOOM && hudAge(q));
  await press('school', '4x');
  p = await waitFor('school', (q) => q.act?.index === 1 && q.act.timeScale === 4 && populated(q));
  await milestone('school', p, actLine(p));

  await press('school-boss', 'skip to boss');
  p = await waitFor('school-boss', (q) => !!q.act?.boss && q.act.bossSprite?.frame === q.act.bossFrame);
  await milestone('school-boss', p, actLine(p));

  await press('school-boss', '1x');
  await press('school-boss', 'kill');
  p = await waitFor('adolescence', (q) => q.act?.index === 2 && q.act.shown === 2 && q.act.zoom === WORLD_ZOOM && hudAge(q));
  await press('adolescence', '4x');
  p = await waitFor('adolescence', (q) => q.act?.index === 2 && q.act.timeScale === 4 && populated(q));
  await milestone('adolescence', p, actLine(p));

  await press('adolescence-boss', 'skip to boss');
  p = await waitFor('adolescence-boss', (q) => !!q.act?.boss && q.act.bossSprite?.frame === q.act.bossFrame);
  await milestone('adolescence-boss', p, actLine(p));

  await press('adolescence-boss', '1x');
  await press('adolescence-boss', 'kill');
  p = await waitFor('college', (q) => q.act?.index === 3 && q.act.shown === 3 && q.act.zoom === WORLD_ZOOM && hudAge(q));
  await press('college', '4x');
  p = await waitFor('college', (q) => q.act?.index === 3 && q.act.timeScale === 4 && populated(q));
  await milestone('college', p, actLine(p));

  // College's own drawings (AUDIT 39), at 4x under god as every act here is
  // played: a worn tuition on the player, and a registrar's HOLD in flight.
  // Neither comes to a player who stands still — tuition waits at the lead
  // and the registrar is a counter that fires inside 440px — so the smoke
  // walks: to the nearest tuition until one is worn, then to within 300px of
  // the nearest registrar until a HOLD is drawn. Both are spawned from the
  // panel so the act's own schedule (the first registrar near 65s) is not
  // waited on, and asked for again if the field has none (tuition), or every
  // 10s without a HOLD (a registrar off the arena's edge, or shot first).
  // Each sighting latches: a HOLD lives a second or two, and this waits for it
  // to have been drawn at some poll, not at a given instant.
  const college = { worn: 0, hold: false };
  const asked = { tuition: 0, registrar: 0 };
  await press('college-play', '1x Tuition');
  await press('college-play', '1x Registrar');
  asked.tuition = asked.registrar = Date.now();
  p = await waitFor(
    'college-play',
    (q) => {
      college.worn = Math.max(college.worn, q.act?.worn['tuition.png'] ?? 0);
      college.hold ||= q.act?.words.includes('HOLD') ?? false;
      return q.act?.index === 3 && college.worn > 0 && college.hold;
    },
    async (q) => {
      if (!q.act || q.act.index !== 3) return;
      const kind = college.worn === 0 ? 'tuition' : 'registrar';
      const target = q.act.nearest[kind];
      const again = kind === 'tuition' ? !target && Date.now() - asked.tuition > 4000 : Date.now() - asked.registrar > 10_000;
      if (again && !college.hold) {
        await press('college-play', kind === 'tuition' ? '1x Tuition' : '1x Registrar');
        asked[kind] = Date.now();
      }
      if (target) await steer(target.dx, target.dy, kind === 'tuition' ? 0 : 300);
      else await steer(0, 0, 0);
    },
  );
  await steer(0, 0, 0);
  await milestone('college-play', p, `${actLine(p)}  worn tuition ${college.worn}  HOLD drawn`);

  await press('college-boss', 'skip to boss');
  p = await waitFor('college-boss', (q) => !!q.act?.boss && q.act.bossSprite?.frame === q.act.bossFrame);
  await milestone('college-boss', p, actLine(p));

  await press('college-boss', '1x');
  await press('college-boss', 'kill');
  p = await waitFor('office', (q) => q.act?.index === 4 && q.act.shown === 4 && q.act.zoom === WORLD_ZOOM && hudAge(q));
  await press('office', '4x');
  // Tuition persists (COLLEGE-ROSTER §3.3) and the invoices worn in College
  // cross with the player: in The Office they must still draw as tuition from
  // College's atlas, not as the act's ping (AUDIT six, 38).
  p = await waitFor('office', (q) => q.act?.index === 4 && q.act.timeScale === 4 && populated(q));
  const carried = p.act!.worn['tuition.png'] ?? 0;
  if (carried < 1) {
    throw new SmokeFailure('office', `the tuition worn in College is not drawn in The Office: worn ${JSON.stringify(p.act!.worn)}`, p);
  }
  await milestone('office', p, `${actLine(p)}  worn tuition ${carried}`);

  // The Office's own drawings (AUDIT 54), as College's above and at the same
  // 4x under god: a ping worn on the player, a performance review's MEETS in
  // flight, and a commute on screen. The ping waits at the lead like tuition,
  // so the smoke walks into the nearest one until one is worn; the review is a
  // counter that fires inside 460px, so it then walks to within 300px of the
  // nearest until a MEETS is drawn. The commute is aimed at where the player
  // stood when it arrived and patrols that line; it is latched on any poll
  // that finds one drawn inside the camera's view (`seen`), and if none has
  // been by the time the other two are, the player stands and another is
  // asked for every 6s, aimed at where the player now is. All three are
  // spawned from the panel rather than waited on (the act's first review and
  // commute open at 60s and 75s), and asked for again as College's are: the
  // ping when the field has none, the review every 10s without a MEETS (one
  // off the arena's edge, or shot first). Each sighting latches.
  const office = { worn: 0, meets: false, commute: false };
  const officeAsked = { ping: 0, 'performance-review': 0, commute: 0 };
  const officeButton = { ping: '1x Ping', 'performance-review': '1x Performance review', commute: '1x Commute' };
  for (const kind of ['ping', 'performance-review', 'commute'] as const) {
    await press('office-play', officeButton[kind]);
    officeAsked[kind] = Date.now();
  }
  p = await waitFor(
    'office-play',
    (q) => {
      office.worn = Math.max(office.worn, q.act?.worn['ping.png'] ?? 0);
      office.meets ||= q.act?.words.includes('MEETS') ?? false;
      office.commute ||= (q.act?.seen['commute'] ?? 0) > 0;
      return q.act?.index === 4 && office.worn > 0 && office.meets && office.commute;
    },
    async (q) => {
      if (!q.act || q.act.index !== 4) return;
      const kind = office.worn === 0 ? 'ping' : !office.meets ? 'performance-review' : 'commute';
      const target = q.act.nearest[kind];
      const waited = Date.now() - officeAsked[kind];
      const again =
        kind === 'ping' ? !target && waited > 4000 : kind === 'performance-review' ? waited > 10_000 : waited > 6000;
      if (again) {
        await press('office-play', officeButton[kind]);
        officeAsked[kind] = Date.now();
      }
      if (kind !== 'commute' && target) await steer(target.dx, target.dy, kind === 'ping' ? 0 : 300);
      else await steer(0, 0, 0);
    },
  );
  await steer(0, 0, 0);
  await milestone('office-play', p, `${actLine(p)}  worn ping ${office.worn}  MEETS drawn  commute seen`);

  await press('office-boss', 'skip to boss');
  p = await waitFor('office-boss', (q) => !!q.act?.boss && q.act.bossSprite?.frame === q.act.bossFrame);
  await milestone('office-boss', p, actLine(p));

  // The Reorg restructuring (AUDIT 54), at player speed as every kill here is.
  // The panel's kill goes straight to the absorb and passes no threshold, so
  // first its "−50%" takes half the chart's health (it cannot reach zero) and
  // the smoke waits for the restructure to be DRAWN, not only counted: the
  // world's count up, the scene's own count caught up to it, the chart in the
  // grey frame that count names (`bossFrames.grey`, D-029: the first, one row
  // greyed, for one restructure), and the chart's sprite somewhere else — the
  // Reorg never moves but at a restructure. Half from full passes two thirds
  // and not one third, so this is one restructure and boss-reorg-grey-1; the
  // line prints the count and the frame seen, and a second one (the build's
  // own fire taking it under a third first) would show there, in the second
  // grey frame. Not while absorbing: the kill greys every row.
  // It waits out the entrance's look first, so the camera is back on the
  // player when the chart moves and the picture is framed as a player sees
  // it. Whether the chart then landed in view is printed, not asserted: it
  // relocates at least 300px from the player and may land off screen
  // (AUDIT 53, open).
  const chartAt = { x: p.act!.bossSprite!.x, y: p.act!.bossSprite!.y };
  const chartMoved = (q: Probe) =>
    q.act?.bossSprite ? Math.hypot(q.act.bossSprite.x - chartAt.x, q.act.bossSprite.y - chartAt.y) : 0;
  await press('office-reorg', '1x');
  await waitFor('office-reorg', (q) => !!q.act && !q.act.bossLook);
  await press('office-reorg', '−50%');
  const greyFor = (q: Probe) => {
    const grey = q.act?.bossFrames.grey ?? [];
    const n = Math.min(q.act?.boss?.restructures ?? 0, grey.length);
    return n >= 1 ? grey[n - 1] : undefined;
  };
  p = await waitFor(
    'office-reorg',
    (q) =>
      !!q.act?.boss &&
      q.act.boss.phase !== 'absorbing' &&
      q.act.boss.restructures >= 1 &&
      q.act.boss.drawnRestructures === q.act.boss.restructures &&
      q.act.boss.grey &&
      !!greyFor(q) &&
      q.act.bossSprite?.frame === greyFor(q) &&
      chartMoved(q) > 1,
  );
  if (p.act!.boss!.restructures === 1 && p.act!.bossSprite!.frame !== 'boss-reorg-grey-1.png') {
    throw new SmokeFailure('office-reorg', `one restructure drew the chart as ${p.act!.bossSprite!.frame}, not boss-reorg-grey-1.png`, p);
  }
  await milestone(
    'office-reorg',
    p,
    `${actLine(p)}  restructured ${p.act!.boss!.restructures}  chart moved ${Math.round(chartMoved(p))}px` +
      (p.act!.bossSprite!.inView ? ', in view' : ', off screen'),
  );

  // The Reorg falling crosses into Family (FAMILY-ROSTER §5), and The
  // Office's paper, the performance review, is drawn for the first time: a
  // life that ended at The Reorg never crossed with it. It is up for the
  // scene's DOCUMENT_MS or until a key (an offer's "1" takes it), so both of
  // the crossing's waits latch it drawn at any poll, as the words are.
  const family = { paper: false, worn: 0, reach: false, hello: false, toddler: false, due: false, door: false };
  const readPaper = (q: Probe) => (family.paper ||= q.act?.paper?.includes('PERFORMANCE REVIEW') ?? false);
  await press('office-reorg', 'kill');
  p = await waitFor('family', (q) => {
    readPaper(q);
    return q.act?.index === 5 && q.act.shown === 5 && q.act.zoom === WORLD_ZOOM && hudAge(q);
  });
  await press('family', '4x');
  p = await waitFor('family', (q) => {
    readPaper(q);
    return q.act?.index === 5 && q.act.timeScale === 4 && populated(q);
  });
  if (!family.paper) {
    throw new SmokeFailure('family', 'the crossing into Family never drew The Office\'s paper, PERFORMANCE REVIEW', p);
  }
  await milestone('family', p, `${actLine(p)}  paper PERFORMANCE REVIEW`);

  // Family's own drawings, as The Office's above and at the same 4x under
  // god: an HOA letter worn on the player with the HUD's `reach` term that
  // names its cost (§3.3), a phone's HELLO? in flight (§3.5), and a toddler
  // on screen (§3.4). The letter waits at the lead like the ping, so the
  // smoke walks into the nearest one until one is worn; the phone is a
  // counter that fires inside 440px, so it then walks to within 300px of the
  // nearest until a HELLO? is drawn (the call pulls the player toward it;
  // that is the act). The toddler is spawned on the player's trail and
  // chases, so the player stands and it is latched on any poll that finds
  // one drawn inside the camera's view, asked for again every 6s. God mode
  // zeroes the hold (`applyDevCheats`), so a toddler that reaches the player
  // lets go at once and leaves: the hold itself is a hand check, not this.
  // All three are spawned from the panel rather than waited on (the act's
  // first letter, toddler and phone open at 30s, 45s and 70s), and asked for
  // again as The Office's are. Each sighting latches.
  const familyAsked = { 'hoa-letter': 0, 'phone-call': 0, toddler: 0 };
  const familyButton = { 'hoa-letter': '1x HOA letter', 'phone-call': '1x Phone call', toddler: '1x Toddler' };
  for (const kind of ['hoa-letter', 'phone-call', 'toddler'] as const) {
    await press('family-play', familyButton[kind]);
    familyAsked[kind] = Date.now();
  }
  p = await waitFor(
    'family-play',
    (q) => {
      family.worn = Math.max(family.worn, q.act?.worn['hoa-letter.png'] ?? 0);
      family.reach ||= /\breach −\d+%/.test(q.act?.wornLine ?? '');
      family.hello ||= q.act?.words.includes('HELLO?') ?? false;
      family.toddler ||= (q.act?.seen['toddler'] ?? 0) > 0;
      return q.act?.index === 5 && family.worn > 0 && family.reach && family.hello && family.toddler;
    },
    async (q) => {
      if (!q.act || q.act.index !== 5) return;
      const kind = family.worn === 0 ? 'hoa-letter' : !family.hello ? 'phone-call' : 'toddler';
      // The phone lands on the edge ring and never moves, so from under a
      // wall it can land outside the arena for good: a run stood under the
      // top wall for 60s steering at a phone 446px beyond it while another
      // stood 779px away inside. So the smoke steers to the nearest phone
      // inside the arena; one asked for every 10s from a wall lands inside
      // about half the time. (Not walked to the middle first, as Decline's
      // form is: Family's rooms are solid and can stand in the way.)
      const target = kind === 'phone-call' ? q.act.reachable[kind] : q.act.nearest[kind];
      const waited = Date.now() - familyAsked[kind];
      const again =
        kind === 'hoa-letter' ? !target && waited > 4000 : kind === 'phone-call' ? waited > 10_000 : waited > 6000;
      if (again) {
        await press('family-play', familyButton[kind]);
        familyAsked[kind] = Date.now();
      }
      if (kind !== 'toddler' && target) await steer(target.dx, target.dy, kind === 'hoa-letter' ? 0 : 300);
      else await steer(0, 0, 0);
    },
  );
  await steer(0, 0, 0);
  await milestone(
    'family-play',
    p,
    `${actLine(p)}  worn letter ${family.worn}  "${p.act!.wornLine}"  HELLO? drawn  toddler seen`,
  );

  // The Mortgage (§4), and its statement drawn as the word DUE: the boss's
  // shot has no owner, so the word is keyed on its kind. It states within a
  // few seconds of standing (the Egg's idle and telegraph, for now), and the
  // shot lives four; latched at any poll.
  await press('family-boss', 'skip to boss');
  p = await waitFor('family-boss', (q) => {
    family.due ||= q.act?.words.includes('DUE') ?? false;
    return !!q.act?.boss && q.act.bossSprite?.frame === q.act.bossFrame && family.due;
  });
  await milestone('family-boss', p, `${actLine(p)}  DUE drawn`);

  // The door opens on the payoff (§4): the house drawn in its open frame
  // (`bossFrames.open`, D-029) from the frame it begins to absorb, and shut
  // before (family-boss above saw it in its own frame), latched at any poll
  // through the absorb, which runs 1.8s at 1x.
  // The Mortgage paid off crosses into Decline (DECLINE-ROSTER §5), and
  // Family's paper, the mortgage statement, is drawn for the first time: a
  // life that ended at The Mortgage never crossed with it. Latched as the
  // performance review is above.
  const decline = { paper: false, worn: 0, drag: false, denied: false, tail: 0, stairs: false, word: false };
  const readStatement = (q: Probe) => (decline.paper ||= q.act?.paper?.includes('MORTGAGE STATEMENT') ?? false);
  await press('family-boss', '1x');
  await press('family-boss', 'kill');
  p = await waitFor('decline', (q) => {
    family.door ||= q.act?.boss?.door ?? false;
    readStatement(q);
    return q.act?.index === 6 && q.act.shown === 6 && q.act.zoom === WORLD_ZOOM && hudAge(q);
  });
  if (!family.door) throw new SmokeFailure('decline', 'The Mortgage fell and was never drawn in its open frame', p);
  await press('decline', '4x');
  p = await waitFor('decline', (q) => {
    readStatement(q);
    return q.act?.index === 6 && q.act.timeScale === 4 && populated(q);
  });
  if (!decline.paper) {
    throw new SmokeFailure('decline', "the crossing into Decline never drew Family's paper, MORTGAGE STATEMENT", p);
  }
  await milestone('decline', p, `${actLine(p)}  door opened (open frame seen)  paper MORTGAGE STATEMENT`);

  // Decline's own drawings (DECLINE-ROSTER §3), as Family's above and at the
  // same 4x: your knees worn on the player with the HUD's speed term that
  // names their cost (§3.3: drag, the antibody's, so `−x% speed`), the stairs'
  // ring on screen with the flight drawn on it (§3.4), and an insurance form's
  // DENIED in flight (§3.5) that LANDS, so the HUD's health bar shows the
  // maximum it took as an empty tail (AUDIT 90). The knees wait at the lead
  // as the letter does, so the smoke walks into the nearest; the stairs land
  // at the lead too and stay for the act, so the player stands and they are
  // latched on any poll that finds their ring drawn in view, asked for again
  // every 6s; the form is a counter that fires inside 440px, so the smoke then
  // walks to within 300px of the nearest it can reach. A form lands on the
  // edge ring, 780px out, and never moves, so one asked for from near a wall
  // can land outside the arena for good (the first run of this milestone
  // stood under the top wall for 60s with its form 527px beyond it): the
  // form is asked for only from within 200px of the arena's middle, walking
  // there first, and the smoke steers to the nearest one inside the arena.
  // God mode holds the i-frames up, and a decision lands only outside them,
  // so once the player is in range god goes off until the tail is drawn, and
  // back on (the medications are what can hurt meanwhile, a few points a
  // touch). The knees and the stairs are spawned from the panel at once and
  // the form when the player is placed for it, rather than waited on (the
  // act's first stairs and form land near 63s and 80s, AUDIT 91). Each
  // sighting latches.
  const declineAsked = { 'your-knees': 0, stairs: 0, 'insurance-form': 0 };
  const declineButton = { 'your-knees': '1x Your knees', stairs: '1x Stairs', 'insurance-form': '1x Insurance form' };
  for (const kind of ['your-knees', 'stairs'] as const) {
    await press('decline-play', declineButton[kind]);
    declineAsked[kind] = Date.now();
  }
  p = await waitFor(
    'decline-play',
    (q) => {
      decline.worn = Math.max(decline.worn, q.act?.worn['your-knees.png'] ?? 0);
      decline.drag ||= /\battached\s+−\d+% speed/.test(q.act?.wornLine ?? '');
      decline.stairs ||= (q.act?.holds['stairs'] ?? 0) > 0;
      decline.denied ||= q.act?.words.includes('DENIED') ?? false;
      decline.tail = Math.max(decline.tail, q.act?.hpTail ?? 0);
      return (
        q.act?.index === 6 &&
        decline.worn > 0 &&
        decline.drag &&
        decline.stairs &&
        decline.denied &&
        decline.tail > 0 &&
        q.act.god
      );
    },
    async (q) => {
      if (!q.act || q.act.index !== 6) return;
      // God back on the moment the decision has landed and been drawn.
      if (decline.denied && decline.tail > 0) {
        if (!q.act.god) await press('decline-play', 'god');
        return steer(0, 0, 0);
      }
      const kind = decline.worn === 0 ? 'your-knees' : !decline.stairs ? 'stairs' : 'insurance-form';
      const target = kind === 'insurance-form' ? q.act.reachable[kind] : q.act.nearest[kind];
      const waited = Date.now() - declineAsked[kind];
      const again =
        kind === 'your-knees' ? !target && waited > 4000 : kind === 'stairs' ? waited > 6000 : waited > 10_000;
      if (again && kind === 'insurance-form' && Math.hypot(q.act.centre.dx, q.act.centre.dy) > 200) {
        // Not from here: to the middle first, god on while walking.
        if (!q.act.god) await press('decline-play', 'god');
        return steer(q.act.centre.dx, q.act.centre.dy, 0);
      }
      if (again) {
        await press('decline-play', declineButton[kind]);
        declineAsked[kind] = Date.now();
      }
      if (kind === 'stairs' || !target) return steer(0, 0, 0);
      await steer(target.dx, target.dy, kind === 'your-knees' ? 0 : 300);
      // In range: the next decision has to be able to land.
      if (kind === 'insurance-form' && q.act.god && Math.hypot(target.dx, target.dy) <= 320) {
        await press('decline-play', 'god');
      }
    },
  );
  await steer(0, 0, 0);
  await milestone(
    'decline-play',
    p,
    `${actLine(p)}  worn knees ${decline.worn}  "${p.act!.wornLine}"  stairs seen  DENIED landed  ` +
      `max ${Math.round(p.act!.maxHp)}/${Math.round(p.act!.itemsMaxHp)}, tail ${decline.tail}px`,
  );

  // Time (§4): its sprite in its face frame, the clock without its long hand
  // (`bossFrames.face`, D-029), and its minute hand drawn as its own shape,
  // pivoted on the clock's face (the pivot is within a pixel of the sprite's
  // anchor, bossBody's cy; 4px is the tolerance), with the bar over it
  // labelled in seconds, never health.
  await press('decline-boss', 'skip to boss');
  const handOnFace = (q: Probe) =>
    !!q.act?.hand &&
    !!q.act.bossSprite &&
    Math.hypot(q.act.hand.x - q.act.bossSprite.x, q.act.hand.y - q.act.bossSprite.y) <= 4;
  p = await waitFor(
    'decline-boss',
    (q) =>
      !!q.act?.boss &&
      !!q.act.bossFrames.face &&
      q.act.bossSprite?.frame === q.act.bossFrames.face &&
      handOnFace(q) &&
      /\bseconds?\b/.test(q.act.bossLabel ?? ''),
  );
  const hand = p.act!.hand!;
  const fromTwelve = ((((hand.rotation + Math.PI / 2) * 180) / Math.PI) % 360 + 360) % 360;
  await milestone(
    'decline-boss',
    p,
    `${actLine(p)}  "${p.act!.bossLabel}"  hand ${Math.round(hand.length)}×${Math.round(hand.width)} at ${fromTwelve.toFixed(1)}° from twelve`,
  );

  // Time cannot be killed (§4): the life ends, won, when its clock runs out,
  // so the smoke waits it out at 4x — the win path itself, not the panel's
  // kill. That is `seconds` of act time (60, a placeholder): 15s of wall time
  // at 60 fps, but a frame's step is clamped to 50ms, so below 20 fps 4x runs
  // slower than 4x: about 37s at CI's 8 fps, 75s at the shared box's 4. Its
  // limit is 150s for that (twice the slowest), not MILESTONE_MS; a hang is
  // still caught, later. The act's end word, EVENTUALLY, is latched as the
  // clock stops, and then the certificate.
  // The hand drawn is the sim's (`boss.hand`): it is seen turning — a tenth of
  // a turn, 36°, from where decline-boss saw it — before the clock stops.
  const waited = Date.now();
  let turned = 0;
  p = await waitFor(
    'certificate',
    (q) => {
      decline.word ||= q.act?.endWord ?? false;
      if (q.act?.hand) {
        const d = Math.abs(q.act.hand.rotation - hand.rotation) % (2 * Math.PI);
        turned = Math.max(turned, Math.min(d, 2 * Math.PI - d));
      }
      return !!q.act?.won && !!q.act.overlay?.includes('Natural causes.') && q.act.overlay.includes('Age 84.');
    },
    undefined,
    150_000,
  );
  if (!decline.word) throw new SmokeFailure('certificate', 'Time ran out and EVENTUALLY was never drawn', p);
  if (turned < Math.PI / 5) {
    throw new SmokeFailure('certificate', `Time's hand was drawn but never seen to turn (at most ${((turned * 180) / Math.PI).toFixed(1)}°)`, p);
  }
  await milestone(
    'certificate',
    p,
    `${p.act!.overlay!.split('\n').slice(0, 2).join(' ')}  EVENTUALLY drawn  hand turned  Time waited out in ${seconds(Date.now() - waited)}`,
  );
}

let code = 0;
try {
  await main();
  process.stdout.write(`smoke passed in ${seconds(Date.now() - started)}\n`);
} catch (err) {
  code = 1;
  if (err instanceof SmokeFailure) {
    if (page && err.milestone !== 'launch') {
      const file = resolve(OUT, `${err.milestone}-failed.png`);
      await page.screenshot({ path: file }).then(
        () => (lastShot = relative(ROOT, file)),
        () => undefined,
      );
    }
    process.stderr.write(`FAIL ${err.milestone} at ${seconds(Date.now() - started)}: ${err.message}\n`);
    const rest = problems.filter((x) => !err.message.includes(x));
    if (rest.length > 0) process.stderr.write(`  also:\n  ${rest.join('\n  ')}\n`);
    if (err.last?.act) process.stderr.write(`  last state: ${JSON.stringify(err.last.act)}\n`);
    else if (err.last) process.stderr.write(`  last state: scenes [${err.last.scenes.join(', ')}]\n`);
    process.stderr.write(`  last screenshot: ${lastShot}\n`);
  } else {
    process.stderr.write(`FAIL: ${(err as Error).stack ?? String(err)}\n`);
  }
} finally {
  await browser?.close().catch(() => undefined);
  await server?.close().catch(() => undefined);
}
process.exit(code);
