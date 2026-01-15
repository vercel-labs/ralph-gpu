/**
 * 51-topology-tests: Test different primitive topologies (line-list, line-strip, point-list)
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

const TASK = `
# Task: Add Topology Browser Tests

## Working Directory
This script runs from: ${process.cwd()}
Project root is: ${PROJECT_ROOT}

## Context
Ralph-gpu supports different primitive topologies via Material:
- triangle-list (default)
- triangle-strip
- line-list - disconnected line segments
- line-strip - connected line path
- point-list - individual points

Topology is set on Material, NOT Pass. Example:
\`\`\`typescript
const material = context.material(shader, {
  vertexCount: 4,
  topology: "line-strip"
});
\`\`\`

## Acceptance Criteria

### 1. Create topology.browser.test.ts

### 2. Test line-list topology
- Create material with topology: "line-list"
- Draw some lines
- Verify no crash and correct topology

### 3. Test line-strip topology
- Create material with topology: "line-strip"
- Draw connected lines
- Verify no crash

### 4. Tests pass
- \`pnpm test:browser tests/browser/topology.browser.test.ts\` passes

## Implementation Example

\`\`\`typescript
import { test, expect } from '@playwright/test';

test.describe('Topology', () => {
  test.beforeEach(async ({ page }) => {
    await page.goto('/index.html');
  });

  test('line-list topology works', async ({ page }) => {
    const result = await page.evaluate(async () => {
      const { setupTest, waitForFrame, teardown } = (window as any).RalphTestUtils;
      const { context } = await setupTest(32, 32);
      const target = context.target(32, 32);
      
      // Material with line-list topology
      const material = context.material(/* wgsl */ \`
        struct VertexOutput {
          @builtin(position) position: vec4f,
        }
        
        @vertex
        fn vs(@builtin(vertex_index) vertexIndex: u32) -> VertexOutput {
          // Two lines: horizontal and vertical
          var positions = array<vec2f, 4>(
            vec2f(-0.5, 0.0), vec2f(0.5, 0.0),   // horizontal line
            vec2f(0.0, -0.5), vec2f(0.0, 0.5),   // vertical line
          );
          var output: VertexOutput;
          output.position = vec4f(positions[vertexIndex], 0.0, 1.0);
          return output;
        }
        
        @fragment
        fn fs() -> @location(0) vec4f {
          return vec4f(1.0, 0.0, 0.0, 1.0);
        }
      \`, {
        vertexCount: 4,
        topology: "line-list"
      });
      
      context.setTarget(target);
      material.draw();
      await waitForFrame();
      
      teardown();
      return { success: true };
    });

    expect(result.success).toBe(true);
  });

  test('line-strip topology works', async ({ page }) => {
    const result = await page.evaluate(async () => {
      const { setupTest, waitForFrame, teardown } = (window as any).RalphTestUtils;
      const { context } = await setupTest(32, 32);
      const target = context.target(32, 32);
      
      const material = context.material(/* wgsl */ \`
        struct VertexOutput {
          @builtin(position) position: vec4f,
        }
        
        @vertex
        fn vs(@builtin(vertex_index) vertexIndex: u32) -> VertexOutput {
          var positions = array<vec2f, 4>(
            vec2f(-0.5, -0.5),
            vec2f(0.5, -0.5),
            vec2f(0.5, 0.5),
            vec2f(-0.5, 0.5),
          );
          var output: VertexOutput;
          output.position = vec4f(positions[vertexIndex], 0.0, 1.0);
          return output;
        }
        
        @fragment
        fn fs() -> @location(0) vec4f {
          return vec4f(0.0, 1.0, 0.0, 1.0);
        }
      \`, {
        vertexCount: 4,
        topology: "line-strip"
      });
      
      context.setTarget(target);
      material.draw();
      await waitForFrame();
      
      teardown();
      return { success: true };
    });

    expect(result.success).toBe(true);
  });
});
\`\`\`

## Test Commands
\`\`\`bash
cd ${PROJECT_ROOT}/packages/core
pnpm build:test
pnpm test:browser tests/browser/topology.browser.test.ts
\`\`\`
`;

async function checkTestsImplemented(): Promise<boolean> {
  try {
    const testFile = path.join(PROJECT_ROOT, "packages/core/tests/browser/topology.browser.test.ts");
    const content = await fs.readFile(testFile, "utf-8").catch(() => "");
    return content.includes("topology") && content.includes("line");
  } catch {
    return false;
  }
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
      const elapsed = ((Date.now() - startTime) / 1000).toFixed(1);
      console.log(`[${elapsed}s] Iteration ${status.iteration} | Cost: $${status.cost.toFixed(4)}`);
    },
  });

  console.log("🚀 Starting topology tests agent...\n");
  const result = await agent.run();
  console.log(`\n✅ Success: ${result.success} | Iterations: ${result.iterations} | Cost: $${result.cost.toFixed(4)}`);
  
  const passed = await checkTestsImplemented();
  console.log(passed ? "🎉 Tests implemented!" : "⚠️ Tests incomplete");
  process.exit(result.success && passed ? 0 : 1);
}

main().catch(console.error);
