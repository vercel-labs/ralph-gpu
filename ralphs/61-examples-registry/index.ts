/**
 * 61-examples-registry: Create examples registry with metadata for shader examples
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
# Task: Create Examples Registry

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
│       │       └── page.tsx  (current examples with shader code)
│       ├── components/
│       │   └── MonacoEditor.tsx (already created)
│       └── lib/              (CREATE THIS - examples registry)
└── ralphs/
    └── 61-examples-registry/ (← YOU ARE HERE)
\`\`\`

### Navigation Instructions
- To access project files: use relative paths from ${PROJECT_ROOT}
- To access this script's files: use paths relative to ${process.cwd()}
- Example: To edit docs app: \`cd ${PROJECT_ROOT}/apps/docs\`
- Example: To update progress: \`cat >> ${process.cwd()}/.progress.md\`

## ⚠️ CRITICAL: CHECK EXISTING PROGRESS FIRST ⚠️
**BEFORE doing ANY work, you MUST:**
1. Check if .progress.md exists: \`cat ${process.cwd()}/.progress.md 2>/dev/null || echo "No progress file"\`
2. Check if .brain/ exists: \`ls ${process.cwd()}/.brain/ 2>/dev/null && cat ${process.cwd()}/.brain/index.md 2>/dev/null || echo "No brain"\`
3. Check what files already exist in the target locations

**If progress exists, CONTINUE from where you left off. DO NOT restart from scratch!**
**If files already exist, skip creating them and move to the NEXT incomplete task.**

## Context
We're building an interactive examples gallery. The current examples page has 3 shader demos hardcoded in it. We need to extract these into a proper registry that can be used by both the gallery page and individual playground pages.

Current examples in apps/docs/app/examples/page.tsx:
1. **gradient** - Simple Gradient (static)
2. **wave** - Animated Wave (with uniforms: amplitude, frequency, color)
3. **color-cycle** - Time-Based Color Cycling (animated)

## Acceptance Criteria (ALL MUST BE MET)

### 1. Create lib/ Directory
- [ ] Create apps/docs/lib/ directory

### 2. Create Examples Registry File
- [ ] Create apps/docs/lib/examples.ts with:
  - Example interface: { slug, title, description, shader, uniforms?, animated? }
  - Array of examples extracted from the current page
  - getExampleBySlug(slug) helper function
  - getAllExamples() helper function

### 3. Example Data
Each example must include:
- [ ] slug: URL-safe identifier (gradient, wave, color-cycle)
- [ ] title: Display name
- [ ] description: Brief description
- [ ] shader: The WGSL shader code (just the shader, not the ctx.pass wrapper)
- [ ] uniforms: (optional) Object with uniform values
- [ ] animated: (optional) boolean, defaults to true

### 4. Build Verification
- [ ] pnpm build --filter docs passes with no TypeScript errors

## Implementation Guide

### Step 1: Read Current Examples
First, read apps/docs/app/examples/page.tsx to extract the shader code and metadata.

### Step 2: Create lib/examples.ts
Create the file at apps/docs/lib/examples.ts:

\`\`\`typescript
export interface Example {
  slug: string;
  title: string;
  description: string;
  shader: string;
  uniforms?: Record<string, { value: number | number[] }>;
  animated?: boolean;
}

export const examples: Example[] = [
  {
    slug: 'gradient',
    title: 'Simple Gradient',
    description: 'Map UV coordinates to colors',
    shader: \\\`
  @fragment
  fn main(@builtin(position) pos: vec4f) -> @location(0) vec4f {
    let uv = pos.xy / globals.resolution;
    return vec4f(uv, 0.5, 1.0);
  }
\\\`,
    animated: false,
  },
  // ... add wave and color-cycle examples
];

export function getExampleBySlug(slug: string): Example | undefined {
  return examples.find(e => e.slug === slug);
}

export function getAllExamples(): Example[] {
  return examples;
}
\`\`\`

### Step 3: Verify Build
\`\`\`bash
cd ${PROJECT_ROOT}
pnpm build --filter docs
\`\`\`

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
    rules: [brainRule, trackProgressRule, minimalChangesRule, completionRule],
    debug: DEBUG,
    limits: {
      maxIterations: 12,
      maxCost: 3.0,
      timeout: "15m",
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

  console.log("🚀 Starting examples registry agent...\n");

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
