'use client';

import { TaskTrace } from '@/lib/types';

interface TaskListProps {
  tasks: TaskTrace[];
  selectedTask: string | null;
  onSelectTask: (taskId: string) => void;
}

function formatRunTime(startTime: string | undefined): string {
  if (!startTime) return '';
  const date = new Date(startTime);
  return date.toLocaleString('en-US', {
    month: 'short',
    day: 'numeric',
    hour: '2-digit',
    minute: '2-digit',
  });
}

export function TaskList({ tasks, selectedTask, onSelectTask }: TaskListProps) {
  // Group tasks by taskName to show run count
  const taskRunCounts = tasks.reduce((acc, task) => {
    acc[task.taskName] = (acc[task.taskName] || 0) + 1;
    return acc;
  }, {} as Record<string, number>);

  return (
    <div className="w-80 bg-background-secondary border-r border-foreground-muted/20 h-screen overflow-y-auto scrollbar-thin">
      <div className="p-6 border-b border-foreground-muted/20">
        <h1 className="text-2xl font-bold">Ralph Analyzer</h1>
        <p className="text-sm text-foreground-secondary mt-1">
          {tasks.length} trace{tasks.length !== 1 ? 's' : ''} found
        </p>
      </div>
      
      <div className="p-4 space-y-2">
        {tasks.map((task) => {
          const hasMultipleRuns = taskRunCounts[task.taskName] > 1;
          
          return (
            <button
              key={task.taskId}
              onClick={() => onSelectTask(task.taskId)}
              className={`w-full text-left p-3 rounded-lg transition-colors ${
                selectedTask === task.taskId
                  ? 'bg-accent-blue text-white'
                  : 'bg-background-tertiary hover:bg-background-tertiary/70'
              }`}
            >
              <div className="font-mono text-sm font-semibold truncate">
                {task.taskName}
              </div>
              {hasMultipleRuns && task.startTime && (
                <div className={`text-xs mt-1 ${
                  selectedTask === task.taskId ? 'text-white/70' : 'text-foreground-muted'
                }`}>
                  {formatRunTime(task.startTime)}
                </div>
              )}
              {task.summary && (
                <div className={`mt-2 flex gap-3 text-xs ${
                  selectedTask === task.taskId ? 'text-white/80' : 'text-foreground-secondary'
                }`}>
                  <span>{task.summary.totalIterations} iter</span>
                  <span>${task.summary.totalCost.toFixed(4)}</span>
                  <span>{task.summary.totalToolCalls} tools</span>
                </div>
              )}
              {task.summary?.errorsEncountered > 0 && (
                <div className={`mt-1 text-xs ${
                  selectedTask === task.taskId ? 'text-red-300' : 'text-accent-red'
                }`}>
                  {task.summary.errorsEncountered} error{task.summary.errorsEncountered !== 1 ? 's' : ''}
                </div>
              )}
            </button>
          );
        })}
        
        {tasks.length === 0 && (
          <div className="text-center py-8 text-foreground-secondary">
            <p>No traces found</p>
            <p className="text-xs mt-2">
              Run ralph tasks with <code className="text-accent-blue">trace: true</code>
            </p>
          </div>
        )}
      </div>
    </div>
  );
}
