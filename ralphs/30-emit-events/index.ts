/**
 * Ralph 30: Emit Events from Core Classes - Phase 2
 * Adds event emission to Pass, Material, ComputeShader, StorageBuffer, and RenderTarget
 */

import "dotenv/config";
import { LoopAgent, brainRule, trackProgressRule, minimalChangesRule, completionRule } from "@ralph/agent-loop";
import * as fs from "fs/promises";

const AI_GATEWAY_API_KEY = process.env.AI_GATEWAY_API_KEY;
const PROJECT_ROOT = "/Users/matiasgf/repos/experiments/ralph-gpu";

if (!AI_GATEWAY_API_KEY) {
  console.error("❌ Missing AI_GATEWAY_API_KEY");
  process.exit(1);
}

const DEBUG = process.env.DEBUG === "true" || process.argv.includes("--debug");

const TASK = `
# Task: Emit Events from Core Classes (Phase 2)

## Working Directory & Navigation
This script is running from: ${process.cwd()}
Project root is: ${PROJECT_ROOT}

### Repository Structure
\`\`\`
ralph-gpu/                    (project root)
├── packages/
│   ├── core/                 (main WebGPU library package - TARGET)
│   │   ├── src/
│   │   │   ├── context.ts    (GPUContext - already has event system from Phase 1)
│   │   │   ├── events.ts     (Event types - already created)
│   │   │   ├── event-emitter.ts (EventEmitter - already created)
│   │   │   ├── pass.ts       (Pass class - needs draw events)
│   │   │   ├── material.ts   (Material class - needs draw events)
│   │   │   ├── compute.ts    (ComputeShader - needs compute events)
│   │   │   ├── storage.ts    (StorageBuffer - needs memory events)
│   │   │   ├── target.ts     (RenderTarget - needs memory events)
│   │   │   └── particles.ts  (Particles - needs draw events via material)
│   │   └── tests/
│   └── ralph/
└── ralphs/
    └── 30-emit-events/       (← YOU ARE HERE)
\`\`\`

## CRITICAL: Update Progress
After EVERY significant action, update .progress.md in this folder:
- Path: ${process.cwd()}/.progress.md
- Log what you did with timestamp

## Context
Phase 1 is complete - we have the event system foundation:
- events.ts: Event type definitions (DrawEvent, ComputeEvent, MemoryEvent, etc.)
- event-emitter.ts: EventEmitter class with on/off/emit/history
- context.ts: GPUContext with eventEmitter integration and frame events

Now we need to emit events from the actual GPU operations. The challenge is that some classes
(StorageBuffer, RenderTarget) don't have access to GPUContext. We need to add context references
where needed and emit events at the right places.

## Acceptance Criteria (ALL MUST BE MET)

### 1. Draw Events from Pass (pass.ts)
- [ ] Import generateEventId from events.ts
- [ ] In drawInternal(), emit "draw:start" at the beginning
- [ ] In drawInternal(), emit "draw:end" at the end
- [ ] Include: source="pass", vertexCount=6, instanceCount=1, topology="triangle-list"
- [ ] Include: target (from context.currentTarget), targetSize

### 2. Draw Events from Material (material.ts)
- [ ] Import generateEventId from events.ts
- [ ] In drawInternal(), emit "draw:start" at the beginning
- [ ] In drawInternal(), emit "draw:end" at the end
- [ ] Include: source="material", vertexCount, instanceCount, topology from options
- [ ] Include: target, targetSize

### 3. Compute Events from ComputeShader (compute.ts)
- [ ] Add context parameter to ComputeShader constructor
- [ ] Update context.compute() to pass \`this\` as context
- [ ] Import generateEventId from events.ts
- [ ] In dispatch(), emit "compute:start" before dispatch
- [ ] In dispatch(), emit "compute:end" after dispatch
- [ ] Include: workgroups [x,y,z], workgroupSize, totalInvocations

### 4. Memory Events from StorageBuffer (storage.ts)
- [ ] Add optional context parameter to StorageBuffer constructor
- [ ] Update context.storage() to pass \`this\` as context
- [ ] Import generateEventId from events.ts
- [ ] In constructor, emit "memory:allocate" if context is provided
- [ ] In dispose(), emit "memory:free" if context is provided
- [ ] Include: resourceType="buffer", size, usage description

### 5. Memory Events from RenderTarget (target.ts)
- [ ] Add optional context parameter to RenderTarget constructor
- [ ] Update context.target() and context.pingPong() to pass \`this\` as context
- [ ] Import generateEventId from events.ts
- [ ] In constructor, emit "memory:allocate" if context provided
- [ ] In resize(), emit "memory:resize" if context provided
- [ ] In dispose(), emit "memory:free" if context provided
- [ ] Include: resourceType="texture", size, format

### 6. Target Events from GPUContext (context.ts)
- [ ] In setTarget(), emit "target:set" event
- [ ] In clear(), emit "target:clear" event
- [ ] Include: target type ("screen"|"texture"|"mrt"), size, format

### 7. Build & Verify
- [ ] Run: cd ${PROJECT_ROOT} && pnpm build (must succeed)
- [ ] No TypeScript errors
- [ ] All existing functionality preserved

## Implementation Guide

### Step 1: Update Pass (pass.ts)

The Pass class already has \`this.context\` reference. Add event emission to drawInternal():

\`\`\`typescript
import { generateEventId } from "./events";
import type { DrawEvent } from "./events";

// In drawInternal():
drawInternal(
  commandEncoder: GPUCommandEncoder,
  renderPassDescriptor: GPURenderPassDescriptor,
  format: GPUTextureFormat
): void {
  // Emit draw:start event
  const startEvent: DrawEvent = {
    type: "draw:start",
    timestamp: performance.now(),
    id: generateEventId(),
    source: "pass",
    vertexCount: 6,
    instanceCount: 1,
    topology: "triangle-list",
    target: this.context.currentTarget ? "texture" : "screen",
    targetSize: [this.context.width, this.context.height],
  };
  // Access emitEvent through context - need to add a public method or make emitEvent accessible
  // Option: Use context.on() pattern - but we need a way to emit
  // Better: Add a public emitEvent() method to GPUContext that checks if eventEmitter exists

  // ... existing draw code ...

  // Emit draw:end event at the end
}
\`\`\`

### Step 2: Add public emitEvent to GPUContext

Since emitEvent is private in GPUContext, we need to either:
- Make it public (simplest)
- Add a dedicated method for internal use

Make emitEvent public by changing \`private emitEvent\` to \`emitEvent\` (removes private modifier).
This allows Pass, Material, etc. to call context.emitEvent() directly.

### Step 3: Update ComputeShader (compute.ts)

ComputeShader needs access to context. Update constructor:

\`\`\`typescript
export class ComputeShader {
  private context?: import("./context").GPUContext;
  
  constructor(
    device: GPUDevice,
    wgsl: string,
    globalsBuffer: GPUBuffer,
    context?: import("./context").GPUContext,
    options: ComputeOptions = {}
  ) {
    this.context = context;
    // ... rest of constructor
  }
  
  dispatch(x: number, y = 1, z = 1): void {
    // Emit compute:start
    if (this.context) {
      this.context.emitEvent({
        type: "compute:start",
        timestamp: performance.now(),
        id: generateEventId(),
        workgroups: [x, y, z],
        workgroupSize: this.workgroupSize,
        totalInvocations: x * y * z * this.workgroupSize[0] * this.workgroupSize[1] * this.workgroupSize[2],
      });
    }
    
    // ... existing dispatch code ...
    
    // Emit compute:end
  }
}
\`\`\`

Then update context.ts:
\`\`\`typescript
compute(wgsl: string, options?: ComputeOptions): ComputeShader {
  return new ComputeShader(this.device, wgsl, this.globalsBuffer, this, options);
}
\`\`\`

### Step 4: Update StorageBuffer and RenderTarget similarly

Add optional context parameter and emit memory events.

### Step 5: Add target events to GPUContext

In setTarget() and clear(), emit the appropriate events.

## Testing Commands
\`\`\`bash
cd ${PROJECT_ROOT}
pnpm build
cd packages/core && pnpm test
\`\`\`

## Important Notes
- Keep changes minimal - only add event emission code
- Don't change existing functionality
- Events should have zero overhead when disabled (eventEmitter is undefined)
- Use performance.now() for timestamps
- Follow existing code style

## CRITICAL: When to Stop

**You MUST call the \`done\` tool when:**
1. All acceptance criteria checkboxes are complete
2. The build passes with \`pnpm build\`
3. No TypeScript errors remain

**Call done like this:**
\`\`\`
done({ summary: "Emitted events from core classes: added draw events to Pass/Material, compute events to ComputeShader, memory events to StorageBuffer/RenderTarget, target events to GPUContext. Build passes." })
\`\`\`

**DO NOT keep iterating once the task is complete. Call done() immediately after verifying the build passes.**
`;

