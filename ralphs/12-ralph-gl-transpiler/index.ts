/**
 * Ralph 12: WGSL to GLSL Transpiler (Basic Implementation)
 * 
 * Implements a basic WGSL to GLSL ES 3.0 transpiler for simple shader patterns.
 * Uses regex-based approach for performance and small bundle size.
 */

import "dotenv/config";
import {
  LoopAgent,
  brainRule,
  minimalChangesRule,
  trackProgressRule,
  testFirstRule,
} from "@ralph/agent-loop";
import * as fs from "fs/promises";

const AI_GATEWAY_API_KEY = process.env.AI_GATEWAY_API_KEY;
const AGENT_MODEL = process.env.AGENT_MODEL || "anthropic/claude-sonnet-4-20250514";
const PROJECT_ROOT = process.env.PROJECT_ROOT || "../..";

if (!AI_GATEWAY_API_KEY) {
  console.error("❌ Missing AI_GATEWAY_API_KEY in environment");
  process.exit(1);
}

const DEBUG = process.env.DEBUG === "true" || process.argv.includes("--debug");

console.log("🔷 Ralph 12 - WGSL→GLSL Transpiler");
console.log("━".repeat(60));
console.log(`📁 Project: ${PROJECT_ROOT}`);
console.log(`🧠 Model: ${AGENT_MODEL}`);
if (DEBUG) console.log(`🐛 Debug: enabled`);
console.log("━".repeat(60));

const RALPH_GL_PKG = `${PROJECT_ROOT}/packages/ralph-gl`;

const TASK = `
# Task: Implement WGSL to GLSL Transpiler

## Working Directory
Script running from: ${process.cwd()}
ralph-gl package: ${RALPH_GL_PKG}

## CRITICAL: Update Progress
Update ${RALPH_GL_PKG}/brain/progress.md:
- Mark Ralph 02 as "In Progress" when you start
- Update with completed tasks
- Mark as "Done" when finished

## Context

Read ${RALPH_GL_PKG}/brain/architecture.md for the transpiler design.

The transpiler needs to convert WGSL shaders to GLSL ES 3.0. Start with a regex-based
approach for common patterns. It doesn't need to handle every WGSL feature - just the
subset we use in ralph-gpu examples.

## Implementation Location

File: ${RALPH_GL_PKG}/src/transpiler.ts

## Required Functionality

### 1. Type Conversions

Map WGSL types to GLSL:
- \`f32\` → \`float\`
- \`u32\` → \`uint\`
- \`i32\` → \`int\`
- \`vec2f\` → \`vec2\`
- \`vec3f\` → \`vec3\`
- \`vec4f\` → \`vec4\`
- \`mat4x4f\` → \`mat4\`
- \`bool\` → \`bool\`

### 2. Entry Point Conversion

**Fragment shader:**
\`\`\`wgsl
@fragment
fn main(@builtin(position) pos: vec4f) -> @location(0) vec4f {
  return vec4f(1.0);
}
\`\`\`

→

\`\`\`glsl
#version 300 es
precision highp float;

void main() {
  vec4 pos = gl_FragCoord;
  gl_FragColor = vec4(1.0);
}
\`\`\`

**Vertex shader:**
\`\`\`wgsl
@vertex
fn main(@builtin(vertex_index) vid: u32) -> @builtin(position) vec4f {
  return vec4f(0.0);
}
\`\`\`

→

\`\`\`glsl
#version 300 es
precision highp float;

void main() {
  uint vid = uint(gl_VertexID);
  gl_Position = vec4(0.0);
}
\`\`\`

### 3. Uniform Extraction

Extract uniforms from bind group syntax:

\`\`\`wgsl
struct Params { amplitude: f32, color: vec3f }
@group(1) @binding(0) var<uniform> u: Params;
\`\`\`

→

\`\`\`glsl
uniform float u_amplitude;
uniform vec3 u_color;
\`\`\`

Return uniform info: \`{ name: "u_amplitude", type: "float" }\`

### 4. Texture/Sampler Handling

\`\`\`wgsl
@group(1) @binding(0) var tex: texture_2d<f32>;
@group(1) @binding(1) var samp: sampler;
\`\`\`

→

\`\`\`glsl
uniform sampler2D u_tex;
\`\`\`

Combine texture + sampler into single sampler2D.

### 5. Global Uniforms

Auto-inject globals at the top:

\`\`\`glsl
uniform vec2 u_globals_resolution;
uniform float u_globals_time;
uniform float u_globals_deltaTime;
uniform uint u_globals_frame;
uniform float u_globals_aspect;
\`\`\`

### 6. Function Calls

Common functions:
- \`textureSample(tex, samp, uv)\` → \`texture(tex, uv)\`
- \`vec4f()\` → \`vec4()\`
- \`select(a, b, cond)\` → \`cond ? b : a\`

## API

\`\`\`typescript
interface UniformInfo {
  name: string
  type: 'float' | 'vec2' | 'vec3' | 'vec4' | 'mat4' | 'sampler2D'
}

interface TranspileResult {
  glsl: string
  uniforms: UniformInfo[]
}

export function transpileWGSL(
  wgsl: string,
  stage: 'vertex' | 'fragment'
): TranspileResult
\`\`\`

## Unit Tests

Create ${RALPH_GL_PKG}/tests/transpiler.test.ts with tests for:

1. Simple fragment shader
2. Type conversions
3. Uniform extraction
4. Builtin variables
5. Texture handling
6. Struct flattening

Example test:
\`\`\`typescript
import { describe, it, expect } from 'vitest'
import { transpileWGSL } from '../src/transpiler'

describe('transpileWGSL', () => {
  it('should convert simple fragment shader', () => {
    const wgsl = \`
      @fragment
      fn main() -> @location(0) vec4f {
        return vec4f(1.0, 0.0, 0.0, 1.0);
      }
    \`
    
    const result = transpileWGSL(wgsl, 'fragment')
    expect(result.glsl).toContain('void main()')
    expect(result.glsl).toContain('gl_FragColor')
    expect(result.glsl).toContain('vec4(1.0, 0.0, 0.0, 1.0)')
  })
  
  it('should extract uniforms from struct', () => {
    const wgsl = \`
      struct Params { value: f32 }
      @group(1) @binding(0) var<uniform> u: Params;
    \`
    
    const result = transpileWGSL(wgsl, 'fragment')
    expect(result.uniforms).toContainEqual({ name: 'u_value', type: 'float' })
  })
})
\`\`\`

## Testing

Run tests:
\`\`\`bash
cd ${RALPH_GL_PKG}
pnpm test
\`\`\`

## Acceptance Criteria

### Implementation
- [ ] transpiler.ts created with transpileWGSL function
- [ ] Type conversion working (f32→float, vec3f→vec3, etc.)
- [ ] Entry point conversion (@ fragment → void main)
- [ ] Builtin variables mapped (@ builtin(position) → gl_FragCoord)
- [ ] Uniform extraction from @group/@binding
- [ ] Struct flattening (struct Params → separate uniforms)
- [ ] Texture/sampler handling
- [ ] Global uniforms auto-injected

### Testing
- [ ] transpiler.test.ts created
- [ ] All tests passing
- [ ] Coverage of main features

### Documentation
- [ ] JSDoc comments on public functions
- [ ] Examples in comments
- [ ] brain/progress.md updated

## Important Notes

- Keep it simple - regex-based is fine
- Handle common patterns, not every WGSL feature
- Add TODOs for complex cases
- Prioritize bundle size over completeness
- Document limitations in brain/architecture.md
`;

