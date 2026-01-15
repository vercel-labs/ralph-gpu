'use client';

import { AggregatedStats } from '@/lib/types';
import { CheckCircle, XCircle, Clock, AlertTriangle } from 'lucide-react';

interface CompletionMetricsProps {
  stats: AggregatedStats;
}

export function CompletionMetrics({ stats }: CompletionMetricsProps) {
  const formatTime = (ms: number) => {
    const seconds = Math.floor(ms / 1000);
    const minutes = Math.floor(seconds / 60);
    const hours = Math.floor(minutes / 60);
    
    if (hours > 0) return `${hours}h ${minutes % 60}m`;
    if (minutes > 0) return `${minutes}m ${seconds % 60}s`;
    return `${seconds}s`;
  };

  return (
    <div className="space-y-4">
      <h3 className="text-lg font-semibold">Success & Completion Metrics</h3>
      
      <div className="grid grid-cols-5 gap-4">
        <div className="bg-background-secondary rounded-lg p-4 border border-foreground-muted/20">
          <div className="flex items-center gap-2 mb-2">
            <CheckCircle className="w-4 h-4 text-accent-green" />
            <span className="text-sm text-foreground-secondary">Completion Rate</span>
          </div>
          <div className="text-2xl font-bold text-accent-green">
            {stats.completionRate.toFixed(1)}%
          </div>
          <div className="text-xs text-foreground-muted mt-1">
            {stats.completedTasks} of {stats.totalTasks} tasks
          </div>
        </div>

        <div className="bg-background-secondary rounded-lg p-4 border border-foreground-muted/20">
          <div className="flex items-center gap-2 mb-2">
            <XCircle className="w-4 h-4 text-accent-red" />
            <span className="text-sm text-foreground-secondary">Incomplete</span>
          </div>
          <div className="text-2xl font-bold text-accent-red">
            {stats.incompleteTasks}
          </div>
          <div className="text-xs text-foreground-muted mt-1">
            tasks without done
          </div>
        </div>

        <div className="bg-background-secondary rounded-lg p-4 border border-foreground-muted/20">
          <div className="flex items-center gap-2 mb-2">
            <Clock className="w-4 h-4 text-accent-blue" />
            <span className="text-sm text-foreground-secondary">Avg Iterations</span>
          </div>
          <div className="text-2xl font-bold text-accent-blue">
            {stats.avgIterationsToCompletion.toFixed(1)}
          </div>
          <div className="text-xs text-foreground-muted mt-1">
            to completion
          </div>
        </div>

        <div className="bg-background-secondary rounded-lg p-4 border border-foreground-muted/20">
          <div className="flex items-center gap-2 mb-2">
            <Clock className="w-4 h-4 text-accent-purple" />
            <span className="text-sm text-foreground-secondary">Avg Time</span>
          </div>
          <div className="text-2xl font-bold text-accent-purple">
            {formatTime(stats.avgTimeToCompletion)}
          </div>
          <div className="text-xs text-foreground-muted mt-1">
            to completion
          </div>
        </div>

        <div className="bg-background-secondary rounded-lg p-4 border border-foreground-muted/20">
          <div className="flex items-center gap-2 mb-2">
            <AlertTriangle className="w-4 h-4 text-accent-yellow" />
            <span className="text-sm text-foreground-secondary">Stuck Frequency</span>
          </div>
          <div className="text-2xl font-bold text-accent-yellow">
            {stats.stuckFrequency.toFixed(1)}%
          </div>
          <div className="text-xs text-foreground-muted mt-1">
            of iterations
          </div>
        </div>
      </div>
    </div>
  );
}
