/**
 * Ralph 20: PingPong Buffers
 */

import "dotenv/config";
import { LoopAgent, brainRule, minimalChangesRule, trackProgressRule, visualCheckRule } from "@ralph/agent-loop";

const PROJECT_ROOT = "/Users/matiasgf/repos/experiments/ralph-gpu";

const TASK = `
# Task: Implement PingPong Buffers

## Path: ${PROJECT_ROOT}/packages/ralph-gl

File: ${PROJECT_ROOT}/packages/ralph-gl/src/ping-pong.ts

Implement PingPongTarget:
1. Wraps two RenderTargets (read, write)
2. swap() method
3. resize() both targets
4. dispose() cleanup

Add to ${PROJECT_ROOT}/packages/ralph-gl/src/context.ts:
- ctx.pingPong(width?, height?, options?)

Create ${PROJECT_ROOT}/packages/ralph-gl/test-pingpong.html: simple feedback effect or blur.

Update ${PROJECT_ROOT}/packages/ralph-gl/brain/progress.md (mark Ralph 06 complete).

Build: cd ${PROJECT_ROOT}/packages/ralph-gl && pnpm build
`;

async function main() {
  const agent = new LoopAgent({
    model: process.env.AGENT_MODEL || "anthropic/claude-sonnet-4-20250514",
    trace: true,
    task: TASK,
    rules: [brainRule, minimalChangesRule, trackProgressRule, visualCheckRule],
    limits: { maxIterations: 40, maxCost: 8.0, timeout: "30m" },
  });

  console.log("\n🚀 Ralph 20: PingPong Buffers\n");
  const result = await agent.run();
  console.log(`\n${result.success ? "✅" : "❌"} Ralph 20 ${result.success ? "complete" : "failed"}`);
  process.exit(result.success ? 0 : 1);
}

main().catch((err) => { console.error(err); process.exit(1); });
