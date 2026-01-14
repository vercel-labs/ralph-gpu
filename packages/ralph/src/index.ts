/**
 * @ralph/agent-loop - Autonomous AI Agent Loop Library
 *
 * A minimal library for running AI agent loops. Handles the loop execution,
 * tool management, stuck detection, and completion checking.
 *
 * @example
 * ```typescript
 * import { LoopAgent } from '@ralph/agent-loop'
 * import { anthropic } from '@ai-sdk/anthropic'
 *
 * const agent = new LoopAgent({
 *   model: anthropic('claude-sonnet-4-20250514'),
 *   task: 'Fix all TypeScript errors in src/',
 *   limits: { maxIterations: 50, maxCost: 5.0 }
 * })
 *
 * const result = await agent.run()
 * console.log(result.success) // true
 * console.log(result.summary) // "Fixed 7 type errors..."
 * ```
 */

// Main class
export { LoopAgent } from "./agent";

// Default Rules
export {
  brainRule,
  trackProgressRule,
  visualCheckRule,
  testFirstRule,
  minimalChangesRule,
  explorationRule,
  gitCheckpointRule,
  debugRule,
  completionRule,
} from "./rules";

// Types
export type {
  // Config types
  LoopAgentConfig,
  LimitsConfig,
  CompletionConfig,
  StuckDetectionConfig,
  ContextFile,
  // Status and result types
  LoopStatus,
  LoopResult,
  LoopError,
  LoopEndReason,
  // Iteration types
  Iteration,
  ToolCall,
  TokenUsage,
  // Stuck detection types
  StuckContext,
  StuckReason,
  // Completion types
  CompletionContext,
  CompletionResult,
  // Internal types (for advanced usage)
  LoopState,
  ProcessInfo,
  BrowserInfo,
} from "./types";

// Default tools (for customization)
export {
  bashTools,
  createBashTools,
  createFallbackBashTools,
} from "./tools/bash";
export { processTools, createProcessTools } from "./tools/process";
export { browserTools, createBrowserTools } from "./tools/browser";
export { utilityTools, createUtilityTools } from "./tools/utility";
export { createDefaultTools } from "./tools";

// Managers (for advanced usage)
export { ProcessManager } from "./managers/process";
export { BrowserManager } from "./managers/browser";

// Stuck detection (for advanced usage)
export { StuckDetector } from "./stuck";

// Prompt building (for advanced usage)
export {
  buildSystemPrompt,
  buildNudgeMessage,
  formatIterationContext,
} from "./prompt";

// Logging utilities
export {
  setDebugMode,
  setLogLevel,
  isDebugMode,
  getLogLevel,
  toolLogger,
  loopLogger,
  type LogLevel,
} from "./logger";

// Trace mode
export {
  Tracer,
  createTracer,
  getTraceConfigFromEnv,
  normalizeTraceConfig,
  type TraceConfig,
  type TraceOptions,
  type TraceEvent,
  type TraceEventType,
  type TraceData,
} from "./tracer";
