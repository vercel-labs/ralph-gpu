/**
 * 37-test-harness: Add browser test page and bundle config
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
# Task: Create browser test harness for WebGPU tests

## Working Directory & Navigation
This script runs from: ${process.cwd()}
Project root is: ${PROJECT_ROOT}

### Repository Structure
\`\`\`
ralph-gpu/
├── packages/
│   └── core/
│       ├── tests/
│       │   └── browser/           (create harness here)
│       ├── webpack.config.js
│       └── playwright.config.ts
└── ralphs/37-test-harness/
\`\`\`

### Navigation Instructions
- Repo files from ${PROJECT_ROOT}
- Example: \`cd ${PROJECT_ROOT}/packages/core\`
- Update progress in \`${process.cwd()}/.progress.md\`

## CRITICAL: Update Progress
After EVERY significant action, update .progress.md in this folder.

## Context
We need a browser test harness that Playwright can load. This includes a minimal HTML page with a canvas and a bundled script that exposes ralph-gpu to window for tests.

## Acceptance Criteria (ALL MUST BE MET)

### 1. Test HTML page
- [ ] \`packages/core/tests/browser/index.html\` exists
- [ ] Page contains a canvas and loads a bundled script (e.g. \`test-bundle.js\`)

### 2. Browser bundle entry
- [ ] \`packages/core/tests/browser/index.ts\` exists
- [ ] Entry exposes \`window.RalphGPU\` (or similar) with ralph-gpu exports

### 3. Bundle configuration
- [ ] Add a webpack config (new file) or reuse existing config to build the browser test bundle
- [ ] Document how to build/serve the test bundle (comment in config or README in tests/browser)

## Implementation Guide
1. Create \`tests/browser/index.html\` with a canvas element and script tag for the bundle.
2. Create \`tests/browser/index.ts\` that imports from \`ralph-gpu\` and assigns to \`window\`.
3. Create a webpack config under \`tests/browser/\` (e.g. \`webpack.config.js\`) that:
   - Bundles \`index.ts\` to \`test-bundle.js\`
   - Outputs to \`tests/browser/dist\`
   - Uses similar TypeScript handling as the main webpack config
4. Add a short README or comments explaining how to build the bundle.

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
  const htmlPath = path.join(PROJECT_ROOT, "packages/core/tests/browser/index.html");
  const entryPath = path.join(PROJECT_ROOT, "packages/core/tests/browser/index.ts");
  const webpackConfigPath = path.join(
    PROJECT_ROOT,
    "packages/core/tests/browser/webpack.config.js"
  );

  if (!(await fileExists(htmlPath))) return false;
  if (!(await fileExists(entryPath))) return false;
  if (!(await fileExists(webpackConfigPath))) return false;

  const htmlContent = await fs.readFile(htmlPath, "utf8");
  const entryContent = await fs.readFile(entryPath, "utf8");
  return htmlContent.includes("canvas") && entryContent.includes("window");
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