async function checkEventsEmitted(): Promise<boolean> {
  try {
    // Check pass.ts has generateEventId import and draw events
    const passContent = await fs.readFile(`${PROJECT_ROOT}/packages/core/src/pass.ts`, "utf-8");
    if (!passContent.includes("generateEventId") || !passContent.includes("draw:start")) {
      console.log("❌ pass.ts missing event emission");
      return false;
    }

    // Check compute.ts has event emission
    const computeContent = await fs.readFile(`${PROJECT_ROOT}/packages/core/src/compute.ts`, "utf-8");
    if (!computeContent.includes("compute:start")) {
      console.log("❌ compute.ts missing event emission");
      return false;
    }

    // Check context.ts has target events and emitEvent is accessible
    const contextContent = await fs.readFile(`${PROJECT_ROOT}/packages/core/src/context.ts`, "utf-8");
    if (!contextContent.includes("target:set")) {
      console.log("❌ context.ts missing target events");
      return false;
    }

    console.log("✅ Event emission code found in core classes");
    return true;
  } catch (error) {
    console.log(`❌ Verification failed: ${(error as Error).message}`);
    return false;
  }
}

async function main() {
  const startTime = Date.now();

  const agent = new LoopAgent({
    model: "google/gemini-2.5-flash",
    trace: true,
    task: TASK,
    rules: [brainRule, trackProgressRule, minimalChangesRule, completionRule],
    debug: DEBUG,
    limits: {
      maxIterations: 35,
      maxCost: 8.0,
      timeout: "40m",
    },
    onUpdate: (status) => {
      const elapsed = ((Date.now() - startTime) / 1000).toFixed(1);
      console.log(
        `[${elapsed}s] Iteration ${status.iteration} | State: ${status.state} | Cost: $${status.cost.toFixed(4)}`
      );
    },
    onStuck: async (ctx) => {
      console.log(`\\n⚠️ Agent stuck: ${ctx.reason}`);
      return "Focus on one file at a time. Start with making emitEvent public in context.ts, then add events to other files. Update .progress.md with what you tried.";
    },
    onError: (error) => {
      console.error(`\\n❌ Error: ${error.message}`);
    },
  });

  console.log("🚀 Starting Ralph 30: Emit Events from Core Classes - Phase 2\\n");

  const result = await agent.run();

  console.log("\\n📊 Results");
  console.log(`✅ Success: ${result.success}`);
  console.log(`🔄 Iterations: ${result.iterations}`);
  console.log(`💰 Cost: $${result.cost.toFixed(4)}`);
  console.log(`⏱️ Duration: ${(result.elapsed / 1000).toFixed(1)}s`);

  // Run verification
  const passed = await checkEventsEmitted();
  console.log(`\\n${passed ? "🎉 All checks passed!" : "⚠️ Some checks failed"}`);

  if (!result.success) {
    console.error(`\\n❌ Agent failed: ${result.reason}`);
    process.exit(1);
  }

  process.exit(passed ? 0 : 1);
}

main().catch((error) => {
  console.error("Fatal error:", error);
  process.exit(1);
});
