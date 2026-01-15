# Ralph GPU Events & Profiler Tests

The events and profiler system in Ralph GPU allows for debugging and profiling by emitting events for various operations.

## Events
- 'draw': Emitted during draw operations.
- 'compute': Emitted during compute operations.
- 'frame': Emitted during frame begin and end.
- 'target': Emitted when changing render targets or clearing them.

## Configuration
Events are enabled via the context options:
```typescript
const context = await gpu.init(canvas, {
  events: {
    enabled: true,
    types: ['draw', 'compute', 'frame', 'target'],
    historySize: 100 // optional
  }
});
```

## Testing
Browser tests are located in `packages/core/tests/browser/events-profiler.browser.test.ts`.
They use Playwright to evaluate code in the browser.
The `setupTest` utility from `test-utils.ts` simplifies context creation and cleanup.
