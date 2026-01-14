/**
 * 45-uniforms-browser-tests: Add comprehensive uniform testing
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
# Task: Add Comprehensive Uniform Browser Tests

## Working Directory & Navigation
This script runs from: ${process.cwd()}
Project root is: ${PROJECT_ROOT}

### Repository Structure
\`\`\`
ralph-gpu/                           (project root)
├── packages/
│   └── core/                        (main WebGPU library)
│       ├── src/                     (library source code)
│       └── tests/
│           └── browser/             (← TARGET FOLDER)
│               ├── test-utils.ts    (helpers: setupTest, readPixels, expectPixelNear)
│               ├── pass.browser.test.ts  (example to follow)
│               └── uniforms.browser.test.ts  (← CREATE THIS)
└── ralphs/
    └── 45-uniforms-browser-tests/   (← YOU ARE HERE)
\`\`\`

### Navigation Instructions
- To access test files: \`cd ${PROJECT_ROOT}/packages/core/tests/browser\`
- To run tests: \`cd ${PROJECT_ROOT}/packages/core && pnpm test:browser tests/browser/uniforms.browser.test.ts\`
- To update progress: append to \`${process.cwd()}/.progress.md\`

## CRITICAL: Update Progress
After EVERY significant action, update .progress.md:
\`\`\`bash
cat >> ${process.cwd()}/.progress.md << 'EOF'

## [timestamp]
- What you did
- Any errors encountered
- Next steps
EOF
\`\`\`

## Context
Ralph-gpu supports uniforms in pass shaders. There are two modes:
1. **Simple mode**: Use \`uniforms.myValue\` in shader without declaring bindings - the library auto-generates them
2. **Manual mode**: Declare explicit \`@group(1) @binding(X)\` in shader

We need tests to verify uniforms work correctly with various types and both modes.

## Acceptance Criteria (ALL MUST BE MET)

### 1. Test File Creation
- [ ] Create \`uniforms.browser.test.ts\` in \`${PROJECT_ROOT}/packages/core/tests/browser/\`
- [ ] Follow the EXACT pattern from \`pass.browser.test.ts\`

### 2. Simple Mode Tests (High Priority)
- [ ] Test f32 uniform - render red channel based on uniform value
- [ ] Test vec4f uniform - render color from uniform
- [ ] Verify uniforms affect rendering correctly

### 3. Uniform Update Test (High Priority)
- [ ] Create pass with uniform value 0.5
- [ ] Render and verify pixel
- [ ] Update uniform.value to 1.0
- [ ] Render again and verify pixel changed

### 4. Tests Pass
- [ ] Run \`pnpm test:browser tests/browser/uniforms.browser.test.ts\` successfully
- [ ] No errors in test output

## Implementation Guide

### CRITICAL: Follow This EXACT Pattern (from pass.browser.test.ts)

\`\`\`typescript
import { test, expect } from '@playwright/test';

test.describe('Uniforms', () => {
  test.beforeEach(async ({ page }) => {
    await page.goto('/index.html');
  });

  test('simple mode f32 uniform', async ({ page }) => {
    await page.evaluate(async () => {
      const { setupTest, waitForFrame } = (window as any).RalphTestUtils;
      const { context } = await setupTest(32, 32);
      const target = context.target(32, 32);
      (window as any).__testTarget = target;
      
      // Shader uses uniforms.redValue - simple mode (no @group/@binding)
      const pass = context.pass(/* wgsl */ \`
        @fragment
        fn main(@builtin(position) pos: vec4f) -> @location(0) vec4f {
          return vec4f(uniforms.redValue, 0.0, 0.0, 1.0);
        }
      \`, {
        uniforms: { redValue: 0.75 }
      });
      
      context.setTarget(target);
      pass.draw();
      await waitForFrame();
    });

    await page.screenshot();

    const result = await page.evaluate(async () => {
      const { expectPixelNear, teardown } = (window as any).RalphTestUtils;
      const target = (window as any).__testTarget;
      const data = await target.readPixels(0, 0, 1, 1);
      // 0.75 * 255 ≈ 191
      expectPixelNear(data, [191, 0, 0, 255], 5);
      teardown();
      return true;
    });

    expect(result).toBe(true);
  });

  test('uniform value can be updated', async ({ page }) => {
    await page.evaluate(async () => {
      const { setupTest, waitForFrame } = (window as any).RalphTestUtils;
      const { context } = await setupTest(32, 32);
      const target = context.target(32, 32);
      (window as any).__testTarget = target;
      (window as any).__testContext = context;
      
      const pass = context.pass(/* wgsl */ \`
        @fragment
        fn main(@builtin(position) pos: vec4f) -> @location(0) vec4f {
          return vec4f(uniforms.intensity, 0.0, 0.0, 1.0);
        }
      \`, {
        uniforms: { intensity: 0.5 }
      });
      
      (window as any).__testPass = pass;
      
      context.setTarget(target);
      pass.draw();
      await waitForFrame();
    });

    // First check - should be ~127 (0.5 * 255)
    const firstValue = await page.evaluate(async () => {
      const target = (window as any).__testTarget;
      const data = await target.readPixels(0, 0, 1, 1);
      return data[0];
    });
    expect(firstValue).toBeGreaterThan(120);
    expect(firstValue).toBeLessThan(135);

    // Update uniform and redraw
    await page.evaluate(async () => {
      const { waitForFrame } = (window as any).RalphTestUtils;
      const pass = (window as any).__testPass;
      const target = (window as any).__testTarget;
      const context = (window as any).__testContext;
      
      pass.uniforms.intensity.value = 1.0;
      context.setTarget(target);
      pass.draw();
      await waitForFrame();
    });

    // Second check - should be ~255 (1.0 * 255)
    const result = await page.evaluate(async () => {
      const { expectPixelNear, teardown } = (window as any).RalphTestUtils;
      const target = (window as any).__testTarget;
      const data = await target.readPixels(0, 0, 1, 1);
      expectPixelNear(data, [255, 0, 0, 255], 5);
      teardown();
      return true;
    });

    expect(result).toBe(true);
  });
});
\`\`\`

### Key Points
1. **Always use \`test.beforeEach\`** to navigate to \`/index.html\`
2. **Store references on window** like \`(window as any).__testTarget = target\`
3. **Split evaluate calls** - setup in one, assertions in another
4. **Call \`waitForFrame()\`** before reading pixels
5. **Call \`teardown()\`** at the end

### Test Commands
\`\`\`bash
cd ${PROJECT_ROOT}/packages/core

# Build the test bundle first
pnpm build:test

# Run just the uniforms test
pnpm test:browser tests/browser/uniforms.browser.test.ts
\`\`\`

## Success Criteria
1. Test file created at correct path
2. Tests follow existing patterns exactly
3. At least 2 tests: simple mode f32 + uniform update
4. \`pnpm test:browser tests/browser/uniforms.browser.test.ts\` passes

## Important Notes
- DO NOT modify test-utils.ts
- DO NOT modify other test files
- ONLY create uniforms.browser.test.ts
- Follow the EXACT pattern from pass.browser.test.ts
`;

