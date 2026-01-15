import { readFileSync, existsSync } from 'fs';
import { join } from 'path';
import { glob } from 'glob';
import type { TraceEvent, TaskTrace, AggregatedStats, SummaryEvent, ToolOverview, ToolCallEvent, ToolResultEvent, ToolErrorEvent } from './types';

/**
 * Scans ralphs/[task]/.traces/[file].ndjson files and parses trace data
 */
export async function loadAllTraces(): Promise<TaskTrace[]> {
  const rootDir = join(process.cwd(), '../../ralphs');
  
  // Find all trace files
  const traceFiles = await glob('*/.traces/*.ndjson', {
    cwd: rootDir,
    absolute: true,
  });

  const tasks: TaskTrace[] = [];

  for (const traceFile of traceFiles) {
    try {
      const events = parseNDJSON(traceFile);
      
      if (events.length === 0) continue;

      // Extract task info from path: ralphs/54-events-profiler-tests/.traces/trace-2026-01-14T01-00-00-000Z.ndjson
      const pathParts = traceFile.split('/');
      const ralphsIndex = pathParts.findIndex(p => p === 'ralphs');
      const taskName = ralphsIndex !== -1 ? pathParts[ralphsIndex + 1] : 'unknown';
      
      // Extract trace filename for unique ID (e.g., "trace-2026-01-14T01-00-00-000Z")
      const traceFileName = pathParts[pathParts.length - 1].replace('.ndjson', '');
      // Create unique taskId by combining task name and trace filename
      const taskId = `${taskName}__${traceFileName}`;
      
      const summary = events.find(e => e.type === 'summary') as SummaryEvent | undefined;
      const startTime = events[0]?.ts;
      const endTime = events[events.length - 1]?.ts;

      tasks.push({
        taskId,
        taskName,
        traceFile,
        events,
        summary,
        startTime,
        endTime,
      });
    } catch (error) {
      console.error(`Error loading trace ${traceFile}:`, error);
    }
  }

  // Sort by start time (latest first)
  return tasks.sort((a, b) => {
    const timeA = a.startTime ? new Date(a.startTime).getTime() : 0;
    const timeB = b.startTime ? new Date(b.startTime).getTime() : 0;
    return timeB - timeA; // Latest first
  });
}

/**
 * Parse NDJSON file line by line
 */
function parseNDJSON(filePath: string): TraceEvent[] {
  if (!existsSync(filePath)) {
    return [];
  }

  const content = readFileSync(filePath, 'utf-8');
  const lines = content.split('\n').filter(line => line.trim());
  
  const events: TraceEvent[] = [];
  for (const line of lines) {
    try {
      events.push(JSON.parse(line));
    } catch (error) {
      console.error(`Error parsing line in ${filePath}:`, error);
    }
  }
  
  return events;
}

/**
 * Load a single task trace by taskId
 */
export async function loadTaskTrace(taskId: string): Promise<TaskTrace | null> {
  const tasks = await loadAllTraces();
  return tasks.find(t => t.taskId === taskId) || null;
}

/**
 * Calculate aggregated statistics across all tasks
 */
