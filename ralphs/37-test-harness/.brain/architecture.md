# Architecture: Browser Test Harness

The browser test harness is designed to allow Playwright to run WebGPU tests by loading a real browser environment.

## Components

- **index.html**: A minimal HTML page with a `<canvas id="gpu-canvas">`. It acts as the container for tests.
- **index.ts**: The entry point for the browser bundle. It imports the `ralph-gpu` source and attaches it to the global `window` object as `RalphGPU`.
- **webpack.config.js**: A dedicated webpack configuration to bundle the test entry point and its dependencies into a single file (`test-bundle.js`) that can be loaded by the HTML page.
- **dist/**: Contains the generated `test-bundle.js`.

## Usage in Playwright

Playwright tests can navigate to `index.html`, which will load the `RalphGPU` library. Tests can then use `page.evaluate()` to interact with the library and verify WebGPU functionality.
