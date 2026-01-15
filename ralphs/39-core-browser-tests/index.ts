/**
 * 39-core-browser-tests: Add core WebGPU Playwright browser tests
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
# Task: Add core WebGPU browser tests (context/pass/compute/storage/target)

## Working Directory & Navigation
This script runs from: ${process.cwd()}
Project root is: ${PROJECT_ROOT}

### Repository Structure
\`\`\`
ralph-gpu/
└── packages/core/tests/browser/
    ├── test-utils.ts
    ├── context.browser.test.ts    (create)
    ├── pass.browser.test.ts       (create)
    ├── compute.browser.test.ts    (create)
    ├── storage.browser.test.ts    (create)
    └── target.browser.test.ts     (create)
\`\`\`

### Navigation Instructions
- Repo files from ${PROJECT_ROOT}
- Example: \`cd ${PROJECT_ROOT}/packages/core\`
- Update progress in \`${process.cwd()}/.progress.md\`

## CRITICAL: Update Progress
After EVERY significant action, update .progress.md in this folder.

## Context
We need Playwright tests that run in the browser with real WebGPU for core features: context, pass, compute, storage, and render targets.

## Acceptance Criteria (ALL MUST BE MET)

### 1. Core browser test files
- [ ] Add \`context.browser.test.ts\`
- [ ] Add \`pass.browser.test.ts\`
- [ ] Add \`compute.browser.test.ts\`
- [ ] Add \`storage.browser.test.ts\`
- [ ] Add \`target.browser.test.ts\`

### 2. Each test file uses test-utils
- [ ] Each test uses \`setupTest\`, \`readPixels\`, and \`teardown\` where appropriate
- [ ] \`tests/browser/index.ts\` exposes \`window.RalphTestUtils\`

### 3. Real WebGPU behavior covered
- [ ] Context test verifies \`gpu.isSupported()\` and initialization
- [ ] Pass test renders a solid color and validates pixel output
- [ ] Compute test writes to a storage buffer and validates readback
- [ ] Storage test writes/reads a storage buffer and checks data
- [ ] Target test renders to a RenderTarget and validates readPixels

## Implementation Guide
1. Update \`packages/core/tests/browser/index.ts\` to:
   - import \`./test-utils\` and assign to \`window.RalphTestUtils\`.
2. Create the five test files listed above in \`packages/core/tests/browser/\` with minimal tests:
   - Use \`page.goto("/tests/browser/index.html")\` (assumes Playwright baseURL).
   - Use \`const { setupTest, readPixels, teardown, expectPixelNear } = (window as any).RalphTestUtils;\`
3. Keep shaders minimal (solid colors, simple compute).
4. Ensure tests clean up by calling \`teardown()\`.
5. Do NOT run \`playwright test --list\` until files exist.

### Example snippets to use

**Context test (fragment):**
\`\`\`ts
const result = await page.evaluate(async () => {
  const { setupTest, teardown } = (window as any).RalphTestUtils;
  const { gpu } = (window as any).RalphGPU;
  const { context } = await setupTest(64, 64);
  const supported = gpu.isSupported();
  const size = [context.width, context.height];
  teardown();
  return { supported, size };
});
\`\`\`

**Pass test (fragment):**
\`\`\`ts
const pixels = await page.evaluate(async () => {
  const { setupTest, readPixels, teardown, expectPixelNear } = (window as any).RalphTestUtils;
  const { context } = await setupTest(32, 32);
  const pass = context.pass(/* wgsl */ \`
    @fragment
    fn main(@builtin(position) pos: vec4f) -> @location(0) vec4f {
      return vec4f(1.0, 0.0, 0.0, 1.0);
    }
  \`);
  pass.draw();
  const data = await readPixels(0, 0, 1, 1);
  teardown();
  return Array.from(data.slice(0, 4));
});
\`\`\`

**Compute test (fragment):**
\`\`\`ts
const result = await page.evaluate(async () => {
  const { setupTest, readPixels, teardown } = (window as any).RalphTestUtils;
  const { context } = await setupTest(16, 16);
  const target = context.target(16, 16, { usage: "storage" });
  const compute = context.compute(/* wgsl */ \`
    @group(1) @binding(0) var outputTex: texture_storage_2d<rgba8unorm, write>;
    @compute @workgroup_size(8, 8)
    fn main(@builtin(global_invocation_id) id: vec3<u32>) {
      if (id.x >= 16u || id.y >= 16u) { return; }
      textureStore(outputTex, vec2u(id.xy), vec4f(0.0, 1.0, 0.0, 1.0));
    }
  \`, { uniforms: { outputTex: { value: target } } });
  compute.dispatch(2, 2);
  context.setTarget(target);
  const data = await readPixels(0, 0, 1, 1);
  teardown();
  return Array.from(data.slice(0, 4));
});
\`\`\`

**Storage test (fragment):**
\`\`\`ts
const values = await page.evaluate(async () => {
  const { setupTest, readPixels, teardown } = (window as any).RalphTestUtils;
  const { context } = await setupTest(8, 8);
  const buffer = context.storage(16);
  buffer.write(new Float32Array([0.25, 0.5, 0.75, 1.0]));
  const pass = context.pass(/* wgsl */ \`
    @group(1) @binding(0) var<storage, read> data: array<f32>;
    @fragment
    fn main(@builtin(position) pos: vec4f) -> @location(0) vec4f {
      return vec4f(data[0], data[1], data[2], data[3]);
    }
  \`);
  pass.storage("data", buffer);
  pass.draw();
  const data = await readPixels(0, 0, 1, 1);
  teardown();
  return Array.from(data.slice(0, 4));
});
\`\`\`

**Target test (fragment):**
\`\`\`ts
const pixels = await page.evaluate(async () => {
  const { setupTest, readPixels, teardown } = (window as any).RalphTestUtils;
  const { context } = await setupTest(16, 16);
  const target = context.target(16, 16);
  const pass = context.pass(/* wgsl */ \`
    @fragment
    fn main(@builtin(position) pos: vec4f) -> @location(0) vec4f {
      return vec4f(0.0, 0.0, 1.0, 1.0);
    }
  \`);
  context.setTarget(target);
  pass.draw();
  const data = await readPixels(0, 0, 1, 1);
  teardown();
  return Array.from(data.slice(0, 4));
});
\`\`\`

## Testing Commands
\`\`\`bash
cd ${PROJECT_ROOT}/packages/core
pnpm test:browser -- --list
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
    "context.browser.test.ts",
    "pass.browser.test.ts",
    "compute.browser.test.ts",
    "storage.browser.test.ts",
    "target.browser.test.ts",
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