export function calculateAggregatedStats(tasks: TaskTrace[]): AggregatedStats {
  let totalIterations = 0;
  let totalCost = 0;
  let totalToolCalls = 0;
  let totalErrors = 0;
  let totalStuck = 0;
  const toolUsage: Record<string, number> = {};
  const costByTask: Array<{ taskName: string; cost: number }> = [];
  const iterationsByTask: Array<{ taskName: string; iterations: number }> = [];

  // Completion metrics
  let completedTasks = 0;
  let totalIterationsForCompleted = 0;
  let totalTimeForCompleted = 0;

  // Time trends
  const costByDay = new Map<string, { cost: number; count: number }>();
  const tokensByDay = new Map<string, number>();

  // Efficiency
  const taskEfficiency: Array<{ taskName: string; costPerIteration: number }> = [];

  // Recent activity
  const recentExecutions: Array<any> = [];

  // Problem tracking
  const taskErrors = new Map<string, { errors: number; total: number }>();
  const taskStuck = new Map<string, number>();
  const taskDurations: Array<{ taskName: string; duration: number }> = [];

  for (const task of tasks) {
    const summary = task.summary;
    
    if (summary) {
      totalIterations += summary.totalIterations || 0;
      totalCost += summary.totalCost || 0;
      totalToolCalls += summary.totalToolCalls || 0;
      totalErrors += summary.errorsEncountered || 0;
      totalStuck += summary.stuckCount || 0;

      costByTask.push({
        taskName: task.taskName,
        cost: summary.totalCost || 0,
      });

      iterationsByTask.push({
        taskName: task.taskName,
        iterations: summary.totalIterations || 0,
      });

      // Aggregate tool usage
      if (summary.toolCallCounts) {
        for (const [tool, count] of Object.entries(summary.toolCallCounts)) {
          toolUsage[tool] = (toolUsage[tool] || 0) + (count as number);
        }
      }

      // Completion metrics
      const completed = task.events.some(e => e.type === 'tool_call' && (e as any).tool === 'done');
      if (completed) {
        completedTasks++;
        totalIterationsForCompleted += summary.totalIterations || 0;
        totalTimeForCompleted += summary.elapsedMs || 0;
      }

      // Time trends
      if (task.startTime) {
        const date = new Date(task.startTime).toISOString().split('T')[0];
        const existing = costByDay.get(date) || { cost: 0, count: 0 };
        costByDay.set(date, {
          cost: existing.cost + (summary.totalCost || 0),
          count: existing.count + 1,
        });

        const totalTokens = (summary.totalTokens?.input || 0) + (summary.totalTokens?.output || 0);
        tokensByDay.set(date, (tokensByDay.get(date) || 0) + totalTokens);
      }

      // Efficiency
      if (summary.totalIterations > 0) {
        taskEfficiency.push({
          taskName: task.taskName,
          costPerIteration: (summary.totalCost || 0) / summary.totalIterations,
        });
      }

      // Recent activity
      if (task.endTime) {
        recentExecutions.push({
          taskName: task.taskName,
          taskId: task.taskId,
          timestamp: task.endTime,
          completed,
          cost: summary.totalCost || 0,
          duration: summary.elapsedMs || 0,
        });
      }

      // Problem tracking
      if (summary.errorsEncountered > 0) {
        taskErrors.set(task.taskName, {
          errors: summary.errorsEncountered,
          total: summary.totalToolCalls || 0,
        });
      }

      if (summary.stuckCount > 0) {
        taskStuck.set(task.taskName, (taskStuck.get(task.taskName) || 0) + summary.stuckCount);
      }

      taskDurations.push({
        taskName: task.taskName,
        duration: summary.elapsedMs || 0,
      });
    }
  }

  // Calculate derived metrics
  const completionRate = tasks.length > 0 ? (completedTasks / tasks.length) * 100 : 0;
  const avgIterationsToCompletion = completedTasks > 0 ? totalIterationsForCompleted / completedTasks : 0;
  const avgTimeToCompletion = completedTasks > 0 ? totalTimeForCompleted / completedTasks : 0;
  const stuckFrequency = totalIterations > 0 ? (totalStuck / totalIterations) * 100 : 0;

  const sortedEfficiency = taskEfficiency.sort((a, b) => a.costPerIteration - b.costPerIteration);
  const mostEfficientTasks = sortedEfficiency.slice(0, 5);
  const leastEfficientTasks = sortedEfficiency.slice(-5).reverse();

  const sortedRecent = recentExecutions.sort((a, b) => 
    new Date(b.timestamp).getTime() - new Date(a.timestamp).getTime()
  ).slice(0, 10);

  const highErrorTasks = Array.from(taskErrors.entries())
    .map(([taskName, data]) => ({
      taskName,
      errorRate: (data.errors / data.total) * 100,
      errors: data.errors,
      total: data.total,
    }))
    .sort((a, b) => b.errorRate - a.errorRate)
    .slice(0, 5);

  const stuckTasksArray = Array.from(taskStuck.entries())
    .map(([taskName, stuckCount]) => ({ taskName, stuckCount }))
    .sort((a, b) => b.stuckCount - a.stuckCount)
    .slice(0, 5);

  const longestTasks = taskDurations
    .sort((a, b) => b.duration - a.duration)
    .slice(0, 5);

  const costs = costByTask.map(t => t.cost).sort((a, b) => a - b);
  const medianCost = costs.length > 0 ? costs[Math.floor(costs.length / 2)] : 0;

  const mostUsedTool = Object.entries(toolUsage).sort((a, b) => b[1] - a[1])[0]?.[0] || 'none';

  const totalTimeSpent = taskDurations.reduce((sum, t) => sum + t.duration, 0);
  const avgTaskDuration = tasks.length > 0 ? totalTimeSpent / tasks.length : 0;

  const totalTokens = (tasks.reduce((sum, t) => {
    const s = t.summary;
    return sum + (s?.totalTokens?.input || 0) + (s?.totalTokens?.output || 0);
  }, 0));
  const tokensPerDollar = totalCost > 0 ? totalTokens / totalCost : 0;

  // Cost by tool (estimated based on tool usage proportion)
  const costByTool = Object.entries(toolUsage)
    .map(([tool, count]) => ({
      tool,
      estimatedCost: (count / totalToolCalls) * totalCost,
    }))
    .sort((a, b) => b.estimatedCost - a.estimatedCost);

  return {
    totalTasks: tasks.length,
    totalIterations,
    totalCost,
    totalToolCalls,
    totalErrors,
    totalStuck,
    toolUsage,
    costByTask: costByTask.sort((a, b) => b.cost - a.cost),
    iterationsByTask: iterationsByTask.sort((a, b) => b.iterations - a.iterations),
    
    // Completion metrics
    completionRate,
    completedTasks,
    incompleteTasks: tasks.length - completedTasks,
    avgIterationsToCompletion,
    avgTimeToCompletion,
    stuckFrequency,
    
    // Time trends
    costByDay: Array.from(costByDay.entries())
      .map(([date, data]) => ({ date, cost: data.cost, count: data.count }))
      .sort((a, b) => a.date.localeCompare(b.date)),
    tokensByDay: Array.from(tokensByDay.entries())
      .map(([date, tokens]) => ({ date, tokens }))
      .sort((a, b) => a.date.localeCompare(b.date)),
    
    // Efficiency
    avgCostPerIteration: totalIterations > 0 ? totalCost / totalIterations : 0,
    tokensPerDollar,
    mostEfficientTasks,
    leastEfficientTasks,
    costByTool,
    
    // Recent activity
    recentExecutions: sortedRecent,
    
    // Problem spotlight
    highErrorTasks,
    stuckTasks: stuckTasksArray,
    longestTasks,
    
    // Quick stats
    totalTimeSpent,
    avgTaskDuration,
    medianCost,
    mostUsedTool,
  };
}

