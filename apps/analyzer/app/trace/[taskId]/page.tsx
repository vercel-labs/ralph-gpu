'use client';

import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import { TaskList } from '@/components/TaskList';
import { Timeline } from '@/components/Timeline';
import { CostChart } from '@/components/CostChart';
import { ToolUsage } from '@/components/ToolUsage';
import { ErrorPatterns } from '@/components/ErrorPatterns';
import type { TaskTrace } from '@/lib/types';
import { ArrowLeft } from 'lucide-react';

export default function TraceDetailPage({ params }: { params: { taskId: string } }) {
  const router = useRouter();
  const [allTasks, setAllTasks] = useState<TaskTrace[]>([]);
  const [currentTask, setCurrentTask] = useState<TaskTrace | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    // Load all tasks for sidebar
    fetch('/api/traces')
      .then(res => res.json())
      .then(data => {
        if (data.error) {
          setError(data.error);
        } else {
          setAllTasks(data.tasks);
        }
      })
      .catch(err => setError(String(err)));

    // Load current task
    fetch(`/api/traces/${params.taskId}`)
      .then(res => res.json())
      .then(data => {
        if (data.error) {
          setError(data.error);
        } else {
          setCurrentTask(data);
        }
        setLoading(false);
      })
      .catch(err => {
        setError(String(err));
        setLoading(false);
      });
  }, [params.taskId]);

  if (loading) {
    return (
      <>
        <TaskList tasks={allTasks} selectedTask={params.taskId} onSelectTask={(id) => router.push(`/trace/${id}`)} />
        <main className="pl-80">
          <div className="flex items-center justify-center h-screen">
            <div className="text-center">
              <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-9 mx-auto mb-4"></div>
              <div className="text-gray-11">Loading trace...</div>
            </div>
          </div>
        </main>
      </>
    );
  }

  if (error || !currentTask) {
    return (
      <>
        <TaskList tasks={allTasks} selectedTask={params.taskId} onSelectTask={(id) => router.push(`/trace/${id}`)} />
        <main className="pl-80">
          <div className="flex items-center justify-center h-screen">
            <div className="text-center max-w-md">
              <div className="text-red-9 text-5xl mb-4">⚠</div>
              <h1 className="text-xl font-bold text-gray-12 mb-2">Error Loading Trace</h1>
              <p className="text-gray-11">{error || 'Task not found'}</p>
            </div>
          </div>
        </main>
      </>
    );
  }

  return (
    <>
      <TaskList 
        tasks={allTasks} 
        selectedTask={params.taskId} 
        onSelectTask={(id) => router.push(`/trace/${id}`)} 
      />
      
      <main className="pl-80">
        <div className="min-h-screen">
          <div className="max-w-7xl mx-auto px-6 py-16 lg:px-12 lg:py-20 space-y-8">
            <div>
              <button
                onClick={() => router.push('/')}
                className="flex items-center gap-2 text-blue-9 hover:text-blue-10 mb-4 transition-colors"
              >
                <ArrowLeft className="w-4 h-4" />
                Back to Overview
              </button>
              
              <h1 className="text-3xl font-bold text-gray-12 mb-2">{currentTask.taskName}</h1>
              {currentTask.startTime && (
                <p className="text-sm text-gray-9 mb-2">
                  Run: {new Date(currentTask.startTime).toLocaleString()}
                </p>
              )}
              {currentTask.summary && (
                <div className="flex gap-6 text-sm text-gray-11">
                  <span>{currentTask.summary.totalIterations} iterations</span>
                  <span>${currentTask.summary.totalCost.toFixed(4)} total cost</span>
                  <span>{currentTask.summary.totalToolCalls} tool calls</span>
                  <span>{(currentTask.summary.elapsedMs / 1000).toFixed(1)}s elapsed</span>
                </div>
              )}
            </div>

            <div className="grid grid-cols-1 gap-8">
              <CostChart events={currentTask.events} />
              <ToolUsage events={currentTask.events} />
              <ErrorPatterns events={currentTask.events} />
              <Timeline events={currentTask.events} />
            </div>
          </div>
        </div>
      </main>
    </>
  );
}
