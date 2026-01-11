import { generateText, stepCountIs, type LanguageModel, type Tool } from "ai";
import type {
  Iteration,
  LoopState,
  LoopResult,
  LoopStatus,
  ToolCall,
  CompletionConfig,
  CompletionContext,
  LimitsConfig,
  StuckContext,
} from "./types";
import { StuckDetector } from "./stuck";
import { buildNudgeMessage, formatIterationContext } from "./prompt";
import { loopLogger, isDebugMode } from "./logger";
import ms from "ms";

/**
 * Maximum context size before we start pruning (in estimated tokens).
 * Most models have 100k-200k context, we want to stay well under.
 */
const MAX_CONTEXT_TOKENS = 80000;

/**
 * Rough estimate of tokens in a string (4 chars per token average).
 */
function estimateTokens(str: string): number {
  return Math.ceil(str.length / 4);
}

/**
 * Summarize messages when context is too large.
 * Note: Tool results are already sanitized in tools/index.ts to remove
 * large binary data (screenshots, base64) before they enter the message history.
 */
function summarizeMessages(messages: Message[], systemPrompt: string): Message[] {
  const systemTokens = estimateTokens(systemPrompt);
  let totalTokens = systemTokens;
  
  // Calculate tokens for each message
  const messageTokens = messages.map(m => ({
    message: m,
    tokens: estimateTokens(JSON.stringify(m))
  }));
  
  totalTokens += messageTokens.reduce((sum, m) => sum + m.tokens, 0);
  
  if (totalTokens <= MAX_CONTEXT_TOKENS) {
    return messages; // No need to summarize
  }
  
  loopLogger.debug(`Context too large (${totalTokens} tokens), summarizing...`);
  
  // Keep recent messages, summarize older ones
  const keepRecent = 6; // Keep last 6 messages intact
  const recentMessages = messages.slice(-keepRecent);
  const olderMessages = messages.slice(0, -keepRecent);
  
  if (olderMessages.length === 0) {
    // Even recent messages are too big - truncate individual messages
    return recentMessages.map(m => {
      const content = typeof m.content === "string" ? m.content : JSON.stringify(m.content);
      if (content.length > 5000) {
        return {
          ...m,
          content: content.slice(0, 3000) + "\n... [message truncated]"
        };
      }
      return m;
    });
  }
  
  // Create summary of older messages
  const summary = createMessageSummary(olderMessages);
  
  return [
    { role: "user" as const, content: summary },
    ...recentMessages
  ];
}

/**
 * Create a brief summary of messages.
 */
