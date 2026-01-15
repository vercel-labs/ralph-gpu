/**
 * 50-texture-formats-tests: Test different RenderTarget texture formats
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
# Task: Add Texture Formats Browser Tests

## Working Directory & Navigation
This script runs from: ${process.cwd()}
Project root is: ${PROJECT_ROOT}

### Repository Structure
\`\`\`
ralph-gpu/
├── packages/core/
│   ├── src/
│   │   ├── types.ts    (TextureFormat: rgba8unorm, rgba16float, r16float, rg16float, r32float)
│   │   └── target.ts   (RenderTarget with format option)
│   └── tests/browser/
│       ├── pass.browser.test.ts (example pattern)
│       └── texture-formats.browser.test.ts (← CREATE THIS)
└── ralphs/50-texture-formats-tests/ (← YOU ARE HERE)
\`\`\`

## Context
RenderTargets can be created with different texture formats:
- \`rgba8unorm\` - default, 8-bit per channel (already tested)
- \`rgba16float\` - HDR, 16-bit float per channel
- \`r16float\` - single channel float
- \`rg16float\` - two channel float (useful for velocity fields)
- \`r32float\` - high precision single channel

Create target with format: \`context.target(width, height, { format: "rgba16float" })\`

**IMPORTANT**: For float formats, readPixels returns Float32Array, not Uint8Array!

## Acceptance Criteria

### 1. Test File Creation
- [ ] Create \`texture-formats.browser.test.ts\`

### 2. rgba16float Test
- [ ] Create target with format: "rgba16float"
- [ ] Render HDR values (>1.0)
- [ ] Verify target.format === "rgba16float"
- [ ] Note: readPixels on float targets returns Float32Array

### 3. r16float Test  
- [ ] Create target with format: "r16float"
- [ ] Render to single channel
- [ ] Verify format is correct

### 4. Tests Pass
- [ ] \`pnpm test:browser tests/browser/texture-formats.browser.test.ts\` passes

## Implementation Guide

\`\`\`typescript
import { test, expect } from '@playwright/test';

test.describe('Texture Formats', () => {
  test.beforeEach(async ({ page }) => {
    await page.goto('/index.html');
  });

  test('rgba16float format works', async ({ page }) => {
    const result = await page.evaluate(async () => {
      const { setupTest, waitForFrame, teardown } = (window as any).RalphTestUtils;
      const { context } = await setupTest(32, 32);
      
      // Create HDR target
      const target = context.target(16, 16, { format: "rgba16float" });
      
      // Render HDR red (value > 1.0)
      const pass = context.pass(/* wgsl */ \`
        @fragment fn main() -> @location(0) vec4f {
          return vec4f(2.0, 0.0, 0.0, 1.0);
        }
      \`);
      context.setTarget(target);
      pass.draw();
      await waitForFrame();
      
      const format = target.format;
      // Note: Can't easily read HDR values via readPixels in test
      // Just verify format and no crash
      
      teardown();
      return { format };
    });

    expect(result.format).toBe("rgba16float");
  });

  test('r16float format works', async ({ page }) => {
    const result = await page.evaluate(async () => {
      const { setupTest, waitForFrame, teardown } = (window as any).RalphTestUtils;
      const { context } = await setupTest(32, 32);
      
      // Create single channel float target
      const target = context.target(16, 16, { format: "r16float" });
      
      const pass = context.pass(/* wgsl */ \`
        @fragment fn main() -> @location(0) vec4f {
          return vec4f(0.5, 0.0, 0.0, 1.0);
        }
      \`);
      context.setTarget(target);
      pass.draw();
      await waitForFrame();
      
      const format = target.format;
      teardown();
      return { format };
    });

    expect(result.format).toBe("r16float");
  });
});
\`\`\`

## Test Commands
\`\`\`bash
cd ${PROJECT_ROOT}/packages/core
pnpm build:test
pnpm test:browser tests/browser/texture-formats.browser.test.ts
\`\`\`
`;

async function checkTestsImplemented(): Promise<boolean> {
  try {
    const testFile = path.join(
      PROJECT_ROOT,
      "packages/core/tests/browser/texture-formats.browser.test.ts"
    );
    const content = await fs.readFile(testFile, "utf-8").catch(() => "");
    if (!content) return false;
    
    return content.includes("test.describe") && 
           content.includes("format") &&
           (content.includes("rgba16float") || content.includes("r16float"));
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
    debug: DEBUG,
    limits: { maxIterations: 15, maxCost: 8.0, timeout: "25m" },
    onUpdate: (status) => {
      const elapsed = ((Date.now() - startTime) / 1000).toFixed(1);
      console.log(`[${elapsed}s] Iteration ${status.iteration} | State: ${status.state} | Cost: $${status.cost.toFixed(4)}`);
    },
    onStuck: async (ctx) => {
      console.log(`\n⚠️ Agent stuck: ${ctx.reason}`);
      return "Check target.format property. Float formats may need special handling.";
    },
  });

  console.log("🚀 Starting texture formats tests agent...\n");
  const result = await agent.run();

  console.log("\n📊 Results");
  console.log(`✅ Success: ${result.success}`);
  console.log(`🔄 Iterations: ${result.iterations}`);
  console.log(`💰 Cost: $${result.cost.toFixed(4)}`);

  const passed = await checkTestsImplemented();
  console.log(`\n${passed ? "🎉 Tests implemented!" : "⚠️ Tests incomplete"}`);
  process.exit(result.success && passed ? 0 : 1);
}

main().catch((error) => {
  console.error("Fatal error:", error);
  process.exit(1);
});
