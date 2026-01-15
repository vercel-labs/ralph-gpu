'use client';

import { useEffect, useState } from 'react';
import { ToolOverview as ToolOverviewComponent } from '@/components/ToolOverview';
import { TaskList } from '@/components/TaskList';
import type { ToolOverview, TaskTrace } from '@/lib/types';
import { useRouter } from 'next/navigation';

export default function ToolPage({ params }: { params: { toolName: string } }) {
  const router = useRouter();
  const [overview, setOverview] = useState<ToolOverview | null>(null);
  const [allTasks, setAllTasks] = useState<TaskTrace[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    // Load all tasks for sidebar
    fetch('/api/traces')
      .then(res => res.json())
      .then(data => {
        if (!data.error) {
          setAllTasks(data.tasks);
        }
      })
      .catch(err => console.error('Error loading tasks:', err));

    // Load tool overview
    fetch(`/api/tools/${params.toolName}`)
      .then(res => res.json())
      .then(data => {
        if (data.error) {
          setError(data.error);
        } else {
          setOverview(data);
        }
        setLoading(false);
      })
      .catch(err => {
        setError(String(err));
        setLoading(false);
      });
  }, [params.toolName]);

  if (loading) {
    return (
      <div className="flex h-screen">
        <TaskList tasks={allTasks} selectedTask={null} onSelectTask={(id) => router.push(`/trace/${id}`)} />
        <div className="flex-1 flex items-center justify-center">
          <div className="text-center">
            <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-accent-blue mx-auto mb-4"></div>
            <div className="text-foreground-secondary">Loading tool overview...</div>
          </div>
        </div>
      </div>
    );
  }

  if (error || !overview) {
    return (
      <div className="flex h-screen">
        <TaskList tasks={allTasks} selectedTask={null} onSelectTask={(id) => router.push(`/trace/${id}`)} />
        <div className="flex-1 flex items-center justify-center">
          <div className="text-center max-w-md">
            <div className="text-accent-red text-5xl mb-4">⚠</div>
            <h1 className="text-xl font-bold mb-2">Tool Not Found</h1>
            <p className="text-foreground-secondary">{error || 'No data for this tool'}</p>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="flex h-screen">
      <TaskList 
        tasks={allTasks} 
        selectedTask={null} 
        onSelectTask={(id) => router.push(`/trace/${id}`)} 
      />
      
      <div className="flex-1 overflow-y-auto scrollbar-thin">
        <ToolOverviewComponent overview={overview} />
      </div>
    </div>
  );
}
