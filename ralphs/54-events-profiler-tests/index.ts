/**
 * 54-events-profiler-tests: Test event system and profiler
 */

import "dotenv/config";
import { LoopAgent, brainRule, trackProgressRule, minimalChangesRule, completionRule } from "@ralph/agent-loop";
import * as fs from "fs/promises";
import * as path from "path";

const PROJECT_ROOT = process.env.PROJECT_ROOT || "../..";

const TASK = `
# Task: Add Events & Profiler Browser Tests

## Working Directory
This script runs from: ${process.cwd()}
Project root is: ${PROJECT_ROOT}

## Context
Ralph-gpu has an event system for debugging/profiling:

Enable events when creating context:
\`\`\`typescript
const ctx = await gpu.init(canvas, {
  events: {
    enabled: true,
    types: ['frame', 'draw', 'compute', 'target']
  }
});
\`\`\`

Listen for events:
\`\`\`typescript
ctx.on('draw', (event) => { ... });
ctx.on('frame', (event) => { ... });
\`\`\`

## Acceptance Criteria

### 1. Create events-profiler.browser.test.ts

### 2. Test event emission
- Enable events in context
- Listen for 'draw' events
- Draw something, verify event was emitted

### 3. Test event filtering
- Enable only specific event types
- Verify only those events fire

### 4. Tests pass

## Implementation Guide

\`\`\`typescript
import { test, expect } from '@playwright/test';

test.describe('Events & Profiler', () => {
  test.beforeEach(async ({ page }) => {
    await page.goto('/index.html');
  });

  test('events fire on draw', async ({ page }) => {
    const result = await page.evaluate(async () => {
      const { gpu } = (window as any).RalphGPU;
      const { waitForFrame, teardown } = (window as any).RalphTestUtils;
      
      const canvas = document.createElement('canvas');
      canvas.width = 32;
      canvas.height = 32;
      document.body.appendChild(canvas);
      
      const context = await gpu.init(canvas, {
        events: { enabled: true, types: ['draw'] }
      });
      
      let drawEventCount = 0;
      context.on('draw', () => { drawEventCount++; });
      
      const pass = context.pass(\`
        @fragment fn main() -> @location(0) vec4f {
          return vec4f(1.0);
        }
      \`);
      pass.draw();
      await waitForFrame();
      
      const result = { drawEventCount };
      context.dispose();
      canvas.remove();
      return result;
    });

    expect(result.drawEventCount).toBeGreaterThan(0);
  });
});
\`\`\`

## Test Commands
\`\`\`bash
cd ${PROJECT_ROOT}/packages/core
pnpm build:test
pnpm test:browser tests/browser/events-profiler.browser.test.ts
\`\`\`
`;

async function checkTestsImplemented(): Promise<boolean> {
  const testFile = path.join(PROJECT_ROOT, "packages/core/tests/browser/events-profiler.browser.test.ts");
  const content = await fs.readFile(testFile, "utf-8").catch(() => "");
  return content.includes("events") && content.includes("test.describe");
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

  console.log("🚀 Starting events/profiler tests agent...\n");
  const result = await agent.run();
  console.log(`\n✅ Success: ${result.success} | Iterations: ${result.iterations} | Cost: $${result.cost.toFixed(4)}`);
  
  const passed = await checkTestsImplemented();
  console.log(passed ? "🎉 Tests implemented!" : "⚠️ Tests incomplete");
  process.exit(result.success && passed ? 0 : 1);
}

main().catch(console.error);
