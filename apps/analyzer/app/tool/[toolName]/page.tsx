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
      <>
        <TaskList tasks={allTasks} selectedTask={null} onSelectTask={(id) => router.push(`/trace/${id}`)} />
        <main className="pl-80">
          <div className="flex items-center justify-center h-screen">
            <div className="text-center">
              <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-9 mx-auto mb-4"></div>
              <div className="text-gray-11">Loading tool overview...</div>
            </div>
          </div>
        </main>
      </>
    );
  }

  if (error || !overview) {
    return (
      <>
        <TaskList tasks={allTasks} selectedTask={null} onSelectTask={(id) => router.push(`/trace/${id}`)} />
        <main className="pl-80">
          <div className="flex items-center justify-center h-screen">
            <div className="text-center max-w-md">
              <div className="text-red-9 text-5xl mb-4">⚠</div>
              <h1 className="text-xl font-bold text-gray-12 mb-2">Tool Not Found</h1>
              <p className="text-gray-11">{error || 'No data for this tool'}</p>
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
        selectedTask={null} 
        onSelectTask={(id) => router.push(`/trace/${id}`)} 
      />
      
      <main className="pl-80">
        <div className="min-h-screen">
          <ToolOverviewComponent overview={overview} />
        </div>
      </main>
    </>
  );
}
