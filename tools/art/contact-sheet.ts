import { existsSync, readFileSync, readdirSync } from 'node:fs';
import { resolve } from 'node:path';
import sharp from 'sharp';
import { actBackground, actPalette, FULL_PALETTE } from './palette';
import type { AssetSpec } from './types';

/**
 * The review page.
 *
 * Its only job is to let Justin answer the question ART-DIRECTION.md actually
 * asks — "is this funny, and would I play a game that looked like this for
 * twenty minutes" — which means showing each asset at gameplay size on its own
 * act background and in a crowd, not at the resolution it was generated in.
 *
 * Self-contained: every image is inlined as a data URI so the file can be
 * opened from disk or published without carrying a directory with it.
 */

function dataUri(file: string): string | null {
  if (!existsSync(file)) return null;
  return `data:image/png;base64,${readFileSync(file).toString('base64')}`;
}

function escapeHtml(s: string): string {
  return s
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;');
}

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

async function card(root: string, spec: AssetSpec): Promise<string> {
  const sprite = dataUri(resolve(root, `assets/sprites/${spec.act}/${spec.id}.png`));
  const raw = await findRaw(root, spec.id);
  const bg = actBackground(spec.act).hex;
  const isReal = /REAL TEST/.test(spec.tests ?? '');

  if (!sprite) {
    return `<article class="card missing">
      <header><h2>${escapeHtml(spec.name)}</h2>
      <p class="meta">${spec.act} · ${spec.role} · <strong>did not pass the checks</strong></p></header>
      ${raw ? `<div class="stage"><img src="${raw}" alt="last raw generation"><figcaption>last raw generation — rejected</figcaption></div>` : ''}
      ${readChecks(root, spec.id)}
    </article>`;
  }

  // A crowd, because law 7 is about gameplay size and law 6 is about reading
  // one enemy out of forty. A sprite that looks good alone and mushes in a
  // crowd has failed, and only this view shows it.
  const crowdCount = spec.role === 'boss' ? 3 : 24;
  const crowd = Array.from({ length: crowdCount }, () => `<img src="${sprite}" alt="">`).join('');

  return `<article class="card${isReal ? ' real-test' : ''}">
    <header>
      <h2>${escapeHtml(spec.name)}${isReal ? '<span class="badge">real test</span>' : ''}</h2>
      <p class="meta">${spec.act} · ${spec.role} · ${spec.targetSize}px${
        spec.tests ? ` · tests: ${escapeHtml(spec.tests.replace(' — THE REAL TEST', ''))}` : ''
      }</p>
    </header>

    <div class="stages">
      ${raw ? `<figure class="stage"><img src="${raw}" alt="raw generation"><figcaption>1 · raw</figcaption></figure>` : ''}
      <figure class="stage" style="background:${bg}">
        <img src="${sprite}" alt="conformed sprite">
        <figcaption>2 · conformed, on act background</figcaption>
      </figure>
      <figure class="stage gameplay" style="background:${bg}">
        <img src="${sprite}" alt="at gameplay size" style="width:48px;height:48px">
        <figcaption>3 · 48px — actual gameplay size</figcaption>
      </figure>
    </div>

    <figure class="crowd" style="background:${bg}">
      <div class="crowd-inner">${crowd}</div>
      <figcaption>4 · ${crowdCount} at 48px — can you pick one out</figcaption>
    </figure>

    ${spec.whyThisStage ? `<p class="why"><strong>Why this life stage.</strong> ${escapeHtml(spec.whyThisStage)}</p>` : ''}
    ${readChecks(root, spec.id)}
    <details><summary>prompt</summary><pre>${escapeHtml(spec.subject)}</pre></details>
  </article>`;
}

