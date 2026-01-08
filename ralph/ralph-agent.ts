#!/usr/bin/env tsx
/**
 * Ralph Loop Agent for building ralph-gpu
 *
 * This script orchestrates the autonomous AI agent that builds the ralph-gpu library.
 * It runs in phases and validates work using Playwright MCP.
 */

import "dotenv/config";
import { readFile } from "fs/promises";
import path from "path";
import {
  RalphLoopAgent,
  iterationCountIs,
  tokenCountIs,
  costIs,
} from "ralph-loop-agent";
import type { GenerateTextResult } from "ai";
import { createTools, type AllTools } from "./tools/index.js";
import { createVerification } from "./verification.js";
import { log, logSection, logUsageReport, logError } from "./utils/logger.js";

// Parse command-line arguments
const args = process.argv.slice(2);
const phaseArg = args.find((arg) => arg.startsWith("--phase="));
const specificPhase = phaseArg?.split("=")[1];

// Define phases
const PHASES = [
  {
    name: "monorepo-setup",
    displayName: "Monorepo Setup",
    promptFile: "./prompts/phase1.md",
    maxIterations: 10,
    maxTokens: 100_000,
    maxCost: 5.0,
  },
  {
    name: "core-implementation",
    displayName: "Core Library Implementation",
    promptFile: "./prompts/phase2.md",
    maxIterations: 30,
    maxTokens: 500_000,
    maxCost: 20.0,
  },
  {
    name: "examples-app",
    displayName: "Examples App",
    promptFile: "./prompts/phase3.md",
    maxIterations: 20,
    maxTokens: 300_000,
    maxCost: 15.0,
  },
] as const;

// Configuration
const PROJECT_ROOT = path.resolve(
  process.env.PROJECT_ROOT || path.join(process.cwd(), "..")
);
const AGENT_MODEL = process.env.AGENT_MODEL || "anthropic/claude-opus-4.5";

// Validate environment
if (
  !process.env.ANTHROPIC_API_KEY &&
  !process.env.OPENAI_API_KEY &&
  !process.env.AI_API_KEY
) {
  logError("Missing API key. Set ANTHROPIC_API_KEY or OPENAI_API_KEY");
  process.exit(1);
}

interface PhaseResult {
  success: boolean;
  iterations: number;
  completionReason: string;
  reason?: string;
  duration: number;
}

async function runPhase(phase: (typeof PHASES)[number]): Promise<PhaseResult> {
  const startTime = Date.now();

  logSection(`Phase: ${phase.displayName}`);
  log(`Loading prompt from ${phase.promptFile}`, "dim");

  // Load prompt
  let prompt: string;
  try {
    prompt = await readFile(
      path.join(process.cwd(), phase.promptFile),
      "utf-8"
    );
  } catch (error) {
    logError(`Failed to load prompt file: ${error}`);
    return {
      success: false,
      iterations: 0,
      completionReason: "error",
      reason: `Failed to load prompt: ${error}`,
      duration: Date.now() - startTime,
    };
  }

  // Create tools with project root
  const tools = createTools(PROJECT_ROOT);

  // Create agent
  const agent = new RalphLoopAgent<AllTools, never>({
    model: AGENT_MODEL as any,
    instructions: `You are an expert software engineer building the ralph-gpu WebGPU library.

## Key Reference Documents
- DX_EXAMPLES.md — Complete API specification and usage examples
- RALPH_IMPLEMENTATION_PLAN.md — Implementation plan and architecture

## Guidelines
1. **Read before writing** — Always read DX_EXAMPLES.md to understand the API
2. **Incremental changes** — Make one change at a time, verify it works
3. **Use editFile for small changes** — More token-efficient than full rewrites
4. **Run tests frequently** — After each significant change
5. **Follow the plan** — Reference the implementation plan for structure
6. **Verify compilation** — Always check TypeScript compiles before marking complete

## Working Directory
Project root: ${PROJECT_ROOT}

## Task Completion
When you've completed all requirements, use the markComplete tool with:
- A summary of what was accomplished
- List of all files created/modified`,

    tools,

    stopWhen: [
      iterationCountIs(phase.maxIterations),
      tokenCountIs(phase.maxTokens),
      costIs(phase.maxCost),
    ],

    verifyCompletion: createVerification(phase.name, PROJECT_ROOT),

    onIterationStart: ({ iteration }) => {
      logSection(`Iteration ${iteration}`);
    },

    onIterationEnd: ({
      iteration,
      duration,
      result,
    }: {
      iteration: number;
      duration: number;
      result: GenerateTextResult<AllTools, never>;
    }) => {
      log(`Duration: ${duration}ms`, "dim");
      log(`Steps: ${result.steps.length}`, "dim");

      // Show usage
      logUsageReport(result.usage, AGENT_MODEL, `Iteration ${iteration}`);
    },

    onContextSummarized: ({
      iteration,
      summarizedIterations,
      tokensSaved,
    }: {
      iteration: number;
      summarizedIterations: number;
      tokensSaved: number;
    }) => {
      log(
        `Context summarized: ${summarizedIterations} iterations compressed, ${tokensSaved} tokens saved`,
        "yellow"
      );
    },
  });

  // Run the loop
  log("Starting agent loop...", "blue");
  const result = await agent.loop({ prompt });

  const duration = Date.now() - startTime;

  logSection("Phase Complete");
  log(`Status: ${result.completionReason}`, "bright");
  log(`Iterations: ${result.iterations}`, "blue");
  log(`Duration: ${Math.round(duration / 1000)}s`, "blue");

  if (result.reason) {
    log(`\nReason: ${result.reason}`, "dim");
  }

  // Show final usage
  logUsageReport(result.totalUsage, AGENT_MODEL, "Total for Phase");

  return {
    success: result.completionReason === "verified",
    iterations: result.iterations,
    completionReason: result.completionReason,
    reason: result.reason,
    duration,
  };
}

