# Ralph GPU - WebGPU Testing Setup

This repository uses Playwright for browser-based testing of WebGPU functionality.

## Configuration

The Playwright configuration is located in `packages/core/playwright.config.ts`.

### WebGPU Support

To enable WebGPU in Playwright tests, Chromium is launched with the following flags:
- `--enable-unsafe-webgpu`
- `--enable-features=Vulkan`

These flags are essential for WebGPU to function in the automated browser environment.

### Running Tests

- `pnpm -C packages/core test:browser`: Runs the browser tests.
- `pnpm -C packages/core test:browser --headed`: Runs the tests in headed mode, which is useful for debugging.

Tests should follow the `*.spec.ts` naming convention to distinguish them from unit tests (which use Vitest).
