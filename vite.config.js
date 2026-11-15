import { defineConfig } from 'vite';

export default defineConfig({
  // Relative asset paths so the build works on GitHub Pages (/xo-tipjar/),
  // jsDelivr, or any static host without config changes.
  base: './',
  resolve: {
    // @electrum-cash/application imports node:path and calls path.resolve()
    // at runtime; @xo-cash/state imports { join } from 'path'. Browsers have
    // neither, and Vite externalises them into a stub without resolve/join,
    // which crashes Engine.create() before it even tries Electrum. A real
    // path implementation fixes it.
    alias: {
      path: 'path-browserify',
      'node:path': 'path-browserify',
    },
  },
  define: {
    // Same story for Node globals the XO/electrum deps assume:
    // - bare `global` (state + electrum-cache call setGlobalVars(global, …))
    // - process.cwd() (path-browserify's resolve() falls back to it)
    // - process.env (debug + misc libs)
    // In a browser these map to globalThis / '/' / {}.
    global: 'globalThis',
    'process.cwd': '(() => "/")',
    'process.env': '{}',
  },
  build: {
    outDir: 'docs',
    emptyOutDir: true,
    target: 'es2022',
  },
});
