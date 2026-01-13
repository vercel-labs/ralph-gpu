/**
 * Ralph 21: Material Implementation
 */

import "dotenv/config";
import { LoopAgent, brainRule, minimalChangesRule, trackProgressRule, visualCheckRule } from "@ralph/agent-loop";

const PROJECT_ROOT = "/Users/matiasgf/repos/experiments/ralph-gpu";

const TASK = `
# Task: Implement Material (Custom Geometry)

## Path: ${PROJECT_ROOT}/packages/ralph-gl

File: ${PROJECT_ROOT}/packages/ralph-gl/src/material.ts

Implement Material class:
1. Custom vertex + fragment shaders
2. vertexCount, instances
3. topology: triangles, lines, points
4. storage() method for binding vertex data
5. draw() with instancing support

Update ${PROJECT_ROOT}/packages/ralph-gl/src/context.ts:
- ctx.material(vertexShader, fragmentShader, options?)

Create ${PROJECT_ROOT}/packages/ralph-gl/test-material.html: render triangle + instanced quads.

Update ${PROJECT_ROOT}/packages/ralph-gl/brain/progress.md (mark Ralph 07 complete).

Build: cd ${PROJECT_ROOT}/packages/ralph-gl && pnpm build
`;

async function main() {
  const agent = new LoopAgent({
    model: process.env.AGENT_MODEL || "anthropic/claude-sonnet-4-20250514",
    trace: true,
    task: TASK,
    rules: [brainRule, minimalChangesRule, trackProgressRule, visualCheckRule],
    limits: { maxIterations: 50, maxCost: 10.0, timeout: "45m" },
  });

  console.log("\n🚀 Ralph 21: Material Implementation\n");
  const result = await agent.run();
  console.log(`\n${result.success ? "✅" : "❌"} Ralph 21 ${result.success ? "complete" : "failed"}`);
  process.exit(result.success ? 0 : 1);
}

main().catch((err) => { console.error(err); process.exit(1); });
