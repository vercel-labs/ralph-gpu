# @ralph/core

## Autonomous Agent Loop Library - Technical Specification v1.0

---

## Overview

`@ralph/core` is a TypeScript library for running autonomous AI agent loops. It implements the "Ralph Wiggum" pattern: a simple loop that feeds tasks to an AI model with tools until completion.

**This library handles only the AI execution loop.** It assumes:

- You're already running in a sandbox environment (Vercel Sandbox, E2B, Docker, etc.)
- Node.js and filesystem access are available
- The environment is already set up with the repo cloned

### What Ralph Does

- Runs an AI model in a loop with tools
- Tracks iterations, cost, and tokens
- Detects when the agent is stuck
- Provides callbacks for monitoring and intervention
- Provides default tools for common operations
- Allows custom tools to be added

### What Ralph Does NOT Do

- Manage sandboxes or containers
- Clone repositories
- Handle authentication
- Manage infrastructure

### Design Principles

1. **Minimal** — just the loop, nothing else
2. **Composable** — bring your own model, add custom tools
3. **Observable** — real-time status, iteration history
4. **Safe** — cost limits, stuck detection, clean shutdown

---

## Installation

```bash
npm install @ralph/core ai
```

---

## Quick Start

```typescript
import { LoopAgent } from "@ralph/core";
import { anthropic } from "@ai-sdk/anthropic";

const agent = new LoopAgent({
  model: anthropic("claude-sonnet-4-20250514"),
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

---

## Core Concepts

### The Loop

Ralph is a while loop. Each iteration:

1. Build prompt with task + context
2. Call AI model with tools
3. Execute tool calls
4. Check for completion
5. Check if stuck
6. Repeat or exit

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

### Model Providers

Ralph uses the Vercel AI SDK model interface. Any provider works:

```typescript
import { anthropic } from '@ai-sdk/anthropic'
import { openai } from '@ai-sdk/openai'
import { google } from '@ai-sdk/google'
import { gateway } from '@ai-sdk/gateway'

// Direct providers
new LoopAgent({ model: anthropic('claude-sonnet-4-20250514'), ... })
new LoopAgent({ model: openai('gpt-4o'), ... })
new LoopAgent({ model: google('gemini-2.0-flash'), ... })

// Via AI Gateway
new LoopAgent({ model: gateway('anthropic/claude-sonnet-4-20250514'), ... })
```

### Default Tools

Ralph comes with default tools enabled out of the box:

1. **Bash Tools** (via `bash-tool`) — `bash`, `readFile`, `writeFile`
2. **Browser Tools** — `openBrowser`, `screenshot`, `click`, `type`, `closeBrowser`
3. **Process Tools** — `startProcess`, `stopProcess`, `listProcesses`
4. **Utility Tools** — `done`, `think`

You can disable defaults and/or add custom tools:

```typescript
// Use defaults + custom tools
new LoopAgent({
  model: anthropic("claude-sonnet-4-20250514"),
  task: "Deploy the app",
  tools: {
    deploy: myDeployTool, // Custom tool added to defaults
  },
});

// Disable defaults, use only custom tools
new LoopAgent({
  model: anthropic("claude-sonnet-4-20250514"),
  task: "Analyze data",
  defaultTools: false,
  tools: {
    query: myQueryTool,
    chart: myChartTool,
  },
});
```

### Completion

Ralph supports multiple completion strategies:

```typescript
// Tool-based (default): complete when model calls 'done' tool
completion: { type: 'tool' }

// File-based: complete when DONE.md exists
completion: { type: 'file', file: 'DONE.md' }

// Command-based: complete when command exits 0
completion: { type: 'command', command: 'pnpm typecheck' }

// Custom: your own logic
completion: {
  type: 'custom',
  check: async (ctx) => ({ complete: true, summary: '...' })
}
```

---

## API Reference

### LoopAgent

```typescript
import { LoopAgent } from '@ralph/core'

