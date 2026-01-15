/**
 * 41-advanced-browser-tests: Add advanced WebGPU browser tests
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

const AI_GATEWAY_API_KEY = process.env.AI_GATEWAY_API_KEY;
const PROJECT_ROOT = process.env.PROJECT_ROOT || "../..";

if (!AI_GATEWAY_API_KEY) {
  console.error("❌ Missing AI_GATEWAY_API_KEY");
  process.exit(1);
}

const DEBUG = process.env.DEBUG === "true" || process.argv.includes("--debug");

const TASK = `
# Task: Add advanced WebGPU browser tests (ping-pong, sampler, particles, MRT)

## Working Directory & Navigation
This script runs from: ${process.cwd()}
Project root is: ${PROJECT_ROOT}

### Repository Structure
\`\`\`
ralph-gpu/
└── packages/core/tests/browser/
    ├── ping-pong.browser.test.ts (create)
    ├── sampler.browser.test.ts   (create)
    ├── particles.browser.test.ts (create)
    └── mrt.browser.test.ts       (create)
\`\`\`

### Navigation Instructions
- Repo files from ${PROJECT_ROOT}
- Example: \`cd ${PROJECT_ROOT}/packages/core\`
- Update progress in \`${process.cwd()}/.progress.md\`

## CRITICAL: Update Progress
After EVERY significant action, update .progress.md in this folder:
- Path: \${process.cwd()}/.progress.md
- Log what you did with timestamp
- Update checkboxes for acceptance criteria
- Document any errors

## Context
We need Playwright browser tests for advanced features: ping-pong rendering, samplers, particles, and MRT.

## Acceptance Criteria (ALL MUST BE MET)

### 1. Advanced browser test files
- [ ] Add \`ping-pong.browser.test.ts\`
- [ ] Add \`sampler.browser.test.ts\`
- [ ] Add \`particles.browser.test.ts\`
- [ ] Add \`mrt.browser.test.ts\`

### 2. Tests use test-utils
- [ ] Each test uses \`setupTest\`, \`readPixels\`, and \`teardown\` where appropriate
- [ ] Pixel checks use \`expectPixelNear\`

### 3. Feature coverage
- [ ] PingPong swaps and renders a stable color
- [ ] Sampler test verifies texture sampling works (e.g., nearest vs linear or explicit sampler)
- [ ] Particles test draws instanced particles (single frame ok)
- [ ] MRT test writes to multiple targets and validates output

## Implementation Guide
1. Use \`page.evaluate\` to run code in the browser.
2. Keep shaders small and deterministic.
3. Use \`context.pingPong\`, \`context.createSampler\`, \`context.particles\`, \`context.mrt\` APIs.
4. Validate output using \`readPixels\` and \`expectPixelNear\`.

### Example patterns

**PingPong**
\`\`\`ts
const { setupTest, readPixels, expectPixelNear, teardown } = (window as any).RalphTestUtils;
const { context } = await setupTest(16, 16);
const ping = context.pingPong(16, 16);
const pass = context.pass(/* wgsl */ \`
  @fragment
  fn main(@builtin(position) pos: vec4f) -> @location(0) vec4f {
    return vec4f(1.0, 0.0, 0.0, 1.0);
  }
\`);
context.setTarget(ping.write);
pass.draw();
ping.swap();
context.setTarget(ping.read);
const data = await readPixels(0, 0, 1, 1);
expectPixelNear(data, [255, 0, 0, 255], 3);
teardown();
\`\`\`

**Sampler**
\`\`\`ts
const { setupTest, readPixels, expectPixelNear, teardown } = (window as any).RalphTestUtils;
const { context } = await setupTest(8, 8);
const target = context.target(2, 2);
const writePass = context.pass(/* wgsl */ \`
  @fragment
  fn main(@builtin(position) pos: vec4f) -> @location(0) vec4f {
    let uv = pos.xy / globals.resolution;
    return uv.x < 0.5 ? vec4f(1.0, 0.0, 0.0, 1.0) : vec4f(0.0, 1.0, 0.0, 1.0);
  }
\`);
context.setTarget(target);
writePass.draw();
const sampler = context.createSampler({ magFilter: "nearest", minFilter: "nearest" });
const samplePass = context.pass(/* wgsl */ \`
  @group(1) @binding(0) var inputTex: texture_2d<f32>;
  @group(1) @binding(1) var inputSampler: sampler;
  @fragment
  fn main(@builtin(position) pos: vec4f) -> @location(0) vec4f {
    let uv = vec2f(0.25, 0.5);
    return textureSample(inputTex, inputSampler, uv);
  }
\`, { uniforms: { inputTex: { value: target.texture }, inputSampler: { value: sampler } } });
context.setTarget(null);
samplePass.draw();
const data = await readPixels(0, 0, 1, 1);
expectPixelNear(data, [255, 0, 0, 255], 3);
teardown();
\`\`\`

**Particles**
\`\`\`ts
const { setupTest, readPixels, expectPixelNear, teardown } = (window as any).RalphTestUtils;
const { context } = await setupTest(16, 16);
const particles = context.particles(1, {
  shader: /* wgsl */ \`
    struct Particle { pos: vec2f, size: f32, hue: f32 }
    @group(1) @binding(0) var<storage, read> particles: array<Particle>;
    struct VertexOutput { @builtin(position) position: vec4f, @location(0) uv: vec2f, @location(1) hue: f32 }
    @vertex
    fn vs_main(@builtin(instance_index) iid: u32, @builtin(vertex_index) vid: u32) -> VertexOutput {
      let p = particles[iid];
      let quadPos = quadOffset(vid) * p.size;
      var out: VertexOutput;
      out.position = vec4f(p.pos + quadPos, 0.0, 1.0);
      out.uv = quadUV(vid);
      out.hue = p.hue;
      return out;
    }
    @fragment
    fn fs_main(in: VertexOutput) -> @location(0) vec4f {
      return vec4f(1.0, 0.0, 0.0, 1.0);
    }
  \`,
  bufferSize: 16,
});
particles.write(new Float32Array([0.0, 0.0, 1.0, 1.0]));
particles.draw();
const data = await readPixels(8, 8, 1, 1);
expectPixelNear(data, [255, 0, 0, 255], 3);
teardown();
\`\`\`

**MRT**
\`\`\`ts
const { setupTest, readPixels, expectPixelNear, teardown } = (window as any).RalphTestUtils;
const { context } = await setupTest(8, 8);
const mrt = context.mrt({ color0: { format: "rgba8unorm" }, color1: { format: "rgba8unorm" } }, 8, 8);
const pass = context.pass(/* wgsl */ \`
  @fragment
  fn main(@builtin(position) pos: vec4f) -> @location(0) vec4f {
    return vec4f(0.0, 0.0, 1.0, 1.0);
  }
\`);
context.setTarget(mrt);
pass.draw();
const target0 = mrt.get("color0");
const data = await target0.readPixels(0, 0, 1, 1);
expectPixelNear(data as Uint8Array, [0, 0, 255, 255], 3);
teardown();
\`\`\`

## Testing Commands
\`\`\`bash
cd ${PROJECT_ROOT}/packages/core
npx playwright test --list --config playwright.config.ts
\`\`\`
`;

