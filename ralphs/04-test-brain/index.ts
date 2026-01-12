/**
 * Ralph Test Script: Brain Functionality (Organic Test)
 *
 * Gives the agent a natural task and checks if it uses .brain/ correctly.
 * The brainRule should guide it to create persistent knowledge.
 *
 * Run with: pnpm start
 * Clean brain: pnpm clean
 */

import "dotenv/config";
import { LoopAgent, brainRule, explorationRule, setDebugMode } from "@ralph/agent-loop";
import * as fs from "fs/promises";

// Get config from environment
const PROJECT_ROOT = process.env.PROJECT_ROOT || "../..";
const AGENT_MODEL = process.env.AGENT_MODEL || "anthropic/claude-sonnet-4";

// Check for debug mode
const DEBUG =
  process.env.DEBUG === "true" || process.argv.includes("--debug");
if (DEBUG) {
  setDebugMode(true);
}

console.log("\n🧠 Ralph Agent - Brain Functionality Test");
console.log("━".repeat(55));
console.log(`📁 Working dir: ${process.cwd()}`);
console.log(`📁 Project root: ${PROJECT_ROOT}`);
console.log(`🧠 Model: ${AGENT_MODEL}`);
if (DEBUG) {
  console.log(`🐛 Debug: enabled`);
}
console.log("━".repeat(55));

// A natural task - the agent should use .brain/ based on the brainRule
const TASK = `
# Task: Summarize the Examples App

Explore the examples app at ${PROJECT_ROOT}/apps/examples/ and create a summary document.

## What to do
1. Look at what examples exist in the app
2. Understand what each example demonstrates
3. Write a summary to "examples-summary.md" in the current directory

## The examples app location
- Path: ${PROJECT_ROOT}/apps/examples/
- It's a Next.js app with multiple example pages

## Output
Create "examples-summary.md" with:
- List of all examples
- Brief description of what each one does
- Any patterns you notice

When done, call the done() tool with a summary of what you found.
`;

async function main() {
  // Clean up from previous runs
  try {
    await fs.rm(".brain", { recursive: true, force: true });
    await fs.rm("examples-summary.md", { force: true });
    console.log("🧹 Cleaned up previous run artifacts\n");
  } catch {
    // Ignore errors
  }

  const agent = new LoopAgent({
    task: TASK,
    model: AGENT_MODEL,
    debug: DEBUG,
    rules: [brainRule, explorationRule], // brainRule should guide it to use .brain/
    limits: {
      maxIterations: 15,
      maxCost: 3.0,
    },
  });

  console.log("🚀 Starting agent...\n");

  const result = await agent.run();

  console.log("\n" + "═".repeat(55));
  console.log("📊 Final Result:");
  console.log("═".repeat(55));
  console.log(`✅ Success: ${result.success}`);
  console.log(`📝 Reason: ${result.reason}`);
  console.log(`🔄 Iterations: ${result.iterations}`);
  console.log(`💰 Cost: $${result.cost.toFixed(4)}`);
  console.log(`📖 Summary: ${result.summary}`);
  console.log("═".repeat(55));

  // Check results
  console.log("\n📂 Checking outputs...\n");

  // Check if examples-summary.md was created
  try {
    const summary = await fs.readFile("examples-summary.md", "utf-8");
    console.log("✅ examples-summary.md created!");
    console.log(`   Size: ${summary.length} chars`);
    console.log(`   Preview:\n   ${summary.slice(0, 300).split("\n").join("\n   ")}...`);
  } catch {
    console.log("❌ examples-summary.md NOT created");
  }

  // Check if .brain/ was created (this is what we're really testing!)
  console.log("\n🧠 Checking .brain/ usage (the real test!):\n");
  try {
    const brainFiles = await fs.readdir(".brain");
    console.log(`✅ .brain/ directory was created!`);
    console.log(`   Files: ${brainFiles.join(", ")}`);

    // Check for index.md
    if (brainFiles.includes("index.md")) {
      const indexContent = await fs.readFile(".brain/index.md", "utf-8");
      console.log(`\n   📄 .brain/index.md (${indexContent.length} chars):`);
      console.log(`   ${indexContent.slice(0, 400).split("\n").join("\n   ")}...`);
    }

    console.log("\n🎉 SUCCESS: Agent used .brain/ for persistent knowledge!");
  } catch {
    console.log("❌ .brain/ directory was NOT created");
    console.log("   The agent did not follow the brainRule.");
    console.log("   This could mean:");
    console.log("   - The brainRule isn't clear enough");
    console.log("   - The task was too simple to warrant brain usage");
    console.log("   - The model ignored the rule");
  }

  process.exit(result.success ? 0 : 1);
}

main().catch((err) => {
  console.error("Fatal error:", err);
  process.exit(1);
});