const agent = new LoopAgent(config: LoopAgentConfig)
```

#### LoopAgentConfig

```typescript
interface LoopAgentConfig {
  // === REQUIRED ===

  /**
   * AI model from Vercel AI SDK
   * @example anthropic('claude-sonnet-4-20250514')
   * @example gateway('openai/gpt-4o')
   */
  model: LanguageModel;

  /**
   * The task description
   */
  task: string;

  // === TOOLS ===

  /**
   * Enable default tools (bash, browser, process, utility)
   * @default true
   */
  defaultTools?: boolean;

  /**
   * Custom tools to add (merged with defaults unless defaultTools: false)
   */
  tools?: Record<string, Tool>;

  // === LIMITS ===

  limits?: {
    /** Max iterations (default: 50) */
    maxIterations?: number;

    /** Max cost in USD (default: 10.00) */
    maxCost?: number;

    /** Max time in ms or string like '2h' (default: '4h') */
    timeout?: number | string;

    /** Max tokens per iteration (default: 100000) */
    maxTokensPerIteration?: number;
  };

  // === COMPLETION ===

  /**
   * How to detect task completion
   * @default { type: 'tool' } - model calls done() tool
   */
  completion?: {
    type: "file" | "tool" | "command" | "custom";

    /** For 'file': path to check */
    file?: string;

    /** For 'command': command that should exit 0 */
    command?: string;

    /** For 'custom': completion check function */
    check?: (ctx: CompletionContext) => Promise<CompletionResult>;
  };

  // === PROMPT ===

  /**
   * Additional context to include in system prompt
   */
  context?: string | ContextFile[];

  /**
   * Rules and behavioral guidelines for the agent
   * Use default rules like brainRule, visualCheckRule, etc.
   * @example [brainRule, visualCheckRule, trackProgressRule]
   */
  rules?: string[];

  /**
   * Override default system prompt entirely
   */
  systemPrompt?: string;

  // === CALLBACKS ===

  /** Called after each iteration */
  onUpdate?: (status: LoopStatus) => void;

  /** Called when stuck detected - return string to nudge */
  onStuck?: (ctx: StuckContext) => Promise<string | null>;

  /** Called on completion */
  onComplete?: (result: LoopResult) => void;

  /** Called on error */
  onError?: (error: LoopError) => void;

  // === STUCK DETECTION ===

  stuckDetection?: {
    /** Iterations without progress before stuck (default: 3) */
    threshold?: number;

    /** Disable stuck detection */
    disabled?: boolean;
  };
}
```

#### Methods

```typescript
class LoopAgent {
  /** Start the loop */
  run(): Promise<LoopResult>;

  /** Stop gracefully */
  stop(): Promise<void>;

  /** Inject a nudge message into next iteration */
  nudge(message: string): void;

  /** Get current status */
  getStatus(): LoopStatus;

  /** Get iteration history */
  getHistory(): Iteration[];
}
```

---

### Types

#### LoopStatus

```typescript
interface LoopStatus {
  /** Run ID */
  id: string;

  /** Current state */
  state:
    | "idle"
    | "running"
    | "stuck"
    | "completing"
    | "done"
    | "failed"
    | "stopped";

  /** Current iteration (0-indexed) */
  iteration: number;

  /** Total cost so far (USD) */
  cost: number;

  /** Tokens used */
  tokens: { input: number; output: number; total: number };

  /** Elapsed time in ms */
  elapsed: number;

  /** Last few actions */
  lastActions: string[];
}
```

#### LoopResult

```typescript
interface LoopResult {
  /** Task completed successfully */
  success: boolean;

  /** Why the loop ended */
  reason:
    | "completed"
    | "max_iterations"
    | "max_cost"
    | "timeout"
    | "stopped"
    | "error";

  /** Total iterations */
  iterations: number;

  /** Total cost (USD) */
  cost: number;

  /** Total tokens */
  tokens: { input: number; output: number; total: number };

