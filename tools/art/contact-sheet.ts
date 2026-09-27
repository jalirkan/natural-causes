import { existsSync, readFileSync, readdirSync, statSync } from 'node:fs';
import { resolve } from 'node:path';
import sharp from 'sharp';
import { ALL_ASSETS, ITEM_ICONS } from './batch';
import { fromPng, type Bitmap } from './bitmap';
import { DRAWN_ONLY, STAND_INS, drawAsset, drawableSpecs, packableIds } from './draw';
import { ACT_IDS, FULL_PALETTE, INK, PAPER, actBackground, type ActId } from './palette';
import type { AssetRole, AssetSpec } from './types';

/**
 * The review page (D-009: react from pictures, not prose).
 *
 * Its only job is to let Justin answer the question ART-DIRECTION.md actually
 * asks — "is this funny, and would I play a game that looked like this for
 * twenty minutes" — which means showing each sprite the way it will be seen:
 * on its act's background, at gameplay size (law 7), and in a crowd, not at
 * the resolution it was made in.
 *
 * The rows are built from what is on disk under `assets/sprites/<act>/`, keyed
 * by the same registries the packer uses (`packableIds` plus the icon specs),
 * so a drawn sprite or a stand-in shows up exactly as it will in the atlas.
 * The provenance cards below them are per generation spec, as before.
 *
 * Self-contained: every image is inlined as a data URI, once, in a CSS class,
 * so the file opens from disk or can be sent anywhere without a directory.
 */

const GAMEPLAY_PX = 48;

type SourceKind = 'generated' | 'drawn' | 'stand-in';

interface Source {
  kind: SourceKind;
  /** Where the provenance lives, as a repo-relative path or a short note. */
  detail: string;
}

interface Sprite {
  act: ActId;
  id: string;
  role: AssetRole | 'unregistered';
  width: number;
  height: number;
  /** CSS class carrying the sprite's data URI. */
  cls: string;
  source: Source;
}

function escapeHtml(s: string): string {
  return s
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;');
}

function spriteFile(root: string, act: ActId, id: string): string {
  return resolve(root, `assets/sprites/${act}/${id}.png`);
}

/** FNV-1a, so each crowd's scatter is stable from build to build. */
function hash(s: string): number {
  let h = 0x811c9dc5;
  for (let i = 0; i < s.length; i++) {
    h ^= s.charCodeAt(i);
    h = Math.imul(h, 0x01000193);
  }
  return h >>> 0;
}

