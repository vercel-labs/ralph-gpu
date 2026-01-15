/**
 * 46-time-controls-tests: Add time controls browser tests
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
# Task: Add Time Controls Browser Tests

## Working Directory & Navigation
This script runs from: ${process.cwd()}
Project root is: ${PROJECT_ROOT}

### Repository Structure
\`\`\`
ralph-gpu/                           (project root)
├── packages/
│   └── core/                        (main WebGPU library)
│       ├── src/
│       │   └── context.ts           (has time/pause/timeScale APIs)
│       └── tests/
│           └── browser/             (← TARGET FOLDER)
│               ├── test-utils.ts    
│               ├── pass.browser.test.ts  (example pattern)
│               └── time-controls.browser.test.ts  (← CREATE THIS)
└── ralphs/
    └── 46-time-controls-tests/      (← YOU ARE HERE)
\`\`\`

## CRITICAL: Update Progress
After EVERY significant action, update .progress.md.

## Context
Ralph-gpu has time management via:
- \`context.globals.time\` - current time (seconds)
- \`context.globals.deltaTime\` - time since last frame
- \`context.globals.frame\` - frame counter
- \`context.paused\` - pause/resume time
- \`context.timeScale\` - speed multiplier (0.5 = half speed, 2 = double)
- \`context.time = value\` - set time directly

Time updates happen in \`context.updateGlobals()\` which is called during frame execution.

## Acceptance Criteria (ALL MUST BE MET)

### 1. Test File Creation
- [ ] Create \`time-controls.browser.test.ts\` in \`${PROJECT_ROOT}/packages/core/tests/browser/\`
- [ ] Follow the EXACT pattern from \`pass.browser.test.ts\`

### 2. Time Increment Test (High Priority)
- [ ] Verify \`context.globals.time\` increases between frames
- [ ] Execute multiple frames, confirm time goes up

### 3. Pause Test (High Priority)
- [ ] Set \`context.paused = true\`
- [ ] Execute frames
- [ ] Verify \`globals.time\` stays constant when paused

### 4. Frame Counter Test (Medium Priority)
- [ ] Verify \`context.globals.frame\` increments each frame
- [ ] Should be 0, 1, 2, 3, etc.

### 5. Tests Pass
- [ ] Run \`pnpm test:browser tests/browser/time-controls.browser.test.ts\` successfully

## Implementation Guide

### CRITICAL: Follow This EXACT Pattern

\`\`\`typescript
import { test, expect } from '@playwright/test';

test.describe('Time Controls', () => {
  test.beforeEach(async ({ page }) => {
    await page.goto('/index.html');
  });

  test('time increments between frames', async ({ page }) => {
    const result = await page.evaluate(async () => {
      const { setupTest, waitForFrame, teardown } = (window as any).RalphTestUtils;
      const { context } = await setupTest(32, 32);
      
      // Execute a frame to initialize time
      const pass = context.pass(\`
        @fragment fn main() -> @location(0) vec4f { return vec4f(1.0); }
      \`);
      pass.draw();
      await waitForFrame();
      
      const time1 = context.globals.time;
      
      // Execute another frame
      pass.draw();
      await waitForFrame();
      
      const time2 = context.globals.time;
      
      teardown();
      
      return {
        time1,
        time2,
        increased: time2 > time1
      };
    });

    expect(result.increased).toBe(true);
  });

  test('paused stops time', async ({ page }) => {
    const result = await page.evaluate(async () => {
      const { setupTest, waitForFrame, teardown } = (window as any).RalphTestUtils;
      const { context } = await setupTest(32, 32);
      
      const pass = context.pass(\`
        @fragment fn main() -> @location(0) vec4f { return vec4f(1.0); }
      \`);
      
      // Run a frame to get initial time
      pass.draw();
      await waitForFrame();
      const time1 = context.globals.time;
      
      // Pause and run more frames
      context.paused = true;
      pass.draw();
      await waitForFrame();
      const time2 = context.globals.time;
      
      pass.draw();
      await waitForFrame();
      const time3 = context.globals.time;
      
      teardown();
      
      return {
        time1,
        time2,
        time3,
        stayedConstant: time2 === time1 && time3 === time1
      };
    });

    expect(result.stayedConstant).toBe(true);
  });

  test('frame counter increments', async ({ page }) => {
    const result = await page.evaluate(async () => {
      const { setupTest, waitForFrame, teardown } = (window as any).RalphTestUtils;
      const { context } = await setupTest(32, 32);
      
      const pass = context.pass(\`
        @fragment fn main() -> @location(0) vec4f { return vec4f(1.0); }
      \`);
      
      const frames: number[] = [];
      
      for (let i = 0; i < 3; i++) {
        pass.draw();
        await waitForFrame();
        frames.push(context.globals.frame);
      }
      
      teardown();
      
      return {
        frames,
        increments: frames[1] === frames[0] + 1 && frames[2] === frames[1] + 1
      };
    });

    expect(result.increments).toBe(true);
  });
});
\`\`\`

### Key Points
1. **Always use \`test.beforeEach\`** to navigate to \`/index.html\`
2. **Create a simple pass** just to execute frames
3. **Call \`waitForFrame()\`** after each draw to let time update
4. **Access time via \`context.globals.time\`**
5. **Call \`teardown()\`** at the end

### Test Commands
\`\`\`bash
cd ${PROJECT_ROOT}/packages/core
pnpm build:test
pnpm test:browser tests/browser/time-controls.browser.test.ts
\`\`\`

## Success Criteria
1. Test file created at correct path
2. Tests follow existing patterns exactly
3. At least 3 tests: time increment, pause, frame counter
4. \`pnpm test:browser tests/browser/time-controls.browser.test.ts\` passes

## Important Notes
- DO NOT modify other files
- ONLY create time-controls.browser.test.ts
- The shader content doesn't matter for time tests - just need to execute frames
`;

async function checkTestsImplemented(): Promise<boolean> {
  try {
    const testFile = path.join(
      PROJECT_ROOT,
      "packages/core/tests/browser/time-controls.browser.test.ts"
    );
    const exists = await fs
      .access(testFile)
      .then(() => true)
      .catch(() => false);

    if (!exists) {
      console.log("❌ time-controls.browser.test.ts not found");
      return false;
    }

    const content = await fs.readFile(testFile, "utf-8");
    
    const checks = [
      content.includes("test.describe"),
      content.includes("time") || content.includes("Time"),
      content.includes("paused") || content.includes("pause"),
      content.includes("frame"),
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

  console.log("🚀 Starting time controls tests agent...\n");

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
