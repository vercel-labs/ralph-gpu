/**
 * 43-update-scripts: Update test scripts and Vitest exclusions
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
# Task: Update package scripts and Vitest exclusions for browser tests

## Working Directory & Navigation
This script runs from: ${process.cwd()}
Project root is: ${PROJECT_ROOT}

### Repository Structure
\`\`\`
ralph-gpu/
└── packages/core/
    ├── package.json
    └── vitest.config.ts
\`\`\`

### Navigation Instructions
- Repo files from ${PROJECT_ROOT}
- Example: \`cd ${PROJECT_ROOT}/packages/core\`
- Update progress in \`${process.cwd()}/.progress.md\`

## CRITICAL: Update Progress
After EVERY significant action, update .progress.md in this folder.

## Context
We need scripts for Playwright browser tests and to exclude browser test files from Vitest.

## Acceptance Criteria (ALL MUST BE MET)

### 1. Scripts updated
- [ ] \`packages/core/package.json\` includes:
  - \`test:browser\`: \`playwright test\`
  - \`test:browser:headed\`: \`playwright test --headed\`
  - \`test:all\`: \`vitest run && playwright test\`

### 2. Vitest exclusion
- [ ] \`packages/core/vitest.config.ts\` excludes \`**/*.browser.test.ts\`

## Implementation Guide
1. Update \`packages/core/package.json\` scripts (merge with existing, don't remove other scripts).
2. Update \`packages/core/vitest.config.ts\` to exclude Playwright browser tests.
3. Keep changes minimal.
`;

async function checkFeatureImplemented(): Promise<boolean> {
  const pkgPath = path.join(PROJECT_ROOT, "packages/core/package.json");
  const vitestPath = path.join(PROJECT_ROOT, "packages/core/vitest.config.ts");
  const pkg = await fs.readFile(pkgPath, "utf8");
  const vitest = await fs.readFile(vitestPath, "utf8");
  return (
    pkg.includes("test:browser") &&
    pkg.includes("test:browser:headed") &&
    pkg.includes("test:all") &&
    vitest.includes("browser.test.ts")
  );
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
