/**
 * Trace mode - captures detailed execution data for later analysis.
 *
 * Uses NDJSON (newline-delimited JSON) format for append-only writes.
 * Each event is written immediately as a single line.
 */

import { appendFileSync, writeFileSync, mkdirSync, existsSync } from "fs";
import { dirname, resolve } from "path";
import type { LoopResult, LoopState, TokenUsage } from "./types";

/**
 * Trace configuration options
 */
export interface TraceOptions {
  /** Output file path (default: .traces/trace-{timestamp}.ndjson) */
  outputPath?: string;
  /** Include full tool results (can be very large for screenshots) */
  includeToolResults?: boolean;
}

/**
 * Trace config can be:
 * - `true` for defaults
 * - `TraceOptions` object for custom options
 * - `false` or undefined to disable
 */
export type TraceConfig = boolean | TraceOptions;

/**
 * Event types for tracing
 */
export type TraceEventType =
  | "agent_start"
  | "agent_config"
  | "system_prompt"
  | "iteration_start"
  | "iteration_end"
  | "tool_call"
  | "tool_result"
  | "tool_error"
  | "model_response"
  | "message"
  | "stuck_detected"
  | "nudge_injected"
  | "context_summarized"
  | "agent_complete"
  | "agent_error"
  | "summary";

/**
 * A single trace event (one line in NDJSON)
 */
export interface TraceEvent {
  ts: string;           // ISO timestamp
  type: TraceEventType;
  iter?: number;        // Iteration number (if applicable)
  [key: string]: unknown; // Event-specific data
}

/**
 * Default trace options
 */
const DEFAULT_TRACE_OPTIONS: TraceOptions = {
  includeToolResults: false, // These can be huge (screenshots)
};

/**
 * Normalize trace config to options
 */
export function normalizeTraceConfig(config: TraceConfig | undefined): TraceOptions | null {
  if (!config) return null;
  if (config === true) return { ...DEFAULT_TRACE_OPTIONS };
  return { ...DEFAULT_TRACE_OPTIONS, ...config };
}

/**
 * Tracer class - writes events to NDJSON file in real-time
 * 
 * Each event is immediately appended as a JSON line.
 * Use `tail -f` to watch the trace in real-time.
 */
export class Tracer {
  private options: TraceOptions;
  private outputPath: string;
  private initialized = false;
  private toolCallCounts: Record<string, number> = {};
  private errorsEncountered = 0;
  private stuckCount = 0;

  constructor(
    agentId: string,
    task: string,
    options: TraceOptions = {}
  ) {
    this.options = { ...DEFAULT_TRACE_OPTIONS, ...options };

    const timestamp = new Date().toISOString().replace(/[:.]/g, "-");
    this.outputPath =
      options.outputPath || `.traces/trace-${timestamp}.ndjson`;
  }

  /**
   * Initialize the trace file (create directory, empty file)
   */
  private ensureInitialized(): void {
    if (this.initialized) return;

    // Ensure directory exists
    const dir = dirname(resolve(this.outputPath));
    if (!existsSync(dir)) {
      mkdirSync(dir, { recursive: true });
    }

    // Create empty file (or truncate existing)
    writeFileSync(this.outputPath, "", "utf-8");
    this.initialized = true;
  }

  /**
   * Append an event to the trace file immediately
   */
  private appendEvent(event: TraceEvent): void {
    this.ensureInitialized();
    
    // Write as single JSON line + newline
    const line = JSON.stringify(event) + "\n";
    appendFileSync(this.outputPath, line, "utf-8");
  }

  /**
   * Get the output path
   */
  getOutputPath(): string {
    return this.outputPath;
  }

  /**
   * Set configuration info (writes as event)
   */
  setConfig(config: {
    limits?: Record<string, unknown>;
    completion?: Record<string, unknown>;
    rules?: string[];
  }): void {
    this.appendEvent({
      ts: new Date().toISOString(),
      type: "agent_config",
      ...config,
    });
  }

  /**
   * Set system prompt (writes as event)
   */
  setSystemPrompt(prompt: string): void {
    this.appendEvent({
      ts: new Date().toISOString(),
      type: "system_prompt",
      prompt: prompt.length > 10000 
        ? prompt.slice(0, 10000) + "\n... [truncated]" 
        : prompt,
      length: prompt.length,
    });
  }

