# Ralph GPU Browser Test Harness

The browser test harness is located in `packages/core/tests/browser`.
It consists of:
- `index.html`: A minimal HTML page with a canvas element.
- `index.ts`: Entry point for the browser bundle, exposing `RalphGPU` to the global `window` object.
- `webpack.config.js`: Configuration for bundling the harness using Webpack and SWC.
- `dist/test-bundle.js`: The generated bundle.

To build the bundle:
```bash
cd packages/core/tests/browser
npx webpack
```

