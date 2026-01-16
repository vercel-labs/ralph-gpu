'use client';

import { AggregatedStats } from '@/lib/types';
import { TrendingUp, TrendingDown, DollarSign } from 'lucide-react';

interface EfficiencyInsightsProps {
  stats: AggregatedStats;
}

export function EfficiencyInsights({ stats }: EfficiencyInsightsProps) {
  return (
    <div className="space-y-4">
      <h3 className="text-lg font-semibold text-gray-12">Efficiency Insights</h3>
      
      <div className="grid grid-cols-4 gap-4">
        <div className="bg-gray-1 rounded-lg p-4 border border-gray-4 hover:border-gray-5 transition-colors">
          <div className="text-sm text-gray-11 mb-2">Avg Cost/Iteration</div>
          <div className="text-2xl font-bold text-blue-9">
            ${stats.avgCostPerIteration.toFixed(4)}
          </div>
        </div>

        <div className="bg-gray-1 rounded-lg p-4 border border-gray-4 hover:border-gray-5 transition-colors">
          <div className="text-sm text-gray-11 mb-2">Tokens per Dollar</div>
          <div className="text-2xl font-bold text-green-9">
            {stats.tokensPerDollar.toFixed(0)}
          </div>
        </div>

        <div className="bg-gray-1 rounded-lg p-4 border border-gray-4 hover:border-gray-5 transition-colors">
          <div className="text-sm text-gray-11 mb-2">Most Efficient</div>
          <div className="text-sm font-mono font-bold text-green-9 truncate">
            {stats.mostEfficientTasks[0]?.taskName || 'N/A'}
          </div>
          <div className="text-xs text-gray-9 mt-1">
            ${stats.mostEfficientTasks[0]?.costPerIteration.toFixed(4)}/iter
          </div>
        </div>

        <div className="bg-gray-1 rounded-lg p-4 border border-gray-4 hover:border-gray-5 transition-colors">
          <div className="text-sm text-gray-11 mb-2">Least Efficient</div>
          <div className="text-sm font-mono font-bold text-red-9 truncate">
            {stats.leastEfficientTasks[0]?.taskName || 'N/A'}
          </div>
          <div className="text-xs text-gray-9 mt-1">
            ${stats.leastEfficientTasks[0]?.costPerIteration.toFixed(4)}/iter
          </div>
        </div>
      </div>

      <div className="grid grid-cols-2 gap-6">
        <div className="bg-gray-1 rounded-lg p-4 border border-gray-4 hover:border-gray-5 transition-colors">
          <h4 className="text-sm font-semibold mb-3 text-gray-11 flex items-center gap-2">
            <TrendingUp className="w-4 h-4 text-green-9" />
            Most Efficient Tasks
          </h4>
          <div className="space-y-2">
            {stats.mostEfficientTasks.map((task, idx) => (
              <div key={idx} className="flex justify-between items-center text-gray-12">
                <span className="text-sm font-mono truncate flex-1">{task.taskName}</span>
                <span className="text-sm text-green-9 ml-2">
                  ${task.costPerIteration.toFixed(4)}/iter
                </span>
              </div>
            ))}
          </div>
        </div>

        <div className="bg-gray-1 rounded-lg p-4 border border-gray-4 hover:border-gray-5 transition-colors">
          <h4 className="text-sm font-semibold mb-3 text-gray-11 flex items-center gap-2">
            <TrendingDown className="w-4 h-4 text-red-9" />
            Least Efficient Tasks
          </h4>
          <div className="space-y-2">
            {stats.leastEfficientTasks.map((task, idx) => (
              <div key={idx} className="flex justify-between items-center text-gray-12">
                <span className="text-sm font-mono truncate flex-1">{task.taskName}</span>
                <span className="text-sm text-red-9 ml-2">
                  ${task.costPerIteration.toFixed(4)}/iter
                </span>
              </div>
            ))}
          </div>
        </div>
      </div>

      <div className="bg-gray-1 rounded-lg p-4 border border-gray-4 hover:border-gray-5 transition-colors">
        <h4 className="text-sm font-semibold mb-3 text-gray-11 flex items-center gap-2">
          <DollarSign className="w-4 h-4 text-blue-9" />
          Cost Breakdown by Tool
        </h4>
        <div className="grid grid-cols-4 gap-3">
          {stats.costByTool.slice(0, 8).map((item) => (
            <div key={item.tool} className="bg-gray-2 rounded p-2 border border-gray-4">
              <div className="font-mono text-xs font-semibold text-blue-9">{item.tool}</div>
              <div className="text-sm font-bold text-gray-12 mt-1">${item.estimatedCost.toFixed(2)}</div>
              <div className="text-xs text-gray-9">
                {((item.estimatedCost / stats.totalCost) * 100).toFixed(1)}%
              </div>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}