  /**
   * Record agent start
   */
  recordAgentStart(data: Record<string, unknown> = {}): void {
    this.appendEvent({
      ts: new Date().toISOString(),
      type: "agent_start",
      ...data,
    });
  }

  /**
   * Record iteration start
   */
  recordIterationStart(
    iteration: number,
    data: Record<string, unknown> = {}
  ): void {
    this.appendEvent({
      ts: new Date().toISOString(),
      type: "iteration_start",
      iter: iteration,
      ...data,
    });
  }

  /**
   * Record iteration end
   */
  recordIterationEnd(
    iteration: number,
    stats: {
      duration: number;
      tokens: { input: number; output: number };
      cost: number;
      toolCallCount: number;
    }
  ): void {
    this.appendEvent({
      ts: new Date().toISOString(),
      type: "iteration_end",
      iter: iteration,
      ...stats,
    });
  }

  /**
   * Record a tool call (before execution)
   */
  recordToolCall(
    iteration: number,
    toolName: string,
    args: Record<string, unknown>
  ): void {
    // Track counts
    this.toolCallCounts[toolName] = (this.toolCallCounts[toolName] || 0) + 1;

    // Sanitize args (remove very large values)
    const sanitizedArgs = this.sanitizeForTrace(args);

    this.appendEvent({
      ts: new Date().toISOString(),
      type: "tool_call",
      iter: iteration,
      tool: toolName,
      args: sanitizedArgs,
    });
  }

  /**
   * Record tool result
   */
  recordToolResult(
    iteration: number,
    toolName: string,
    result: unknown,
    durationMs: number
  ): void {
    const event: TraceEvent = {
      ts: new Date().toISOString(),
      type: "tool_result",
      iter: iteration,
      tool: toolName,
      durationMs,
      success: true,
    };

    if (this.options.includeToolResults) {
      event.result = this.sanitizeForTrace(result);
    } else {
      event.resultSummary = this.summarizeResult(result);
    }

    this.appendEvent(event);
  }

  /**
   * Record tool error
   */
  recordToolError(
    iteration: number,
    toolName: string,
    error: unknown,
    durationMs: number
  ): void {
    this.errorsEncountered++;

    const errorMessage = error instanceof Error ? error.message : String(error);
    const errorStack = error instanceof Error ? error.stack : undefined;

    this.appendEvent({
      ts: new Date().toISOString(),
      type: "tool_error",
      iter: iteration,
      tool: toolName,
      durationMs,
      error: errorMessage,
      stack: errorStack?.split("\n").slice(0, 5).join("\n"),
    });
  }

  /**
   * Record model response
   */
  recordModelResponse(
    iteration: number,
    response: {
      text?: string;
      toolCalls?: Array<{ name: string; args: unknown }>;
      tokens: { input: number; output: number };
    }
  ): void {
    this.appendEvent({
      ts: new Date().toISOString(),
      type: "model_response",
      iter: iteration,
      hasText: !!response.text,
      textLength: response.text?.length,
      textPreview: response.text?.slice(0, 500),
      toolCallCount: response.toolCalls?.length || 0,
      toolNames: response.toolCalls?.map((tc) => tc.name),
      tokens: response.tokens,
    });
  }

  /**
   * Record stuck detection
   */
  recordStuck(iteration: number, reason: string, details: string): void {
    this.stuckCount++;
    this.appendEvent({
      ts: new Date().toISOString(),
      type: "stuck_detected",
      iter: iteration,
      reason,
      details,
    });
  }

  /**
   * Record nudge injection
   */
  recordNudge(iteration: number, nudge: string): void {
    this.appendEvent({
      ts: new Date().toISOString(),
      type: "nudge_injected",
      iter: iteration,
      nudge: nudge.slice(0, 1000),
      nudgeLength: nudge.length,
    });
  }

  /**
   * Record context summarization
   */
  recordContextSummarized(
    iteration: number,
    originalTokens: number,
    newTokens: number
  ): void {
    this.appendEvent({
      ts: new Date().toISOString(),
      type: "context_summarized",
      iter: iteration,
      originalTokens,
      newTokens,
      reduction: originalTokens - newTokens,
      reductionPercent: Math.round(
        ((originalTokens - newTokens) / originalTokens) * 100
      ),
    });
  }

  /**
   * Record a message
   */
  recordMessage(role: string, content: string): void {
    this.appendEvent({
      ts: new Date().toISOString(),
      type: "message",
      role,
      contentLength: content.length,
      contentPreview: content.slice(0, 500),
    });
  }

