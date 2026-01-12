/**
 * 09-line-rendering: Add line rendering support to ralph-gpu
 *
 * This script uses the LoopAgent to implement native line rendering
 * by exposing WebGPU's primitive topology option in the Material API.
 */

import "dotenv/config";
import {
  LoopAgent,
  brainRule,
  explorationRule,
  minimalChangesRule,
  trackProgressRule,
} from "@ralph/agent-loop";
import * as fs from "fs/promises";

// Get configuration from environment
const AI_GATEWAY_API_KEY = process.env.AI_GATEWAY_API_KEY;
const AGENT_MODEL =
  process.env.AGENT_MODEL || "anthropic/claude-sonnet-4-20250514";
const PROJECT_ROOT = process.env.PROJECT_ROOT || "../..";

if (!AI_GATEWAY_API_KEY) {
  console.error("❌ Missing AI_GATEWAY_API_KEY in environment");
  console.error("Copy the .env file from ../08-docs-mdx-redesign/");
  process.exit(1);
}

// Check for debug flag
const DEBUG = process.env.DEBUG === "true" || process.argv.includes("--debug");

console.log("📐 Ralph Agent - Line Rendering Implementation");
console.log("━".repeat(55));
console.log(`📁 Project: ${PROJECT_ROOT}`);
console.log(`🧠 Model: ${AGENT_MODEL}`);
if (DEBUG) {
  console.log(`🐛 Debug: enabled`);
}
console.log("━".repeat(55));

const CORE_PKG = `${PROJECT_ROOT}/packages/core`;
const EXAMPLES_APP = `${PROJECT_ROOT}/apps/examples`;

