/**
 * Ralph 22: Storage Buffer Emulation
 */

import "dotenv/config";
import { LoopAgent, brainRule, minimalChangesRule, trackProgressRule } from "@ralph/agent-loop";

const PROJECT_ROOT = "/Users/matiasgf/repos/experiments/ralph-gpu";

const TASK = `
# Task: Implement Storage Buffer Emulation

## Path: ${PROJECT_ROOT}/packages/ralph-gl

File: ${PROJECT_ROOT}/packages/ralph-gl/src/storage.ts

Implement StorageBuffer:
1. Wraps WebGLBuffer for vertex data
2. write(data: TypedArray) to update
3. Simple API for Material to bind as vertex attributes

Update ${PROJECT_ROOT}/packages/ralph-gl/src/context.ts:
- ctx.storage(byteSize)

Keep it simple - just vertex buffer support for now.

Update ${PROJECT_ROOT}/packages/ralph-gl/brain/progress.md (mark Ralph 08 complete).

Build: cd ${PROJECT_ROOT}/packages/ralph-gl && pnpm build
`;

async function main() {
  const agent = new LoopAgent({
    model: process.env.AGENT_MODEL || "anthropic/claude-sonnet-4-20250514",
    trace: true,
    task: TASK,
    rules: [brainRule, minimalChangesRule, trackProgressRule],
    limits: { maxIterations: 30, maxCost: 6.0, timeout: "20m" },
  });

  console.log("\n🚀 Ralph 22: Storage Buffer\n");
  const result = await agent.run();
  console.log(`\n${result.success ? "✅" : "❌"} Ralph 22 ${result.success ? "complete" : "failed"}`);
  process.exit(result.success ? 0 : 1);
}

main().catch((err) => { console.error(err); process.exit(1); });