async function checkTestsImplemented(): Promise<boolean> {
  try {
    const testFile = path.join(
      PROJECT_ROOT,
      "packages/core/tests/browser/uniforms.browser.test.ts"
    );
    const exists = await fs
      .access(testFile)
      .then(() => true)
      .catch(() => false);

    if (!exists) {
      console.log("❌ uniforms.browser.test.ts not found");
      return false;
    }

    const content = await fs.readFile(testFile, "utf-8");
    
    const checks = [
      content.includes("test.describe"),
      content.includes("uniforms"),
      content.includes("expectPixelNear"),
      content.includes("teardown"),
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
    model: "google/gemini-3-flash",
    trace: true,
    task: TASK,
    rules: [brainRule, trackProgressRule, minimalChangesRule, completionRule],
    debug: DEBUG,
    limits: {
      maxIterations: 25,
      maxCost: 10.0,
      timeout: "45m",
    },
    onUpdate: (status) => {
      const elapsed = ((Date.now() - startTime) / 1000).toFixed(1);
      console.log(
        `[${elapsed}s] Iteration ${status.iteration} | State: ${status.state} | Cost: $${status.cost.toFixed(4)}`
      );
    },
    onStuck: async (ctx) => {
      console.log(`\n⚠️ Agent stuck: ${ctx.reason}`);
      return "Try a different approach. Look at pass.browser.test.ts for the exact pattern to follow. Update .progress.md.";
    },
    onError: (error) => {
      console.error(`\n❌ Error: ${error.message}`);
    },
  });

  console.log("🚀 Starting uniforms tests agent...\n");

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
