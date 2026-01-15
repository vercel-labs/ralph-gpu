/**
 * 40-fix-browser-tests: Fix Playwright config and relax pixel assertions
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
# Task: Fix Playwright config and browser test expectations

## Working Directory & Navigation
This script runs from: ${process.cwd()}
Project root is: ${PROJECT_ROOT}

### Repository Structure
\`\`\`
ralph-gpu/
└── packages/core/
    ├── playwright.config.ts
    └── tests/browser/
        ├── *.browser.test.ts
        └── test-utils.ts
\`\`\`

### Navigation Instructions
- Repo files from ${PROJECT_ROOT}
- Example: \`cd ${PROJECT_ROOT}/packages/core\`
- Update progress in \`${process.cwd()}/.progress.md\`

## CRITICAL: Update Progress
After EVERY significant action, update .progress.md in this folder:
- Path: \${process.cwd()}/.progress.md
- Log what you did with timestamp
- Update checkboxes for acceptance criteria
- Document any errors

## Context
Playwright currently looks for *.spec.ts and won't discover the new *.browser.test.ts files. Also pixel expectations are too strict and should use test-utils helpers to allow tolerance.

## Acceptance Criteria (ALL MUST BE MET)

### 1. Playwright config matches browser tests
- [ ] \`packages/core/playwright.config.ts\` points at \`tests/browser\`
- [ ] \`testMatch\` includes \`*.browser.test.ts\`

### 2. Browser tests use tolerant pixel checks
- [ ] Pass, compute, target tests use \`expectPixelNear\` with tolerance (e.g., 2-5) inside \`page.evaluate\`
- [ ] Storage test uses \`expectPixelNear\` inside \`page.evaluate\` (no \`toBeCloseTo(..., -1)\`)

## Implementation Guide
1. Update \`packages/core/playwright.config.ts\`:
   - Set \`testDir\` to \`"./tests/browser"\`
   - Set \`testMatch\` to \`/.*\\.browser\\.test\\.ts/\`
2. Update tests to use \`expectPixelNear\` from \`window.RalphTestUtils\`:
   - In \`page.evaluate\`, call:
     \`\`\`ts
     const { expectPixelNear } = (window as any).RalphTestUtils;
     expectPixelNear(data, [r, g, b, a], 3);
     \`\`\`
   - Then return a boolean like \`true\` and assert \`expect(result).toBe(true)\` in Playwright.
3. Specifically update \`storage.browser.test.ts\` to use \`expectPixelNear\` and return \`true\` from evaluate.
4. Keep changes minimal; no new tests.

## Testing Commands
\`\`\`bash
cd ${PROJECT_ROOT}/packages/core
npx playwright test --list --config playwright.config.ts
\`\`\`
`;

async function fileExists(filePath: string): Promise<boolean> {
  return fs
    .access(filePath)
    .then(() => true)
    .catch(() => false);
}

async function checkFeatureImplemented(): Promise<boolean> {
  const configPath = path.join(PROJECT_ROOT, "packages/core/playwright.config.ts");
  if (!(await fileExists(configPath))) return false;
  const content = await fs.readFile(configPath, "utf8");
  if (!content.includes("tests/browser") || !content.includes("browser.test.ts")) {
    return false;
  }
  const storageTest = path.join(
    PROJECT_ROOT,
    "packages/core/tests/browser/storage.browser.test.ts"
  );
  const storageContent = await fs.readFile(storageTest, "utf8");
  return storageContent.includes("expectPixelNear");
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
      maxIterations: 30,
      maxCost: 15.0,
      timeout: "60m",
    },
    onUpdate: (status) => {
      const elapsed = ((Date.now() - startTime) / 1000).toFixed(1);
      console.log(
        `[${elapsed}s] Iteration ${status.iteration} | State: ${status.state} | Cost: $${status.cost.toFixed(4)}`
      );
    },
    onStuck: async (ctx) => {
      console.log(`\n⚠️ Agent stuck: ${ctx.reason}`);
      return "Try a different approach. Update .progress.md with what you tried.";
    },
    onError: (error) => {
      console.error(`\n❌ Error: ${error.message}`);
    },
  });

  console.log("🚀 Starting agent...\n");

  const result = await agent.run();

  console.log("\n📊 Results");
  console.log(`✅ Success: ${result.success}`);
  console.log(`🔄 Iterations: ${result.iterations}`);
  console.log(`💰 Cost: $${result.cost.toFixed(4)}`);
  console.log(`⏱️ Duration: ${(result.elapsed / 1000).toFixed(1)}s`);

  const passed = await checkFeatureImplemented();
  console.log(`\n${passed ? "🎉 All checks passed!" : "⚠️ Some checks failed"}`);

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
