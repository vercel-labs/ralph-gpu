/**
 * 38-test-utils: Add browser test utilities
 */

import "dotenv/config";
import { LoopAgent, brainRule, trackProgressRule, minimalChangesRule } from "@ralph/agent-loop";
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
# Task: Create browser test utilities for WebGPU tests

## Working Directory & Navigation
This script runs from: ${process.cwd()}
Project root is: ${PROJECT_ROOT}

### Repository Structure
\`\`\`
ralph-gpu/
└── packages/core/tests/browser/
    ├── index.ts
    ├── index.html
    └── test-utils.ts      (create)
\`\`\`

### Navigation Instructions
- Repo files from ${PROJECT_ROOT}
- Example: \`cd ${PROJECT_ROOT}/packages/core\`
- Update progress in \`${process.cwd()}/.progress.md\`

## CRITICAL: Update Progress
After EVERY significant action, update .progress.md in this folder.

## Context
We need shared helpers for Playwright browser tests: setup canvas + context, read pixels, and teardown. These helpers should be imported by browser tests.

## Acceptance Criteria (ALL MUST BE MET)

### 1. Test utilities file
- [ ] \`packages/core/tests/browser/test-utils.ts\` exists
- [ ] Exports \`setupTest\`, \`readPixels\`, and \`teardown\`

### 2. Utilities behavior
- [ ] \`setupTest\` creates a canvas, appends it to DOM, initializes GPU context
- [ ] \`readPixels\` reads a region into a Uint8Array (1x1 default ok)
- [ ] \`teardown\` cleans up (remove canvas, dispose context if available)

### 3. Pixel helpers
- [ ] Add at least one small pixel comparison helper (e.g. \`expectPixelNear\` or \`isColorNear\`)

## Implementation Guide
1. Implement in \`tests/browser/test-utils.ts\`.
2. Use current ralph-gpu API: \`gpu.init\`, \`ctx.readPixels\`, \`ctx.dispose\`.
3. Keep utilities minimal and synchronous where possible.

## Testing Commands
\`\`\`bash
cd ${PROJECT_ROOT}/packages/core/tests/browser
pnpm --filter ralph-gpu exec webpack --config webpack.config.js
\`\`\`
`;

async function fileExists(filePath: string): Promise<boolean> {
  return fs
    .access(filePath)
    .then(() => true)
    .catch(() => false);
}

async function checkFeatureImplemented(): Promise<boolean> {
  const utilsPath = path.join(PROJECT_ROOT, "packages/core/tests/browser/test-utils.ts");
  if (!(await fileExists(utilsPath))) return false;
  const content = await fs.readFile(utilsPath, "utf8");
  return (
    content.includes("setupTest") &&
    content.includes("readPixels") &&
    content.includes("teardown")
  );
}

async function main() {
  const startTime = Date.now();

  const agent = new LoopAgent({
    model: "google/gemini-3-flash",
    trace: true,
    task: TASK,
    rules: [brainRule, trackProgressRule, minimalChangesRule],
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