  /** Elapsed time in ms */
  elapsed: number;

  /** Summary (from done tool or completion check) */
  summary: string;

  /** Error if failed */
  error?: LoopError;
}
```

#### Iteration

```typescript
interface Iteration {
  /** Iteration number (0-indexed) */
  index: number;

  /** Timestamp */
  timestamp: Date;

  /** Duration in ms */
  duration: number;

  /** Tokens used */
  tokens: { input: number; output: number };

  /** Cost (USD) */
  cost: number;

  /** Tool calls made */
  toolCalls: ToolCall[];

  /** Files modified (if fs tools used) */
  filesModified?: string[];
}
```

#### ContextFile

```typescript
interface ContextFile {
  /** Filename (shown in prompt) */
  name: string;

  /** Content */
  content: string;
}
```

#### StuckContext

```typescript
interface StuckContext {
  /** Why we think it's stuck */
  reason: "repetitive" | "error_loop" | "oscillation" | "no_progress";

  /** Details */
  details: string;

  /** Recent iterations */
  recentIterations: Iteration[];

  /** Repeated error if applicable */
  repeatedError?: string;
}
```

---

## Default Tools

Ralph includes default tools that are enabled automatically. These cover the most common agent needs.

### Overview

| Category               | Tools                                                                  | Source                |
| ---------------------- | ---------------------------------------------------------------------- | --------------------- |
| **Bash & Filesystem**  | `bash`, `readFile`, `writeFile`                                        | `bash-tool` package   |
| **Process Management** | `startProcess`, `stopProcess`, `listProcesses`, `getProcessOutput`     | Built-in              |
| **Browser**            | `openBrowser`, `screenshot`, `click`, `type`, `scroll`, `closeBrowser` | Built-in (Playwright) |
| **Utility**            | `done`, `think`                                                        | Built-in              |

### Bash & Filesystem Tools

Powered by the `bash-tool` package, these provide filesystem access and bash command execution.

```typescript
// bash-tool provides these three tools:
// - bash: Execute bash commands
// - readFile: Read file contents
// - writeFile: Write content to files
```

#### bash

Execute bash commands. This is the primary tool for most filesystem operations.

```typescript
bash: {
  description: 'Execute bash commands in the sandbox environment',
  parameters: z.object({
    command: z.string().describe('Bash command to execute'),
  }),
  execute: async ({ command }) => {
    // Returns: { stdout, stderr, exitCode }
  }
}
```

**Examples the model might use:**

```bash
# List files
bash({ command: 'ls -la src/' })

# Search for text
bash({ command: 'grep -r "TODO" src/' })

# Run commands
bash({ command: 'pnpm typecheck' })

