# Ralph Implementation Plan for ralph-gpu

> This document describes how to set up a **Ralph Loop Agent** to build the `ralph-gpu` library autonomously.  
> The agent will use the [ralph-loop-agent](https://github.com/vercel-labs/ralph-loop-agent) framework and validate its work using **Playwright MCP**.

---

## Table of Contents

1. [Overview](#overview)
2. [Project Structure](#project-structure)
3. [Ralph Loop Architecture](#ralph-loop-architecture)
4. [Phase 1: Monorepo Setup](#phase-1-monorepo-setup)
5. [Phase 2: Core Library Implementation](#phase-2-core-library-implementation)
6. [Phase 3: Examples App](#phase-3-examples-app)
7. [Tools Configuration](#tools-configuration)
8. [Verification Strategy](#verification-strategy)
9. [Stop Conditions](#stop-conditions)
10. [Environment Setup](#environment-setup)
11. [Running the Agent](#running-the-agent)

---

## Overview

### Goal

Build `ralph-gpu`, a minimal WebGPU shader library, using an autonomous AI agent that:

1. Creates the monorepo structure (Turborepo)
2. Implements the core library (`packages/core`)
3. Creates example pages (`apps/examples`)
4. Validates work via Playwright screenshots and tests

### Technology Stack

| Component    | Technology                         |
| ------------ | ---------------------------------- |
| AI Framework | `ralph-loop-agent` + Vercel AI SDK |
| Monorepo     | Turborepo + pnpm                   |
| Core Build   | Webpack + SWC                      |
| Testing      | Vitest                             |
| Examples App | Next.js 14 (App Router)            |
| Validation   | Playwright MCP                     |
| Language     | TypeScript                         |

### Reference Documents

- `DX_EXAMPLES.md` — API design and usage examples
- This file — Implementation plan for the Ralph agent

---

## Project Structure

```
ralph-gpu/
├── apps/
│   ├── examples/              # Next.js app with shader examples
│   │   ├── app/
│   │   │   ├── layout.tsx
│   │   │   ├── page.tsx       # Home with links to examples
│   │   │   ├── basic/page.tsx
│   │   │   ├── uniforms/page.tsx
│   │   │   ├── render-target/page.tsx
│   │   │   ├── ping-pong/page.tsx
│   │   │   ├── particles/page.tsx
│   │   │   └── fluid/page.tsx
│   │   ├── package.json
│   │   └── next.config.js
│   │
│   └── documentation/         # (Phase 2 - not in initial scope)
│       └── ...
│
├── packages/
│   └── core/                  # Main ralph-gpu library
│       ├── src/
│       │   ├── index.ts       # Main exports
│       │   ├── context.ts     # GPU context management
│       │   ├── pass.ts        # Fullscreen shader passes
│       │   ├── material.ts    # Custom geometry materials
│       │   ├── compute.ts     # Compute shaders
│       │   ├── target.ts      # Render targets
│       │   ├── ping-pong.ts   # Ping-pong buffers
│       │   ├── mrt.ts         # Multiple render targets
│       │   ├── storage.ts     # Storage buffers
│       │   ├── uniforms.ts    # Uniform handling
│       │   ├── errors.ts      # Custom error types
│       │   └── types.ts       # TypeScript types
│       ├── tests/
│       │   ├── context.test.ts
│       │   ├── pass.test.ts
│       │   ├── target.test.ts
│       │   └── ...
│       ├── webpack.config.js
│       ├── tsconfig.json
│       ├── package.json
│       └── vitest.config.ts
│
├── turbo.json
├── pnpm-workspace.yaml
├── package.json
├── tsconfig.json
├── DX_EXAMPLES.md
├── RALPH_IMPLEMENTATION_PLAN.md
└── README.md
```

---

## Ralph Loop Architecture

```
┌──────────────────────────────────────────────────────────────────┐
│                     Ralph Loop (outer)                           │
│  ┌────────────────────────────────────────────────────────────┐  │
│  │              AI SDK Tool Loop (inner)                      │  │
│  │  LLM ↔ tools ↔ LLM ↔ tools ... until tool loop done       │  │
│  └────────────────────────────────────────────────────────────┘  │
│                              ↓                                   │
│         verifyCompletion: Check via Playwright MCP               │
│                              ↓                                   │
│  ┌─────────────────┐    ┌─────────────────┐                     │
│  │  Tests Pass?    │ NO │ Screenshots OK? │                     │
│  │  Type-check OK? │───▶│ Visual check    │                     │
│  └────────┬────────┘    └────────┬────────┘                     │
│           │ YES                  │ NO                            │
│           ▼                      ▼                               │
│      Return result         Inject feedback, continue loop        │
└──────────────────────────────────────────────────────────────────┘
```

### Key Concepts

1. **Outer Loop (Ralph)** — Keeps iterating until `verifyCompletion` returns `{ complete: true }`
2. **Inner Loop (AI SDK)** — Standard tool-calling loop within each iteration
3. **Verification** — Uses Playwright MCP to take screenshots and run visual checks
4. **Feedback Injection** — Failed verifications provide context for next iteration

---

## Phase 1: Monorepo Setup

### Task Prompt

```markdown
# Phase 1: Monorepo Setup

## Goal

Create a Turborepo monorepo structure for the ralph-gpu project.

## Requirements

### Root Configuration

1. Initialize pnpm workspace with `pnpm-workspace.yaml`
2. Create root `package.json` with:
   - name: "ralph-gpu"
   - private: true
   - workspaces configuration
   - Scripts: `dev`, `build`, `test`, `lint`, `typecheck`
3. Create `turbo.json` with pipeline for: build, dev, test, lint, typecheck
4. Create root `tsconfig.json` with strict mode

### packages/core Setup

1. Create `packages/core/package.json`:
   - name: "ralph-gpu"
   - main: "dist/index.js"
   - module: "dist/index.mjs"
   - types: "dist/index.d.ts"
   - exports configuration
   - Dependencies: (none for core runtime)
   - DevDependencies: typescript, webpack, webpack-cli, swc-loader, @swc/core, vitest
2. Create Webpack config with SWC for transpilation
3. Create tsconfig.json extending root
4. Create basic src/index.ts with placeholder export

### apps/examples Setup

1. Create Next.js 14 app with App Router
2. Configure to use ralph-gpu from workspace
3. Create basic layout and home page
4. Add script to run dev server

## Completion Criteria

- [ ] `pnpm install` succeeds
- [ ] `pnpm build` succeeds (builds core package)
- [ ] `pnpm dev --filter=examples` starts Next.js dev server
- [ ] `pnpm typecheck` passes
```

### Tools Required

| Tool         | Purpose                          |
| ------------ | -------------------------------- |
| `writeFile`  | Create configuration files       |
| `runCommand` | Run pnpm install, build commands |
| `readFile`   | Check generated files            |
| `listFiles`  | Verify structure                 |

### Verification

```typescript
verifyCompletion: async ({ result }) => {
  // Run type-check
  const typecheck = await runCommand("pnpm typecheck");
  if (typecheck.exitCode !== 0) {
    return {
      complete: false,
      reason: `Type-check failed:\n${typecheck.stderr}`,
    };
  }

  // Run build
  const build = await runCommand("pnpm build");
  if (build.exitCode !== 0) {
    return { complete: false, reason: `Build failed:\n${build.stderr}` };
  }

  // Check dist exists
  const distExists = await fileExists("packages/core/dist/index.js");
  if (!distExists) {
    return { complete: false, reason: "Build did not produce dist/index.js" };
  }

  return { complete: true, reason: "Monorepo setup complete" };
};
```

---

## Phase 2: Core Library Implementation

### Task Prompt

```markdown
# Phase 2: Core Library Implementation

## Reference

Read DX_EXAMPLES.md for the complete API specification.

## Goal

Implement the ralph-gpu core library following the API design in DX_EXAMPLES.md.

## Implementation Order

### Step 1: Types and Errors (src/types.ts, src/errors.ts)

- Define all TypeScript interfaces
- Create custom error classes: WebGPUNotSupportedError, DeviceCreationError, ShaderCompileError

### Step 2: GPU Context (src/context.ts)

- `gpu.isSupported()` — Check WebGPU support
- `gpu.init(canvas, options)` — Initialize context
- Context properties: width, height, time, timeScale, paused, autoClear
- Context methods: setTarget, setViewport, setScissor, clear, resize, dispose, readPixels

### Step 3: Render Targets (src/target.ts)

- `ctx.target(width, height, options)` — Create render target
- Support format, filter, wrap options
- Implement resize, readPixels, dispose

### Step 4: Ping-Pong Buffers (src/ping-pong.ts)

- `ctx.pingPong(width, height, options)` — Create ping-pong pair
- Properties: read, write
- Methods: swap, resize, dispose

### Step 5: Passes (src/pass.ts)

- `ctx.pass(fragmentWGSL, options)` — Create fullscreen pass
- Handle uniforms with { value: X } pattern
- Implement draw(), storage(), dispose()
- Lazy compilation with eager start

### Step 6: Materials (src/material.ts)

- `ctx.material(wgsl, options)` — Create custom geometry material
- Support vertexCount, instances, blend modes
- Same uniform handling as Pass

### Step 7: Compute Shaders (src/compute.ts)

- `ctx.compute(wgsl, options)` — Create compute shader
- Implement dispatch(x, y?, z?)

### Step 8: Storage Buffers (src/storage.ts)

- `ctx.storage(byteSize)` — Create storage buffer
- Implement dispose()

### Step 9: MRT (src/mrt.ts)

- `ctx.mrt(outputs, width, height)` — Create multiple render targets

### Step 10: Auto Uniforms (src/uniforms.ts)

- Inject globals struct: resolution, time, deltaTime, frame, aspect
- Update on each frame

## Testing Requirements

- Write unit tests for each module using Vitest
- Test error cases (WebGPU not supported, shader errors)
- Mock WebGPU API for unit tests

## Completion Criteria

- [ ] All TypeScript compiles without errors
- [ ] All tests pass (`pnpm test`)
- [ ] Build succeeds (`pnpm build`)
- [ ] Exports match DX_EXAMPLES.md API
```

### Tools Required

| Tool         | Purpose                                |
| ------------ | -------------------------------------- |
| `writeFile`  | Create source files                    |
| `editFile`   | Modify existing files (more efficient) |
| `readFile`   | Read DX_EXAMPLES.md, check files       |
| `runCommand` | Run tests, build, type-check           |
| `listFiles`  | Navigate codebase                      |

### Verification

```typescript
verifyCompletion: async ({ result }) => {
  // Type-check
  const typecheck = await runCommand("pnpm typecheck");
  if (typecheck.exitCode !== 0) {
    return { complete: false, reason: `Type errors:\n${typecheck.stderr}` };
  }

  // Tests
  const tests = await runCommand("pnpm test --run");
  if (tests.exitCode !== 0) {
    return {
      complete: false,
      reason: `Tests failed:\n${tests.stdout}\n${tests.stderr}`,
    };
  }

  // Build
  const build = await runCommand("pnpm build");
  if (build.exitCode !== 0) {
    return { complete: false, reason: `Build failed:\n${build.stderr}` };
  }

  // Check exports exist
  const indexContent = await readFile("packages/core/src/index.ts");
  const requiredExports = [
    "gpu",
    "WebGPUNotSupportedError",
    "ShaderCompileError",
  ];
  for (const exp of requiredExports) {
    if (!indexContent.includes(exp)) {
      return { complete: false, reason: `Missing export: ${exp}` };
    }
  }

  return { complete: true, reason: "Core library implementation complete" };
};
```

---

## Phase 3: Examples App

### Task Prompt

```markdown
# Phase 3: Examples App

## Goal

Create a Next.js app showcasing ralph-gpu with interactive shader examples.

## Examples to Implement

### 1. Basic Gradient (/basic)

- Simple fullscreen gradient shader
- Demonstrates: ctx.pass(), globals.resolution, globals.time

### 2. Custom Uniforms (/uniforms)

- Animated wave with controllable parameters
- Demonstrates: uniforms with { value: X }, reactive updates

### 3. Render Target (/render-target)

- Render to texture, then blur and display
- Demonstrates: ctx.target(), ctx.setTarget(), texture sampling

### 4. Ping-Pong (/ping-pong)

- Game of Life or diffusion simulation
- Demonstrates: ctx.pingPong(), swap(), iterative effects

### 5. Particles (/particles)

- GPU particle system with compute shaders
- Demonstrates: ctx.material(), ctx.compute(), ctx.storage(), instancing

### 6. Fluid Simulation (/fluid)

- Interactive fluid effect with mouse interaction
- Demonstrates: Multiple passes, ping-pong, complex shader pipelines

## UI Requirements

- Each page should have:
  - Full-viewport canvas
  - Title overlay with example name
  - "View Source" button linking to code
  - Back to home link
- Home page with grid of example cards

## Completion Criteria

- [ ] Dev server starts without errors
- [ ] All 6 example pages render correctly
- [ ] No console errors
- [ ] Screenshots show expected visuals
- [ ] Interactive examples respond to mouse
```

### Tools Required

| Tool              | Purpose                                |
| ----------------- | -------------------------------------- |
| `writeFile`       | Create pages, components               |
| `editFile`        | Modify files                           |
| `startDevServer`  | Run Next.js dev server                 |
| `takeScreenshot`  | Visual verification via Playwright MCP |
| `browserInteract` | Test interactivity                     |
| `runCommand`      | Build, lint                            |

### Verification with Playwright MCP

```typescript
verifyCompletion: async ({ result }) => {
  // Start dev server
  await startDevServer("pnpm dev --filter=examples");
  await wait(5000); // Wait for server

  const baseUrl = "http://localhost:3000";
  const pages = [
    "/",
    "/basic",
    "/uniforms",
    "/render-target",
    "/ping-pong",
    "/particles",
    "/fluid",
  ];

  for (const page of pages) {
    // Navigate to page
    await browserNavigate(`${baseUrl}${page}`);
    await wait(2000);

    // Take screenshot
    const screenshot = await takeScreenshot(
      `example${page.replace("/", "-") || "-home"}.png`
    );

    // Check for errors in console
    const consoleMessages = await browserConsoleMessages();
    const errors = consoleMessages.filter((m) => m.level === "error");
    if (errors.length > 0) {
      return {
        complete: false,
        reason: `Console errors on ${page}:\n${errors
          .map((e) => e.text)
          .join("\n")}`,
      };
    }

    // Visual check - ensure canvas is not black/empty
    // The screenshot analysis would check for actual rendered content
  }

  // Test interactivity on fluid page
  await browserNavigate(`${baseUrl}/fluid`);
  await wait(2000);
  await browserInteract({ action: "move", x: 300, y: 300 });
  await browserInteract({ action: "move", x: 500, y: 400 });
  await wait(1000);
  const fluidScreenshot = await takeScreenshot("fluid-interaction.png");

  // Check that fluid moved (screenshot analysis)

  return { complete: true, reason: "All examples render correctly" };
};
```

---

## Tools Configuration

### File Operations

```typescript
import { z } from "zod";

const tools = {
  readFile: {
    description: "Read a file from the project",
    inputSchema: z.object({
      path: z.string(),
      lineStart: z.number().optional(),
      lineEnd: z.number().optional(),
    }),
    execute: async ({
      path,
      lineStart,
      lineEnd,
    }: {
      path: string;
      lineStart?: number;
      lineEnd?: number;
    }) => {
      // Implementation
    },
  },

  writeFile: {
    description: "Write content to a file",
    inputSchema: z.object({
      path: z.string(),
      content: z.string(),
    }),
    execute: async ({ path, content }: { path: string; content: string }) => {
      // Implementation
    },
  },

  editFile: {
    description:
      "Search and replace in a file (more efficient than full rewrite)",
    inputSchema: z.object({
      path: z.string(),
      searchText: z.string(),
      replaceText: z.string(),
    }),
    execute: async ({
      path,
      searchText,
      replaceText,
    }: {
      path: string;
      searchText: string;
      replaceText: string;
    }) => {
      // Implementation
    },
  },

  deleteFile: {
    description: "Delete a file",
    inputSchema: z.object({
      path: z.string(),
    }),
    execute: async ({ path }: { path: string }) => {
      // Implementation
    },
  },

  listFiles: {
    description: "List files matching a glob pattern",
    inputSchema: z.object({
      pattern: z.string(),
    }),
    execute: async ({ pattern }: { pattern: string }) => {
      // Implementation
    },
  },
};
```

### Command Execution

```typescript
const commandTools = {
  runCommand: {
    description: "Run a shell command",
    inputSchema: z.object({
      command: z.string(),
      cwd: z.string().optional(),
      background: z.boolean().optional(),
    }),
    execute: async ({
      command,
      cwd,
      background,
    }: {
      command: string;
      cwd?: string;
      background?: boolean;
    }) => {
      // Implementation - returns { stdout, stderr, exitCode }
    },
  },

  startDevServer: {
    description: "Start a development server in the background",
    inputSchema: z.object({
      command: z.string(),
    }),
    execute: async ({ command }: { command: string }) => {
      // Implementation - starts server, returns URL
    },
  },
};
```

### Playwright MCP Tools

The Playwright MCP provides these tools automatically:

```typescript
// Available via Playwright MCP
const playwrightTools = {
  browser_navigate: { url: string },
  browser_snapshot: {}, // Get accessibility tree
  browser_take_screenshot: { filename: string },
  browser_click: { element: string, ref: string },
  browser_type: { element: string, ref: string, text: string },
  browser_console_messages: { level: string },
  browser_wait_for: { text: string, time: number },
};
```

### Completion Marker

```typescript
const completionTools = {
  markComplete: {
    description: "Mark the current task as complete",
    inputSchema: z.object({
      summary: z.string().describe("Summary of what was accomplished"),
      filesModified: z
        .array(z.string())
        .describe("List of files created/modified"),
    }),
    execute: async ({
      summary,
      filesModified,
    }: {
      summary: string;
      filesModified: string[];
    }) => {
      return { complete: true, summary, filesModified };
    },
  },
};
```

---

## Verification Strategy

### Automated Checks

| Check      | Tool              | When            |
| ---------- | ----------------- | --------------- |
| TypeScript | `pnpm typecheck`  | Every iteration |
| Tests      | `pnpm test --run` | Every iteration |
| Build      | `pnpm build`      | Every iteration |
| Lint       | `pnpm lint`       | Every iteration |

### Visual Verification (Playwright MCP)

```typescript
async function verifyVisuals(pages: string[]) {
  const results = [];

  for (const page of pages) {
    await mcp_playwright_browser_navigate({
      url: `http://localhost:3000${page}`,
    });
    await mcp_playwright_browser_wait_for({ time: 2 });

    // Get snapshot for accessibility
    const snapshot = await mcp_playwright_browser_snapshot({});

    // Take screenshot for visual check
    const screenshot = await mcp_playwright_browser_take_screenshot({
      filename: `verify-${page.replace("/", "")}.png`,
    });

    // Check console for errors
    const console = await mcp_playwright_browser_console_messages({
      level: "error",
    });

    results.push({
      page,
      hasCanvas: snapshot.includes("canvas"),
      errorCount: console.length,
      screenshot,
    });
  }

  return results;
}
```

### Judge Agent (Optional)

For complex verification, use a separate "Judge" agent:

```typescript
async function runJudge(prompt: string, summary: string, files: string[]) {
  const result = await generateText({
    model: "anthropic/claude-sonnet-4",
    system: `You are a code reviewer. Evaluate if the task was completed correctly.
    
    Return JSON: { "approved": boolean, "feedback": string }`,
    prompt: `
    Original Task: ${prompt}
    
    Summary: ${summary}
    
    Files Modified: ${files.join(", ")}
    
    Evaluate the completion.
    `,
  });

  return JSON.parse(result.text);
}
```

---

## Stop Conditions

```typescript
import { iterationCountIs, tokenCountIs, costIs } from "ralph-loop-agent";

// Stop when ANY condition is met
const stopWhen = [
  iterationCountIs(30), // Max 30 iterations
  tokenCountIs(500_000), // Max 500k tokens
  costIs(20.0), // Max $20
];
```

### Per-Phase Limits

| Phase             | Max Iterations | Max Tokens | Max Cost |
| ----------------- | -------------- | ---------- | -------- |
| Phase 1: Monorepo | 10             | 100,000    | $5       |
| Phase 2: Core     | 30             | 500,000    | $20      |
| Phase 3: Examples | 20             | 300,000    | $15      |

---

## Environment Setup

### Required Environment Variables

```bash
# .env file

# AI Provider (pick one)
ANTHROPIC_API_KEY=sk-ant-...
# or
OPENAI_API_KEY=sk-...

# Optional: For Vercel Sandbox (if using)
SANDBOX_VERCEL_TOKEN=...
SANDBOX_VERCEL_TEAM_ID=...
SANDBOX_VERCEL_PROJECT_ID=...
```

### Install Dependencies

```bash
# Clone ralph-loop-agent
git clone https://github.com/vercel-labs/ralph-loop-agent.git
cd ralph-loop-agent
pnpm install

# Or install as package
pnpm add ralph-loop-agent ai zod
```

---

## Running the Agent

### Full Agent Setup

```typescript
// ralph-agent.ts
import "dotenv/config";
import {
  RalphLoopAgent,
  iterationCountIs,
  tokenCountIs,
  costIs,
} from "ralph-loop-agent";
import { createTools } from "./tools";
import { createVerification } from "./verification";

const PHASES = [
  { name: "monorepo-setup", promptFile: "./prompts/phase1.md" },
  { name: "core-implementation", promptFile: "./prompts/phase2.md" },
  { name: "examples-app", promptFile: "./prompts/phase3.md" },
];

async function runPhase(phase: (typeof PHASES)[0]) {
  const prompt = await fs.readFile(phase.promptFile, "utf-8");

  const agent = new RalphLoopAgent({
    model: "anthropic/claude-opus-4.5",
    instructions: `You are building the ralph-gpu WebGPU library.
    
Reference: Read DX_EXAMPLES.md for the API specification.

Guidelines:
- Make incremental changes
- Run tests after each significant change
- Use editFile for small changes (more efficient)
- Use writeFile for new files
- Always verify your work compiles before marking complete`,

    tools: createTools(),

    stopWhen: [iterationCountIs(30), tokenCountIs(500_000), costIs(20.0)],

    verifyCompletion: createVerification(phase.name),

    onIterationStart: ({ iteration }) => {
      console.log(`\n=== Iteration ${iteration} ===\n`);
    },

    onIterationEnd: ({ iteration, duration, result }) => {
      console.log(`\nIteration ${iteration} completed in ${duration}ms`);
      console.log(`Tokens: ${result.usage.totalTokens}`);
    },
  });

  const result = await agent.loop({ prompt });

  console.log("\n=== Phase Complete ===");
  console.log(`Status: ${result.completionReason}`);
  console.log(`Iterations: ${result.iterations}`);
  console.log(`Reason: ${result.reason}`);

  return result;
}

async function main() {
  for (const phase of PHASES) {
    console.log(`\n\n========== ${phase.name.toUpperCase()} ==========\n`);
    const result = await runPhase(phase);

    if (result.completionReason !== "verified") {
      console.error(`Phase ${phase.name} did not complete successfully`);
      process.exit(1);
    }
  }

  console.log("\n\n========== ALL PHASES COMPLETE ==========\n");
}

main();
```

### CLI Usage

```bash
# Run all phases
pnpm tsx ralph-agent.ts

# Run specific phase
pnpm tsx ralph-agent.ts --phase=core-implementation

# Run with prompt file
pnpm tsx ralph-agent.ts ./custom-task.md

# Interactive mode (Plan Mode)
pnpm tsx ralph-agent.ts ./ralph-gpu
```

---

## Summary

### What the Agent Will Do

1. **Phase 1**: Set up Turborepo monorepo with packages/core and apps/examples
2. **Phase 2**: Implement the entire ralph-gpu core library following DX_EXAMPLES.md
3. **Phase 3**: Create 6 interactive shader examples in Next.js

### Validation Methods

- **TypeScript**: Type-check must pass
- **Tests**: All Vitest tests must pass
- **Build**: Webpack build must succeed
- **Visual**: Playwright MCP takes screenshots to verify rendering
- **Interactive**: Playwright MCP tests mouse interactions

### Success Criteria

The agent is complete when:

1. ✅ `pnpm install` succeeds
2. ✅ `pnpm typecheck` passes
3. ✅ `pnpm test` passes
4. ✅ `pnpm build` succeeds
5. ✅ Examples app renders all 6 pages
6. ✅ No console errors
7. ✅ Interactive examples respond to input

---

## Next Steps

1. **Set up environment** — Create `.env` with API keys
2. **Install dependencies** — `pnpm add ralph-loop-agent ai zod`
3. **Create prompt files** — Save phase prompts to `./prompts/`
4. **Implement tools** — Create file/command tools
5. **Run Phase 1** — Start with monorepo setup
6. **Iterate** — Let the agent work, review results, adjust as needed

---

_This plan is designed to be executed by an AI agent using the Ralph Loop methodology._
