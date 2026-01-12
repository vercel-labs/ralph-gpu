/**
 * 10-custom-geometry: Add custom geometry and index buffer support to ralph-gpu
 *
 * This script uses the LoopAgent to implement:
 * 1. Fix globals binding (detect if shader uses globals before binding)
 * 2. Add index buffer support (indexBuffer, indexFormat, indexCount)
 * 3. Create geometry examples (triangle, cube with camera)
 * 4. Update lines example to use storage buffer approach
 */

import "dotenv/config";
import {
  LoopAgent,
  brainRule,
  explorationRule,
  minimalChangesRule,
  trackProgressRule,
  visualCheckRule,
} from "@ralph/agent-loop";
import * as fs from "fs/promises";

// Get configuration from environment
const AI_GATEWAY_API_KEY = process.env.AI_GATEWAY_API_KEY;
const AGENT_MODEL =
  process.env.AGENT_MODEL || "anthropic/claude-sonnet-4-20250514";
const PROJECT_ROOT = process.env.PROJECT_ROOT || "../..";

if (!AI_GATEWAY_API_KEY) {
  console.error("❌ Missing AI_GATEWAY_API_KEY in environment");
  console.error("Copy the .env file from ../09-line-rendering/");
  process.exit(1);
}

// Check for debug flag
const DEBUG = process.env.DEBUG === "true" || process.argv.includes("--debug");

console.log("🔷 Ralph Agent - Custom Geometry & Index Buffer Implementation");
console.log("━".repeat(60));
console.log(`📁 Project: ${PROJECT_ROOT}`);
console.log(`🧠 Model: ${AGENT_MODEL}`);
if (DEBUG) {
  console.log(`🐛 Debug: enabled`);
}
console.log("━".repeat(60));

const CORE_PKG = `${PROJECT_ROOT}/packages/core`;
const EXAMPLES_APP = `${PROJECT_ROOT}/apps/examples`;

