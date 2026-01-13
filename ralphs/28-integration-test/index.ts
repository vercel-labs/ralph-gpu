/**
 * Ralph 28: Integration Testing
 */

import "dotenv/config";
import { LoopAgent, brainRule, minimalChangesRule, trackProgressRule, visualCheckRule } from "@ralph/agent-loop";

const PROJECT_ROOT = "/Users/matiasgf/repos/experiments/ralph-gpu";

const TASK = `
# Task: Integration Testing & Final Validation

## Paths
Documentation app: ${PROJECT_ROOT}/apps/documentation
ralph-gl package: ${PROJECT_ROOT}/packages/ralph-gl

## Test All Examples

Start docs app: cd ${PROJECT_ROOT}/apps/documentation && pnpm dev

Visit and verify each example renders correctly:
1. http://localhost:3000/examples/basic
2. http://localhost:3000/examples/uniforms
3. http://localhost:3000/examples/render-target
4. http://localhost:3000/examples/particles
5. http://localhost:3000/examples/pingpong
6. http://localhost:3000/examples/material

For EACH example:
- Take screenshot
- Check browser console for errors
- Verify it renders correctly
- Test that animations work (if applicable)

## Document Issues

Create ${PROJECT_ROOT}/packages/ralph-gl/ISSUES.md if any problems found.

List issues with:
- Which example has the problem
- What the error is
- Suggested fix

## If Issues Found

Create a numbered list of fix tasks. I will create fix ralphs for each.

## If All Working

Update ${PROJECT_ROOT}/packages/ralph-gl/brain/progress.md:
- Mark Ralph 14 complete
- Add final summary

Create ${PROJECT_ROOT}/packages/ralph-gl/TESTING-REPORT.md with:
- All 6 examples tested ✅
- Screenshots of each
- Any notes

Max 40 iterations.
`;

async function main() {
  const agent = new LoopAgent({
    model: process.env.AGENT_MODEL || "anthropic/claude-sonnet-4-20250514",
    trace: true,
    task: TASK,
    rules: [brainRule, minimalChangesRule, trackProgressRule, visualCheckRule],
    limits: { maxIterations: 40, maxCost: 15.0, timeout: "45m" },
    onUpdate: (status) => {
      console.log(`[${status.iteration}] Cost: $${status.cost.toFixed(4)}`);
    },
  });

  console.log("\n🚀 Ralph 28: Integration Testing\n");
  const result = await agent.run();
  console.log(`\n${result.success ? "✅" : "❌"} Ralph 28 ${result.success ? "complete" : "failed"}`);
  process.exit(result.success ? 0 : 1);
}

main().catch((err) => { console.error(err); process.exit(1); });
