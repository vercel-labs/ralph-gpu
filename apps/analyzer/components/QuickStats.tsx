'use client';

import { AggregatedStats } from '@/lib/types';
import { Clock, TrendingUp, DollarSign, Wrench } from 'lucide-react';

interface QuickStatsProps {
  stats: AggregatedStats;
}

export function QuickStats({ stats }: QuickStatsProps) {
  const formatTime = (ms: number) => {
    const seconds = Math.floor(ms / 1000);
    const minutes = Math.floor(seconds / 60);
    const hours = Math.floor(minutes / 60);
    const days = Math.floor(hours / 24);
    
    if (days > 0) return `${days}d ${hours % 24}h`;
    if (hours > 0) return `${hours}h ${minutes % 60}m`;
    if (minutes > 0) return `${minutes}m ${seconds % 60}s`;
    return `${seconds}s`;
  };

  return (
    <div className="grid grid-cols-4 gap-4">
      <div className="bg-background-secondary rounded-lg p-4 border border-foreground-muted/20">
        <div className="flex items-center gap-2 mb-2">
          <Clock className="w-4 h-4 text-accent-blue" />
          <span className="text-sm text-foreground-secondary">Total Time Spent</span>
        </div>
        <div className="text-2xl font-bold text-accent-blue">
          {formatTime(stats.totalTimeSpent)}
        </div>
        <div className="text-xs text-foreground-muted mt-1">
          across {stats.totalTasks} tasks
        </div>
      </div>

      <div className="bg-background-secondary rounded-lg p-4 border border-foreground-muted/20">
        <div className="flex items-center gap-2 mb-2">
          <TrendingUp className="w-4 h-4 text-accent-purple" />
          <span className="text-sm text-foreground-secondary">Avg Task Duration</span>
        </div>
        <div className="text-2xl font-bold text-accent-purple">
          {formatTime(stats.avgTaskDuration)}
        </div>
      </div>

      <div className="bg-background-secondary rounded-lg p-4 border border-foreground-muted/20">
        <div className="flex items-center gap-2 mb-2">
          <DollarSign className="w-4 h-4 text-accent-green" />
          <span className="text-sm text-foreground-secondary">Median Cost</span>
        </div>
        <div className="text-2xl font-bold text-accent-green">
          ${stats.medianCost.toFixed(4)}
        </div>
      </div>

      <div className="bg-background-secondary rounded-lg p-4 border border-foreground-muted/20">
        <div className="flex items-center gap-2 mb-2">
          <Wrench className="w-4 h-4 text-accent-orange" />
          <span className="text-sm text-foreground-secondary">Most Used Tool</span>
        </div>
        <div className="text-xl font-bold font-mono text-accent-orange">
          {stats.mostUsedTool}
        </div>
        <div className="text-xs text-foreground-muted mt-1">
          {stats.toolUsage[stats.mostUsedTool]?.toLocaleString()} calls
        </div>
      </div>
    </div>
  );
}