async function checkTranspilerExists(): Promise<boolean> {
  try {
    const code = await fs.readFile(`${RALPH_GL_PKG}/src/transpiler.ts`, "utf-8");
    return code.includes("transpileWGSL") && code.includes("export");
  } catch {
    return false;
  }
}

async function checkTestsExist(): Promise<boolean> {
  try {
    const code = await fs.readFile(`${RALPH_GL_PKG}/tests/transpiler.test.ts`, "utf-8");
    return code.includes("describe") && code.includes("transpileWGSL");
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
    rules: [brainRule, minimalChangesRule, trackProgressRule, testFirstRule],
    debug: DEBUG,
    limits: {
      maxIterations: 60,
      maxCost: 15.0,
      timeout: "45m",
    },
    onUpdate: (status) => {
      const elapsed = ((Date.now() - startTime) / 1000).toFixed(1);
      console.log(`[${elapsed}s] Iteration ${status.iteration} | Cost: $${status.cost.toFixed(4)}`);
    },
  });

  console.log("\n🚀 Starting Ralph 12: WGSL→GLSL Transpiler\n");
  const result = await agent.run();

  console.log("\n" + "━".repeat(60));
  console.log("📊 Results");
  console.log("━".repeat(60));
  console.log(`✅ Success: ${result.success}`);
  console.log(`🔄 Iterations: ${result.iterations}`);
  console.log(`💰 Cost: $${result.cost.toFixed(4)}`);
  console.log("━".repeat(60));

  const transpiler = await checkTranspilerExists();
  console.log(`${transpiler ? "✅" : "❌"} Transpiler implemented`);

  const tests = await checkTestsExist();
  console.log(`${tests ? "✅" : "❌"} Tests created`);

  const allPassed = transpiler && tests;
  console.log(`\n${allPassed ? "🎉" : "⚠️"} ${allPassed ? "All checks passed!" : "Some checks failed"}`);

  if (!result.success) process.exit(1);
  console.log("\n✨ Ralph 12 complete! Next: Ralph 13 (Types & Errors)");
  process.exit(allPassed ? 0 : 1);
}

main().catch((error) => {
  console.error("Fatal error:", error);
  process.exit(1);
});
