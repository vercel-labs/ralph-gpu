# Repository Context

## Project Overview

**ralph-gpu** is a monorepo containing two main projects:

1. **ralph-gpu** - A minimal, ergonomic WebGPU shader library for creative coding and real-time graphics
2. **@ralph/core** - An autonomous AI agent loop library (the "Ralph Wiggum pattern")

The repository combines these libraries with example applications and AI agent workspaces.

## Tech Stack

| Technology | Purpose |
|------------|---------|
| TypeScript | Primary language |
| pnpm | Package manager with workspace support |
| Turborepo | Monorepo build orchestration |
| WebGPU | GPU graphics API (via ralph-gpu) |
| Vercel AI SDK | AI model integration (via @ralph/core) |
| Next.js | Examples app framework |
| Vitest | Testing framework |
| Webpack + SWC | Bundling for ralph-gpu |
| tsup | Bundling for @ralph/core |
| Playwright | Browser automation in AI agents |

## Project Structure

```
ralph-gpu/
├── packages/
│   ├── core/           # ralph-gpu WebGPU library
│   └── ralph/          # @ralph/core AI agent library
├── apps/
│   └── examples/       # Next.js examples app
├── ralphs/             # AI agent workspace
│   └── 01-init/        # Example AI agent
├── .brain/             # Persistent knowledge store
├── .plans/             # Planning documents
├── .references/        # Reference materials
└── .playwright-mcp/    # Playwright MCP integration
```

## Packages

### `ralph-gpu` (packages/core)

A minimal WebGPU shader library featuring:
- Simple API for fullscreen shader passes
- Auto-injected uniforms (time, resolution, frame, etc.)
- Ping-pong buffers for iterative effects
- Compute shaders support
- Storage buffers for particles/simulations
- Render targets with configurable formats
- Blend modes (additive, alpha, multiply, etc.)

**Key Files:**
- `src/context.ts` - Main GPU context class
- `src/pass.ts` - Fullscreen shader pass implementation
- `src/material.ts` - Custom geometry/vertex shader support
- `src/compute.ts` - Compute shader implementation
- `src/target.ts` - Render target management
- `src/ping-pong.ts` - Ping-pong buffer for iterative effects
- `src/uniforms.ts` - Uniform handling and auto-injection
- `src/errors.ts` - Custom error types

### `@ralph/core` (packages/ralph)

An autonomous AI agent loop library featuring:
- Agent loop with iteration limits and cost tracking
- Tool system with Zod validation
- Built-in browser automation tools
- File system and bash execution tools
- Stuck detection and recovery
- Structured logging

**Key Files:**
- `src/loop.ts` - Main agent loop implementation
- `src/agent.ts` - Agent configuration and setup
- `src/tools/` - Built-in tool implementations
- `src/managers/` - Resource managers (browser, processes)
- `src/stuck.ts` - Stuck detection logic
- `src/logger.ts` - Logging system
- `src/types.ts` - TypeScript type definitions

### `examples` (apps/examples)

A Next.js application showcasing ralph-gpu usage with interactive WebGPU shader demos.

## Key Files

| File | Description |
|------|-------------|
| `package.json` | Root workspace configuration |
| `pnpm-workspace.yaml` | Workspace package definitions |
| `turbo.json` | Turborepo task configuration |
| `tsconfig.json` | Root TypeScript configuration |
| `RALPH_IMPLEMENTATION_PLAN.md` | Detailed implementation plan |
| `PROGRESS_SUMMARY.md` | Development progress tracking |
| `DX_EXAMPLES.md` | Developer experience examples |

## Setup

### Prerequisites

- Node.js >= 18.0.0
- pnpm >= 9.0.0

### Installation

```bash
# Install dependencies
pnpm install

# Build all packages
pnpm build
```

### Development

```bash
# Start all dev servers
pnpm dev

# Run tests
pnpm test

# Type checking
pnpm typecheck
```

### Package-specific commands

```bash
# ralph-gpu
cd packages/core
pnpm dev        # Watch mode
pnpm build      # Production build
pnpm test       # Run tests

# @ralph/core
cd packages/ralph
pnpm dev        # Watch mode
pnpm build      # Production build
pnpm test       # Run tests

# Examples app
cd apps/examples
pnpm dev        # Start Next.js dev server
pnpm build      # Production build
```

## Notes

- WebGPU requires Chrome 113+, Edge 113+, Safari 17+, or Firefox Nightly
- Always check `gpu.isSupported()` before initializing ralph-gpu
- The `ralphs/` directory contains AI agent workspaces using @ralph/core