const TASK = `
# Task: Implement Line Rendering Support in ralph-gpu

## Working Directory
You are running from: ${process.cwd()}
Project root is: ${PROJECT_ROOT}
Core package is at: ${CORE_PKG}
Examples app is at: ${EXAMPLES_APP}

## CRITICAL: Update Progress Regularly
After EVERY significant action, update .progress.md in this script folder:
- Path: ${process.cwd()}/.progress.md
- Log what you did with timestamp
- Update checkboxes for acceptance criteria
- Document any errors encountered

## Context
ralph-gpu currently hardcodes \`topology: "triangle-list"\` in the Material class.
Users want to render lines using WebGPU's native \`line-list\` and \`line-strip\` topologies.

The Material class is in: ${CORE_PKG}/src/material.ts
The types are in: ${CORE_PKG}/src/types.ts

Current hardcoded topology (line ~124 in material.ts):
\`\`\`typescript
primitive: {
  topology: "triangle-list",
},
\`\`\`

## Acceptance Criteria (ALL MUST BE MET)

### 1. Type Definitions
- [ ] Add \`PrimitiveTopology\` type to types.ts with values: "triangle-list" | "line-list" | "line-strip" | "point-list" | "triangle-strip"
- [ ] Add \`topology?: PrimitiveTopology\` to \`MaterialOptions\` interface
- [ ] Export \`PrimitiveTopology\` from index.ts

### 2. Material Implementation  
- [ ] Update Material constructor to accept \`topology\` option
- [ ] Store topology as a class property (default: "triangle-list")
- [ ] Use the topology property in \`getPipeline()\` instead of hardcoded value
- [ ] Clear pipeline cache if topology changes (like other options)

### 3. Tests
- [ ] Add unit tests in ${CORE_PKG}/tests/ for line topology
- [ ] Test that default topology is "triangle-list"
- [ ] Test that custom topology is applied to pipeline

### 4. Example App
- [ ] Create a new example page at ${EXAMPLES_APP}/app/lines/page.tsx
- [ ] Demonstrate line-list rendering with simple lines
- [ ] Demonstrate line-strip rendering with connected lines
- [ ] Show animated lines using globals.time
- [ ] Add the example to the examples navigation

### 5. Documentation
- [ ] Update the ralph-gpu.mdc cursor rules file at ${PROJECT_ROOT}/.cursor/rules/ralph-gpu.mdc
- [ ] Add a section about line rendering with examples
- [ ] Update the Material API reference to show topology option

### 6. Quality Checks
- [ ] TypeScript compiles without errors: \`pnpm build\` in packages/core
- [ ] All existing tests pass: \`pnpm test\` in packages/core
- [ ] Example app runs correctly: \`pnpm dev\` in apps/examples
- [ ] New line example renders correctly

## Implementation Guide

### Step 1: Update Types (${CORE_PKG}/src/types.ts)

Add the topology type and update MaterialOptions:

\`\`\`typescript
/**
 * WebGPU primitive topology for rendering
 */
export type PrimitiveTopology = 
  | "triangle-list"
  | "triangle-strip" 
  | "line-list"
  | "line-strip"
  | "point-list";

/**
 * Material creation options
 */
export interface MaterialOptions {
  uniforms?: Uniforms;
  blend?: BlendMode | BlendConfig;
  vertexCount?: number;
  instances?: number;
  topology?: PrimitiveTopology;  // NEW
}
\`\`\`

### Step 2: Update Material Class (${CORE_PKG}/src/material.ts)

1. Import the new type
2. Add private property: \`private topology: GPUPrimitiveTopology;\`
3. In constructor: \`this.topology = options.topology || "triangle-list";\`
4. In getPipeline(), change:
   \`\`\`typescript
   primitive: {
     topology: this.topology,
   },
   \`\`\`

### Step 3: Export from Index (${CORE_PKG}/src/index.ts)

Add PrimitiveTopology to the exports.

### Step 4: Create Line Example (${EXAMPLES_APP}/app/lines/page.tsx)

Example implementation:

\`\`\`tsx
"use client";

import { useEffect, useRef } from "react";
import { gpu, GPUContext, Material } from "ralph-gpu";

export default function LinesPage() {
  const canvasRef = useRef<HTMLCanvasElement>(null);

  useEffect(() => {
    let ctx: GPUContext | null = null;
    let disposed = false;

    async function init() {
      if (!canvasRef.current || !gpu.isSupported()) return;

      ctx = await gpu.init(canvasRef.current, { dpr: 2 });
      if (disposed) { ctx.dispose(); return; }

      // Line-list example: separate line segments
      const lineList = ctx.material(\/* wgsl *\/ \`
        @vertex
        fn vs_main(@builtin(vertex_index) vid: u32) -> @builtin(position) vec4f {
          // 6 vertices = 3 separate lines
          var positions = array<vec2f, 6>(
            vec2f(-0.8, 0.0), vec2f(-0.4, 0.5),  // Line 1
            vec2f(-0.2, -0.3), vec2f(0.2, 0.3),  // Line 2
            vec2f(0.4, -0.5), vec2f(0.8, 0.0),   // Line 3
          );
          let p = positions[vid];
          let y = p.y + sin(globals.time + p.x * 3.0) * 0.1;
          return vec4f(p.x, y, 0.0, 1.0);
        }

        @fragment
        fn fs_main() -> @location(0) vec4f {
          return vec4f(0.2, 0.8, 1.0, 1.0);
        }
      \`, {
        vertexCount: 6,
        topology: "line-list",
      });

      // Line-strip example: connected line
      const lineStrip = ctx.material(\/* wgsl *\/ \`
        @vertex
        fn vs_main(@builtin(vertex_index) vid: u32) -> @builtin(position) vec4f {
          let count = 20u;
          let t = f32(vid) / f32(count - 1u);
          let x = t * 2.0 - 1.0;
          let y = sin(x * 6.28 + globals.time * 2.0) * 0.3;
          return vec4f(x * 0.8, y - 0.5, 0.0, 1.0);
        }

        @fragment
        fn fs_main() -> @location(0) vec4f {
          return vec4f(1.0, 0.5, 0.2, 1.0);
        }
      \`, {
        vertexCount: 20,
        topology: "line-strip",
      });

      function frame() {
        if (disposed) return;
        ctx!.clear();
        lineList.draw();
        lineStrip.draw();
        requestAnimationFrame(frame);
      }
      frame();
    }

    init();
    return () => { disposed = true; ctx?.dispose(); };
  }, []);

  return (
    <div style={{ width: "100%", height: "100vh", background: "#000" }}>
      <canvas ref={canvasRef} style={{ width: "100%", height: "100%" }} />
    </div>
  );
}
\`\`\`

### Step 5: Add to Navigation

Find the navigation/menu component in the examples app and add the lines example.

### Step 6: Update Documentation

Update ${PROJECT_ROOT}/.cursor/rules/ralph-gpu.mdc to include:

\`\`\`markdown
### Line Rendering

Use the \`topology\` option in materials for line rendering:

\\\`\\\`\\\`tsx
// Separate line segments (pairs of vertices)
const lines = ctx.material(shader, {
  vertexCount: 6,  // 3 lines = 6 vertices
  topology: "line-list",
});

// Connected line strip
const strip = ctx.material(shader, {
  vertexCount: 20,  // 20 connected points
  topology: "line-strip",
});
\\\`\\\`\\\`

Available topologies:
- \`"triangle-list"\` (default) - Standard triangles
- \`"triangle-strip"\` - Connected triangles  
- \`"line-list"\` - Separate line segments
- \`"line-strip"\` - Connected line
- \`"point-list"\` - Individual points
\`\`\`

## Testing Commands

Run these from ${PROJECT_ROOT}:

\`\`\`bash
# Build core package
cd ${CORE_PKG} && pnpm build

# Run tests
cd ${CORE_PKG} && pnpm test

# Start examples dev server
cd ${EXAMPLES_APP} && pnpm dev
\`\`\`

## IMPORTANT REMINDERS
- Update .progress.md after EVERY significant action
- Read the existing code before making changes
- Don't break existing functionality
- Keep changes minimal and focused
- Test frequently
`;