async function fileExists(filePath: string): Promise<boolean> {
  return fs
    .access(filePath)
    .then(() => true)
    .catch(() => false);
}

async function checkFeatureImplemented(): Promise<boolean> {
  const testsDir = path.join(PROJECT_ROOT, "packages/core/tests/browser");
  const files = [
    "ping-pong.browser.test.ts",
    "sampler.browser.test.ts",
    "particles.browser.test.ts",
    "mrt.browser.test.ts",
  ];
  for (const file of files) {
    if (!(await fileExists(path.join(testsDir, file)))) {
      return false;
    }
  }
  return true;
}

async function main() {
  const startTime = Date.now();

  const agent = new LoopAgent({
    model: "google/gemini-3-flash",
    trace: true,
    task: TASK,
    rules: [brainRule, trackProgressRule, minimalChangesRule, completionRule],
    debug: DEBUG,
    limits: {
      maxIterations: 30,
      maxCost: 15.0,
      timeout: "60m",
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

  console.log("🚀 Starting agent...\n");

  const result = await agent.run();

  console.log("\n📊 Results");
  console.log(`✅ Success: ${result.success}`);
  console.log(`🔄 Iterations: ${result.iterations}`);
  console.log(`💰 Cost: $${result.cost.toFixed(4)}`);
  console.log(`⏱️ Duration: ${(result.elapsed / 1000).toFixed(1)}s`);

  const passed = await checkFeatureImplemented();
  console.log(`\n${passed ? "🎉 All checks passed!" : "⚠️ Some checks failed"}`);

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