/** mulberry32. A deterministic page diffs cleanly when it is rebuilt. */
function prng(seed: number): () => number {
  let a = seed;
  return () => {
    a = (a + 0x6d2b79f5) | 0;
    let t = Math.imul(a ^ (a >>> 15), 1 | a);
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

/** Same picture. Fully transparent pixels match whatever their RGB. */
function samePixels(a: Bitmap, b: Bitmap): boolean {
  if (a.width !== b.width || a.height !== b.height) return false;
  for (let i = 0; i < a.data.length; i += 4) {
    if (a.data[i + 3] !== b.data[i + 3]) return false;
    if (a.data[i + 3] === 0) continue;
    if (a.data[i] !== b.data[i] || a.data[i + 1] !== b.data[i + 1] || a.data[i + 2] !== b.data[i + 2]) return false;
  }
  return true;
}

/**
 * Does the sprite on disk come from the SVG on disk? DRAW is deterministic,
 * so re-drawing in memory and comparing pixels answers it. File presence
 * cannot: an SVG may be mid-edit, or failing CHECK, while the sprite beside
 * it is still the generation it is meant to replace — and a label that says
 * "drawn" over a generated picture is the page lying about what it shows.
 */
async function drawingMatches(root: string, act: ActId, id: string): Promise<{ matches: boolean; passes: boolean }> {
  const spec = drawableSpecs().find((s) => s.act === act && s.id === id);
  if (!spec) return { matches: false, passes: false };
  try {
    const outcome = await drawAsset(root, spec, { write: false });
    if (!outcome.sprite) return { matches: false, passes: outcome.ok };
    const onDisk = await fromPng(readFileSync(spriteFile(root, act, id)));
    return { matches: samePixels(outcome.sprite, onDisk), passes: outcome.ok };
  } catch {
    // A law 11 refusal: the drawing cannot have made this sprite.
    return { matches: false, passes: false };
  }
}

/**
 * Where a sprite came from. A stand-in is named by the registry that placed
 * it, because the prompt it would otherwise match belongs to another act.
 * Otherwise a drawing that reproduces the sprite exactly made it; a prompt on
 * file made it if the drawing does not; anything else is a stand-in.
 */
async function sourceOf(root: string, act: ActId, id: string): Promise<Source> {
  const standIn = STAND_INS.find((s) => s.act === act && s.id === id);
  if (standIn) return { kind: 'stand-in', detail: `${standIn.from.act}/${standIn.from.id}, on loan` };

  const svg = `assets/svg/${act}/${id}.svg`;
  const prompt = `assets/prompts/${id}.md`;
  const hasSvg = existsSync(resolve(root, svg));
  // Prompts are keyed by id alone; one belongs to this sprite only if no spec
  // places that id in another act.
  const spec = ALL_ASSETS.find((s) => s.id === id);
  const hasPrompt = existsSync(resolve(root, prompt)) && (!spec || spec.act === act);
  const drawing = hasSvg && existsSync(spriteFile(root, act, id)) ? await drawingMatches(root, act, id) : null;
  const fails = drawing && !drawing.passes ? '; it fails CHECK' : '';

  if (drawing?.matches) return { kind: 'drawn', detail: hasPrompt ? `${svg} (replaces the generation)` : svg };
  if (hasPrompt) {
    return { kind: 'generated', detail: hasSvg ? `${prompt} (a drawing is on file, not yet applied${fails})` : prompt };
  }
  if (hasSvg) return { kind: 'drawn', detail: `${svg} (edited since this sprite was drawn${fails})` };
  return { kind: 'stand-in', detail: 'no prompt or drawing on file' };
}

/** What every section of the page shares; sources are resolved once per sprite. */
class Sheet {
  readonly styles = new SpriteStyles();
  private readonly sources = new Map<string, Promise<Source>>();

  constructor(readonly root: string) {}

  source(act: ActId, id: string): Promise<Source> {
    const key = `${act}/${id}`;
    let known = this.sources.get(key);
    if (!known) {
      known = sourceOf(this.root, act, id);
      this.sources.set(key, known);
    }
    return known;
  }
}

function roleOf(act: ActId, id: string): AssetRole | 'unregistered' {
  return (
    ALL_ASSETS.find((s) => s.act === act && s.id === id)?.role ??
    DRAWN_ONLY.find((s) => s.act === act && s.id === id)?.role ??
    STAND_INS.find((s) => s.act === act && s.id === id)?.role ??
    'unregistered'
  );
}

const ROLE_ORDER: Record<AssetRole | 'unregistered', number> = {
  player: 0,
  swarm: 1,
  pickup: 2,
  boss: 3,
  icon: 4,
  unregistered: 5,
};

/** One data URI per file, however many times the page shows it. */
class SpriteStyles {
  private readonly byFile = new Map<string, string>();
  private readonly rules: string[] = [];

  classFor(file: string): string {
    const known = this.byFile.get(file);
    if (known) return known;
    const cls = `s${this.byFile.size}`;
    this.byFile.set(file, cls);
    this.rules.push(`.${cls}{background-image:url(data:image/png;base64,${readFileSync(file).toString('base64')})}`);
    return cls;
  }

  css(): string {
    return this.rules.join('\n');
  }
}

async function loadSprite(sheet: Sheet, act: ActId, id: string): Promise<Sprite | null> {
  const file = spriteFile(sheet.root, act, id);
  if (!existsSync(file)) return null;
  const meta = await sharp(file).metadata();
  return {
    act,
    id,
    role: roleOf(act, id),
    width: meta.width ?? 0,
    height: meta.height ?? 0,
    cls: sheet.styles.classFor(file),
    source: await sheet.source(act, id),
  };
}

/** Why a registered id has no sprite, in as few words as the row allows. */
function whyMissing(root: string, act: ActId, id: string): string {
  if (existsSync(resolve(root, `assets/svg/${act}/${id}.svg`))) return 'drawing on file, no sprite yet';
  const spec = ALL_ASSETS.find((s) => s.id === id);
  if (existsSync(resolve(root, `assets/prompts/${id}.md`)) && spec?.act === act) return 'generated, did not pass';
  return 'not made yet';
}

// ---------------------------------------------------------------------------
// Views
// ---------------------------------------------------------------------------

function el(s: Sprite, w: number, h: number, style = ''): string {
  return `<i class="spr ${s.cls}" style="width:${w}px;height:${h}px${style}"></i>`;
}

function fit(s: Sprite, px: number): [number, number] {
  const k = px / Math.max(s.width, s.height, 1);
  return [Math.round(s.width * k), Math.round(s.height * k)];
}

/**
 * Fifteen of it at gameplay size, jittered, lower rows drawn over upper ones.
 * Law 6 is about picking one enemy out of forty; a sprite that reads alone
 * and mushes in a horde has still failed, and only this view shows it.
 */
function horde(s: Sprite): string {
  const [w, h] = fit(s, GAMEPLAY_PX);
  const cols = 5;
  const rows = 3;
  const pitchX = 42;
  const pitchY = 40;
  const jitter = 7;
  const rand = prng(hash(`${s.act}/${s.id}`));
  const cells: Array<{ x: number; y: number }> = [];
  for (let r = 0; r < rows; r++) {
    for (let c = 0; c < cols; c++) {
      cells.push({
        x: Math.round(jitter + c * pitchX + (rand() * 2 - 1) * jitter),
        y: Math.round(jitter + r * pitchY + (rand() * 2 - 1) * jitter),
      });
    }
  }
  cells.sort((a, b) => a.y - b.y);
  const boxW = jitter * 2 + (cols - 1) * pitchX + w;
  const boxH = jitter * 2 + (rows - 1) * pitchY + h;
  const body = cells.map((p) => el(s, w, h, `;left:${p.x}px;top:${p.y}px`)).join('');
  return `<div class="horde" style="width:${boxW}px;height:${boxH}px">${body}</div>`;
}

function caption(s: Sprite): string {
  const role = s.role === 'unregistered' ? 'unregistered — will not be packed' : s.role;
  return `<figcaption>
      <b>${escapeHtml(s.id)}</b> <span class="role">${escapeHtml(role)}</span><br>
      <span class="src src-${s.source.kind}">${s.source.kind}</span> <code>${escapeHtml(s.source.detail)}</code><br>
      <span class="px">${s.width}×${s.height} px</span>
    </figcaption>`;
}

function tile(s: Sprite, withHorde: boolean): string {
  const [w48, h48] = fit(s, GAMEPLAY_PX);
  const views = [
    `<div class="view"><i class="spr ${s.cls} true" role="img" aria-label="${escapeHtml(s.id)}" style="width:${s.width}px;aspect-ratio:${s.width}/${s.height}"></i><span class="lbl">1:1</span></div>`,
    `<div class="view">${el(s, w48, h48)}<span class="lbl">${GAMEPLAY_PX}px</span></div>`,
  ];
  if (withHorde) views.push(`<div class="view">${horde(s)}<span class="lbl">crowd · ${GAMEPLAY_PX}px</span></div>`);
  return `<figure class="tile">
    <div class="views">${views.join('')}</div>
    ${caption(s)}
  </figure>`;
}

function countBy(sprites: Sprite[]): string {
  const kinds: SourceKind[] = ['generated', 'drawn', 'stand-in'];
  return kinds
    .map((k) => [k, sprites.filter((s) => s.source.kind === k).length] as const)
    .filter(([, n]) => n > 0)
    .map(([k, n]) => `${n} ${k}`)
    .join(', ');
}

function actTitle(act: ActId): string {
  return act.charAt(0).toUpperCase() + act.slice(1);
}

async function actBand(sheet: Sheet, act: ActId): Promise<string> {
  const { root } = sheet;
  const registered = packableIds(act);
  const iconIds = new Set(ITEM_ICONS.filter((s) => s.act === act).map((s) => s.id));
  const dir = resolve(root, `assets/sprites/${act}`);
  const onDisk = existsSync(dir)
    ? readdirSync(dir)
        .filter((f) => f.endsWith('.png'))
        .map((f) => f.slice(0, -'.png'.length))
    : [];
  // Registered ids in registry order, then any PNG no registry claims — it is
  // on disk, so it is shown, and labelled as something the packer will skip.
  const ids = [...registered, ...onDisk.filter((id) => !registered.includes(id) && !iconIds.has(id)).sort()];

  const sprites: Sprite[] = [];
  for (const id of ids) {
    const s = await loadSprite(sheet, act, id);
    if (s) sprites.push(s);
  }
  sprites.sort((a, b) => ROLE_ORDER[a.role] - ROLE_ORDER[b.role]);
  const missing = registered.filter((id) => !onDisk.includes(id)).map((id) => `${id} (${whyMissing(root, act, id)})`);
  if (sprites.length === 0 && missing.length === 0) return '';

  const bg = actBackground(act);
  return `<section class="band" style="background:${bg.hex}">
  <header>
    <h2>${actTitle(act)}</h2>
    <p>on <code>${bg.name} ${bg.hex}</code> · ${sprites.length} sprite${sprites.length === 1 ? '' : 's'}${
      sprites.length ? `: ${countBy(sprites)}` : ''
    }</p>
  </header>
  <div class="tiles">${sprites.map((s) => tile(s, true)).join('\n')}</div>
  ${missing.length ? `<p class="missing">Registered, not on disk: ${escapeHtml(missing.join(', '))}</p>` : ''}
</section>`;
}

/** Icons live on the offer cards' ink surface (G-035), never on the field. */
async function iconBand(sheet: Sheet): Promise<string> {
  const icons: Sprite[] = [];
  const missing: string[] = [];
  for (const spec of ITEM_ICONS) {
    const s = await loadSprite(sheet, spec.act, spec.id);
    if (s) icons.push(s);
    else missing.push(spec.id);
  }
  if (icons.length === 0 && missing.length === 0) return '';

  // The icon's version of the crowd: the whole set side by side, because on a
  // card the question is whether each one is distinguishable from the others.
  const set = icons
    .map((s) => {
      const [w, h] = fit(s, GAMEPLAY_PX);
      return el(s, w, h);
    })
    .join('');
  return `<section class="band" style="background:${INK.hex}">
  <header>
    <h2>Item icons</h2>
    <p>on <code>${INK.name} ${INK.hex}</code>, the offer card surface · ${icons.length} icon${icons.length === 1 ? '' : 's'}${
      icons.length ? `: ${countBy(icons)}` : ''
    }</p>
  </header>
  <div class="tiles">${icons.map((s) => tile(s, false)).join('\n')}</div>
  ${icons.length ? `<div class="view set"><div class="set-row">${set}</div><span class="lbl">the set · ${GAMEPLAY_PX}px — can you tell them apart</span></div>` : ''}
  ${missing.length ? `<p class="missing">Registered, not on disk: ${escapeHtml(missing.join(', '))}</p>` : ''}
</section>`;
}

// ---------------------------------------------------------------------------
// Provenance: one card per generation spec
// ---------------------------------------------------------------------------

/**
 * The newest raw candidate on disk, downscaled for embedding.
 *
 * Raws are 1024px; six of them inlined at full size made a 6MB page, which is
 * a slow thing to open and a worse thing to send anywhere. The raw column only
 * has to show what the generator returned before the pipeline touched it.
 */
async function findRaw(root: string, id: string): Promise<string | null> {
  const dir = resolve(root, 'assets/raw');
  if (!existsSync(dir)) return null;
  const matches = readdirSync(dir).filter((f) => f.startsWith(`${id}-`) && f.endsWith('.png'));
  if (matches.length === 0) return null;
  const small = await sharp(resolve(dir, matches[matches.length - 1]!))
    .resize(320, 320, { fit: 'inside' })
    .png({ compressionLevel: 9 })
    .toBuffer();
  return `data:image/png;base64,${small.toString('base64')}`;
}

function readChecks(root: string, id: string): string {
  const file = resolve(root, `assets/prompts/${id}.md`);
  if (!existsSync(file)) return '';
  const md = readFileSync(file, 'utf8');
  const table = md.split('## Mechanical checks')[1]?.split('##')[0] ?? '';
  const rows = table
    .split('\n')
    .filter((l) => l.startsWith('|') && !l.includes('---') && !l.includes('| Check |'))
    .map((l) => {
      const [, name, result, measured, expected] = l.split('|').map((c) => c.trim());
      const ok = result === 'pass';
      return `<tr class="${ok ? 'ok' : 'bad'}"><td>${escapeHtml(name ?? '')}</td><td>${
        ok ? '✓' : '✕'
      }</td><td>${escapeHtml(measured ?? '')}</td><td>${escapeHtml(expected ?? '')}</td></tr>`;
    })
    .join('');
  return rows ? `<table class="checks"><tbody>${rows}</tbody></table>` : '';
}

async function card(sheet: Sheet, spec: AssetSpec): Promise<string> {
  const { root, styles } = sheet;
  const file = spriteFile(root, spec.act, spec.id);
  const has = existsSync(file);
  const raw = await findRaw(root, spec.id);
  const bg = spec.role === 'icon' ? INK.hex : actBackground(spec.act).hex;
  const isReal = /REAL TEST/.test(spec.tests ?? '');
  const source = await sheet.source(spec.act, spec.id);
  const status = has ? source.kind : whyMissing(root, spec.act, spec.id);

  let conformed = '';
  if (has) {
    const meta = await sharp(file).metadata();
    const w = meta.width ?? 0;
    const h = meta.height ?? 0;
    conformed = `<figure class="stage" style="background:${bg}">
        <i class="spr ${styles.classFor(file)} true" style="width:${w}px;aspect-ratio:${w}/${h}"></i>
        <figcaption>conformed, on ${spec.role === 'icon' ? 'ink' : 'act background'}</figcaption>
      </figure>`;
  }

  return `<article class="card${isReal ? ' real-test' : ''}${has ? '' : ' missing'}">
    <header>
      <h3>${escapeHtml(spec.name)}${isReal ? '<span class="badge">real test</span>' : ''}</h3>
      <p class="meta">${spec.act} · ${spec.role} · ${spec.targetSize}px · <strong>${escapeHtml(status)}</strong>${
        spec.tests ? ` · tests: ${escapeHtml(spec.tests.replace(' — THE REAL TEST', ''))}` : ''
      }</p>
    </header>
    ${raw || conformed ? `<div class="stages">
      ${raw ? `<figure class="stage"><img src="${raw}" alt="raw generation"><figcaption>raw generation</figcaption></figure>` : ''}
      ${conformed}
    </div>` : ''}
    ${spec.whyThisStage ? `<p class="why"><strong>Why this life stage.</strong> ${escapeHtml(spec.whyThisStage)}</p>` : ''}
    ${
      // The checks in a prompt file were measured on the generated sprite. Once
      // a drawing replaces it they describe a picture no longer on disk, and a
      // green table beside the new sprite would read as the new sprite passing.
      source.kind === 'drawn' && existsSync(resolve(root, `assets/prompts/${spec.id}.md`))
        ? `<p class="why"><strong>Replaced by a drawing.</strong> The sprite above is <code>${escapeHtml(
            `assets/svg/${spec.act}/${spec.id}.svg`,
          )}</code>; the checks and prompt below belong to the generation it replaced.</p>`
        : ''
    }
    ${readChecks(root, spec.id)}
    <details><summary>prompt</summary><pre>${escapeHtml(spec.subject)}</pre></details>
  </article>`;
}

// ---------------------------------------------------------------------------
// Page
// ---------------------------------------------------------------------------

export async function buildContactSheet(root: string, specs: AssetSpec[]): Promise<string> {
  const sheet = new Sheet(root);
  const bands: string[] = [];
  for (const act of ACT_IDS) bands.push(await actBand(sheet, act));
  bands.push(await iconBand(sheet));
  const cards: string[] = [];
  for (const spec of specs) cards.push(await card(sheet, spec));

  const swatches = FULL_PALETTE.map(
    (c) => `<div class="swatch"><span style="background:${c.hex}"></span><code>${c.name}</code></div>`,
  ).join('');
  const onDisk = (dir: string) =>
    existsSync(dir) && statSync(dir).isDirectory() ? readdirSync(dir).filter((f) => f.endsWith('.png')).length : 0;
  const total = ACT_IDS.reduce((n, act) => n + onDisk(resolve(root, `assets/sprites/${act}`)), 0);

  return `<!doctype html>
<html lang="en"><head><meta charset="utf-8">
<meta name="viewport" content="width=device-width,initial-scale=1">
<title>Sprites as seen</title>
<style>
  :root { color-scheme: light dark; --fg:#1a1a1a; --dim:#5f5f5f; --bd:#d8d4cc; --bg:#faf8f3; --card:#fff;
          --paper:${PAPER.hex}; }
  @media (prefers-color-scheme: dark) { :root { --fg:#e9e5db; --dim:#9a958a; --bd:#33312c; --bg:#131210; --card:#1b1a17; } }
  * { box-sizing: border-box; }
  body { margin:0; padding:2rem 16px 5rem; background:var(--bg); color:var(--fg);
         font:15px/1.55 ui-sans-serif,system-ui,-apple-system,"Segoe UI",sans-serif; }
  .wrap { max-width: 1400px; margin: 0 auto; }
  h1 { font-size:1.6rem; margin:0 0 .35rem; letter-spacing:-.01em; }
  .lede { color:var(--dim); margin:0 0 .4rem; max-width:70ch; }
  .ask { border:1px solid var(--bd); border-radius:8px; padding:1rem 1.15rem; margin:1.4rem 0; background:var(--card); max-width:78ch; }
  .ask h2 { margin:0 0 .4rem; font-size:.95rem; }
  .ask ol { margin:.4rem 0 0; padding-left:1.15rem; } .ask li { margin:.3rem 0; }

  /* Sprites: one data URI per file, painted as a background so the crowd
     costs nothing. Pixelated everywhere — nothing on this page is smoothed. */
  .spr { display:block; flex:none; background-size:100% 100%; background-repeat:no-repeat;
         image-rendering:pixelated; }
  .spr.true { max-width:100%; height:auto; }

  /* An act band is the act's background; everything on it is seen on it. */
  .band { border-radius:10px; padding:1.1rem 1.2rem 1.3rem; margin:1.4rem 0; color:var(--paper); }
  .band header h2 { margin:0; font-size:1.15rem; letter-spacing:.01em; }
  .band header p { margin:.1rem 0 1rem; font-size:.8rem; opacity:.75; }
  .band code { font-size:.95em; }
  .tiles { display:flex; flex-wrap:wrap; gap:1.6rem 2.4rem; align-items:flex-end; }
  .tile { margin:0; min-width:0; max-width:100%; }
  .views { display:flex; flex-wrap:wrap; gap:1rem 1.4rem; align-items:flex-end; }
  .view { display:flex; flex-direction:column; align-items:center; justify-content:flex-end; gap:.35rem; min-width:0; max-width:100%; }
  .lbl { font-size:.62rem; text-transform:uppercase; letter-spacing:.08em; opacity:.55; white-space:nowrap; }
  .horde { position:relative; flex:none; }
  .horde .spr { position:absolute; }
  .tile figcaption { margin-top:.55rem; font-size:.74rem; line-height:1.5; }
  .tile figcaption b { font-size:.85rem; }
  .role, .px { opacity:.7; }
  .src { display:inline-block; font-size:.62rem; text-transform:uppercase; letter-spacing:.07em;
         border:1px solid color-mix(in srgb, var(--paper) 45%, transparent); border-radius:99px; padding:0 .45rem; }
  .src-stand-in { border-style:dashed; }
  .tile code { font-size:.7rem; opacity:.8; word-break:break-all; }
  .missing { margin:1.1rem 0 0; font-size:.74rem; opacity:.7; }
  .set { align-items:flex-start; margin-top:1.4rem; }
  .set-row { display:flex; flex-wrap:wrap; gap:14px; }

  h2.section { font-size:1.15rem; margin:3rem 0 .3rem; }
  .grid { display:grid; gap:1.5rem; grid-template-columns:1fr; margin-top:1rem; }
  @media (min-width:900px) { .grid { grid-template-columns:1fr 1fr; } }
  .card { border:1px solid var(--bd); border-radius:10px; padding:1rem; background:var(--card); min-width:0; }
  .card.real-test { border-color:#c9803a; box-shadow:0 0 0 1px #c9803a33; }
  .card.missing { opacity:.85; border-style:dashed; }
  .card h3 { font-size:1.05rem; margin:0 0 .2rem; display:flex; align-items:center; gap:.5rem; flex-wrap:wrap; }
  .badge { font-size:.68rem; text-transform:uppercase; letter-spacing:.06em; background:#c9803a; color:#fff;
           padding:.12rem .45rem; border-radius:99px; }
  .meta { color:var(--dim); font-size:.82rem; margin:0 0 .8rem; }
  .stages { display:grid; grid-template-columns:repeat(auto-fit,minmax(140px,1fr)); gap:.6rem; }
  .stage { margin:0; border:1px solid var(--bd); border-radius:7px; overflow:hidden; text-align:center;
           display:flex; flex-direction:column; }
  .stage img { max-width:100%; height:auto; display:block; margin:auto; padding:.5rem; image-rendering:pixelated; }
  .stage .spr { margin:auto; padding:0; max-width:calc(100% - 1rem); margin-block:.5rem; }
  .stage figcaption { font-size:.7rem; color:var(--dim); padding:.35rem; background:var(--card); border-top:1px solid var(--bd); }
  .why { font-size:.85rem; color:var(--dim); margin:.9rem 0 .3rem; }
  .checks { width:100%; border-collapse:collapse; font-size:.74rem; margin-top:.7rem; }
  .checks td { padding:.2rem .35rem; border-top:1px solid var(--bd); }
  .checks td:nth-child(2) { text-align:center; width:1.6rem; }
  .checks td:nth-child(3) { text-align:right; font-variant-numeric:tabular-nums; width:4.5rem; }
  .checks td:nth-child(4) { color:var(--dim); }
  tr.bad td { color:#c0392b; } tr.ok td:nth-child(2) { color:#2f8f4e; }
  details { margin-top:.7rem; font-size:.8rem; } summary { cursor:pointer; color:var(--dim); }
  pre { white-space:pre-wrap; font-size:.72rem; background:var(--bg); padding:.6rem; border-radius:6px;
        border:1px solid var(--bd); overflow-x:auto; }
  .palette { display:flex; flex-wrap:wrap; gap:.5rem; margin-top:.8rem; }
  .swatch { display:flex; flex-direction:column; align-items:center; gap:.2rem; width:74px; }
  .swatch span { width:100%; height:30px; border-radius:5px; border:1px solid var(--bd); }
  .swatch code { font-size:.6rem; color:var(--dim); text-align:center; word-break:break-all; }
  footer { margin-top:3rem; color:var(--dim); font-size:.8rem; border-top:1px solid var(--bd); padding-top:1rem; }
${sheet.styles.css()}
</style></head><body><div class="wrap">

<h1>Sprites as seen</h1>
<p class="lede">Every sprite on disk (${total}), on the colour it will be seen against: its act's
background, or the ink of an offer card for icons. Each is shown at its true pixel size, at
${GAMEPLAY_PX}px — the size law 7 judges it at — and as a crowd of fifteen at ${GAMEPLAY_PX}px.
Nothing is smoothed.</p>

<div class="ask">
  <h2>Scroll each band once, before reading the captions</h2>
  <ol>
    <li>Which sprite did you have to look at twice to know what it was at ${GAMEPLAY_PX}px?</li>
    <li>Which crowd could you not pick one out of?</li>
    <li>Does anything look like it came from a different game from its neighbours?</li>
    <li>Drawn against generated: which would you rather the rest of the game looked like?</li>
  </ol>
</div>

${bands.filter(Boolean).join('\n')}

<h2 class="section">Generation provenance</h2>
<p class="lede" style="font-size:.85rem">One card per generation spec: the raw generation when it
is on disk, the conformed sprite, the mechanical checks recorded beside its prompt, and the prompt.
A drawn sprite's provenance is its SVG (<code>assets/svg/&lt;act&gt;/&lt;id&gt;.svg</code>).</p>
<div class="grid">
${cards.join('\n')}
</div>

<h2 class="section">The locked palette</h2>
<p class="lede" style="font-size:.85rem">Twenty colours, act tints included. Every asset is
quantised to this; anything that quantises badly is remade, never hand-corrected.</p>
<div class="palette">${swatches}</div>

<footer>
Built by <code>pnpm art:sheet</code> from <code>assets/sprites/</code>, keyed by the registries the
packer uses. Every prompt is committed in <code>assets/prompts/</code> and every drawing in
<code>assets/svg/</code> (D-010).
</footer>
</div></body></html>
`;
}