// Verification functions
async function checkTypesExported(): Promise<boolean> {
  try {
    const indexTs = await fs.readFile(`${CORE_PKG}/src/index.ts`, "utf-8");
    return indexTs.includes("PrimitiveTopology");
  } catch {
    return false;
  }
}

async function checkMaterialImplementation(): Promise<boolean> {
  try {
    const materialTs = await fs.readFile(`${CORE_PKG}/src/material.ts`, "utf-8");
    return (
      materialTs.includes("this.topology") &&
      materialTs.includes("topology:") &&
      !materialTs.includes('topology: "triangle-list"') // Not hardcoded
    );
  } catch {
    return false;
  }
}

async function checkExampleExists(): Promise<boolean> {
  try {
    await fs.access(`${EXAMPLES_APP}/app/lines/page.tsx`);
    return true;
  } catch {
    return false;
  }
}

async function checkDocumentation(): Promise<boolean> {
  try {
    const docs = await fs.readFile(
      `${PROJECT_ROOT}/.cursor/rules/ralph-gpu.mdc`,
      "utf-8"
    );
    return (
      docs.includes("line-list") &&
      docs.includes("line-strip") &&
      docs.includes("topology")
    );
  } catch {
    return false;
  }
}

async function main() {
  const startTime = Date.now();

  const agent = new LoopAgent({
    model: AGENT_MODEL,
    trace: true,
    task: TASK,
    rules: [
      brainRule,
      explorationRule,
      minimalChangesRule,
      trackProgressRule,
    ],
    debug: DEBUG,
    limits: {
      maxIterations: 60,
      maxCost: 15.0,
      timeout: "45m",
    },
    onUpdate: (status) => {
      const elapsed = ((Date.now() - startTime) / 1000).toFixed(1);
      console.log(
        `[${elapsed}s] Iteration ${status.iteration} | State: ${status.state} | Cost: $${status.cost.toFixed(4)}`
      );
      if (status.lastActions.length > 0) {
        console.log(`  → Actions: ${status.lastActions.slice(-3).join(", ")}`);
      }
    },
    onStuck: async (ctx) => {
      console.log(`\n⚠️ Agent stuck: ${ctx.reason}`);
      if (ctx.reason === "error_loop") {
        return "You're hitting the same error repeatedly. Read the error carefully. Maybe you need to check imports or the file structure.";
      }
      if (ctx.reason === "no_progress") {
        return "You haven't made visible progress. Check .progress.md and move to the next uncompleted step.";
      }
      return "Try a different approach. Update .progress.md with what you tried.";
    },
    onError: (error) => {
      console.error(`\n❌ Error: ${error.message}`);
    },
  });

  console.log("\n🚀 Starting agent...\n");
  console.log("Implementing line rendering support:");
  console.log("  📐 Add topology option to MaterialOptions");
  console.log("  🔧 Update Material class implementation");
  console.log("  📝 Create line rendering example");
  console.log("  📚 Update documentation");
  console.log("");

  const result = await agent.run();

  console.log("\n" + "━".repeat(55));
  console.log("📊 Results");
  console.log("━".repeat(55));
  console.log(`✅ Success: ${result.success}`);
  console.log(`📝 Reason: ${result.reason}`);
  console.log(`🔄 Iterations: ${result.iterations}`);
  console.log(`💰 Cost: $${result.cost.toFixed(4)}`);
  console.log(`⏱️ Duration: ${(result.elapsed / 1000).toFixed(1)}s`);
  console.log(
    `🔤 Tokens: ${result.tokens.total.toLocaleString()} (in: ${result.tokens.input.toLocaleString()}, out: ${result.tokens.output.toLocaleString()})`
  );
  console.log("━".repeat(55));

  // Run verification checks
  console.log("\n📋 Verification Checks:");
  console.log("━".repeat(55));

  const typesExported = await checkTypesExported();
  console.log(`${typesExported ? "✅" : "❌"} PrimitiveTopology exported from index.ts`);

  const materialImpl = await checkMaterialImplementation();
  console.log(`${materialImpl ? "✅" : "❌"} Material uses dynamic topology`);

  const exampleExists = await checkExampleExists();
  console.log(`${exampleExists ? "✅" : "❌"} Lines example page exists`);

  const docsUpdated = await checkDocumentation();
  console.log(`${docsUpdated ? "✅" : "❌"} Documentation updated with line rendering`);

  const allPassed = typesExported && materialImpl && exampleExists && docsUpdated;
  console.log("━".repeat(55));
  console.log(`\n${allPassed ? "🎉 All checks passed!" : "⚠️ Some checks failed"}`);

  if (result.summary) {
    console.log("\n📄 Summary:");
    console.log(result.summary);
  }

  if (!result.success) {
    console.error(`\n❌ Agent failed: ${result.reason}`);
    if (result.error) {
      console.error(`Error details: ${result.error.message}`);
    }
    process.exit(1);
  }

  console.log("\n✨ Done!");
  process.exit(allPassed ? 0 : 1);
}

main().catch((error) => {
  console.error("Fatal error:", error);
  process.exit(1);
});
