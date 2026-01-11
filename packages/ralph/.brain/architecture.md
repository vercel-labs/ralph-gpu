# Architecture

## Overview

```
┌─────────────────────────────────────────────────┐
│                  RALPH LOOP                     │
│                                                 │
│   ┌──────┐   ┌───────┐   ┌───────┐   ┌──────┐  │
│   │Prompt│──▶│  AI   │──▶│ Tools │──▶│Check │  │
│   │Build │   │ Call  │   │ Exec  │   │ Done │  │
│   └──────┘   └───────┘   └───────┘   └──┬───┘  │
│       ▲                                 │      │
│       │              No                 │      │
│       └─────────────────────────────────┘      │
│                      │ Yes                      │
│                      ▼                          │
│                 ┌─────────┐                     │
│                 │  Done   │                     │
│                 └─────────┘                     │
└─────────────────────────────────────────────────┘
```

## Component Structure

```
src/
├── index.ts              # Public exports
├── agent.ts              # LoopAgent - main orchestrator
├── loop.ts               # Core loop execution logic
├── prompt.ts             # System prompt builder
├── rules.ts              # Default behavioral rules
├── stuck.ts              # Stuck detection algorithm
├── types.ts              # TypeScript interfaces
├── tools/
│   ├── index.ts          # Tool aggregation
│   ├── bash.ts           # bash-tool integration
│   ├── process.ts        # Process management tools
│   ├── browser.ts        # Playwright tools
│   └── utility.ts        # done, think tools
└── managers/
    ├── process.ts        # ProcessManager class
    └── browser.ts        # BrowserManager class

tests/
├── types.test.ts         # Type definitions
├── stuck.test.ts         # StuckDetector patterns
├── prompt.test.ts        # Prompt building
├── rules.test.ts         # Rules exports
├── tools.test.ts         # Tool creation
├── managers.test.ts      # ProcessManager/BrowserManager
├── agent.test.ts         # LoopAgent config
└── exports.test.ts       # API exports
```

## Key Components

### LoopAgent (agent.ts)
- Public-facing class that users instantiate
- Initializes managers and tools
- Delegates to `runLoop()` for execution
- Handles cleanup on completion

### Loop Engine (loop.ts)
- Core iteration logic
- Token/cost tracking
- Stuck detection integration
- Completion checking

### Managers
- **ProcessManager**: Handles long-running processes (dev servers, watch modes)
- **BrowserManager**: Manages Playwright browser instances

### Tools
All tools use AI SDK v6 format with `inputSchema` (Zod) and `execute` function.

## Data Flow

1. User creates `LoopAgent` with config
2. `agent.run()` initializes tools and managers
3. `runLoop()` executes iterations:
   - Build user message with context
   - Call AI model via `generateText()`
   - Execute tool calls
   - Check completion/stuck status
   - Track tokens and cost
4. Cleanup managers on exit
5. Return `LoopResult`

## State Management

`LoopState` tracks:
- Iteration count
- Token usage (input/output)
- Cost accumulation
- Files modified
- Pending nudge messages
- Stop signal
