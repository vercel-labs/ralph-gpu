/**
 * 53-material-advanced-tests: Custom vertex shaders, instancing, varyings
 */

import "dotenv/config";
import { LoopAgent, brainRule, trackProgressRule, minimalChangesRule, completionRule } from "@ralph/agent-loop";
import * as fs from "fs/promises";
import * as path from "path";

const PROJECT_ROOT = process.env.PROJECT_ROOT || "../..";

const TASK = `
# Task: Add Material Advanced Browser Tests

## Working Directory
This script runs from: ${process.cwd()}
Project root is: ${PROJECT_ROOT}

## Context
Material supports advanced features:
1. Custom vertex shaders - define your own @vertex function
2. Instancing - instances option for drawing multiple copies
3. Varyings - pass data from vertex to fragment shader

Look at existing particles.browser.test.ts for Material patterns.

## Acceptance Criteria

### 1. Create material-advanced.browser.test.ts

### 2. Test custom vertex shader
- Create material with custom @vertex function
- Render geometry defined in shader
- Verify no crash

### 3. Test instancing
- Create material with instances: N (e.g., 4)
- Draw multiple copies
- Verify it works

### 4. Tests pass

## Implementation Guide

Check existing particles.browser.test.ts for how Material is used.

Example custom vertex with varyings:
\`\`\`typescript
const material = context.material(/* wgsl */ \`
  struct VertexOutput {
    @builtin(position) position: vec4f,
    @location(0) color: vec3f,  // varying passed to fragment
  }
  
  @vertex
  fn vs(@builtin(vertex_index) vi: u32, @builtin(instance_index) ii: u32) -> VertexOutput {
    var positions = array<vec2f, 3>(
      vec2f(0.0, 0.5),
      vec2f(-0.5, -0.5),
      vec2f(0.5, -0.5),
    );
    var output: VertexOutput;
    let offset = vec2f(f32(ii) * 0.5 - 0.75, 0.0);
    output.position = vec4f(positions[vi] * 0.3 + offset, 0.0, 1.0);
    output.color = vec3f(f32(ii) / 3.0, 1.0 - f32(ii) / 3.0, 0.5);
    return output;
  }
  
  @fragment
  fn fs(in: VertexOutput) -> @location(0) vec4f {
    return vec4f(in.color, 1.0);
  }
\`, {
  vertexCount: 3,
  instances: 4
});
\`\`\`

## Test Commands
\`\`\`bash
cd ${PROJECT_ROOT}/packages/core
pnpm build:test
pnpm test:browser tests/browser/material-advanced.browser.test.ts
\`\`\`
`;

async function checkTestsImplemented(): Promise<boolean> {
  const testFile = path.join(PROJECT_ROOT, "packages/core/tests/browser/material-advanced.browser.test.ts");
  const content = await fs.readFile(testFile, "utf-8").catch(() => "");
  return content.includes("material") && content.includes("test.describe");
}

async function main() {
  const startTime = Date.now();
  const agent = new LoopAgent({
    model: "google/gemini-3-flash",
    trace: true,
    task: TASK,
    rules: [brainRule, trackProgressRule, minimalChangesRule, completionRule],
    limits: { maxIterations: 15, maxCost: 8.0, timeout: "25m" },
    onUpdate: (status) => {
      console.log(`[${((Date.now() - startTime) / 1000).toFixed(1)}s] Iteration ${status.iteration} | Cost: $${status.cost.toFixed(4)}`);
    },
  });

  console.log("🚀 Starting material advanced tests agent...\n");
  const result = await agent.run();
  console.log(`\n✅ Success: ${result.success} | Iterations: ${result.iterations} | Cost: $${result.cost.toFixed(4)}`);
  
  const passed = await checkTestsImplemented();
  console.log(passed ? "🎉 Tests implemented!" : "⚠️ Tests incomplete");
  process.exit(result.success && passed ? 0 : 1);
}

main().catch(console.error);
