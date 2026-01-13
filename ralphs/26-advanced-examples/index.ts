/**
 * Ralph 26: Advanced Examples
 */

import "dotenv/config";
import { LoopAgent, brainRule, minimalChangesRule, trackProgressRule, visualCheckRule } from "@ralph/agent-loop";

const PROJECT_ROOT = "/Users/matiasgf/repos/experiments/ralph-gpu";

const TASK = `
# Task: Create Advanced Examples

## Path: ${PROJECT_ROOT}/apps/documentation

Create 3 advanced example pages in ${PROJECT_ROOT}/apps/documentation/app/examples/:

1. particles/page.tsx - Instanced particle rendering with Material
2. pingpong/page.tsx - Feedback effect using PingPong buffers
3. material/page.tsx - Custom geometry (triangle or simple mesh)

Each should:
- Use ralph-gl advanced features
- Have canvas + code display
- Actually render and be visually interesting

Visit examples in browser to verify they work.

Update ${PROJECT_ROOT}/packages/ralph-gl/brain/progress.md (mark Ralph 12 complete).

Max 35 iterations.
`;

async function main() {
  const agent = new LoopAgent({
    model: process.env.AGENT_MODEL || "anthropic/claude-sonnet-4-20250514",
    trace: true,
    task: TASK,
    rules: [brainRule, minimalChangesRule, trackProgressRule, visualCheckRule],
    limits: { maxIterations: 35, maxCost: 15.0, timeout: "45m" },
    onUpdate: (status) => {
      console.log(`[${status.iteration}] Cost: $${status.cost.toFixed(4)}`);
    },
  });

  console.log("\n🚀 Ralph 26: Advanced Examples\n");
  const result = await agent.run();
  console.log(`\n${result.success ? "✅" : "❌"} Ralph 26 ${result.success ? "complete" : "failed"}`);
  process.exit(result.success ? 0 : 1);
}

main().catch((err) => { console.error(err); process.exit(1); });
