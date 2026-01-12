# @ralph/core - Brain Index

Documentation and knowledge base for the autonomous AI agent loop library.

## Overview

`@ralph/core` is a TypeScript library for running autonomous AI agent loops. It implements the "Ralph Wiggum" pattern: a simple loop that feeds tasks to an AI model with tools until completion.

## Contents

- [brain-instructions.md](./brain-instructions.md) - **Start here** - How to use this .brain folder
- [architecture.md](./architecture.md) - High-level design and component overview
- [conventions.md](./conventions.md) - Code style and patterns used
- [decisions/](./decisions/) - Key architectural decisions (6 decisions documented)
- [progress.md](./progress.md) - Implementation progress tracking
- [testing.md](./testing.md) - Test suite documentation

## Quick Reference

### Main Entry Point

- `LoopAgent` class in `src/agent.ts`

### Key Dependencies

- `ai` ^6.0.0 (Vercel AI SDK)
- `bash-tool` ^1.0.0
- `playwright` ^1.48.0
- `zod` ^3.23.0

### Package Status

✅ Implementation complete - builds, type-checks, and **182 tests passing**

## Recent Learnings (Jan 2026)

### Process Cleanup (NEW)

Processes spawned via `startProcess` are now properly killed on cleanup. Uses **process groups**:

- Spawn with `detached: true` to create new process group
- Kill with `process.kill(-pgid, "SIGTERM")` to terminate entire group
- Fixes: dev servers, watch modes, etc. left running after agent completes

See [007-process-group-killing.md](./decisions/007-process-group-killing.md) for details.

### Image Handling

Tool results with images **must** use AI SDK v6 `content` format:

```typescript
{ type: "content", value: [
  { type: "text", text: "..." },
  { type: "image-data", data: base64, mediaType: "image/jpeg" }
]}
```

Raw base64 strings are treated as text tokens and will blow up context!

### Screenshot Compression

Screenshots are compressed as JPEG (quality 60) to reduce token usage.
Typical size: ~30-50KB instead of megabytes.

### Context Management

Messages are automatically summarized when context exceeds ~80k tokens.
Older messages are compressed, recent ones kept intact.

### Debug Mode

Enable with `debug: true` in config or `DEBUG=true` env var.
Shows detailed tool calls, arguments, and think tool reasoning.

### Trace Mode (NEW)

Captures detailed execution data to NDJSON file (append-only, real-time):

```typescript
const agent = new LoopAgent({
  task: "...",
  trace: { enabled: true },
});
```

Or via `RALPH_TRACE=true` env var. Output: `.traces/trace-{timestamp}.ndjson`

Watch in real-time: `tail -f .traces/*.ndjson | jq .`

See [008-trace-mode.md](./decisions/008-trace-mode.md) for details.
