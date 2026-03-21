import { defineConfig, configDefaults } from 'vitest/config';

export default defineConfig({
  test: {
    globals: true,
    environment: 'jsdom',
    environmentMatchGlobs: [
      ['tests/node/**', 'node'],
    ],
    // Node GPU tests (Dawn/OpenGL) must run in forked processes — not worker threads.
    // Dawn's OpenGL backend creates internal threads that conflict with Node.js
    // Worker threads, causing deadlocks. Forked processes (child_process.fork) work fine.
    poolMatchGlobs: [
      ['tests/node/**', 'forks'],
    ],
    coverage: {
      provider: 'v8',
      reporter: ['text', 'json', 'html'],
    },
    exclude: [...configDefaults.exclude, '**/*.browser.test.ts'],
  },
});