/**
 * Get overview data for a specific tool across all traces
 */
export function getToolOverview(tasks: TaskTrace[], toolName: string): ToolOverview {
  let totalCalls = 0;
  let totalDuration = 0;
  let successCount = 0;
  let errorCount = 0;
  const usageByTask: Map<string, { taskId: string; taskName: string; count: number; totalDuration: number }> = new Map();

  for (const task of tasks) {
    const toolCalls = task.events.filter(e => 
      e.type === 'tool_call' && (e as ToolCallEvent).tool === toolName
    ) as ToolCallEvent[];
    
    const toolResults = task.events.filter(e => 
      e.type === 'tool_result' && (e as ToolResultEvent).tool === toolName
    ) as ToolResultEvent[];
    
    const toolErrors = task.events.filter(e => 
      e.type === 'tool_error' && (e as ToolErrorEvent).tool === toolName
    ) as ToolErrorEvent[];

    if (toolCalls.length > 0) {
      totalCalls += toolCalls.length;
      successCount += toolResults.length;
      errorCount += toolErrors.length;

      const taskDuration = toolResults.reduce((sum, r) => sum + r.durationMs, 0) +
                          toolErrors.reduce((sum, e) => sum + e.durationMs, 0);
      totalDuration += taskDuration;

      usageByTask.set(task.taskId, {
        taskId: task.taskId,
        taskName: task.taskName,
        count: toolCalls.length,
        totalDuration: taskDuration,
      });
    }
  }

  const usageArray = Array.from(usageByTask.values())
    .map(item => ({
      ...item,
      avgDuration: item.count > 0 ? item.totalDuration / item.count : 0,
    }))
    .sort((a, b) => b.count - a.count);

  return {
    toolName,
    totalCalls,
    totalDuration,
    avgDuration: totalCalls > 0 ? totalDuration / totalCalls : 0,
    successCount,
    errorCount,
    usageByTask: usageArray,
  };
}
