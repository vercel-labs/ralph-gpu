/**
 * 57-example-registry: Create examples registry with metadata for ralph-gpu examples
 */

import "dotenv/config";
import {
  LoopAgent,
  brainRule,
  trackProgressRule,
  minimalChangesRule,
  completionRule,
} from "@ralph/agent-loop";
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
\`\`\`
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
\`\`\`

## Context
We are building a Shadertoy-like interactive playground for ralph-gpu examples.
This task creates a centralized registry of examples with their metadata and shader code.
The registry will be used by the gallery page and playground to load example data.

**START SMALL**: Only include 3-4 examples to start. We can add more later.

## Acceptance Criteria (ALL MUST BE MET)

### 1. Create Examples Registry File
- [ ] Create file: ${PROJECT_ROOT}/apps/examples/lib/examples.ts
- [ ] Define ExampleMeta interface with: slug, title, description, category, shaderCode
- [ ] Define Category type: "basics" | "techniques" | "simulations" | "advanced" | "features"
- [ ] Export examples array with 3-4 examples only: basic, uniforms, raymarching, lines

### 2. Extract Shader Code (for the 3-4 examples only)
- [ ] Read each example's page.tsx file
- [ ] Extract the WGSL shader code (the string passed to ctx.pass() or similar)
- [ ] Store as shaderCode in the registry

### 3. Helper Functions
- [ ] Export getExampleBySlug(slug: string) function
- [ ] Export getExamplesByCategory(category: string) function  
- [ ] Export getAllCategories() function

### 4. Verify Build
- [ ] Run: cd ${PROJECT_ROOT}/apps/examples && pnpm build
- [ ] Ensure no TypeScript errors

## Implementation Guide

### Step 1: Read example files to understand the shader code format
\`\`\`bash
cat ${PROJECT_ROOT}/apps/examples/app/basic/page.tsx
\`\`\`

### Step 2: Create ${PROJECT_ROOT}/apps/examples/lib/examples.ts
The file structure should be:
\`\`\`typescript
export type Category = "basics" | "techniques" | "simulations" | "advanced" | "features";

export interface ExampleMeta {
  slug: string;
  title: string;
  description: string;
  category: Category;
  shaderCode: string;
}

export const examples: ExampleMeta[] = [
  // Add 3-4 examples here with extracted shader code
];

export function getExampleBySlug(slug: string): ExampleMeta | undefined {
  return examples.find(e => e.slug === slug);
}

export function getExamplesByCategory(category: Category): ExampleMeta[] {
  return examples.filter(e => e.category === category);
}

export function getAllCategories(): Category[] {
  return [...new Set(examples.map(e => e.category))];
}
\`\`\`

### Step 3: Build to verify
\`\`\`bash
cd ${PROJECT_ROOT}/apps/examples && pnpm build
\`\`\`

## Completion Criteria
When the build passes and the file has:
- ExampleMeta interface
- 3-4 examples with shader code
- Helper functions

→ Call done({ summary: "Created examples registry with X examples" }) IMMEDIATELY

## CRITICAL: Avoid These Anti-Patterns
- Do NOT re-read files you already read
- Do NOT keep verifying after build passes
- Do NOT extract ALL examples - just 3-4 to start
- After build passes → call done() immediately

## 🚨 FIRST ACTION 🚨
1. Check if ${PROJECT_ROOT}/apps/examples/lib/examples.ts already exists
2. If not, read 3-4 example page.tsx files to extract shader code
3. Create the examples.ts file
4. Run build
5. If build passes → done()
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
    // Include completionRule to prevent infinite loops
    rules: [brainRule, trackProgressRule, minimalChangesRule, completionRule],
    limits: { maxIterations: 15, maxCost: 5.0, timeout: "15m" },
    onUpdate: (status) => {
      const elapsed = ((Date.now() - startTime) / 1000).toFixed(1);
      console.log(`[${elapsed}s] Iteration ${status.iteration} | State: ${status.state} | Cost: $${status.cost.toFixed(4)}`);
    },
    onStuck: async (ctx) => {
      console.log(`\n⚠️ Agent stuck: ${ctx.reason}`);
      return "If build passes, call done() immediately. Do not re-verify.";
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
