/**
 * Ralph 17: Pass Implementation
 */

import "dotenv/config";
import { LoopAgent, brainRule, minimalChangesRule, trackProgressRule, testFirstRule, visualCheckRule } from "@ralph/agent-loop";

const TASK = `
# Task: Implement Pass (Fullscreen Quad Rendering)

Implement Pass class for fullscreen fragment shader rendering.

File: packages/ralph-gl/src/pass.ts

Features:
1. Built-in fullscreen quad vertex shader
2. Fragment shader compilation and linking  
3. draw() method
4. Uniform handling (will integrate with uniforms.ts)
5. Auto-inject global uniforms (u_resolution, u_time, etc.)

Create simple example to test:
- packages/ralph-gl/test-pass.html (simple HTML file)
- Renders a gradient using Pass

Update brain/progress.md (mark Ralph 03 complete).
`;

async function main() {
  const agent = new LoopAgent({
    model: process.env.AGENT_MODEL || "anthropic/claude-sonnet-4-20250514",
    trace: true,
    task: TASK,
    rules: [brainRule, minimalChangesRule, trackProgressRule, testFirstRule, visualCheckRule],
    limits: { maxIterations: 50, maxCost: 10.0, timeout: "45m" },
  });

  console.log("\n🚀 Ralph 17: Pass Implementation\n");
  const result = await agent.run();
  console.log(`\n${result.success ? "✅" : "❌"} Ralph 17 ${result.success ? "complete" : "failed"}`);
  process.exit(result.success ? 0 : 1);
}

main().catch((err) => { console.error(err); process.exit(1); });
