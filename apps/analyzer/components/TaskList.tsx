'use client';

import Link from 'next/link';
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
    <aside className="fixed inset-y-0 left-0 z-40 w-80 bg-black border-r border-gray-4">
      <div className="h-full flex flex-col">
        {/* Header */}
        <div className="h-16 px-6 flex items-center border-b border-gray-4">
          <Link href="/" className="flex items-center gap-3 group">
            {/* Vercel Triangle Logo */}
            <svg className="w-5 h-5" viewBox="0 0 76 65" fill="white">
              <path d="M37.5274 0L75.0548 65H0L37.5274 0Z" />
            </svg>
            <span className="text-[15px] font-semibold text-gray-12">Ralph Analyzer</span>
          </Link>
        </div>

        {/* Traces Section */}
        <div className="flex-1 overflow-y-auto py-6 px-3">
          <div>
            <h4 className="px-3 mb-2 text-xs font-medium text-gray-9 uppercase tracking-wider">
              Traces ({tasks.length})
            </h4>
            <ul className="space-y-0.5">
              {tasks.map((task) => {
                const hasMultipleRuns = taskRunCounts[task.taskName] > 1;
                const isActive = selectedTask === task.taskId;
                
                return (
                  <li key={task.taskId}>
                    <button
                      onClick={() => onSelectTask(task.taskId)}
                      className={`w-full text-left px-3 py-2.5 rounded-md transition-colors ${
                        isActive
                          ? 'bg-gray-2 text-gray-12'
                          : 'text-gray-10 hover:bg-gray-1 hover:text-gray-12'
                      }`}
                    >
                      <div className="font-mono text-sm font-medium truncate">
                        {task.taskName}
                      </div>
                      {hasMultipleRuns && task.startTime && (
                        <div className={`text-xs mt-1 ${
                          isActive ? 'text-gray-11' : 'text-gray-9'
                        }`}>
                          {formatRunTime(task.startTime)}
                        </div>
                      )}
                      {task.summary && (
                        <div className={`mt-2 flex gap-3 text-xs ${
                          isActive ? 'text-gray-11' : 'text-gray-9'
                        }`}>
                          <span>{task.summary.totalIterations} iter</span>
                          <span>${task.summary.totalCost.toFixed(4)}</span>
                          <span>{task.summary.totalToolCalls} tools</span>
                        </div>
                      )}
                      {(task.summary?.errorsEncountered ?? 0) > 0 && (
                        <div className={`mt-1 text-xs ${
                          isActive ? 'text-red-10' : 'text-red-9'
                        }`}>
                          {task.summary!.errorsEncountered} error{task.summary!.errorsEncountered !== 1 ? 's' : ''}
                        </div>
                      )}
                    </button>
                  </li>
                );
              })}
              
              {tasks.length === 0 && (
                <li className="px-3 py-8 text-center text-gray-9">
                  <p>No traces found</p>
                  <p className="text-xs mt-2">
                    Run ralph tasks with <code className="text-blue-9 font-mono text-xs">trace: true</code>
                  </p>
                </li>
              )}
            </ul>
          </div>
        </div>

        {/* Footer */}
        <div className="p-4 border-t border-gray-4">
          <a
            href="https://github.com/yourusername/ralph"
            target="_blank"
            rel="noopener noreferrer"
            className="flex items-center gap-2 px-3 py-2 text-gray-10 hover:text-gray-12 transition-colors text-sm rounded-md hover:bg-gray-1"
          >
            <svg className="w-4 h-4" fill="currentColor" viewBox="0 0 24 24">
              <path d="M12 0c-6.626 0-12 5.373-12 12 0 5.302 3.438 9.8 8.207 11.387.599.111.793-.261.793-.577v-2.234c-3.338.726-4.033-1.416-4.033-1.416-.546-1.387-1.333-1.756-1.333-1.756-1.089-.745.083-.729.083-.729 1.205.084 1.839 1.237 1.839 1.237 1.07 1.834 2.807 1.304 3.492.997.107-.775.418-1.305.762-1.604-2.665-.305-5.467-1.334-5.467-5.931 0-1.311.469-2.381 1.236-3.221-.124-.303-.535-1.524.117-3.176 0 0 1.008-.322 3.301 1.23.957-.266 1.983-.399 3.003-.404 1.02.005 2.047.138 3.006.404 2.291-1.552 3.297-1.23 3.297-1.23.653 1.653.242 2.874.118 3.176.77.84 1.235 1.911 1.235 3.221 0 4.609-2.807 5.624-5.479 5.921.43.372.823 1.102.823 2.222v3.293c0 .319.192.694.801.576 4.765-1.589 8.199-6.086 8.199-11.386 0-6.627-5.373-12-12-12z" />
            </svg>
            <span>View on GitHub</span>
          </a>
        </div>
      </div>
    </aside>
  );
}
