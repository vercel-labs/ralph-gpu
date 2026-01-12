/**
 * 06-raymarching-gallery: Create a gallery of raymarching examples
 *
 * This script uses the LoopAgent to implement multiple interesting raymarching
 * examples showcasing different techniques and visual effects.
 */

import "dotenv/config";
import {
  LoopAgent,
  brainRule,
  visualCheckRule,
  explorationRule,
  minimalChangesRule,
  trackProgressRule,
} from "@ralph/agent-loop";

// Get configuration from environment
const AI_GATEWAY_API_KEY = process.env.AI_GATEWAY_API_KEY;
const AGENT_MODEL =
  process.env.AGENT_MODEL || "anthropic/claude-sonnet-4-20250514";
const PROJECT_ROOT = process.env.PROJECT_ROOT || process.cwd();

if (!AI_GATEWAY_API_KEY) {
  console.error("❌ Missing AI_GATEWAY_API_KEY in environment");
  process.exit(1);
}

// Check for debug flag
const DEBUG = process.env.DEBUG === "true" || process.argv.includes("--debug");

console.log("🎨 Ralph Agent - Raymarching Gallery Generator");
console.log("━".repeat(55));
console.log(`📁 Project: ${PROJECT_ROOT}`);
console.log(`🧠 Model: ${AGENT_MODEL}`);
if (DEBUG) {
  console.log(`🐛 Debug: enabled`);
}
console.log("━".repeat(55));

const EXAMPLES_DIR = `${PROJECT_ROOT}/apps/examples`;

