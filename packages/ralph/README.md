# @ralph/core

Autonomous AI agent loop library. The "Ralph Wiggum" pattern - a simple loop that feeds tasks to an AI model with tools until completion.

## Installation

```bash
npm install @ralph/core ai
```

## Quick Start

```typescript
import { LoopAgent } from "@ralph/core";
import { gateway } from "@ai-sdk/gateway";

const agent = new LoopAgent({
  model: gateway("xai/grok-code-fast-1"),
  task: "Fix all TypeScript errors in src/",
  limits: {
    maxIterations: 50,
    maxCost: 5.0,
  },
});

const result = await agent.run();

console.log(result.success); // true
console.log(result.iterations); // 12
console.log(result.cost); // 1.34
console.log(result.summary); // "Fixed 7 type errors..."
```

## What Ralph Does

- ✅ Runs an AI model in a loop with tools
- ✅ Tracks iterations, cost, and tokens
- ✅ Detects when the agent is stuck
- ✅ Provides callbacks for monitoring and intervention
- ✅ Provides default tools for common operations
- ✅ Allows custom tools to be added
- ✅ Structured logging with debug mode
- ✅ Browser tools with proper image handling (AI SDK v6 format)
- ✅ Automatic context management to prevent overflow

## What Ralph Does NOT Do

- ❌ Manage sandboxes or containers
- ❌ Clone repositories
- ❌ Handle authentication
- ❌ Manage infrastructure

## Default Tools

Ralph comes with default tools enabled:

| Category               | Tools                                                                  |
| ---------------------- | ---------------------------------------------------------------------- |
| **Bash & Filesystem**  | `bash`, `readFile`, `writeFile`                                        |
| **Process Management** | `startProcess`, `stopProcess`, `listProcesses`, `getProcessOutput`     |
| **Browser**            | `openBrowser`, `screenshot`, `click`, `type`, `scroll`, `closeBrowser` |
| **Utility**            | `done`, `think`                                                        |

## Configuration

```typescript
const agent = new LoopAgent({
  // Required
  model: gateway("xai/grok-code-fast-1"),
  task: "Fix the bug",

  // Tools (optional)
  defaultTools: true, // Use default tools
  tools: { myTool }, // Add custom tools

  // Limits (optional)
  limits: {
    maxIterations: 50, // Default: 50
    maxCost: 10.0, // Default: $10
    timeout: "4h", // Default: 4 hours
  },

  // Completion strategy (optional)
  completion: {
    type: "tool", // Default: 'tool' (model calls done())
    // type: 'file', file: 'DONE.md'
    // type: 'command', command: 'pnpm typecheck'
    // type: 'custom', check: async (ctx) => ({ complete: true })
  },

  // Rules for agent behavior (optional)
  rules: [brainRule, visualCheckRule, trackProgressRule],

  // Callbacks (optional)
  onUpdate: (status) => console.log(status),
  onStuck: async (ctx) => "Try a different approach",
  onComplete: (result) => console.log("Done!", result),
  onError: (error) => console.error(error),
});
```

## Default Rules

Ralph exports reusable rules that guide agent behavior:

```typescript
import {
  LoopAgent,
  brainRule, // Use .brain/ for persistent knowledge
  trackProgressRule, // Track progress in .progress.md
  visualCheckRule, // Visually verify UI changes
  testFirstRule, // Run tests before and after changes
  minimalChangesRule, // Keep changes surgical
  explorationRule, // Explore codebase before editing
  gitCheckpointRule, // Commit after each change
  debugRule, // Systematic debugging approach
} from "@ralph/core";

new LoopAgent({
  model: gateway("xai/grok-code-fast-1"),
  task: "Add dark mode toggle",
  rules: [brainRule, visualCheckRule, trackProgressRule],
});
```

## Logging & Debug Mode

Ralph includes structured logging for visibility into agent behavior:

```
┌─ Iteration 0 ────────────────────────────────────────
  🔧 [19:28:26] bash
     ▸ command: ls -la
     ✓ exit 0, 10 lines (28ms)
  💭 [19:28:30] think
     │ I need to analyze the code structure...
     │ The main components are...
     ✓ I need to analyze the code structure... (1ms)
  📄 [19:28:33] readFile
     ▸ path: src/index.ts
     ✓ 87 lines (3ms)
└─ Iteration 0 completed: 3 tools, 5,234 tokens, $0.0157 (8.2s)
```

Enable debug mode for verbose output:

```typescript
const agent = new LoopAgent({
  task: "Fix the bug",
  debug: true, // Enable verbose logging
});
```

Or via environment variable:

```bash
DEBUG=true pnpm start
```

### Logging Utilities

```typescript
import { setDebugMode, setLogLevel, toolLogger, loopLogger } from "@ralph/core";

setDebugMode(true); // Enable debug mode
setLogLevel("debug"); // Set log level: debug | info | warn | error | silent
```

## Stuck Detection

Ralph automatically detects when the agent is spinning:

| Pattern     | Description                       |
| ----------- | --------------------------------- |
| Repetitive  | Same tool calls 3+ times in a row |
| Error loop  | Same error message repeated       |
| Oscillation | A→B→A→B pattern (doing/undoing)   |
| No progress | High token usage, no file changes |

Handle stuck states:

```typescript
const agent = new LoopAgent({
  task: "Migrate to TypeScript",
  onStuck: async (ctx) => {
    if (ctx.reason === "error_loop") {
      return `You keep hitting: ${ctx.repeatedError}. Try something else.`;
    }
    return null; // Let it keep trying
  },
});
```

## API Reference

### LoopAgent

```typescript
class LoopAgent {
  run(): Promise<LoopResult>; // Start the loop
  stop(): Promise<void>; // Stop gracefully
  nudge(message: string): void; // Inject guidance
  getStatus(): LoopStatus; // Current status
  getHistory(): Iteration[]; // Iteration history
}
```

### LoopResult

```typescript
interface LoopResult {
  success: boolean;
  reason:
    | "completed"
    | "max_iterations"
    | "max_cost"
    | "timeout"
    | "stopped"
    | "error";
  iterations: number;
  cost: number;
  tokens: { input: number; output: number; total: number };
  elapsed: number;
  summary: string;
  error?: LoopError;
}
```

### LoopStatus

```typescript
interface LoopStatus {
  id: string;
  state:
    | "idle"
    | "running"
    | "stuck"
    | "completing"
    | "done"
    | "failed"
    | "stopped";
  iteration: number;
  cost: number;
  tokens: { input: number; output: number; total: number };
  elapsed: number;
  lastActions: string[];
}
```

## Browser Tools & Visual Verification

Browser tools use Playwright and return screenshots that the AI model can see:

```typescript
const agent = new LoopAgent({
  task: "Verify the UI looks correct",
  rules: [visualCheckRule],
});
```

### Key Features

- **Headed mode by default** - WebGPU and GPU-accelerated content works
- **JPEG compression** - Screenshots are ~30-50KB (not megabytes)
- **AI SDK v6 image format** - Model actually "sees" the image, not text tokens

### WebGPU Support

Browser launches with GPU flags enabled:

```typescript
// Automatic flags:
--enable-unsafe-webgpu
--enable-features=Vulkan
--use-gl=angle
--use-angle=metal  // macOS
--ignore-gpu-blocklist
```

### Playwright Setup

Ralph includes a postinstall script, but if needed:

```bash
npx playwright install chromium
```

## Custom Tools

Add custom tools using the AI SDK format:

```typescript
import { tool } from "ai";
import { z } from "zod";

const deployTool = tool({
  description: "Deploy to preview",
  parameters: z.object({
    environment: z.enum(["preview", "production"]),
  }),
  execute: async ({ environment }) => {
    const url = await deploy(environment);
    return { url };
  },
});

new LoopAgent({
  model: gateway("xai/grok-code-fast-1"),
  task: "Fix bug and deploy",
  tools: { deploy: deployTool },
});
```

## License

MIT
