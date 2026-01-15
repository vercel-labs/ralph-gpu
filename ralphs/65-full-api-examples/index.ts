/**
 * 65-full-api-examples: Refactor examples to show full ralph-gpu API code
 */

import "dotenv/config";
import { LoopAgent, brainRule, trackProgressRule, minimalChangesRule, completionRule, visualCheckRule, processManagementRule } from "@ralph/agent-loop";

const AI_GATEWAY_API_KEY = process.env.AI_GATEWAY_API_KEY;
const AGENT_MODEL = "google/gemini-3-flash";
const PROJECT_ROOT = process.env.PROJECT_ROOT || "../..";

if (!AI_GATEWAY_API_KEY) {
  console.error("❌ Missing AI_GATEWAY_API_KEY");
  process.exit(1);
}

const DEBUG = process.env.DEBUG === "true" || process.argv.includes("--debug");

const TASK = `
# Task: Refactor Examples to Show Full ralph-gpu API

## Working Directory & Navigation
This script is running from: ${process.cwd()}
Project root is: ${PROJECT_ROOT}

### Repository Structure
\`\`\`
ralph-gpu/                    (project root)
├── apps/
│   └── docs/                 (Next.js docs app)
│       ├── lib/
│       │   └── examples.ts   (← MODIFY - add full code)
│       └── components/
│           └── ShaderPlayground.tsx (← MODIFY - display full code)
└── ralphs/
    └── 65-full-api-examples/ (← YOU ARE HERE)
\`\`\`

## ⚠️ CRITICAL: CHECK EXISTING PROGRESS FIRST ⚠️
**BEFORE doing ANY work, you MUST:**
1. Check if .progress.md exists: \`cat ${process.cwd()}/.progress.md 2>/dev/null || echo "No progress file"\`
2. Read the current examples.ts and ShaderPlayground.tsx

## Context & Goal

Currently, examples only show the WGSL shader code. Users don't see the full ralph-gpu API:
- How to initialize with \`gpu.init(canvas)\`
- How to create passes with \`ctx.pass(shader)\`
- How to run the animation loop with \`pass.draw()\`

**Goal**: Show full TypeScript code that demonstrates the complete API, while still using the shader internally for rendering.

## Strategy

1. Keep the existing \`shader\` field in Example interface for internal rendering
2. Add a new \`code\` field with full API code to display in the editor
3. The editor shows the full code, but ExampleCanvas continues to use just \`shader\`
4. Update only 3-4 examples (gradient, wave, raymarching) to keep scope small

## Acceptance Criteria (ALL MUST BE MET)

### 1. Update Example Interface
- [ ] Add \`code\` field to Example interface in examples.ts
- [ ] Keep \`shader\` field for internal rendering

### 2. Update 3-4 Examples with Full Code
- [ ] gradient - basic setup
- [ ] wave - setup with uniforms
- [ ] raymarching - more complex example
- [ ] (optional) one more if time permits

### 3. Update ShaderPlayground
- [ ] Display \`example.code\` in editor instead of \`example.shader\`
- [ ] Continue using \`example.shader\` for ExampleCanvas rendering

### 4. Build & Visual Verification (REQUIRED!)
- [ ] pnpm build --filter docs passes
- [ ] Start dev server at http://localhost:3001
- [ ] Navigate to /examples/gradient
- [ ] Take screenshot showing full API code in editor
- [ ] Take screenshot showing shader preview rendering
- [ ] Verify no console errors

## Implementation Guide

### Step 1: Update examples.ts Interface

\`\`\`typescript
export interface Example {
  slug: string;
  title: string;
  description: string;
  shader: string;  // Keep for internal rendering
  code: string;    // NEW: Full API code for display
  uniforms?: Record<string, { value: number | number[] }>;
  animated?: boolean;
}
\`\`\`

### Step 2: Add Full Code to Examples

Example for gradient:
\`\`\`typescript
{
  slug: 'gradient',
  title: 'Simple Gradient',
  description: '...',
  shader: \\\`
  @fragment
  fn main(@builtin(position) pos: vec4f) -> @location(0) vec4f {
    let uv = pos.xy / globals.resolution;
    return vec4f(uv, 0.5, 1.0);
  }
\\\`,
  code: \\\`import { gpu } from 'ralph-gpu';

// Initialize WebGPU context
const canvas = document.getElementById('canvas');
const ctx = await gpu.init(canvas);

// Create a fragment shader pass
const gradient = ctx.pass(\\\\\\\`
  @fragment
  fn main(@builtin(position) pos: vec4f) -> @location(0) vec4f {
    let uv = pos.xy / globals.resolution;
    return vec4f(uv, 0.5, 1.0);
  }
\\\\\\\`);

// Render loop
function frame() {
  gradient.draw();
  requestAnimationFrame(frame);
}
frame();
\\\`,
  animated: false,
}
\`\`\`

### Step 3: Update ShaderPlayground.tsx

Change initial state to use \`code\` instead of \`shader\`:
\`\`\`typescript
const [code, setCode] = useState(initialExample.code || initialExample.shader);
\`\`\`

Keep ExampleCanvas using \`shader\` for rendering.

## Testing Commands
\`\`\`bash
cd ${PROJECT_ROOT}
pnpm build --filter docs
\`\`\`

## Browser Validation (REQUIRED!)
⚠️ **You MUST take screenshots to verify:**
1. Start dev server: \`pnpm dev --filter docs\`
2. Navigate to http://localhost:3001/examples/gradient
3. Take screenshot showing full API code in editor
4. Verify shader still renders correctly

## Completion Criteria
When ALL acceptance criteria are met:
1. Update .progress.md to mark all items [x] complete
2. Call done({ summary: "..." }) IMMEDIATELY

## Recovery Rules
- Do NOT delete node_modules or pnpm-lock.yaml
- If build fails, READ the error and fix it
- Keep scope small - only update 3-4 examples

## 🚨 FIRST ACTION - ALWAYS DO THIS FIRST 🚨
Check existing progress and read the current files before making changes.
`;

async function main() {
  const startTime = Date.now();

  const agent = new LoopAgent({
    model: AGENT_MODEL,
    trace: true,
    task: TASK,
    rules: [brainRule, trackProgressRule, minimalChangesRule, completionRule, visualCheckRule, processManagementRule],
    debug: DEBUG,
    limits: {
      maxIterations: 15,
      maxCost: 5.0,
      timeout: "20m",
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

  console.log("🚀 Starting full API examples agent...\n");

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
