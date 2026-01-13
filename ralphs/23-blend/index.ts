/**
 * Ralph 23: Blend Modes
 */

import "dotenv/config";
import { LoopAgent, brainRule, minimalChangesRule, trackProgressRule } from "@ralph/agent-loop";

const PROJECT_ROOT = "/Users/matiasgf/repos/experiments/ralph-gpu";

const TASK = `
# Task: Implement Blend Modes

## Path: ${PROJECT_ROOT}/packages/ralph-gl

Add blend mode support to Pass and Material classes.

Presets to implement in Pass and Material:
- alpha: gl.SRC_ALPHA, gl.ONE_MINUS_SRC_ALPHA
- additive: gl.ONE, gl.ONE
- multiply: gl.DST_COLOR, gl.ZERO
- screen: gl.ONE, gl.ONE_MINUS_SRC_COLOR

Update Pass.draw() and Material.draw() to apply blend modes.

Create ${PROJECT_ROOT}/packages/ralph-gl/test-blend.html showing different blend modes.

Update ${PROJECT_ROOT}/packages/ralph-gl/brain/progress.md (mark Ralph 09 complete).

Build: cd ${PROJECT_ROOT}/packages/ralph-gl && pnpm build

Max 25 iterations. Focus on core implementation, skip excessive browser testing.
`;

async function main() {
  const agent = new LoopAgent({
    model: process.env.AGENT_MODEL || "anthropic/claude-sonnet-4-20250514",
    trace: true,
    task: TASK,
    rules: [brainRule, minimalChangesRule, trackProgressRule],
    limits: { maxIterations: 25, maxCost: 6.0, timeout: "20m" },
    onUpdate: (status) => {
      console.log(`[${status.iteration}] Cost: $${status.cost.toFixed(4)}`);
    },
  });

  console.log("\n🚀 Ralph 23: Blend Modes\n");
  const result = await agent.run();
  console.log(`\n${result.success ? "✅" : "❌"} Ralph 23 ${result.success ? "complete" : "failed"}`);
  process.exit(result.success ? 0 : 1);
}

main().catch((err) => { console.error(err); process.exit(1); });
