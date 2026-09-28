import { readFileSync, readdirSync, statSync } from 'node:fs';
import { dirname, join, relative, resolve, sep } from 'node:path';
import { describe, expect, it } from 'vitest';

/**
 * None of the dev panel ships (CLAUDE.md: dev cheats never live in `World`,
 * and none of it ships in production builds, the Pages build included).
 *
 * How it stays out: the game imports `dev/state` statically (plain data and
 * a neutral default, no cheat in it) and `dev/panel` only by a dynamic
 * `import()` inside `if (import.meta.env.DEV)`, which Vite folds to `false`
 * in a production build, so Rollup drops the branch, the chunk and
 * everything only the panel imports (`dev/boss-cheats`). This reads the
 * import graph that makes that true; the build itself is checked by
 * grepping `dist/` for the panel's labels (the commit that added this says
 * which).
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

describe('the dev panel is out of the production bundle', () => {
  const all = devImports();
  const fromGame = all.filter((i) => !i.file.startsWith('dev/'));

  it('the game imports only dev/state statically', () => {
    expect(fromGame.filter((i) => !i.dynamic).map((i) => i.target)).toEqual(
      expect.arrayContaining(['dev/state']),
    );
    for (const i of fromGame.filter((x) => !x.dynamic)) expect(i.target, i.file).toBe('dev/state');
  });

  it('the panel is reached only by a dynamic import behind import.meta.env.DEV', () => {
    const dynamic = fromGame.filter((i) => i.dynamic);
    expect(dynamic.length).toBeGreaterThan(0);
    for (const i of dynamic) {
      expect(i.target, i.file).toBe('dev/panel');
      // The block it sits in: the nearest line above indented less than it.
      const lines = readFileSync(join(SRC, i.file), 'utf8').split('\n');
      const indent = (s: string) => s.length - s.trimStart().length;
      let open = i.line - 1;
      while (open >= 0 && (!lines[open]!.trim() || indent(lines[open]!) >= indent(lines[i.line]!))) open--;
      expect(lines[open] ?? '', `${i.file}:${i.line + 1}`).toMatch(/^\s*if \(import\.meta\.env\.DEV\) \{$/);
    }
  });

  it('what the game imports statically imports nothing of the panel’s', () => {
    const fromState = all.filter((i) => i.file === 'dev/state.ts');
    expect(fromState).toEqual([]);
  });

  it('the boss row’s cheats are imported by the panel alone', () => {
    const importers = all.filter((i) => i.target === 'dev/boss-cheats').map((i) => i.file);
    expect(importers).toEqual(['dev/panel.ts']);
  });
});
