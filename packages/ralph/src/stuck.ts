import type { Iteration, StuckContext, StuckReason } from "./types";

export interface StuckDetectorOptions {
  /** Number of iterations to check for patterns (default: 5) */
  windowSize?: number;
  /** Threshold for repetitive actions (default: 3) */
  threshold?: number;
}

/**
 * Detects when the agent is stuck in a loop.
 * Analyzes recent iterations for patterns indicating no progress.
 */
export class StuckDetector {
  private windowSize: number;
  private threshold: number;

  constructor(options: StuckDetectorOptions = {}) {
    this.windowSize = options.windowSize ?? 8;
    this.threshold = options.threshold ?? 5;
  }

  /**
   * Check if the agent is stuck based on recent iterations.
   * Returns a StuckContext if stuck, null otherwise.
   */
  check(iterations: Iteration[]): StuckContext | null {
    if (iterations.length < this.threshold) {
      return null;
    }

    const recent = iterations.slice(-this.windowSize);

    // Check for repetitive tool calls
    const repetitive = this.checkRepetitive(recent);
    if (repetitive) return repetitive;

    // Check for error loops
    const errorLoop = this.checkErrorLoop(recent);
    if (errorLoop) return errorLoop;

    // Check for oscillation (A→B→A→B)
    const oscillation = this.checkOscillation(recent);
    if (oscillation) return oscillation;

    // Check for no progress (no file changes, high token usage)
    const noProgress = this.checkNoProgress(recent);
    if (noProgress) return noProgress;

    return null;
  }

  /**
   * Check for repetitive tool calls.
   */
  private checkRepetitive(iterations: Iteration[]): StuckContext | null {
    if (iterations.length < this.threshold) return null;

    // Get tool call signatures for recent iterations
    const signatures = iterations.map((iter) =>
      iter.toolCalls.map((tc) => `${tc.name}:${JSON.stringify(tc.args)}`).join("|")
    );

    // Check if the last N signatures are identical
    const recentSigs = signatures.slice(-this.threshold);
    const allSame = recentSigs.every((sig) => sig === recentSigs[0]);

    if (allSame && recentSigs[0].length > 0) {
      return {
        reason: "repetitive",
        details: `Same tool calls repeated ${this.threshold} times: ${recentSigs[0].slice(0, 100)}...`,
        recentIterations: iterations.slice(-this.threshold),
      };
    }

    return null;
  }

  /**
   * Check for error loops - same error repeated.
   */
  private checkErrorLoop(iterations: Iteration[]): StuckContext | null {
    if (iterations.length < this.threshold) return null;

    // Look for error patterns in tool results
    const errors: string[] = [];

    for (const iter of iterations.slice(-this.threshold)) {
      for (const tc of iter.toolCalls) {
        const result = tc.result as Record<string, unknown>;
        if (result && typeof result === "object") {
          if (result.error || result.stderr || result.exitCode !== 0) {
            const errorStr =
              (result.error as string) ||
              (result.stderr as string) ||
              `exit code ${result.exitCode}`;
            errors.push(errorStr);
          }
        }
      }
    }

    if (errors.length >= this.threshold) {
      // Check if errors are similar
      const uniqueErrors = new Set(errors.map((e) => e.slice(0, 100)));
      if (uniqueErrors.size === 1) {
        return {
          reason: "error_loop",
          details: `Same error repeated ${errors.length} times`,
          recentIterations: iterations.slice(-this.threshold),
          repeatedError: errors[0],
        };
      }
    }

    return null;
  }

  /**
   * Check for oscillation patterns (doing and undoing).
   */
  private checkOscillation(iterations: Iteration[]): StuckContext | null {
    if (iterations.length < 4) return null;

    // Get tool names for pattern detection
    const toolNames = iterations
      .slice(-4)
      .map((iter) => iter.toolCalls.map((tc) => tc.name).join(","));

    // Check for A-B-A-B pattern
    if (
      toolNames.length === 4 &&
      toolNames[0] === toolNames[2] &&
      toolNames[1] === toolNames[3] &&
      toolNames[0] !== toolNames[1]
    ) {
      return {
        reason: "oscillation",
        details: `Oscillating between patterns: [${toolNames[0]}] and [${toolNames[1]}]`,
        recentIterations: iterations.slice(-4),
      };
    }

    return null;
  }

  /**
   * Check for no progress - high token usage but no file changes.
   * This is more lenient to allow for exploratory tasks.
   */
  private checkNoProgress(iterations: Iteration[]): StuckContext | null {
    // Need more iterations to detect no progress (at least 5)
    const minIterations = Math.max(this.threshold, 5);
    if (iterations.length < minIterations) return null;

    const recent = iterations.slice(-minIterations);

    // Count total tokens and file changes
    const totalTokens = recent.reduce(
      (sum, iter) => sum + iter.tokens.input + iter.tokens.output,
      0
    );
    const fileChanges = recent.reduce(
      (sum, iter) => sum + (iter.filesModified?.length ?? 0),
      0
    );

    // Count distinct tool calls - if there's variety, progress is being made
    const allToolCalls = recent.flatMap((iter) => iter.toolCalls.map((tc) => tc.name));
    const uniqueTools = new Set(allToolCalls);
    
    // If using variety of tools, probably making progress even without file writes
    if (uniqueTools.size >= 3) {
      return null;
    }

    // Much higher threshold - 150k tokens with no file changes over 5+ iterations
    if (totalTokens > 150000 && fileChanges === 0) {
      return {
        reason: "no_progress",
        details: `Used ${totalTokens} tokens in ${minIterations} iterations with no file changes`,
        recentIterations: recent,
      };
    }

    return null;
  }

  /**
   * Update threshold for stuck detection.
   */
  setThreshold(threshold: number): void {
    this.threshold = threshold;
  }
}
