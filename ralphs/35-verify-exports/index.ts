/**
 * 35-verify-exports: Phase 5 - Verify exports and bundle size
 */

import "dotenv/config";
import { LoopAgent, trackProgressRule, minimalChangesRule, completionRule } from "@ralph/agent-loop";

const AI_GATEWAY_API_KEY = process.env.AI_GATEWAY_API_KEY;
const AGENT_MODEL = process.env.AGENT_MODEL || "anthropic/claude-sonnet-4-20250514";
const PROJECT_ROOT = "/Users/matiasgf/repos/experiments/ralph-gpu";

if (!AI_GATEWAY_API_KEY) {
  console.error("❌ Missing AI_GATEWAY_API_KEY");
  process.exit(1);
}

const DEBUG = process.env.DEBUG === "true" || process.argv.includes("--debug");

const TASK = `
# Task: Phase 5 - Verify Exports and Bundle Size

## Working Directory & Navigation
This script is running from: ${process.cwd()}
Project root is: ${PROJECT_ROOT}

### Repository Structure
\`\`\`
ralph-gpu/                    (project root)
├── packages/
│   ├── core/                 (ralph-gpu library)
│   │   ├── src/
│   │   │   ├── events.ts     (event types)
│   │   │   ├── event-emitter.ts (EventEmitter)
│   │   │   ├── profiler.ts   (Profiler class)
│   │   │   └── index.ts      (exports - VERIFY)
│   │   └── dist/             (built output)
│   │       └── bundle-size.json
│   └── ralph/
└── ralphs/
    └── 35-verify-exports/    (← YOU ARE HERE)
\`\`\`

## CRITICAL: Update Progress
After EVERY significant action, update .progress.md in this folder:
- Path: ${process.cwd()}/.progress.md

## Context
The debug system is complete. Now we need to verify all exports are correct
and check the bundle size impact.

## Acceptance Criteria (ALL MUST BE MET)

### 1. Verify index.ts exports all debug/profiler types
- [ ] Read packages/core/src/index.ts
- [ ] Ensure EventEmitter is exported
- [ ] Ensure Profiler is exported
- [ ] Ensure all event types are exported (GPUEvent, DrawEvent, ComputeEvent, etc.)
- [ ] Ensure EventType union type is exported
- [ ] Add any missing exports

### 2. Verify bundle size
- [ ] Run pnpm build
- [ ] Check packages/core/dist/bundle-size.json
- [ ] Note the bundle size (should be reasonable, <50KB gzipped)

### 3. Update documentation (if time permits)
- [ ] Check if .cursor/rules/ralph-gpu.mdc exists
- [ ] Add a brief section about events and profiler API (optional)

### 4. Build & Verify
- [ ] Run: cd ${PROJECT_ROOT} && pnpm build (must succeed)
- [ ] No TypeScript errors
- [ ] All exports accessible

## Testing Commands
\`\`\`bash
cd ${PROJECT_ROOT}
pnpm build
cat packages/core/dist/bundle-size.json
\`\`\`

## CRITICAL: When to Stop

**You MUST call the done tool when:**
1. All exports are verified
2. The build passes with pnpm build

**Call done like this:**
done({ summary: "Verified all debug/profiler exports in index.ts. Bundle size is X KB gzipped. Build passes." })

**DO NOT keep iterating once the task is complete. Call done() immediately after verifying the build passes.**
`;

async function main() {
  const startTime = Date.now();

  const agent = new LoopAgent({
    model: AGENT_MODEL,
    trace: true,
    task: TASK,
    rules: [trackProgressRule, minimalChangesRule, completionRule],
    debug: DEBUG,
    limits: {
      maxIterations: 30,
      maxCost: 10.0,
      timeout: "30m",
    },
    onUpdate: (status) => {
      const elapsed = ((Date.now() - startTime) / 1000).toFixed(1);
      console.log(
        `[${elapsed}s] Iteration ${status.iteration} | State: ${status.state} | Cost: $${status.cost.toFixed(4)}`
      );
    },
    onStuck: async (ctx) => {
      console.log(`\n⚠️ Agent stuck: ${ctx.reason}`);
      return "Try a different approach. Update .progress.md with what you tried.";
    },
    onError: (error) => {
      console.error(`\n❌ Error: ${error.message}`);
    },
  });

  console.log("🚀 Starting ralph-35: Verify Exports\n");

  const result = await agent.run();

  console.log("\n📊 Results");
  console.log(`✅ Success: ${result.success}`);
  console.log(`🔄 Iterations: ${result.iterations}`);
  console.log(`💰 Cost: $${result.cost.toFixed(4)}`);
  console.log(`⏱️ Duration: ${(result.elapsed / 1000).toFixed(1)}s`);

  if (!result.success) {
    console.error(`\n❌ Agent failed: ${result.reason}`);
    process.exit(1);
  }

  process.exit(0);
}

main().catch((error) => {
  console.error("Fatal error:", error);
  process.exit(1);
});
