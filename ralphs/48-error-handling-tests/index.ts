/**
 * 48-error-handling-tests: Add error handling browser tests
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
# Task: Add Error Handling Browser Tests

## Working Directory & Navigation
This script runs from: ${process.cwd()}
Project root is: ${PROJECT_ROOT}

### Repository Structure
\`\`\`
ralph-gpu/                           (project root)
├── packages/
│   └── core/                        (main WebGPU library)
│       ├── src/
│       │   └── errors.ts            (ShaderCompileError, etc.)
│       └── tests/
│           └── browser/             (← TARGET FOLDER)
│               ├── test-utils.ts    
│               ├── pass.browser.test.ts  (example pattern)
│               └── error-handling.browser.test.ts  (← CREATE THIS)
└── ralphs/
    └── 48-error-handling-tests/     (← YOU ARE HERE)
\`\`\`

## CRITICAL: Update Progress
After EVERY significant action, update .progress.md.

## Context
Ralph-gpu throws errors for invalid usage:
- \`ShaderCompileError\` - when WGSL shader has syntax errors
- Error thrown from \`context.pass()\` when shader is invalid

We need to test that errors are thrown appropriately.

## Acceptance Criteria (ALL MUST BE MET)

### 1. Test File Creation
- [ ] Create \`error-handling.browser.test.ts\` in \`${PROJECT_ROOT}/packages/core/tests/browser/\`
- [ ] Follow the EXACT pattern from \`pass.browser.test.ts\`

### 2. Invalid WGSL Test (High Priority)
- [ ] Pass invalid WGSL to \`context.pass()\`
- [ ] Verify an error is thrown
- [ ] Use try/catch to capture the error

### 3. Tests Pass
- [ ] Run \`pnpm test:browser tests/browser/error-handling.browser.test.ts\` successfully

## Implementation Guide

### CRITICAL: Follow This EXACT Pattern

\`\`\`typescript
import { test, expect } from '@playwright/test';

test.describe('Error Handling', () => {
  test.beforeEach(async ({ page }) => {
    await page.goto('/index.html');
  });

  test('invalid WGSL throws error', async ({ page }) => {
    const result = await page.evaluate(async () => {
      const { setupTest, teardown } = (window as any).RalphTestUtils;
      const { context } = await setupTest(32, 32);
      
      let errorThrown = false;
      let errorName = '';
      let errorMessage = '';
      
      try {
        // Invalid WGSL: function missing return type
        context.pass(\`
          @fragment
          fn main() {
            // missing return type and return statement
          }
        \`);
      } catch (error: any) {
        errorThrown = true;
        errorName = error.name || 'Error';
        errorMessage = error.message || '';
      }
      
      teardown();
      
      return {
        errorThrown,
        errorName,
        errorMessage
      };
    });

    expect(result.errorThrown).toBe(true);
    // Should be ShaderCompileError or contain "shader" in message
    expect(
      result.errorName === 'ShaderCompileError' || 
      result.errorMessage.toLowerCase().includes('shader') ||
      result.errorMessage.toLowerCase().includes('error')
    ).toBe(true);
  });

  test('valid WGSL does not throw', async ({ page }) => {
    const result = await page.evaluate(async () => {
      const { setupTest, teardown } = (window as any).RalphTestUtils;
      const { context } = await setupTest(32, 32);
      
      let errorThrown = false;
      
      try {
        // Valid WGSL
        const pass = context.pass(\`
          @fragment
          fn main(@builtin(position) pos: vec4f) -> @location(0) vec4f {
            return vec4f(1.0, 0.0, 0.0, 1.0);
          }
        \`);
        pass.draw();
      } catch (error) {
        errorThrown = true;
      }
      
      teardown();
      
      return { errorThrown };
    });

    expect(result.errorThrown).toBe(false);
  });
});
\`\`\`

### Key Points
1. **Always use \`test.beforeEach\`** to navigate to \`/index.html\`
2. **Use try/catch** to test error handling
3. **Verify error is thrown for invalid input**
4. **Verify no error for valid input**
5. **Call \`teardown()\`** at the end

### Test Commands
\`\`\`bash
cd ${PROJECT_ROOT}/packages/core
pnpm build:test
pnpm test:browser tests/browser/error-handling.browser.test.ts
\`\`\`

## Success Criteria
1. Test file created at correct path
2. Tests follow existing patterns exactly
3. At least 2 tests: invalid WGSL throws, valid WGSL doesn't throw
4. \`pnpm test:browser tests/browser/error-handling.browser.test.ts\` passes

## Important Notes
- DO NOT modify other files
- ONLY create error-handling.browser.test.ts
`;

async function checkTestsImplemented(): Promise<boolean> {
  try {
    const testFile = path.join(
      PROJECT_ROOT,
      "packages/core/tests/browser/error-handling.browser.test.ts"
    );
    const exists = await fs
      .access(testFile)
      .then(() => true)
      .catch(() => false);

    if (!exists) {
      console.log("❌ error-handling.browser.test.ts not found");
      return false;
    }

    const content = await fs.readFile(testFile, "utf-8");
    
    const checks = [
      content.includes("test.describe"),
      content.includes("error") || content.includes("Error"),
      content.includes("try") && content.includes("catch"),
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

  console.log("🚀 Starting error handling tests agent...\n");

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
