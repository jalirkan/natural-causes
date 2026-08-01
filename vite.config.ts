import { defineConfig } from 'vite';
import { snapshotPlugin } from './tools/dev/snapshot-plugin';

export default defineConfig({
  plugins: [snapshotPlugin()],
  // Relative base so the built game runs from a subpath (GitHub Pages, an
  // itch.io zip) without a rebuild. D-003 is "playable from a link"; a config
  // that only works at a domain root quietly breaks that.
  base: './',
  server: {
    port: 5173,
    host: '127.0.0.1',
  },
  build: {
    target: 'es2022',
    outDir: 'dist',
    sourcemap: true,
  },
});