const TASK = `
# Task: Add Custom Geometry and Index Buffer Support to ralph-gpu

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

ralph-gpu currently has issues with Materials that don't use globals, and lacks support for
index buffers which are essential for efficient 3D geometry rendering.

Key files:
- Material class: ${CORE_PKG}/src/material.ts
- Types: ${CORE_PKG}/src/types.ts
- Exports: ${CORE_PKG}/src/index.ts

## Problem 1: Globals Binding Issue

The Material class unconditionally binds globals (group 0) even when the shader doesn't use
globals.time, globals.resolution, etc. This causes "Invalid BindGroup" errors.

Current code (lines 181-191 in material.ts):
\`\`\`typescript
// Bind globals (group 0)
const globalsBindGroup = this.device.createBindGroup({
  layout: pipeline.getBindGroupLayout(0),
  entries: [{ binding: 0, resource: { buffer: this.globalsBuffer } }],
});
passEncoder.setBindGroup(0, globalsBindGroup);
\`\`\`

Fix: Add \`usesGlobals\` detection like ComputeShader does:
\`\`\`typescript
// Add property
private usesGlobals: boolean;

// In constructor
this.usesGlobals = /\\bglobals\\.\\w+/.test(wgsl);

// In drawInternal, wrap globals binding:
if (this.usesGlobals) {
  const globalsBindGroup = this.device.createBindGroup({...});
  passEncoder.setBindGroup(0, globalsBindGroup);
}
\`\`\`

## Problem 2: No Index Buffer Support

Index buffers allow reusing vertices for efficient geometry. Currently ralph-gpu only has
\`draw()\` but not \`drawIndexed()\`.

### Solution: Add to MaterialOptions

In ${CORE_PKG}/src/types.ts, add:
\`\`\`typescript
/**
 * Index buffer format
 */
export type IndexFormat = "uint16" | "uint32";

// Add to MaterialOptions:
export interface MaterialOptions {
  // ... existing options
  indexBuffer?: StorageBuffer;
  indexFormat?: IndexFormat;
  indexCount?: number;
}
\`\`\`

### Update Material class in ${CORE_PKG}/src/material.ts:

Add properties:
\`\`\`typescript
private indexBuffer: StorageBuffer | null = null;
private indexFormat: GPUIndexFormat = "uint32";
private indexCount: number = 0;
\`\`\`

In constructor:
\`\`\`typescript
if (options.indexBuffer) {
  this.indexBuffer = options.indexBuffer;
  this.indexFormat = options.indexFormat || "uint32";
  this.indexCount = options.indexCount || 0;
}
\`\`\`

In drawInternal, replace the draw call (line 261):
\`\`\`typescript
if (this.indexBuffer) {
  passEncoder.setIndexBuffer(this.indexBuffer.gpuBuffer, this.indexFormat);
  passEncoder.drawIndexed(this.indexCount, this.instances, 0, 0, 0);
} else {
  passEncoder.draw(this.vertexCount, this.instances, 0, 0);
}
\`\`\`

### Export IndexFormat from ${CORE_PKG}/src/index.ts:
\`\`\`typescript
export type { IndexFormat } from "./types";
\`\`\`

## Acceptance Criteria (ALL MUST BE MET)

### 1. Fix Globals Binding
- [ ] Add \`usesGlobals\` property to Material class
- [ ] Detect globals usage with regex: /\\bglobals\\.\\w+/.test(wgsl)
- [ ] Only bind group 0 when shader uses globals
- [ ] Verify existing examples still work

### 2. Add Index Buffer Support
- [ ] Add \`IndexFormat\` type to types.ts
- [ ] Add \`indexBuffer\`, \`indexFormat\`, \`indexCount\` to MaterialOptions
- [ ] Add index buffer properties to Material class
- [ ] Implement \`drawIndexed()\` in drawInternal when indexBuffer is present
- [ ] Export \`IndexFormat\` from index.ts

### 3. Create Triangle Example (without index buffer)
- [ ] Create ${EXAMPLES_APP}/app/geometry/page.tsx
- [ ] Render a simple triangle using storage buffer for positions
- [ ] Use 3 vertices stored in a storage buffer
- [ ] Triangle should be visible and colored

### 4. Create Cube Example (with index buffer and camera)
- [ ] Add cube to the geometry page
- [ ] Use 8 unique vertices + 36 indices (12 triangles)
- [ ] Implement MVP (model-view-projection) matrix
- [ ] Cube should rotate using globals.time
- [ ] Colors should vary by vertex position

### 5. Update Lines Example (storage buffer approach)
- [ ] Update ${EXAMPLES_APP}/app/lines/page.tsx
- [ ] Add example of lines using storage buffer for positions
- [ ] Keep existing SDF line examples
- [ ] Lines should animate

### 6. Quality Checks
- [ ] TypeScript compiles: \`pnpm build\` in packages/core
- [ ] All examples render correctly in browser
- [ ] No console errors or warnings about bind groups

## Example Code for Geometry Page

### Triangle (no index buffer):
\`\`\`typescript
"use client";
import { useEffect, useRef } from "react";
import { gpu, GPUContext } from "ralph-gpu";

export default function GeometryPage() {
  const canvasRef = useRef<HTMLCanvasElement>(null);

  useEffect(() => {
    let ctx: GPUContext | null = null;
    let disposed = false;

    async function init() {
      if (!canvasRef.current || !gpu.isSupported()) return;
      ctx = await gpu.init(canvasRef.current, { dpr: 2 });
      if (disposed) { ctx.dispose(); return; }

      // Triangle positions in storage buffer
      const positions = ctx.storage(3 * 3 * 4); // 3 verts × vec3f
      positions.write(new Float32Array([
         0.0,  0.5, 0.0,  // top
        -0.5, -0.5, 0.0,  // bottom-left
         0.5, -0.5, 0.0,  // bottom-right
      ]));

      const triangle = ctx.material(\/* wgsl *\/ \`
        @group(1) @binding(0) var<storage, read> positions: array<vec3f>;
        
        @vertex
        fn vs_main(@builtin(vertex_index) vid: u32) -> @builtin(position) vec4f {
          return vec4f(positions[vid], 1.0);
        }
        
        @fragment
        fn fs_main() -> @location(0) vec4f {
          return vec4f(1.0, 0.3, 0.3, 1.0);
        }
      \`, { vertexCount: 3 });
      triangle.storage("positions", positions);

      function frame() {
        if (disposed) return;
        ctx!.clear();
        triangle.draw();
        requestAnimationFrame(frame);
      }
      frame();
    }

    init();
    return () => { disposed = true; ctx?.dispose(); };
  }, []);

  return (
    <div style={{ width: "100%", height: "100vh", background: "#111" }}>
      <canvas ref={canvasRef} style={{ width: "100%", height: "100%" }} />
    </div>
  );
}
\`\`\`

### Cube with Index Buffer:
\`\`\`typescript
// 8 unique vertices
const cubePositions = ctx.storage(8 * 3 * 4);
cubePositions.write(new Float32Array([
  -1, -1, -1,  // 0
   1, -1, -1,  // 1
   1,  1, -1,  // 2
  -1,  1, -1,  // 3
  -1, -1,  1,  // 4
   1, -1,  1,  // 5
   1,  1,  1,  // 6
  -1,  1,  1,  // 7
]));

// 36 indices (12 triangles)
const cubeIndices = ctx.storage(36 * 4);
cubeIndices.write(new Uint32Array([
  0,1,2, 0,2,3,  // front
  1,5,6, 1,6,2,  // right
  5,4,7, 5,7,6,  // back
  4,0,3, 4,3,7,  // left
  3,2,6, 3,6,7,  // top
  4,5,1, 4,1,0,  // bottom
]));

const uniforms = {
  mvp: { value: new Float32Array(16) },
};

const cube = ctx.material(\/* wgsl *\/ \`
  struct Uniforms { mvp: mat4x4f }
  @group(1) @binding(0) var<uniform> u: Uniforms;
  @group(1) @binding(1) var<storage, read> positions: array<vec3f>;
  
  struct VertexOutput {
    @builtin(position) pos: vec4f,
    @location(0) color: vec3f,
  }
  
  @vertex
  fn vs_main(@builtin(vertex_index) vid: u32) -> VertexOutput {
    var out: VertexOutput;
    out.pos = u.mvp * vec4f(positions[vid], 1.0);
    out.color = positions[vid] * 0.5 + 0.5;
    return out;
  }
  
  @fragment
  fn fs_main(in: VertexOutput) -> @location(0) vec4f {
    return vec4f(in.color, 1.0);
  }
\`, {
  uniforms,
  indexBuffer: cubeIndices,
  indexFormat: "uint32",
  indexCount: 36,
});
cube.storage("positions", cubePositions);

// In render loop: update MVP matrix
// You'll need simple matrix math - can inline it or use gl-matrix
\`\`\`

## MVP Matrix Implementation

For the cube camera, implement these matrix functions inline or use simple helpers:

\`\`\`typescript
// Simple 4x4 matrix helpers
function mat4Identity(): Float32Array {
  return new Float32Array([
    1, 0, 0, 0,
    0, 1, 0, 0,
    0, 0, 1, 0,
    0, 0, 0, 1
  ]);
}

function mat4Perspective(fov: number, aspect: number, near: number, far: number): Float32Array {
  const f = 1.0 / Math.tan(fov / 2);
  const nf = 1 / (near - far);
  return new Float32Array([
    f / aspect, 0, 0, 0,
    0, f, 0, 0,
    0, 0, (far + near) * nf, -1,
    0, 0, 2 * far * near * nf, 0
  ]);
}

function mat4RotateY(out: Float32Array, a: Float32Array, rad: number): Float32Array {
  const s = Math.sin(rad);
  const c = Math.cos(rad);
  // ... implement rotation
  return out;
}

function mat4Translate(out: Float32Array, a: Float32Array, v: number[]): Float32Array {
  // ... implement translation
  return out;
}

function mat4Multiply(out: Float32Array, a: Float32Array, b: Float32Array): Float32Array {
  // ... implement 4x4 matrix multiplication
  return out;
}
\`\`\`

## Testing Commands

Run these from ${PROJECT_ROOT}:

\`\`\`bash
# Build core package
cd ${CORE_PKG} && pnpm build

# Start examples dev server
cd ${EXAMPLES_APP} && pnpm dev

# Then open browser to http://localhost:3000/geometry
(check the browser port from the pnpm dev command to know what url to visit)
\`\`\`

## IMPORTANT REMINDERS
- Update .progress.md after EVERY significant action
- Read the existing code before making changes
- Test the triangle FIRST before implementing the cube
- Keep changes minimal and focused
- Verify the existing particle and line examples still work
- Use the browser to visually verify rendering
`;

