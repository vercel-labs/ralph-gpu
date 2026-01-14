/**
 * 47-resize-tests: Add resize behavior browser tests
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
# Task: Add Resize Behavior Browser Tests

## Working Directory & Navigation
This script runs from: ${process.cwd()}
Project root is: ${PROJECT_ROOT}

### Repository Structure
\`\`\`
ralph-gpu/                           (project root)
├── packages/
│   └── core/                        (main WebGPU library)
│       ├── src/
│       │   ├── context.ts           (has resize(), width, height)
│       │   └── target.ts            (has target.resize())
│       └── tests/
│           └── browser/             (← TARGET FOLDER)
│               ├── test-utils.ts    
│               ├── pass.browser.test.ts  (example pattern)
│               └── resize.browser.test.ts  (← CREATE THIS)
└── ralphs/
    └── 47-resize-tests/             (← YOU ARE HERE)
\`\`\`

## CRITICAL: Update Progress
After EVERY significant action, update .progress.md.

## Context
Ralph-gpu supports resizing:
- \`context.resize(width, height)\` - resize the main context
- \`target.resize(width, height)\` - resize a RenderTarget
- After resize, width/height properties should reflect new values
- Rendering should work correctly after resize

## Acceptance Criteria (ALL MUST BE MET)

### 1. Test File Creation
- [ ] Create \`resize.browser.test.ts\` in \`${PROJECT_ROOT}/packages/core/tests/browser/\`
- [ ] Follow the EXACT pattern from \`pass.browser.test.ts\`

### 2. Context Resize Test (High Priority)
- [ ] Create context at size 32x32
- [ ] Render and verify it works
- [ ] Call \`context.resize(64, 64)\`
- [ ] Verify width/height changed
- [ ] Render again and verify it works at new size

### 3. Target Resize Test (High Priority)
- [ ] Create RenderTarget at size 16x16
- [ ] Render to it
- [ ] Call \`target.resize(32, 32)\`
- [ ] Verify target size changed
- [ ] Render again and verify it works

### 4. Tests Pass
- [ ] Run \`pnpm test:browser tests/browser/resize.browser.test.ts\` successfully

## Implementation Guide

### CRITICAL: Follow This EXACT Pattern

\`\`\`typescript
import { test, expect } from '@playwright/test';

test.describe('Resize', () => {
  test.beforeEach(async ({ page }) => {
    await page.goto('/index.html');
  });

  test('context resize works', async ({ page }) => {
    const result = await page.evaluate(async () => {
      const { setupTest, waitForFrame, teardown } = (window as any).RalphTestUtils;
      const { context, canvas } = await setupTest(32, 32);
      
      const pass = context.pass(\`
        @fragment fn main() -> @location(0) vec4f { 
          return vec4f(1.0, 0.0, 0.0, 1.0); 
        }
      \`);
      
      // Render at initial size
      pass.draw();
      await waitForFrame();
      const width1 = context.width;
      const height1 = context.height;
      
      // Resize context
      context.resize(64, 64);
      
      // Render at new size
      pass.draw();
      await waitForFrame();
      const width2 = context.width;
      const height2 = context.height;
      
      teardown();
      
      return {
        width1, height1,
        width2, height2,
        resizeWorked: width2 === 64 && height2 === 64
      };
    });

    expect(result.width1).toBe(32);
    expect(result.height1).toBe(32);
    expect(result.resizeWorked).toBe(true);
  });

  test('target resize works', async ({ page }) => {
    const result = await page.evaluate(async () => {
      const { setupTest, waitForFrame, teardown } = (window as any).RalphTestUtils;
      const { context } = await setupTest(32, 32);
      
      // Create a target
      const target = context.target(16, 16);
      const width1 = target.width;
      const height1 = target.height;
      
      const pass = context.pass(\`
        @fragment fn main() -> @location(0) vec4f { 
          return vec4f(0.0, 1.0, 0.0, 1.0); 
        }
      \`);
      
      // Render to target at initial size
      context.setTarget(target);
      pass.draw();
      await waitForFrame();
      
      // Resize target
      target.resize(32, 32);
      const width2 = target.width;
      const height2 = target.height;
      
      // Render to target at new size
      context.setTarget(target);
      pass.draw();
      await waitForFrame();
      
      teardown();
      
      return {
        width1, height1,
        width2, height2,
        resizeWorked: width2 === 32 && height2 === 32
      };
    });

    expect(result.width1).toBe(16);
    expect(result.height1).toBe(16);
    expect(result.resizeWorked).toBe(true);
  });
});
\`\`\`

### Key Points
1. **Always use \`test.beforeEach\`** to navigate to \`/index.html\`
2. **Check width/height before and after resize**
3. **Verify rendering works after resize** (no errors)
4. **Call \`teardown()\`** at the end

### Test Commands
\`\`\`bash
cd ${PROJECT_ROOT}/packages/core
pnpm build:test
pnpm test:browser tests/browser/resize.browser.test.ts
\`\`\`

## Success Criteria
1. Test file created at correct path
2. Tests follow existing patterns exactly
3. At least 2 tests: context resize, target resize
4. \`pnpm test:browser tests/browser/resize.browser.test.ts\` passes

## Important Notes
- DO NOT modify other files
- ONLY create resize.browser.test.ts
- Focus on verifying resize works, not rendering specific colors
`;

async function checkTestsImplemented(): Promise<boolean> {
  try {
    const testFile = path.join(
      PROJECT_ROOT,
      "packages/core/tests/browser/resize.browser.test.ts"
    );
    const exists = await fs
      .access(testFile)
      .then(() => true)
      .catch(() => false);

    if (!exists) {
      console.log("❌ resize.browser.test.ts not found");
      return false;
    }

    const content = await fs.readFile(testFile, "utf-8");
    
    const checks = [
      content.includes("test.describe"),
      content.includes("resize"),
      content.includes("width") && content.includes("height"),
    ];

    const passed = checks.filter(Boolean).length;
    console.log(`✓ Found ${passed}/${checks.length} key patterns`);

    return passed >= 2;
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
      maxIterations: 20,
      maxCost: 8.0,
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
      return "Look at pass.browser.test.ts for the exact pattern. Update .progress.md.";
    },
    onError: (error) => {
      console.error(`\n❌ Error: ${error.message}`);
    },
  });

  console.log("🚀 Starting resize tests agent...\n");

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
