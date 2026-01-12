import type { LanguageModel, Tool } from "ai";
import type { TraceConfig } from "./tracer";

/**
 * Context file to include in the system prompt
 */
export interface ContextFile {
  /** Filename (shown in prompt) */
  name: string;
  /** Content */
  content: string;
}

/**
 * Completion check result
 */
export interface CompletionResult {
  /** Whether the task is complete */
  complete: boolean;
  /** Summary of completion (if complete) */
  summary?: string;
}

/**
 * Context passed to completion check function
 */
export interface CompletionContext {
  /** Current iteration */
  iteration: number;
  /** Total cost so far */
  cost: number;
  /** Total tokens used */
  tokens: TokenUsage;
  /** Recent iterations */
  recentIterations: Iteration[];
  /** Files modified in this session */
  filesModified: string[];
}

/**
 * Token usage tracking
 */
export interface TokenUsage {
  input: number;
  output: number;
  total: number;
}

/**
 * Tool call record
 */
export interface ToolCall {
  /** Tool name */
  name: string;
  /** Tool arguments */
  args: Record<string, unknown>;
  /** Tool result */
  result: unknown;
  /** Duration in ms */
  duration: number;
  /** Timestamp */
  timestamp: Date;
}

/**
 * Single iteration record
 */
export interface Iteration {
  /** Iteration number (0-indexed) */
  index: number;
  /** Timestamp */
  timestamp: Date;
  /** Duration in ms */
  duration: number;
  /** Tokens used */
  tokens: { input: number; output: number };
  /** Cost (USD) */
  cost: number;
  /** Tool calls made */
  toolCalls: ToolCall[];
  /** Files modified (if fs tools used) */
  filesModified?: string[];
  /** Model response text (if any) */
  responseText?: string;
  /** Any nudge message injected */
  nudgeMessage?: string;
}

/**
 * Why the agent thinks it's stuck
 */
export type StuckReason =
  | "repetitive"
  | "error_loop"
  | "oscillation"
  | "no_progress"
  | "browser_loop";

/**
 * Context passed to onStuck callback
 */
export interface StuckContext {
  /** Why we think it's stuck */
  reason: StuckReason;
  /** Details about the stuck state */
  details: string;
  /** Recent iterations */
  recentIterations: Iteration[];
  /** Repeated error if applicable */
  repeatedError?: string;
}

/**
 * Loop status - current state of the agent
 */
export interface LoopStatus {
  /** Run ID */
  id: string;
  /** Current state */
  state:
    | "idle"
    | "running"
    | "stuck"
    | "completing"
    | "done"
    | "failed"
    | "stopped";
  /** Current iteration (0-indexed) */
  iteration: number;
  /** Total cost so far (USD) */
  cost: number;
  /** Tokens used */
  tokens: TokenUsage;
  /** Elapsed time in ms */
  elapsed: number;
  /** Last few actions */
  lastActions: string[];
}

/**
 * Why the loop ended
 */
export type LoopEndReason =
  | "completed"
  | "max_iterations"
  | "max_cost"
  | "timeout"
  | "stopped"
  | "error";

/**
 * Loop result - final outcome
 */
export interface LoopResult {
  /** Task completed successfully */
  success: boolean;
  /** Why the loop ended */
  reason: LoopEndReason;
  /** Total iterations */
  iterations: number;
  /** Total cost (USD) */
  cost: number;
  /** Total tokens */
  tokens: TokenUsage;
  /** Elapsed time in ms */
  elapsed: number;
  /** Summary (from done tool or completion check) */
  summary: string;
  /** Error if failed */
  error?: LoopError;
}

/**
 * Loop error
 */
export interface LoopError {
  /** Error code */
  code: string;
  /** Error message */
  message: string;
  /** Original error */
  cause?: Error;
}

/**
 * Completion strategy configuration
 */
export interface CompletionConfig {
  /** Type of completion check */
  type: "file" | "tool" | "command" | "custom";
  /** For 'file': path to check */
  file?: string;
  /** For 'command': command that should exit 0 */
  command?: string;
  /** For 'custom': completion check function */
  check?: (ctx: CompletionContext) => Promise<CompletionResult>;
}

