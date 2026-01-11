# Decision 006: Structured Logging System

## Status

Implemented

## Context

Debugging agent behavior requires visibility into:

1. Which tools are being called and with what arguments
2. Success/failure of tool executions
3. Iteration progress and costs
4. Model reasoning (think tool)

## Decision

Implement a structured logging system with:

- Tool call logging (`toolLogger`)
- Loop/iteration logging (`loopLogger`)
- Debug mode for verbose output
- Automatic tool wrapping for logging

## Implementation

### Log Levels

```typescript
type LogLevel = "debug" | "info" | "warn" | "error" | "silent";
```

### Tool Logger

Logs tool calls, successes, and errors:

```
🔧 [19:28:26] bash
   ▸ command: ls -la
   ✓ exit 0, 10 lines (28ms)
```

### Special handling for `think` tool

Shows actual thought content:

```
💭 [19:28:26] think
   │ I need to analyze the existing example...
   │ The key components are:
   │ ... (7 lines total)
   ✓ I need to analyze the existing example... (1ms)
```

### Loop Logger

Logs iteration boundaries and stats:

```
┌─ Iteration 0 ────────────────────────────────────────
  ... tool calls ...
└─ Iteration 0 completed: 18 tools, 40,745 tokens, $0.1226 (43.8s)
```

### Debug Mode

Enable with `debug: true` in config or `DEBUG=true` env var:

```typescript
const agent = new LoopAgent({
  task: "...",
  debug: true, // Enables verbose logging
});
```

### Tool Wrapping

All tools are automatically wrapped with logging via `wrapToolWithLogging()`.

## Consequences

- ✅ Clear visibility into agent behavior
- ✅ Debugging stuck/failing agents is much easier
- ✅ Cost tracking per iteration
- ✅ Think tool thoughts are visible
