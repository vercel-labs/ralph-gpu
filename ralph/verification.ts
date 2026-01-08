/**
 * Verification functions for each phase
 */

import type { VerifyCompletionContext } from "ralph-loop-agent";
import type { AllTools } from "./tools/index.js";
import { exec } from "child_process";
import { promisify } from "util";
import path from "path";
import { verifyExamplesVisually } from "./verification-visual.js";

const execAsync = promisify(exec);

type VerificationFunction = (
  ctx: VerifyCompletionContext<AllTools>
) => Promise<{ complete: boolean; reason?: string }>;

/**
 * Run a command and return whether it succeeded
 */
async function runCheck(
  command: string,
  cwd: string,
  errorMessage: string
): Promise<{ success: boolean; output: string }> {
  try {
    const { stdout, stderr } = await execAsync(command, {
      cwd,
      timeout: 120000,
      maxBuffer: 10 * 1024 * 1024,
    });

    return {
      success: true,
      output: stdout + stderr,
    };
  } catch (error: any) {
    return {
      success: false,
      output: `${errorMessage}\n${error.stdout || ""}\n${error.stderr || error.message}`,
    };
  }
}

/**
 * Phase 1: Monorepo Setup
 */
const verifyMonorepoSetup: VerificationFunction = async ({ result }) => {
  // Check if markComplete was called
  let taskComplete = false;
  for (const step of result.steps) {
    for (const toolResult of step.toolResults) {
      if (
        toolResult.toolName === "markComplete" &&
        typeof toolResult.output === "object" &&
        toolResult.output !== null &&
        "complete" in toolResult.output
      ) {
        taskComplete = true;
      }
    }
  }

  if (!taskComplete) {
    return {
      complete: false,
      reason:
        "Continue working on the task. Use markComplete when all setup is verified.",
    };
  }

  // If markComplete was called, verify the setup
  const projectRoot = process.env.PROJECT_ROOT || path.join(process.cwd(), "..");

  // Check pnpm install
  const install = await runCheck(
    "pnpm install",
    projectRoot,
    "pnpm install failed"
  );
  if (!install.success) {
    return {
      complete: false,
      reason: `pnpm install failed:\n${install.output.slice(0, 500)}`,
    };
  }

  // Check typecheck
  const typecheck = await runCheck(
    "pnpm typecheck",
    projectRoot,
    "Type-check failed"
  );
  if (!typecheck.success) {
    return {
      complete: false,
      reason: `Type-check failed:\n${typecheck.output.slice(0, 1000)}`,
    };
  }

  // Check build
  const build = await runCheck(
    "pnpm build",
    projectRoot,
    "Build failed"
  );
  if (!build.success) {
    return {
      complete: false,
      reason: `Build failed:\n${build.output.slice(0, 1000)}`,
    };
  }

  return {
    complete: true,
    reason: "Monorepo setup complete: install, typecheck, and build all pass",
  };
};

/**
 * Phase 2: Core Implementation
 */
const verifyCoreImplementation: VerificationFunction = async ({ result }) => {
  // Check if markComplete was called
  let taskComplete = false;
  for (const step of result.steps) {
    for (const toolResult of step.toolResults) {
      if (
        toolResult.toolName === "markComplete" &&
        typeof toolResult.output === "object" &&
        toolResult.output !== null &&
        "complete" in toolResult.output
      ) {
        taskComplete = true;
      }
    }
  }

  if (!taskComplete) {
    return {
      complete: false,
      reason:
        "Continue implementing the core library. Use markComplete when all modules are complete and tested.",
    };
  }

  const projectRoot = process.env.PROJECT_ROOT || path.join(process.cwd(), "..");

  // Type-check
  const typecheck = await runCheck(
    "pnpm typecheck",
    projectRoot,
    "Type-check failed"
  );
  if (!typecheck.success) {
    return {
      complete: false,
      reason: `Type errors found:\n${typecheck.output.slice(0, 1000)}`,
    };
  }

  // Tests
  const tests = await runCheck(
    "pnpm --filter=ralph-gpu test --run",
    projectRoot,
    "Tests failed"
  );
  if (!tests.success) {
    return {
      complete: false,
      reason: `Tests failed:\n${tests.output.slice(0, 1000)}`,
    };
  }

  // Build
  const build = await runCheck(
    "pnpm build",
    projectRoot,
    "Build failed"
  );
  if (!build.success) {
    return {
      complete: false,
      reason: `Build failed:\n${build.output.slice(0, 1000)}`,
    };
  }

  return {
    complete: true,
    reason:
      "Core library implementation complete: all types valid, tests pass, build succeeds",
  };
};

/**
 * Phase 3: Examples App
 */
const verifyExamplesApp: VerificationFunction = async (ctx) => {
  const { result } = ctx;
  
  // Check if markComplete was called
  let taskComplete = false;
  for (const step of result.steps) {
    for (const toolResult of step.toolResults) {
      if (
        toolResult.toolName === "markComplete" &&
        typeof toolResult.output === "object" &&
        toolResult.output !== null &&
        "complete" in toolResult.output
      ) {
        taskComplete = true;
      }
    }
  }

  if (!taskComplete) {
    return {
      complete: false,
      reason:
        "Continue building the examples. Use markComplete when all 6 examples are working.",
    };
  }

  const projectRoot = process.env.PROJECT_ROOT || path.join(process.cwd(), "..");

  // Type-check
  const typecheck = await runCheck(
    "pnpm typecheck",
    projectRoot,
    "Type-check failed"
  );
  if (!typecheck.success) {
    return {
      complete: false,
      reason: `Type errors in examples:\n${typecheck.output.slice(0, 1000)}`,
    };
  }

  // Build
  const build = await runCheck(
    "pnpm --filter=examples build",
    projectRoot,
    "Examples build failed"
  );
  if (!build.success) {
    return {
      complete: false,
      reason: `Examples build failed:\n${build.output.slice(0, 1000)}`,
    };
  }

  // Visual verification with Playwright MCP (if enabled)
  if (process.env.ENABLE_PLAYWRIGHT_MCP === "true") {
    console.log("\n🎨 Running visual verification with Playwright MCP...");
    const visualResult = await verifyExamplesVisually(ctx);
    
    if (!visualResult.complete) {
      return visualResult;
    }
  } else {
    console.log("\n⚠️  Playwright MCP not enabled - skipping visual verification");
    console.log("   Set ENABLE_PLAYWRIGHT_MCP=true to enable visual testing");
  }

  return {
    complete: true,
    reason:
      "Examples app complete: all pages created, types valid, build succeeds" +
      (process.env.ENABLE_PLAYWRIGHT_MCP === "true" ? ", visual tests pass" : ""),
  };
};

/**
 * Create verification function for a phase
 */
export function createVerification(
  phaseName: string,
  _projectRoot: string
): VerificationFunction {
  switch (phaseName) {
    case "monorepo-setup":
      return verifyMonorepoSetup;
    case "core-implementation":
      return verifyCoreImplementation;
    case "examples-app":
      return verifyExamplesApp;
    default:
      throw new Error(`Unknown phase: ${phaseName}`);
  }
}