# Complex pipelines
bash({ command: 'find . -name "*.ts" | xargs wc -l' })
```

#### readFile

Read file contents directly.

```typescript
readFile: {
  description: 'Read the contents of a file',
  parameters: z.object({
    path: z.string().describe('Path to the file'),
  }),
  execute: async ({ path }) => {
    // Returns: string (file content)
  }
}
```

#### writeFile

Write content to a file. Creates parent directories if needed.

```typescript
writeFile: {
  description: 'Write content to a file. Creates parent directories if needed.',
  parameters: z.object({
    path: z.string().describe('Path to the file'),
    content: z.string().describe('Content to write'),
  }),
  execute: async ({ path, content }) => {
    // Returns: { success: true }
  }
}
```

---

### Process Management Tools

These tools handle long-running processes (dev servers, watch modes) that would otherwise hang.

#### startProcess

Start a long-running process. **Only one process per name can exist** — starting a new one kills the old.

```typescript
startProcess: {
  description: 'Start a long-running process. Only ONE per name - new ones kill old ones.',
  parameters: z.object({
    name: z.string().describe('Unique name like "dev" or "test-watch"'),
    command: z.string().describe('Command to run'),
    cwd: z.string().optional(),
    readyPattern: z.string().optional().describe('Regex pattern indicating ready'),
  }),
  execute: async ({ name, command, cwd, readyPattern }) => {
    // Kills existing process with same name
    // Waits for readyPattern if provided
    // Returns: { name, pid, status: 'running' }
  }
}
```

**Why this matters:**

Without managed processes, agents commonly:

- Start `pnpm dev` and hang forever (command never returns)
- Start multiple dev servers (port conflicts)
- Leave zombie processes consuming resources

The `startProcess` tool prevents all of these.

#### stopProcess

Stop a process by name.

```typescript
stopProcess: {
  description: 'Stop a running process',
  parameters: z.object({
    name: z.string(),
  }),
  execute: async ({ name }) => {
    // Returns: { name, stopped: true }
  }
}
```

#### listProcesses

List all managed processes.

```typescript
listProcesses: {
  description: 'List all running processes',
  parameters: z.object({}),
  execute: async () => {
    // Returns: { processes: [{ name, command, pid, uptime }] }
  }
}
```

#### getProcessOutput

Get recent output from a running process.

```typescript
getProcessOutput: {
  description: 'Get recent output from a running process',
  parameters: z.object({
    name: z.string(),
    lines: z.number().optional().describe('Lines to return (default: 100)'),
  }),
  execute: async ({ name, lines }) => {
    // Returns: { stdout, stderr }
  }
}
```

---

### Browser Tools

Playwright-based browser automation for visual verification.

#### openBrowser

Open a browser and navigate to a URL. Returns a screenshot.

```typescript
openBrowser: {
  description: 'Open a browser and navigate to URL. Returns screenshot.',
  parameters: z.object({
    url: z.string(),
    name: z.string().optional().describe('Browser name (default: "main")'),
    viewport: z.object({
      width: z.number(),
      height: z.number(),
    }).optional(),
  }),
  execute: async ({ url, name, viewport }) => {
    // Returns: {
    //   name,
    //   url,
    //   screenshot: 'base64...',
    //   consoleErrors: string[]
    // }
  }
}
```

#### screenshot

Take a screenshot of current page state.

```typescript
screenshot: {
  description: 'Take a screenshot of current page state',
  parameters: z.object({
    name: z.string().optional(),
    selector: z.string().optional().describe('CSS selector for element'),
    fullPage: z.boolean().optional(),
  }),
  execute: async ({ name, selector, fullPage }) => {
    // Returns: { screenshot: 'base64...', url }
  }
}
```

#### click

Click an element.

```typescript
click: {
  description: 'Click an element',
  parameters: z.object({
    selector: z.string(),
    name: z.string().optional(),
  }),
  execute: async ({ selector, name }) => {
    // Returns: { clicked: selector, screenshot: 'base64...' }
  }
}
```

#### type

Type text into an input.

```typescript
type: {
  description: 'Type text into an input',
  parameters: z.object({
    selector: z.string(),
    text: z.string(),
    name: z.string().optional(),
  }),
  execute: async ({ selector, text, name }) => {
    // Returns: { typed: text, screenshot: 'base64...' }
  }
}
```

#### scroll

Scroll the page.

```typescript
scroll: {
  description: 'Scroll the page',
  parameters: z.object({
    direction: z.enum(['up', 'down']),
    amount: z.number().optional().describe('Pixels (default: 500)'),
    name: z.string().optional(),
  }),
  execute: async ({ direction, amount, name }) => {
    // Returns: { scrolled: amount, screenshot: 'base64...' }
  }
}
```

#### closeBrowser

Close a browser instance.

```typescript
closeBrowser: {
  description: 'Close a browser instance',
  parameters: z.object({
    name: z.string().optional(),
  }),
  execute: async ({ name }) => {
    // Returns: { closed: name }
  }
}
```

---

### Utility Tools

#### done

Signal task completion. This is how the agent tells Ralph it's finished.

```typescript
done: {
  description: 'Signal that the task is complete',
  parameters: z.object({
    summary: z.string().describe('Summary of what was accomplished'),
  }),
  execute: async ({ summary }) => {
    // Signals completion to the loop
    // Returns: { completed: true }
  }
}
```

#### think

Let the model reason without taking action (chain-of-thought).

```typescript
think: {
  description: 'Think through a problem before acting. Use for complex decisions.',
  parameters: z.object({
    thought: z.string(),
  }),
  execute: async ({ thought }) => {
    // Just logs, no side effects
    // Returns: { thought }
  }
}
```

---

## Default Rules

Ralph exports reusable rules that guide agent behavior. Combine them to shape how the agent works.

```typescript
import {
  LoopAgent,
  brainRule,
  visualCheckRule,
  trackProgressRule,
} from "@ralph/core";