function createMessageSummary(messages: Message[]): string {
  const toolsUsed = new Set<string>();
  const filesRead = new Set<string>();
  const filesWritten = new Set<string>();
  
  for (const msg of messages) {
    const content = typeof msg.content === "string" ? msg.content : JSON.stringify(msg.content);
    
    // Extract tool mentions (rough heuristic)
    const toolMatches = content.match(/\b(bash|readFile|writeFile|openBrowser|screenshot|think)\b/g);
    if (toolMatches) {
      toolMatches.forEach(t => toolsUsed.add(t));
    }
    
    // Extract file paths
    const pathMatches = content.match(/(?:path['":\s]+)?(['"]([\w\/\.-]+\.(tsx?|jsx?|json|md|css))['"'])/g);
    if (pathMatches) {
      pathMatches.slice(0, 10).forEach(p => {
        const cleaned = p.replace(/['"]/g, "").replace(/^path:\s*/, "");
        if (cleaned.includes(".")) {
          filesRead.add(cleaned);
        }
      });
    }
  }
  
  const parts: string[] = [
    "[Earlier conversation summarized]",
    "",
    `Previous iterations: ${messages.length} messages`,
  ];
  
  if (toolsUsed.size > 0) {
    parts.push(`Tools used: ${Array.from(toolsUsed).join(", ")}`);
  }
  
  if (filesRead.size > 0) {
    parts.push(`Files explored: ${Array.from(filesRead).slice(0, 10).join(", ")}`);
  }
  
  parts.push("", "Continue with the task. Recent context follows.");
  
  return parts.join("\n");
}

/**
 * Default limits for the loop.
 */
const DEFAULT_LIMITS: Required<LimitsConfig> = {
  maxIterations: 50,
  maxCost: 10.0,
  timeout: "4h",
  maxTokensPerIteration: 100000,
};

/**
 * Rough cost estimation per token (varies by model).
 * These are conservative estimates.
 */
const COST_PER_INPUT_TOKEN = 0.000003; // $3 per 1M input tokens
const COST_PER_OUTPUT_TOKEN = 0.000015; // $15 per 1M output tokens

/**
 * Message type for conversation history
 */
interface Message {
  role: "user" | "assistant" | "system";
  content: string;
}

/**
 * Options for running the loop.
 */
export interface LoopOptions {
  model: LanguageModel;
  systemPrompt: string;
  tools: Record<string, Tool>;
  limits?: LimitsConfig;
  completion?: CompletionConfig;
  stuckDetection?: {
    threshold?: number;
    disabled?: boolean;
  };
  onUpdate?: (status: LoopStatus) => void;
  onStuck?: (ctx: StuckContext) => Promise<string | null>;
  onComplete?: (result: LoopResult) => void;
  onError?: (error: { code: string; message: string; cause?: Error }) => void;
  onDoneSignal?: () => void;
}

/**
 * Core loop execution.
 */
export async function runLoop(
  state: LoopState,
  options: LoopOptions
): Promise<LoopResult> {
  const {
    model,
    systemPrompt,
    tools,
    limits = {},
    completion = { type: "tool" },
    stuckDetection = {},
    onUpdate,
    onStuck,
    onError,
  } = options;

  // Merge limits with defaults
  const effectiveLimits = {
    ...DEFAULT_LIMITS,
    ...limits,
  };

  // Parse timeout
  const timeoutMs =
    typeof effectiveLimits.timeout === "string"
      ? ms(effectiveLimits.timeout)
      : effectiveLimits.timeout;

  // Initialize stuck detector
  const stuckDetector = stuckDetection.disabled
    ? null
    : new StuckDetector({ threshold: stuckDetection.threshold });

  // Message history for the conversation
  const messages: Message[] = [];

  // Track if done tool was called
  let doneSignaled = false;

  // Wrap tools to detect done signal
  const wrappedTools: Record<string, Tool> = {};
  for (const [name, toolDef] of Object.entries(tools)) {
    if (name === "done") {
      wrappedTools[name] = {
        ...toolDef,
        execute: async (args: Record<string, unknown>, execOptions: unknown) => {
          doneSignaled = true;
          const summary = (args as { summary?: string }).summary;
          if (summary) {
            state.summary = summary;
          }
          // Call original execute if it exists
          if (toolDef.execute) {
            return toolDef.execute(
              args,
              execOptions as { toolCallId: string; messages: Message[] }
            );
          }
          return { completed: true };
        },
      } as Tool;
    } else {
      wrappedTools[name] = toolDef;
    }
  }

  // Main loop
  while (!state.shouldStop) {
    const iterationStart = Date.now();
    state.state = "running";

    // Log iteration start
    loopLogger.iterationStart(state.iteration);

    // Check limits
    if (state.iteration >= effectiveLimits.maxIterations) {
      loopLogger.complete("max_iterations");
      return createResult(state, "max_iterations");
    }

    if (state.cost >= effectiveLimits.maxCost) {
      loopLogger.complete("max_cost");
      return createResult(state, "max_cost");
    }

    const elapsed = Date.now() - state.startTime;
    if (elapsed >= timeoutMs) {
      loopLogger.complete("timeout");
      return createResult(state, "timeout");
    }

    // Build user message for this iteration
    const userMessage = buildIterationMessage(
      state,
      effectiveLimits.maxIterations,
      effectiveLimits.maxCost
    );

    if (userMessage) {
      messages.push({ role: "user", content: userMessage });
    }

    // Summarize messages if context is getting too large
    const contextMessages = summarizeMessages(messages, systemPrompt);
    
    if (isDebugMode()) {
      const originalTokens = messages.reduce((sum, m) => sum + estimateTokens(JSON.stringify(m)), 0);
      const newTokens = contextMessages.reduce((sum, m) => sum + estimateTokens(JSON.stringify(m)), 0);
      loopLogger.debug("Calling model...", { 
        messageCount: contextMessages.length,
        originalMessages: messages.length,
        estimatedTokens: newTokens,
        toolCount: Object.keys(wrappedTools).length 
      });
      if (newTokens < originalTokens) {
        loopLogger.debug(`Context reduced from ~${originalTokens} to ~${newTokens} tokens`);
      }
    }

    try {
      // Call the model with stopWhen to allow multiple steps
      const result = await generateText({
        model,
        system: systemPrompt,
        messages: contextMessages,
        tools: wrappedTools,
        stopWhen: stepCountIs(10), // Allow up to 10 tool calls per iteration
      });

      // Track tokens and cost - AI SDK v6 uses inputTokens/outputTokens
      const usage = result.usage;
      const iterationTokens = {
        input: usage?.inputTokens ?? 0,
        output: usage?.outputTokens ?? 0,
      };

      const iterationCost = estimateCost(iterationTokens);

      state.tokens.input += iterationTokens.input;
      state.tokens.output += iterationTokens.output;
      state.tokens.total = state.tokens.input + state.tokens.output;
      state.cost += iterationCost;

      // Extract tool calls from result
      const toolCalls = extractToolCalls(result);

      // Track file modifications from writeFile calls
      const filesModified = extractFilesModified(toolCalls);
      filesModified.forEach((f) => state.filesModified.add(f));

      // Create iteration record
      const iteration: Iteration = {
        index: state.iteration,
        timestamp: new Date(),
        duration: Date.now() - iterationStart,
        tokens: iterationTokens,
        cost: iterationCost,
        toolCalls,
        filesModified: filesModified.length > 0 ? filesModified : undefined,
        responseText: result.text || undefined,
        nudgeMessage: state.pendingNudge || undefined,
      };

      state.iterations.push(iteration);
      state.pendingNudge = null;

      // Log iteration end
      loopLogger.iterationEnd(state.iteration, {
        durationMs: iteration.duration,
        tokens: iterationTokens.input + iterationTokens.output,
        cost: iterationCost,
        toolCalls: toolCalls.length,
      });

      // Add assistant response to message history
      if (result.text) {
        messages.push({ role: "assistant", content: result.text });
        if (isDebugMode()) {
          loopLogger.debug("Model response", result.text.slice(0, 200));
        }
      }

      // Check for done signal
      if (doneSignaled) {
        state.state = "completing";
        loopLogger.complete("completed", state.summary);
        return createResult(state, "completed");
      }

      // Check completion based on strategy
      const isComplete = await checkCompletion(completion, state);
      if (isComplete) {
        state.state = "completing";
        loopLogger.complete("completed", state.summary);
        return createResult(state, "completed");
      }

      // Check if stuck
      if (stuckDetector) {
        const stuckContext = stuckDetector.check(state.iterations);
        if (stuckContext) {
          state.state = "stuck";
          loopLogger.stuck(stuckContext.reason);

          if (onStuck) {
            const nudge = await onStuck(stuckContext);
            if (nudge) {
              state.pendingNudge = nudge;
              if (isDebugMode()) {
                loopLogger.debug("Nudge injected", nudge);
              }
            }
          }
        }
      }

      // Emit update
      if (onUpdate) {
        onUpdate(createStatus(state));
      }

      state.iteration++;
    } catch (error) {
      const err = error as Error;
      const loopError = {
        code: "ITERATION_ERROR",
        message: err.message,
        cause: err,
      };

      loopLogger.error(`Iteration ${state.iteration} failed: ${err.message}`, err);

      if (onError) {
        onError(loopError);
      }

      // Don't fail immediately, try to continue
      state.iteration++;

      // But if we have too many consecutive errors, stop
      const recentErrors = state.iterations
        .slice(-3)
        .filter(
          (iter) =>
            iter.toolCalls.length === 0 && iter.tokens.input === 0
        );

      if (recentErrors.length >= 3) {
        state.state = "failed";
        loopLogger.error("Too many consecutive errors, stopping");
        return {
          ...createResult(state, "error"),
          error: loopError,
        };
      }
    }
  }

  // Loop was stopped
  state.state = "stopped";
  return createResult(state, "stopped");
}

/**
 * Build the user message for an iteration.
 */
function buildIterationMessage(
  state: LoopState,
  maxIterations: number,
  maxCost: number
): string | null {
  const parts: string[] = [];

  // Add iteration context
  parts.push(
    formatIterationContext(state.iteration, maxIterations, state.cost, maxCost)
  );

  // Add nudge if pending
  if (state.pendingNudge) {
    parts.push(buildNudgeMessage(state.pendingNudge));
  }

  // First iteration doesn't need additional context
  if (state.iteration === 0) {
    return parts.length > 0 ? parts.join("\n\n") : "Begin.";
  }

  return parts.length > 0 ? parts.join("\n\n") : null;
}

/**
 * Extract tool calls from generateText result.
 */
function extractToolCalls(result: unknown): ToolCall[] {
  const calls: ToolCall[] = [];
  const res = result as {
    toolCalls?: Array<{ toolName: string; args?: unknown }>;
    steps?: Array<{
      toolCalls?: Array<{ toolName: string; args?: unknown }>;
      toolResults?: Array<{ result?: unknown }>;
    }>;
  };

  // Check steps for tool calls (multi-step responses)
  if (res.steps) {
    for (const step of res.steps) {
      if (step.toolCalls) {
        for (let i = 0; i < step.toolCalls.length; i++) {
          const tc = step.toolCalls[i];
          const tr = step.toolResults?.[i];
          calls.push({
            name: tc.toolName,
            args: (tc.args ?? {}) as Record<string, unknown>,
            result: tr?.result ?? null,
            duration: 0, // Not tracked per-tool
            timestamp: new Date(),
          });
        }
      }
    }
  }

  // Also check top-level toolCalls
  if (res.toolCalls && calls.length === 0) {
    for (const tc of res.toolCalls) {
      calls.push({
        name: tc.toolName,
        args: (tc.args ?? {}) as Record<string, unknown>,
        result: null,
        duration: 0,
        timestamp: new Date(),
      });
    }
  }

  return calls;
}

/**
 * Extract files modified from tool calls.
 */
function extractFilesModified(toolCalls: ToolCall[]): string[] {
  const files: string[] = [];

  for (const tc of toolCalls) {
    if (tc.name === "writeFile" && tc.args.path) {
      files.push(tc.args.path as string);
    }
  }

  return files;
}

/**
 * Check if task is complete based on completion strategy.
 */
async function checkCompletion(
  config: CompletionConfig,
  state: LoopState
): Promise<boolean> {
  switch (config.type) {
    case "tool":
      // Handled by done signal
      return false;

    case "file":
      if (!config.file) return false;
      try {
        const fs = await import("fs/promises");
        await fs.access(config.file);
        // File exists, read it for summary
        const content = await fs.readFile(config.file, "utf-8");
        state.summary = content.slice(0, 500);
        return true;
      } catch {
        return false;
      }

    case "command":
      if (!config.command) return false;
      try {
        const { exec } = await import("child_process");
        const { promisify } = await import("util");
        const execAsync = promisify(exec);
        await execAsync(config.command);
        state.summary = `Command "${config.command}" succeeded`;
        return true;
      } catch {
        return false;
      }

    case "custom":
      if (!config.check) return false;
      const ctx: CompletionContext = {
        iteration: state.iteration,
        cost: state.cost,
        tokens: { ...state.tokens },
        recentIterations: state.iterations.slice(-5),
        filesModified: Array.from(state.filesModified),
      };
      const result = await config.check(ctx);
      if (result.complete && result.summary) {
        state.summary = result.summary;
      }
      return result.complete;

    default:
      return false;
  }
}

/**
 * Estimate cost from token usage.
 */
function estimateCost(tokens: { input: number; output: number }): number {
  return (
    tokens.input * COST_PER_INPUT_TOKEN +
    tokens.output * COST_PER_OUTPUT_TOKEN
  );
}

/**
 * Create a LoopStatus from state.
 */
function createStatus(state: LoopState): LoopStatus {
  const lastActions = state.iterations
    .slice(-5)
    .flatMap((iter) => iter.toolCalls.map((tc) => tc.name));

  return {
    id: state.id,
    state: state.state,
    iteration: state.iteration,
    cost: state.cost,
    tokens: { ...state.tokens },
    elapsed: Date.now() - state.startTime,
    lastActions,
  };
}

/**
 * Create final result.
 */
function createResult(
  state: LoopState,
  reason: LoopResult["reason"]
): LoopResult {
  const success = reason === "completed";

  return {
    success,
    reason,
    iterations: state.iteration,
    cost: state.cost,
    tokens: { ...state.tokens },
    elapsed: Date.now() - state.startTime,
    summary: state.summary || (success ? "Task completed" : `Task ended: ${reason}`),
  };
}
