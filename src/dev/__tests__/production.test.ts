import { readFileSync, readdirSync, statSync } from 'node:fs';
import { dirname, join, relative, resolve, sep } from 'node:path';
import { describe, expect, it } from 'vitest';

/**
 * The dev panel is in no page that did not ask for it (D-030, CLAUDE.md: dev
 * cheats never live in `World`; the panel reaches the Pages build only behind
 * `?review`, a lazily loaded chunk mounted only with the flag).
 *
 * How it stays out: the game imports `dev/state` (plain data and a neutral
 * default, no cheat in it) and `dev/review` (the flag, the badge's words, the
 * rule that a life begun past the title's first act is tainted) statically,
 * and `dev/panel` only by a dynamic `import()` inside `if (reviewMode()) {`.
 * A dynamic import is a split point: Rollup emits the panel and everything
 * only it imports (`dev/boss-cheats`, `dev/review-cheats`) as a chunk of
 * their own, fetched only when that branch runs, which without the flag it
 * never does. This reads the import graph that makes that true; the build is
 * checked by grepping `dist/assets/*.js` for a panel label (`miss window`)
 * and finding it in one chunk that is not the entry (the commit that changed
 * this says so, with the output).
 */

const SRC = resolve(process.cwd(), 'src');
const DEV = join(SRC, 'dev');

function sources(dir: string): string[] {
  return readdirSync(dir).flatMap((name) => {
    const path = join(dir, name);
    if (statSync(path).isDirectory()) return name === '__tests__' ? [] : sources(path);
    return /\.ts$/.test(name) ? [path] : [];
  });
}

/** Forward slashes, so the paths below read the same on the Windows desktop. */
const posix = (path: string): string => path.split(sep).join('/');

interface Import {
  file: string;
  line: number;
  target: string;
  dynamic: boolean;
}

/**
 * Every value import or re-export of a module under src/dev, one line or
 * several (`import type` and `export type` are erased and ship nothing).
 */
function devImports(): Import[] {
  const out: Import[] = [];
  const patterns: [RegExp, boolean][] = [
    [/^[ \t]*(?:import|export)\s+(?!type\b)[^;'"]*?\bfrom\s*'([^']+)'/gm, false],
    [/^[ \t]*import\s*'([^']+)'/gm, false],
    [/\bimport\(\s*'([^']+)'\s*\)/g, true],
  ];
  for (const file of sources(SRC)) {
    const text = readFileSync(file, 'utf8');
    for (const [pattern, dynamic] of patterns) {
      for (const m of text.matchAll(pattern)) {
        const spec = m[1]!;
        if (!spec.startsWith('.')) continue;
        const path = resolve(dirname(file), spec);
        if (!path.startsWith(DEV + sep)) continue;
        // The line of the specifier, not of the statement's first word.
        const line = text.slice(0, m.index! + m[0].length).split('\n').length - 1;
        out.push({ file: posix(relative(SRC, file)), line, target: posix(relative(SRC, path)), dynamic });
      }
    }
  }
  return out;
}

/** What the game may import statically: no cheat, nothing of the panel's. */
const STATIC_OK = ['dev/state', 'dev/review'];

describe('the dev panel is in no page without the flag', () => {
  const all = devImports();
  const fromGame = all.filter((i) => !i.file.startsWith('dev/'));

  it('the game imports only dev/state and dev/review statically', () => {
    const statics = fromGame.filter((i) => !i.dynamic);
    expect(statics.map((i) => i.target)).toEqual(expect.arrayContaining(STATIC_OK));
    for (const i of statics) expect(STATIC_OK, `${i.file} imports ${i.target}`).toContain(i.target);
  });

  it('the panel is reached only by a dynamic import behind reviewMode()', () => {
    const dynamic = fromGame.filter((i) => i.dynamic);
    expect(dynamic.length).toBeGreaterThan(0);
    for (const i of dynamic) {
      expect(i.target, i.file).toBe('dev/panel');
      // The block it sits in: the nearest line above indented less than it.
      const lines = readFileSync(join(SRC, i.file), 'utf8').split('\n');
      const indent = (s: string) => s.length - s.trimStart().length;
      let open = i.line - 1;
      while (open >= 0 && (!lines[open]!.trim() || indent(lines[open]!) >= indent(lines[i.line]!))) open--;
      expect(lines[open] ?? '', `${i.file}:${i.line + 1}`).toMatch(/^\s*if \(reviewMode\(\)\) \{$/);
    }
  });

  it('reviewMode() is the flag: a dev build, or ?review in the URL, and nothing else', () => {
    const text = readFileSync(join(DEV, 'review.ts'), 'utf8');
    const body = /export function reviewMode\(\): boolean \{([\s\S]*?)\n\}/.exec(text)?.[1] ?? '';
    expect(body.replace(/\s+/g, ' ').trim()).toBe(
      "memo ??= import.meta.env.DEV || (typeof location !== 'undefined' && new URLSearchParams(location.search).has('review')); return memo;",
    );
  });

  it('what the game imports statically imports nothing under src/dev', () => {
    const fromStatic = all.filter((i) => i.file === 'dev/state.ts' || i.file === 'dev/review.ts');
    expect(fromStatic).toEqual([]);
  });

  it('the boss row’s and the review row’s cheats are imported inside the panel’s chunk alone', () => {
    const importers = (target: string) =>
      all
        .filter((i) => i.target === target)
        .map((i) => i.file)
        .sort();
    expect(importers('dev/review-cheats')).toEqual(['dev/panel.ts']);
    expect(importers('dev/boss-cheats')).toEqual(['dev/panel.ts', 'dev/review-cheats.ts']);
    // Statically, so they ride the panel's chunk rather than splitting again.
    for (const i of all.filter((x) => x.target === 'dev/review-cheats' || x.target === 'dev/boss-cheats'))
      expect(i.dynamic, `${i.file} -> ${i.target}`).toBe(false);
  });
});
