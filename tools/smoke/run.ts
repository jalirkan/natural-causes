import { mkdirSync, rmSync } from 'node:fs';
import { createServer as createNetServer, type AddressInfo } from 'node:net';
import { relative, resolve } from 'node:path';
import { setTimeout as sleep } from 'node:timers/promises';
import { fileURLToPath } from 'node:url';
import { chromium, type Browser, type Page } from 'playwright-core';
import { createServer, type ViteDevServer } from 'vite';

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
 * life with the dev panel — god, 4x, skip to boss, kill, once an act — and at every
 * milestone asserts: no console error, no page error, no failed request, no
 * Phaser texture warning, nothing visible drawn from `__MISSING`, no
 * NaN/undefined in any text on screen, and after the crossing the screen
 * dressed for the act the world is in, with the camera back at zoom 1.
 * Screenshots go to tools/smoke/out/ (gitignored).
 *
 * Each kill is played at 1x. The absorb and the crossing are what a player
 * sees, and under 4x they are not that: the absorb's 1.8s runs in 0.45s,
 * inside the Egg's 1500ms lean-in, and Phaser drops a `zoomTo` issued while
 * one is running — so the crossing's zoom back to 1 never happens and School
 * plays at 1.1x with the HUD clipped. That is dev-speed only (at 1x the
 * lean-in ends first), so the smoke steps around it rather than failing on it.
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
const MILESTONE_MS = 60_000;
const BUDGET_MS = 240_000;
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
    boss: { phase: string; hp: number } | null;
    bossSprite: { key: string; frame: string } | null;
    bossFrame: string;
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
      boss: w.boss ? { phase: w.boss.phase, hp: w.boss.hp } : null,
      bossSprite: s.bossSprite ? { key: s.bossSprite.texture.key, frame: s.bossSprite.frame.name } : null,
      bossFrame: s.visuals.bossFrame,
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
    };
    if (!Number.isFinite(w.x) || !Number.isFinite(w.y) || !Number.isFinite(w.hp))
      bad.push('world: player at ' + w.x + ',' + w.y + ' hp ' + w.hp);
    // Once the screen has caught up with the world, it must be dressed for it.
    if (act.shown === act.index) {
      // Each act's atlas is keyed by its act id (act-visuals.ts).
      const v = s.visuals;
      if (v.atlas.key !== w.act.id) bad.push('dress: act ' + w.act.id + ' is drawn from atlas ' + v.atlas.key);
      if (s.cameras.main.backgroundColor.color !== v.background)
        bad.push('dress: background ' + s.cameras.main.backgroundColor.color.toString(16) + ', act wants ' + v.background.toString(16));
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

const deadline = () => Math.min(since + MILESTONE_MS, started + BUDGET_MS);

/**
 * Polls until `ready` holds, answering any level-up offer with "1" on the way
 * (an open offer freezes the world, so nothing downstream of it can arrive).
 * Fails on the first problem seen, or at the milestone's 20s or the run's 90s,
 * whichever is first.
 */
async function waitFor(milestone: string, ready: (p: Probe) => boolean): Promise<Probe> {
  let last: Probe | undefined;
  while (Date.now() < deadline()) {
    last = await probe();
    if (problems.length > 0 || last.bad.length > 0) {
      throw new SmokeFailure(milestone, [...problems, ...last.bad].join('\n  '), last);
    }
    if (ready(last)) return last;
    if (last.act?.offers) await page!.keyboard.press('1');
    await sleep(100);
  }
  const why =
    Date.now() >= started + BUDGET_MS
      ? `the run's ${seconds(BUDGET_MS)} budget ran out`
      : `did not arrive within ${seconds(MILESTONE_MS)}`;
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

  await press('conception-boss', 'skip to boss');
  p = await waitFor('conception-boss', (q) => !!q.act?.boss && q.act.bossSprite?.frame === q.act.bossFrame);
  await milestone('conception-boss', p, actLine(p));

  // The absorb and the crossing at player speed (see the header), then 4x again.
  await press('conception-boss', '1x');
  await press('conception-boss', 'kill');
  p = await waitFor('school', (q) => q.act?.index === 1 && q.act.shown === 1 && q.act.zoom === 1 && hudAge(q));
  await press('school', '4x');
  p = await waitFor('school', (q) => q.act?.index === 1 && q.act.timeScale === 4 && populated(q));
  await milestone('school', p, actLine(p));

  await press('school-boss', 'skip to boss');
  p = await waitFor('school-boss', (q) => !!q.act?.boss && q.act.bossSprite?.frame === q.act.bossFrame);
  await milestone('school-boss', p, actLine(p));

  await press('school-boss', '1x');
  await press('school-boss', 'kill');
  p = await waitFor('adolescence', (q) => q.act?.index === 2 && q.act.shown === 2 && q.act.zoom === 1 && hudAge(q));
  await press('adolescence', '4x');
  p = await waitFor('adolescence', (q) => q.act?.index === 2 && q.act.timeScale === 4 && populated(q));
  await milestone('adolescence', p, actLine(p));

  await press('adolescence-boss', 'skip to boss');
  p = await waitFor('adolescence-boss', (q) => !!q.act?.boss && q.act.bossSprite?.frame === q.act.bossFrame);
  await milestone('adolescence-boss', p, actLine(p));

  await press('adolescence-boss', '1x');
  await press('adolescence-boss', 'kill');
  p = await waitFor('college', (q) => q.act?.index === 3 && q.act.shown === 3 && q.act.zoom === 1 && hudAge(q));
  await press('college', '4x');
  p = await waitFor('college', (q) => q.act?.index === 3 && q.act.timeScale === 4 && populated(q));
  await milestone('college', p, actLine(p));

  await press('college-boss', 'skip to boss');
  p = await waitFor('college-boss', (q) => !!q.act?.boss && q.act.bossSprite?.frame === q.act.bossFrame);
  await milestone('college-boss', p, actLine(p));

  await press('college-boss', '1x');
  await press('college-boss', 'kill');
  p = await waitFor(
    'certificate',
    (q) => !!q.act?.won && !!q.act.overlay?.includes('Natural causes.') && q.act.overlay.includes('Age 22.'),
  );
  await milestone('certificate', p, p.act!.overlay!.split('\n').slice(0, 2).join(' '));
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