  /**
   * Record agent completion - writes final summary
   */
  recordAgentComplete(result: LoopResult, state: LoopState): void {
    this.appendEvent({
      ts: new Date().toISOString(),
      type: "agent_complete",
      success: result.success,
      reason: result.reason,
      summary: result.summary,
    });

    // Write summary as final event
    this.appendEvent({
      ts: new Date().toISOString(),
      type: "summary",
      totalIterations: result.iterations,
      totalToolCalls: state.iterations.reduce(
        (sum, iter) => sum + iter.toolCalls.length,
        0
      ),
      totalTokens: result.tokens,
      totalCost: result.cost,
      elapsedMs: result.elapsed,
      result: result.reason,
      toolCallCounts: { ...this.toolCallCounts },
      filesModified: Array.from(state.filesModified),
      errorsEncountered: this.errorsEncountered,
      stuckCount: this.stuckCount,
    });
  }

  /**
   * Record agent error
   */
  recordAgentError(error: unknown): void {
    const errorMessage = error instanceof Error ? error.message : String(error);
    const errorStack = error instanceof Error ? error.stack : undefined;

    this.appendEvent({
      ts: new Date().toISOString(),
      type: "agent_error",
      error: errorMessage,
      stack: errorStack,
    });
  }

  /**
   * Write trace to file (no-op for NDJSON, events are written immediately)
   * Kept for API compatibility
   */
  write(): string {
    return this.outputPath;
  }

  /**
   * Sanitize data for trace (remove large binary data)
   */
  private sanitizeForTrace(value: unknown): unknown {
    if (value === null || value === undefined) {
      return value;
    }

    if (typeof value === "string") {
      // Detect and truncate base64 data
      if (value.length > 1000 && /^[A-Za-z0-9+/=]+$/.test(value.slice(0, 100))) {
        return `[base64 data, ${value.length} chars]`;
      }
      // Truncate very long strings
      if (value.length > 5000) {
        return value.slice(0, 5000) + `\n... [truncated, ${value.length} total chars]`;
      }
      return value;
    }

    if (Array.isArray(value)) {
      return value.map((v) => this.sanitizeForTrace(v));
    }

    if (typeof value === "object") {
      const obj = value as Record<string, unknown>;
      const sanitized: Record<string, unknown> = {};

      for (const [key, val] of Object.entries(obj)) {
        // Skip known large fields
        if (key === "data" && typeof val === "string" && val.length > 1000) {
          sanitized[key] = `[binary data, ${val.length} chars]`;
        } else if (key === "screenshot" || key === "image") {
          sanitized[key] = "[image data omitted]";
        } else {
          sanitized[key] = this.sanitizeForTrace(val);
        }
      }

      return sanitized;
    }

    return value;
  }

  /**
   * Create a brief summary of a result
   */
  private summarizeResult(result: unknown): string {
    if (result === null || result === undefined) {
      return "null";
    }

    if (typeof result === "string") {
      const lines = result.split("\n").length;
      return `string (${result.length} chars, ${lines} lines)`;
    }

    if (typeof result === "object") {
      const obj = result as Record<string, unknown>;

      // Special cases
      if ("stdout" in obj || "exitCode" in obj) {
        const exitCode = obj.exitCode ?? 0;
        const stdout = String(obj.stdout || "");
        return `bash (exit ${exitCode}, ${stdout.length} chars)`;
      }

      if ("type" in obj && obj.type === "content") {
        return "content with image";
      }

      const keys = Object.keys(obj);
      return `object {${keys.slice(0, 5).join(", ")}${keys.length > 5 ? "..." : ""}}`;
    }

    return typeof result;
  }
}

/**
 * Create a tracer instance
 */
export function createTracer(
  agentId: string,
  task: string,
  options?: TraceOptions
): Tracer {
  return new Tracer(agentId, task, options);
}

/**
 * Parse environment variable for trace config
 */
export function getTraceConfigFromEnv(): TraceConfig | undefined {
  const traceEnabled = process.env.RALPH_TRACE === "true" || process.env.TRACE === "true";
  const tracePath = process.env.RALPH_TRACE_PATH || process.env.TRACE_PATH;

  if (!traceEnabled && !tracePath) {
    return undefined;
  }

  if (tracePath) {
    return { outputPath: tracePath };
  }

  return true;
}

// Legacy export for compatibility
export type TraceData = TraceEvent[];
