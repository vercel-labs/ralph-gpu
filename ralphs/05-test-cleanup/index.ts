/**
 * 05-test-cleanup: Test that processes are properly killed when agent completes
 *
 * This script tests the ProcessManager cleanup by:
 * 1. Starting a simple HTTP server on port 3333
 * 2. Immediately completing the task
 * 3. Verifying the server is no longer running after completion
 */

import "dotenv/config";
import { LoopAgent } from "@ralph/core";
import { execSync } from "child_process";

// Get configuration from environment
const AI_GATEWAY_API_KEY = process.env.AI_GATEWAY_API_KEY;
const AGENT_MODEL = process.env.AGENT_MODEL || "anthropic/claude-sonnet-4-20250514";

if (!AI_GATEWAY_API_KEY) {
  console.error("❌ Missing AI_GATEWAY_API_KEY in environment");
  process.exit(1);
}

console.log("🧪 Ralph Agent - Process Cleanup Test");
console.log("━".repeat(50));
console.log(`🧠 Model: ${AGENT_MODEL}`);
console.log("━".repeat(50));

const PORT = 3333;

const TASK = `
## Task: Test Process Cleanup

1. Start a simple HTTP server using the startProcess tool:
   - name: "test-server"
   - command: "npx http-server -p ${PORT}"
   - readyPattern: "Available on"

2. Once the server is running, call done() with summary "Server started on port ${PORT}, test complete"

This is a simple test - do NOT do anything else. Just start the server and call done().
`;

function isPortInUse(port: number): boolean {
  try {
    execSync(`lsof -i :${port}`, { stdio: "pipe" });
    return true;
  } catch {
    return false;
  }
}

async function main() {
  const startTime = Date.now();

  // Check if port is already in use
  if (isPortInUse(PORT)) {
    console.log(`\n⚠️ Port ${PORT} is already in use. Attempting to free it...`);
    try {
      execSync(`lsof -ti :${PORT} | xargs kill -9 2>/dev/null || true`, { stdio: "pipe" });
      await new Promise((r) => setTimeout(r, 1000));
    } catch {
      // Ignore errors
    }
    if (isPortInUse(PORT)) {
      console.error(`❌ Could not free port ${PORT}. Please free it manually.`);
      process.exit(1);
    }
  }

  console.log(`\n✅ Port ${PORT} is available`);

  const agent = new LoopAgent({
    model: AGENT_MODEL,
    task: TASK,
    debug: process.env.DEBUG === "true",
    limits: {
      maxIterations: 10,
      maxCost: 1.0,
      timeout: "2m",
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
    onError: (error) => {
      console.error(`\n❌ Error: ${error.message}`);
    },
  });

  console.log("\n🚀 Starting agent...\n");

  // Check port before running
  const portInUseBefore = isPortInUse(PORT);
  console.log(`📡 Port ${PORT} in use before agent: ${portInUseBefore}`);

  const result = await agent.run();

  console.log("\n" + "━".repeat(50));
  console.log("📊 Agent Results");
  console.log("━".repeat(50));
  console.log(`✅ Success: ${result.success}`);
  console.log(`📝 Reason: ${result.reason}`);
  console.log(`🔄 Iterations: ${result.iterations}`);
  console.log(`💰 Cost: $${result.cost.toFixed(4)}`);
  console.log(`⏱️ Duration: ${(result.elapsed / 1000).toFixed(1)}s`);
  console.log("━".repeat(50));

  // Wait a moment for processes to fully terminate
  await new Promise((r) => setTimeout(r, 2000));

  // Check port after agent completes
  const portInUseAfter = isPortInUse(PORT);
  console.log(`\n📡 Port ${PORT} in use after agent: ${portInUseAfter}`);

  if (portInUseAfter) {
    console.error("\n❌ TEST FAILED: Port is still in use after agent completed!");
    console.log("\n🔍 Processes on port:");
    try {
      const output = execSync(`lsof -i :${PORT}`, { encoding: "utf-8" });
      console.log(output);
    } catch {
      // Ignore
    }
    process.exit(1);
  } else {
    console.log("\n✅ TEST PASSED: Port was properly cleaned up!");
  }

  console.log("\n✨ Done!");
}

main().catch((error) => {
  console.error("Fatal error:", error);
  process.exit(1);
});
