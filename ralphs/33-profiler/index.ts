/**
 * 33-profiler: Phase 3 - Implement Profiler class
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
# Task: Phase 3 - Implement Profiler Class

## Working Directory & Navigation
This script is running from: ${process.cwd()}
Project root is: ${PROJECT_ROOT}

### Repository Structure
\`\`\`
ralph-gpu/                    (project root)
├── packages/
│   ├── core/                 (main WebGPU library package - TARGET)
│   │   ├── src/
│   │   │   ├── events.ts     (event types - reference)
│   │   │   ├── event-emitter.ts (EventEmitter - reference)
│   │   │   ├── context.ts    (GPUContext - provides events)
│   │   │   ├── profiler.ts   (NEW FILE TO CREATE)
│   │   │   └── index.ts      (exports)
│   │   └── package.json
│   └── ralph/
├── plans/
│   └── DEBUG-SYSTEM-PLAN.md  (implementation plan - has Profiler spec)
└── ralphs/
    └── 33-profiler/          (← YOU ARE HERE)
\`\`\`

## CRITICAL: Update Progress
After EVERY significant action, update .progress.md in this folder:
- Path: ${process.cwd()}/.progress.md

## Context
Phase 1 (Event System) and Phase 2 (Emit Events) are complete. Now we need to implement the Profiler
class that consumes events and provides aggregated metrics.

## Reference: Read the DEBUG-SYSTEM-PLAN.md
The plan at ${PROJECT_ROOT}/plans/DEBUG-SYSTEM-PLAN.md has the detailed Profiler specification.
Read it first to understand the API design.

## Acceptance Criteria (ALL MUST BE MET)

### 1. Create profiler.ts with Profiler class
- [ ] Read DEBUG-SYSTEM-PLAN.md to understand Profiler spec
- [ ] Create packages/core/src/profiler.ts
- [ ] Import event types from events.ts

### 2. Implement basic Profiler functionality
- [ ] Constructor takes GPUContext and subscribes to events
- [ ] begin(name) / end(name) for manual region tracking
- [ ] Track region stats: calls, min/max/avg/total time

### 3. Implement frame profiling
- [ ] Listen to frame events (type: "frame" with phase: "start"/"end")
- [ ] Build FrameProfile from events between frame boundaries
- [ ] Track frame time statistics

### 4. Implement query methods
- [ ] getRegion(name) - return single region stats
- [ ] getResults() - return all region stats
- [ ] getFrameStats() - return frame time statistics

### 5. Implement control methods
- [ ] reset() - clear all stats
- [ ] setEnabled(enabled) - pause/resume
- [ ] dispose() - unsubscribe from events

### 6. Export from index.ts
- [ ] Export Profiler class from packages/core/src/index.ts

### 7. Build & Verify
- [ ] Run: cd ${PROJECT_ROOT} && pnpm build (must succeed)
- [ ] No TypeScript errors

## Testing Commands
\`\`\`bash
cd ${PROJECT_ROOT}
pnpm build
\`\`\`

## CRITICAL: When to Stop

**You MUST call the done tool when:**
1. All acceptance criteria checkboxes are complete
2. The build passes with pnpm build

**Call done like this:**
done({ summary: "Created profiler.ts with Profiler class that tracks regions, frame stats, and provides query/control methods. Exported from index.ts. Build passes." })

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
      maxIterations: 40,
      maxCost: 20.0,
      timeout: "60m",
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

  console.log("🚀 Starting ralph-33: Profiler Implementation\n");

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
