/**
 * 49-blend-modes-tests: Add blend modes browser tests (retry with Claude)
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
# Task: Add Blend Modes Browser Tests

## Working Directory & Navigation
This script runs from: ${process.cwd()}
Project root is: ${PROJECT_ROOT}

### Repository Structure
\`\`\`
ralph-gpu/                           (project root)
├── packages/
│   └── core/                        (main WebGPU library)
│       ├── src/
│       │   └── types.ts             (BlendMode: "none" | "alpha" | "additive" | "multiply" | "screen")
│       │   └── context.ts           (has autoClear property - IMPORTANT!)
│       └── tests/
│           └── browser/             (← TARGET FOLDER)
│               ├── test-utils.ts    
│               ├── pass.browser.test.ts  (example pattern)
│               └── blend-modes.browser.test.ts  (← CREATE THIS)
└── ralphs/
    └── 49-blend-modes-tests/        (← YOU ARE HERE)
\`\`\`

## CRITICAL: Update Progress
After EVERY significant action, update .progress.md.

## Context
Ralph-gpu supports blend modes. Available modes:
- \`blend: "none"\` - No blending, opaque
- \`blend: "alpha"\` - Standard transparency
- \`blend: "additive"\` - Colors add up (glow effect)
- \`blend: "multiply"\` - Colors multiply (darken)
- \`blend: "screen"\` - Inverse multiply (lighten)

### CRITICAL: autoClear Behavior
**By default, \`context.autoClear = true\`**, which means the target is CLEARED before each draw call.

To test blending (drawing one color, then blending another on top), you MUST:
1. Draw the first pass (base color)
2. Set \`context.autoClear = false\` BEFORE the second draw
3. Draw the second pass with blend mode
4. Read pixels to verify the blend result

Without disabling autoClear, the first color will be wiped before the second draw!

## Acceptance Criteria (ALL MUST BE MET)

### 1. Test File Creation
- [ ] Create \`blend-modes.browser.test.ts\` in \`${PROJECT_ROOT}/packages/core/tests/browser/\`

### 2. Alpha Blend Test
- [ ] Draw solid red to target
- [ ] Disable autoClear
- [ ] Draw semi-transparent blue with blend: "alpha"
- [ ] Verify result is purple-ish (has both red and blue)

### 3. Additive Blend Test  
- [ ] Draw red to target
- [ ] Disable autoClear
- [ ] Draw green with blend: "additive"
- [ ] Verify result is yellow-ish (red + green)

### 4. Tests Pass
- [ ] Run \`pnpm test:browser tests/browser/blend-modes.browser.test.ts\` successfully

## Implementation Guide

### EXACT Pattern to Follow

\`\`\`typescript
import { test, expect } from '@playwright/test';

test.describe('Blend Modes', () => {
  test.beforeEach(async ({ page }) => {
    await page.goto('/index.html');
  });

  test('alpha blend mode works', async ({ page }) => {
    const result = await page.evaluate(async () => {
      const { setupTest, waitForFrame, teardown } = (window as any).RalphTestUtils;
      const { context } = await setupTest(32, 32);
      const target = context.target(32, 32);
      
      // Step 1: Draw solid red as base
      const passRed = context.pass(/* wgsl */ \`
        @fragment fn main() -> @location(0) vec4f {
          return vec4f(1.0, 0.0, 0.0, 1.0);
        }
      \`);
      context.setTarget(target);
      passRed.draw();
      await waitForFrame();
      
      // Step 2: CRITICAL - Disable autoClear so red isn't wiped
      context.autoClear = false;
      
      // Step 3: Draw semi-transparent blue with alpha blend
      const passBlue = context.pass(/* wgsl */ \`
        @fragment fn main() -> @location(0) vec4f {
          return vec4f(0.0, 0.0, 1.0, 0.5);
        }
      \`, { blend: "alpha" });
      context.setTarget(target);
      passBlue.draw();
      await waitForFrame();
      
      // Step 4: Read and verify
      const data = await target.readPixels(0, 0, 1, 1);
      teardown();
      
      return { r: data[0], g: data[1], b: data[2], a: data[3] };
    });

    // Alpha blend formula: result = src * srcAlpha + dst * (1 - srcAlpha)
    // Blue (0,0,1,0.5) over Red (1,0,0,1) = (0.5, 0, 0.5, 1) = ~(127, 0, 127, 255)
    expect(result.r).toBeGreaterThan(100);
    expect(result.r).toBeLessThan(160);
    expect(result.b).toBeGreaterThan(100);
    expect(result.b).toBeLessThan(160);
    expect(result.g).toBeLessThan(50);
  });

  test('additive blend mode works', async ({ page }) => {
    const result = await page.evaluate(async () => {
      const { setupTest, waitForFrame, teardown } = (window as any).RalphTestUtils;
      const { context } = await setupTest(32, 32);
      const target = context.target(32, 32);
      
      // Draw red base
      const passRed = context.pass(/* wgsl */ \`
        @fragment fn main() -> @location(0) vec4f {
          return vec4f(1.0, 0.0, 0.0, 1.0);
        }
      \`);
      context.setTarget(target);
      passRed.draw();
      await waitForFrame();
      
      // CRITICAL: Disable autoClear
      context.autoClear = false;
      
      // Add green
      const passGreen = context.pass(/* wgsl */ \`
        @fragment fn main() -> @location(0) vec4f {
          return vec4f(0.0, 1.0, 0.0, 1.0);
        }
      \`, { blend: "additive" });
      context.setTarget(target);
      passGreen.draw();
      await waitForFrame();
      
      const data = await target.readPixels(0, 0, 1, 1);
      teardown();
      
      return { r: data[0], g: data[1], b: data[2], a: data[3] };
    });

    // Additive: red + green = yellow
    expect(result.r).toBeGreaterThan(200);
    expect(result.g).toBeGreaterThan(200);
    expect(result.b).toBeLessThan(50);
  });
});
\`\`\`

### Test Commands
\`\`\`bash
cd ${PROJECT_ROOT}/packages/core
pnpm build:test
pnpm test:browser tests/browser/blend-modes.browser.test.ts
\`\`\`

## Success Criteria
1. Test file created at correct path
2. At least 2 tests: alpha blend, additive blend
3. Both tests use \`context.autoClear = false\` before second draw
4. \`pnpm test:browser tests/browser/blend-modes.browser.test.ts\` passes

## Key Reminders
- MUST set \`context.autoClear = false\` before the blending draw
- Use \`{ blend: "alpha" }\` as second argument to pass()
- Follow exact pattern from example above
`;

