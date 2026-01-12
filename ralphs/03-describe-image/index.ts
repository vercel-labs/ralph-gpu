/**
 * Ralph Test Script: Describe Image
 *
 * Simple test to verify that the AI can:
 * 1. Open a browser
 * 2. See the screenshot (image handling)
 * 3. Describe what it sees
 * 4. Write the description to a file
 */

import "dotenv/config";
import { LoopAgent, setDebugMode } from "@ralph/agent-loop";

// Get config from environment
const PROJECT_ROOT = process.env.PROJECT_ROOT || process.cwd();
const AGENT_MODEL = process.env.AGENT_MODEL || "anthropic/claude-sonnet-4";

// Check for debug mode
const DEBUG =
  process.env.DEBUG === "true" || process.argv.includes("--debug");
if (DEBUG) {
  setDebugMode(true);
}

console.log("\n🐱 Ralph Agent - Image Description Test");
console.log("━".repeat(55));
console.log(`📁 Working dir: ${process.cwd()}`);
console.log(`🧠 Model: ${AGENT_MODEL}`);
if (DEBUG) {
  console.log(`🐛 Debug: enabled`);
}
console.log("━".repeat(55));

const TASK = `
# Task: Describe an Image

## Objective
Open a browser, visit an image URL, and describe what you see.

## Steps
1. Use openBrowser to navigate to: https://placekittens.com/400/400
2. Look at the screenshot that is returned - you should see a cat/kitten image
3. Describe what you see in detail (colors, pose, features)
4. Write your description to a file called "cat-description.txt" using writeFile

## Important
- The screenshot is included in the openBrowser result as an image
- You should be able to see and analyze the image
- If you can see the cat, describe it in detail
- If you cannot see the image, explain what you see instead

## Success Criteria
- File "cat-description.txt" exists with a description of a cat
- Call the done tool when finished
`;

async function main() {
  const agent = new LoopAgent({
    task: TASK,
    model: AGENT_MODEL,
    projectRoot: PROJECT_ROOT,
    debug: DEBUG,
    limits: {
      maxIterations: 5,
      maxCost: 1.0,
    },
  });

  console.log("\n🚀 Starting agent...\n");

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

  process.exit(result.success ? 0 : 1);
}

main().catch((err) => {
  console.error("Fatal error:", err);
  process.exit(1);
});
