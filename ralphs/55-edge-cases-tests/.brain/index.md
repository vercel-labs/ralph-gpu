# Ralph GPU Knowledge Base

## Overview
This project is Ralph GPU, a WebGPU-based graphics library.

## Browser Tests
Browser tests are located in `packages/core/tests/browser/`.
They use Playwright and are executed with `pnpm test:browser`.
Test utilities are available via `window.RalphTestUtils`.

### Edge Cases Tests
The `edge-cases.browser.test.ts` file covers:
- Zero vertex count draws
- Empty passes
- Multiple context initialization
- Context disposal and re-initialization
- Rapid create/dispose stress testing
