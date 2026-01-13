/**
 * Ralph 18: Uniform Handling & Auto-Injection
 */

import "dotenv/config";
import { LoopAgent, brainRule, minimalChangesRule, trackProgressRule, testFirstRule } from "@ralph/agent-loop";

const TASK = `
# Task: Implement Uniform Handling

File: packages/ralph-gl/src/uniforms.ts

Implement:
1. extractUniforms(shaderSource) - parse GLSL for uniform declarations
2. setUniform(gl, location, value) - type detection and gl.uniform* calls
3. Auto-inject global uniforms into shader source
4. Three.js style: { value: X } pattern

Types to handle:
- number → uniform float
- [x, y] → uniform vec2
- [x, y, z] → uniform vec3
- [x, y, z, w] → uniform vec4
- Float32Array(16) → uniform mat4
- RenderTarget → uniform sampler2D

Update Pass class to use this.

Create test-uniforms.html to verify animated uniforms work.

Update brain/progress.md (mark Ralph 04 complete).
`;

async function main() {
  const agent = new LoopAgent({
    model: process.env.AGENT_MODEL || "anthropic/claude-sonnet-4-20250514",
    trace: true,
    task: TASK,
    rules: [brainRule, minimalChangesRule, trackProgressRule, testFirstRule],
    limits: { maxIterations: 40, maxCost: 8.0, timeout: "30m" },
  });

  console.log("\n🚀 Ralph 18: Uniform Handling\n");
  const result = await agent.run();
  console.log(`\n${result.success ? "✅" : "❌"} Ralph 18 ${result.success ? "complete" : "failed"}`);
  process.exit(result.success ? 0 : 1);
}

main().catch((err) => { console.error(err); process.exit(1); });