new LoopAgent({
  model: anthropic("claude-sonnet-4-20250514"),
  task: "Fix the rendering of the fluid simulation",
  rules: [brainRule, visualCheckRule, trackProgressRule],
});
```

### How Rules Work

Rules are injected into the system prompt after the task:

```
[Base system prompt]
[Task]
[Rules] ← brainRule, visualCheckRule, trackProgressRule, custom rules, etc.
[Context]
[Tools]
```

### Available Rules

#### brainRule

Teaches the agent to use a `.brain/` directory structure for persistent knowledge.

```typescript
export const brainRule = `
## Brain Structure

This project has a \`.brain/\` directory for persistent knowledge. Use it.

### Reading
- Start by reading \`.brain/index.md\` to understand what's documented
- Each folder has an \`index.md\` describing its contents
- Read relevant files before making changes

### Writing  
- Update \`.brain/\` when you learn something important about the codebase
- Keep entries concise (1-2 paragraphs max)
- Create subfolders if a topic grows large

### Structure
\`\`\`
.brain/
  index.md           # Overview of what's documented
  conventions.md     # Code style, patterns
  architecture.md    # High-level design
  decisions/         # Why things are the way they are
    index.md
    001-auth.md
  components/        # Major components
    index.md
    renderer.md
\`\`\`
`;
```

#### trackProgressRule

Instructs the agent to track its progress in a `.progress.md` file.

```typescript
export const trackProgressRule = `
## Progress Tracking

Maintain a \`.progress.md\` file to track your work:

1. Create \`.progress.md\` at the start if it doesn't exist
2. Update it after each significant step
3. Include: what you've done, what's next, blockers

### Format
\`\`\`markdown
# Progress

## Completed
- [x] Step 1 description
- [x] Step 2 description

## In Progress
- [ ] Current step

## Next
- [ ] Upcoming step

## Blockers
- Any issues encountered
\`\`\`

This helps with:
- Resuming interrupted work
- Understanding agent behavior
- Debugging stuck states
`;
```

#### visualCheckRule

Instructs the agent to visually verify UI changes before completing.

```typescript
export const visualCheckRule = `
## Visual Verification

For any UI changes, verify visually before marking done:

1. Start the dev server: \`startProcess({ name: 'dev', command: 'pnpm dev', readyPattern: 'Ready' })\`
2. Open browser: \`openBrowser({ url: 'http://localhost:3000' })\`
3. Check the screenshot for correctness
4. Look for console errors in the response
5. Test interactions if relevant

Never mark UI tasks complete without visual verification.
`;
```

#### testFirstRule

Instructs the agent to run tests before and after changes.

```typescript
export const testFirstRule = `
## Test-Driven Workflow

1. Run tests first to understand current state: \`bash({ command: 'pnpm test' })\`
2. Make changes
3. Run tests again to verify nothing broke
4. Only mark done when tests pass
`;
```

#### minimalChangesRule

Encourages surgical, focused changes.

```typescript
export const minimalChangesRule = `
## Minimal Changes

- Change only what's necessary for the task
- Don't refactor unrelated code
- Don't "improve" things that aren't part of the task
- Prefer editing over rewriting entire files
- Small, focused commits
`;
```

#### explorationRule

For tasks requiring codebase exploration first.

```typescript
export const explorationRule = `
## Explore First

Before making changes:
1. List files to understand structure: \`bash({ command: 'find . -type f -name "*.ts" | head -20' })\`
2. Read key files to understand patterns
3. Search for related code: \`bash({ command: 'grep -r "keyword" src/' })\`
4. Form a plan before editing
`;
```

#### gitCheckpointRule

Encourages git commits as checkpoints.

```typescript
export const gitCheckpointRule = `
## Git Checkpoints

Commit after each logical change:
\`bash({ command: 'git add -A && git commit -m "description"' })\`

This creates recovery points if something goes wrong.
Before marking done, ensure all changes are committed.
`;
```

#### debugRule

For debugging tasks.

```typescript
export const debugRule = `
## Debugging Approach

1. Reproduce the issue first
2. Add logging to understand state
3. Form a hypothesis
4. Make a minimal fix
5. Verify the fix
6. Remove debug logging
7. Test that nothing else broke
`;
```

### Combining Rules

Rules are concatenated in order:

```typescript
new LoopAgent({
  task: "Add dark mode toggle",
  rules: [
    brainRule, // Use .brain/ for context
    visualCheckRule, // Verify visually
    trackProgressRule, // Track progress
    minimalChangesRule, // Keep changes small
  ],
});
```

### Custom Rules

Create your own:

```typescript
const myProjectRule = `
## Project-Specific Guidelines

- Use TSL for shaders, not raw GLSL
- All components go in src/components/
- Run \`pnpm typecheck\` before committing
`;

