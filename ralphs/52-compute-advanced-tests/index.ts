/**
 * 52-compute-advanced-tests: Advanced compute shader tests (texture sampling, storage textures)
 */

import "dotenv/config";
import { LoopAgent, brainRule, trackProgressRule, minimalChangesRule, completionRule } from "@ralph/agent-loop";
import * as fs from "fs/promises";
import * as path from "path";

const AI_GATEWAY_API_KEY = process.env.AI_GATEWAY_API_KEY;
const PROJECT_ROOT = process.env.PROJECT_ROOT || "../..";

if (!AI_GATEWAY_API_KEY) {
  console.error("❌ Missing AI_GATEWAY_API_KEY");
  process.exit(1);
}

const TASK = `
# Task: Add Compute Advanced Browser Tests

## Working Directory
This script runs from: ${process.cwd()}
Project root is: ${PROJECT_ROOT}

## Context
Advanced compute shader features to test:
1. Texture sampling in compute (textureSampleLevel)
2. Storage texture write (textureStore)
3. Multiple storage buffers

Look at existing compute.browser.test.ts for patterns.

## Acceptance Criteria

### 1. Create compute-advanced.browser.test.ts

### 2. Test texture sampling in compute shader
- Read from a texture using textureSampleLevel in compute
- Write results to storage buffer

### 3. Test storage texture write
- Use textureStore to write to a storage texture from compute

### 4. Tests pass

## Implementation Guide

Check existing tests in:
- compute.browser.test.ts - basic compute patterns
- sampler.browser.test.ts - texture sampling patterns

Example for texture in compute:
\`\`\`typescript
const compute = context.compute(/* wgsl */ \`
  @group(1) @binding(0) var inputTex: texture_2d<f32>;
  @group(1) @binding(1) var inputSampler: sampler;
  @group(1) @binding(2) var<storage, read_write> output: array<f32>;
  
  @compute @workgroup_size(1)
  fn main(@builtin(global_invocation_id) id: vec3u) {
    let color = textureSampleLevel(inputTex, inputSampler, vec2f(0.5), 0.0);
    output[0] = color.r;
  }
\`, {
  uniforms: {
    inputTex: { value: someTarget },
    inputSampler: { value: someSampler },
  }
});
\`\`\`

## Test Commands
\`\`\`bash
cd ${PROJECT_ROOT}/packages/core
pnpm build:test
pnpm test:browser tests/browser/compute-advanced.browser.test.ts
\`\`\`
`;

async function checkTestsImplemented(): Promise<boolean> {
  try {
    const testFile = path.join(PROJECT_ROOT, "packages/core/tests/browser/compute-advanced.browser.test.ts");
    const content = await fs.readFile(testFile, "utf-8").catch(() => "");
    return content.includes("compute") && content.includes("test.describe");
  } catch {
    return false;
  }
}

async function main() {
  const startTime = Date.now();
  const agent = new LoopAgent({
    model: "anthropic/claude-sonnet-4-20250514",
    trace: true,
    task: TASK,
    rules: [brainRule, trackProgressRule, minimalChangesRule, completionRule],
    limits: { maxIterations: 20, maxCost: 10.0, timeout: "30m" },
    onUpdate: (status) => {
      const elapsed = ((Date.now() - startTime) / 1000).toFixed(1);
      console.log(`[${elapsed}s] Iteration ${status.iteration} | Cost: $${status.cost.toFixed(4)}`);
    },
  });

  console.log("🚀 Starting compute advanced tests agent...\n");
  const result = await agent.run();
  console.log(`\n✅ Success: ${result.success} | Iterations: ${result.iterations} | Cost: $${result.cost.toFixed(4)}`);
  
  const passed = await checkTestsImplemented();
  console.log(passed ? "🎉 Tests implemented!" : "⚠️ Tests incomplete");
  process.exit(result.success && passed ? 0 : 1);
}

main().catch(console.error);
