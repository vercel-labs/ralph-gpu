/**
 * 02-raymarching: Use the LoopAgent to implement a 3D raymarching example
 *
 * This script uses the LoopAgent to create a WebGPU raymarching shader example
 * in the apps/examples directory, following the existing example patterns.
 */

import "dotenv/config";
import {
  LoopAgent,
  brainRule,
  visualCheckRule,
  explorationRule,
  minimalChangesRule,
  trackProgressRule,
} from "@ralph/core";

// Get configuration from environment
const AI_GATEWAY_API_KEY = process.env.AI_GATEWAY_API_KEY;
const AGENT_MODEL = process.env.AGENT_MODEL || "anthropic/claude-sonnet-4-20250514";
const PROJECT_ROOT = process.env.PROJECT_ROOT || process.cwd();

if (!AI_GATEWAY_API_KEY) {
  console.error("❌ Missing AI_GATEWAY_API_KEY in environment");
  process.exit(1);
}

// Check for debug flag
const DEBUG = process.env.DEBUG === "true" || process.argv.includes("--debug");

console.log("🎮 Ralph Agent - 3D Raymarching Example Generator");
console.log("━".repeat(55));
console.log(`📁 Project: ${PROJECT_ROOT}`);
console.log(`🧠 Model: ${AGENT_MODEL}`);
if (DEBUG) {
  console.log(`🐛 Debug: enabled`);
}
console.log("━".repeat(55));

// Resolve the examples directory path (relative to this script)
const EXAMPLES_DIR = `${PROJECT_ROOT}/apps/examples`;

const TASK = `
# Task: Create a 3D Raymarching WebGPU Example

## Important: Working Directory
You are running from: ${process.cwd()}
Project root is: ${PROJECT_ROOT}
Examples directory is: ${EXAMPLES_DIR}

Use RELATIVE paths like "../../apps/examples" or FULL paths like "${EXAMPLES_DIR}".
DO NOT use "/apps/examples" - that's an absolute path that doesn't exist!

## Objective
Create a new raymarching example page at \`${EXAMPLES_DIR}/app/raymarching/page.tsx\` that demonstrates 3D raymarching rendering using WebGPU and the ralph-gpu library.

## What is Raymarching?
Raymarching is a rendering technique where rays are "marched" through a scene by stepping along them until they hit a surface defined by a signed distance function (SDF). It's perfect for rendering smooth 3D shapes, fractals, and procedural geometry.

## Requirements

### 1. Study Existing Examples First
- Read \`${EXAMPLES_DIR}/app/basic/page.tsx\` to understand the pattern
- Read \`${EXAMPLES_DIR}/app/uniforms/page.tsx\` for uniform handling
- Note: Uses \`ralph-gpu\` library with \`gpu.init()\` and \`ctx.pass()\`

### 2. Create the Raymarching Page
Create \`${EXAMPLES_DIR}/app/raymarching/page.tsx\` with:

**Visual Elements:**
- A rotating 3D scene with multiple primitive shapes (spheres, boxes, toruses)
- Smooth blending between shapes using SDF operations (union, intersection, smooth union)
- Basic lighting (at minimum: ambient + diffuse from a directional light)
- Soft shadows (optional but nice to have)
- Animated elements (rotation, pulsing, etc.)

**Technical Requirements:**
- Use 'use client' directive (Next.js client component)
- Follow the exact pattern from basic/page.tsx for initialization
- Use WGSL shader language
- Include proper cleanup on unmount
- Handle WebGPU not supported error

**Shader Structure (WGSL):**
\`\`\`wgsl
// SDF primitives
fn sdSphere(p: vec3f, r: f32) -> f32 { ... }
fn sdBox(p: vec3f, b: vec3f) -> f32 { ... }
fn sdTorus(p: vec3f, t: vec2f) -> f32 { ... }

// SDF operations  
fn opUnion(d1: f32, d2: f32) -> f32 { ... }
fn opSmoothUnion(d1: f32, d2: f32, k: f32) -> f32 { ... }

// Scene definition
fn map(p: vec3f) -> f32 { ... }

// Normal calculation
fn calcNormal(p: vec3f) -> vec3f { ... }

// Raymarching loop
fn raymarch(ro: vec3f, rd: vec3f) -> f32 { ... }

// Main fragment shader
@fragment fn main(...) -> @location(0) vec4f { ... }
\`\`\`

### 3. Add to Navigation (Optional)
If there's a navigation component, add the raymarching link.

## Important Notes
- The \`globals\` struct is automatically available with: resolution, time, deltaTime, frame, aspect
- Use \`globals.time\` for animation
- Camera should orbit around the scene or be positioned to show the 3D shapes nicely
- Make it visually impressive - this is a showcase example!

## Verification
After creating the file:
1. Check for TypeScript errors: \`bash({ command: 'cd ${EXAMPLES_DIR} && pnpm typecheck' })\`
2. Start the dev server and visually verify the raymarching works
3. Take a screenshot to confirm the 3D scene renders correctly

## Output
When done, call done() with a summary of what was created.
`;

async function main() {
  const startTime = Date.now();

  const agent = new LoopAgent({
    model: AGENT_MODEL,
    task: TASK,
    rules: [
      brainRule,
      visualCheckRule,
      explorationRule,
      minimalChangesRule,
      trackProgressRule,
    ],
    debug: DEBUG,
    limits: {
      maxIterations: 25,
      maxCost: 5.0,
      timeout: "15m",
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
        return "You're hitting the same error repeatedly. Try a different approach or check if there's a syntax error in your WGSL code.";
      }
      if (ctx.reason === "no_progress") {
        return "Focus on writing the raymarching shader. If you've explored enough, start implementing the page.tsx file.";
      }
      return "Try a simpler approach first, then iterate.";
    },
    onError: (error) => {
      console.error(`\n❌ Error: ${error.message}`);
    },
  });

  console.log("\n🚀 Starting agent...\n");

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
  process.exit(0);
}

main().catch((error) => {
  console.error("Fatal error:", error);
  process.exit(1);
});
