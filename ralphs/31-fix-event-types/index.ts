/**
 * 31-fix-event-types: Fix event type mismatches in ralph-gpu core
 */

import "dotenv/config";
import { LoopAgent, trackProgressRule, minimalChangesRule, completionRule } from "@ralph/agent-loop";

// Configuration from environment
const AI_GATEWAY_API_KEY = process.env.AI_GATEWAY_API_KEY;
const AGENT_MODEL = process.env.AGENT_MODEL || "anthropic/claude-sonnet-4-20250514";
const PROJECT_ROOT = "/Users/matiasgf/repos/experiments/ralph-gpu";

if (!AI_GATEWAY_API_KEY) {
  console.error("❌ Missing AI_GATEWAY_API_KEY");
  process.exit(1);
}

const DEBUG = process.env.DEBUG === "true" || process.argv.includes("--debug");

const TASK = `
# Task: Fix Event Type Mismatches

## Working Directory & Navigation
This script is running from: ${process.cwd()}
Project root is: ${PROJECT_ROOT}

### Repository Structure
\`\`\`
ralph-gpu/                    (project root)
├── packages/
│   ├── core/                 (main WebGPU library package - TARGET)
│   │   ├── src/
│   │   │   ├── context.ts    (has type errors - uses "frame:start", "frame:end")
│   │   │   ├── events.ts     (defines event types - SOURCE OF TRUTH)
│   │   │   ├── event-emitter.ts (emitter class)
│   │   │   ├── pass.ts       (has type errors - uses "draw:start", "draw:end")
│   │   │   ├── material.ts   (has type errors - uses "draw:start", "draw:end")
│   │   │   ├── compute.ts    (has type errors - uses "compute:start", "compute:end")
│   │   │   └── ...
│   │   └── package.json
│   └── ralph/
└── ralphs/
    └── 31-fix-event-types/   (← YOU ARE HERE)
\`\`\`

## CRITICAL: Update Progress
After EVERY significant action, update .progress.md in this folder:
- Path: ${process.cwd()}/.progress.md
- Log what you did with timestamp

## Context
The events.ts file defines the event types for the ralph-gpu debug system. However, the code in
compute.ts, context.ts, pass.ts, and material.ts was written with different event type names.

The events.ts uses:
- \`type: "draw"\` (not "draw:start" or "draw:end")
- \`type: "compute"\` (not "compute:start" or "compute:end")
- \`type: "frame"\` with \`phase: "start" | "end"\` field
- \`type: "memory"\` with \`action: "allocate" | "free" | "resize"\`
- \`type: "target"\` with \`action: "set" | "clear" | "resize" | "present"\`

But the code uses:
- \`type: "draw:start"\`, \`type: "draw:end"\` (WRONG)
- \`type: "compute:start"\`, \`type: "compute:end"\` (WRONG)
- \`type: "frame:start"\`, \`type: "frame:end"\` (WRONG - should use type: "frame" with phase field)

## Acceptance Criteria (ALL MUST BE MET)

### 1. Read events.ts to understand the correct event type structure
- [ ] Read packages/core/src/events.ts
- [ ] Note the exact type definitions for DrawEvent, ComputeEvent, FrameEvent, etc.

### 2. Fix compute.ts
- [ ] Change "compute:start" to "compute"
- [ ] Change "compute:end" to "compute"
- [ ] Ensure ComputeEvent fields match the interface

### 3. Fix context.ts
- [ ] Change "frame:start" to "frame" with phase: "start"
- [ ] Change "frame:end" to "frame" with phase: "end"
- [ ] Fix getEventHistory signature if needed
- [ ] Ensure FrameEvent fields match the interface

### 4. Fix pass.ts
- [ ] Change "draw:start" to "draw"
- [ ] Change "draw:end" to "draw"
- [ ] Ensure DrawEvent fields match the interface

### 5. Fix material.ts
- [ ] Change "draw:start" to "draw"
- [ ] Change "draw:end" to "draw"
- [ ] Ensure DrawEvent fields match the interface

### 6. Build & Verify
- [ ] Run: cd ${PROJECT_ROOT} && pnpm build (must succeed)
- [ ] No TypeScript errors
- [ ] All existing functionality preserved

## Testing Commands
\`\`\`bash
cd ${PROJECT_ROOT}
pnpm build
\`\`\`

## Important Notes
- Events.ts is the SOURCE OF TRUTH - do NOT modify it
- Only modify the code to match the event type definitions
- Keep changes minimal and focused
- Follow existing code style

## CRITICAL: When to Stop

**You MUST call the \`done\` tool when:**
1. All acceptance criteria checkboxes are complete
2. The build passes with \`pnpm build\`
3. No TypeScript errors remain

**Call done like this:**
\`\`\`
done({ summary: "Fixed event type mismatches in compute.ts, context.ts, pass.ts, and material.ts to match events.ts definitions. Build passes." })
\`\`\`

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
      maxCost: 15.0,
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

  console.log("🚀 Starting ralph-31: Fix Event Type Mismatches\n");

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