async function checkTestsImplemented(): Promise<boolean> {
  try {
    const testFile = path.join(
      PROJECT_ROOT,
      "packages/core/tests/browser/blend-modes.browser.test.ts"
    );
    const exists = await fs
      .access(testFile)
      .then(() => true)
      .catch(() => false);

    if (!exists) {
      console.log("❌ blend-modes.browser.test.ts not found");
      return false;
    }

    const content = await fs.readFile(testFile, "utf-8");
    
    const checks = [
      content.includes("test.describe"),
      content.includes("blend"),
      content.includes("autoClear"),
    ];

    const passed = checks.filter(Boolean).length;
    console.log(`✓ Found ${passed}/${checks.length} key patterns`);

    return passed >= 3;
  } catch (error) {
    console.error("Error checking tests:", error);
    return false;
  }
}

async function main() {
  const startTime = Date.now();

  const agent = new LoopAgent({
    // Using Claude this time (Gemini failed on first attempt)
    model: "anthropic/claude-sonnet-4-20250514",
    trace: true,
    task: TASK,
    rules: [brainRule, trackProgressRule, minimalChangesRule, completionRule],
    debug: DEBUG,
    limits: {
      maxIterations: 15,
      maxCost: 10.0,
      timeout: "30m",
    },
    onUpdate: (status) => {
      const elapsed = ((Date.now() - startTime) / 1000).toFixed(1);
      console.log(
        `[${elapsed}s] Iteration ${status.iteration} | State: ${status.state} | Cost: $${status.cost.toFixed(4)}`
      );
    },
    onStuck: async (ctx) => {
      console.log(`\n⚠️ Agent stuck: ${ctx.reason}`);
      return "Remember: context.autoClear = false is REQUIRED before the blend draw. Check the example in the task.";
    },
    onError: (error) => {
      console.error(`\n❌ Error: ${error.message}`);
    },
  });

  console.log("🚀 Starting blend modes tests agent (Claude)...\n");

  const result = await agent.run();

  console.log("\n📊 Results");
  console.log(`✅ Success: ${result.success}`);
  console.log(`🔄 Iterations: ${result.iterations}`);
  console.log(`💰 Cost: $${result.cost.toFixed(4)}`);
  console.log(`⏱️ Duration: ${(result.elapsed / 1000).toFixed(1)}s`);

  const passed = await checkTestsImplemented();
  console.log(`\n${passed ? "🎉 Tests implemented!" : "⚠️ Tests incomplete"}`);

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
