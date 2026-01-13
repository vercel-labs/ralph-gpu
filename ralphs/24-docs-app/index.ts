/**
 * Ralph 24: Documentation App Setup
 */

import "dotenv/config";
import { LoopAgent, brainRule, minimalChangesRule, trackProgressRule, visualCheckRule } from "@ralph/agent-loop";

const PROJECT_ROOT = "/Users/matiasgf/repos/experiments/ralph-gpu";

const TASK = `
# Task: Create Documentation App

Create Next.js app at ${PROJECT_ROOT}/apps/documentation with:

Structure:
- app/layout.tsx - sidebar navigation
- app/page.tsx - home
- app/getting-started/page.tsx
- app/examples/ - folder for example pages

Keep it simple. Use Tailwind. Dark theme.

No examples yet - just structure.

pnpm dev should start successfully.

Update brain/progress.md (mark Ralph 10 complete).
`;

async function main() {
  const agent = new LoopAgent({
    model: process.env.AGENT_MODEL || "anthropic/claude-sonnet-4-20250514",
    trace: true,
    task: TASK,
    rules: [brainRule, minimalChangesRule, trackProgressRule, visualCheckRule],
    limits: { maxIterations: 50, maxCost: 10.0, timeout: "30m" },
  });

  console.log("\n🚀 Ralph 24: Documentation App\n");
  const result = await agent.run();
  console.log(`\n${result.success ? "✅" : "❌"} Ralph 24 ${result.success ? "complete" : "failed"}`);
  process.exit(result.success ? 0 : 1);
}

main().catch((err) => { console.error(err); process.exit(1); });
