# Testing

## Overview

The test suite uses **Vitest** and covers all core components with 182 tests across 8 test files.

## Running Tests

```bash
pnpm test        # Run all tests
pnpm test:watch  # Watch mode
```

## Test Files

```
tests/
├── types.test.ts      # Type definitions validation (26 tests)
├── stuck.test.ts      # StuckDetector algorithm (20 tests)
├── prompt.test.ts     # Prompt building functions (18 tests)
├── rules.test.ts      # Default rules exports (30 tests)
├── tools.test.ts      # Tool creation & execution (19 tests)
├── managers.test.ts   # ProcessManager lifecycle (27 tests)
├── agent.test.ts      # LoopAgent configuration (19 tests)
└── exports.test.ts    # Public API exports (24 tests)
```

## Coverage by Component

### types.test.ts

- All interface shapes (ContextFile, TokenUsage, ToolCall, Iteration, etc.)
- Union types (StuckReason, LoopEndReason, LoopStatus states)
- Config types (LimitsConfig, CompletionConfig, StuckDetectionConfig)
- Internal types (LoopState, ProcessInfo, BrowserInfo)

### stuck.test.ts

- **Repetitive detection**: Same tool calls repeated N times
- **Error loop detection**: Same error repeated across iterations
- **Oscillation detection**: A→B→A→B patterns
- **No progress detection**: High token usage without file changes
- Threshold configuration
- Priority of detection patterns

### prompt.test.ts

- `buildSystemPrompt()`: Task, rules, context (string + files), custom prompt
- `buildNudgeMessage()`: System nudge formatting
- `formatIterationContext()`: Iteration/cost display formatting

### rules.test.ts

- All 8 rules are non-empty strings with expected content:
  - `brainRule`: .brain/ structure guidance
  - `trackProgressRule`: .progress.md tracking
  - `visualCheckRule`: Browser verification
  - `testFirstRule`: Test-driven workflow
  - `minimalChangesRule`: Surgical changes
  - `explorationRule`: Explore before editing
  - `gitCheckpointRule`: Git commit checkpoints
  - `debugRule`: Debugging approach

### tools.test.ts

- **Utility tools**: `done` callback, `think` return value
- **Fallback bash tools**:
  - `bash`: Command execution, exit codes, output capture
  - `readFile`: File reading, error handling
  - `writeFile`: File writing, parent directory creation
- Tool interface compliance (description, execute function)

### managers.test.ts

- **ProcessManager**:
  - Start/stop lifecycle
  - Process replacement (same name)
  - Ready pattern detection
  - Output capture and limiting
  - `isRunning()` state tracking
  - `stopAll()` cleanup
- **BrowserManager**:
  - Interface validation
  - Method signatures (open, screenshot, click, type, scroll, navigate)
  - Empty state handling

### agent.test.ts

- Constructor with minimal/full config
- Context files and custom system prompt
- `getStatus()` initial state
- `getHistory()` empty history
- `stop()` and `nudge()` before run
- All completion types (tool, file, command, custom)
- Timeout formats (numeric, string)
- Callback types (onUpdate, onStuck, onComplete, onError)
- Custom tools configuration
- Stuck detection options

### exports.test.ts

- Main exports from `index.ts`
- Individual module exports
- Integration tests (instantiation, tool creation, prompt building)

## Skipped Tests

- **BrowserManager with Playwright** (1 test): Requires Playwright browser binaries to be installed. The interface tests still run.

## Configuration

`vitest.config.ts`:

```typescript
export default defineConfig({
  test: {
    globals: true,
    environment: "node",
    include: ["tests/**/*.test.ts"],
    pool: "forks",
    poolOptions: {
      forks: {
        singleFork: true,
      },
    },
  },
});
```

Uses `singleFork` to avoid tinypool cleanup issues in some environments.
