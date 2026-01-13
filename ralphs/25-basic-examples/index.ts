/**
 * Ralph 25: Basic Examples
 */

import "dotenv/config";
import { LoopAgent, brainRule, minimalChangesRule, trackProgressRule, visualCheckRule } from "@ralph/agent-loop";

const PROJECT_ROOT = "/Users/matiasgf/repos/experiments/ralph-gpu";

const TASK = `
# Task: Create Basic Examples

## Path: ${PROJECT_ROOT}/apps/documentation

Create 3 basic example pages in ${PROJECT_ROOT}/apps/documentation/app/examples/:

1. basic/page.tsx - Simple gradient using ralph-gl
2. uniforms/page.tsx - Animated uniforms (wave, color changing)
3. render-target/page.tsx - Render to texture then display

Each page should:
- Import ralph-gl from package
- Have useEffect hook for WebGL setup
- Show canvas with example
- Include code snippet
- Actually work and render

The documentation app already has:
- Layout with navigation
- Example folder structure
- All you need to do is create the example page.tsx files

Check that examples render: cd ${PROJECT_ROOT}/apps/documentation && pnpm dev
Then visit http://localhost:3000/examples/basic etc.

Update ${PROJECT_ROOT}/packages/ralph-gl/brain/progress.md (mark Ralph 11 complete).

Max 40 iterations - focus on getting examples working, not perfect styling.
`;

async function main() {
  const agent = new LoopAgent({
    model: process.env.AGENT_MODEL || "anthropic/claude-sonnet-4-20250514",
    trace: true,
    task: TASK,
    rules: [brainRule, minimalChangesRule, trackProgressRule, visualCheckRule],
    limits: { maxIterations: 40, maxCost: 12.0, timeout: "45m" },
    onUpdate: (status) => {
      console.log(`[${status.iteration}] Cost: $${status.cost.toFixed(4)}`);
    },
  });

  console.log("\n🚀 Ralph 25: Basic Examples\n");
  const result = await agent.run();
  console.log(`\n${result.success ? "✅" : "❌"} Ralph 25 ${result.success ? "complete" : "failed"}`);
  process.exit(result.success ? 0 : 1);
}

main().catch((err) => { console.error(err); process.exit(1); });