const TASK = `
# Task: Create a Raymarching Examples Gallery

## Working Directory
You are running from: ${process.cwd()}
Project root is: ${PROJECT_ROOT}
Examples directory is: ${EXAMPLES_DIR}

## Objective
Create 5 new raymarching example pages, each showcasing a different raymarching technique or visual effect. These should be impressive visual demos that demonstrate the power of raymarching.

## IMPORTANT: Study First!
Before creating ANY files, you MUST:
1. Read the existing raymarching example at \`${EXAMPLES_DIR}/app/raymarching/page.tsx\` - this shows the exact pattern to follow
2. Note how it uses \`ralph-gpu\` with \`gpu.init()\` and \`ctx.pass()\`
3. The \`globals\` struct is auto-injected with: resolution, time, deltaTime, frame, aspect

## The 5 Examples to Create

### 1. Mandelbulb Fractal (\`${EXAMPLES_DIR}/app/mandelbulb/page.tsx\`)
A 3D Mandelbrot fractal - the famous "Mandelbulb":
- Use the standard Mandelbulb formula with power 8
- Implement orbit trapping for coloring
- Add glow effect based on iteration count
- Camera should slowly orbit around the fractal
- Use dramatic lighting to show the fractal detail

Key formula:
\`\`\`
r = length(z)
theta = acos(z.z / r)
phi = atan2(z.y, z.x)
r^n * (sin(n*theta)*cos(n*phi), sin(n*theta)*sin(n*phi), cos(n*theta)) + c
\`\`\`

### 2. Infinite Terrain (\`${EXAMPLES_DIR}/app/terrain/page.tsx\`)
Procedural infinite terrain using raymarching:
- Use FBM (Fractal Brownian Motion) noise for terrain height
- Implement fog that increases with distance
- Add simple sky with gradient and sun
- Camera flies forward infinitely over the terrain
- Optional: water plane with reflections

Key techniques:
- Noise functions (value noise or simplex)
- FBM layering: fbm(p) = noise(p) + 0.5*noise(2*p) + 0.25*noise(4*p) + ...
- Height field SDF: p.y - terrain_height(p.xz)

### 3. Metaballs / Blobs (\`${EXAMPLES_DIR}/app/metaballs/page.tsx\`)
Classic metaball effect with organic blob shapes:
- Multiple spheres that smoothly blend together
- Animate spheres moving around, attracting/repelling
- Use smooth minimum (smin) for organic blending
- Subsurface scattering approximation for translucent look
- Iridescent/rainbow coloring based on surface normal

Key formula for smooth min:
\`\`\`
smin(a, b, k) = -log(exp(-k*a) + exp(-k*b)) / k
// or polynomial version:
h = max(k - abs(a-b), 0) / k
smin(a, b, k) = min(a, b) - h*h*h*k/6
\`\`\`

### 4. Morphing Primitives (\`${EXAMPLES_DIR}/app/morphing/page.tsx\`)
Smooth morphing between different 3D primitives:
- Cycle through: Sphere → Cube → Torus → Octahedron → Sphere
- Use linear interpolation (lerp/mix) between SDFs
- Add "twist" and "bend" domain distortions during transitions
- Holographic/wireframe overlay effect
- Glowing edges at shape boundaries

Key technique - SDF interpolation:
\`\`\`
mix(sdSphere(p, r), sdBox(p, b), t)  // t from 0 to 1
\`\`\`

### 5. Alien Planet / Space Scene (\`${EXAMPLES_DIR}/app/alien-planet/page.tsx\`)
An alien planet scene with atmosphere:
- Large planet with procedural surface detail (craters, mountains)
- Atmospheric scattering effect (glow around planet edge)
- Starfield background with twinkling
- Optional: rings around the planet (like Saturn)
- Optional: small moon orbiting
- Volumetric god rays from a distant sun

Key techniques:
- Atmospheric scattering approximation
- Fresnel effect for rim lighting
- Procedural star field using hash functions

## Technical Requirements for ALL Examples

Each page.tsx MUST:
1. Start with \`'use client';\`
2. Import: \`import { useEffect, useRef } from 'react';\`
3. Import: \`import { gpu, GPUContext } from 'ralph-gpu';\`
4. Follow the EXACT initialization pattern from the existing raymarching example
5. Include proper cleanup on unmount (dispose context, cancel animation frame)
6. Have a title, description, and styled canvas

## Shader Structure Template
\`\`\`wgsl
// Constants
const MAX_STEPS: i32 = 100;
const MAX_DIST: f32 = 100.0;
const SURF_DIST: f32 = 0.001;

// SDF functions...
// Scene map function...
// Normal calculation...
// Raymarching loop...

@fragment
fn main(@builtin(position) fragCoord: vec4f) -> @location(0) vec4f {
  var uv = (fragCoord.xy - 0.5 * globals.resolution) / globals.resolution.y;
  uv.y = -uv.y; // Flip Y for WebGPU
  
  // Camera setup...
  // Raymarching...
  // Lighting...
  // Post-processing...
  
  return vec4f(col, 1.0);
}
\`\`\`

## Implementation Order
0. Check the real progress of the task, it may be already started
1. First, read the existing raymarching example thoroughly
2. Create examples ONE AT A TIME in this order: mandelbulb → terrain → metaballs → morphing → alien-planet
3. After creating each file, run typecheck: \`cd ${EXAMPLES_DIR} && pnpm typecheck\`
4. If there are errors, fix them before moving to the next example
5. After ALL examples are created, start the dev server and take screenshots to verify

## Visual Verification
After creating all examples:
1. Start dev server: \`cd ${EXAMPLES_DIR} && pnpm dev\`
2. Open browser to http://localhost:3000
3. Navigate to each new example and take a screenshot
4. Verify each one renders correctly with animation

## Completion
Call done() with a summary listing all created examples and their features.
`;

async function main() {
  const startTime = Date.now();

  const agent = new LoopAgent({
    model: AGENT_MODEL,
    trace: true, // Writes to .traces/trace-{timestamp}.ndjson
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
        return "You're hitting the same error repeatedly. Check your WGSL syntax carefully - common issues: missing semicolons, wrong types (f32 vs i32), invalid function calls. Try simplifying the shader.";
      }
      if (ctx.reason === "no_progress") {
        return "Focus on completing one example at a time. If you've been reading files, start writing code. Create the simplest working version first, then enhance it.";
      }
      if (ctx.reason === "repetitive") {
        return "You're repeating the same actions. Move on to the next step - if reading, start writing; if stuck on one example, move to the next.";
      }
      return "Try a simpler approach. Start with basic shapes and add complexity incrementally.";
    },
    onError: (error) => {
      console.error(`\n❌ Error: ${error.message}`);
    },
  });

  console.log("\n🚀 Starting agent...\n");
  console.log("Creating 5 raymarching examples:");
  console.log("  1. Mandelbulb Fractal");
  console.log("  2. Infinite Terrain");
  console.log("  3. Metaballs / Blobs");
  console.log("  4. Morphing Primitives");
  console.log("  5. Alien Planet Scene");
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
