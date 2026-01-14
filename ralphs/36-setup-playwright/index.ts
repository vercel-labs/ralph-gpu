/**
 * 36-setup-playwright: Add Playwright config and dependency for WebGPU tests
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
# Task: Setup Playwright for WebGPU tests

## Working Directory & Navigation
This script runs from: ${process.cwd()}
Project root is: ${PROJECT_ROOT}

### Repository Structure
\`\`\`
ralph-gpu/                    (project root)
├── packages/
│   ├── core/                 (main WebGPU library package)
│   │   ├── src/              (library source code)
│   │   ├── tests/            (existing unit tests)
│   │   └── playwright.config.ts (create)
│   └── ralph/                (agent-loop package)
└── ralphs/
    └── 36-setup-playwright/  (this script)
\`\`\`

### Navigation Instructions
- Repo files from ${PROJECT_ROOT}
- Example: core package \`cd ${PROJECT_ROOT}/packages/core\`
- Update progress in \`${process.cwd()}/.progress.md\`

## CRITICAL: Update Progress
After EVERY significant action, update .progress.md in this folder.

## Context
We are migrating tests to Playwright with real WebGPU. First step is to add Playwright as a dev dependency in \`packages/core\` and create \`playwright.config.ts\` with WebGPU-enabled Chromium flags.

## Acceptance Criteria (ALL MUST BE MET)

### 1. Playwright dependency
- [ ] \`packages/core/package.json\` includes \`@playwright/test\` in devDependencies

### 2. Playwright configuration
- [ ] \`packages/core/playwright.config.ts\` exists
- [ ] Config uses Chromium and sets args \`--enable-unsafe-webgpu\` and \`--enable-features=Vulkan\`
- [ ] Config defaults to headless for CI with an easy way to run headed (documented in config comments)

## Implementation Guide
1. Add \`@playwright/test\` to \`packages/core/package.json\` devDependencies.
2. Create \`packages/core/playwright.config.ts\` with Playwright Test config:
   - Use Chromium
   - WebGPU flags: \`--enable-unsafe-webgpu\`, \`--enable-features=Vulkan\`
   - Base URL should point to the browser test harness (placeholder is ok)
   - Set reasonable timeouts for GPU tests
3. Keep changes focused and minimal.

## Testing Commands
\`\`\`bash
cd ${PROJECT_ROOT}
pnpm -C packages/core test:browser -- --help
\`\`\`
`;

async function fileContains(filePath: string, needle: string): Promise<boolean> {
  const content = await fs.readFile(filePath, "utf8");
  return content.includes(needle);
}

async function checkFeatureImplemented(): Promise<boolean> {
  const corePackageJson = path.join(PROJECT_ROOT, "packages/core/package.json");
  const playwrightConfig = path.join(PROJECT_ROOT, "packages/core/playwright.config.ts");

  try {
    const pkgContent = await fs.readFile(corePackageJson, "utf8");
    const hasPlaywright = pkgContent.includes("\"@playwright/test\"");
    const configExists = await fs
      .access(playwrightConfig)
      .then(() => true)
      .catch(() => false);
    if (!hasPlaywright || !configExists) return false;

    const hasWebGpuFlags =
      (await fileContains(playwrightConfig, "--enable-unsafe-webgpu")) &&
      (await fileContains(playwrightConfig, "--enable-features=Vulkan"));
    return hasWebGpuFlags;
  } catch {
    return false;
  }
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
