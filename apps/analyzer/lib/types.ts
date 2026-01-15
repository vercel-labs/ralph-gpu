/**
 * TypeScript types for trace data analysis
 * Mirrors types from packages/ralph/src/tracer.ts
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
  | "context_analysis"
  | "agent_complete"
  | "agent_error"
  | "summary";

export interface TraceEvent {
  ts: string;
  type: TraceEventType;
  iter?: number;
  [key: string]: unknown;
}

export interface IterationEndEvent extends TraceEvent {
  type: "iteration_end";
  iter: number;
  duration: number;
  tokens: { input: number; output: number };
  cost: number;
  toolCallCount: number;
}

export interface ToolCallEvent extends TraceEvent {
  type: "tool_call";
  iter: number;
  tool: string;
  args: Record<string, unknown>;
}

export interface ToolResultEvent extends TraceEvent {
  type: "tool_result";
  iter: number;
  tool: string;
  durationMs: number;
  success: boolean;
  resultSummary?: string;
}

export interface ToolErrorEvent extends TraceEvent {
  type: "tool_error";
  iter: number;
  tool: string;
  durationMs: number;
  error: string;
}

export interface StuckDetectedEvent extends TraceEvent {
  type: "stuck_detected";
  iter: number;
  reason: string;
  details: string;
}

export interface SummaryEvent extends TraceEvent {
  type: "summary";
  totalIterations: number;
  totalToolCalls: number;
  totalTokens: { input: number; output: number };
  totalCost: number;
  elapsedMs: number;
  result: string;
  toolCallCounts: Record<string, number>;
  filesModified: string[];
  errorsEncountered: number;
  stuckCount: number;
}

export interface TaskTrace {
  taskId: string;
  taskName: string;
  traceFile: string;
  events: TraceEvent[];
  summary?: SummaryEvent;
  startTime?: string;
  endTime?: string;
}

export interface AggregatedStats {
  totalTasks: number;
  totalIterations: number;
  totalCost: number;
  totalToolCalls: number;
  totalErrors: number;
  totalStuck: number;
  toolUsage: Record<string, number>;
  costByTask: Array<{ taskName: string; cost: number }>;
  iterationsByTask: Array<{ taskName: string; iterations: number }>;
  
  // Completion metrics
  completionRate: number;
  completedTasks: number;
  incompleteTasks: number;
  avgIterationsToCompletion: number;
  avgTimeToCompletion: number;
  stuckFrequency: number;
  
  // Time trends
  costByDay: Array<{ date: string; cost: number; count: number }>;
  tokensByDay: Array<{ date: string; tokens: number }>;
  
  // Efficiency
  avgCostPerIteration: number;
  tokensPerDollar: number;
  mostEfficientTasks: Array<{ taskName: string; costPerIteration: number }>;
  leastEfficientTasks: Array<{ taskName: string; costPerIteration: number }>;
  costByTool: Array<{ tool: string; estimatedCost: number }>;
  
  // Recent activity
  recentExecutions: Array<{
    taskName: string;
    taskId: string;
    timestamp: string;
    completed: boolean;
    cost: number;
    duration: number;
  }>;
  
  // Problem spotlight
  highErrorTasks: Array<{ taskName: string; errorRate: number; errors: number; total: number }>;
  stuckTasks: Array<{ taskName: string; stuckCount: number }>;
  longestTasks: Array<{ taskName: string; duration: number }>;
  
  // Quick stats
  totalTimeSpent: number;
  avgTaskDuration: number;
  medianCost: number;
  mostUsedTool: string;
}

export interface ToolOverview {
  toolName: string;
  totalCalls: number;
  totalDuration: number;
  avgDuration: number;
  successCount: number;
  errorCount: number;
  usageByTask: Array<{
    taskId: string;
    taskName: string;
    count: number;
    avgDuration: number;
  }>;
}
