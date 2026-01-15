/**
 * 63-more-examples: Add more creative shader examples to the gallery
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
# Task: Add More Shader Examples

## Working Directory & Navigation
This script is running from: ${process.cwd()}
Project root is: ${PROJECT_ROOT}

### Repository Structure
\`\`\`
ralph-gpu/                    (project root)
├── apps/
│   └── docs/                 (Next.js docs app)
│       └── lib/
│           └── examples.ts   (← MODIFY - add more examples)
└── ralphs/
    └── 63-more-examples/     (← YOU ARE HERE)
\`\`\`

### Navigation Instructions
- To access project files: use relative paths from ${PROJECT_ROOT}
- Example: To edit examples: \`${PROJECT_ROOT}/apps/docs/lib/examples.ts\`

## ⚠️ CRITICAL: CHECK EXISTING PROGRESS FIRST ⚠️
**BEFORE doing ANY work, you MUST:**
1. Check if .progress.md exists: \`cat ${process.cwd()}/.progress.md 2>/dev/null || echo "No progress file"\`
2. Read existing examples at apps/docs/lib/examples.ts

**If progress exists, CONTINUE from where you left off. DO NOT restart from scratch!**

## Context
The examples gallery currently has 3 examples (gradient, wave, color-cycle). We need to add more creative and educational shader examples.

Current Examples Interface:
\`\`\`typescript
export interface Example {
  slug: string;
  title: string;
  description: string;
  shader: string;
  uniforms?: Record<string, { value: number | number[] }>;
  animated?: boolean;
}
\`\`\`

## Acceptance Criteria (ALL MUST BE MET)

### 1. Add 4 New Examples
Add these examples to apps/docs/lib/examples.ts:

- [ ] **raymarching** - Simple raymarching sphere (3D rendering technique)
- [ ] **noise** - Perlin or simplex noise pattern  
- [ ] **metaballs** - Animated metaballs effect
- [ ] **fractal** - Mandelbrot or Julia set fractal

### 2. Each Example Must Have
- [ ] slug: URL-safe identifier
- [ ] title: Display name
- [ ] description: Brief explanation (1-2 sentences)
- [ ] shader: Working WGSL fragment shader code
- [ ] animated: true for animated examples, false for static

### 3. Build Verification
- [ ] pnpm build --filter docs passes with no errors

### 4. Visual Verification
- [ ] Start dev server and navigate to /examples
- [ ] Screenshot shows all 7 example cards in gallery
- [ ] Navigate to one of the new examples (e.g. /examples/raymarching)
- [ ] Screenshot shows the shader rendering correctly

## Implementation Guide

### Example: Raymarching Sphere
\`\`\`wgsl
@fragment
fn main(@builtin(position) pos: vec4f) -> @location(0) vec4f {
  let uv = (pos.xy - globals.resolution * 0.5) / min(globals.resolution.x, globals.resolution.y);
  
  // Camera
  let ro = vec3f(0.0, 0.0, -3.0);
  let rd = normalize(vec3f(uv, 1.0));
  
  // Raymarching
  var t = 0.0;
  for (var i = 0; i < 64; i++) {
    let p = ro + rd * t;
    let d = length(p) - 1.0; // sphere SDF
    if (d < 0.001) { break; }
    t += d;
  }
  
  // Shading
  let p = ro + rd * t;
  let n = normalize(p);
  let light = normalize(vec3f(1.0, 1.0, -1.0));
  let diff = max(dot(n, light), 0.0);
  
  let col = vec3f(0.2, 0.5, 1.0) * (diff * 0.8 + 0.2);
  return vec4f(col, 1.0);
}
\`\`\`

### Example: Simple Noise
\`\`\`wgsl
// Include a simple hash function and noise
fn hash(p: vec2f) -> f32 {
  return fract(sin(dot(p, vec2f(127.1, 311.7))) * 43758.5453);
}

fn noise(p: vec2f) -> f32 {
  let i = floor(p);
  let f = fract(p);
  let u = f * f * (3.0 - 2.0 * f);
  return mix(
    mix(hash(i), hash(i + vec2f(1.0, 0.0)), u.x),
    mix(hash(i + vec2f(0.0, 1.0)), hash(i + vec2f(1.0, 1.0)), u.x),
    u.y
  );
}

@fragment
fn main(@builtin(position) pos: vec4f) -> @location(0) vec4f {
  let uv = pos.xy / globals.resolution;
  var n = 0.0;
  var amp = 0.5;
  var freq = 4.0;
  for (var i = 0; i < 5; i++) {
    n += amp * noise(uv * freq + globals.time * 0.5);
    amp *= 0.5;
    freq *= 2.0;
  }
  return vec4f(vec3f(n), 1.0);
}
\`\`\`

### Example: Metaballs
\`\`\`wgsl
@fragment
fn main(@builtin(position) pos: vec4f) -> @location(0) vec4f {
  let uv = (pos.xy - globals.resolution * 0.5) / globals.resolution.y;
  
  // Ball positions (animated)
  let t = globals.time;
  let p1 = vec2f(sin(t) * 0.3, cos(t * 1.3) * 0.3);
  let p2 = vec2f(sin(t * 0.7 + 2.0) * 0.3, cos(t) * 0.3);
  let p3 = vec2f(sin(t * 1.2 + 4.0) * 0.3, cos(t * 0.8 + 1.0) * 0.3);
  
  // Metaball field
  let r = 0.1;
  let field = r / length(uv - p1) + r / length(uv - p2) + r / length(uv - p3);
  
  // Threshold and color
  let threshold = 1.0;
  let c = smoothstep(threshold, threshold + 0.1, field);
  let col = mix(vec3f(0.1, 0.1, 0.2), vec3f(0.2, 0.8, 1.0), c);
  
  return vec4f(col, 1.0);
}
\`\`\`

## Testing Commands
\`\`\`bash
cd ${PROJECT_ROOT}
pnpm build --filter docs
\`\`\`

## Browser Automation
⚠️ **CRITICAL**: Browser automation ALWAYS runs in headless mode.
- Visual verification (screenshot + no console errors) is SUFFICIENT
- After ONE successful visual verification → call done() immediately

## Completion Criteria
When ALL acceptance criteria are met:
1. Update .progress.md to mark all items [x] complete
2. Call done({ summary: "..." }) IMMEDIATELY
3. Do NOT re-read files or take more screenshots

## Recovery Rules
- Do NOT delete node_modules or pnpm-lock.yaml
- If build fails, READ the error and fix the actual issue
- If a shader doesn't work, simplify it

## 🚨 FIRST ACTION - ALWAYS DO THIS FIRST 🚨
Your VERY FIRST action must be to check existing progress and read the current examples.ts file.
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

  console.log("🚀 Starting more examples agent...\n");

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