// Verification functions
async function checkGlobalsFixed(): Promise<boolean> {
  try {
    const materialTs = await fs.readFile(`${CORE_PKG}/src/material.ts`, "utf-8");
    return (
      materialTs.includes("usesGlobals") &&
      materialTs.includes("if (this.usesGlobals)")
    );
  } catch {
    return false;
  }
}

async function checkIndexBufferSupport(): Promise<boolean> {
  try {
    const materialTs = await fs.readFile(`${CORE_PKG}/src/material.ts`, "utf-8");
    const typesTs = await fs.readFile(`${CORE_PKG}/src/types.ts`, "utf-8");
    return (
      typesTs.includes("IndexFormat") &&
      typesTs.includes("indexBuffer") &&
      materialTs.includes("drawIndexed") &&
      materialTs.includes("setIndexBuffer")
    );
  } catch {
    return false;
  }
}

async function checkGeometryExampleExists(): Promise<boolean> {
  try {
    const content = await fs.readFile(
      `${EXAMPLES_APP}/app/geometry/page.tsx`,
      "utf-8"
    );
    return (
      content.includes("triangle") || 
      content.includes("positions") ||
      content.includes("cube")
    );
  } catch {
    return false;
  }
}

async function checkIndexFormatExported(): Promise<boolean> {
  try {
    const indexTs = await fs.readFile(`${CORE_PKG}/src/index.ts`, "utf-8");
    return indexTs.includes("IndexFormat");
  } catch {
    return false;
  }
}