export async function buildContactSheet(root: string, specs: AssetSpec[]): Promise<string> {
  const cards = (await Promise.all(specs.map((s) => card(root, s)))).join('\n');
  const swatches = FULL_PALETTE.map(
    (c) =>
      `<div class="swatch"><span style="background:${c.hex}"></span><code>${c.name}</code></div>`,
  ).join('');
  const passed = specs.filter((s) =>
    existsSync(resolve(root, `assets/sprites/${s.act}/${s.id}.png`)),
  ).length;

  return `<!doctype html>
<html lang="en"><head><meta charset="utf-8">
<meta name="viewport" content="width=device-width,initial-scale=1">
<title>Natural Causes — art test batch</title>
<style>
  :root { color-scheme: light dark; --fg:#1a1a1a; --dim:#5f5f5f; --bd:#d8d4cc; --bg:#faf8f3; --card:#fff; }
  @media (prefers-color-scheme: dark) { :root { --fg:#e9e5db; --dim:#9a958a; --bd:#33312c; --bg:#131210; --card:#1b1a17; } }
  * { box-sizing: border-box; }
  body { margin:0; padding:2rem 1.25rem 5rem; background:var(--bg); color:var(--fg);
         font:15px/1.55 ui-sans-serif,system-ui,-apple-system,"Segoe UI",sans-serif; }
  .wrap { max-width: 1180px; margin: 0 auto; }
  h1 { font-size:1.6rem; margin:0 0 .35rem; letter-spacing:-.01em; }
  .lede { color:var(--dim); margin:0 0 .4rem; max-width:64ch; }
  .draft { border-left:3px solid #d08a2c; padding:.7rem .9rem; background:color-mix(in oklab,#d08a2c 9%,transparent);
           margin:1.4rem 0; border-radius:0 6px 6px 0; }
  .ask { border:1px solid var(--bd); border-radius:8px; padding:1rem 1.15rem; margin:1.4rem 0; background:var(--card); }
  .ask h3 { margin:0 0 .5rem; font-size:.95rem; }
  .ask ol { margin:.4rem 0 0; padding-left:1.15rem; } .ask li { margin:.3rem 0; }
  .grid { display:grid; gap:1.5rem; grid-template-columns:1fr; margin-top:1.5rem; }
  @media (min-width:900px) { .grid { grid-template-columns:1fr 1fr; } }
  .card { border:1px solid var(--bd); border-radius:10px; padding:1rem; background:var(--card); }
  .card.real-test { border-color:#c9803a; box-shadow:0 0 0 1px #c9803a33; }
  .card.missing { opacity:.85; border-style:dashed; }
  .card h2 { font-size:1.05rem; margin:0 0 .2rem; display:flex; align-items:center; gap:.5rem; flex-wrap:wrap; }
  .badge { font-size:.68rem; text-transform:uppercase; letter-spacing:.06em; background:#c9803a; color:#fff;
           padding:.12rem .45rem; border-radius:99px; }
  .meta { color:var(--dim); font-size:.82rem; margin:0 0 .8rem; }
  .stages { display:grid; grid-template-columns:repeat(auto-fit,minmax(140px,1fr)); gap:.6rem; }
  .stage { margin:0; border:1px solid var(--bd); border-radius:7px; overflow:hidden; text-align:center;
           display:flex; flex-direction:column; }
  .stage img { max-width:100%; height:auto; display:block; margin:auto; padding:.5rem;
               image-rendering:pixelated; }
  .stage.gameplay img { padding:0; margin:2.2rem auto; }
  figcaption { font-size:.7rem; color:var(--dim); padding:.35rem; background:var(--card); border-top:1px solid var(--bd); }
  .crowd { margin:.6rem 0 0; border:1px solid var(--bd); border-radius:7px; overflow:hidden; }
  .crowd-inner { display:flex; flex-wrap:wrap; gap:6px; padding:.7rem; justify-content:center; align-items:center; }
  .crowd img { width:48px; height:48px; image-rendering:pixelated; }
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
</style></head><body><div class="wrap">

<h1>Natural Causes — art test batch</h1>
<p class="lede">Six assets, three life stages, one style. ${passed}/${specs.length} passed the
mechanical checks. Generated with Flux via fal, then cut, quantised to the locked palette,
outlined, grained and checked in code — consistency is enforced downstream, never in the prompt.</p>

<div class="draft">
  <strong>ART-DIRECTION.md is a DRAFT.</strong> It does not become binding until you have judged
  this batch. Nothing has been built against this style — no enemies, no acts, no systems.
</div>

<div class="ask">
  <h3>The question is not "is this good art"</h3>
  <p style="margin:.2rem 0 0">It is: <strong>is this funny, and would you keep playing a game that
  looked like this for twenty minutes?</strong></p>
  <ol>
    <li><strong>Substitute teacher</strong> — is a deadpan human face in this style funny, or is it
    just a drawing of a person? If it is the second, School, Family and Decline all need a different
    approach to human enemies, and it is far cheaper to learn that now.</li>
    <li><strong>The Reorg</strong> — does an abstraction read as a <em>monster</em>, or as an
    illustration of a concept? A boss that reads as a diagram with a face and not as a threat is the
    failure mode.</li>
  </ol>
</div>

<div class="grid">
${cards}
</div>

<h3 style="margin-top:2.5rem">The locked palette</h3>
<p class="lede" style="font-size:.85rem">Twenty colours, act tints included. Every asset is
quantised to this after generation; anything that quantises badly is regenerated, never
hand-corrected. Provisional — part of the hypothesis, not a settled decision.</p>
<div class="palette">${swatches}</div>

<footer>
Row 1 is the raw generation, row 2 the conformed sprite on its act background, row 3 the same sprite
at 48px — the only size that matters in play — and row 4 a crowd of them, because an enemy that
reads alone and mushes in a horde has still failed.
Every prompt is committed in <code>assets/prompts/</code> (D-010).
</footer>
</div></body></html>
`;
}

export { actPalette };