new LoopAgent({
  task: "Add particle effects",
  rules: [brainRule, trackProgressRule, myProjectRule],
});
```

### Behavioral vs Constraint Rules

**Behavioral rules** (how to work):

- `brainRule`, `visualCheckRule`, `explorationRule`, `trackProgressRule`

**Constraint rules** (what not to do):

```typescript
rules: [brainRule, "Do not modify package.json", "Do not delete any tests"];
```

Add your own tools using the AI SDK tool format:

```typescript
import { LoopAgent } from "@ralph/core";
import { tool } from "ai";
import { z } from "zod";
import { anthropic } from "@ai-sdk/anthropic";

const deployTool = tool({
  description: "Deploy the application to preview",
  parameters: z.object({
    environment: z.enum(["preview", "production"]),
  }),
  execute: async ({ environment }) => {
    const url = await deploy(environment);
    return { url, environment };
  },
});

const agent = new LoopAgent({
  model: anthropic("claude-sonnet-4-20250514"),
  task: "Fix the bug and deploy to preview",
  tools: {
    deploy: deployTool, // Added to default tools
  },
});
```

### Disabling Default Tools

If you want full control over tools:

```typescript
const agent = new LoopAgent({
  model: anthropic("claude-sonnet-4-20250514"),
  task: "Analyze the data",
  defaultTools: false, // No default tools
  tools: {
    query: myQueryTool,
    chart: myChartTool,
  },
});
```

---

## Stuck Detection

Ralph detects when the agent is spinning without progress.

### Detection Patterns

| Pattern     | Description                       |
| ----------- | --------------------------------- |
| Repetitive  | Same tool calls 3+ times in a row |
| Error loop  | Same error message repeated       |
| Oscillation | A→B→A→B pattern (doing/undoing)   |
| No progress | High token usage, no file changes |

### Nudge Mechanism

When stuck is detected, `onStuck` is called. Return a string to inject guidance:

```typescript
const agent = new LoopAgent({
  model: anthropic("claude-sonnet-4-20250514"),
  task: "Migrate to TypeScript",
  onStuck: async (ctx) => {
    console.log("Stuck:", ctx.reason);

    if (ctx.reason === "error_loop") {
      return `You keep hitting this error: ${ctx.repeatedError}. Try a different approach.`;
    }

    // Return null to let it keep trying
    return null;
  },
});
```

### Manual Nudge

You can nudge anytime from outside the loop:

```typescript
agent.nudge("Focus on the tests, not the implementation");
```

---

## System Prompt

Ralph generates a system prompt from your config. You can customize it.

### Default Structure

```markdown
You are an autonomous coding agent. You work in a loop until your task is complete.