/**
 * Limits configuration
 */
export interface LimitsConfig {
  /** Max iterations (default: 50) */
  maxIterations?: number;
  /** Max cost in USD (default: 10.00) */
  maxCost?: number;
  /** Max time in ms or string like '2h' (default: '4h') */
  timeout?: number | string;
  /** Max tokens per iteration (default: 100000) */
  maxTokensPerIteration?: number;
}

/**
 * Stuck detection configuration
 */
export interface StuckDetectionConfig {
  /** Iterations without progress before stuck (default: 3) */
  threshold?: number;
  /** Disable stuck detection */
  disabled?: boolean;
}

/**
 * Main agent configuration
 */
export interface LoopAgentConfig {
  // === REQUIRED ===

  /**
   * AI model from Vercel AI SDK
   * @example anthropic('claude-sonnet-4-20250514')
   * @example gateway('openai/gpt-4o')
   */
  model: LanguageModel;

  /**
   * The task description
   */
  task: string;

  // === TOOLS ===

  /**
   * Enable default tools (bash, browser, process, utility)
   * @default true
   */
  defaultTools?: boolean;

  /**
   * Custom tools to add (merged with defaults unless defaultTools: false)
   */
  tools?: Record<string, Tool>;

  // === LIMITS ===

  /**
   * Execution limits
   */
  limits?: LimitsConfig;

  // === COMPLETION ===

  /**
   * How to detect task completion
   * @default { type: 'tool' } - model calls done() tool
   */
  completion?: CompletionConfig;

  // === PROMPT ===

  /**
   * Additional context to include in system prompt
   */
  context?: string | ContextFile[];

  /**
   * Rules and behavioral guidelines for the agent
   * Use default rules like brainRule, visualCheckRule, etc.
   * @example [brainRule, visualCheckRule, trackProgressRule]
   */
  rules?: string[];

  /**
   * Override default system prompt entirely
   */
  systemPrompt?: string;

  // === CALLBACKS ===

  /** Called after each iteration */
  onUpdate?: (status: LoopStatus) => void;

  /** Called when stuck detected - return string to nudge */
  onStuck?: (ctx: StuckContext) => Promise<string | null>;

  /** Called on completion */
  onComplete?: (result: LoopResult) => void;

  /** Called on error */
  onError?: (error: LoopError) => void;

  // === STUCK DETECTION ===

  /**
   * Stuck detection configuration
   */
  stuckDetection?: StuckDetectionConfig;

  // === LOGGING ===

  /**
   * Enable debug mode for verbose logging
   * Shows detailed tool call arguments and results
   * @default false
   */
  debug?: boolean;

  /**
   * Enable tool call logging
   * Shows each tool call with success/failure status
   * @default true
   */
  enableToolLogging?: boolean;

  // === TRACE MODE ===

  /**
   * Trace mode - captures detailed execution data for later analysis.
   * 
   * - `trace: true` - Enable with defaults
   * - `trace: { outputPath: "..." }` - Enable with custom options
   * - `trace: false` or omit - Disabled
   * 
   * Can also enable via env var `RALPH_TRACE=true`
   * 
   * @example
   * ```typescript
   * // Simple
   * const agent = new LoopAgent({ task: "...", trace: true });
   * 
   * // With options
   * const agent = new LoopAgent({
   *   task: "...",
   *   trace: {
   *     outputPath: ".traces/my-trace.ndjson",
   *     includeToolResults: true,
   *   }
   * });
   * ```
   */
  trace?: TraceConfig;
}

/**
 * Internal state for the loop
 */
export interface LoopState {
  id: string;
  state: LoopStatus["state"];
  iteration: number;
  cost: number;
  tokens: TokenUsage;
  startTime: number;
  iterations: Iteration[];
  filesModified: Set<string>;
  summary: string;
  pendingNudge: string | null;
  shouldStop: boolean;
}

/**
 * Process info for managed processes
 */
export interface ProcessInfo {
  name: string;
  command: string;
  pid: number;
  startTime: Date;
  cwd?: string;
}

/**
 * Browser info for managed browsers
 */
export interface BrowserInfo {
  name: string;
  url: string;
  viewport: { width: number; height: number };
}
