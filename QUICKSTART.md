# Quick Start Guide

Get the ralph-gpu project built autonomously in minutes.

## Prerequisites

- Node.js 18+ and pnpm installed
- An Anthropic API key (get one at https://console.anthropic.com/)
- 30-60 minutes (depending on API speed)

## Step 1: Install Dependencies

```bash
cd ralph
pnpm install
```

## Step 2: Configure Environment

Create a `.env` file in the `ralph/` directory:

```bash
cp .env.example .env
```

Edit `.env` and add your API key:

```bash
ANTHROPIC_API_KEY=sk-ant-your-key-here

# Enable visual testing (RECOMMENDED)
ENABLE_PLAYWRIGHT_MCP=true
```

**Important**: Enable Playwright MCP for visual verification! This allows the agent to actually test that shaders render correctly, not just that code compiles. See `ralph/PLAYWRIGHT_SETUP.md` for details.

## Step 3: Run the Agent

### Option A: Run All Phases (Recommended)

```bash
pnpm agent
```

This will run all three phases sequentially:

1. Monorepo setup (~5-10 minutes, ~$2-5)
2. Core implementation (~15-30 minutes, ~$10-20)
3. Examples app (~10-20 minutes, ~$5-15)

### Option B: Run Individual Phases

```bash
# Phase 1: Monorepo Setup
pnpm phase1

# After Phase 1 completes, run Phase 2
pnpm phase2

# After Phase 2 completes, run Phase 3
pnpm phase3
```

## Step 4: Monitor Progress

Watch the console output. You'll see:

- Current iteration number
- Tools being called (readFile, writeFile, runCommand, etc.)
- Token usage and estimated cost
- Verification results

Example output:

```
━━━ Phase: Monorepo Setup ━━━

━━━ Iteration 1 ━━━
Duration: 8234ms
Steps: 12

Usage (Iteration 1):
  Input:  8,456 tokens
  Output: 2,134 tokens
  Total:  10,590 tokens
  Cost:   ~$0.2198
```

## Step 5: Test the Result

Once complete, test the built project:

```bash
# From project root (not ralph/)
cd ..

# Install dependencies
pnpm install

# Type-check
pnpm typecheck

# Build
pnpm build

# Run examples dev server
pnpm dev --filter=examples
```

Visit http://localhost:3000 to see the interactive shader examples!

## What Gets Built

```
ralph-gpu/
├── packages/
│   └── core/              # ralph-gpu library
│       ├── src/
│       │   ├── index.ts
│       │   ├── context.ts
│       │   ├── pass.ts
│       │   ├── material.ts
│       │   ├── compute.ts
│       │   ├── target.ts
│       │   ├── ping-pong.ts
│       │   └── ...
│       ├── tests/
│       └── dist/          # Built library
└── apps/
    └── examples/          # Next.js app
        └── app/
            ├── page.tsx         # Home
            ├── basic/           # Basic gradient
            ├── uniforms/        # Custom uniforms
            ├── render-target/   # Offscreen rendering
            ├── ping-pong/       # Iterative effects
            ├── particles/       # GPU particles
            └── fluid/           # Fluid simulation
```

## Troubleshooting

### Agent gets stuck

The agent might iterate multiple times trying to fix issues. If it exceeds max iterations:

1. Check the last error message in the output
2. Manually fix any obvious issues in the generated code
3. Run the remaining phases

### Build errors

If you see TypeScript errors or build failures:

```bash
# Check what went wrong
pnpm typecheck
pnpm build

# The agent should have fixed these, but if not:
# - Review the generated code
# - Check for missing dependencies
# - Ensure WebGPU types are available
```

### "WebGPU not supported" in browser

WebGPU requires:

- Chrome 113+ or Edge 113+
- Firefox Nightly with `dom.webgpu.enabled` flag
- Safari 17+ (partial support)

Use Chrome for best compatibility.

## Cost Estimates

Approximate costs (actual may vary):

| Phase             | Iterations | Tokens        | Cost (Claude Opus 4.5) |
| ----------------- | ---------- | ------------- | ---------------------- |
| Phase 1: Monorepo | 5-10       | 50k-100k      | $2-5                   |
| Phase 2: Core     | 15-30      | 200k-500k     | $10-20                 |
| Phase 3: Examples | 10-20      | 150k-300k     | $5-15                  |
| **Total**         | **30-60**  | **400k-900k** | **$17-40**             |

To reduce costs:

- Use Claude Sonnet 4 instead (3-5x cheaper)
- Set stricter iteration limits
- Review and manually fix issues to reduce iterations

## Next Steps

After the agent completes:

1. **Explore the API** — Read `DX_EXAMPLES.md` for full API documentation
2. **Run examples** — Check out the 6 interactive demos
3. **Build something** — Use ralph-gpu in your own projects
4. **Extend it** — Add new features (3D models, post-processing, etc.)

## Learn More

- [DX_EXAMPLES.md](./DX_EXAMPLES.md) — API reference and examples
- [RALPH_IMPLEMENTATION_PLAN.md](./RALPH_IMPLEMENTATION_PLAN.md) — Detailed implementation plan
- [ralph/README.md](./ralph/README.md) — Ralph agent documentation

## Support

If you run into issues:

1. Check the troubleshooting section above
2. Review the agent's console output for error messages
3. Read the implementation plan for details on what should be built
4. Manually inspect and fix any generated code issues

The agent is designed to be autonomous, but complex codebases may require occasional manual intervention.

---

Happy coding! 🎨✨