## Your Task

{task}

## Rules

{rules}

## Context

{context}

## Available Tools

{tools list}

## Important

- Use the `bash` tool for most filesystem and command operations
- Call `done` with a summary when finished
- If stuck, try a different approach
```

### Custom System Prompt

Override entirely:

```typescript
const agent = new LoopAgent({
  model: anthropic("claude-sonnet-4-20250514"),
  task: "Fix the bug",
  systemPrompt: `You are a helpful assistant...`,
});
```

Or extend with rules:

```typescript
const agent = new LoopAgent({
  model: anthropic("claude-sonnet-4-20250514"),
  task: "Fix the bug",
  rules: [
    "Run tests before marking done",
    "Keep changes minimal",
    "Do not modify unrelated files",
  ],
});
```

Or add context:

```typescript
const agent = new LoopAgent({
  model: anthropic("claude-sonnet-4-20250514"),
  task: "Implement the design",
  context: [
    { name: "design-spec.md", content: "..." },
    { name: "api-schema.json", content: "..." },
  ],
});
```

---

## Process Management

The process tools handle long-running processes safely.

### Problem: Hanging Dev Servers

```typescript
// Without management - this hangs forever:
bash({ command: "pnpm dev" });
```

### Solution: Named Processes

```typescript
// With startProcess - returns immediately when ready:
startProcess({
  name: "dev",
  command: "pnpm dev",
  readyPattern: "Ready on",
});

// Starting again kills the old one:
startProcess({
  name: "dev", // Same name = old one killed
  command: "pnpm dev --port 3001",
  readyPattern: "Ready on",
});
```

### Automatic Cleanup

When the loop ends (success, failure, or stop), all processes are killed automatically.

---

## Browser Management

The browser tools manage Playwright browsers for visual verification.

### Usage Pattern

```typescript
// 1. Start dev server
startProcess({ name: "dev", command: "pnpm dev", readyPattern: "Ready" });

// 2. Open browser (returns screenshot)
openBrowser({ url: "http://localhost:3000" });
// Returns: { screenshot: 'base64...', consoleErrors: [...] }

// 3. Interact
click({ selector: "button.submit" });
// Returns: { screenshot: 'base64...' }

// 4. Verify
screenshot({ fullPage: true });
```

### Console Error Capture

All console errors are captured and returned with browser operations.

### Automatic Cleanup

All browsers are closed when the loop ends.

---

## Configuration Examples

### Simple Task

```typescript
const agent = new LoopAgent({
  model: anthropic("claude-sonnet-4-20250514"),
  task: "Add a dark mode toggle",
});
```

### With Visual Verification

```typescript
const agent = new LoopAgent({
  model: anthropic("claude-sonnet-4-20250514"),
  task: "Fix the button styling to match the design",
  context: [{ name: "design.png", content: base64Image }],
});
```

### With Monitoring

```typescript
const agent = new LoopAgent({
  model: anthropic("claude-sonnet-4-20250514"),
  task: "Migrate to TypeScript",
  limits: {
    maxIterations: 100,
    maxCost: 20.0,
  },
  onUpdate: (status) => {
    console.log(`[${status.iteration}] $${status.cost.toFixed(2)}`);
    ws.emit("status", status);
  },
  onStuck: async (ctx) => {
    await slack.notify(`Ralph stuck: ${ctx.reason}`);
    return "Try breaking the problem into smaller steps.";
  },
  onComplete: (result) => {
    slack.notify(`Ralph done: ${result.summary}`);
  },
});
```

### Command-Based Completion

```typescript
const agent = new LoopAgent({
  model: anthropic("claude-sonnet-4-20250514"),
  task: "Fix all TypeScript errors",
  completion: {
    type: "command",
    command: "pnpm typecheck", // Done when exits 0
  },
});
```

### Custom Tools Only

```typescript
const agent = new LoopAgent({
  model: anthropic("claude-sonnet-4-20250514"),
  task: "Generate a report from the database",
  defaultTools: false,
  tools: {
    query: myDatabaseQueryTool,
    chart: myChartTool,
    done: doneTool, // You need to provide done if using defaultTools: false
  },
});
```

---

## Exports

```typescript
// Main class
export { LoopAgent } from "./agent";

