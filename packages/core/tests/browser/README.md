# Browser Test Harness

This directory contains a minimal HTML page and a script to build a browser-compatible bundle of RalphGPU for testing in real browsers (e.g., via Playwright).

## Structure

- `index.html`: The entry point for browser tests. Includes a `<canvas id="gpu-canvas">`.
- `index.ts`: The entry point for the test bundle. Exposes `RalphGPU` to `window`.
- `webpack.config.js`: Configuration to build the test bundle.

## Building the bundle

To build the test bundle, run the following command from this directory:

```bash
npx webpack
```

Or from the `packages/core` directory:

```bash
pnpm --filter ralph-gpu exec webpack --config tests/browser/webpack.config.js
```

The bundle will be generated at `dist/test-bundle.js`.
