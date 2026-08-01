import { mkdirSync, writeFileSync } from 'node:fs';
import { dirname, resolve } from 'node:path';
import type { Plugin } from 'vite';

/**
 * Dev-only endpoint that writes a canvas frame to disk.
 *
 * `POST /__snapshot?name=foo` with a base64 PNG body writes
 * `tools/dev/snapshots/foo.png`. It exists so a frame of the running game can
 * be captured and looked at without a human being present to take a
 * screenshot — the browser is often headless during an unattended run, and
 * "it renders" is not a claim worth making from console output alone.
 *
 * Dev server only. It is never part of a production build, and the dev server
 * binds to 127.0.0.1 (see vite.config.ts), so this is not reachable off-box.
 */
export function snapshotPlugin(outDir = 'tools/dev/snapshots'): Plugin {
  return {
    name: 'natural-causes:snapshot',
    apply: 'serve',
    configureServer(server) {
      server.middlewares.use('/__snapshot', (req, res) => {
        if (req.method !== 'POST') {
          res.statusCode = 405;
          res.end('POST only');
          return;
        }

        const name = new URL(req.url ?? '', 'http://localhost').searchParams.get('name') ?? 'frame';
        // Refuse anything that could climb out of the snapshot directory.
        if (!/^[\w-]{1,64}$/.test(name)) {
          res.statusCode = 400;
          res.end('bad name');
          return;
        }

        const chunks: Buffer[] = [];
        req.on('data', (c: Buffer) => chunks.push(c));
        req.on('end', () => {
          try {
            const png = Buffer.from(Buffer.concat(chunks).toString('utf8'), 'base64');
            const file = resolve(process.cwd(), outDir, `${name}.png`);
            mkdirSync(dirname(file), { recursive: true });
            writeFileSync(file, png);
            res.statusCode = 200;
            res.end(JSON.stringify({ file, bytes: png.byteLength }));
          } catch (err) {
            res.statusCode = 500;
            res.end(String(err));
          }
        });
      });
    },
  };
}
