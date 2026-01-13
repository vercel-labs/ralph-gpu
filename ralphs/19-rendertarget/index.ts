/**
 * Ralph 19: RenderTarget Implementation
 */

import "dotenv/config";
import { LoopAgent, brainRule, minimalChangesRule, trackProgressRule, testFirstRule } from "@ralph/agent-loop";

const PROJECT_ROOT = "/Users/matiasgf/repos/experiments/ralph-gpu";

const TASK = `
# Task: Implement RenderTarget (Framebuffers)

## CRITICAL PATH INFORMATION
You are running from: ${process.cwd()}
The main ralph-gl package is at: ${PROJECT_ROOT}/packages/ralph-gl

ALL file operations should use absolute paths starting with ${PROJECT_ROOT}/

## Implementation

File: ${PROJECT_ROOT}/packages/ralph-gl/src/target.ts

Implement RenderTarget class:
1. Wraps WebGLFramebuffer + WebGLTexture
2. Format support: rgba8, rgba16f, rgba32f
3. resize(width, height)
4. readPixels() for GPU→CPU
5. dispose() cleanup

Update ${PROJECT_ROOT}/packages/ralph-gl/src/context.ts:
- Add ctx.target(width?, height?, options?) method
- Add ctx.setTarget(target | null) method

Update ${PROJECT_ROOT}/packages/ralph-gl/src/index.ts:
- Export RenderTarget class

Create ${PROJECT_ROOT}/packages/ralph-gl/test-target.html:
- Render to offscreen target
- Display the texture on screen
- Use absolute paths in script src tags

Build must pass: cd ${PROJECT_ROOT}/packages/ralph-gl && pnpm build

Update ${PROJECT_ROOT}/packages/ralph-gl/brain/progress.md (mark Ralph 05 complete).
`;

async function main() {
  const agent = new LoopAgent({
    model: process.env.AGENT_MODEL || "anthropic/claude-sonnet-4-20250514",
    trace: true,
    task: TASK,
    rules: [brainRule, minimalChangesRule, trackProgressRule, testFirstRule],
    limits: { maxIterations: 35, maxCost: 8.0, timeout: "30m" },
    onUpdate: (status) => {
      console.log(`[${status.iteration}] Cost: $${status.cost.toFixed(4)}`);
    },
  });

  console.log("\n🚀 Ralph 19: RenderTarget Implementation\n");
  const result = await agent.run();
  console.log(`\n${result.success ? "✅" : "❌"} Ralph 19 ${result.success ? "complete" : "failed"}`);
  process.exit(result.success ? 0 : 1);
}

main().catch((err) => { console.error(err); process.exit(1); });
