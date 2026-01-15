'use client';

import { AggregatedStats } from '@/lib/types';
import { TrendingUp, TrendingDown, DollarSign } from 'lucide-react';

interface EfficiencyInsightsProps {
  stats: AggregatedStats;
}

export function EfficiencyInsights({ stats }: EfficiencyInsightsProps) {
  return (
    <div className="space-y-4">
      <h3 className="text-lg font-semibold">Efficiency Insights</h3>
      
      <div className="grid grid-cols-4 gap-4">
        <div className="bg-background-secondary rounded-lg p-4 border border-foreground-muted/20">
          <div className="text-sm text-foreground-secondary mb-2">Avg Cost/Iteration</div>
          <div className="text-2xl font-bold text-accent-blue">
            ${stats.avgCostPerIteration.toFixed(4)}
          </div>
        </div>

        <div className="bg-background-secondary rounded-lg p-4 border border-foreground-muted/20">
          <div className="text-sm text-foreground-secondary mb-2">Tokens per Dollar</div>
          <div className="text-2xl font-bold text-accent-green">
            {stats.tokensPerDollar.toFixed(0)}
          </div>
        </div>

        <div className="bg-background-secondary rounded-lg p-4 border border-foreground-muted/20">
          <div className="text-sm text-foreground-secondary mb-2">Most Efficient</div>
          <div className="text-sm font-mono font-bold text-accent-green truncate">
            {stats.mostEfficientTasks[0]?.taskName || 'N/A'}
          </div>
          <div className="text-xs text-foreground-muted mt-1">
            ${stats.mostEfficientTasks[0]?.costPerIteration.toFixed(4)}/iter
          </div>
        </div>

        <div className="bg-background-secondary rounded-lg p-4 border border-foreground-muted/20">
          <div className="text-sm text-foreground-secondary mb-2">Least Efficient</div>
          <div className="text-sm font-mono font-bold text-accent-red truncate">
            {stats.leastEfficientTasks[0]?.taskName || 'N/A'}
          </div>
          <div className="text-xs text-foreground-muted mt-1">
            ${stats.leastEfficientTasks[0]?.costPerIteration.toFixed(4)}/iter
          </div>
        </div>
      </div>

      <div className="grid grid-cols-2 gap-6">
        <div className="bg-background-secondary rounded-lg p-4 border border-foreground-muted/20">
          <h4 className="text-sm font-semibold mb-3 text-foreground-secondary flex items-center gap-2">
            <TrendingUp className="w-4 h-4 text-accent-green" />
            Most Efficient Tasks
          </h4>
          <div className="space-y-2">
            {stats.mostEfficientTasks.map((task, idx) => (
              <div key={idx} className="flex justify-between items-center">
                <span className="text-sm font-mono truncate flex-1">{task.taskName}</span>
                <span className="text-sm text-accent-green ml-2">
                  ${task.costPerIteration.toFixed(4)}/iter
                </span>
              </div>
            ))}
          </div>
        </div>

        <div className="bg-background-secondary rounded-lg p-4 border border-foreground-muted/20">
          <h4 className="text-sm font-semibold mb-3 text-foreground-secondary flex items-center gap-2">
            <TrendingDown className="w-4 h-4 text-accent-red" />
            Least Efficient Tasks
          </h4>
          <div className="space-y-2">
            {stats.leastEfficientTasks.map((task, idx) => (
              <div key={idx} className="flex justify-between items-center">
                <span className="text-sm font-mono truncate flex-1">{task.taskName}</span>
                <span className="text-sm text-accent-red ml-2">
                  ${task.costPerIteration.toFixed(4)}/iter
                </span>
              </div>
            ))}
          </div>
        </div>
      </div>

      <div className="bg-background-secondary rounded-lg p-4 border border-foreground-muted/20">
        <h4 className="text-sm font-semibold mb-3 text-foreground-secondary flex items-center gap-2">
          <DollarSign className="w-4 h-4 text-accent-blue" />
          Cost Breakdown by Tool
        </h4>
        <div className="grid grid-cols-4 gap-3">
          {stats.costByTool.slice(0, 8).map((item) => (
            <div key={item.tool} className="bg-background-tertiary rounded p-2">
              <div className="font-mono text-xs font-semibold text-accent-blue">{item.tool}</div>
              <div className="text-sm font-bold mt-1">${item.estimatedCost.toFixed(2)}</div>
              <div className="text-xs text-foreground-muted">
                {((item.estimatedCost / stats.totalCost) * 100).toFixed(1)}%
              </div>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}