async function checkLinesUpdated(): Promise<boolean> {
  try {
    const linesPage = await fs.readFile(
      `${EXAMPLES_APP}/app/lines/page.tsx`,
      "utf-8"
    );
    return (
      linesPage.includes("storage") &&
      (linesPage.includes("line-list") || linesPage.includes("SDF"))
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
      visualCheckRule,
    ],
    debug: DEBUG,
    limits: {
      maxIterations: 80,
      maxCost: 20.0,
      timeout: "60m",
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
        return "You're hitting the same error repeatedly. Read the error carefully. Maybe you need to check the WebGPU API documentation or the existing code patterns.";
      }
      if (ctx.reason === "no_progress") {
        return "You haven't made visible progress. Check .progress.md and move to the next uncompleted step. Maybe try visually checking the browser.";
      }
      return "Try a different approach. Update .progress.md with what you tried.";
    },
    onError: (error) => {
      console.error(`\n❌ Error: ${error.message}`);
    },
  });

  console.log("\n🚀 Starting agent...\n");
  console.log("Implementing custom geometry and index buffer support:");
  console.log("  🔧 Fix globals binding detection in Material");
  console.log("  📦 Add index buffer support (indexBuffer, indexFormat, indexCount)");
  console.log("  🔺 Create triangle example with storage buffer");
  console.log("  📦 Create cube example with index buffer + camera");
  console.log("  📐 Update lines example with storage buffer");
  console.log("");

  const result = await agent.run();

  console.log("\n" + "━".repeat(60));
  console.log("📊 Results");
  console.log("━".repeat(60));
  console.log(`✅ Success: ${result.success}`);
  console.log(`📝 Reason: ${result.reason}`);
  console.log(`🔄 Iterations: ${result.iterations}`);
  console.log(`💰 Cost: $${result.cost.toFixed(4)}`);
  console.log(`⏱️ Duration: ${(result.elapsed / 1000).toFixed(1)}s`);
  console.log(
    `🔤 Tokens: ${result.tokens.total.toLocaleString()} (in: ${result.tokens.input.toLocaleString()}, out: ${result.tokens.output.toLocaleString()})`
  );
  console.log("━".repeat(60));

  // Run verification checks
  console.log("\n📋 Verification Checks:");
  console.log("━".repeat(60));

  const globalsFixed = await checkGlobalsFixed();
  console.log(`${globalsFixed ? "✅" : "❌"} Globals binding fixed (usesGlobals detection)`);

  const indexBufferSupport = await checkIndexBufferSupport();
  console.log(`${indexBufferSupport ? "✅" : "❌"} Index buffer support added`);

  const indexFormatExported = await checkIndexFormatExported();
  console.log(`${indexFormatExported ? "✅" : "❌"} IndexFormat exported from index.ts`);

  const geometryExample = await checkGeometryExampleExists();
  console.log(`${geometryExample ? "✅" : "❌"} Geometry example page exists`);

  const linesUpdated = await checkLinesUpdated();
  console.log(`${linesUpdated ? "✅" : "❌"} Lines example updated`);

  const allPassed =
    globalsFixed &&
    indexBufferSupport &&
    indexFormatExported &&
    geometryExample &&
    linesUpdated;

  console.log("━".repeat(60));
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
