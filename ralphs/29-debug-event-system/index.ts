/**
 * Ralph 29: Debug Event System - Phase 1
 * Implements core event types, EventEmitter class, and GPUContext integration
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
# Task: Implement Core Event System for ralph-gpu

## Working Directory & Navigation
This script is running from: ${process.cwd()}
Project root is: ${PROJECT_ROOT}

### Repository Structure
\`\`\`
ralph-gpu/                    (project root)
├── packages/
│   ├── core/                 (main WebGPU library package - TARGET)
│   │   ├── src/              (library source code - ADD FILES HERE)
│   │   │   ├── context.ts    (GPUContext - needs event integration)
│   │   │   ├── types.ts      (types - add event options)
│   │   │   ├── index.ts      (exports - add event exports)
│   │   │   └── ... other files
│   │   └── tests/            (library tests)
│   └── ralph/                (agent-loop package - don't modify)
├── apps/
│   └── examples/             (Next.js app with examples)
├── plans/
│   └── DEBUG-SYSTEM-PLAN.md  (implementation plan - reference)
└── ralphs/
    └── 29-debug-event-system/ (← YOU ARE HERE)
\`\`\`

### Navigation Instructions
- Core library source: ${PROJECT_ROOT}/packages/core/src/
- To read the plan: cat ${PROJECT_ROOT}/plans/DEBUG-SYSTEM-PLAN.md
- To build: cd ${PROJECT_ROOT} && pnpm build

## CRITICAL: Update Progress
After EVERY significant action, update .progress.md in this folder:
- Path: ${process.cwd()}/.progress.md
- Log what you did with timestamp
- Update checkboxes for acceptance criteria

## Context
We're implementing a debugging and profiling system for ralph-gpu. This phase focuses on the 
CORE EVENT SYSTEM foundation:
1. Event type definitions
2. EventEmitter class
3. GPUContext integration

The system must have ZERO overhead when disabled. Events are opt-in.

## Acceptance Criteria (ALL MUST BE MET)

### 1. Event Types (events.ts)
- [ ] Create ${PROJECT_ROOT}/packages/core/src/events.ts
- [ ] Define base GPUEvent interface with: type, timestamp (performance.now()), id (unique)
- [ ] Define DrawEvent with: source ("pass"|"material"|"particles"), label?, vertexCount, instanceCount, topology, target ("screen"|"texture"), targetSize [w,h]
- [ ] Define ComputeEvent with: label?, workgroups [x,y,z], workgroupSize [x,y,z], totalInvocations
- [ ] Define ShaderCompileEvent with: shaderType ("vertex"|"fragment"|"compute"), label?, sourceLines, warnings[], errors[], compilationTime?
- [ ] Define MemoryEvent with: resourceType ("buffer"|"texture"|"sampler"), label?, size (bytes), usage, action ("allocate"|"free"|"resize")
- [ ] Define TargetEvent with: target ("screen"|"texture"|"mrt"), label?, size [w,h], format?, action ("set"|"clear"|"resize")
- [ ] Define PipelineEvent with: pipelineType ("render"|"compute"), label?, format?, cacheHit boolean
- [ ] Define FrameEvent with: frameNumber, deltaTime, time
- [ ] Define GPUTimingEvent with: label, gpuTime (ms), cpuTime (ms)
- [ ] Export union type RalphGPUEvent of all event types
- [ ] Export EventType union of all type strings

### 2. EventEmitter Class (event-emitter.ts)
- [ ] Create ${PROJECT_ROOT}/packages/core/src/event-emitter.ts
- [ ] Constructor takes options: { types?: string[], historySize?: number }
- [ ] Implement on(type, listener) - subscribe to specific event type
- [ ] Implement off(type, listener) - unsubscribe
- [ ] Implement once(type, listener) - subscribe for single event
- [ ] Implement onAll(listener) - subscribe to all events
- [ ] Implement emit(event) - emit event (internal, checks type filter)
- [ ] Implement getHistory(filter?) - query event history with optional type filter
- [ ] Implement clearHistory() - clear history
- [ ] Use circular buffer (array with max size) for history
- [ ] Filter at emit time based on configured types (performance)
- [ ] Only emit if listeners exist (check before creating event object)

### 3. GPUContextOptions Extension (types.ts)
- [ ] Add to GPUContextOptions in ${PROJECT_ROOT}/packages/core/src/types.ts:
\`\`\`typescript
events?: {
  enabled?: boolean;      // Enable event system (default: false)
  types?: string[];       // Opt-in event types (e.g., ["draw", "compute"])
  historySize?: number;   // Max events to keep (default: 1000)
  enableGPUTiming?: boolean; // Use timestamp queries (default: false)
};
\`\`\`

### 4. GPUContext Integration (context.ts)
- [ ] Import EventEmitter in context.ts
- [ ] Add private eventEmitter?: EventEmitter field (only created if events.enabled)
- [ ] Initialize EventEmitter in constructor if options.events?.enabled is true
- [ ] Add public on(type, listener) method - delegates to eventEmitter
- [ ] Add public off(type, listener) method - delegates to eventEmitter
- [ ] Add public once(type, listener) method - delegates to eventEmitter
- [ ] Add public onAll(listener) method - delegates to eventEmitter
- [ ] Add public getEventHistory(filter?) method - delegates to eventEmitter
- [ ] Add private emitEvent(event) helper - only emits if eventEmitter exists
- [ ] Emit frame:start in beginFrame() method
- [ ] Emit frame:end in endFrame() method
- [ ] Clean up eventEmitter in dispose()

### 5. Exports (index.ts)
- [ ] Export all event types from events.ts
- [ ] Export EventEmitter class (for advanced users)

### 6. Build & Verify
- [ ] Run: cd ${PROJECT_ROOT} && pnpm build (must succeed)
- [ ] No TypeScript errors
- [ ] Check that existing tests still pass: cd ${PROJECT_ROOT}/packages/core && pnpm test

## Implementation Guide

### Step 1: Create events.ts
\`\`\`typescript
// ${PROJECT_ROOT}/packages/core/src/events.ts

/**
 * Base event interface - all events extend this
 */
