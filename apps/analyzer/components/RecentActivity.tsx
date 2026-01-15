'use client';

import { AggregatedStats } from '@/lib/types';
import { CheckCircle, XCircle, Clock } from 'lucide-react';
import { useRouter } from 'next/navigation';

interface RecentActivityProps {
  stats: AggregatedStats;
}

export function RecentActivity({ stats }: RecentActivityProps) {
  const router = useRouter();

  const formatTime = (ms: number) => {
    const seconds = Math.floor(ms / 1000);
    const minutes = Math.floor(seconds / 60);
    if (minutes > 0) return `${minutes}m ${seconds % 60}s`;
    return `${seconds}s`;
  };

  const formatRelativeTime = (timestamp: string) => {
    const now = new Date().getTime();
    const then = new Date(timestamp).getTime();
    const diff = now - then;
    
    const minutes = Math.floor(diff / 60000);
    const hours = Math.floor(minutes / 60);
    const days = Math.floor(hours / 24);
    
    if (days > 0) return `${days}d ago`;
    if (hours > 0) return `${hours}h ago`;
    if (minutes > 0) return `${minutes}m ago`;
    return 'just now';
  };

  return (
    <div className="space-y-4">
      <h3 className="text-lg font-semibold">Recent Activity</h3>
      
      <div className="bg-background-secondary rounded-lg p-4 border border-foreground-muted/20">
        <div className="space-y-2">
          {stats.recentExecutions.map((execution, idx) => (
            <button
              key={idx}
              onClick={() => router.push(`/trace/${execution.taskId}`)}
              className="w-full flex items-center gap-3 p-3 bg-background-tertiary rounded hover:bg-background-tertiary/70 transition-colors"
            >
              {execution.completed ? (
                <CheckCircle className="w-5 h-5 text-accent-green flex-shrink-0" />
              ) : (
                <XCircle className="w-5 h-5 text-accent-red flex-shrink-0" />
              )}
              
              <div className="flex-1 text-left">
                <div className="font-mono text-sm font-semibold">{execution.taskName}</div>
                <div className="flex gap-4 text-xs text-foreground-secondary mt-1">
                  <span>{formatTime(execution.duration)}</span>
                  <span>${execution.cost.toFixed(4)}</span>
                  <span className="text-foreground-muted">{formatRelativeTime(execution.timestamp)}</span>
                </div>
              </div>

              <div className={`text-xs px-2 py-1 rounded ${
                execution.completed 
                  ? 'bg-accent-green/20 text-accent-green' 
                  : 'bg-accent-red/20 text-accent-red'
              }`}>
                {execution.completed ? 'Done' : 'Incomplete'}
              </div>
            </button>
          ))}
        </div>
      </div>
    </div>
  );
}
