/**
 * Ralph 16: GLContext Implementation
 * Implement the core WebGL context class with initialization and time management
 */

import "dotenv/config";
import { LoopAgent, brainRule, minimalChangesRule, trackProgressRule, testFirstRule } from "@ralph/agent-loop";

const TASK = `
# Task: Implement GLContext

## Context
Create the core GLContext class that manages WebGL 2.0 state. Use GLSL ES 3.0 directly (no WGSL transpiler).
Reference: packages/ralph-gl/brain/architecture.md

## Implementation

File: packages/ralph-gl/src/context.ts

Implement:
1. GLContext class with gl, canvas, width, height, time, deltaTime, frame
2. gl.isSupported() - check WebGL 2.0 availability
3. gl.init(canvas, options) - create context
4. resize(width, height) - with DPR support
5. clear(color) - clear canvas
6. Time management - update time/deltaTime/frame automatically

Make it simple and focused. Export from src/index.ts.

Create tests in tests/context.test.ts.

Update packages/ralph-gl/brain/progress.md when done (mark Ralph 02 complete).

Build should pass: cd packages/ralph-gl && pnpm build
`;

async function main() {
  const agent = new LoopAgent({
    model: process.env.AGENT_MODEL || "anthropic/claude-sonnet-4-20250514",
    trace: true,
    task: TASK,
    rules: [brainRule, minimalChangesRule, trackProgressRule, testFirstRule],
    limits: { maxIterations: 40, maxCost: 8.0, timeout: "30m" },
  });

  console.log("\n🚀 Ralph 16: GLContext Implementation\n");
  const result = await agent.run();
  console.log(`\n${result.success ? "✅" : "❌"} Ralph 16 ${result.success ? "complete" : "failed"}`);
  process.exit(result.success ? 0 : 1);
}

main().catch((err) => { console.error(err); process.exit(1); });
