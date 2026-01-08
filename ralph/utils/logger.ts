/**
 * Logging utilities
 */

import chalk from "chalk";
import type { LanguageModelUsage } from "ai";

type Color = "red" | "green" | "yellow" | "blue" | "magenta" | "cyan" | "white" | "dim" | "bright";

const colorMap = {
  red: chalk.red,
  green: chalk.green,
  yellow: chalk.yellow,
  blue: chalk.blue,
  magenta: chalk.magenta,
  cyan: chalk.cyan,
  white: chalk.white,
  dim: chalk.dim,
  bright: chalk.bold,
};

export function log(message: string, color?: Color) {
  if (color && colorMap[color]) {
    console.log(colorMap[color](message));
  } else {
    console.log(message);
  }
}

export function logError(message: string) {
  console.error(chalk.red.bold(message));
}

export function logSection(title: string) {
  console.log("\n" + chalk.cyan.bold(`━━━ ${title} ━━━`) + "\n");
}

/**
 * Log token usage report
 */
export function logUsageReport(
  usage: LanguageModelUsage,
  model: string,
  label: string = "Usage"
) {
  console.log(chalk.dim(`\n${label}:`));
  console.log(
    chalk.dim(
      `  Input:  ${usage.inputTokens.toLocaleString()} tokens`
    )
  );
  console.log(
    chalk.dim(
      `  Output: ${usage.outputTokens.toLocaleString()} tokens`
    )
  );
  console.log(
    chalk.dim(
      `  Total:  ${usage.totalTokens.toLocaleString()} tokens`
    )
  );

  // Show cache info if available
  if (usage.inputTokenDetails) {
    const { cacheReadTokens, cacheWriteTokens } = usage.inputTokenDetails;
    if (cacheReadTokens || cacheWriteTokens) {
      console.log(
        chalk.dim(
          `  Cache:  ${cacheReadTokens?.toLocaleString() || 0} read, ${cacheWriteTokens?.toLocaleString() || 0} write`
        )
      );
    }
  }

  // Estimate cost (rough estimates)
  const cost = estimateCost(usage, model);
  if (cost > 0) {
    console.log(chalk.dim(`  Cost:   ~$${cost.toFixed(4)}`));
  }
}

/**
 * Estimate cost based on model and usage
 */
function estimateCost(usage: LanguageModelUsage, model: string): number {
  // Rough pricing (as of early 2025, subject to change)
  const pricing: Record<string, { input: number; output: number }> = {
    "anthropic/claude-opus-4.5": { input: 15.0 / 1_000_000, output: 75.0 / 1_000_000 },
    "anthropic/claude-opus-4": { input: 15.0 / 1_000_000, output: 75.0 / 1_000_000 },
    "anthropic/claude-sonnet-4": { input: 3.0 / 1_000_000, output: 15.0 / 1_000_000 },
    "openai/gpt-4": { input: 30.0 / 1_000_000, output: 60.0 / 1_000_000 },
    "openai/gpt-4-turbo": { input: 10.0 / 1_000_000, output: 30.0 / 1_000_000 },
  };

  const rates = pricing[model];
  if (!rates) {
    return 0;
  }

  const inputCost = usage.inputTokens * rates.input;
  const outputCost = usage.outputTokens * rates.output;

  return inputCost + outputCost;
}