async function main() {
  log("╔════════════════════════════════════════════════════════════╗", "cyan");
  log("║        Ralph GPU Builder - Autonomous Agent                ║", "cyan");
  log("╚════════════════════════════════════════════════════════════╝", "cyan");

  log(`\nProject Root: ${PROJECT_ROOT}`, "dim");
  log(`Model: ${AGENT_MODEL}`, "dim");

  // Determine which phases to run
  const phasesToRun = specificPhase
    ? PHASES.filter((p) => p.name === specificPhase)
    : PHASES;

  if (phasesToRun.length === 0) {
    logError(`Unknown phase: ${specificPhase}`);
    log("\nAvailable phases:", "bright");
    PHASES.forEach((p) => log(`  - ${p.name}`, "dim"));
    process.exit(1);
  }

  log(
    `\nRunning ${phasesToRun.length} phase${phasesToRun.length > 1 ? "s" : ""}:\n`,
    "bright"
  );
  phasesToRun.forEach((p) => log(`  ${p.displayName}`, "blue"));

  // Run phases
  const results: PhaseResult[] = [];

  for (const phase of phasesToRun) {
    log("\n" + "═".repeat(60) + "\n", "cyan");

    const result = await runPhase(phase);
    results.push(result);

    if (!result.success) {
      logError(
        `\nPhase "${phase.displayName}" failed with status: ${result.completionReason}`
      );
      if (result.reason) {
        log(`\nReason: ${result.reason}`, "yellow");
      }

      // Stop on failure
      log("\nStopping execution due to phase failure.", "red");
      process.exit(1);
    }

    log(`\n✓ Phase "${phase.displayName}" completed successfully\n`, "green");
  }

  // Summary
  log("\n" + "═".repeat(60) + "\n", "cyan");
  logSection("All Phases Complete! 🎉");

  log("\nSummary:", "bright");
  results.forEach((result, i) => {
    const phase = phasesToRun[i];
    log(
      `  ${phase.displayName}: ${result.iterations} iterations, ${Math.round(result.duration / 1000)}s`,
      "dim"
    );
  });

  const totalDuration = results.reduce((sum, r) => sum + r.duration, 0);
  const totalIterations = results.reduce((sum, r) => sum + r.iterations, 0);

  log(`\nTotal: ${totalIterations} iterations, ${Math.round(totalDuration / 1000)}s`, "bright");
  log("\n✨ ralph-gpu is ready to use!\n", "green");
}

// Run
main().catch((error) => {
  logError(`\nFatal error: ${error.message}`);
  console.error(error);
  process.exit(1);
});
