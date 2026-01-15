# Decision 001: Use Webpack for bundling the test harness

## Context
We need a way to expose the `ralph-gpu` source code to a browser environment for Playwright tests.

## Decision
We use Webpack with `swc-loader` to bundle the TypeScript source code into a single JavaScript file (`test-bundle.js`).

## Consequences
- Allows us to use the same bundling logic (SWC) as the main project.
- Provides a simple, static file that Playwright can easily load.
- Requires a manual or automated build step before running browser tests.
