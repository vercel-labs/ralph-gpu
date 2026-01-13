/**
 * Ralph 27: API Documentation Pages
 */

import "dotenv/config";
import { LoopAgent, brainRule, minimalChangesRule, trackProgressRule } from "@ralph/agent-loop";

const PROJECT_ROOT = "/Users/matiasgf/repos/experiments/ralph-gpu";
const DOCS_APP = `${PROJECT_ROOT}/apps/documentation`;
const RALPH_GL = `${PROJECT_ROOT}/packages/ralph-gl`;

const TASK = `
# Task: Create API Documentation Pages

## ABSOLUTE PATHS
Documentation app: ${DOCS_APP}
ralph-gl package: ${RALPH_GL}

Create API reference pages in ${DOCS_APP}/app/api/:

1. ${DOCS_APP}/app/api/page.tsx - API overview
2. ${DOCS_APP}/app/api/context/page.tsx - GLContext methods
3. ${DOCS_APP}/app/api/pass/page.tsx - Pass methods
4. ${DOCS_APP}/app/api/material/page.tsx - Material methods
5. ${DOCS_APP}/app/api/target/page.tsx - RenderTarget methods

Reference source code at:
- ${RALPH_GL}/src/context.ts
- ${RALPH_GL}/src/pass.ts
- ${RALPH_GL}/src/material.ts
- ${RALPH_GL}/src/target.ts

Each page should document methods, parameters, return types, with code examples.

Update ${RALPH_GL}/brain/progress.md (mark Ralph 13 complete).

Max 25 iterations.
`;

async function main() {
  const agent = new LoopAgent({
    model: process.env.AGENT_MODEL || "anthropic/claude-sonnet-4-20250514",
    trace: true,
    task: TASK,
    rules: [brainRule, minimalChangesRule, trackProgressRule],
    limits: { maxIterations: 25, maxCost: 8.0, timeout: "25m" },
    onUpdate: (status) => {
      console.log(`[${status.iteration}] Cost: $${status.cost.toFixed(4)}`);
    },
  });

  console.log("\n🚀 Ralph 27: API Documentation\n");
  const result = await agent.run();
  console.log(`\n${result.success ? "✅" : "❌"} Ralph 27 ${result.success ? "complete" : "failed"}`);
  process.exit(result.success ? 0 : 1);
}

main().catch((err) => { console.error(err); process.exit(1); });
