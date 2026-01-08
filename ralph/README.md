# Ralph GPU Builder

Autonomous AI agent for building the `ralph-gpu` WebGPU shader library.

## Overview

This directory contains the Ralph Loop Agent implementation that builds the ralph-gpu library in three phases:

1. **Monorepo Setup** — Configure Turborepo, pnpm workspace, build tooling
2. **Core Implementation** — Build the complete ralph-gpu library
3. **Examples App** — Create interactive shader examples in Next.js

## Prerequisites

- Node.js 18+ and pnpm
- API key for Anthropic (Claude) or OpenAI
- Basic understanding of the Ralph Loop methodology

## Installation

```bash
cd ralph
pnpm install
```

## Configuration

Create a `.env` file (use `.env.example` as template):

```bash
# Required: AI API key
ANTHROPIC_API_KEY=sk-ant-...
# or
# OPENAI_API_KEY=sk-...

# Optional: Custom project root
PROJECT_ROOT=../

# Optional: Custom model
AGENT_MODEL=anthropic/claude-opus-4.5

# RECOMMENDED: Enable visual verification with Playwright MCP
ENABLE_PLAYWRIGHT_MCP=true
```

**Visual Testing**: Enabling Playwright MCP allows the agent to verify that shaders actually render, not just compile. This is critical for a graphics library! See `PLAYWRIGHT_SETUP.md` for details.

## Usage

### Run All Phases

```bash
pnpm agent
```

This will run all three phases sequentially. The agent will stop if any phase fails.

### Run Specific Phase

```bash
# Phase 1: Monorepo setup
pnpm phase1

# Phase 2: Core implementation
pnpm phase2

# Phase 3: Examples app
pnpm phase3
```

Or use the CLI directly:

```bash
pnpm tsx ralph-agent.ts --phase=monorepo-setup
pnpm tsx ralph-agent.ts --phase=core-implementation
pnpm tsx ralph-agent.ts --phase=examples-app
```

## How It Works

### Architecture

```
┌─────────────────────────────────────┐
│    Ralph Loop (outer iteration)    │
│  ┌───────────────────────────────┐  │
│  │  AI SDK Tool Loop (inner)     │  │
│  │  LLM ↔ tools ↔ LLM ...       │  │
│  └───────────────────────────────┘  │
│              ↓                      │
│    verifyCompletion (checks)        │
│    - Type-check passes?             │
│    - Tests pass?                    │
│    - Build succeeds?                │
│              ↓                      │
│   Complete? → Done | Continue       │
└─────────────────────────────────────┘
```

### Tools Available

The agent has access to:

- `readFile` — Read project files (with line range support)
- `writeFile` — Create or overwrite files
- `editFile` — Search and replace (efficient for small changes)
- `deleteFile` — Remove files
- `listFiles` — Glob-based file listing
- `runCommand` — Execute shell commands (npm, pnpm, build, test)
- `fileExists` — Check if path exists
- `markComplete` — Signal task completion

### Verification

Each phase has custom verification logic:

- **Phase 1**: Checks that `pnpm install`, `typecheck`, and `build` all pass
- **Phase 2**: Verifies tests pass and all exports are present
- **Phase 3**: Ensures Next.js app builds without errors

### Stop Conditions

The agent stops when:

- Task is verified complete
- Max iterations reached (10-30 depending on phase)
- Max tokens consumed (100k-500k)
- Max cost reached ($5-$20)

## Project Structure

```
ralph/
├── ralph-agent.ts         # Main orchestrator
├── tools/
│   └── index.ts           # Tool implementations
├── verification.ts        # Phase verification logic
├── utils/
│   └── logger.ts          # Logging utilities
├── prompts/
│   ├── phase1.md          # Monorepo setup prompt
│   ├── phase2.md          # Core implementation prompt
│   └── phase3.md          # Examples app prompt
├── package.json           # Dependencies
├── tsconfig.json          # TypeScript config
└── .env                   # Environment variables
```

## Monitoring Progress

The agent provides detailed logging:

- **Iteration start/end** — Shows progress through iterations
- **Tool calls** — Displays what the agent is doing
- **Token usage** — Tracks input/output tokens and estimated cost
- **Verification results** — Shows what passed/failed

Example output:

```
━━━ Phase: Core Library Implementation ━━━

━━━ Iteration 1 ━━━
  Duration: 12453ms
  Steps: 8
  
  Usage (Iteration 1):
    Input:  12,543 tokens
    Output: 3,821 tokens
    Total:  16,364 tokens
    Cost:   ~$0.3401

━━━ Iteration 2 ━━━
  ...
```

## Troubleshooting

### Agent gets stuck in loop

- Check verification logic — it might be too strict
- Review last iteration's output for clues
- Manually fix the issue and resume

### Build fails

- The agent should auto-fix most issues
- If not, check error messages in agent output
- Verify your Node.js version (18+)

### Token limit reached

- Increase limits in phase configuration
- Or split complex tasks into smaller phases

### Cost concerns

- Use Claude Sonnet (cheaper) instead of Opus
- Set stricter cost limits in stop conditions
- Monitor usage during test runs

## Development

### Modifying Prompts

Edit files in `prompts/` to adjust agent behavior:

- Add more specific instructions
- Clarify completion criteria
- Provide examples of expected output

### Adding Tools

Add new tools in `tools/index.ts`:

```typescript
newTool: tool({
  description: "What this tool does",
  parameters: z.object({ ... }),
  execute: async ({ params }) => { ... }
})
```

### Custom Verification

Modify `verification.ts` to add checks:

```typescript
// In phase verification function
const customCheck = await runCheck(
  'your-command',
  projectRoot,
  'Error message'
);
if (!customCheck.success) {
  return { complete: false, reason: '...' };
}
```

## Resources

- [Ralph Loop Agent](https://github.com/vercel-labs/ralph-loop-agent) — Framework documentation
- [Vercel AI SDK](https://sdk.vercel.ai/) — AI SDK docs
- [DX_EXAMPLES.md](../DX_EXAMPLES.md) — API specification for ralph-gpu
- [RALPH_IMPLEMENTATION_PLAN.md](../RALPH_IMPLEMENTATION_PLAN.md) — Detailed implementation plan

## License

Same as parent project (see root LICENSE file).
