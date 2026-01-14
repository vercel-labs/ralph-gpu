/**
 * 34-debug-example: Phase 4 - Create debug-profiler example page
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
# Task: Phase 4 - Create Debug/Profiler Example Page

## Working Directory & Navigation
This script is running from: ${process.cwd()}
Project root is: ${PROJECT_ROOT}

### Repository Structure
\`\`\`
ralph-gpu/                    (project root)
├── packages/
│   ├── core/                 (ralph-gpu library)
│   │   └── src/
│   │       ├── events.ts     (event types)
│   │       ├── profiler.ts   (Profiler class)
│   │       └── index.ts      (exports)
│   └── ralph/
├── apps/
│   └── examples/             (Next.js examples app - TARGET)
│       └── app/
│           ├── basic/        (existing example)
│           ├── compute/      (existing example)
│           └── debug-profiler/ (NEW - create this)
│               └── page.tsx
├── plans/
│   └── DEBUG-SYSTEM-PLAN.md  (has example code)
└── ralphs/
    └── 34-debug-example/     (← YOU ARE HERE)
\`\`\`

## CRITICAL: Update Progress
After EVERY significant action, update .progress.md in this folder:
- Path: ${process.cwd()}/.progress.md

## Context
The event system and Profiler are implemented. Now we need to create an example page
that demonstrates the debug/profiler functionality.

## Reference Files
- Read ${PROJECT_ROOT}/plans/DEBUG-SYSTEM-PLAN.md for example code
- Look at existing examples in apps/examples/app/ for pattern to follow
- Read ${PROJECT_ROOT}/packages/core/src/profiler.ts for Profiler API

## Acceptance Criteria (ALL MUST BE MET)

### 1. Create debug-profiler example page
- [ ] Create apps/examples/app/debug-profiler/page.tsx
- [ ] Follow the pattern of other example pages (check apps/examples/app/basic/page.tsx)

### 2. Demonstrate event system
- [ ] Initialize GPUContext with events enabled: { events: { enabled: true } }
- [ ] Subscribe to events and log them to console
- [ ] Show different event types being emitted (draw, frame, etc.)

### 3. Demonstrate Profiler usage
- [ ] Create Profiler instance
- [ ] Use begin()/end() for custom regions
- [ ] Display frame time stats
- [ ] Display region stats

### 4. Create a simple UI
- [ ] Show FPS counter
- [ ] Show frame time (avg, min, max)
- [ ] Show custom region timing
- [ ] Keep it simple - text overlay is fine

### 5. Build & Verify
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
done({ summary: "Created debug-profiler example page that demonstrates event system and Profiler API with FPS counter and region stats. Build passes." })

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

  console.log("🚀 Starting ralph-34: Debug/Profiler Example\n");

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
