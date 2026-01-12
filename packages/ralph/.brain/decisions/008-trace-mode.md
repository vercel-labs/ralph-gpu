# Decision 008: Trace Mode for Execution Analysis

## Status

Implemented (v2 - NDJSON format)

## Context

When debugging agent behavior, the console output (debug mode) is useful for real-time monitoring but has limitations:

1. **Ephemeral** - Lost when terminal closes
2. **Hard to analyze** - Unstructured text output
3. **Missing context** - Doesn't capture full conversation history
4. **Can't be processed** - No structured format for automated analysis

We need a way to capture detailed execution data that can be:

- Saved permanently for later review
- Analyzed by another AI model
- Used to understand stuck loops and errors
- Shared for debugging

## Decision

Implement a **Trace Mode** using **NDJSON** (newline-delimited JSON) format.

### Why NDJSON over JSON?

1. **Append-only** - Each event is immediately appended, no need to rewrite entire file
2. **Crash-safe** - If agent crashes/interrupted, all events up to that point are saved
3. **Streamable** - Can `tail -f` to watch in real-time
4. **Memory efficient** - Don't need to hold all events in memory
5. **Easy to parse** - Each line is independent JSON

### Key Features

1. **Real-time writes** - Every event written immediately
2. **Comprehensive data capture**:
   - System prompt
   - All tool calls with arguments and results
   - Iteration statistics
   - Stuck detection events
   - Context summarization events
3. **Configurable verbosity** - Can include/exclude large data
4. **Environment variable support** - `RALPH_TRACE=true`

### Configuration

```typescript
// Simple - enable with defaults
const agent = new LoopAgent({
  task: "...",
  trace: true,
});

// With custom options
const agent = new LoopAgent({
  task: "...",
  trace: {
    outputPath: ".traces/trace.ndjson",
    includeToolResults: false, // Can be huge (screenshots)
  },
});
```

Or via environment:

```bash
RALPH_TRACE=true pnpm start
RALPH_TRACE_PATH=.traces/custom.ndjson pnpm start
```

### Trace File Format (NDJSON)

Each line is a JSON object with `ts` (timestamp), `type`, and event-specific fields:

```ndjson
{"ts":"2026-01-11T21:00:00.000Z","type":"agent_start","task":"Fix bug"}
{"ts":"2026-01-11T21:00:01.000Z","type":"iteration_start","iter":0}
{"ts":"2026-01-11T21:00:02.000Z","type":"tool_call","iter":0,"tool":"bash","args":{"command":"ls"}}
{"ts":"2026-01-11T21:00:02.500Z","type":"tool_result","iter":0,"tool":"bash","durationMs":100}
...
{"ts":"2026-01-11T21:05:00.000Z","type":"summary","totalIterations":5,"totalCost":0.15}
```

### Event Types

- `agent_start` - Agent initialization
- `iteration_start` / `iteration_end` - Iteration boundaries
- `tool_call` / `tool_result` / `tool_error` - Tool execution
- `model_response` - AI model responses
- `stuck_detected` - Stuck detection triggered
- `nudge_injected` - Guidance provided
- `context_summarized` - Context was compressed
- `agent_complete` / `agent_error` - Final state

### Data Sanitization

Large binary data (screenshots, base64) is automatically:

- Truncated or replaced with placeholders in trace
- Full data only included if `includeToolResults: true`

## Implementation

Files modified:

- `src/tracer.ts` - Tracer class (NDJSON append-only)
- `src/types.ts` - TraceConfig type
- `src/agent.ts` - Tracer initialization
- `src/loop.ts` - Event recording
- `src/index.ts` - Exports

### Real-time Monitoring

```bash
# Watch trace while agent runs
tail -f .traces/trace.ndjson

# With pretty-printing
tail -f .traces/trace.ndjson | jq .

# Filter for specific events
tail -f .traces/trace.ndjson | jq 'select(.type == "tool_call")'
```

## Use Cases

### Analyzing Stuck Loops

When an agent gets stuck (like the raymarching gallery loop), the trace file shows:

- Exact sequence of tool calls
- What the model was trying to do
- Where it started looping
- Full context at each iteration

### Sharing for Debug

Trace files can be shared with:

- Another developer
- An AI model for analysis
- Bug reports

### Post-Mortem Analysis

After a long-running agent completes, review:

- Total cost breakdown
- Tool usage patterns
- Where time was spent
- Error patterns

## Consequences

- ✅ Detailed execution history saved permanently
- ✅ Structured format for automated analysis
- ✅ Can be reviewed by another AI model
- ✅ Minimal performance impact (writes at end)
- ⚠️ Trace files can be large with full messages
- ⚠️ Sensitive data may be captured (sanitize before sharing)
