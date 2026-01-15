'use client';

import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import { TaskList } from '@/components/TaskList';
import { OverviewStats } from '@/components/OverviewStats';
import { ExecutionTimeline } from '@/components/ExecutionTimeline';
import { QuickStats } from '@/components/QuickStats';
import { CompletionMetrics } from '@/components/CompletionMetrics';
import { TimeTrends } from '@/components/TimeTrends';
import { EfficiencyInsights } from '@/components/EfficiencyInsights';
import { RecentActivity } from '@/components/RecentActivity';
import { ProblemSpotlight } from '@/components/ProblemSpotlight';
import type { TaskTrace, AggregatedStats } from '@/lib/types';

export default function Home() {
  const router = useRouter();
  const [tasks, setTasks] = useState<TaskTrace[]>([]);
  const [stats, setStats] = useState<AggregatedStats | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    fetch('/api/traces')
      .then(res => res.json())
      .then(data => {
        if (data.error) {
          setError(data.error);
        } else {
          setTasks(data.tasks);
          setStats(data.stats);
        }
        setLoading(false);
      })
      .catch(err => {
        setError(String(err));
        setLoading(false);
      });
  }, []);

  if (loading) {
    return (
      <div className="flex items-center justify-center h-screen">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-accent-blue mx-auto mb-4"></div>
          <div className="text-foreground-secondary">Loading traces...</div>
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="flex items-center justify-center h-screen">
        <div className="text-center max-w-md">
          <div className="text-accent-red text-5xl mb-4">⚠</div>
          <h1 className="text-xl font-bold mb-2">Error Loading Traces</h1>
          <p className="text-foreground-secondary">{error}</p>
        </div>
      </div>
    );
  }

  return (
    <div className="flex h-screen">
      <TaskList 
        tasks={tasks} 
        selectedTask={null} 
        onSelectTask={(id) => router.push(`/trace/${id}`)} 
      />
      
      <div className="flex-1 overflow-y-auto scrollbar-thin">
        <div className="max-w-7xl mx-auto p-8 space-y-8">
          {stats && (
            <>
              <div>
                <h1 className="text-3xl font-bold mb-2">Ralph Traces Overview</h1>
                <p className="text-foreground-secondary">
                  Analyzing {stats.totalTasks} traces across all ralph tasks
                </p>
              </div>
              
              <QuickStats stats={stats} />
              <CompletionMetrics stats={stats} />
              <ExecutionTimeline tasks={tasks} />
              <RecentActivity stats={stats} />
              <TimeTrends stats={stats} />
              <EfficiencyInsights stats={stats} />
              <ProblemSpotlight stats={stats} />
              <OverviewStats stats={stats} />
            </>
          )}
        </div>
      </div>
    </div>
  );
}
