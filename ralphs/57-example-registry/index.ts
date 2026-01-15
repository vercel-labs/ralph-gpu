/**
 * 57-example-registry: Create examples registry with metadata for all ralph-gpu examples
 */

import "dotenv/config";
import { LoopAgent, brainRule, trackProgressRule, minimalChangesRule, completionRule } from "@ralph/agent-loop";
import * as fs from "fs/promises";
import * as path from "path";

const PROJECT_ROOT = process.env.PROJECT_ROOT || "../..";
const CWD = process.cwd();

const TASK = `
# Task: Create Examples Registry with Metadata

## Working Directory & Navigation
This script is running from: ${CWD}
Project root is: ${PROJECT_ROOT}

### Repository Structure
ralph-gpu/                    (project root)
├── apps/
│   └── examples/             (Next.js examples app - YOUR TARGET)
│       ├── app/              (Next.js app router - example pages here)
│       │   ├── basic/page.tsx
│       │   ├── uniforms/page.tsx
│       │   ├── raymarching/page.tsx
│       │   └── ... other example pages
│       ├── components/       (shared components)
│       └── lib/              (CREATE examples.ts HERE)
└── ralphs/
    └── 57-example-registry/  (← YOU ARE HERE)

## ⚠️ CRITICAL: CHECK EXISTING PROGRESS FIRST ⚠️
**BEFORE doing ANY work, you MUST:**
1. Check if .progress.md exists and read it
2. Check if .brain/ exists and read its contents  
3. Check what files already exist in the target locations

**If progress exists, CONTINUE from where you left off. DO NOT restart from scratch!**
**If files already exist, skip creating them and move to the NEXT incomplete task.**

## Progress Tracking Rules
- ONLY create .progress.md if it doesn't exist
- ONLY update .progress.md by APPENDING or updating checkboxes, never recreate from scratch  
- Read your previous progress before each action to avoid repeating work
- If a task is already marked [x] complete, skip it and move to the next one

## Context
We are building a Shadertoy-like interactive playground for ralph-gpu examples.
This task creates a centralized registry of all examples with their metadata and shader code.
The registry will be used by the gallery page and playground to load example data.

## Acceptance Criteria (ALL MUST BE MET)

### 1. Create Examples Registry File
- [ ] Create file: apps/examples/lib/examples.ts
- [ ] Define ExampleMeta interface with: slug, title, description, category, shaderCode
- [ ] Export array of all examples with their metadata
- [ ] Extract WGSL shader code from each example page

### 2. Example Categories
Group examples into these categories:
- "basics": basic, uniforms, geometry, lines
- "techniques": render-target, ping-pong, particles, compute
- "simulations": fluid, raymarching
- "advanced": metaballs, morphing, mandelbulb, terrain, alien-planet
- "features": triangle-particles, texture-sampling, storage-texture

### 3. Extract Shader Code
- [ ] Read each example's page.tsx file
- [ ] Extract the WGSL shader code (the string inside ctx.pass() or ctx.material())
- [ ] Store as shaderCode in the registry

### 4. Helper Functions
- [ ] Export getExampleBySlug(slug: string) function
- [ ] Export getExamplesByCategory(category: string) function  
- [ ] Export getAllCategories() function

### 5. TypeScript Types
- [ ] Export ExampleMeta type
- [ ] Export Category type
- [ ] Ensure all types are properly defined

## Implementation Guide

### Step 1: Create the lib directory if needed
mkdir -p ${PROJECT_ROOT}/apps/examples/lib

### Step 2: Create examples.ts
The file should have:
- ExampleMeta interface with: slug, title, description, category, shaderCode
- Category type union: "basics" | "techniques" | "simulations" | "advanced" | "features"
- examples array with all example metadata (read shader code from each page.tsx file)
- Helper functions: getExampleBySlug, getExamplesByCategory, getAllCategories

### Step 3: Extract shader code from each example
For each example page in apps/examples/app/[name]/page.tsx:
1. Read the file content
2. Find WGSL shader code inside ctx.pass() or similar
3. Add to the examples array with proper metadata

## Testing
After creating the registry, verify it works:
cd ${PROJECT_ROOT}/apps/examples
pnpm build

## 🚨 FIRST ACTION - ALWAYS DO THIS FIRST 🚨
Your VERY FIRST action must be to check existing progress and what already exists.
Based on what already exists, SKIP completed tasks and proceed to the next incomplete one.
`;

async function checkRegistryCreated(): Promise<boolean> {
  const registryPath = path.join(PROJECT_ROOT, "apps/examples/lib/examples.ts");
  try {
    const content = await fs.readFile(registryPath, "utf-8");
    const hasInterface = content.includes("interface ExampleMeta") || content.includes("type ExampleMeta");
    const hasExamples = content.includes("examples:") || content.includes("export const examples");
    const hasHelpers = content.includes("getExampleBySlug") && content.includes("getExamplesByCategory");
    console.log("Check results:", { hasInterface, hasExamples, hasHelpers });
    return hasInterface && hasExamples && hasHelpers;
  } catch {
    return false;
  }
}

async function main() {
  const startTime = Date.now();
  
  const agent = new LoopAgent({
    model: "google/gemini-3-flash",
    trace: true,
    task: TASK,
    rules: [brainRule, trackProgressRule, minimalChangesRule, completionRule],
    limits: { maxIterations: 25, maxCost: 10.0, timeout: "30m" },
    onUpdate: (status) => {
      const elapsed = ((Date.now() - startTime) / 1000).toFixed(1);
      console.log(`[${elapsed}s] Iteration ${status.iteration} | State: ${status.state} | Cost: $${status.cost.toFixed(4)}`);
    },
    onStuck: async (ctx) => {
      console.log(`\n⚠️ Agent stuck: ${ctx.reason}`);
      return "Try a different approach. Update .progress.md with what you tried and what didn't work.";
    },
    onError: (error) => {
      console.error(`\n❌ Error: ${error.message}`);
    },
  });

  console.log("🚀 Starting example registry agent...\n");
  
  const result = await agent.run();
  
  console.log("\n📊 Results");
  console.log(`✅ Success: ${result.success}`);
  console.log(`🔄 Iterations: ${result.iterations}`);
  console.log(`💰 Cost: $${result.cost.toFixed(4)}`);
  console.log(`⏱️ Duration: ${(result.elapsed / 1000).toFixed(1)}s`);

  const passed = await checkRegistryCreated();
  console.log(`\n${passed ? "🎉 Registry created successfully!" : "⚠️ Registry incomplete"}`);

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