// Default Rules
export {
  brainRule,
  trackProgressRule,
  visualCheckRule,
  testFirstRule,
  minimalChangesRule,
  explorationRule,
  gitCheckpointRule,
  debugRule,
} from "./rules";

// Types
export type {
  LoopAgentConfig,
  LoopStatus,
  LoopResult,
  LoopError,
  Iteration,
  ContextFile,
  StuckContext,
  CompletionContext,
  CompletionResult,
} from "./types";

// Default tools (for customization)
export { bashTools } from "./tools/bash";
export { processTools } from "./tools/process";
export { browserTools } from "./tools/browser";
export { utilityTools } from "./tools/utility";

// Managers (for advanced usage)
export { ProcessManager } from "./managers/process";
export { BrowserManager } from "./managers/browser";
export { StuckDetector } from "./stuck";
```

---

## Package Structure

```
@ralph/core
├── src/
│   ├── index.ts              # Exports
│   ├── agent.ts              # LoopAgent class
│   ├── loop.ts               # Core loop logic
│   ├── prompt.ts             # System prompt builder
│   ├── rules.ts              # Default rules (brainRule, visualCheckRule, etc.)
│   ├── stuck.ts              # Stuck detection
│   ├── types.ts              # TypeScript types
│   ├── tools/
│   │   ├── index.ts          # Combines all default tools
│   │   ├── bash.ts           # bash-tool integration
│   │   ├── process.ts        # startProcess, stopProcess, etc.
│   │   ├── browser.ts        # Playwright tools
│   │   └── utility.ts        # done, think
│   └── managers/
│       ├── process.ts        # ProcessManager
│       └── browser.ts        # BrowserManager
├── package.json
├── tsconfig.json
└── README.md
```

---

## Dependencies

```json
{
  "peerDependencies": {
    "ai": "^4.0.0"
  },
  "dependencies": {
    "bash-tool": "^1.0.0",
    "zod": "^3.23.0",
    "playwright": "^1.48.0",
    "ms": "^2.1.3",
    "nanoid": "^5.0.0"
  }
}
```

---

## Internal: How Default Tools Are Created

Ralph uses `bash-tool` internally:

```typescript
import { createBashTool } from "bash-tool";

// When LoopAgent initializes:
const { tools: bashTools } = await createBashTool({
  // Uses real filesystem since we're in a sandbox
});

// bashTools contains: { bash, readFile, writeFile }
```

The process and browser tools are built-in and manage their respective resources.

---

## Future Considerations

### Parallel Tool Calls

Allow multiple tools to run in parallel when safe:

```typescript
new LoopAgent({
  parallelToolCalls: true,
});
```

### Streaming Output

Stream tokens as they're generated:

```typescript
new LoopAgent({
  onToken: (token) => process.stdout.write(token),
});
```

### Iteration Checkpoints

Save/restore state for recovery:

```typescript
const checkpoint = agent.checkpoint();
// Later...
agent.restore(checkpoint);
```

### Tool Middleware

Hook into tool execution:

```typescript
new LoopAgent({
  toolMiddleware: async (tool, args, next) => {
    console.log(`Calling ${tool} with`, args);
    const result = await next();
    console.log(`Result:`, result);
    return result;
  },
});
```
