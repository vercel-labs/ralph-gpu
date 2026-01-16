'use client';

import { AggregatedStats } from '@/lib/types';
import { AlertCircle, AlertTriangle, Clock } from 'lucide-react';
import { useRouter } from 'next/navigation';

interface ProblemSpotlightProps {
  stats: AggregatedStats;
}

export function ProblemSpotlight({ stats }: ProblemSpotlightProps) {
  const router = useRouter();

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
      <h3 className="text-lg font-semibold text-gray-12">Problem Spotlight</h3>
      
      <div className="grid grid-cols-3 gap-6">
        {/* High Error Tasks */}
        <div className="bg-gray-1 rounded-lg p-4 border border-gray-4 hover:border-gray-5 transition-colors">
          <h4 className="text-sm font-semibold mb-3 text-gray-11 flex items-center gap-2">
            <AlertCircle className="w-4 h-4 text-red-9" />
            Highest Error Rates
          </h4>
          {stats.highErrorTasks.length > 0 ? (
            <div className="space-y-2">
              {stats.highErrorTasks.map((task, idx) => (
                <div key={idx} className="flex justify-between items-start text-sm text-gray-12">
                  <span className="font-mono truncate flex-1">{task.taskName}</span>
                  <div className="ml-2 text-right">
                    <div className="text-red-9 font-bold">{task.errorRate.toFixed(1)}%</div>
                    <div className="text-xs text-gray-9">{task.errors} errors</div>
                  </div>
                </div>
              ))}
            </div>
          ) : (
            <div className="text-center py-4 text-gray-9 text-sm">
              No errors detected
            </div>
          )}
        </div>

        {/* Stuck Tasks */}
        <div className="bg-gray-1 rounded-lg p-4 border border-gray-4 hover:border-gray-5 transition-colors">
          <h4 className="text-sm font-semibold mb-3 text-gray-11 flex items-center gap-2">
            <AlertTriangle className="w-4 h-4 text-amber-9" />
            Frequently Stuck
          </h4>
          {stats.stuckTasks.length > 0 ? (
            <div className="space-y-2">
              {stats.stuckTasks.map((task, idx) => (
                <div key={idx} className="flex justify-between items-center text-sm text-gray-12">
                  <span className="font-mono truncate flex-1">{task.taskName}</span>
                  <span className="text-amber-9 ml-2">{task.stuckCount}x</span>
                </div>
              ))}
            </div>
          ) : (
            <div className="text-center py-4 text-gray-9 text-sm">
              No stuck detections
            </div>
          )}
        </div>

        {/* Longest Tasks */}
        <div className="bg-gray-1 rounded-lg p-4 border border-gray-4 hover:border-gray-5 transition-colors">
          <h4 className="text-sm font-semibold mb-3 text-gray-11 flex items-center gap-2">
            <Clock className="w-4 h-4 text-purple-9" />
            Longest Running
          </h4>
          <div className="space-y-2">
            {stats.longestTasks.map((task, idx) => (
              <div key={idx} className="flex justify-between items-center text-sm text-gray-12">
                <span className="font-mono truncate flex-1">{task.taskName}</span>
                <span className="text-purple-9 ml-2">{formatTime(task.duration)}</span>
              </div>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
}
