/**
 * 01-init: Test the @ralph/agent-loop library by generating a repository context file
 *
 * This script uses the LoopAgent to explore the repository and create
 * a comprehensive context document about its structure and purpose.
 */

import "dotenv/config";
import { LoopAgent, explorationRule, brainRule } from "@ralph/agent-loop";

// Get configuration from environment
const AI_GATEWAY_API_KEY = process.env.AI_GATEWAY_API_KEY;
const AGENT_MODEL = process.env.AGENT_MODEL || "anthropic/claude-sonnet-4-20250514";
const PROJECT_ROOT = process.env.PROJECT_ROOT || process.cwd();

if (!AI_GATEWAY_API_KEY) {
  console.error("❌ Missing AI_GATEWAY_API_KEY in environment");
  process.exit(1);
}

// Check for debug flag
const DEBUG = process.env.DEBUG === "true" || process.argv.includes("--debug");

console.log("🤖 Ralph Agent - Repository Context Generator");
console.log("━".repeat(50));
console.log(`📁 Project: ${PROJECT_ROOT}`);
console.log(`🧠 Model: ${AGENT_MODEL}`);
if (DEBUG) {
  console.log(`🐛 Debug: enabled`);
}
console.log("━".repeat(50));

const TASK = `
Create a REPO_CONTEXT.md file documenting this repository.

## Important: Working Directory
You are currently in: ${process.cwd()}
The project root is: ${PROJECT_ROOT}
Write the file to: ${PROJECT_ROOT}/REPO_CONTEXT.md

## What to Document
1. Project Overview - what is this project?
2. Tech Stack - technologies used
3. Project Structure - directories and their purpose
4. Packages - list workspace packages
5. Key Files - important files and what they do
6. Setup - how to install and run

## Instructions
1. FIRST: Run "ls -la ${PROJECT_ROOT}" to see the project structure
2. Read a few key files (package.json, README.md, pnpm-workspace.yaml)
3. THEN: Write REPO_CONTEXT.md using the writeFile tool
4. Call done() when finished

IMPORTANT: Don't over-explore. Read 5-10 key files max, then WRITE the document.
Use writeFile(path: "${PROJECT_ROOT}/REPO_CONTEXT.md", content: "...") to create the file.
`;

async function main() {
  const startTime = Date.now();

  const agent = new LoopAgent({
    model: AGENT_MODEL,
    task: TASK,
    rules: [explorationRule, brainRule],
    debug: DEBUG,
    limits: {
      maxIterations: 30,
      maxCost: 2.0,
      timeout: "10m",
    },
    onUpdate: (status) => {
      const elapsed = ((Date.now() - startTime) / 1000).toFixed(1);
      console.log(
        `[${elapsed}s] Iteration ${status.iteration} | State: ${status.state} | Cost: $${status.cost.toFixed(4)}`
      );
      if (status.lastActions.length > 0) {
        console.log(`  → Actions: ${status.lastActions.slice(-3).join(", ")}`);
      }
    },
    onStuck: async (ctx) => {
      console.log(`\n⚠️ Agent stuck: ${ctx.reason}`);
      return "Try a different approach. If you're having trouble reading files, try listing the directory first.";
    },
    onError: (error) => {
      console.error(`\n❌ Error: ${error.message}`);
    },
  });

  console.log("\n🚀 Starting agent...\n");

  const result = await agent.run();

  console.log("\n" + "━".repeat(50));
  console.log("📊 Results");
  console.log("━".repeat(50));
  console.log(`✅ Success: ${result.success}`);
  console.log(`📝 Reason: ${result.reason}`);
  console.log(`🔄 Iterations: ${result.iterations}`);
  console.log(`💰 Cost: $${result.cost.toFixed(4)}`);
  console.log(`⏱️ Duration: ${(result.elapsed / 1000).toFixed(1)}s`);
  console.log(
    `🔤 Tokens: ${result.tokens.total.toLocaleString()} (in: ${result.tokens.input.toLocaleString()}, out: ${result.tokens.output.toLocaleString()})`
  );
  console.log("━".repeat(50));

  if (result.summary) {
    console.log("\n📄 Summary:");
    console.log(result.summary);
  }

  if (!result.success) {
    console.error(`\n❌ Agent failed: ${result.reason}`);
    if (result.error) {
      console.error(`Error details: ${result.error.message}`);
    }
    process.exit(1);
  }

  console.log("\n✨ Done!");
}

main().catch((error) => {
  console.error("Fatal error:", error);
  process.exit(1);
});