export interface GPUEvent {
  type: string;
  timestamp: number;  // performance.now()
  id: string;         // Unique event ID
}

/**
 * Generate unique event ID
 */
let eventIdCounter = 0;
export function generateEventId(): string {
  return \`evt_\${++eventIdCounter}_\${Date.now()}\`;
}

// Draw event
export interface DrawEvent extends GPUEvent {
  type: "draw:start" | "draw:end";
  source: "pass" | "material" | "particles";
  label?: string;
  vertexCount: number;
  instanceCount: number;
  topology: string;
  target: "screen" | "texture";
  targetSize: [number, number];
}

// Continue with other event types...
\`\`\`

### Step 2: Create event-emitter.ts
\`\`\`typescript
// ${PROJECT_ROOT}/packages/core/src/event-emitter.ts

import type { RalphGPUEvent } from "./events";

export type EventListener = (event: RalphGPUEvent) => void;

export interface EventEmitterOptions {
  types?: string[];      // Only emit these event types (empty = all)
  historySize?: number;  // Max history size (default: 1000)
}

export class EventEmitter {
  private listeners = new Map<string, Set<EventListener>>();
  private allListeners = new Set<EventListener>();
  private history: RalphGPUEvent[] = [];
  private historyIndex = 0;
  private types: Set<string> | null;
  private maxHistory: number;

  constructor(options: EventEmitterOptions = {}) {
    this.types = options.types ? new Set(options.types) : null;
    this.maxHistory = options.historySize ?? 1000;
  }

  // Implement on, off, once, onAll, emit, getHistory, clearHistory...
}
\`\`\`

### Step 3: Update types.ts
Add EventsOptions interface and extend GPUContextOptions.

### Step 4: Update context.ts
Import and integrate EventEmitter. Add frame events to beginFrame/endFrame.

### Step 5: Update index.ts
Export new types and classes.

## Testing Commands
\`\`\`bash
cd ${PROJECT_ROOT}
pnpm build
cd packages/core && pnpm test
\`\`\`

## Important Notes
- Do NOT modify files outside packages/core/src/ except for reading the plan
- Keep changes minimal and focused on the acceptance criteria
- Ensure zero overhead when events are disabled (check for eventEmitter existence before emitting)
- Use performance.now() for timestamps
- Follow existing code style in the repository

## CRITICAL: When to Stop

**You MUST call the \`done\` tool when:**
1. All acceptance criteria checkboxes are complete
2. The build passes with \`pnpm build\`
3. No TypeScript errors remain

**Call done like this:**
\`\`\`
done({ summary: "Implemented core event system: created events.ts with all event types, event-emitter.ts with EventEmitter class, integrated into GPUContext with frame events. Build passes." })
\`\`\`

**DO NOT keep iterating once the task is complete. Call done() immediately after verifying the build passes.**
`;

async function checkEventsImplemented(): Promise<boolean> {
  try {
    // Check if events.ts exists
    await fs.access(`${PROJECT_ROOT}/packages/core/src/events.ts`);
    
    // Check if event-emitter.ts exists
    await fs.access(`${PROJECT_ROOT}/packages/core/src/event-emitter.ts`);
    
    // Check if types.ts has events option
    const typesContent = await fs.readFile(`${PROJECT_ROOT}/packages/core/src/types.ts`, "utf-8");
    if (!typesContent.includes("events?:")) {
      console.log("❌ types.ts missing events option");
      return false;
    }
    
    // Check if context.ts has eventEmitter
    const contextContent = await fs.readFile(`${PROJECT_ROOT}/packages/core/src/context.ts`, "utf-8");
    if (!contextContent.includes("eventEmitter") && !contextContent.includes("EventEmitter")) {
      console.log("❌ context.ts missing EventEmitter integration");
      return false;
    }
    
    // Check if index.ts exports events
    const indexContent = await fs.readFile(`${PROJECT_ROOT}/packages/core/src/index.ts`, "utf-8");
    if (!indexContent.includes("events")) {
      console.log("❌ index.ts missing events exports");
      return false;
    }
    
    console.log("✅ All event system files exist and contain expected code");
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
      maxIterations: 40,
      maxCost: 10.0,
      timeout: "45m",
    },
    onUpdate: (status) => {
      const elapsed = ((Date.now() - startTime) / 1000).toFixed(1);
      console.log(
        `[${elapsed}s] Iteration ${status.iteration} | State: ${status.state} | Cost: $${status.cost.toFixed(4)}`
      );
    },
    onStuck: async (ctx) => {
      console.log(`\n⚠️ Agent stuck: ${ctx.reason}`);
      return "Try a different approach. Focus on one file at a time. Update .progress.md with what you tried.";
    },
    onError: (error) => {
      console.error(`\n❌ Error: ${error.message}`);
    },
  });

  console.log("🚀 Starting Ralph 29: Debug Event System - Phase 1\n");

  const result = await agent.run();

  console.log("\n📊 Results");
  console.log(`✅ Success: ${result.success}`);
  console.log(`🔄 Iterations: ${result.iterations}`);
  console.log(`💰 Cost: $${result.cost.toFixed(4)}`);
  console.log(`⏱️ Duration: ${(result.elapsed / 1000).toFixed(1)}s`);

  // Run verification
  const passed = await checkEventsImplemented();
  console.log(`\n${passed ? "🎉 All checks passed!" : "⚠️ Some checks failed"}`);

  if (!result.success) {
    console.error(`\n❌ Agent failed: ${result.reason}`);
    process.exit(1);
  }

  process.exit(passed ? 0 : 1);
}

main().catch((error) => {
  console.error("Fatal error:", error);
  process.exit(1);
});
