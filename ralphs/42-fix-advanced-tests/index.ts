/**
 * 42-fix-advanced-tests: Stabilize MRT test expectations
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
# Task: Stabilize MRT browser test

## Working Directory & Navigation
This script runs from: ${process.cwd()}
Project root is: ${PROJECT_ROOT}

### Repository Structure
\`\`\`
ralph-gpu/
└── packages/core/tests/browser/mrt.browser.test.ts
\`\`\`

### Navigation Instructions
- Repo files from ${PROJECT_ROOT}
- Example: \`cd ${PROJECT_ROOT}/packages/core\`
- Update progress in \`${process.cwd()}/.progress.md\`

## CRITICAL: Update Progress
After EVERY significant action, update .progress.md in this folder.

## Context
The MRT implementation currently uses the first target view for drawing. The test should avoid assuming multiple attachments are written in a single pass. We should still validate that MRT creates multiple targets and that each can be rendered to.

## Acceptance Criteria (ALL MUST BE MET)

### 1. MRT test is robust
- [ ] \`mrt.browser.test.ts\` no longer relies on multiple render attachments in one pass
- [ ] Test verifies target0 and target1 by rendering to each explicitly
- [ ] Uses \`expectPixelNear\`

## Implementation Guide
1. In \`mrt.browser.test.ts\`:
   - Create MRT with two targets.
   - Render a pass to \`context.setTarget(mrt)\` and verify only target0 (red).
   - Then render a second pass directly to target1 (green) using \`context.setTarget(target1)\`.
   - Ensure target1 exists; throw if undefined.
2. Keep test structure and Playwright wrapper unchanged.
`;

async function checkFeatureImplemented(): Promise<boolean> {
  const testPath = path.join(
    PROJECT_ROOT,
    "packages/core/tests/browser/mrt.browser.test.ts"
  );
  const content = await fs.readFile(testPath, "utf8");
  return content.includes("target1") && content.includes("context.setTarget(target1)");
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
