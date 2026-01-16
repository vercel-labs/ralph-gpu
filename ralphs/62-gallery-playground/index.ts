/**
 * 62-gallery-playground: Create gallery page with example cards and individual playground pages
 */

import "dotenv/config";
import { LoopAgent, brainRule, trackProgressRule, minimalChangesRule, completionRule, visualCheckRule, processManagementRule } from "@ralph/agent-loop";

// Configuration from environment
const AI_GATEWAY_API_KEY = process.env.AI_GATEWAY_API_KEY;
const AGENT_MODEL = "google/gemini-3-flash";
const PROJECT_ROOT = process.env.PROJECT_ROOT || "../..";

if (!AI_GATEWAY_API_KEY) {
  console.error("❌ Missing AI_GATEWAY_API_KEY");
  process.exit(1);
}

const DEBUG = process.env.DEBUG === "true" || process.argv.includes("--debug");

const TASK = `
# Task: Create Gallery Page and Shader Playground

## Working Directory & Navigation
This script is running from: ${process.cwd()}
Project root is: ${PROJECT_ROOT}

### Repository Structure
\`\`\`
ralph-gpu/                    (project root)
├── packages/
│   └── core/                 (main WebGPU library - ralph-gpu)
├── apps/
│   └── docs/                 (Next.js docs app - TARGET)
│       ├── app/
│       │   └── examples/
│       │       ├── page.tsx         (MODIFY - gallery page)
│       │       └── [slug]/          (CREATE - playground page)
│       │           └── page.tsx
│       ├── components/
│       │   └── MonacoEditor.tsx     (already exists)
│       └── lib/
│           └── examples.ts          (already exists - registry)
└── ralphs/
    └── 62-gallery-playground/       (← YOU ARE HERE)
\`\`\`

### Navigation Instructions
- To access project files: use relative paths from ${PROJECT_ROOT}
- To access this script's files: use paths relative to ${process.cwd()}
- Example: To edit docs app: \`cd ${PROJECT_ROOT}/apps/docs\`

## ⚠️ CRITICAL: CHECK EXISTING PROGRESS FIRST ⚠️
**BEFORE doing ANY work, you MUST:**
1. Check if .progress.md exists: \`cat ${process.cwd()}/.progress.md 2>/dev/null || echo "No progress file"\`
2. Check what files already exist in the target locations
3. Read the existing examples registry at apps/docs/lib/examples.ts

**If progress exists, CONTINUE from where you left off. DO NOT restart from scratch!**

## Context
We have:
- MonacoEditor component at apps/docs/components/MonacoEditor.tsx
- Examples registry at apps/docs/lib/examples.ts with gradient, wave, color-cycle examples
- Current /examples page shows all examples inline

We need to create:
1. Gallery page showing example cards in a grid
2. Individual playground pages at /examples/[slug] with editor + preview

## Acceptance Criteria (ALL MUST BE MET)

### 1. ExampleCard Component
- [ ] Create apps/docs/components/ExampleCard.tsx
- [ ] Shows example title and description
- [ ] Links to /examples/[slug]
- [ ] Styled to match dark theme

### 2. Gallery Page (apps/docs/app/examples/page.tsx)
- [ ] Shows grid of ExampleCard components
- [ ] Uses getAllExamples() from lib/examples.ts
- [ ] Header with title "Examples" and subtitle
- [ ] Responsive grid layout

### 3. ShaderPlayground Component
- [ ] Create apps/docs/components/ShaderPlayground.tsx
- [ ] Split layout: MonacoEditor (left ~50%) + Canvas preview (right ~50%)
- [ ] Run button in header that compiles and runs the shader
- [ ] Cmd/Ctrl+Enter keyboard shortcut triggers run (MonacoEditor already handles this)
- [ ] Error display overlay when shader fails to compile
- [ ] Uses WebGPU to render the shader (similar to existing ExampleCanvas)

### 4. Example Page Route
- [ ] Create apps/docs/app/examples/[slug]/page.tsx
- [ ] Load example by slug using getExampleBySlug()
- [ ] Header with example title and back link
- [ ] Full-page ShaderPlayground with the example

### 5. Build & Visual Verification
- [ ] pnpm build --filter docs passes
- [ ] Start dev server and verify gallery page at http://localhost:3001/examples
- [ ] Verify clicking a card navigates to /examples/[slug]
- [ ] Screenshot shows working gallery and playground

## Implementation Guide

### Step 1: ExampleCard Component
Create apps/docs/components/ExampleCard.tsx:

\`\`\`typescript
import Link from 'next/link';
import { Example } from '@/lib/examples';

interface ExampleCardProps {
  example: Example;
}

export function ExampleCard({ example }: ExampleCardProps) {
  return (
    <Link
      href={\`/examples/\${example.slug}\`}
      className="block p-6 rounded-lg bg-gray-900 border border-gray-800 hover:border-primary-500/50 transition-colors"
    >
      <h3 className="text-lg font-semibold text-gray-100 mb-2">{example.title}</h3>
      <p className="text-gray-400 text-sm">{example.description}</p>
    </Link>
  );
}
\`\`\`

### Step 2: Update Gallery Page
Modify apps/docs/app/examples/page.tsx to be a simple gallery grid.

### Step 3: ShaderPlayground Component
Create apps/docs/components/ShaderPlayground.tsx with:
- State for code, activeCode (running version), and error
- MonacoEditor on the left
- Canvas preview on the right (reuse ExampleCanvas logic)
- Run button that sets activeCode = code and clears error
- Try/catch around shader compilation to catch errors

### Step 4: Example Page
Create apps/docs/app/examples/[slug]/page.tsx:
- Use params.slug to get example from registry
- Render ShaderPlayground with initial code from example
- Show 404 if example not found

## Browser Automation
⚠️ **CRITICAL**: Browser automation ALWAYS runs in headless mode by default.
- Do NOT set headless: false
- Visual verification (screenshot + no console errors) is SUFFICIENT
- After ONE successful visual verification → call done() immediately

## Testing Commands
\`\`\`bash
cd ${PROJECT_ROOT}
pnpm build --filter docs
\`\`\`

## Completion Criteria
When ALL acceptance criteria are met:
1. Update .progress.md to mark all items [x] complete
2. Call done({ summary: "..." }) IMMEDIATELY
3. Do NOT re-read files or take more screenshots after this

## Recovery Rules
- Do NOT delete node_modules or pnpm-lock.yaml
- If build fails, READ the error and fix the actual issue
- If stuck after 2-3 attempts on same error, call done() with failure summary

## 🚨 FIRST ACTION - ALWAYS DO THIS FIRST 🚨
Your VERY FIRST action must be to check existing progress and what already exists.
Based on what already exists, SKIP completed tasks and proceed to the next incomplete one.
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
      maxIterations: 20,
      maxCost: 8.0,
      timeout: "25m",
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

  console.log("🚀 Starting gallery and playground agent...\n");

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
