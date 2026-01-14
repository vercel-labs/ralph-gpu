/**
 * 32-complete-phase2: Complete Phase 2 of Debug System - Emit remaining events
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
# Task: Complete Phase 2 - Emit Remaining Events

## Working Directory & Navigation
This script is running from: ${process.cwd()}
Project root is: ${PROJECT_ROOT}

### Repository Structure
\`\`\`
ralph-gpu/                    (project root)
├── packages/
│   ├── core/                 (main WebGPU library package - TARGET)
│   │   ├── src/
│   │   │   ├── events.ts     (event type definitions - SOURCE OF TRUTH)
│   │   │   ├── event-emitter.ts (EventEmitter class)
│   │   │   ├── context.ts    (GPUContext - has frame events)
│   │   │   ├── pass.ts       (Pass - has draw events)
│   │   │   ├── material.ts   (Material - has draw events)
│   │   │   ├── compute.ts    (ComputeShader - has compute events)
│   │   │   ├── storage.ts    (StorageBuffer - needs memory events)
│   │   │   ├── target.ts     (RenderTarget - needs memory events)
│   │   │   └── particles.ts  (Particles - needs draw events)
│   │   └── package.json
│   └── ralph/
├── plans/
│   └── DEBUG-SYSTEM-PLAN.md  (implementation plan)
└── ralphs/
    └── 32-complete-phase2/   (← YOU ARE HERE)
\`\`\`

## CRITICAL: Update Progress
After EVERY significant action, update .progress.md in this folder:
- Path: ${process.cwd()}/.progress.md

## Context
Phase 1 is complete - the event system exists. Phase 2 is partially done:
- ✅ Frame events (context.ts)
- ✅ Draw events from Pass and Material
- ✅ Compute events from ComputeShader

Still needed from Phase 2:
- Memory events from StorageBuffer
- Memory events from RenderTarget
- Target events from GPUContext (setTarget, clear)
- Draw events from Particles (if it has a draw method)
- Pipeline events (optional - skip if complex)

## Acceptance Criteria (ALL MUST BE MET)

### 1. First, read the events.ts to understand event structure
- [ ] Read packages/core/src/events.ts
- [ ] Note MemoryEvent structure (type: "memory", action, resourceType, size)
- [ ] Note TargetEvent structure (type: "target", action, target, size)

### 2. Add memory events to StorageBuffer (storage.ts)
- [ ] Import generateEventId and MemoryEvent from events.ts
- [ ] In constructor: emit memory event with action: "allocate"
- [ ] In dispose(): emit memory event with action: "free"
- [ ] StorageBuffer needs context reference - add it if missing

### 3. Add memory events to RenderTarget (target.ts)
- [ ] Import generateEventId and MemoryEvent from events.ts  
- [ ] In constructor: emit memory event with action: "allocate"
- [ ] In resize(): emit memory event with action: "resize"
- [ ] In dispose(): emit memory event with action: "free"
- [ ] RenderTarget needs context reference - add it if missing

### 4. Add target events to GPUContext (context.ts)
- [ ] In setTarget(): emit target event with action: "set"
- [ ] In clear(): emit target event with action: "clear"
- [ ] Include target type (screen/texture/mrt), size, format

### 5. Build & Verify
- [ ] Run: cd ${PROJECT_ROOT} && pnpm build (must succeed)
- [ ] No TypeScript errors

## Implementation Notes
- Events should only emit if context.eventEmitter exists (zero overhead when disabled)
- Use this.context?.emitEvent() pattern for optional emission
- If a class doesn't have context reference, you may need to pass it via constructor
- Keep changes minimal - only add event emission code

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
done({ summary: "Added memory events to StorageBuffer and RenderTarget, added target events to GPUContext. Build passes." })

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

  console.log("🚀 Starting ralph-32: Complete Phase 2 Events\n");

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
