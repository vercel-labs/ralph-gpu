# Ralph GPU Development

## Browser Tests
- Located in `packages/core/tests/browser/`
- Use Playwright for running tests in the browser
- `test-utils.ts` provides helpers like `setupTest`, `waitForFrame`, and `teardown`.
- `index.html` is the entry point for tests, loading `test-bundle.js` which is built from `index.ts`.

## Patterns
- Tests use `page.evaluate` to run code inside the browser context.
- Always call `teardown()` at the end of a test to clean up resources.
- Resize behavior can be tested by checking `width` and `height` properties on `context` and `target` after calling their `resize()` methods.
