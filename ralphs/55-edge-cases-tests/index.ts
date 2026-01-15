/**
 * 55-edge-cases-tests: Test edge cases and unusual usage patterns
 */

import "dotenv/config";
import { LoopAgent, brainRule, trackProgressRule, minimalChangesRule, completionRule } from "@ralph/agent-loop";
import * as fs from "fs/promises";
import * as path from "path";

const PROJECT_ROOT = process.env.PROJECT_ROOT || "../..";

const TASK = `
# Task: Add Edge Cases Browser Tests

## Working Directory
This script runs from: ${process.cwd()}
Project root is: ${PROJECT_ROOT}

## Context
Test unusual but valid usage patterns:
1. Zero-size draw (vertexCount: 0)
2. Empty pass (draw with no visible output)
3. Multiple contexts (two canvases)
4. Rapid create/dispose stress test

## Acceptance Criteria

### 1. Create edge-cases.browser.test.ts

### 2. Test zero-size draw
- Create material with vertexCount: 0
- Call draw() - should not crash

### 3. Test dispose and re-init
- Create context, dispose it, create new one
- Verify works correctly

### 4. Tests pass

## Implementation Guide

\`\`\`typescript
import { test, expect } from '@playwright/test';

test.describe('Edge Cases', () => {
  test.beforeEach(async ({ page }) => {
    await page.goto('/index.html');
  });

  test('zero vertex count does not crash', async ({ page }) => {
    const result = await page.evaluate(async () => {
      const { setupTest, waitForFrame, teardown } = (window as any).RalphTestUtils;
      const { context } = await setupTest(32, 32);
      
      try {
        const material = context.material(\`
          @vertex fn vs() -> @builtin(position) vec4f { return vec4f(0.0); }
          @fragment fn fs() -> @location(0) vec4f { return vec4f(1.0); }
        \`, { vertexCount: 0 });
        material.draw();
        await waitForFrame();
      } catch (e) {
        // May or may not throw - just checking no crash
      }
      
      teardown();
      return { success: true };
    });

    expect(result.success).toBe(true);
  });

  test('can dispose and create new context', async ({ page }) => {
    const result = await page.evaluate(async () => {
      const { gpu } = (window as any).RalphGPU;
      
      const canvas = document.createElement('canvas');
      canvas.width = 32;
      canvas.height = 32;
      document.body.appendChild(canvas);
      
      // Create first context
      const ctx1 = await gpu.init(canvas);
      ctx1.dispose();
      
      // Create second context on same canvas
      const ctx2 = await gpu.init(canvas);
      
      const pass = ctx2.pass(\`
        @fragment fn main() -> @location(0) vec4f {
          return vec4f(1.0, 0.0, 0.0, 1.0);
        }
      \`);
      pass.draw();
      
      ctx2.dispose();
      canvas.remove();
      
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
pnpm test:browser tests/browser/edge-cases.browser.test.ts
\`\`\`
`;

async function checkTestsImplemented(): Promise<boolean> {
  const testFile = path.join(PROJECT_ROOT, "packages/core/tests/browser/edge-cases.browser.test.ts");
  const content = await fs.readFile(testFile, "utf-8").catch(() => "");
  return content.includes("edge") || content.includes("dispose") || content.includes("test.describe");
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

  console.log("🚀 Starting edge cases tests agent...\n");
  const result = await agent.run();
  console.log(`\n✅ Success: ${result.success} | Iterations: ${result.iterations} | Cost: $${result.cost.toFixed(4)}`);
  
  const passed = await checkTestsImplemented();
  console.log(passed ? "🎉 Tests implemented!" : "⚠️ Tests incomplete");
  process.exit(result.success && passed ? 0 : 1);
}

main().catch(console.error);
